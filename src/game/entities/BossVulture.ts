import Phaser from 'phaser';
import { Vulture } from './Vulture';
import { AudioManager } from '../systems/AudioManager';

type BossPattern = 'sweep' | 'dive' | 'retreat';

/**
 * The "gallinazo gigante" boss. Cycles through sweep / dive-bomb / retreat
 * movement patterns and periodically lobs feather projectiles at the
 * player. Spawns every 10 waves from GameScene / WaveSystem.
 */
export class BossVulture extends Vulture {
  private pattern: BossPattern = 'sweep';
  private patternTimer = 0;
  private sweepDir = 1;
  private shootCooldown = 0;
  private projectileGroup: Phaser.Physics.Arcade.Group;
  private arenaWidth: number;
  private entryDone = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    difficultyMult: number,
    projectileGroup: Phaser.Physics.Arcade.Group,
    arenaWidth: number
  ) {
    super(scene, x, y, 'boss_vulture', {
      health: Math.round(40 * difficultyMult),
      speed: 90 * difficultyMult,
      points: 5000,
      contactDamage: 25,
      scale: 1,
    }, 'boss');
    this.projectileGroup = projectileGroup;
    this.arenaWidth = arenaWidth;
    AudioManager.play('boss');
  }

  protected steer(_time: number, delta: number, playerX: number, playerY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!this.entryDone) {
      body.setVelocity(0, 60);
      if (this.y > 110) {
        this.entryDone = true;
        this.patternTimer = 0;
      }
      return;
    }

    this.patternTimer -= delta;
    this.shootCooldown -= delta;

    if (this.shootCooldown <= 0) {
      this.shootFeather(playerX, playerY);
      this.shootCooldown = Phaser.Math.Between(1800, 2600);
    }

    switch (this.pattern) {
      case 'sweep':
        body.setVelocity(this.sweepDir * this.baseSpeed, Math.sin(this.elapsed / 500) * 40);
        if (this.x < 90) this.sweepDir = 1;
        if (this.x > this.arenaWidth - 90) this.sweepDir = -1;
        if (this.patternTimer <= 0) {
          this.pattern = 'dive';
          this.patternTimer = 1400;
        }
        break;
      case 'dive': {
        const dx = playerX - this.x;
        body.setVelocity(dx * 0.9, this.baseSpeed * 2.2);
        if (this.y > 380 || this.patternTimer <= 0) {
          this.pattern = 'retreat';
          this.patternTimer = 1200;
        }
        break;
      }
      case 'retreat':
        body.setVelocity(Math.sin(this.elapsed / 300) * this.baseSpeed, -this.baseSpeed * 1.6);
        if (this.y < 130 || this.patternTimer <= 0) {
          this.pattern = 'sweep';
          this.patternTimer = Phaser.Math.Between(2400, 3600);
        }
        break;
    }
  }

  private shootFeather(playerX: number, playerY: number): void {
    const proj = this.projectileGroup.create(this.x, this.y, 'feather') as Phaser.Physics.Arcade.Sprite;
    proj.setScale(2.4);
    proj.setTint(0x3a2a2a);
    proj.setData('damage', 12);
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = 260;
    proj.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    proj.setAngularVelocity(240);
    proj.setDepth(15);
  }

  healthRatio(): number {
    return Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
  }
}
