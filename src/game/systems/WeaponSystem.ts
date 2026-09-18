import Phaser from 'phaser';
import { WEAPON_CONFIG } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { AudioManager } from './AudioManager';

/**
 * Owns ammo, fire rate, reload timing and bullet spawning for the player's
 * weapon. Power-ups (rapid fire / triple shot) are applied as temporary
 * modifiers here rather than mutating base weapon stats.
 */
export class WeaponSystem {
  private scene: Phaser.Scene;
  private player: Player;
  bulletGroup: Phaser.Physics.Arcade.Group;

  ammo = WEAPON_CONFIG.maxAmmo;
  maxAmmo = WEAPON_CONFIG.maxAmmo;
  private lastShotTime = 0;
  private reloading = false;
  private reloadStartedAt = 0;
  private reloadDuration = WEAPON_CONFIG.reloadTimeMs;

  private rapidFireUntil = 0;
  private tripleShotUntil = 0;

  onAmmoChange?: (ammo: number, max: number) => void;
  onReloadStart?: (durationMs: number) => void;
  onReloadEnd?: () => void;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.bulletGroup = scene.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 120,
    });
  }

  private get fireRate(): number {
    return this.rapidFireUntil > 0 ? WEAPON_CONFIG.fireRateMs * 0.4 : WEAPON_CONFIG.fireRateMs;
  }

  isReloading(): boolean {
    return this.reloading;
  }

  reloadProgress(): number {
    if (!this.reloading) return 1;
    return Phaser.Math.Clamp((this.scene.time.now - this.reloadStartedAt) / this.reloadDuration, 0, 1);
  }

  hasRapidFire(): boolean {
    return this.rapidFireUntil > 0;
  }

  hasTripleShot(): boolean {
    return this.tripleShotUntil > 0;
  }

  activateRapidFire(durationMs: number): void {
    this.rapidFireUntil = Math.max(this.rapidFireUntil, 0) + durationMs;
  }

  activateTripleShot(durationMs: number): void {
    this.tripleShotUntil = Math.max(this.tripleShotUntil, 0) + durationMs;
  }

  refillAmmo(amount: number): void {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    this.onAmmoChange?.(this.ammo, this.maxAmmo);
  }

  startReload(): void {
    if (this.reloading || this.ammo === this.maxAmmo) return;
    this.reloading = true;
    this.reloadStartedAt = this.scene.time.now;
    AudioManager.play('reload');
    this.player.playReloadPose(this.reloadDuration);
    this.onReloadStart?.(this.reloadDuration);
  }

  /**
   * Reload completion is polled here (rather than via time.delayedCall) so
   * it stays correct even under heavy frame-rate throttling (e.g. a
   * backgrounded tab) — it self-corrects every frame instead of depending
   * on a single timer callback firing.
   */
  update(time: number, delta: number): void {
    if (this.rapidFireUntil > 0) this.rapidFireUntil -= delta;
    if (this.tripleShotUntil > 0) this.tripleShotUntil -= delta;
    if (this.reloading && time - this.reloadStartedAt >= this.reloadDuration) {
      this.reloading = false;
      this.ammo = this.maxAmmo;
      this.onAmmoChange?.(this.ammo, this.maxAmmo);
      this.onReloadEnd?.();
    }
  }

  tryFire(time: number): boolean {
    if (this.reloading) return false;
    if (this.ammo <= 0) {
      this.startReload();
      return false;
    }
    if (time - this.lastShotTime < this.fireRate) return false;
    this.lastShotTime = time;

    this.ammo -= 1;
    this.onAmmoChange?.(this.ammo, this.maxAmmo);

    const angle = this.player.aimAngle;
    const spreadAngles = this.hasTripleShot() ? [-0.14, 0, 0.14] : [0];
    const muzzle = this.player.getMuzzlePosition();

    for (const spread of spreadAngles) {
      this.spawnBullet(muzzle.x, muzzle.y, angle + spread);
    }

    this.player.playShootPose();
    this.player.recoil();
    this.spawnMuzzleEffects(muzzle.x, muzzle.y, angle);
    this.scene.cameras.main.shake(60, 0.0025);
    AudioManager.play('shoot');

    if (this.ammo <= 0) this.startReload();
    return true;
  }

  private spawnBullet(x: number, y: number, angle: number): void {
    const bullet = this.bulletGroup.get(x, y, 'bullet') as Phaser.Physics.Arcade.Image | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true);
    bullet.enableBody(true, x, y, true, true);
    bullet.setRotation(angle);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity(Math.cos(angle) * WEAPON_CONFIG.bulletSpeed, Math.sin(angle) * WEAPON_CONFIG.bulletSpeed);
    bullet.setData('damage', WEAPON_CONFIG.bulletDamage);
  }

  private spawnMuzzleEffects(x: number, y: number, angle: number): void {
    const flash = this.scene.add.image(x, y, 'muzzle_flash');
    flash.setRotation(angle);
    flash.setScale(0.8);
    flash.setDepth(32);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.3,
      duration: 90,
      onComplete: () => flash.destroy(),
    });

    const smoke = this.scene.add.particles(x, y, 'particle_smoke', {
      speed: { min: 20, max: 60 },
      angle: { min: Phaser.Math.RadToDeg(angle) - 20, max: Phaser.Math.RadToDeg(angle) + 20 },
      lifespan: 350,
      scale: { start: 0.6, end: 1.4 },
      alpha: { start: 0.5, end: 0 },
      quantity: 3,
    });
    smoke.explode(3);
    this.scene.time.delayedCall(400, () => smoke.destroy());
  }

  cullOffscreenBullets(bounds: Phaser.Geom.Rectangle): void {
    this.bulletGroup.children.each((child) => {
      const b = child as Phaser.Physics.Arcade.Image;
      if (b.active && !Phaser.Geom.Rectangle.Contains(bounds, b.x, b.y)) {
        b.disableBody(true, true);
      }
      return true;
    });
  }
}
