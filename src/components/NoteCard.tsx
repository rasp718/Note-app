import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Pin, Volume2, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { Note, CategoryId, CategoryConfig } from '../types';

interface NoteCardProps {
  note: Note;
  categories: CategoryConfig[];
  selectedVoice: SpeechSynthesisVoice | null;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onCategoryClick: (category: CategoryId) => void;
  onEdit: (note: Note) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onToggleExpand: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  categories,
  selectedVoice,
  onDelete,
  onPin,
  onCategoryClick,
  onEdit,
  onUpdate,
  onToggleExpand
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const category = categories.find(c => c.id === note.category) || categories[0];
  const isExpanded = note.isExpanded !== false; // Default to true if undefined

  // Extract first 2 lines for collapsed view
  const lines = note.text.split('\n');
  const firstTwoLines = lines.slice(0, 2).join('\n');
  const hasMultipleLines = lines.length > 1 || note.text.length > 100;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleSpeakNote = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(note.text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== note.text) {
      onUpdate(note.id, { 
        text: editText.trim(),
        editedAt: Date.now()
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(note.text);
    setIsEditing(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all group relative">
      {/* Category Badge & Top Actions - Only in expanded state */}
      {isExpanded && (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => onCategoryClick(note.category)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            <span className="text-xs grayscale">{category.emoji}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {category.label}
            </span>
          </button>
          
          <div className="flex items-center gap-1.5">
            {hasMultipleLines && (
              <button
                onClick={() => onToggleExpand(note.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-all"
                title="Collapse"
              >
                <ChevronUp size={14} />
              </button>
            )}

            <button
              onClick={() => setIsEditing(true)}
              className="text-zinc-500 hover:text-orange-500 transition-all"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>

            <button
              onClick={handleSpeakNote}
              className={`transition-all ${
                isSpeaking
                  ? 'text-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={isSpeaking ? 'Stop' : 'Play'}
            >
              <Volume2 size={14} />
            </button>

            <button
              onClick={() => onPin(note.id)}
              className={`transition-all ${
                note.isPinned
                  ? 'text-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={note.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={14} />
            </button>

            <button
              onClick={() => onDelete(note.id)}
              className="text-zinc-500 hover:text-red-500 transition-all"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Note Content */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-orange-500 transition-colors resize-none min-h-[100px]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-orange-500 transition-all"
            >
              <Check size={12} />
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-all"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Collapsible Content */}
          <div>
            {isExpanded ? (
              <>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                  {note.text}
                </p>
                
                {/* Metadata - Only in expanded state */}
                <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-wider">
                  <span>{formatDate(note.date)}</span>
                  {note.editedAt && (
                    <>
                      <span>•</span>
                      <span>Edited</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1">
                {/* First line: bold text + category pill + expand */}
                <div className="flex items-center justify-between gap-2">
                  <p 
                    className={`text-zinc-300 text-sm font-semibold leading-tight flex-1 truncate ${hasMultipleLines ? 'cursor-pointer' : ''}`}
                    onClick={() => hasMultipleLines && onToggleExpand(note.id)}
                  >
                    {lines[0]}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onCategoryClick(note.category)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-black/50 border border-zinc-800/50 hover:border-zinc-700 transition-all"
                    >
                      <span className="text-[10px] grayscale">{category.emoji}</span>
                    </button>
                    {hasMultipleLines && (
                      <button
                        onClick={() => onToggleExpand(note.id)}
                        className="w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-all"
                        title="Expand"
                      >
                        <ChevronDown size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Second line: text only */}
                {lines.length > 1 && (
                  <p 
                    className={`text-zinc-400 text-xs leading-snug truncate ${hasMultipleLines ? 'cursor-pointer' : ''}`}
                    onClick={() => hasMultipleLines && onToggleExpand(note.id)}
                  >
                    {lines[1]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};