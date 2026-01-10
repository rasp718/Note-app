export type CategoryId = 'idea' | 'work' | 'journal' | 'to-do';

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
  isPinned: boolean;
  editedAt?: number;
  isExpanded?: boolean;
  imageUrl?: string;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'idea', label: 'Idea', emoji: '⚡', colorClass: 'text-yellow-500' },
  { id: 'work', label: 'Work', emoji: '🔧', colorClass: 'text-blue-500' },
  { id: 'journal', label: 'Journal', emoji: '📝', colorClass: 'text-purple-500' },
  { id: 'to-do', label: 'To-Do', emoji: '🔥', colorClass: 'text-green-500' },
];