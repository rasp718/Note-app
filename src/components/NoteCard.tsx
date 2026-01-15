import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Volume2, Edit2, CornerUpRight, Check, CheckCheck, Play, Pause, Trophy, Dices, RotateCcw } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

// --- UTILS ---
const triggerHaptic = (pattern: number | number[] = 15) => { 
    if (typeof navigator !== 'undefined' && navigator.vibrate) { 
        try { navigator.vibrate(pattern); } catch (e) {} 
    } 
};

// --- STREET DICE COMPONENTS ---
type RollResult = 
  | { type: 'auto_win'; label: '4-5-6 HEAD CRACK'; value: 100 }
  | { type: 'auto_loss'; label: '1-2-3 TRASH'; value: -1 }
  | { type: 'triple'; label: 'TRIPLES'; value: number }
  | { type: 'point'; label: 'POINT'; value: number }
  | { type: 'junk'; label: 'ROLL AGAIN'; value: 0 };

const analyzeRoll = (dice: number[]): RollResult => {
    const sorted = [...dice].sort((a, b) => a - b);
    const s = sorted.join('');
    if (s === '456') return { type: 'auto_win', label: '4-5-6 HEAD CRACK', value: 100 };
    if (s === '123') return { type: 'auto_loss', label: '1-2-3 TRASH', value: -1 };
    if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) return { type: 'triple', label: `TRIPLE ${sorted[0]}s`, value: 20 + sorted[0] };
    if (sorted[0] === sorted[1]) return { type: 'point', label: `POINT IS ${sorted[2]}`, value: sorted[2] };
    if (sorted[1] === sorted[2]) return { type: 'point', label: `POINT IS ${sorted[0]}`, value: sorted[0] };
    if (sorted[0] === sorted[2]) return { type: 'point', label: `POINT IS ${sorted[1]}`, value: sorted[1] };
    return { type: 'junk', label: 'NOTHING', value: 0 };
};

