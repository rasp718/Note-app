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
  
  // Logic to determine if this is a "Simple One-Liner"
  // Used for compact padding
  const isCompact = lines.length === 1 && !note.imageUrl;
  // Specific check for collapsed view layout
  const isSingleLineCollapsed = lines.length === 1 && !note.imageUrl && !isExpanded;

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

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

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
      
      if (editImageUrl) {
        updates.imageUrl = editImageUrl;
      } else if (note.imageUrl) {
        // Explicitly set to null to remove image in Firestore
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

  // Tight padding logic to "hug" content closer
  const paddingClass = isCompact ? 'px-3 py-2' : 'p-3';

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl ${paddingClass} hover:border-zinc-700 transition-all group relative w-full md:w-fit md:max-w-full`}>
      {isExpanded && (
        <div className="flex flex-col gap-2">
          
          {/* === HEADER (Category Left, Actions Right) === */}
          <div className="flex items-center justify-between gap-2 w-full flex-shrink-0">
             <div className="flex items-center gap-2">
                <button
                  onClick={() => onCategoryClick(note.category)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black border border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <span className="text-xs grayscale">{category.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {category.label}
                  </span>
                </button>
             </div>

             <div className="flex items-center gap-2">
                <button onClick={handleStartEdit} className="text-zinc-500 hover:text-orange-500 transition-all" title="Edit">
                  <Edit2 size={14} />
                </button>
                <button onClick={handleSpeakNote} className="text-zinc-500 hover:text-orange-500 transition-all" title={isSpeaking ? 'Stop' : 'Play'}>
                  <Volume2 size={14} />
                </button>
                <button onClick={() => onPin(note.id)} className={`transition-all ${note.isPinned ? 'text-orange-500' : 'text-zinc-500 hover:text-orange-500'}`} title={note.isPinned ? 'Unpin' : 'Pin'}>
                  <Pin size={14} />
                </button>
                <button onClick={() => onDelete(note.id)} className="text-zinc-500 hover:text-red-500 transition-all" title="Delete">
                  <Trash2 size={14} />
                </button>
                <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                <button onClick={() => onToggleExpand(note.id)} className="text-zinc-500 hover:text-orange-500 transition-all" title="Collapse">
                  <ChevronUp size={14} />
                </button>
             </div>
          </div>

          {/* === CONTENT === */}
          <div className="flex flex-col gap-2 items-end w-full">
              {/* 1. Image (Aligned to Right/End as per red arrows) */}
              {note.imageUrl && (
                <div className="mb-1 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex justify-center max-w-full self-end">
                  <img 
                    src={note.imageUrl} 
                    alt="Note attachment" 
                    className="w-full md:w-auto h-auto md:max-h-96 object-contain" 
                  />
                </div>
              )}

              {/* 2. Text - Aligned Left, but takes full width so timestamp can float right */}
              {note.text && (
                <div className="w-full">
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap break-words text-left inline-block w-full">
                    {note.text}
                    {/* Timestamp embedded: Floats right to share the last line */}
                    <span className="float-right ml-2 mt-1 text-[10px] text-zinc-600 uppercase tracking-wider select-none">
                      {formatDate(note.date)}
                      {note.editedAt && <> • Edited</>}
                    </span>
                  </p>
                </div>
              )}
          </div>

          {/* 3. Footer Timestamp (Only if Image exists AND No Text) */}
          {note.imageUrl && !note.text && (
            <div className="w-full flex justify-end">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                {formatDate(note.date)}
                {note.editedAt && <> • Edited</>}
              </span>
            </div>
          )}

        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          {/* ... Editing Mode ... */}
          <div>
            {editImageUrl ? (
              <div className="relative mb-3 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex justify-center">
                <img 
                  src={editImageUrl} 
                  alt="Note attachment" 
                  className="w-full md:w-auto h-auto md:max-h-96 object-contain" 
                />
                <button onClick={handleRemoveImage} className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all" title="Remove image">
                  <RemoveIcon size={14} />
                </button>
              </div>
            ) : (
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id={`image-upload-${note.id}`} />
                <label htmlFor={`image-upload-${note.id}`} className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer">
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
            <button onClick={handleSaveEdit} disabled={isUploadingImage} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Check size={12} /> Save
            </button>
            <button onClick={handleCancelEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-all">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Collapsed View */}
          {!isExpanded && (
            <>
              {/* === LAYOUT 1: SINGLE LINE (Compact) === */}
              {isSingleLineCollapsed ? (
                <div className="flex items-center justify-between gap-2">
                   <div className="flex-1 min-w-0" onClick={() => onToggleExpand(note.id)}>
                      <p className="text-zinc-300 text-sm font-semibold truncate cursor-pointer text-left">
                        {lines[0]}
                      </p>
                   </div>
                   
                   <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                        {formatDate(note.date)}
                      </span>
                      <button onClick={() => onCategoryClick(note.category)} className="w-5 h-5 flex items-center justify-center rounded-full bg-black/50 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                         <span className="text-[10px] grayscale">{category.emoji}</span>
                      </button>
                      <button onClick={() => onToggleExpand(note.id)} className="text-zinc-500 hover:text-orange-500 transition-all">
                         <ChevronDown size={14} />
                      </button>
                   </div>
                </div>
              ) : (
                /* === LAYOUT 2: MULTI-LINE OR IMAGE (Rich) === */
                <div className="flex gap-2">
                   {/* Left Column: Text */}
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div onClick={() => onToggleExpand(note.id)} className="cursor-pointer">
                         <p className="text-zinc-300 text-sm font-semibold leading-tight truncate mb-1 text-left">
                           {lines[0] || <span className="italic text-zinc-600 font-normal">Attachment</span>}
                         </p>
                         {lines.length > 1 && (
                            <p className="text-zinc-400 text-xs leading-snug truncate text-left">
                              {lines[1]}
                            </p>
                         )}
                      </div>
                   </div>

                   {/* Middle: Image (Thumbnail size) */}
                   {note.imageUrl && (
                      <div className="flex-shrink-0 w-12 h-10 rounded bg-zinc-800 border border-zinc-700 overflow-hidden">
                        <img src={note.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                   )}

                   {/* Right Column: Actions */}
                   <div className="flex flex-col justify-between items-end gap-1 flex-shrink-0">
                      <div className="flex gap-1">
                         <button onClick={() => onCategoryClick(note.category)} className="w-5 h-5 flex items-center justify-center rounded-full bg-black/50 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                            <span className="text-[10px] grayscale">{category.emoji}</span>
                         </button>
                         <button onClick={() => onToggleExpand(note.id)} className="text-zinc-500 hover:text-orange-500 transition-all">
                            <ChevronDown size={14} />
                         </button>
                      </div>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                         {formatDate(note.date)}
                      </span>
                   </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};