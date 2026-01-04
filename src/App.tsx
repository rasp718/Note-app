import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Settings, Download, ArrowLeft, ChevronRight, Plus, ArrowUp, LayoutGrid, Cloud, LogOut, Image as ImageIcon, Check, EyeOff } from 'lucide-react'; 
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard'; 
import { useFirebaseSync, useNotes } from './useFirebaseSync';
import Auth from './components/Auth';

const EMOJI_LIST = ['⚡', '💼', '🔥', '💡', '🎨', '🚀', '⭐', '📝', '📅', '🛒', '🏋️', '✈️', '🏠', '💰', '🍔', '🎵', '🎮', '❤️', '🧠', '⏰', '🔧', '👻']; 

const TRANSLATIONS = { 
  en: { 
    search: "Search notes...", 
    all: "All", 
    config: "Config", 
    audioLabel: "Audio Voice", 
    tagsLabel: "Categories", 
    alignLabel: "Card Alignment", 
    dataLabel: "Data", 
    backup: "Download Backup", 
    typePlaceholder: "Type a note...", 
    noVoices: "No Premium Voices Found", 
    defaultVoice: "System Default", 
    languageLabel: "Language", 
    selectIcon: "Select Icon", 
    syncing: "Syncing...", 
    synced: "Synced", 
    offline: "Offline", 
    logout: "Logout", 
    cat_idea: "Idea", 
    cat_work: "Work", 
    cat_journal: "Journal", 
    cat_todo: "To-Do",
    cat_secret: "Classified", 
    editNote: "Edit Note" 
  }, 
  ru: { 
    search: "Поиск...", 
    all: "Все", 
    config: "Настройки", 
    audioLabel: "Голос", 
    tagsLabel: "Категории", 
    alignLabel: "Выравнивание", 
    dataLabel: "Данные", 
    backup: "Скачать бэкап", 
    typePlaceholder: "Введите заметку...", 
    noVoices: "Голоса не найдены", 
    defaultVoice: "По умолчанию", 
    languageLabel: "Язык", 
    selectIcon: "Выберите иконку", 
    syncing: "Синхронизация...", 
    synced: "Синхронизировано", 
    offline: "Оффлайн", 
    logout: "Выйти", 
    cat_idea: "Идея", 
    cat_work: "Работа", 
    cat_journal: "Дневник", 
    cat_todo: "Задачи",
    cat_secret: "Секретно",
    editNote: "Редактировать" 
  } 
};

