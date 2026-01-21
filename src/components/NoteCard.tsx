import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Trash2, Volume2, Edit2, CornerUpRight, Check, CheckCheck, Copy, 
  Image as ImageIcon, Download, Pin, Forward, CheckCircle, ChevronDown, ChevronUp, FileText 
} from 'lucide-react';
import { Note, CategoryId, CategoryConfig } from '../types';
import { getUserColor } from '../utils';
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
  onReply?: (note: Note) => void;
  currentReaction?: string; 
  onReact?: (emoji: string) => void;
  variant?: 'default' | 'sent' | 'received';
  status?: 'sending' | 'sent' | 'read';
  currentUserId?: string;
  opponentName?: string;
  opponentAvatar?: string;
  customColors?: { bg: string; border: string; text: string; subtext?: string; shadow?: string; font?: string };
  isLastInGroup?: boolean;
  replyTheme?: string;
}

// Helper: Haptic Feedback
const triggerHaptic = (pattern: number | number[] = 15) => { 
  if (typeof navigator !== 'undefined' && navigator.vibrate) { 
      try { navigator.vibrate(pattern); } catch (e) {} 
  } 
};

// Component: Context Menu Item
const ContextMenuItem = ({ icon: Icon, label, onClick, isDestructive = false }: any) => {
  return (
    <button 
        type="button" 
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); triggerHaptic(); onClick(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        className="w-full flex items-center justify-between px-4 py-3 text-[15px] transition-colors duration-150 cursor-pointer select-none active:bg-white/10 group" 
    >
      <span className={`font-medium ${isDestructive ? 'text-red-500' : 'text-white'}`}>{label}</span>
      <Icon size={18} className={isDestructive ? 'text-red-500' : 'text-zinc-400 group-hover:text-white'} />
    </button>
  );
};

// Component: Inline Action Button
const InlineActionButton = ({ onClick, icon: Icon, accentColor, iconColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic(); onClick(e); }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="p-1 rounded-full transition-colors active:scale-90 align-middle" style={{ color: isHovered ? accentColor : (iconColor || '#71717a') }}><Icon size={12} /></button>
  );
};

