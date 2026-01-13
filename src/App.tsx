import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, Settings as SettingsIcon, ArrowUp, LayoutGrid, Image as ImageIcon, 
  Check, Terminal, Plus, PenLine, AlignLeft, AlignCenter, AlignRight, Scan, 
  ChevronLeft, MessageSquareDashed, Bookmark, Edit, Moon, Book,
  Archive, Trash2, CheckCheck, Circle, Globe, Zap, Cpu, SlidersHorizontal,
  User, AtSign, Activity, Camera, Save, Grid, UserPlus, MessageCircle, MoreVertical, Phone, PaintBucket,
  Sun, Sunset, QrCode, Mic
} from 'lucide-react'; 
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard'; 
import { useFirebaseSync, useNotes, useChats, useMessages, syncUserProfile, searchUsers, useUser, usePresence } from './useFirebaseSync';
import Auth from './components/Auth';

const TRANSLATIONS = { search: "Search...", all: "All", typePlaceholder: "Message...", cat_hacker: "Hacker Mode" };
const CLAUDE_ORANGE = '#da7756'; 
const HACKER_GREEN = '#4ade80';
const HACKER_CONFIG: CategoryConfig = { id: 'secret', label: 'Anon', emoji: '💻', colorClass: 'bg-green-500' };

const normalizeDate = (d: any): number => { try { if (!d) return 0; if (typeof d === 'number') return d; if (typeof d.toMillis === 'function') return d.toMillis(); if (d.seconds) return d.seconds * 1000; const parsed = new Date(d).getTime(); return isNaN(parsed) ? 0 : parsed; } catch { return 0; } };
const isSameDay = (d1: any, d2: any) => { const t1 = normalizeDate(d1); const t2 = normalizeDate(d2); if (!t1 || !t2) return false; const date1 = new Date(t1); const date2 = new Date(t2); return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear(); };
const getDateLabel = (d: any) => { const timestamp = normalizeDate(d); if (!timestamp) return ''; const date = new Date(timestamp); const today = new Date(); const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); if (isSameDay(timestamp, today.getTime())) return 'Today'; if (isSameDay(timestamp, yesterday.getTime())) return 'Yesterday'; return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
const compressImage = (file: File): Promise<string> => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target?.result as string; img.onload = () => { const canvas = document.createElement('canvas'); let width = img.width, height = img.height; const MAX_SIZE = 600; if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } } canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }; img.onerror = reject; }; reader.onerror = reject; }); };

const ChatListItem = ({ chat, active, isEditing, onSelect, onClick, index }: any) => {
    const otherUser = useUser(chat.otherUserId);
    const displayName = otherUser?.displayName || 'Unknown';
    const photoURL = otherUser?.photoURL;
    const initial = displayName ? displayName[0].toUpperCase() : '?';
    return (
        <div onClick={isEditing ? onSelect : onClick} style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent animate-in slide-in-from-right-8 fade-in duration-500 ${active ? 'bg-white/10 border-white/5' : 'hover:bg-white/5'}`}>
            {isEditing && (<div className="flex items-center justify-center animate-in slide-in-from-left-2 fade-in duration-200"><div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${active ? 'bg-[#da7756] border-[#da7756] scale-110' : 'border-zinc-700 bg-black/40'}`}>{active && <Check size={14} className="text-white" strokeWidth={4} />}</div></div>)}
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-lg shadow-black/30 overflow-hidden relative">{photoURL ? (<img src={photoURL} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />) : null}<span className={`absolute ${photoURL ? '-z-10' : ''}`}>{initial}</span></div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5"><div className="flex justify-between items-baseline"><span className="font-bold text-white text-base tracking-tight truncate">{displayName}</span><span className="text-[10px] text-zinc-500 font-mono">{getDateLabel(normalizeDate(chat.timestamp))}</span></div><div className="flex justify-between items-center"><span className="text-zinc-400 text-sm truncate opacity-70">{chat.lastMessage}</span></div></div>
        </div>
    );
};

