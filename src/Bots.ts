import { doc, getDoc, setDoc } from "firebase/firestore";

// --- STOIC QUOTES LIBRARY ---
const STOIC_QUOTES = [
  "The obstacle is the way. — Marcus Aurelius",
  "We suffer more in imagination than in reality. — Seneca",
  "Waste no more time arguing what a good man should be. Be one. — Marcus Aurelius",
  "It is not what happens to you, but how you react to it that matters. — Epictetus",
  "You have power over your mind - not outside events. Realize this, and you will find strength. — Marcus Aurelius",
  "If a man knows not to which port he sails, no wind is favorable. — Seneca",
  "He who fears death will never do anything worthy of a man who is alive. — Seneca",
  "The best revenge is to be unlike him who performed the injury. — Marcus Aurelius",
  "Man is not worried by real problems so much as by his imagined anxieties about real problems. — Epictetus",
  "First say to yourself what you would be; and then do what you have to do. — Epictetus",
  "It is not death that a man should fear, but he should fear never beginning to live. — Marcus Aurelius",
  "Difficulties strengthen the mind, as labor does the body. — Seneca",
  "Wealth consists not in having great possessions, but in having few wants. — Epictetus",
  "Receive without conceit, release without struggle. — Marcus Aurelius",
  "To be everywhere is to be nowhere. — Seneca",
  "If it is not right do not do it; if it is not true do not say it. — Marcus Aurelius",
  "Curb your desire—don’t set your heart on so many things and you will get what you need. — Epictetus",
  "Sometimes even to live is an act of courage. — Seneca",
  "The soul becomes dyed with the color of its thoughts. — Marcus Aurelius",
  "Luck is what happens when preparation meets opportunity. — Seneca",
  "Dwell on the beauty of life. Watch the stars, and see yourself running with them. — Marcus Aurelius",
  "No person has the power to have everything they want, but it is in their power not to want what they don't have. — Seneca",
  "Happiness and freedom begin with a clear understanding of one principle: Some things are within our control, and some things are not. — Epictetus",
  "Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart. — Marcus Aurelius",
  "Associate with people who are likely to improve you. — Seneca",
  "It is the quality of our thoughts that determines the quality of our life. — Marcus Aurelius",
  "Don't explain your philosophy. Embodiy it. — Epictetus",
  "Ignorance is the cause of fear. — Seneca",
  "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth. — Marcus Aurelius",
  "Only the educated are free. — Epictetus",
  "Life is very short and anxious for those who forget the past, neglect the present, and fear the future. — Seneca",
  "Very little is needed to make a happy life; it is all within yourself in your way of thinking. — Marcus Aurelius",
  "Whatever happens to you has been waiting to happen since the beginning of time. — Marcus Aurelius",
  "Make the best use of what is in your power, and take the rest as it happens. — Epictetus",
  "Time heals what reason cannot. — Seneca",
  "Confine yourself to the present. — Marcus Aurelius",
  "If you want to improve, be content to be thought foolish and stupid. — Epictetus",
  "Look back over the past, with its changing empires that rose and fell, and you can foresee the future too. — Marcus Aurelius",
  "Think of the life you have lived until now as over and, as a dead man, see what’s left as a bonus and live it according to Nature. — Marcus Aurelius",
  "A gem cannot be polished without friction, nor a man perfected without trials. — Seneca",
  "How long are you going to wait before you demand the best for yourself? — Epictetus",
  "Loss is nothing else but change, and change is Nature's delight. — Marcus Aurelius",
  "While we wait for life, life passes. — Seneca",
  "Reject your sense of injury and the injury itself disappears. — Marcus Aurelius",
  "Don't hope that events will turn out the way you want, welcome events in whichever way they happen: this is the path to peace. — Epictetus",
  "True happiness is to enjoy the present, without anxious dependence upon the future. — Seneca",
  "When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love. — Marcus Aurelius",
  "We have two ears and one mouth so that we can listen twice as much as we speak. — Epictetus",
  "It is impossible for a man to learn what he thinks he already knows. — Epictetus",
  "As long as you live, keep learning how to live. — Seneca"
];

