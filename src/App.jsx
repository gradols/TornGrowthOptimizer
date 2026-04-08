import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API_BASE = "https://api.torn.com";
const NOTIFY_THRESHOLD = 0.8;

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0e17",
  card: "#111827",
  cardHover: "#1a2235",
  border: "#1e293b",
  accent: "#22d3ee",
  accentDim: "rgba(34,211,238,0.15)",
  gold: "#f59e0b",
  goldDim: "rgba(245,158,11,0.15)",
  green: "#10b981",
  greenDim: "rgba(16,185,129,0.15)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.15)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.15)",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMuted: "#475569",
};

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
};

const timeUntil = (seconds) => {
  if (!seconds || seconds <= 0) return "¡LISTO!";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const pct = (current, max) => (max > 0 ? Math.min((current / max) * 100, 100) : 0);

const playAlert = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const playTone = (freq, start, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  };
  playTone(880, 0, 0.15);
  playTone(1100, 0.18, 0.15);
  playTone(1320, 0.36, 0.25);
};

// ─── GYM DATABASE ───────────────────────────────────────────────────────────
const GYMS = [
  { name: "Premier Fitness",    energy: 5,  str: 2.0, spd: 2.0, def: 2.0, dex: 2.0, tier: "lightweight" },
  { name: "Average Joes",       energy: 5,  str: 2.4, spd: 2.4, def: 2.8, dex: 2.4, tier: "lightweight" },
  { name: "Woody's Workout",    energy: 5,  str: 2.8, spd: 3.2, def: 3.0, dex: 2.8, tier: "lightweight" },
  { name: "Beach Bods",         energy: 5,  str: 3.2, spd: 3.2, def: 3.2, dex: 0,   tier: "lightweight" },
  { name: "Silver Gym",         energy: 5,  str: 3.4, spd: 3.6, def: 3.4, dex: 3.2, tier: "lightweight" },
  { name: "Pour Femme",         energy: 5,  str: 3.4, spd: 3.6, def: 3.6, dex: 3.8, tier: "lightweight" },
  { name: "Davies Den",         energy: 5,  str: 3.7, spd: 0,   def: 3.7, dex: 3.7, tier: "lightweight" },
  { name: "Global Gym",         energy: 5,  str: 4.0, spd: 4.0, def: 4.0, dex: 4.0, tier: "lightweight" },
  { name: "Knuckle Heads",      energy: 10, str: 4.8, spd: 4.4, def: 4.0, dex: 4.2, tier: "middleweight" },
  { name: "Pioneer Fitness",    energy: 10, str: 4.4, spd: 4.6, def: 4.8, dex: 4.4, tier: "middleweight" },
  { name: "Anabolic Anomalies", energy: 10, str: 5.0, spd: 4.6, def: 5.2, dex: 4.6, tier: "middleweight" },
  { name: "Core",               energy: 10, str: 5.0, spd: 5.2, def: 5.0, dex: 5.0, tier: "middleweight" },
  { name: "Racing Fitness",     energy: 10, str: 5.0, spd: 5.4, def: 4.8, dex: 5.2, tier: "middleweight" },
  { name: "Complete Cardio",    energy: 10, str: 5.5, spd: 5.8, def: 5.5, dex: 5.2, tier: "middleweight" },
  { name: "Legs Bums and Tums", energy: 10, str: 0,   spd: 5.6, def: 5.6, dex: 5.8, tier: "middleweight" },
  { name: "Deep Burn",          energy: 10, str: 6.0, spd: 6.0, def: 6.0, dex: 6.0, tier: "middleweight" },
  { name: "Apollo Gym",         energy: 10, str: 6.0, spd: 6.2, def: 6.4, dex: 6.2, tier: "heavyweight" },
  { name: "Gun Shop",           energy: 10, str: 6.6, spd: 6.4, def: 6.2, dex: 6.2, tier: "heavyweight" },
  { name: "Force Training",     energy: 10, str: 6.4, spd: 6.6, def: 6.4, dex: 6.8, tier: "heavyweight" },
  { name: "Cha Cha's",          energy: 10, str: 6.4, spd: 6.4, def: 6.8, dex: 7.0, tier: "heavyweight" },
  { name: "Atlas",              energy: 10, str: 7.0, spd: 6.4, def: 6.4, dex: 6.6, tier: "heavyweight" },
  { name: "Last Round",         energy: 10, str: 6.8, spd: 6.6, def: 7.0, dex: 6.6, tier: "heavyweight" },
  { name: "The Edge",           energy: 10, str: 6.8, spd: 7.0, def: 7.0, dex: 6.8, tier: "heavyweight" },
  { name: "George's",           energy: 10, str: 7.3, spd: 7.3, def: 7.3, dex: 7.3, tier: "heavyweight" },
  { name: "Balboas Gym",        energy: 25, str: 0,   spd: 0,   def: 7.5, dex: 7.5, tier: "specialist", req: "Def+Dex ≥ 1.25×(Str+Spd)" },
  { name: "Frontline Fitness",  energy: 25, str: 7.5, spd: 7.5, def: 0,   dex: 0,   tier: "specialist", req: "Str+Spd ≥ 1.25×(Def+Dex)" },
  { name: "Gym 3000",           energy: 50, str: 8.0, spd: 0,   def: 0,   dex: 0,   tier: "specialist", req: "Str ≥ 1.25× segundo stat" },
  { name: "Mr. Isoyamas",       energy: 50, str: 0,   spd: 0,   def: 8.0, dex: 0,   tier: "specialist", req: "Def ≥ 1.25× segundo stat" },
  { name: "Total Rebound",      energy: 50, str: 0,   spd: 8.0, def: 0,   dex: 0,   tier: "specialist", req: "Spd ≥ 1.25× segundo stat" },
  { name: "Elites",             energy: 50, str: 0,   spd: 0,   def: 0,   dex: 8.0, tier: "specialist", req: "Dex ≥ 1.25× segundo stat" },
  { name: "Sports Science Lab", energy: 25, str: 9.0, spd: 9.0, def: 9.0, dex: 9.0, tier: "specialist", req: "≤150 Xanax+Ecstasy totales" },
];

const getSpecialistAccess = (stats) => {
  const { strength, speed, dexterity, defense } = stats;
  const offTotal = strength + speed;
  const defTotal = defense + dexterity;
  const sorted = [strength, speed, dexterity, defense].sort((a, b) => b - a);
  const secondHighest = sorted[1];

  return [
    { gym: GYMS[24], name: "Balboas Gym",       accessible: defTotal >= 1.25 * offTotal, progress: offTotal > 0 ? (defTotal / (1.25 * offTotal)) * 100 : 0, stats: "Def+Dex" },
    { gym: GYMS[25], name: "Frontline Fitness",  accessible: offTotal >= 1.25 * defTotal, progress: defTotal > 0 ? (offTotal / (1.25 * defTotal)) * 100 : 0, stats: "Str+Spd" },
    { gym: GYMS[26], name: "Gym 3000",           accessible: strength >= 1.25 * secondHighest, progress: secondHighest > 0 ? (strength / (1.25 * secondHighest)) * 100 : 0, stats: "Str" },
    { gym: GYMS[27], name: "Mr. Isoyamas",       accessible: defense >= 1.25 * secondHighest, progress: secondHighest > 0 ? (defense / (1.25 * secondHighest)) * 100 : 0, stats: "Def" },
    { gym: GYMS[28], name: "Total Rebound",      accessible: speed >= 1.25 * secondHighest, progress: secondHighest > 0 ? (speed / (1.25 * secondHighest)) * 100 : 0, stats: "Spd" },
    { gym: GYMS[29], name: "Elites",             accessible: dexterity >= 1.25 * secondHighest, progress: secondHighest > 0 ? (dexterity / (1.25 * secondHighest)) * 100 : 0, stats: "Dex" },
  ];
};

// ─── CRIME EFFICIENCY DATA ──────────────────────────────────────────────────
const CRIME_GUIDE = [
  { nerve: 2, name: "Search for Cash", phase: "Inicio", note: "Para nervios bajos" },
  { nerve: 4, name: "Shoplift", phase: "Inicio", note: "Buen ratio dinero/nerve" },
  { nerve: 5, name: "Pickpocket Someone", phase: "Early", note: "Sube skill rápido" },
  { nerve: 8, name: "Larceny", phase: "Early-Mid", note: "Buen balance XP + cash" },
  { nerve: 10, name: "Armed Robbery", phase: "Mid", note: "Requiere arma equipada" },
  { nerve: 15, name: "Transport Drugs", phase: "Mid", note: "Dinero decente" },
  { nerve: 18, name: "Plant a Computer Virus", phase: "Mid-Late", note: "Alta recompensa" },
  { nerve: 20, name: "Assassination", phase: "Late", note: "Máximo cash/nerve" },
  { nerve: 25, name: "Grand Theft Auto", phase: "Late", note: "Coches valiosos" },
];

// ─── HONORS DATABASE (trackable via personalstats) ─────────────────────────
// Each honor maps to a personalstats field with a target value
const HONORS_DB = [
  // ── ATTACKS ──
  { id: 1,   name: "First Blood",         category: "Ataques",   stat: "attackswon",        target: 1,       icon: "⚔️" },
  { id: 2,   name: "Punisher",            category: "Ataques",   stat: "attackswon",        target: 100,     icon: "⚔️" },
  { id: 3,   name: "Executioner",         category: "Ataques",   stat: "attackswon",        target: 500,     icon: "⚔️" },
  { id: 4,   name: "Reaper",              category: "Ataques",   stat: "attackswon",        target: 1000,    icon: "⚔️" },
  { id: 5,   name: "Genocide",            category: "Ataques",   stat: "attackswon",        target: 2500,    icon: "⚔️" },
  { id: 6,   name: "Carnage",             category: "Ataques",   stat: "attackswon",        target: 5000,    icon: "⚔️" },
  { id: 7,   name: "Annihilation",        category: "Ataques",   stat: "attackswon",        target: 10000,   icon: "⚔️" },
  { id: 8,   name: "Decimation",          category: "Ataques",   stat: "attackswon",        target: 25000,   icon: "⚔️" },
  { id: 9,   name: "Obliteration",        category: "Ataques",   stat: "attackswon",        target: 50000,   icon: "⚔️" },
  { id: 10,  name: "Annihilator",         category: "Ataques",   stat: "attackswon",        target: 100000,  icon: "⚔️" },

  // ── DEFENDS ──
  { id: 11,  name: "Shield",              category: "Defensas",  stat: "defendswon",        target: 1,       icon: "🛡️" },
  { id: 12,  name: "Fortress",            category: "Defensas",  stat: "defendswon",        target: 100,     icon: "🛡️" },
  { id: 13,  name: "Bastion",             category: "Defensas",  stat: "defendswon",        target: 250,     icon: "🛡️" },
  { id: 14,  name: "Citadel",             category: "Defensas",  stat: "defendswon",        target: 500,     icon: "🛡️" },
  { id: 15,  name: "Bulwark",             category: "Defensas",  stat: "defendswon",        target: 1000,    icon: "🛡️" },
  { id: 16,  name: "Rampart",             category: "Defensas",  stat: "defendswon",        target: 2500,    icon: "🛡️" },
  { id: 17,  name: "Stronghold",          category: "Defensas",  stat: "defendswon",        target: 5000,    icon: "🛡️" },
  { id: 18,  name: "Impregnable",         category: "Defensas",  stat: "defendswon",        target: 10000,   icon: "🛡️" },

  // ── CRIMES ──
  { id: 100, name: "Petty Thief",         category: "Crímenes",  stat: "criminaloffenses",  target: 100,     icon: "🔫" },
  { id: 101, name: "Criminal",            category: "Crímenes",  stat: "criminaloffenses",  target: 500,     icon: "🔫" },
  { id: 102, name: "Felon",               category: "Crímenes",  stat: "criminaloffenses",  target: 1000,    icon: "🔫" },
  { id: 103, name: "Hardened Criminal",   category: "Crímenes",  stat: "criminaloffenses",  target: 2500,    icon: "🔫" },
  { id: 104, name: "Crime Lord",          category: "Crímenes",  stat: "criminaloffenses",  target: 5000,    icon: "🔫" },
  { id: 105, name: "Kingpin",             category: "Crímenes",  stat: "criminaloffenses",  target: 10000,   icon: "🔫" },
  { id: 106, name: "Mastermind",          category: "Crímenes",  stat: "criminaloffenses",  target: 25000,   icon: "🔫" },

  // ── BUSTS ──
  { id: 200, name: "Bust Beginner",       category: "Busts",     stat: "peoplebusted",      target: 50,      icon: "🔓" },
  { id: 201, name: "Bust Pro",            category: "Busts",     stat: "peoplebusted",      target: 250,     icon: "🔓" },
  { id: 202, name: "Bust Master",         category: "Busts",     stat: "peoplebusted",      target: 500,     icon: "🔓" },
  { id: 203, name: "Bust Legend",          category: "Busts",     stat: "peoplebusted",      target: 1000,    icon: "🔓" },
  { id: 204, name: "Bust God",            category: "Busts",     stat: "peoplebusted",      target: 2500,    icon: "🔓" },

  // ── TRAVEL ──
  { id: 300, name: "Traveler",            category: "Viajes",    stat: "traveltimes",       target: 25,      icon: "✈️" },
  { id: 301, name: "Globetrotter",        category: "Viajes",    stat: "traveltimes",       target: 100,     icon: "✈️" },
  { id: 302, name: "Jet Setter",          category: "Viajes",    stat: "traveltimes",       target: 250,     icon: "✈️" },
  { id: 303, name: "World Traveler",      category: "Viajes",    stat: "traveltimes",       target: 500,     icon: "✈️" },
  { id: 304, name: "Frequent Flyer",      category: "Viajes",    stat: "traveltimes",       target: 1000,    icon: "✈️" },

  // ── DRUGS ──
  { id: 400, name: "Xanax Addict",        category: "Drogas",    stat: "xantaken",          target: 100,     icon: "💊" },
  { id: 401, name: "Xanax Junkie",        category: "Drogas",    stat: "xantaken",          target: 250,     icon: "💊" },
  { id: 402, name: "Xanax Fiend",         category: "Drogas",    stat: "xantaken",          target: 500,     icon: "💊" },
  { id: 403, name: "Xanax Overdose",      category: "Drogas",    stat: "xantaken",          target: 1000,    icon: "💊" },
  { id: 410, name: "Ecstasy Lover",       category: "Drogas",    stat: "exttaken",          target: 50,      icon: "🌈" },
  { id: 411, name: "Ecstasy Maniac",      category: "Drogas",    stat: "exttaken",          target: 250,     icon: "🌈" },
  { id: 412, name: "Ecstasy Fiend",       category: "Drogas",    stat: "exttaken",          target: 500,     icon: "🌈" },
  { id: 420, name: "LSD Tripper",         category: "Drogas",    stat: "lsdtaken",          target: 50,      icon: "🍄" },
  { id: 421, name: "LSD Maniac",          category: "Drogas",    stat: "lsdtaken",          target: 250,     icon: "🍄" },
  { id: 422, name: "LSD Fiend",           category: "Drogas",    stat: "lsdtaken",          target: 500,     icon: "🍄" },

  // ── BOUNTIES ──
  { id: 500, name: "Bounty Hunter",       category: "Bounties",  stat: "bountiescollected", target: 25,      icon: "🎲" },
  { id: 501, name: "Bounty Pro",          category: "Bounties",  stat: "bountiescollected", target: 100,     icon: "🎲" },
  { id: 502, name: "Bounty Master",       category: "Bounties",  stat: "bountiescollected", target: 250,     icon: "🎲" },
  { id: 503, name: "Bounty Legend",        category: "Bounties",  stat: "bountiescollected", target: 500,     icon: "🎲" },

  // ── LOOTING ──
  { id: 700, name: "Looter",              category: "Saqueo",    stat: "itemslooted",       target: 50,      icon: "📦" },
  { id: 701, name: "Plunderer",           category: "Saqueo",    stat: "itemslooted",       target: 250,     icon: "📦" },
  { id: 702, name: "Pillager",            category: "Saqueo",    stat: "itemslooted",       target: 500,     icon: "📦" },
  { id: 703, name: "Raider",              category: "Saqueo",    stat: "itemslooted",       target: 1000,    icon: "📦" },

  // ── REVIVES ──
  { id: 800, name: "Medic",               category: "Revives",   stat: "revives",           target: 50,      icon: "💉" },
  { id: 801, name: "Field Medic",         category: "Revives",   stat: "revives",           target: 250,     icon: "💉" },
  { id: 802, name: "Surgeon",             category: "Revives",   stat: "revives",           target: 500,     icon: "💉" },
  { id: 803, name: "Angel of Death",      category: "Revives",   stat: "revives",           target: 1000,    icon: "💉" },

  // ── TRAINING ──
  { id: 900, name: "Gym Rat",             category: "Gimnasio",  stat: "trainsreceived",    target: 500,     icon: "🏋️" },
  { id: 901, name: "Body Builder",        category: "Gimnasio",  stat: "trainsreceived",    target: 1000,    icon: "🏋️" },
  { id: 902, name: "Iron Pumper",         category: "Gimnasio",  stat: "trainsreceived",    target: 2500,    icon: "🏋️" },
  { id: 903, name: "Fitness Freak",       category: "Gimnasio",  stat: "trainsreceived",    target: 5000,    icon: "🏋️" },
  { id: 904, name: "Gym Legend",           category: "Gimnasio",  stat: "trainsreceived",    target: 10000,   icon: "🏋️" },

  // ── MONEY (mugging) ──
  { id: 1000, name: "Mugger",             category: "Mugging",   stat: "attacksstealthed",  target: 50,      icon: "💰" },
  { id: 1001, name: "Street Thug",        category: "Mugging",   stat: "attacksstealthed",  target: 250,     icon: "💰" },
  { id: 1002, name: "Stick Up Artist",    category: "Mugging",   stat: "attacksstealthed",  target: 500,     icon: "💰" },

  // ── NETWORTH ──
  { id: 1100, name: "Rich",               category: "Dinero",    stat: "_networth",         target: 5e6,     icon: "💵" },
  { id: 1101, name: "Wealthy",            category: "Dinero",    stat: "_networth",         target: 50e6,    icon: "💵" },
  { id: 1102, name: "Millionaire",        category: "Dinero",    stat: "_networth",         target: 100e6,   icon: "💵" },
  { id: 1103, name: "Multi-Millionaire",  category: "Dinero",    stat: "_networth",         target: 500e6,   icon: "💵" },
  { id: 1104, name: "Billionaire",        category: "Dinero",    stat: "_networth",         target: 1e9,     icon: "💵" },

  // ── LEVEL ──
  { id: 1200, name: "Level 10",           category: "Nivel",     stat: "_level",            target: 10,      icon: "📊" },
  { id: 1201, name: "Level 25",           category: "Nivel",     stat: "_level",            target: 25,      icon: "📊" },
  { id: 1202, name: "Level 50",           category: "Nivel",     stat: "_level",            target: 50,      icon: "📊" },
  { id: 1203, name: "Level 75",           category: "Nivel",     stat: "_level",            target: 75,      icon: "📊" },
  { id: 1204, name: "Level 100",          category: "Nivel",     stat: "_level",            target: 100,     icon: "📊" },

  // ── REFILLS ──
  { id: 1300, name: "Refill Addict",      category: "Refills",   stat: "refills",           target: 100,     icon: "⚡" },
  { id: 1301, name: "Refill Junkie",      category: "Refills",   stat: "refills",           target: 250,     icon: "⚡" },

  // ── ENERGY DRINKS ──
  { id: 1400, name: "Energy Drinker",     category: "Bebidas",   stat: "energydrinkused",   target: 50,      icon: "🥤" },
  { id: 1401, name: "Caffeine Addict",    category: "Bebidas",   stat: "energydrinkused",   target: 250,     icon: "🥤" },
  { id: 1402, name: "Wired",              category: "Bebidas",   stat: "energydrinkused",   target: 500,     icon: "🥤" },

  // ── KILL STREAKS ──
  { id: 1500, name: "On a Roll",          category: "Rachas",    stat: "bestkillstreak",    target: 5,       icon: "🔥" },
  { id: 1501, name: "Unstoppable",        category: "Rachas",    stat: "bestkillstreak",    target: 10,      icon: "🔥" },
  { id: 1502, name: "Rampage",            category: "Rachas",    stat: "bestkillstreak",    target: 25,      icon: "🔥" },
  { id: 1503, name: "Berserker",          category: "Rachas",    stat: "bestkillstreak",    target: 50,      icon: "🔥" },
  { id: 1504, name: "Relentless",         category: "Rachas",    stat: "bestkillstreak",    target: 100,     icon: "🔥" },
  { id: 1505, name: "Onslaught",          category: "Rachas",    stat: "bestkillstreak",    target: 250,     icon: "🔥" },
  { id: 1506, name: "Wrath",              category: "Rachas",    stat: "bestkillstreak",    target: 500,     icon: "🔥" },

  // ── ORGANIZED CRIMES ──
  { id: 1600, name: "OC Beginner",        category: "OC",        stat: "organisedcrimes",   target: 25,      icon: "🤝" },
  { id: 1601, name: "OC Veteran",         category: "OC",        stat: "organisedcrimes",   target: 100,     icon: "🤝" },
  { id: 1602, name: "OC Expert",          category: "OC",        stat: "organisedcrimes",   target: 250,     icon: "🤝" },
  { id: 1603, name: "OC Master",          category: "OC",        stat: "organisedcrimes",   target: 500,     icon: "🤝" },

  // ── DAYS OLD (age honors) ──
  { id: 1700, name: "100 Days",           category: "Edad",      stat: "_age",              target: 100,     icon: "📅" },
  { id: 1701, name: "1 Year",             category: "Edad",      stat: "_age",              target: 365,     icon: "📅" },
  { id: 1702, name: "2 Years",            category: "Edad",      stat: "_age",              target: 730,     icon: "📅" },
  { id: 1703, name: "3 Years",            category: "Edad",      stat: "_age",              target: 1095,    icon: "📅" },
  { id: 1704, name: "5 Years",            category: "Edad",      stat: "_age",              target: 1825,    icon: "📅" },
  { id: 1705, name: "10 Years",           category: "Edad",      stat: "_age",              target: 3650,    icon: "📅" },

  // ── HOSPITAL VISITS (hospitalize others) ──
  { id: 1800, name: "Hospitalizer",       category: "Hospital",  stat: "hospitalized",      target: 100,     icon: "🏥" },
  { id: 1801, name: "Nightmare",          category: "Hospital",  stat: "hospitalized",      target: 500,     icon: "🏥" },
  { id: 1802, name: "Terror",             category: "Hospital",  stat: "hospitalized",      target: 1000,    icon: "🏥" },
  { id: 1803, name: "Dread",              category: "Hospital",  stat: "hospitalized",      target: 2500,    icon: "🏥" },
  { id: 1804, name: "Horror",             category: "Hospital",  stat: "hospitalized",      target: 5000,    icon: "🏥" },
];

