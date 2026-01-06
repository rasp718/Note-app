import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Settings, ArrowUp, LayoutGrid, Image as ImageIcon, Check, Terminal, Plus, PenLine } from 'lucide-react'; 
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard'; 
import { useFirebaseSync, useNotes } from './useFirebaseSync';
import Auth from './components/Auth';

const TRANSLATIONS = { 
  search: "Search...", 
  all: "All", 
  typePlaceholder: "Message...", 
  cat_hacker: "Hacker Mode"
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
  const { notes, addNote, deleteNote: deleteNoteFromFirebase, updateNote } = useNotes(user?.uid || null);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all' | 'secret'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'secret'>('idea');
  
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const [showBars, setShowBars] = useState(true);
  const [isNoteFocused, setIsNoteFocused] = useState(false);   

  const lastScrollY = useRef(0);

  const [secretTaps, setSecretTaps] = useState(0);
  const tapTimeoutRef = useRef<any>(null);
  const [showSecretAnim, setShowSecretAnim] = useState(false);
  const [secretAnimType, setSecretAnimType] = useState<'matrix'>('matrix');

  const [isStartup, setIsStartup] = useState(true);
  const [startupAnimName] = useState(() => {
    const anims = ['logoEntrance', 'logoHeartbeat', 'logoGlitch', 'logoWobble'];
    const seed = Date.now(); 
    return anims[seed % anims.length];
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [showSaveAnim, setShowSaveAnim] = useState(false);
  const [saveAnimType, setSaveAnimType] = useState<'brain' | 'lightning' | 'money' | 'journal' | 'fire' | 'matrix' | null>(null);

  const activeSecretConfig = HACKER_CONFIG;

  const currentTheme = (() => {
    if (activeFilter === 'secret' || editingNote?.category === 'secret') {
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

  const handleSecretTrigger = () => {
    setSecretTaps(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000);

    if (secretTaps + 1 >= 5) {
        setActiveFilter('secret');
        setSelectedCategory('secret');
        setSecretTaps(0);
        setSecretAnimType('matrix');
        setShowSecretAnim(true);
        setTimeout(() => setShowSecretAnim(false), 8000);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  const currentCategoryConfig = selectedCategory === 'secret' ? activeSecretConfig : categories.find(c => c.id === selectedCategory) || categories[0];

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return alert('Please select an image file');
    setIsUploadingImage(true);
    try {
      const url = await compressImage(file);
      if (url.length > 800000) return alert('Image too large.');
      setImageUrl(url);
    } catch (e) { console.error(e); } finally { setIsUploadingImage(false); }
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

  useEffect(() => {
    const handleScroll = () => {
      if (isNoteFocused || isSearchExpanded) {
        setShowBars(true);
        return;
      }
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) { setShowBars(true); lastScrollY.current = currentScrollY; return; }
      if (currentScrollY > lastScrollY.current) { setShowBars(false); } else { setShowBars(true); }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isNoteFocused, isSearchExpanded]); 

  useEffect(() => {
    const timer = setTimeout(() => { setIsStartup(false); }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // --- COOL MATRIX EFFECT (CANVAS) ---
  useEffect(() => {
    if (!showSecretAnim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const nums = '01';
    const alphabet = katakana + latin + nums;

    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];
    for(let x = 0; x < columns; x++) { drops[x] = 1; }

    const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';
        for(let i = 0; i < drops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    };
    const interval = setInterval(draw, 30);
    return () => clearInterval(interval);
  }, [showSecretAnim]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); }, 100);
  };

  useEffect(() => { scrollToBottom(); }, [activeFilter, selectedCategory]);

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

  const cycleFilter = () => {
      if (activeFilter === 'secret') {
          setActiveFilter('all');
          setSelectedCategory(categories[0].id);
          return;
      }
      const order: (CategoryId | 'all')[] = ['all', ...categories.map(c => c.id)];
      const currentIndex = order.indexOf(activeFilter as any);
      const nextIndex = (currentIndex + 1) % order.length;
      const nextFilter = order[nextIndex];
      setActiveFilter(nextFilter);
      if (nextFilter !== 'all' && nextFilter !== 'secret') { setSelectedCategory(nextFilter); }
  };

  const cycleInputCategory = () => { 
      if (selectedCategory === 'secret') { setSelectedCategory(categories[0].id); return; }
      const i = categories.findIndex(c => c.id === selectedCategory); 
      setSelectedCategory(categories[(i + 1) % categories.length].id); 
  };
  
  const handleMainAction = async () => {
    if (!transcript.trim() && !imageUrl) return;
    try {
        if (editingNote) {
            const updates: Partial<Note> = { text: transcript.trim() };
            if (imageUrl !== editingNote.imageUrl) updates.imageUrl = imageUrl || undefined;
            await updateNote(editingNote.id, updates);
            setEditingNote(null);
        } else {
            await addNote({ text: transcript.trim(), date: Date.now(), category: selectedCategory, isPinned: false, isExpanded: true, imageUrl: imageUrl || undefined });
            if (selectedCategory === 'idea') { setSaveAnimType(Math.random() > 0.5 ? 'brain' : 'lightning'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 6000); }
            else if (selectedCategory === 'work') { setSaveAnimType('money'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500); }
            else if (selectedCategory === 'journal') { setSaveAnimType('journal'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500); }
            else if (selectedCategory === 'to-do' || selectedCategory === 'todo') { setSaveAnimType('fire'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500); }
            else if (selectedCategory === 'secret') { setSaveAnimType('matrix'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 6000); }
            scrollToBottom(); 
        }
        setTranscript(''); setImageUrl('');
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (note: Note) => { 
    setEditingNote(note); setTranscript(note.text); setImageUrl(note.imageUrl || ''); 
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 50);
  };

  const handleCancelEdit = () => { setEditingNote(null); setTranscript(''); setImageUrl(''); };
  const handleDeleteNote = async (id: string) => { 
      const noteToDelete = notes.find(n => n.id === id);
      if (noteToDelete && (noteToDelete.category === 'to-do' || noteToDelete.category === 'todo')) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4500); }
      await deleteNoteFromFirebase(id); if (editingNote?.id === id) handleCancelEdit();
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

  const getHeaderPillDetails = () => {
    if (activeFilter === 'secret') { return { label: 'Hacker Mode', icon: <Terminal size={14} /> }; }
    if (activeFilter === 'all') { return { label: 'All', icon: <LayoutGrid size={14} /> }; }
    const cat = categories.find(c => c.id === activeFilter);
    return { label: cat?.label || 'Unknown', icon: <span className="text-sm leading-none">{cat?.emoji}</span> };
  };

  const headerPill = getHeaderPillDetails();

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  return (
    <div className={`min-h-screen w-full bg-black text-zinc-100 font-sans ${currentTheme.selection} overflow-x-hidden ${currentTheme.font}`}>
      
      {/* --- HEADER (Single Row, Icons Right, Grayscale) --- */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-none ${!isNoteFocused && (showBars || isSearchExpanded) ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <header className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3 pointer-events-auto relative">
            
            {/* 1. Left: App Icon */}
            <div className={`transition-all duration-300 flex-shrink-0 ${isSearchExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                <button onClick={handleSecretTrigger} className="w-10 h-10 bg-transparent flex items-center justify-center rounded-xl active:scale-95 transition-transform relative overflow-visible">
                    {isStartup && (
                        <>
                            <div className="absolute inset-[-4px] border border-orange-500/50 rounded-xl animate-[spin_1s_linear_infinite] opacity-50" />
                            <div className="absolute inset-0 bg-orange-500 rounded-xl animate-ping opacity-75" style={{ animationDuration: '4.5s' }} />
                        </>
                    )}
                    {activeFilter === 'secret' ? (
                        <Terminal className="text-zinc-500 hover:text-orange-500 transition-colors" size={24} />
                    ) : (
                        <div className={`w-3 h-3 bg-orange-600 rounded-sm shadow-[0_0_10px_rgba(234,88,12,0.5)] relative z-10 ${isStartup ? 'animate-bounce' : ''}`} style={isStartup ? { animation: `${startupAnimName} 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` } : {}}></div>
                    )}
                </button>
            </div>

            {/* 2. Right: Controls Row [Settings] [Search] [Category] */}
            <div className="flex items-center gap-2">
                
                {/* Settings */}
                 <button onClick={() => { setShowSettings(true); }} className={`w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-all active:scale-95 ${isSearchExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-10 opacity-100'}`}>
                    <Settings size={20} />
                </button>

                {/* Search Area */}
                <div className="relative flex items-center justify-end h-10">
                    <button onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className={`w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-all active:scale-95 absolute right-0 ${isSearchExpanded ? 'opacity-0 pointer-events-none scale-50' : 'opacity-100 scale-100'}`}>
                        <Search size={20} />
                    </button>
                     <div className={`bg-zinc-900 border border-zinc-800 rounded-full flex items-center px-3 h-10 transition-all duration-300 origin-right ${isSearchExpanded ? 'w-[200px] opacity-100 shadow-lg' : 'w-10 opacity-0 pointer-events-none'}`}>
                        <Search className="text-zinc-500 mr-2 flex-shrink-0" size={16} />
                        <input ref={searchInputRef} type="text" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="bg-transparent border-none outline-none text-white text-sm w-full h-full placeholder:text-zinc-600 min-w-0"/>
                        <button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="p-1 text-zinc-500 hover:text-white flex-shrink-0"><X size={14} /></button>
                    </div>
                </div>

                {/* Category Pill (Cycle) */}
                <button onClick={cycleFilter} className={`flex items-center gap-2 px-3 h-10 rounded-full text-zinc-500 hover:text-orange-500 transition-colors active:scale-95 select-none ${isSearchExpanded ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
                    <span className="opacity-70 grayscale">{headerPill.icon}</span>
                    <span className="text-xs font-medium uppercase tracking-wider whitespace-nowrap">{headerPill.label}</span>
                </button>

            </div>
        </header>
      </div>

      {/* --- MATRIX EFFECT LAYER --- */}
      {showSecretAnim && <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" />}

      {/* --- LIST CONTAINER --- */}
      <div className={`pt-20 pb-0 px-4 max-w-2xl mx-auto flex flex-col gap-3 ${getAlignmentClass()}`}>
          {filteredNotes.map(note => (
              <div key={note.id} onDoubleClick={() => handleToggleExpand(note.id)} className={`select-none touch-manipulation transition-all duration-300 active:scale-[0.99] ${editingNote?.id === note.id ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
                  <NoteCard note={note} categories={activeFilter === 'secret' ? [activeSecretConfig] : categories} selectedVoice={selectedVoice} onDelete={handleDeleteNote} onPin={togglePin} onCategoryClick={(cat) => setActiveFilter(cat)} onEdit={() => handleEditClick(note)} onToggleExpand={handleToggleExpand} />
              </div>
          ))}
          {filteredNotes.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg col-span-full opacity-50 w-full">
                  <LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} />
                  <p className="text-zinc-700 text-xs font-mono uppercase">{activeFilter === 'secret' ? 'System Clean' : 'Start Typing...'}</p>
              </div>
          )}
          <div ref={bottomRef} className="h-20 md:h-16 w-full shrink-0" />
      </div>

      {/* --- FIXED FOOTER --- */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 p-3 pb-6 md:pb-3 pointer-events-none translate-y-0`}>
          <div className="max-w-2xl mx-auto pointer-events-auto flex flex-col gap-2">
            
            {/* Editing Context Bar (Transparent + Orange) */}
            {editingNote && (
                <div className="flex items-center justify-between px-4 py-2 mb-[-10px] mx-1 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="text-orange-500">
                            <PenLine size={12} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Editing Message</span>
                            <span className="text-xs text-zinc-400 truncate max-w-[200px]">{editingNote.text}</span>
                        </div>
                    </div>
                    <button onClick={handleCancelEdit} className="p-1 hover:bg-zinc-800/50 rounded-full text-zinc-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Input Bar */}
            <div className="flex items-end gap-2 bg-black/50 backdrop-blur-sm rounded-3xl p-1">
                <button onClick={cycleInputCategory} className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-all active:scale-95 group shadow-lg shadow-black/50">
                    <span className="text-xs grayscale-0 transition-all">{currentCategoryConfig.emoji}</span>
                </button>
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors gap-3 shadow-lg shadow-black/50 relative">
                    {imageUrl && (
                        <div className="relative flex-shrink-0 group/image">
                            <div className="w-8 h-8 rounded overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div>
                            <button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"><X size={10} /></button>
                        </div>
                    )}
                    <textarea ref={textareaRef} value={transcript} onChange={(e) => setTranscript(e.target.value)} onPaste={(e) => handlePaste(e)} placeholder={editingNote ? "Edit message..." : (activeFilter === 'secret' ? "Inject code..." : t.typePlaceholder)} rows={1} onFocus={() => { setIsNoteFocused(true); setShowBars(true); scrollToBottom(); }} onBlur={() => setIsNoteFocused(false)} className={`w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-base md:text-sm resize-none max-h-32 py-0.5 ${activeFilter === 'secret' ? 'font-mono text-green-500 placeholder:text-green-800' : ''}`} />
                    {!transcript && !editingNote && (
                         <label className="cursor-pointer text-zinc-500 hover:text-zinc-300"><ImageIcon size={20} /><input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} /></label>
                    )}
                </div>
                <button onClick={handleMainAction} disabled={!transcript.trim() && !imageUrl} className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg shadow-black/50 ${transcript.trim() || imageUrl ? `${currentTheme.bg} ${currentTheme.shadow} text-white` : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>
                    {editingNote ? <Check size={20} strokeWidth={3} /> : (transcript.trim() || imageUrl ? <ArrowUp size={20} strokeWidth={3} /> : <Plus size={20} />)}
                </button>
            </div>
          </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes logoEntrance { 0% { transform: scale(0) rotate(-180deg); } 60% { transform: scale(1.2) rotate(10deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes logoHeartbeat { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
        @keyframes logoGlitch { 0% { transform: translate(0); } 20% { transform: translate(-3px, 3px); } 40% { transform: translate(-3px, -3px); } 60% { transform: translate(3px, 3px); } 80% { transform: translate(3px, -3px); } 100% { transform: translate(0); } }
        @keyframes logoWobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg) scale(1.1); } 75% { transform: rotate(15deg) scale(1.1); } }
        @keyframes brainFloat { 0% { transform: translateY(0) scale(1); opacity: 0; } 15% { opacity: 1; transform: translateY(-15vh) scale(1.4); } 100% { transform: translateY(-110vh) scale(1); opacity: 0; } }
        @keyframes realFire { 0% { transform: translateY(20px) scale(0.5); opacity: 0; } 15% { opacity: 1; transform: translateY(-10px) scale(1.2); } 100% { transform: translateY(-30vh) scale(0); opacity: 0; } }
        @keyframes lightningFlash { 0%, 100% { background-color: transparent; } 5%, 15% { background-color: rgba(255, 255, 255, 0.2); } 10% { background-color: transparent; } }
        @keyframes boltStrike { 0% { opacity: 0; transform: translateY(-100%) scale(0.5); } 10% { opacity: 1; transform: translateY(0) scale(1); } 30% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes confettiGravity { 0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.5); opacity: 1; } 15% { transform: translate(calc(-50% + (var(--end-x) * 0.2)), calc(-50% - 20vh)) rotate(90deg) scale(1.2); opacity: 1; } 100% { transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) rotate(var(--rot)) scale(0.5); opacity: 0; } }
      `}</style>
    </div>
  );
}

export default App;