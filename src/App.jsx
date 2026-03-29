import { useState, useEffect, useCallback, useRef } from "react";

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

// ─── TRAVEL PROFIT DATA ─────────────────────────────────────────────────────
const TRAVEL_ITEMS = [
  { destination: "Mexico", items: ["Feathery Hotel Coupon", "Bottle of Tequila"], flightTime: 26, profitRange: "50K-200K" },
  { destination: "Cayman Islands", items: ["Gold Ring", "Pearl Necklace"], flightTime: 35, profitRange: "100K-400K" },
  { destination: "Canada", items: ["Maple Syrup", "Fur Coat"], flightTime: 41, profitRange: "150K-500K" },
  { destination: "Hawaii", items: ["Coconut", "Hawaiian Shirt"], flightTime: 134, profitRange: "200K-600K" },
  { destination: "UK", items: ["Crumpets", "Tea"], flightTime: 159, profitRange: "250K-700K" },
  { destination: "Argentina", items: ["Yerba Mate", "Emerald"], flightTime: 167, profitRange: "300K-1M" },
  { destination: "Switzerland", items: ["Swiss Army Knife", "Watch"], flightTime: 175, profitRange: "400K-1.5M" },
  { destination: "Japan", items: ["Katana", "Sake"], flightTime: 225, profitRange: "500K-2M" },
  { destination: "China", items: ["Fireworks", "Dragon Figurine"], flightTime: 242, profitRange: "600K-2.5M" },
  { destination: "UAE", items: ["Gold Plated AK-47", "Camel"], flightTime: 242, profitRange: "800K-5M" },
  { destination: "South Africa", items: ["Diamond", "Krugerrand"], flightTime: 267, profitRange: "1M-8M" },
];

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
  const [scanPaused, setScanPaused] = useState(false);
  const scanActiveRef = useRef(false);
  const scanPausedRef = useRef(false);
  const marketResultsRef = useRef([]);
  const [marketMaxPrice, setMarketMaxPrice] = useState(0);
  const [marketMinPrice, setMarketMinPrice] = useState(0);
  const marketMaxPriceRef = useRef(0);
  const marketMinPriceRef = useRef(0);

  // Targets
  const [targets, setTargets] = useState([]);
  const [targetScanning, setTargetScanning] = useState(false);
  const [targetProgress, setTargetProgress] = useState("");
  const [targetPaused, setTargetPaused] = useState(false);
  const targetPausedRef = useRef(false);
  const targetActiveRef = useRef(false);
  const [targetMaxLevel, setTargetMaxLevel] = useState(10);
  const [targetScanned, setTargetScanned] = useState(0);

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
        `${API_BASE}/user/?selections=profile,bars,battlestats,cooldowns,travel,money,gym,crimes,education,networth,personalstats&key=${key}`
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


  // Scan ALL categories in one pass
  const scanAllMarkets = useCallback(async (items, key) => {
    if (scanActiveRef.current) return;
    scanActiveRef.current = true;
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
    setScanning(false);
    setScanProgress("");
    scanActiveRef.current = false;
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

  // Auto-load items + start continuous scan loop
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    const startAutoScan = async () => {
      // 1. Load all items
      let items = allItems;
      if (!items) {
        try {
          const res = await fetch(`${API_BASE}/torn/?selections=items&key=${apiKey}`);
          const json = await res.json();
          if (json.items) {
            items = json.items;
            setAllItems(json.items);
          }
        } catch {}
      }
      if (!items || cancelled) return;

      // 2. Continuous scan loop
      while (!cancelled) {
        // Wait while paused
        while (scanPausedRef.current && !cancelled) {
          await new Promise(r => setTimeout(r, 1000));
        }
        if (cancelled) break;
        await scanAllMarkets(items, apiKey);
        await new Promise(r => setTimeout(r, 30000));
      }
    };

    startAutoScan();
    return () => { cancelled = true; scanActiveRef.current = false; };
  }, [apiKey]);

  // Auto-fetch on apiKey change
  useEffect(() => {
    if (apiKey) {
      fetchData(apiKey);
      intervalRef.current = setInterval(() => fetchData(apiKey), 30000);
      return () => clearInterval(intervalRef.current);
    }
  }, [apiKey, fetchData]);

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

  const recommendedCrime = selectedCrime != null
    ? CRIME_GUIDE.find(c => c.nerve === selectedCrime) || CRIME_GUIDE[0]
    : CRIME_GUIDE.filter(c => c.nerve <= bars.nerve.max).pop() || CRIME_GUIDE[0];

  const networth = data?.networth?.total ?? 0;
  const money = data?.money_onhand ?? 0;
  const level = data?.level ?? 0;
  const name = data?.name ?? "Player";

  const ps = data?.personalstats ?? {};

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
    { id: "checklist", icon: "✅", label: "Diario" },
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

            {/* Cooldowns */}
            <SectionHeader icon="⏱️" title="Cooldowns" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              <StatCard icon="💊" title="Drogas" value={cooldowns.drug > 0 ? timeUntil(cooldowns.drug) : "✅ Listo"} color={cooldowns.drug > 0 ? T.red : T.green} />
              <StatCard icon="🏥" title="Médico" value={cooldowns.medical > 0 ? timeUntil(cooldowns.medical) : "✅ Listo"} color={cooldowns.medical > 0 ? T.red : T.green} />
              <StatCard icon="💪" title="Booster" value={cooldowns.booster > 0 ? timeUntil(cooldowns.booster) : "✅ Listo"} color={cooldowns.booster > 0 ? T.red : T.green} />
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

        {/* ═══ TRAVEL TAB ═══ */}
        {tab === "travel" && (
          <>
            <SectionHeader icon="✈️" title="Monitor de Viajes" badge="PROFIT" />

            {traveling && (
              <div style={{ background: T.purpleDim, border: `1px solid ${T.purple}44`, borderRadius: 12, padding: 16, marginBottom: 20, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✈️</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.purple }}>Volando a {travelDest}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "8px 0" }}>{timeUntil(travelTime)}</div>
              </div>
            )}

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr", padding: "10px 16px", borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                {["Destino", "Items Clave", "Vuelo", "Beneficio Est."].map((h) => (
                  <div key={h} style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</div>
                ))}
              </div>
              {TRAVEL_ITEMS.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 1fr 1.5fr",
                    padding: "10px 16px",
                    borderBottom: i < TRAVEL_ITEMS.length - 1 ? `1px solid ${T.border}` : "none",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{t.destination}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{t.items.join(", ")}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{t.flightTime}m</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.green }}>${t.profitRange}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.accent, marginBottom: 8 }}>💡 Pro Tips Viajes</div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
                • Lleva siempre 5 items para maximizar beneficio por viaje<br />
                • Compra Plushies y Flowers para Mr. Duke (+merits y dinero)<br />
                • South Africa y China tienen los mejores márgenes<br />
                • Ahorra para Business Class Ticket (reduce tiempos de vuelo)<br />
                • Usa el Airstrip de facción si está disponible para vuelos más rápidos<br />
                • WLT (Working Lunch Tickets) ahorran energía de viaje
              </div>
            </div>
          </>
        )}

        {/* ═══ MARKET TAB ═══ */}
        {tab === "market" && (
          <>
            <SectionHeader icon="🏪" title="Market Scanner" badge="AUTO" />

            {/* Status bar */}
            <div style={{
              background: scanPaused ? T.goldDim : scanning ? T.accentDim : T.greenDim,
              border: `1px solid ${scanPaused ? T.gold + "44" : scanning ? T.accent + "44" : T.green + "44"}`,
              borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 12, textAlign: "center",
              color: scanPaused ? T.gold : scanning ? T.accent : T.green,
            }}>
              {scanPaused
                ? `⏸️ PAUSADO — ${marketDeals.length} deals guardados`
                : scanning
                  ? `🔄 Escaneando: ${scanProgress}`
                  : allItems
                    ? `🟢 LIVE — ${marketDeals.length} deals encontrados`
                    : "⏳ Cargando base de datos de items..."
              }
            </div>

            {/* Controls */}
            {allItems && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
