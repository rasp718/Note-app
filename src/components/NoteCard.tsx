import React, { useState, useRef } from 'react';
import { Trash2, Pin, Volume2, Edit2 } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

// --- HELPER COMPONENT FOR ICONS ---
const NoteActionButton = ({ 
  onClick, 
  icon: Icon, 
  label, 
  accentColor, 
  isActive = false 
}: { 
  onClick: (e: React.MouseEvent) => void, 
  icon: React.ElementType, 
  label: string, 
  accentColor: string, 
  isActive?: boolean 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="transition-colors duration-200"
      style={{ color: isHovered || isActive ? accentColor : '#71717a' }} 
      title={label}
    >
      <Icon size={14} fill={isActive ? "currentColor" : "none"} />
    </button>
  );
};

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
  const [isCardHovered, setIsCardHovered] = useState(false);
  
  // --- SWIPE LOGIC STATE ---
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const category = categories.find(c => c.id === note.category) || categories[0];
  const isHacker = category.label === 'Hacker' || category.label === 'Anon';
  const isSecret = category.id === 'secret' && !isHacker;

  // --- THEME ---
  const CLAUDE_ORANGE = '#da7756';
  const HACKER_GREEN = '#4ade80';

  const accentColor = isHacker ? HACKER_GREEN : isSecret ? '#ef4444' : CLAUDE_ORANGE;
  const borderColor = isHacker ? 'rgba(74, 222, 128, 0.2)' : '#27272a'; 

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

    if (Math.abs(diffY) > Math.abs(diffX)) return;

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

  return (
    <div 
      className="relative w-fit max-w-[88%] md:max-w-full overflow-hidden rounded-xl group"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      
      {/* Background Layer (Swipe Indicator) */}
      <div 
        className={`absolute inset-0 flex items-center justify-end pr-6 rounded-xl transition-opacity duration-200 ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: isHacker ? '#16a34a' : CLAUDE_ORANGE }} 
      >
        <Trash2 className="text-white animate-pulse" size={24} />
      </div>

      {/* Foreground Layer (Card) */}
      <div 
        className={`bg-zinc-900 border rounded-xl ${paddingClass} hover:border-zinc-700 relative w-full`}
        style={{ 
          borderColor: borderColor,
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
                  {/* Category Pill - Icon Only now */}
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-black border" style={{ borderColor: borderColor }}>
                    <span className="text-[10px] grayscale">{category.emoji}</span>
                  </div>
               </div>
               
               {/* Action Icons */}
               <div className="flex items-center gap-3 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <NoteActionButton onClick={onEdit} icon={Edit2} label="Edit" accentColor={accentColor} />
                  <NoteActionButton onClick={handleSpeakNote} icon={Volume2} label="Speak" accentColor={accentColor} />
                  <NoteActionButton onClick={() => onPin(note.id)} icon={Pin} label="Pin" accentColor={accentColor} isActive={note.isPinned} />
                  <NoteActionButton onClick={() => onDelete(note.id)} icon={Trash2} label="Delete" accentColor={accentColor} />
               </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2 items-start w-full">
                {note.imageUrl && (
                  <div className="mb-1 rounded-lg overflow-hidden border bg-zinc-950 flex justify-center max-w-full self-end" style={{ borderColor: borderColor }}>
                    <img src={note.imageUrl} alt="Note attachment" className="w-full md:w-auto h-auto md:max-h-96 object-contain" />
                  </div>
                )}
                {note.text && (
                  <div className="w-full">
                    <p className="text-base leading-relaxed whitespace-pre-wrap break-words text-left inline-block w-full text-zinc-300">
                      {note.text}
                      <span className="float-right ml-2 mt-1 text-[10px] uppercase tracking-wider select-none font-medium" style={{ color: accentColor }}>
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
                 <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-black/50 border" style={{ borderColor: borderColor }}>
                    <span className="text-[10px] grayscale">{category.emoji}</span>
                 </div>
                 <div className="flex-1 min-w-0" onClick={() => onToggleExpand(note.id)}>
                    <p className="text-base truncate cursor-pointer text-left text-zinc-300">{lines[0]}</p>
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: accentColor }}>{formatDate(note.date)}</span>
                 </div>
              </div>
            ) : (
              <div className="flex gap-2">
                 <div className="flex flex-col justify-center">
                   <div className="w-5 h-5 flex items-center justify-center rounded-full bg-black/50 border" style={{ borderColor: borderColor }}>
                     <span className="text-[10px] grayscale">{category.emoji}</span>
                   </div>
                 </div>
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div onClick={() => onToggleExpand(note.id)} className="cursor-pointer">
                       <p className="text-base leading-tight truncate mb-1 text-left text-zinc-300">
                         {lines[0] || <span className="italic opacity-50">Attachment</span>}
                       </p>
                       {lines.length > 1 && <p className="text-sm leading-snug truncate text-left opacity-70 text-zinc-300">{lines[1]}</p>}
                    </div>
                 </div>
                 {note.imageUrl && (
                   <div className="flex-shrink-0 w-12 h-10 rounded bg-zinc-800 border overflow-hidden" style={{ borderColor: borderColor }}>
                     <img src={note.imageUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                 )}
                 <div className="flex flex-col justify-center items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: accentColor }}>{formatDate(note.date)}</span>
                 </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};