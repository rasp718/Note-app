import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Volume2, Edit2, CornerUpRight, Check, CheckCheck, Play, Pause } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

const triggerHaptic = () => { if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} } };

const ContextMenuItem = ({ icon: Icon, label, onClick, accentColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleAction = () => { triggerHaptic(); onClick(); };
  return (
    <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(); }} onClick={(e) => { e.stopPropagation(); handleAction(); }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors duration-150 cursor-pointer select-none active:bg-white/10" style={{ backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }}>
      <Icon size={18} style={{ color: isHovered ? accentColor : '#a1a1aa' }} /><span className="font-medium" style={{ color: isHovered ? accentColor : '#f4f4f5' }}>{label}</span>
    </button>
  );
};

const InlineActionButton = ({ onClick, icon: Icon, accentColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic(); onClick(e); }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="p-1 rounded-full transition-colors active:scale-90 align-middle" style={{ color: isHovered ? '#ffffff' : '#71717a' }}><Icon size={12} /></button>
  );
};

const AudioPlayer = ({ src, textColor }: any) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => { const pct = (audio.currentTime / audio.duration) * 100; setProgress(pct || 0); };
        const handleEnded = () => { setIsPlaying(false); setProgress(0); };
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        return () => { audio.removeEventListener('timeupdate', handleTimeUpdate); audio.removeEventListener('ended', handleEnded); };
    }, []);

    const togglePlay = async (e: any) => {
        e.stopPropagation();
        if(!audioRef.current) return;
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
        else { 
            try { await audioRef.current.play(); setIsPlaying(true); } 
            catch (err) { console.error("Playback Error:", err); alert("Could not play audio."); } 
        }
    };

    return (
        <div className="flex items-center gap-3 min-w-[140px] bg-black/10 rounded-xl p-2 pr-3 mb-1 border border-white/5">
            <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black shrink-0 hover:scale-105 active:scale-95 transition-all">
                {isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
            </button>
            <div className="flex flex-col gap-1 w-full min-w-0">
                <div className={`h-1 w-full rounded-full opacity-30 overflow-hidden ${textColor?.includes('black') ? 'bg-black' : 'bg-white'}`}>
                    <div className={`h-full ${textColor?.includes('black') ? 'bg-black' : 'bg-white'}`} style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
                </div>
                <span className={`text-[9px] font-mono opacity-70 ${textColor}`}>{isPlaying ? 'Playing...' : 'Voice Note'}</span>
            </div>
            <audio ref={audioRef} src={src} preload="auto" playsInline />
        </div>
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
  onImageClick?: (url: string) => void; 
  variant?: 'default' | 'sent' | 'received';
  status?: 'sending' | 'sent' | 'read';
  customColors?: { bg: string; border: string; text: string; shadow?: string; font?: string };
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onToggleExpand, onImageClick, variant = 'default', status, customColors }) => {
  if (!note) return null;
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
  
  const borderStyle = customColors?.border ? { borderColor: customColors.border } : {};
  const chatBorderClasses = variant !== 'default' ? (customColors?.border ? customColors.border : 'border-none') : 'border-none';
  const bgColor = customColors?.bg || 'bg-zinc-900';
  const textColor = customColors?.text || 'text-zinc-300';
  const shadowClass = customColors?.shadow || 'shadow-sm';
  const fontClass = customColors?.font || '';
  
  const isExpanded = !!note.isExpanded;
  const safeText = String(note.text || '');
  const lines = safeText.split('\n');
  const audioUrl = (note as any).audioUrl;
  const isCompact = lines.length === 1 && !note.imageUrl && !audioUrl;
  
  useEffect(() => {
    const closeMenu = (e: any) => { if (e.type === 'scroll') return; setContextMenu(null); };
    if (contextMenu) { setTimeout(() => { window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu); window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu); }, 200); }
    return () => { window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu); window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu); };
  }, [contextMenu]);

  const handleSpeakNote = (e?: any) => { e?.stopPropagation(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(safeText); if (selectedVoice) utterance.voice = selectedVoice; window.speechSynthesis.speak(utterance); } };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(safeText); } catch (err) {} };
  
  // MENU TRIGGER
  const openMenu = (clientX: number, clientY: number) => {
    triggerHaptic();
    const menuW = 200; const menuH = 260; 
    let x = clientX; let y = clientY;
    if (typeof window !== 'undefined') { if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; }
    setContextMenu({ x: Math.max(10, x), y: Math.max(10, y) });
  };

  const handleContextMenu = (e: any) => { 
      e.preventDefault(); e.stopPropagation(); 
      // Allow menu on DEFAULT notes AND SENT messages
      if(variant === 'default' || variant === 'sent') openMenu(e.clientX, e.clientY); 
  };

  const formatTime = (timestamp: any) => { try { const t = Number(timestamp); if (isNaN(t) || t === 0) return ''; return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  const handleTouchStart = (e: any) => { 
      if (e.targetTouches.length !== 1) return; 
      touchStartX.current = e.targetTouches[0].clientX; 
      touchStartY.current = e.targetTouches[0].clientY; 
      setIsSwiping(false); isLongPress.current = false; 
      // ENABLE LONG PRESS FOR SENT MESSAGES TOO
      if (variant === 'default' || variant === 'sent') {
          longPressTimer.current = setTimeout(() => { 
              if (touchStartX.current && touchStartY.current) { isLongPress.current = true; openMenu(touchStartX.current, touchStartY.current); } 
          }, 600); 
      }
  };
  
  const handleTouchMove = (e: any) => { 
      if (!touchStartX.current || !touchStartY.current) return; 
      const diffX = e.targetTouches[0].clientX - touchStartX.current; 
      const diffY = e.targetTouches[0].clientY - touchStartY.current; 
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } } 
      if (isLongPress.current) return; 
      if (variant === 'default' && diffX < 0 && Math.abs(diffX) > Math.abs(diffY)) { setIsSwiping(true); setSwipeOffset(Math.max(diffX, -200)); } 
  };
  
  const handleTouchEnd = () => { 
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } 
      if (isLongPress.current) { touchStartX.current = null; touchStartY.current = null; return; } 
      if (variant === 'default' && swipeOffset < -100 && onDelete && note.id) { triggerHaptic(); onDelete(note.id); } 
      setSwipeOffset(0); setIsSwiping(false); touchStartX.current = null; touchStartY.current = null; 
  };

  const paddingClass = variant === 'default' ? (isCompact ? 'px-3 py-2' : 'p-3') : 'px-4 py-2';
  let radiusClass = 'rounded-2xl'; 
  if (variant === 'sent') radiusClass = 'rounded-2xl rounded-br-none';
  if (variant === 'received') radiusClass = 'rounded-2xl rounded-bl-none';
  const widthClass = variant === 'default' ? 'w-full' : 'w-fit max-w-full';

  const StatusIcon = () => {
    if (variant !== 'sent') return null;
    if (status === 'sending') return <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />;
    if (status === 'read') return <CheckCheck size={14} className="text-blue-400" strokeWidth={2.5} />;
    return <Check size={14} className="text-white/50" strokeWidth={2} />;
  };

  return (
    <>
      <div className={`relative ${variant === 'default' ? 'w-fit max-w-[85%]' : 'max-w-[75%]'} overflow-visible group`} onContextMenu={handleContextMenu}>
        {variant === 'default' && ( <div className={`absolute inset-0 flex items-center justify-end pr-6 rounded-xl transition-opacity duration-200 ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: isHacker ? '#16a34a' : CLAUDE_ORANGE }}><Trash2 className="text-white animate-pulse" size={24} /></div>)}
        <div className={`${bgColor} ${chatBorderClasses} ${radiusClass} ${paddingClass} ${widthClass} ${shadowClass} ${fontClass} relative transition-all duration-200`} style={{ ...borderStyle, transform: `translateX(${swipeOffset}px)` }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {isExpanded ? (
            <div className="flex flex-col gap-1 min-w-[80px]">
              {note.imageUrl && ( <div onClick={(e) => { e.stopPropagation(); onImageClick && onImageClick(note.imageUrl!); }} className="mb-1 rounded-lg overflow-hidden border-none bg-zinc-950 flex justify-center max-w-full cursor-zoom-in active:scale-95 transition-transform"><img src={note.imageUrl} alt="Attachment" className="w-full h-auto md:max-h-96 object-contain" /></div>)}
              {audioUrl && <AudioPlayer src={audioUrl} textColor={textColor} />}
              <div className="block w-full">
                  {safeText && <span className={`text-base leading-snug whitespace-pre-wrap break-words ${textColor}`}>{safeText}</span>}
                  <div className="float-right ml-2 mt-2 flex items-center gap-1 align-bottom h-4">
                      {onEdit && <InlineActionButton onClick={onEdit} icon={Edit2} accentColor={accentColor} />}
                      {note.editedAt && <span className="text-[9px] italic opacity-50 text-white mr-1">edited</span>}
                      <span className="text-[10px] opacity-60 font-medium select-none" style={{ color: customColors?.text || accentColor }}>{formatTime(note.date)}</span>
                      {variant === 'sent' && <div className="ml-0.5"><StatusIcon /></div>}
                  </div>
              </div>
            </div>
          ) : (
             <div className="flex gap-2">
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div onClick={() => onToggleExpand && onToggleExpand(note.id)} className="cursor-pointer">
                       {audioUrl && <span className="text-sm italic opacity-70 mb-1 block">🎤 Voice Message</span>}
                       {lines[0] && <p className={`text-base leading-tight truncate mb-1 text-left ${textColor}`}>{lines[0]}</p>}
                       {lines.length > 1 && <p className={`text-sm leading-snug truncate text-left opacity-70 ${textColor}`}>{lines[1]}</p>}
                    </div>
                 </div>
                 {note.imageUrl && (<div className="flex-shrink-0 w-12 h-10 rounded bg-zinc-800 border-none overflow-hidden"><img src={note.imageUrl} alt="" className="w-full h-full object-cover" /></div>)}
                 <div className="flex flex-col justify-end items-end gap-0.5 flex-shrink-0">
                    <span className="text-[10px] opacity-60 font-medium" style={{ color: customColors?.text || accentColor }}>{formatTime(note.date)}</span>
                    {variant === 'sent' && <StatusIcon />}
                 </div>
             </div>
          )}
        </div>
      </div>
      {contextMenu && typeof document !== 'undefined' && createPortal( <div className="fixed z-[9999] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10" style={{ top: contextMenu.y, left: contextMenu.x, backgroundColor: 'rgba(24, 24, 27, 0.95)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}> 
      <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { handleCopy(); setContextMenu(null); }} accentColor={accentColor} /> 
      {variant === 'default' && <ContextMenuItem icon={Volume2} label="Play" onClick={() => { handleSpeakNote(); setContextMenu(null); }} accentColor={accentColor} />}
      {/* SHOW DELETE FOR SENT MESSAGES OR NOTES */}
      {(variant === 'default' || variant === 'sent') && ( <> <div className="h-px bg-white/10 mx-3 my-1" /> <ContextMenuItem icon={Trash2} label="Delete" onClick={() => { if(onDelete) onDelete(note.id); setContextMenu(null); }} accentColor={accentColor} /> </> )} 
      </div>, document.body )}
    </>
  );
};