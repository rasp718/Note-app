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
getBubbleColors, normalizeDate, isSameDay, getDateLabel, compressImage, getUserColor
} from './utils';

// IMPORT COMPONENTS
import { NoteCard } from './components/NoteCard';
import { SettingsView } from './SettingsView';
import { useFirebaseSync, useNotes, useChats, useMessages, syncUserProfile, searchUsers, useUser, usePresence } from './useFirebaseSync';
import Auth from './components/Auth';
// FIREBASE DIRECT INIT FOR INVITES
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, arrayRemove, arrayUnion, increment } from "firebase/firestore";

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
const auth = getAuth(app);

// Helper to convert file to base64 without compression
const fileToBase64 = (file: File): Promise<string | ArrayBuffer | null> => new Promise((resolve, reject) => {
const reader = new FileReader();
reader.readAsDataURL(file);
reader.onload = () => resolve(reader.result);
reader.onerror = error => reject(error);
});

// Helper component to resolve avatars in Group Chats
const MessageAvatar = ({ userId }: { userId: string }) => {
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
const GroupMemberRow = ({ userId, isAdmin, isViewerAdmin, onRemove, onMute, isMuted }: any) => {
const userData = useUser(userId);
if (!userId) return null;

return (
<div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group/member">
<div className={`w-10 h-10 rounded-full overflow-hidden border ${isMuted ? 'border-red-500 grayscale opacity-50' : 'border-white/5 bg-zinc-800'}`}>
{userData?.photoURL ? <img src={userData.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">{userData?.displayName?.[0] || '?'}</div>}
</div>
<div className="flex-1 min-w-0">
<div className={`text-white font-bold text-sm truncate flex items-center gap-2 ${isMuted ? 'text-zinc-500 line-through' : ''}`}>
{userData?.displayName || 'User'}
{isMuted && <Mic size={10} className="text-red-500" />}
</div>
<div className="text-zinc-500 text-xs truncate">{userData?.handle || (userData?.isOnline ? 'Online' : 'Last seen recently')}</div>
</div>
{isAdmin && <span className="text-[#F97316] text-[10px] font-bold uppercase tracking-wider">Admin</span>}

{/* Admin Actions */}
{isViewerAdmin && !isAdmin && (
<div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
<button
onClick={(e) => { e.stopPropagation(); onMute(userId); }}
className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isMuted ? 'text-red-500 bg-red-500/10' : 'text-zinc-600 hover:text-white hover:bg-zinc-700'}`}
title={isMuted ? "Unmute user" : "Mute user"}
>
{isMuted ? <Mic size={16} /> : <BellOff size={16} />}
</button>
<button
onClick={(e) => { e.stopPropagation(); onRemove(userId); }}
className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
title="Remove from group"
>
<X size={16} />
</button>
</div>
)}
</div>
);
};

// Wrapper to fetch user data for individual messages
const MessageItem = ({ msg, prevMsg, nextMsg, user, isGroup, reactions, onReact, onReply, onDelete, onEdit, setZoomedImage, bubbleStyle, isHackerMode, replyTheme }: any) => {
const senderData = useUser(msg.senderId);
const isMe = msg.senderId === user?.uid;
const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId || !isSameDay(msg.timestamp, nextMsg.timestamp);

const displayName = senderData?.displayName || 'Unknown';
const photoURL = senderData?.photoURL;

let customColors = getBubbleColors(bubbleStyle, isMe, false);

if (isMe) {
if (bubbleStyle === 'midnight') customColors = { bg: 'bg-[#172554]', text: 'text-zinc-100' };
if (bubbleStyle === 'slate') customColors = { bg: 'bg-[#475569]', text: 'text-white' };
}

let tailColor = '#ffffff';
if (!isMe) {
tailColor = '#27272a';
} else {
switch(bubbleStyle) {
case 'whatsapp': tailColor = '#005c4b'; break;
case 'telegram': tailColor = '#2b5278'; break;
case 'purple': tailColor = '#6d28d9'; break;
case 'blue_gradient': tailColor = '#2563eb'; break;
case 'solid_gray': tailColor = '#3f3f46'; break;
case 'minimal_solid': tailColor = '#ffffff'; break;
case 'midnight': tailColor = '#172554'; break;
case 'slate': tailColor = '#475569'; break;
default: tailColor = '#ffffff';
}
}

const msgNote: any = {
id: msg.id, text: msg.text, date: normalizeDate(msg.timestamp),
category: 'default', isPinned: false, isExpanded: true, imageUrl: msg.imageUrl,
audioUrl: msg.audioUrl
};

return (
<React.Fragment key={msg.id}>
<div
style={{ zIndex: 1 }}
className={`flex w-full ${isLastInGroup ? 'mb-2' : (reactions[msg.id] ? 'mb-3' : 'mb-1')} items-end relative ${isMe ? 'justify-end message-row-sent' : 'justify-start gap-2 message-row-received'}`}
>
{!isMe && (
<div className="flex-shrink-0 w-8 h-8 relative z-10 mb-1">
{isLastInGroup ? (
// FIXED: Added same shadow to avatar
<div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
{photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">{displayName?.[0]}</div>}
</div>
) : <div className="w-8 h-8" />}
</div>
)}

<div className={`relative z-10 w-fit ${msg.imageUrl ? 'max-w-[75%] sm:max-w-[340px]' : 'max-w-[85%]'}`}>
{/* TAIL SVG - Sent (Right) */}
{isMe && isLastInGroup && !msg.imageUrl && (
<svg className="absolute bottom-[3px] -right-[12px] rotate-[8deg] z-20 w-[17px] h-[14px] fill-current" viewBox="0 0 17 14">
<path d="M0,0 C2,7.5 9,14 17,14 H0 V0 Z" fill={tailColor} />
</svg>
)}

{!isMe && isLastInGroup && !msg.imageUrl && (
<svg className="absolute bottom-[3px] -left-[12px] rotate-[-8deg] z-20 w-[17px] h-[14px] fill-current" viewBox="0 0 17 14">
<path d="M17,0 C15,7.5 8,14 0,14 H17 V0 Z" fill={tailColor} />
</svg>
)}

<div className={`select-text ${isMe ? "[&>div]:!rounded-br-2xl" : "[&>div]:!rounded-bl-2xl"}`}>
<NoteCard
note={msgNote} categories={[]} selectedVoice={null}
variant={isMe ? 'sent' : 'received'} status={msg.status} customColors={customColors}
currentUserId={user?.uid}
onUpdate={(id, text) => {}}
opponentName={isGroup ? displayName : undefined}
opponentAvatar={photoURL}
onImageClick={setZoomedImage}
onDelete={isMe ? onDelete : undefined}
onEdit={isMe && !msg.audioUrl && !msg.imageUrl ? () => onEdit(msg) : undefined}
currentReaction={reactions[msg.id]}
onReact={(emoji) => onReact(msg.id, emoji)}
onReply={(targetMsg) => onReply({ ...targetMsg, displayName })}
isLastInGroup={false}
replyTheme={replyTheme}
/>
</div>
</div>
</div>
</React.Fragment>
);
};

// Fixed Chat Row
// Updated ChatRow accepts currentUserId
const ChatRow = ({ chat, active, isEditing, onSelect, onClick, currentUserId }: any) => {
  const otherUser = useUser(chat.otherUserId);
  const isGroup = chat.type === 'group';
  const displayName = isGroup ? chat.displayName : (otherUser?.displayName || 'Unknown');
  const photoURL = isGroup ? chat.photoURL : otherUser?.photoURL;

  let lastMsg = chat.lastMessageText || '';
  if (lastMsg.includes("|||RPLY|||")) {
    lastMsg = lastMsg.split("|||RPLY|||")[1] || 'Reply';
  }
  if (lastMsg.includes("STREET_DICE_GAME")) {
    lastMsg = "🎲 Dice Game";
  }

  const timestamp = chat.lastMessageTimestamp ? getDateLabel(chat.lastMessageTimestamp) : '';
  
  // FIXED: Read from the map using your specific ID
  const unreadCount = (currentUserId && chat.unreadCounts) ? (chat.unreadCounts[currentUserId] || 0) : 0;

  return (
    <div onClick={onClick} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-white/5 group ${active ? 'bg-white/10' : ''}`}>
      {isEditing && (
        <div className="flex items-center pr-2" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'bg-[#F97316] border-[#F97316]' : 'border-zinc-600'}`}>
            {active && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>
        </div>
      )}
      <div className="w-14 h-14 flex-shrink-0 relative group/icon">
        <div className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.3)] relative">
          {photoURL ? (
            <img src={photoURL} className="w-full h-full object-cover transition-transform duration-500 group-hover/icon:scale-110" alt="avatar" />
          ) : (
            <span className="text-zinc-500 font-bold text-xl">{isGroup ? <Users size={28} /> : displayName?.[0]}</span>
          )}
        </div>
        {!isGroup && otherUser?.isOnline && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-black z-10"></div>
        )}

        {/* Avatar Red Badge - Only shows if unreadCount > 0 */}
        {(unreadCount > 0 || (chat.id === 'saved_messages' && !active)) && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-[#ff3b30] rounded-full border-[2px] border-[#09090b] z-20 flex items-center justify-center shadow-sm animate-in zoom-in duration-300">
            <span className="text-[10px] font-bold text-white leading-none font-sans translate-y-[0.5px]">
              {unreadCount || 1}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* ROW 1: Name and Timestamp (Grey Pill / Black Text) */}
        <div className="flex justify-between items-baseline">
          <h3 className="font-bold text-white text-base truncate tracking-tight flex-1 pr-2">{displayName}</h3>
          <span className="flex-shrink-0 inline-block text-[10px] font-mono text-black bg-gray-400 rounded-full px-2 py-0.5">{timestamp}</span>
        </div>

        {/* ROW 2: Message and Unread Count (Matching Grey Pill / Black Text) */}
        <div className="flex justify-between items-center">
          <p className="text-gray-400 text-sm truncate flex-1 pr-2">{lastMsg}</p>
          
          {unreadCount > 0 && (
             <span className="flex-shrink-0 inline-block text-[10px] font-mono text-black bg-gray-400 rounded-full px-2 py-0.5 animate-in zoom-in duration-300 shadow-sm">
               {unreadCount}
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------
// LOCAL AI BRIDGE (OLLAMA)
// -----------------------------------------------------------------------
const talkToLocalAI = async (text: string) => {  // <--- YOU WERE MISSING THIS LINE
  const API_URL = "http://127.0.0.1:11434/api/chat ";

  console.log("Sending to Brain..."); 

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:latest", 
        messages: [{ role: "user", content: text }],
        stream: false
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Brain Rejected:", err);
      return "Error: Brain rejected the message. Check F12 console.";
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error("Network Error:", error);
    return "Error: My brain is offline. Check the PowerShell window.";
  }
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

const [currentView, setCurrentView] = useState('list');
const [activeTab, setActiveTab] = useState('chats');
const [activeChatId, setActiveChatId] = useState<string | null>(null);
const [isEditing, setIsEditing] = useState(false);
const [selectedChatIds, setSelectedChatIds] = useState(new Set());

const [isEditingProfile, setIsEditingProfile] = useState(false);
const [showAvatarSelector, setShowAvatarSelector] = useState(false);
const [profileName, setProfileName] = useState("Vibe User");
const [profileHandle, setProfileHandle] = useState("@neo");
const [profileBio, setProfileBio] = useState("Status: Online");
const [profilePic, setProfilePic] = useState<string | null>(null);
const [categories] = useState(DEFAULT_CATEGORIES);

const [alignment, setAlignment] = useState('right');
const [bgIndex, setBgIndex] = useState(1);
const [bgOpacity, setBgOpacity] = useState(0.45);
const [bgScale, setBgScale] = useState(100);
const [bubbleStyle, setBubbleStyle] = useState('minimal_solid');
const [redModeIntensity, setRedModeIntensity] = useState(0);
const [isAutoRedMode, setIsAutoRedMode] = useState(false);
const [replyTheme, setReplyTheme] = useState('retro');

useEffect(() => {
const savedTheme = localStorage.getItem('vibenotes_reply_theme');
if (savedTheme) setReplyTheme(savedTheme);
}, []);

const changeReplyTheme = (theme: string) => {
setReplyTheme(theme);
localStorage.setItem('vibenotes_reply_theme', theme);
};

const [contactSearchQuery, setContactSearchQuery] = useState('');
const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
const [isSearchingContacts, setIsSearchingContacts] = useState(false);
const [transcript, setTranscript] = useState('');
const [imageUrl, setImageUrl] = useState('');
const [isCompressionEnabled, setIsCompressionEnabled] = useState(true);
const [originalFile, setOriginalFile] = useState<File | null>(null);
const [isUploadingImage, setIsUploadingImage] = useState(false);
const [editingNote, setEditingNote] = useState<any>(null);
const [searchQuery, setSearchQuery] = useState('');
const [isSearchExpanded, setIsSearchExpanded] = useState(false);
const [zoomedImage, setZoomedImage] = useState<string | null>(null);
const [showQRCode, setShowQRCode] = useState(false);
const [isRecording, setIsRecording] = useState(false);
const [isPaused, setIsPaused] = useState(false);
const [recordingDuration, setRecordingDuration] = useState(0);
const [showScrollButton, setShowScrollButton] = useState(false);
const [isChatScrolled, setIsChatScrolled] = useState(false);
const [isTopScrolled, setIsTopScrolled] = useState(false); // NEW HEADER STATE
const [showBackButton, setShowBackButton] = useState(true);
const [replyingTo, setReplyingTo] = useState<any>(null);
const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
const [isSendingAnim, setIsSendingAnim] = useState(false); // <--- ADD THIS
const [dateHeaderState, setDateHeaderState] = useState<'visible' | 'blinking' | 'hidden'>('hidden');
const [visibleDate, setVisibleDate] = useState('');
const [headerOffset, setHeaderOffset] = useState(0);
const dateHeaderTimeoutRef = useRef<any>(null);
const floatingBubbleRef = useRef<HTMLDivElement>(null);
const lastHiddenHeaderRef = useRef<HTMLElement | null>(null); // <--- ADD THIS
const userInteractionRef = useRef(false); // <--- ADD THIS

const [reactions, setReactions] = useState(() => {
try { return JSON.parse(localStorage.getItem('vibenotes_reactions') || '{}'); } catch { return {}; }
});
const [activeReactionId, setActiveReactionId] = useState<string | null>(null);

useEffect(() => { localStorage.setItem('vibenotes_reactions', JSON.stringify(reactions)); }, [reactions]);

const [showBlockModal, setShowBlockModal] = useState(false);
const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
const [mutedChats, setMutedChats] = useState(new Set());

const [isEditingGroupInfo, setIsEditingGroupInfo] = useState(false);
const [isProfileScrolled, setIsProfileScrolled] = useState(false);
const [editGroupName, setEditGroupName] = useState('');
const [editGroupDesc, setEditGroupDesc] = useState('');

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

const handleRemoveMember = async (memberId: string) => {
if (!activeChatId) return;
if (confirm("Remove this user from the group?")) {
try {
const chatRef = doc(db, "chats", activeChatId);
await updateDoc(chatRef, { participants: arrayRemove(memberId) });
} catch (e) { console.error("Error removing member:", e); }
}
};

const handleAddMemberToGroup = async (contactId: string) => {
if (!activeChatId) return;
try {
const chatRef = doc(db, "chats", activeChatId);
await updateDoc(chatRef, { participants: arrayUnion(contactId) });
setIsAddMemberModalOpen(false);
} catch (e) { console.error("Error adding member:", e); }
};

const handleToggleMemberMute = async (memberId: string) => {
if (!activeChatId) return;
try {
const chatRef = doc(db, "chats", activeChatId);
const isMuted = currentChatObject.mutedParticipants?.includes(memberId);
if (isMuted) {
await updateDoc(chatRef, { mutedParticipants: arrayRemove(memberId) });
} else {
await updateDoc(chatRef, { mutedParticipants: arrayUnion(memberId) });
}
} catch (e) { console.error("Error toggling mute:", e); }
};

const [incomingInvite, setIncomingInvite] = useState<any>(null);

const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
const [groupName, setGroupName] = useState('');
const [groupImage, setGroupImage] = useState<string | null>(null);
const [groupMembers, setGroupMembers] = useState(new Set());
const [groupStep, setGroupStep] = useState(1);

const handleGroupImageSelect = async (e: any) => {
if (e.target.files?.[0]) {
try {
const url = await compressImage(e.target.files[0]);
setGroupImage(url);
} catch (err) { console.error(err); }
}
};

const handleUpdateGroupPhoto = async (file: File) => {
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

const [savedContacts, setSavedContacts] = useState<any[]>(() => {
try {
const saved = localStorage.getItem('vibenotes_contacts');
return saved ? JSON.parse(saved) : [];
} catch { return []; }
});

useEffect(() => {
localStorage.setItem('vibenotes_contacts', JSON.stringify(savedContacts));
}, [savedContacts]);

useEffect(() => {
const checkInvite = async () => {
const path = window.location.pathname;
const match = path.match(/\/invite\/([^/]+)/);

if (match && match[1]) {
const rawHandle = match[1];
const handleToSearch = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

try {
const q = query(collection(db, "users"), where("handle", "==", handleToSearch));
const snapshot = await getDocs(q);

if (!snapshot.empty) {
const userData = snapshot.docs[0].data();
setIncomingInvite({ ...userData, uid: snapshot.docs[0].id });
} else {
alert("User not found!");
}
} catch (e) {
console.error("Error fetching invite:", e);
}
window.history.replaceState(null, "", "/");
}
};
checkInvite();
}, []);

const handleAcceptInvite = () => {
if (!incomingInvite) return;
const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAP///yH/If8h/yH/If8=");
audio.volume = 0.2;
audio.play().catch(() => {});

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

const toggleGroupMember = (uid: string) => {
const newSet = new Set(groupMembers);
if (newSet.has(uid)) newSet.delete(uid);
else newSet.add(uid);
setGroupMembers(newSet);
};

const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const mimeTypeRef = useRef('');
const streamRef = useRef<MediaStream | null>(null);
const recordingTimerRef = useRef<any>(null);
const searchInputRef = useRef<HTMLInputElement>(null);
const textareaRef = useRef<HTMLTextAreaElement>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
const bottomRef = useRef<HTMLDivElement>(null);
const listRef = useRef<HTMLDivElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);
const scrollTimeoutRef = useRef<any>(null);;

const [activeFilter, setActiveFilter] = useState<CategoryId | 'all'>('all');
const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
const [secretTaps, setSecretTaps] = useState(0);
const tapTimeoutRef = useRef<any>(null);
const [showSecretAnim, setShowSecretAnim] = useState(false);

const currentChatObject = activeChatId && activeChatId !== 'saved_messages' ? realChats.find(c => c.id === activeChatId) : null;
const otherChatUser = useUser(currentChatObject?.otherUserId);
const { messages: activeMessages, sendMessage, deleteMessage, updateMessage, markChatAsRead } = useMessages(
(activeChatId && activeChatId !== 'saved_messages') ? activeChatId : null
);

const activeSecretConfig = HACKER_CONFIG;
const isHackerMode = activeFilter === 'secret' || editingNote?.category === 'secret';
const accentColor = isHackerMode ? HACKER_GREEN : '#F97316';
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

useEffect(() => {
if (!showSecretAnim || currentView !== 'room') return;
const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const FONT_SIZE = 24; const FADE_SPEED = 0.1; const MASTER_SPEED = 50; const STUTTER_AMOUNT = 0.85; const RAIN_BUILDUP = 50; const COLOR_HEAD = '#FFF'; const COLOR_TRAIL = '#0D0'; const GLOW_COLOR = '#0F0'; const GLOW_INTENSITY = 10;
const binary = '010101010101'; const nums = '0123456789'; const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const alphabet = binary + nums + latin;
const columns = canvas.width / FONT_SIZE; const drops: number[] = [];
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

useEffect(() => {
if (currentView === 'room') {
scrollToBottom();
// Force a scroll check after render to set correct date header immediately
setTimeout(handleScroll, 100);
}
}, [activeMessages, notes, currentView]);
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
const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
userInteractionRef.current = false; // Disable animations for auto-scroll
setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); }, 100);
};

const handleScroll = () => {
if (!listRef.current) return;

// --- PHASE 1: READ ---
const { scrollTop, scrollHeight, clientHeight } = listRef.current;
const HEADER_OFFSET = 75;
const HEADER_HEIGHT = 45;

const isScrolled = scrollTop > 10;
const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

const dateGroups = listRef.current.querySelectorAll('[data-date]');
let activeDate = '';
let pushOffset = 0;
let activeHeaderElement: HTMLElement | null = null;

for (let i = 0; i < dateGroups.length; i++) {
const group = dateGroups[i] as HTMLElement;
const rect = group.getBoundingClientRect();

if (rect.top <= HEADER_OFFSET + 2 && rect.bottom > HEADER_OFFSET) {
activeDate = group.getAttribute('data-date') || '';
activeHeaderElement = group.querySelector('.static-date-header');

const nextGroup = dateGroups[i + 1] as HTMLElement;
if (nextGroup) {
const nextRect = nextGroup.getBoundingClientRect();
if (nextRect.top < HEADER_OFFSET + HEADER_HEIGHT) {
pushOffset = nextRect.top - (HEADER_OFFSET + HEADER_HEIGHT);
}
}
break;
}
}

if (scrollTop < 50) { activeDate = ''; pushOffset = 0; activeHeaderElement = null; }

// --- PHASE 2: WRITE ---
if (userInteractionRef.current) {
if (isScrolled) {
setIsTopScrolled(true);
if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
scrollTimeoutRef.current = setTimeout(() => { setIsTopScrolled(false); }, 900);
} else {
setIsTopScrolled(false);
if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
}
} else {
if (isTopScrolled) setIsTopScrolled(false);
}

setShowScrollButton(!isNearBottom);
setIsChatScrolled(!isNearBottom);

if (activeDate !== visibleDate) setVisibleDate(activeDate);

if (floatingBubbleRef.current) {
floatingBubbleRef.current.style.transform = `translate3d(0, ${pushOffset}px, 0)`;
}

if (userInteractionRef.current) {
if (activeHeaderElement && activeHeaderElement !== lastHiddenHeaderRef.current) {
if (lastHiddenHeaderRef.current) lastHiddenHeaderRef.current.style.opacity = '1';
activeHeaderElement.style.opacity = '0';
lastHiddenHeaderRef.current = activeHeaderElement;
}
else if (!activeHeaderElement && lastHiddenHeaderRef.current) {
lastHiddenHeaderRef.current.style.opacity = '1';
lastHiddenHeaderRef.current = null;
}
} else {
if (lastHiddenHeaderRef.current) { lastHiddenHeaderRef.current.style.opacity = '1'; lastHiddenHeaderRef.current = null; }
}

// --- ANIMATION TRIGGER LOGIC ---
if (activeDate && userInteractionRef.current) {
if (dateHeaderState !== 'visible') setDateHeaderState('visible');
if (dateHeaderTimeoutRef.current) clearTimeout(dateHeaderTimeoutRef.current);

if (pushOffset === 0) {
dateHeaderTimeoutRef.current = setTimeout(() => {
setDateHeaderState('blinking'); // Turns ORANGE
setTimeout(() => setDateHeaderState('hidden'), 100); // Fades out after 200ms
}, 800);
}
} else {
if (dateHeaderState !== 'hidden') setDateHeaderState('hidden');
}
};

const handleRollDice = async () => {
if (!user || !activeChatId) return;
const diceMsg = `🎲🎲🎲 STREET_DICE_GAME|||{"p1Score":0,"p2Score":0,"turn":"p1","dice":[4,5,6],"message":"FIRST TO 5","msgColor":"text-zinc-500"}`;
try { await sendMessage(diceMsg, null, null, user.uid); scrollToBottom(); if (navigator.vibrate) navigator.vibrate(50); } catch (e) { console.error(e); }
};

const handleCancelEdit = () => {
setEditingNote(null);
setTranscript('');
setImageUrl('');
if (textareaRef.current) {
textareaRef.current.style.height = 'auto'; // Reset height
}
};

const handleMainAction = async () => {
if (!transcript.trim() && !imageUrl) return;
if (activeFilter === 'all' && !editingNote && activeChatId === 'saved_messages') return;

// TRIGGER COOL BLINK ANIMATION
setIsSendingAnim(true);
setTimeout(() => setIsSendingAnim(false), 200);

if (activeChatId && currentChatObject?.type === 'group' && currentChatObject.mutedParticipants?.includes(user.uid)) {
alert("You have been muted by an admin.");
return;
}

try {
let finalImageUrl = imageUrl;
if (originalFile) {
if (isCompressionEnabled) {
finalImageUrl = await compressImage(originalFile);
} else {
finalImageUrl = await fileToBase64(originalFile) as string;
}
}

if (activeChatId === 'saved_messages' || activeChatId === null) {
  
  // --- START AI TRIGGER ---
  if (activeFilter === 'secret' && !editingNote) {
    // 1. Save YOUR message first
    await addNote({ text: transcript.trim(), date: Date.now(), category: 'secret', isPinned: false, isExpanded: true, imageUrl: finalImageUrl || undefined });
    
    const userPrompt = transcript.trim();

    // 2. Clear input immediately
    setTranscript(''); setImageUrl(''); setOriginalFile(null); scrollToBottom();

    // 3. Talk to Ollama (Async)
    talkToLocalAI(userPrompt).then(async (aiResponse) => {
       // 4. Save AI Response
       await addNote({ text: aiResponse, date: Date.now(), category: 'secret', isPinned: false, isExpanded: true });
       scrollToBottom();
    });

    return; // STOP here so we don't run the normal save logic below
  }
  // --- END AI TRIGGER ---

if (editingNote) {
const updates: Partial<Note> = { text: transcript.trim(), editedAt: Date.now() };
if (finalImageUrl !== editingNote.imageUrl) updates.imageUrl = finalImageUrl || undefined;
await updateNote(editingNote.id, updates);
setEditingNote(null);
} else {
const categoryToUse = activeFilter;
await addNote({ text: transcript.trim(), date: Date.now(), category: categoryToUse, isPinned: false, isExpanded: true, imageUrl: finalImageUrl || undefined });
scrollToBottom();
}
} else {
if (editingNote && editingNote.id) {
let textToSave = transcript.trim();

if (editingNote.replyMetadata) {
textToSave = `${editingNote.replyMetadata}|||RPLY|||${textToSave}`;
}

await updateMessage(editingNote.id, textToSave);
setEditingNote(null);
} else if (user) {
let finalMessage = transcript.trim();
if (replyingTo) {
const senderName = replyingTo.displayName || (replyingTo.senderId === user.uid ? 'You' : 'Unknown');

let quoteText = replyingTo.text || '';
if (quoteText.includes("|||RPLY|||")) {
const parts = quoteText.split("|||RPLY|||");
quoteText = parts.slice(1).join("|||RPLY|||");
}

const replyMetadata = JSON.stringify({
id: replyingTo.id,
text: quoteText,
sender: senderName,
imageUrl: replyingTo.imageUrl || null
});
finalMessage = `${replyMetadata}|||RPLY|||${finalMessage}`;
}

// 1. Send the message
await sendMessage(finalMessage, finalImageUrl, null, user.uid);

// 2. Increment Unread Count for the OTHER person(s)
if (currentChatObject) {
  const chatRef = doc(db, "chats", activeChatId);
  const updates: any = {};
  
  if (currentChatObject.type === 'group') {
    currentChatObject.participants.forEach((uid: string) => {
      if (uid !== user.uid) {
        updates[`unreadCounts.${uid}`] = increment(1);
      }
    });
  } else if (currentChatObject.otherUserId) {
    updates[`unreadCounts.${currentChatObject.otherUserId}`] = increment(1);
  }

  if (Object.keys(updates).length > 0) {
    updateDoc(chatRef, updates).catch(e => console.error("Could not update unread count", e));
  }
}

setReplyingTo(null);
}
}
setTranscript(''); setImageUrl(''); setOriginalFile(null); scrollToBottom();
} catch (e) { console.error(e); }
};

const toggleAutoRedMode = () => {
const newState = !isAutoRedMode;
setIsAutoRedMode(newState);
localStorage.setItem('vibenotes_red_auto', newState.toString());
if (!newState) { setRedModeIntensity(0); localStorage.setItem('vibenotes_red_intensity', '0'); }
else { const hour = new Date().getHours(); if (hour >= 18 || hour < 6) { setRedModeIntensity(50); } else { setRedModeIntensity(0); } }
};

const changeBubbleStyle = (style: string) => { setBubbleStyle(style); };

const handleSecretTrigger = () => {
setSecretTaps(prev => prev + 1);
if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
tapTimeoutRef.current = setTimeout(() => setSecretTaps(0), 1000);
if (secretTaps + 1 >= 5) { setActiveFilter('secret'); setSecretTaps(0); setShowSecretAnim(true); setTimeout(() => setShowSecretAnim(false), 8000); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); }
};

const toggleChatSelection = (id: string) => { const newSet = new Set(selectedChatIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedChatIds(newSet); };

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

const handleAddReaction = (msgId: string, emoji: string) => {
setReactions((prev: any) => {
const current = prev[msgId];
if (current === emoji) {
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

const handleLogout = async () => {
try {
await signOut(auth);
window.location.reload();
} catch (error) {
console.error("Error signing out: ", error);
}
};

const handleAvatarUpload = async (file: File) => { try { const url = await compressImage(file); setProfilePic(url); setShowAvatarSelector(false); } catch(e) { console.error(e); } };
const handleSelectPreset = (num: number) => { setProfilePic(`/robot${num}.jpeg?v=1`); setShowAvatarSelector(false); };

const handleImageUpload = async (file: File) => {
if (!file.type.startsWith('image/')) return alert('Please select an image file');

setIsUploadingImage(true);
try {
setOriginalFile(file);
const previewUrl = URL.createObjectURL(file);
setImageUrl(previewUrl);
setIsCompressionEnabled(true);
} catch (e) {
console.error(e);
} finally {
setIsUploadingImage(false);
}
};
const handlePaste = async (e: React.ClipboardEvent) => {
// 1. Allow plain text to paste naturally (Fix for iPhone/Browsers)
const textData = e.clipboardData.getData('text');
if (textData && !textData.startsWith('data:image')) {
return; 
}

// 2. Handle Clipboard Items (Images)
const items = e.clipboardData.items;
for (let i = 0; i < items.length; i++) {
if (items[i].type.indexOf('image') !== -1) {
e.preventDefault();
const file = items[i].getAsFile();
if (file) await handleImageUpload(file);
return;
}
}

// 3. Handle Base64 Image Text
if (textData && textData.startsWith('data:image')) {
e.preventDefault();
try {
const res = await fetch(textData);
const blob = await res.blob();
const file = new File([blob], "pasted_image.png", { type: blob.type });
await handleImageUpload(file);
} catch(err) { console.error("Base64 paste failed", err); }
}
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
const formatDuration = (sec: number) => { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

const handleDeleteMessage = async (id: string) => { await deleteMessage(id); };

const handleEditMessage = (msg: any) => {
let cleanText = msg.text;
let hiddenMeta = null;

if (cleanText.includes("|||RPLY|||")) {
const parts = cleanText.split("|||RPLY|||");
hiddenMeta = parts[0];
cleanText = parts.slice(1).join("|||RPLY|||");
}

setEditingNote({ ...msg, category: 'default', replyMetadata: hiddenMeta });
setTranscript(cleanText);
setTimeout(() => textareaRef.current?.focus(), 100);
};

const handleSearchContacts = async (e: React.FormEvent) => {
e.preventDefault(); if (!contactSearchQuery.trim()) return; setIsSearchingContacts(true);
try { const results = await searchUsers(contactSearchQuery); setContactSearchResults(results.filter((u: any) => u.uid !== user?.uid)); } catch (err) { console.error(err); } finally { setIsSearchingContacts(false); }
};
const startNewChat = async (otherUid: string) => {
if (!otherUid) return;
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
const nextIndex = (currentIndex + 1) % order.length; setActiveFilter(order[nextIndex] as CategoryId | 'all');
};

const handleEditClick = (note: Note) => { setActiveFilter(note.category); setEditingNote(note); setTranscript(note.text); setImageUrl(note.imageUrl || ''); setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 50); };
const handleDeleteNote = async (id: string) => { await deleteNoteFromFirebase(id); };
const handleToggleExpand = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isExpanded: !n.isExpanded }); };
const togglePin = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isPinned: !n.isPinned }); };

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
const groupItemsByDate = (items: any[]) => {
const groups: { date: string; items: any[] }[] = [];
items.forEach((item) => {
const dateLabel = getDateLabel(item.date || item.timestamp);
let lastGroup = groups[groups.length - 1];
if (!lastGroup || lastGroup.date !== dateLabel) {
lastGroup = { date: dateLabel, items: [] };
groups.push(lastGroup);
}
lastGroup.items.push(item);
});
return groups;
};

// ============================================================================
// SECTION: RENDER
// ============================================================================
if (authLoading) return <div className="min-h-screen bg-black" />;
if (!user) return <Auth />;

const BottomTabBar = () => (
<div className="flex-none fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.3)] p-1.5 flex gap-1 z-50">
<button onClick={() => setActiveTab('contacts')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Globe size={22} className={`transition-all duration-300 ${activeTab === 'contacts' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'contacts' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
<button onClick={() => setActiveTab('calls')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Zap size={22} className={`transition-all duration-300 ${activeTab === 'calls' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'calls' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
<button onClick={() => setActiveTab('chats')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><MessageSquareDashed size={22} className={`transition-all duration-300 ${activeTab === 'chats' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'chats' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
<button onClick={() => setActiveTab('settings')} className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group"><Cpu size={22} className={`transition-all duration-300 ${activeTab === 'settings' ? '' : 'text-zinc-500 group-hover:text-zinc-300'}`} style={activeTab === 'settings' ? { color: navAccentColor, filter: `drop-shadow(0 0 8px ${navAccentColor}60)` } : {}}/></button>
</div>
);

return (
<div className={`fixed top-0 left-0 w-full h-screen bg-black text-zinc-100 font-sans ${currentTheme.selection} flex flex-col overflow-hidden ${currentTheme.font}`}>
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
<img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data= ${window.location.origin}/invite/${profileHandle.replace('@','')}`} alt="QR Code" className="w-full h-full" />
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

{activeTab === 'contacts' && (
<div key={activeTab} className="flex-none pt-14 pb-4 px-6 flex items-end justify-between bg-gradient-to-b from-black/80 to-transparent sticky top-0 z-20">
<div className="max-w-2xl mx-auto w-full"><h1 className="text-3xl font-black text-white tracking-tighter">CONTACTS</h1></div>
</div>
)}

{/* -- SETTINGS TAB (Has its own scroller) -- */}
{activeTab === 'settings' ? (
  <SettingsView 
    profileName={profileName}
    setProfileName={setProfileName}
    profileHandle={profileHandle}
    profileBio={profileBio}
    setProfileBio={setProfileBio}
    profilePic={profilePic}
    isEditingProfile={isEditingProfile}
    setIsEditingProfile={setIsEditingProfile}
    showAvatarSelector={showAvatarSelector}
    setShowAvatarSelector={setShowAvatarSelector}
    onProfileSave={handleProfileSave}
    onAvatarUpload={handleAvatarUpload}
    onSelectPreset={handleSelectPreset}
    onShowQRCode={() => setShowQRCode(true)}
    onLogout={handleLogout}
    bubbleStyle={bubbleStyle}
    onChangeBubbleStyle={changeBubbleStyle}
    replyTheme={replyTheme}
    onChangeReplyTheme={changeReplyTheme}
    isAutoRedMode={isAutoRedMode}
    onToggleRedMode={toggleAutoRedMode}
    bgScale={bgScale}
    setBgScale={setBgScale}
    bgOpacity={bgOpacity}
    setBgOpacity={setBgOpacity}
    bgIndex={bgIndex}
    setBgIndex={setBgIndex}
  />
) : (
  /* -- CHATS & CONTACTS TAB (Shared Scroller) -- */
  <div key={activeTab + 'content'} className="flex-1 overflow-y-auto no-scrollbar pb-24">
    <div className="max-w-2xl mx-auto w-full">
      {/* -- CHATS TAB -- */}
      {activeTab === 'chats' && (
        <>
          <div className="px-4 mb-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 py-2.5 gap-3 transition-colors focus-within:bg-black/40 focus-within:border-white/50 shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
              <Search size={16} className="text-zinc-500" />
              <input type="text" placeholder="Search frequency..." className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-zinc-600 font-medium"/>
            </div>
          </div>

          <div onClick={() => { setActiveChatId('saved_messages'); setCurrentView('room'); scrollToBottom('auto'); }} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-white/5 animate-in slide-in-from-left-8 fade-in duration-500`}>
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 group/logo">
              <div className="w-full h-full rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                {activeFilter === 'secret' ? (<Terminal className="text-green-500 transition-colors" size={24} />) : (<div className="w-3 h-3 rounded-sm relative z-10" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}80` }} />)}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-white text-base tracking-tight">My Notes</span>
                <span className="inline-block text-[10px] font-mono text-black bg-gray-400 rounded-full px-2 py-0.5">{notes.length > 0 ? getDateLabel(notes[0].date) : ''}</span>
              </div>
              <div className="text-gray-400 text-sm truncate pr-4 flex items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1 rounded bg-white/10" style={{ color: accentColor }}>You</span>
                <span className="truncate">{notes.length > 0 ? notes[0].text : 'No notes yet'}</span>
              </div>
            </div>
          </div>

          {realChats.reduce((acc: any[], chat) => {
            const existingIndex = chat.type === 'group' ? -1 : acc.findIndex(c => c.otherUserId === chat.otherUserId);
            if (existingIndex > -1) {
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
              currentUserId={user?.uid} // <--- Added this line
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
    </div>
  </div>
)}
<BottomTabBar />
</div>
)}

{/* VIEW: ROOM */}
{currentView === 'room' && (
<div className="flex-1 flex flex-col h-full z-10 animate-in slide-in-from-right-10 fade-in duration-300">

{/* OPTION 3: 3-PILL FLOATING HEADER (SLOWER SLIDING ANIMATION) */}
<div className="fixed top-0 left-0 right-0 z-40 pointer-events-none overflow-hidden pb-4">
<div className="max-w-2xl mx-auto px-4 pt-3 flex items-center justify-between gap-3 relative">

{/* LEFT PILL: BACK BUTTON (Slides Left on Scroll) */}
<div className={`flex-none pointer-events-auto transition-all duration-1000 ease-in-out ${!isTopScrolled ? 'translate-x-0 opacity-100' : '-translate-x-[200%] opacity-0'}`}>
<button
onClick={() => { setCurrentView('list'); setActiveChatId(null); }}
className="w-11 h-11 flex items-center justify-center rounded-full bg-[#09090b]/90 backdrop-blur-xl border border-white/10 text-white hover:bg-zinc-800 hover:text-white transition-all shadow-[0_1px_1px_rgba(0,0,0,0.3)] active:scale-90"
>
<ChevronLeft size={24} className="-ml-0.5" strokeWidth={3} />
</button>
</div>

{/* CENTER PILL: CONTEXT INFO (Slides Up on Scroll) */}
<div className={`flex-1 min-w-0 pointer-events-auto flex justify-center z-10 transition-all duration-1000 ease-in-out ${!isTopScrolled ? 'translate-y-0 opacity-100' : '-translate-y-[200%] opacity-0'}`}>
  <div className="bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.3)] h-11 flex items-center min-w-0 w-fit max-w-full px-1.5 transition-all duration-300">
    {activeChatId !== 'saved_messages' ? (
      // 1. CHAT HEADER
      <div onClick={() => setCurrentView('profile')} className="flex items-center gap-3 cursor-pointer group rounded-full hover:bg-white/5 transition-colors max-w-full pr-4 pl-0.5 py-0.5">
        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/10 relative flex-shrink-0 shadow-sm">
          {currentChatObject?.type === 'group' ? (
            currentChatObject.photoURL ? (
              <img src={currentChatObject.photoURL} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Users size={14} className="text-zinc-400" /></div>
            )
          ) : otherChatUser?.photoURL ? (
            <img src={otherChatUser.photoURL} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-zinc-500 text-xs">{otherChatUser?.displayName?.[0] || '?'}</div>
          )}
          {otherChatUser?.isOnline && currentChatObject?.type !== 'group' && <div className="absolute inset-0 border-2 border-green-500/50 rounded-full animate-pulse"></div>}
        </div>

        <div className="flex flex-col items-start overflow-hidden min-w-0">
          <h3 className="text-white text-sm font-bold leading-none truncate max-w-[120px] sm:max-w-[200px] text-left">
            {currentChatObject?.type === 'group' ? currentChatObject.displayName : (otherChatUser?.displayName || 'Unknown')}
          </h3>
          <p className={`text-[10px] font-mono uppercase tracking-widest truncate leading-tight ${otherChatUser?.isOnline ? 'text-green-500' : 'text-zinc-500'}`}>
            {currentChatObject?.type === 'group' ? `${currentChatObject.participants?.length} Members` : (otherChatUser?.isOnline ? 'ONLINE' : 'OFFLINE')}
          </p>
        </div>
      </div>
    ) : (
      // 2. MY NOTES HEADER
      <div onClick={handleSecretTrigger} className="flex items-center gap-3 cursor-pointer select-none pr-5 pl-0.5 py-0.5 h-full">
        {/* LOGO CIRCLE PILL */}
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border border-white/10 shadow-sm relative">
          {activeFilter === 'secret' ? (
            <Terminal className="text-green-500" size={18} />
          ) : (
            <div 
              className="w-3.5 h-3.5 rounded-full" 
              style={{ backgroundColor: accentColor, boxShadow: `0 0 12px ${accentColor}` }} 
            />
          )}
        </div>

        {/* TEXT STACK */}
        <div className="flex flex-col items-start justify-center gap-0.5">
          <span className="font-black text-white text-[13px] tracking-wide uppercase leading-none">
            MY NOTES
          </span>
          <span className={`text-[11px] font-bold font-mono uppercase leading-none tracking-wider ${activeFilter === 'secret' ? 'text-green-500' : 'text-[#F97316]'}`}>
            {activeFilter === 'secret' ? 'ANONYMOUS' : (activeFilter === 'all' ? 'ALL' : activeFilter)}
          </span>
        </div>
      </div>
    )}
  </div>
</div>

{/* RIGHT PILL: SEARCH (Slides Right on Scroll) */}
<div className={`flex-none pointer-events-auto relative transition-all duration-1000 ease-in-out ${!isTopScrolled ? 'translate-x-0 opacity-100' : 'translate-x-[200%] opacity-0'}`}>
<div className="flex items-center h-11">
<button onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className={`w-11 h-11 flex items-center justify-center rounded-full bg-[#09090b]/90 backdrop-blur-xl border border-white/10 text-white hover:bg-zinc-800 hover:text-white transition-all shadow-[0_1px_1px_rgba(0,0,0,0.3)] active:scale-90 ${isSearchExpanded ? 'opacity-0 pointer-events-none scale-50' : 'opacity-100 scale-100'}`}>
  <Search size={20} strokeWidth={3} />
</button>

{/* FLOATING SEARCH INPUT */}
<div className={`absolute right-0 bg-[#09090b] border border-white/20 shadow-2xl rounded-full flex items-center px-3 h-11 transition-all duration-300 origin-right ${isSearchExpanded ? 'w-[260px] opacity-100 z-50' : 'w-0 opacity-0 pointer-events-none'}`}>
<input ref={searchInputRef} type="text" placeholder={TRANSLATIONS.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="bg-transparent border-none outline-none text-white text-sm w-full h-full placeholder:text-zinc-600 min-w-0"/>
<button onClick={() => { setSearchQuery(''); setIsSearchExpanded(false); }} className="p-1 text-zinc-500 hover:text-white flex-shrink-0"><X size={16} /></button>
</div>
</div>
</div>
</div>
</div>

{showSecretAnim && <canvas ref={canvasRef} className="fixed inset-0 z-20 pointer-events-none" />}
{/* FLOATING DATE HEADER */}
<div
ref={floatingBubbleRef}
className={`
fixed top-[75px] left-0 right-0 z-50 flex justify-center pointer-events-none
will-change-transform transition-all duration-900 ease-out
${dateHeaderState === 'hidden' || !visibleDate ? 'opacity-0 scale-90 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}
`}
>
<div className="relative transition-transform duration-900 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-100">
<span className={`
px-3 py-1.5 rounded-full text-[10px] font-bold capitalize tracking-wide shadow-lg
transition-colors duration-400
${dateHeaderState === 'blinking'
? 'bg-[#F97316] text-white shadow-[0_2px_15px_rgba(249,115,22,0.4)]'
: 'bg-black text-zinc-300 backdrop-blur-md'}
`}>
{visibleDate}
</span>
</div>
</div>


{/* SCROLL DOWN BUTTON */}
<div className="fixed bottom-24 left-0 w-full z-40 pointer-events-none">
<div className="max-w-2xl mx-auto px-4 relative">
<div className={`absolute right-4 bottom-0 transition-all duration-300 ${showScrollButton ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
<button onClick={() => scrollToBottom()} className="w-11 h-11 rounded-full bg-[#09090b]/90 border border-white/10 text-white shadow-[0_1px_1px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-zinc-800 hover:text-white active:scale-90 transition-all backdrop-blur-xl">
<ChevronDown size={24} strokeWidth={2} />
</button>
</div>
</div>
</div>

<div
ref={listRef}
onScroll={handleScroll}
onTouchStart={() => userInteractionRef.current = true}
onMouseDown={() => userInteractionRef.current = true}
onWheel={() => userInteractionRef.current = true}
onKeyDown={() => userInteractionRef.current = true}
onClick={() => editingNote && handleCancelEdit()}
className={`flex-1 overflow-y-auto relative z-10 w-full no-scrollbar`}
>
<div className={`min-h-full max-w-2xl mx-auto flex flex-col justify-end gap-0.5 pt-20 pb-0 px-4 ${activeChatId === 'saved_messages' ? getAlignmentClass() : 'items-stretch'}`}>

{activeChatId === 'saved_messages' ? (
groupItemsByDate(filteredNotes).map((group) => (
<div key={group.date} className="relative w-full" data-date={group.date}>
{/* STATIC INLINE DATE SEPARATOR */}
<div className="flex justify-center py-4 pointer-events-none">
<span className="static-date-header bg-black backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-normal capitalize shadow-[0_1px_1px_rgba(0,0,0,0.3)] opacity-100">
{group.date}
</span>
</div>

{group.items.map((note, index) => {
let noteColors = getBubbleColors(bubbleStyle, true, isHackerMode);

if (bubbleStyle === 'midnight') noteColors = { bg: 'bg-[#172554]', text: 'text-zinc-100' };
if (bubbleStyle === 'slate') noteColors = { bg: 'bg-[#475569]', text: 'text-white' };

return (
<div key={note.id} onDoubleClick={() => handleToggleExpand(note.id)} className={`mb-1 select-text transition-all duration-300 active:scale-[0.99] w-full flex ${alignment === 'left' ? 'justify-start' : alignment === 'center' ? 'justify-center' : 'justify-end'} ${editingNote && editingNote.id !== note.id ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>
<div className={`w-fit ${note.imageUrl ? 'max-w-[75%] sm:max-w-[340px]' : 'max-w-[85%]'}`}>
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
);
})}
</div>
))
) : (
groupItemsByDate([...activeMessages].sort((a: any, b: any) => {
// Robust sort: handle Firestore objects, seconds, or plain numbers
const getT = (t: any) => t?.seconds ? t.seconds * 1000 : (t?.toMillis ? t.toMillis() : (Number(t) || 0));
return getT(a.timestamp) - getT(b.timestamp);
})).map((group) => (
<div key={group.date} className="relative w-full" data-date={group.date}>
{/* STATIC INLINE DATE SEPARATOR */}
<div className="flex justify-center py-4 pointer-events-none">
<span className="static-date-header transition-opacity duration-0 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-normal capitalize shadow-sm">
{group.date}
</span>
</div>

{group.items.map((msg, index) => (
<MessageItem
key={msg.id}
msg={msg}
prevMsg={group.items[index - 1]}
nextMsg={group.items[index + 1]}
user={user}
isGroup={currentChatObject?.type === 'group'}
reactions={reactions}
onReact={handleAddReaction}
onReply={(target: any) => { setReplyingTo(target); setTimeout(() => textareaRef.current?.focus(), 50); }}
onDelete={handleDeleteMessage}
onEdit={handleEditMessage}
setZoomedImage={setZoomedImage}
bubbleStyle={bubbleStyle}
isHackerMode={isHackerMode}
replyTheme={replyTheme}
/>
))}
</div>
))
)}
<div ref={bottomRef} className="h-0 w-full shrink-0" />
</div>
</div>

<div className="flex-none w-full px-2 py-1.5 bg-[#09090b]/90 backdrop-blur-2xl z-50 border-t border-white/5">
{/* REPLY PREVIEW BAR */}
{replyingTo && (() => {
const senderName = replyingTo.displayName || (replyingTo.senderId === user?.uid ? 'You' : 'Unknown');
const [textColor, borderColor] = getUserColor(senderName, replyTheme).split(' ');

let previewText = replyingTo.text || '';
if (previewText.includes("|||RPLY|||")) {
const parts = previewText.split("|||RPLY|||");
previewText = parts.slice(1).join("|||RPLY|||");
}

return (
<div className="max-w-2xl mx-auto mb-2 animate-in slide-in-from-bottom-2 duration-200">
<div className={`mx-1 p-2 rounded-xl bg-[#1c1c1d] border-l-4 ${borderColor} relative flex items-center justify-between shadow-lg shadow-black/50`}>
{replyingTo.imageUrl && (
<div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden mr-3 flex-shrink-0 border border-white/10 relative">
<img src={replyingTo.imageUrl} className="w-full h-full object-cover" />
</div>
)}
<div className="flex-1 min-w-0 pr-8">
<div className={`text-xs font-bold ${textColor} mb-0.5`}>
{senderName}
</div>
<div className="text-sm text-zinc-300 truncate">
{previewText || (replyingTo.imageUrl ? 'Photo' : 'Voice Message')}
</div>
</div>
<button onClick={() => setReplyingTo(null)} className="absolute top-2 right-2 p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
<X size={14} />
</button>
</div>
</div>
);
})()}

<div className="max-w-2xl mx-auto flex items-end gap-2">

{isRecording ? (
<div className="flex-1 flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200 h-[40px]">
<button onClick={cancelRecording} className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 transition-colors"> <Trash2 size={20} /> </button>
<div className="flex-1 bg-zinc-900/80 rounded-full h-full flex items-center px-2 gap-3 border border-white/10 relative overflow-hidden">
<div className="flex items-center gap-2 z-10 pl-2"> <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} /> <span className="text-white font-mono font-medium text-sm">{formatDuration(recordingDuration)}</span> </div>
<div className="flex-1 flex items-center justify-center gap-0.5 h-4 opacity-50 overflow-hidden"> {!isPaused && [...Array(12)].map((_, i) => ( <div key={i} className="w-1 rounded-full animate-pulse bg-white" style={{ height: `${Math.random() * 100}%`, animationDuration: '0.4s', animationDelay: `${i * 0.05}s` }} /> ))} </div>
<button onClick={togglePause} className="z-20 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-700"> {isPaused ? <Play size={12} fill="white" /> : <Pause size={12} fill="white" />} </button>
</div>
<button onClick={finishRecording} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#F97316] text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"> <ArrowUp size={20} strokeWidth={3} /> </button>
</div>
) : (
<>
<div className="flex items-end gap-1 pb-[1px]">
{activeChatId === 'saved_messages' ? (
<button onClick={cycleFilter} className="w-9 h-9 rounded-full text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
{activeFilter === 'all' ? <LayoutGrid size={22} /> : <span className="text-xl leading-none">{currentConfig?.emoji}</span>}
</button>
) : (
<label className="w-9 h-9 rounded-full text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95">
<ImageIcon size={22} strokeWidth={1.5} />
<input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
</label>
)}
</div>

{/* COMPACT INPUT FIELD */}
<div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[20px] flex items-end px-3 py-1.5 focus-within:border-zinc-700 transition-colors gap-2 min-h-[36px]">
<textarea
ref={textareaRef}
value={transcript}
onChange={(e) => setTranscript(e.target.value)}
onPaste={(e) => handlePaste(e)}
onFocus={() => scrollToBottom('auto')}
onKeyDown={(e) => {
if (e.key === 'Enter' && !e.shiftKey) {
if (activeChatId !== 'saved_messages') {
e.preventDefault();
handleMainAction();
}
}
}}
placeholder={editingNote ? "Edit message..." : "Message"}
rows={1}
className={`flex-1 bg-transparent border-none text-white placeholder:text-zinc-500 focus:outline-none text-[16px] resize-none max-h-24 py-0.5 leading-relaxed no-scrollbar ${isHackerMode ? 'font-mono' : ''}`}
style={isHackerMode ? { color: HACKER_GREEN } : undefined}
/>
{editingNote && (
<button onClick={handleCancelEdit} className="text-zinc-500 hover:text-white transition-colors pb-1 active:scale-95 flex-shrink-0">
<X size={20} strokeWidth={1.5} />
</button>
)}
{activeChatId !== 'saved_messages' && !editingNote && (
<button onClick={handleRollDice} className="text-zinc-500 hover:text-white transition-colors pb-1 active:scale-95 flex-shrink-0" title="Roll Dice">
<Dices size={20} strokeWidth={1.5} />
</button>
)}
</div>

<div className="pb-0 animate-in fade-in zoom-in duration-200">
{(transcript.trim() || imageUrl || editingNote) ? (
<button onClick={handleMainAction} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
isSendingAnim
? 'scale-110 bg-white text-[#F97316] shadow-[#F97316]/50'
: 'active:scale-95 bg-[#F97316] text-white hover:bg-[#EA580C]'
}`}>
{editingNote ? <Check size={18} strokeWidth={3} /> : <ArrowUp size={22} strokeWidth={3} />}
</button>
) : (
activeChatId !== 'saved_messages' && (
<button onClick={startRecording} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 text-white active:scale-95">
<Mic size={22} />
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

{/* VIEW: PROFILE (User or Group) */}
{currentView === 'profile' && (otherChatUser || currentChatObject?.type === 'group') && (
<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
<div className="absolute inset-0" onClick={() => { setIsEditingGroupInfo(false); setCurrentView('room'); setIsProfileScrolled(false); }} />

<div className="relative w-full h-[100dvh] sm:h-[85vh] sm:max-w-[420px] bg-[#1c1c1d] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border-x sm:border border-white/10 animate-in slide-in-from-bottom duration-300">

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

<div
className="absolute inset-0 overflow-y-auto no-scrollbar"
onScroll={(e) => setIsProfileScrolled(e.currentTarget.scrollTop > 180)}
>
<div className="relative h-72 sm:h-64 w-full bg-zinc-800 group/header flex-shrink-0 -mt-[68px]">
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

{isEditingGroupInfo && currentChatObject?.type === 'group' && (
<label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-20">
<div className="bg-black/50 p-3 rounded-full backdrop-blur-md border border-white/20">
<Camera size={24} className="text-white" />
</div>
<input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleUpdateGroupPhoto(e.target.files[0]); }} />
</label>
)}

<div className="absolute bottom-3 left-6 right-4 z-30 flex flex-col items-start shadow-sm">
{isEditingGroupInfo ? (
<div className="w-full bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
<div className="flex items-center gap-2 mb-2">
<input
type="text"
value={editGroupName}
onChange={(e) => setEditGroupName(e.target.value)}
className="bg-transparent border-b-2 border-white/50 py-1 text-white font-black text-3xl w-full focus:outline-none focus:border-[#F97316] placeholder:text-white/30 drop-shadow-md"
placeholder="Group Name"
/>
</div>
<textarea
value={editGroupDesc}
onChange={(e) => setEditGroupDesc(e.target.value)}
placeholder="Add a description..."
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
<p className="text-sm text-zinc-200 font-normal mt-1 drop-shadow-md opacity-90 line-clamp-2 leading-relaxed">
{currentChatObject?.type === 'group'
? (currentChatObject.description || '')
: (otherChatUser?.isOnline ? <span className="text-green-400">Online</span> : 'Last seen recently')}
</p>
</div>
{currentChatObject?.type === 'group' && currentChatObject.createdBy === user.uid && !isEditingGroupInfo && (
<button onClick={startGroupEdit} className="mb-1 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors border border-white/5 flex-shrink-0">
<PenLine size={16} />
</button>
)}
</div>
)}
</div>
</div>

<div className="bg-[#1c1c1d] pb-24 min-h-[50vh]">
{isEditingGroupInfo && (
<div className="flex gap-2 px-4 py-4 border-b border-white/5 animate-in slide-in-from-top-2 duration-200 sticky top-0 bg-[#1c1c1d] z-40">
<button onClick={() => setIsEditingGroupInfo(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
<button onClick={handleSaveGroupInfo} className="flex-1 py-3 rounded-xl bg-[#F97316] text-white font-bold text-sm hover:bg-[#EA580C] transition-colors shadow-lg shadow-orange-900/20">Save Changes</button>
</div>
)}

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

<div className="px-2 pb-6 space-y-1 mt-2">
{currentChatObject?.type !== 'group' && otherChatUser && !savedContacts.find(c => c.uid === otherChatUser.uid) && (
<button
onClick={(e) => { e.stopPropagation(); handleAddToContacts(); }}
className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group mb-2"
>
<div className="w-9 h-9 rounded-full bg-[#F97316]/10 flex items-center justify-center text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors border border-[#F97316]/20">
<UserPlus size={20} />
</div>
<div className="flex-1 min-w-0 border-b border-white/5 pb-2">
<p className="text-[#F97316] text-[15px] font-bold">Add to Contacts</p>
<p className="text-[12px] text-zinc-500 mt-0.5">Save this user to your list</p>
</div>
</button>
)}

{currentChatObject?.type !== 'group' && (
<div className="p-3 hover:bg-white/5 rounded-xl flex gap-4 transition-colors">
<div className="text-zinc-400 mt-0.5 flex-shrink-0"><AtSign size={20} /></div>
<div className="flex-1 min-w-0 border-b border-white/5 pb-3">
<p className="text-white text-[14px]">{otherChatUser?.handle || `@${otherChatUser?.displayName?.replace(/\s/g,'').toLowerCase()}`}</p>
<p className="text-[12px] text-zinc-500 mt-0.5 uppercase tracking-wide font-bold">Username</p>
</div>
</div>
)}

<div className="p-3 hover:bg-white/5 rounded-xl flex gap-4 transition-colors cursor-pointer" onClick={toggleMute}>
<div className="text-zinc-400 mt-0.5 flex-shrink-0"><Bell size={20} /></div>
<div className="flex-1 min-w-0 flex items-center justify-between">
<div>
<p className="text-white text-[14px]">Notifications</p>
<p className="text-[12px] text-zinc-500 mt-0.5">{mutedChats.has(activeChatId) ? 'Disabled' : 'Enabled'}</p>
</div>
<div className={`w-9 h-5 rounded-full relative transition-colors ${!mutedChats.has(activeChatId) ? 'bg-[#F97316]' : 'bg-zinc-700'}`}>
<div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${!mutedChats.has(activeChatId) ? 'translate-x-4' : 'translate-x-0'}`} />
</div>
</div>
</div>

{currentChatObject?.type === 'group' && !isEditingGroupInfo && (
<div className="mt-4 pt-2 border-t border-white/5">
<div className="px-4 py-2 text-zinc-500 text-[13px] font-medium tracking-wide">
{currentChatObject.participants?.length} Members
</div>

{currentChatObject.createdBy === user.uid && (
<div className="px-2">
<button
onClick={() => setIsAddMemberModalOpen(true)}
className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
>
<div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
<UserPlus size={18} />
</div>
<span className="text-[#F97316] text-[14px] font-bold">Add Members</span>
</button>
</div>
)}

<div className="px-2">
{currentChatObject.participants.map(uid => (
<GroupMemberRow
key={uid}
userId={uid}
isAdmin={currentChatObject.createdBy === uid}
isViewerAdmin={currentChatObject.createdBy === user.uid}
onRemove={handleRemoveMember}
onMute={handleToggleMemberMute}
isMuted={currentChatObject.mutedParticipants?.includes(uid)}
/>
))}
</div>
</div>
)}

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
<div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
<button onClick={() => { if(groupStep===2) setGroupStep(1); else setIsGroupModalOpen(false); }} className="text-zinc-400 hover:text-white"><ChevronLeft size={24} /></button>
<h3 className="font-bold text-white">{groupStep === 1 ? 'New Group' : 'Name Group'}</h3>
<div className="w-6" />
</div>

{groupStep === 1 && (
<div className="flex-1 overflow-y-auto p-2">
{savedContacts.length === 0 ? (
<div className="text-center py-10 text-zinc-500">No contacts found.<br/>Scan a QR code to add friends.</div>
) : (
savedContacts.map(contact => (
<div key={contact.uid} onClick={() => toggleGroupMember(contact.uid)} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${groupMembers.has(contact.uid) ? 'bg-[#F97316] border-[#F97316]' : 'border-zinc-600'}`}>
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
className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#F97316] transition-colors text-center font-bold text-lg"
/>
<div className="text-center text-xs text-zinc-500">{groupMembers.size} members selected</div>
</div>
)}

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
className="w-full py-3 bg-[#F97316] text-white font-bold rounded-xl disabled:opacity-50 transition-all active:scale-95"
>
Create Group
</button>
)}
</div>
</div>
</div>
)}

{/* OVERLAY: ADD MEMBER MODAL */}
{isAddMemberModalOpen && (
<div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
<div className="absolute inset-0" onClick={() => setIsAddMemberModalOpen(false)} />
<div className="bg-[#1c1c1d] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 zoom-in-95 duration-200 border border-white/10">
<div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
<button onClick={() => setIsAddMemberModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
<h3 className="font-bold text-white">Add People</h3>
<div className="w-6" />
</div>
<div className="flex-1 overflow-y-auto p-2">
{savedContacts.filter(c => !currentChatObject?.participants.includes(c.uid)).length === 0 ? (
<div className="text-center py-10 text-zinc-500">No new contacts to add.</div>
) : (
savedContacts.filter(c => !currentChatObject?.participants.includes(c.uid)).map(contact => (
<div key={contact.uid} onClick={() => handleAddMemberToGroup(contact.uid)} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
<div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
{contact.photoURL ? <img src={contact.photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">🤖</div>}
</div>
<div className="flex-1 min-w-0">
<div className="font-bold text-white truncate">{contact.displayName}</div>
<div className="text-xs text-zinc-500 truncate">{contact.handle}</div>
</div>
<div className="w-8 h-8 flex items-center justify-center text-[#F97316]"><UserPlus size={20} /></div>
</div>
))
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
<div className="absolute inset-0" onClick={() => setShowBlockModal(false)} />

<div className="relative w-full max-w-sm mx-auto p-4 z-10 animate-in slide-in-from-bottom duration-300 md:animate-in md:zoom-in-95 md:duration-200">
<div className="flex flex-col gap-2">
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

{/* OVERLAY: TELEGRAM STYLE IMAGE PREVIEW MODAL */}
{imageUrl && (
<div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
{/* Click outside to cancel */}
<div className="absolute inset-0" onClick={() => { setImageUrl(''); setTranscript(''); setOriginalFile(null); }} />

{/* Modal Container: w-fit ensures it shrinks to image width, min-w-[320px] ensures text field is usable */}
<div className="bg-[#1c1c1d] rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col animate-in zoom-in-95 duration-200 border border-white/10 w-fit max-w-[95vw] min-w-[320px]">

{/* Floating Close Button */}
<div className="absolute top-2 right-2 z-20">
<button onClick={() => { setImageUrl(''); setTranscript(''); setOriginalFile(null); }} className="w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors">
<X size={16} />
</button>
</div>

{/* Image Area: auto width/height to dictate container size */}
<div className="relative bg-black flex items-center justify-center overflow-hidden">
<img src={imageUrl} className="max-w-full max-h-[65vh] w-auto h-auto object-contain" alt="Preview" />
</div>

{/* Footer Area */}
<div className="p-4 space-y-4 bg-[#1c1c1d]">

{/* Checkbox - Changed to BLUE to remove orange */}
<div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsCompressionEnabled(!isCompressionEnabled)}>
<div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isCompressionEnabled ? 'bg-blue-500' : 'bg-zinc-700 border border-zinc-500'}`}>
{isCompressionEnabled && <Check size={14} className="text-white" strokeWidth={3} />}
</div>
<span className="text-white font-medium text-sm select-none">Compress the image</span>
</div>

{/* Caption Input - White border focus instead of orange */}
<div className="relative">
<input
autoFocus
type="text"
value={transcript}
onChange={(e) => setTranscript(e.target.value)}
placeholder="Add a caption..."
className="w-full bg-transparent border-b border-zinc-700 text-white pb-2 focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500 text-[16px]"
onKeyDown={(e) => {
if (e.key === 'Enter') {
handleMainAction();
}
}}
/>
</div>

{/* Footer Buttons */}
<div className="flex justify-between items-center pt-1">
{/* Cancel - Zinc instead of orange */}
<button
onClick={() => { setImageUrl(''); setTranscript(''); setOriginalFile(null); }}
className="text-zinc-400 font-medium text-sm hover:text-white transition-colors px-2"
>
Cancel
</button>

{/* Send - ROUND BUTTON with Arrow */}
<button
onClick={handleMainAction}
className="w-12 h-12 rounded-full bg-[#F97316] text-white flex items-center justify-center hover:bg-[#EA580C] transition-all active:scale-95 shadow-lg shadow-orange-900/20"
>
<ArrowUp size={24} strokeWidth={3} />
</button>
</div>
</div>
</div>
</div>
)}

<style>{`
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

@keyframes pulse {
0% { transform: scale(1); }
50% { transform: scale(1.08); }
100% { transform: scale(1); }
}

@keyframes pulse-glow {
0% { opacity: 0.4; transform: scale(1); }
50% { opacity: 0.8; transform: scale(1.2); }
100% { opacity: 0.4; transform: scale(1); }
}

@keyframes pulse-pill {
0% { opacity: 0.3; transform: scale(1); }
50% { opacity: 0.7; transform: scale(1.1); }
100% { opacity: 0.3; transform: scale(1); }
}
// ... styles ...
`}</style>
</div>
);
}

export default App;