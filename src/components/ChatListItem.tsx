// src/components/ChatListItem.tsx
import React from 'react';
import { Check } from 'lucide-react';
import { useUser } from '../useFirebaseSync'; // Adjust path based on your folder structure
import { getDateLabel, normalizeDate } from '../utils';

export const ChatListItem = ({ chat, active, isEditing, onSelect, onClick, index }: any) => {
    const otherUser = useUser(chat.otherUserId);
    const displayName = otherUser?.displayName || 'Unknown';
    const photoURL = otherUser?.photoURL;
    const initial = displayName ? displayName[0].toUpperCase() : '?';
    const safeDate = getDateLabel(normalizeDate(chat.timestamp));

    return (
        <div onClick={isEditing ? onSelect : onClick} style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'backwards' }} className={`mx-3 px-3 py-4 flex gap-4 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent animate-in slide-in-from-right-8 fade-in duration-500 ${active ? 'bg-white/10 border-white/5' : 'hover:bg-white/5'}`}>
            {isEditing && ( <div className="flex items-center justify-center animate-in slide-in-from-left-2 fade-in duration-200"> <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${active ? 'bg-[#da7756] border-[#da7756] scale-110' : 'border-zinc-700 bg-black/40'}`}> {active && <Check size={14} className="text-white" strokeWidth={4} />} </div> </div> )}
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-lg shadow-black/30 overflow-hidden relative">
                {photoURL ? (<img src={photoURL} className="w-full h-full object-cover" alt="avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />) : null}
                <span className={`absolute ${photoURL ? '-z-10' : ''}`}>{initial}</span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <div className="flex justify-between items-baseline"> <span className="font-bold text-white text-base tracking-tight truncate">{displayName}</span> <span className="text-[10px] text-zinc-500 font-mono">{safeDate}</span> </div>
                <div className="flex justify-between items-center"> <span className="text-zinc-400 text-sm truncate opacity-70">{chat.lastMessage}</span> </div>
            </div>
        </div>
    );
};