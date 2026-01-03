import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Pin, Volume2, ChevronDown, ChevronUp, Edit2, Check, X, Image as ImageIcon, X as RemoveIcon } from 'lucide-react';
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
  const [editImageUrl, setEditImageUrl] = useState(note.imageUrl || '');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const category = categories.find(c => c.id === note.category) || categories[0];
  const isExpanded = note.isExpanded !== false;

  const lines = note.text.split('\n');
  const firstTwoLines = lines.slice(0, 2).join('\n');
  const hasMultipleLines = lines.length > 1 || note.text.length > 100 || !!note.imageUrl;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB for base64)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImageUrl(reader.result as string);
        setIsUploadingImage(false);
      };
      reader.onerror = () => {
        alert('Failed to read image');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setEditImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    if (editText.trim()) {
      const updates: Partial<Note> = {
        text: editText.trim(),
        editedAt: Date.now()
      };
      
      // Always update imageUrl, even if empty (to allow removal)
      if (editImageUrl) {
        updates.imageUrl = editImageUrl;
      } else if (note.imageUrl) {
        // If image was removed, explicitly set to null to ensure it is cleared
        // casting to any to allow null if the type is strict
        updates.imageUrl = null as any;
      }
      
      onUpdate(note.id, updates);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(note.text);
    setEditImageUrl(note.imageUrl || '');
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditImageUrl(note.imageUrl || '');
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
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleStartEdit}
              className="text-zinc-500 hover:text-orange-500 transition-all"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>

            <button
              onClick={handleSpeakNote}
              className="text-zinc-500 hover:text-orange-500 transition-all"
              title={isSpeaking ? 'Stop' : 'Play'}
            >
              <Volume2 size={14} />
            </button>

            <button
              onClick={() => onPin(note.id)}
              className={`transition-all ${
                note.isPinned
                  ? 'text-orange-500'
                  : 'text-zinc-500 hover:text-orange-500'
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

      {isEditing ? (
        <div className="space-y-3">
          {/* Image Upload Section */}
          <div>
            {editImageUrl ? (
              <div className="relative mb-3 rounded-lg overflow-hidden border border-zinc-800">
                <img 
                  src={editImageUrl} 
                  alt="Note attachment" 
                  className="w-full h-auto object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
                  title="Remove image"
                >
                  <RemoveIcon size={14} />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id={`image-upload-${note.id}`}
                />
                <label
                  htmlFor={`image-upload-${note.id}`}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
                >
                  <ImageIcon size={14} />
                  {isUploadingImage ? 'Uploading...' : 'Add Image'}
                </label>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-orange-500 transition-colors resize-none min-h-[100px]"
            placeholder="Write your note..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isUploadingImage}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div>
            {isExpanded ? (
              <>
                {note.imageUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-zinc-800">
                    <img 
                      src={note.imageUrl} 
                      alt="Note attachment" 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                  {note.text}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-wider">
                    <span>{formatDate(note.date)}</span>
                    {note.editedAt && (
                      <>
                        <span>•</span>
                        <span>Edited</span>
                      </>
                    )}
                  </div>
                  
                  {hasMultipleLines && (
                    <button
                      onClick={() => onToggleExpand(note.id)}
                      className="text-zinc-500 hover:text-orange-500 transition-all"
                      title="Collapse"
                    >
                      <ChevronUp size={14} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p 
                      className={`text-zinc-300 text-sm font-semibold leading-tight flex-1 truncate ${hasMultipleLines ? 'cursor-pointer' : ''}`}
                      onClick={() => hasMultipleLines && onToggleExpand(note.id)}
                    >
                      {lines[0]}
                    </p>
                    {note.imageUrl && (
                      <div className="flex-shrink-0 w-8 h-8 rounded bg-zinc-800 border border-zinc-700 overflow-hidden">
                        <img 
                          src={note.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
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
                        className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-all"
                        title="Expand"
                      >
                        <ChevronDown size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {lines.length > 1 && (
                    <p 
                      className={`text-zinc-400 text-xs leading-snug truncate flex-1 ${hasMultipleLines ? 'cursor-pointer' : ''}`}
                      onClick={() => hasMultipleLines && onToggleExpand(note.id)}
                    >
                      {lines[1]}
                    </p>
                  )}
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider flex-shrink-0">
                    {formatDate(note.date)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};