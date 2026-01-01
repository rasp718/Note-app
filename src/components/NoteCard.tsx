import React, { useState } from 'react';
import { Trash2, Edit2, Play, Pause, Pin } from 'lucide-react';
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
    <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all group flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-start p-4 pb-2 h-9">
        {/* CATEGORY BADGE */}
        <button 
          onClick={() => onCategoryClick(note.category)}
          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors"
        >
          <span className="text-xs grayscale">{categoryConfig.emoji}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{categoryConfig.label}</span>
        </button>

        {/* ACTION BUTTONS - HIDDEN UNTIL HOVER */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
           {/* PIN BUTTON */}
           <button 
            onClick={() => onPin(note.id)}
            className={`p-1.5 rounded-md hover:bg-zinc-800 transition-colors ${
                note.isPinned 
                ? 'text-orange-500' 
                : 'text-zinc-600 hover:text-orange-500'
            }`}
            title={note.isPinned ? "Unpin" : "Pin"}
          >
            <Pin size={16} className={note.isPinned ? "fill-current" : ""} />
          </button>

          {/* EDIT BUTTON */}
          <button 
              onClick={() => onEdit(note)}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-orange-500 transition-colors"
          >
              <Edit2 size={16} />
          </button>
          
          {/* DELETE BUTTON */}
          <button 
              onClick={() => onDelete(note.id)}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-600 hover:text-red-500 transition-colors"
          >
              <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-2 flex-grow">
        <p className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap font-light tracking-wide">{note.text}</p>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end p-4 pt-2">
        <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{formattedDate}</span>
        
        {/* Play Button - Minimalist Icon (Hidden unless hovering or playing) */}
        <button 
          onClick={handleSpeak}
          className={`p-1.5 rounded-md transition-all ${
            isPlaying 
              ? 'opacity-100 text-orange-500 bg-orange-500/10' 
              : 'opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-orange-500 hover:bg-zinc-800'
          }`}
          title="Read Aloud"
        >
          {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" />}
        </button>
      </div>
    </div>
  );
}