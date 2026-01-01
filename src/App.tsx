import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Settings, LayoutGrid, Plus, Download, Send, ArrowUp, Lock, Globe } from 'lucide-react';
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard';
import CryptoJS from 'crypto-js';

// --- CONSTANTS ---
const EMOJI_LIST = [
  '⚡', '💼', '🔥', '💡', '🎨', '🚀', '⭐', 
  '📝', '📅', '🛒', '🏋️', '✈️', '🏠', 
  '💰', '🍔', '🎵', '🎮', '❤️', '🧠', '⏰', '🔧',
];

// SECRET KEY for Encryption
const SECRET_KEY = "vibenotes-super-secret-key-2025"; 

// --- TRANSLATIONS ---
const TRANSLATIONS = {
  en: {
    search: "SEARCH...",
    all: "All",
    config: "Config",
    audioLabel: "Audio Feedback (Premium Only)",
    tagsLabel: "Tags",
    dataLabel: "Data Management",
    backup: "Download Backup",
    typePlaceholder: "Type a note...",
    noVoices: "No Premium Voices Found",
    defaultVoice: "System Default",
    languageLabel: "Language", // New
    // Categories
    cat_idea: "Idea",
    cat_work: "Work",
    cat_journal: "Journal",
    cat_todo: "To-Do"
  },
  ru: {
    search: "ПОИСК...",
    all: "Все",
    config: "Настройки",
    audioLabel: "Голос (Премиум)",
    tagsLabel: "Категории",
    dataLabel: "Данные",
    backup: "Скачать бэкап",
    typePlaceholder: "Введите заметку...",
    noVoices: "Голоса не найдены",
    defaultVoice: "По умолчанию",
    languageLabel: "Язык", // New
    // Categories
    cat_idea: "Идея",
    cat_work: "Работа",
    cat_journal: "Дневник",
    cat_todo: "Задачи"
  }
};

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [transcript, setTranscript] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('idea');
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);

  // --- ENCRYPTION HELPERS ---
  const encryptData = (data: any) => {
    try {
      return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
    } catch (e) {
      console.error("Encryption failed", e);
      return "";
    }
  };

  const decryptData = (ciphertext: string) => {
    try {
      if (!ciphertext) return null;
      const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) return null;
      return JSON.parse(decryptedString);
    } catch (e) {
      console.error("Decryption failed", e);
      return null;
    }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    try {
        const savedLang = localStorage.getItem('vibenotes_lang');
        if (savedLang === 'en' || savedLang === 'ru') setLang(savedLang);

        const savedNotesEncrypted = localStorage.getItem('vibenotes_data_secure');
        if (savedNotesEncrypted) {
            const decrypted = decryptData(savedNotesEncrypted);
            if (decrypted && Array.isArray(decrypted)) setNotes(decrypted);
        } else {
            const oldData = localStorage.getItem('vibenotes_data');
            if (oldData) {
                try {
                    const parsed = JSON.parse(oldData);
                    if (Array.isArray(parsed)) setNotes(parsed);
                } catch(e) {}
            }
        }

        const savedCats = localStorage.getItem('vibenotes_categories');
        if (savedCats) setCategories(JSON.parse(savedCats));

        const savedVoice = localStorage.getItem('vibenotes_voice');
        if (savedVoice) setSelectedVoiceURI(savedVoice);

    } catch (e) {
        console.error("Init error", e);
    }
  }, []);

  // LOAD VOICES
  useEffect(() => {
    const loadVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        
        let candidates: SpeechSynthesisVoice[] = [];

        if (lang === 'en') {
            candidates = allVoices.filter(v => v.lang.startsWith('en'));
            const premiumKeywords = ['natural', 'online', 'premium', 'enhanced', 'google', 'siri'];
            const trashKeywords = ['desktop', 'mobile', 'help'];

            let premiumVoices = candidates.filter(v => {
                const name = v.name.toLowerCase();
                const isPremium = premiumKeywords.some(k => name.includes(k));
                const isTrash = trashKeywords.some(k => name.includes(k));
                return isPremium || (['daniel', 'samantha', 'ava'].some(n => name.includes(n)) && !isTrash);
            });

            if (premiumVoices.length === 0) premiumVoices = candidates;

            premiumVoices.sort((a, b) => {
                const topTier = ['Natural', 'Premium', 'Enhanced', 'Daniel', 'Samantha'];
                const aScore = topTier.findIndex(p => a.name.includes(p));
                const bScore = topTier.findIndex(p => b.name.includes(p));
                if (aScore !== -1 && bScore === -1) return -1;
                if (aScore === -1 && bScore !== -1) return 1;
                return a.name.localeCompare(b.name);
            });
            setVoices(premiumVoices);

        } else {
            const russianVoices = allVoices.filter(v => v.lang.startsWith('ru'));
            const englishBackup = allVoices.filter(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google')));
            setVoices([...russianVoices, ...englishBackup]);
        }
        
        if (!selectedVoiceURI && voices.length > 0) {
             // Logic handled in next effect
        }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [lang]);

  useEffect(() => {
    if (selectedVoiceURI && voices.length > 0) {
      setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null);
    }
  }, [selectedVoiceURI, voices]);

  // SAVE DATA
  useEffect(() => {
    if (notes.length > 0) {
        const encrypted = encryptData(notes);
        localStorage.setItem('vibenotes_data_secure', encrypted);
    }
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('vibenotes_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('vibenotes_lang', lang);
  }, [lang]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [transcript]);

  // --- HANDLERS ---
  const handleCategoryEdit = (id: CategoryId, field: 'label' | 'emoji' | 'colorClass', value: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const cycleCategory = () => {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory);
    const nextIndex = (currentIndex + 1) % categories.length;
    setSelectedCategory(categories[nextIndex].id);
  };

  const toggleLanguage = () => {
      setLang(prev => prev === 'en' ? 'ru' : 'en');
  };

  const saveNote = () => {
    if (!transcript.trim()) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: transcript.trim(),
      date: Date.now(),
      category: selectedCategory,
      isPinned: false
    };
    setNotes(prev => [newNote, ...prev]);
    setTranscript('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
  
  const togglePin = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `vibenotes_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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

  // HELPER: Get dynamic label based on ID and Language
  const getCategoryLabel = (cat: CategoryConfig) => {
    // Standardize ID comparison
    const id = cat.id.toLowerCase();
    
    if (lang === 'ru') {
        if (id === 'idea') return t.cat_idea;
        if (id === 'work') return t.cat_work;
        if (id === 'journal') return t.cat_journal;
        if (id === 'to-do' || id === 'todo') return t.cat_todo; // Check both variations
    } else {
        if (id === 'idea') return t.cat_idea;
        if (id === 'work') return t.cat_work;
        if (id === 'journal') return t.cat_journal;
        if (id === 'to-do' || id === 'todo') return t.cat_todo;
    }
    // Fallback for custom categories
    return cat.label; 
  };

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

        <button 
            onClick={() => setShowSettings(true)}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition-all active:scale-95"
        >
            <Settings size={20} />
        </button>
      </header>

      {/* FILTER CHIPS - FLEX JUSTIFY-BETWEEN */}
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

      {/* NOTE GRID */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNotes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              categories={categories}
              selectedVoice={selectedVoice}
              onDelete={deleteNote} 
              onPin={togglePin} 
              onCategoryClick={(cat) => setActiveFilter(cat)}
              onEdit={(n) => {
                 setTranscript(n.text);
                 setSelectedCategory(n.category);
                 deleteNote(n.id);
              }}
            />
          ))}
          {filteredNotes.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg col-span-full opacity-50 animate-in fade-in zoom-in-95 duration-500">
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

              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors">
                  <textarea
                      ref={textareaRef}
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder={t.typePlaceholder}
                      rows={1}
                      className="w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-sm resize-none max-h-32 py-0.5"
                  />
              </div>

              <button 
                  onClick={saveNote}
                  disabled={!transcript.trim()}
                  className={`flex-shrink-0 w-10 h-10 mb-0.5 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                      transcript.trim() 
                      ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] hover:scale-110' 
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                  }`}
              >
                  <ArrowUp size={20} strokeWidth={3} />
              </button>
          </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        {t.config}
                        <Lock size={12} className="text-orange-500" />
                    </h2>
                    <button onClick={() => { setShowSettings(false); setOpenEmojiPicker(null); }} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90 duration-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-8 border-b border-zinc-900 pb-8 flex items-center justify-between">
                    <label className="text-[10px] uppercase text-zinc-600 font-bold tracking-widest">{t.languageLabel}</label>
                    <button 
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 hover:border-orange-500 transition-all group"
                    >
                        <Globe size={14} className="text-zinc-500 group-hover:text-orange-500" />
                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white">
                            {lang === 'en' ? 'ENGLISH' : 'РУССКИЙ'}
                        </span>
                    </button>
                </div>
                
                <div className="mb-8 border-b border-zinc-900 pb-8">
                    <label className="text-[10px] uppercase text-zinc-600 font-bold mb-2 block tracking-widest">{t.audioLabel}</label>
                    <select 
                        value={selectedVoiceURI}
                        onChange={(e) => { setSelectedVoiceURI(e.target.value); localStorage.setItem('vibenotes_voice', e.target.value); }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-full p-2 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 appearance-none"
                    >
                        {voices.length === 0 && <option>{t.noVoices}</option>}
                        {voices.map(v => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name
                                    .replace('Microsoft ', '')
                                    .replace(' Online (Natural) - English (United States)', ' (Natural)')
                                    .replace('English (United States)', 'US')
                                    .replace('English (United Kingdom)', 'UK')
                                }
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-8 border-b border-zinc-900 pb-8">
                    <label className="text-[10px] uppercase text-zinc-600 font-bold mb-4 block tracking-widest">{t.tagsLabel}</label>
                    <div className="space-y-3">
                        {categories.map((cat) => (
                            <div key={cat.id} className="bg-black rounded-full p-2 px-4 border border-zinc-900 flex items-center gap-3">
                                <div className="relative">
                                      <button 
                                        onClick={() => setOpenEmojiPicker(openEmojiPicker === cat.id ? null : cat.id)}
                                        className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors text-sm"
                                      >
                                        <span className="grayscale">{cat.emoji}</span>
                                      </button>
                                      
                                      {openEmojiPicker === cat.id && (
                                        <div className="absolute top-10 left-0 w-64 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl z-50 p-2 grid grid-cols-6 gap-1 h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                                            {EMOJI_LIST.map(emoji => (
                                              <button
                                                key={emoji}
                                                onClick={() => { handleCategoryEdit(cat.id, 'emoji', emoji); setOpenEmojiPicker(null); }}
                                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-sm grayscale hover:grayscale-0"
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                        </div>
                                      )}
                                </div>
                                <input 
                                    type="text" 
                                    value={getCategoryLabel(cat)}
                                    // DISABLED Editing for default cats to prefer translations
                                    readOnly={['idea','work','journal','to-do','todo'].includes(cat.id.toLowerCase())}
                                    className={`flex-1 bg-transparent border-none text-zinc-300 focus:outline-none font-bold text-sm ${['idea','work','journal','to-do','todo'].includes(cat.id.toLowerCase()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase text-zinc-600 font-bold mb-2 block tracking-widest">{t.dataLabel}</label>
                    <button 
                        onClick={handleExport}
                        className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 rounded-full text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        <Download size={14} /> {t.backup}
                    </button>
                </div>
             </div>
         </div>
      )}
    </div>
  );
}

export default App;