const SECRET_CATEGORY_CONFIG: CategoryConfig = {
    id: 'secret',
    label: 'Secret',
    emoji: '👻',
    colorClass: 'bg-red-500'
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

// --- HELPER COMPONENT: MATRIX RAIN DROP ---
// Handles the rapid character changing without re-rendering the whole app
const MatrixRainDrop = ({ style }: { style: React.CSSProperties }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    // Katakana + Numbers + Symbols
    const chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789:・.=*+-<>";

    useEffect(() => {
        const interval = setInterval(() => {
            if (elementRef.current) {
                // Directly update DOM for performance
                elementRef.current.innerText = chars[Math.floor(Math.random() * chars.length)];
            }
        }, 60); // Change character every 60ms

        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            ref={elementRef}
            className="absolute text-green-500 font-mono font-bold leading-none writing-vertical-rl select-none"
            style={{
                ...style,
                textShadow: '0 0 8px rgba(34, 197, 94, 0.8)' // Neon glow effect
            }}
        >
            {chars[Math.floor(Math.random() * chars.length)]}
        </div>
    );
};

function App() {
  const { user, loading: authLoading } = useFirebaseSync();
  const { notes, addNote, deleteNote: deleteNoteFromFirebase, updateNote, syncing } = useNotes(user?.uid || null);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const editTextAreaRef = useRef<HTMLTextAreaElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all' | 'secret'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'secret'>('idea');
  
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'icons'>('main'); 
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
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
  
  // Randomize Startup Animation
  const [startupAnimName] = useState(() => {
    const anims = ['logoEntrance', 'logoHeartbeat', 'logoGlitch', 'logoWobble'];
    const seed = Date.now(); 
    return anims[seed % anims.length];
  });

  const [showConfetti, setShowConfetti] = useState(false);
  
  // SAVE ANIMATION STATES
  const [showSaveAnim, setShowSaveAnim] = useState(false);
  const [saveAnimType, setSaveAnimType] = useState<'brain' | 'lightning' | 'money' | 'journal' | 'fire' | null>(null);

  // EDIT STATE
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editNoteImage, setEditNoteImage] = useState('');

  // 1. LOCK BODY SCROLL WHEN EDITING
  useEffect(() => {
    if (editingNote) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
    return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    };
  }, [editingNote]);

  const getCategoryLabel = (cat: CategoryConfig) => {
    if (cat.id === 'secret') return TRANSLATIONS[lang].cat_secret;
    const id = cat.id.toLowerCase();
    const t = TRANSLATIONS[lang];
    if (lang === 'ru') return { idea: t.cat_idea, work: t.cat_work, journal: t.cat_journal, 'to-do': t.cat_todo, todo: t.cat_todo }[id] || cat.label;
    return { idea: t.cat_idea, work: t.cat_work, journal: t.cat_journal, 'to-do': t.cat_todo, todo: t.cat_todo }[id] || cat.label;
  };

  const handleSecretTrigger = () => {
    setSecretTaps(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000);

    if (secretTaps + 1 >= 5) {
        setActiveFilter('secret');
        setSelectedCategory('secret');
        setSecretTaps(0);
        
        // Randomly choose animation type
        const type = Math.random() > 0.5 ? 'ghost' : 'matrix';
        setSecretAnimType(type);
        setShowSecretAnim(true);

        setTimeout(() => setShowSecretAnim(false), 5000); 
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  const currentCategoryConfig = selectedCategory === 'secret' ? SECRET_CATEGORY_CONFIG : categories.find(c => c.id === selectedCategory) || categories[0];

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
      if (currentScrollY < 10) { setShowBars(true); lastScrollY.current = currentScrollY; return; }
      if (currentScrollY > lastScrollY.current) { setShowBars(false); } else { setShowBars(true); }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInputFocused, editingNote]); 

  // Auto-resize logic for the edit textarea
  useEffect(() => {
    if (editingNote && editTextAreaRef.current) {
        editTextAreaRef.current.style.height = 'auto';
        editTextAreaRef.current.style.height = editTextAreaRef.current.scrollHeight + 'px';
    }
  }, [editingNote, editNoteText]); 

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsStartup(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
        const savedLang = localStorage.getItem('vibenotes_lang'); if(savedLang) setLang(savedLang as any);
        const savedAlignment = localStorage.getItem('vibenotes_alignment'); if(savedAlignment) setAlignment(savedAlignment as any);
        const savedCats = localStorage.getItem('vibenotes_categories'); if(savedCats) setCategories(JSON.parse(savedCats));
        const savedVoice = localStorage.getItem('vibenotes_voice'); if(savedVoice) setSelectedVoiceURI(savedVoice);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const loadVoices = () => {
        const all = window.speechSynthesis.getVoices();
        setVoices(all.filter(v => v.lang.startsWith(lang === 'en' ? 'en' : 'ru')));
    };
    loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [lang]);

  useEffect(() => { if (selectedVoiceURI) setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null); }, [selectedVoiceURI, voices]);
  useEffect(() => { localStorage.setItem('vibenotes_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('vibenotes_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; } }, [transcript]);

  const handleCategoryEdit = (id: CategoryId, field: 'label' | 'emoji' | 'colorClass', value: string) => setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  
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
        
        // TRIGGER ANIMATIONS BASED ON CATEGORY
        if (selectedCategory === 'idea') {
            setSaveAnimType(Math.random() > 0.5 ? 'brain' : 'lightning');
            setShowSaveAnim(true);
            setTimeout(() => setShowSaveAnim(false), 3500);
        } else if (selectedCategory === 'work') {
            setSaveAnimType('money');
            setShowSaveAnim(true);
            setTimeout(() => setShowSaveAnim(false), 3500);
        } else if (selectedCategory === 'journal') {
            setSaveAnimType('journal');
            setShowSaveAnim(true);
            setTimeout(() => setShowSaveAnim(false), 3500);
        } else if (selectedCategory === 'to-do' || selectedCategory === 'todo') {
            setSaveAnimType('fire');
            setShowSaveAnim(true);
            setTimeout(() => setShowSaveAnim(false), 3500);
        }

        setTranscript(''); setImageUrl('');
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
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4500); 
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
  }).sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  const t = TRANSLATIONS[lang];
  const getAlignmentClass = () => alignment === 'center' ? 'items-center' : alignment === 'right' ? 'items-end' : 'items-start';

  // SCROLL LOGIC
  const isShortNote = !editNoteImage && editNoteText.length < 150;

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  return (
    <div className="min-h-screen w-full bg-black text-zinc-100 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {editingNote ? (
        /* =========================================
           EDIT MODE (STRICT ISOLATION)
           ========================================= */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 overflow-hidden touch-none">
            <div 
                id={`edit-card-${editingNote.id}`}
                className={`w-full max-w-2xl max-h-[85dvh] overscroll-y-none bg-black border border-orange-500/50 rounded-2xl p-4 flex flex-col gap-4 shadow-[0_0_30px_rgba(234,88,12,0.1)] ${
                    isShortNote ? 'overflow-y-hidden touch-none' : 'overflow-y-auto touch-pan-y'
                }`}
            >
                <div className="w-full">
                    {editNoteImage ? (
                        <div className="relative mb-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex justify-center max-h-80 group/img">
                            <img src={editNoteImage} className="w-full h-auto object-contain" alt="Editing" />
                            <button onClick={() => setEditNoteImage('')} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur text-white rounded-full hover:bg-red-500 transition-colors"><X size={14} /></button>
                        </div>
                    ) : (
                        <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 cursor-pointer transition-all bg-zinc-900/30">
                            <ImageIcon size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Add Image</span>
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
                    className="w-full bg-transparent text-lg text-zinc-100 placeholder:text-zinc-700 resize-none focus:outline-none leading-relaxed" 
                    placeholder="Type here..." 
                    style={{ height: 'auto', minHeight: '40px' }}
                />
                <div className="flex gap-2 pt-2 border-t border-white/5 mt-auto">
                    <button onClick={handleSaveEdit} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 active:scale-95 transition-all">
                        <Check size={16} /> Save
                    </button>
                    <button onClick={() => setEditingNote(null)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-800 active:scale-95 transition-all">
                        <X size={16} /> Cancel
                    </button>
                </div>
            </div>
        </div>
      ) : (
        /* =========================================
           VIEW MODE (DASHBOARD)
           ========================================= */
        <>
            {/* HEADER */}
            <div className={`fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 transition-transform duration-1000 ease-in-out ${isInputFocused || showBars ? 'translate-y-0' : '-translate-y-full'}`}>
                <header className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
                <button 
                        onClick={handleSecretTrigger}
                        className="flex-shrink-0 w-10 h-10 bg-zinc-900/80 border border-white/10 flex items-center justify-center rounded-xl active:scale-95 transition-transform relative overflow-visible"
                >
                    {isStartup && (
                        <>
                            <div className="absolute inset-[-4px] border border-orange-500/50 rounded-xl animate-[spin_1s_linear_infinite] opacity-50" />
                            <div className="absolute inset-0 bg-orange-500 rounded-xl animate-ping opacity-75" style={{ animationDuration: '1.5s' }} />
                        </>
                    )}

                    {activeFilter === 'secret' ? (
                        <EyeOff className="text-red-500 relative z-10" size={16} /> 
                    ) : (
                        <div 
                                className={`w-3 h-3 bg-orange-600 rounded-sm shadow-[0_0_10px_rgba(234,88,12,0.5)] relative z-10 ${isStartup ? 'animate-bounce' : ''}`}
                                style={isStartup ? { animation: `${startupAnimName} 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` } : {}}
                        ></div>
                    )}
                </button>

                <div className="flex-1 relative group">
                    <Search className="absolute left-3.5 top-2.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" size={16} />
                    <input 
                        type="text" 
                        placeholder={activeFilter === 'secret' ? "Classified search..." : t.search}
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { setIsInputFocused(true); setShowBars(true); }}
                        onBlur={() => setIsInputFocused(false)}
                        className="w-full bg-zinc-900/50 hover:bg-zinc-900 focus:bg-zinc-900 border border-transparent focus:border-white/10 rounded-xl py-2 pl-10 pr-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none text-base transition-all"
                    />
                </div>
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    <div className="flex items-center justify-center w-full h-full rounded-full">
                        {syncing ? <Cloud className="text-orange-500/80 animate-pulse" size={16} /> : <Cloud className="text-orange-500/80" size={16} />}
                    </div>
                </div>
                <button 
                    onClick={() => { setShowSettings(true); setSettingsView('main'); }} 
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900/50 border border-transparent hover:bg-zinc-900 hover:border-white/10 text-zinc-500 hover:text-zinc-200 transition-all active:scale-95"
                    >
                    <Settings size={18} />
                </button>
                </header>

                <div className="max-w-2xl mx-auto grid grid-cols-5 w-full border-t border-white/5">
                {activeFilter === 'secret' ? (
                    <button className="flex flex-row items-center justify-center gap-1.5 py-3 border-r border-white/5 relative text-red-500 col-span-5">
                        <span className="text-[12px]">👻</span>
                        <span className="text-[10px] font-medium tracking-widest uppercase">Secret Mode Active</span>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
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
                                onClick={() => setActiveFilter(cat.id)} 
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

            {/* MAIN LIST */}
            <div className={`pt-32 pb-32 px-4 max-w-2xl mx-auto flex flex-col gap-3 ${getAlignmentClass()}`}>
                {filteredNotes.map(note => (
                    <NoteCard 
                        key={note.id} 
                        note={note} 
                        categories={activeFilter === 'secret' ? [SECRET_CATEGORY_CONFIG] : categories} 
                        selectedVoice={selectedVoice} 
                        onDelete={handleDeleteNote} 
                        onPin={togglePin} 
                        onCategoryClick={(cat) => setActiveFilter(cat)} 
                        onEdit={() => handleEditClick(note)} 
                        onToggleExpand={handleToggleExpand} 
                    />
                ))}
                
                {filteredNotes.length === 0 && <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg col-span-full opacity-50 w-full"><LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} /><p className="text-zinc-700 text-xs font-mono uppercase">{activeFilter === 'secret' ? 'No Secrets Yet' : 'Database Empty'}</p></div>}
            </div>

            {/* FOOTER */}
            <div className={`fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-zinc-900 p-3 pb-6 md:pb-3 transition-transform duration-1000 ease-in-out ${isInputFocused || showBars ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="max-w-2xl mx-auto flex items-end gap-2">
                    <button onClick={cycleCategory} className="flex-shrink-0 h-10 mb-0.5 px-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center gap-2 transition-all active:scale-95 group">
                        <span className="text-xs grayscale-0 transition-all">{currentCategoryConfig.emoji}</span>
                    </button>
                    <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors gap-3">
                        {imageUrl && <div className="relative flex-shrink-0 group/image"><div className="w-8 h-8 rounded overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div><button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"><X size={10} /></button></div>}
                        <textarea 
                            ref={textareaRef} 
                            value={transcript} 
                            onChange={(e) => setTranscript(e.target.value)} 
                            onPaste={(e) => handlePaste(e)} 
                            placeholder={activeFilter === 'secret' ? "Whisper a secret..." : t.typePlaceholder} 
                            rows={1} 
                            onFocus={() => { setIsInputFocused(true); setShowBars(true); }}
                            onBlur={() => setIsInputFocused(false)}
                            className="w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-base md:text-sm resize-none max-h-32 py-0.5" 
                        />
                    </div>
                    <button onClick={saveNote} disabled={!transcript.trim() && !imageUrl} className={`flex-shrink-0 w-10 h-10 mb-0.5 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${transcript.trim() || imageUrl ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>{transcript.trim() || imageUrl ? <ArrowUp size={20} strokeWidth={3} /> : <Plus size={20} />}</button>
                </div>
            </div>
        </>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 z-[60] flex justify-center sm:items-center bg-black sm:bg-black/80 animate-in fade-in duration-200">
             <div className="w-full h-full sm:h-auto sm:max-w-md bg-black sm:border border-zinc-800 sm:rounded-2xl p-4 pt-12 sm:pt-6 shadow-2xl relative flex flex-col">
                <div className="flex justify-between items-center mb-6"><h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">{t.config}</h2><button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95"><X size={16} /></button></div>
                {settingsView === 'main' ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex-1 overflow-y-auto space-y-2">{categories.map((cat) => (<button key={cat.id} onClick={() => { setEditingCatId(cat.id); setSettingsView('icons'); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800"><div className="w-8 h-8 flex items-center justify-center rounded-full bg-black border border-zinc-800 text-sm grayscale">{cat.emoji}</div><p className="text-[11px] font-bold text-zinc-300">{getCategoryLabel(cat)}</p></button>))}</div>
                        <div className="pt-4 border-t border-zinc-900 space-y-2">
                          <button onClick={() => { const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes)); const a = document.createElement('a'); a.href = data; a.download = 'backup.json'; a.click(); }} className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"><Download size={12} /> {t.backup}</button>
                          <button onClick={() => signOut(auth)} className="w-full py-2.5 bg-orange-900/20 border border-orange-900/50 text-orange-500 hover:text-orange-400 hover:border-orange-700 hover:bg-orange-900/30 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"><LogOut size={12} /> {t.logout}</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-6 gap-2">{EMOJI_LIST.map(emoji => (<button key={emoji} onClick={() => { if(editingCatId) handleCategoryEdit(editingCatId, 'emoji', emoji); setSettingsView('main'); }} className="aspect-square flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-base grayscale hover:grayscale-0">{emoji}</button>))}</div>
                )}
             </div>
         </div>
      )}

      {/* CONFETTI OVERLAY */}
      {showConfetti && !editingNote && (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
             {Array.from({ length: 80 }).map((_, i) => {
                 const style = {
                     backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800'][Math.floor(Math.random() * 7)],
                     left: '50%',
                     top: '50%',
                     width: `${Math.random() * 6 + 4}px`, 
                     height: `${Math.random() * 6 + 4}px`,
                     '--end-x': `${(Math.random() - 0.5) * 150}vw`, 
                     '--end-y': `${Math.random() * 100 + 50}vh`, 
                     '--rot': `${Math.random() * 1080}deg`, 
                     animation: `confettiGravity ${2.5 + Math.random() * 2}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                 } as React.CSSProperties;

                 return <div key={i} className="absolute rounded-sm" style={style} />
             })}
        </div>
      )}

      {/* SAVE ANIMATIONS */}
      {showSaveAnim && !editingNote && (
        <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {/* BRAIN (Rise + Pulse) */}
            {saveAnimType === 'brain' && Array.from({ length: 20 }).map((_, i) => (
                <div 
                    key={i} 
                    className="absolute text-4xl"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        bottom: '-50px',
                        fontSize: `${Math.random() * 25 + 15}px`,
                        opacity: 0,
                        animation: `brainFloat ${3 + Math.random() * 2}s linear forwards`,
                        animationDelay: `${Math.random() * 1.5}s`
                    }}
                >
                    🧠
                </div>
            ))}

            {/* LIGHTNING (Flash + Strike) */}
            {saveAnimType === 'lightning' && (
                <>
                    <div className="absolute inset-0 bg-white/10 animate-[lightningFlash_0.5s_ease-in-out_2]" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div 
                            key={i} 
                            className="absolute text-6xl text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.8)]"
                            style={{
                                left: `${Math.random() * 80 + 10}vw`,
                                top: `${Math.random() * 40 + 10}vh`,
                                animation: `boltStrike 0.3s ease-out forwards`,
                                animationDelay: `${Math.random() * 1.5}s`
                            }}
                        >
                            ⚡
                        </div>
                    ))}
                </>
            )}

            {/* MONEY (Rain Down) */}
            {saveAnimType === 'money' && Array.from({ length: 30 }).map((_, i) => (
                <div 
                    key={i} 
                    className="absolute text-4xl"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        top: '-50px',
                        fontSize: `${Math.random() * 25 + 15}px`,
                        opacity: 0,
                        animation: `rainDown ${2 + Math.random() * 2}s linear forwards`,
                        animationDelay: `${Math.random() * 1.5}s`
                    }}
                >
                    💰
                </div>
            ))}

            {/* JOURNAL (Rise like Ghost) */}
            {saveAnimType === 'journal' && Array.from({ length: 20 }).map((_, i) => (
                <div 
                    key={i} 
                    className="absolute text-4xl"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        bottom: '-50px',
                        fontSize: `${Math.random() * 25 + 15}px`,
                        opacity: 0,
                        animation: `ghostFly ${3 + Math.random() * 2}s linear forwards`,
                        animationDelay: `${Math.random() * 1.5}s`
                    }}
                >
                    📝
                </div>
            ))}

            {/* FIRE EMBERS (To-Do) */}
            {saveAnimType === 'fire' && Array.from({ length: 40 }).map((_, i) => (
                <div 
                    key={i} 
                    className="absolute rounded-full blur-[2px]"
                    style={{
                        background: 'linear-gradient(to top, #ff4500, #ff8c00, #fbbf24)',
                        width: `${Math.random() * 8 + 3}px`,
                        height: `${Math.random() * 8 + 3}px`,
                        left: `${Math.random() * 100}vw`,
                        bottom: '-20px',
                        opacity: 0,
                        animation: `emberRise ${3 + Math.random() * 2}s linear forwards`,
                        animationDelay: `${Math.random() * 1.5}s`,
                        '--drift': `${(Math.random() - 0.5) * 100}px`
                    } as React.CSSProperties}
                />
            ))}
        </div>
      )}

      {/* SECRET ANIMATIONS (GHOSTS OR MATRIX) */}
      {showSecretAnim && !editingNote && (
        <div className={`fixed inset-0 z-[60] pointer-events-none overflow-hidden ${secretAnimType === 'matrix' ? 'bg-black/80' : ''}`}>
             
             {/* GHOSTS VARIANT */}
             {secretAnimType === 'ghost' && Array.from({ length: 15 }).map((_, i) => (
                <div 
                    key={i} 
                    className="absolute text-4xl"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        bottom: '-50px',
                        fontSize: `${Math.random() * 30 + 20}px`,
                        opacity: 0,
                        animation: `ghostFly ${3 + Math.random() * 2}s linear forwards`,
                        animationDelay: `${Math.random() * 2}s`
                    }}
                >
                    👻
                </div>
             ))}

             {/* MATRIX VARIANT */}
             {secretAnimType === 'matrix' && Array.from({ length: 40 }).map((_, i) => (
                <MatrixRainDrop 
                    key={i}
                    style={{
                        left: `${Math.random() * 100}vw`,
                        top: '-100px',
                        fontSize: `${Math.random() * 15 + 10}px`,
                        opacity: 0,
                        animation: `matrixRain ${2 + Math.random() * 3}s linear forwards`,
                        animationDelay: `${Math.random() * 2}s`
                    }} 
                />
             ))}
        </div>
      )}

      {/* KEYFRAMES */}
      <style>{`
        @keyframes logoEntrance { 0% { transform: scale(0) rotate(-180deg); } 60% { transform: scale(1.2) rotate(10deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes logoHeartbeat { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
        @keyframes logoGlitch { 0% { transform: translate(0); } 20% { transform: translate(-3px, 3px); } 40% { transform: translate(-3px, -3px); } 60% { transform: translate(3px, 3px); } 80% { transform: translate(3px, -3px); } 100% { transform: translate(0); } }
        @keyframes logoWobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg) scale(1.1); } 75% { transform: rotate(15deg) scale(1.1); } }
        
        @keyframes ghostFly { 0% { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 0; } 10% { opacity: 0.7; } 90% { opacity: 0.7; } 100% { transform: translateY(-110vh) rotate(${Math.random() > 0.5 ? 45 : -45}deg) scale(1.2); opacity: 0; } }
        @keyframes matrixRain { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh); opacity: 0; } }
        @keyframes rainDown { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(110vh) rotate(${Math.random() * 90}deg); opacity: 0; } }
        @keyframes brainFloat { 0% { transform: translateY(0) scale(1); opacity: 0; } 20% { opacity: 1; transform: translateY(-20vh) scale(1.3); } 50% { transform: translateY(-50vh) scale(0.9); } 80% { transform: translateY(-80vh) scale(1.3); } 100% { transform: translateY(-110vh) scale(1); opacity: 0; } }
        @keyframes emberRise { 0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; } 100% { transform: translateY(-100vh) translateX(var(--drift)) scale(0); opacity: 0; } }
        @keyframes lightningFlash { 0%, 100% { background-color: transparent; } 5%, 15% { background-color: rgba(255, 255, 255, 0.2); } 10% { background-color: transparent; } }
        @keyframes boltStrike { 0% { opacity: 0; transform: translateY(-100%) scale(0.5); } 10% { opacity: 1; transform: translateY(0) scale(1); } 30% { opacity: 1; } 100% { opacity: 0; } }
        
        @keyframes confettiGravity { 0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.5); opacity: 1; } 15% { transform: translate(calc(-50% + (var(--end-x) * 0.2)), calc(-50% - 20vh)) rotate(90deg) scale(1.2); opacity: 1; } 100% { transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) rotate(var(--rot)) scale(0.5); opacity: 0; } }
      `}</style>
    </div>
  );
}

export default App;