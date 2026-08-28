import {
  BADGES,
  BATTLE_PASS,
  CHALLENGES,
  COSMETICS,
  getChest,
  getCosmetic,
  rollChest,
  type Challenge,
  type ChestRoll,
} from '../content';
import type { ChallengeProgress, PlayerProfile } from '../persistence';
import type { Difficulty } from '../types';

/** Per-match performance handed to the progression service at match end. */
export interface MatchResult {
  won: boolean;
  isMvp: boolean;
  hits: number;
  captures: number;
  keuleReturns: number;
  keulePickups: number;
  deaths: number;
  durationSec: number;
  difficulty: Difficulty;
}

export interface AwardSummary {
  valid: boolean;
  xpGained: number;
  breakdown: { label: string; xp: number }[];
  levelBefore: number;
  levelAfter: number;
  unlockedCosmetics: string[];
  chestsAwarded: string[];
  newBadges: string[];
  bpLevelsGained: number;
  completedChallenges: string[];
}

// --- XP / levels ---

export function xpToNext(level: number): number {
  return 300 + (level - 1) * 140;
}

/** Add XP to a profile's level track; returns how many level-ups occurred. */
export function applyXp(profile: PlayerProfile, gained: number): number {
  profile.totalXp += gained;
  profile.xp += gained;
  let levelUps = 0;
  while (profile.xp >= xpToNext(profile.level)) {
    profile.xp -= xpToNext(profile.level);
    profile.level += 1;
    levelUps += 1;
  }
  return levelUps;
}

const DIFF_MULT: Record<string, number> = { easy: 0.8, normal: 1, hard: 1.15, expert: 1.3 };

// --- challenge rotation ---

const DAY = 86400000;
const WEEK = DAY * 7;

/** The rotated active challenge set for a moment in time. */
export function getActiveChallenges(now: number): { challenge: Challenge; period: string }[] {
  const dayBucket = Math.floor(now / DAY);
  const weekBucket = Math.floor(now / WEEK);
  const dailies = CHALLENGES.filter((c) => c.period === 'daily');
  const weeklies = CHALLENGES.filter((c) => c.period === 'weekly');
  const out: { challenge: Challenge; period: string }[] = [];
  if (dailies.length) {
    out.push({ challenge: dailies[dayBucket % dailies.length], period: `D${dayBucket}` });
    if (dailies.length > 1)
      out.push({ challenge: dailies[(dayBucket + 1) % dailies.length], period: `D${dayBucket}` });
  }
  if (weeklies.length) {
    out.push({ challenge: weeklies[weekBucket % weeklies.length], period: `W${weekBucket}` });
  }
  return out;
}

/** Ensure profile.challenges matches the active rotation (resets stale ones). */
export function syncChallenges(profile: PlayerProfile, now: number): void {
  const active = getActiveChallenges(now);
  const next: ChallengeProgress[] = active.map(({ challenge, period }) => {
    const existing = profile.challenges.find((c) => c.id === challenge.id && c.period === period);
    return existing ?? { id: challenge.id, progress: 0, completed: false, claimed: false, period };
  });
  profile.challenges = next;
}

function bumpChallenges(profile: PlayerProfile, result: MatchResult, now: number): { xp: number; completed: string[] } {
  syncChallenges(profile, now);
  let xp = 0;
  const completed: string[] = [];
  for (const cp of profile.challenges) {
    if (cp.completed) continue;
    const def = CHALLENGES.find((c) => c.id === cp.id);
    if (!def) continue;
    const delta =
      def.metric === 'hits'
        ? result.hits
        : def.metric === 'captures'
          ? result.captures
          : def.metric === 'wins'
            ? result.won
              ? 1
              : 0
            : def.metric === 'keuleReturns'
              ? result.keuleReturns
              : /* matchesPlayed */ 1;
    cp.progress = Math.min(def.target, cp.progress + delta);
    if (cp.progress >= def.target) {
      cp.completed = true;
      xp += def.xp;
      completed.push(cp.id);
    }
  }
  return { xp, completed };
}

// --- badges ---

function checkBadges(profile: PlayerProfile): string[] {
  const earned: string[] = [];
  for (const b of BADGES) {
    if (profile.badges.includes(b.id)) continue;
    const value =
      b.metric === 'wins'
        ? profile.wins
        : b.metric === 'captures'
          ? profile.captures
          : b.metric === 'hits'
            ? profile.hits
            : b.metric === 'mvps'
              ? profile.mvps
              : b.metric === 'matchesPlayed'
                ? profile.matchesPlayed
                : profile.level;
    if (value >= b.threshold) {
      profile.badges.push(b.id);
      earned.push(b.id);
    }
  }
  return earned;
}

// --- level unlocks ---

function unlockLevelCosmetics(profile: PlayerProfile): string[] {
  const levelCosmetics = COSMETICS.filter((c) => c.source === 'level');
  const unlocked: string[] = [];
  levelCosmetics.forEach((c, i) => {
    const unlockAt = 2 + i * 2;
    if (profile.level >= unlockAt && !profile.unlocked.includes(c.id)) {
      profile.unlocked.push(c.id);
      unlocked.push(c.id);
    }
  });
  return unlocked;
}

// --- battle pass ---

