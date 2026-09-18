import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

export type VultureType = 'normal' | 'fast' | 'heavy' | 'aggressive' | 'boss';
export type VultureState = 'entering' | 'roaming' | 'perched' | 'diving' | 'dying' | 'dead';

export interface VultureStats {
  health: number;
  speed: number;
  points: number;
  contactDamage: number;
  scale: number;
}

/**
 * Base class for every "gallinazo" enemy. Handles the shared flight state
 * machine (enter arena -> roam/perch -> optionally dive at the player ->
 * die with a feather burst). Subclasses override `steer()` to implement
 * their specific movement pattern.
 */
export class Vulture extends Phaser.Physics.Arcade.Sprite {
  vultureType: VultureType = 'normal';
  health = 1;
  maxHealth = 1;
  points = 100;
  baseSpeed = 100;
  contactDamage = 10;
  state: VultureState = 'entering';

  protected flapTimer = 0;
  protected flapFrame = 0;
  protected perchTimer = 0;
  protected wanderSeed = Math.random() * 1000;
  protected elapsed = 0;
  protected textureBase = 'vulture_normal';
  protected canPerch = false;
  protected perchPoint: { x: number; y: number } | null = null;
  private hitFlashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, textureBase: string, stats: VultureStats, type: VultureType) {
    super(scene, x, y, `${textureBase}_1`);
    this.textureBase = textureBase;
    this.vultureType = type;
    this.maxHealth = stats.health;
    this.health = stats.health;
    this.baseSpeed = stats.speed;
    this.points = stats.points;
    this.contactDamage = stats.contactDamage;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(stats.scale);
    this.setDepth(20);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(
      this.width * 0.28,
      this.width * 0.22,
      this.height * 0.22
    );
  }

  /** Called by subclasses through update(); implements the specific flight pattern. */
  protected steer(_time: number, _delta: number, _playerX: number, _playerY: number): void {
    // default: gentle sine drift downward
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.sin((this.elapsed + this.wanderSeed) / 400) * this.baseSpeed, this.baseSpeed * 0.35);
  }

  setPerchTarget(point: { x: number; y: number } | null): void {
    this.perchPoint = point;
    this.canPerch = point !== null;
  }

  update(time: number, delta: number, playerX: number, playerY: number): void {
    if (this.state === 'dead') return;
    this.elapsed += delta;
    this.updateFlapAnimation(delta);

    if (this.state === 'dying') return;

    if (this.state === 'entering' && this.perchPoint) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const dx = this.perchPoint.x - this.x;
      const dy = this.perchPoint.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) {
        body.setVelocity(0, 0);
        this.state = 'perched';
        this.perchTimer = Phaser.Math.Between(1000, 2200);
      } else {
        const speed = this.baseSpeed * 1.15;
        body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }
      this.updateFacing();
      return;
    }

    if (this.state === 'entering') {
      this.state = 'roaming';
    }

    if (this.state === 'perched') {
      this.perchTimer -= delta;
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (this.perchTimer <= 0) {
        this.state = 'roaming';
      }
      return;
    }

    this.steer(time, delta, playerX, playerY);
    this.updateFacing();
  }

  protected updateFacing(): void {
    const vx = (this.body as Phaser.Physics.Arcade.Body).velocity.x;
    if (Math.abs(vx) > 5) {
      this.setFlipX(vx < 0);
    }
  }

  protected updateFlapAnimation(delta: number): void {
    if (this.hitFlashUntil > 0) {
      this.hitFlashUntil -= delta;
      this.setTexture(`${this.textureBase}_hit`);
      if (this.hitFlashUntil <= 0) this.setTexture(`${this.textureBase}_${this.flapFrame + 1}`);
      return;
    }
    this.flapTimer += delta;
    const flapSpeed = this.state === 'perched' ? 900 : 140;
    if (this.flapTimer > flapSpeed) {
      this.flapTimer = 0;
      this.flapFrame = 1 - this.flapFrame;
      this.setTexture(`${this.textureBase}_${this.flapFrame + 1}`);
    }
  }

  /** Returns true if the vulture died from this damage. */
  takeDamage(amount: number): boolean {
    if (this.state === 'dying' || this.state === 'dead') return false;
    this.health -= amount;
    this.hitFlashUntil = 70;
    this.setTexture(`${this.textureBase}_hit`);
    AudioManager.play('hit');
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die(): void {
    if (this.state === 'dying' || this.state === 'dead') return;
    this.state = 'dying';
    AudioManager.play('kill');
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Phaser.Math.Between(-60, 60), -120);
    body.setAllowGravity(true);
    body.setGravityY(700);
    this.spawnFeathers();
    this.scene.tweens.add({
      targets: this,
      angle: this.angle + Phaser.Math.Between(-260, 260),
      alpha: 0,
      duration: 750,
      onComplete: () => {
        this.state = 'dead';
        this.setActive(false);
        this.setVisible(false);
      },
    });
  }

  protected spawnFeathers(): void {
    const emitter = this.scene.add.particles(this.x, this.y, 'feather', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: 700,
      scale: { start: 1, end: 0.4 },
      gravityY: 260,
      quantity: 8,
      rotate: { min: 0, max: 360 },
    });
    emitter.explode(8);
    this.scene.time.delayedCall(750, () => emitter.destroy());
  }

  isAlive(): boolean {
    return this.state !== 'dying' && this.state !== 'dead';
  }
}
