import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, ArrowUp, LayoutGrid, Image as ImageIcon, Check, Terminal, 
  PenLine, AlignLeft, AlignCenter, AlignRight, ChevronLeft, ChevronDown, MessageSquareDashed, 
  Moon, Trash2, Globe, Zap, Cpu, SlidersHorizontal, AtSign, Activity, 
  Camera, Grid, UserPlus, MessageCircle, Phone, PaintBucket, QrCode, Mic, 
  Pause, Play, Dices, Edit, Bell, BellOff, MoreHorizontal, Ban, Info, Users
} from 'lucide-react'; 

// IMPORT TYPES & UTILS
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { 
  TRANSLATIONS, CLAUDE_ORANGE, HACKER_GREEN, HACKER_CONFIG,
  getBubbleColors, normalizeDate, isSameDay, getDateLabel, compressImage
} from './utils';

// IMPORT COMPONENTS
import { NoteCard } from './components/NoteCard'; 
// ChatListItem removed to fix build error
import { useFirebaseSync, useNotes, useChats, useMessages, syncUserProfile, searchUsers, useUser, usePresence } from './useFirebaseSync';
import Auth from './components/Auth';
// FIREBASE DIRECT INIT FOR INVITES
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, arrayRemove } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiosArE3iOxF9iGp8wduA-TlSgy1p3WUo",
  authDomain: "vibenotes-87a8f.firebaseapp.com",
  projectId: "vibenotes-87a8f",
  storageBucket: "vibenotes-87a8f.firebasestorage.app",
  messagingSenderId: "306552916980",
  appId: "1:306552916980:web:0f8e798e50747ad1c587a1"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper component to resolve avatars in Group Chats
const MessageAvatar = ({ userId }) => {
    const userData = useUser(userId);
    if (!userId) return <div className="w-8 h-8 rounded-full bg-zinc-800" />;
    
    return (
        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shadow-md">
            {userData?.photoURL ? (
                <img src={userData.photoURL} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                    {userData?.displayName?.[0] || '?'}
                </div>
            )}
        </div>
    );
};

