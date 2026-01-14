import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Volume2, Edit2, CornerUpRight, Check, CheckCheck, Play, Pause } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

// --- UTILS ---
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

// --- WHATSAPP STYLE AUDIO PLAYER ---
const AudioPlayer = ({ src }: any) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Generate random bars once on mount to simulate a waveform
    const [bars] = useState(() => Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 20));

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
        const handleLoadedMetadata = () => { setDuration(audio.duration); };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    const togglePlay = async (e: any) => {
        e.stopPropagation();
        if(!audioRef.current) return;
        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
        else { try { await audioRef.current.play(); setIsPlaying(true); } catch (err) { console.error(err); } }
    };

    const toggleSpeed = (e: any) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        const newRate = playbackRate === 1 ? 1.5 : (playbackRate === 1.5 ? 2 : 1);
        audioRef.current.playbackRate = newRate;
        setPlaybackRate(newRate);
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[240px] bg-[#1f2937] rounded-full p-1 pr-4 border border-zinc-700 select-none shadow-sm mt-1 mb-1">
            {/* Play Button */}
            <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-colors shrink-0">
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Waveform Visualization */}
            <div className="flex-1 flex items-center gap-[2px] h-8 mx-1 opacity-90">
                {bars.map((height, i) => {
                    const barPercent = (i / bars.length) * 100;
                    const isActive = progress > barPercent;
                    return (
                        <div 
                            key={i} 
                            className={`w-[3px] rounded-full transition-colors duration-150 ${isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                            style={{ height: `${height}%` }}
                        />
                    );
                })}
            </div>

            {/* Timer */}
            <span className="text-xs font-mono text-zinc-400 min-w-[35px] text-right">
                {isPlaying ? formatTime(currentTime) : formatTime(duration)}
            </span>

            {/* Speed Toggle */}
            <button onClick={toggleSpeed} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white hover:bg-zinc-700 transition-colors ml-1 border border-zinc-600">
                {playbackRate}x
            </button>

            <audio ref={audioRef} src={src} preload="metadata" playsInline />
        </div>
    );
};

// --- MAIN COMPONENT ---
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
  
  const safeText = String(note.text || '');
  const lines = safeText.split('\n');
  const audioUrl = (note as any).audioUrl;
  
  // Close menu on interaction
  useEffect(() => {
    const closeMenu = (e: any) => { if (e.type === 'scroll') return; setContextMenu(null); };
    if (contextMenu) { setTimeout(() => { window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu); window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu); }, 200); }
    return () => { window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu); window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu); };
  }, [contextMenu]);

  const handleSpeakNote = (e?: any) => { e?.stopPropagation(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(safeText); if (selectedVoice) utterance.voice = selectedVoice; window.speechSynthesis.speak(utterance); } };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(safeText); } catch (err) {} };
  
  const openMenu = (clientX: number, clientY: number) => {
    triggerHaptic();
    const menuW = 200; const menuH = 260; 
    let x = clientX; let y = clientY;
    if (typeof window !== 'undefined') { if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; }
    setContextMenu({ x: Math.max(10, x), y: Math.max(10, y) });
  };

  const handleContextMenu = (e: any) => { 
      e.preventDefault(); e.stopPropagation(); 
      if(variant === 'default' || variant === 'sent') openMenu(e.clientX, e.clientY); 
  };

  const formatTime = (timestamp: any) => { try { const t = Number(timestamp); if (isNaN(t) || t === 0) return ''; return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  const handleTouchStart = (e: any) => { 
      if (e.targetTouches.length !== 1) return; 
      touchStartX.current = e.targetTouches[0].clientX; 
      touchStartY.current = e.targetTouches[0].clientY; 
      setIsSwiping(false); isLongPress.current = false; 
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

  const bgColor = customColors?.bg || 'bg-zinc-900';
  const textColor = customColors?.text || 'text-zinc-300';
  const shadowClass = customColors?.shadow || 'shadow-sm';
  const chatBorderClasses = variant !== 'default' ? (customColors?.border ? customColors.border : 'border-none') : 'border-none';
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
      <div className={`relative ${variant === 'default' ? 'w-fit max-w-[85%]' : 'max-w-[85%]'} overflow-visible group`} onContextMenu={handleContextMenu}>
        {variant === 'default' && ( <div className={`absolute inset-0 flex items-center justify-end pr-6 rounded-xl transition-opacity duration-200 ${swipeOffset < 0 ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: '#ef4444' }}><Trash2 className="text-white animate-pulse" size={24} /></div>)}
        
        <div className={`${bgColor} ${chatBorderClasses} ${radiusClass} ${audioUrl ? 'p-1' : 'p-3'} ${widthClass} ${shadowClass} relative transition-all duration-200`} style={{ transform: `translateX(${swipeOffset}px)` }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          
          {/* AUDIO MESSAGE */}
          {audioUrl ? (
             <div className="flex flex-col gap-1">
                <AudioPlayer src={audioUrl} />
                <div className="flex justify-end px-2 pb-1">
                   <div className="flex items-center gap-1">
                      <span className="text-[10px] opacity-60 font-medium text-zinc-400">{formatTime(note.date)}</span>
                      {variant === 'sent' && <StatusIcon />}
                   </div>
                </div>
             </div>
          ) : (
             // TEXT / IMAGE MESSAGE
             <div className="flex flex-col min-w-[80px]">
               {note.imageUrl && ( <div onClick={(e) => { e.stopPropagation(); onImageClick && onImageClick(note.imageUrl!); }} className="mb-1 rounded-lg overflow-hidden border-none bg-zinc-950 flex justify-center max-w-full cursor-zoom-in active:scale-95 transition-transform"><img src={note.imageUrl} alt="Attachment" className="w-full h-auto md:max-h-96 object-contain" /></div>)}
               <div className="block w-full">
                   {safeText && <span className={`text-base leading-snug whitespace-pre-wrap break-words ${textColor}`}>{safeText}</span>}
                   <div className="float-right ml-2 mt-2 flex items-center gap-1 align-bottom h-4">
                       {onEdit && <InlineActionButton onClick={onEdit} icon={Edit2} accentColor={'#da7756'} />}
                       {note.editedAt && <span className="text-[9px] italic opacity-50 text-white mr-1">edited</span>}
                       <span className="text-[10px] opacity-60 font-medium select-none text-current">{formatTime(note.date)}</span>
                       {variant === 'sent' && <div className="ml-0.5"><StatusIcon /></div>}
                   </div>
               </div>
             </div>
          )}
        </div>
      </div>

      {contextMenu && typeof document !== 'undefined' && createPortal( <div className="fixed z-[9999] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10" style={{ top: contextMenu.y, left: contextMenu.x, backgroundColor: 'rgba(24, 24, 27, 0.95)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}> 
      <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { handleCopy(); setContextMenu(null); }} accentColor={'#da7756'} /> 
      {variant === 'default' && <ContextMenuItem icon={Volume2} label="Play" onClick={() => { handleSpeakNote(); setContextMenu(null); }} accentColor={'#da7756'} />}
      {(variant === 'default' || variant === 'sent') && ( <> <div className="h-px bg-white/10 mx-3 my-1" /> <ContextMenuItem icon={Trash2} label="Delete" onClick={() => { if(onDelete) onDelete(note.id); setContextMenu(null); }} accentColor={'#da7756'} /> </> )} 
      </div>, document.body )}
    </>
  );
};