// ─── MEDALS DATABASE (trackable via personalstats) ──────────────────────────
// Medals also award merit points. type: "medal" to distinguish from honors
const MEDALS_DB = [
  // ── ATTACK MEDALS ──
  { id: "m_atk1",  name: "Beginner Attacker",     category: "Ataques",   stat: "attackswon",        target: 50,      icon: "🥉", merits: 1 },
  { id: "m_atk2",  name: "Intermediate Attacker",  category: "Ataques",   stat: "attackswon",        target: 250,     icon: "🥈", merits: 2 },
  { id: "m_atk3",  name: "Advanced Attacker",      category: "Ataques",   stat: "attackswon",        target: 1000,    icon: "🥇", merits: 5 },
  { id: "m_atk4",  name: "Expert Attacker",        category: "Ataques",   stat: "attackswon",        target: 2000,    icon: "🏅", merits: 5 },
  { id: "m_atk5",  name: "Master Attacker",        category: "Ataques",   stat: "attackswon",        target: 4000,    icon: "🏅", merits: 10 },
  { id: "m_atk6",  name: "Elite Attacker",         category: "Ataques",   stat: "attackswon",        target: 8000,    icon: "🏅", merits: 10 },

  // ── DEFEND MEDALS ──
  { id: "m_def1",  name: "Beginner Defender",      category: "Defensas",  stat: "defendswon",        target: 25,      icon: "🥉", merits: 1 },
  { id: "m_def2",  name: "Intermediate Defender",  category: "Defensas",  stat: "defendswon",        target: 100,     icon: "🥈", merits: 2 },
  { id: "m_def3",  name: "Advanced Defender",      category: "Defensas",  stat: "defendswon",        target: 500,     icon: "🥇", merits: 5 },
  { id: "m_def4",  name: "Expert Defender",        category: "Defensas",  stat: "defendswon",        target: 1000,    icon: "🏅", merits: 5 },
  { id: "m_def5",  name: "Master Defender",        category: "Defensas",  stat: "defendswon",        target: 2500,    icon: "🏅", merits: 10 },

  // ── CRIME MEDALS ──
  { id: "m_crm1",  name: "Beginner Criminal",      category: "Crímenes",  stat: "criminaloffenses",  target: 100,     icon: "🥉", merits: 1 },
  { id: "m_crm2",  name: "Intermediate Criminal",  category: "Crímenes",  stat: "criminaloffenses",  target: 500,     icon: "🥈", merits: 2 },
  { id: "m_crm3",  name: "Advanced Criminal",      category: "Crímenes",  stat: "criminaloffenses",  target: 1000,    icon: "🥇", merits: 5 },
  { id: "m_crm4",  name: "Expert Criminal",        category: "Crímenes",  stat: "criminaloffenses",  target: 5000,    icon: "🏅", merits: 5 },
  { id: "m_crm5",  name: "Master Criminal",        category: "Crímenes",  stat: "criminaloffenses",  target: 10000,   icon: "🏅", merits: 10 },

  // ── BUST MEDALS ──
  { id: "m_bst1",  name: "Beginner Buster",        category: "Busts",     stat: "peoplebusted",      target: 25,      icon: "🥉", merits: 1 },
  { id: "m_bst2",  name: "Intermediate Buster",    category: "Busts",     stat: "peoplebusted",      target: 100,     icon: "🥈", merits: 2 },
  { id: "m_bst3",  name: "Advanced Buster",        category: "Busts",     stat: "peoplebusted",      target: 500,     icon: "🥇", merits: 5 },
  { id: "m_bst4",  name: "Expert Buster",          category: "Busts",     stat: "peoplebusted",      target: 1000,    icon: "🏅", merits: 5 },

  // ── TRAVEL MEDALS ──
  { id: "m_trv1",  name: "Beginner Traveler",      category: "Viajes",    stat: "traveltimes",       target: 25,      icon: "🥉", merits: 1 },
  { id: "m_trv2",  name: "Intermediate Traveler",  category: "Viajes",    stat: "traveltimes",       target: 50,      icon: "🥈", merits: 2 },
  { id: "m_trv3",  name: "Advanced Traveler",      category: "Viajes",    stat: "traveltimes",       target: 100,     icon: "🥇", merits: 5 },
  { id: "m_trv4",  name: "Expert Traveler",        category: "Viajes",    stat: "traveltimes",       target: 250,     icon: "🏅", merits: 5 },
  { id: "m_trv5",  name: "Master Traveler",        category: "Viajes",    stat: "traveltimes",       target: 500,     icon: "🏅", merits: 10 },

  // ── DRUG MEDALS ──
  { id: "m_drg1",  name: "Beginner Drug User",     category: "Drogas",    stat: "drugsused",         target: 50,      icon: "🥉", merits: 1 },
  { id: "m_drg2",  name: "Intermediate Drug User",  category: "Drogas",    stat: "drugsused",         target: 250,     icon: "🥈", merits: 2 },
  { id: "m_drg3",  name: "Advanced Drug User",     category: "Drogas",    stat: "drugsused",         target: 500,     icon: "🥇", merits: 5 },
  { id: "m_drg4",  name: "Expert Drug User",       category: "Drogas",    stat: "drugsused",         target: 1000,    icon: "🏅", merits: 5 },

  // ── BOUNTY MEDALS ──
  { id: "m_bnt1",  name: "Beginner Bounty Hunter", category: "Bounties",  stat: "bountiescollected", target: 10,      icon: "🥉", merits: 1 },
  { id: "m_bnt2",  name: "Intermediate Bounty",    category: "Bounties",  stat: "bountiescollected", target: 50,      icon: "🥈", merits: 2 },
  { id: "m_bnt3",  name: "Advanced Bounty",        category: "Bounties",  stat: "bountiescollected", target: 100,     icon: "🥇", merits: 5 },
  { id: "m_bnt4",  name: "Expert Bounty",          category: "Bounties",  stat: "bountiescollected", target: 250,     icon: "🏅", merits: 5 },

  // ── REVIVE MEDALS ──
  { id: "m_rev1",  name: "Beginner Reviver",       category: "Revives",   stat: "revives",           target: 25,      icon: "🥉", merits: 1 },
  { id: "m_rev2",  name: "Intermediate Reviver",   category: "Revives",   stat: "revives",           target: 100,     icon: "🥈", merits: 2 },
  { id: "m_rev3",  name: "Advanced Reviver",       category: "Revives",   stat: "revives",           target: 250,     icon: "🥇", merits: 5 },
  { id: "m_rev4",  name: "Expert Reviver",         category: "Revives",   stat: "revives",           target: 500,     icon: "🏅", merits: 5 },

  // ── GYM MEDALS ──
  { id: "m_gym1",  name: "Beginner Trainer",       category: "Gimnasio",  stat: "trainsreceived",    target: 100,     icon: "🥉", merits: 1 },
  { id: "m_gym2",  name: "Intermediate Trainer",   category: "Gimnasio",  stat: "trainsreceived",    target: 500,     icon: "🥈", merits: 2 },
  { id: "m_gym3",  name: "Advanced Trainer",       category: "Gimnasio",  stat: "trainsreceived",    target: 1000,    icon: "🥇", merits: 5 },
  { id: "m_gym4",  name: "Expert Trainer",         category: "Gimnasio",  stat: "trainsreceived",    target: 2500,    icon: "🏅", merits: 5 },
  { id: "m_gym5",  name: "Master Trainer",         category: "Gimnasio",  stat: "trainsreceived",    target: 5000,    icon: "🏅", merits: 10 },

  // ── HOSPITAL MEDALS ──
  { id: "m_hos1",  name: "Beginner Hospitalizer",  category: "Hospital",  stat: "hospitalized",      target: 25,      icon: "🥉", merits: 1 },
  { id: "m_hos2",  name: "Intermediate Hospitalizer", category: "Hospital", stat: "hospitalized",    target: 100,     icon: "🥈", merits: 2 },
  { id: "m_hos3",  name: "Advanced Hospitalizer",  category: "Hospital",  stat: "hospitalized",      target: 500,     icon: "🥇", merits: 5 },
  { id: "m_hos4",  name: "Expert Hospitalizer",    category: "Hospital",  stat: "hospitalized",      target: 1000,    icon: "🏅", merits: 5 },

  // ── ITEM USE MEDALS ──
  { id: "m_itm1",  name: "Beginner Consumer",      category: "Items",     stat: "useractivity",      target: 100,     icon: "🥉", merits: 1 },
  { id: "m_itm2",  name: "Shopaholic",             category: "Items",     stat: "itemsbought",       target: 100,     icon: "🥈", merits: 2 },
  { id: "m_itm3",  name: "Big Spender",            category: "Items",     stat: "itemsbought",       target: 500,     icon: "🥇", merits: 5 },
  { id: "m_itm4",  name: "Market Mogul",           category: "Items",     stat: "itemsbought",       target: 1000,    icon: "🏅", merits: 5 },

  // ── NETWORTH MEDALS ──
  { id: "m_nw1",   name: "Comfortable",            category: "Dinero",    stat: "_networth",         target: 1e6,     icon: "🥉", merits: 1 },
  { id: "m_nw2",   name: "Well Off",               category: "Dinero",    stat: "_networth",         target: 10e6,    icon: "🥈", merits: 2 },
  { id: "m_nw3",   name: "Affluent",               category: "Dinero",    stat: "_networth",         target: 100e6,   icon: "🥇", merits: 5 },
  { id: "m_nw4",   name: "Opulent",                category: "Dinero",    stat: "_networth",         target: 500e6,   icon: "🏅", merits: 5 },
  { id: "m_nw5",   name: "Tycoon",                 category: "Dinero",    stat: "_networth",         target: 1e9,     icon: "🏅", merits: 10 },

  // ── AGE/DAYS OLD MEDALS ──
  { id: "m_age1",  name: "One Month Old",          category: "Edad",      stat: "age",               target: 30,      icon: "🥉", merits: 1 },
  { id: "m_age2",  name: "Six Months Old",         category: "Edad",      stat: "age",               target: 180,     icon: "🥈", merits: 2 },
  { id: "m_age3",  name: "One Year Old",           category: "Edad",      stat: "age",               target: 365,     icon: "🥇", merits: 5 },
  { id: "m_age4",  name: "Two Years Old",          category: "Edad",      stat: "age",               target: 730,     icon: "🏅", merits: 5 },
  { id: "m_age5",  name: "Five Years Old",         category: "Edad",      stat: "age",               target: 1825,    icon: "🏅", merits: 10 },
];

// ─── STAT DESCRIPTIONS (what to do for each stat) ───────────────────────────
const STAT_TIPS = {
  attackswon:        { action: "Ganar ataques contra otros jugadores", where: "Ataca jugadores desde la página de ataques o busca targets fáciles", link: "https://www.torn.com/loader.php?sid=attack&user2ID=", linkLabel: "Ir a Atacar" },
  defendswon:        { action: "Ganar defensas cuando te atacan", where: "No puedes forzar esto directamente. Mejora tus stats de defensa en el gimnasio y equípate con buen armor", link: "https://www.torn.com/gym.php", linkLabel: "Ir al Gimnasio" },
  criminaloffenses:  { action: "Completar crímenes exitosamente", where: "Ve a la página de crímenes y hazlos. Crímenes más difíciles dan más XP pero también cuentan como 1", link: "https://www.torn.com/crimes.php", linkLabel: "Ir a Crímenes" },
  peoplebusted:      { action: "Sacar a jugadores de la cárcel (bust)", where: "Ve a la cárcel y busca jugadores para sacarlos. Necesitas nerve", link: "https://www.torn.com/jailview.php", linkLabel: "Ir a la Cárcel" },
  traveltimes:       { action: "Viajar al extranjero", where: "Viaja a cualquier país. Cada viaje cuenta como 1. Puedes comprar items baratos y venderlos", link: "https://www.torn.com/travelagency.php", linkLabel: "Ir a Viajar" },
  xantaken:          { action: "Tomar Xanax", where: "Compra Xanax en el mercado y úsalos. Dan energy extra", link: "https://www.torn.com/imarket.php#/p=shop&type=&searchname=xanax", linkLabel: "Comprar Xanax" },
  exttaken:          { action: "Tomar Ecstasy", where: "Compra Ecstasy en el mercado y úsalos. Dan happy", link: "https://www.torn.com/imarket.php#/p=shop&type=&searchname=ecstasy", linkLabel: "Comprar Ecstasy" },
  lsdtaken:          { action: "Tomar LSD", where: "Compra LSD en el mercado y úsalos", link: "https://www.torn.com/imarket.php#/p=shop&type=&searchname=lsd", linkLabel: "Comprar LSD" },
  drugsused:         { action: "Usar cualquier droga (Xanax, Ecstasy, LSD, etc.)", where: "Compra drogas en el mercado y úsalas. Todas las drogas cuentan para este total", link: "https://www.torn.com/imarket.php", linkLabel: "Ir al Mercado" },
  bountiescollected: { action: "Cobrar bounties de otros jugadores", where: "Busca jugadores con bounty y atácalos para cobrar la recompensa", link: "https://www.torn.com/bounties.php", linkLabel: "Ver Bounties" },
  itemslooted:       { action: "Saquear items de otros jugadores al atacarlos", where: "Cuando ganas un ataque puedes saquear items del inventario del perdedor", link: "https://www.torn.com/loader.php?sid=attack&user2ID=", linkLabel: "Ir a Atacar" },
  revives:           { action: "Revivir a otros jugadores", where: "Necesitas un Revive item o la habilidad médica. Busca jugadores hospitalizados y revívelos", link: "https://www.torn.com/hospitalview.php", linkLabel: "Ir al Hospital" },
  trainsreceived:    { action: "Entrenar en el gimnasio", where: "Usa tu energy para entrenar stats en el gimnasio. Cada sesión de entrenamiento cuenta", link: "https://www.torn.com/gym.php", linkLabel: "Ir al Gimnasio" },
  attacksstealthed:  { action: "Atacar en modo stealth (mugging)", where: "Selecciona 'mug' como tipo de ataque cuando atacas a otro jugador", link: "https://www.torn.com/loader.php?sid=attack&user2ID=", linkLabel: "Ir a Atacar" },
  _networth:         { action: "Aumentar tu networth total", where: "Acumula dinero, propiedades, acciones, items valiosos. Todo suma a tu networth", link: "https://www.torn.com/properties.php", linkLabel: "Ver Propiedades" },
  _level:            { action: "Subir de nivel", where: "Gana experiencia atacando jugadores. Ataca a jugadores de nivel similar o más alto para más XP", link: "https://www.torn.com/loader.php?sid=attack&user2ID=", linkLabel: "Ir a Atacar" },
  refills:           { action: "Usar energy refills", where: "Compra refills con puntos o espera el refill diario gratuito si eres donador", link: "https://www.torn.com/points.php", linkLabel: "Ver Puntos" },
  energydrinkused:   { action: "Usar energy drinks (FHCs, Cans)", where: "Compra energy drinks en el mercado. Los FHC (Feathery Hotel Coupon) son los más comunes", link: "https://www.torn.com/imarket.php#/p=shop&type=&searchname=can", linkLabel: "Comprar Energy Drinks" },
  bestkillstreak:    { action: "Conseguir una racha de victorias sin perder", where: "Ataca y gana consecutivamente sin ser hospitalizado. Elige targets más débiles para mantener la racha", link: "https://www.torn.com/loader.php?sid=attack&user2ID=", linkLabel: "Ir a Atacar" },
  organisedcrimes:   { action: "Participar en crímenes organizados (OC)", where: "Únete a una facción y participa en los OCs que organicen. Necesitas estar en una facción activa", link: "https://www.torn.com/factions.php", linkLabel: "Ver Facción" },
  age:               { action: "Simplemente esperar — se basa en la edad de tu cuenta", where: "No hay nada que hacer, solo esperar. Cada día que pasa cuenta", link: null, linkLabel: null },
  _age:              { action: "Simplemente esperar — se basa en la edad de tu cuenta", where: "No hay nada que hacer, solo esperar. Cada día que pasa cuenta", link: null, linkLabel: null },
  hospitalized:      { action: "Hospitalizar a otros jugadores al atacarlos", where: "Gana ataques contra otros jugadores. La mayoría de victorias resultan en hospitalización", link: "https://www.torn.com/loader.php?sid=attack&user2ID=", linkLabel: "Ir a Atacar" },
  useractivity:      { action: "Estar activo en Torn (usar items, hacer acciones)", where: "Simplemente juega activamente — usa items, entrena, ataca, etc.", link: "https://www.torn.com/", linkLabel: "Ir a Torn" },
  itemsbought:       { action: "Comprar items en el mercado", where: "Compra cualquier item en el mercado. Cada compra cuenta", link: "https://www.torn.com/imarket.php", linkLabel: "Ir al Mercado" },
};

// Calculate combined honor + medal progress from personalstats + extra data
const calcAllProgress = (ps, networth, level, age) => {
  const getStat = (stat) => {
    if (stat === "_networth") return networth || 0;
    if (stat === "_level") return level || 0;
    if (stat === "age" || stat === "_age") return age || 0;
    if (stat === "drugsused") {
      return (ps?.xantaken ?? 0) + (ps?.exttaken ?? 0) + (ps?.lsdtaken ?? 0) +
             (ps?.kettaken ?? 0) + (ps?.opitaken ?? 0) + (ps?.shrtaken ?? 0) +
             (ps?.spetaken ?? 0) + (ps?.pcptaken ?? 0) + (ps?.vicodintaken ?? 0);
    }
    return ps?.[stat] ?? 0;
  };

  const mapItem = (h, type) => {
    const current = getStat(h.stat);
    const progress = Math.min((current / h.target) * 100, 100);
    const remaining = Math.max(h.target - current, 0);
    const completed = progress >= 100;
    return { ...h, type, current, progress, remaining, completed };
  };

  const honors = HONORS_DB.map(h => mapItem(h, "honor"));
  const medals = MEDALS_DB.map(m => mapItem(m, "medal"));

  return [...honors, ...medals].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.progress - a.progress;
  });
};

// ─── QUICK LINKS ────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { icon: "🏋️", label: "Gimnasio", url: "https://www.torn.com/gym.php" },
  { icon: "🔫", label: "Crímenes", url: "https://www.torn.com/crimes.php" },
  { icon: "✈️", label: "Viajar", url: "https://www.torn.com/travelagency.php" },
  { icon: "🏪", label: "Bazaar", url: "https://www.torn.com/bazaar.php" },
  { icon: "💊", label: "Items", url: "https://www.torn.com/item.php" },
  { icon: "🏠", label: "Propiedades", url: "https://www.torn.com/properties.php" },
  { icon: "📚", label: "Educación", url: "https://www.torn.com/education.php" },
  { icon: "💼", label: "Trabajo", url: "https://www.torn.com/jobs.php" },
  { icon: "⚔️", label: "Facción", url: "https://www.torn.com/factions.php" },
  { icon: "🎰", label: "Casino", url: "https://www.torn.com/casino.php" },
  { icon: "📈", label: "Stocks", url: "https://www.torn.com/stockexchange.php" },
  { icon: "🏥", label: "Hospital", url: "https://www.torn.com/hospital.php" },
  { icon: "📋", label: "Misiones", url: "https://www.torn.com/missions.php" },
  { icon: "🏆", label: "Hall of Fame", url: "https://www.torn.com/halloffame.php" },
  { icon: "📰", label: "Periódico", url: "https://www.torn.com/newspaper.php" },
];

// ─── MARKET CATEGORIES ──────────────────────────────────────────────────────
const MARKET_CATEGORIES = [
  { label: "Plushies", type: "Plushie" },
  { label: "Flores", type: "Flower" },
  { label: "Drogas", type: "Drug" },
  { label: "Boosters", type: "Booster" },
  { label: "Temporales", type: "Temporary" },
  { label: "Melee", type: "Melee" },
  { label: "Primarias", type: "Primary" },
  { label: "Secundarias", type: "Secondary" },
  { label: "Armadura", type: "Armor" },
  { label: "Ropa", type: "Clothing" },
  { label: "Joyería", type: "Jewelry" },
];

