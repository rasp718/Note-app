import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pin, Volume2, Edit2, CornerUpRight } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

// --- HELPER: WEB HAPTIC FEEDBACK ---
const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(15); } catch (e) {}
  }
};

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
  const handleAction = () => { triggerHaptic(); onClick(); };

  return (
    <button
      type="button"
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(); }}
      onClick={(e) => { e.stopPropagation(); handleAction(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors duration-150 cursor-pointer select-none active:bg-white/10"
      style={{ backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }}
    >
      <Icon size={18} style={{ color: isHovered ? accentColor : '#a1a1aa', transition: 'color 0.15s ease' }} />
      <span className="font-medium" style={{ color: isHovered ? accentColor : '#f4f4f5', transition: 'color 0.15s ease' }}>{label}</span>
    </button>
  );
};

// --- INLINE ACTION BUTTON (Updated: Gray by default, Color on Hover) ---
const InlineActionButton = ({ onClick, icon: Icon, accentColor }: { onClick: (e: React.MouseEvent) => void, icon: React.ElementType, accentColor: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); triggerHaptic(); onClick(e); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="p-1 rounded-full transition-colors active:scale-90"
      style={{ color: isHovered ? accentColor : '#71717a' }} // Gray default, Accent on hover
    >
      <Icon size={12} />
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

export const NoteCard: React.FC<NoteCardProps> = ({ note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onToggleExpand }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false); 

  const category = categories.find(c => c.id === note.category) || categories[0];
  const isHacker = category.label === 'Hacker' || category.label === 'Anon';
  const isSecret = category.id === 'secret' && !isHacker;
  const CLAUDE_ORANGE = '#da7756';
  const HACKER_GREEN = '#4ade80';
  const accentColor = isHacker ? HACKER_GREEN : isSecret ? '#ef4444' : CLAUDE_ORANGE;
  const borderColor = isHacker ? 'rgba(74, 222, 128, 0.2)' : '#27272a'; 
  const isExpanded = note.isExpanded !== false;
  const lines = note.text.split('\n');
  const isSingleLine = lines.length === 1 && !note.imageUrl && !isExpanded;
  const isCompact = lines.length === 1 && !note.imageUrl;

  useEffect(() => {
    const closeMenu = (e: Event) => { if (e.type === 'scroll') return; setContextMenu(null); };
    if (contextMenu) {
      setTimeout(() => {
        window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu);
        window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu);
      }, 200);
    }
    return () => {
      window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu);
      window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu);
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

  const handleCopy = async () => { try { await navigator.clipboard.writeText(note.text); } catch (err) {} };
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); openMenu(e.clientX, e.clientY); };
  const openMenu = (clientX: number, clientY: number) => {
    triggerHaptic();
    const menuW = 200; const menuH = 260; 
    let x = clientX; let y = clientY;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20;
    if (x < 10) x = 10; if (y < 10) y = 10;
    setContextMenu({ x, y });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleCategoryClick = (e: React.MouseEvent) => { e.stopPropagation(); triggerHaptic(); onCategoryClick(note.category); };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.targetTouches.length !== 1) return;
    touchStartX.current = e.targetTouches[0].clientX; touchStartY.current = e.targetTouches[0].clientY;
    setIsSwiping(false); isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
        if (touchStartX.current && touchStartY.current) { isLongPress.current = true; openMenu(touchStartX.current, touchStartY.current); }
    }, 600); 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const currentX = e.targetTouches[0].clientX; const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - touchStartX.current; const diffY = currentY - touchStartY.current;
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }
    if (isLongPress.current) return; 
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (diffX < 0) { setIsSwiping(true); setSwipeOffset(Math.max(diffX, -200)); }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (isLongPress.current) { touchStartX.current = null; touchStartY.current = null; return; }
    if (swipeOffset < -100) { triggerHaptic(); onDelete(note.id); }
    setSwipeOffset(0); setIsSwiping(false); touchStartX.current = null; touchStartY.current = null;
  };

  const paddingClass = isCompact ? 'px-3 py-2' : 'p-2'; 

  return (
    <>
      <div className="relative w-fit max-w-[88%] md:max-w-full overflow-visible rounded-xl group" onContextMenu={handleContextMenu}>
        
        {/* Swipe Indicator */}
        <div className={`absolute inset-0 flex items-center justify-end pr-6 rounded-xl transition-opacity duration-200 ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: isHacker ? '#16a34a' : CLAUDE_ORANGE }}>
          <Trash2 className="text-white animate-pulse" size={24} />
        </div>

        <div className={`bg-zinc-900 border rounded-xl ${paddingClass} hover:border-zinc-700 relative w-full`} style={{ borderColor: borderColor, transform: `translateX(${swipeOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.3s ease-out' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {isExpanded ? (
            // EXPANDED VIEW
            <div className="flex flex-col gap-1">
              {note.imageUrl && (
                <div className="mb-1 rounded-lg overflow-hidden border bg-zinc-950 flex justify-center max-w-full" style={{ borderColor: borderColor }}>
                  <img src={note.imageUrl} alt="Note attachment" className="w-full md:w-auto h-auto md:max-h-96 object-contain" />
                </div>
              )}

              {/* Flex Container to allow wrapping: Text Left, Icons/Time Right */}
              <div className="flex flex-wrap items-end justify-between gap-x-2 w-full">
                  {/* Text */}
                  {note.text && (
                    <p className="text-base leading-snug whitespace-pre-wrap break-words text-left text-zinc-300">
                      {note.text}
                    </p>
                  )}

                  {/* Footer Row: [Edit] [Play] [Time] [Category] - Floats right or stays inline */}
                  <div className="flex items-center gap-1 ml-auto pb-0.5">
                      <InlineActionButton onClick={onEdit} icon={Edit2} accentColor={accentColor} />
                      <InlineActionButton onClick={handleSpeakNote} icon={Volume2} accentColor={accentColor} />
                      
                      {/* Timestamp */}
                      <span className="text-[10px] uppercase tracking-wider font-medium ml-1" style={{ color: accentColor }}>
                        {formatTime(note.date)}
                      </span>

                      {/* Category Icon */}
                      <button onClick={handleCategoryClick} className="w-4 h-4 flex items-center justify-center rounded-full bg-black/50 border active:scale-90 transition-transform cursor-pointer ml-1" style={{ borderColor: borderColor }}>
                        <span className="text-[9px] grayscale">{category.emoji}</span>
                      </button>
                  </div>
              </div>
            </div>
          ) : (
             isSingleLine ? (
                // Compact Single Line
                <div className="flex items-center justify-between gap-2">
                   <div className="flex-1 min-w-0" onClick={() => onToggleExpand(note.id)}>
                      <p className="text-base truncate cursor-pointer text-left text-zinc-300">{lines[0]}</p>
                   </div>
                   
                   <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: accentColor }}>{formatTime(note.date)}</span>
                      <button onClick={handleCategoryClick} className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full bg-black/50 border active:scale-90 transition-transform cursor-pointer" style={{ borderColor: borderColor }}>
                          <span className="text-[9px] grayscale">{category.emoji}</span>
                       </button>
                   </div>
                </div>
              ) : (
                // Compact Multi Line
                <div className="flex gap-2">
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
                      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: accentColor }}>{formatTime(note.date)}</span>
                      <button onClick={handleCategoryClick} className="w-4 h-4 flex items-center justify-center rounded-full bg-black/50 border active:scale-90 transition-transform cursor-pointer" style={{ borderColor: borderColor }}>
                         <span className="text-[9px] grayscale">{category.emoji}</span>
                      </button>
                   </div>
                </div>
              )
          )}
        </div>
      </div>
      {contextMenu && createPortal(
        <div className="fixed z-[9999] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10" style={{ top: contextMenu.y, left: contextMenu.x, backgroundColor: 'rgba(24, 24, 27, 0.95)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { handleCopy(); setContextMenu(null); }} accentColor={accentColor} />
          <ContextMenuItem icon={Edit2} label="Edit" onClick={() => { onEdit(); setContextMenu(null); }} accentColor={accentColor} />
          <ContextMenuItem icon={Pin} label={note.isPinned ? "Unpin" : "Pin"} onClick={() => { onPin(note.id); setContextMenu(null); }} accentColor={accentColor} />
          <ContextMenuItem icon={Volume2} label="Play" onClick={() => { handleSpeakNote(); setContextMenu(null); }} accentColor={accentColor} />
          <div className="h-px bg-white/10 mx-3 my-1" />
          <ContextMenuItem icon={Trash2} label="Delete" onClick={() => { onDelete(note.id); setContextMenu(null); }} accentColor={accentColor} />
        </div>, document.body
      )}
    </>
  );
};