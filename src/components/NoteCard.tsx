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
    <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all duration-300 group flex flex-col animate-in fade-in slide-in-from-bottom-2">
      
      {/* Header */}
      <div className="flex justify-between items-start p-4 pb-2 h-9">
        {/* ICON ONLY BADGE (GRAYSCALE + PILL) */}
        <button 
          onClick={() => onCategoryClick(note.category)}
          className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-colors"
          title={categoryConfig.label}
        >
          <span className="text-xs grayscale">{categoryConfig.emoji}</span>
        </button>

        {/* TOP ACTIONS: PIN & DELETE */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out">
           {/* PIN BUTTON */}
           <button 
            onClick={() => onPin(note.id)}
            className={`p-1.5 rounded-full hover:bg-zinc-800 transition-colors duration-200 ${
                note.isPinned 
                ? 'text-orange-500' 
                : 'text-zinc-600 hover:text-orange-500'
            }`}
            title={note.isPinned ? "Unpin" : "Pin"}
          >
            <Pin size={16} className={note.isPinned ? "fill-current" : ""} />
          </button>
          
          {/* DELETE BUTTON */}
          <button 
              onClick={() => onDelete(note.id)}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-600 hover:text-red-500 transition-colors duration-200"
              title="Delete Note"
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
        
        {/* BOTTOM ACTIONS: EDIT & PLAY */}
        <div className="flex gap-1">
            {/* EDIT BUTTON (Moved to Bottom) */}
            <button 
                onClick={() => onEdit(note)}
                className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-600 hover:text-orange-500 transition-all duration-200"
                title="Edit Note"
            >
                <Edit2 size={16} />
            </button>

            {/* PLAY BUTTON */}
            <button 
              onClick={handleSpeak}
              className={`p-1.5 rounded-full transition-all duration-300 ${
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
    </div>
  );
}