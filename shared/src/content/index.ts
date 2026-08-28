import type {
  Badge,
  BattlePassSeason,
  ChestDef,
  Challenge,
  Cosmetic,
  Rarity,
} from './types';
import cosmeticsData from './cosmetics.json';
import badgesData from './badges.json';
import challengesData from './challenges.json';
import battlepassData from './battlepass.json';
import chestsData from './chests.json';

export * from './types';

export const COSMETICS = cosmeticsData as Cosmetic[];
export const BADGES = badgesData as Badge[];
export const CHALLENGES = challengesData as Challenge[];
export const BATTLE_PASS = battlepassData as BattlePassSeason;
export const CHESTS = chestsData as ChestDef[];

const cosmeticById = new Map(COSMETICS.map((c) => [c.id, c]));
const chestById = new Map(CHESTS.map((c) => [c.id, c]));

export function getCosmetic(id: string): Cosmetic | undefined {
  return cosmeticById.get(id);
}
export function cosmeticsBySlot(slot: Cosmetic['slot']): Cosmetic[] {
  return COSMETICS.filter((c) => c.slot === slot);
}
export function getChest(id: string): ChestDef | undefined {
  return chestById.get(id);
}
export function getBadge(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

export const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export interface ChestRoll {
  cosmeticId: string;
  rarity: Rarity;
  /** True if the profile already owned this item (converts to currency in the caller). */
  duplicate?: boolean;
}

/** Roll a chest: pick a rarity by odds, then a weighted item of that rarity. */
export function rollChest(chestId: string, rng: () => number): ChestRoll | null {
  const chest = chestById.get(chestId);
  if (!chest) return null;

  // pick rarity by odds
  const roll = rng();
  let acc = 0;
  let chosen: Rarity = 'common';
  for (const r of ['legendary', 'epic', 'rare', 'common'] as Rarity[]) {
    acc += chest.odds[r] ?? 0;
  }
  const norm = acc || 1;
  let p = roll * norm;
  for (const r of ['common', 'rare', 'epic', 'legendary'] as Rarity[]) {
    p -= chest.odds[r] ?? 0;
    if (p <= 0) {
      chosen = r;
      break;
    }
  }

  // weighted pick among loot of that rarity; fall back to any
  const pool = chest.loot.flatMap((l) => {
    const c = cosmeticById.get(l.cosmeticId);
    return c ? [{ l, c }] : [];
  });
  let candidates = pool.filter((e) => e.c.rarity === chosen);
  if (candidates.length === 0) candidates = pool;
  const total = candidates.reduce((s, e) => s + e.l.weight, 0) || 1;
  let w = rng() * total;
  for (const e of candidates) {
    w -= e.l.weight;
    if (w <= 0) return { cosmeticId: e.c.id, rarity: e.c.rarity };
  }
  const last = candidates[candidates.length - 1];
  return { cosmeticId: last.c.id, rarity: last.c.rarity };
}
