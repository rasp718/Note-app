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

// --- AUDIO PLAYER ---
const AudioPlayer = ({ src, barColor }: any) => {
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

// --- GAME LOGIC ENGINE ---
type RollResult = 
  | { type: 'auto_win'; label: '4-5-6 HEAD CRACK'; value: 100 }
  | { type: 'auto_loss'; label: '1-2-3 TRASH'; value: -1 }
  | { type: 'triple'; label: 'TRIPLES'; value: number }
  | { type: 'point'; label: 'POINT'; value: number }
  | { type: 'junk'; label: 'NOTHING'; value: 0 };

const analyzeRoll = (dice: number[]): RollResult => {
    const sorted = [...dice].sort((a, b) => a - b);
    const s = sorted.join('');
    
    // Instant Win/Loss
    if (s === '456') return { type: 'auto_win', label: '4-5-6', value: 100 };
    if (s === '123') return { type: 'auto_loss', label: '1-2-3', value: -1 };
    
    // Triples (Beats everything except 456)
    if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) return { type: 'triple', label: `TRIP ${sorted[0]}s`, value: 20 + sorted[0] };
    
    // Points (Pair + Singleton)
    if (sorted[0] === sorted[1]) return { type: 'point', label: `POINT ${sorted[2]}`, value: sorted[2] };
    if (sorted[1] === sorted[2]) return { type: 'point', label: `POINT ${sorted[0]}`, value: sorted[0] };
    if (sorted[0] === sorted[2]) return { type: 'point', label: `POINT ${sorted[1]}`, value: sorted[1] };
    
    // Junk
    return { type: 'junk', label: 'TRASH', value: 0 };
};

// --- VISUAL DIE COMPONENT ---
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

// --- GAME COMPONENT ---
interface GameState {
    p1Score: number;
    p2Score: number;
    turn: 'p1' | 'p2';
    p1Roll: { value: number, label: string } | null;
    dice: number[];
    message: string;
    msgColor: string;
    p1Id?: string;
    lastAction: string;
}

