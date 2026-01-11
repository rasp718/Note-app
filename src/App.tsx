import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, Settings as SettingsIcon, ArrowUp, LayoutGrid, Image as ImageIcon, 
  Check, Terminal, Plus, PenLine, AlignLeft, AlignCenter, AlignRight, Scan, 
  ChevronLeft, Phone, Users, MessageCircle, Bookmark, Edit, Moon, Book 
} from 'lucide-react'; 
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

// --- UTILS ---
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

// --- MOCK DATA FOR CHAT LIST ---
const MOCK_CHATS = [
  { id: '2', name: 'Max & Stacy', message: 'See? like... super unrelated, right?', time: '8:42 PM', avatar: '/api/placeholder/40/40', color: 'bg-orange-500' },
  { id: '3', name: 'Trade Watcher', message: 'The Dollar isn\'t backed by anything.', time: '1:32 PM', avatar: '/api/placeholder/40/40', color: 'bg-zinc-700' },
  { id: '4', name: 'Strape', message: 'Norm finkelstiens mom said there are...', time: 'Yesterday', avatar: '/api/placeholder/40/40', color: 'bg-red-500' },
];

function App() {
  const { user, loading: authLoading } = useFirebaseSync();
  const { notes, addNote, deleteNote: deleteNoteFromFirebase, updateNote } = useNotes(user?.uid || null);
  
  // --- NAVIGATION STATE ---
  const [currentView, setCurrentView] = useState<'list' | 'room'>('list');
  const [activeTab, setActiveTab] = useState<'contacts' | 'calls' | 'chats' | 'settings'>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 

  // --- APP STATE ---
  const [categories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [bgIndex, setBgIndex] = useState<number>(1);
  const [bgOpacity, setBgOpacity] = useState<number>(0.45);
  const [bgScale, setBgScale] = useState<number>(100);

  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Search State for Header
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all' | 'secret'>('all');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isStartup, setIsStartup] = useState(true);
  const [startupAnimName] = useState(() => {
    const anims = ['logoEntrance', 'logoHeartbeat', 'logoGlitch', 'logoWobble'];
    const seed = Date.now(); return anims[seed % anims.length];
  });

  // Secret / Hacker Mode
  const [secretTaps, setSecretTaps] = useState(0);
  const tapTimeoutRef = useRef<any>(null);
  const [showSecretAnim, setShowSecretAnim] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const activeSecretConfig = HACKER_CONFIG;
  const isHackerMode = activeFilter === 'secret' || editingNote?.category === 'secret';
  const accentColor = isHackerMode ? HACKER_GREEN : CLAUDE_ORANGE;
  const currentTheme = {
    font: isHackerMode ? 'font-mono' : 'font-sans',
    selection: isHackerMode ? 'selection:bg-green-500/30 selection:text-green-400' : 'selection:bg-[#da7756]/30 selection:text-[#da7756]'
  };

  const t = TRANSLATIONS;

  // --- LOGIC ---
  useEffect(() => { const timer = setTimeout(() => { setIsStartup(false); }, 4500); return () => clearTimeout(timer); }, []);

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

  // Matrix Effect (Restored Original Logic + Full Screen Fix)
  useEffect(() => {
    if (!showSecretAnim || currentView !== 'room') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // --- RESTORED CONFIG ---
    const FONT_SIZE = 24;
    const FADE_SPEED = 0.1;
    const MASTER_SPEED = 50;
    const STUTTER_AMOUNT = 0.85;  
    const RAIN_BUILDUP = 300;
    
    const COLOR_HEAD = '#FFF'; 
    const COLOR_TRAIL = '#0D0'; 
    const GLOW_COLOR = '#0F0'; 
    const GLOW_INTENSITY = 10;     

    const binary = '010101010101'; 
    const nums = '0123456789';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rareKatakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ'; 
    const alphabet = binary + nums + latin + rareKatakana;

    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = canvas.width / FONT_SIZE;
    const drops: number[] = [];
    for(let x = 0; x < columns; x++) { drops[x] = Math.floor(Math.random() * -RAIN_BUILDUP); }
    
    const draw = () => {
        ctx.fillStyle = `rgba(0, 0, 0, ${FADE_SPEED})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${FONT_SIZE}px monospace`;
        
        for(let i = 0; i < drops.length; i++) {
            if (Math.random() > STUTTER_AMOUNT) continue;
            
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            const x = i * FONT_SIZE;
            const y = drops[i] * FONT_SIZE;
            
            if (y > 0) {
                // Draw Trail
                ctx.shadowBlur = 0;
                ctx.fillStyle = COLOR_TRAIL; 
                ctx.fillText(text, x, y - FONT_SIZE);
                
                // Draw Head (White glowing tip)
                ctx.shadowColor = GLOW_COLOR;
                ctx.shadowBlur = GLOW_INTENSITY;
                ctx.fillStyle = COLOR_HEAD;
                ctx.fillText(text, x, y);
            }
            
            if(y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    };
    
    const interval = setInterval(draw, MASTER_SPEED);
    
    // Handle resize
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
        clearInterval(interval);
        window.removeEventListener('resize', handleResize);
    };
  }, [showSecretAnim, currentView]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); }, 100); };
  
  // Load Settings
  useEffect(() => { 
      try { 
          const savedAlignment = localStorage.getItem('vibenotes_alignment'); 
          if(savedAlignment) setAlignment(savedAlignment as any); 
          const savedBg = localStorage.getItem('vibenotes_bg');
          if (savedBg) setBgIndex(parseInt(savedBg));
          const savedOpacity = localStorage.getItem('vibenotes_bg_opacity');
          if (savedOpacity) setBgOpacity(parseFloat(savedOpacity));
          const savedScale = localStorage.getItem('vibenotes_bg_scale');
          if (savedScale) setBgScale(parseInt(savedScale));
      } catch (e) {} 
  }, []);

  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  useEffect(() => { localStorage.setItem('vibenotes_bg', bgIndex.toString()); }, [bgIndex]);
  useEffect(() => { localStorage.setItem('vibenotes_bg_opacity', bgOpacity.toString()); }, [bgOpacity]);
  useEffect(() => { localStorage.setItem('vibenotes_bg_scale', bgScale.toString()); }, [bgScale]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; } }, [transcript]);

  // --- HELPER: GET CURRENT CONFIG ---
  const getCurrentConfig = () => {
      if (activeFilter === 'secret') return activeSecretConfig;
      if (activeFilter === 'all') return null; 
      return categories.find(c => c.id === activeFilter) || categories[0];
  };
  const currentConfig = getCurrentConfig();

  // --- ACTIONS ---
  const cycleFilter = () => {
      if (activeFilter === 'secret') { setActiveFilter('all'); return; }
      const order: (CategoryId | 'all')[] = ['all', ...categories.map(c => c.id)];
      const currentIndex = order.indexOf(activeFilter as any);
      if (currentIndex === -1) { setActiveFilter('all'); return; }
      const nextIndex = (currentIndex + 1) % order.length; setActiveFilter(order[nextIndex]);
  };

  const handleCancelEdit = () => { setEditingNote(null); setTranscript(''); setImageUrl(''); };
  
  const handleDeleteNote = async (id: string) => { 
      const noteToDelete = notes.find(n => n.id === id);
      if (noteToDelete && (noteToDelete.category === 'to-do' || noteToDelete.category === 'todo')) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4500); }
      await deleteNoteFromFirebase(id); if (editingNote?.id === id) handleCancelEdit();
  };

  const togglePin = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isPinned: !n.isPinned }); };
  const handleToggleExpand = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isExpanded: !n.isExpanded }); };

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

  const getAlignmentClass = () => alignment === 'center' ? 'items-center' : alignment === 'right' ? 'items-end' : 'items-start';

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  // --- RENDER HELPERS ---

  // Bottom Tab Bar
  const BottomTabBar = () => (
    <div className="flex-none bg-black/80 backdrop-blur-xl border-t border-zinc-800 pb-6 pt-2 px-6 flex justify-between items-center text-[10px] font-medium text-zinc-500 z-50">
       <button onClick={() => setActiveTab('contacts')} className={`flex flex-col items-center gap-1 ${activeTab === 'contacts' ? 'text-blue-500' : 'hover:text-zinc-300'}`}>
          <Users size={24} strokeWidth={activeTab === 'contacts' ? 2.5 : 2} />
          <span>Contacts</span>
       </button>
       <button onClick={() => setActiveTab('calls')} className={`flex flex-col items-center gap-1 ${activeTab === 'calls' ? 'text-blue-500' : 'hover:text-zinc-300'}`}>
          <Phone size={24} strokeWidth={activeTab === 'calls' ? 2.5 : 2} />
          <span>Calls</span>
       </button>
       <button onClick={() => setActiveTab('chats')} className={`flex flex-col items-center gap-1 ${activeTab === 'chats' ? 'text-blue-500' : 'hover:text-zinc-300'}`}>
          <MessageCircle size={24} strokeWidth={activeTab === 'chats' ? 2.5 : 2} fill={activeTab === 'chats' ? "currentColor" : "none"} />
          <span>Chats</span>
       </button>
       <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'settings' ? 'text-blue-500' : 'hover:text-zinc-300'}`}>
          <SettingsIcon size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
          <span>Settings</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
       </button>
    </div>
  );

  return (
    <div className={`fixed inset-0 w-full bg-black text-zinc-100 font-sans ${currentTheme.selection} flex flex-col overflow-hidden ${currentTheme.font}`}>
      
      {/* GLOBAL WALLPAPER */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-black">
        <div 
            className="absolute inset-0 transition-opacity duration-300"
            style={{ 
                backgroundImage: `url(/bg${bgIndex}.jpg)`,
                backgroundSize: bgScale >= 100 ? 'cover' : `${bgScale}%`,
                backgroundPosition: 'center',
                backgroundRepeat: 'repeat',
                opacity: bgOpacity
            }}
        />
      </div>

      {/* === VIEW 1: MAIN LIST (TABS) === */}
      {currentView === 'list' && (
        <div className="flex-1 flex flex-col h-full z-10 animate-in fade-in slide-in-from-left-5 duration-300">
           
           {/* Header for Chats Tab */}
           {activeTab === 'chats' && (
             <div className="flex-none pt-12 pb-2 px-4 flex items-center justify-between bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <button className="text-blue-500 text-base font-medium">Edit</button>
                <span className="text-white font-semibold text-base">Chats</span>
                <button className="text-blue-500"><PenLine size={20} /></button>
             </div>
           )}

            {/* Header for Settings Tab */}
            {activeTab === 'settings' && (
             <div className="flex-none pt-12 pb-2 px-4 flex items-center justify-center bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <span className="text-white font-semibold text-base">Settings</span>
             </div>
           )}

           {/* CONTENT: CHATS */}
           {activeTab === 'chats' && (
             <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Search Bar */}
                <div className="px-4 py-2">
                   <div className="bg-zinc-900/80 rounded-xl flex items-center px-3 py-1.5 gap-2">
                      <Search size={16} className="text-zinc-500" />
                      <span className="text-zinc-500 text-sm">Search</span>
                   </div>
                </div>

                {/* SAVED MESSAGES (RENAMED TO NOTES) */}
                <div 
                  onClick={() => { setActiveChatId('saved_messages'); setCurrentView('room'); scrollToBottom('auto'); }}
                  className="px-4 py-3 flex gap-3 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer border-b border-zinc-800/50"
                >
                    {/* VIBENOTES LOGO AS AVATAR */}
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group/logo">
                        <div className="w-full h-full rounded-xl flex items-center justify-center relative overflow-visible">
                            {/* Startup Animation */}
                            {isStartup && (
                                <>
                                    <div className="absolute inset-[-4px] border rounded-xl animate-[spin_1s_linear_infinite] opacity-50" style={{ borderColor: `${accentColor}80` }} />
                                    <div className="absolute inset-0 rounded-xl animate-ping opacity-75" style={{ backgroundColor: accentColor, animationDuration: '4.5s' }} />
                                </>
                            )}
                            
                            {/* Logo Content */}
                            {activeFilter === 'secret' ? (
                                <Terminal className="text-zinc-500 transition-colors" style={{ color: isStartup ? undefined : HACKER_GREEN }} size={24} />
                            ) : (
                                <div 
                                    className={`w-3 h-3 rounded-sm relative z-10 transition-all duration-300 ${isStartup ? 'animate-bounce' : ''}`} 
                                    style={{ 
                                        backgroundColor: accentColor, 
                                        boxShadow: `0 0 10px ${accentColor}80`, 
                                        animation: isStartup ? `${startupAnimName} 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` : undefined 
                                    }} 
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-white">Notes</span>
                            <span className="text-xs text-zinc-500">{notes.length > 0 ? getDateLabel(notes[notes.length-1].date) : ''}</span>
                        </div>
                        <div className="text-zinc-400 text-sm truncate pr-4">
                           <span className="text-blue-400 mr-1">You:</span>
                           {notes.length > 0 ? notes[notes.length-1].text : 'No notes yet'}
                        </div>
                    </div>
                </div>

                {/* MOCK CHATS */}
                {MOCK_CHATS.map(chat => (
                  <div key={chat.id} className="px-4 py-3 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-zinc-800/50">
                      <div className={`w-12 h-12 rounded-full ${chat.color} flex items-center justify-center flex-shrink-0 text-white font-bold text-lg`}>
                          {chat.name[0]}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex justify-between items-baseline">
                              <span className="font-semibold text-white truncate">{chat.name}</span>
                              <span className="text-xs text-zinc-500">{chat.time}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400 text-sm truncate">{chat.message}</span>
                              <div className="bg-zinc-700 text-white text-[10px] px-1.5 rounded-full min-w-[18px] text-center">1</div>
                          </div>
                      </div>
                  </div>
                ))}
             </div>
           )}

           {/* CONTENT: SETTINGS */}
           {activeTab === 'settings' && (
             <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Profile Section */}
                <div className="bg-zinc-900/80 rounded-2xl p-4 flex items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500 flex items-center justify-center text-2xl">😎</div>
                   <div>
                      <h2 className="text-xl font-bold">{user.displayName || "Vibe User"}</h2>
                      <p className="text-zinc-500 text-sm">+1 555 019 2834</p>
                   </div>
                </div>

                {/* Appearance Section */}
                <div className="bg-zinc-900/80 rounded-2xl p-4 space-y-6">
                   <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Appearance</h3>
                   
                    {/* Alignment */}
                    <div className="space-y-2">
                      <label className="text-white text-sm">Message Alignment</label>
                      <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-zinc-800">
                          <button onClick={() => setAlignment('left')} className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${alignment === 'left' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}><AlignLeft size={16}/></button>
                          <button onClick={() => setAlignment('center')} className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${alignment === 'center' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}><AlignCenter size={16}/></button>
                          <button onClick={() => setAlignment('right')} className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${alignment === 'right' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}><AlignRight size={16}/></button>
                      </div>
                    </div>

                    {/* Scale */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-white text-sm">Wallpaper Scale</label>
                            <span className="text-zinc-500 text-xs">{bgScale >= 100 ? 'Cover' : `${bgScale}%`}</span>
                        </div>
                        <input type="range" min="20" max="100" step="5" value={bgScale} onChange={(e) => setBgScale(parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>

                     {/* Opacity */}
                     <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-white text-sm">Opacity</label>
                            <span className="text-zinc-500 text-xs">{Math.round(bgOpacity * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                </div>

                {/* Wallpaper Grid */}
                <div className="bg-zinc-900/80 rounded-2xl p-4 space-y-4">
                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Wallpapers</h3>
                     <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                              <button 
                                key={num}
                                onClick={() => setBgIndex(num)}
                                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative group ${bgIndex === num ? 'border-orange-500 scale-95 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                              >
                                  <img src={`/bg${num}.jpg`} className="w-full h-full object-cover" alt={`bg${num}`} />
                              </button>
                          ))}
                      </div>
                </div>

             </div>
           )}

           <BottomTabBar />
        </div>
      )}

      {/* === VIEW 2: CHAT ROOM (NOTES) === */}
      {currentView === 'room' && activeChatId === 'saved_messages' && (
        <div className="flex-1 flex flex-col h-full z-10 animate-in slide-in-from-right-10 fade-in duration-300">
           
           {/* HEADER (Restored to Original + Back Icon) */}
            <div className="fixed top-0 left-0 right-0 z-40">
                <header className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3 relative">
                    <div className="flex items-center gap-3 w-full">
                        
                        {/* 1. Back Icon (Arrow) - UPDATED HOVER LOGIC */}
                        <button 
                            onClick={() => setCurrentView('list')} 
                            className="w-10 h-10 flex items-center justify-center text-zinc-400 transition-colors active:scale-95"
                            onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'} // zinc-400
                        >
                            <ChevronLeft size={28} />
                        </button>

                        {/* 2. Logo / Secret Trigger (Original) */}
                        <button onClick={handleSecretTrigger} className="w-10 h-10 bg-transparent flex items-center justify-center rounded-xl active:scale-95 transition-transform relative overflow-visible group/logo">
                            {isStartup && (<><div className="absolute inset-[-4px] border rounded-xl animate-[spin_1s_linear_infinite] opacity-50" style={{ borderColor: `${accentColor}80` }} /><div className="absolute inset-0 rounded-xl animate-ping opacity-75" style={{ backgroundColor: accentColor, animationDuration: '4.5s' }} /></>)}
                            {activeFilter === 'secret' ? (<Terminal className="text-zinc-500 transition-colors" style={{ color: isStartup ? undefined : HACKER_GREEN }} size={24} />) : (<div className={`w-3 h-3 rounded-sm relative z-10 transition-all duration-300 ${isStartup ? 'animate-bounce' : ''}`} style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}80`, animation: isStartup ? `${startupAnimName} 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` : undefined }} />)}
                        </button>
                        
                        {/* 3. Search Bar (Original) */}
                        <div className="relative flex items-center h-10 ml-auto">
                            <button onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className={`w-10 h-10 flex items-center justify-center text-zinc-500 transition-all active:scale-95 ${isSearchExpanded ? 'opacity-0 pointer-events-none scale-50' : 'opacity-100 scale-100'}`} onMouseEnter={(e) => e.currentTarget.style.color = accentColor} onMouseLeave={(e) => e.currentTarget.style.color = ''}><Search size={20} /></button>
                            <div className={`absolute right-0 bg-zinc-900 border border-zinc-800 rounded-full flex items-center px-3 h-10 transition-all duration-300 origin-right ${isSearchExpanded ? 'w-[200px] opacity-100 shadow-lg z-50' : 'w-0 opacity-0 pointer-events-none'}`}>
                                <Search className="text-zinc-500 mr-2 flex-shrink-0" size={16} />
                                <input ref={searchInputRef} type="text" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="bg-transparent border-none outline-none text-white text-base md:text-sm w-full h-full placeholder:text-zinc-600 min-w-0"/>
                                <button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="p-1 text-zinc-500 hover:text-white flex-shrink-0"><X size={14} /></button>
                            </div>
                        </div>

                    </div>
                </header>
            </div>

           {/* Secret Canvas Layer */}
           {showSecretAnim && <canvas ref={canvasRef} className="fixed inset-0 z-20 pointer-events-none" />}

           {/* Messages List (Reuse your logic) */}
           <div ref={listRef} className={`flex-1 overflow-y-auto relative z-10 w-full no-scrollbar`}>
              <div className={`min-h-full max-w-2xl mx-auto flex flex-col justify-end gap-3 pt-20 pb-0 px-4 ${getAlignmentClass()}`}>
                {filteredNotes.map((note, index) => {
                    const prevNote = filteredNotes[index - 1];
                    const showHeader = !prevNote || !isSameDay(note.date, prevNote.date);
                    return (
                        <React.Fragment key={note.id}>
                             {showHeader && (
                                 <div className="flex justify-center my-4 opacity-70 w-full select-none">
                                    <span className="text-zinc-500 text-[11px] font-medium uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md">
                                        {getDateLabel(note.date)}
                                    </span>
                                 </div>
                             )}
                            <div 
                              onDoubleClick={() => handleToggleExpand(note.id)} 
                              className={`select-none transition-all duration-300 active:scale-[0.99] w-full flex ${alignment === 'left' ? 'justify-start' : alignment === 'center' ? 'justify-center' : 'justify-end'} ${editingNote && editingNote.id !== note.id ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}
                            >
                                <NoteCard note={note} categories={activeFilter === 'secret' ? [activeSecretConfig] : categories} selectedVoice={selectedVoice} onDelete={handleDeleteNote} onPin={togglePin} onCategoryClick={(cat) => setActiveFilter(cat)} onEdit={() => handleEditClick(note)} onToggleExpand={handleToggleExpand} />
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={bottomRef} className="h-0 w-full shrink-0" />
              </div>
           </div>

           {/* Input Footer */}
           <div className="flex-none w-full p-2 pb-6 md:pb-3 bg-black/60 backdrop-blur-xl z-50 border-t border-zinc-800/50">
             <div className="max-w-2xl mx-auto flex items-end gap-2">
                 
                 {/* RESTORED CATEGORY BUTTON */}
                 <button onClick={cycleFilter} className="flex-shrink-0 w-8 h-8 mb-1 rounded-full text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                    {activeFilter === 'all' ? (<LayoutGrid size={24} />) : (<span className="text-xl leading-none">{currentConfig?.emoji}</span>)}
                 </button>
                 
                 <div className="flex-1 bg-zinc-900/50 border border-zinc-700/50 rounded-2xl flex items-center px-3 py-1.5 focus-within:border-blue-500/50 transition-colors gap-2 relative">
                    {imageUrl && (
                        <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div>
                            <button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={10} /></button>
                        </div>
                    )}
                    <textarea 
                        ref={textareaRef} 
                        value={transcript} 
                        onChange={(e) => setTranscript(e.target.value)} 
                        onPaste={(e) => handlePaste(e)} 
                        onFocus={() => { scrollToBottom('auto'); }}
                        placeholder={editingNote ? "Edit..." : (activeFilter === 'all' ? "Select category..." : `${currentConfig?.label}...`)} 
                        rows={1} 
                        className={`w-full bg-transparent border-none text-white placeholder:text-zinc-500 focus:outline-none text-base resize-none max-h-32 py-1 ${isHackerMode ? 'font-mono' : ''}`} 
                        style={isHackerMode ? { color: HACKER_GREEN } : undefined} 
                    />
                    {(!transcript && !editingNote) && (<label className="cursor-pointer text-zinc-400 hover:text-white"><ImageIcon size={20} /><input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} /></label>)}
                </div>

                <button 
                  onClick={handleMainAction} 
                  disabled={(!transcript.trim() && !imageUrl) || (activeFilter === 'all' && !editingNote)} 
                  className={`flex-shrink-0 w-8 h-8 mb-1 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg`}
                  style={(transcript.trim() || imageUrl) && activeFilter !== 'all' 
                      ? { backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}80`, color: 'white' } 
                      : { backgroundColor: 'transparent', color: '#71717a', boxShadow: 'none' }
                  }
                >
                    {editingNote ? <Check size={18} strokeWidth={3} /> : <ArrowUp size={20} strokeWidth={3} />}
                </button>
             </div>
           </div>

        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}

export default App;