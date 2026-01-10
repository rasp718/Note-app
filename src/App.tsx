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

// --- THEME CONSTANTS ---
const CLAUDE_ORANGE = '#da7756';
const HACKER_GREEN = '#4ade80';

const HACKER_CONFIG: CategoryConfig = {
    id: 'secret', 
    label: 'Anon', 
    emoji: '💻',
    colorClass: 'bg-green-500' 
};

// --- HELPER: DATE HEADERS ---
const isSameDay = (d1: number, d2: number) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
};

const getDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(timestamp, today.getTime())) return 'Today';
    if (isSameDay(timestamp, yesterday.getTime())) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
  
  // --- CATEGORY INITIALIZATION ---
  const [categories, setCategories] = useState<CategoryConfig[]>(() => {
    // Start with the updated DEFAULT_CATEGORIES (with new icons)
    let initial = DEFAULT_CATEGORIES;
    
    try {
        const saved = localStorage.getItem('vibenotes_categories');
        if (saved) {
            // Merge saved categories but FORCE the new icons
            const savedCats = JSON.parse(saved);
            initial = savedCats.map((c: CategoryConfig) => {
                // Override icons based on ID
                if (c.id === 'idea') return { ...c, emoji: '⚡' };
                if (c.id === 'work') return { ...c, emoji: '🔧' };
                if (c.id === 'journal') return { ...c, emoji: '✍️' };
                if (c.id === 'to-do' || c.id === 'todo') return { ...c, emoji: '🔥' };
                return c;
            });
        }
    } catch(e) {}
    
    return initial;
  });

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
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all' | 'secret'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showBars, setShowBars] = useState(true); 
  const [isNoteFocused, setIsNoteFocused] = useState(false);   

  const [secretTaps, setSecretTaps] = useState(0);
  const tapTimeoutRef = useRef<any>(null);
  const [showSecretAnim, setShowSecretAnim] = useState(false);
  const [isStartup, setIsStartup] = useState(true);
  const [startupAnimName] = useState(() => {
    const anims = ['logoEntrance', 'logoHeartbeat', 'logoGlitch', 'logoWobble'];
    const seed = Date.now(); return anims[seed % anims.length];
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSaveAnim, setShowSaveAnim] = useState(false);
  const [saveAnimType, setSaveAnimType] = useState<'brain' | 'lightning' | 'money' | 'journal' | 'fire' | 'matrix' | null>(null);

  const activeSecretConfig = HACKER_CONFIG;
  const isHackerMode = activeFilter === 'secret' || editingNote?.category === 'secret';
  const accentColor = isHackerMode ? HACKER_GREEN : CLAUDE_ORANGE;
  const currentTheme = {
    font: isHackerMode ? 'font-mono' : 'font-sans',
    selection: isHackerMode ? 'selection:bg-green-500/30 selection:text-green-400' : 'selection:bg-[#da7756]/30 selection:text-[#da7756]'
  };

  const handleSecretTrigger = () => {
    setSecretTaps(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000);
    if (secretTaps + 1 >= 5) {
        setActiveFilter('secret'); setSecretTaps(0); setShowSecretAnim(true);
        setTimeout(() => setShowSecretAnim(false), 8000);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  const getCurrentConfig = () => {
      if (activeFilter === 'secret') return activeSecretConfig;
      if (activeFilter === 'all') return null; 
      return categories.find(c => c.id === activeFilter) || categories[0];
  };
  const currentConfig = getCurrentConfig();

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
        e.preventDefault(); const file = items[i].getAsFile();
        if (file) await handleImageUpload(file); break;
      }
    }
  };

  useEffect(() => { const timer = setTimeout(() => { setIsStartup(false); }, 4500); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (!showSecretAnim) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; const nums = '01'; const alphabet = katakana + latin + nums;
    const fontSize = 16; const columns = canvas.width / fontSize;
    const drops: number[] = []; for(let x = 0; x < columns; x++) { drops[x] = 1; }
    const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
        for(let i = 0; i < drops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0; drops[i]++;
        }
    };
    const interval = setInterval(draw, 30); return () => clearInterval(interval);
  }, [showSecretAnim]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); }, 100); };
  useEffect(() => { scrollToBottom(); }, [activeFilter]);
  useEffect(() => { try { const savedAlignment = localStorage.getItem('vibenotes_alignment'); if(savedAlignment) setAlignment(savedAlignment as any); const savedCats = localStorage.getItem('vibenotes_categories'); if(savedCats) setCategories(JSON.parse(savedCats)); const savedVoice = localStorage.getItem('vibenotes_voice'); if(savedVoice) setSelectedVoiceURI(savedVoice); } catch (e) {} }, []);
  useEffect(() => { const loadVoices = () => { const all = window.speechSynthesis.getVoices(); setVoices(all.filter(v => v.lang.startsWith('en'))); }; loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }, []);
  useEffect(() => { if (selectedVoiceURI) setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null); }, [selectedVoiceURI, voices]);
  useEffect(() => { localStorage.setItem('vibenotes_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; } }, [transcript]);

  const cycleFilter = () => {
      if (activeFilter === 'secret') { setActiveFilter('all'); return; }
      const order: (CategoryId | 'all')[] = ['all', ...categories.map(c => c.id)];
      const currentIndex = order.indexOf(activeFilter as any);
      if (currentIndex === -1) { setActiveFilter('all'); return; }
      const nextIndex = (currentIndex + 1) % order.length; setActiveFilter(order[nextIndex]);
  };
  
  const handleMainAction = async () => {
    if (!transcript.trim() && !imageUrl) return;
    if (activeFilter === 'all' && !editingNote) return;
    try {
        if (editingNote) {
            const updates: Partial<Note> = { text: transcript.trim() };
            if (imageUrl !== editingNote.imageUrl) updates.imageUrl = imageUrl || undefined;
            await updateNote(editingNote.id, updates);
            setEditingNote(null);
        } else {
            const categoryToUse = activeFilter as CategoryId; 
            await addNote({ text: transcript.trim(), date: Date.now(), category: categoryToUse, isPinned: false, isExpanded: true, imageUrl: imageUrl || undefined });
            if (categoryToUse === 'idea') { setSaveAnimType(Math.random() > 0.5 ? 'brain' : 'lightning'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 6000); }
            else if (categoryToUse === 'work') { setSaveAnimType('money'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500); }
            else if (categoryToUse === 'journal') { setSaveAnimType('journal'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500); }
            else if (categoryToUse === 'to-do' || categoryToUse === 'todo') { setSaveAnimType('fire'); setShowSaveAnim(true); setTimeout(() => setShowSaveAnim(false), 4500); }
            else if (categoryToUse === 'secret') { setShowSecretAnim(true); setTimeout(() => setShowSecretAnim(false), 6000); }
            scrollToBottom(); 
        }
        setTranscript(''); setImageUrl('');
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (note: Note) => { 
    setActiveFilter(note.category);
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

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  return (
    // Changed layout to standard block so absolute positioning works for footer overlay
    <div className={`fixed inset-0 w-full bg-black text-zinc-100 font-sans ${currentTheme.selection} ${currentTheme.font}`}>
      
      {/* Header - Fixed Top */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <header className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3 relative">
            <div className="flex items-center gap-3">
                <button onClick={handleSecretTrigger} className="w-10 h-10 bg-transparent flex items-center justify-center rounded-xl active:scale-95 transition-transform relative overflow-visible group/logo">
                    {isStartup && (<><div className="absolute inset-[-4px] border rounded-xl animate-[spin_1s_linear_infinite] opacity-50" style={{ borderColor: `${accentColor}80` }} /><div className="absolute inset-0 rounded-xl animate-ping opacity-75" style={{ backgroundColor: accentColor, animationDuration: '4.5s' }} /></>)}
                    {activeFilter === 'secret' ? (<Terminal className="text-zinc-500 transition-colors" style={{ color: isStartup ? undefined : HACKER_GREEN }} size={24} />) : (<div className={`w-3 h-3 rounded-sm relative z-10 transition-all duration-300 ${isStartup ? 'animate-bounce' : ''}`} style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}80`, animation: isStartup ? `${startupAnimName} 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` : undefined }} />)}
                </button>
                <button onClick={() => { setShowSettings(true); }} className="w-10 h-10 flex items-center justify-center text-zinc-500 transition-all active:scale-95" onMouseEnter={(e) => e.currentTarget.style.color = accentColor} onMouseLeave={(e) => e.currentTarget.style.color = ''}>
                    <Settings size={20} />
                </button>
                <div className="relative flex items-center h-10">
                    <button onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className={`w-10 h-10 flex items-center justify-center text-zinc-500 transition-all active:scale-95 ${isSearchExpanded ? 'opacity-0 pointer-events-none scale-50' : 'opacity-100 scale-100'}`} onMouseEnter={(e) => e.currentTarget.style.color = accentColor} onMouseLeave={(e) => e.currentTarget.style.color = ''}><Search size={20} /></button>
                     <div className={`absolute left-0 bg-zinc-900 border border-zinc-800 rounded-full flex items-center px-3 h-10 transition-all duration-300 origin-left ${isSearchExpanded ? 'w-[200px] opacity-100 shadow-lg z-50' : 'w-0 opacity-0 pointer-events-none'}`}>
                        <Search className="text-zinc-500 mr-2 flex-shrink-0" size={16} />
                        <input ref={searchInputRef} type="text" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="bg-transparent border-none outline-none text-white text-base md:text-sm w-full h-full placeholder:text-zinc-600 min-w-0"/>
                        <button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="p-1 text-zinc-500 hover:text-white flex-shrink-0"><X size={14} /></button>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2"></div>
        </header>
      </div>

      {showSecretAnim && <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" />}

      {/* Main List - Absolute Inset to allow scrolling BEHIND footer */}
      <div ref={listRef} className={`absolute inset-0 overflow-y-auto no-scrollbar`}>
          {/* Padding top for header, Padding bottom for footer to ensure last item is visible */}
          <div className={`min-h-full max-w-2xl mx-auto flex flex-col justify-end gap-3 px-4 pt-20 pb-24 ${getAlignmentClass()}`}>
            {filteredNotes.map((note, index) => {
                const prevNote = filteredNotes[index - 1];
                const showHeader = !prevNote || !isSameDay(note.date, prevNote.date);
                
                return (
                    <React.Fragment key={note.id}>
                         {showHeader && (
                             <div className="flex justify-center my-4 opacity-70 w-full select-none">
                                <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-widest">
                                    {getDateLabel(note.date)}
                                </span>
                             </div>
                         )}
                        <div 
                          onDoubleClick={() => handleToggleExpand(note.id)} 
                          className={`select-none touch-manipulation transition-all duration-300 active:scale-[0.99] w-full flex ${alignment === 'left' ? 'justify-start' : alignment === 'center' ? 'justify-center' : 'justify-end'} ${editingNote && editingNote.id !== note.id ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}
                        >
                            <NoteCard note={note} categories={activeFilter === 'secret' ? [activeSecretConfig] : categories} selectedVoice={selectedVoice} onDelete={handleDeleteNote} onPin={togglePin} onCategoryClick={(cat) => setActiveFilter(cat)} onEdit={() => handleEditClick(note)} onToggleExpand={handleToggleExpand} />
                        </div>
                    </React.Fragment>
                );
            })}
            {filteredNotes.length === 0 && (
                <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg w-full opacity-50 mb-auto mt-20">
                    <LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} />
                    <p className="text-zinc-700 text-xs font-mono uppercase">{activeFilter === 'secret' ? 'System Clean' : (activeFilter === 'all' ? 'Select a Category' : 'Start Typing...')}</p>
                </div>
            )}
            <div ref={bottomRef} className="h-0 w-full shrink-0" />
          </div>
      </div>

      {/* Footer - Absolute Bottom, Transparent Background */}
      <div className={`absolute bottom-0 w-full p-3 pb-6 md:pb-3 z-50 bg-transparent`}>
          <div className="max-w-2xl mx-auto flex flex-col gap-2">
            {editingNote && (
                <div className="flex items-center justify-between px-4 py-2 mb-[-10px] mx-1 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div style={{ color: accentColor }}><PenLine size={12} /></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>Editing Message</span>
                            <span className="text-xs text-zinc-400 truncate max-w-[200px]">{editingNote.text}</span>
                        </div>
                    </div>
                    <button onClick={handleCancelEdit} className="p-1 hover:bg-zinc-800/50 rounded-full text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
                </div>
            )}
            <div className="flex items-end gap-2 p-1">
                <button onClick={cycleFilter} className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-all active:scale-95 group shadow-lg shadow-black/50">
                    {activeFilter === 'all' ? (<LayoutGrid size={16} className="text-zinc-500 group-hover:text-white transition-colors" />) : (<span className="text-xs grayscale group-hover:grayscale-0 transition-all">{currentConfig?.emoji}</span>)}
                </button>
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors gap-3 shadow-lg shadow-black/50 relative">
                    {imageUrl && (
                        <div className="relative flex-shrink-0 group/image">
                            <div className="w-8 h-8 rounded overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div>
                            <button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"><X size={10} /></button>
                        </div>
                    )}
                    <textarea ref={textareaRef} value={transcript} onChange={(e) => setTranscript(e.target.value)} onPaste={(e) => handlePaste(e)} placeholder={editingNote ? "Edit message..." : (activeFilter === 'all' ? "Select category to send..." : `${currentConfig?.label}...`)} rows={1} onFocus={() => { setIsNoteFocused(true); setShowBars(true); scrollToBottom('auto'); }} onBlur={() => setIsNoteFocused(false)} className={`w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-base md:text-sm resize-none max-h-32 py-0.5 ${isHackerMode ? 'font-mono' : ''}`} style={isHackerMode ? { color: HACKER_GREEN } : undefined} />
                    {(!transcript && !editingNote) && (<label className="cursor-pointer text-zinc-500 hover:text-zinc-300"><ImageIcon size={20} /><input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} /></label>)}
                </div>
                <button onClick={handleMainAction} disabled={(!transcript.trim() && !imageUrl) || (activeFilter === 'all' && !editingNote)} className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg shadow-black/50`} style={(transcript.trim() || imageUrl) && activeFilter !== 'all' ? { backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}80`, color: 'white' } : { backgroundColor: '#18181b', borderColor: '#27272a', borderWidth: '1px', color: '#52525b' }}>
                    {editingNote ? <Check size={20} strokeWidth={3} /> : (transcript.trim() || imageUrl ? <ArrowUp size={20} strokeWidth={3} /> : <Plus size={20} />)}
                </button>
            </div>
          </div>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes logoEntrance { 0% { transform: scale(0) rotate(-180deg); } 60% { transform: scale(1.2) rotate(10deg); } 100% { transform: scale(1) rotate(0deg); } } @keyframes logoHeartbeat { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } } @keyframes logoGlitch { 0% { transform: translate(0); } 20% { transform: translate(-3px, 3px); } 40% { transform: translate(-3px, -3px); } 60% { transform: translate(3px, 3px); } 80% { transform: translate(3px, -3px); } 100% { transform: translate(0); } } @keyframes logoWobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg) scale(1.1); } 75% { transform: rotate(15deg) scale(1.1); } }`}</style>
    </div>
  );
}

export default App;