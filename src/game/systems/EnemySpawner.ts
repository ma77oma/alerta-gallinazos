import Phaser from 'phaser';
import { Vulture, type VultureType } from '../entities/Vulture';
import { FastVulture } from '../entities/FastVulture';
import { HeavyVulture } from '../entities/HeavyVulture';
import { AggressiveVulture } from '../entities/AggressiveVulture';
import { BossVulture } from '../entities/BossVulture';

export interface PerchPoint {
  x: number;
  y: number;
}

/**
 * Turns WaveSystem's "spawn one enemy" / "spawn the boss" signals into
 * actual Vulture instances, choosing a type based on the current wave
 * (introducing new types progressively) and an entry point from the
 * edges/top of the arena.
 */
export class EnemySpawner {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private bossProjectiles: Phaser.Physics.Arcade.Group;
  private perchPoints: PerchPoint[];
  private arenaWidth: number;
  private arenaHeight: number;

  constructor(
    scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.Group,
    bossProjectiles: Phaser.Physics.Arcade.Group,
    perchPoints: PerchPoint[],
    arenaWidth: number,
    arenaHeight: number
  ) {
    this.scene = scene;
    this.group = group;
    this.bossProjectiles = bossProjectiles;
    this.perchPoints = perchPoints;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  spawnRandom(waveNumber: number, difficultyMult: number): Vulture {
    const type = this.rollType(waveNumber);
    const { x, y } = this.rollEntryPoint();
    const enemy = this.createByType(type, x, y, difficultyMult);
    this.group.add(enemy);

    const canPerchType = type === 'normal' || type === 'heavy';
    if (canPerchType && this.perchPoints.length > 0 && Math.random() < 0.35) {
      const point = Phaser.Utils.Array.GetRandom(this.perchPoints);
      enemy.setPerchTarget(point);
    }
    return enemy;
  }

  spawnBoss(waveNumber: number, difficultyMult: number): BossVulture {
    const x = this.arenaWidth / 2;
    const boss = new BossVulture(this.scene, x, -80, difficultyMult, this.bossProjectiles, this.arenaWidth);
    this.group.add(boss);
    void waveNumber;
    return boss;
  }

  private rollType(waveNumber: number): VultureType {
    const options: Array<[VultureType, number]> = [['normal', 55]];
    if (waveNumber >= 2) options.push(['fast', 25]);
    if (waveNumber >= 3) options.push(['aggressive', 20]);
    if (waveNumber >= 4) options.push(['heavy', 18]);

    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [type, weight] of options) {
      if (roll < weight) return type;
      roll -= weight;
    }
    return 'normal';
  }

  private createByType(type: VultureType, x: number, y: number, difficultyMult: number): Vulture {
    switch (type) {
      case 'fast':
        return new FastVulture(this.scene, x, y, difficultyMult);
      case 'heavy':
        return new HeavyVulture(this.scene, x, y, difficultyMult);
      case 'aggressive':
        return new AggressiveVulture(this.scene, x, y, difficultyMult);
      default:
        return new Vulture(
          this.scene,
          x,
          y,
          'vulture_normal',
          {
            health: 2,
            speed: 110 * difficultyMult,
            points: 100,
            contactDamage: 12,
            scale: 0.9,
          },
          'normal'
        );
    }
  }

  private rollEntryPoint(): { x: number; y: number } {
    const edge = Phaser.Utils.Array.GetRandom(['left', 'right', 'top']);
    const margin = 60;
    switch (edge) {
      case 'left':
        return { x: -margin, y: Phaser.Math.Between(60, this.arenaHeight * 0.55) };
      case 'right':
        return { x: this.arenaWidth + margin, y: Phaser.Math.Between(60, this.arenaHeight * 0.55) };
      default:
        return { x: Phaser.Math.Between(40, this.arenaWidth - 40), y: -margin };
    }
  }
}
