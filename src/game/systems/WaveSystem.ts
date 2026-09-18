import { WAVE_CONFIG } from '../config/GameConfig';

export type WavePhase = 'spawning' | 'clearing' | 'intermission';

/**
 * Drives the progressive-difficulty wave loop: how many enemies per wave,
 * how fast they spawn, and when to trigger special / boss waves. This
 * class only tracks timing/state — EnemySpawner turns its signals into
 * actual entities.
 */
export class WaveSystem {
  waveNumber = 0;
  phase: WavePhase = 'intermission';

  private enemiesToSpawnThisWave = 0;
  private enemiesSpawnedThisWave = 0;
  private spawnTimer = 0;
  private intermissionTimer = WAVE_CONFIG.timeBetweenWavesMs * 0.4;

  onWaveStart?: (waveNumber: number, isBoss: boolean, isSpecial: boolean) => void;
  onSpawnRequest?: () => void;
  onBossSpawnRequest?: () => void;

  get difficultyMultiplier(): number {
    return 1 + this.waveNumber * 0.09;
  }

  isBossWave(waveNumber = this.waveNumber): boolean {
    return waveNumber > 0 && waveNumber % WAVE_CONFIG.bossEveryNWaves === 0;
  }

  isSpecialWave(waveNumber = this.waveNumber): boolean {
    return (
      waveNumber > 0 &&
      waveNumber % WAVE_CONFIG.specialEveryNWaves === 0 &&
      !this.isBossWave(waveNumber)
    );
  }

  private currentSpawnInterval(): number {
    const interval =
      WAVE_CONFIG.baseSpawnIntervalMs - this.waveNumber * WAVE_CONFIG.spawnIntervalDecayPerWave;
    return Math.max(WAVE_CONFIG.minSpawnIntervalMs, interval);
  }

  private enemiesForWave(): number {
    return Math.round(
      WAVE_CONFIG.baseEnemiesPerWave + this.waveNumber * WAVE_CONFIG.enemiesPerWaveIncrement
    );
  }

  private startWave(): void {
    this.waveNumber += 1;
    this.phase = 'spawning';
    this.spawnTimer = 0;
    this.enemiesSpawnedThisWave = 0;

    const isBoss = this.isBossWave();
    const isSpecial = this.isSpecialWave();
    this.enemiesToSpawnThisWave = isBoss ? 1 : this.enemiesForWave();

    this.onWaveStart?.(this.waveNumber, isBoss, isSpecial);

    if (isBoss) {
      this.onBossSpawnRequest?.();
      this.enemiesSpawnedThisWave = this.enemiesToSpawnThisWave;
      this.phase = 'clearing';
    }
  }

  /** Call every frame with the number of enemies currently alive on screen. */
  update(_time: number, delta: number, aliveEnemyCount: number): void {
    switch (this.phase) {
      case 'intermission':
        this.intermissionTimer -= delta;
        if (this.intermissionTimer <= 0) {
          this.startWave();
        }
        break;

      case 'spawning':
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0 && this.enemiesSpawnedThisWave < this.enemiesToSpawnThisWave) {
          this.spawnTimer = this.currentSpawnInterval();
          this.enemiesSpawnedThisWave += 1;
          this.onSpawnRequest?.();
          if (this.enemiesSpawnedThisWave >= this.enemiesToSpawnThisWave) {
            this.phase = 'clearing';
          }
        }
        break;

      case 'clearing':
        if (aliveEnemyCount <= 0) {
          this.phase = 'intermission';
          this.intermissionTimer = WAVE_CONFIG.timeBetweenWavesMs;
        }
        break;
    }
  }

  reset(): void {
    this.waveNumber = 0;
    this.phase = 'intermission';
    this.intermissionTimer = WAVE_CONFIG.timeBetweenWavesMs * 0.4;
    this.enemiesToSpawnThisWave = 0;
    this.enemiesSpawnedThisWave = 0;
  }
}
