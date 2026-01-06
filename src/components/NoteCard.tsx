import React, { useState, useRef } from 'react';
import { Trash2, Pin, Volume2, Edit2 } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

interface NoteCardProps {
  note: Note;
  categories: CategoryConfig[];
  selectedVoice: SpeechSynthesisVoice | null;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onCategoryClick: (category: CategoryId) => void;
  onEdit: () => void;
  onToggleExpand: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  categories,
  selectedVoice,
  onDelete,
  onPin,
  onCategoryClick,
  onEdit,
  onToggleExpand
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // --- SWIPE LOGIC STATE ---
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const category = categories.find(c => c.id === note.category) || categories[0];
  const isHacker = category.label === 'Hacker' || category.label === 'Anon';
  const isSecret = category.id === 'secret' && !isHacker;

  // --- THEME CONFIG ---
  const CLAUDE_ORANGE = '#da7756'; // Warm terracotta orange
  
  const themeStyles = {
    // We use arbitrary values for the specific Claude Orange
    accentHover: isHacker ? 'hover:text-green-500' : isSecret ? 'hover:text-red-500' : `hover:text-[${CLAUDE_ORANGE}]`,
    accentText: isHacker ? 'text-green-500' : isSecret ? 'text-red-500' : `text-[${CLAUDE_ORANGE}]`,
    bodyText: 'text-zinc-300',
    dateText: isHacker ? 'text-green-500' : isSecret ? 'text-red-500' : `text-[${CLAUDE_ORANGE}]`,
    iconColor: 'text-zinc-500', 
    borderColor: isHacker ? 'border-green-900/50' : 'border-zinc-800'
  };

  const isExpanded = note.isExpanded !== false;
  const lines = note.text.split('\n');
  const isSingleLine = lines.length === 1 && !note.imageUrl && !isExpanded;
  const isCompact = lines.length === 1 && !note.imageUrl;

  const handleSpeakNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(note.text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- TOUCH HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Ignore vertical scrolling
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // Swiping Left (Negative X)
    if (diffX < 0) {
      if (e.cancelable && Math.abs(diffX) > 10) e.preventDefault();
      setIsSwiping(true);
      setSwipeOffset(Math.max(diffX, -200));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -100) {
      onDelete(note.id);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const paddingClass = isCompact ? 'px-3 py-2' : 'p-3';

  // Determine Background Color for Swipe Action
  const deleteBgClass = isHacker ? 'bg-green-600' : `bg-[${CLAUDE_ORANGE}]`;

  return (
    <div className="relative w-full md:w-fit md:max-w-full overflow-hidden rounded-xl group">
      
      {/* Background Layer (Swipe Indicator) */}
      <div className={`absolute inset-0 ${deleteBgClass} flex items-center justify-end pr-6 rounded-xl transition-opacity duration-200 ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`}>
        <Trash2 className="text-white animate-pulse" size={24} />
      </div>

      {/* Foreground Layer (Card) */}
      <div 
        className={`bg-zinc-900 border rounded-xl ${paddingClass} hover:border-zinc-700 relative w-full ${themeStyles.borderColor}`}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isExpanded ? (
          <div className="flex flex-col gap-2">
            {/* Header Line */}
            <div className="flex items-center justify-between gap-2 w-full flex-shrink-0 h-6">
               <div className="flex items-center gap-2">
                  <button onClick={() => onCategoryClick(note.category)} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black border hover:border-zinc-700 transition-all ${themeStyles.borderColor}`}>
                    <span className="text-xs grayscale">{category.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">{category.label}</span>
                  </button>
               </div>
               
               {/* Action Icons - Invisible until group hover */}
               <div className="flex items-center gap-3 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Edit"><Edit2 size={14} /></button>
                  <button onClick={handleSpeakNote} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Speak"><Volume2 size={14} /></button>
                  <button onClick={() => onPin(note.id)} className={`transition-all ${note.isPinned ? themeStyles.accentText : `${themeStyles.iconColor} ${themeStyles.accentHover}`}`} title="Pin"><Pin size={14} fill={note.isPinned ? "currentColor" : "none"} /></button>
                  <button onClick={() => onDelete(note.id)} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Delete"><Trash2 size={14} /></button>
               </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2 items-start w-full">
                {note.imageUrl && (
                  <div className={`mb-1 rounded-lg overflow-hidden border bg-zinc-950 flex justify-center max-w-full self-end ${themeStyles.borderColor}`}>
                    <img src={note.imageUrl} alt="Note attachment" className="w-full md:w-auto h-auto md:max-h-96 object-contain" />
                  </div>
                )}
                {note.text && (
                  <div className="w-full">
                    <p className={`text-base leading-relaxed whitespace-pre-wrap break-words text-left inline-block w-full ${themeStyles.bodyText}`}>
                      {note.text}
                      <span className={`float-right ml-2 mt-1 text-[10px] uppercase tracking-wider select-none font-medium ${themeStyles.dateText}`}>
                        {formatDate(note.date)}
                      </span>
                    </p>
                  </div>
                )}
            </div>
          </div>
        ) : (
          // Collapsed View
           isSingleLine ? (
              <div className="flex items-center justify-between gap-2">
                 <button onClick={() => onCategoryClick(note.category)} className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-black/50 border hover:border-zinc-700 transition-all ${themeStyles.borderColor}`}>
                    <span className="text-[10px] grayscale">{category.emoji}</span>
                 </button>
                 <div className="flex-1 min-w-0" onClick={() => onToggleExpand(note.id)}>
                    <p className={`text-base truncate cursor-pointer text-left ${themeStyles.bodyText}`}>{lines[0]}</p>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${themeStyles.dateText}`}>{formatDate(note.date)}</span>
                 </div>
              </div>
            ) : (
              <div className="flex gap-2">
                 <div className="flex flex-col justify-center">
                   <button onClick={() => onCategoryClick(note.category)} className={`w-5 h-5 flex items-center justify-center rounded-full bg-black/50 border hover:border-zinc-700 transition-all ${themeStyles.borderColor}`}>
                     <span className="text-[10px] grayscale">{category.emoji}</span>
                   </button>
                 </div>
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div onClick={() => onToggleExpand(note.id)} className="cursor-pointer">
                       <p className={`text-base leading-tight truncate mb-1 text-left ${themeStyles.bodyText}`}>
                         {lines[0] || <span className="italic opacity-50">Attachment</span>}
                       </p>
                       {lines.length > 1 && <p className={`text-sm leading-snug truncate text-left opacity-70 ${themeStyles.bodyText}`}>{lines[1]}</p>}
                    </div>
                 </div>
                 {note.imageUrl && (
                   <div className={`flex-shrink-0 w-12 h-10 rounded bg-zinc-800 border overflow-hidden ${themeStyles.borderColor}`}>
                     <img src={note.imageUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                 )}
                 <div className="flex flex-col justify-center items-end gap-1 flex-shrink-0">
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${themeStyles.dateText}`}>{formatDate(note.date)}</span>
                 </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};