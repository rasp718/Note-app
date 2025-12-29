import React, { useState } from 'react';
import { Trash2, Edit2, Play, Pause, Pin, MoreHorizontal } from 'lucide-react';
import { Note, CategoryConfig, CategoryId } from '../types';

interface NoteCardProps {
  note: Note;
  categories: CategoryConfig[];
  selectedVoice: SpeechSynthesisVoice | null;
  onDelete: (id: string) => void;
  onEdit: (note: Note) => void;
  onCategoryClick: (id: CategoryId) => void;
  onPin: (id: string) => void;
}

export function NoteCard({ 
  note, 
  categories, 
  selectedVoice, 
  onDelete, 
  onEdit, 
  onCategoryClick,
  onPin
}: NoteCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const categoryConfig = categories.find(c => c.id === note.category) || categories[0];

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(note.text);
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(note.date));

  return (
    <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all group">
      
      {/* Header */}
      <div className="flex justify-between items-start p-4 pb-2">
        <button 
          onClick={() => onCategoryClick(note.category)}
          className="flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors"
        >
          <span className="text-sm grayscale">{categoryConfig.emoji}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{categoryConfig.label}</span>
        </button>

        <div className="flex gap-1">
           {/* PIN BUTTON */}
           <button 
            onClick={() => onPin(note.id)}
            className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${note.isPinned ? 'text-orange-500' : 'text-zinc-600 hover:text-zinc-300'}`}
          >
            <Pin size={16} className={note.isPinned ? "fill-current" : ""} />
          </button>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={() => onEdit(note)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
                <Edit2 size={16} />
            </button>
            
            <button 
                onClick={() => onDelete(note.id)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-red-500 transition-colors"
            >
                <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-2">
        <p className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap font-light tracking-wide">{note.text}</p>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center p-4 pt-2 mt-2">
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{formattedDate}</span>
        
        <button 
          onClick={handleSpeak}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
            isPlaying 
              ? 'bg-zinc-100 text-black border-zinc-100' 
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-white'
          }`}
        >
          {isPlaying ? <Pause size={12} fill="currentColor"/> : <Play size={12} fill="currentColor" />}
          {isPlaying ? 'PLAYING' : 'PLAY'}
        </button>
      </div>
    </div>
  );
}