// Helper for Profile Member List
const GroupMemberRow = ({ userId, isAdmin, isViewerAdmin, onRemove }) => {
    const userData = useUser(userId);
    if (!userId) return null;

    return (
        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group/member">
            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/5">
                {userData?.photoURL ? <img src={userData.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">{userData?.displayName?.[0] || '?'}</div>}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm truncate">{userData?.displayName || 'User'}</div>
                <div className="text-zinc-500 text-xs truncate">{userData?.handle || (userData?.isOnline ? 'Online' : 'Last seen recently')}</div>
            </div>
            {isAdmin && <span className="text-[#DA7756] text-[10px] font-bold uppercase tracking-wider">Admin</span>}
            
            {/* Show Remove Button if Viewer is Admin AND this row is not the Admin */}
            {isViewerAdmin && !isAdmin && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(userId); }}
                    className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all opacity-0 group-hover/member:opacity-100"
                    title="Remove from group"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

// Fixed Chat Row to display Group Photos correctly - SQUIRCLE STYLE
const ChatRow = ({ chat, active, isEditing, onSelect, onClick }) => {
    const otherUser = useUser(chat.otherUserId);
    const isGroup = chat.type === 'group';
    const displayName = isGroup ? chat.displayName : (otherUser?.displayName || 'Unknown');
    const photoURL = isGroup ? chat.photoURL : otherUser?.photoURL;
    const lastMsg = chat.lastMessageText || '';
    const timestamp = chat.lastMessageTimestamp ? getDateLabel(chat.lastMessageTimestamp) : '';

    return (
        <div onClick={onClick} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-white/5 group ${active ? 'bg-white/10' : ''}`}>
            {isEditing && (
                <div className="flex items-center pr-2" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'bg-[#DA7756] border-[#DA7756]' : 'border-zinc-600'}`}>
                        {active && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                </div>
            )}
            <div className="w-14 h-14 flex-shrink-0 relative group/icon">
                {/* SQUIRCLE SHAPE (rounded-2xl) to match Notes, Borders removed to make content bigger */}
                <div className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-lg shadow-black/50 relative">
                    {photoURL ? (
                        <img src={photoURL} className="w-full h-full object-cover transition-transform duration-500 group-hover/icon:scale-110" alt="avatar" />
                    ) : (
                        <span className="text-zinc-500 font-bold text-xl">{isGroup ? <Users size={28} /> : displayName?.[0]}</span>
                    )}
                </div>
                {!isGroup && otherUser?.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-black z-10"></div>
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-white text-base truncate tracking-tight">{displayName}</h3>
                    <span className="text-[11px] text-zinc-500 font-mono">{timestamp}</span>
                </div>
                <p className="text-zinc-400 text-sm truncate opacity-70">{lastMsg}</p>
            </div>
        </div>
    );
};

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
  const [showBackButton, setShowBackButton] = useState(true);

  // NEW STATES
  const [reactions, setReactions] = useState(() => {
      try { return JSON.parse(localStorage.getItem('vibenotes_reactions') || '{}'); } catch { return {}; }
  });
  const [activeReactionId, setActiveReactionId] = useState(null);
  
  useEffect(() => { localStorage.setItem('vibenotes_reactions', JSON.stringify(reactions)); }, [reactions]);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false); 
  const [mutedChats, setMutedChats] = useState(new Set());
  
  // Group Editing State
  const [isEditingGroupInfo, setIsEditingGroupInfo] = useState(false);
  const [isProfileScrolled, setIsProfileScrolled] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');

  // Save Group Profile Changes
  const handleSaveGroupInfo = async () => {
    if (!activeChatId || !editGroupName.trim()) return;
    try {
        const chatRef = doc(db, "chats", activeChatId);
        await updateDoc(chatRef, {
            displayName: editGroupName.trim(),
            description: editGroupDesc.trim()
        });
        setIsEditingGroupInfo(false);
    } catch (e) { console.error("Error updating group:", e); }
  };

  const startGroupEdit = () => {
      if (currentChatObject) {
          setEditGroupName(currentChatObject.displayName || '');
          setEditGroupDesc(currentChatObject.description || '');
          setIsEditingGroupInfo(true);
      }
  };

  // Handle Leaving Group
  const handleLeaveGroup = async () => {
    if (!activeChatId || !user) return;
    try {
        const chatRef = doc(db, "chats", activeChatId);
        await updateDoc(chatRef, { participants: arrayRemove(user.uid) });
        setShowLeaveGroupModal(false);
        setCurrentView('list');
        setActiveChatId(null);
    } catch (e) { console.error("Error leaving group:", e); }
  };

  const handleRemoveMember = async (memberId) => {
      if (!activeChatId) return;
      if (confirm("Remove this user from the group?")) {
          try {
              const chatRef = doc(db, "chats", activeChatId);
              await updateDoc(chatRef, { participants: arrayRemove(memberId) });
          } catch (e) { console.error("Error removing member:", e); }
      }
  };
  // NEW: Store who we found in the URL
  const [incomingInvite, setIncomingInvite] = useState(null);
  
  // NEW: Group Chat States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [groupMembers, setGroupMembers] = useState(new Set());
  const [groupStep, setGroupStep] = useState(1); // 1: Select, 2: Name

  const handleGroupImageSelect = async (e) => {
    if (e.target.files?.[0]) {
        try {
            const url = await compressImage(e.target.files[0]);
            setGroupImage(url);
        } catch (err) { console.error(err); }
    }
  };

  const handleUpdateGroupPhoto = async (file) => {
    if (!activeChatId) return;
    try {
        const url = await compressImage(file);
        await updateDoc(doc(db, "chats", activeChatId), { photoURL: url });
    } catch (e) { console.error(e); }
  };

  const handleDeleteGroupPhoto = async () => {
    if (!activeChatId) return;
    if (confirm("Remove group photo?")) {
        try {
            await updateDoc(doc(db, "chats", activeChatId), { photoURL: null });
        } catch (e) { console.error(e); }
    }
  };

  const [savedContacts, setSavedContacts] = useState(() => {
    try {
      const saved = localStorage.getItem('vibenotes_contacts');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  useEffect(() => {
    localStorage.setItem('vibenotes_contacts', JSON.stringify(savedContacts));
  }, [savedContacts]);

  // Check URL for Invite Links and fetch REAL user from Firebase
  useEffect(() => {
    const checkInvite = async () => {
        const path = window.location.pathname;
        const match = path.match(/\/invite\/([^/]+)/); // Matches /invite/neo
        
        if (match && match[1]) {
            const rawHandle = match[1];
            // Ensure handle has @ for search
            const handleToSearch = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
            
            try {
                // REAL DB LOOKUP
                const q = query(collection(db, "users"), where("handle", "==", handleToSearch));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    // Save the full user object (including photo & uid) to state
                    setIncomingInvite({ ...userData, uid: snapshot.docs[0].id });
                } else {
                    alert("User not found!");
                }
            } catch (e) {
                console.error("Error fetching invite:", e);
            }
            
            // Clean URL
            window.history.replaceState(null, "", "/");
        }
    };
    checkInvite();
}, []);

const handleAcceptInvite = () => {
    if (!incomingInvite) return;

    // Play Success Pop
    const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAP///yH/If8h/yH/If8=");
    audio.volume = 0.2;
    audio.play().catch(() => {});
    
    // Use the REAL data fetched from Firebase
    const newContact = {
        uid: incomingInvite.uid,
        displayName: incomingInvite.displayName || incomingInvite.handle,
        handle: incomingInvite.handle,
        photoURL: incomingInvite.photoURL || null,
        isOnline: false 
    };
    
    if (!savedContacts.find(c => c.uid === newContact.uid)) {
        setSavedContacts([...savedContacts, newContact]);
    }
    
    setIncomingInvite(null);
    setActiveTab('contacts');
};

const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMembers.size === 0) return;
    try {
        const participants = [user.uid, ...Array.from(groupMembers)];
        await addDoc(collection(db, "chats"), {
            type: 'group',
            displayName: groupName,
            participants: participants,
            createdBy: user.uid, 
            photoURL: groupImage, 
            createdAt: serverTimestamp(),
            lastMessageTimestamp: serverTimestamp(),
            lastMessageText: 'Group created'
        });
        setIsGroupModalOpen(false);
        setGroupName('');
        setGroupImage(null);
        setGroupMembers(new Set());
        setGroupStep(1);
    } catch (e) { console.error("Error creating group", e); }
};

const toggleGroupMember = (uid) => {
    const newSet = new Set(groupMembers);
    if (newSet.has(uid)) newSet.delete(uid);
    else newSet.add(uid);
    setGroupMembers(newSet);
};

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
  const scrollTimeoutRef = useRef(null);

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
        
        // Back Button Logic: Hide while scrolling, show when stopped
        setShowBackButton(false);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            setShowBackButton(true);
        }, 150);
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
  
  const toggleMute = () => {
    if (!activeChatId) return;
    const newSet = new Set(mutedChats);
    if (newSet.has(activeChatId)) newSet.delete(activeChatId);
    else newSet.add(activeChatId);
    setMutedChats(newSet);
  };

  const handleAddToContacts = () => {
    if (!otherChatUser) return;
    if (!savedContacts.find(c => c.uid === otherChatUser.uid)) {
        setSavedContacts([...savedContacts, otherChatUser]);
        alert(`${otherChatUser.displayName} added to contacts!`);
    }
  };

  const handleBlockConfirm = () => {
    setShowBlockModal(false);
    setCurrentView('list'); 
    setActiveChatId(null);
};

