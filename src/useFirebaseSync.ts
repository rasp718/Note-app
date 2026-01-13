import { useEffect, useState } from 'react';
import { 
  collection, query, onSnapshot, addDoc, deleteDoc, updateDoc,
  setDoc, getDocs, doc, where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, CategoryConfig } from './types';

// --- HELPER: Normalize Firestore Dates to Numbers ---
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

// --- PRESENCE / ONLINE STATUS HOOK ---
// Updates 'lastSeen' every 2 minutes to keep user "Online"
export const usePresence = (uid: string | undefined) => {
    useEffect(() => {
        if (!uid) return;

        const updateStatus = async () => {
            try {
                const userRef = doc(db, 'users', uid);
                await updateDoc(userRef, {
                    lastSeen: serverTimestamp()
                });
            } catch (e) {
                // Silent fail (offline)
            }
        };

        // Update immediately, then every 2 minutes
        updateStatus();
        const interval = setInterval(updateStatus, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [uid]);
};

// --- USER PROFILE SYNC ---
export const syncUserProfile = async (user: User) => {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    // We do NOT overwrite lastSeen here, usePresence handles it
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: localStorage.getItem('vibenotes_profile_name') || user.displayName || 'Anon',
      handle: localStorage.getItem('vibenotes_profile_handle') || '@anon',
      photoURL: localStorage.getItem('vibenotes_profile_pic'),
    }, { merge: true });
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
  } catch (e) {
    return [];
  }
};

// --- GET SINGLE USER DETAILS (With Online Calc) ---
export const useUser = (userId: string | undefined) => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
          const data = doc.data();
          const lastSeen = normalizeDate(data.lastSeen);
          // If last seen within 3 minutes, they are "Online"
          const isOnline = (Date.now() - lastSeen) < 3 * 60 * 1000;
          setUserData({ ...data, isOnline });
      }
    });
    return () => unsub();
  }, [userId]);

  return userData;
};

// --- CHAT LIST HOOK ---
export const useChats = (userId: string | null) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userId), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUserId = data.participants ? data.participants.find((p: string) => p !== userId) : null;
        return { 
          id: doc.id, 
          ...data, 
          timestamp: normalizeDate(data.timestamp),
          otherUserId 
        };
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
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  return { chats, loading, createChat };
};

// --- MESSAGES HOOK (With Read Receipts) ---
export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  
  useEffect(() => {
    if (!chatId || chatId === 'saved_messages') return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Default status to 'sent' if missing (for old messages)
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
    const timestamp = Date.now();
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text, 
      imageUrl, 
      senderId, 
      timestamp, 
      type: imageUrl ? 'image' : 'text',
      status: 'sent' // Initial status
    });
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text || (imageUrl ? 'Sent an image' : ''),
      timestamp: serverTimestamp()
    });
  };

  // Mark all unread messages from OTHER users as read
  const markChatAsRead = async (currentUserId: string) => {
      if (!chatId || !currentUserId || chatId === 'saved_messages') return;
      
      try {
          // Get all messages where sender is NOT me and status is NOT read
          // Note: Firestore requires an index for compound queries (senderId != me), 
          // so we'll fetch recently and filter in memory for simplicity or strict query if indexed.
          // Simple approach:
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const q = query(messagesRef, where('status', '==', 'sent')); 
          
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          let updateCount = 0;

          snapshot.docs.forEach((doc) => {
              if (doc.data().senderId !== currentUserId) {
                  batch.update(doc.ref, { status: 'read' });
                  updateCount++;
              }
          });

          if (updateCount > 0) {
              await batch.commit();
          }
      } catch (e) {
          console.error("Error marking read:", e);
      }
  };

  return { messages, sendMessage, markChatAsRead };
};

// --- NOTES HOOK ---
export const useNotes = (userId: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      return;
    }
    const notesRef = collection(db, 'users', userId, 'notes');
    const q = query(notesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notesData.push({
          id: doc.id, 
          text: data.text || '', 
          date: normalizeDate(data.date), 
          category: data.category || 'default',
          isPinned: !!data.isPinned, 
          isExpanded: data.isExpanded ?? true,
          editedAt: data.editedAt ? normalizeDate(data.editedAt) : undefined, 
          imageUrl: data.imageUrl || undefined
        });
      });
      setNotes(notesData);
      setSyncing(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const addNote = async (note: Omit<Note, 'id'>) => {
    if (!userId) return;
    setSyncing(true);
    try {
      const noteData: any = { 
        text: note.text || '', 
        date: Date.now(), 
        category: note.category || 'default', 
        isPinned: !!note.isPinned, 
        isExpanded: note.isExpanded !== undefined ? note.isExpanded : true 
      };
      
      if (note.editedAt) noteData.editedAt = note.editedAt;
      if (note.imageUrl) noteData.imageUrl = note.imageUrl;
      
      await addDoc(collection(db, 'users', userId, 'notes'), noteData);
    } catch (error) { 
      console.error(error); 
    } finally {
      setSyncing(false); 
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!userId) return;
    setSyncing(true);
    try { await deleteDoc(doc(db, 'users', userId, 'notes', noteId)); } 
    catch (error) { console.error(error); } 
    finally { setSyncing(false); }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!userId) return;
    setSyncing(true);
    try {
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => { 
        if (value !== undefined) cleanUpdates[key] = value; 
      });
      await updateDoc(doc(db, 'users', userId, 'notes', noteId), cleanUpdates);
    } catch (error) { console.error(error); } 
    finally { setSyncing(false); }
  };

  return { notes, addNote, deleteNote, updateNote, syncing };
};

// --- CATEGORIES HOOK ---
export const useCategories = (userId: string | null) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);

  useEffect(() => {
    if (!userId) return;
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const categoriesData: CategoryConfig[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if(data.id && data.label) {
             categoriesData.push({ id: data.id, label: data.label, emoji: data.emoji || '📁', colorClass: data.colorClass || 'bg-gray-500' });
        }
      });
      if (categoriesData.length > 0) setCategories(categoriesData);
    });
    return () => unsubscribe();
  }, [userId]);

  return { categories, updateCategories: async () => {} };
};