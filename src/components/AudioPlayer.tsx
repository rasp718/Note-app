import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

export const AudioPlayer = ({ src, barColor }: { src: string, barColor?: string }) => {
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