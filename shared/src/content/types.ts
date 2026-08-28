/** Data-driven content model. New items are added via JSON with no code change. */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CosmeticSlot = 'outfit' | 'trail' | 'hat';

export type UnlockSource = 'default' | 'chest' | 'battlepass' | 'challenge' | 'level';

export interface Cosmetic {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: Rarity;
  /** Primary + secondary accent colours used by the preview and in-game avatar. */
  colors: [string, string];
  source: UnlockSource;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Stat threshold that awards the badge, checked at match end. */
  metric: 'wins' | 'captures' | 'hits' | 'mvps' | 'matchesPlayed' | 'level';
  threshold: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  period: 'daily' | 'weekly';
  metric: 'hits' | 'captures' | 'wins' | 'matchesPlayed' | 'keuleReturns';
  target: number;
  xp: number;
}

export type BattlePassRewardType = 'cosmetic' | 'chest' | 'xp' | 'currency';

export interface BattlePassReward {
  level: number;
  xpNeeded: number; // battle-pass XP to reach this level from the previous
  type: BattlePassRewardType;
  /** cosmetic/chest id, or numeric amount for xp/currency. */
  value: string | number;
}

export interface BattlePassSeason {
  id: string;
  name: string;
  rewards: BattlePassReward[];
}

export interface ChestLootEntry {
  cosmeticId: string;
  weight: number;
}

export interface ChestDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Weighted rarity odds shown in the reveal. */
  odds: Record<Rarity, number>;
  loot: ChestLootEntry[];
}
