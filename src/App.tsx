import React, { useState, useEffect, useRef } from 'react';
import { Mic, Search, X, Check, Settings } from 'lucide-react';
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard';

// --- CONSTANTS ---
const COLOR_OPTIONS = [
  { id: 'violet', bg: 'bg-violet-500', class: 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' },
  { id: 'blue', bg: 'bg-blue-500', class: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' },
  { id: 'emerald', bg: 'bg-emerald-500', class: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
  { id: 'rose', bg: 'bg-rose-500', class: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' },
  { id: 'amber', bg: 'bg-amber-500', class: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' },
  { id: 'cyan', bg: 'bg-cyan-500', class: 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' },
  { id: 'fuchsia', bg: 'bg-fuchsia-500', class: 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]' },
];

const EMOJI_LIST = [
  '⚡', '💼', '🌱', '🔥', '💡', '🎨', '🚀', '⭐', 
  '📝', '📅', '🛒', '🏋️', '🧘', '🎓', '✈️', '🏠', 
  '💰', '🍔', '🎵', '🎮', '❤️', '🧠', '⏰', '🔧',
  '🌳', '🌊', '🌙', '☀️', '☁️', '🎲', '🧩', '🏆'
];

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  
  // Recording State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false); // CRITICAL FOR IOS: Tracks if we WANT to be listening

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all'>('all');
  
  // Modal State
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('idea');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedNotes = localStorage.getItem('vibenotes_data');
    if (savedNotes) setNotes(JSON.parse(savedNotes));

    const savedCats = localStorage.getItem('vibenotes_categories');
    if (savedCats) setCategories(JSON.parse(savedCats));

    const savedVoice = localStorage.getItem('vibenotes_voice');
    if (savedVoice) setSelectedVoiceURI(savedVoice);

    // --- SPEECH RECOGNITION SETUP ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Explicitly set language for iOS

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
           setTranscript(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
        }
      };

      // IOS FIX: Handle unexpected stops
      recognition.onend = () => {
        if (shouldListenRef.current) {
          // If we are supposed to be listening but it stopped (iOS quirk), restart it.
          try {
            recognition.start();
          } catch (e) {
            console.log("Restart error", e);
            setIsListening(false);
            shouldListenRef.current = false;
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
           shouldListenRef.current = false;
           setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    // Voice Init
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (selectedVoiceURI && voices.length > 0) {
      setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null);
    }
  }, [selectedVoiceURI, voices]);

  useEffect(() => {
    localStorage.setItem('vibenotes_data', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('vibenotes_categories', JSON.stringify(categories));
  }, [categories]);

  // --- HANDLERS ---

  const handleCategoryEdit = (id: CategoryId, field: 'label' | 'emoji' | 'colorClass', value: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
        return;
    }

    if (isListening) {
      // STOPPING
      shouldListenRef.current = false; // Mark that we INTEND to stop
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Delay showing review slightly to ensure transcript catches up
      setTimeout(() => {
          if (transcript.trim() || true) setIsReviewing(true);
      }, 200);

    } else {
      // STARTING
      setTranscript('');
      setSelectedCategory('idea');
      shouldListenRef.current = true; // Mark that we INTEND to listen
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsReviewing(false);
      } catch (e) {
        console.error("Failed to start:", e);
        shouldListenRef.current = false;
      }
    }
  };

  const cancelRecording = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsReviewing(false);
    setTranscript('');
  };

  const saveNote = () => {
    if (!transcript.trim()) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: transcript.trim(),
      date: Date.now(),
      category: selectedCategory,
      isPinned: false
    };
    setNotes(prev => [newNote, ...prev]);
    setTranscript('');
    setIsReviewing(false);
  };

  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
  
  const togglePin = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const filteredNotes = notes
    .filter(n => {
      const matchesSearch = n.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeFilter === 'all' || n.category === activeFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-32">
      
      {/* Header */}
      <header className="max-w-2xl mx-auto mb-6 flex justify-between items-center relative py-2">
         {/* Logo and Title */}
         <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none">
           <img 
             src="/icon.png" 
             alt="VibeNotes Logo" 
             className="w-10 h-10 rounded-xl shadow-lg shadow-violet-500/20" 
             onError={(e) => {
                 (e.target as HTMLImageElement).style.display = 'none';
             }}
           />
           <h1 className="text-3xl font-black tracking-tight">
            <span className="text-white">Vibe</span>
            <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">Notes</span>
           </h1>
         </div>

        <button 
            onClick={() => setShowSettings(true)}
            className="ml-auto p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-10"
        >
            <Settings size={24} />
        </button>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-4 relative group">
          <Search className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
          <input 
            type="text" placeholder="Search..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-600"
          />
      </div>

      {/* Filter Chips */}
      <div className="max-w-2xl mx-auto mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setActiveFilter('all')} className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${activeFilter === 'all' ? 'bg-white text-slate-950 border-white' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>All</button>
        {categories.map((cat) => (
            <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all whitespace-nowrap ${
                    activeFilter === cat.id ? 'bg-white text-slate-950 border-white' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
            >
                {cat.emoji} {cat.label}
            </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-2xl mx-auto grid gap-4">
          {filteredNotes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              categories={categories}
              selectedVoice={selectedVoice}
              onDelete={deleteNote} 
              onPin={togglePin} 
              onCategoryClick={(cat) => setActiveFilter(cat)}
              onEdit={(n) => {
                 setTranscript(n.text);
                 setSelectedCategory(n.category);
                 deleteNote(n.id);
                 setIsReviewing(true);
              }}
            />
          ))}
          {filteredNotes.length === 0 && <p className="text-center py-10 opacity-50">No notes found.</p>}
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => { setShowSettings(false); setOpenEmojiPicker(null); }} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white">
                   <X size={24} />
                </button>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Settings size={20} className="text-violet-500" /> Settings
                </h2>
                
                {/* Voice Section */}
                <div className="mb-8 border-b border-slate-800 pb-8">
                    <label className="text-xs uppercase text-slate-500 font-bold mb-2 block tracking-wider">Voice Preference</label>
                    <select 
                        value={selectedVoiceURI}
                        onChange={(e) => { setSelectedVoiceURI(e.target.value); localStorage.setItem('vibenotes_voice', e.target.value); }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500"
                    >
                        <option value="">Default Voice</option>
                        {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                    </select>
                </div>

                {/* Categories Section */}
                <div>
                    <label className="text-xs uppercase text-slate-500 font-bold mb-4 block tracking-wider">Customize Categories</label>
                    
                    <div className="space-y-6">
                        {categories.map((cat) => (
                            <div key={cat.id} className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                                <div className="flex gap-3 mb-3">
                                    {/* Custom Emoji Picker Dropdown */}
                                    <div className="relative">
                                      <button 
                                        onClick={() => setOpenEmojiPicker(openEmojiPicker === cat.id ? null : cat.id)}
                                        className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-xl hover:border-violet-500 transition-colors text-xl"
                                      >
                                        {cat.emoji}
                                      </button>
                                      
                                      {openEmojiPicker === cat.id && (
                                        <div className="absolute top-14 left-0 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 p-2 grid grid-cols-6 gap-1 h-48 overflow-y-auto custom-scrollbar">
                                            {EMOJI_LIST.map(emoji => (
                                              <button
                                                key={emoji}
                                                onClick={() => { handleCategoryEdit(cat.id, 'emoji', emoji); setOpenEmojiPicker(null); }}
                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-lg"
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Label Input */}
                                    <input 
                                        type="text" 
                                        value={cat.label}
                                        onChange={(e) => handleCategoryEdit(cat.id, 'label', e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-violet-500 font-bold"
                                    />
                                </div>

                                {/* Color Picker Swatches */}
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-slate-500 font-semibold mr-2">Color:</span>
                                    {COLOR_OPTIONS.map((color) => (
                                      <button
                                        key={color.id}
                                        onClick={() => handleCategoryEdit(cat.id, 'colorClass', color.class)}
                                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${color.bg} ${cat.colorClass === color.class ? 'ring-2 ring-white scale-110' : 'opacity-40 hover:opacity-100'}`}
                                      />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
         </div>
      )}

      {/* RECORDING MODAL */}
      {(isListening || isReviewing) && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center">
            <button 
              onClick={cancelRecording} 
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors z-10"
              style={{ touchAction: 'manipulation' }}
            >
              <X size={24} />
            </button>

            {isListening && (
              <div className="relative w-24 h-24 flex items-center justify-center mb-6 mt-2">
                <div className="absolute inset-0 bg-violet-500 rounded-full opacity-20 animate-ping"></div>
                <div className="relative z-10 bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-4 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.6)]">
                  <Mic size={32} className="text-white animate-pulse" />
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold mb-4 text-center">{isListening ? 'Listening...' : 'Review Note'}</h2>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak now..."
              className={`w-full bg-slate-950 rounded-xl p-4 text-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 mb-6 transition-all ${isListening ? 'h-32 opacity-80' : 'h-48 opacity-100'}`}
            />

            {isReviewing && (
              <div className="mb-6 w-full">
                <p className="text-xs uppercase text-slate-500 font-bold mb-3 tracking-wider text-center">Select Vibe</p>
                <div className="flex gap-2 justify-center">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedCategory === cat.id ? 'bg-white text-slate-950 border-white scale-105 shadow-lg' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 w-full">
              {isListening ? (
                <button 
                  onClick={toggleRecording} 
                  className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg border border-slate-700 flex items-center justify-center gap-2"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /> Stop Listening
                </button>
              ) : (
                <button 
                  onClick={saveNote} 
                  className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Check size={20} /> Save Note
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {!isListening && !isReviewing && (
        <button 
          onClick={toggleRecording} 
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-full shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-40 group"
          style={{ touchAction: 'manipulation' }}
        >
          <Mic size={32} className="group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}

export default App;