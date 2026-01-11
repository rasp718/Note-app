import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  setDoc,
  getDocs,
  doc,
  where,
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, CategoryConfig } from './types';

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

// --- USER PROFILE SYNC (NEW) ---
// Call this when the app loads to ensure the user exists in the public 'users' collection
export const syncUserProfile = async (user: User) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  
  // We merge: true so we don't overwrite existing data like 'contacts' if we add that later
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: localStorage.getItem('vibenotes_profile_name') || user.displayName || 'Anon',
    handle: localStorage.getItem('vibenotes_profile_handle') || '@anon',
    photoURL: localStorage.getItem('vibenotes_profile_pic'),
    lastSeen: serverTimestamp()
  }, { merge: true });
};

// --- SEARCH USERS (NEW) ---
export const searchUsers = async (searchTerm: string) => {
  if (!searchTerm) return [];
  // Note: This is a basic search. For production, you'd want Algolia or similar.
  // This searches for users where 'handle' is exactly the search term (for now)
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('handle', '>=', searchTerm), where('handle', '<=', searchTerm + '\uf8ff'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// --- CHAT LIST HOOK (NEW) ---
export const useChats = (userId: string | null) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Fetch chats where the current user is a participant
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Determine the "other" user's ID for display purposes
        const otherUserId = data.participants.find((p: string) => p !== userId);
        return {
          id: doc.id,
          ...data,
          otherUserId // Helper to know who we are talking to
        };
      });
      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const createChat = async (otherUid: string) => {
    if (!userId) return;
    // Basic check to see if chat exists could go here, for now we create new
    const chatRef = await addDoc(collection(db, 'chats'), {
      participants: [userId, otherUid],
      lastMessage: 'Chat started',
      timestamp: serverTimestamp(),
      type: 'private'
    });
    return chatRef.id;
  };

  return { chats, loading, createChat };
};

// --- MESSAGES HOOK (NEW) ---
export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  
  useEffect(() => {
    // Don't fetch if it's the Notes section or null
    if (!chatId || chatId === 'saved_messages') return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (text: string, imageUrl: string | null, senderId: string) => {
    if (!chatId) return;

    const timestamp = Date.now(); // Use client time for immediate UI, server time for sorting

    // 1. Add message to sub-collection
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text,
      imageUrl,
      senderId,
      timestamp,
      type: imageUrl ? 'image' : 'text'
    });

    // 2. Update parent chat with last message info (for the list view)
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text || (imageUrl ? 'Sent an image' : ''),
      timestamp: serverTimestamp() // Updates sorting order
    });
  };

  return { messages, sendMessage };
};

// --- NOTES HOOK (EXISTING) ---
export const useNotes = (userId: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const notesRef = collection(db, 'users', userId, 'notes');
    const q = query(notesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notesData.push({
          id: doc.id,
          text: data.text,
          date: data.date,
          category: data.category,
          isPinned: data.isPinned || false,
          isExpanded: data.isExpanded ?? true,
          editedAt: data.editedAt || undefined,
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
        text: note.text,
        date: note.date,
        category: note.category,
        isPinned: note.isPinned || false,
        isExpanded: note.isExpanded !== undefined ? note.isExpanded : true
      };

      if (note.editedAt) {
        noteData.editedAt = note.editedAt;
      }
      if (note.imageUrl) {
        noteData.imageUrl = note.imageUrl;
      }

      await addDoc(collection(db, 'users', userId, 'notes'), noteData);
    } catch (error) {
      console.error("Error adding note:", error);
      setSyncing(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!userId) return;
    setSyncing(true);
    try {
      await deleteDoc(doc(db, 'users', userId, 'notes', noteId));
    } catch (error) {
      console.error("Error deleting note:", error);
      setSyncing(false);
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!userId) return;
    setSyncing(true);
    try {
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      });
      
      await updateDoc(doc(db, 'users', userId, 'notes', noteId), cleanUpdates);
    } catch (error) {
      console.error("Error updating note:", error);
      setSyncing(false);
    }
  };

  return { notes, addNote, deleteNote, updateNote, syncing };
};

// --- CATEGORIES HOOK (EXISTING) ---
export const useCategories = (userId: string | null) => {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);

  useEffect(() => {
    if (!userId) return;

    const categoriesRef = collection(db, 'users', userId, 'categories');

    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const categoriesData: CategoryConfig[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        categoriesData.push({
          id: data.id,
          label: data.label,
          emoji: data.emoji,
          colorClass: data.colorClass
        });
      });
      if (categoriesData.length > 0) {
        setCategories(categoriesData);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const updateCategories = async (newCategories: CategoryConfig[]) => {
    if (!userId) return;
    try {
      const categoriesDocRef = doc(db, 'users', userId, 'settings', 'categories');
      await updateDoc(categoriesDocRef, { data: newCategories });
    } catch (error) {
      console.error("Error updating categories:", error);
    }
  };

  return { categories, updateCategories };
};