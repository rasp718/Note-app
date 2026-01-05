import React from 'react';
import { Trash2, Pin, Volume2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Note, CategoryId, CategoryConfig } from '../types';

interface NoteCardProps {
  note: Note;
  categories: CategoryConfig[];
  selectedVoice: SpeechSynthesisVoice | null;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onCategoryClick: (category: CategoryId) => void;
  onEdit: () => void;
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
  onToggleExpand
}) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  
  const category = categories.find(c => c.id === note.category) || categories[0];
  
  // --- THEME LOGIC ---
  const isHacker = category.label === 'Hacker' || category.label === 'Anon'; // Handle both label possibilities
  const isSecret = category.id === 'secret' && !isHacker; // "Classified" / Ghost mode

  // Define dynamic styles based on theme
  const themeStyles = {
    // Hover colors remain specific to the theme
    accentHover: isHacker ? 'hover:text-green-500' : isSecret ? 'hover:text-red-500' : 'hover:text-orange-500',
    accentText: isHacker ? 'text-green-500' : isSecret ? 'text-red-500' : 'text-orange-500',
    // Body text matches App.tsx Edit Mode
    bodyText: isHacker ? 'text-zinc-300 font-mono' : 'text-zinc-300',
    dateText: isHacker ? 'text-green-600' : 'text-zinc-600',
    // ICONS: Always gray by default now, even in hacker mode
    iconColor: 'text-zinc-500', 
    borderColor: isHacker ? 'border-green-900/50' : 'border-zinc-800'
  };

  const isExpanded = note.isExpanded !== false;
  const lines = note.text.split('\n');
  const isSingleLine = lines.length === 1 && !note.imageUrl && !isExpanded;
  const isCompact = lines.length === 1 && !note.imageUrl;

  const handleSpeakNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      if (isSpeaking) { 
        window.speechSynthesis.cancel(); 
        setIsSpeaking(false); 
        return; 
      }
      const utterance = new SpeechSynthesisUtterance(note.text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const paddingClass = isCompact ? 'px-3 py-2' : 'p-3';

  return (
    <div className={`bg-zinc-900 border rounded-xl ${paddingClass} hover:border-zinc-700 transition-all group relative w-full md:w-fit md:max-w-full ${themeStyles.borderColor}`}>
      {isExpanded ? (
        <div className="flex flex-col gap-2">
          {/* Header Line */}
          <div className="flex items-center justify-between gap-2 w-full flex-shrink-0">
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => onCategoryClick(note.category)} 
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black border hover:border-zinc-700 transition-all ${themeStyles.borderColor}`}
                >
                  <span className="text-xs grayscale">{category.emoji}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${themeStyles.accentText}`}>{category.label}</span>
                </button>
             </div>
             <div className="flex items-center gap-3 md:gap-2">
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Edit">
                  <Edit2 size={14} />
                </button>
                <button onClick={handleSpeakNote} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Speak">
                  <Volume2 size={14} />
                </button>
                <button onClick={() => onPin(note.id)} className={`transition-all ${note.isPinned ? themeStyles.accentText : `${themeStyles.iconColor} ${themeStyles.accentHover}`}`} title="Pin">
                  <Pin size={14} fill={note.isPinned ? "currentColor" : "none"} />
                </button>
                <button onClick={() => onDelete(note.id)} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Delete">
                  <Trash2 size={14} />
                </button>
                <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                <button onClick={() => onToggleExpand(note.id)} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`} title="Collapse">
                  <ChevronUp size={14} />
                </button>
             </div>
          </div>
          {/* Content */}
          <div className="flex flex-col gap-2 items-start w-full">
              {note.imageUrl && (
                <div className={`mb-1 rounded-lg overflow-hidden border bg-zinc-950 flex justify-center max-w-full self-end ${themeStyles.borderColor}`}>
                  <img src={note.imageUrl} alt="Note attachment" className="w-full md:w-auto h-auto md:max-h-96 object-contain" />
                </div>
              )}
              {note.text && (
                <div className="w-full">
                  <p className={`text-base leading-relaxed whitespace-pre-wrap break-words text-left inline-block w-full ${themeStyles.bodyText}`}>
                    {note.text}
                    <span className={`float-right ml-2 mt-1 text-[10px] uppercase tracking-wider select-none font-medium ${themeStyles.dateText}`}>
                      {formatDate(note.date)}
                    </span>
                  </p>
                </div>
              )}
          </div>
        </div>
      ) : (
        // Collapsed View
         isSingleLine ? (
            <div className="flex items-center justify-between gap-2">
               {/* Icon Left */}
               <button 
                  onClick={() => onCategoryClick(note.category)} 
                  className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-black/50 border hover:border-zinc-700 transition-all ${themeStyles.borderColor}`}
                >
                  <span className="text-[10px] grayscale">{category.emoji}</span>
                </button>

               <div className="flex-1 min-w-0" onClick={() => onToggleExpand(note.id)}>
                  <p className={`text-base truncate cursor-pointer text-left ${themeStyles.bodyText}`}>{lines[0]}</p>
               </div>

               <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] uppercase tracking-wider font-medium ${themeStyles.dateText}`}>{formatDate(note.date)}</span>
                  <button onClick={() => onToggleExpand(note.id)} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`}>
                    <ChevronDown size={14} />
                  </button>
               </div>
            </div>
          ) : (
            <div className="flex gap-2">
               {/* Icon Left */}
               <div className="flex flex-col justify-center">
                 <button 
                   onClick={() => onCategoryClick(note.category)} 
                   className={`w-5 h-5 flex items-center justify-center rounded-full bg-black/50 border hover:border-zinc-700 transition-all ${themeStyles.borderColor}`}
                 >
                   <span className="text-[10px] grayscale">{category.emoji}</span>
                 </button>
               </div>

               <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div onClick={() => onToggleExpand(note.id)} className="cursor-pointer">
                     <p className={`text-base leading-tight truncate mb-1 text-left ${themeStyles.bodyText}`}>
                       {lines[0] || <span className="italic opacity-50">Attachment</span>}
                     </p>
                     {lines.length > 1 && (
                       <p className={`text-sm leading-snug truncate text-left opacity-70 ${themeStyles.bodyText}`}>{lines[1]}</p>
                     )}
                  </div>
               </div>
               {note.imageUrl && (
                 <div className={`flex-shrink-0 w-12 h-10 rounded bg-zinc-800 border overflow-hidden ${themeStyles.borderColor}`}>
                   <img src={note.imageUrl} alt="" className="w-full h-full object-cover" />
                 </div>
               )}
               <div className="flex flex-col justify-between items-end gap-1 flex-shrink-0">
                  <div className="flex gap-1">
                     <button onClick={() => onToggleExpand(note.id)} className={`${themeStyles.iconColor} ${themeStyles.accentHover} transition-all`}>
                       <ChevronDown size={14} />
                     </button>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-medium ${themeStyles.dateText}`}>{formatDate(note.date)}</span>
               </div>
            </div>
          )
      )}
    </div>
  );
};