const handleAddReaction = (msgId, emoji) => {
    setReactions(prev => {
        const current = prev[msgId];
        if (current === emoji) { // Toggle off if same
            const next = { ...prev };
            delete next[msgId];
            return next;
        }
        return { ...prev, [msgId]: emoji };
    });
    setActiveReactionId(null);
};

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
    // Find existing chat, prioritizing the one with the most recent history
    const existingChats = realChats.filter(c => c.otherUserId === otherUid);
    const existing = existingChats.sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0))[0];

    if (existing) {
        setActiveChatId(existing.id);
        setCurrentView('room');
        setContactSearchQuery('');
        setContactSearchResults([]);
        return;
    }
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
                      {/* Generates a URL so phone cameras recognize it as a link to your app */}
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/invite/${profileHandle.replace('@','')}`} alt="QR Code" className="w-full h-full" />
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
                    <div className="flex gap-4 items-center mb-1"><button onClick={() => setIsGroupModalOpen(true)} className="text-zinc-500 transition-colors" onMouseEnter={(e) => e.currentTarget.style.color = accentColor} onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}><PenLine size={20} /></button></div>
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

                        {realChats.reduce((acc, chat) => {
                            // Ensure Groups are never deduplicated against each other (as they have undefined otherUserId)
                            const existingIndex = chat.type === 'group' ? -1 : acc.findIndex(c => c.otherUserId === chat.otherUserId);
                            
                            if (existingIndex > -1) {
                                // If duplicate exists (only for DMs), keep the one with the newer timestamp
                                if ((chat.lastMessageTimestamp || 0) > (acc[existingIndex].lastMessageTimestamp || 0)) {
                                    acc[existingIndex] = chat;
                                }
                            } else {
                                acc.push(chat);
                            }
                            return acc;
                        }, []).sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0)).map((chat) => (
                          <ChatRow 
                            key={chat.id} 
                            chat={chat} 
                            active={isEditing ? selectedChatIds.has(chat.id) : false} 
                            isEditing={isEditing}
                            onSelect={() => toggleChatSelection(chat.id)}
                            onClick={() => { setActiveChatId(chat.id); setCurrentView('room'); scrollToBottom('auto'); }}
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
                        <div onClick={() => setShowQRCode(true)} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-black/50 transition-all shadow-lg">
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
                            <h3 className="text-xs font-bold text-white/80 drop-shadow-md shadow-black uppercase tracking-widest px-1 pl-2">
                                {contactSearchQuery ? 'Search Results' : 'Saved Contacts'}
                            </h3>
                            
                            {isSearchingContacts ? (
                                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
                            ) : contactSearchQuery ? (
                                contactSearchResults.length > 0 ? (
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
                                    <div className="text-center py-10 opacity-30"><p className="text-zinc-500 text-sm">No users found.</p></div>
                                )
                            ) : (
                                savedContacts.length > 0 ? (
                                    savedContacts.map((u) => (
                                        <div key={u.uid} onClick={() => startNewChat(u.uid)} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors animate-in slide-in-from-bottom-2 fade-in duration-300">
                                            <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden">
                                                {u.photoURL ? (<img src={u.photoURL} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-xl">🤖</div>)}
                                            </div>
                                            <div className="flex-1"><h3 className="font-bold text-white">{u.displayName}</h3><p className="text-xs text-zinc-500 font-mono">{u.handle}</p></div>
                                            <ChevronLeft size={16} className="rotate-180 text-zinc-500" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-30"><UserPlus size={48} className="mx-auto mb-4 text-zinc-600" /><p className="text-zinc-500 text-sm">Your contact list is empty.</p></div>
                                )
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
            <div className="fixed top-28 left-0 w-full z-50 pointer-events-none">
                <div className="max-w-2xl mx-auto px-4 relative">
                    <div className={`absolute left-4 top-0 transition-all duration-300 ${showBackButton ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                        <button 
                        onClick={() => { setCurrentView('list'); setActiveChatId(null); }} 
                        className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 text-white shadow-xl shadow-black/50 flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all backdrop-blur-md"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Header and other room view code remains unchanged */}
            <div className="fixed top-0 left-0 right-0 z-40">
                <header className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3 relative z-50">
                    <div className="flex items-center gap-1 w-full">
                        {/* REMOVED TOP BACK BUTTON FROM HERE */}
                        
                        {activeChatId !== 'saved_messages' ? (
                           <div onClick={() => setCurrentView('profile')} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-xl transition-colors group">
                               {/* BIGGER SQUIRCLE HEADER IMAGE (1.5x larger: w-16/h-16) */}
                               <div className="w-16 h-16 rounded-2xl bg-zinc-800 overflow-hidden border border-white/5 relative group-hover:border-white/20 transition-colors flex items-center justify-center shadow-2xl">
                               {currentChatObject?.type === 'group' ? (
                                      currentChatObject.photoURL ? (
                                          <img src={currentChatObject.photoURL} className="w-full h-full object-cover" />
                                      ) : (
                                          <Users size={28} className="text-zinc-400" />
                                      )
                                  ) : otherChatUser?.photoURL ? (
                                      <img src={otherChatUser.photoURL} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-500">{otherChatUser?.displayName?.[0] || '?'}</div>
                                  )}
                               </div>
                               <div className="flex-1 min-w-0">
                                   {/* COOLER TEXT STYLE: Larger, Black font weight, tighter tracking */}
                                   <h3 className="font-black text-white text-2xl leading-none truncate tracking-tighter drop-shadow-md">
                                       {currentChatObject?.type === 'group' ? currentChatObject.displayName : (otherChatUser?.displayName || 'Unknown')}
                                   </h3>
                                   <div className="flex items-center gap-1.5 mt-1.5">
                                       {otherChatUser?.isOnline && currentChatObject?.type !== 'group' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />}
                                       <p className={`text-xs font-mono uppercase tracking-widest truncate ${otherChatUser?.isOnline ? 'text-green-500' : 'text-zinc-500'}`}>
                                           {currentChatObject?.type === 'group' ? `${currentChatObject.participants?.length || 0} members` : (otherChatUser?.isOnline ? 'Online' : 'Last seen recently')}
                                       </p>
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
                                    {/* Added max-w-[85%] wrapper to fix Note width issue */}
                                    <div className="max-w-[85%] w-fit">
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
                                </div>
                            </React.Fragment>
                        );
                    })
                ) : (
                    activeMessages.map((msg, index) => {
                        const prevMsg = activeMessages[index - 1];
                        const nextMsg = activeMessages[index + 1];
                        
                        const showHeader = !prevMsg || !isSameDay(msg.timestamp, prevMsg.timestamp);
                        const isMe = msg.senderId === user?.uid;
                        
                        // Check if this is the last message in a consecutive group
                        const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId || !isSameDay(msg.timestamp, nextMsg.timestamp);
                        
                        const customColors = getBubbleColors(bubbleStyle, isMe, false);

                        // Determine Tail Color
                        let tailColor = '#ffffff'; // default
                        if (!isMe) {
                            tailColor = '#27272a'; // Received default (zinc-800)
                        } else {
                            switch(bubbleStyle) {
                                case 'whatsapp': tailColor = '#005c4b'; break;
                                case 'telegram': tailColor = '#2b5278'; break;
                                case 'purple': tailColor = '#6d28d9'; break;
                                case 'blue_gradient': tailColor = '#2563eb'; break; // End color of gradient
                                case 'solid_gray': tailColor = '#3f3f46'; break;
                                case 'minimal_solid': tailColor = '#ffffff'; break;
                                case 'minimal_glass': tailColor = 'rgba(255,255,255,0.2)'; break;
                                case 'clear': tailColor = 'transparent'; break;
                                default: tailColor = '#ffffff';
                            }
                        }

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
                                <div className={`flex w-full mb-1 items-end relative ${isMe ? 'justify-end message-row-sent' : 'justify-start gap-2 message-row-received'}`}>
                                {!isMe && (
                                        <div className="flex-shrink-0 w-8 h-8 relative z-10 mb-1">
                                            {/* Use helper to fetch specific sender info for Groups */}
                                            {isLastInGroup ? <MessageAvatar userId={msg.senderId} /> : <div className="w-8 h-8" />}
                                        </div>
                                    )}
                                    
                                    {/* TAIL SVG - Sent (Right) - Rotated Clockwise 3deg */}
                                    {isMe && isLastInGroup && !msg.imageUrl && (
                                        <svg className="absolute bottom-[1px] -right-[9px] rotate-[3deg] z-0 w-[17px] h-[14px] fill-current" viewBox="0 0 17 14">
                                            <path d="M0,0 C2,7.5 9,14 17,14 H0 V0 Z" fill={tailColor} />
                                        </svg>
                                    )}

                                    {/* TAIL SVG - Received (Left) - Rotated Counter-Clockwise 3deg (Symmetry) */}
                                    {!isMe && isLastInGroup && !msg.imageUrl && (
                                        <svg className="absolute bottom-[1px] -left-[9px] rotate-[-3deg] z-0 w-[17px] h-[14px] fill-current" viewBox="0 0 17 14">
                                            <path d="M17,0 C15,7.5 8,14 0,14 H17 V0 Z" fill={tailColor} />
                                        </svg>
                                    )}

                                    <div className="relative z-10 max-w-[85%]">
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
                                            currentReaction={reactions[msg.id]}
                                            onReact={(emoji) => handleAddReaction(msg.id, emoji)}
                                            isLastInGroup={false}
                                        />
                                    </div>
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

      {/* VIEW: PROFILE (User or Group) - MODERN COMPACT STYLE (SCROLLABLE HEADER) */}
      {currentView === 'profile' && (otherChatUser || currentChatObject?.type === 'group') && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* CLICK OUTSIDE TO CLOSE */}
            <div className="absolute inset-0" onClick={() => { setIsEditingGroupInfo(false); setCurrentView('room'); setIsProfileScrolled(false); }} />

            {/* MAIN CARD - Full Screen on Mobile, Fixed Height on Laptop (Fixes Black Screen) */}
            <div className="relative w-full h-[100dvh] sm:h-[85vh] sm:max-w-[420px] bg-[#1c1c1d] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border-x sm:border border-white/10 animate-in slide-in-from-bottom duration-300">
                
                {/* STICKY COLLAPSED HEADER (Shows on Scroll) */}
                <div className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${isProfileScrolled ? 'bg-[#1c1c1d]/95 backdrop-blur-xl border-b border-white/10 py-3 pointer-events-auto' : 'pt-4 pointer-events-none'}`}>
                    <div className="flex items-center px-4 gap-3 pointer-events-auto">
                        <button 
                            onClick={() => { 
                                if(isEditingGroupInfo) setIsEditingGroupInfo(false); 
                                else { setCurrentView('room'); setIsProfileScrolled(false); }
                            }} 
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/50 transition-all border border-white/10 z-50"
                        >
                            <ChevronLeft size={24} className="-ml-0.5" />
                        </button>
                        
                        {/* Collapsed Info */}
                        <div className={`flex items-center gap-3 transition-all duration-300 ${isProfileScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                <img 
                                    src={(currentChatObject?.type === 'group' ? currentChatObject.photoURL : otherChatUser?.photoURL) || ''} 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                            <span className="font-bold text-white truncate max-w-[200px]">
                                {currentChatObject?.type === 'group' ? currentChatObject.displayName : otherChatUser?.displayName}
                            </span>
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE CONTAINER (Contains Image + Content) */}
                <div 
                    className="absolute inset-0 overflow-y-auto no-scrollbar"
                    onScroll={(e) => setIsProfileScrolled(e.currentTarget.scrollTop > 180)}
                >
                    {/* HEADER IMAGE SECTION (BANNER) */}
                    <div className="relative h-72 sm:h-64 w-full bg-zinc-800 group/header flex-shrink-0 -mt-[68px]">
                        {/* IMAGE */}
                        {(currentChatObject?.type === 'group' ? currentChatObject.photoURL : otherChatUser?.photoURL) ? (
                            <img 
                                src={currentChatObject?.type === 'group' ? currentChatObject.photoURL : otherChatUser?.photoURL} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/header:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900">
                                <Users size={64} className="text-white/20" />
                            </div>
                        )}
                        
                        {/* GRADIENT OVERLAY */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1d] via-transparent to-black/30" />

                        {/* PHOTO EDIT BUTTON (If Admin/Group) - z-20 */}
                        {isEditingGroupInfo && currentChatObject?.type === 'group' && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-20">
                                <div className="bg-black/50 p-3 rounded-full backdrop-blur-md border border-white/20">
                                    <Camera size={24} className="text-white" />
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleUpdateGroupPhoto(e.target.files[0]); }} />
                            </label>
                        )}

                        {/* TEXT INFO - z-30 (Must be higher than photo edit button to be clickable) */}
                        <div className="absolute bottom-3 left-6 right-4 z-30 flex flex-col items-start shadow-sm">
                            {isEditingGroupInfo ? (
                                <div className="w-full bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            // REMOVED AUTO FOCUS
                                            type="text" 
                                            value={editGroupName} 
                                            onChange={(e) => setEditGroupName(e.target.value)}
                                            className="bg-transparent border-b-2 border-white/50 py-1 text-white font-black text-3xl w-full focus:outline-none focus:border-[#DA7756] placeholder:text-white/30 drop-shadow-md"
                                            placeholder="Group Name"
                                        />
                                    </div>
                                    <textarea 
                                        value={editGroupDesc} 
                                        onChange={(e) => setEditGroupDesc(e.target.value)}
                                        placeholder="Add a description..."
                                        // Changed to text-base (16px) to prevent iOS auto-zoom resizing
                                        className="w-full bg-transparent border-none p-0 text-white/90 text-base focus:outline-none resize-none placeholder:text-white/40"
                                        rows={2}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-end justify-between w-full translate-y-1">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h2 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-xl shadow-black truncate">
                                            {currentChatObject?.type === 'group' ? currentChatObject.displayName : otherChatUser?.displayName}
                                        </h2>
                                        {/* GROUP DESCRIPTION OR USER STATUS */}
                                        <p className="text-sm text-zinc-200 font-normal mt-1 drop-shadow-md opacity-90 line-clamp-2 leading-relaxed">
                                            {currentChatObject?.type === 'group' 
                                                ? (currentChatObject.description || '') 
                                                : (otherChatUser?.isOnline ? <span className="text-green-400">Online</span> : 'Last seen recently')}
                                        </p>
                                    </div>
                                    {/* Edit Pencil if admin */}
                                    {currentChatObject?.type === 'group' && currentChatObject.createdBy === user.uid && !isEditingGroupInfo && (
                                        <button onClick={startGroupEdit} className="mb-1 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors border border-white/5 flex-shrink-0">
                                            <PenLine size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CONTENT BODY */}
                    <div className="bg-[#1c1c1d] pb-24 min-h-[50vh]">
                        
                        {/* SAVE BUTTON ROW (Only visible when editing) */}
                        {isEditingGroupInfo && (
                            <div className="flex gap-2 px-4 py-4 border-b border-white/5 animate-in slide-in-from-top-2 duration-200 sticky top-0 bg-[#1c1c1d] z-40">
                                <button onClick={() => setIsEditingGroupInfo(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
                                <button onClick={handleSaveGroupInfo} className="flex-1 py-3 rounded-xl bg-[#DA7756] text-white font-bold text-sm hover:bg-[#c46243] transition-colors shadow-lg shadow-orange-900/20">Save Changes</button>
                            </div>
                        )}

                        {/* Action Row - MONOCHROME - COMPACT */}
                        {!isEditingGroupInfo && (
                            <div className="flex items-center justify-between gap-1 p-3 border-b border-white/5">
                                <button className="flex-1 py-2.5 bg-zinc-800/40 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-800 transition-all active:scale-95 group border border-white/5">
                                    <Phone size={18} className="text-white"/> 
                                    <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">Call</span>
                                </button>
                                <button onClick={toggleMute} className="flex-1 py-2.5 bg-zinc-800/40 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-800 transition-all active:scale-95 group border border-white/5">
                                    {mutedChats.has(activeChatId) ? <BellOff size={18} className="text-red-500" /> : <Bell size={18} className="text-white" />} 
                                    <span className={`text-[10px] font-medium ${mutedChats.has(activeChatId) ? 'text-red-500' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{mutedChats.has(activeChatId) ? 'Unmute' : 'Mute'}</span>
                                </button>
                                <button className="flex-1 py-2.5 bg-zinc-800/40 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-800 transition-all active:scale-95 group border border-white/5">
                                    <Search size={18} className="text-white"/> 
                                    <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">Search</span>
                                </button>
                                <button onClick={() => currentChatObject?.type === 'group' ? setShowLeaveGroupModal(true) : setShowBlockModal(true)} className="flex-1 py-2.5 bg-zinc-800/40 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-zinc-800 transition-all active:scale-95 group border border-white/5">
                                    <MoreHorizontal size={18} className="text-white"/> 
                                    <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">More</span>
                                </button>
                            </div>
                        )}
                        
                        {/* REST OF INFO LIST (Bio, Username, Notifications, Members, Block) */}
                        <div className="px-2 pb-6 space-y-1 mt-2">
                            
                            {/* INFO ITEM: USERNAME (If User) */}
                            {currentChatObject?.type !== 'group' && (
                                <div className="p-3 hover:bg-white/5 rounded-xl flex gap-4 transition-colors">
                                    <div className="text-zinc-500 mt-0.5 flex-shrink-0"><AtSign size={20} /></div>
                                    <div className="flex-1 min-w-0 border-b border-white/5 pb-3">
                                        <p className="text-white text-[14px]">{otherChatUser?.handle || `@${otherChatUser?.displayName?.replace(/\s/g,'').toLowerCase()}`}</p>
                                        <p className="text-[12px] text-zinc-500 mt-0.5 uppercase tracking-wide font-bold">Username</p>
                                    </div>
                                </div>
                            )}

                            {/* INFO ITEM: NOTIFICATIONS */}
                            <div className="p-3 hover:bg-white/5 rounded-xl flex gap-4 transition-colors cursor-pointer" onClick={toggleMute}>
                                <div className="text-zinc-500 mt-0.5 flex-shrink-0"><Bell size={20} /></div>
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-[14px]">Notifications</p>
                                        <p className="text-[12px] text-zinc-500 mt-0.5">{mutedChats.has(activeChatId) ? 'Disabled' : 'Enabled'}</p>
                                    </div>
                                    <div className={`w-9 h-5 rounded-full relative transition-colors ${!mutedChats.has(activeChatId) ? 'bg-[#DA7756]' : 'bg-zinc-700'}`}>
                                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${!mutedChats.has(activeChatId) ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: MEMBERS (If Group) */}
                            {currentChatObject?.type === 'group' && !isEditingGroupInfo && (
                                <div className="mt-4 pt-2 border-t border-white/5">
                                    <div className="px-4 py-2 text-zinc-500 text-[13px] font-medium tracking-wide">
                                        {currentChatObject.participants?.length} Members
                                    </div>
                                    
                                    {/* Add Member Button */}
                                    <div className="px-2">
                                        <button className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group">
                                            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                                                <UserPlus size={18} />
                                            </div>
                                            <span className="text-[#DA7756] text-[14px] font-bold">Add Members</span>
                                        </button>
                                    </div>

                                    {/* Member List */}
                                    <div className="px-2">
                                        {currentChatObject.participants.map(uid => (
                                            <GroupMemberRow 
                                                key={uid} 
                                                userId={uid} 
                                                isAdmin={currentChatObject.createdBy === uid} 
                                                isViewerAdmin={currentChatObject.createdBy === user.uid}
                                                onRemove={handleRemoveMember}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DANGER: BLOCK/LEAVE (Bottom) */}
                            <div className="px-2 mt-4 pt-2 border-t border-white/5">
                                <button 
                                    onClick={() => currentChatObject?.type === 'group' ? setShowLeaveGroupModal(true) : setShowBlockModal(true)} 
                                    className="w-full flex items-center gap-4 p-3 hover:bg-red-500/10 rounded-xl transition-colors text-left group"
                                >
                                    <div className="w-9 h-9 flex items-center justify-center text-red-500">
                                        {currentChatObject?.type === 'group' ? <ArrowUp className="rotate-90" size={20} /> : <Ban size={20} />}
                                    </div>
                                    <span className="text-red-500 text-[14px] font-bold">
                                        {currentChatObject?.type === 'group' ? 'Leave Group' : 'Block User'}
                                    </span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* OVERLAY: NEW GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setIsGroupModalOpen(false)} />
            <div className="bg-[#1c1c1d] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 zoom-in-95 duration-200 border border-white/10">
                
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
                    <button onClick={() => { if(groupStep===2) setGroupStep(1); else setIsGroupModalOpen(false); }} className="text-zinc-400 hover:text-white"><ChevronLeft size={24} /></button>
                    <h3 className="font-bold text-white">{groupStep === 1 ? 'New Group' : 'Name Group'}</h3>
                    <div className="w-6" />
                </div>

                {/* Step 1: Select Members */}
                {groupStep === 1 && (
                    <div className="flex-1 overflow-y-auto p-2">
                        {savedContacts.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500">No contacts found.<br/>Scan a QR code to add friends.</div>
                        ) : (
                            savedContacts.map(contact => (
                                <div key={contact.uid} onClick={() => toggleGroupMember(contact.uid)} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${groupMembers.has(contact.uid) ? 'bg-[#DA7756] border-[#DA7756]' : 'border-zinc-600'}`}>
                                        {groupMembers.has(contact.uid) && <Check size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                        {contact.photoURL ? <img src={contact.photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">🤖</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white truncate">{contact.displayName}</div>
                                        <div className="text-xs text-zinc-500 truncate">{contact.handle}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Step 2: Name Group */}
                {groupStep === 2 && (
                    <div className="p-6 space-y-6">
                        <label className="w-24 h-24 rounded-full bg-zinc-800 mx-auto flex items-center justify-center border border-white/10 cursor-pointer overflow-hidden relative group">
                            {groupImage ? (
                                <img src={groupImage} className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={32} className="text-zinc-500 group-hover:text-white transition-colors" />
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={handleGroupImageSelect} />
                        </label>
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Group Name" 
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DA7756] transition-colors text-center font-bold text-lg"
                        />
                        <div className="text-center text-xs text-zinc-500">{groupMembers.size} members selected</div>
                    </div>
                )}

                {/* Footer Action */}
                <div className="p-4 border-t border-white/10 bg-zinc-900">
                    {groupStep === 1 ? (
                        <button 
                            disabled={groupMembers.size === 0}
                            onClick={() => setGroupStep(2)}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            Next ({groupMembers.size})
                        </button>
                    ) : (
                        <button 
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim()}
                            className="w-full py-3 bg-[#DA7756] text-white font-bold rounded-xl disabled:opacity-50 transition-all active:scale-95"
                        >
                            Create Group
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* OVERLAY: INCOMING INVITE MODAL */}
      {incomingInvite && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex flex-col justify-end md:justify-center md:items-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setIncomingInvite(null)} />
            
            <div className="relative w-full max-w-sm mx-auto p-4 z-10 animate-in slide-in-from-bottom duration-300 md:animate-in md:zoom-in-95 md:duration-200">
                <div className="flex flex-col gap-2">
                <div className="bg-[#1c1c1d] rounded-[14px] overflow-hidden shadow-2xl shadow-black/50">
                        <div className="p-6 flex flex-col items-center justify-center gap-3 border-b border-white/10 min-h-[120px]">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl overflow-hidden border border-white/10">
                                {/* Show Real Profile Pic if available */}
                                {incomingInvite.photoURL ? <img src={incomingInvite.photoURL} className="w-full h-full object-cover" /> : '🎁'}
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-white font-bold text-lg">Add {incomingInvite.displayName}?</h3>
                                <p className="text-[13px] text-zinc-500 leading-tight px-4">
                                    <b>{incomingInvite.handle}</b> wants to chat with you on VibeNotes.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleAcceptInvite}
                            className="w-full py-4 text-[17px] text-blue-500 font-bold hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            Add to Contacts
                        </button>
                    </div>

                    <button 
                        onClick={() => setIncomingInvite(null)}
                        className="w-full py-4 bg-[#1c1c1d] rounded-[14px] text-[17px] font-semibold text-zinc-400 hover:bg-white/5 active:bg-white/10 transition-colors shadow-2xl shadow-black/50"
                    >
                        Ignore
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* OVERLAY: LEAVE GROUP MODAL */}
      {showLeaveGroupModal && currentChatObject && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex flex-col justify-end md:justify-center md:items-center animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowLeaveGroupModal(false)} />
            
            <div className="relative w-full max-w-sm mx-auto p-4 z-10 animate-in slide-in-from-bottom duration-300 md:animate-in md:zoom-in-95 md:duration-200">
                <div className="bg-[#1c1c1d] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 p-6 flex flex-col items-center gap-4">
                    
                    {/* Group Avatar */}
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-[#1c1c1d] shadow-lg">
                        <Users size={32} className="text-zinc-500" />
                    </div>

                    <div className="text-center space-y-2">
                        <h3 className="text-white font-bold text-lg">{currentChatObject.displayName}</h3>
                        <p className="text-[15px] text-zinc-400 px-4 leading-relaxed">
                            Are you sure you want to leave this group?
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full pt-2">
                        <button 
                            onClick={() => setShowLeaveGroupModal(false)}
                            className="w-full py-3 rounded-xl font-bold text-white hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleLeaveGroup}
                            className="w-full py-3 bg-[#ff453a]/10 text-[#ff453a] rounded-xl font-bold hover:bg-[#ff453a]/20 transition-colors"
                        >
                            Leave
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* OVERLAY: BLOCK USER MODAL */}
      {showBlockModal && otherChatUser && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex flex-col justify-end md:justify-center md:items-center animate-in fade-in duration-200">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setShowBlockModal(false)} />
            
            <div className="relative w-full max-w-sm mx-auto p-4 z-10 animate-in slide-in-from-bottom duration-300 md:animate-in md:zoom-in-95 md:duration-200">
                <div className="flex flex-col gap-2">
                    
                    {/* Main Action Sheet */}
                    <div className="bg-[#1c1c1d] rounded-[14px] overflow-hidden shadow-2xl shadow-black/50">
                        <div className="p-4 flex flex-col items-center justify-center gap-1 border-b border-white/10 min-h-[80px]">
                            <p className="text-[13px] text-zinc-500 text-center leading-tight px-4">
                                Do you want to block <b>{otherChatUser.displayName}</b>?
                            </p>
                        </div>
                        <button 
                            onClick={handleBlockConfirm}
                            className="w-full py-4 text-[17px] text-[#ff453a] font-normal hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            Block {otherChatUser.displayName}
                        </button>
                    </div>

                    {/* Cancel Button */}
                    <button 
                        onClick={() => setShowBlockModal(false)}
                        className="w-full py-4 bg-[#1c1c1d] rounded-[14px] text-[17px] font-semibold text-[#0a84ff] hover:bg-white/5 active:bg-white/10 transition-colors shadow-2xl shadow-black/50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

<style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default App;