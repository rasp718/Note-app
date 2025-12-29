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

  const handleSpeak = () => {
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
    <div className={`relative bg-slate-900 rounded-2xl p-5 border transition-all hover:scale-[1.01] duration-200 group ${categoryConfig.colorClass}`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <button 
          onClick={() => onCategoryClick(note.category)}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-slate-600 transition-colors"
        >
          <span className="text-lg">{categoryConfig.emoji}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{categoryConfig.label}</span>
        </button>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           {/* PIN BUTTON */}
           <button 
            onClick={() => onPin(note.id)}
            className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${note.isPinned ? 'text-violet-400' : 'text-slate-500 hover:text-white'}`}
            title={note.isPinned ? "Unpin Note" : "Pin Note"}
          >
            <Pin size={18} className={note.isPinned ? "fill-current" : ""} />
          </button>

          <button 
            onClick={() => onEdit(note)}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
          >
            <Edit2 size={18} />
          </button>
          
          <button 
            onClick={() => onDelete(note.id)}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <p className="text-slate-200 text-lg leading-relaxed mb-4 whitespace-pre-wrap">{note.text}</p>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
        <span className="text-xs text-slate-500 font-medium">{formattedDate}</span>
        
        <button 
          onClick={handleSpeak}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isPlaying 
              ? 'bg-violet-500 text-white animate-pulse' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Playing...' : 'Listen'}
        </button>
      </div>
    </div>
  );
}