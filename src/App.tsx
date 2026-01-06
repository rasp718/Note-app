import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Settings, ArrowUp, LayoutGrid, Cloud, Image as ImageIcon, Check, EyeOff, Terminal, Plus } from 'lucide-react'; 
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard'; 
import { useFirebaseSync, useNotes } from './useFirebaseSync';
import Auth from './components/Auth';

const TRANSLATIONS = { 
  search: "Search notes...", 
  all: "All", 
  typePlaceholder: "Message...", 
  cat_secret: "Classified", 
  cat_hacker: "Anonymous"
};

// --- SECRET CONFIGURATIONS ---
const GHOST_CONFIG: CategoryConfig = {
    id: 'secret',
    label: 'Classified',
    emoji: '👻',
    colorClass: 'bg-red-500' 
};

const HACKER_CONFIG: CategoryConfig = {
    id: 'secret', 
    label: 'Anon', 
    emoji: '💻',
    colorClass: 'bg-green-500'
};

// --- UTILS ---
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_SIZE = 600;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

function App() {
  const { user, loading: authLoading } = useFirebaseSync();
  const { notes, addNote, deleteNote: deleteNoteFromFirebase, updateNote, syncing } = useNotes(user?.uid || null);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const editTextAreaRef = useRef<HTMLTextAreaElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // TELEGRAM STYLE: Bottom Scroll Anchor
  const bottomRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all' | 'secret'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'secret'>('idea');
  
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const [showBars, setShowBars] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const lastScrollY = useRef(0);

  // SECRET MODE STATES
  const [secretTaps, setSecretTaps] = useState(0);
  const tapTimeoutRef = useRef<any>(null);
  const [showSecretAnim, setShowSecretAnim] = useState(false);
  const [secretAnimType, setSecretAnimType] = useState<'ghost' | 'matrix'>('ghost');

  // ANIMATION STATES
  const [isStartup, setIsStartup] = useState(true);
  const [startupAnimName] = useState(() => {
    const anims = ['logoEntrance', 'logoHeartbeat', 'logoGlitch', 'logoWobble'];
    const seed = Date.now(); 
    return anims[seed % anims.length];
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [showSaveAnim, setShowSaveAnim] = useState(false);
  const [saveAnimType, setSaveAnimType] = useState<'brain' | 'lightning' | 'money' | 'journal' | 'fire' | 'matrix' | 'ghost' | null>(null);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editNoteImage, setEditNoteImage] = useState('');

  const activeSecretConfig = secretAnimType === 'matrix' ? HACKER_CONFIG : GHOST_CONFIG;

  // --- THEME & STYLES ---
  const getEditTheme = () => {
    if (editingNote?.category === 'secret') {
        if (secretAnimType === 'matrix') {
            return {
                containerBorder: 'border-green-900/50', 
                uploadBorder: 'border-green-500/30',
                text: 'text-white font-mono', 
                placeholder: 'placeholder:text-green-700',
                icon: 'text-zinc-500 hover:text-green-500',
                saveBtn: 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-green-500 hover:text-green-500',
                cancelBtn: 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-green-400'
            };
        } else {
            return {
                containerBorder: 'border-zinc-800',
                uploadBorder: 'border-red-500/30',
                text: 'text-white', 
                placeholder: 'placeholder:text-red-800',
                icon: 'text-zinc-500 hover:text-red-500',
                saveBtn: 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-red-500 hover:text-red-500',
                cancelBtn: 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-red-400'
            };
        }
    }
    return {
        containerBorder: 'border-zinc-800',
        uploadBorder: 'border-zinc-800',
        text: 'text-white', 
        placeholder: 'placeholder:text-zinc-700',
        icon: 'text-zinc-500 hover:text-zinc-300',
        saveBtn: 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-orange-500 hover:text-orange-500',
        cancelBtn: 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
    };
  };

  const editTheme = getEditTheme();

  const currentTheme = (() => {
    if (activeFilter === 'secret' || editingNote?.category === 'secret') {
        if (secretAnimType === 'matrix') {
            return {
                text: 'text-green-500',
                textDim: 'text-green-500/50',
                border: 'border-green-500/50',
                borderDim: 'border-green-500/30',
                bg: 'bg-green-600',
                bgHover: 'hover:bg-green-500',
                shadow: 'shadow-green-900/20',
                ring: 'focus:border-green-500/50',
                font: 'font-mono',
                selection: 'selection:bg-green-500/30 selection:text-green-200' 
            };
        } else {
            return {
                text: 'text-red-500',
                textDim: 'text-red-500/50',
                border: 'border-red-500/50',
                borderDim: 'border-red-500/30',
                bg: 'bg-red-600',
                bgHover: 'hover:bg-red-500',
                shadow: 'shadow-red-900/20',
                ring: 'focus:border-red-500/50',
                font: 'font-sans',
                selection: 'selection:bg-red-500/30 selection:text-red-200' 
            };
        }
    }
    return {
        text: 'text-orange-500',
        textDim: 'text-zinc-500',
        border: 'border-orange-500/50',
        borderDim: 'border-zinc-800',
        bg: 'bg-orange-600',
        bgHover: 'hover:bg-orange-500',
        shadow: 'shadow-[0_0_15px_rgba(234,88,12,0.5)]',
        ring: 'focus:border-white/10',
        font: 'font-sans',
        selection: 'selection:bg-orange-500/30 selection:text-orange-200' 
    };
  })();

  const getCategoryLabel = (cat: CategoryConfig) => {
    if (cat.id === 'secret') {
        return secretAnimType === 'matrix' ? TRANSLATIONS.cat_hacker : TRANSLATIONS.cat_secret;
    }
    return cat.label;
  };

  const handleSecretTrigger = () => {
    setSecretTaps(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000);

    if (secretTaps + 1 >= 5) {
        setActiveFilter('secret');
        setSelectedCategory('secret');
        setSecretTaps(0);
        
        const type = Math.random() > 0.5 ? 'ghost' : 'matrix';
        setSecretAnimType(type);
        setShowSecretAnim(true);

        setTimeout(() => setShowSecretAnim(false), 8000);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  const currentCategoryConfig = selectedCategory === 'secret' ? activeSecretConfig : categories.find(c => c.id === selectedCategory) || categories[0];

  const handleImageUpload = async (file: File, isEditMode = false) => {
    if (!file.type.startsWith('image/')) return alert('Please select an image file');
    setIsUploadingImage(true);
    try {
      const url = await compressImage(file);
      if (url.length > 800000) return alert('Image too large.');
      if (isEditMode) setEditNoteImage(url);
      else setImageUrl(url);
    } catch (e) { console.error(e); } finally { setIsUploadingImage(false); }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>, isEditMode = false) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) await handleImageUpload(file, isEditMode);
        break;
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isInputFocused) {
        setShowBars(true);
        return;
      }
      if (editingNote) return;

      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) { 
          setShowBars(true); 
          lastScrollY.current = currentScrollY; 
          return; 
      }
      
      if (currentScrollY > lastScrollY.current) { 
          setShowBars(false); 
      } else { 
          setShowBars(true); 
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInputFocused, editingNote]); 

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsStartup(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior, block: "end" });
      }, 100);
  };

  useEffect(() => {
      scrollToBottom();
  }, [activeFilter, selectedCategory, notes.length]);

  useEffect(() => {
    try {
        const savedAlignment = localStorage.getItem('vibenotes_alignment'); if(savedAlignment) setAlignment(savedAlignment as any);
        const savedCats = localStorage.getItem('vibenotes_categories'); if(savedCats) setCategories(JSON.parse(savedCats));
        const savedVoice = localStorage.getItem('vibenotes_voice'); if(savedVoice) setSelectedVoiceURI(savedVoice);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const loadVoices = () => {
        const all = window.speechSynthesis.getVoices();
        setVoices(all.filter(v => v.lang.startsWith('en')));
    };
    loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => { if (selectedVoiceURI) setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null); }, [selectedVoiceURI, voices]);
  useEffect(() => { localStorage.setItem('vibenotes_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  
  useEffect(() => { 
      if (textareaRef.current) { 
          textareaRef.current.style.height = 'auto'; 
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; 
      } 
  }, [transcript]);

  const cycleCategory = () => { 
      if (selectedCategory === 'secret') {
          setSelectedCategory(categories[0].id);
          setActiveFilter(categories[0].id);
          return;
      }
      const i = categories.findIndex(c => c.id === selectedCategory); 
      setSelectedCategory(categories[(i + 1) % categories.length].id); 
  };
  
  const saveNote = async () => {
    if (!transcript.trim() && !imageUrl) return;
    try {
        await addNote({ text: transcript.trim(), date: Date.now(), category: selectedCategory, isPinned: false, isExpanded: true, imageUrl: imageUrl || undefined });
        
        if (selectedCategory === 'idea') {
            setSaveAnimType(Math.random() > 0.5 ? 'brain' : 'lightning');
            setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 6000);
        } else if (selectedCategory === 'work') {
            setSaveAnimType('money');
            setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500);
        } else if (selectedCategory === 'journal') {
            setSaveAnimType('journal');
            setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500);
        } else if (selectedCategory === 'to-do' || selectedCategory === 'todo') {
            setSaveAnimType('fire');
            setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500);
        } else if (selectedCategory === 'secret') {
            setSaveAnimType(secretAnimType === 'matrix' ? 'matrix' : 'ghost');
            setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 6000);
        }

        setTranscript(''); setImageUrl('');
        scrollToBottom(); 
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (note: Note) => { 
    setEditingNote(note); 
    setEditNoteText(note.text); 
    setEditNoteImage(note.imageUrl || ''); 
  };
  
  const handleSaveEdit = async () => {
      if(editingNote) {
          const updates: Partial<Note> = { text: editNoteText };
          if(editNoteImage !== editingNote.imageUrl) updates.imageUrl = editNoteImage || undefined;
          await updateNote(editingNote.id, updates);
          setEditingNote(null);
      }
  };

  const handleDeleteNote = async (id: string) => { 
      const noteToDelete = notes.find(n => n.id === id);
      if (noteToDelete && (noteToDelete.category === 'to-do' || noteToDelete.category === 'todo')) {
          setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4500); 
      }
      await deleteNoteFromFirebase(id); 
  };

  const togglePin = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isPinned: !n.isPinned }); };
  const handleToggleExpand = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isExpanded: !n.isExpanded }); };

  const filteredNotes = notes.filter(n => {
      const matchesSearch = n.text.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === 'all') return n.category !== 'secret';
      if (activeFilter === 'secret') return n.category === 'secret';
      return n.category === activeFilter;
  }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.date - b.date;
  });

  const t = TRANSLATIONS;
  const getAlignmentClass = () => alignment === 'center' ? 'items-center' : alignment === 'right' ? 'items-end' : 'items-start';

  const isShortNote = !editNoteImage && editNoteText.length < 150;

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  return (
    <div className={`min-h-screen w-full bg-black text-zinc-100 font-sans ${currentTheme.selection} overflow-x-hidden ${currentTheme.font}`}>
      
      {editingNote ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-hidden touch-none flex flex-col justify-center">
            <div className={`w-full max-w-2xl mx-auto flex flex-col justify-center p-4 h-full pointer-events-none ${getAlignmentClass()}`}>
                <div 
                    id={`edit-card-${editingNote.id}`}
                    className={`
                        pointer-events-auto
                        ${editNoteImage ? 'w-fit mx-auto md:mx-0 md:w-96' : 'w-full md:w-96'} 
                        max-h-[85dvh] overscroll-y-none bg-zinc-900 border rounded-2xl p-3 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)] 
                        ${isShortNote ? 'overflow-y-hidden touch-none' : 'overflow-y-auto touch-pan-y'} 
                        ${editTheme.containerBorder}
                    `}
                >
                    <div className="w-full">
                        {editNoteImage ? (
                            <div className={`relative mb-2 rounded-xl overflow-hidden border bg-zinc-950 flex justify-center group/img ${editTheme.uploadBorder}`}>
                                <img src={editNoteImage} className="max-h-[35vh] md:max-h-96 w-auto max-w-full object-contain" alt="Editing" />
                                <button onClick={() => setEditNoteImage('')} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur text-white rounded-full hover:bg-red-500 transition-colors"><X size={14} /></button>
                            </div>
                        ) : (
                            <label className={`flex items-center justify-center gap-2 w-full py-3 border border-dashed rounded-xl cursor-pointer transition-all bg-zinc-900/30 ${editTheme.uploadBorder} ${editTheme.icon}`}>
                                <ImageIcon size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider">Add Image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0], true); }} />
                            </label>
                        )}
                    </div>
                    <textarea 
                        ref={editTextAreaRef}
                        autoFocus 
                        value={editNoteText} 
                        onChange={(e) => setEditNoteText(e.target.value)} 
                        onPaste={(e) => handlePaste(e, true)} 
                        className={`w-full bg-transparent text-base resize-none focus:outline-none leading-relaxed ${editTheme.text} ${editTheme.placeholder}`} 
                        placeholder="Type here..." 
                        style={{ height: 'auto', minHeight: '40px' }}
                    />
                    <div className="flex gap-2 pt-2 border-t border-white/5 mt-auto">
                        <button onClick={handleSaveEdit} className={`flex-1 h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all ${editTheme.saveBtn}`}>
                            <Check size={12} /> Save
                        </button>
                        <button onClick={() => setEditingNote(null)} className={`flex-1 h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border active:scale-95 transition-all ${editTheme.cancelBtn}`}>
                            <X size={12} /> Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <>
            {/* --- SLIDING HEADER --- */}
            <div className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-1000 ease-in-out pointer-events-none ${isInputFocused || showBars ? 'translate-y-0' : '-translate-y-full'}`}>
                <header className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3 pointer-events-auto">
                <button 
                        onClick={handleSecretTrigger}
                        className="flex-shrink-0 w-10 h-10 bg-zinc-900/80 border border-white/10 flex items-center justify-center rounded-xl active:scale-95 transition-transform relative overflow-visible backdrop-blur-md"
                >
                    {isStartup && (
                        <>
                            <div className="absolute inset-[-4px] border border-orange-500/50 rounded-xl animate-[spin_1s_linear_infinite] opacity-50" />
                            <div className="absolute inset-0 bg-orange-500 rounded-xl animate-ping opacity-75" style={{ animationDuration: '4.5s' }} />
                        </>
                    )}

                    {activeFilter === 'secret' ? (
                        secretAnimType === 'matrix' ? (
                            <Terminal className="text-green-500 relative z-10" size={16} />
                        ) : (
                            <EyeOff className="text-red-500 relative z-10" size={16} /> 
                        )
                    ) : (
                        <div 
                                className={`w-3 h-3 bg-orange-600 rounded-sm shadow-[0_0_10px_rgba(234,88,12,0.5)] relative z-10 ${isStartup ? 'animate-bounce' : ''}`}
                                style={isStartup ? { animation: `${startupAnimName} 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` } : {}}
                        ></div>
                    )}
                </button>

                <div className="flex-1 relative group pointer-events-auto">
                    <Search className={`absolute left-3.5 top-2.5 text-zinc-500 group-focus-within:${currentTheme.text} transition-colors`} size={16} />
                    <input 
                        type="text" 
                        placeholder={
                            activeFilter === 'secret' 
                                ? (secretAnimType === 'matrix' ? "System access..." : "Classified search...")
                                : t.search
                        }
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { setIsInputFocused(true); setShowBars(true); }}
                        onBlur={() => setIsInputFocused(false)}
                        className={`w-full bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-900 focus:bg-zinc-900 border border-transparent ${currentTheme.ring} rounded-xl py-2 pl-10 pr-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none text-base transition-all ${
                            activeFilter === 'secret' && secretAnimType === 'matrix' ? 'placeholder:text-green-800' : ''
                        }`}
                    />
                </div>
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center pointer-events-auto">
                    <div className="flex items-center justify-center w-full h-full rounded-full">
                        {syncing ? <Cloud className={`${currentTheme.text} animate-pulse`} size={16} /> : <Cloud className={currentTheme.text} size={16} />}
                    </div>
                </div>
                <button 
                    onClick={() => { setShowSettings(true); }} 
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900/80 backdrop-blur-md border border-transparent hover:bg-zinc-900 hover:border-white/10 text-zinc-500 hover:text-zinc-200 transition-all active:scale-95 pointer-events-auto"
                    >
                    <Settings size={18} />
                </button>
                </header>

                <div className="max-w-2xl mx-auto px-4 mt-2 pointer-events-auto">
                    <div className="grid grid-cols-5 w-full bg-zinc-900/80 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5">
                    {activeFilter === 'secret' ? (
                        <button className={`flex flex-row items-center justify-center gap-1.5 py-3 border-r border-white/5 relative col-span-5 ${currentTheme.text}`}>
                            <span className="text-[12px]">{secretAnimType === 'matrix' ? '💻' : '👻'}</span>
                            <span className="text-[10px] font-medium tracking-widest uppercase">
                                {secretAnimType === 'matrix' ? 'Hacker Mode Active' : 'Secret Mode Active'}
                            </span>
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={() => setActiveFilter('all')} 
                                className={`flex flex-row items-center justify-center gap-1.5 py-3 border-r border-white/5 relative group transition-colors ${activeFilter === 'all' ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <LayoutGrid size={13} className={activeFilter === 'all' ? 'text-orange-500' : 'text-zinc-500'} />
                                <span className="text-[10px] font-medium">{t.all}</span>
                            </button>
                            
                            {categories.map((cat, index) => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => { setActiveFilter(cat.id); setSelectedCategory(cat.id); }} 
                                    className={`flex flex-row items-center justify-center gap-1.5 py-3 relative group transition-colors ${index !== categories.length - 1 ? 'border-r border-white/5' : ''} ${activeFilter === cat.id ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <span className={`text-[12px] leading-none ${activeFilter === cat.id ? 'grayscale-0' : 'grayscale opacity-70'}`}>{cat.emoji}</span>
                                    <span className="text-[10px] font-medium truncate">{getCategoryLabel(cat)}</span>
                                </button>
                            ))}
                        </>
                    )}
                    </div>
                </div>
            </div>

            {/* --- LIST CONTAINER --- */}
            <div className={`pt-32 pb-0 px-4 max-w-2xl mx-auto flex flex-col gap-3 ${getAlignmentClass()}`}>
                
                {filteredNotes.map(note => (
                    <div 
                        key={note.id} 
                        onDoubleClick={() => handleToggleExpand(note.id)}
                        className="select-none touch-manipulation transition-transform duration-200 active:scale-[0.99]"
                    >
                        <NoteCard 
                            note={note} 
                            categories={activeFilter === 'secret' ? [activeSecretConfig] : categories} 
                            selectedVoice={selectedVoice} 
                            onDelete={handleDeleteNote} 
                            onPin={togglePin} 
                            onCategoryClick={(cat) => setActiveFilter(cat)} 
                            onEdit={() => handleEditClick(note)} 
                            onToggleExpand={handleToggleExpand} 
                        />
                    </div>
                ))}
                
                {filteredNotes.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg col-span-full opacity-50 w-full">
                        <LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} />
                        <p className="text-zinc-700 text-xs font-mono uppercase">
                            {activeFilter === 'secret' ? (secretAnimType === 'matrix' ? 'System Clean' : 'No Secrets Yet') : 'Start Typing...'}
                        </p>
                    </div>
                )}
                
                {/* SCROLL ANCHOR - FIXED HEIGHT */}
                <div ref={bottomRef} className="h-20 md:h-16 w-full shrink-0" />
            </div>

            {/* --- FIXED FOOTER --- */}
            <div className={`fixed bottom-0 left-0 right-0 z-40 p-3 pb-6 md:pb-3 pointer-events-none translate-y-0`}>
                <div className="max-w-2xl mx-auto flex items-end gap-2 pointer-events-auto">
                    <button onClick={cycleCategory} className="flex-shrink-0 h-10 mb-0.5 px-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center gap-2 transition-all active:scale-95 group shadow-lg shadow-black/50">
                        <span className="text-xs grayscale-0 transition-all">{currentCategoryConfig.emoji}</span>
                    </button>
                    <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors gap-3 shadow-lg shadow-black/50">
                        {imageUrl && <div className="relative flex-shrink-0 group/image"><div className="w-8 h-8 rounded overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div><button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"><X size={10} /></button></div>}
                        <textarea 
                            ref={textareaRef} 
                            value={transcript} 
                            onChange={(e) => setTranscript(e.target.value)} 
                            onPaste={(e) => handlePaste(e)} 
                            placeholder={activeFilter === 'secret' ? (secretAnimType === 'matrix' ? "Inject code..." : "Whisper a secret...") : t.typePlaceholder} 
                            rows={1} 
                            onFocus={() => { setIsInputFocused(true); setShowBars(true); scrollToBottom(); }}
                            onBlur={() => setIsInputFocused(false)}
                            className={`w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-base md:text-sm resize-none max-h-32 py-0.5 ${
                                activeFilter === 'secret' && secretAnimType === 'matrix' ? 'font-mono text-green-500 placeholder:text-green-800' : ''
                            }`} 
                        />
                    </div>
                    <button onClick={saveNote} disabled={!transcript.trim() && !imageUrl} className={`flex-shrink-0 w-10 h-10 mb-0.5 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg shadow-black/50 ${transcript.trim() || imageUrl ? `${currentTheme.bg} ${currentTheme.shadow} text-white` : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>{transcript.trim() || imageUrl ? <ArrowUp size={20} strokeWidth={3} /> : <Plus size={20} />}</button>
                </div>
            </div>
        </>
      )}

      <style>{`
        @keyframes logoEntrance { 0% { transform: scale(0) rotate(-180deg); } 60% { transform: scale(1.2) rotate(10deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes logoHeartbeat { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
        @keyframes logoGlitch { 0% { transform: translate(0); } 20% { transform: translate(-3px, 3px); } 40% { transform: translate(-3px, -3px); } 60% { transform: translate(3px, 3px); } 80% { transform: translate(3px, -3px); } 100% { transform: translate(0); } }
        @keyframes logoWobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg) scale(1.1); } 75% { transform: rotate(15deg) scale(1.1); } }
        
        @keyframes ghostFly { 0% { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 0; } 10% { opacity: 0.7; } 90% { opacity: 0.7; } 100% { transform: translateY(-110vh) rotate(${Math.random() > 0.5 ? 45 : -45}deg) scale(1.2); opacity: 0; } }
        @keyframes matrixRain { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh); opacity: 0; } }
        @keyframes rainDown { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh) rotate(${Math.random() * 90}deg); opacity: 0; } }
        
        @keyframes brainFloat { 
            0% { transform: translateY(0) scale(1); opacity: 0; }
            15% { opacity: 1; transform: translateY(-15vh) scale(1.4); } 
            30% { transform: translateY(-30vh) scale(0.8); } 
            45% { transform: translateY(-45vh) scale(1.4); } 
            60% { transform: translateY(-60vh) scale(0.8); } 
            75% { transform: translateY(-75vh) scale(1.4); } 
            90% { transform: translateY(-90vh) scale(0.8); } 
            100% { transform: translateY(-110vh) scale(1); opacity: 0; } 
        }

        @keyframes realFire { 
            0% { transform: translateY(20px) scale(0.5); opacity: 0; } 
            15% { opacity: 1; transform: translateY(-10px) scale(1.2); } 
            100% { transform: translateY(-30vh) scale(0); opacity: 0; } 
        }
        @keyframes lightningFlash { 0%, 100% { background-color: transparent; } 5%, 15% { background-color: rgba(255, 255, 255, 0.2); } 10% { background-color: transparent; } }
        @keyframes boltStrike { 0% { opacity: 0; transform: translateY(-100%) scale(0.5); } 10% { opacity: 1; transform: translateY(0) scale(1); } 30% { opacity: 1; } 100% { opacity: 0; } }
        
        @keyframes confettiGravity { 0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.5); opacity: 1; } 15% { transform: translate(calc(-50% + (var(--end-x) * 0.2)), calc(-50% - 20vh)) rotate(90deg) scale(1.2); opacity: 1; } 100% { transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) rotate(var(--rot)) scale(0.5); opacity: 0; } }
      `}</style>
    </div>
  );
}

export default App;