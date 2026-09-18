import { STORAGE_KEYS } from '../config/GameConfig';
import { DEFAULT_CHARACTER_ID } from '../config/Characters';

export interface GameSettings {
  musicOn: boolean;
  sfxOn: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface GameStats {
  gamesPlayed: number;
  enemiesKilled: number;
  bestCombo: number;
  bestWave: number;
  bestScore: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  musicOn: true,
  sfxOn: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
};

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  enemiesKilled: 0,
  bestCombo: 0,
  bestWave: 0,
  bestScore: 0,
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable, ignore
  }
}

export const Storage = {
  getHighScore(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.highScore);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  },

  setHighScore(score: number): void {
    safeSet(STORAGE_KEYS.highScore, score);
    try {
      localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    } catch {
      // ignore
    }
  },

  getSettings(): GameSettings {
    return safeGet(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  },

  setSettings(settings: GameSettings): void {
    safeSet(STORAGE_KEYS.settings, settings);
  },

  getStats(): GameStats {
    return safeGet(STORAGE_KEYS.stats, DEFAULT_STATS);
  },

  setStats(stats: GameStats): void {
    safeSet(STORAGE_KEYS.stats, stats);
  },

  getSelectedCharacter(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.character) || DEFAULT_CHARACTER_ID;
    } catch {
      return DEFAULT_CHARACTER_ID;
    }
  },

  setSelectedCharacter(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.character, id);
    } catch {
      // ignore
    }
  },

  recordGameEnd(opts: { score: number; wave: number; kills: number; bestComboThisRun: number }): {
    stats: GameStats;
    isNewHighScore: boolean;
  } {
    const stats = this.getStats();
    stats.gamesPlayed += 1;
    stats.enemiesKilled += opts.kills;
    stats.bestCombo = Math.max(stats.bestCombo, opts.bestComboThisRun);
    stats.bestWave = Math.max(stats.bestWave, opts.wave);
    const prevHigh = this.getHighScore();
    const isNewHighScore = opts.score > prevHigh;
    stats.bestScore = Math.max(stats.bestScore, opts.score);
    this.setStats(stats);
    if (isNewHighScore) this.setHighScore(opts.score);
    return { stats, isNewHighScore };
  },
};
