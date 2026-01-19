import { CategoryConfig } from './types';

export const TRANSLATIONS = { 
  search: "Search...", 
  all: "All", 
  typePlaceholder: "Message...", 
  cat_hacker: "Hacker Mode"
};

export const CLAUDE_ORANGE = '#da7756'; 
export const HACKER_GREEN = '#4ade80';

export const HACKER_CONFIG: CategoryConfig = {
    id: 'secret', 
    label: 'Anon', 
    emoji: '💻',
    colorClass: 'bg-green-500' 
};

// --- HELPER FOR DYNAMIC USER COLORS ---
export const getUserColor = (name: string) => {
    const colors = [
      'text-[#da7756] border-[#da7756]',   // Claude Orange
      'text-lime-600 border-lime-700',     // Olive Green
      'text-indigo-400 border-indigo-600', // Muted Indigo
      'text-yellow-600 border-yellow-700', // Mustard
      'text-red-600 border-red-700',       // Brick Red
      'text-zinc-400 border-zinc-500',     // Steel
      'text-teal-600 border-teal-700',     // Deep Teal
      'text-green-600 border-green-700',   // Forest
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

// --- HELPER FOR BUBBLE STYLES ---
export const getBubbleColors = (style: string, isMe: boolean, isHacker: boolean) => {
    if (isHacker) {
        return { 
            bg: 'bg-black', 
            border: 'border border-green-500/30 hover:border-green-500 transition-colors', 
            text: 'text-green-500', 
            subtext: 'text-green-500/60' 
        };
    }

    if (!isMe) {
        return { 
            bg: 'bg-zinc-800', 
            border: 'border-transparent', 
            text: 'text-zinc-100', 
            subtext: 'text-zinc-400 opacity-60' 
        };
    }

    switch(style) {
        case 'minimal_solid': return { bg: 'bg-white', border: 'border-transparent', text: 'text-black', subtext: 'text-zinc-500' };
        case 'minimal_glass': return { bg: 'bg-white/20 backdrop-blur-md', border: 'border-white/50', text: 'text-white', subtext: 'text-white/70' };
        case 'clear': return { bg: 'bg-white/5 backdrop-blur-sm', border: 'border border-white/20', text: 'text-white', subtext: 'text-white/60' };
        case 'solid_gray': return { bg: 'bg-zinc-700', border: 'border-transparent', text: 'text-white', subtext: 'text-zinc-300' };
        case 'whatsapp': return { bg: 'bg-[#005c4b]', border: 'border-transparent', text: 'text-white', subtext: 'text-[#85a8a1]' };
        case 'telegram': return { bg: 'bg-[#2b5278]', border: 'border-transparent', text: 'text-white', subtext: 'text-[#8aa8c7]' };
        case 'blue_gradient': return { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', border: 'border-transparent', text: 'text-white', subtext: 'text-blue-100/80' };
        case 'purple': return { bg: 'bg-[#6d28d9]', border: 'border-transparent', text: 'text-white', subtext: 'text-[#ddd6fe]' };
        default: return { bg: 'bg-white', border: 'border-transparent', text: 'text-black', subtext: 'text-zinc-500' };
    }
};

// --- DATE UTILS ---
export const normalizeDate = (d: any): number => {
    try {
        if (!d) return 0;
        if (typeof d === 'number') return d;
        if (typeof d.toMillis === 'function') return d.toMillis();
        if (d.seconds) return d.seconds * 1000;
        const parsed = new Date(d).getTime();
        return isNaN(parsed) ? 0 : parsed;
    } catch { return 0; }
};

export const isSameDay = (d1: any, d2: any) => {
    const t1 = normalizeDate(d1);
    const t2 = normalizeDate(d2);
    if (!t1 || !t2) return false;
    const date1 = new Date(t1);
    const date2 = new Date(t2);
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
};

export const getDateLabel = (d: any) => {
    const timestamp = normalizeDate(d);
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(timestamp, today.getTime())) return 'Today';
    if (isSameDay(timestamp, yesterday.getTime())) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_SIZE = 600;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};