// ─── GYM TRAINING STRATEGY ─────────────────────────────────────────────────
const getGymStrategy = (stats, activeGymId, happy) => {
  if (!stats) return { focus: "strength", reason: "Cargando datos...", tips: [], specialistInfo: [] };
  const { strength, speed, dexterity, defense } = stats;
  const total = strength + speed + dexterity + defense;
  const gym = activeGymId ? GYMS[activeGymId - 1] : null;
  const gymName = gym?.name || "Desconocido";
  const isGeorges = activeGymId === 24;
  const isSpecialist = activeGymId >= 25;
  const isPreGeorges = activeGymId && activeGymId < 24;

  const specialists = getSpecialistAccess(stats);
  const accessibleSpecialists = specialists.filter((s) => s.accessible);

  const tips = [];
  let focus = "balanced";
  let reason = "";
  let ratioType = "balanced";

  const offTotal = strength + speed;
  const defDexTotal = defense + dexterity;
  const sorted = [
    { name: "strength", val: strength },
    { name: "speed", val: speed },
    { name: "dexterity", val: dexterity },
    { name: "defense", val: defense },
  ].sort((a, b) => b.val - a.val);

  // Happy jumping advice
  const happyCurrent = happy?.current ?? 0;
  const happyMax = happy?.max ?? 250;
  if (total < 1600000) {
    if (happyCurrent > happyMax * 1.5) {
      tips.push({ icon: "🚀", text: "¡Happy alto! Entrena AHORA para máximos gains", color: "#10b981" });
    } else {
      tips.push({ icon: "😊", text: "Sube Happy antes de entrenar (Ecstasy/candy) para multiplicar gains", color: "#f59e0b" });
    }
  }

  if (isPreGeorges) {
    ratioType = "balanced";

    if (gym) {
      const statEntries = [
        { name: "strength", d: gym.str, val: strength },
        { name: "speed", d: gym.spd, val: speed },
        { name: "defense", d: gym.def, val: defense },
        { name: "dexterity", d: gym.dex, val: dexterity },
      ].filter((s) => s.d > 0);

      const maxVal = Math.max(...statEntries.map((s) => s.val));
      const minVal = Math.min(...statEntries.map((s) => s.val));

      // Sort by dots (primary) — the gym determines what's most efficient
      const byDots = [...statEntries].sort((a, b) => b.d - a.d);
      const best = byDots[0];

      // Check if the best-dots stat is already way ahead of the others
      const isAhead = best.val > minVal * 1.3 && best.val === maxVal;

      if (isAhead) {
        const alternative = byDots.find((s) => s.val < maxVal * 0.95);
        if (alternative) {
          focus = alternative.name;
          reason = `${gymName}: entrena ${alternative.name} (${alternative.d} dots). ${best.name} tiene más dots (${best.d}) pero ya domina (${fmt(best.val)} vs ${fmt(alternative.val)}).`;
        } else {
          focus = best.name;
          reason = `${gymName}: entrena ${best.name} (${best.d} dots, máxima eficiencia).`;
        }
      } else {
        focus = best.name;
        reason = `${gymName}: entrena ${best.name} — tiene los dots más altos (${best.d}) = más gains por energía.`;
      }

      const dotsRanking = byDots
        .map((s) => `${s.name.slice(0, 3).toUpperCase()} ${s.d}`)
        .join(" > ");
      tips.push({ icon: "📊", text: `Dots en ${gymName}: ${dotsRanking}`, color: "#22d3ee" });

      if (byDots.length > 1 && byDots[0].val < maxVal * 0.95 === false && byDots[1].val < maxVal * 0.7) {
        tips.push({
          icon: "⚖️",
          text: `${byDots[1].name} rezagado. Alterna para no desequilibrar demasiado.`,
          color: "#f59e0b",
        });
      }
    } else {
      focus = "balanced";
      reason = `Rota entre todos los stats para equilibrar.`;
    }

    tips.push({ icon: "🎯", text: "Objetivo: llegar a George's Gym (7.3 dots en todo). Mantén balance general.", color: "#a78bfa" });

  } else if (isGeorges && accessibleSpecialists.length === 0) {
    if (offTotal > defDexTotal) {
      focus = "strength";
      reason = `En George's. Tu Str+Spd ya lidera. Sube para desbloquear Frontline Fitness (7.5 dots Str+Spd).`;
      ratioType = "baldr";
      tips.push({ icon: "📐", text: `Baldr's Ratio: 1.25:1:0.75:0.75 — entrena Str y Spd para Frontline`, color: "#22d3ee" });
      const prog = specialists.find((s) => s.name === "Frontline Fitness");
      if (prog) tips.push({ icon: "📊", text: `Progreso Frontline: ${Math.min(prog.progress, 100).toFixed(1)}%`, color: "#f59e0b" });
    } else if (defDexTotal > offTotal) {
      focus = "defense";
      reason = `En George's. Tu Def+Dex ya lidera. Sube para desbloquear Balboas Gym (7.5 dots Def+Dex).`;
      ratioType = "baldr";
      tips.push({ icon: "📐", text: `Baldr's Ratio: 1.25:1:0.75:0.75 — entrena Def y Dex para Balboas`, color: "#22d3ee" });
      const prog = specialists.find((s) => s.name === "Balboas Gym");
      if (prog) tips.push({ icon: "📊", text: `Progreso Balboas: ${Math.min(prog.progress, 100).toFixed(1)}%`, color: "#f59e0b" });
    } else {
      focus = "strength";
      reason = `En George's con stats equilibrados. Elige una ruta: Str+Spd (ofensivo) o Def+Dex (defensivo) para desbloquear gyms especializados.`;
      tips.push({ icon: "🔀", text: "¡Momento de elegir! Enfócate en 2 stats para specialist gyms", color: "#ef4444" });
    }

  } else if (isGeorges && accessibleSpecialists.length > 0) {
    const best = accessibleSpecialists[0];
    focus = best.stats.toLowerCase().includes("str") ? "strength" : best.stats.toLowerCase().includes("def") ? "defense" : best.stats.toLowerCase().includes("spd") ? "speed" : "dexterity";
    reason = `¡Tienes acceso a ${best.name}! Cámbiate para entrenar con ${best.gym.energy}E y más dots.`;
    tips.push({ icon: "⚠️", text: `Estás en George's pero podrías estar en ${best.name}. ¡Cámbiate!`, color: "#ef4444" });

  } else if (isSpecialist) {
    const trainable = [];
    if (gym.str > 0) trainable.push({ name: "strength", dots: gym.str });
    if (gym.spd > 0) trainable.push({ name: "speed", dots: gym.spd });
    if (gym.def > 0) trainable.push({ name: "defense", dots: gym.def });
    if (gym.dex > 0) trainable.push({ name: "dexterity", dots: gym.dex });

    if (trainable.length === 1) {
      focus = trainable[0].name;
      reason = `En ${gymName} (${trainable[0].dots} dots). Entrena ${focus} aquí y los otros stats en George's.`;
      ratioType = "hank";
      tips.push({ icon: "📐", text: `Hank's Ratio — stat principal aquí, secundarios en George's`, color: "#22d3ee" });
      tips.push({ icon: "⚡", text: `Gasta 50E aquí en ${focus}, luego cambia a George's para el resto`, color: "#10b981" });
    } else if (trainable.length === 2) {
      const lower = trainable.sort((a, b) => (stats[a.name] || 0) - (stats[b.name] || 0))[0];
      focus = lower.name;
      reason = `En ${gymName} (${trainable[0].dots} dots). Entrena ${lower.name} (más bajo) para equilibrar tu par.`;
      ratioType = "baldr";
      tips.push({ icon: "📐", text: `Baldr's Ratio — entrena ambos stats aquí, los otros en George's`, color: "#22d3ee" });
    } else {
      focus = sorted[sorted.length - 1].name;
      reason = `En ${gymName} (9.0 dots en todo). ¡El mejor gym! Entrena ${focus} para equilibrar.`;
      tips.push({ icon: "🏆", text: "Sports Science Lab es el gym definitivo. Equilibra tus stats.", color: "#f59e0b" });
    }

    if (gym.tier === "specialist" && activeGymId >= 25 && activeGymId <= 30) {
      const currentSpec = specialists[activeGymId - 25];
      if (currentSpec && currentSpec.progress < 110) {
        tips.push({ icon: "🚨", text: `¡Cuidado! Tu ratio está justo (${currentSpec.progress.toFixed(0)}%). Si baja de 100% pierdes acceso.`, color: "#ef4444" });
      }
    }
  }

  let bestDotStat = null;
  if (gym) {
    const dotEntries = [
      { name: "strength", d: gym.str },
      { name: "speed", d: gym.spd },
      { name: "defense", d: gym.def },
      { name: "dexterity", d: gym.dex },
    ].filter((e) => e.d > 0).sort((a, b) => b.d - a.d);
    bestDotStat = dotEntries[0] || null;
  }

  return { focus, reason, tips, ratioType, gym, gymName, specialists, accessibleSpecialists, bestDotStat };
};

// ─── TRAVEL DATA (YATA-DRIVEN) ──────────────────────────────────────────────
// Destinations with flight times only — actual items come from YATA API
const TRAVEL_DESTINATIONS = [
  { destination: "Mexico", flag: "🇲🇽", flightTime: 26, code: "mex" },
  { destination: "Cayman Islands", flag: "🇰🇾", flightTime: 35, code: "cay" },
  { destination: "Canada", flag: "🇨🇦", flightTime: 41, code: "can" },
  { destination: "Hawaii", flag: "🇺🇸", flightTime: 134, code: "haw" },
  { destination: "United Kingdom", flag: "🇬🇧", flightTime: 159, code: "uni" },
  { destination: "Argentina", flag: "🇦🇷", flightTime: 167, code: "arg" },
  { destination: "Switzerland", flag: "🇨🇭", flightTime: 175, code: "swi" },
  { destination: "Japan", flag: "🇯🇵", flightTime: 225, code: "jap" },
  { destination: "China", flag: "🇨🇳", flightTime: 242, code: "chi" },
  { destination: "UAE", flag: "🇦🇪", flightTime: 242, code: "uae" },
  { destination: "South Africa", flag: "🇿🇦", flightTime: 267, code: "sou" },
];

// Known plushie/flower IDs for labeling (from YATA real data)
const PLUSHIE_IDS = new Set([258, 618, 261, 266, 268, 269, 273, 274, 281, 384, 281]);
const FLOWER_IDS = new Set([260, 617, 263, 264, 267, 271, 272, 276, 277, 282, 385]);

// Travel time modifiers (4 real options from the game)
// Source: wiki.torn.com/wiki/Travel + torntravel.com/handbook/capacity
const TICKET_TYPES = [
  { label: "Standard", modifier: 1.0, icon: "🎫", capacity: 5, desc: "Gratis, sin requisitos" },
  { label: "Airstrip", modifier: 0.7, icon: "🛩️", capacity: 15, desc: "Isla Privada + Airstrip + Piloto (30% más rápido)" },
  { label: "Private", modifier: 0.5, icon: "⚡", capacity: 15, desc: "9M acciones WLT stock (50% más rápido)" },
  { label: "Business", modifier: 0.3, icon: "💼", capacity: 15, desc: "Business Class Ticket consumible (70% más rápido)" },
];

