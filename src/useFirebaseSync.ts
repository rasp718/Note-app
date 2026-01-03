import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  doc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Note, CategoryConfig } from './types';

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