function addBattlePassXp(profile: PlayerProfile, gained: number): number {
  const bp = profile.battlePass;
  bp.seasonId = BATTLE_PASS.id;
  bp.xp += gained;
  let gainedLevels = 0;
  const maxLevel = BATTLE_PASS.rewards.length;
  while (bp.level < maxLevel) {
    const next = BATTLE_PASS.rewards.find((r) => r.level === bp.level + 1);
    if (!next || bp.xp < next.xpNeeded) break;
    bp.xp -= next.xpNeeded;
    bp.level += 1;
    gainedLevels += 1;
  }
  return gainedLevels;
}

/** Claim a battle-pass reward the profile has reached. Mutates + returns a note. */
export function claimBattlePassReward(profile: PlayerProfile, level: number): string | null {
  const bp = profile.battlePass;
  if (level > bp.level || bp.claimed.includes(level)) return null;
  const reward = BATTLE_PASS.rewards.find((r) => r.level === level);
  if (!reward) return null;
  bp.claimed.push(level);
  switch (reward.type) {
    case 'cosmetic':
      if (typeof reward.value === 'string' && !profile.unlocked.includes(reward.value)) {
        profile.unlocked.push(reward.value);
      }
      return getCosmetic(String(reward.value))?.name ?? 'Cosmetic';
    case 'chest':
      profile.chests.push(String(reward.value));
      return getChest(String(reward.value))?.name ?? 'Chest';
    case 'xp':
      applyXp(profile, Number(reward.value));
      return `${reward.value} XP`;
    case 'currency':
      profile.currency += Number(reward.value);
      return `${reward.value} coins`;
  }
}

// --- match awards ---

/** Grant all end-of-match rewards. Guards against trivial XP farming. */
export function awardMatch(profile: PlayerProfile, result: MatchResult, now: number): AwardSummary {
  const levelBefore = profile.level;
  const valid = result.durationSec >= 25 && (result.won || result.hits + result.captures > 0);
  const mult = DIFF_MULT[result.difficulty] ?? 1;
  const breakdown: { label: string; xp: number }[] = [];

  let xp = 0;
  if (valid) {
    const play = 80;
    xp += play;
    breakdown.push({ label: 'Match played', xp: play });
    if (result.won) {
      xp += 150;
      breakdown.push({ label: 'Victory', xp: 150 });
    }
    const hitXp = Math.min(result.hits, 20) * 12;
    if (hitXp) {
      xp += hitXp;
      breakdown.push({ label: `${result.hits} hits`, xp: hitXp });
    }
    const capXp = result.captures * 120;
    if (capXp) {
      xp += capXp;
      breakdown.push({ label: `${result.captures} captures`, xp: capXp });
    }
    const retXp = result.keuleReturns * 60;
    if (retXp) {
      xp += retXp;
      breakdown.push({ label: `${result.keuleReturns} returns`, xp: retXp });
    }
    if (result.isMvp) {
      xp += 200;
      breakdown.push({ label: 'MVP', xp: 200 });
    }
  } else {
    xp = 20;
    breakdown.push({ label: 'Participation', xp: 20 });
  }

  xp = Math.round(xp * mult);
  xp = Math.min(xp, 1200);

  // update cumulative stats
  profile.matchesPlayed += 1;
  if (result.won) profile.wins += 1;
  else profile.losses += 1;
  profile.hits += result.hits;
  profile.captures += result.captures;
  if (result.isMvp) profile.mvps += 1;

  // challenges
  const ch = bumpChallenges(profile, result, now);
  if (ch.xp) breakdown.push({ label: 'Challenges', xp: ch.xp });
  const totalXp = xp + ch.xp;

  const levelUps = applyXp(profile, totalXp);
  const bpLevelsGained = addBattlePassXp(profile, totalXp);

  const chestsAwarded: string[] = [];
  for (let i = 0; i < levelUps; i++) {
    profile.chests.push('chest_wooden');
    chestsAwarded.push('chest_wooden');
  }
  const unlockedCosmetics = unlockLevelCosmetics(profile);
  const newBadges = checkBadges(profile);

  return {
    valid,
    xpGained: totalXp,
    breakdown,
    levelBefore,
    levelAfter: profile.level,
    unlockedCosmetics,
    chestsAwarded,
    newBadges,
    bpLevelsGained,
    completedChallenges: ch.completed,
  };
}

// --- inventory actions ---

export function equipCosmetic(profile: PlayerProfile, cosmeticId: string): boolean {
  const c = getCosmetic(cosmeticId);
  if (!c || !profile.unlocked.includes(cosmeticId)) return false;
  profile.equipped[c.slot] = cosmeticId;
  return true;
}

export interface ChestOpenResult extends ChestRoll {
  currencyAwarded: number;
}

/** Open one owned chest: unlock a new cosmetic, or convert a duplicate to coins. */
export function openChest(profile: PlayerProfile, chestId: string, rng: () => number): ChestOpenResult | null {
  const idx = profile.chests.indexOf(chestId);
  if (idx < 0) return null;
  const roll = rollChest(chestId, rng);
  if (!roll) return null;
  profile.chests.splice(idx, 1);
  let currencyAwarded = 0;
  if (profile.unlocked.includes(roll.cosmeticId)) {
    const dupCoins = { common: 25, rare: 50, epic: 100, legendary: 200 }[roll.rarity];
    profile.currency += dupCoins;
    currencyAwarded = dupCoins;
    return { ...roll, duplicate: true, currencyAwarded };
  }
  profile.unlocked.push(roll.cosmeticId);
  return { ...roll, duplicate: false, currencyAwarded };
}
