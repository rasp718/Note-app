import React, { useState, useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';

// --- UTILS & HELPERS ---
const triggerHaptic = (pattern: number | number[] = 15) => { 
    if (typeof navigator !== 'undefined' && navigator.vibrate) { 
        try { navigator.vibrate(pattern); } catch (e) {} 
    } 
};

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
    
    // Triples
    if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) return { type: 'triple', label: `TRIP ${sorted[0]}s`, value: 20 + sorted[0] };
    
    // Points
    if (sorted[0] === sorted[1]) return { type: 'point', label: `POINT ${sorted[2]}`, value: sorted[2] };
    if (sorted[1] === sorted[2]) return { type: 'point', label: `POINT ${sorted[0]}`, value: sorted[0] };
    if (sorted[0] === sorted[2]) return { type: 'point', label: `POINT ${sorted[1]}`, value: sorted[1] };
    
    return { type: 'junk', label: 'TRASH', value: 0 };
};

// --- VISUAL COMPONENT ---
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

// --- MAIN GAME COMPONENT ---
interface GameState {
    p1Score: number; p2Score: number; turn: 'p1' | 'p2';
    p1Roll: { value: number, label: string } | null;
    dice: number[]; message: string; msgColor: string;
    p1Id?: string; lastAction: string;
}

