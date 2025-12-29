export type CategoryId = 'idea' | 'work' | 'journal' | 'todo';

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  emoji: string;
  colorClass: string;
}

export interface Note {
  id: string;
  text: string;
  date: number;
  category: CategoryId;
  isPinned?: boolean;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { 
    id: 'idea', 
    label: 'Idea', 
    emoji: '⚡', 
    colorClass: 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
  },
  { 
    id: 'work', 
    label: 'Work', 
    emoji: '💼', 
    colorClass: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
  },
  { 
    id: 'journal', 
    label: 'Journal', 
    emoji: '🌱', 
    colorClass: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
  },
  { 
    id: 'todo', 
    label: 'To-Do', 
    emoji: '🔥', 
    colorClass: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
  }
];