export const NoteCard: React.FC<NoteCardProps> = ({ 
  note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onUpdate, onToggleExpand, onImageClick, onReply,
  currentReaction, onReact, 
  variant = 'default', status, currentUserId, opponentName = "OPP", opponentAvatar, customColors,
  isLastInGroup = true, replyTheme = 'retro'
}) => {
  if (!note) return null;

  // --- State ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false); 
  const [showMoreEmojis, setShowMoreEmojis] = useState(false); 
  
  // --- Refs ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false); 

  // --- Data Parsing ---
  const rawText = String(note.text || '');
  const REPLY_SEPARATOR = "|||RPLY|||";
  
  let replyData: any = null;
  let safeText = rawText;

  if (rawText.includes(REPLY_SEPARATOR)) {
      const parts = rawText.split(REPLY_SEPARATOR);
      if (parts.length >= 2) {
          try {
              replyData = JSON.parse(parts[0]);
              safeText = parts.slice(1).join(REPLY_SEPARATOR);
          } catch(e) { console.error("Reply parse error", e); }
      }
  }

  const audioUrl = (note as any).audioUrl;
  const hasImage = !!note.imageUrl;
  const isDiceGame = safeText.includes('STREET_DICE_GAME');
  
  let gameData = "";
  if (isDiceGame) {
      const parts = safeText.split('|||');
      if (parts.length > 1) gameData = parts[1];
  }

  const categoryConfig = categories.find(c => c.id === note.category);
  const categoryEmoji = categoryConfig ? categoryConfig.emoji : null;

  const handleGameUpdate = (newJson: string) => {
      if (onUpdate && note.id) {
          const newText = `🎲 STREET_DICE_GAME|||${newJson}`;
          onUpdate(note.id, newText);
      }
  };

  useEffect(() => {
    const closeMenu = (e: any) => { if (e.type === 'scroll') return; setContextMenu(null); setShowMoreEmojis(false); };
    if (contextMenu) { setTimeout(() => { window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu); window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu); }, 200); }
    return () => { window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu); window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu); };
  }, [contextMenu]);

  const handleSpeakNote = (e?: any) => { e?.stopPropagation(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(safeText); if (selectedVoice) utterance.voice = selectedVoice; window.speechSynthesis.speak(utterance); } };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(safeText); } catch (err) {} };

  // --- COPY IMAGE LOGIC ---
  const handleCopyImage = async () => {
    if (!note.imageUrl) return;
    setContextMenu(null);
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = note.imageUrl;
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas blocked");
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    triggerHaptic(50);
                } catch (err) {
                    console.error("Clipboard write failed", err);
                    
                    // FALLBACK: If clipboard fails (common on mobile), try Share Sheet
                    const file = new File([blob], "image.png", { type: 'image/png' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file] });
                    } else {
                        alert("Failed to copy image. Try saving it instead.");
                    }
                }
            }
        }, 'image/png');
    } catch (e) {
        console.error("Copy failed", e);
        alert("Failed to load image.");
    }
  };

  // --- SAVE IMAGE LOGIC ---
  const handleSaveImage = async () => {
    if (!note.imageUrl) return;
    setContextMenu(null); 
    
    try {
        const response = await fetch(note.imageUrl, { mode: 'cors' });
        if (!response.ok) throw new Error("Fetch failed");
        
        const blob = await response.blob();
        const file = new File([blob], "image.png", { type: blob.type });
        
        // DETECT MOBILE
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
        } 
        else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `vibe_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    } catch (e) {
        console.error("Save failed", e);
        window.open(note.imageUrl, '_blank');
    }
  };
  
  const openMenu = (clientX: number, clientY: number) => { 
      triggerHaptic(); 
      const menuW = 240; 
      const menuH = 400; 
      let x = clientX; 
      let y = clientY; 
      if (typeof window !== 'undefined') { 
          if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; 
          if (x < 10) x = 10;
          if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; 
          if (y < 10) y = 10;
      } 
      setContextMenu({ x, y }); 
  };

  const handleContextMenu = (e: any) => { e.preventDefault(); e.stopPropagation(); openMenu(e.clientX, e.clientY); };

  const handleDoubleTap = (e: any) => {
      e.preventDefault(); e.stopPropagation(); triggerHaptic([10, 50]); 
      if (onReact) onReact('❤️');
  };

  const formatTime = (timestamp: any) => { try { const t = Number(timestamp); if (isNaN(t) || t === 0) return ''; return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  const handleTouchStart = (e: any) => { 
      if (e.targetTouches.length !== 1) return; 
      touchStartX.current = e.targetTouches[0].clientX; touchStartY.current = e.targetTouches[0].clientY; touchStartTime.current = Date.now(); setIsSwiping(false); isLongPress.current = false; 
      longPressTimer.current = setTimeout(() => { if (touchStartX.current && touchStartY.current) { isLongPress.current = true; openMenu(touchStartX.current, touchStartY.current); } }, 500); 
  };

  const handleTouchMove = (e: any) => { 
      if (!touchStartX.current || !touchStartY.current || isExiting) return; 
      const diffX = e.targetTouches[0].clientX - touchStartX.current; const diffY = e.targetTouches[0].clientY - touchStartY.current; 
      if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } } 
      if (isLongPress.current) return; 
      if (variant === 'default' && diffX < 0 && Math.abs(diffX) > Math.abs(diffY)) { setIsSwiping(true); setSwipeOffset(diffX); } 
  };

  const handleTouchEnd = (e: any) => { 
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } 
      if (isLongPress.current) { touchStartX.current = null; touchStartY.current = null; return; } 
      if (variant === 'default' && onDelete && note.id) {
          const touchDuration = Date.now() - touchStartTime.current;
          const isFling = touchDuration < 300 && swipeOffset < -50; 
          const isDrag = swipeOffset < -150; 
          if (isFling || isDrag) { triggerHaptic(); setIsExiting(true); setSwipeOffset(-window.innerWidth); setTimeout(() => { onDelete(note.id); }, 200); } else { setSwipeOffset(0); }
      } else { setSwipeOffset(0); }
      setIsSwiping(false); touchStartX.current = null; touchStartY.current = null; 
  };

  // --- Styles ---
  const bgColor = customColors?.bg || 'bg-zinc-900';
  const textColor = customColors?.text || 'text-zinc-300';
  const subtextColor = customColors?.subtext || 'text-zinc-400 opacity-60'; 
  const shadowClass = customColors?.shadow || 'shadow-sm';
  const chatBorderClasses = customColors?.border || 'border-none';
  const paddingClass = 'p-1';
  
  let radiusClass = 'rounded-2xl'; 
  if (variant === 'sent') radiusClass = isLastInGroup ? 'rounded-2xl rounded-br-none' : 'rounded-2xl';
  if (variant === 'received') radiusClass = isLastInGroup ? 'rounded-2xl rounded-bl-none' : 'rounded-2xl';
  
  const outerWidthClass = variant === 'default' ? 'w-full' : 'w-fit';
  const innerWidthClass = variant === 'default' ? 'w-full' : 'w-fit max-w-full';

  const audioBarColor = customColors?.bg?.includes('green') ? '#166534' : (customColors?.bg?.includes('blue') ? '#1e3a8a' : '#da7756');

  // Detect Light Mode Bubble
  const isLightBubble = customColors?.bg?.includes('white') || customColors?.bg?.includes('slate-200') || customColors?.text?.includes('black');

  const StatusIcon = ({ isOverlay = false }: { isOverlay?: boolean }) => {
    if (variant !== 'sent') return null;
    const defaultColor = customColors?.bg?.includes('white') ? 'text-blue-500' : 'text-blue-400';
    const pendingColor = customColors?.bg?.includes('white') ? 'text-zinc-400' : 'text-white/50';
    const colorClass = isOverlay ? "text-white" : (status === 'read' ? defaultColor : pendingColor);
    
    if (status === 'sending') return <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${isOverlay ? 'border-white' : 'border-white/50'}`} />;
    if (status === 'read') return <CheckCheck size={14} className={colorClass} strokeWidth={2.5} />;
    return <Check size={14} className={colorClass} strokeWidth={2} />;
  };

  const preventSelectStyle = { WebkitTouchCallout: 'none', userSelect: 'none' } as React.CSSProperties;

  return (
    <>
      <div 
        className={`relative ${outerWidthClass} overflow-visible group select-none`} 
        onContextMenu={handleContextMenu} 
        onDoubleClick={handleDoubleTap}
      >
        <div 
            className={`${bgColor} ${chatBorderClasses} ${radiusClass} ${paddingClass} ${innerWidthClass} ${shadowClass} relative transition-all duration-300 ease-out select-none`} 
            style={{ transform: `translateX(${swipeOffset}px)`, opacity: isExiting ? 0 : 1 }} 
            onTouchStart={handleTouchStart} 
            onTouchMove={handleTouchMove} 
            onTouchEnd={handleTouchEnd}
        >
          {variant === 'default' && categoryEmoji && (
             <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1c1c1d] border border-white/10 flex items-center justify-center text-[12px] shadow-md z-20 select-none animate-in zoom-in duration-200">
                {categoryEmoji}
             </div>
          )}

          {variant === 'received' && opponentName && opponentName !== 'OPP' && (
              <div className={`px-3 pt-2 pb-1 text-[12px] font-bold leading-none ${getUserColor(opponentName, replyTheme).split(' ')[0]}`}>{opponentName}</div>
          )}

          {/* --- REPLY LOGIC --- */}
          {replyData && (() => {
              const [replyTextColor, replyBorderColor] = getUserColor(replyData.sender, replyTheme).split(' ');
              const hasThumb = !!replyData.imageUrl;
              
              // Darker background (bg-black/10) for white bubbles to match WhatsApp contrast
              const replyBg = isLightBubble ? 'bg-black/10' : 'bg-black/20'; 
              const replySubText = isLightBubble ? 'text-zinc-600' : 'text-zinc-300'; 

              return (
                <div 
                onClick={(e) => { e.stopPropagation(); if (onImageClick && hasThumb) onImageClick(replyData.imageUrl); }}
                // Conditional MT: 1px for 1:1 chats (tight), 1 (4px) for group chats (spacing from name)
                // mb-0.5 (tight bottom to pull text closer)
                className={`mx-0 mt-[1px] mb-0.5 rounded-[8px] ${replyBg} flex border-l-4 ${replyBorderColor} relative overflow-hidden select-none cursor-pointer transition-colors hover:opacity-80`}
                style={preventSelectStyle}
              >
                      <div className="flex-1 min-w-0 py-2 px-2.5 flex flex-col justify-center gap-0.5">
                          <div className={`text-[12px] font-bold ${replyTextColor} leading-snug truncate`}>
                              {replyData.sender}
                          </div>
                          <div className={`text-[13px] ${replySubText} line-clamp-2 leading-tight truncate flex items-center gap-1.5 opacity-90`}>
                               {hasThumb && <ImageIcon size={11} className="flex-shrink-0" />}
                               <span className="truncate">
                                   {replyData.text || (hasThumb ? 'Photo' : 'Message')}
                               </span>
                          </div>
                      </div>
                      {hasThumb && (
                          <div className="w-[70px] min-h-[70px] relative bg-zinc-900 select-none">
                                <img 
                                    src={replyData.imageUrl} 
                                    className="absolute inset-0 w-full h-full object-cover object-center select-none" 
                                    alt="reply-thumb"
                                    style={preventSelectStyle}
                                />
                          </div>
                      )}
                  </div>
              );
          })()}

          {audioUrl ? (
             <div className="flex flex-col gap-1 min-w-[200px]">
                <AudioPlayer src={audioUrl} barColor={audioBarColor} />
                <div className="flex justify-end px-2 pb-1"><div className="flex items-center gap-1"><span className={`text-[10px] font-medium ${subtextColor}`}>{formatTime(note.date)}</span>{variant === 'sent' && <StatusIcon />}</div></div>
             </div>
          ) : isDiceGame ? (
             <div className="flex flex-col">
                 <StreetDiceGame dataStr={gameData} onSave={handleGameUpdate} myId={currentUserId || 'unknown'} oppName={opponentName} oppAvatar={opponentAvatar} />
             </div>
          ) : hasImage ? (
            <div className="relative">
                <div 
                    onClick={(e) => { e.stopPropagation(); onImageClick && onImageClick(note.imageUrl!); }} 
                    className="rounded-xl overflow-hidden border-none bg-black flex justify-center items-center max-w-full cursor-zoom-in active:scale-95 transition-transform relative min-w-[120px] min-h-[120px] select-none"
                    style={preventSelectStyle}
                >
                    <img 
                        src={note.imageUrl} 
                        alt="Attachment" 
                        crossOrigin="anonymous" 
                        className="block max-w-full max-h-[320px] w-auto h-auto object-contain select-none" 
                        style={preventSelectStyle}
                    />
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-white/10 pointer-events-none">
                        <span className="text-[10px] font-medium text-white/90">{formatTime(note.date)}</span>
                        {variant === 'sent' && <StatusIcon isOverlay={true} />}
                    </div>
                </div>
            </div>
          ) : (
            <div className="flex flex-col min-w-[80px]">
              {/* Text Layout: Use block+float to wrap status icon naturally at bottom right */}
              <div className={`block w-full px-2 pb-1 pt-0.5 relative`}>
                  {safeText && (
                      <span className={`text-[16px] leading-snug whitespace-pre-wrap break-words ${textColor}`}>
                          {safeText}
                      </span>
                  )}
                  {/* Float Right Metadata (Time + Icon) */}
                  <span className="float-right ml-2 mt-1.5 flex items-center gap-1 h-3 align-bottom select-none">
                      <span className={`text-[10px] font-medium ${subtextColor}`}>{formatTime(note.date)}</span>
                      {variant === 'sent' && <StatusIcon />}
                  </span>
              </div>
            </div>
          )}

          {currentReaction && (
              <div onClick={(e) => { e.stopPropagation(); if (onReact) onReact(currentReaction); }} className={`absolute -bottom-2.5 ${variant === 'sent' ? 'right-[8px]' : 'left-[8px]'} bg-[#1c1c1d] border border-[#3f3f40] text-white text-[12px] leading-none rounded-full w-[20px] h-[20px] shadow-sm animate-in zoom-in duration-200 z-30 select-none cursor-pointer flex items-center justify-center hover:scale-110 transition-transform`}>{currentReaction}</div>
          )}
        </div>
      </div>
      
      {/* MENU PORTAL */}
      {contextMenu && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setContextMenu(null)} onTouchStart={() => setContextMenu(null)}>
            <div 
                className="absolute z-[10000] min-w-[240px] bg-[#1e1e1e]/95 backdrop-blur-xl rounded-[16px] shadow-2xl animate-in fade-in zoom-in-95 duration-150 origin-top-left flex flex-col overflow-hidden ring-1 ring-white/10" 
                style={{ top: contextMenu.y, left: contextMenu.x, boxShadow: '0 20px 60px -10px rgba(0,0,0,0.8)' }} 
                onClick={(e) => e.stopPropagation()} 
                onTouchStart={(e) => e.stopPropagation()}
            > 
              {onReact && (
                <div className="flex flex-col border-b border-white/5 bg-[#2c2c2c]/50">
                    <div className="flex justify-between px-2 py-2 gap-1 select-none">
                        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                            <button key={emoji} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => { triggerHaptic(); onReact(emoji); setContextMenu(null); }} className={`w-9 h-9 flex-1 flex items-center justify-center text-xl rounded-lg transition-all active:scale-90 select-none touch-manipulation ${currentReaction === emoji ? 'bg-white/20' : 'hover:bg-white/10'}`}>{emoji}</button>
                        ))}
                         <button onClick={() => setShowMoreEmojis(!showMoreEmojis)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400">
                             {showMoreEmojis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                         </button>
                    </div>
                    {showMoreEmojis && (
                        <div className="flex justify-between px-2 pb-2 gap-1 select-none animate-in slide-in-from-top-2 duration-150">
                            {['🎉', '🤔', '👀', '💩', '🤝', '⚡'].map(emoji => (
                                <button key={emoji} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => { triggerHaptic(); onReact(emoji); setContextMenu(null); }} className={`w-9 h-9 flex-1 flex items-center justify-center text-xl rounded-lg transition-all active:scale-90 select-none touch-manipulation ${currentReaction === emoji ? 'bg-white/20' : 'hover:bg-white/10'}`}>{emoji}</button>
                            ))}
                        </div>
                    )}
                </div>
              )}

              <div className="py-1">
                  <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { if(onReply) onReply(note); else handleCopy(); setContextMenu(null); }} /> 
                  
                  {variant !== 'received' && onEdit && !hasImage && (
                      <ContextMenuItem icon={Edit2} label="Edit" onClick={() => { onEdit(); setContextMenu(null); }} />
                  )}
                  
                  <ContextMenuItem icon={Pin} label="Pin" onClick={() => { if(onPin && note.id) onPin(note.id); setContextMenu(null); }} />

                  {/* IMAGES: Show Copy Image & Save Image */}
                  {hasImage && (
                      <ContextMenuItem icon={Copy} label="Copy Image" onClick={() => { handleCopyImage(); }} />
                  )}

                  {/* TEXT: Show Copy Text (if there is text) */}
                  {safeText && safeText.trim().length > 0 && (
                      <ContextMenuItem icon={FileText} label="Copy Text" onClick={() => { handleCopy(); setContextMenu(null); }} />
                  )}

                  {/* IMAGES: Save Image (Renamed from Gallery) */}
                  {hasImage && (
                      <ContextMenuItem icon={Download} label="Save Image" onClick={() => { handleSaveImage(); }} />
                  )}

                  <ContextMenuItem icon={Forward} label="Forward" onClick={() => { setContextMenu(null); }} />
                  <ContextMenuItem icon={CheckCircle} label="Select" onClick={() => { setContextMenu(null); }} />

                  {(variant === 'default' || variant === 'sent') && (
                    <> 
                      <div className="h-px bg-white/5 my-1 mx-4" /> 
                      <ContextMenuItem icon={Trash2} label="Delete" isDestructive={true} onClick={() => { if(onDelete) onDelete(note.id); setContextMenu(null); }} /> 
                    </>
                  )}
              </div>
            </div>
        </div>, document.body 
      )}
    </>
  );
};