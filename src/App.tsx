import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Settings, Download, Globe, ArrowLeft, ChevronRight, Plus, ArrowUp, LayoutGrid, Cloud, CloudOff, LogOut, Image as ImageIcon, Check, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Note, CategoryId, CategoryConfig, DEFAULT_CATEGORIES } from './types';
import { NoteCard } from './components/NoteCard'; // Imports your updated hybrid card
import { useFirebaseSync, useNotes } from './useFirebaseSync';
import Auth from './components/Auth';

const EMOJI_LIST = ['⚡', '💼', '🔥', '💡', '🎨', '🚀', '⭐', '📝', '📅', '🛒', '🏋️', '✈️', '🏠', '💰', '🍔', '🎵', '🎮', '❤️', '🧠', '⏰', '🔧'];
const TRANSLATIONS = { en: { search: "SEARCH...", all: "All", config: "Config", audioLabel: "Audio Voice", tagsLabel: "Categories", alignLabel: "Card Alignment", dataLabel: "Data", backup: "Download Backup", typePlaceholder: "Type a note...", noVoices: "No Premium Voices Found", defaultVoice: "System Default", languageLabel: "Language", selectIcon: "Select Icon", syncing: "Syncing...", synced: "Synced", offline: "Offline", logout: "Logout", cat_idea: "Idea", cat_work: "Work", cat_journal: "Journal", cat_todo: "To-Do", editNote: "Edit Note" }, ru: { search: "ПОИСК...", all: "Все", config: "Настройки", audioLabel: "Голос", tagsLabel: "Категории", alignLabel: "Выравнивание", dataLabel: "Данные", backup: "Скачать бэкап", typePlaceholder: "Введите заметку...", noVoices: "Голоса не найдены", defaultVoice: "По умолчанию", languageLabel: "Язык", selectIcon: "Выберите иконку", syncing: "Синхронизация...", synced: "Синхронизировано", offline: "Оффлайн", logout: "Выйти", cat_idea: "Идея", cat_work: "Работа", cat_journal: "Дневник", cat_todo: "Задачи", editNote: "Редактировать" } };

// UTILS
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_SIZE = 600;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