const StreetDiceGame = ({ dataStr, onSave, myId }: { dataStr: string, onSave: (d: string) => void, myId: string }) => {
    // 1. Initialize State
    let state: GameState = { 
        p1Score: 0, p2Score: 0, turn: 'p1', p1Roll: null, 
        dice: [4,5,6], message: 'RACE TO 5', msgColor: 'text-zinc-500', 
        p1Id: '', lastAction: 'init'
    };
    
    try {
        const parsed = JSON.parse(dataStr);
        state = { ...state, ...parsed };
    } catch(e) {}

    // 2. Assign Player 1
    useEffect(() => {
        if (!state.p1Id && myId) {
            onSave(JSON.stringify({ ...state, p1Id: myId }));
        }
    }, []);

    const iAmP1 = myId === state.p1Id;
    const isMyTurn = (state.turn === 'p1' && iAmP1) || (state.turn === 'p2' && !iAmP1);

    const [isRolling, setIsRolling] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [shakeOffset, setShakeOffset] = useState({x:0, y:0});
    const shakeInterval = useRef<any>(null);
    const longPressTimeout = useRef<any>(null);

    const startShake = () => {
        if(isRolling || !isMyTurn) return;
        setIsShaking(true);
        shakeInterval.current = setInterval(() => {
            triggerHaptic(10);
            setShakeOffset({ x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 });
        }, 50);
        longPressTimeout.current = setTimeout(() => releaseShake(), 2500);
    };

    const releaseShake = () => {
        if(!isShaking) return;
        clearInterval(shakeInterval.current);
        clearTimeout(longPressTimeout.current);
        setShakeOffset({x:0, y:0});
        setIsShaking(false);
        executeRoll();
    };

    const executeRoll = () => {
        setIsRolling(true);
        let rolls = 0;
        const rollInt = setInterval(() => {
            rolls++;
            if(rolls > 8) {
                clearInterval(rollInt);
                finalizeRoll();
            }
        }, 80);
    };

    // --- GAME BRAIN ---
    const finalizeRoll = () => {
        setIsRolling(false);
        triggerHaptic(50);
        
        const finalDice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        const result = analyzeRoll(finalDice);
        const next = { ...state, dice: finalDice };

        // Handle Junk
        if (result.type === 'junk') {
            next.message = "TRASH. ROLL AGAIN.";
            next.msgColor = "text-zinc-500";
            onSave(JSON.stringify(next));
            return;
        }

        // Logic
        if (next.turn === 'p1') {
            if (result.type === 'auto_win') {
                next.message = "BANKER WON! (4-5-6)";
                next.msgColor = "text-green-400";
                next.p1Score += 1;
                next.p1Roll = null;
                next.turn = 'p1';
            } else if (result.type === 'auto_loss') {
                next.message = "BANKER LOST! (1-2-3)";
                next.msgColor = "text-red-400";
                next.p2Score += 1;
                next.p1Roll = null;
                next.turn = 'p1';
            } else {
                next.p1Roll = { value: result.value, label: result.label };
                next.turn = 'p2';
                next.message = `${result.label}. OPP TO BEAT.`;
                next.msgColor = "text-white";
            }
        } else {
            // P2 Chasing P1
            if (!next.p1Roll) return;

            if (result.type === 'auto_win') {
                next.message = "CHALLENGER WON! (4-5-6)";
                next.msgColor = "text-red-400"; 
                next.p2Score += 1;
                next.p1Roll = null;
                next.turn = 'p1';
            } else if (result.type === 'auto_loss') {
                next.message = "CHALLENGER LOST! (1-2-3)";
                next.msgColor = "text-green-400";
                next.p1Score += 1;
                next.p1Roll = null;
                next.turn = 'p1';
            } else {
                // Point Comparison
                if (result.value > next.p1Roll.value) {
                    next.message = `CHALLENGER WON! (${result.label} vs ${next.p1Roll.label})`;
                    next.p2Score += 1;
                } else if (result.value < next.p1Roll.value) {
                    next.message = `BANKER WON! (${next.p1Roll.label} vs ${result.label})`;
                    next.p1Score += 1;
                } else {
                    next.message = "WASH! RE-ROLL ROUND.";
                }
                next.p1Roll = null;
                next.turn = 'p1';
            }
        }
        onSave(JSON.stringify(next));
    };

    const myScore = iAmP1 ? state.p1Score : state.p2Score;
    const oppScore = iAmP1 ? state.p2Score : state.p1Score;
    const isGameOver = myScore >= 5 || oppScore >= 5;

    // Helper for "YOU" vs "OPP" text replacement
    const getDisplayMessage = () => {
        let msg = state.message;
        if (msg.includes("BANKER")) msg = msg.replace("BANKER", iAmP1 ? "YOU" : "OPP");
        if (msg.includes("CHALLENGER")) msg = msg.replace("CHALLENGER", !iAmP1 ? "YOU" : "OPP");
        return msg;
    };

    return (
        <div className="w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700 relative shadow-2xl select-none min-w-[260px]">
            {/* Header */}
            <div className="flex justify-between items-center p-3 bg-black/30 border-b border-zinc-800">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-widest">YOU</span>
                    <div className="flex gap-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-1.5 h-4 rounded-sm transition-all ${i < myScore ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-800'}`}/>))}</div>
                </div>
                <div className="text-center">
                    <span className="text-[9px] text-zinc-600 font-mono tracking-widest">WINS</span>
                    <div className="flex items-center justify-center gap-1 text-orange-500 font-bold text-xs"><Trophy size={10} /> <span>{Math.max(myScore, oppScore)}</span></div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-widest">OPP</span>
                    <div className="flex gap-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-1.5 h-4 rounded-sm transition-all ${i < oppScore ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-800'}`}/>))}</div>
                </div>
            </div>

            {/* The Pit */}
            <div className="h-44 relative flex flex-col items-center justify-center gap-4" style={{ backgroundImage: 'radial-gradient(circle at center, #27272a 0%, #09090b 100%)' }}>
                
                {/* STATUS MESSAGE */}
                <div className={`font-black text-xs tracking-widest transition-colors duration-300 drop-shadow-md text-center px-4 ${state.message.includes('LOST') || (state.message.includes('OPP') && state.message.includes('WON')) ? 'text-red-500' : 'text-zinc-300'}`}>
                    {getDisplayMessage()}
                </div>

                {/* TARGET INDICATOR (Persistent while rolling) */}
                {state.p1Roll && (
                    <div className="text-[10px] font-mono text-zinc-500 bg-black/40 px-3 py-1 rounded-full border border-zinc-700 animate-pulse">
                        TARGET: <span className="text-white font-bold">{state.p1Roll.label}</span>
                    </div>
                )}

                <div className="flex gap-3 z-10 mt-1">
                    {state.dice.map((d, i) => <RedDie key={i} val={d} rolling={isRolling} shakeOffset={shakeOffset} />)}
                </div>
            </div>

            {/* Action Button */}
            <div className="p-2 bg-zinc-950 border-t border-zinc-800">
                {!isGameOver ? (
                    <button 
                        onPointerDown={(e) => { 
                            if(isMyTurn) { e.preventDefault(); e.currentTarget.releasePointerCapture(e.pointerId); startShake(); }
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onPointerUp={() => isMyTurn && releaseShake()}
                        onPointerLeave={() => isMyTurn && releaseShake()}
                        disabled={isRolling || !isMyTurn}
                        className={`w-full py-3 rounded-lg font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 select-none touch-none
                        ${isMyTurn ? 'bg-zinc-100 text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'}`}
                    >
                        {isRolling ? '...' : (isShaking ? 'RELEASE TO ROLL' : (isMyTurn ? 'HOLD TO SHAKE' : 'WAITING FOR OPP...'))}
                    </button>
                ) : (
                    <div className={`w-full py-3 rounded-lg font-black text-xs text-center tracking-widest animate-pulse ${myScore >= 5 ? 'bg-green-500 text-black' : 'bg-red-900/50 text-red-200 border border-red-800'}`}>
                        {myScore >= 5 ? 'YOU WON THE BAG 💰' : 'PAY THE MAN 💀'}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN NOTE CARD WRAPPER ---
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
  variant?: 'default' | 'sent' | 'received';
  status?: 'sending' | 'sent' | 'read';
  currentUserId?: string;
  customColors?: { bg: string; border: string; text: string; subtext?: string; shadow?: string; font?: string };
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, categories, selectedVoice, onDelete, onPin, onCategoryClick, onEdit, onUpdate, onToggleExpand, onImageClick, variant = 'default', status, currentUserId, customColors }) => {
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
  
  const isDiceGame = safeText.includes('STREET_DICE_GAME');
  let gameData = "";
  if (isDiceGame) {
      const parts = safeText.split('|||');
      if (parts.length > 1) gameData = parts[1];
  }

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
  const openMenu = (clientX: number, clientY: number) => { triggerHaptic(); const menuW = 200; const menuH = 260; let x = clientX; let y = clientY; if (typeof window !== 'undefined') { if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 20; if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 20; } setContextMenu({ x: Math.max(10, x), y: Math.max(10, y) }); };
  const handleContextMenu = (e: any) => { e.preventDefault(); e.stopPropagation(); if(variant === 'default' || variant === 'sent') openMenu(e.clientX, e.clientY); };
  const formatTime = (timestamp: any) => { try { const t = Number(timestamp); if (isNaN(t) || t === 0) return ''; return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

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
  
  // Use p-1 for ALL types to keep borders thin (images, games, and text)
  const paddingClass = 'p-1';

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
                 <StreetDiceGame 
                    dataStr={gameData} 
                    onSave={handleGameUpdate} 
                    myId={currentUserId || 'unknown'} 
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