import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pin, Volume2, Edit2, CornerUpRight } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

// ... (Keep helper functions like triggerHaptic, ContextMenuItem, InlineActionButton as they were) ...
// --- HELPER: WEB HAPTIC FEEDBACK ---
const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(15); } catch (e) {}
  }
};

// --- CONTEXT MENU ITEM ---
const ContextMenuItem = ({ icon: Icon, label, onClick, accentColor }: any) => {
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
      <Icon size={18} style={{ color: isHovered ? accentColor : '#a1a1aa' }} />
      <span className="font-medium" style={{ color: isHovered ? accentColor : '#f4f4f5' }}>{label}</span>
    </button>
  );
};

// --- INLINE ACTION BUTTON ---
const InlineActionButton = ({ onClick, icon: Icon, accentColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); triggerHaptic(); onClick(e); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="p-1 rounded-full transition-colors active:scale-90 align-middle"
      style={{ color: isHovered ? accentColor : '#71717a' }}
    >
      <Icon size={12} />
    </button>
  );
};

interface NoteCardProps {
  note: Note;
  categories: CategoryConfig[];
  selectedVoice: SpeechSynthesisVoice | null;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onCategoryClick?: (category: CategoryId) => void;
  onEdit?: () => void;
  onToggleExpand?: (id: string) => void;
  variant?: 'default' | 'sent' | 'received';
  customColors?: { bg: string; border: string; text: string };
}

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onToggleExpand,
  variant = 'default', customColors 
}) => {
  if (!note) return null;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false); 

  const safeCategories = Array.isArray(categories) ? categories : [];
  const defaultCat = { id: 'default', label: 'Note', emoji: '📝', colorClass: 'bg-zinc-500' };
  const category = safeCategories.find((c: any) => c?.id === note.category) || safeCategories[0] || defaultCat;

  const isHacker = category?.label === 'Hacker' || category?.label === 'Anon';
  const isSecret = category?.id === 'secret' && !isHacker;
  const CLAUDE_ORANGE = '#da7756';
  const HACKER_GREEN = '#4ade80';
  const accentColor = isHacker ? HACKER_GREEN : isSecret ? '#ef4444' : CLAUDE_ORANGE;
  
  const borderColor = customColors?.border || (isHacker ? 'rgba(74, 222, 128, 0.2)' : '#27272a'); 
  const bgColor = customColors?.bg || 'bg-zinc-900';
  const textColor = customColors?.text || 'text-zinc-300';
  
  const isExpanded = !!note.isExpanded;
  const safeText = String(note.text || '');
  const lines = safeText.split('\n');
  const isCompact = lines.length === 1 && !note.imageUrl;
  
  // --- HANDLERS (Same as before) ---
  useEffect(() => {
    const closeMenu = (e: any) => { if (e.type === 'scroll') return; setContextMenu(null); };
    if (contextMenu) { setTimeout(() => { window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu); window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu); }, 200); }
    return () => { window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu); window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu); };
  }, [contextMenu]);

  const handleSpeakNote = (e?: any) => { e?.stopPropagation(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; } const utterance = new SpeechSynthesisUtterance(safeText); if (selectedVoice) utterance.voice = selectedVoice; utterance.onend = () => setIsSpeaking(false); setIsSpeaking(true); window.speechSynthesis.speak(utterance); } };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(safeText); } catch (err) {} };
  const handleContextMenu = (e: any) => { e.preventDefault(); e.stopPropagation(); if(onDelete) openMenu(e.clientX, e.clientY); };
  
  const openMenu = (clientX: number, clientY: number) => {
    triggerHaptic();
    const menuW = 200; const menuH = 260; 
    let x = clientX; let y = clientY;
    if (typeof window !== 'undefined') { if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; }
    setContextMenu({ x: Math.max(10, x), y: Math.max(10, y) });
  };

  const formatTime = (timestamp: any) => {
    try {
        const t = Number(timestamp);
        if (isNaN(t) || t === 0) return '';
        // Changed to exclude seconds, simpler time format
        return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  const handleTouchStart = (e: any) => { if (variant !== 'default') return; if (e.targetTouches.length !== 1 || !onDelete) return; touchStartX.current = e.targetTouches[0].clientX; touchStartY.current = e.targetTouches[0].clientY; setIsSwiping(false); isLongPress.current = false; longPressTimer.current = setTimeout(() => { if (touchStartX.current && touchStartY.current) { isLongPress.current = true; openMenu(touchStartX.current, touchStartY.current); } }, 600); };
  const handleTouchMove = (e: any) => { if (variant !== 'default') return; if (!touchStartX.current || !touchStartY.current || !onDelete) return; const currentX = e.targetTouches[0].clientX; const currentY = e.targetTouches[0].clientY; const diffX = currentX - touchStartX.current; const diffY = currentY - touchStartY.current; if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } } if (isLongPress.current) return; if (Math.abs(diffY) > Math.abs(diffX)) return; if (diffX < 0) { setIsSwiping(true); setSwipeOffset(Math.max(diffX, -200)); } };
  const handleTouchEnd = () => { if (variant !== 'default') return; if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } if (isLongPress.current) { touchStartX.current = null; touchStartY.current = null; return; } if (swipeOffset < -100 && onDelete && note.id) { triggerHaptic(); onDelete(note.id); } setSwipeOffset(0); setIsSwiping(false); touchStartX.current = null; touchStartY.current = null; };

  // --- STYLE CALCULATIONS ---

  // 1. Padding: Chat bubbles should be wider (px-4) but not too tall (py-2)
  const paddingClass = variant === 'default' 
      ? (isCompact ? 'px-3 py-2' : 'p-3') 
      : 'px-4 py-2';

  // 2. Shape: The "Telegram/WhatsApp" tail logic
  let radiusClass = 'rounded-2xl'; // Base shape
  if (variant === 'sent') {
      // Sent: Top-Right, Top-Left, Bottom-Left are round. Bottom-Right is sharp.
      radiusClass = 'rounded-2xl rounded-tr-2xl rounded-br-none';
  }
  if (variant === 'received') {
      // Received: Top-Left, Top-Right, Bottom-Right are round. Bottom-Left is sharp.
      radiusClass = 'rounded-2xl rounded-tl-2xl rounded-bl-none';
  }

  // 3. Max Width constraint for chat bubbles
  const widthClass = variant === 'default' ? 'w-full' : 'w-fit max-w-full';

  return (
    <>
      <div className={`relative ${variant === 'default' ? 'w-fit max-w-[85%]' : 'max-w-[75%]'} overflow-visible group`} onContextMenu={handleContextMenu}>
        
        {variant === 'default' && (
           <div className={`absolute inset-0 flex items-center justify-end pr-6 rounded-xl transition-opacity duration-200 ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: isHacker ? '#16a34a' : CLAUDE_ORANGE }}>
             <Trash2 className="text-white animate-pulse" size={24} />
           </div>
        )}
        
        <div className={`${bgColor} border ${radiusClass} ${paddingClass} ${widthClass} relative transition-all duration-200`} 
             style={{ borderColor: borderColor, transform: `translateX(${swipeOffset}px)` }} 
             onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          
          {isExpanded ? (
            <div className="flex flex-col gap-1 min-w-[80px]">
              {note.imageUrl && (
                <div className="mb-1 rounded-lg overflow-hidden border bg-zinc-950 flex justify-center max-w-full" style={{ borderColor: borderColor }}>
                  <img src={note.imageUrl} alt="Attachment" className="w-full md:w-auto h-auto md:max-h-96 object-contain" />
                </div>
              )}
              <div className="block w-full">
                  <span className={`text-base leading-snug whitespace-pre-wrap break-words ${textColor}`}>{safeText}</span>
                  <div className="float-right ml-2 mt-2 flex items-center gap-1.5 align-bottom">
                      {onEdit && <InlineActionButton onClick={onEdit} icon={Edit2} accentColor={accentColor} />}
                      <span className="text-[10px] opacity-60 font-medium ml-0.5 select-none translate-y-[2px]" style={{ color: customColors?.text || accentColor }}>{formatTime(note.date)}</span>
                  </div>
              </div>
            </div>
          ) : (
             <div className="flex gap-2">
                 {/* Compact View (mostly for Notes) */}
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div onClick={() => onToggleExpand && onToggleExpand(note.id)} className="cursor-pointer">
                       <p className={`text-base leading-tight truncate mb-1 text-left ${textColor}`}>{lines[0] || <span className="italic opacity-50">Image</span>}</p>
                       {lines.length > 1 && <p className={`text-sm leading-snug truncate text-left opacity-70 ${textColor}`}>{lines[1]}</p>}
                    </div>
                 </div>
                 {note.imageUrl && (<div className="flex-shrink-0 w-12 h-10 rounded bg-zinc-800 border overflow-hidden" style={{ borderColor: borderColor }}><img src={note.imageUrl} alt="" className="w-full h-full object-cover" /></div>)}
                 <div className="flex flex-col justify-center items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] opacity-60 font-medium" style={{ color: customColors?.text || accentColor }}>{formatTime(note.date)}</span>
                 </div>
             </div>
          )}
        </div>
      </div>
      
      {/* Context Menu Logic (Same as before) */}
      {contextMenu && onDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed z-[9999] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10" style={{ top: contextMenu.y, left: contextMenu.x, backgroundColor: 'rgba(24, 24, 27, 0.95)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { handleCopy(); setContextMenu(null); }} accentColor={accentColor} />
          <ContextMenuItem icon={Volume2} label="Play" onClick={() => { handleSpeakNote(); setContextMenu(null); }} accentColor={accentColor} />
          {variant === 'default' && (
            <>
              <div className="h-px bg-white/10 mx-3 my-1" />
              <ContextMenuItem icon={Trash2} label="Delete" onClick={() => { onDelete(note.id); setContextMenu(null); }} accentColor={accentColor} />
            </>
          )}
        </div>, document.body
      )}
    </>
  );
};