export const StreetDiceGame = ({ 
    dataStr, onSave, myId, oppName, oppAvatar 
}: { 
    dataStr: string, onSave: (d: string) => void, myId: string, oppName: string, oppAvatar?: string 
}) => {
    let state: GameState = { 
        p1Score: 0, p2Score: 0, turn: 'p1', p1Roll: null, 
        dice: [4,5,6], message: 'RACE TO 5', msgColor: 'text-zinc-500', 
        p1Id: '', lastAction: 'init'
    };
    
    try { state = { ...state, ...JSON.parse(dataStr) }; } catch(e) {}

    useEffect(() => {
        if (!state.p1Id && myId) { onSave(JSON.stringify({ ...state, p1Id: myId })); }
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
        clearInterval(shakeInterval.current); clearTimeout(longPressTimeout.current);
        setShakeOffset({x:0, y:0}); setIsShaking(false);
        executeRoll();
    };

    const executeRoll = () => {
        setIsRolling(true);
        let rolls = 0;
        const rollInt = setInterval(() => {
            rolls++;
            if(rolls > 8) { clearInterval(rollInt); finalizeRoll(); }
        }, 80);
    };

    const finalizeRoll = () => {
        setIsRolling(false); triggerHaptic(50);
        const finalDice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        const result = analyzeRoll(finalDice);
        const next = { ...state, dice: finalDice };

        if (result.type === 'junk') {
            next.message = "TRASH. ROLL AGAIN."; next.msgColor = "text-zinc-500";
            onSave(JSON.stringify(next)); return;
        }

        if (next.turn === 'p1') {
            if (result.type === 'auto_win') {
                next.message = "BANKER WON! (4-5-6)"; next.msgColor = "text-green-400"; next.p1Score += 1; next.p1Roll = null; next.turn = 'p1';
            } else if (result.type === 'auto_loss') {
                next.message = "BANKER LOST! (1-2-3)"; next.msgColor = "text-red-400"; next.p2Score += 1; next.p1Roll = null; next.turn = 'p1';
            } else {
                next.p1Roll = { value: result.value, label: result.label }; next.turn = 'p2'; next.message = `POINT SET.`; next.msgColor = "text-white";
            }
        } else {
            if (!next.p1Roll) return;
            if (result.type === 'auto_win') {
                next.message = "CHALLENGER WON! (4-5-6)"; next.msgColor = "text-red-400"; next.p2Score += 1; next.p1Roll = null; next.turn = 'p1';
            } else if (result.type === 'auto_loss') {
                next.message = "CHALLENGER LOST! (1-2-3)"; next.msgColor = "text-green-400"; next.p1Score += 1; next.p1Roll = null; next.turn = 'p1';
            } else {
                if (result.value > next.p1Roll.value) { next.message = `CHALLENGER WON! (${result.label} vs ${next.p1Roll.label})`; next.p2Score += 1; } 
                else if (result.value < next.p1Roll.value) { next.message = `BANKER WON! (${next.p1Roll.label} vs ${result.label})`; next.p1Score += 1; } 
                else { next.message = "WASH! RE-ROLL ROUND."; }
                next.p1Roll = null; next.turn = 'p1';
            }
        }
        onSave(JSON.stringify(next));
    };

    const myScore = iAmP1 ? state.p1Score : state.p2Score;
    const oppScore = iAmP1 ? state.p2Score : state.p1Score;
    const isGameOver = myScore >= 5 || oppScore >= 5;

    const getHeaderText = () => {
        const msg = state.message;
        if (msg.includes("WON") || msg.includes("LOST")) {
            if (msg.includes("BANKER")) return iAmP1 ? "YOU WON!" : `${oppName} WON!`;
            if (msg.includes("CHALLENGER")) return !iAmP1 ? "YOU WON!" : `${oppName} WON!`;
        }
        if (state.p1Roll) {
             if (isMyTurn) return `BEAT ${oppName}'s ${state.p1Roll.label}!`;
             return `WAITING FOR ${oppName}...`;
        }
        if (isMyTurn) return "YOUR ROLL";
        return `${oppName} IS ROLLING...`;
    };

    return (
        <div className="w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700 relative shadow-2xl select-none min-w-[260px]">
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
                    <span className="text-[10px] font-bold text-zinc-500 tracking-widest truncate max-w-[60px]">{oppName.toUpperCase()}</span>
                    <div className="flex gap-1">{[...Array(5)].map((_, i) => (<div key={i} className={`w-1.5 h-4 rounded-sm transition-all ${i < oppScore ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-zinc-800'}`}/>))}</div>
                </div>
            </div>
            <div className="h-44 relative flex flex-col items-center justify-center gap-4" style={{ backgroundImage: 'radial-gradient(circle at center, #27272a 0%, #09090b 100%)' }}>
                <div className={`font-black text-xs tracking-widest transition-colors duration-300 drop-shadow-md text-center px-4 ${state.message.includes('LOST') ? 'text-red-500' : 'text-zinc-300'}`}>{getHeaderText()}</div>
                {state.p1Roll && (
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-zinc-700 animate-in fade-in slide-in-from-bottom-2">
                         <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden border border-zinc-600">
                             {iAmP1 ? (<div className="w-full h-full bg-green-500/20 flex items-center justify-center text-[10px]">ME</div>) : (<img src={oppAvatar || ''} className="w-full h-full object-cover" />)}
                         </div>
                         <div className="flex flex-col leading-none"><span className="text-[9px] text-zinc-500 font-bold uppercase">{iAmP1 ? 'YOU' : oppName} SET POINT</span><span className="text-sm font-black text-white font-mono">{state.p1Roll.label}</span></div>
                    </div>
                )}
                <div className="flex gap-3 z-10 mt-1">{state.dice.map((d, i) => <RedDie key={i} val={d} rolling={isRolling} shakeOffset={shakeOffset} />)}</div>
            </div>
            <div className="p-2 bg-zinc-950 border-t border-zinc-800">
                {!isGameOver ? (
                    <button style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => { e.stopPropagation(); if(isMyTurn) { e.preventDefault(); e.currentTarget.releasePointerCapture(e.pointerId); startShake(); } }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} onPointerUp={() => isMyTurn && releaseShake()} onPointerLeave={() => isMyTurn && releaseShake()} disabled={isRolling || !isMyTurn} className={`w-full py-3 rounded-lg font-black tracking-widest text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 select-none touch-none ${isMyTurn ? 'bg-zinc-100 text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'}`}> {isRolling ? '...' : (isShaking ? 'RELEASE TO ROLL' : (isMyTurn ? 'HOLD TO SHAKE' : `WAITING FOR ${oppName}...`))} </button>
                ) : (
                    <div className={`w-full py-3 rounded-lg font-black text-xs text-center tracking-widest animate-pulse ${myScore >= 5 ? 'bg-green-500 text-black' : 'bg-red-900/50 text-red-200 border border-red-800'}`}> {myScore >= 5 ? 'YOU WON THE BAG 💰' : 'PAY THE MAN 💀'} </div>
                )}
            </div>
        </div>
    );
};