import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Settings, Download, Globe, ArrowLeft, ChevronRight, Plus, ArrowUp, LayoutGrid, Cloud, CloudOff, LogOut, Image as ImageIcon, X as RemoveIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard';
import { useFirebaseSync, useNotes } from './useFirebaseSync';
import Auth from './components/Auth';

// --- CONSTANTS ---
const EMOJI_LIST = [
  '⚡', '💼', '🔥', '💡', '🎨', '🚀', '⭐', 
  '📝', '📅', '🛒', '🏋️', '✈️', '🏠', 
  '💰', '🍔', '🎵', '🎮', '❤️', '🧠', '⏰', '🔧',
];

// --- TRANSLATIONS ---
const TRANSLATIONS = {
  en: {
    search: "SEARCH...",
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
    cat_todo: "To-Do"
  },
  ru: {
    search: "ПОИСК...",
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
    cat_todo: "Задачи"
  }
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
        let width = img.width;
        let height = img.height;
        
        // Resize to max 600px to ensure it fits in Firestore < 1MB
        const MAX_SIZE = 600;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.6 quality (60%)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function App() {
  // Firebase Authentication
  const { user, loading: authLoading } = useFirebaseSync();
  const { notes, addNote, deleteNote: deleteNoteFromFirebase, updateNote, syncing } = useNotes(user?.uid || null);
  
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('idea');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'icons'>('main'); 
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // --- HELPERS ---
  const getCategoryLabel = (cat: CategoryConfig) => {
    const id = cat.id.toLowerCase();
    const t = TRANSLATIONS[lang];
    if (lang === 'ru') {
        if (id === 'idea') return t.cat_idea;
        if (id === 'work') return t.cat_work;
        if (id === 'journal') return t.cat_journal;
        if (id === 'to-do' || id === 'todo') return t.cat_todo;
    } else {
        if (id === 'idea') return t.cat_idea;
        if (id === 'work') return t.cat_work;
        if (id === 'journal') return t.cat_journal;
        if (id === 'to-do' || id === 'todo') return t.cat_todo;
    }
    return cat.label; 
  };

  // --- IMAGE HANDLING ---
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Compress and Resize Image
      const compressedDataUrl = await compressImage(file);
      
      // Double check size (Firestore limit is ~1MB = 1,048,576 bytes)
      if (compressedDataUrl.length > 800000) {
          alert('Image is too complex even after compression. Please try a smaller image.');
          setIsUploadingImage(false);
          return;
      }

      setImageUrl(compressedDataUrl);
      setIsUploadingImage(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) await handleImageUpload(file);
        break;
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- EFFECTS ---
  useEffect(() => {
    try {
        const savedLang = localStorage.getItem('vibenotes_lang');
        if (savedLang === 'en' || savedLang === 'ru') setLang(savedLang);

        const savedAlignment = localStorage.getItem('vibenotes_alignment');
        if (savedAlignment === 'left' || savedAlignment === 'center' || savedAlignment === 'right') {
            setAlignment(savedAlignment as any);
        }

        const savedCats = localStorage.getItem('vibenotes_categories');
        if (savedCats) setCategories(JSON.parse(savedCats));

        const savedVoice = localStorage.getItem('vibenotes_voice');
        if (savedVoice) setSelectedVoiceURI(savedVoice);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const loadVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        let candidates = allVoices.filter(v => v.lang.startsWith(lang === 'en' ? 'en' : 'ru'));
        
        // Strict English Filter
        if (lang === 'en') {
            const premiumKeywords = ['natural', 'online', 'premium', 'enhanced', 'google', 'siri'];
            const trashKeywords = ['desktop', 'mobile', 'help'];
            let premiumVoices = candidates.filter(v => {
                const name = v.name.toLowerCase();
                const isPremium = premiumKeywords.some(k => name.includes(k));
                const isTrash = trashKeywords.some(k => name.includes(k));
                return isPremium || (['daniel', 'samantha', 'ava'].some(n => name.includes(n)) && !isTrash);
            });
            if (premiumVoices.length > 0) candidates = premiumVoices;
        } 
        // Russian backup
        else {
             const enBackup = allVoices.filter(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google')));
             candidates = [...candidates, ...enBackup];
        }
        setVoices(candidates);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [lang]);

  useEffect(() => {
    if (selectedVoiceURI && voices.length > 0) {
      setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null);
    }
  }, [selectedVoiceURI, voices]);

  useEffect(() => { localStorage.setItem('vibenotes_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('vibenotes_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [transcript]);

  // --- ACTIONS ---
  const handleCategoryEdit = (id: CategoryId, field: 'label' | 'emoji' | 'colorClass', value: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const cycleCategory = () => {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory);
    const nextIndex = (currentIndex + 1) % categories.length;
    setSelectedCategory(categories[nextIndex].id);
  };

  const saveNote = async () => {
    if (!transcript.trim() && !imageUrl) return;
    
    try {
        const newNote: Omit<Note, 'id'> = {
          text: transcript.trim(),
          date: Date.now(),
          category: selectedCategory,
          isPinned: false,
          isExpanded: true,
          imageUrl: imageUrl || undefined
        };
        
        await addNote(newNote);
        
        // Only clear form if save was successful
        setTranscript('');
        setImageUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
        console.error("Error saving note:", error);
        alert("Could not save note. If you attached an image, it might still be too large or the database is unreachable.");
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNoteFromFirebase(id);
  };
  
  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote(id, { isPinned: !note.isPinned });
    }
  };

  const handleToggleExpand = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote(id, { isExpanded: !note.isExpanded });
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `vibenotes_backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredNotes = notes
    .filter(n => {
      const matchesSearch = n.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeFilter === 'all' || n.category === activeFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });

  const currentCategoryConfig = categories.find(c => c.id === selectedCategory) || categories[0];
  const t = TRANSLATIONS[lang];

  // Helper for dynamic alignment class
  const getAlignmentClass = () => {
    if (alignment === 'center') return 'items-center';
    if (alignment === 'right') return 'items-end';
    return 'items-start'; // default left
  };

  // Show loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 text-xs uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 pb-24 font-sans selection:bg-orange-500/30">
      
      {/* HEADER */}
      <header className="max-w-2xl mx-auto mb-4 flex items-center gap-3">
         <div className="flex-shrink-0 w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-md">
             <div className="w-3 h-3 bg-orange-600 rounded-sm shadow-[0_0_10px_rgba(234,88,12,0.5)]"></div>
         </div>
         <div className="flex-1 relative group">
            <Search className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-white transition-colors" size={16} />
            <input 
                type="text" 
                placeholder={t.search}
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-9 pr-4 text-zinc-300 focus:outline-none focus:border-white transition-all placeholder:text-zinc-700 text-xs font-bold uppercase tracking-wider"
            />
         </div>
        {/* Sync Status Indicator */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
          {syncing ? (
            <Cloud className="text-orange-500 animate-pulse" size={16} />
          ) : user ? (
            <Cloud className="text-orange-500" size={16} />
          ) : (
            <CloudOff className="text-zinc-600" size={16} />
          )}
        </div>
        <button 
            onClick={() => { setShowSettings(true); setSettingsView('main'); }}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition-all active:scale-95"
        >
            <Settings size={20} />
        </button>
      </header>

      {/* FILTER CHIPS */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center w-full px-1">
        <button 
            onClick={() => setActiveFilter('all')} 
            className={`min-w-0 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 flex-shrink-0 ${
                activeFilter === 'all' 
                ? 'bg-black text-orange-500 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)] scale-105' 
                : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
            }`}
        >
            {t.all}
        </button>
        {categories.map((cat) => (
            <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`min-w-0 px-2 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 duration-300 ${
                    activeFilter === cat.id 
                    ? 'bg-black text-orange-500 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)] scale-105' 
                    : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                }`}
            >
                <span className="grayscale text-[10px]">{cat.emoji}</span>
                <span className="truncate">{getCategoryLabel(cat)}</span>
            </button>
        ))}
      </div>

      {/* NOTE LIST */}
      <div className={`max-w-2xl mx-auto flex flex-col gap-3 ${getAlignmentClass()}`}>
          {filteredNotes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              categories={categories}
              selectedVoice={selectedVoice}
              onDelete={handleDeleteNote} 
              onPin={togglePin} 
              onCategoryClick={(cat) => setActiveFilter(cat)}
              onEdit={(n) => {
                setTranscript(n.text);
                setSelectedCategory(n.category);
                setImageUrl(n.imageUrl || '');
                handleDeleteNote(n.id);
             }}
              onUpdate={updateNote}
              onToggleExpand={handleToggleExpand}
            />
          ))}
          {filteredNotes.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg col-span-full opacity-50 w-full">
                  <LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} />
                  <p className="text-zinc-700 text-xs font-mono uppercase">Database Empty</p>
              </div>
          )}
      </div>

      {/* VIBE BAR */}
      <div className="fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-xl border-t border-zinc-900 p-3 pb-6 md:pb-3 z-50">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
              <button 
                  onClick={cycleCategory}
                  className="flex-shrink-0 h-10 mb-0.5 px-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center gap-2 transition-all active:scale-95 group"
              >
                  <span className="text-xs grayscale group-hover:grayscale-0 transition-all">{currentCategoryConfig.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 hidden sm:inline-block">
                    {getCategoryLabel(currentCategoryConfig)}
                  </span>
              </button>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors gap-3">
                  {imageUrl && (
                      <div className="relative flex-shrink-0 group/image">
                          <div className="w-8 h-8 rounded overflow-hidden border border-zinc-700">
                              <img src={imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                          </div>
                          <button 
                              onClick={handleRemoveImage}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"
                          >
                              <X size={10} />
                          </button>
                      </div>
                  )}
                  <textarea
                      ref={textareaRef}
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      onPaste={handlePaste}
                      placeholder={t.typePlaceholder}
                      rows={1}
                      className="w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-sm resize-none max-h-32 py-0.5"
                  />
              </div>
              <button 
                  onClick={saveNote}
                  disabled={!transcript.trim() && !imageUrl}
                  className={`flex-shrink-0 w-10 h-10 mb-0.5 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                      transcript.trim() || imageUrl
                      ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' 
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                  }`}
              >
                  {transcript.trim() || imageUrl ? <ArrowUp size={20} strokeWidth={3} /> : <Plus size={20} />}
              </button>
          </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 z-50 flex justify-center sm:items-center bg-black sm:bg-black/80 animate-in fade-in duration-200">
             <div className="w-full h-full sm:h-auto sm:max-w-md bg-black sm:border border-zinc-800 sm:rounded-2xl p-4 pt-12 sm:pt-6 shadow-2xl relative flex flex-col">
                
                {/* --- VIEW 1: MAIN SETTINGS --- */}
                {settingsView === 'main' && (
                    <div className="flex flex-col h-full animate-in slide-in-from-left-5 duration-300">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                                {t.config}
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Sync Status */}
                        <div className="mb-4 flex items-center justify-between py-3 px-3 rounded-lg bg-zinc-900 border border-zinc-800">
                            <label className="text-[9px] uppercase text-zinc-600 font-bold tracking-widest">Status</label>
                            <div className="flex items-center gap-2">
                              {user ? (
                                <>
                                  <Cloud className="text-orange-500" size={12} />
                                  <span className="text-[10px] font-bold text-orange-500 tracking-wider">{syncing ? t.syncing : t.synced}</span>
                                </>
                              ) : (
                                <>
                                  <CloudOff className="text-zinc-600" size={12} />
                                  <span className="text-[10px] font-bold text-zinc-600 tracking-wider">{t.offline}</span>
                                </>
                              )}
                            </div>
                        </div>

                        {/* Alignment */}
                        <div className="mb-4 flex items-center justify-between py-3 px-3 rounded-lg bg-zinc-900 border border-zinc-800">
                            <label className="text-[9px] uppercase text-zinc-600 font-bold tracking-widest">{t.alignLabel}</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setAlignment('left')} 
                                    className={`p-1.5 rounded-md border transition-all ${alignment === 'left' ? 'bg-zinc-800 border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <AlignLeft size={16} />
                                </button>
                                <button 
                                    onClick={() => setAlignment('center')} 
                                    className={`p-1.5 rounded-md border transition-all ${alignment === 'center' ? 'bg-zinc-800 border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <AlignCenter size={16} />
                                </button>
                                <button 
                                    onClick={() => setAlignment('right')} 
                                    className={`p-1.5 rounded-md border transition-all ${alignment === 'right' ? 'bg-zinc-800 border-orange-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <AlignRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="mb-4 flex items-center justify-between py-3 px-3 rounded-lg bg-zinc-900 border border-zinc-800">
                            <label className="text-[9px] uppercase text-zinc-600 font-bold tracking-widest">{t.languageLabel}</label>
                            <button onClick={() => setLang(l => l === 'en' ? 'ru' : 'en')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black border border-zinc-800 hover:border-orange-500 transition-all active:scale-95">
                                <Globe size={12} className="text-zinc-500" />
                                <span className="text-[10px] font-bold text-white tracking-wider">{lang === 'en' ? 'EN' : 'RU'}</span>
                            </button>
                        </div>

                        {/* Audio */}
                        <div className="mb-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                            <label className="text-[9px] uppercase text-zinc-600 font-bold tracking-widest mb-2 block">{t.audioLabel}</label>
                            <select 
                                value={selectedVoiceURI}
                                onChange={(e) => { setSelectedVoiceURI(e.target.value); localStorage.setItem('vibenotes_voice', e.target.value); }}
                                className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
                            >
                                {voices.length === 0 && <option>{t.noVoices}</option>}
                                {voices.map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                        {v.name.replace('Microsoft ', '').replace('English (United States)', 'US').replace('English (United Kingdom)', 'UK')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Categories List */}
                        <div className="flex-1 mb-4">
                            <label className="text-[9px] uppercase text-zinc-600 font-bold mb-3 block tracking-widest px-1">{t.tagsLabel}</label>
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setEditingCatId(cat.id); setSettingsView('icons'); }}
                                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.98] group"
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-black border border-zinc-800 text-sm grayscale group-hover:grayscale-0 transition-all">
                                            {cat.emoji}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[11px] font-bold text-zinc-300 tracking-wide">{getCategoryLabel(cat)}</p>
                                        </div>
                                        <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-zinc-900 mt-auto space-y-2">
                            <button onClick={handleExport} className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                <Download size={12} /> {t.backup}
                            </button>
                            <button onClick={handleLogout} className="w-full py-2.5 bg-red-900/20 border border-red-900/50 text-red-400 hover:text-red-300 hover:border-red-800 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                <LogOut size={12} /> {t.logout}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: ICON PICKER --- */}
                {settingsView === 'icons' && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-5 duration-300">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <button onClick={() => setSettingsView('main')} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95">
                                <ArrowLeft size={16} />
                            </button>
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t.selectIcon}</h2>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-6 gap-2">
                            {EMOJI_LIST.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { 
                                        if(editingCatId) handleCategoryEdit(editingCatId, 'emoji', emoji); 
                                        setSettingsView('main');
                                    }}
                                    className="aspect-square flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-black hover:border-orange-500 text-base grayscale hover:grayscale-0 transition-all active:scale-95"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

             </div>
         </div>
      )}
    </div>
  );
}

export default App;