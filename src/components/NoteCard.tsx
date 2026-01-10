import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pin, Volume2, Edit2, CornerUpRight, Copy } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

// --- TELEGRAM-STYLE MENU ITEM ---
const ContextMenuItem = ({ 
  icon: Icon, 
  label, 
  onClick, 
  accentColor
}: { 
  icon: React.ElementType, 
  label: string, 
  onClick: () => void, 
  accentColor: string
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      // Use onPointerDown to ensure immediate response on mobile before any ghost clicks
      onPointerDown={(e) => {
        e.preventDefault(); 
        e.stopPropagation();
        onClick();
      }}
      // Keep onClick for desktop/accessibility backup
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors duration-150 cursor-pointer select-none active:bg-white/10"
      style={{ 
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent' 
      }}
    >
      <Icon 
        size={18} 
        style={{ 
          color: isHovered ? accentColor : '#a1a1aa',
          transition: 'color 0.15s ease'
        }} 
      />
      <span 
        className="font-medium"
        style={{ 
          color: isHovered ? accentColor : '#f4f4f5',
          transition: 'color 0.15s ease'
        }}
      >
        {label}
      </span>
    </button>
  );
};

// --- HEADER ICON BUTTON ---
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
      type="button"
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
  
  // --- CONTEXT MENU STATE ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // --- SWIPE & TOUCH LOGIC STATE ---
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false); // Flag to prevent swipe after long press

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

  // Close menu on click outside
  useEffect(() => {
    const closeMenu = (e: Event) => {
      // Don't close if scrolling (optional, but good for mobile UX)
      if (e.type === 'scroll') return;
      setContextMenu(null);
    };

    if (contextMenu) {
      // Timeout prevents the immediate touch event that opened the menu from closing it
      setTimeout(() => {
        window.addEventListener('click', closeMenu);
        window.addEventListener('touchstart', closeMenu);
        window.addEventListener('scroll', closeMenu, { capture: true });
        window.addEventListener('resize', closeMenu);
      }, 200);
    }
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('touchstart', closeMenu);
      window.removeEventListener('scroll', closeMenu, { capture: true });
      window.removeEventListener('resize', closeMenu);
    };
  }, [contextMenu]);

  const handleSpeakNote = (e?: React.MouseEvent) => {
    e?.stopPropagation(); 
    if ('speechSynthesis' in window) {
      if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(note.text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // --- RIGHT CLICK HANDLER (Laptop) ---
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    openMenu(e.clientX, e.clientY);
  };

  // --- OPEN MENU LOGIC ---
  const openMenu = (clientX: number, clientY: number) => {
    // Attempt Haptic Feedback (Android only usually)
    if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(50); } catch(e) {}
    }

    const menuW = 200;
    const menuH = 260; // Increased slighty
    let x = clientX;
    let y = clientY;

    // Safety checks
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20;
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    setContextMenu({ x, y });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- TOUCH HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only track single finger touches
    if (e.targetTouches.length !== 1) return;

    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    setIsSwiping(false);
    isLongPress.current = false;

    // Start Long Press Timer
    longPressTimer.current = setTimeout(() => {
        if (touchStartX.current && touchStartY.current) {
            isLongPress.current = true; // Mark as long press so we don't click/swipe later
            openMenu(touchStartX.current, touchStartY.current);
        }
    }, 600); 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // If moved significantly, cancel long press
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }

    if (isLongPress.current) return; // Don't swipe if menu is open/opening

    // Swipe Logic (Horizontal only)
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    if (diffX < 0) {
      // if (e.cancelable && Math.abs(diffX) > 10) e.preventDefault(); // Optional: lock scroll
      setIsSwiping(true);
      setSwipeOffset(Math.max(diffX, -200));
    }
  };

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }

    // If it was a long press, don't do swipe actions or click actions
    if (isLongPress.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
    }

    if (swipeOffset < -100) onDelete(note.id);
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const paddingClass = isCompact ? 'px-3 py-2' : 'p-3';

  return (
    <>
      <div 
        className="relative w-fit max-w-[88%] md:max-w-full overflow-visible rounded-xl group"
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
        onContextMenu={handleContextMenu}
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
                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-black border" style={{ borderColor: borderColor }}>
                      <span className="text-[10px] grayscale">{category.emoji}</span>
                    </div>
                 </div>
                 
                 {/* Desktop Action Icons */}
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

      {/* --- TELEGRAM STYLE DROPDOWN (Rendered in Portal) --- */}
      {contextMenu && createPortal(
        <div 
          className="fixed z-[9999] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x,
            backgroundColor: 'rgba(24, 24, 27, 0.95)', // Deep dark zinc
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)'
          }}
          // CRITICAL: Stop propagation here so touches inside menu don't trigger the window listener to close it
          onClick={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()} 
        >
          <ContextMenuItem 
            icon={CornerUpRight} 
            label="Reply" 
            onClick={() => { handleCopy(); setContextMenu(null); }} 
            accentColor={accentColor} 
          />
          <ContextMenuItem 
            icon={Edit2} 
            label="Edit" 
            onClick={() => { onEdit(); setContextMenu(null); }} 
            accentColor={accentColor} 
          />
          <ContextMenuItem 
            icon={Pin} 
            label={note.isPinned ? "Unpin" : "Pin"} 
            onClick={() => { onPin(note.id); setContextMenu(null); }} 
            accentColor={accentColor} 
          />
          <ContextMenuItem 
            icon={Volume2} 
            label="Play" 
            onClick={() => { handleSpeakNote(); setContextMenu(null); }} 
            accentColor={accentColor} 
          />
          <div className="h-px bg-white/10 mx-3 my-1" />
          <ContextMenuItem 
            icon={Trash2} 
            label="Delete" 
            onClick={() => { onDelete(note.id); setContextMenu(null); }} 
            accentColor={accentColor}
          />
        </div>,
        document.body
      )}
    </>
  );
};