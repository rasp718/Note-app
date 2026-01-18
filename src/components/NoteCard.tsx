import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Volume2, Edit2, CornerUpRight, Check, CheckCheck } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { StreetDiceGame } from './StreetDiceGame';

interface NoteCardProps {
  note: Note;
  categories: CategoryConfig[];
  selectedVoice: SpeechSynthesisVoice | null;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onCategoryClick?: (category: CategoryId) => void;
  onEdit?: () => void;
  onUpdate?: (id: string, text: string) => void;
  onToggleExpand?: (id: string) => void;
  onImageClick?: (url: string) => void;
  currentReaction?: string; 
  onReact?: (emoji: string) => void;
  variant?: 'default' | 'sent' | 'received';
  status?: 'sending' | 'sent' | 'read';
  currentUserId?: string;
  opponentName?: string;
  opponentAvatar?: string;
  customColors?: { bg: string; border: string; text: string; subtext?: string; shadow?: string; font?: string };
  isLastInGroup?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
const triggerHaptic = (pattern: number | number[] = 15) => { 
  if (typeof navigator !== 'undefined' && navigator.vibrate) { 
      try { navigator.vibrate(pattern); } catch (e) {} 
  } 
};

const ContextMenuItem = ({ icon: Icon, label, onClick, accentColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleAction = (e: any) => { 
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic(); 
      onClick(); 
  };

  return (
    <button 
        type="button" 
        onPointerDown={handleAction}
        onClick={handleAction} 
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

const InlineActionButton = ({ onClick, icon: Icon, accentColor, iconColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic(); onClick(e); }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="p-1 rounded-full transition-colors active:scale-90 align-middle" style={{ color: isHovered ? accentColor : (iconColor || '#71717a') }}><Icon size={12} /></button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onUpdate, onToggleExpand, onImageClick, 
  currentReaction, onReact, 
  variant = 'default', status, currentUserId, opponentName = "OPP", opponentAvatar, customColors,
  isLastInGroup = true
}) => {
  if (!note) return null;

  // --- State ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false); 
  
  // --- Refs ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false); 

  // --- Data ---
  const safeText = String(note.text || '');
  const audioUrl = (note as any).audioUrl;
  const hasImage = !!note.imageUrl;
  const isDiceGame = safeText.includes('STREET_DICE_GAME');
  
  let gameData = "";
  if (isDiceGame) {
      const parts = safeText.split('|||');
      if (parts.length > 1) gameData = parts[1];
  }

  // --- Handlers ---
  const handleGameUpdate = (newJson: string) => {
      if (onUpdate && note.id) {
          const newText = `🎲 STREET_DICE_GAME|||${newJson}`;
          onUpdate(note.id, newText);
      }
  };

  useEffect(() => {
    const closeMenu = (e: any) => { if (e.type === 'scroll') return; setContextMenu(null); };
    if (contextMenu) { setTimeout(() => { window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu); window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu); }, 200); }
    return () => { window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu); window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu); };
  }, [contextMenu]);

  const handleSpeakNote = (e?: any) => { e?.stopPropagation(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(safeText); if (selectedVoice) utterance.voice = selectedVoice; window.speechSynthesis.speak(utterance); } };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(safeText); } catch (err) {} };
  
  const openMenu = (clientX: number, clientY: number) => { 
      triggerHaptic(); 
      const menuW = 200; 
      const menuH = 300; 
      let x = clientX; 
      let y = clientY; 
      
      if (typeof window !== 'undefined') { 
          // Prevent menu from going off-screen
          if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; 
          if (x < 10) x = 10;
          if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; 
          if (y < 10) y = 10;
      } 
      setContextMenu({ x, y }); 
  };

  const handleContextMenu = (e: any) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      openMenu(e.clientX, e.clientY); 
  };

  const handleDoubleTap = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic([10, 50]); 
      if (onReact) onReact('❤️');
  };

  const formatTime = (timestamp: any) => { try { const t = Number(timestamp); if (isNaN(t) || t === 0) return ''; return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  // --- Touch Logic ---
  const handleTouchStart = (e: any) => { 
      if (e.targetTouches.length !== 1) return; 
      touchStartX.current = e.targetTouches[0].clientX; 
      touchStartY.current = e.targetTouches[0].clientY; 
      touchStartTime.current = Date.now(); 
      setIsSwiping(false); 
      isLongPress.current = false; 
      
      longPressTimer.current = setTimeout(() => { 
          if (touchStartX.current && touchStartY.current) { 
              isLongPress.current = true; 
              openMenu(touchStartX.current, touchStartY.current); 
          } 
      }, 500); 
  };

  const handleTouchMove = (e: any) => { 
      if (!touchStartX.current || !touchStartY.current || isExiting) return; 
      const diffX = e.targetTouches[0].clientX - touchStartX.current; 
      const diffY = e.targetTouches[0].clientY - touchStartY.current; 
      
      if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) { 
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } 
      } 
      
      if (isLongPress.current) return; 
      // Only allow swipe delete on 'default' (Feed) notes, not chat messages
      if (variant === 'default' && diffX < 0 && Math.abs(diffX) > Math.abs(diffY)) { setIsSwiping(true); setSwipeOffset(diffX); } 
  };

  const handleTouchEnd = (e: any) => { 
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } 
      if (isLongPress.current) { touchStartX.current = null; touchStartY.current = null; return; } 
      
      if (variant === 'default' && onDelete && note.id) {
          const touchDuration = Date.now() - touchStartTime.current;
          const isFling = touchDuration < 300 && swipeOffset < -50; 
          const isDrag = swipeOffset < -150; 
          if (isFling || isDrag) { 
              triggerHaptic(); 
              setIsExiting(true); 
              setSwipeOffset(-window.innerWidth); 
              setTimeout(() => { onDelete(note.id); }, 200); 
          } else { setSwipeOffset(0); }
      } else { setSwipeOffset(0); }
      
      setIsSwiping(false); 
      touchStartX.current = null; 
      touchStartY.current = null; 
  };

  // --- Render Props ---
  const bgColor = customColors?.bg || 'bg-zinc-900';
  const textColor = customColors?.text || 'text-zinc-300';
  const subtextColor = customColors?.subtext || 'text-zinc-400 opacity-60'; 
  const shadowClass = customColors?.shadow || 'shadow-sm';
  const chatBorderClasses = customColors?.border || 'border-none';
  const paddingClass = 'p-1';
  
  // Radius Logic for Tails
  let radiusClass = 'rounded-2xl'; 
  if (variant === 'sent') radiusClass = isLastInGroup ? 'rounded-2xl rounded-br-none' : 'rounded-2xl';
  if (variant === 'received') radiusClass = isLastInGroup ? 'rounded-2xl rounded-bl-none' : 'rounded-2xl';
  
  // FIXED: Chat bubbles should be w-fit (shrink to text) but max-w-full (don't overflow container)
  // Default notes (Feed) should be w-full.
  const outerWidthClass = variant === 'default' ? 'w-full' : 'w-fit';
  const innerWidthClass = variant === 'default' ? 'w-full' : 'w-fit max-w-full';

  const audioBarColor = customColors?.bg?.includes('green') ? '#166534' : (customColors?.bg?.includes('blue') ? '#1e3a8a' : '#da7756');

  const StatusIcon = ({ isOverlay = false }: { isOverlay?: boolean }) => {
    if (variant !== 'sent') return null;
    const defaultColor = customColors?.bg?.includes('white') ? 'text-blue-500' : 'text-blue-400';
    const pendingColor = customColors?.bg?.includes('white') ? 'text-zinc-400' : 'text-white/50';
    const colorClass = isOverlay ? "text-white" : (status === 'read' ? defaultColor : pendingColor);
    
    if (status === 'sending') return <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${isOverlay ? 'border-white' : 'border-white/50'}`} />;
    if (status === 'read') return <CheckCheck size={14} className={colorClass} strokeWidth={2.5} />;
    return <Check size={14} className={colorClass} strokeWidth={2} />;
  };

  return (
    <>
      <div 
        className={`relative ${outerWidthClass} overflow-visible group`} 
        onContextMenu={handleContextMenu} 
        onDoubleClick={handleDoubleTap}
      >
        <div 
            className={`${bgColor} ${chatBorderClasses} ${radiusClass} ${paddingClass} ${innerWidthClass} ${shadowClass} relative transition-all duration-300 ease-out`} 
            style={{ transform: `translateX(${swipeOffset}px)`, opacity: isExiting ? 0 : 1 }} 
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove} 
            onTouchEnd={handleTouchEnd}
        >
          
          {audioUrl ? (
             <div className="flex flex-col gap-1 min-w-[200px]">
                <AudioPlayer src={audioUrl} barColor={audioBarColor} />
                <div className="flex justify-end px-2 pb-1"><div className="flex items-center gap-1"><span className={`text-[10px] font-medium ${subtextColor}`}>{formatTime(note.date)}</span>{variant === 'sent' && <StatusIcon />}</div></div>
             </div>
          ) : isDiceGame ? (
             <div className="flex flex-col">
                 <StreetDiceGame 
                    dataStr={gameData} 
                    onSave={handleGameUpdate} 
                    myId={currentUserId || 'unknown'}
                    oppName={opponentName}
                    oppAvatar={opponentAvatar}
                 />
             </div>
          ) : hasImage ? (
            <div className="relative">
                <div onClick={(e) => { e.stopPropagation(); onImageClick && onImageClick(note.imageUrl!); }} className="rounded-xl overflow-hidden border-none bg-zinc-950 flex justify-center max-w-full cursor-zoom-in active:scale-95 transition-transform relative">
                    <img src={note.imageUrl} alt="Attachment" className="w-full h-auto md:max-h-96 object-contain" />
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                        <span className="text-[10px] font-medium text-white/90">{formatTime(note.date)}</span>
                        {variant === 'sent' && <StatusIcon isOverlay={true} />}
                    </div>
                </div>
            </div>
          ) : (
             <div className="flex flex-col min-w-[80px]">
               <div className={`block w-full px-2 pb-2 pt-1`}>
                   {safeText && (
                       <span className={`text-[16px] leading-snug whitespace-pre-wrap break-words ${textColor}`}>
                           {safeText}
                       </span>
                   )}
                   {/* Float the time right if space permits, otherwise it wraps naturally */}
                   <div className="float-right ml-3 mt-1.5 flex items-center gap-1 align-bottom h-4 select-none">
                       {onEdit && <InlineActionButton onClick={onEdit} icon={Edit2} accentColor={'#da7756'} iconColor={subtextColor.includes('zinc-400') ? '#71717a' : 'currentColor'} />}
                       <span className={`text-[10px] font-medium ${subtextColor}`}>{formatTime(note.date)}</span>
                       {variant === 'sent' && <div className="ml-0.5"><StatusIcon /></div>}
                   </div>
               </div>
             </div>
          )}

          {/* REACTION BADGE - Positioned relative to bubble corner */}
          {currentReaction && (
              <div 
                  onClick={(e) => { e.stopPropagation(); if (onReact) onReact(currentReaction); }}
                  className={`absolute -bottom-2.5 ${variant === 'sent' ? 'right-[8px]' : 'left-[8px]'} bg-[#1c1c1d] border border-[#3f3f40] text-white text-[12px] leading-none rounded-full px-1 py-0.5 shadow-sm animate-in zoom-in duration-200 z-30 select-none cursor-pointer flex items-center justify-center hover:scale-110 transition-transform`}
                  style={{ minWidth: '18px' }}
              >
                  {currentReaction}
              </div>
          )}
        </div>
      </div>
      
      {/* MENU PORTAL */}
      {contextMenu && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setContextMenu(null)} onTouchStart={() => setContextMenu(null)}>
            <div 
                className="absolute z-[10000] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10" 
                style={{ 
                    top: contextMenu.y, 
                    left: contextMenu.x, 
                    backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)' 
                }} 
                onClick={(e) => e.stopPropagation()} 
                onTouchStart={(e) => e.stopPropagation()}
            > 
              {/* EMOJI BAR */}
              {onReact && (
                  <div className="flex justify-between px-2 py-2 mb-1 border-b border-white/10 gap-1 select-none">
                      {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                          <button 
                              key={emoji}
                              type="button"
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => { triggerHaptic(); onReact(emoji); setContextMenu(null); }}
                              className={`w-8 h-8 flex-1 flex items-center justify-center text-lg rounded-full transition-all active:scale-90 select-none touch-manipulation ${currentReaction === emoji ? 'bg-white/20' : 'hover:bg-white/10'}`}
                          >
                              {emoji}
                          </button>
                      ))}
                  </div>
              )}

              <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { handleCopy(); setContextMenu(null); }} accentColor={'#da7756'} /> 
              
              {variant === 'default' && (
                <ContextMenuItem icon={Volume2} label="Play" onClick={() => { handleSpeakNote(); setContextMenu(null); }} accentColor={'#da7756'} />
              )} 
              
              {onEdit && ( 
                <ContextMenuItem icon={Edit2} label="Edit" onClick={() => { onEdit(); setContextMenu(null); }} accentColor={'#da7756'} /> 
              )} 
              
              {(variant === 'default' || variant === 'sent') && ( 
                <> 
                  <div className="h-px bg-white/10 mx-3 my-1" /> 
                  <ContextMenuItem icon={Trash2} label="Delete" onClick={() => { if(onDelete) onDelete(note.id); setContextMenu(null); }} accentColor={'#da7756'} /> 
                </> 
              )} 
            </div>
        </div>, 
        document.body 
      )}
    </>
  );
};