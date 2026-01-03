export type CategoryId = 'idea' | 'work' | 'journal' | 'to-do';

export interface Note {
  id: string;
  text: string;
  date: number;
  category: CategoryId;
  isPinned: boolean;
  isExpanded?: boolean; // For collapsing feature (default true)
  attachments?: Attachment[]; // For file uploads
  editedAt?: number; // Track when note was last edited
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number; // in bytes
}

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  emoji: string;
  colorClass: string;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'idea', label: 'Idea', emoji: '⚡', colorClass: 'text-yellow-400' },
  { id: 'work', label: 'Work', emoji: '💼', colorClass: 'text-blue-400' },
  { id: 'journal', label: 'Journal', emoji: '✈️', colorClass: 'text-purple-400' },
  { id: 'to-do', label: 'To-Do', emoji: '💧', colorClass: 'text-cyan-400' }
];