const RedDie = ({ val, rolling, shakeOffset }: { val: number, rolling: boolean, shakeOffset: {x:number, y:number} }) => {
    const pips: any = {
        1: ['center'], 2: ['top-left', 'bottom-right'], 3: ['top-left', 'center', 'bottom-right'],
        4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], 5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
        6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right']
    };
    const getPos = (p: string) => {
        const style: any = {};
        if (p.includes('top')) style.top = '15%'; if (p.includes('bottom')) style.bottom = '15%';
        if (p.includes('mid')) style.top = '50%'; if (p.includes('left')) style.left = '15%';
        if (p.includes('right')) style.right = '15%';
        if (p === 'center') { style.top = '50%'; style.left = '50%'; style.transform = 'translate(-50%, -50%)'; }
        if (p.includes('mid')) style.transform = 'translateY(-50%)';
        return style;
    };

    return (
        <div className="w-12 h-12 rounded-xl relative shadow-lg transition-transform duration-75 border border-red-400/50"
             style={{
                 backgroundColor: 'rgba(220, 38, 38, 0.85)',
                 boxShadow: 'inset 0 0 10px rgba(100,0,0,0.8), 0 4px 8px rgba(0,0,0,0.5)',
                 transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px) rotate(${rolling ? Math.random() * 360 : 0}deg)`
             }}>
             {!rolling && pips[val].map((pos: string, i: number) => (
                 <div key={i} className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-sm" style={getPos(pos)} />
             ))}
             <div className="absolute top-1 left-1 right-1 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-lg pointer-events-none" />
        </div>
    );
};

const StreetDiceGame = () => {
    const [p1Score, setP1Score] = useState(0);
    const [p2Score, setP2Score] = useState(0);
    const [turn, setTurn] = useState<'p1' | 'p2'>('p1');
    const [p1Roll, setP1Roll] = useState<RollResult | null>(null);
    const [dice, setDice] = useState([4, 5, 6]);
    const [isRolling, setIsRolling] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [message, setMessage] = useState("RACE TO 5");
    const [msgColor, setMsgColor] = useState("text-zinc-500");
    const [shakeOffset, setShakeOffset] = useState({x:0, y:0});
    
    // Refs for holding logic
    const shakeInterval = useRef<any>(null);
    const longPressTimeout = useRef<any>(null);

    // Shake Logic
    const startShake = () => {
        if(isRolling || p1Score >=5 || p2Score >=5) return;
        setIsShaking(true);
        setMessage("HOLD IT...");
        setMsgColor("text-zinc-400");
        
        // Haptics Loop & Visual Jitter
        shakeInterval.current = setInterval(() => {
            triggerHaptic(10);
            setShakeOffset({ x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 });
        }, 50);

        // Force Roll after 3 seconds (No infinite holding)
        longPressTimeout.current = setTimeout(() => {
            releaseShake();
        }, 3000);
    };

    const releaseShake = () => {
        if(!isShaking) return;
        
        // Cleanup Shake
        clearInterval(shakeInterval.current);
        clearTimeout(longPressTimeout.current);
        setShakeOffset({x:0, y:0});
        setIsShaking(false);
        
        // Trigger Roll
        executeRoll();
    };

    const executeRoll = () => {
        setIsRolling(true);
        setMessage("ROLLING...");
        
        // Animation Loop
        let rolls = 0;
        const rollInt = setInterval(() => {
            setDice([Math.ceil(Math.random()*6), Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)]);
            rolls++;
            if(rolls > 8) {
                clearInterval(rollInt);
                finalizeRoll();
            }
        }, 80);
    };

    const finalizeRoll = () => {
        setIsRolling(false);
        const finalDice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        setDice(finalDice);
        triggerHaptic(50); // Impact haptic
        
        const result = analyzeRoll(finalDice);
        processTurn(result);
    };

    const processTurn = (result: RollResult) => {
        if (result.type === 'junk') {
            setMessage("TRASH. ROLL AGAIN.");
            setMsgColor("text-zinc-500");
            return;
        }

        if (turn === 'p1') {
            if (result.type === 'auto_win') roundWin('p1', result.label);
            else if (result.type === 'auto_loss') roundWin('p2', "P1 ROLLED 1-2-3");
            else {
                setP1Roll(result);
                setTurn('p2');
                setMessage(`${result.label}. P2 TO BEAT.`);
                setMsgColor("text-white");
            }
        } else {
            if (!p1Roll) return;
            if (result.type === 'auto_win') { roundWin('p2', result.label); return; }
            if (result.type === 'auto_loss') { roundWin('p1', "P2 ROLLED 1-2-3"); return; }

            if (result.value > p1Roll.value) roundWin('p2', `${result.label} BEATS ${p1Roll.label}`);
            else if (result.value < p1Roll.value) roundWin('p1', `${p1Roll.label} HELD UP`);
            else {
                setMessage("WASH! RE-ROLL ROUND.");
                setMsgColor("text-yellow-500");
                setP1Roll(null);
                setTurn('p1');
            }
        }
    };

    const roundWin = (winner: 'p1' | 'p2', reason: string) => {
        setMessage(reason);
        setMsgColor(winner === 'p1' ? 'text-green-400' : 'text-red-400');
        triggerHaptic([50, 50, 100]);
        setTimeout(() => {
            if (winner === 'p1') setP1Score(s => s + 1);
            else setP2Score(s => s + 1);
            setP1Roll(null);
            setTurn('p1');
        }, 1500);
    };

    const gameOver = p1Score >= 5 || p2Score >= 5;

    return (
        <div className="w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700 relative shadow-2xl select-none min-w-[260px]">
            {/* Header */}
            <div className="flex justify-between items-center p-3 bg-black/30 border-b border-zinc-800">
                <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-zinc-500 tracking-widest">YOU</span><div className="flex gap-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-1.5 h-4 rounded-sm transition-all ${i < p1Score ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-800'}`}/>))}</div></div>
                <div className="text-center"><span className="text-[9px] text-zinc-600 font-mono tracking-widest">STREAK</span><div className="flex items-center justify-center gap-1 text-orange-500 font-bold text-xs"><Trophy size={10} /> <span>3</span></div></div>
                <div className="flex flex-col gap-1 items-end"><span className="text-[10px] font-bold text-zinc-500 tracking-widest">OPP</span><div className="flex gap-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-1.5 h-4 rounded-sm transition-all ${i < p2Score ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-800'}`}/>))}</div></div>
            </div>

            {/* The Pit */}
            <div className="h-40 relative flex flex-col items-center justify-center gap-4" style={{ backgroundImage: 'radial-gradient(circle at center, #27272a 0%, #09090b 100%)' }}>
                <div className={`absolute top-3 font-black text-xs tracking-widest transition-colors duration-300 ${msgColor} drop-shadow-md text-center px-4`}>{message}</div>
                <div className="flex gap-3 z-10">
                    {dice.map((d, i) => <RedDie key={i} val={d} rolling={isRolling} shakeOffset={shakeOffset} />)}
                </div>
            </div>

            {/* Action Button */}
            <div className="p-2 bg-zinc-950 border-t border-zinc-800">
                {!gameOver ? (
                    <button 
                        onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); startShake(); }}
                        onPointerUp={releaseShake}
                        onPointerLeave={releaseShake}
                        disabled={isRolling || (turn === 'p2' && false)} // Disabled p2 check for local testing
                        className={`w-full py-3 rounded-lg font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2
                        ${turn === 'p1' ? 'bg-zinc-100 text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                    >
                        {isRolling ? '...' : (isShaking ? 'RELEASE TO ROLL' : (turn === 'p1' ? 'HOLD TO SHAKE' : 'OPPONENT TURN'))}
                    </button>
                ) : (
                    <div className="w-full py-3 rounded-lg bg-green-500 text-black font-black text-xs text-center tracking-widest animate-pulse">
                        {p1Score >= 5 ? 'YOU WON THE BAG 💰' : 'PAY THE MAN 💀'}
                    </div>
                )}
            </div>
        </div>
    );
};

// ... (Rest of NoteCard remains similar, just integrating the new component)
// --- AUDIO PLAYER ---
const AudioPlayer = ({ src, barColor }: any) => {
    // (Same AudioPlayer code as before)
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [bars] = useState(() => Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 20));
    useEffect(() => {
        const audio = audioRef.current; if (!audio) return;
        const handleTimeUpdate = () => { if (Number.isFinite(audio.duration)) { setDuration(audio.duration); setCurrentTime(audio.currentTime); setProgress((audio.currentTime / audio.duration) * 100); } };
        const handleEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
        const handleLoadedMetadata = () => { setDuration(audio.duration); };
        audio.addEventListener('timeupdate', handleTimeUpdate); audio.addEventListener('ended', handleEnded); audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => { audio.removeEventListener('timeupdate', handleTimeUpdate); audio.removeEventListener('ended', handleEnded); audio.removeEventListener('loadedmetadata', handleLoadedMetadata); };
    }, []);
    const togglePlay = async (e: any) => { e.stopPropagation(); if(!audioRef.current) return; if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } else { try { await audioRef.current.play(); setIsPlaying(true); } catch (err) { console.error(err); } } };
    const toggleSpeed = (e: any) => { e.stopPropagation(); if (!audioRef.current) return; const newRate = playbackRate === 1 ? 1.5 : (playbackRate === 1.5 ? 2 : 1); audioRef.current.playbackRate = newRate; setPlaybackRate(newRate); };
    const formatTime = (time: number) => { if (!time || isNaN(time)) return "0:00"; const m = Math.floor(time / 60); const s = Math.floor(time % 60); return `${m}:${s.toString().padStart(2, '0')}`; };
    const activeColor = barColor || '#da7756';
    return (
        <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[240px] bg-[#1f2937] rounded-full p-1 pr-4 border border-zinc-700 select-none shadow-sm mt-1 mb-1">
            <button onClick={togglePlay} className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-colors shrink-0"> {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />} </button>
            <div className="flex-1 flex items-center gap-[2px] h-8 mx-1 opacity-90"> {bars.map((height, i) => { const barPercent = (i / bars.length) * 100; const isActive = progress > barPercent; return ( <div key={i} className="w-[3px] rounded-full transition-colors duration-150" style={{ height: `${height}%`, backgroundColor: isActive ? activeColor : '#52525b' }} /> ); })} </div>
            <span className="text-xs font-mono text-zinc-400 min-w-[35px] text-right"> {isPlaying ? formatTime(currentTime) : formatTime(duration)} </span>
            <button onClick={toggleSpeed} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white hover:bg-zinc-700 transition-colors ml-1 border border-zinc-600"> {playbackRate}x </button>
            <audio ref={audioRef} src={src} preload="metadata" playsInline />
        </div>
    );
};

const ContextMenuItem = ({ icon: Icon, label, onClick, accentColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleAction = () => { triggerHaptic(); onClick(); };
  return (
    <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(); }} onClick={(e) => { e.stopPropagation(); handleAction(); }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="w-full flex items-center gap-3 px-3 py-3 text-sm transition-colors duration-150 cursor-pointer select-none active:bg-white/10" style={{ backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }}>
      <Icon size={18} style={{ color: isHovered ? accentColor : '#a1a1aa' }} /><span className="font-medium" style={{ color: isHovered ? accentColor : '#f4f4f5' }}>{label}</span>
    </button>
  );
};
const InlineActionButton = ({ onClick, icon: Icon, accentColor, iconColor }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); triggerHaptic(); onClick(e); }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="p-1 rounded-full transition-colors active:scale-90 align-middle" style={{ color: isHovered ? accentColor : (iconColor || '#71717a') }}><Icon size={12} /></button>
  );
};

// --- MAIN NOTE CARD ---
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
  customColors?: { bg: string; border: string; text: string; subtext?: string; shadow?: string; font?: string };
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onToggleExpand, onImageClick, variant = 'default', status, customColors }) => {
  if (!note) return null;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false); 
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false); 
  
  const safeText = String(note.text || '');
  const audioUrl = (note as any).audioUrl;
  const hasImage = !!note.imageUrl;
  
  // --- DETECT GAME ---
  // We removed the emoji from the check so it works even if encryption messes it up
  const isDiceGame = safeText.includes('STREET_DICE_GAME');

  useEffect(() => {
    const closeMenu = (e: any) => { if (e.type === 'scroll') return; setContextMenu(null); };
    if (contextMenu) { setTimeout(() => { window.addEventListener('click', closeMenu); window.addEventListener('touchstart', closeMenu); window.addEventListener('scroll', closeMenu, { capture: true }); window.addEventListener('resize', closeMenu); }, 200); }
    return () => { window.removeEventListener('click', closeMenu); window.removeEventListener('touchstart', closeMenu); window.removeEventListener('scroll', closeMenu, { capture: true }); window.removeEventListener('resize', closeMenu); };
  }, [contextMenu]);

  const handleSpeakNote = (e?: any) => { e?.stopPropagation(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(safeText); if (selectedVoice) utterance.voice = selectedVoice; window.speechSynthesis.speak(utterance); } };
  const handleCopy = async () => { try { await navigator.clipboard.writeText(safeText); } catch (err) {} };
  const openMenu = (clientX: number, clientY: number) => { triggerHaptic(); const menuW = 200; const menuH = 260; let x = clientX; let y = clientY; if (typeof window !== 'undefined') { if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; } setContextMenu({ x: Math.max(10, x), y: Math.max(10, y) }); };
  const handleContextMenu = (e: any) => { e.preventDefault(); e.stopPropagation(); if(variant === 'default' || variant === 'sent') openMenu(e.clientX, e.clientY); };
  const formatTime = (timestamp: any) => { try { const t = Number(timestamp); if (isNaN(t) || t === 0) return ''; return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  // --- TOUCH HANDLERS ---
  const handleTouchStart = (e: any) => { 
      if (e.targetTouches.length !== 1) return; 
      touchStartX.current = e.targetTouches[0].clientX; touchStartY.current = e.targetTouches[0].clientY; touchStartTime.current = Date.now(); setIsSwiping(false); isLongPress.current = false; 
      if (variant === 'default' || variant === 'sent') { longPressTimer.current = setTimeout(() => { if (touchStartX.current && touchStartY.current) { isLongPress.current = true; openMenu(touchStartX.current, touchStartY.current); } }, 600); }
  };
  const handleTouchMove = (e: any) => { 
      if (!touchStartX.current || !touchStartY.current || isExiting) return; 
      const diffX = e.targetTouches[0].clientX - touchStartX.current; const diffY = e.targetTouches[0].clientY - touchStartY.current; 
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } } 
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

  const bgColor = customColors?.bg || 'bg-zinc-900';
  const textColor = customColors?.text || 'text-zinc-300';
  const subtextColor = customColors?.subtext || 'text-zinc-400 opacity-60'; 
  const shadowClass = customColors?.shadow || 'shadow-sm';
  const chatBorderClasses = customColors?.border || 'border-none';
  let radiusClass = 'rounded-2xl'; 
  if (variant === 'sent') radiusClass = 'rounded-2xl rounded-br-none';
  if (variant === 'received') radiusClass = 'rounded-2xl rounded-bl-none';
  const widthClass = variant === 'default' ? 'w-full' : 'w-fit max-w-full';
  
  // Minimal padding for games/images
  const paddingClass = (hasImage || audioUrl || isDiceGame) ? 'p-1' : 'p-3';

  const StatusIcon = ({ isOverlay = false }) => {
    if (variant !== 'sent') return null;
    const defaultColor = customColors?.bg?.includes('white') ? 'text-blue-500' : 'text-blue-400';
    const pendingColor = customColors?.bg?.includes('white') ? 'text-zinc-400' : 'text-white/50';
    const colorClass = isOverlay ? "text-white" : (status === 'read' ? defaultColor : pendingColor);
    if (status === 'sending') return <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${isOverlay ? 'border-white' : 'border-white/50'}`} />;
    if (status === 'read') return <CheckCheck size={14} className={colorClass} strokeWidth={2.5} />;
    return <Check size={14} className={colorClass} strokeWidth={2} />;
  };

  const audioBarColor = customColors?.bg?.includes('green') ? '#166534' : (customColors?.bg?.includes('blue') ? '#1e3a8a' : '#da7756');

  return (
    <>
      <div className={`relative ${variant === 'default' ? 'w-fit max-w-[85%]' : 'max-w-[85%]'} overflow-visible group`} onContextMenu={handleContextMenu}>
        <div className={`${bgColor} ${chatBorderClasses} ${radiusClass} ${paddingClass} ${widthClass} ${shadowClass} relative transition-all duration-300 ease-out`} style={{ transform: `translateX(${swipeOffset}px)`, opacity: isExiting ? 0 : 1 }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          
          {audioUrl ? (
             <div className="flex flex-col gap-1">
                <AudioPlayer src={audioUrl} barColor={audioBarColor} />
                <div className="flex justify-end px-2 pb-1"><div className="flex items-center gap-1"><span className={`text-[10px] font-medium ${subtextColor}`}>{formatTime(note.date)}</span>{variant === 'sent' && <StatusIcon />}</div></div>
             </div>
          ) : isDiceGame ? (
             <div className="flex flex-col">
                 <StreetDiceGame />
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
                   {safeText && <span className={`text-base leading-snug whitespace-pre-wrap break-words ${textColor}`}>{safeText}</span>}
                   <div className="float-right ml-2 mt-2 flex items-center gap-1 align-bottom h-4">
                       {onEdit && <InlineActionButton onClick={onEdit} icon={Edit2} accentColor={'#da7756'} iconColor={subtextColor.includes('zinc-400') ? '#71717a' : 'currentColor'} />}
                       <span className={`text-[10px] font-medium select-none ${subtextColor}`}>{formatTime(note.date)}</span>
                       {variant === 'sent' && <div className="ml-0.5"><StatusIcon /></div>}
                   </div>
               </div>
             </div>
          )}
        </div>
      </div>
      {contextMenu && typeof document !== 'undefined' && createPortal( <div className="fixed z-[9999] min-w-[190px] backdrop-blur-md rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1.5 overflow-hidden ring-1 ring-white/10" style={{ top: contextMenu.y, left: contextMenu.x, backgroundColor: 'rgba(24, 24, 27, 0.95)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}> <ContextMenuItem icon={CornerUpRight} label="Reply" onClick={() => { handleCopy(); setContextMenu(null); }} accentColor={'#da7756'} /> {variant === 'default' && <ContextMenuItem icon={Volume2} label="Play" onClick={() => { handleSpeakNote(); setContextMenu(null); }} accentColor={'#da7756'} />} {onEdit && ( <ContextMenuItem icon={Edit2} label="Edit" onClick={() => { onEdit(); setContextMenu(null); }} accentColor={'#da7756'} /> )} {(variant === 'default' || variant === 'sent') && ( <> <div className="h-px bg-white/10 mx-3 my-1" /> <ContextMenuItem icon={Trash2} label="Delete" onClick={() => { if(onDelete) onDelete(note.id); setContextMenu(null); }} accentColor={'#da7756'} /> </> )} </div>, document.body )}
    </>
  );
};