function App() {
  const { user, loading: authLoading } = useFirebaseSync();
  usePresence(user?.uid);
  const myProfile = useUser(user?.uid);
  
  const { notes = [], addNote, deleteNote: deleteNoteFromFirebase, updateNote } = useNotes(user?.uid || null);
  const { chats: realChats, createChat } = useChats(user?.uid || null);
  
  const [currentView, setCurrentView] = useState<'list' | 'room'>('list');
  const [activeTab, setActiveTab] = useState<'contacts' | 'calls' | 'chats' | 'settings'>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [profileName, setProfileName] = useState("Vibe User");
  const [profileHandle, setProfileHandle] = useState("@neo");
  const [profileBio, setProfileBio] = useState("Status: Online");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [categories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [bgIndex, setBgIndex] = useState<number>(1);
  const [bgOpacity, setBgOpacity] = useState<number>(0.45);
  const [bgScale, setBgScale] = useState<number>(100);
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [bubbleStyle, setBubbleStyle] = useState<string>('minimal_solid');
  const [redModeIntensity, setRedModeIntensity] = useState<number>(0);
  const [isAutoRedMode, setIsAutoRedMode] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // --- MIC REFS & STREAMS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  const currentChatObject = activeChatId && activeChatId !== 'saved_messages' ? realChats.find(c => c.id === activeChatId) : null;
  const otherChatUser = useUser(currentChatObject?.otherUserId);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all' | 'secret'>('all');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isStartup, setIsStartup] = useState(true);
  const [secretTaps, setSecretTaps] = useState(0);
  const tapTimeoutRef = useRef<any>(null);
  const [showSecretAnim, setShowSecretAnim] = useState(false);

  const { messages: activeMessages, sendMessage, deleteMessage, updateMessage, markChatAsRead } = useMessages(
    (activeChatId && activeChatId !== 'saved_messages') ? activeChatId : null
  );

  useEffect(() => { if (activeChatId && activeChatId !== 'saved_messages' && user && activeMessages.length > 0) { markChatAsRead(user.uid); } }, [activeChatId, activeMessages.length, user]);

  const activeSecretConfig = HACKER_CONFIG;
  const isHackerMode = activeFilter === 'secret' || editingNote?.category === 'secret';
  const accentColor = isHackerMode ? HACKER_GREEN : CLAUDE_ORANGE;
  const navAccentColor = isHackerMode ? HACKER_GREEN : '#ffffff';
  
  const currentTheme = { font: isHackerMode ? 'font-mono' : 'font-sans', selection: isHackerMode ? 'selection:bg-green-500/30 selection:text-green-400' : 'selection:bg-white/20 selection:text-white' };
  const currentConfig = activeFilter === 'all' ? null : (activeFilter === 'secret' ? HACKER_CONFIG : categories.find(c => c.id === activeFilter));

  useEffect(() => { const timer = setTimeout(() => { setIsStartup(false); }, 4500); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (myProfile) { if (myProfile.displayName) setProfileName(myProfile.displayName); if (myProfile.handle) setProfileHandle(myProfile.handle); if (myProfile.photoURL) setProfilePic(myProfile.photoURL); } }, [myProfile]);
  useEffect(() => { if (user) { if (!myProfile) { setProfileName(localStorage.getItem('vibenotes_profile_name') || user.displayName || 'Vibe User'); setProfileHandle(localStorage.getItem('vibenotes_profile_handle') || '@neo'); setProfilePic(localStorage.getItem('vibenotes_profile_pic') || null); } syncUserProfile(user); } }, [user]);
  useEffect(() => { const savedBubble = localStorage.getItem('vibenotes_bubble_style'); if (savedBubble) setBubbleStyle(savedBubble); const savedRed = localStorage.getItem('vibenotes_red_intensity'); if (savedRed) setRedModeIntensity(parseInt(savedRed)); const savedAutoRed = localStorage.getItem('vibenotes_red_auto'); if (savedAutoRed) setIsAutoRedMode(savedAutoRed === 'true'); }, []);
  useEffect(() => { if (!isAutoRedMode) return; const checkTime = () => { const hour = new Date().getHours(); if (hour >= 18 || hour < 6) { if (redModeIntensity !== 50) { setRedModeIntensity(50); localStorage.setItem('vibenotes_red_intensity', '50'); } } else { if (redModeIntensity !== 0) { setRedModeIntensity(0); localStorage.setItem('vibenotes_red_intensity', '0'); } } }; checkTime(); const interval = setInterval(checkTime, 60000); return () => clearInterval(interval); }, [isAutoRedMode, redModeIntensity]);
  useEffect(() => { if (currentView !== 'room') return; const handleVisualResize = () => { setTimeout(() => { scrollToBottom('auto'); }, 100); }; if (window.visualViewport) { window.visualViewport.addEventListener('resize', handleVisualResize); window.visualViewport.addEventListener('scroll', handleVisualResize); } return () => { if (window.visualViewport) { window.visualViewport.removeEventListener('resize', handleVisualResize); window.visualViewport.removeEventListener('scroll', handleVisualResize); } }; }, [currentView, activeChatId]);

  const toggleAutoRedMode = () => { const newState = !isAutoRedMode; setIsAutoRedMode(newState); localStorage.setItem('vibenotes_red_auto', newState.toString()); if (!newState) { setRedModeIntensity(0); localStorage.setItem('vibenotes_red_intensity', '0'); } else { const hour = new Date().getHours(); if (hour >= 18 || hour < 6) { setRedModeIntensity(50); } else { setRedModeIntensity(0); } } };
  const changeBubbleStyle = (style: string) => { setBubbleStyle(style); localStorage.setItem('vibenotes_bubble_style', style); };
  const handleSecretTrigger = () => { setSecretTaps(prev => prev + 1); if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current); tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000); if (secretTaps + 1 >= 5) { setActiveFilter('secret'); setSecretTaps(0); setShowSecretAnim(true); setTimeout(() => setShowSecretAnim(false), 8000); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); } };
  const toggleEditMode = () => { if (isEditing) setSelectedChatIds(new Set()); setIsEditing(!isEditing); };
  const toggleChatSelection = (id: string) => { const newSet = new Set(selectedChatIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedChatIds(newSet); };
  const handleDeleteSelected = () => { setSelectedChatIds(new Set()); setIsEditing(false); };
  const handleProfileSave = () => { setIsEditingProfile(false); setShowAvatarSelector(false); localStorage.setItem('vibenotes_profile_name', profileName); localStorage.setItem('vibenotes_profile_handle', profileHandle); localStorage.setItem('vibenotes_profile_bio', profileBio); if (profilePic) localStorage.setItem('vibenotes_profile_pic', profilePic); if (user) syncUserProfile(user); };
  const handleAvatarUpload = async (file: File) => { try { const url = await compressImage(file); setProfilePic(url); setShowAvatarSelector(false); } catch(e) { console.error(e); } };
  const handleSelectPreset = (num: number) => { setProfilePic(`/robot${num}.jpeg?v=1`); setShowAvatarSelector(false); };
  const handleImageUpload = async (file: File) => { if (!file.type.startsWith('image/')) return alert('Please select an image file'); setIsUploadingImage(true); try { const url = await compressImage(file); setImageUrl(url); } catch (e) { console.error(e); } finally { setIsUploadingImage(false); } };
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => { const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { e.preventDefault(); const file = items[i].getAsFile(); if (file) await handleImageUpload(file); break; } } };

  // --- UNIVERSAL RECORDING LOGIC ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream; 
          
          let mimeType = '';
          if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
          else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          
          const options = mimeType ? { mimeType } : undefined;
          const mediaRecorder = new MediaRecorder(stream, options);
          mimeTypeRef.current = mediaRecorder.mimeType || mimeType;

          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };

          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                  const base64Audio = reader.result as string;
                  if (base64Audio.length > 1000000) { alert("Voice note too long."); return; }
                  if (user && activeChatId) { await sendMessage("", null, base64Audio, user.uid); scrollToBottom('auto'); }
              };
              if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
              }
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (e) { console.error("Mic error", e); alert("Microphone access denied."); }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleDeleteMessage = async (id: string) => { await deleteMessage(id); };
  const handleEditMessage = (msg: any) => { setEditingNote({ ...msg, category: 'default' }); setTranscript(msg.text); setTimeout(() => textareaRef.current?.focus(), 100); };

  const handleSearchContacts = async (e: React.FormEvent) => { e.preventDefault(); if (!contactSearchQuery.trim()) return; setIsSearchingContacts(true); try { const results = await searchUsers(contactSearchQuery); setContactSearchResults(results.filter((u: any) => u.uid !== user?.uid)); } catch (err) { console.error(err); } finally { setIsSearchingContacts(false); } };
  const startNewChat = async (otherUid: string) => { if (!otherUid) return; try { const newChatId = await createChat(otherUid); if (newChatId) { setActiveChatId(newChatId); setCurrentView('room'); setContactSearchQuery(''); setContactSearchResults([]); } } catch (e) { console.error("Failed to create chat", e); } };

  useEffect(() => { if (!showSecretAnim || currentView !== 'room') return; const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return; canvas.width = window.innerWidth; canvas.height = window.innerHeight; const FONT_SIZE = 24; const FADE_SPEED = 0.1; const MASTER_SPEED = 50; const STUTTER_AMOUNT = 0.85; const RAIN_BUILDUP = 50; const COLOR_HEAD = '#FFF'; const COLOR_TRAIL = '#0D0'; const GLOW_COLOR = '#0F0'; const GLOW_INTENSITY = 10; const binary = '010101010101'; const nums = '0123456789'; const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const alphabet = binary + nums + latin; const columns = canvas.width / FONT_SIZE; const drops: number[] = []; for(let x = 0; x < columns; x++) { drops[x] = Math.floor(Math.random() * -RAIN_BUILDUP); } const draw = () => { ctx.fillStyle = `rgba(0, 0, 0, ${FADE_SPEED})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = `bold ${FONT_SIZE}px monospace`; for(let i = 0; i < drops.length; i++) { if (Math.random() > STUTTER_AMOUNT) continue; const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length)); const x = i * FONT_SIZE; const y = drops[i] * FONT_SIZE; if (y > 0) { ctx.shadowBlur = 0; ctx.fillStyle = COLOR_TRAIL; ctx.fillText(text, x, y - FONT_SIZE); ctx.shadowColor = GLOW_COLOR; ctx.shadowBlur = GLOW_INTENSITY; ctx.fillStyle = COLOR_HEAD; ctx.fillText(text, x, y); } if(y > canvas.height && Math.random() > 0.975) drops[i] = 0; drops[i]++; } }; const interval = setInterval(draw, MASTER_SPEED); const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }; window.addEventListener('resize', handleResize); return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); }; }, [showSecretAnim, currentView]);
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); }, 100); };
  
  useEffect(() => { try { const savedAlignment = localStorage.getItem('vibenotes_alignment'); if(savedAlignment) setAlignment(savedAlignment as any); const savedBg = localStorage.getItem('vibenotes_bg'); if (savedBg) setBgIndex(parseInt(savedBg)); const savedOpacity = localStorage.getItem('vibenotes_bg_opacity'); if (savedOpacity) setBgOpacity(parseFloat(savedOpacity)); const savedScale = localStorage.getItem('vibenotes_bg_scale'); if (savedScale) setBgScale(parseInt(savedScale)); } catch (e) {} }, []);
  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  useEffect(() => { localStorage.setItem('vibenotes_bg', bgIndex.toString()); }, [bgIndex]);
  useEffect(() => { localStorage.setItem('vibenotes_bg_opacity', bgOpacity.toString()); }, [bgOpacity]);
  useEffect(() => { localStorage.setItem('vibenotes_bg_scale', bgScale.toString()); }, [bgScale]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; } }, [transcript]);

  const cycleFilter = () => { if (activeFilter === 'secret') { setActiveFilter('all'); return; } const order: (CategoryId | 'all')[] = ['all', ...categories.map(c => c.id)]; const currentIndex = order.indexOf(activeFilter as any); if (currentIndex === -1) { setActiveFilter('all'); return; } const nextIndex = (currentIndex + 1) % order.length; setActiveFilter(order[nextIndex]); };

  const handleMainAction = async () => {
    if (!transcript.trim() && !imageUrl) return;
    if (activeFilter === 'all' && !editingNote && activeChatId === 'saved_messages') return; 
    try {
        if (activeChatId === 'saved_messages' || activeChatId === null) {
            if (editingNote) {
                const updates: Partial<Note> = { text: transcript.trim(), editedAt: Date.now() }; 
                if (imageUrl !== editingNote.imageUrl) updates.imageUrl = imageUrl || undefined;
                await updateNote(editingNote.id, updates);
                setEditingNote(null);
            } else {
                const categoryToUse = activeFilter as CategoryId; 
                await addNote({ text: transcript.trim(), date: Date.now(), category: categoryToUse, isPinned: false, isExpanded: true, imageUrl: imageUrl || undefined });
                scrollToBottom(); 
            }
        } else {
            if (editingNote && editingNote.id) {
                await updateMessage(editingNote.id, transcript.trim());
                setEditingNote(null);
            } else if (user) {
                await sendMessage(transcript.trim(), imageUrl, null, user.uid);
            }
        }
        setTranscript(''); setImageUrl(''); scrollToBottom();
    } catch (e) { console.error(e); }
  };

  const handleEditClick = (note: Note) => { setActiveFilter(note.category); setEditingNote(note); setTranscript(note.text); setImageUrl(note.imageUrl || ''); setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 50); };
  const handleDeleteNote = async (id: string) => { await deleteNoteFromFirebase(id); };
  const handleToggleExpand = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isExpanded: !n.isExpanded }); };
  const togglePin = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isPinned: !n.isPinned }); };

  const safeNotes = (notes || []).map(n => { const date = normalizeDate(n.date); const editedAt = n.editedAt ? normalizeDate(n.editedAt) : undefined; const fallbackCat = (DEFAULT_CATEGORIES && DEFAULT_CATEGORIES.length > 0) ? DEFAULT_CATEGORIES[0].id : 'default'; const validCategory = categories.some(c => c.id === n.category) || n.category === 'secret' ? n.category : fallbackCat; const effectiveDate = editedAt && editedAt > date ? editedAt : date; return { ...n, id: n.id || Math.random().toString(), text: n.text || '', date: effectiveDate, originalDate: date, editedAt, category: validCategory }; });
  const filteredNotes = safeNotes.filter(n => { const matchesSearch = n.text.toLowerCase().includes(searchQuery.toLowerCase()); if (!matchesSearch) return false; if (activeFilter === 'all') return n.category !== 'secret'; if (activeFilter === 'secret') return n.category === 'secret'; return n.category === activeFilter; }).sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return a.date - b.date; });
  const getAlignmentClass = () => alignment === 'center' ? 'items-center' : alignment === 'right' ? 'items-end' : 'items-start';

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  const BottomTabBar = () => ( <div className="flex-none fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full shadow-2xl shadow-black/50 p-1.5 flex gap-1 z-50"> <button onClick={() => setActiveTab('contacts')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Globe size={22} className={`transition-all duration-300 ${activeTab === 'contacts' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'contacts' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button> <button onClick={() => setActiveTab('calls')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Zap size={22} className={`transition-all duration-300 ${activeTab === 'calls' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'calls' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button> <button onClick={() => setActiveTab('chats')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><MessageSquareDashed size={22} className={`transition-all duration-300 ${activeTab === 'chats' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'chats' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button> <button onClick={() => setActiveTab('settings')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Cpu size={22} className={`transition-all duration-300 ${activeTab === 'settings' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'settings' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button> </div> );

  return (
    <div className={`fixed top-0 left-0 w-full h-[100dvh] bg-black text-zinc-100 font-sans ${currentTheme.selection} flex flex-col overflow-hidden ${currentTheme.font}`}>
      {zoomedImage && (<div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}><img src={zoomedImage} className="max-w-full max-h-full object-contain p-4 transition-transform duration-300 scale-100" /><button className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={32} /></button></div>)}
      {showQRCode && (<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200" onClick={() => setShowQRCode(false)}><div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-6 max-w-sm w-full" onClick={e => e.stopPropagation()}><div className="text-center"><div className="w-20 h-20 rounded-full bg-black mx-auto mb-4 overflow-hidden"><img src={profilePic || ''} className="w-full h-full object-cover"/></div><h2 className="text-2xl font-black text-black">{profileName}</h2><p className="text-zinc-500 font-mono">{profileHandle}</p></div><div className="bg-white p-2 rounded-xl border-2 border-black"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${profileHandle}`} alt="QR Code" className="w-full h-full" /></div><p className="text-xs text-center text-zinc-400">Scan to connect securely</p><button onClick={() => setShowQRCode(false)} className="w-full py-3 bg-black text-white font-bold rounded-xl">Close</button></div></div>)}
      
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-black"><div className="absolute inset-0 transition-opacity duration-300" style={{ backgroundImage: `url(/bg${bgIndex}.jpg)`, backgroundSize: bgScale >= 100 ? 'cover' : `${bgScale}%`, backgroundPosition: 'center', backgroundRepeat: 'repeat', opacity: bgOpacity }} /></div>
      <div className="fixed inset-0 z-0 pointer-events-none mix-blend-overlay transition-opacity duration-1000" style={{ backgroundColor: '#ff4500', opacity: redModeIntensity / 100 }} />

      {currentView === 'list' && (
        <div className="flex-1 flex flex-col h-full z-10 animate-in fade-in slide-in-from-left-5 duration-300">
           {activeTab === 'chats' && (<div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20"><div className="max-w-2xl mx-auto w-full flex items-end justify-between"><div><h1 className="text-3xl font-black text-white tracking-tighter">FEED</h1><p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Encrypted</p></div><div className="flex gap-4 items-center mb-1"><button className="text-zinc-500 transition-colors" onMouseEnter={(e) => e.currentTarget.style.color = accentColor} onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}><PenLine size={20} /></button></div></div></div>)}
           {activeTab === 'settings' && (<div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20"><div className="max-w-2xl mx-auto w-full"><h1 className="text-3xl font-black text-white tracking-tighter">SYSTEM</h1></div></div>)}
           {activeTab === 'contacts' && (<div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20"><div className="max-w-2xl mx-auto w-full"><h1 className="text-3xl font-black text-white tracking-tighter">CONTACTS</h1></div></div>)}

           <div key={activeTab + 'content'} className="flex-1 overflow-y-auto no-scrollbar pb-24">
               <div className="max-w-2xl mx-auto w-full">
                   {activeTab === 'chats' && ( <> <div className="px-4 mb-4"><div className="bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 py-2.5 gap-3 transition-colors focus-within:bg-black/40 focus-within:border-white/50"><Search size={16} className="text-zinc-500" /><input type="text" placeholder="Search frequency..." className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-zinc-600 font-medium"/></div></div> <div onClick={() => { setActiveChatId('saved_messages'); setCurrentView('room'); scrollToBottom('auto'); }} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-white/5 animate-in slide-in-from-left-8 fade-in duration-500`}><div className="w-14 h-14 flex items-center justify-center flex-shrink-0 group/logo"><div className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-lg shadow-black/50">{activeFilter === 'secret' ? (<Terminal className="text-zinc-500 transition-colors" size={24} />) : (<div className="w-3 h-3 rounded-sm relative z-10" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}80` }} />)}</div></div><div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5"><div className="flex justify-between items-baseline"><span className="font-bold text-white text-base tracking-tight">Notes</span><span className="text-[10px] text-zinc-500 font-mono">{notes.length > 0 ? getDateLabel(notes[0].date) : ''}</span></div><div className="text-zinc-400 text-sm truncate pr-4 flex items-center gap-1"><span className="text-[10px] font-bold uppercase tracking-wider px-1 rounded bg-white/10" style={{ color: accentColor }}>You</span><span className="opacity-70 truncate">{notes.length > 0 ? notes[0].text : 'No notes yet'}</span></div></div></div> {realChats.map((chat, index) => ( <ChatListItem key={chat.id} chat={chat} active={isEditing ? selectedChatIds.has(chat.id) : false} isEditing={isEditing} onSelect={() => toggleChatSelection(chat.id)} onClick={() => { setActiveChatId(chat.id); setCurrentView('room'); scrollToBottom('auto'); }} index={index} /> ))} </> )}
                   {activeTab === 'contacts' && ( <div className="p-4 space-y-6"> <form onSubmit={handleSearchContacts} className="relative"> <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-3 gap-3 focus-within:border-white/50 transition-colors"> <AtSign size={18} className="text-zinc-500" /> <input type="text" value={contactSearchQuery} onChange={(e) => setContactSearchQuery(e.target.value)} placeholder="Search by handle (e.g. @neo)" className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-zinc-600 font-mono"/> <button type="submit" disabled={isSearchingContacts} className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all disabled:opacity-50"><Search size={16} /></button> </div> </form> <div onClick={() => setShowQRCode(true)} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors"> <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black"><QrCode size={24} /></div> <div className="flex-1"><h3 className="font-bold text-white">My QR Code</h3><p className="text-xs text-zinc-500">Tap to share your profile</p></div> <ChevronLeft size={16} className="rotate-180 text-zinc-500" /> </div> <div className="space-y-3 pt-4"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Results</h3>{isSearchingContacts ? (<div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>) : contactSearchResults.length > 0 ? (contactSearchResults.map((u) => (<div key={u.uid} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300"><div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden">{u.photoURL ? (<img src={u.photoURL} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-xl">🤖</div>)}</div><div className="flex-1"><h3 className="font-bold text-white">{u.displayName}</h3><p className="text-xs text-zinc-500 font-mono">{u.handle}</p></div><button onClick={() => startNewChat(u.uid)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all"><MessageCircle size={20} /></button></div>))) : (<div className="text-center py-10 opacity-30"><UserPlus size={48} className="mx-auto mb-4 text-zinc-600" /><p className="text-zinc-500 text-sm">Search for a handle to start connecting.</p></div>)}</div></div> )}
                   {activeTab === 'settings' && ( 
                       <div className="p-4 space-y-6">
                           <div className="relative overflow-hidden bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 backdrop-blur-xl group">
                               <div className="absolute top-4 right-4">
                                    {isEditingProfile ? (<button onClick={handleProfileSave} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center"><Check size={16} strokeWidth={3} /></button>) : (<button onClick={() => setIsEditingProfile(true)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white"><Edit size={14} /></button>)}
                               </div>
                               <div className="flex items-center gap-5">
                                   <div className="relative">
                                       <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl shadow-xl overflow-hidden">
                                           {profilePic ? (<img key={profilePic} src={profilePic} className="w-full h-full object-cover" />) : (<span>😎</span>)}
                                       </div>
                                       {isEditingProfile && (
                                           <><label className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white cursor-pointer"><Camera size={14} /><input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); }} /></label><button onClick={() => setShowAvatarSelector(!showAvatarSelector)} className="absolute -bottom-2 -left-2 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white cursor-pointer"><Grid size={14} /></button></>
                                       )}
                                   </div>
                                   <div className="flex-1 min-w-0 space-y-1">
                                       {isEditingProfile ? (<input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-transparent border-b border-white/20 text-white text-xl font-bold w-full focus:outline-none focus:border-white py-1" placeholder="Display Name"/>) : (<h2 className="text-2xl font-black tracking-tight text-white truncate">{profileName}</h2>)}
                                       {isEditingProfile ? (<div className="flex items-center gap-1 text-zinc-500"><AtSign size={12} /><input type="text" value={profileHandle} onChange={(e) => setProfileHandle(e.target.value)} className="bg-transparent border-b border-white/20 text-white text-sm font-mono w-full focus:outline-none focus:border-white" placeholder="handle"/></div>) : (<p className="text-zinc-400 text-xs font-mono tracking-wide">{profileHandle}</p>)}
                                   </div>
                               </div>
                               <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                    {isEditingProfile ? (<div className="flex items-center gap-2"><Activity size={14} className="text-zinc-500" /><input type="text" value={profileBio} onChange={(e) => setProfileBio(e.target.value)} className="bg-transparent border-b border-white/20 text-zinc-300 text-xs font-mono w-full focus:outline-none focus:border-white py-1" placeholder="Status..."/></div>) : (<div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>{profileBio}</div>)}
                                    <button onClick={() => setShowQRCode(true)} className="text-zinc-500 hover:text-white"><QrCode size={20} /></button>
                               </div>
                           </div>
                           
                           <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><SlidersHorizontal size={14}/> Interface</h3>
                                <div className="space-y-3"><label className="text-white text-sm font-medium">Message Alignment</label><div className="flex gap-2 p-1.5 bg-black/40 rounded-xl border border-zinc-800"><button onClick={() => setAlignment('left')} className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${alignment === 'left' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><AlignLeft size={18}/></button><button onClick={() => setAlignment('center')} className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${alignment === 'center' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><AlignCenter size={18}/></button><button onClick={() => setAlignment('right')} className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${alignment === 'right' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><AlignRight size={18}/></button></div></div>
                                <div className="space-y-3">
                                    <label className="text-white text-sm font-medium flex items-center gap-2"><PaintBucket size={14}/> Chat Bubble Style</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => changeBubbleStyle('minimal_solid')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'minimal_solid' ? 'border-white ring-1 ring-white/50' : 'border-white/5 hover:border-white/20'}`} title="Minimal Solid"><div className="absolute inset-0 bg-white" /><span className="relative z-10 text-xs font-bold text-black uppercase tracking-wider">Minimal</span></button>
                                        <button onClick={() => changeBubbleStyle('minimal_glass')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'minimal_glass' ? 'border-white ring-1 ring-white/50' : 'border-white/5 hover:border-white/20'}`} title="Minimal Glass"><div className="absolute inset-0 bg-white/20 backdrop-blur-md" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Glass</span></button>
                                        <button onClick={() => changeBubbleStyle('clear')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'clear' ? 'border-white ring-1 ring-white/50' : 'border-white/5 hover:border-white/20'}`} title="Clear White"><div className="absolute inset-0 bg-white/5 border border-white/20" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Clear</span></button>
                                        <button onClick={() => changeBubbleStyle('solid_gray')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'solid_gray' ? 'border-zinc-400 ring-1 ring-zinc-400/50' : 'border-white/5 hover:border-zinc-400/50'}`} title="Solid Gray"><div className="absolute inset-0 bg-zinc-700" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Solid Gray</span></button>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-2 border-t border-white/5">
                                    <button onClick={toggleAutoRedMode} className={`w-full py-3 rounded-xl border flex items-center justify-between px-4 transition-all ${isAutoRedMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}><span className="font-medium flex items-center gap-2 text-sm"><Moon size={16} /> Auto Night Shift</span><div className={`w-10 h-6 rounded-full relative transition-colors ${isAutoRedMode ? 'bg-white' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${isAutoRedMode ? 'translate-x-4' : 'translate-x-0'}`} /></div></button>
                                    <p className="text-xs text-zinc-500 px-1">{isAutoRedMode ? "Automatically enables red filter after sunset (6 PM - 6 AM)." : "Night shift is disabled."}</p>
                                </div>
                                <div className="space-y-3"><div className="flex justify-between"><label className="text-white text-sm font-medium">Wallpaper Scale</label><span className="text-zinc-500 text-xs font-mono">{bgScale >= 100 ? 'COVER' : `${bgScale}%`}</span></div><input type="range" min="20" max="100" step="5" value={bgScale} onChange={(e) => setBgScale(parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" /></div>
                                 <div className="space-y-3"><div className="flex justify-between"><label className="text-white text-sm font-medium">Opacity</label><span className="text-zinc-500 text-xs font-mono">{Math.round(bgOpacity * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" /></div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><ImageIcon size={14}/> Backgrounds</h3>
                                 <div className="grid grid-cols-4 gap-3">
                                      {Array.from({ length: 33 }, (_, i) => i + 1).map((num) => (<button key={num} onClick={() => setBgIndex(num)} className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative group ${bgIndex === num ? 'border-white scale-95 opacity-100' : 'border-transparent opacity-60 hover:opacity-100 hover:border-white/20'}`}><img src={`/bg${num}.jpg`} className="w-full h-full object-cover" alt={`bg${num}`} /></button>))}
                                  </div>
                            </div>
                       </div> 
                   )}
               </div>
           </div>

           <BottomTabBar />
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}

export default App;