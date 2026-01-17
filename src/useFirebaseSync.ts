import { useEffect, useState, useRef } from 'react';
import { 
  collection, query, onSnapshot, addDoc, deleteDoc, updateDoc,
  setDoc, getDocs, getDoc, doc, where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, CategoryConfig } from './types';

// --- ENCRYPTION ENGINE ---
const generateKey = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const simpleEncrypt = (text: string, key: string): string => {
    if (!text || !key) return text;
    try {
        const textChars = text.split('').map(c => c.charCodeAt(0));
        const keyChars = key.split('').map(c => c.charCodeAt(0));
        let encryptedHex = '';
        for (let i = 0; i < textChars.length; i++) {
            const xor = textChars[i] ^ keyChars[i % keyChars.length];
            encryptedHex += ('00' + xor.toString(16)).slice(-2);
        }
        return encryptedHex;
    } catch (e) { return text; }
};

const simpleDecrypt = (encryptedHex: string, key: string): string => {
    if (!encryptedHex || !key) return encryptedHex;
    try {
        if (!/^[0-9a-fA-F]+$/.test(encryptedHex)) return encryptedHex;
        const keyChars = key.split('').map(c => c.charCodeAt(0));
        let decrypted = '';
        for (let i = 0; i < encryptedHex.length; i += 2) {
            const hex = parseInt(encryptedHex.substr(i, 2), 16);
            const charCode = hex ^ keyChars[(i / 2) % keyChars.length];
            decrypted += String.fromCharCode(charCode);
        }
        return decrypted;
    } catch (e) { return encryptedHex; }
};

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
            try { await updateDoc(doc(db, 'users', uid), { lastSeen: serverTimestamp() }); } catch (e) {}
        };
        updateStatus();
        const interval = setInterval(updateStatus, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [uid]);
};

// --- SAFE PROFILE SYNC ---
export const syncUserProfile = async (user: User) => {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const localName = localStorage.getItem('vibenotes_profile_name');
    const localHandle = localStorage.getItem('vibenotes_profile_handle');
    const localPic = localStorage.getItem('vibenotes_profile_pic');

    if (userSnap.exists()) {
       const updates: any = {};
       if (localName) updates.displayName = localName;
       if (localHandle) updates.handle = localHandle;
       if (localPic) updates.photoURL = localPic;
       if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
    } else {
       await setDoc(userRef, {
         uid: user.uid, email: user.email,
         displayName: localName || user.displayName || 'Anon',
         handle: localHandle || '@anon', photoURL: localPic || null,
       });
    }
  } catch (e) { console.error("Profile sync error", e); }
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

// --- GET SINGLE USER ---
export const useUser = (userId: string | undefined) => {
  const [userData, setUserData] = useState<any>(null);
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
          const data = doc.data();
          const lastSeen = normalizeDate(data.lastSeen);
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
    if (!userId) {
        setChats([]);
        return;
    }
    // REMOVED orderBy('timestamp') to prevent missing index errors or missing fields hiding groups
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle DMs vs Groups
        let otherUserId = null;
        if (data.type !== 'group' && data.participants) {
            otherUserId = data.participants.find((p: string) => p !== userId);
        }
        
        // Decrypt if needed
        const plainLastMessage = data.secretKey 
            ? simpleDecrypt(data.lastMessage || data.lastMessageText, data.secretKey) 
            : (data.lastMessage || data.lastMessageText || '');

        // Normalize timestamp (handle both 'timestamp' and 'lastMessageTimestamp')
        const rawTime = data.lastMessageTimestamp || data.timestamp;
        const finalTime = normalizeDate(rawTime);

        return { 
            id: doc.id, 
            ...data, 
            lastMessageText: plainLastMessage, // Normalize text field
            lastMessageTimestamp: finalTime,   // Normalize time field
            otherUserId 
        };
      });
      
      // Sort client-side to ensure newest are top
      chatsData.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
      
      setChats(chatsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const createChat = async (otherUid: string) => {
    if (!userId) return;
    try {
      const secretKey = generateKey();
      const initialMsg = "Chat started (Encrypted)";
      const encryptedMsg = simpleEncrypt(initialMsg, secretKey);

      // Create using unified field names
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [userId, otherUid],
        lastMessageText: encryptedMsg, // Use consistent naming
        lastMessage: encryptedMsg,     // Keep backward compatibility
        secretKey: secretKey,
        lastMessageTimestamp: serverTimestamp(),
        timestamp: serverTimestamp(),
        type: 'private'
      });
      return chatRef.id;
    } catch (e) { console.error(e); return null; }
  };

  return { chats, loading, createChat };
};

// --- MESSAGES HOOK (With Delete/Update Logic) ---
export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatKey, setChatKey] = useState<string | null>(null);

  useEffect(() => {
      if (!chatId || chatId === 'saved_messages') { setChatKey(null); return; }
      const unsub = onSnapshot(doc(db, 'chats', chatId), (doc) => {
          if (doc.exists()) setChatKey(doc.data().secretKey || null);
      });
      return () => unsub();
  }, [chatId]);
  
  useEffect(() => {
    if (!chatId || chatId === 'saved_messages') return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const plainText = (chatKey && data.text) 
            ? simpleDecrypt(data.text, chatKey) 
            : data.text;

        return { 
          id: doc.id, ...data, 
          text: plainText, 
          status: data.status || 'sent', 
          timestamp: normalizeDate(data.timestamp) 
        };
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chatId, chatKey]);

  const sendMessage = async (text: string, imageUrl: string | null, audioUrl: string | null, senderId: string) => {
    if (!chatId) return;
    
    const encryptedText = chatKey ? simpleEncrypt(text, chatKey) : text;
    
    let previewText = text;
    if (imageUrl) previewText = '📷 Image';
    if (audioUrl) previewText = '🎤 Voice Message';
    
    const encryptedPreview = chatKey ? simpleEncrypt(previewText, chatKey) : previewText;

    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: encryptedText, 
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null, 
      senderId, 
      timestamp: Date.now(), 
      type: audioUrl ? 'audio' : (imageUrl ? 'image' : 'text'), 
      status: 'sent'
    });
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: encryptedPreview,
      timestamp: serverTimestamp()
    });
  };

  const deleteMessage = async (messageId: string) => {
      if (!chatId || !messageId) return;
      try {
          await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
      } catch (e) { console.error("Failed to delete message", e); }
  };

  const updateMessage = async (messageId: string, newText: string) => {
      if (!chatId || !messageId) return;
      try {
          const encryptedText = chatKey ? simpleEncrypt(newText, chatKey) : newText;
          await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
              text: encryptedText,
              editedAt: Date.now()
          });
      } catch (e) { console.error("Failed to edit message", e); }
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

  return { messages, sendMessage, deleteMessage, updateMessage, markChatAsRead };
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