// Calculate travel profits — uses YATA stock as primary source for items + costs
const calcTravelProfits = (allItems, travelConfig, realPrices, foreignStock, droqsData) => {
  const { ticketIndex, carrySlots, maxItemCost } = travelConfig;
  const ticketMod = TICKET_TYPES[ticketIndex]?.modifier ?? 1.0;
  const hasYata = foreignStock && Object.keys(foreignStock).length > 0;

  // Build DroqsDB lookup: { countryName: { itemId: { estimatedRestockMinutes, ... } } }
  const droqsLookup = {};
  if (Array.isArray(droqsData?.countries)) {
    for (const country of droqsData.countries) {
      droqsLookup[country.country] = {};
      for (const item of (country.items || [])) {
        droqsLookup[country.country][item.itemId] = item;
      }
    }
  }

  return TRAVEL_DESTINATIONS.map(dest => {
    const yataStock = foreignStock?.[dest.code]?.stocks || [];
    const yataUpdate = foreignStock?.[dest.code]?.update || null;

    // Build item list from YATA stock data + DroqsDB restock info
    const oneWayMinForPrediction = Math.max(1, Math.ceil(dest.flightTime * ticketMod));
    const droqsCountry = droqsLookup[dest.destination] || {};
    const allDestItems = yataStock.map(stockItem => {
      const marketItem = allItems?.[stockItem.id];
      const real = realPrices?.[stockItem.id];
      const droqsItem = droqsCountry[stockItem.id];
      // Use real scan price > DroqsDB bazaar price > market_value
      const sellPrice = real?.cheapest || droqsItem?.bazaarPrice || marketItem?.market_value || 0;
      const priceSource = real?.cheapest ? "market" : droqsItem?.bazaarPrice ? "droqsdb" : sellPrice > 0 ? "estimate" : "no_data";
      const avgBazaar = real?.avgBazaar || droqsItem?.bazaarPrice || sellPrice;
      const marketListings = real?.totalListings || 0;
      const abroadCost = droqsItem?.buyPrice || stockItem.cost;
      const abroadStock = stockItem.quantity;
      // Subtract Item Market commission (5%)
      const sellAfterFee = Math.round(sellPrice * 0.95);
      const profit = sellAfterFee - abroadCost;
      const itemName = marketItem?.name || stockItem.name;
      // DroqsDB restock data (null = in stock or no data)
      const restockMin = (droqsItem?.estimatedRestockMinutes != null && droqsItem.estimatedRestockMinutes > 0)
        ? droqsItem.estimatedRestockMinutes : null;
      const droqsProfitPerMin = droqsItem?.profitPerMinute ?? null;
      const type = PLUSHIE_IDS.has(stockItem.id) ? "plushie"
        : FLOWER_IDS.has(stockItem.id) ? "flower" : "item";

      // Will this item be in stock when I arrive? (smart prediction)
      const willBeInStock = abroadStock > 0 ? true
        : restockMin !== null && restockMin <= oneWayMinForPrediction ? true : false;

      return {
        id: stockItem.id, name: stockItem.name, marketName: itemName,
        type, sellPrice, sellAfterFee, profit, priceSource, avgBazaar, marketListings,
        abroadStock, abroadCost, yataUpdate, restockMin, droqsProfitPerMin, willBeInStock,
      };
    }).sort((a, b) => b.profit - a.profit);

    // Best combo: fill slots with profitable items (in stock OR will restock before arrival)
    const inStockItems = allDestItems.filter(it =>
      (it.abroadStock > 0 || it.willBeInStock) && it.profit > 0 &&
      (maxItemCost === 0 || it.abroadCost <= maxItemCost)
    );
    const bestCombo = [];
    const stockUsed = {};
    let slotsLeft = carrySlots;
    for (const it of inStockItems) {
      if (slotsLeft <= 0) break;
      const available = Math.max(0, it.abroadStock - (stockUsed[it.id] || 0));
      const toBuy = Math.min(slotsLeft, available);
      if (toBuy <= 0) continue;
      for (let n = 0; n < toBuy; n++) bestCombo.push(it);
      stockUsed[it.id] = (stockUsed[it.id] || 0) + toBuy;
      slotsLeft -= toBuy;
    }
    const totalInvestment = bestCombo.reduce((s, it) => s + it.abroadCost, 0);
    const totalRevenue = bestCombo.reduce((s, it) => s + it.sellPrice, 0);
    const totalProfit = totalRevenue - totalInvestment;

    // Flight times
    const oneWayMin = Math.max(1, Math.ceil(dest.flightTime * ticketMod));
    const roundTripMin = oneWayMin * 2;
    const roundTripHours = roundTripMin / 60;
    const profitPerHour = roundTripHours > 0 ? Math.round(totalProfit / roundTripHours) : 0;
    const profitPerMin = roundTripMin > 0 ? Math.round(totalProfit / roundTripMin) : 0;
    const tripsPerDay = roundTripMin > 0 ? Math.floor((16 * 60) / roundTripMin) : 0;
    const dailyProfit = tripsPerDay * totalProfit;

    const outOfStockCount = allDestItems.filter(it => it.abroadStock === 0).length;
    const hasStockData = hasYata && allDestItems.length > 0;

    return {
      ...dest, allDestItems, bestCombo,
      totalInvestment, totalRevenue, totalProfit,
      oneWayMin, roundTripMin, profitPerHour, profitPerMin,
      tripsPerDay, dailyProfit, outOfStockCount, hasStockData, yataUpdate,
    };
  }).sort((a, b) => b.profitPerHour - a.profitPerHour);
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const ProgressBar = ({ value, max, color, label, sublabel, glow }) => {
  const p = pct(value, max);
  const isReady = value >= max;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: isReady ? color : T.text, fontWeight: 600, fontSize: 13 }}>
          {label} {isReady && "⚡"}
        </span>
        <span style={{ color: T.textDim, fontSize: 12 }}>
          {sublabel || `${value}/${max}`}
        </span>
      </div>
      <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            width: `${p}%`,
            height: "100%",
            background: isReady ? color : `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 4,
            transition: "width 0.6s ease",
            boxShadow: glow && isReady ? `0 0 12px ${color}88` : "none",
          }}
        />
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, sub, color, bg }) => (
  <div
    style={{
      background: bg || T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      transition: "all 0.2s",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || T.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMuted }}>{sub}</div>}
    </div>
  </div>
);

const SectionHeader = ({ icon, title, badge }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, marginTop: 8 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, letterSpacing: 0.5 }}>{title}</h2>
    {badge && (
      <span
        style={{
          fontSize: 10,
          background: T.accentDim,
          color: T.accent,
          padding: "2px 8px",
          borderRadius: 20,
          fontWeight: 600,
        }}
      >
        {badge}
      </span>
    )}
  </div>
);

const CheckItem = ({ text, checked, onChange, sub }) => (
  <div
    onClick={onChange}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: checked ? T.greenDim : T.card,
      border: `1px solid ${checked ? T.green + "44" : T.border}`,
      borderRadius: 8,
      cursor: "pointer",
      transition: "all 0.2s",
      marginBottom: 6,
    }}
  >
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: 5,
        border: `2px solid ${checked ? T.green : T.textMuted}`,
        background: checked ? T.green : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "#fff",
        flexShrink: 0,
        transition: "all 0.2s",
      }}
    >
      {checked ? "✓" : ""}
    </div>
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: 13, color: checked ? T.green : T.text, textDecoration: checked ? "line-through" : "none" }}>
        {text}
      </span>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

// ─── CHAT SERVER ────────────────────────────────────────────────────────────
const CHAT_SERVER = "http://localhost:3001";

const ClaudeChat = ({ tornContext, onClose }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hola, soy Claude. Puedo ayudarte con estrategias de Torn City o cualquier otra cosa. Preguntame lo que quieras." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    const updatedMessages = [...messages, { role: "user", text: msg }];
    setMessages(updatedMessages);
    setLoading(true);
    try {
      // Send conversation history (skip first greeting, limit to last 20 messages to avoid too-long prompts)
      const history = updatedMessages.slice(1).slice(-20).filter(m => m.role === "user" || m.role === "assistant");
      const res = await fetch(`${CHAT_SERVER}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context: tornContext, history: history.slice(0, -1) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "error", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 20, width: 380, height: 520,
      background: T.card, border: `1px solid ${T.accent}44`, borderRadius: 16,
      display: "flex", flexDirection: "column", zIndex: 9999,
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${T.accent}22`,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `linear-gradient(135deg, ${T.card}, ${T.accentDim})`, borderRadius: "16px 16px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Claude Opus 4.6</span>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: T.textDim, fontSize: 18,
          cursor: "pointer", padding: "0 4px", lineHeight: 1,
        }}>x</button>
      </div>
      <div style={{
        flex: 1, overflowY: "auto", padding: 12, display: "flex",
        flexDirection: "column", gap: 10,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%", padding: "10px 14px",
            borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            background: m.role === "user" ? T.accentDim : m.role === "error" ? T.redDim : T.bg,
            border: `1px solid ${m.role === "user" ? T.accent + "44" : m.role === "error" ? T.red + "44" : T.border}`,
            color: m.role === "error" ? T.red : T.text,
            fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: "flex-start", padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
            background: T.bg, border: `1px solid ${T.border}`, fontSize: 12, color: T.textDim,
          }}>
            <span style={{ animation: "pulse 1s infinite" }}>Pensando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
          style={{
            flex: 1, padding: "10px 14px", background: T.bg,
            border: `1px solid ${T.border}`, borderRadius: 10,
            color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 16px",
            background: loading || !input.trim() ? T.border : `linear-gradient(135deg, ${T.accent}, #06b6d4)`,
            border: "none", borderRadius: 10, color: T.bg,
            fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
          }}
        >
          {loading ? "..." : "->"}
        </button>
      </div>
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function TornGrowthOptimizer() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("torn_api_key") || "");
  const [inputKey, setInputKey] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem("torn_checklist");
    const defaults = { train: false, crimes: false, duke: false, travel: false, refill: false, booster: false, xanax: false, npc: false, chain: false, race: false };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toDateString()) return parsed.items;
      } catch {}
    }
    return defaults;
  });
  const [selectedCrime, setSelectedCrime] = useState(() => {
    const saved = localStorage.getItem("torn_selected_crime");
    return saved ? parseInt(saved, 10) : null;
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const notifiedRef = useRef({ energy: false, nerve: false, happy: false });
  const [allItems, setAllItems] = useState(null);
  const [marketDeals, setMarketDeals] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [selectedMerit, setSelectedMerit] = useState(null);
  const [scanPaused, setScanPaused] = useState(false);
  const scanActiveRef = useRef(false);
  const scanPausedRef = useRef(false);
  const marketResultsRef = useRef([]);
  const [marketMaxPrice, setMarketMaxPrice] = useState(0);
  const [marketMinPrice, setMarketMinPrice] = useState(0);
  const marketMaxPriceRef = useRef(0);
  const marketMinPriceRef = useRef(0);

  // Travel Optimizer Config
  const [travelTicket, setTravelTicket] = useState(() => parseInt(localStorage.getItem("torn_travel_ticket") || "0", 10));
  const [travelSlots, setTravelSlots] = useState(() => parseInt(localStorage.getItem("torn_travel_slots") || "5", 10));
  const [travelTripsToday, setTravelTripsToday] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("torn_travel_trips") || "{}");
      if (saved.date === new Date().toDateString()) return saved.count;
    } catch {}
    return 0;
  });
  const [travelEarningsToday, setTravelEarningsToday] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("torn_travel_earnings") || "{}");
      if (saved.date === new Date().toDateString()) return saved.amount;
    } catch {}
    return 0;
  });
  const [travelExpandedCountries, setTravelExpandedCountries] = useState(new Set());
  const [travelMaxCost, setTravelMaxCost] = useState(() => parseInt(localStorage.getItem("torn_travel_maxcost") || "50000", 10));
  const [landingCountdown, setLandingCountdown] = useState(null); // seconds left, null = not close
  const [travelRealPrices, setTravelRealPrices] = useState({}); // { itemId: { cheapest, qty, avgBazaar } }
  const [travelForeignStock, setTravelForeignStock] = useState(null); // YATA data { mex: { stocks: [...], update }, ... }
  const [travelDroqsData, setTravelDroqsData] = useState(null); // DroqsDB data
  const [travelPriceLoading, setTravelPriceLoading] = useState(false);
  const [travelStockLoading, setTravelStockLoading] = useState(false);
  const [travelLastPriceUpdate, setTravelLastPriceUpdate] = useState(null);
  const [travelLastStockUpdate, setTravelLastStockUpdate] = useState(null);

  // Easter Egg Hunt
  const [eggIndex, setEggIndex] = useState(() => parseInt(localStorage.getItem("torn_egg_index") || "0", 10));
  const [eggsFound, setEggsFound] = useState(() => {
    try { return JSON.parse(localStorage.getItem("torn_eggs_found") || "[]"); } catch { return []; }
  });
  const [eggAutoRunning, setEggAutoRunning] = useState(false);
  const [eggAutoSpeed, setEggAutoSpeed] = useState(10);
  const [eggFound, setEggFound] = useState(false);
  const eggAutoRef = useRef(false);
  const eggIntervalRef = useRef(null);
  const eggWindowRef = useRef(null);

  // Listen for egg found messages from the Torn tab (sent by our userscript)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'EGG_FOUND') {
        // Pause auto-navigation
        if (eggAutoRef.current) {
          eggAutoRef.current = false;
          setEggAutoRunning(false);
          if (eggIntervalRef.current) clearInterval(eggIntervalRef.current);
        }
        setEggFound(true);
        // Play sound in our app too
        playAlert();
        setTimeout(() => playAlert(), 1000);
        setTimeout(() => playAlert(), 2000);
        // Auto-register egg
        setEggIndex(prev => {
          const pageName = EGG_PAGES[prev] || "unknown";
          const entry = { page: pageName, time: new Date().toLocaleString(), index: prev, url: event.data.page };
          setEggsFound(old => {
            const updated = [...old, entry];
            localStorage.setItem("torn_eggs_found", JSON.stringify(updated));
            return updated;
          });
          return prev;
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const EGG_PAGES = ["", "index.php","city.php","jobs.php","gym.php","properties.php","page.php?sid=education",
    "crimes.php","loader.php?sid=missions","newspaper.php","jailview.php","hospitalview.php",
    "casino.php","page.php?sid=hof","factions.php","competition.php","page.php?sid=list&type=friends",
    "page.php?sid=list&type=enemies","page.php?sid=list&type=targets","messages.php","page.php?sid=events",
    "page.php?sid=awards","page.php?sid=points","rules.php","staff.php","credits.php","citystats.php",
    "committee.php","bank.php","donator.php","item.php","page.php?sid=stocks","fans.php","museum.php",
    "loader.php?sid=racing","church.php","dump.php","loan.php","page.php?sid=travel","amarket.php",
    "bigalgunshop.php","shops.php?step=bitsnbobs","shops.php?step=cyberforce","shops.php?step=docks",
    "shops.php?step=jewelry","shops.php?step=nikeh","shops.php?step=pawnshop","shops.php?step=pharmacy",
    "pmarket.php","shops.php?step=postoffice","shops.php?step=super","shops.php?step=candy",
    "shops.php?step=clothes","shops.php?step=recyclingcenter","shops.php?step=printstore",
    "page.php?sid=ItemMarket","estateagents.php","bazaar.php?userId=1","page.php?sid=bazaar",
    "calendar.php","token_shop.php","freebies.php","bringafriend.php","comics.php","archives.php",
    "joblist.php","newspaper_class.php","personals.php","profiles.php?XID=1","newspaper.php#/archive",
    "bounties.php","usersonline.php","page.php?sid=ammo","playerreport.php","page.php?sid=itemsMods",
    "displaycase.php","trade.php","crimes.php?step=criminalrecords","page.php?sid=crimesRecord",
    "index.php?page=fortune","page.php?sid=bunker","church.php?step=proposals","messageinc.php",
    "preferences.php","page.php?sid=gallery&XID=1","personalstats.php?ID=1",
    "properties.php?step=rentalmarket","properties.php?step=sellingmarket","forums.php",
    "page.php?sid=slots","page.php?sid=roulette","page.php?sid=highlow","page.php?sid=keno",
    "page.php?sid=craps","page.php?sid=bookie","page.php?sid=lottery","page.php?sid=blackjack",
    "page.php?sid=holdem","page.php?sid=russianRoulette","page.php?sid=spinTheWheel",
    "page.php?sid=slotsStats","page.php?sid=rouletteStatistics","page.php?sid=highlowStats",
    "page.php?sid=kenoStatistics","page.php?sid=crapsStats","page.php?sid=blackjackStatistics",
    "page.php?sid=holdemStats","page.php?sid=russianRouletteStatistics",
    "factions.php?step=your#/tab=crimes","factions.php?step=your#/tab=rank",
    "factions.php?step=your#/tab=controls","factions.php?step=your#/tab=info",
    "factions.php?step=your#/tab=upgrades","factions.php?step=your#/tab=armoury",
    "companies.php","itemuseparcel.php","index.php?page=rehab","index.php?page=people",
    "page.php?sid=UserList","index.php?page=hunting","donatordone.php","revive.php","pc.php",
    "loader.php?sid=crimes","loader.php?sid=crimes#/searchforcash","loader.php?sid=crimes#/bootlegging",
    "loader.php?sid=crimes#/graffiti","loader.php?sid=crimes#/shoplifting",
    "loader.php?sid=crimes#/pickpocketing","loader.php?sid=crimes#/cardskimming",
    "loader.php?sid=crimes#/burglary","loader.php?sid=crimes#/hustling",
    "loader.php?sid=crimes#/disposal","loader.php?sid=crimes#/cracking",
    "loader.php?sid=crimes#/forgery","loader.php?sid=crimes#/scamming",
    "page.php?sid=crimes#/arson","page.php?sid=keepsakes","page.php?sid=crimes2","authenticate.php",
  ];

  // Real Torn Honors & Medals
  const [tornHonors, setTornHonors] = useState(null);
  const [tornMedals, setTornMedals] = useState(null);
  const [stockPrices, setStockPrices] = useState({});

  // Targets
  const [targets, setTargets] = useState([]);
  const [targetScanning, setTargetScanning] = useState(false);
  const [targetProgress, setTargetProgress] = useState("");
  const [targetPaused, setTargetPaused] = useState(false);
  const targetPausedRef = useRef(false);
  const targetActiveRef = useRef(false);
  const [targetMaxLevel, setTargetMaxLevel] = useState(10);
  const [targetScanned, setTargetScanned] = useState(0);

  // Claude Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [serverStarting, setServerStarting] = useState(false);
  const healthRef = useRef(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${CHAT_SERVER}/health`, { signal: AbortSignal.timeout(2000) });
        const d = await res.json();
        setServerOnline(d.status === "ok");
      } catch {
        setServerOnline(false);
      }
    };
    checkHealth();
    healthRef.current = setInterval(checkHealth, 5000);
    return () => clearInterval(healthRef.current);
  }, []);

  const toggleServer = async () => {
    if (serverOnline) {
      try { await fetch(`${CHAT_SERVER}/shutdown`); } catch {}
      setServerOnline(false);
      setChatOpen(false);
    } else {
      setServerStarting(true);
      setTimeout(() => setServerStarting(false), 6000);
    }
  };

  // Save checklist to localStorage
  useEffect(() => {
    localStorage.setItem("torn_checklist", JSON.stringify({ date: new Date().toDateString(), items: checklist }));
  }, [checklist]);

  const fetchData = useCallback(async (key) => {
    if (!key) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/user/?selections=profile,bars,battlestats,cooldowns,travel,money,gym,crimes,education,networth,personalstats,merits,honors,medals,stocks&key=${key}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.error || "API Error");
      setData(json);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real Torn honors & medals definitions + stock prices
  const fetchTornAwards = useCallback(async (key) => {
    if (!key) return;
    try {
      const [honorsRes, medalsRes, stocksRes] = await Promise.all([
        fetch(`${API_BASE}/torn/?selections=honors&key=${key}`),
        fetch(`${API_BASE}/torn/?selections=medals&key=${key}`),
        fetch(`${API_BASE}/torn/?selections=stocks&key=${key}`),
      ]);
      const honorsJson = await honorsRes.json();
      const medalsJson = await medalsRes.json();
      const stocksJson = await stocksRes.json();
      if (honorsJson.honors) setTornHonors(honorsJson.honors);
      if (medalsJson.medals) setTornMedals(medalsJson.medals);
      if (stocksJson.stocks) {
        const prices = {};
        Object.entries(stocksJson.stocks).forEach(([id, s]) => {
          prices[Number(id)] = { name: s.name, acronym: s.acronym, current_price: s.current_price, market_cap: s.market_cap };
        });
        setStockPrices(prices);
      }
    } catch (e) {
      console.error("Error fetching Torn awards:", e);
    }
  }, []);

  // Fetch awards when API key is set
  useEffect(() => {
    if (apiKey) fetchTornAwards(apiKey);
  }, [apiKey, fetchTornAwards]);

  // Scan ALL categories in one pass
  const scanAllMarkets = useCallback(async (items, key) => {
    setScanning(true);

    const SCAN_TYPES = ["Plushie", "Flower", "Drug", "Booster", "Temporary", "Melee", "Primary", "Secondary", "Armor", "Clothing", "Jewelry"];
    const allItemsToScan = Object.entries(items)
      .filter(([, item]) => SCAN_TYPES.includes(item.type) && item.market_value > 0)
      .sort(() => Math.random() - 0.5);

    marketResultsRef.current = [];
    let scanned = 0;

    const processItem = async ([id, item]) => {
      try {
        const res = await fetch(`${API_BASE}/v2/market/${id}/itemmarket?key=${key}`);
        const json = await res.json();
        if (json.error) return "rate_limited";

        const listings = json?.itemmarket?.listings;

        if (listings && listings.length > 0) {
          const sorted = [...listings].sort((a, b) => a.price - b.price);
          const cheapest = sorted[0].price;

          // Media ponderada de los primeros 15 listings (sin contar el más barato)
          const forAvg = sorted.slice(1, 16);
          let totalQty = 0, totalValue = 0;
          for (const l of forAvg) {
            totalQty += (l.amount || 1);
            totalValue += l.price * (l.amount || 1);
          }
          const weightedAvg = totalQty > 0 ? Math.round(totalValue / totalQty) : (item.market_value || 0);
          const sellPrice = Math.round(weightedAvg * 0.95); // precio real tras 5% comisión
          const discount = sellPrice > 0 ? Math.round((1 - cheapest / sellPrice) * 100) : 0;
          if (discount > 10) {
            const deal = {
              id,
              name: item.name,
              type: item.type,
              marketValue: weightedAvg,
              cheapestPrice: cheapest,
              avgBazaarPrice: weightedAvg,
              totalListings: sorted.length,
              discount,
              cheapestQty: sorted[0].amount || 1,
            };
            marketResultsRef.current.push(deal);
            const mp = marketMaxPriceRef.current;
            const mn = marketMinPriceRef.current;
            if (discount > 15 && (mp === 0 || cheapest <= mp) && (mn === 0 || cheapest >= mn)) playAlert();
            setMarketDeals([...marketResultsRef.current].sort((a, b) => b.discount - a.discount));
          }
        }
      } catch {}
      return "ok";
    };

    // Scan 2 items in parallel, ~1.3s per batch = ~92 calls/min
    for (let i = 0; i < allItemsToScan.length; i += 2) {
      if (!scanActiveRef.current) break;
      while (scanPausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (!scanActiveRef.current) break;
      }
      scanned = Math.min(i + 2, allItemsToScan.length);
      const batch = allItemsToScan.slice(i, i + 2);
      setScanProgress(`${batch[0][1].name} (${scanned}/${allItemsToScan.length})`);

      const statuses = await Promise.all(batch.map(processItem));
      if (statuses.includes("rate_limited")) {
        await new Promise(r => setTimeout(r, 5000));
        i -= 2; // retry this batch
        continue;
      }
      await new Promise(r => setTimeout(r, 1300));
    }

    marketResultsRef.current.sort((a, b) => b.discount - a.discount);
    setMarketDeals([...marketResultsRef.current]);
    setScanProgress("");
  }, []);

  const scanTargets = useCallback(async (key, maxLvl) => {
    if (targetActiveRef.current) return;
    targetActiveRef.current = true;
    setTargetScanning(true);
    let scanned = 0;

    while (targetActiveRef.current) {
      while (targetPausedRef.current && targetActiveRef.current) {
        await new Promise(r => setTimeout(r, 500));
      }
      if (!targetActiveRef.current) break;

      // Random ID: mix of old accounts (1-2M) and mid accounts (2M-3M)
      const id = Math.random() < 0.7
        ? Math.floor(Math.random() * 2000000) + 1
        : Math.floor(Math.random() * 1000000) + 2000000;

      try {
        const res = await fetch(`${API_BASE}/user/${id}?selections=profile&key=${key}`);
        const json = await res.json();

        if (json.error) {
          if (json.error.code === 5) { await new Promise(r => setTimeout(r, 5000)); continue; }
          await new Promise(r => setTimeout(r, 800)); continue;
        }

        scanned++;
        setTargetScanned(scanned);
        setTargetProgress(`ID ${id} — ${json.name || "?"} Lvl ${json.level || "?"}`);

        const lastAction = json.last_action?.timestamp || 0;
        const daysSince = (Date.now() / 1000 - lastAction) / 86400;
        const state = json.status?.state || "";

        if (
          daysSince > 60 &&
          json.level && json.level <= maxLvl &&
          state === "Okay" &&
          json.life?.current > 0
        ) {
          setTargets(prev => {
            if (prev.some(t => t.id === id)) return prev;
            return [...prev, {
              id,
              name: json.name,
              level: json.level,
              daysSince: Math.floor(daysSince),
              lastAction: json.last_action?.relative || "?",
              life: json.life?.current,
              lifeMax: json.life?.maximum,
            }].sort((a, b) => a.level - b.level);
          });
        }
      } catch {}
      await new Promise(r => setTimeout(r, 800));
    }

    setTargetScanning(false);
    targetActiveRef.current = false;
  }, []);

  // Auto-load items (market scanner is manual only)
  useEffect(() => {
    if (!apiKey) return;
    const loadItems = async () => {
      if (!allItems) {
        try {
          const res = await fetch(`${API_BASE}/torn/?selections=items&key=${apiKey}`);
          const json = await res.json();
          if (json.items) setAllItems(json.items);
        } catch {}
      }
    };
    loadItems();
  }, [apiKey]);

  // Manual scan loop - only runs when user clicks Start
  const startMarketScan = useCallback(async () => {
    if (scanActiveRef.current) return;
    let items = allItems;
    if (!items) {
      try {
        const res = await fetch(`${API_BASE}/torn/?selections=items&key=${apiKey}`);
        const json = await res.json();
        if (json.items) { items = json.items; setAllItems(json.items); }
      } catch {}
    }
    if (!items) return;

    scanActiveRef.current = true;
    const loop = async () => {
      while (scanActiveRef.current) {
        while (scanPausedRef.current && scanActiveRef.current) {
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!scanActiveRef.current) break;
        await scanAllMarkets(items, apiKey);
        await new Promise(r => setTimeout(r, 30000));
      }
    };
    loop();
  }, [apiKey, allItems, scanAllMarkets]);

  const stopMarketScan = useCallback(() => {
    scanActiveRef.current = false;
    setScanning(false);
    setScanProgress("Detenido");
  }, []);

  // ─── TRAVEL: Fetch real market prices for travel items ──────────────────
  const fetchTravelRealPrices = useCallback(async () => {
    if (!apiKey || !travelForeignStock) return;
    setTravelPriceLoading(true);
    try {
      // Only scan top 3 most expensive items per country + plushies/flowers
      const itemIds = new Set();
      Object.values(travelForeignStock).forEach(country => {
        const stocks = country.stocks || [];
        const sorted = [...stocks].sort((a, b) => b.cost - a.cost);
        sorted.slice(0, 3).forEach(s => itemIds.add(s.id));
        stocks.forEach(s => {
          if (PLUSHIE_IDS.has(s.id) || FLOWER_IDS.has(s.id)) itemIds.add(s.id);
        });
      });
      const uniqueIds = [...itemIds];
      if (uniqueIds.length === 0) return;

      const prices = { ...travelRealPrices };
      // Fetch ONE at a time with 2s delay to avoid rate limiting
      for (let i = 0; i < uniqueIds.length; i++) {
        const id = uniqueIds[i];
        try {
          const res = await fetch(`${API_BASE}/v2/market/${id}/itemmarket?key=${apiKey}`);
          const json = await res.json();
          if (json.error?.code === 5) {
            // Rate limited — wait 10s and retry
            await new Promise(r => setTimeout(r, 10000));
            continue;
          }
          if (!json.error) {
            const listings = json.itemmarket || [];
            if (listings.length > 0) {
              const cheapest = listings[0]?.price ?? 0;
              const cheapQty = listings.filter(l => l.price === cheapest).reduce((s, l) => s + (l.quantity || 1), 0);
              const top10 = listings.slice(0, 10);
              const avgBazaar = top10.length > 0 ? Math.round(top10.reduce((s, l) => s + l.price, 0) / top10.length) : cheapest;
              prices[id] = { cheapest, qty: cheapQty, avgBazaar, totalListings: listings.length };
            }
          }
        } catch {}
        // Update state progressively so user sees results appearing
        if (i % 5 === 4) setTravelRealPrices({ ...prices });
        if (i < uniqueIds.length - 1) await new Promise(r => setTimeout(r, 2000));
      }
      setTravelRealPrices(prices);
      setTravelLastPriceUpdate(Date.now());
    } catch (e) { console.error("Travel price fetch error:", e); }
    setTravelPriceLoading(false);
  }, [apiKey, travelRealPrices, travelForeignStock]);

  // ─── TRAVEL: Fetch foreign stock from YATA ────────────────────────────
  const fetchForeignStock = useCallback(async () => {
    setTravelStockLoading(true);
    try {
      // Try DroqsDB first (better data, restock predictions)
      const droqsRes = await fetch("https://droqsdb.com/api/public/v1/export");
      if (droqsRes.ok) {
        const droqsJson = await droqsRes.json();
        setTravelDroqsData(droqsJson);
      }
    } catch (e) { console.error("DroqsDB fetch error:", e); }
    try {
      // Also fetch YATA as fallback/complement
      const yataRes = await fetch("https://yata.yt/api/v1/travel/export/");
      if (yataRes.ok) {
        const yataJson = await yataRes.json();
        setTravelForeignStock(yataJson.stocks || null);
      }
    } catch (e) { console.error("YATA fetch error:", e); }
    setTravelStockLoading(false);
    setTravelLastStockUpdate(Date.now());
  }, []);

  // Auto-fetch on apiKey change
  useEffect(() => {
    if (apiKey) {
      fetchData(apiKey);
      intervalRef.current = setInterval(() => fetchData(apiKey), 30000);
      return () => clearInterval(intervalRef.current);
    }
  }, [apiKey, fetchData]);

  // Auto-load stock on startup (YATA/DroqsDB are external, no Torn API cost)
  useEffect(() => {
    if (!apiKey) return;
    fetchForeignStock();
    const stockInterval = setInterval(fetchForeignStock, 5 * 60 * 1000);
    return () => clearInterval(stockInterval);
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scan travel item prices once YATA stock loads (silent, no alerts)
  const travelAutoScannedRef = useRef(false);
  useEffect(() => {
    if (!apiKey || !travelForeignStock || travelAutoScannedRef.current) return;
    if (Object.keys(travelForeignStock).length === 0) return;
    travelAutoScannedRef.current = true;
    fetchTravelRealPrices();
  }, [travelForeignStock]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request notification permission
  useEffect(() => {
    if (apiKey && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [apiKey]);

  // Notification check when data updates
  useEffect(() => {
    if (!data || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const checks = [
      { key: "energy", label: "Energía", current: data?.energy?.current ?? 0, max: data?.energy?.maximum ?? 150 },
      { key: "nerve", label: "Nerve", current: data?.nerve?.current ?? 0, max: data?.nerve?.maximum ?? 25 },
      { key: "happy", label: "Happy", current: data?.happy?.current ?? 0, max: data?.happy?.maximum ?? 250 },
    ];

    checks.forEach(({ key, label, current, max }) => {
      const ratio = max > 0 ? current / max : 0;
      if (ratio >= NOTIFY_THRESHOLD && !notifiedRef.current[key]) {
        new Notification(`⚡ ¡${label} al ${Math.round(ratio * 100)}%!`, {
          body: `${current}/${max} — ¡Úsala antes de que se llene y desperdicies!`,
          tag: `torn-${key}`,
        });
        playAlert();
        notifiedRef.current[key] = true;
      } else if (ratio < NOTIFY_THRESHOLD - 0.15) {
        notifiedRef.current[key] = false;
      }
    });
  }, [data]);

  const handleConnect = () => {
    if (inputKey.length >= 10) {
      localStorage.setItem("torn_api_key", inputKey);
      setApiKey(inputKey);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem("torn_api_key");
    clearInterval(intervalRef.current);
    setApiKey("");
    setInputKey("");
    setData(null);
  };

  // ─── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
          <h1 style={{ color: T.accent, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -1 }}>
            TORN GROWTH
          </h1>
          <h2 style={{ color: T.gold, fontSize: 14, fontWeight: 400, margin: "4px 0 32px", letterSpacing: 3, textTransform: "uppercase" }}>
            Optimizer v2.0
          </h2>
          <p style={{ color: T.textDim, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            Panel privado de crecimiento. Introduce tu API Key de Torn para empezar.
            <br />
            <span style={{ color: T.textMuted, fontSize: 11 }}>
              Settings → API Keys → Crear con acceso "Public"
            </span>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="Tu API Key..."
              style={{
                flex: 1,
                padding: "12px 16px",
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleConnect}
              style={{
                padding: "12px 24px",
                background: `linear-gradient(135deg, ${T.accent}, #06b6d4)`,
                border: "none",
                borderRadius: 8,
                color: T.bg,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Conectar
            </button>
          </div>
          {error && <p style={{ color: T.red, fontSize: 12, marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ─── COMPUTED VALUES ───────────────────────────────────────────────────────
  const bars = {
    energy: { current: data?.energy?.current ?? 0, max: data?.energy?.maximum ?? 150, interval: data?.energy?.interval ?? 600, ticktime: data?.energy?.ticktime ?? 0, fulltime: data?.energy?.fulltime ?? 0 },
    nerve: { current: data?.nerve?.current ?? 0, max: data?.nerve?.maximum ?? 25, interval: data?.nerve?.interval ?? 300, ticktime: data?.nerve?.ticktime ?? 0, fulltime: data?.nerve?.fulltime ?? 0 },
    happy: { current: data?.happy?.current ?? 0, max: data?.happy?.maximum ?? 250, interval: data?.happy?.interval ?? 900, ticktime: data?.happy?.ticktime ?? 0, fulltime: data?.happy?.fulltime ?? 0 },
    life: { current: data?.life?.current ?? 0, max: data?.life?.maximum ?? 100, fulltime: data?.life?.fulltime ?? 0 },
  };

  const battleStats = {
    strength: data?.strength ?? 0,
    speed: data?.speed ?? 0,
    dexterity: data?.dexterity ?? 0,
    defense: data?.defense ?? 0,
  };
  const totalStats = battleStats.strength + battleStats.speed + battleStats.dexterity + battleStats.defense;

  const activeGymId = data?.active_gym ?? null;
  const gymStrategy = getGymStrategy(battleStats, activeGymId, { current: bars.happy.current, max: bars.happy.max });

  const cooldowns = {
    drug: data?.cooldowns?.drug ?? 0,
    medical: data?.cooldowns?.medical ?? 0,
    booster: data?.cooldowns?.booster ?? 0,
  };

  const traveling = data?.travel?.destination !== "" && data?.travel?.time_left > 0;
  const travelDest = data?.travel?.destination || "";
  const travelTime = data?.travel?.time_left ?? 0;

  // Auto-count trips: detect when traveling goes from true → false (landed)
  const wasTravelingRef = useRef(false);
  useEffect(() => {
    if (wasTravelingRef.current && !traveling) {
      // Just landed! Auto-increment trip counter
      const newTrips = travelTripsToday + 1;
      setTravelTripsToday(newTrips);
      localStorage.setItem("torn_travel_trips", JSON.stringify({ date: new Date().toDateString(), count: newTrips }));
    }
    wasTravelingRef.current = traveling;
  }, [traveling]); // eslint-disable-line react-hooks/exhaustive-deps

  // Landing alert: 6 alerts every 10s when < 60s remaining
  const landingAlertedRef = useRef(new Set());
  const travelTimeLocalRef = useRef(0);
  useEffect(() => {
    if (travelTime > 0) travelTimeLocalRef.current = travelTime;
    if (!traveling) {
      landingAlertedRef.current.clear();
      travelTimeLocalRef.current = 0;
      setLandingCountdown(null);
    }
  }, [travelTime, traveling]);

  // Internal 1-second countdown — NO API calls, just a local timer
  useEffect(() => {
    if (!traveling) return;
    const interval = setInterval(() => {
      travelTimeLocalRef.current = Math.max(0, travelTimeLocalRef.current - 1);
      const t = travelTimeLocalRef.current;

      // Show visual countdown when < 60s + flash tab title
      if (t <= 60 && t > 0) {
        setLandingCountdown(t);
        document.title = t % 2 === 0 ? `🛬 ${t}s - ${travelDest}!` : `✈️ ATERRIZANDO ${t}s`;
      } else if (t <= 0) {
        setLandingCountdown(null);
        document.title = "TORN GROWTH";
      }

      // Alert at 60, 50, 40, 30, 20, 10 seconds
      const alertTimes = [60, 50, 40, 30, 20, 10];
      for (const at of alertTimes) {
        if (t === at && !landingAlertedRef.current.has(at)) {
          landingAlertedRef.current.add(at);
          try { playAlert(); } catch {}
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`✈️ ¡Aterrizando en ${at}s!`, {
              body: `Llegas a ${travelDest} en ${at} segundos`,
              tag: "torn-landing",
            });
          }
        }
      }
      if (t <= 0) {
        setLandingCountdown(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [traveling, travelDest]);

  const recommendedCrime = selectedCrime != null
    ? CRIME_GUIDE.find(c => c.nerve === selectedCrime) || CRIME_GUIDE[0]
    : CRIME_GUIDE.filter(c => c.nerve <= bars.nerve.max).pop() || CRIME_GUIDE[0];

  const networth = data?.networth?.total ?? 0;
  const money = data?.money_onhand ?? 0;
  const level = data?.level ?? 0;
  const name = data?.name ?? "Player";

  const ps = data?.personalstats ?? {};
  const age = data?.age ?? 0;

  const tornContext = useMemo(() => {
    if (!data) return "";

    // Basic profile
    let ctx = `Nombre: ${name}, Nivel: ${level}, Edad: ${age} días, ` +
      `Stats - STR: ${fmt(data.strength)} SPD: ${fmt(data.speed)} DEF: ${fmt(data.defense)} DEX: ${fmt(data.dexterity)}, ` +
      `Energia: ${bars.energy.current}/${bars.energy.max}, Nerve: ${bars.nerve.current}/${bars.nerve.max}, ` +
      `Happy: ${bars.happy.current}/${bars.happy.max}, Life: ${bars.life?.current || 0}/${bars.life?.max || 0}, ` +
      `Gym: ${GYMS[(data.active_gym || 1) - 1]?.name || "?"}, ` +
      `Dinero: $${fmt(money)}, Networth: $${fmt(networth)}, Points: ${data.points || 0}, ` +
      `Cooldowns - Droga: ${cooldowns.drug}s, Medical: ${cooldowns.medical}s, Booster: ${cooldowns.booster}s`;

    // All personalstats
    if (ps && Object.keys(ps).length > 0) {
      const importantStats = [
        "attackswon", "attackslost", "defendswon", "defendslost",
        "criminaloffenses", "peoplebusted", "failedbusts",
        "traveltimes", "itemsbought", "itemssent",
        "bountiescollected", "revives", "revivesreceived",
        "trainsreceived", "hospitalized",
        "attacksstealthed", "organisedcrimes",
        "xantaken", "exttaken", "lsdtaken", "kettaken",
        "energydrinkused", "refills", "bestkillstreak",
        "moneymugged", "largestmug",
        "useractivity", "itemslooted",
      ];
      const statsStr = importantStats
        .filter(s => ps[s] !== undefined && ps[s] > 0)
        .map(s => `${s}: ${ps[s]}`)
        .join(", ");
      if (statsStr) ctx += `. PersonalStats: ${statsStr}`;
    }

    // Real honors from API
    const userHonorIds = data?.honors_awarded || [];
    const userMedalIds = data?.medals_awarded || [];
    ctx += `. Honors desbloqueados: ${userHonorIds.length}, Medals desbloqueados: ${userMedalIds.length}`;
    if (tornHonors) {
      const totalH = Object.keys(tornHonors).length;
      const totalM = tornMedals ? Object.keys(tornMedals).length : 0;
      ctx += ` de ${totalH} honors y ${totalM} medals totales en el juego`;
      // List some unearned honors with descriptions so Claude can recommend
      const unearned = Object.entries(tornHonors)
        .filter(([id]) => !userHonorIds.includes(Number(id)))
        .filter(([, h]) => h.description)
        .slice(0, 20)
        .map(([id, h]) => `${h.name}: ${h.description}`)
        .join("; ");
      if (unearned) ctx += `. Algunos honors NO conseguidos: ${unearned}`;
    }
    ctx += `. IMPORTANTE: solo menciona honors y medals que existan realmente en Torn City. NO inventes honors basándote en personalstats`;

    // Merits invested
    if (data.merits) {
      const invested = Object.entries(data.merits).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(", ");
      if (invested) ctx += `. Merits invertidos: ${invested}`;
    }

    // Travel status
    if (traveling) ctx += `. Viajando a: ${travelDest} (${travelTime}s restantes)`;

    // Education
    if (data.education_current) ctx += `. Educación actual: curso ${data.education_current}`;

    return ctx;
  }, [data, name, level, age, bars, money, networth, ps, cooldowns, traveling, travelDest, travelTime]);

  // ─── PRIORITY ACTIONS ──────────────────────────────────────────────────────
  const priorityActions = [];

  if (bars.energy.current > 0) {
    priorityActions.push({
      icon: "🏋️",
      title: "Entrenar en el Gimnasio",
      description: `${bars.energy.current}E disponible. ${bars.energy.current >= bars.energy.max * 0.8 ? "¡Casi llena, date prisa!" : "Gástala con happy alto."}`,
      url: "https://www.torn.com/gym.php",
      urgent: bars.energy.current >= bars.energy.max * 0.8,
      color: T.accent,
    });
  }

  if (bars.nerve.current >= (recommendedCrime.nerve || 2)) {
    priorityActions.push({
      icon: "🔫",
      title: `Cometer ${recommendedCrime.name}`,
      description: `~${Math.floor(bars.nerve.current / (recommendedCrime.nerve || 1))} crímenes posibles (${bars.nerve.current}N)`,
      url: "https://www.torn.com/crimes.php",
      urgent: bars.nerve.current >= bars.nerve.max * 0.8,
      color: T.gold,
    });
  }

  if (cooldowns.drug === 0) {
    priorityActions.push({
      icon: "💊",
      title: "Tomar Xanax",
      description: "+250 energía extra. ¡Sin cooldown de drogas!",
      url: "https://www.torn.com/item.php",
      urgent: true,
      color: T.green,
    });
  }

  if (cooldowns.booster === 0) {
    priorityActions.push({
      icon: "💪",
      title: "Usar Booster de Energía",
      description: "FHC/SED dan +25E sin cooldown de drogas",
      url: "https://www.torn.com/item.php",
      urgent: false,
      color: T.purple,
    });
  }

  if (!traveling) {
    priorityActions.push({
      icon: "✈️",
      title: "Viaje al Extranjero",
      description: "Compra items baratos, vende caro en Torn",
      url: "https://www.torn.com/travelagency.php",
      urgent: false,
      color: T.purple,
    });
  }

  if (cooldowns.medical === 0 && bars.life.current < bars.life.max) {
    priorityActions.push({
      icon: "🏥",
      title: "Ir al Hospital",
      description: `Vida ${bars.life.current}/${bars.life.max}. ¡Cúrate!`,
      url: "https://www.torn.com/hospital.php",
      urgent: true,
      color: T.red,
    });
  }

  priorityActions.push({
    icon: "📋",
    title: "Completar Misiones",
    description: "Misiones diarias dan dinero y merits",
    url: "https://www.torn.com/missions.php",
    urgent: false,
    color: T.textDim,
  });

  priorityActions.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  const tabs = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "acciones", icon: "🎯", label: "Acciones" },
    { id: "gym", icon: "🏋️", label: "Gimnasio" },
    { id: "crimes", icon: "🔫", label: "Crímenes" },
    { id: "travel", icon: "✈️", label: "Viajes" },
    { id: "market", icon: "🏪", label: "Market" },
    { id: "stats", icon: "📈", label: "Stats" },
    { id: "targets", icon: "🎯", label: "Targets" },
    { id: "merits", icon: "🏅", label: "Merits" },
    { id: "checklist", icon: "✅", label: "Diario" },
    { id: "eggHunt", icon: "🥚", label: "Easter Eggs" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: T.text }}>
      {/* HEADER */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚔️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.accent, letterSpacing: -0.5 }}>TORN GROWTH</div>
            <div style={{ fontSize: 10, color: T.textDim }}>{name} • Lvl {level}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, animation: "pulse 1s infinite" }} />}
          <div style={{ fontSize: 10, color: T.textMuted }}>
            {lastUpdate ? `${lastUpdate.toLocaleTimeString()}` : ""}
          </div>
          <button
            onClick={() => fetchData(apiKey)}
            style={{ padding: "6px 12px", background: T.accentDim, border: `1px solid ${T.accent}44`, borderRadius: 6, color: T.accent, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
          >
            ↻
          </button>
          <button
            onClick={handleDisconnect}
            style={{ padding: "6px 12px", background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 6, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 2, padding: "8px 16px", background: T.card, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 14px",
              background: tab === t.id ? T.accentDim : "transparent",
              border: tab === t.id ? `1px solid ${T.accent}44` : "1px solid transparent",
              borderRadius: 6,
              color: tab === t.id ? T.accent : T.textDim,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: tab === t.id ? 700 : 400,
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
        {error && (
          <div style={{ background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 8, padding: 12, marginBottom: 16, color: T.red, fontSize: 12 }}>
            ⚠️ Error: {error}
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <>
            {/* Alerts */}
            {bars.energy.current >= bars.energy.max && (
              <div style={{ background: T.redDim, border: `1px solid ${T.red}66`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, animation: "pulse 2s infinite" }}>
                <span style={{ fontSize: 20 }}>🚨</span>
                <div>
                  <div style={{ color: T.red, fontWeight: 700, fontSize: 13 }}>¡ENERGÍA LLENA!</div>
                  <div style={{ color: T.text, fontSize: 11 }}>Estás desperdiciando energía. ¡Ve al gimnasio YA!</div>
                </div>
              </div>
            )}
            {bars.nerve.current >= bars.nerve.max && (
              <div style={{ background: T.goldDim, border: `1px solid ${T.gold}66`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ color: T.gold, fontWeight: 700, fontSize: 13 }}>¡NERVE LLENO!</div>
                  <div style={{ color: T.text, fontSize: 11 }}>Comete crímenes para no desperdiciar nerve.</div>
                </div>
              </div>
            )}
            {traveling && (
              <div style={{ background: T.purpleDim, border: `1px solid ${T.purple}66`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>✈️</span>
                <div>
                  <div style={{ color: T.purple, fontWeight: 700, fontSize: 13 }}>Viajando a {travelDest}</div>
                  <div style={{ color: T.text, fontSize: 11 }}>Llegas en {timeUntil(travelTime)}</div>
                </div>
              </div>
            )}

            {/* Bars */}
            <SectionHeader icon="📊" title="Barras de Recursos" badge="LIVE" />
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <ProgressBar value={bars.energy.current} max={bars.energy.max} color={T.accent} label="Energía" sublabel={`${bars.energy.current}/${bars.energy.max} • Llena en ${timeUntil(bars.energy.fulltime)}`} glow />
              <ProgressBar value={bars.nerve.current} max={bars.nerve.max} color={T.gold} label="Nerve" sublabel={`${bars.nerve.current}/${bars.nerve.max} • Lleno en ${timeUntil(bars.nerve.fulltime)}`} glow />
              <ProgressBar value={bars.happy.current} max={bars.happy.max} color={T.green} label="Happy" sublabel={`${bars.happy.current}/${bars.happy.max} • Lleno en ${timeUntil(bars.happy.fulltime)}`} glow />
              <ProgressBar value={bars.life.current} max={bars.life.max} color={T.red} label="Vida" sublabel={`${bars.life.current}/${bars.life.max}`} />
            </div>

            {/* Quick Stats */}
            <SectionHeader icon="💰" title="Resumen Rápido" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <StatCard icon="💵" title="Efectivo" value={`$${fmt(money)}`} color={T.green} />
              <StatCard icon="📈" title="Networth" value={`$${fmt(networth)}`} color={T.accent} />
              <StatCard icon="⚔️" title="Battle Stats" value={fmt(totalStats)} sub="Total combinado" color={T.gold} />
              <StatCard icon="🎯" title="Nivel" value={level} sub={name} color={T.purple} />
            </div>

            {/* Bank Investment */}
            {(() => {
              const bank = data?.city_bank;
              if (!bank || !bank.amount) return null;
              const timeLeft = bank.time_left ?? 0;
              return (
                <div style={{ background: T.card, border: `1px solid ${T.green}33`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>🏦 Banco de Torn</div>
                    {timeLeft > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.gold }}>{timeUntil(timeLeft)} restante</span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, color: T.textDim, marginBottom: 2 }}>INVERTIDO</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.green }}>${fmt(bank.amount)}</div>
                    </div>
                    <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, color: T.textDim, marginBottom: 2 }}>DURACIÓN</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                        {timeLeft <= 0 ? <span style={{ color: T.green }}>Listo para retirar!</span> : timeUntil(timeLeft)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stocks */}
            {(() => {
              const stocks = data?.stocks;
              if (!stocks || Object.keys(stocks).length === 0) return null;

              let totalInvested = 0;
              let totalValue = 0;
              const stockList = Object.entries(stocks).map(([key, s]) => {
                const sid = s.stock_id;
                const priceInfo = stockPrices[sid];
                const ticker = priceInfo?.acronym || `#${sid}`;
                const stockName = priceInfo?.name || ticker;
                const shares = s.total_shares || 0;
                // Sum invested from all transactions (bought_price is per share)
                let invested = 0;
                if (s.transactions) {
                  Object.values(s.transactions).forEach(tx => {
                    invested += (tx.bought_price || 0) * (tx.shares || 0);
                  });
                }
                const currentPricePerShare = priceInfo?.current_price || 0;
                const value = shares * currentPricePerShare;
                const profit = value - invested;
                const profitPct = invested > 0 ? ((profit / invested) * 100) : 0;
                totalInvested += invested;
                totalValue += value;
                return { id: key, sid, ticker, stockName, shares, invested, value, profit, profitPct, buyPrice: invested / (shares || 1), currentPrice: currentPricePerShare };
              }).filter(s => s.shares > 0);

              if (stockList.length === 0) return null;
              const totalProfit = totalValue - totalInvested;
              const totalProfitPct = totalInvested > 0 ? ((totalProfit / totalInvested) * 100) : 0;

              return (
                <div style={{ background: T.card, border: `1px solid ${T.accent}33`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 10 }}>📈 Stocks</div>

                  {/* Totals */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, color: T.textDim, marginBottom: 2 }}>INVERTIDO</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>${fmt(totalInvested)}</div>
                    </div>
                    <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, color: T.textDim, marginBottom: 2 }}>VALOR ACTUAL</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.accent }}>${fmt(totalValue)}</div>
                    </div>
                    <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, color: T.textDim, marginBottom: 2 }}>BENEFICIO</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: totalProfit >= 0 ? T.green : T.red }}>
                        {totalProfit >= 0 ? "+" : ""}${fmt(Math.abs(totalProfit))}
                      </div>
                      <div style={{ fontSize: 9, color: totalProfit >= 0 ? T.green : T.red }}>
                        {totalProfitPct >= 0 ? "+" : ""}{totalProfitPct.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Individual stocks */}
                  {stockList.map(s => (
                    <div key={s.id} style={{
                      padding: "10px 10px", borderBottom: `1px solid ${T.border}22`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: T.accent }}>{s.ticker}</span>
                          <span style={{ fontSize: 10, color: T.textDim }}>{s.stockName}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: s.profit >= 0 ? T.green : T.red }}>
                          {s.profit >= 0 ? "+" : ""}${fmt(Math.abs(s.profit))}
                          <span style={{ fontSize: 9, marginLeft: 4 }}>({s.profitPct >= 0 ? "+" : ""}{s.profitPct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textDim }}>
                        <span>{fmt(s.shares)} acciones · Compra: ${s.buyPrice.toFixed(2)}/acc</span>
                        <span>Actual: ${s.currentPrice.toFixed(2)}/acc</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textDim, marginTop: 2 }}>
                        <span>Invertido: ${fmt(s.invested)}</span>
                        <span>Valor: <span style={{ color: T.accent, fontWeight: 700 }}>${fmt(s.value)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Cooldowns */}
            <SectionHeader icon="⏱️" title="Cooldowns" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                { icon: "💊", title: "Drogas", time: cooldowns.drug, maxTime: 0 },
                { icon: "🏥", title: "Médico", time: cooldowns.medical, maxTime: 21600 },
                { icon: "💪", title: "Booster", time: cooldowns.booster, maxTime: 86400 },
              ].map(cd => {
                const hasMax = cd.maxTime > 0;
                const pctDone = hasMax ? ((cd.maxTime - cd.time) / cd.maxTime) * 100 : 0;
                return (
                  <div key={cd.title} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{cd.icon}</div>
                    <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{cd.title}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: cd.time > 0 ? T.red : T.green, margin: "4px 0" }}>
                      {cd.time > 0 ? timeUntil(cd.time) : "✅ Listo"}
                    </div>
                    {hasMax && (
                      <>
                        <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4 }}>/ {timeUntil(cd.maxTime)}</div>
                        <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pctDone}%`, background: cd.time > 0 ? T.gold : T.green, borderRadius: 2, transition: "width 1s" }} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Strategy */}
            <SectionHeader icon="🧠" title="Estrategia Actual" />
            <div style={{ background: T.card, border: `1px solid ${T.accent}33`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>
                🏠 Gym actual: <span style={{ color: T.accent, fontWeight: 700 }}>{gymStrategy.gymName}</span>
                {gymStrategy.gym && <span> • {gymStrategy.gym.energy}E/train • {gymStrategy.gym.tier}</span>}
              </div>
              <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginBottom: 4 }}>
                🏋️ {gymStrategy.focus === "balanced" ? "Rota todas las stats" : `Enfócate en ${gymStrategy.focus}`}
                {gymStrategy.ratioType && gymStrategy.ratioType !== "balanced" && (
                  <span style={{ fontSize: 10, background: T.purpleDim, color: T.purple, padding: "2px 6px", borderRadius: 4, marginLeft: 8 }}>
                    {gymStrategy.ratioType === "hank" ? "Hank's Ratio" : "Baldr's Ratio"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>{gymStrategy.reason}</div>
              {gymStrategy.tips?.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12, color: tip.color }}>
                  <span>{tip.icon}</span> <span>{tip.text}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ fontSize: 13, color: T.gold, fontWeight: 600, marginBottom: 8 }}>
                  🔫 Crimen recomendado: {recommendedCrime.name}
                </div>
                <div style={{ fontSize: 12, color: T.textDim }}>
                  Nerve: {recommendedCrime.nerve} • {recommendedCrime.note}
                </div>
              </div>
              {cooldowns.drug === 0 && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: T.greenDim, borderRadius: 6, fontSize: 12, color: T.green }}>
                  💊 ¡Puedes tomar Xanax para +250 energía extra! (si tienes happy alto, mejor)
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ ACCIONES TAB ═══ */}
        {tab === "acciones" && (
          <>
            <SectionHeader icon="🎯" title="Acciones Prioritarias" badge="AHORA" />
            <div style={{ marginBottom: 24 }}>
              {priorityActions.map((action, i) => (
                <a
                  key={i}
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: action.urgent ? `${action.color}15` : T.card,
                    border: `1px solid ${action.urgent ? action.color + "55" : T.border}`,
                    borderRadius: 10,
                    marginBottom: 8,
                    textDecoration: "none",
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: `${action.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {action.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: action.color }}>{action.title}</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{action.description}</div>
                  </div>
                  {action.urgent && (
                    <span style={{ fontSize: 9, background: action.color, color: T.bg, padding: "3px 8px", borderRadius: 4, fontWeight: 700, flexShrink: 0, textTransform: "uppercase" }}>
                      Urgente
                    </span>
                  )}
                  <span style={{ color: T.textMuted, fontSize: 16, flexShrink: 0 }}>→</span>
                </a>
              ))}
            </div>

            <SectionHeader icon="🔗" title="Links Rápidos a Torn" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
              {QUICK_LINKS.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    textDecoration: "none",
                    color: T.text,
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.2s",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{link.icon}</span>
                  {link.label}
                </a>
              ))}
            </div>

            <SectionHeader icon="💡" title="Orden Óptimo de Acciones Diarias" />
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              {[
                { step: 1, text: "Toma Ecstasy (+50 Happy) si tienes", color: T.purple },
                { step: 2, text: "Entrena en el gym con Happy alto", color: T.accent },
                { step: 3, text: "Toma Xanax (+250E) cuando se acabe la energía", color: T.green },
                { step: 4, text: "Entrena de nuevo con la energía del Xanax", color: T.accent },
                { step: 5, text: "Usa Energy Refill (donator) si tienes", color: T.gold },
                { step: 6, text: "Entrena una tercera vez", color: T.accent },
                { step: 7, text: "Comete crímenes hasta gastar todo el nerve", color: T.gold },
                { step: 8, text: "Haz un viaje al extranjero para ganar dinero", color: T.purple },
                { step: 9, text: "Ataca NPCs (Duke, Leslie, Jimmy) para loot", color: T.red },
                { step: 10, text: "Ayuda en chains de facción si están activos", color: T.textDim },
              ].map((item) => (
                <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: item.step < 10 ? `1px solid ${T.border}` : "none" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: `${item.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: item.color,
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <span style={{ fontSize: 12, color: T.text }}>{item.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ GYM TAB ═══ */}
        {tab === "gym" && (
          <>
            <SectionHeader icon="🏋️" title="Optimizador de Gimnasio" badge="STRATEGY" />

            {/* Current Gym Info */}
            <div style={{ background: `linear-gradient(135deg, ${T.card}, ${T.accentDim})`, border: `1px solid ${T.accent}44`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Gym Actual</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.accent }}>{gymStrategy.gymName}</div>
                  {gymStrategy.gym && (
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {gymStrategy.gym.energy}E por train • Tier: {gymStrategy.gym.tier}
                      {gymStrategy.ratioType && gymStrategy.ratioType !== "balanced" && (
                        <span style={{ marginLeft: 8, background: T.purpleDim, color: T.purple, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                          {gymStrategy.ratioType === "hank" ? "Hank's Ratio" : "Baldr's Ratio"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 36 }}>🏋️</div>
              </div>
              {gymStrategy.gym && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "STR", dots: gymStrategy.gym.str, color: T.red },
                    { label: "SPD", dots: gymStrategy.gym.spd, color: T.gold },
                    { label: "DEF", dots: gymStrategy.gym.def, color: T.accent },
                    { label: "DEX", dots: gymStrategy.gym.dex, color: T.green },
                  ].map((d) => (
                    <div key={d.label} style={{ textAlign: "center", padding: 6, background: d.dots > 0 ? `${d.color}15` : T.border + "44", borderRadius: 6, opacity: d.dots > 0 ? 1 : 0.3 }}>
                      <div style={{ fontSize: 10, color: T.textDim }}>{d.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: d.dots > 0 ? d.color : T.textMuted }}>{d.dots > 0 ? d.dots : "—"}</div>
                      <div style={{ fontSize: 9, color: T.textMuted }}>dots</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strategy Recommendation */}
            <div style={{ background: T.card, border: `1px solid ${T.gold}33`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 8 }}>
                🎯 Recomendación: {gymStrategy.focus === "balanced" ? "Rotar todas" : `Entrenar ${gymStrategy.focus}`}
              </div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 10, lineHeight: 1.6 }}>{gymStrategy.reason}</div>
              {gymStrategy.tips?.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 8px", marginBottom: 4, background: `${tip.color}10`, borderRadius: 6, fontSize: 12, color: tip.color }}>
                  <span style={{ flexShrink: 0 }}>{tip.icon}</span>
                  <span style={{ lineHeight: 1.5 }}>{tip.text}</span>
                </div>
              ))}
            </div>

            {/* Current Stats */}
            <SectionHeader icon="📊" title="Tus Stats" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { name: "Strength", key: "strength", val: battleStats.strength, icon: "💪", color: T.red, dots: gymStrategy.gym?.str },
                { name: "Speed", key: "speed", val: battleStats.speed, icon: "⚡", color: T.gold, dots: gymStrategy.gym?.spd },
                { name: "Dexterity", key: "dexterity", val: battleStats.dexterity, icon: "🎯", color: T.green, dots: gymStrategy.gym?.dex },
                { name: "Defense", key: "defense", val: battleStats.defense, icon: "🛡️", color: T.accent, dots: gymStrategy.gym?.def },
              ].map((s) => (
                <div
                  key={s.name}
                  style={{
                    background: gymStrategy.focus === s.key ? `${s.color}15` : T.card,
                    border: `1px solid ${gymStrategy.focus === s.key ? s.color + "66" : T.border}`,
                    borderRadius: 12,
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{s.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{fmt(s.val)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{totalStats > 0 ? ((s.val / totalStats) * 100).toFixed(1) : 0}%</div>
                  {s.dots != null && (
                    <div style={{ fontSize: 10, color: s.dots > 0 ? T.textDim : T.red, marginTop: 4 }}>
                      {s.dots > 0 ? `${s.dots} dots` : "No entrena aquí"}
                    </div>
                  )}
                  {gymStrategy.focus === s.key && (
                    <div style={{ marginTop: 6, fontSize: 10, color: s.color, fontWeight: 700, textTransform: "uppercase", background: `${s.color}20`, padding: "3px 8px", borderRadius: 4, display: "inline-block" }}>
                      ENTRENAR ESTO
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 2 }}>Total Battle Stats</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: T.accent, margin: "8px 0" }}>{fmt(totalStats)}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>
                Off: {fmt(battleStats.strength + battleStats.speed)} (Str+Spd) • Def: {fmt(battleStats.defense + battleStats.dexterity)} (Def+Dex)
              </div>
            </div>

            {/* Specialist Gyms Access */}
            {activeGymId && (
              <>
                <SectionHeader icon="⭐" title="Gyms Especializados" badge={activeGymId >= 24 ? `${gymStrategy.accessibleSpecialists?.length || 0} disponibles` : "PROGRESO"} />
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
                  {gymStrategy.specialists?.map((s, i) => {
                    const needsGeorges = [24, 25].includes(i + 24) ? activeGymId < 20 : activeGymId < 24;
                    const ratioOk = s.progress >= 100;
                    const fullyAvailable = s.accessible && !needsGeorges;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < gymStrategy.specialists.length - 1 ? `1px solid ${T.border}` : "none", background: fullyAvailable ? T.greenDim : "transparent" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: fullyAvailable ? T.green + "30" : ratioOk ? T.gold + "30" : T.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                          {fullyAvailable ? "✅" : ratioOk ? "📐" : "🔒"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: fullyAvailable ? T.green : ratioOk ? T.gold : T.text }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: T.textDim }}>
                            {s.gym.energy}E • {s.stats} • {s.gym.req}
                          </div>
                          {ratioOk && needsGeorges && (
                            <div style={{ fontSize: 10, color: T.gold, marginTop: 2 }}>
                              ✓ Ratio OK — necesitas desbloquear {i < 2 ? "Cha Cha's" : "George's"} primero
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: fullyAvailable ? T.green : ratioOk ? T.gold : s.progress > 80 ? T.gold : T.textDim }}>
                            {Math.min(s.progress, 100).toFixed(0)}%
                          </div>
                          {!ratioOk && (
                            <div style={{ width: 48, height: 4, background: T.border, borderRadius: 2, marginTop: 4 }}>
                              <div style={{ width: `${Math.min(s.progress, 100)}%`, height: "100%", background: s.progress > 80 ? T.gold : T.textMuted, borderRadius: 2 }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Tips */}
            <SectionHeader icon="💡" title="Tips de Crecimiento" />
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              {[
                { tip: "Happy alto = más stats por E. Toma Ecstasy (+50 Happy) antes de entrenar", icon: "😊" },
                { tip: "Xanax diario (+250E). Combina con Ecstasy para máximo rendimiento", icon: "💊" },
                { tip: "Boosters (FHC/SED) dan +25E sin cooldown de drogas", icon: "💪" },
                { tip: "Facción con Steadfast: hasta +10% gym gains", icon: "🏰" },
                { tip: "Sport Science (educación): +2% gains permanente", icon: "🎓" },
                { tip: "Propiedad con piscina: +2% gains", icon: "🏠" },
                { tip: "Job en Fitness Center 10★: +3% gains", icon: "💼" },
                { tip: "No pierdas 1 punto de E. Alarma cada ~2.5h", icon: "⏰" },
                { tip: "Happy Jumping: sube Happy al máximo, gasta toda la E. Efectivo hasta ~400K/stat", icon: "🚀" },
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 8 ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                  <span style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{t.tip}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ CRIMES TAB ═══ */}
        {tab === "crimes" && (
          <>
            <SectionHeader icon="🔫" title="Tracker de Crímenes" badge="PROFIT" />

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <ProgressBar value={bars.nerve.current} max={bars.nerve.max} color={T.gold} label="Nerve Actual" sublabel={`${bars.nerve.current}/${bars.nerve.max} • Lleno en ${timeUntil(bars.nerve.fulltime)}`} glow />
              <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: T.textDim }}>
                Puedes hacer ~{Math.floor(bars.nerve.current / (recommendedCrime.nerve || 1))} crímenes de {recommendedCrime.name}
              </div>
            </div>

            <SectionHeader icon="📋" title="Selecciona tu Crimen Actual" badge="CLICK PARA ELEGIR" />
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              {CRIME_GUIDE.map((c, i) => {
                const isSelected = c.nerve === recommendedCrime.nerve;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      const newVal = selectedCrime === c.nerve ? null : c.nerve;
                      setSelectedCrime(newVal);
                      if (newVal != null) {
                        localStorage.setItem("torn_selected_crime", String(newVal));
                      } else {
                        localStorage.removeItem("torn_selected_crime");
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: i < CRIME_GUIDE.length - 1 ? `1px solid ${T.border}` : "none",
                      background: isSelected ? T.goldDim : "transparent",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isSelected ? T.gold + "30" : T.border,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: isSelected ? T.gold : T.textDim,
                        flexShrink: 0,
                      }}
                    >
                      {c.nerve}N
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? T.gold : T.text }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: T.textDim }}>{c.phase} • {c.note}</div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: 10, background: T.gold, color: T.bg, padding: "3px 8px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                        ACTIVO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Criminal Record from API */}
            {data?.criminalrecord && (
              <>
                <SectionHeader icon="📊" title="Tu Historial Criminal" badge="API" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Venta Ilegal", key: "selling_illegal_products", icon: "💰" },
                    { label: "Robos", key: "theft", icon: "🔓" },
                    { label: "Robo de Autos", key: "auto_theft", icon: "🚗" },
                    { label: "Drogas", key: "drug_deals", icon: "💊" },
                    { label: "Crímenes Informáticos", key: "computer_crimes", icon: "💻" },
                    { label: "Asesinatos", key: "murder", icon: "💀" },
                    { label: "Fraude", key: "fraud_crimes", icon: "📄" },
                    { label: "Otros", key: "other", icon: "❓" },
                  ].map((cat) => (
                    <StatCard
                      key={cat.key}
                      icon={cat.icon}
                      title={cat.label}
                      value={fmt(data.criminalrecord[cat.key] ?? 0)}
                      color={data.criminalrecord[cat.key] > 0 ? T.gold : T.textMuted}
                    />
                  ))}
                </div>
                <div style={{ background: T.card, border: `1px solid ${T.gold}33`, borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 2 }}>Total Crímenes Cometidos</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: T.gold, margin: "8px 0" }}>{fmt(data.criminalrecord.total ?? 0)}</div>
                </div>
              </>
            )}

            <div style={{ marginTop: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 8 }}>💡 Pro Tips Crímenes</div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                • Siempre sube de crimen cuando tu éxito sea &gt;90% en el actual<br />
                • Los crímenes suben Criminal Offense → desbloquea mejores crímenes<br />
                • Nerve bar se llena cada 5 min por punto. No la dejes llena nunca<br />
                • Merits en crimes te dan +nerve máximo (muy valioso)<br />
                • Organized Crimes de facción dan XP masivo, priorízalos<br />
                • La API de Torn solo da totales por categoría, no éxitos vs fallos
              </div>
            </div>
          </>
        )}

        {/* ═══ TRAVEL TAB (ULTRA-OPTIMIZED) ═══ */}
        {tab === "travel" && (() => {
          const travelConfig = { ticketIndex: travelTicket, carrySlots: travelSlots, maxItemCost: travelMaxCost };
          const travelResults = calcTravelProfits(allItems, travelConfig, travelRealPrices, travelForeignStock, travelDroqsData);
          const bestRoute = travelResults[0];
          const ticketInfo = TICKET_TYPES[travelTicket] || TICKET_TYPES[0];

          return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionHeader icon="✈️" title="Centro de Viajes" badge="ULTRA PROFIT" />
              <a href="https://www.torn.com/page.php?sid=travel" target="_blank" rel="noreferrer"
                style={{
                  padding: "8px 16px", background: T.green, borderRadius: 8, textDecoration: "none",
                  color: T.bg, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                }}>
                VIAJAR YA
              </a>
            </div>

            {/* ── Price & Stock Refresh Bar ── */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={fetchTravelRealPrices}
                disabled={travelPriceLoading}
                style={{
                  flex: 1, padding: "10px", background: travelPriceLoading ? T.card : T.accentDim,
                  border: `1px solid ${travelPriceLoading ? T.border : T.accent + "55"}`,
                  borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: travelPriceLoading ? "wait" : "pointer",
                  fontFamily: "inherit", color: travelPriceLoading ? T.textMuted : T.accent,
                }}
              >
                {travelPriceLoading ? "Escaneando precios..." : travelLastPriceUpdate ? "Refrescar Precios" : "Escanear Precios (1 vez/día)"}
              </button>
              <button
                onClick={fetchForeignStock}
                disabled={travelStockLoading}
                style={{
                  flex: 1, padding: "10px", background: travelStockLoading ? T.card : T.purpleDim,
                  border: `1px solid ${travelStockLoading ? T.border : T.purple + "55"}`,
                  borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: travelStockLoading ? "wait" : "pointer",
                  fontFamily: "inherit", color: travelStockLoading ? T.textMuted : T.purple,
                }}
              >
                {travelStockLoading ? "Cargando stock..." : "Actualizar Stock Extranjero"}
              </button>
            </div>

            {/* ── Data Source Status ── */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 10 }}>
              <div style={{ flex: 1, padding: "6px 10px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, textAlign: "center" }}>
                <span style={{ color: T.textMuted }}>Precios: </span>
                <span style={{ color: travelLastPriceUpdate ? T.green : T.textMuted }}>
                  {travelLastPriceUpdate
                    ? `Real (Market) — ${new Date(travelLastPriceUpdate).toLocaleTimeString()}`
                    : Object.keys(travelRealPrices).length > 0 ? "Cargados" : "Estimados (market_value)"
                  }
                </span>
              </div>
              <div style={{ flex: 1, padding: "6px 10px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, textAlign: "center" }}>
                <span style={{ color: T.textMuted }}>Stock: </span>
                <span style={{ color: travelLastStockUpdate ? T.green : T.textMuted }}>
                  {travelLastStockUpdate
                    ? `YATA + DroqsDB — ${new Date(travelLastStockUpdate).toLocaleTimeString()}`
                    : "Sin datos (pulsa actualizar)"
                  }
                </span>
              </div>
            </div>

            {/* ── Flying Status ── */}
            {traveling && (
              <div style={{
                background: landingCountdown
                  ? `linear-gradient(135deg, ${T.greenDim}, ${T.card})`
                  : `linear-gradient(135deg, ${T.purpleDim}, ${T.card})`,
                border: `1px solid ${landingCountdown ? T.green : T.purple}66`,
                borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center",
                animation: landingCountdown ? "pulse 1s infinite" : "none",
              }}>
                <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.7 } }`}</style>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{landingCountdown ? "🛬" : "✈️"}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: landingCountdown ? T.green : T.purple }}>
                  {landingCountdown ? `¡ATERRIZANDO en ${travelDest}!` : `En vuelo a ${travelDest}`}
                </div>
                <div style={{ fontSize: landingCountdown ? 36 : 28, fontWeight: 800, color: landingCountdown ? T.green : T.text, margin: "8px 0" }}>
                  {landingCountdown ? `${landingCountdown}s` : timeUntil(travelTime)}
                </div>
                <div style={{ fontSize: 11, color: T.textDim }}>
                  {landingCountdown ? "Prepárate para comprar los items" : "Recuerda comprar los items más rentables al llegar"}
                </div>
              </div>
            )}

            {/* ── Data warnings ── */}
            {(!travelForeignStock || Object.keys(travelForeignStock).length === 0) && !travelStockLoading && (
              <div style={{ background: T.card, border: `1px solid ${T.gold}44`, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: T.gold, fontWeight: 600, marginBottom: 4 }}>Sin datos de stock</div>
                <div style={{ fontSize: 11, color: T.textDim }}>
                  Pulsa "Actualizar Stock Extranjero" para cargar items reales de YATA + DroqsDB.
                </div>
              </div>
            )}
            {travelForeignStock && Object.keys(travelForeignStock).length > 0 && !travelLastPriceUpdate && !travelPriceLoading && (
              <div style={{ background: T.card, border: `1px solid ${T.accent}33`, borderRadius: 8, padding: 10, marginBottom: 12, textAlign: "center", fontSize: 10, color: T.textDim }}>
                Precios basados en market_value (estimación). Pulsa "Escanear Precios" para precios exactos del Item Market.
              </div>
            )}

            {/* ── Best Route NOW (Hero Card) ── */}
            {bestRoute && bestRoute.totalProfit > 0 && !traveling && (
              <div style={{
                background: `linear-gradient(135deg, ${T.greenDim}, ${T.card})`,
                border: `1px solid ${T.green}66`, borderRadius: 12, padding: 20, marginBottom: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.green, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Mejor Ruta Ahora</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginTop: 4 }}>
                      {bestRoute.flag} {bestRoute.destination}
                    </div>
                  </div>
                  <a href="https://www.torn.com/travelagency.php" target="_blank" rel="noreferrer"
                    style={{
                      padding: "10px 20px", background: T.green, border: "none", borderRadius: 8,
                      color: T.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none",
                    }}>
                    VIAJAR YA
                  </a>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Beneficio/Viaje", value: `$${fmt(bestRoute.totalProfit)}`, color: T.green },
                    { label: "Beneficio/Hora", value: `$${fmt(bestRoute.profitPerHour)}`, color: T.gold },
                    { label: "Vuelo (ida)", value: `${bestRoute.oneWayMin}min`, color: T.accent },
                    { label: "Viajes/Día", value: `~${bestRoute.tripsPerDay}`, color: T.purple },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: T.textDim }}>
                  Comprar: {Object.values(bestRoute.bestCombo.reduce((acc, it) => {
                    const key = it.id;
                    acc[key] = acc[key] || { name: it.marketName || it.name, qty: 0 };
                    acc[key].qty++;
                    return acc;
                  }, {})).map(g => g.qty > 1 ? `${g.qty}x ${g.name}` : g.name).join(", ")}
                </div>
                {bestRoute.dailyProfit > 0 && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: T.bg + "88", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>Potencial diario (16h activo): </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.gold }}>${fmt(bestRoute.dailyProfit)}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Session Tracker ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Viajes Hoy", value: travelTripsToday, color: T.accent, icon: "✈️" },
                { label: "Ganancia Hoy", value: `$${fmt(travelEarningsToday)}`, color: T.green, icon: "💰" },
                { label: "Ticket Actual", value: ticketInfo.label, color: T.purple, icon: ticketInfo.icon },
              ].map(s => (
                <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Trip Counter Info ── */}
            {(
              <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
                <div style={{ flex: 1, fontSize: 11, color: T.textDim }}>
                  Los viajes se cuentan automáticamente al aterrizar
                </div>
                <button
                  onClick={() => {
                    setTravelTripsToday(0);
                    setTravelEarningsToday(0);
                    localStorage.setItem("torn_travel_trips", JSON.stringify({ date: new Date().toDateString(), count: 0 }));
                    localStorage.setItem("torn_travel_earnings", JSON.stringify({ date: new Date().toDateString(), amount: 0 }));
                  }}
                  style={{
                    padding: "8px 14px", background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: T.textMuted,
                  }}
                >
                  Reset contador
                </button>
              </div>
            )}

            {/* ── Travel Config Panel ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 12 }}>Configuración de Viaje</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Coste máximo por item (filtra armas caras)</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { label: "Sin límite", value: 0 },
                    { label: "$10K", value: 10000 },
                    { label: "$50K", value: 50000 },
                    { label: "$100K", value: 100000 },
                    { label: "$500K", value: 500000 },
                    { label: "$1M", value: 1000000 },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setTravelMaxCost(opt.value); localStorage.setItem("torn_travel_maxcost", opt.value); }}
                      style={{
                        padding: "6px 10px",
                        background: travelMaxCost === opt.value ? T.accent : T.bg,
                        border: `1px solid ${travelMaxCost === opt.value ? T.accent : T.border}`,
                        borderRadius: 6, fontSize: 11, fontWeight: travelMaxCost === opt.value ? 700 : 400,
                        color: travelMaxCost === opt.value ? T.bg : T.textDim, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tipo de Ticket</div>
                  <select
                    value={travelTicket}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      setTravelTicket(v);
                      localStorage.setItem("torn_travel_ticket", v);
                      // Auto-set capacity based on ticket type
                      const cap = TICKET_TYPES[v]?.capacity || 5;
                      setTravelSlots(cap);
                      localStorage.setItem("torn_travel_slots", cap);
                    }}
                    style={{
                      width: "100%", padding: "8px 10px", background: T.bg, border: `1px solid ${T.border}`,
                      borderRadius: 8, color: T.text, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    {TICKET_TYPES.map((tt, i) => (
                      <option key={i} value={i}>{tt.icon} {tt.label} — {tt.capacity} items — {tt.desc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Slots de Carga</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {[3, 4, 5, 6, 7, 8, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          setTravelSlots(n);
                          localStorage.setItem("torn_travel_slots", n);
                        }}
                        style={{
                          padding: "6px 10px",
                          background: travelSlots === n ? T.accent : T.bg,
                          border: `1px solid ${travelSlots === n ? T.accent : T.border}`,
                          borderRadius: 6, fontSize: 12, fontWeight: travelSlots === n ? 700 : 400,
                          color: travelSlots === n ? T.bg : T.textDim, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >{n}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Ranking de Destinos (sorted by profit/hour) ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>Ranking de Destinos ($/hora)</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>Clic en un país para ver sus items</div>
              </div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "30px 2fr 1fr 1fr 1.2fr 1.2fr", padding: "8px 16px", borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                {["#", "Destino", "Vuelo", "$/Viaje", "$/Hora", "$/Día"].map(h => (
                  <div key={h} style={{ fontSize: 9, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {travelResults.map((dest, i) => {
                const isTop = i === 0;
                const hasProfit = dest.totalProfit > 0;
                const isExpanded = travelExpandedCountries.has(dest.destination);
                return (
                  <div key={dest.destination}>
                    <div
                      onClick={() => setTravelExpandedCountries(prev => {
                        const next = new Set(prev);
                        next.has(dest.destination) ? next.delete(dest.destination) : next.add(dest.destination);
                        return next;
                      })}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "30px 2fr 1fr 1fr 1.2fr 1.2fr",
                        padding: "10px 16px",
                        borderBottom: `1px solid ${T.border}`,
                        gap: 8,
                        alignItems: "center",
                        background: isTop ? T.greenDim : isExpanded ? T.bg + "88" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: isTop ? T.green : T.textMuted }}>
                        {isTop ? "👑" : `${i + 1}`}
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                          <span style={{ fontSize: 10, color: T.textMuted, marginRight: 4 }}>{isExpanded ? "▼" : "▶"}</span>
                          {dest.flag} {dest.destination}
                        </span>
                        {dest.hasStockData && dest.outOfStockCount > 0 && (
                          <span style={{ fontSize: 9, color: T.red, marginLeft: 6, fontWeight: 600 }}>
                            {dest.outOfStockCount} agotado{dest.outOfStockCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {dest.hasStockData && dest.outOfStockCount === 0 && (
                          <span style={{ fontSize: 9, color: T.green, marginLeft: 6 }}>EN STOCK</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: T.textDim }}>{dest.oneWayMin}m <span style={{ fontSize: 9, color: T.textMuted }}>({dest.roundTripMin}m i/v)</span></div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: hasProfit ? T.green : T.textMuted }}>
                        {hasProfit ? `$${fmt(dest.totalProfit)}` : "N/A"}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: hasProfit ? T.gold : T.textMuted }}>
                        {hasProfit ? `$${fmt(dest.profitPerHour)}` : "N/A"}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: hasProfit ? T.accent : T.textMuted }}>
                        {hasProfit ? `$${fmt(dest.dailyProfit)}` : "N/A"}
                      </div>
                    </div>
                    {/* Expanded item details with stock + real prices + restock */}
                    {isExpanded && (
                      <div style={{ padding: "8px 16px 12px 46px", borderBottom: `1px solid ${T.border}`, background: T.bg + "44" }}>
                        {/* Column headers */}
                        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr", gap: 6, padding: "2px 0 6px", borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                          {["Item", "Compra", "Venta", "Beneficio", "Stock", "Restock"].map(h => (
                            <div key={h} style={{ fontSize: 9, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
                          ))}
                        </div>
                        {dest.allDestItems.map((it, j) => {
                          const comboQty = dest.bestCombo.filter(c => c.id === it.id).length;
                          const inCombo = comboQty > 0;
                          const outOfStock = it.abroadStock === 0 && !it.willBeInStock;
                          return (
                            <div key={j} style={{
                              display: "grid", gridTemplateColumns: "2.2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr",
                              gap: 6, padding: "4px 0", fontSize: 11, alignItems: "center",
                              opacity: outOfStock ? 0.35 : 1,
                            }}>
                              <div style={{ color: inCombo ? T.text : T.textMuted }}>
                                {inCombo ? `✓${comboQty > 1 ? `x${comboQty}` : ""} ` : "  "}
                                {it.type === "plushie" ? "🧸 " : it.type === "flower" ? "🌸 " : "📦 "}
                                {it.marketName || it.name}
                              </div>
                              <div style={{ color: T.textMuted }}>
                                ${fmt(it.abroadCost)}
                              </div>
                              <div>
                                <span style={{ color: T.textDim }}>${fmt(it.sellPrice)}</span>
                                {it.priceSource === "market" && <span style={{ fontSize: 8, color: T.green, marginLeft: 2 }}>REAL</span>}
                                {it.priceSource === "droqsdb" && <span style={{ fontSize: 8, color: T.accent, marginLeft: 2 }}>DB</span>}
                              </div>
                              <div style={{ color: it.profit > 0 ? T.green : T.red, fontWeight: 600 }}>
                                {it.profit > 0 ? "+" : ""}${fmt(it.profit)}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 600 }}>
                                {it.abroadStock > 0
                                  ? <span style={{ color: T.green }}>{it.abroadStock}</span>
                                  : it.willBeInStock
                                    ? <span style={{ color: T.gold }}>RESTOCK</span>
                                    : <span style={{ color: T.red }}>AGOTADO</span>
                                }
                              </div>
                              <div style={{ fontSize: 10, color: T.textMuted }}>
                                {it.abroadStock > 0
                                  ? <span>en stock</span>
                                  : it.restockMin !== null
                                    ? <span style={{ color: it.willBeInStock ? T.gold : T.accent, fontWeight: 600 }}>
                                        ~{it.restockMin}m {it.willBeInStock ? "✓ al llegar" : ""}
                                      </span>
                                    : <span style={{ color: T.red, fontSize: 9 }}>sin dato</span>
                                }
                              </div>
                            </div>
                          );
                        })}
                        {dest.yataUpdate && (
                          <div style={{ fontSize: 9, color: T.textMuted, marginTop: 6, textAlign: "right" }}>
                            Stock actualizado: {new Date(dest.yataUpdate * 1000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Duke Trade Optimizer ── */}
            <div style={{ background: T.card, border: `1px solid ${T.gold}33`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.gold, marginBottom: 10 }}>Mr. Duke - Plushie & Flower Trade</div>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12, lineHeight: 1.6 }}>
                Entrega sets de 10 Plushies y 10 Flowers a Duke por recompensas masivas + merits.
                Cada set completado te da dinero + puntos de merit. Los Plushies y Flowers se compran baratos en el extranjero.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: T.bg, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: T.purple, fontWeight: 600, marginBottom: 8 }}>🧸 Plushies por Destino</div>
                  {travelResults.map(d => {
                    const plushies = d.allDestItems.filter(it => it.type === "plushie");
                    if (plushies.length === 0) return null;
                    return plushies.map(p => (
                      <div key={`${d.destination}-${p.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
                        <span style={{ color: T.textDim }}>{d.flag} {p.marketName}</span>
                        <span style={{ display: "flex", gap: 8 }}>
                          {p.abroadStock !== undefined && <span style={{ color: p.abroadStock > 0 ? T.green : T.red }}>{p.abroadStock > 0 ? p.abroadStock : "0"}</span>}
                          <span style={{ color: p.sellPrice > 0 ? T.green : T.textMuted }}>${fmt(p.sellPrice)}</span>
                        </span>
                      </div>
                    ));
                  })}
                </div>
                <div style={{ background: T.bg, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: T.purple, fontWeight: 600, marginBottom: 8 }}>🌸 Flowers por Destino</div>
                  {travelResults.map(d => {
                    const flowers = d.allDestItems.filter(it => it.type === "flower");
                    if (flowers.length === 0) return null;
                    return flowers.map(f => (
                      <div key={`${d.destination}-${f.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
                        <span style={{ color: T.textDim }}>{d.flag} {f.marketName}</span>
                        <span style={{ display: "flex", gap: 8 }}>
                          {f.abroadStock !== undefined && <span style={{ color: f.abroadStock > 0 ? T.green : T.red }}>{f.abroadStock > 0 ? f.abroadStock : "0"}</span>}
                          <span style={{ color: f.sellPrice > 0 ? T.green : T.textMuted }}>${fmt(f.sellPrice)}</span>
                        </span>
                      </div>
                    ));
                  })}
                </div>
              </div>
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <a href="https://www.torn.com/page.php?sid=missions" target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: T.gold, textDecoration: "none", fontWeight: 600 }}>
                  Ir a Duke Missions →
                </a>
              </div>
            </div>

            {/* ── Pro Strategy Guide (verified from Torn wiki + forums) ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 10 }}>Guía de Viajes (fuentes: wiki.torn.com + foros)</div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.8 }}>
                <span style={{ color: T.gold, fontWeight: 700 }}>QUÉ COMPRAR:</span><br />
                • Plushies y Flowers son los items más rentables en casi todos los destinos<br />
                • Colecciona sets completos (1 de cada plushie/flower) para el Museo → 10 Points por set (11 en Museum Day)<br />
                • Argentina es un destino muy recomendado: Monkey Plushie + Ceibo Flower + Tear Gas, vuelo corto<br />
                • Otros items rentables: armas temporales, drogas (Xanax en Sudáfrica/Canadá)<br />
                <br />
                <span style={{ color: T.accent, fontWeight: 700 }}>OPCIONES DE VUELO:</span><br />
                • Standard: gratis, 5 items de capacidad base<br />
                • Airstrip: Isla Privada + Airstrip + Piloto → 30% más rápido, 15 items, vuelo gratis<br />
                • Private: 9M acciones de WLT stock → 50% más rápido, 15 items<br />
                • Business Class Ticket: item consumible → 70% más rápido, 15 items<br />
                <br />
                <span style={{ color: T.green, fontWeight: 700 }}>AUMENTAR CAPACIDAD (máx 34 items sin eventos):</span><br />
                • Base: 5 items (Standard) o 15 items (Airstrip/Private/Business)<br />
                • Large Suitcase: +4 items (comprar en Hawaii o Item Market, $10M)<br />
                • Excursion (perk de facción): +1 item por upgrade, máx +10<br />
                • Job specials: Lingerie Store 3★ (+2), Cruise Line 3★/10★ (+2/+3)<br />
                • Libro "Smuggling For Beginners": +10 items por 31 días<br />
                • Tourism Day (27 sept): duplica capacidad<br />
                <br />
                <span style={{ color: T.purple, fontWeight: 700 }}>DÓNDE VENDER:</span><br />
                • Bazaar propio: sin comisión<br />
                • Item Market: 3% comisión al listar<br />
                • Traders directos: sin comisión, venta privada<br />
                • Museo: sets completos de plushies/flowers → Points (necesitas Bachelor of History)<br />
                <br />
                <span style={{ color: T.textMuted, fontWeight: 700 }}>LINKS:</span><br />
                <a href="https://www.torn.com/page.php?sid=travel" target="_blank" rel="noreferrer" style={{ color: T.accent }}>Travel Agency</a>
                {" | "}
                <a href="https://www.torn.com/bazaar.php" target="_blank" rel="noreferrer" style={{ color: T.accent }}>Mi Bazaar</a>
                {" | "}
                <a href="https://www.torn.com/museum.php" target="_blank" rel="noreferrer" style={{ color: T.accent }}>Museo</a>
                {" | "}
                <a href="https://www.torn.com/page.php?sid=ItemMarket" target="_blank" rel="noreferrer" style={{ color: T.accent }}>Item Market</a>
                {" | "}
                <a href="https://yata.yt/bazaar/abroad/" target="_blank" rel="noreferrer" style={{ color: T.accent }}>YATA Stock</a>
                {" | "}
                <a href="https://droqsdb.com/" target="_blank" rel="noreferrer" style={{ color: T.accent }}>DroqsDB</a>
                {" | "}
                <a href="https://tornstats.com/travel" target="_blank" rel="noreferrer" style={{ color: T.accent }}>TornStats</a>
                {" | "}
                <a href="https://www.torntravel.com/" target="_blank" rel="noreferrer" style={{ color: T.accent }}>Travel Planner</a>
              </div>
            </div>
          </>
          );
        })()}

        {/* ═══ MARKET TAB ═══ */}
        {tab === "market" && (
          <>
            <SectionHeader icon="🏪" title="Market Scanner" badge={scanning ? "SCANNING" : "MANUAL"} />

            {/* Status bar */}
            <div style={{
              background: scanPaused ? T.goldDim : scanning ? T.accentDim : T.card,
              border: `1px solid ${scanPaused ? T.gold + "44" : scanning ? T.accent + "44" : T.border}`,
              borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, textAlign: "center",
              color: scanPaused ? T.gold : scanning ? T.accent : T.textDim,
            }}>
              {scanPaused
                ? `⏸️ PAUSADO — ${marketDeals.length} deals guardados`
                : scanning
                  ? `🔄 Escaneando: ${scanProgress}`
                  : marketDeals.length > 0
                    ? `⏹ Detenido — ${marketDeals.length} deals encontrados`
                    : "⏹ Pulsa Start para escanear el mercado"
              }
            </div>

            {/* Controls */}
            {allItems && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => {
                    if (!scanning) { startMarketScan(); }
                    else { stopMarketScan(); }
                  }}
                  style={{
                    flex: 1, padding: "10px",
                    background: scanning ? T.redDim : T.greenDim,
                    border: `1px solid ${scanning ? T.red + "55" : T.green + "55"}`,
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", color: scanning ? T.red : T.green,
                  }}
                >
                  {scanning ? "⏹ Stop" : "▶ Start"}
                </button>
                {scanning && (
                <button
                  onClick={() => { scanPausedRef.current = !scanPaused; setScanPaused(!scanPaused); }}
                  style={{
                    flex: 1, padding: "10px",
                    background: scanPaused ? T.greenDim : T.goldDim,
                    border: `1px solid ${scanPaused ? T.green + "55" : T.gold + "55"}`,
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", color: scanPaused ? T.green : T.gold,
                  }}
                >
                  {scanPaused ? "▶ Reanudar" : "⏸ Pausar"}
                </button>
                )}
                <button
                  onClick={() => { marketResultsRef.current = []; setMarketDeals([]); }}
                  style={{
                    flex: 1, padding: "10px",
                    background: T.redDim, border: `1px solid ${T.red}55`,
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", color: T.red,
                  }}
                >
                  🗑 Limpiar
                </button>
                <button
                  onClick={() => { scanPausedRef.current = false; setScanPaused(false); marketResultsRef.current = []; setMarketDeals([]); }}
                  style={{
                    flex: 1, padding: "10px",
                    background: T.accentDim, border: `1px solid ${T.accent}55`,
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", color: T.accent,
                  }}
                >
                  🔄 Reiniciar
                </button>
              </div>
            )}

            {/* Price filter */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>Precio mínimo:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {[
                  { label: "Sin mín", value: 0 },
                  { label: "≥ $1K", value: 1000 },
                  { label: "≥ $10K", value: 10000 },
                  { label: "≥ $50K", value: 50000 },
                  { label: "≥ $100K", value: 100000 },
                  { label: "≥ $500K", value: 500000 },
                  { label: "≥ $1M", value: 1000000 },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setMarketMinPrice(f.value); marketMinPriceRef.current = f.value; }}
                    style={{
                      padding: "5px 12px",
                      background: marketMinPrice === f.value ? T.accentDim : "transparent",
                      border: `1px solid ${marketMinPrice === f.value ? T.accent + "66" : T.border}`,
                      borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                      color: marketMinPrice === f.value ? T.accent : T.textDim,
                      fontWeight: marketMinPrice === f.value ? 700 : 400,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>Precio máximo:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: "Sin máx", value: 0 },
                  { label: "≤ $50K", value: 50000 },
                  { label: "≤ $100K", value: 100000 },
                  { label: "≤ $250K", value: 250000 },
                  { label: "≤ $500K", value: 500000 },
                  { label: "≤ $1M", value: 1000000 },
                  { label: "≤ $5M", value: 5000000 },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setMarketMaxPrice(f.value); marketMaxPriceRef.current = f.value; }}
                    style={{
                      padding: "5px 12px",
                      background: marketMaxPrice === f.value ? T.goldDim : "transparent",
                      border: `1px solid ${marketMaxPrice === f.value ? T.gold + "66" : T.border}`,
                      borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                      color: marketMaxPrice === f.value ? T.gold : T.textDim,
                      fontWeight: marketMaxPrice === f.value ? 700 : 400,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deals list */}
            {marketDeals.filter(d => (marketMaxPrice === 0 || d.cheapestPrice <= marketMaxPrice) && (marketMinPrice === 0 || d.cheapestPrice >= marketMinPrice)).length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 0.8fr", padding: "10px 16px", borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                  {["Item", "Tipo", "Más Barato", "Precio Medio", "Ahorro"].map((h) => (
                    <div key={h} style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
                  ))}
                </div>
                {marketDeals.filter(d => (marketMaxPrice === 0 || d.cheapestPrice <= marketMaxPrice) && (marketMinPrice === 0 || d.cheapestPrice >= marketMinPrice)).map((deal, i, filtered) => {
                  const isDeal = deal.discount > 15;
                  const isBigDeal = deal.discount > 30;
                  return (
                    <a
                      key={deal.id}
                      href={`https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${deal.id}&sortField=price&sortOrder=ASC`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 0.8fr",
                        padding: "12px 16px",
                        borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                        gap: 8, alignItems: "center",
                        background: isBigDeal ? T.greenDim : isDeal ? `${T.gold}08` : "transparent",
                        textDecoration: "none", cursor: "pointer",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isBigDeal ? T.green : isDeal ? T.gold : T.text }}>
                          {deal.name} <span style={{ fontSize: 10, color: T.textMuted }}>→</span>
                        </div>
                        <div style={{ fontSize: 10, color: T.textMuted }}>{deal.totalListings} listings • x{deal.cheapestQty}</div>
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{deal.type}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isBigDeal ? T.green : isDeal ? T.gold : T.text }}>${fmt(deal.cheapestPrice)}</div>
                      <div style={{ fontSize: 12, color: T.textDim }}>${fmt(deal.avgBazaarPrice)}</div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textAlign: "center",
                        color: isBigDeal ? T.green : isDeal ? T.gold : T.textDim,
                        background: isBigDeal ? T.greenDim : isDeal ? T.goldDim : "transparent",
                        padding: "2px 6px", borderRadius: 4,
                      }}>
                        -{deal.discount}%
                      </span>
                    </a>
                  );
                })}
              </div>
            )}

            {!scanning && marketDeals.length === 0 && allItems && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 12, color: T.textDim }}>No hay deals ahora. Se sigue escaneando automáticamente...</div>
              </div>
            )}

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 8 }}>💡 Info</div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                • Escanea <span style={{ color: T.text }}>todas las categorías</span> automáticamente en bucle<br />
                • <span style={{ color: T.green, fontWeight: 600 }}>Verde (-30%+)</span> = Deal increíble, compra ya<br />
                • <span style={{ color: T.gold, fontWeight: 600 }}>Dorado (-15%+)</span> = Buen precio, rentable<br />
                • Suena alerta cuando aparece un deal bueno<br />
                • Click en cualquier item para ir directo a comprarlo
              </div>
            </div>
          </>
        )}

        {/* ═══ STATS TAB ═══ */}
        {tab === "stats" && (
          <>
            <SectionHeader icon="📈" title="Estadísticas Personales" badge="LIFETIME" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <StatCard icon="⚔️" title="Ataques Ganados" value={fmt(ps.attackswon ?? 0)} sub={`Perdidos: ${fmt(ps.attackslost ?? 0)}`} color={T.green} />
              <StatCard icon="🛡️" title="Defensas Ganadas" value={fmt(ps.defendswon ?? 0)} sub={`Perdidas: ${fmt(ps.defendslost ?? 0)}`} color={T.accent} />
              <StatCard icon="🔫" title="Crímenes Totales" value={fmt(ps.criminaloffenses ?? 0)} color={T.gold} />
              <StatCard icon="💊" title="Xanax Tomados" value={fmt(ps.xantaken ?? 0)} color={T.purple} />
              <StatCard icon="🌈" title="Ecstasy Tomados" value={fmt(ps.exttaken ?? 0)} color={T.red} />
              <StatCard icon="🍄" title="LSD Tomados" value={fmt(ps.lsdtaken ?? 0)} color={T.gold} />
              <StatCard icon="🏋️" title="Veces Entrenado" value={fmt(ps.trainsreceived ?? 0)} color={T.accent} />
              <StatCard icon="✈️" title="Viajes Hechos" value={fmt(ps.traveltimes ?? 0)} color={T.purple} />
              <StatCard icon="🎲" title="Bounties Cobrados" value={fmt(ps.bountiescollected ?? 0)} color={T.green} />
              <StatCard icon="📦" title="Items Saqueados" value={fmt(ps.itemslooted ?? 0)} color={T.gold} />
            </div>

            {(ps.refills != null || ps.nerverefills != null || ps.energydrinkused != null) && (
              <>
                <SectionHeader icon="🔄" title="Consumibles Usados" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <StatCard icon="⚡" title="Energy Refills" value={fmt(ps.refills ?? 0)} color={T.accent} />
                  <StatCard icon="🧠" title="Nerve Refills" value={fmt(ps.nerverefills ?? 0)} color={T.gold} />
                  <StatCard icon="🥤" title="Energy Drinks" value={fmt(ps.energydrinkused ?? 0)} color={T.green} />
                </div>
              </>
            )}

            <SectionHeader icon="💰" title="Dinero" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <StatCard icon="💵" title="Dinero de Mugging" value={`$${fmt(ps.moneymugged ?? 0)}`} color={T.green} />
              <StatCard icon="🏆" title="Bounties Pagados" value={`$${fmt(ps.bountiesplaced ?? 0)}`} color={T.red} />
            </div>
          </>
        )}

        {/* ═══ TARGETS TAB ═══ */}
        {tab === "targets" && (
          <>
            <SectionHeader icon="🎯" title="Buscador de Targets" badge="INACTIVOS" />

            {/* Level filter + controls */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 10, fontWeight: 600 }}>Nivel máximo del target:</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[5, 10, 15, 20, 30, 50].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setTargetMaxLevel(lvl)}
                    style={{
                      padding: "6px 16px",
                      background: targetMaxLevel === lvl ? T.accentDim : "transparent",
                      border: `1px solid ${targetMaxLevel === lvl ? T.accent + "66" : T.border}`,
                      borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      color: targetMaxLevel === lvl ? T.accent : T.textDim,
                      fontWeight: targetMaxLevel === lvl ? 700 : 400,
                    }}
                  >
                    ≤ {lvl}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {!targetScanning && !targetPaused && (
                  <button
                    onClick={() => scanTargets(apiKey, targetMaxLevel)}
                    style={{
                      flex: 1, padding: "10px", background: `linear-gradient(135deg, ${T.green}, #059669)`,
                      border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit", color: T.bg,
                    }}
                  >
                    ▶ Buscar Targets
                  </button>
                )}
                {(targetScanning || targetPaused) && (
                  <button
                    onClick={() => { targetPausedRef.current = !targetPaused; setTargetPaused(!targetPaused); }}
                    style={{
                      flex: 1, padding: "10px",
                      background: targetPaused ? T.greenDim : T.goldDim,
                      border: `1px solid ${targetPaused ? T.green + "55" : T.gold + "55"}`,
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", color: targetPaused ? T.green : T.gold,
                    }}
                  >
                    {targetPaused ? "▶ Reanudar" : "⏸ Pausar"}
                  </button>
                )}
                {(targetScanning || targetPaused) && (
                  <button
                    onClick={() => { targetActiveRef.current = false; targetPausedRef.current = false; setTargetPaused(false); setTargetScanning(false); }}
                    style={{
                      padding: "10px 16px", background: T.redDim, border: `1px solid ${T.red}55`,
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", color: T.red,
                    }}
                  >
                    ⏹ Parar
                  </button>
                )}
                <button
                  onClick={() => { setTargets([]); setTargetScanned(0); }}
                  style={{
                    padding: "10px 16px", background: T.redDim, border: `1px solid ${T.red}55`,
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", color: T.red,
                  }}
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Status */}
            <div style={{
              background: targetPaused ? T.goldDim : targetScanning ? T.accentDim : T.card,
              border: `1px solid ${targetPaused ? T.gold + "44" : targetScanning ? T.accent + "44" : T.border}`,
              borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 12, textAlign: "center",
              color: targetPaused ? T.gold : targetScanning ? T.accent : T.textDim,
            }}>
              {targetPaused
                ? `⏸️ Pausado — ${targets.length} targets encontrados (${targetScanned} escaneados)`
                : targetScanning
                  ? `🔄 ${targetProgress} — ${targets.length} targets (${targetScanned} escaneados)`
                  : targets.length > 0
                    ? `${targets.length} targets encontrados de ${targetScanned} escaneados`
                    : "Dale a Buscar para escanear jugadores inactivos"
              }
            </div>

            {/* Target list */}
            {targets.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 0.8fr 1.5fr 0.5fr", padding: "10px 16px", borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                  {["Jugador", "Nivel", "Vida", "Inactivo", ""].map((h) => (
                    <div key={h} style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
                  ))}
                </div>
                {targets.map((t, i) => (
                  <a
                    key={t.id}
                    href={`https://www.torn.com/loader.php?sid=attack&user2ID=${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "grid", gridTemplateColumns: "2fr 0.7fr 0.8fr 1.5fr 0.5fr",
                      padding: "12px 16px", gap: 8, alignItems: "center",
                      borderBottom: i < targets.length - 1 ? `1px solid ${T.border}` : "none",
                      textDecoration: "none", cursor: "pointer",
                      background: t.level <= 3 ? T.greenDim : "transparent",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {t.name} <span style={{ fontSize: 10, color: T.textMuted }}>[{t.id}]</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.level <= 5 ? T.green : t.level <= 15 ? T.gold : T.text }}>
                      {t.level}
                    </div>
                    <div style={{ fontSize: 11, color: T.textDim }}>
                      {t.life}/{t.lifeMax}
                    </div>
                    <div style={{ fontSize: 11, color: T.red }}>
                      {t.lastAction}
                    </div>
                    <div style={{ fontSize: 14, textAlign: "center" }}>⚔️</div>
                  </a>
                ))}
              </div>
            )}

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 8 }}>💡 Info</div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                • Escanea IDs aleatorios buscando jugadores inactivos (&gt;60 días)<br />
                • Solo muestra los que están <span style={{ color: T.green }}>disponibles</span> (no hospital, no jail)<br />
                • Click en cualquier target para ir directo a atacar<br />
                • <span style={{ color: T.green }}>Verde</span> = nivel muy bajo, fácil de ganar<br />
                • Los IDs bajos (cuentas antiguas) tienen más probabilidad de estar inactivos
              </div>
            </div>
          </>
        )}

        {/* ═══ MERITS & HONORS TAB ═══ */}
        {tab === "merits" && (() => {
          // Use REAL Torn API data
          const userHonors = data?.honors_awarded || [];
          const userMedals = data?.medals_awarded || [];

          // Build real honors list from API
          const allRealHonors = tornHonors ? Object.entries(tornHonors).map(([id, h]) => ({
            id: Number(id),
            name: h.name,
            description: h.description || "",
            type: h.type,
            rarity: h.rarity || "",
            circulation: h.circulation || 0,
            awarded: userHonors.includes(Number(id)),
          })) : [];

          // Build real medals list from API
          const allRealMedals = tornMedals ? Object.entries(tornMedals).map(([id, m]) => ({
            id: Number(id),
            name: m.name,
            description: m.description || "",
            type: m.type,
            rarity: m.rarity || "",
            circulation: m.circulation || 0,
            awarded: userMedals.includes(Number(id)),
          })) : [];

          // Also keep personalstats-based progress for honors/medals we can track
          const psProgress = calcAllProgress(ps, networth, level, age);

          const totalHonors = allRealHonors.length || HONORS_DB.length;
          const totalMedals = allRealMedals.length || MEDALS_DB.length;
          const honorsAwarded = allRealHonors.length > 0 ? allRealHonors.filter(h => h.awarded).length : userHonors.length;
          const medalsAwarded = allRealMedals.length > 0 ? allRealMedals.filter(m => m.awarded).length : userMedals.length;

          // Categorize honors by their Torn type/category
          const HONOR_CATEGORIES = {
            1: "Attacking", 2: "Defending", 3: "Crimes", 4: "Drugs", 5: "Gym",
            6: "Items", 7: "Travel", 8: "Work", 9: "Education", 10: "Money",
            11: "Jail", 12: "Hospital", 13: "Casino", 14: "Missions", 15: "Racing",
            16: "Misc", 17: "Commitment", 18: "Weapons", 19: "Camo", 20: "Competitions",
          };

          // Group honors by type
          const honorsByType = {};
          allRealHonors.forEach(h => {
            const cat = HONOR_CATEGORIES[h.type] || `Type ${h.type}`;
            if (!honorsByType[cat]) honorsByType[cat] = [];
            honorsByType[cat].push(h);
          });

          // Merge: try to match psProgress items to real honors by name for progress data
          const getProgressForHonor = (honor) => {
            const match = psProgress.find(p => p.name.toLowerCase() === honor.name.toLowerCase());
            return match || null;
          };

          // Filter state for the tab
          const [meritsFilter, setMeritsFilter] = [
            selectedMerit?._filter || "all",
            (f) => setSelectedMerit(prev => prev ? { ...prev, _filter: f } : { _filter: f }),
          ];
          const activeFilter = selectedMerit?._filter || "all";

          return (
          <>
            <SectionHeader icon="🏅" title="Honors & Medals Tracker" badge={`${honorsAwarded + medalsAwarded}/${totalHonors + totalMedals} total`} />

            {!tornHonors && (
              <div style={{ textAlign: "center", padding: 30, color: T.textDim, fontSize: 12 }}>
                Cargando honors reales de Torn...
              </div>
            )}

            {tornHonors && (
            <>
            {/* ── Summary Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ background: T.card, border: `1px solid ${T.green}33`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.green }}>{honorsAwarded}</div>
                <div style={{ fontSize: 10, color: T.textDim }}>Honors / {totalHonors}</div>
              </div>
              <div style={{ background: T.card, border: `1px solid ${T.purple}33`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.purple }}>{medalsAwarded}</div>
                <div style={{ fontSize: 10, color: T.textDim }}>Medals / {totalMedals}</div>
              </div>
              <div style={{ background: T.card, border: `1px solid ${T.gold}33`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.gold }}>
                  {((honorsAwarded + medalsAwarded) / Math.max(totalHonors + totalMedals, 1) * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: 10, color: T.textDim }}>Progreso Total</div>
              </div>
            </div>

            {/* ── Honors with personalstats progress ── */}
            {psProgress.filter(h => !h.completed).length > 0 && (
              <div style={{ background: `linear-gradient(135deg, ${T.card}, ${T.goldDim})`, border: `1px solid ${T.gold}44`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 6 }}>🎯 Progreso Trackeable</div>
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12 }}>Honors y medals que podemos medir con tus stats. Click para ver detalles.</div>
                <div style={{ maxHeight: 350, overflowY: "auto" }}>
                {psProgress.filter(h => !h.completed).slice(0, 15).map((h) => (
                  <div key={h.id} onClick={() => setSelectedMerit(h)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", background: T.bg + "cc", borderRadius: 8, marginBottom: 4,
                    border: `1px solid ${h.progress >= 90 ? T.green + "55" : h.progress >= 50 ? T.gold + "33" : T.border}`,
                    cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 16 }}>{h.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: h.progress >= 90 ? T.green : h.progress >= 50 ? T.gold : T.text }}>{h.name}</span>
                          <span style={{
                            fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                            background: h.type === "medal" ? T.purpleDim : T.accentDim,
                            color: h.type === "medal" ? T.purple : T.accent,
                          }}>{h.type === "medal" ? "M" : "H"}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: h.progress >= 90 ? T.green : h.progress >= 50 ? T.gold : T.textDim }}>
                          {h.progress.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${h.progress}%`, height: "100%", borderRadius: 2,
                          background: h.progress >= 90 ? T.green : h.progress >= 50 ? T.gold : T.accent,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: T.textDim, marginTop: 2 }}>
                        {fmt(h.current)} / {fmt(h.target)} — faltan {fmt(h.remaining)}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}

            {/* ── All Real Honors by Category ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.accent, marginBottom: 12 }}>📊 Todos los Honors (datos reales de Torn)</div>

              {/* Category grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                {Object.entries(honorsByType).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, items]) => {
                  const done = items.filter(h => h.awarded).length;
                  const pct = (done / items.length) * 100;
                  return (
                    <div key={cat} style={{
                      padding: "8px 10px", background: T.bg, borderRadius: 8,
                      border: `1px solid ${pct >= 100 ? T.green + "44" : T.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: T.text }}>{cat}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? T.green : pct > 0 ? T.gold : T.textDim }}>
                          {done}/{items.length}
                        </span>
                      </div>
                      <div style={{ height: 4, background: T.card, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%", borderRadius: 2,
                          background: pct >= 100 ? T.green : pct > 0 ? T.accent : T.textMuted,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Full scrollable list */}
              <div style={{ maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
                {Object.entries(honorsByType).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, items]) => (
                  <div key={cat}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, padding: "10px 0 6px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.card, zIndex: 1 }}>
                      {cat} ({items.filter(h => h.awarded).length}/{items.length})
                    </div>
                    {items.map((h) => {
                      const prog = getProgressForHonor(h);
                      return (
                        <div key={h.id} onClick={() => setSelectedMerit({ ...h, _real: true, _progress: prog })} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 10px", borderBottom: `1px solid ${T.border}22`,
                          opacity: h.awarded ? 0.7 : 1,
                          cursor: "pointer",
                        }}>
                          <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>
                            {h.awarded ? "✅" : "🔒"}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: h.awarded ? T.green : T.text,
                                textDecoration: h.awarded ? "line-through" : "none",
                              }}>{h.name}</span>
                              <span style={{
                                fontSize: 9, fontWeight: 600,
                                color: h.awarded ? T.green : T.textDim,
                              }}>{h.awarded ? "DONE" : h.rarity || ""}</span>
                            </div>
                            {h.description && (
                              <div style={{ fontSize: 9, color: T.textDim, marginTop: 2 }}>{h.description}</div>
                            )}
                            {prog && !h.awarded && (
                              <div style={{ marginTop: 3 }}>
                                <div style={{ height: 3, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                                  <div style={{
                                    width: `${prog.progress}%`, height: "100%", borderRadius: 2,
                                    background: prog.progress >= 75 ? T.gold : T.accent,
                                  }} />
                                </div>
                                <div style={{ fontSize: 8, color: T.textDim, marginTop: 1 }}>
                                  {fmt(prog.current)}/{fmt(prog.target)} ({prog.progress.toFixed(1)}%)
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Merits Invertidos ── */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 12 }}>🎖️ Merits Invertidos</div>
              {data?.merits ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(data.merits).map(([key, val]) => (
                    <div key={key} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: val > 0 ? T.accentDim : T.bg,
                      border: `1px solid ${val > 0 ? T.accent + "33" : T.border}`, borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 11, color: T.textDim, textTransform: "capitalize" }}>
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: val > 0 ? T.accent : T.textMuted }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", padding: 20 }}>
                  Cargando datos de merits...
                </div>
              )}
            </div>

            {/* Tips */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 8 }}>💡 Tips de Merits</div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                {"• Crime merits → +nerve maximo (tu tienes " + bars.nerve.max + " nerve max)"}<br />
                • Duke/Leslie missions (Plushies & Flowers) → merits + cash<br />
                • Gym merits → bonificaciones de entrenamiento<br />
                • Attack merits → desbloquean honors valiosos<br />
                • Invierte merits en Nerve Bar primero, luego en Crime XP
              </div>
            </div>

            {/* ── Detail Modal ── */}
            {selectedMerit && !selectedMerit._filter && (() => {
              const m = selectedMerit;
              const isReal = m._real;
              const prog = isReal ? m._progress : m;
              const tip = !isReal ? (STAT_TIPS[m.stat] || { action: "Completa esta actividad en Torn", where: "Revisa la página correspondiente en Torn", link: null }) : null;
              return (
                <div onClick={() => setSelectedMerit(null)} style={{
                  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 9999,
                }}>
                  <div onClick={e => e.stopPropagation()} style={{
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
                    padding: 24, maxWidth: 420, width: "90%", position: "relative",
                  }}>
                    <div onClick={() => setSelectedMerit(null)} style={{
                      position: "absolute", top: 12, right: 14, cursor: "pointer",
                      fontSize: 18, color: T.textDim, fontWeight: 700,
                    }}>✕</div>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <span style={{ fontSize: 36 }}>{(isReal ? m.awarded : m.completed) ? "✅" : (m.icon || "🏆")}</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: (isReal ? m.awarded : m.completed) ? T.green : T.text }}>{m.name}</div>
                        {m.description && (
                          <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, lineHeight: 1.4 }}>{m.description}</div>
                        )}
                        {m.rarity && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: T.accentDim, color: T.accent, marginTop: 4, display: "inline-block" }}>
                            {m.rarity} · {m.circulation ? fmt(m.circulation) + " jugadores" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress if available */}
                    {prog && !prog.completed && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: T.textDim }}>{fmt(prog.current)} / {fmt(prog.target)}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.gold }}>{prog.progress.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${prog.progress}%`, height: "100%", borderRadius: 4,
                            background: prog.progress >= 75
                              ? `linear-gradient(90deg, ${T.gold}, #fbbf24)`
                              : `linear-gradient(90deg, ${T.accent}, #60a5fa)`,
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
                          Faltan {fmt(prog.remaining)} para completar
                        </div>
                      </div>
                    )}

                    {/* What to do (for stat-based items) */}
                    {tip && !(isReal ? m.awarded : m.completed) && (
                      <div style={{ background: T.bg, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8 }}>🎯 Qué hacer:</div>
                        <div style={{ fontSize: 12, color: T.text, marginBottom: 6, lineHeight: 1.5 }}>{tip.action}</div>
                        <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>📍 {tip.where}</div>
                      </div>
                    )}

                    {/* Description as hint for real honors without stat tracking */}
                    {isReal && !m.awarded && !prog && m.description && (
                      <div style={{ background: T.bg, borderRadius: 10, padding: 14, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8 }}>🎯 Requisito:</div>
                        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{m.description}</div>
                      </div>
                    )}

                    {/* Link */}
                    {tip && tip.link && !(isReal ? m.awarded : m.completed) && (
                      <a href={tip.link} target="_blank" rel="noopener noreferrer" style={{
                        display: "block", textAlign: "center", padding: "10px 16px",
                        background: `linear-gradient(135deg, ${T.accent}, #60a5fa)`,
                        color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 8,
                        textDecoration: "none", marginBottom: 8,
                      }}>
                        {tip.linkLabel} →
                      </a>
                    )}

                    {/* View on Torn */}
                    <a href="https://www.torn.com/page.php?sid=awards&tab=honors" target="_blank" rel="noopener noreferrer" style={{
                      display: "block", textAlign: "center", padding: "8px 16px",
                      background: T.bg, border: `1px solid ${T.border}`,
                      color: T.textDim, fontWeight: 600, fontSize: 11, borderRadius: 8,
                      textDecoration: "none",
                    }}>
                      Ver en Torn →
                    </a>

                    {/* Completed */}
                    {(isReal ? m.awarded : m.completed) && (
                      <div style={{
                        background: T.bg, borderRadius: 10, padding: 14, marginTop: 12,
                        textAlign: "center", border: `1px solid ${T.green}33`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>🎉 Completado!</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            </>
            )}
          </>
          );
        })()}

        {/* ═══ CHECKLIST TAB ═══ */}
        {tab === "checklist" && (
          <>
            <SectionHeader icon="✅" title="Checklist Diaria" badge={`${Object.values(checklist).filter(Boolean).length}/${Object.keys(checklist).length}`} />

            <div style={{ marginBottom: 20 }}>
              <ProgressBar
                value={Object.values(checklist).filter(Boolean).length}
                max={Object.keys(checklist).length}
                color={T.green}
                label="Progreso del día"
                sublabel={`${Object.values(checklist).filter(Boolean).length} de ${Object.keys(checklist).length} tareas`}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>⚡ PRIORIDAD ALTA</div>
              <CheckItem text="Entrenar en el gimnasio" sub="Gasta toda tu energía con happy alto" checked={checklist.train} onChange={() => setChecklist({ ...checklist, train: !checklist.train })} />
              <CheckItem text="Cometer crímenes" sub="Gasta todo tu nerve en el crimen más alto posible" checked={checklist.crimes} onChange={() => setChecklist({ ...checklist, crimes: !checklist.crimes })} />
              <CheckItem text="Tomar Xanax" sub="+250 energía. Solo si no hay cooldown" checked={checklist.xanax} onChange={() => setChecklist({ ...checklist, xanax: !checklist.xanax })} />
              <CheckItem text="Usar Booster de energía" sub="FHC/SED para +25E. Sin cooldown de drogas" checked={checklist.booster} onChange={() => setChecklist({ ...checklist, booster: !checklist.booster })} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>💰 DINERO</div>
              <CheckItem text="Misiones de Duke/Leslie" sub="Plushies & Flowers para merits y cash" checked={checklist.duke} onChange={() => setChecklist({ ...checklist, duke: !checklist.duke })} />
              <CheckItem text="Viaje al extranjero" sub="Compra items baratos, vende caro en Torn" checked={checklist.travel} onChange={() => setChecklist({ ...checklist, travel: !checklist.travel })} />
              <CheckItem text="Atacar NPCs" sub="Leslie, Jimmy, Duke... Loot valioso" checked={checklist.npc} onChange={() => setChecklist({ ...checklist, npc: !checklist.npc })} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>🏆 EXTRA</div>
              <CheckItem text="Refill de energía" sub="Usa refill si tienes donator status" checked={checklist.refill} onChange={() => setChecklist({ ...checklist, refill: !checklist.refill })} />
              <CheckItem text="Ayudar en chain de facción" sub="Chains dan respect + bonos de facción" checked={checklist.chain} onChange={() => setChecklist({ ...checklist, chain: !checklist.chain })} />
              <CheckItem text="Carrera diaria" sub="Racing sube stats y da premios" checked={checklist.race} onChange={() => setChecklist({ ...checklist, race: !checklist.race })} />
            </div>

            <div style={{ marginTop: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
              <button
                onClick={() => setChecklist({ train: false, crimes: false, duke: false, travel: false, refill: false, booster: false, xanax: false, npc: false, chain: false, race: false })}
                style={{
                  padding: "10px 24px",
                  background: T.redDim,
                  border: `1px solid ${T.red}44`,
                  borderRadius: 8,
                  color: T.red,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                🔄 Resetear Checklist (nuevo día)
              </button>
            </div>
          </>
        )}
      </div>

        {/* ═══ EASTER EGG HUNT TAB ═══ */}
        {tab === "eggHunt" && (
          <>
            <SectionHeader icon="🥚" title="Easter Egg Hunter" badge={`${eggsFound.length} encontrados`} />

            <div style={{ background: T.card, border: `1px solid ${T.gold}44`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 8 }}>🐰 Easter Egg Hunt 2026 - ACTIVO</div>
              <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7 }}>
                Los huevos están pre-asignados en páginas aleatorias y <strong style={{ color: T.green }}>NO desaparecen</strong>.
                La auto-nav abre cada página en la misma pestaña. Si el script PRO detecta un huevo: suena alarma, para la navegación y te avisa.
              </div>
            </div>

            {/* EGG FOUND ALERT */}
            {eggFound && (
              <div style={{
                background: `linear-gradient(135deg, ${T.goldDim}, rgba(245,158,11,0.3))`,
                border: `2px solid ${T.gold}`, borderRadius: 12, padding: 16, marginBottom: 16,
                textAlign: "center", animation: "pulse 1s infinite",
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🥚</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: T.gold, marginBottom: 4 }}>HUEVO DETECTADO!</div>
                <div style={{ fontSize: 12, color: T.text, marginBottom: 12 }}>Ve a la pestaña de Torn y recógelo</div>
                <button onClick={() => setEggFound(false)} style={{
                  padding: "8px 20px", background: T.gold, border: "none", borderRadius: 8,
                  color: T.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>Ya lo recogí</button>
              </div>
            )}

            {/* Progress */}
            <ProgressBar
              value={eggIndex}
              max={EGG_PAGES.length}
              color={T.gold}
              label="Progreso de navegación"
              sublabel={`Página ${eggIndex} de ${EGG_PAGES.length}`}
            />

            {/* Current Page Display */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: 16, marginTop: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, fontWeight: 600 }}>PÁGINA ACTUAL</div>
              <div style={{
                fontSize: 14, color: T.accent, fontWeight: 700, wordBreak: "break-all",
                background: T.bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${T.border}`,
              }}>
                {EGG_PAGES[eggIndex] || "torn.com (home)"}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button
                onClick={() => {
                  eggWindowRef.current = window.open(`https://www.torn.com/${EGG_PAGES[eggIndex]}`, "torn_egg_hunt");
                }}
                style={{
                  flex: 1, padding: "12px 16px", background: `linear-gradient(135deg, ${T.accent}, #06b6d4)`,
                  border: "none", borderRadius: 8, color: T.bg, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", minWidth: 120,
                }}
              >
                🔗 Abrir en Torn
              </button>

              <button
                onClick={() => {
                  const next = eggIndex + 1 >= EGG_PAGES.length ? 0 : eggIndex + 1;
                  setEggIndex(next);
                  localStorage.setItem("torn_egg_index", next.toString());
                  eggWindowRef.current = window.open(`https://www.torn.com/${EGG_PAGES[next]}`, "torn_egg_hunt");
                }}
                style={{
                  flex: 1, padding: "12px 16px", background: T.greenDim,
                  border: `1px solid ${T.green}44`, borderRadius: 8, color: T.green, fontSize: 13,
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minWidth: 120,
                }}
              >
                ➡️ Siguiente ({eggIndex + 1}/{EGG_PAGES.length})
              </button>

              <button
                onClick={() => {
                  const prev = eggIndex - 1 < 0 ? EGG_PAGES.length - 1 : eggIndex - 1;
                  setEggIndex(prev);
                  localStorage.setItem("torn_egg_index", prev.toString());
                  eggWindowRef.current = window.open(`https://www.torn.com/${EGG_PAGES[prev]}`, "torn_egg_hunt");
                }}
                style={{
                  padding: "12px 16px", background: T.purpleDim,
                  border: `1px solid ${T.purple}44`, borderRadius: 8, color: T.purple, fontSize: 13,
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ⬅️ Anterior
              </button>
            </div>

            {/* Speed selector */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, whiteSpace: "nowrap" }}>⏱️ Velocidad:</span>
              {[3, 5, 8, 12].map(s => (
                <button key={s} onClick={() => setEggAutoSpeed(s)} style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer",
                  background: eggAutoSpeed === s ? T.accentDim : "transparent",
                  border: `1px solid ${eggAutoSpeed === s ? T.accent : T.border}`,
                  color: eggAutoSpeed === s ? T.accent : T.textDim,
                }}>{s}s</button>
              ))}
            </div>

            {/* Auto-navigate */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => {
                  if (eggAutoRef.current) {
                    eggAutoRef.current = false;
                    setEggAutoRunning(false);
                    if (eggIntervalRef.current) clearInterval(eggIntervalRef.current);
                    return;
                  }
                  // First click opens the tab (user gesture = no popup block)
                  eggWindowRef.current = window.open(`https://www.torn.com/${EGG_PAGES[eggIndex]}`, "torn_egg_hunt");
                  eggAutoRef.current = true;
                  setEggAutoRunning(true);
                  eggIntervalRef.current = setInterval(() => {
                    if (!eggAutoRef.current) return;
                    setEggIndex(prev => {
                      const next = prev + 1 >= EGG_PAGES.length ? 0 : prev + 1;
                      localStorage.setItem("torn_egg_index", next.toString());
                      try {
                        eggWindowRef.current = window.open(`https://www.torn.com/${EGG_PAGES[next]}`, "torn_egg_hunt");
                      } catch (e) {
                        eggWindowRef.current = window.open(`https://www.torn.com/${EGG_PAGES[next]}`, "torn_egg_hunt");
                      }
                      return next;
                    });
                  }, eggAutoSpeed * 1000);
                }}
                style={{
                  flex: 1, padding: "12px 16px",
                  background: eggAutoRunning ? T.redDim : T.goldDim,
                  border: `1px solid ${eggAutoRunning ? T.red : T.gold}44`,
                  borderRadius: 8, color: eggAutoRunning ? T.red : T.gold, fontSize: 13,
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {eggAutoRunning ? "⏹️ Detener Auto-Nav" : `🚀 Auto-Navegación (${eggAutoSpeed}s)`}
              </button>

              <button
                onClick={() => {
                  setEggIndex(0);
                  localStorage.setItem("torn_egg_index", "0");
                }}
                style={{
                  padding: "12px 16px", background: T.redDim,
                  border: `1px solid ${T.red}44`, borderRadius: 8, color: T.red, fontSize: 13,
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                🔄 Reset
              </button>
            </div>

            {/* Mark egg found */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>🥚 MARCAR HUEVO ENCONTRADO</div>
              <button
                onClick={() => {
                  const pageName = EGG_PAGES[eggIndex] || "home";
                  const entry = { page: pageName, time: new Date().toLocaleString(), index: eggIndex };
                  const updated = [...eggsFound, entry];
                  setEggsFound(updated);
                  localStorage.setItem("torn_eggs_found", JSON.stringify(updated));
                }}
                style={{
                  width: "100%", padding: "12px 16px",
                  background: `linear-gradient(135deg, ${T.gold}, #f59e0b)`,
                  border: "none", borderRadius: 8, color: T.bg, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                🥚 Encontré un huevo en esta página!
              </button>
            </div>

            {/* Eggs found log */}
            {eggsFound.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8, fontWeight: 600 }}>📋 HUEVOS ENCONTRADOS ({eggsFound.length})</div>
                {eggsFound.map((e, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", borderBottom: i < eggsFound.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div>
                      <span style={{ fontSize: 12, color: T.gold, marginRight: 8 }}>🥚</span>
                      <span style={{ fontSize: 12, color: T.text }}>{e.page}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.textDim }}>{e.time}</span>
                  </div>
                ))}
                <button
                  onClick={() => { setEggsFound([]); localStorage.removeItem("torn_eggs_found"); }}
                  style={{
                    marginTop: 10, padding: "6px 12px", background: T.redDim,
                    border: `1px solid ${T.red}44`, borderRadius: 6, color: T.red, fontSize: 11,
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  Limpiar registro
                </button>
              </div>
            )}

            {/* Install PRO script */}
            <div style={{ background: T.card, border: `1px solid ${T.gold}44`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: T.gold, marginBottom: 8, fontWeight: 600 }}>⚡ INSTALAR SCRIPT (OBLIGATORIO)</div>
              <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.8, marginBottom: 10 }}>
                Desactiva el Egg Finder viejo e instala nuestro script PRO. Tiene:
              </div>
              <div style={{ fontSize: 11, color: T.text, lineHeight: 2, marginBottom: 12 }}>
                <div>🔊 <strong>Alarma de sonido</strong> — imposible ignorar aunque estés en otra pestaña</div>
                <div>🖥️ <strong>Overlay gigante</strong> — pantalla completa con "HUEVO ENCONTRADO"</div>
                <div>📌 <strong>Huevo agrandado 600%</strong> — centrado en pantalla con borde dorado</div>
                <div>⏸️ <strong>Para la auto-nav</strong> — avisa a nuestra app para pausar la navegación</div>
                <div>📑 <strong>Flash en título</strong> — la pestaña de Torn parpadea aunque no la veas</div>
              </div>
              <div style={{ fontSize: 12, color: T.accent, marginBottom: 8 }}>
                Pasos: Tampermonkey → ⊕ Crear script → Pega el contenido del archivo:
              </div>
              <div style={{
                background: T.bg, borderRadius: 8, padding: "10px 14px",
                fontSize: 12, color: T.accent, fontFamily: "inherit",
                border: `1px solid ${T.border}`, userSelect: "all",
              }}>src/torn-egg-hunter-pro.user.js</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: T.textDim }}>O también puedes usar estos scripts de la comunidad:</div>
                <a href="https://greasyfork.org/en/scripts/463421-egg-finder" target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: T.textMuted, textDecoration: "none" }}>
                  Egg Finder (básico, sin sonido)
                </a>
                <a href="https://greasyfork.org/en/scripts/463484-heasley-s-egg-navigator" target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: T.textMuted, textDecoration: "none" }}>
                  Heasley's Egg Navigator (navegación, sin detección)
                </a>
              </div>
            </div>
          </>
        )}

      {/* ═══ CLAUDE CHAT ═══ */}
      {chatOpen && serverOnline && (
        <ClaudeChat tornContext={tornContext} onClose={() => setChatOpen(false)} />
      )}
      {serverStarting && !serverOnline && (
        <div style={{
          position: "fixed", bottom: 80, right: 20, width: 320,
          background: T.card, border: `1px solid ${T.gold}44`, borderRadius: 12,
          padding: 16, zIndex: 9999, boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 8 }}>Encender Chat Server</div>
          <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, marginBottom: 12 }}>Abre una terminal y ejecuta:</div>
          <div style={{
            background: T.bg, borderRadius: 8, padding: "10px 14px",
            fontSize: 12, color: T.accent, fontFamily: "inherit",
            border: `1px solid ${T.border}`, userSelect: "all",
          }}>node chat-server.js</div>
          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 8 }}>Se conectara automaticamente cuando detecte el servidor.</div>
        </div>
      )}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", gap: 8, zIndex: 9998 }}>
        <button onClick={toggleServer} title={serverOnline ? "Apagar servidor" : "Encender servidor"}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: serverOnline ? T.greenDim : T.redDim,
            border: `2px solid ${serverOnline ? T.green : T.red}66`,
            color: serverOnline ? T.green : T.red, fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${serverOnline ? T.green : T.red}33`, transition: "all 0.3s",
          }}>{"\u23FB"}</button>
        <button onClick={() => {
          if (!serverOnline) { setServerStarting(true); setTimeout(() => setServerStarting(false), 6000); }
          else setChatOpen(!chatOpen);
        }} style={{
            width: 56, height: 56, borderRadius: "50%",
            background: chatOpen ? T.accent : `linear-gradient(135deg, ${T.accent}, #06b6d4)`,
            border: "none", color: T.bg, fontSize: 24, cursor: "pointer",
            boxShadow: `0 4px 20px ${T.accent}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s", position: "relative",
          }}>
          {chatOpen ? "\u2715" : "\uD83E\uDD16"}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 12, height: 12, borderRadius: "50%",
            background: serverOnline ? T.green : T.red, border: `2px solid ${T.card}`,
            boxShadow: `0 0 6px ${serverOnline ? T.green : T.red}`,
          }} />
        </button>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
        input::placeholder { color: ${T.textMuted}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
