import React, { useState, useEffect, useRef } from 'react';
import { Mic, Search, X, Check, Settings, LayoutGrid, Square, Circle, AudioLines } from 'lucide-react';
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard';

// --- CONSTANTS ---
const EMOJI_LIST = [
  '⚡', '💼', '🔥', '💡', '🎨', '🚀', '⭐', 
  '📝', '📅', '🛒', '🏋️', '✈️', '🏠', 
  '💰', '🍔', '🎵', '🎮', '❤️', '🧠', '⏰', '🔧',
];

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  
  // Recording State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

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
    // Load saved data
    const savedNotes = localStorage.getItem('vibenotes_data');
    if (savedNotes) setNotes(JSON.parse(savedNotes));

    const savedCats = localStorage.getItem('vibenotes_categories');
    if (savedCats) setCategories(JSON.parse(savedCats));

    const savedVoice = localStorage.getItem('vibenotes_voice');
    if (savedVoice) setSelectedVoiceURI(savedVoice);

    let recognition: any = null;

    // --- VOICE RECOGNITION SETUP ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      
      // FIX FOR IPHONE: Continuous must be FALSE for best iOS support
      recognition.continuous = false; 
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
           setTranscript(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        
        // Handle explicit blocks
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            shouldListenRef.current = false;
            setIsListening(false);
            // Only alert if we are actually trying to listen
            if (isListening) {
                alert("Microphone access blocked. Please check your browser settings or use the keyboard microphone.");
            }
        }
      };

      recognition.onend = () => {
        // FIX FOR IPHONE: Manual restart loop for continuous feel
        if (shouldListenRef.current) {
          setTimeout(() => {
             try { 
               // Only restart if the user hasn't cancelled
               if (shouldListenRef.current) recognition.start(); 
             } catch (e) { 
               // Ignore errors if already started or blocked
               console.log("Restart attempt failed", e);
               if (shouldListenRef.current) setIsListening(false);
             }
          }, 100); // Small delay prevents iOS crash
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // CLEANUP FUNCTION (Fixes the zombie mic issue)
    return () => {
        if (recognition) recognition.abort();
        shouldListenRef.current = false;
    };
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
    // 1. iOS Home Screen Check
    // Apple DISABLES the speech API in "Standalone" (Home Screen) mode.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && isStandalone) {
        alert("Apple restricts the custom microphone button in Home Screen apps.\n\nPlease tap the text box and use the Microphone key on your keyboard instead.");
        // Open the review modal so they can type immediately
        setIsReviewing(true); 
        return;
    }

    // 2. Standard Browser Check
    if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
        return;
    }

    // 3. Toggle Logic
    if (isListening) {
      // STOP
      shouldListenRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      // Wait a moment before showing review to let final transcript process
      setTimeout(() => { if (transcript.trim() || true) setIsReviewing(true); }, 500);
    } else {
      // START
      setTranscript('');
      setSelectedCategory('idea');
      shouldListenRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsReviewing(false);
      } catch (e) { 
        console.error("Failed to start", e);
        shouldListenRef.current = false; 
        alert("Could not start microphone. Please refresh and try again.");
      }
    }
  };

  const cancelRecording = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.abort(); // Abort is faster than stop
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
    <div className="min-h-screen bg-black text-zinc-100 p-6 pb-32 font-sans selection:bg-orange-500/30">
      
      {/* Header */}
      <header className="max-w-2xl mx-auto mb-8 flex justify-between items-center py-2 border-b border-zinc-900">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-md">
             <div className="w-3 h-3 bg-orange-600 rounded-sm shadow-[0_0_10px_rgba(234,88,12,0.5)]"></div>
           </div>
           <h1 className="text-2xl font-black tracking-tight text-white">
            Vibe<span className="text-zinc-500 font-bold">Notes</span>
           </h1>
         </div>

        <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors"
        >
            <Settings size={20} />
        </button>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-6 relative group">
          <Search className="absolute left-4 top-3 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
          <input 
            type="text" placeholder="SEARCH..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-md py-2.5 pl-11 pr-4 text-zinc-300 focus:outline-none focus:border-white transition-all placeholder:text-zinc-700 text-sm font-bold uppercase tracking-wider"
          />
      </div>

      {/* Filter Chips */}
      <div className="max-w-2xl mx-auto mb-8 flex flex-wrap gap-2 justify-center">
        <button 
            onClick={() => setActiveFilter('all')} 
            className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border transition-all ${activeFilter === 'all' ? 'bg-white text-black border-white' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}
        >
            All
        </button>
        {categories.map((cat) => (
            <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                    activeFilter === cat.id ? 'bg-white text-black border-white' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                }`}
            >
                {cat.label}
            </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-2xl mx-auto grid gap-3">
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
          {filteredNotes.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg">
                  <LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} />
                  <p className="text-zinc-700 text-xs font-mono uppercase">Database Empty</p>
              </div>
          )}
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
             <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        Config
                    </h2>
                    <button onClick={() => { setShowSettings(false); setOpenEmojiPicker(null); }} className="text-zinc-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Voice Section */}
                <div className="mb-8 border-b border-zinc-900 pb-8">
                    <label className="text-[10px] uppercase text-zinc-600 font-bold mb-2 block tracking-widest">Audio Feedback</label>
                    <select 
                        value={selectedVoiceURI}
                        onChange={(e) => { setSelectedVoiceURI(e.target.value); localStorage.setItem('vibenotes_voice', e.target.value); }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
                    >
                        <option value="">System Default</option>
                        {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                    </select>
                </div>

                {/* Categories Section */}
                <div>
                    <label className="text-[10px] uppercase text-zinc-600 font-bold mb-4 block tracking-widest">Tags</label>
                    <div className="space-y-3">
                        {categories.map((cat) => (
                            <div key={cat.id} className="bg-black rounded-md p-3 border border-zinc-900 flex items-center gap-3">
                                <div className="relative">
                                      <button 
                                        onClick={() => setOpenEmojiPicker(openEmojiPicker === cat.id ? null : cat.id)}
                                        className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors text-sm"
                                      >
                                        {cat.emoji}
                                      </button>
                                      
                                      {openEmojiPicker === cat.id && (
                                        <div className="absolute top-10 left-0 w-64 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-20 p-2 grid grid-cols-6 gap-1 h-48 overflow-y-auto">
                                            {EMOJI_LIST.map(emoji => (
                                              <button
                                                key={emoji}
                                                onClick={() => { handleCategoryEdit(cat.id, 'emoji', emoji); setOpenEmojiPicker(null); }}
                                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-sm"
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                        </div>
                                      )}
                                </div>
                                <input 
                                    type="text" 
                                    value={cat.label}
                                    onChange={(e) => handleCategoryEdit(cat.id, 'label', e.target.value)}
                                    className="flex-1 bg-transparent border-none text-zinc-300 focus:outline-none font-bold text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
             </div>
         </div>
      )}

      {/* RECORDING / REVIEW MODAL */}
      {(isListening || isReviewing) && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl relative flex flex-col items-center">
            <button 
              onClick={cancelRecording} 
              className="absolute top-4 right-4 p-2 rounded-md hover:bg-zinc-900 text-zinc-600 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {isListening && (
              <div className="relative w-24 h-24 flex items-center justify-center mb-6 mt-4">
                <div className="absolute inset-0 bg-orange-500 rounded-full opacity-20 animate-ping"></div>
                <div className="relative z-10 bg-gradient-to-tr from-orange-600 to-red-600 p-5 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.4)]">
                  <Mic size={32} className="text-white animate-pulse" />
                </div>
              </div>
            )}

            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 text-center text-zinc-400">{isListening ? 'Recording Input...' : 'Confirm'}</h2>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type or use keyboard mic..."
              className={`w-full bg-black border border-zinc-800 rounded-md p-4 text-lg text-white resize-none focus:outline-none focus:border-white mb-6 font-light ${isListening ? 'h-32 opacity-50' : 'h-48 opacity-100'}`}
            />

            {isReviewing && (
              <div className="mb-6 w-full">
                <div className="flex flex-wrap gap-2 justify-center">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${selectedCategory === cat.id ? 'bg-white text-black border-white' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 w-full">
              {isListening ? (
                <button 
                  onClick={toggleRecording} 
                  className="w-full py-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-red-500 font-bold text-sm uppercase tracking-widest border border-zinc-800 flex items-center justify-center gap-2"
                >
                  <Square size={16} fill="currentColor" /> STOP
                </button>
              ) : (
                <button 
                  onClick={saveNote} 
                  className="w-full py-4 rounded-md bg-white hover:bg-zinc-200 text-black font-bold text-sm uppercase tracking-widest border border-white flex items-center justify-center gap-2"
                >
                  <Check size={16} /> SAVE
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB - COOL GLOWING BUTTON (ORANGE) */}
      {!isListening && !isReviewing && (
        <button 
          onClick={toggleRecording} 
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-tr from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-2xl shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center justify-center text-white transition-all z-40 group border border-orange-400 active:scale-95"
        >
          <Mic size={28} className="drop-shadow-md" />
        </button>
      )}
    </div>
  );
}

export default App;