function App() {
  const { user, loading: authLoading } = useFirebaseSync();
  const { notes, addNote, deleteNote: deleteNoteFromFirebase, updateNote, syncing } = useNotes(user?.uid || null);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [transcript, setTranscript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('idea');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'icons'>('main'); 
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // --- EDIT MODAL STATE (For Mobile) ---
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editNoteImage, setEditNoteImage] = useState('');

  const getCategoryLabel = (cat: CategoryConfig) => {
    const id = cat.id.toLowerCase();
    const t = TRANSLATIONS[lang];
    if (lang === 'ru') return { idea: t.cat_idea, work: t.cat_work, journal: t.cat_journal, 'to-do': t.cat_todo, todo: t.cat_todo }[id] || cat.label;
    return { idea: t.cat_idea, work: t.cat_work, journal: t.cat_journal, 'to-do': t.cat_todo, todo: t.cat_todo }[id] || cat.label;
  };

  const handleImageUpload = async (file: File, isEditMode = false) => {
    if (!file.type.startsWith('image/')) return alert('Please select an image file');
    setIsUploadingImage(true);
    try {
      const url = await compressImage(file);
      if (url.length > 800000) return alert('Image too large.');
      if (isEditMode) setEditNoteImage(url);
      else setImageUrl(url);
    } catch (e) { console.error(e); } finally { setIsUploadingImage(false); }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>, isEditMode = false) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) await handleImageUpload(file, isEditMode);
        break;
      }
    }
  };

  useEffect(() => {
    try {
        const savedLang = localStorage.getItem('vibenotes_lang'); if(savedLang) setLang(savedLang as any);
        const savedAlignment = localStorage.getItem('vibenotes_alignment'); if(savedAlignment) setAlignment(savedAlignment as any);
        const savedCats = localStorage.getItem('vibenotes_categories'); if(savedCats) setCategories(JSON.parse(savedCats));
        const savedVoice = localStorage.getItem('vibenotes_voice'); if(savedVoice) setSelectedVoiceURI(savedVoice);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const loadVoices = () => {
        const all = window.speechSynthesis.getVoices();
        setVoices(all.filter(v => v.lang.startsWith(lang === 'en' ? 'en' : 'ru')));
    };
    loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [lang]);

  useEffect(() => { if (selectedVoiceURI) setSelectedVoice(voices.find(v => v.voiceURI === selectedVoiceURI) || null); }, [selectedVoiceURI, voices]);
  useEffect(() => { localStorage.setItem('vibenotes_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('vibenotes_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('vibenotes_alignment', alignment); }, [alignment]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; } }, [transcript]);

  const handleCategoryEdit = (id: CategoryId, field: 'label' | 'emoji' | 'colorClass', value: string) => setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  const cycleCategory = () => { const i = categories.findIndex(c => c.id === selectedCategory); setSelectedCategory(categories[(i + 1) % categories.length].id); };
  
  const saveNote = async () => {
    if (!transcript.trim() && !imageUrl) return;
    try {
        await addNote({ text: transcript.trim(), date: Date.now(), category: selectedCategory, isPinned: false, isExpanded: true, imageUrl: imageUrl || undefined });
        setTranscript(''); setImageUrl('');
    } catch (e) { console.error(e); }
  };

  // Called from NoteCard ONLY IF ON MOBILE
  const handleEditClick = (note: Note) => { setEditingNote(note); setEditNoteText(note.text); setEditNoteImage(note.imageUrl || ''); };
  
  const handleSaveEdit = async () => {
      if(editingNote) {
          const updates: Partial<Note> = { text: editNoteText };
          if(editNoteImage !== editingNote.imageUrl) updates.imageUrl = editNoteImage || undefined;
          await updateNote(editingNote.id, updates);
          setEditingNote(null);
      }
  };

  const handleDeleteNote = async (id: string) => { await deleteNoteFromFirebase(id); };
  const togglePin = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isPinned: !n.isPinned }); };
  const handleToggleExpand = async (id: string) => { const n = notes.find(n => n.id === id); if(n) await updateNote(id, { isExpanded: !n.isExpanded }); };

  const filteredNotes = notes.filter(n => (n.text.toLowerCase().includes(searchQuery.toLowerCase()) && (activeFilter === 'all' || n.category === activeFilter))).sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
  const t = TRANSLATIONS[lang];
  const getAlignmentClass = () => alignment === 'center' ? 'items-center' : alignment === 'right' ? 'items-end' : 'items-start';

  if (authLoading) return <div className="min-h-screen bg-black" />;
  if (!user) return <Auth />;

  return (
    <div className="min-h-screen w-full bg-black text-zinc-100 font-sans selection:bg-orange-500/30">
      <div className="fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-b border-zinc-900 pb-2 shadow-lg">
        <header className="max-w-2xl mx-auto flex items-center gap-3 p-4 pb-2">
           <div className="flex-shrink-0 w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-md"><div className="w-3 h-3 bg-orange-600 rounded-sm shadow-[0_0_10px_rgba(234,88,12,0.5)]"></div></div>
           <div className="flex-1 relative group"><Search className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-white transition-colors" size={16} /><input type="text" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-9 pr-4 text-zinc-300 focus:outline-none focus:border-white transition-all placeholder:text-zinc-700 text-base md:text-xs font-bold uppercase tracking-wider" /></div>
           <button onClick={() => { setShowSettings(true); setSettingsView('main'); }} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-white transition-all active:scale-95"><Settings size={20} /></button>
        </header>
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full px-5">
          <button onClick={() => setActiveFilter('all')} className={`min-w-0 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 flex-shrink-0 ${activeFilter === 'all' ? 'bg-black text-orange-500 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)] scale-105' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}>{t.all}</button>
          {categories.map((cat) => (<button key={cat.id} onClick={() => setActiveFilter(cat.id)} className={`min-w-0 px-2 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 duration-300 ${activeFilter === cat.id ? 'bg-black text-orange-500 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)] scale-105' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}><span className="grayscale text-[10px]">{cat.emoji}</span><span className="truncate">{getCategoryLabel(cat)}</span></button>))}
        </div>
      </div>

      <div className={`pt-36 pb-40 px-4 max-w-2xl mx-auto flex flex-col gap-3 ${getAlignmentClass()}`}>
          {filteredNotes.map(note => (
            <NoteCard key={note.id} note={note} categories={categories} selectedVoice={selectedVoice} onDelete={handleDeleteNote} onPin={togglePin} onCategoryClick={(cat) => setActiveFilter(cat)} onEdit={() => handleEditClick(note)} onUpdate={updateNote} onToggleExpand={handleToggleExpand} />
          ))}
          {filteredNotes.length === 0 && <div className="text-center py-20 border border-dashed border-zinc-900 rounded-lg col-span-full opacity-50 w-full"><LayoutGrid className="mx-auto text-zinc-800 mb-2" size={32} /><p className="text-zinc-700 text-xs font-mono uppercase">Database Empty</p></div>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-zinc-900 p-3 pb-6 md:pb-3 transition-all">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
              <button onClick={cycleCategory} className="flex-shrink-0 h-10 mb-0.5 px-3 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-600 flex items-center gap-2 transition-all active:scale-95 group"><span className="text-xs grayscale group-hover:grayscale-0 transition-all">{categories.find(c => c.id === selectedCategory)?.emoji}</span></button>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:border-zinc-600 transition-colors gap-3">
                  {imageUrl && <div className="relative flex-shrink-0 group/image"><div className="w-8 h-8 rounded overflow-hidden border border-zinc-700"><img src={imageUrl} className="w-full h-full object-cover" /></div><button onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"><X size={10} /></button></div>}
                  <textarea ref={textareaRef} value={transcript} onChange={(e) => setTranscript(e.target.value)} onPaste={(e) => handlePaste(e)} placeholder={t.typePlaceholder} rows={1} className="w-full bg-transparent border-none text-white placeholder:text-zinc-600 focus:outline-none text-base md:text-sm resize-none max-h-32 py-0.5" />
              </div>
              <button onClick={saveNote} disabled={!transcript.trim() && !imageUrl} className={`flex-shrink-0 w-10 h-10 mb-0.5 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${transcript.trim() || imageUrl ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>{transcript.trim() || imageUrl ? <ArrowUp size={20} strokeWidth={3} /> : <Plus size={20} />}</button>
          </div>
      </div>

      {/* FULL SCREEN EDIT MODAL (Triggered only on Mobile) */}
      {editingNote && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-black/50">
                <button onClick={() => setEditingNote(null)} className="p-2 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t.editNote}</span>
                <button onClick={handleSaveEdit} className="p-2 rounded-full bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-white transition-all"><Check size={20} /></button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center">
                 <div className="w-full mb-4">
                    {editNoteImage ? (
                        <div className="relative mb-3 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex justify-center max-h-80">
                            <img src={editNoteImage} className="w-full h-full object-contain" />
                            <button onClick={() => setEditNoteImage('')} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg"><X size={14} /></button>
                        </div>
                    ) : (
                        <label className="flex items-center justify-center gap-2 w-full py-4 border border-dashed border-zinc-800 rounded-lg text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 cursor-pointer transition-all">
                            <ImageIcon size={16} /> <span className="text-xs font-bold uppercase">Add Image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0], true); }} />
                        </label>
                    )}
                 </div>
                 <textarea autoFocus value={editNoteText} onChange={(e) => setEditNoteText(e.target.value)} onPaste={(e) => handlePaste(e, true)} className="w-full h-full bg-transparent text-lg md:text-xl text-zinc-100 placeholder:text-zinc-700 resize-none focus:outline-none leading-relaxed" placeholder="Type here..." />
            </div>
            <div className="h-[40vh] sm:h-0 pointer-events-none"></div>
        </div>
      )}

      {showSettings && (
         <div className="fixed inset-0 z-50 flex justify-center sm:items-center bg-black sm:bg-black/80 animate-in fade-in duration-200">
             <div className="w-full h-full sm:h-auto sm:max-w-md bg-black sm:border border-zinc-800 sm:rounded-2xl p-4 pt-12 sm:pt-6 shadow-2xl relative flex flex-col">
                <div className="flex justify-between items-center mb-6"><h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">{t.config}</h2><button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95"><X size={16} /></button></div>
                {settingsView === 'main' ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex-1 overflow-y-auto space-y-2">{categories.map((cat) => (<button key={cat.id} onClick={() => { setEditingCatId(cat.id); setSettingsView('icons'); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800"><div className="w-8 h-8 flex items-center justify-center rounded-full bg-black border border-zinc-800 text-sm grayscale">{cat.emoji}</div><p className="text-[11px] font-bold text-zinc-300">{getCategoryLabel(cat)}</p></button>))}</div>
                        <div className="pt-4 border-t border-zinc-900 space-y-2"><button onClick={() => { const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes)); const a = document.createElement('a'); a.href = data; a.download = 'backup.json'; a.click(); }} className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><Download size={12} /> {t.backup}</button><button onClick={() => signOut(auth)} className="w-full py-2.5 bg-red-900/20 border border-red-900/50 text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><LogOut size={12} /> {t.logout}</button></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-6 gap-2">{EMOJI_LIST.map(emoji => (<button key={emoji} onClick={() => { if(editingCatId) handleCategoryEdit(editingCatId, 'emoji', emoji); setSettingsView('main'); }} className="aspect-square flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-base grayscale hover:grayscale-0">{emoji}</button>))}</div>
                )}
             </div>
         </div>
      )}
    </div>
  );
}

export default App;