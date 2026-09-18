import Phaser from 'phaser';
import { Vulture } from './Vulture';

/** Small, fragile, and very fast — flies in tight zigzags. */
export class FastVulture extends Vulture {
  private zigDir = 1;
  private zigTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, difficultyMult: number) {
    super(scene, x, y, 'vulture_fast', {
      health: 1,
      speed: 260 * difficultyMult,
      points: 150,
      contactDamage: 8,
      scale: 0.75,
    }, 'fast');
  }

  protected steer(_time: number, delta: number, _playerX: number, _playerY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.zigTimer += delta;
    if (this.zigTimer > 260) {
      this.zigTimer = 0;
      this.zigDir *= -1;
    }
    body.setVelocity(this.zigDir * this.baseSpeed, this.baseSpeed * 0.55);
  }
}
