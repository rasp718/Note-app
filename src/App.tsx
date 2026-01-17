import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, ArrowUp, LayoutGrid, Image as ImageIcon, Check, Terminal, 
  PenLine, AlignLeft, AlignCenter, AlignRight, ChevronLeft, ChevronDown, MessageSquareDashed, 
  Moon, Trash2, Globe, Zap, Cpu, SlidersHorizontal, AtSign, Activity, 
  Camera, Grid, UserPlus, MessageCircle, Phone, PaintBucket, QrCode, Mic, 
  Pause, Play, Dices, Edit, Bell, MoreHorizontal, Ban, Info
} from 'lucide-react'; 

// IMPORT TYPES & UTILS
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { 
  TRANSLATIONS, CLAUDE_ORANGE, HACKER_GREEN, HACKER_CONFIG,
  getBubbleColors, normalizeDate, isSameDay, getDateLabel, compressImage
} from './utils';

// IMPORT COMPONENTS
import { NoteCard } from './components/NoteCard'; 
import { ChatListItem } from './components/ChatListItem';
import { useFirebaseSync, useNotes, useChats, useMessages, syncUserProfile, searchUsers, useUser, usePresence } from './useFirebaseSync';
import Auth from './components/Auth';

function App() {
  // ============================================================================
  // SECTION: STATE MANAGEMENT
  // ============================================================================
  const { user, loading: authLoading } = useFirebaseSync();
  usePresence(user?.uid);
  
  const myProfile = useUser(user?.uid);
  const { notes = [], addNote, deleteNote: deleteNoteFromFirebase, updateNote } = useNotes(user?.uid || null);
  const { chats: realChats, createChat } = useChats(user?.uid || null);
  
  // Navigation & View
  const [currentView, setCurrentView] = useState('list');
  const [activeTab, setActiveTab] = useState('chats');
  const [activeChatId, setActiveChatId] = useState(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  
  // Profile Settings
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [profileName, setProfileName] = useState("Vibe User");
  const [profileHandle, setProfileHandle] = useState("@neo");
  const [profileBio, setProfileBio] = useState("Status: Online");
  const [profilePic, setProfilePic] = useState(null);
  const [categories] = useState(DEFAULT_CATEGORIES);
  
  // Visual Settings
  const [alignment, setAlignment] = useState('right');
  const [bgIndex, setBgIndex] = useState(1);
  const [bgOpacity, setBgOpacity] = useState(0.45);
  const [bgScale, setBgScale] = useState(100);
  const [bubbleStyle, setBubbleStyle] = useState('minimal_solid');
  const [redModeIntensity, setRedModeIntensity] = useState(0);
  const [isAutoRedMode, setIsAutoRedMode] = useState(false);

  // Inputs & Media
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mimeTypeRef = useRef('');
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const textareaRef = useRef(null); 
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const canvasRef = useRef(null);

  // Helpers
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [secretTaps, setSecretTaps] = useState(0);
  const tapTimeoutRef = useRef(null);
  const [showSecretAnim, setShowSecretAnim] = useState(false);

  const currentChatObject = activeChatId && activeChatId !== 'saved_messages' ? realChats.find(c => c.id === activeChatId) : null;
  const otherChatUser = useUser(currentChatObject?.otherUserId);
  const { messages: activeMessages, sendMessage, deleteMessage, updateMessage, markChatAsRead } = useMessages(
    (activeChatId && activeChatId !== 'saved_messages') ? activeChatId : null
  );
  
  const activeSecretConfig = HACKER_CONFIG;
  const isHackerMode = activeFilter === 'secret' || editingNote?.category === 'secret';
  const accentColor = isHackerMode ? HACKER_GREEN : CLAUDE_ORANGE;
  const navAccentColor = isHackerMode ? HACKER_GREEN : '#ffffff';
  
  const currentTheme = {
    font: isHackerMode ? 'font-mono' : 'font-sans',
    selection: isHackerMode ? 'selection:bg-green-500/30 selection:text-green-400' : 'selection:bg-white/20 selection:text-white'
  };
  const currentConfig = activeFilter === 'all' ? null : (activeFilter === 'secret' ? HACKER_CONFIG : categories.find(c => c.id === activeFilter));

  // ============================================================================
  // SECTION: EFFECTS
  // ============================================================================
  useEffect(() => {
    if (activeChatId && activeChatId !== 'saved_messages' && user && activeMessages.length > 0) {
        markChatAsRead(user.uid);
    }
  }, [activeChatId, activeMessages.length, user]);

  useEffect(() => {
      if (myProfile) {
          if (myProfile.displayName) setProfileName(myProfile.displayName);
          if (myProfile.handle) setProfileHandle(myProfile.handle);
          if (myProfile.photoURL) setProfilePic(myProfile.photoURL);
      }
  }, [myProfile]);

  // Matrix Rain
  useEffect(() => {
    if (!showSecretAnim || currentView !== 'room') return;
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const FONT_SIZE = 24; const FADE_SPEED = 0.1; const MASTER_SPEED = 50; const STUTTER_AMOUNT = 0.85; const RAIN_BUILDUP = 50; const COLOR_HEAD = '#FFF'; const COLOR_TRAIL = '#0D0'; const GLOW_COLOR = '#0F0'; const GLOW_INTENSITY = 10;     
    const binary = '010101010101'; const nums = '0123456789'; const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const alphabet = binary + nums + latin;
    const columns = canvas.width / FONT_SIZE; const drops = [];
    for(let x = 0; x < columns; x++) { drops[x] = Math.floor(Math.random() * -RAIN_BUILDUP); }
    const draw = () => {
        ctx.fillStyle = `rgba(0, 0, 0, ${FADE_SPEED})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = `bold ${FONT_SIZE}px monospace`;
        for(let i = 0; i < drops.length; i++) {
            if (Math.random() > STUTTER_AMOUNT) continue;
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length)); const x = i * FONT_SIZE; const y = drops[i] * FONT_SIZE;
            if (y > 0) { ctx.shadowBlur = 0; ctx.fillStyle = COLOR_TRAIL; ctx.fillText(text, x, y - FONT_SIZE); ctx.shadowColor = GLOW_COLOR; ctx.shadowBlur = GLOW_INTENSITY; ctx.fillStyle = COLOR_HEAD; ctx.fillText(text, x, y); }
            if(y > canvas.height && Math.random() > 0.975) drops[i] = 0; drops[i]++;
        }
    };
    const interval = setInterval(draw, MASTER_SPEED); const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }; window.addEventListener('resize', handleResize);
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
  }, [showSecretAnim, currentView]);

  useEffect(() => { if (currentView === 'room') scrollToBottom(); }, [activeMessages, notes, currentView]);
  useEffect(() => { return () => { if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); } }; }, []);
  
  useEffect(() => { 
      try { 
          const savedAlignment = localStorage.getItem('vibenotes_alignment'); 
          if(savedAlignment) setAlignment(savedAlignment); 
          const savedBg = localStorage.getItem('vibenotes_bg'); 
          if (savedBg) setBgIndex(parseInt(savedBg)); 
          const savedOpacity = localStorage.getItem('vibenotes_bg_opacity'); 
          if (savedOpacity) setBgOpacity(parseFloat(savedOpacity)); 
          const savedScale = localStorage.getItem('vibenotes_bg_scale'); 
          if (savedScale) setBgScale(parseInt(savedScale)); 
          const savedBubble = localStorage.getItem('vibenotes_bubble_style');
          if (savedBubble) setBubbleStyle(savedBubble);
      } catch (e) {} 
  }, []);

  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  useEffect(() => { localStorage.setItem('vibenotes_bg', bgIndex.toString()); }, [bgIndex]);
  useEffect(() => { localStorage.setItem('vibenotes_bg_opacity', bgOpacity.toString()); }, [bgOpacity]);
  useEffect(() => { localStorage.setItem('vibenotes_bg_scale', bgScale.toString()); }, [bgScale]);
  useEffect(() => { localStorage.setItem('vibenotes_bubble_style', bubbleStyle); }, [bubbleStyle]);
  
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; } }, [transcript]);

  // ============================================================================
  // SECTION: ACTIONS & HANDLERS
  // ============================================================================
  const scrollToBottom = (behavior = 'smooth') => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); }, 100); };

  const handleScroll = () => {
    if (listRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        setShowScrollButton(!isNearBottom);
    }
  };
  
  const handleRollDice = async () => {
    if (!user || !activeChatId) return;
    const diceMsg = `🎲 STREET_DICE_GAME|||{"p1Score":0,"p2Score":0,"turn":"p1","dice":[4,5,6],"message":"FIRST TO 5","msgColor":"text-zinc-500"}`;
    try { await sendMessage(diceMsg, null, null, user.uid); scrollToBottom(); if (navigator.vibrate) navigator.vibrate(50); } catch (e) { console.error(e); }
  };

  const handleMainAction = async () => {
    if (!transcript.trim() && !imageUrl) return;
    if (activeFilter === 'all' && !editingNote && activeChatId === 'saved_messages') return; 

    try {
        if (activeChatId === 'saved_messages' || activeChatId === null) {
            if (editingNote) {
                const updates = { text: transcript.trim(), editedAt: Date.now() }; 
                if (imageUrl !== editingNote.imageUrl) updates.imageUrl = imageUrl || undefined;
                await updateNote(editingNote.id, updates);
                setEditingNote(null);
            } else {
                const categoryToUse = activeFilter; 
                await addNote({ text: transcript.trim(), date: Date.now(), category: categoryToUse, isPinned: false, isExpanded: true, imageUrl: imageUrl || undefined });
                scrollToBottom(); 
            }
        } else {
            if (editingNote && editingNote.id) { await updateMessage(editingNote.id, transcript.trim()); setEditingNote(null); } 
            else if (user) { await sendMessage(transcript.trim(), imageUrl, null, user.uid); }
        }
        setTranscript(''); setImageUrl(''); scrollToBottom();
    } catch (e) { console.error(e); }
  };

  const toggleAutoRedMode = () => {
      const newState = !isAutoRedMode;
      setIsAutoRedMode(newState);
      localStorage.setItem('vibenotes_red_auto', newState.toString());
      if (!newState) { setRedModeIntensity(0); localStorage.setItem('vibenotes_red_intensity', '0'); } 
      else { const hour = new Date().getHours(); if (hour >= 18 || hour < 6) { setRedModeIntensity(50); } else { setRedModeIntensity(0); } }
  };

  const changeBubbleStyle = (style) => { setBubbleStyle(style); };

  const handleSecretTrigger = () => {
    setSecretTaps(prev => prev + 1);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000);
    if (secretTaps + 1 >= 5) { setActiveFilter('secret'); setSecretTaps(0); setShowSecretAnim(true); setTimeout(() => setShowSecretAnim(false), 8000); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); }
  };

  const toggleChatSelection = (id) => { const newSet = new Set(selectedChatIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedChatIds(newSet); };
  
  const handleProfileSave = () => {
      setIsEditingProfile(false); setShowAvatarSelector(false);
      localStorage.setItem('vibenotes_profile_name', profileName); localStorage.setItem('vibenotes_profile_handle', profileHandle); localStorage.setItem('vibenotes_profile_bio', profileBio);
      if (profilePic) localStorage.setItem('vibenotes_profile_pic', profilePic); if (user) syncUserProfile(user); 
  };

  const handleAvatarUpload = async (file) => { try { const url = await compressImage(file); setProfilePic(url); setShowAvatarSelector(false); } catch(e) { console.error(e); } };
  const handleSelectPreset = (num) => { setProfilePic(`/robot${num}.jpeg?v=1`); setShowAvatarSelector(false); };

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) return alert('Please select an image file');
    setIsUploadingImage(true); try { const url = await compressImage(file); setImageUrl(url); } catch (e) { console.error(e); } finally { setIsUploadingImage(false); }
  };
  const handlePaste = async (e) => {
    const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { e.preventDefault(); const file = items[i].getAsFile(); if (file) await handleImageUpload(file); break; } }
  };

  const startRecording = async () => {
    if (isRecording) return; 
    try {
      let stream = streamRef.current;
      if (!stream || !stream.active) { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); streamRef.current = stream; }
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mimeTypeRef.current = mediaRecorder.mimeType || mimeType; mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.start();
      setIsRecording(true); setIsPaused(false); setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => { setRecordingDuration(prev => prev + 1); }, 1000);
    } catch (e) { console.error("Mic error", e); alert("Microphone access denied."); }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) { mediaRecorderRef.current.resume(); setIsPaused(false); recordingTimerRef.current = setInterval(() => { setRecordingDuration(prev => prev + 1); }, 1000); } 
    else { mediaRecorderRef.current.pause(); setIsPaused(true); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); }
  };

  const finishRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        const reader = new FileReader(); reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => { const base64Audio = reader.result as string; if (base64Audio.length > 500 && user && activeChatId) { await sendMessage("", null, base64Audio, user.uid); scrollToBottom('auto'); } };
        cleanupRecording();
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); } cleanupRecording(); };
  const cleanupRecording = () => { setIsRecording(false); setIsPaused(false); setRecordingDuration(0); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; } };
  const formatDuration = (sec) => { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const handleDeleteMessage = async (id) => { await deleteMessage(id); };
  const handleEditMessage = (msg) => { setEditingNote({ ...msg, category: 'default' }); setTranscript(msg.text); setTimeout(() => textareaRef.current?.focus(), 100); };

  const handleSearchContacts = async (e) => {
      e.preventDefault(); if (!contactSearchQuery.trim()) return; setIsSearchingContacts(true);
      try { const results = await searchUsers(contactSearchQuery); setContactSearchResults(results.filter((u) => u.uid !== user?.uid)); } catch (err) { console.error(err); } finally { setIsSearchingContacts(false); }
  };
  const startNewChat = async (otherUid) => {
      if (!otherUid) return;
      try { const newChatId = await createChat(otherUid); if (newChatId) { setActiveChatId(newChatId); setCurrentView('room'); setContactSearchQuery(''); setContactSearchResults([]); } } catch (e) { console.error("Failed to create chat", e); }
  };

  const cycleFilter = () => {
      if (activeFilter === 'secret') { setActiveFilter('all'); return; }
      const order = ['all', ...categories.map(c => c.id)];
      const currentIndex = order.indexOf(activeFilter);
      if (currentIndex === -1) { setActiveFilter('all'); return; }
      const nextIndex = (currentIndex + 1) % order.length; setActiveFilter(order[nextIndex]);
  };

  const handleEditClick = (note) => { setActiveFilter(note.category); setEditingNote(note); setTranscript(note.text); setImageUrl(note.imageUrl || ''); setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 50); };
  const handleDeleteNote = async (id) => { await deleteNoteFromFirebase(id); };
  const handleToggleExpand = async (id) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isExpanded: !n.isExpanded }); };
  const togglePin = async (id) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isPinned: !n.isPinned }); };

  const safeNotes = (notes || []).map(n => {
      const date = normalizeDate(n.date); const editedAt = n.editedAt ? normalizeDate(n.editedAt) : undefined;
      const fallbackCat = (DEFAULT_CATEGORIES && DEFAULT_CATEGORIES.length > 0) ? DEFAULT_CATEGORIES[0].id : 'default';
      const validCategory = categories.some(c => c.id === n.category) || n.category === 'secret' ? n.category : fallbackCat;
      const effectiveDate = editedAt && editedAt > date ? editedAt : date;
      return { ...n, id: n.id || Math.random().toString(), text: n.text || '', date: effectiveDate, originalDate: date, editedAt, category: validCategory };
  });

  const filteredNotes = safeNotes.filter(n => {
      const matchesSearch = n.text.toLowerCase().includes(searchQuery.toLowerCase()); if (!matchesSearch) return false;
      if (activeFilter === 'all') return n.category !== 'secret'; if (activeFilter === 'secret') return n.category === 'secret';
      return n.category === activeFilter;
  }).sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return a.date - b.date; });

  const getAlignmentClass = () => alignment === 'center' ? 'items-center' : alignment === 'right' ? 'items-end' : 'items-start';

  // ============================================================================
  // SECTION: RENDER
  // ============================================================================
  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  const BottomTabBar = () => (
      <div className="flex-none fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full shadow-2xl shadow-black/50 p-1.5 flex gap-1 z-50">
         <button onClick={() => setActiveTab('contacts')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Globe size={22} className={`transition-all duration-300 ${activeTab === 'contacts' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'contacts' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
         <button onClick={() => setActiveTab('calls')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Zap size={22} className={`transition-all duration-300 ${activeTab === 'calls' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'calls' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
         <button onClick={() => setActiveTab('chats')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><MessageSquareDashed size={22} className={`transition-all duration-300 ${activeTab === 'chats' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'chats' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
         <button onClick={() => setActiveTab('settings')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Cpu size={22} className={`transition-all duration-300 ${activeTab === 'settings' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'settings' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
      </div>
  );

  return (
    <div className={`fixed top-0 left-0 w-full h-[100dvh] bg-black text-zinc-100 font-sans ${currentTheme.selection} flex flex-col overflow-hidden ${currentTheme.font}`}>
      {/* ... (Rest of your JSX remains exactly the same, the fix was in the import) */}
      
      {/* OVERLAY: ZOOM */}
      {zoomedImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
              <img src={zoomedImage} className="max-w-full max-h-full object-contain p-4 transition-transform duration-300 scale-100" />
              <button className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={32} /></button>
          </div>
      )}

      {/* OVERLAY: QR */}
      {showQRCode && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200" onClick={() => setShowQRCode(false)}>
              <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-black mx-auto mb-4 overflow-hidden"><img src={profilePic || ''} className="w-full h-full object-cover"/></div>
                      <h2 className="text-2xl font-black text-black">{profileName}</h2>
                      <p className="text-zinc-500 font-mono">{profileHandle}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border-2 border-black">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${profileHandle}`} alt="QR Code" className="w-full h-full" />
                  </div>
                  <p className="text-xs text-center text-zinc-400">Scan to connect securely</p>
                  <button onClick={() => setShowQRCode(false)} className="w-full py-3 bg-black text-white font-bold rounded-xl">Close</button>
              </div>
          </div>
      )}
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-black">
        <div className="absolute inset-0 transition-opacity duration-300" style={{ backgroundImage: `url(/bg${bgIndex}.jpg)`, backgroundSize: bgScale >= 100 ? 'cover' : `${bgScale}%`, backgroundPosition: 'center', backgroundRepeat: 'repeat', opacity: bgOpacity }} />
      </div>

      <div className="fixed inset-0 z-0 pointer-events-none mix-blend-overlay transition-opacity duration-1000" style={{ backgroundColor: '#ff4500', opacity: redModeIntensity / 100 }} />

      {/* VIEW: LIST */}
      {currentView === 'list' && (
        <div className="flex-1 flex flex-col h-full z-10 animate-in fade-in slide-in-from-left-5 duration-300">
           
           {/* -- HEADERS -- */}
           {activeTab === 'chats' && (
             <div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20">
                <div className="max-w-2xl mx-auto w-full flex items-end justify-between">
                    <div><h1 className="text-3xl font-black text-white tracking-tighter">FEED</h1><p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Encrypted</p></div>
                    <div className="flex gap-4 items-center mb-1"><button className="text-zinc-500 transition-colors" onMouseEnter={(e) => e.currentTarget.style.color = accentColor} onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}><PenLine size={20} /></button></div>
                </div>
             </div>
           )}

           {activeTab === 'settings' && (
             <div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20">
                <div className="max-w-2xl mx-auto w-full"><h1 className="text-3xl font-black text-white tracking-tighter">SYSTEM</h1></div>
             </div>
           )}

           {activeTab === 'contacts' && (
             <div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20">
                <div className="max-w-2xl mx-auto w-full"><h1 className="text-3xl font-black text-white tracking-tighter">CONTACTS</h1></div>
             </div>
           )}

           <div key={activeTab + 'content'} className="flex-1 overflow-y-auto no-scrollbar pb-24">
               <div className="max-w-2xl mx-auto w-full">
                   
                   {/* -- CHATS TAB -- */}
                   {activeTab === 'chats' && (
                     <>
                        <div className="px-4 mb-4">
                           <div className="bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 py-2.5 gap-3 transition-colors focus-within:bg-black/40 focus-within:border-white/50">
                              <Search size={16} className="text-zinc-500" />
                              <input type="text" placeholder="Search frequency..." className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-zinc-600 font-medium"/>
                           </div>
                        </div>

                        <div onClick={() => { setActiveChatId('saved_messages'); setCurrentView('room'); scrollToBottom('auto'); }} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-white/5 animate-in slide-in-from-left-8 fade-in duration-500`}>
                            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 group/logo">
                                <div className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-lg shadow-black/50">
                                    {activeFilter === 'secret' ? (<Terminal className="text-zinc-500 transition-colors" size={24} />) : (<div className="w-3 h-3 rounded-sm relative z-10" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}80` }} />)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-white text-base tracking-tight">Notes</span>
                                    <span className="text-[10px] text-zinc-500 font-mono">{notes.length > 0 ? getDateLabel(notes[0].date) : ''}</span>
                                </div>
                                <div className="text-zinc-400 text-sm truncate pr-4 flex items-center gap-1">
                                   <span className="text-[10px] font-bold uppercase tracking-wider px-1 rounded bg-white/10" style={{ color: accentColor }}>You</span>
                                   <span className="opacity-70 truncate">{notes.length > 0 ? notes[0].text : 'No notes yet'}</span>
                                </div>
                            </div>
                        </div>

                        {realChats.map((chat, index) => (
                          <ChatListItem 
                            key={chat.id} 
                            chat={chat} 
                            active={isEditing ? selectedChatIds.has(chat.id) : false} 
                            isEditing={isEditing}
                            onSelect={() => toggleChatSelection(chat.id)}
                            onClick={() => { setActiveChatId(chat.id); setCurrentView('room'); scrollToBottom('auto'); }}
                            index={index}
                          />
                        ))}
                     </>
                   )}

                   {/* -- CONTACTS TAB -- */}
                   {activeTab === 'contacts' && (
                     <div className="p-4 space-y-6">
                        <form onSubmit={handleSearchContacts} className="relative">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-3 gap-3 focus-within:border-white/50 transition-colors">
                                <AtSign size={18} className="text-zinc-500" />
                                <input type="text" value={contactSearchQuery} onChange={(e) => setContactSearchQuery(e.target.value)} placeholder="Search by handle (e.g. @neo)" className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-zinc-600 font-mono"/>
                                <button type="submit" disabled={isSearchingContacts} className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all disabled:opacity-50"><Search size={16} /></button>
                            </div>
                        </form>
                        <div onClick={() => setShowQRCode(true)} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black">
                                <QrCode size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">My QR Code</h3>
                                <p className="text-xs text-zinc-500">Tap to share your profile</p>
                            </div>
                            <ChevronLeft size={16} className="rotate-180 text-zinc-500" />
                        </div>

                        <div className="space-y-3 pt-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Results</h3>
                            {isSearchingContacts ? (
                                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
                            ) : contactSearchResults.length > 0 ? (
                                contactSearchResults.map((u) => (
                                    <div key={u.uid} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden">
                                            {u.photoURL ? (<img src={u.photoURL} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-xl">🤖</div>)}
                                        </div>
                                        <div className="flex-1"><h3 className="font-bold text-white">{u.displayName}</h3><p className="text-xs text-zinc-500 font-mono">{u.handle}</p></div>
                                        <button onClick={() => startNewChat(u.uid)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all"><MessageCircle size={20} /></button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-30"><UserPlus size={48} className="mx-auto mb-4 text-zinc-600" /><p className="text-zinc-500 text-sm">Search for a handle to start connecting.</p></div>
                            )}
                        </div>
                    </div>
                   )}

                   {/* -- SETTINGS TAB -- */}
                   {activeTab === 'settings' && (
                     <div className="p-4 space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        
                        {/* PROFILE CARD */}
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
                           {isEditingProfile && showAvatarSelector && (
                               <div className="grid grid-cols-6 gap-2 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                   {Array.from({ length: 7 }, (_, i) => i + 1).map((num) => (<button key={num} onClick={() => handleSelectPreset(num)} className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-white transition-colors bg-black/40 flex items-center justify-center text-xl relative"><img src={`/robot${num}.jpeg?v=1`} className="w-full h-full object-cover" /></button>))}
                               </div>
                           )}
                           <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                {isEditingProfile ? (<div className="flex items-center gap-2"><Activity size={14} className="text-zinc-500" /><input type="text" value={profileBio} onChange={(e) => setProfileBio(e.target.value)} className="bg-transparent border-b border-white/20 text-zinc-300 text-xs font-mono w-full focus:outline-none focus:border-white py-1" placeholder="Status..."/></div>) : (<div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>{profileBio}</div>)}
                                <button onClick={() => setShowQRCode(true)} className="text-zinc-500 hover:text-white"><QrCode size={20} /></button>
                           </div>
                        </div>

                        {/* INTERFACE SETTINGS */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                           <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><SlidersHorizontal size={14}/> Interface</h3>
                            
                            {/* ALIGNMENT */}
                            <div className="space-y-3"><label className="text-white text-sm font-medium">Message Alignment</label><div className="flex gap-2 p-1.5 bg-black/40 rounded-xl border border-zinc-800"><button onClick={() => setAlignment('left')} className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${alignment === 'left' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><AlignLeft size={18}/></button><button onClick={() => setAlignment('center')} className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${alignment === 'center' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><AlignCenter size={18}/></button><button onClick={() => setAlignment('right')} className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${alignment === 'right' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}><AlignRight size={18}/></button></div></div>
                            
                            {/* BUBBLE STYLES */}
                            <div className="space-y-3">
                                <label className="text-white text-sm font-medium flex items-center gap-2"><PaintBucket size={14}/> Chat Bubble Style</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => changeBubbleStyle('minimal_solid')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'minimal_solid' ? 'border-white ring-1 ring-white/50' : 'border-white/5 hover:border-white/20'}`} title="Minimal Solid"><div className="absolute inset-0 bg-white" /><span className="relative z-10 text-xs font-bold text-black uppercase tracking-wider">Minimal</span></button>
                                    <button onClick={() => changeBubbleStyle('minimal_glass')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'minimal_glass' ? 'border-white ring-1 ring-white/50' : 'border-white/5 hover:border-white/20'}`} title="Minimal Glass"><div className="absolute inset-0 bg-white/20 backdrop-blur-md" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Glass</span></button>
                                    <button onClick={() => changeBubbleStyle('clear')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'clear' ? 'border-white ring-1 ring-white/50' : 'border-white/5 hover:border-white/20'}`} title="Clear White"><div className="absolute inset-0 bg-white/5 border border-white/20" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Clear</span></button>
                                    <button onClick={() => changeBubbleStyle('solid_gray')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'solid_gray' ? 'border-zinc-400 ring-1 ring-zinc-400/50' : 'border-white/5 hover:border-zinc-400/50'}`} title="Solid Gray"><div className="absolute inset-0 bg-zinc-700" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Solid Gray</span></button>
                                    <button onClick={() => changeBubbleStyle('whatsapp')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'whatsapp' ? 'border-[#25D366] ring-1 ring-[#25D366]/50' : 'border-white/5 hover:border-[#25D366]/50'}`} title="Forest Style"><div className="absolute inset-0 bg-[#005c4b]" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Forest</span></button>
                                    <button onClick={() => changeBubbleStyle('telegram')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'telegram' ? 'border-[#2AABEE] ring-1 ring-[#2AABEE]/50' : 'border-white/5 hover:border-[#2AABEE]/50'}`} title="Ocean Style"><div className="absolute inset-0 bg-[#2b5278]" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Ocean</span></button>
                                    <button onClick={() => changeBubbleStyle('purple')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'purple' ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-white/5 hover:border-purple-500/50'}`} title="Royal Style"><div className="absolute inset-0 bg-[#6d28d9]" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Royal</span></button>
                                    <button onClick={() => changeBubbleStyle('blue_gradient')} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center relative overflow-hidden ${bubbleStyle === 'blue_gradient' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/5 hover:border-blue-500/50'}`} title="Blue Gradient"><div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600" /><span className="relative z-10 text-xs font-bold text-white uppercase tracking-wider">Blue</span></button>
                                </div>
                            </div>
                            
                            {/* RED MODE */}
                            <div className="space-y-4 pt-2 border-t border-white/5">
                                <button onClick={toggleAutoRedMode} className={`w-full py-3 rounded-xl border flex items-center justify-between px-4 transition-all ${isAutoRedMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}><span className="font-medium flex items-center gap-2 text-sm"><Moon size={16} /> Auto Night Shift</span><div className={`w-10 h-6 rounded-full relative transition-colors ${isAutoRedMode ? 'bg-white' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${isAutoRedMode ? 'translate-x-4' : 'translate-x-0'}`} /></div></button>
                                <p className="text-xs text-zinc-500 px-1">{isAutoRedMode ? "Automatically enables red filter after sunset (6 PM - 6 AM)." : "Night shift is disabled."}</p>
                            </div>

                            {/* WALLPAPER SLIDERS */}
                            <div className="space-y-3"><div className="flex justify-between"><label className="text-white text-sm font-medium">Wallpaper Scale</label><span className="text-zinc-500 text-xs font-mono">{bgScale >= 100 ? 'COVER' : `${bgScale}%`}</span></div><input type="range" min="20" max="100" step="5" value={bgScale} onChange={(e) => setBgScale(parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" /></div>
                             <div className="space-y-3"><div className="flex justify-between"><label className="text-white text-sm font-medium">Opacity</label><span className="text-zinc-500 text-xs font-mono">{Math.round(bgOpacity * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" /></div>
                        </div>

                        {/* BACKGROUND GRID */}
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

      {/* VIEW: ROOM */}
      {currentView === 'room' && (
        <div className="flex-1 flex flex-col h-full z-10 animate-in slide-in-from-right-10 fade-in duration-300">
            {/* FLOATING BACK BUTTON - CENTERED ALIGNMENT WRAPPER */}
            <div className="fixed top-20 left-0 w-full z-50 pointer-events-none">
                <div className="max-w-2xl mx-auto px-4">
                    <button 
                      onClick={() => { setCurrentView('list'); setActiveChatId(null); }} 
                      className="w-12 h-12 bg-transparent rounded-full flex items-center justify-center text-white active:scale-90 transition-all hover:bg-white/20 pointer-events-auto"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </div>
            </div>

            {/* Header and other room view code remains unchanged */}
            <div className="fixed top-0 left-0 right-0 z-40">
                <header className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3 relative z-50">
                    <div className="flex items-center gap-1 w-full">
                        {/* REMOVED TOP BACK BUTTON FROM HERE */}
                        
                        {activeChatId !== 'saved_messages' ? (
                           <div onClick={() => setCurrentView('profile')} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors group">
                               <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 relative group-hover:border-white/30 transition-colors">
                                  {otherChatUser?.photoURL ? (
                                      <img src={otherChatUser.photoURL} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-lg">{otherChatUser?.displayName?.[0] || '?'}</div>
                                  )}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <h3 className="font-bold text-white text-base leading-tight truncate">{otherChatUser?.displayName || 'Unknown'}</h3>
                                   <div className="flex items-center gap-1.5 mt-0.5">
                                       {otherChatUser?.isOnline && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />}
                                       <p className={`text-xs truncate ${otherChatUser?.isOnline ? 'text-green-500' : 'text-zinc-500'}`}>{otherChatUser?.isOnline ? 'Online' : 'Last seen recently'}</p>
                                   </div>
                               </div>
                           </div>
                        ) : (
                           <div onClick={handleSecretTrigger} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer select-none">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden">
                                     {activeFilter === 'secret' ? (<Terminal className="text-green-500" size={20} />) : (<div className="w-4 h-4 rounded-sm" style={{ backgroundColor: accentColor }} />)}
                                </div>
                                <div className="animate-in fade-in duration-300">
                                    <h3 className="font-bold text-white text-lg leading-tight">Notes</h3>
                                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Personal</p>
                                </div>
                           </div>
                        )}
                        <div className="flex items-center gap-1">
                             <div className="relative flex items-center h-10">
                                <button onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className={`w-10 h-10 flex items-center justify-center text-zinc-400 transition-all active:scale-95 rounded-full hover:bg-white/5 ${isSearchExpanded ? 'opacity-0 pointer-events-none scale-50' : 'opacity-100 scale-100'}`}><Search size={22} /></button>
                                <div className={`absolute right-0 bg-zinc-900 border border-zinc-800 focus-within:border-white/50 rounded-full flex items-center px-3 h-10 transition-all duration-300 origin-right ${isSearchExpanded ? 'w-[200px] opacity-100 shadow-lg z-50' : 'w-0 opacity-0 pointer-events-none'}`}>
                                    <Search className="text-zinc-500 mr-2 flex-shrink-0" size={16} />
                                    <input ref={searchInputRef} type="text" placeholder={TRANSLATIONS.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="bg-transparent border-none outline-none text-white text-base md:text-sm w-full h-full placeholder:text-zinc-600 min-w-0"/>
                                    <button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="p-1 text-zinc-500 hover:text-white flex-shrink-0"><X size={14} /></button>
                                </div>
                            </div>
                            {activeChatId !== 'saved_messages' && (
                                <button className="w-10 h-10 flex items-center justify-center text-zinc-400 rounded-full hover:bg-white/5"><Phone size={22} /></button>
                            )}
                        </div>
                    </div>
                </header>
            </div>

            {showSecretAnim && <canvas ref={canvasRef} className="fixed inset-0 z-20 pointer-events-none" />}

{/* SCROLL DOWN BUTTON */}
<div className="fixed bottom-24 left-0 w-full z-40 pointer-events-none">
                <div className="max-w-2xl mx-auto px-4 relative">
                    <div className={`absolute right-4 bottom-0 transition-all duration-300 ${showScrollButton ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <button onClick={() => scrollToBottom()} className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 text-white shadow-xl shadow-black/50 flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all backdrop-blur-md">
                            <ChevronDown size={24} strokeWidth={2} />
                        </button>
                    </div>
                </div>
           </div>

<div ref={listRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto relative z-10 w-full no-scrollbar`}>
   <div className={`min-h-full max-w-2xl mx-auto flex flex-col justify-end gap-1 pt-20 pb-0 px-4 ${activeChatId === 'saved_messages' ? getAlignmentClass() : 'items-stretch'}`}>
                
                {activeChatId === 'saved_messages' ? (
                    filteredNotes.map((note, index) => {
                        const prevNote = filteredNotes[index - 1];
                        const showHeader = !prevNote || !isSameDay(note.date, prevNote.date);
                        
                        const noteColors = getBubbleColors(bubbleStyle, true, isHackerMode);

                        return (
                            <React.Fragment key={note.id}>
                                {showHeader && (
                                  <div className="flex justify-center my-2 w-full select-none">
                                    <span className="text-white/90 text-[11px] font-bold uppercase tracking-widest drop-shadow-md shadow-black">
                                      {getDateLabel(note.date)}
                                    </span>
                                  </div>
                                )}
                                <div onDoubleClick={() => handleToggleExpand(note.id)} className={`select-none transition-all duration-300 active:scale-[0.99] w-full flex ${alignment === 'left' ? 'justify-start' : alignment === 'center' ? 'justify-center' : 'justify-end'} ${editingNote && editingNote.id !== note.id ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
                                    <NoteCard 
                                        note={note} 
                                        categories={activeFilter === 'secret' ? [activeSecretConfig] : categories} 
                                        selectedVoice={selectedVoice} 
                                        onDelete={handleDeleteNote} 
                                        onPin={togglePin} 
                                        onCategoryClick={(cat) => setActiveFilter(cat)} 
                                        onEdit={() => handleEditClick(note)} 
                                        onToggleExpand={handleToggleExpand}
                                        onImageClick={setZoomedImage}
                                        customColors={noteColors}
                                    />
                                </div>
                            </React.Fragment>
                        );
                    })
                ) : (
                    activeMessages.map((msg, index) => {
                        const prevMsg = activeMessages[index - 1];
                        const showHeader = !prevMsg || !isSameDay(msg.timestamp, prevMsg.timestamp);
                        const isMe = msg.senderId === user?.uid;
                        
                        const customColors = getBubbleColors(bubbleStyle, isMe, false);

                        const msgNote = {
                            id: msg.id, text: msg.text, date: normalizeDate(msg.timestamp), 
                            category: 'default', isPinned: false, isExpanded: true, imageUrl: msg.imageUrl,
                            audioUrl: msg.audioUrl
                        };

                        return (
                            <React.Fragment key={msg.id}>
                                {showHeader && (
                                  <div className="flex justify-center my-4 w-full select-none">
                                    <span className="text-white/90 text-[11px] font-bold uppercase tracking-widest drop-shadow-md shadow-black">
                                      {getDateLabel(msg.timestamp)}
                                    </span>
                                  </div>
                                )}
                                <div className={`flex w-full mb-0.5 items-end ${isMe ? 'justify-end' : 'justify-start gap-2'}`}>
                                    {!isMe && (
                                        <div className="flex-shrink-0 w-8 h-8 relative z-10">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shadow-md">
                                                {otherChatUser?.photoURL ? <img src={otherChatUser.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">{otherChatUser?.displayName?.[0] || '?'}</div>}
                                            </div>
                                        </div>
                                    )}
                                    <NoteCard 
                                        note={msgNote} categories={[]} selectedVoice={selectedVoice} 
                                        variant={isMe ? 'sent' : 'received'} status={msg.status} customColors={customColors}
                                        currentUserId={user?.uid}
                                        onUpdate={(id, text) => updateMessage(id, text)}
                                        opponentName={otherChatUser?.displayName || 'Opponent'} 
                                        opponentAvatar={otherChatUser?.photoURL}
                                        onImageClick={setZoomedImage}
                                        onDelete={isMe ? (id) => handleDeleteMessage(id) : undefined}
                                        onEdit={isMe && !msg.audioUrl && !msg.imageUrl ? () => handleEditMessage(msg) : undefined}
                                    />
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={bottomRef} className="h-0 w-full shrink-0" />
              </div>
           </div>

           <div className="flex-none w-full p-2 bg-black/80 backdrop-blur-2xl z-50 border-t border-white/5">
             <div className="max-w-2xl mx-auto flex items-end gap-2">
                 
                 {isRecording ? (
                    /* RECORDING STATE - NEATER LAYOUT */
                    <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200 h-[48px]">
                        <button onClick={cancelRecording} className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 transition-colors"> <Trash2 size={24} /> </button>
                        <div className="flex-1 bg-zinc-900/80 rounded-full h-full flex items-center px-2 gap-3 border border-white/10 relative overflow-hidden">
                            <div className="flex items-center gap-2 z-10 pl-2"> <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} /> <span className="text-white font-mono font-medium text-sm">{formatDuration(recordingDuration)}</span> </div>
                            <div className="flex-1 flex items-center justify-center gap-0.5 h-4 opacity-50 overflow-hidden"> {!isPaused && [...Array(12)].map((_, i) => ( <div key={i} className="w-1 rounded-full animate-pulse bg-white" style={{ height: `${Math.random() * 100}%`, animationDuration: '0.4s', animationDelay: `${i * 0.05}s` }} /> ))} </div>
                            <button onClick={togglePause} className="z-20 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-700"> {isPaused ? <Play size={12} fill="white" /> : <Pause size={12} fill="white" />} </button>
                        </div>
                        <button onClick={finishRecording} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-[#DA7756] text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"> <ArrowUp size={24} strokeWidth={3} /> </button>
                    </div>
                 ) : (
                    /* TYPING STATE - TELEGRAM STYLE */
                    <>
                        {/* LEFT SIDE: TOOLS (Transparent, Clean) */}
                        <div className="flex items-end gap-1 pb-1">
                            {activeChatId === 'saved_messages' ? (
                                <button onClick={cycleFilter} className="w-10 h-10 rounded-full text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                                    {activeFilter === 'all' ? <LayoutGrid size={24} /> : <span className="text-xl leading-none">{currentConfig?.emoji}</span>}
                                </button>
                            ) : (
                                <label className="w-10 h-10 rounded-full text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95">
                                    <ImageIcon size={26} strokeWidth={1.5} />
                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                                </label>
                            )}
                            
                            {/* Old Dice button removed */}
                        </div>

                        {/* MIDDLE: INPUT PILL */}
                        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[20px] flex items-end px-4 py-2 focus-within:border-zinc-700 transition-colors gap-2 min-h-[44px]">
                            {imageUrl && (
                                <div className="relative flex-shrink-0 mb-0.5">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div>
                                    <button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-700 text-white rounded-full flex items-center justify-center"><X size={12} /></button>
                                </div>
                            )}
                            <textarea 
                                ref={textareaRef} 
                                value={transcript} 
                                onChange={(e) => setTranscript(e.target.value)} 
                                onPaste={(e) => handlePaste(e)} 
                                onFocus={() => scrollToBottom('auto')} 
                                placeholder={editingNote ? "Edit message..." : "Message"} 
                                rows={1} 
                                className={`flex-1 bg-transparent border-none text-white placeholder:text-zinc-500 focus:outline-none text-[16px] resize-none max-h-32 py-1 leading-relaxed ${isHackerMode ? 'font-mono' : ''}`} 
                                style={isHackerMode ? { color: HACKER_GREEN } : undefined} 
                            />
                            {activeChatId !== 'saved_messages' && !editingNote && (
                                <button onClick={handleRollDice} className="text-zinc-500 hover:text-white transition-colors pb-1.5 active:scale-95 flex-shrink-0" title="Roll Dice">
                                     <Dices size={22} strokeWidth={1.5} />
                                </button>
                            )}
                        </div>
                        
                        {/* RIGHT SIDE: BIGGER BUTTON */}
                        <div className="pb-0 animate-in fade-in zoom-in duration-200">
                             {(transcript.trim() || imageUrl || editingNote) ? (
                                <button onClick={handleMainAction} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 bg-[#DA7756] text-white hover:bg-[#c46243]">
                                    {editingNote ? <Check size={20} strokeWidth={3} /> : <ArrowUp size={24} strokeWidth={3} />}
                                </button>
                             ) : (
                                activeChatId !== 'saved_messages' && (
                                    <button onClick={startRecording} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 text-white active:scale-95"> 
                                        <Mic size={24} /> 
                                    </button>
                                )
                             )}
                        </div>
                    </>
                 )}
             </div>
           </div>

        </div>
      )}

      {/* VIEW: PROFILE */}
      {currentView === 'profile' && otherChatUser && (
        <div className="flex-1 flex flex-col h-full z-50 animate-in slide-in-from-right duration-300 bg-black relative">
            
            {/* BACK BUTTON */}
            <div className="absolute top-4 left-4 z-50">
                <button onClick={() => setCurrentView('room')} className="w-10 h-10 bg-black/20 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all">
                    <ChevronLeft size={24} />
                </button>
            </div>

            {/* HERO IMAGE SECTION - Height restricted to 45% of view to prevent scrolling */}
            <div className="w-full h-[45dvh] relative flex-shrink-0">
                {otherChatUser.photoURL ? (
                    <img src={otherChatUser.photoURL} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-8xl text-zinc-700">{otherChatUser.displayName?.[0]}</div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-5">
                    <h1 className="text-3xl font-black text-white tracking-tight mb-0.5">{otherChatUser.displayName}</h1>
                    <p className={`${otherChatUser.isOnline ? 'text-green-500' : 'text-zinc-400'} font-medium text-sm`}>
                        {otherChatUser.isOnline ? 'Online now' : 'Last seen recently'}
                    </p>
                </div>
            </div>

            {/* CONTENT SECTION - Tighter spacing, overlapping image */}
            <div className="flex-1 bg-black -mt-6 relative z-10 px-4 pt-2 pb-6 flex flex-col gap-3 overflow-y-auto no-scrollbar rounded-t-[30px]">
                
                {/* Quick Actions Grid - Slightly more compact */}
                <div className="grid grid-cols-4 gap-2">
                    <button className="h-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95">
                        <Phone size={20} /> <span className="text-[10px] font-bold uppercase">Call</span>
                    </button>
                    <button className="h-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95">
                        <Bell size={20} /> <span className="text-[10px] font-bold uppercase">Mute</span>
                    </button>
                    <button className="h-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95">
                        <Search size={20} /> <span className="text-[10px] font-bold uppercase">Search</span>
                    </button>
                    <button className="h-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95">
                        <MoreHorizontal size={20} /> <span className="text-[10px] font-bold uppercase">More</span>
                    </button>
                </div>

                {/* Info Block - Condensed */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500">
                            <Info size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">Bio</p>
                            <p className="text-white text-sm leading-snug truncate">Living in the matrix. 🕶️</p>
                        </div>
                    </div>
                    <div className="w-full h-px bg-white/5" />
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500">
                            <AtSign size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">Username</p>
                            <p className="text-white font-mono text-sm truncate">@{otherChatUser.displayName?.toLowerCase().replace(/\s/g, '') || 'unknown'}</p>
                        </div>
                        <button className="text-zinc-500 hover:text-white"><QrCode size={18} /></button>
                    </div>
                </div>

                {/* Action List - Compact & Pushed to bottom */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden mt-auto mb-2">
                    <button className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left active:bg-white/10">
                        <UserPlus size={20} color="#DA7756" />
                        <span className="font-bold text-sm" style={{ color: '#DA7756' }}>Add to Contacts</span>
                    </button>
                    <div className="w-full h-px bg-white/5" />
                    <button className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left text-red-500 active:bg-red-500/10">
                        <Ban size={20} />
                        <span className="font-bold text-sm">Block User</span>
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