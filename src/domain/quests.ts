/**
 * Non-expiring themes and optional quests (§2.5): seasons stay available
 * forever, nothing decays, nothing is lost. Progress = approved tasks.
 */
export interface Season {
  id: string;
  emoji: string;
  nameKey: string;
  creatures: { id: string; emoji: string; at: number }[]; // befriended at N approved tasks
  gear: { id: string; emoji: string; at: number }[];
}

export const SEASONS: Season[] = [
  {
    id: 'meadow', emoji: '🌼', nameKey: 'season.meadow',
    creatures: [{ id: 'bee', emoji: '🐝', at: 2 }, { id: 'frog', emoji: '🐸', at: 6 }, { id: 'fox', emoji: '🦊', at: 12 }, { id: 'deer', emoji: '🦌', at: 20 }],
    gear: [{ id: 'wooden_sword', emoji: '🗡️', at: 1 }, { id: 'shield', emoji: '🛡️', at: 8 }, { id: 'lantern', emoji: '🏮', at: 15 }],
  },
  {
    id: 'space', emoji: '🪐', nameKey: 'season.space',
    creatures: [{ id: 'alien', emoji: '👾', at: 3 }, { id: 'robot', emoji: '🤖', at: 8 }, { id: 'astro_cat', emoji: '🐱‍🚀', at: 14 }, { id: 'comet', emoji: '☄️', at: 24 }],
    gear: [{ id: 'helmet', emoji: '🪖', at: 1 }, { id: 'jetpack', emoji: '🎒', at: 9 }, { id: 'telescope', emoji: '🔭', at: 18 }],
  },
  {
    id: 'ocean', emoji: '🌊', nameKey: 'season.ocean',
    creatures: [{ id: 'crab', emoji: '🦀', at: 2 }, { id: 'turtle', emoji: '🐢', at: 7 }, { id: 'dolphin', emoji: '🐬', at: 13 }, { id: 'whale', emoji: '🐋', at: 22 }],
    gear: [{ id: 'snorkel', emoji: '🤿', at: 1 }, { id: 'compass', emoji: '🧭', at: 8 }, { id: 'trident', emoji: '🔱', at: 16 }],
  },
];

/** Castle tiles unlock with progress and are never removed — no "towers get ruined". */
export const CASTLE_TILES = ['🧱', '🏠', '🌳', '🏰', '🌉', '⛲', '🎪', '🏯', '🗼', '🌈'];

export function seasonProgress(season: Season, approvedCount: number) {
  const creatures = season.creatures.map((c) => ({ ...c, unlocked: approvedCount >= c.at }));
  const gear = season.gear.map((g) => ({ ...g, unlocked: approvedCount >= g.at }));
  const total = creatures.length + gear.length;
  const done = creatures.filter((c) => c.unlocked).length + gear.filter((g) => g.unlocked).length;
  const next = [...creatures, ...gear].filter((x) => !x.unlocked).sort((a, b) => a.at - b.at)[0];
  return { creatures, gear, done, total, next };
}

export function castleTiles(approvedCount: number): string[] {
  return CASTLE_TILES.slice(0, Math.min(CASTLE_TILES.length, Math.floor(approvedCount / 4)));
}
