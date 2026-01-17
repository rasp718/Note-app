import React from 'react';
import { useUser } from '../useFirebaseSync';
import { Users } from 'lucide-react';
import { getDateLabel } from '../utils';

export const ChatListItem = ({ chat, active, isEditing, onSelect, onClick, index }: any) => {
  // If it's a DM, we need to fetch the other user's profile
  // If it's a group, we just skip this hook (or pass null)
  const isGroup = chat.type === 'group';
  const otherUser = useUser(isGroup ? null : chat.otherUserId);

  // DECIDE DISPLAY DATA
  const displayName = isGroup ? chat.displayName : (otherUser?.displayName || 'Unknown');
  const photoURL = isGroup ? null : otherUser?.photoURL;
  const isOnline = !isGroup && otherUser?.isOnline;
  
  // PREVIEW TEXT
  const lastMessage = chat.lastMessageText || (isGroup ? 'Group created' : 'Chat started');
  const timeLabel = chat.lastMessageTimestamp ? getDateLabel(chat.lastMessageTimestamp) : '';

  return (
    <div 
      onClick={isEditing ? onSelect : onClick}
      className={`relative mx-3 p-3 rounded-2xl flex items-center gap-4 transition-all duration-200 cursor-pointer group 
        ${active ? 'bg-white/10' : 'hover:bg-white/5'}
        ${isEditing ? 'pl-12' : ''}
      `}
    >
        {/* EDITING CHECKBOX */}
        {isEditing && (
            <div className={`absolute left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-[#DA7756] border-[#DA7756]' : 'border-zinc-600'}`}>
                {active && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
            </div>
        )}

        {/* AVATAR */}
        <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                {isGroup ? (
                    // GROUP ICON
                    <div className="flex items-center justify-center w-full h-full bg-zinc-800">
                        <Users size={24} className="text-zinc-400" />
                    </div>
                ) : photoURL ? (
                    // USER PHOTO
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                    // USER INITIAL
                    <span className="text-xl font-bold text-zinc-500">{displayName[0]}</span>
                )}
            </div>
            
            {/* ONLINE INDICATOR (Only for DMs) */}
            {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                </div>
            )}
        </div>

        {/* TEXT CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <div className="flex justify-between items-baseline">
                <h3 className="font-bold text-white text-[17px] leading-tight truncate pr-2">
                    {displayName}
                </h3>
                <span className={`text-[11px] font-medium tracking-wide ${chat.unreadCount > 0 ? 'text-[#DA7756]' : 'text-zinc-500'}`}>
                    {timeLabel}
                </span>
            </div>
            
            <div className="flex justify-between items-center">
                <p className={`text-[15px] truncate leading-snug ${chat.unreadCount > 0 ? 'text-white font-medium' : 'text-zinc-400'}`}>
                    {isGroup && !chat.lastMessageText && <span className="text-[#DA7756] text-xs uppercase tracking-wide font-bold mr-1">NEW</span>}
                    {lastMessage}
                </p>
                
                {/* UNREAD BADGE */}
                {chat.unreadCount > 0 && (
                    <div className="ml-2 bg-[#DA7756] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-orange-900/20">
                        {chat.unreadCount}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};