// --- DAILY CHECK LOGIC (Birthday + Stoic) ---
export const runDailyBotChecks = (myProfile: any, addNote: Function) => {
  // 1. Birthday Check
  const checkBirthdays = async () => {
    if (!myProfile || !myProfile.birthdays) return;
    
    const today = new Date();
    const lastCheck = localStorage.getItem('vibenotes_bot_last_check');
    const todayStr = today.toDateString();

    if (lastCheck === todayStr) return; 

    const savedBd = myProfile.birthdays || [];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    let msg = '';
    
    savedBd.forEach((b: any) => {
        const [m, d] = b.date.split('-').map(Number);
        if (today.getMonth() + 1 === m && today.getDate() === d) msg += `🎂 HAPPY BIRTHDAY TO ${b.name.toUpperCase()}! 🎉\nHope they have a great one!\n`;
        if (tomorrow.getMonth() + 1 === m && tomorrow.getDate() === d) msg += `⚠️ REMINDER: ${b.name}'s birthday is tomorrow! 🎁\n`;
    });

    if (msg) {
        await addNote({ text: `[BIRTHDAY BOT] 🤖\n${msg}`, date: Date.now(), category: 'default', isPinned: false, isExpanded: true });
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    localStorage.setItem('vibenotes_bot_last_check', todayStr);
  };

  // 2. Stoic Check
  const checkStoic = async () => {
    const todayStr = new Date().toDateString();
    const lastCheck = localStorage.getItem('vibenotes_stoic_last_check');
    if (lastCheck === todayStr) return;

    const randomQuote = STOIC_QUOTES[Math.floor(Math.random() * STOIC_QUOTES.length)];
    await addNote({ text: `🏛️ **Daily Stoic**\n"${randomQuote}"`, date: Date.now(), category: 'default', isPinned: false, isExpanded: true });
    localStorage.setItem('vibenotes_stoic_last_check', todayStr);
  };

  checkBirthdays();
  // Delay Stoic check slightly so they don't stack instantly if both trigger
  setTimeout(checkStoic, 3000);
};

// --- COMMAND PARSER (Handles user typing) ---
export const handleBotCommand = async (
  text: string, 
  activeFilter: string, 
  user: any, 
  db: any, 
  addNote: Function,
  callbacks: { reset: Function }
) => {
  const lower = text.trim().toLowerCase();
  const botCategory = activeFilter === 'secret' ? 'secret' : 'default';

  // STOIC COMMAND
  if (lower === 'stoic') {
     const randomQuote = STOIC_QUOTES[Math.floor(Math.random() * STOIC_QUOTES.length)];
     await addNote({ text: `🏛️ **Stoic Wisdom**\n"${randomQuote}"`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
     callbacks.reset();
     return true; // "true" means a bot handled it
  }

  // BIRTHDAY COMMANDS
  if (lower.startsWith('bday')) {
    // HELP
    if (lower === 'bday' || lower === 'bday help') {
       const helpMsg = `🎂 **BIRTHDAY BOT** 🤖\n\n• **Add:** bday add Name MM-DD\n• **List:** bday list\n• **Remove:** bday del Name\n• **Test:** bday check`;
       await addNote({ text: helpMsg, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       callbacks.reset();
       return true;
    }

    // CHECK
    if (lower === 'bday check' || lower === 'bday run') {
       const userRef = doc(db, "users", user.uid);
       const docSnap = await getDoc(userRef);
       const savedBd = docSnap.data()?.birthdays || [];
       const today = new Date();
       const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
       let msg = '';

       savedBd.forEach((b: any) => {
          const [m, d] = b.date.split('-').map(Number);
          if (today.getMonth() + 1 === m && today.getDate() === d) msg += `🎂 HAPPY BIRTHDAY TO ${b.name.toUpperCase()}! 🎉\n`;
          if (tomorrow.getMonth() + 1 === m && tomorrow.getDate() === d) msg += `⚠️ Reminder: ${b.name}'s birthday is tomorrow! 🎁\n`;
       });

       if (msg) await addNote({ text: `[BIRTHDAY BOT] 🤖\n${msg}`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       else await addNote({ text: `🤖 Bot: Checked ${savedBd.length} birthdays. ✅\nNo birthdays found for today or tomorrow.`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       
       callbacks.reset();
       return true;
    }

    // LIST
    if (lower.includes('whose birthday') || lower === 'bday list') {
       const userRef = doc(db, "users", user.uid);
       const docSnap = await getDoc(userRef);
       const currentList = docSnap.data()?.birthdays || [];
       if(currentList.length === 0) await addNote({ text: `🤖 Bot: No birthdays saved yet.`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       else {
           const listTxt = currentList.map((b:any) => `• ${b.name} (${b.date})`).join('\n');
           await addNote({ text: `🎂 Upcoming Birthdays (${currentList.length}):\n${listTxt}`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       }
       callbacks.reset();
       return true;
    }

    // ADD
    if (lower.startsWith('bday add')) {
       const rawArgs = text.slice(8).trim(); 
       const entries = rawArgs.split(',');
       const userRef = doc(db, "users", user.uid);
       const docSnap = await getDoc(userRef);
       const currentData = docSnap.data() || {};
       let currentList = currentData.birthdays || [];
       let addedCount = 0;

       entries.forEach(entry => {
           const parts = entry.trim().split(/\s+/);
           if (parts.length >= 2) {
               const datePart = parts.pop(); 
               const namePart = parts.join(' '); 
               if (/^\d{1,2}-\d{1,2}$/.test(datePart || '')) {
                   const existsIdx = currentList.findIndex((b:any) => b.name.toLowerCase() === namePart.toLowerCase());
                   if (existsIdx > -1) currentList.splice(existsIdx, 1);
                   currentList.push({ name: namePart, date: datePart });
                   addedCount++;
               }
           }
       });

       if (addedCount > 0) {
           await setDoc(userRef, { birthdays: currentList }, { merge: true });
           localStorage.removeItem('vibenotes_bot_last_check'); 
           await addNote({ text: `🤖 Bot: Saved ${addedCount} birthday(s)! 💾\nDaily check has been reset.`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       } else {
           await addNote({ text: `🤖 Bot: Format error.\nTry: bday add Name MM-DD`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       }
       callbacks.reset();
       return true;
    }

    // REMOVE
    if (lower.startsWith('bday del') || lower.startsWith('bday remove')) {
       const nameToRemove = text.split(' ').slice(2).join(' ').trim().toLowerCase();
       const userRef = doc(db, "users", user.uid);
       const docSnap = await getDoc(userRef);
       let currentList = docSnap.data()?.birthdays || [];
       const initialLen = currentList.length;
       const newList = currentList.filter((b:any) => b.name.toLowerCase() !== nameToRemove);
       
       if (newList.length < initialLen) {
          await setDoc(userRef, { birthdays: newList }, { merge: true });
          await addNote({ text: `🤖 Bot: Deleted birthday for "${nameToRemove}" 🗑️`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       } else {
          await addNote({ text: `🤖 Bot: Could not find "${nameToRemove}".`, date: Date.now(), category: botCategory, isPinned: false, isExpanded: true });
       }
       callbacks.reset();
       return true;
    }
  }

  // NO BOT MATCH FOUND
  return false; 
};