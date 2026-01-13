import { useEffect, useState } from 'react';
import { 
  collection, query, onSnapshot, addDoc, deleteDoc, updateDoc,
  setDoc, getDocs, getDoc, doc, where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, CategoryConfig } from './types';

// --- HELPER: Normalize Firestore Dates ---
const normalizeDate = (d: any): number => {
  if (!d) return Date.now();
  if (typeof d === 'number') return d;
  if (typeof d.toMillis === 'function') return d.toMillis(); 
  if (d.seconds) return d.seconds * 1000; 
  if (d instanceof Date) return d.getTime();
  return Date.now();
};

// --- AUTH HOOK ---
export const useFirebaseSync = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
};

// --- PRESENCE SYSTEM ---
export const usePresence = (uid: string | undefined) => {
    useEffect(() => {
        if (!uid) return;
        const updateStatus = async () => {
            try {
                await updateDoc(doc(db, 'users', uid), { lastSeen: serverTimestamp() });
            } catch (e) {}
        };
        updateStatus();
        const interval = setInterval(updateStatus, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [uid]);
};

// --- SAFE PROFILE SYNC (Fixes the "Anon" Bug) ---
export const syncUserProfile = async (user: User) => {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    // Get local values (if any)
    const localName = localStorage.getItem('vibenotes_profile_name');
    const localHandle = localStorage.getItem('vibenotes_profile_handle');
    const localPic = localStorage.getItem('vibenotes_profile_pic');

    if (userSnap.exists()) {
       // User exists in DB. 
       // ONLY overwrite if we have local data to sync UP.
       // If local is empty (Incognito/New Device), we trust the DB and DO NOT overwrite.
       const updates: any = {};
       if (localName) updates.displayName = localName;
       if (localHandle) updates.handle = localHandle;
       if (localPic) updates.photoURL = localPic;

       // Only fire update if we actually have changes
       if (Object.keys(updates).length > 0) {
           await updateDoc(userRef, updates);
       }
    } else {
       // New User: Create with defaults
       await setDoc(userRef, {
         uid: user.uid,
         email: user.email,
         displayName: localName || user.displayName || 'Anon',
         handle: localHandle || '@anon',
         photoURL: localPic || null,
       });
    }
  } catch (e) {
    console.error("Profile sync error", e);
  }
};

// --- SEARCH USERS ---
export const searchUsers = async (searchTerm: string) => {
  if (!searchTerm) return [];
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('handle', '>=', searchTerm), where('handle', '<=', searchTerm + '\uf8ff'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (e) { return []; }
};

// --- GET SINGLE USER (With Online Status) ---
export const useUser = (userId: string | undefined) => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
          const data = doc.data();
          const lastSeen = normalizeDate(data.lastSeen);
          // Online if seen within last 3 mins
          const isOnline = (Date.now() - lastSeen) < 3 * 60 * 1000;
          setUserData({ ...data, isOnline });
      }
    });
    return () => unsub();
  }, [userId]);

  return userData;
};

// --- CHATS HOOK ---
export const useChats = (userId: string | null) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUserId = data.participants ? data.participants.find((p: string) => p !== userId) : null;
        return { id: doc.id, ...data, timestamp: normalizeDate(data.timestamp), otherUserId };
      });
      setChats(chatsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const createChat = async (otherUid: string) => {
    if (!userId) return;
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [userId, otherUid],
        lastMessage: 'Chat started',
        timestamp: serverTimestamp(),
        type: 'private'
      });
      return chatRef.id;
    } catch (e) { console.error(e); return null; }
  };

  return { chats, loading, createChat };
};

// --- MESSAGES HOOK (With Read Receipts) ---
export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  
  useEffect(() => {
    if (!chatId || chatId === 'saved_messages') return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, ...data, 
          status: data.status || 'sent', 
          timestamp: normalizeDate(data.timestamp) 
        };
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (text: string, imageUrl: string | null, senderId: string) => {
    if (!chatId) return;
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text, imageUrl, senderId, timestamp: Date.now(), type: imageUrl ? 'image' : 'text', status: 'sent'
    });
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text || (imageUrl ? 'Sent an image' : ''),
      timestamp: serverTimestamp()
    });
  };

  const markChatAsRead = async (currentUserId: string) => {
      if (!chatId || !currentUserId || chatId === 'saved_messages') return;
      try {
          const q = query(collection(db, 'chats', chatId, 'messages'), where('status', '==', 'sent')); 
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          let count = 0;
          snapshot.docs.forEach((doc) => {
              if (doc.data().senderId !== currentUserId) {
                  batch.update(doc.ref, { status: 'read' });
                  count++;
              }
          });
          if (count > 0) await batch.commit();
      } catch (e) { console.error("Error marking read:", e); }
  };

  return { messages, sendMessage, markChatAsRead };
};

// --- NOTES HOOK ---
export const useNotes = (userId: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  
  useEffect(() => {
    if (!userId) { setNotes([]); return; }
    const q = query(collection(db, 'users', userId, 'notes'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notesData.push({
          id: doc.id, text: data.text || '', date: normalizeDate(data.date), 
          category: data.category || 'default', isPinned: !!data.isPinned, 
          isExpanded: data.isExpanded ?? true, editedAt: data.editedAt ? normalizeDate(data.editedAt) : undefined, 
          imageUrl: data.imageUrl || undefined
        });
      });
      setNotes(notesData);
    });
    return () => unsubscribe();
  }, [userId]);

  const addNote = async (note: Omit<Note, 'id'>) => {
    if (!userId) return;
    try {
      const noteData: any = { 
        text: note.text || '', date: Date.now(), category: note.category || 'default', 
        isPinned: !!note.isPinned, isExpanded: note.isExpanded !== undefined ? note.isExpanded : true 
      };
      if (note.editedAt) noteData.editedAt = note.editedAt;
      if (note.imageUrl) noteData.imageUrl = note.imageUrl;
      await addDoc(collection(db, 'users', userId, 'notes'), noteData);
    } catch (error) { console.error(error); }
  };

  const deleteNote = async (noteId: string) => { if (!userId) return; try { await deleteDoc(doc(db, 'users', userId, 'notes', noteId)); } catch (error) { console.error(error); } };
  const updateNote = async (noteId: string, updates: Partial<Note>) => { if (!userId) return; try { const cleanUpdates: any = {}; Object.entries(updates).forEach(([key, value]) => { if (value !== undefined) cleanUpdates[key] = value; }); await updateDoc(doc(db, 'users', userId, 'notes', noteId), cleanUpdates); } catch (error) { console.error(error); } };

  return { notes, addNote, deleteNote, updateNote };
};