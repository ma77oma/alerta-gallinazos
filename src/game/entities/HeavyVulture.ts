import Phaser from 'phaser';
import { Vulture } from './Vulture';

/** Big, slow, tanky — worth the most points among the regular types. */
export class HeavyVulture extends Vulture {
  constructor(scene: Phaser.Scene, x: number, y: number, difficultyMult: number) {
    super(scene, x, y, 'vulture_heavy', {
      health: 5,
      speed: 70 * difficultyMult,
      points: 300,
      contactDamage: 18,
      scale: 1.05,
    }, 'heavy');
  }

  protected steer(_time: number, _delta: number, _playerX: number, _playerY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const sway = Math.sin((this.elapsed + this.wanderSeed) / 700) * this.baseSpeed;
    body.setVelocity(sway, this.baseSpeed * 0.5);
  }
}
