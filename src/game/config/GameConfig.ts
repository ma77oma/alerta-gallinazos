export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 600;

export const COLORS = {
  sky: 0x6fb8d9,
  skyDark: 0x3d6f8c,
  buildingFar: 0x8a7ba8,
  buildingMid: 0x6f5f95,
  buildingNear: 0x4a3d68,
  ground: 0x5a4a3a,
  playerShirt: 0x3a7fc4,
  playerSkin: 0xe0a878,
  playerHair: 0x1a1a1a,
  playerPants: 0x2c3e50,
  vultureBody: 0x3a3a3a,
  vultureWing: 0x1f1f1f,
  vultureBeak: 0xe0a020,
  bloodless: 0xffffff,
} as const;

export const PLAYER_CONFIG = {
  maxHealth: 100,
  speed: 260,
  startX: GAME_WIDTH / 2,
  startY: GAME_HEIGHT - 70,
  invulnerabilityMs: 900,
};

export const WEAPON_CONFIG = {
  maxAmmo: 12,
  reloadTimeMs: 1500,
  fireRateMs: 220,
  bulletSpeed: 900,
  bulletDamage: 1,
  recoilPx: 6,
};

export const COMBO_CONFIG = {
  windowMs: 2500,
  thresholds: [0, 3, 6, 10, 15], // kills needed for x1..x5
};

export const SCORE_TABLE: Record<string, number> = {
  normal: 100,
  fast: 150,
  heavy: 300,
  aggressive: 200,
  boss: 5000,
};

export const WAVE_CONFIG = {
  baseEnemiesPerWave: 4,
  enemiesPerWaveIncrement: 1.4,
  baseSpawnIntervalMs: 1400,
  minSpawnIntervalMs: 350,
  spawnIntervalDecayPerWave: 55,
  timeBetweenWavesMs: 3200,
  bossEveryNWaves: 10,
  specialEveryNWaves: 5,
};

export const POWERUP_DROP_CHANCE = 0.22;

export const STORAGE_KEYS = {
  highScore: 'kinteka_high_score',
  settings: 'kinteka_settings',
  stats: 'kinteka_stats',
  character: 'kinteka_character',
};
