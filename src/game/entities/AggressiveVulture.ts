import Phaser from 'phaser';
import { Vulture } from './Vulture';

/** Beelines toward the player to attack in melee instead of roaming. */
export class AggressiveVulture extends Vulture {
  constructor(scene: Phaser.Scene, x: number, y: number, difficultyMult: number) {
    super(scene, x, y, 'vulture_aggressive', {
      health: 2,
      speed: 150 * difficultyMult,
      points: 200,
      contactDamage: 15,
      scale: 0.95,
    }, 'aggressive');
  }

  protected steer(_time: number, _delta: number, playerX: number, playerY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = playerX - this.x;
    const dy = playerY - 30 - this.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = this.state === 'diving' ? this.baseSpeed * 1.4 : this.baseSpeed;
    body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    if (dist < 220) this.state = 'diving';
  }
}
