import React, { useRef, useEffect, useState } from 'react';
import {
  Check, Edit, Camera, Grid, Activity, QrCode, SlidersHorizontal, 
  PaintBucket, ChevronLeft, MessageSquareDashed, Moon, ImageIcon, User, LogOut
} from 'lucide-react';

interface SettingsViewProps {
  // Profile State
  profileName: string;
  setProfileName: (val: string) => void;
  profileHandle: string;
  profileBio: string;
  setProfileBio: (val: string) => void;
  profilePic: string | null;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  showAvatarSelector: boolean;
  setShowAvatarSelector: (val: boolean) => void;
  
  // Actions
  onProfileSave: () => void;
  onAvatarUpload: (file: File) => void;
  onSelectPreset: (num: number) => void;
  onShowQRCode: () => void;
  onLogout: () => void;

  // Appearance State
  bubbleStyle: string;
  onChangeBubbleStyle: (style: string) => void;
  replyTheme: string;
  onChangeReplyTheme: (theme: string) => void;
  isAutoRedMode: boolean;
  onToggleRedMode: () => void;
  bgScale: number;
  setBgScale: (val: number) => void; // Keeping prop for compatibility, even if UI is removed
  bgOpacity: number;
  setBgOpacity: (val: number) => void;
  bgIndex: number;
  setBgIndex: (val: number) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profileName, setProfileName, profileHandle, profileBio, setProfileBio,
  profilePic, isEditingProfile, setIsEditingProfile, showAvatarSelector, setShowAvatarSelector,
  onProfileSave, onAvatarUpload, onSelectPreset, onShowQRCode, onLogout,
  bubbleStyle, onChangeBubbleStyle, replyTheme, onChangeReplyTheme,
  isAutoRedMode, onToggleRedMode, bgScale, setBgScale, bgOpacity, setBgOpacity,
  bgIndex, setBgIndex
}) => {
  const bubbleListRef = useRef<HTMLDivElement>(null);
  const replyListRef = useRef<HTMLDivElement>(null);
  const bgListRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [scrollProgress, setScrollProgress] = useState(0);

  // Horizontal Scrolling Helper
  useEffect(() => {
    const handleHorizontalWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.currentTarget.scrollLeft += e.deltaY;
      }
    };
    
    const timeoutId = setTimeout(() => {
      [bubbleListRef.current, replyListRef.current, bgListRef.current].forEach(el => {
        if (el) el.addEventListener('wheel', handleHorizontalWheel, { passive: false });
      });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      [bubbleListRef.current, replyListRef.current, bgListRef.current].forEach(el => {
        if (el) el.removeEventListener('wheel', handleHorizontalWheel);
      });
    };
  }, []);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const amount = direction === 'left' ? -200 : 200;
      ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Smooth Scroll Listener
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const progress = Math.min(scrollTop / 150, 1);
    setScrollProgress(progress);
  };

  const isCollapsed = scrollProgress > 0.9;

  // --- ANIMATION CONSTANTS ---
  const p = isEditingProfile ? 0 : scrollProgress;
  
  // Header height: 340px -> 80px
  const headerHeight = 340 - (p * 260); 
  
  // Avatar Math
  const avatarSize = 150 - (p * 110); 
  const avatarTop = 40 - (p * 30); 

  // Text Math
  const textTop = 210 - (p * 158); 
  const nameOpacity = Math.max(0, 1 - (p * 1.5));
  const dotOpacity = p > 0.5 ? (p - 0.5) * 2 : 0;
  const fadeOutOpacity = 1 - (p * 3); 

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-black">
      
      {/* 0. BACKGROUND IMAGE LAYER */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 transition-all duration-500 ease-out will-change-transform"
          style={{
            opacity: bgOpacity, 
            transform: `scale(${bgScale / 100})`, 
          }}
        >
          <img 
            src={`/bg${bgIndex}.jpg`} 
            alt="background" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 1. FIXED HEADER */}
      <div 
        className="absolute top-0 left-0 right-0 z-50 overflow-hidden border-b transition-all duration-100 ease-out"
        style={{ 
          height: isEditingProfile ? 'auto' : `${headerHeight}px`,
          backgroundColor: `rgba(0, 0, 0, ${0.5 + (p * 0.5)})`, 
          borderColor: `rgba(255, 255, 255, ${p * 0.1})`,
          backdropFilter: `blur(${10 + (p * 20)}px)`
        }}
      >
        <div className="relative w-full h-full max-w-2xl mx-auto">
          
          {/* LEFT: QR CODE */}
          <div className="absolute top-5 left-4 z-50">
             <button onClick={onShowQRCode} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md active:scale-90">
                <QrCode size={20} />
             </button>
          </div>

          {/* RIGHT: EDIT / SAVE */}
          <div className="absolute top-5 right-4 z-50">
             {isEditingProfile ? (
              <button onClick={onProfileSave} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform active:scale-90">
                <Check size={20} strokeWidth={3} />
              </button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md active:scale-90">
                <Edit size={18} />
              </button>
            )}
          </div>
          
          {/* AVATAR */}
          <div 
            className="absolute z-20 will-change-transform left-1/2 -translate-x-1/2"
            style={{
              top: isEditingProfile ? '40px' : `${avatarTop}px`,
              width: isEditingProfile ? '150px' : `${avatarSize}px`,
              height: isEditingProfile ? '150px' : `${avatarSize}px`,
            }}
          >
            <div className={`w-full h-full rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl border border-white/10 relative transition-all duration-300 ${isCollapsed ? 'ring-0' : 'ring-4 ring-black/40'}`}>
              {profilePic ? (
                <img src={profilePic} className="w-full h-full object-cover" />
              ) : (
                <User className="text-zinc-500" size={isEditingProfile ? 50 : (avatarSize * 0.4)} />
              )}
              {isEditingProfile && (
                <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors backdrop-blur-[2px]">
                  <Camera size={32} className="text-white drop-shadow-md" />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) onAvatarUpload(e.target.files[0]); }} />
                </label>
              )}
            </div>

            {!isEditingProfile && (
              <div 
                className="absolute bottom-[5%] right-[5%] bg-green-500 rounded-full border-2 border-black transition-all duration-300 shadow-[0_0_12px_rgba(34,197,94,0.8)]"
                style={{
                  width: '12px',
                  height: '12px',
                  opacity: dotOpacity,
                  transform: `scale(${p})`
                }}
              />
            )}

            {isEditingProfile && (
              <button onClick={() => setShowAvatarSelector(!showAvatarSelector)} className="absolute bottom-0 right-0 w-10 h-10 bg-zinc-800 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shadow-lg animate-in zoom-in">
                <Grid size={18} />
              </button>
            )}
          </div>

          {/* NAME */}
          <div 
            className="absolute flex flex-col items-center justify-center min-w-0 will-change-transform left-1/2 -translate-x-1/2"
            style={{
              top: isEditingProfile ? '210px' : `${textTop}px`,
              width: '100%',
              zIndex: 10
            }}
          >
            {isEditingProfile ? (
              <input 
                type="text" 
                value={profileName} 
                onChange={(e) => setProfileName(e.target.value)} 
                className="bg-transparent border-b border-white/20 text-white font-black text-3xl text-center w-64 focus:outline-none focus:border-white py-1" 
                placeholder="Display Name"
              />
            ) : (
              <h2 
                className="font-black tracking-tight text-white truncate transition-all duration-0"
                style={{ 
                  fontSize: '28px',
                  lineHeight: 1.1,
                  opacity: nameOpacity,
                  height: `${nameOpacity * 30}px`,
                  marginBottom: `${nameOpacity * 4}px`,
                  overflow: 'hidden'
                }}
              >
                {profileName}
              </h2>
            )}
            
            <div 
              className="flex items-center gap-1 transition-all duration-300"
              style={{ 
                opacity: 0.7,
                transform: `scale(${1 - (p * 0.1)})`
              }}
            >
              <p className="font-mono tracking-wide text-zinc-400 text-xs">
                {profileHandle}
              </p>
            </div>
          </div>

          {/* BIO */}
          <div 
            className="absolute top-[280px] left-0 right-0 px-8 flex justify-center transition-all duration-0"
            style={{ 
              opacity: Math.max(0, fadeOutOpacity), 
              pointerEvents: isCollapsed ? 'none' : 'auto',
              transform: `translateY(-${p * 40}px) scale(${1 - (p * 0.2)})`
            }}
          >
             {isEditingProfile ? (
                <div className="flex items-center gap-2 w-full max-w-xs border-b border-white/20 pb-1">
                  <Activity size={14} className="text-zinc-500" />
                  <input type="text" value={profileBio} onChange={(e) => setProfileBio(e.target.value)} className="bg-transparent text-zinc-300 text-xs font-mono w-full focus:outline-none placeholder:text-zinc-600" placeholder="Set status..."/>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                  {profileBio}
                </div>
              )}
          </div>

          {/* AVATAR DRAWER */}
          {isEditingProfile && showAvatarSelector && (
            <div className="absolute top-[340px] left-0 right-0 z-30 px-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="bg-[#1c1c1d] border border-white/10 rounded-3xl p-4 grid grid-cols-7 gap-3 shadow-2xl">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((num) => (
                  <button key={num} onClick={() => onSelectPreset(num)} className="aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-white transition-all hover:scale-110 active:scale-95 relative group">
                    <img src={`/robot${num}.jpeg?v=1`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. CONTENT SCROLL VIEW */}
      <div 
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto no-scrollbar pt-[340px] pb-32 px-4 z-10"
        onScroll={handleScroll}
      >
        <div className="max-w-2xl mx-auto w-full space-y-3">
          
          {/* INTERFACE SETTINGS */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-4 space-y-4 shadow-xl backdrop-blur-md">
            
            {/* BUBBLE STYLES */}
            <div className="space-y-2">
              <label className="text-white text-sm font-medium flex items-center gap-2 px-1"><PaintBucket size={14}/> Chat Bubble Style</label>
              <div className="relative group/scroll">
                <button onClick={() => scrollContainer(bubbleListRef, 'left')} className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-zinc-900 to-transparent z-20 flex items-center justify-start pl-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md" /></button>
                <div ref={bubbleListRef} className="flex overflow-x-auto gap-3 pb-2 px-2 no-scrollbar snap-x snap-mandatory">
                  {[
                    { id: 'minimal_solid', label: 'Minimal', bg: 'bg-white', text: 'text-black' },
                    { id: 'midnight', label: 'Midnight', bg: 'bg-[#172554]', text: 'text-white' },
                    { id: 'slate', label: 'Slate', bg: 'bg-[#475569]', text: 'text-white' },
                    { id: 'solid_gray', label: 'Solid Gray', bg: 'bg-zinc-700', text: 'text-white' },
                    { id: 'whatsapp', label: 'Forest', bg: 'bg-[#005c4b]', text: 'text-white' },
                    { id: 'telegram', label: 'Ocean', bg: 'bg-[#2b5278]', text: 'text-white' },
                    { id: 'purple', label: 'Royal', bg: 'bg-[#6d28d9]', text: 'text-white' },
                    { id: 'blue_gradient', label: 'Blue', bg: 'bg-gradient-to-br from-blue-500 to-blue-600', text: 'text-white' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => onChangeBubbleStyle(style.id)}
                      className={`flex-shrink-0 w-32 h-14 rounded-lg border transition-all flex items-center justify-center relative overflow-hidden snap-center shadow-lg ${bubbleStyle === style.id ? 'border-white ring-2 ring-white/20 scale-95' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      <div className={`absolute inset-0 ${style.bg}`} />
                      <span className={`relative z-10 text-xs font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => scrollContainer(bubbleListRef, 'right')} className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-zinc-900 to-transparent z-20 flex items-center justify-end pr-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md rotate-180" /></button>
              </div>
            </div>

            {/* REPLY THEME */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              <label className="text-white text-sm font-medium flex items-center gap-2 px-1"><MessageSquareDashed size={14}/> Reply Colors</label>
              <div className="relative group/scroll">
                <button onClick={() => scrollContainer(replyListRef, 'left')} className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-zinc-900 to-transparent z-20 flex items-center justify-start pl-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md" /></button>
                <div ref={replyListRef} className="flex overflow-x-auto gap-3 pb-2 px-2 no-scrollbar snap-x snap-mandatory">
                  {[
                    { id: 'original', color: 'bg-blue-500', text: 'text-blue-500' },
                    { id: 'retro', color: 'bg-orange-500', text: 'text-orange-500' },
                    { id: 'pastel', color: 'bg-pink-400', text: 'text-pink-400' },
                    { id: 'tactical', color: 'bg-emerald-700', text: 'text-emerald-700' },
                    { id: 'highvis', color: 'bg-yellow-400', text: 'text-yellow-400' },
                    { id: 'synthwave', color: 'bg-fuchsia-500', text: 'text-fuchsia-500' },
                    { id: 'terminal', color: 'bg-green-500', text: 'text-green-500' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => onChangeReplyTheme(theme.id)}
                      className={`flex-shrink-0 w-32 h-14 rounded-lg border transition-all snap-center flex flex-col justify-center px-3 relative overflow-hidden bg-zinc-900 shadow-lg ${replyTheme === theme.id ? 'border-white ring-2 ring-white/20 scale-95' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.color}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ml-2 ${theme.text}`}>{theme.id}</span>
                      <span className="text-[10px] text-zinc-500 ml-2 truncate">Preview Message</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => scrollContainer(replyListRef, 'right')} className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-zinc-900 to-transparent z-20 flex items-center justify-end pr-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md rotate-180" /></button>
              </div>
            </div>

            {/* RED MODE - REFACTORED */}
            <div className="pt-3 border-t border-white/5">
              <button onClick={onToggleRedMode} className={`w-full py-3 rounded-xl border flex items-center justify-between px-4 transition-all ${isAutoRedMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}>
                <div className="flex flex-col items-start gap-1">
                   <span className="font-medium flex items-center gap-2 text-sm"><Moon size={16} /> Auto Night Shift</span>
                   <span className="text-[10px] text-zinc-500 font-normal text-left leading-tight">Enables red filter after sunset (6 PM - 6 AM).</span>
                </div>
                <div className={`w-10 h-6 rounded-full relative flex-shrink-0 transition-colors ${isAutoRedMode ? 'bg-white' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${isAutoRedMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            {/* WALLPAPER OPACITY (Scale removed) */}
            <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between px-1">
                    <label className="text-white text-sm font-medium">Wallpaper Opacity</label>
                    <span className="text-zinc-500 text-xs font-mono">{Math.round(bgOpacity * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" />
            </div>
          </div>

          {/* BACKGROUND GRID - LARGER PREVIEWS */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-4 space-y-4 shadow-xl backdrop-blur-md relative">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><ImageIcon size={14}/> Backgrounds</h3>
            <div className="relative group/scroll">
              <button onClick={() => scrollContainer(bgListRef, 'left')} className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-zinc-900 to-transparent z-20 flex items-center justify-start pl-1 cursor-pointer hover:bg-black/10 transition-colors"><ChevronLeft size={20} className="text-white drop-shadow-lg" /></button>
              <div ref={bgListRef} className="flex overflow-x-auto gap-3 pb-2 px-2 no-scrollbar snap-x snap-mandatory">
                {Array.from({ length: 33 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setBgIndex(num)}
                    // CHANGED: w-24 h-24 -> w-32 h-56 (Tall Phone aspect ratio)
                    className={`flex-shrink-0 w-32 h-56 rounded-xl overflow-hidden border-2 transition-all relative group snap-center ${bgIndex === num ? 'border-white scale-95 opacity-100 ring-2 ring-white/20' : 'border-transparent opacity-100 hover:opacity-90 hover:border-white/20'}`}
                  >
                    <img src={`/bg${num}.jpg`} className="w-full h-full object-cover" alt={`bg${num}`} />
                  </button>
                ))}
              </div>
              <button onClick={() => scrollContainer(bgListRef, 'right')} className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-zinc-900 to-transparent z-20 flex items-center justify-end pr-1 cursor-pointer hover:bg-black/10 transition-colors"><ChevronLeft size={20} className="text-white drop-shadow-lg rotate-180" /></button>
            </div>
          </div>

          {/* LOGOUT BUTTON - SMALLER */}
          <button onClick={onLogout} className="w-full py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold text-center hover:bg-red-500/20 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2">
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};