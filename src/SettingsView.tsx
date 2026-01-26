import React, { useRef, useEffect } from 'react';
import {
  Check, Edit, Camera, Grid, Activity, QrCode, SlidersHorizontal, 
  PaintBucket, ChevronLeft, MessageSquareDashed, Moon, ImageIcon, User
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
  setBgScale: (val: number) => void;
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

  // Handle Horizontal Scrolling for the slider lists
  useEffect(() => {
    const handleHorizontalWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.currentTarget.scrollLeft += e.deltaY;
      }
    };
    
    // Attach listeners
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

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
      
      {/* PROFILE CARD */}
      <div className="relative overflow-hidden bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col gap-6 backdrop-blur-xl group shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
        <div className="absolute top-4 right-4">
          {isEditingProfile ? (
            <button onClick={onProfileSave} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
              <Check size={16} strokeWidth={3} />
            </button>
          ) : (
            <button onClick={() => setIsEditingProfile(true)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white">
              <Edit size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl shadow-[0_1px_1px_rgba(0,0,0,0.3)] overflow-hidden">
              {profilePic ? (
                <img key={profilePic} src={profilePic} className="w-full h-full object-cover" />
              ) : (
                <User className="text-zinc-500" />
              )}
            </div>
            {isEditingProfile && (
              <>
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-zinc-700 transition-colors">
                  <Camera size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) onAvatarUpload(e.target.files[0]); }} />
                </label>
                <button onClick={() => setShowAvatarSelector(!showAvatarSelector)} className="absolute -bottom-2 -left-2 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-zinc-700 transition-colors">
                  <Grid size={14} />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {isEditingProfile ? (
              <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-transparent border-b border-white/20 text-white text-xl font-bold w-full focus:outline-none focus:border-white py-1" placeholder="Display Name"/>
            ) : (
              <h2 className="text-2xl font-black tracking-tight text-white truncate">{profileName}</h2>
            )}
            <div className="flex items-center gap-1 text-zinc-500">
              <p className={`text-xs font-mono tracking-wide ${isEditingProfile ? 'text-zinc-500 opacity-50 cursor-not-allowed select-none' : 'text-zinc-400'}`}>
                {profileHandle}
              </p>
            </div>
          </div>
        </div>
        
        {isEditingProfile && showAvatarSelector && (
          <div className="grid grid-cols-6 gap-2 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
            {Array.from({ length: 7 }, (_, i) => i + 1).map((num) => (
              <button key={num} onClick={() => onSelectPreset(num)} className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-white transition-colors bg-black/40 flex items-center justify-center text-xl relative">
                <img src={`/robot${num}.jpeg?v=1`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-white/5 flex justify-between items-center">
          {isEditingProfile ? (
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-zinc-500" />
              <input type="text" value={profileBio} onChange={(e) => setProfileBio(e.target.value)} className="bg-transparent border-b border-white/20 text-zinc-300 text-xs font-mono w-full focus:outline-none focus:border-white py-1" placeholder="Status..."/>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>{profileBio}
            </div>
          )}
          <button onClick={onShowQRCode} className="text-zinc-500 hover:text-white transition-colors">
            <QrCode size={20} />
          </button>
        </div>
      </div>

      {/* INTERFACE SETTINGS */}
      <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6 shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal size={14}/> Interface
        </h3>

        {/* BUBBLE STYLES */}
        <div className="space-y-3">
          <label className="text-white text-sm font-medium flex items-center gap-2"><PaintBucket size={14}/> Chat Bubble Style</label>
          <div className="relative group/scroll">
            <button onClick={() => scrollContainer(bubbleListRef, 'left')} className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-[#1c1c1d] to-transparent z-20 flex items-center justify-start pl-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md" /></button>
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
                  className={`flex-shrink-0 w-32 h-14 rounded-lg border transition-all flex items-center justify-center relative overflow-hidden snap-center shadow-[0_1px_1px_rgba(0,0,0,0.3)] ${bubbleStyle === style.id ? 'border-white ring-1 ring-white/50 scale-95' : 'border-zinc-700 hover:border-zinc-500'}`}
                >
                  <div className={`absolute inset-0 ${style.bg}`} />
                  <span className={`relative z-10 text-xs font-bold uppercase tracking-wider ${style.text}`}>{style.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => scrollContainer(bubbleListRef, 'right')} className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#1c1c1d] to-transparent z-20 flex items-center justify-end pr-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md rotate-180" /></button>
          </div>
        </div>

        {/* REPLY THEME */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <label className="text-white text-sm font-medium flex items-center gap-2"><MessageSquareDashed size={14}/> Reply Colors</label>
          <div className="relative group/scroll">
            <button onClick={() => scrollContainer(replyListRef, 'left')} className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-[#1c1c1d] to-transparent z-20 flex items-center justify-start pl-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md" /></button>
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
                  className={`flex-shrink-0 w-32 h-14 rounded-lg border transition-all snap-center flex flex-col justify-center px-3 relative overflow-hidden bg-zinc-900 shadow-[0_1px_1px_rgba(0,0,0,0.3)] ${replyTheme === theme.id ? 'border-white ring-1 ring-white/50 scale-95' : 'border-zinc-700 hover:border-zinc-500'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.color}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ml-2 ${theme.text}`}>{theme.id}</span>
                  <span className="text-[10px] text-zinc-500 ml-2 truncate">Preview Message</span>
                </button>
              ))}
            </div>
            <button onClick={() => scrollContainer(replyListRef, 'right')} className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#1c1c1d] to-transparent z-20 flex items-center justify-end pr-2 cursor-pointer"><ChevronLeft size={20} className="text-white drop-shadow-md rotate-180" /></button>
          </div>
        </div>

        {/* RED MODE */}
        <div className="space-y-4 pt-2 border-t border-white/5">
          <button onClick={onToggleRedMode} className={`w-full py-3 rounded-xl border flex items-center justify-between px-4 transition-all ${isAutoRedMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}><span className="font-medium flex items-center gap-2 text-sm"><Moon size={16} /> Auto Night Shift</span><div className={`w-10 h-6 rounded-full relative transition-colors ${isAutoRedMode ? 'bg-white' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${isAutoRedMode ? 'translate-x-4' : 'translate-x-0'}`} /></div></button>
          <p className="text-xs text-zinc-500 px-1">{isAutoRedMode ? "Automatically enables red filter after sunset (6 PM - 6 AM)." : "Night shift is disabled."}</p>
        </div>

        {/* WALLPAPER SLIDERS */}
        <div className="space-y-3"><div className="flex justify-between"><label className="text-white text-sm font-medium">Wallpaper Scale</label><span className="text-zinc-500 text-xs font-mono">{bgScale >= 100 ? 'COVER' : `${bgScale}%`}</span></div><input type="range" min="20" max="100" step="5" value={bgScale} onChange={(e) => setBgScale(parseInt(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" /></div>
        <div className="space-y-3"><div className="flex justify-between"><label className="text-white text-sm font-medium">Opacity</label><span className="text-zinc-500 text-xs font-mono">{Math.round(bgOpacity * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white" /></div>
      </div>

      {/* BACKGROUND GRID */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-[0_1px_1px_rgba(0,0,0,0.3)] relative">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><ImageIcon size={14}/> Backgrounds</h3>
        <div className="relative group/scroll">
          <button onClick={() => scrollContainer(bgListRef, 'left')} className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-zinc-900 to-transparent z-20 flex items-center justify-start pl-1 cursor-pointer hover:bg-black/10 transition-colors"><ChevronLeft size={20} className="text-white drop-shadow-lg" /></button>
          <div ref={bgListRef} className="flex overflow-x-auto gap-3 pb-2 px-2 no-scrollbar snap-x snap-mandatory">
            {Array.from({ length: 33 }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setBgIndex(num)}
                className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all relative group snap-center ${bgIndex === num ? 'border-white scale-95 opacity-100 ring-2 ring-white/20' : 'border-transparent opacity-100 hover:opacity-90 hover:border-white/20'}`}
              >
                <img src={`/bg${num}.jpg`} className="w-full h-full object-cover" alt={`bg${num}`} />
              </button>
            ))}
          </div>
          <button onClick={() => scrollContainer(bgListRef, 'right')} className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-zinc-900 to-transparent z-20 flex items-center justify-end pr-1 cursor-pointer hover:bg-black/10 transition-colors"><ChevronLeft size={20} className="text-white drop-shadow-lg rotate-180" /></button>
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <button onClick={onLogout} className="w-full py-4 bg-white/5 border border-white/5 rounded-3xl text-red-500 font-bold text-center hover:bg-red-500/10 transition-colors shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
        Log Out
      </button>
    </div>
  );
};