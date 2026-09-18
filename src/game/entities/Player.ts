import Phaser from 'phaser';
import { PLAYER_CONFIG } from '../config/GameConfig';
import { AudioManager } from '../systems/AudioManager';
import { getCharacterById, type CharacterDef } from '../config/Characters';

export type PlayerAnimState = 'idle' | 'walk' | 'shoot' | 'reload' | 'hurt' | 'dead';

/**
 * The protagonist. Moves horizontally along the bottom of the screen,
 * aims a separately-rotated gun sprite at the pointer/touch position, and
 * plays a small hand-authored pose state machine (see TextureGenerator).
 * Which character's sprites/proportions it uses is picked in
 * CharacterSelectScene and read from Storage (see GameScene).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  health = PLAYER_CONFIG.maxHealth;
  maxHealth = PLAYER_CONFIG.maxHealth;
  isDead = false;
  aimAngle = 0;

  private charDef: CharacterDef;
  private texturePrefix: string;
  private gun: Phaser.GameObjects.Image;
  private walkToggleTimer = 0;
  private walkFrame = 0;
  private isMoving = false;
  private shootPoseUntil = 0;
  private reloadPoseUntil = 0;
  private invulnerableUntil = 0;
  private hurtFlashUntil = 0;
  private shieldUntil = 0;
  private shieldGfx: Phaser.GameObjects.Arc | null = null;
  private facing: 1 | -1 = 1;
  private isTurning = false;
  private minX: number;
  private maxX: number;

  constructor(scene: Phaser.Scene, x: number, feetY: number, minX: number, maxX: number, characterId: string) {
    const def = getCharacterById(characterId);
    super(scene, x, feetY, `player_${def.id}_idle`);
    this.charDef = def;
    this.texturePrefix = `player_${def.id}`;
    this.minX = minX;
    this.maxX = maxX;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(30);
    this.setCollideWorldBounds(true);
    // Different characters have different sprite heights — re-anchor so
    // every character's feet line up on the same ground line instead of
    // being vertically centered on `feetY` regardless of their height.
    this.setY(feetY - this.height / 2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.5, this.height * 0.8);
    body.setOffset(this.width * 0.25, this.height * 0.15);

    this.gun = scene.add.image(x, this.y, 'weapon_gun');
    this.gun.setOrigin(0.2, 0.5);
    this.gun.setDepth(31);
  }

  moveLeft(): void {
    this.setVelocityX(-PLAYER_CONFIG.speed);
    this.isMoving = true;
  }

  moveRight(): void {
    this.setVelocityX(PLAYER_CONFIG.speed);
    this.isMoving = true;
  }

  stopMoving(): void {
    this.setVelocityX(0);
    this.isMoving = false;
  }

  aimAt(worldX: number, worldY: number): void {
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y - 40, worldX, worldY);
  }

  getMuzzlePosition(): { x: number; y: number } {
    const dist = 40;
    return {
      x: this.gun.x + Math.cos(this.aimAngle) * dist,
      y: this.gun.y + Math.sin(this.aimAngle) * dist,
    };
  }

  getGunOrigin(): { x: number; y: number } {
    return { x: this.gun.x, y: this.gun.y };
  }

  playShootPose(): void {
    this.shootPoseUntil = 130;
  }

  playReloadPose(durationMs: number): void {
    this.reloadPoseUntil = durationMs;
  }

  isInvulnerable(): boolean {
    return this.invulnerableUntil > 0 || this.shieldUntil > 0;
  }

  activateShield(durationMs: number): void {
    this.shieldUntil = Math.max(this.shieldUntil, 0) + durationMs;
    if (!this.shieldGfx) {
      this.shieldGfx = this.scene.add.circle(this.x, this.y - 30, 52, 0x4a90e2, 0.22);
      this.shieldGfx.setStrokeStyle(3, 0x8ec2ff, 0.9);
      this.shieldGfx.setDepth(29);
    }
  }

  hasShield(): boolean {
    return this.shieldUntil > 0;
  }

  takeDamage(amount: number): boolean {
    if (this.isDead || this.isInvulnerable()) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = PLAYER_CONFIG.invulnerabilityMs;
    this.hurtFlashUntil = 250;
    AudioManager.play('playerHurt');
    this.scene.cameras.main.shake(160, 0.006);
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setTexture(`${this.texturePrefix}_hurt`);
    this.gun.setVisible(false);
    this.scene.tweens.add({
      targets: this,
      angle: 90,
      alpha: 0.5,
      duration: 600,
      ease: 'Cubic.easeIn',
    });
  }

  update(_time: number, delta: number): void {
    if (this.isDead) return;

    // clamp within arena horizontally
    if (this.x < this.minX) this.x = this.minX;
    if (this.x > this.maxX) this.x = this.maxX;

    if (this.invulnerableUntil > 0) {
      this.invulnerableUntil -= delta;
      this.setAlpha(Math.floor(this.invulnerableUntil / 90) % 2 === 0 ? 0.4 : 1);
    } else {
      this.setAlpha(1);
    }
    if (this.hurtFlashUntil > 0) this.hurtFlashUntil -= delta;
    if (this.shootPoseUntil > 0) this.shootPoseUntil -= delta;
    if (this.reloadPoseUntil > 0) this.reloadPoseUntil -= delta;
    if (this.shieldUntil > 0) {
      this.shieldUntil -= delta;
      if (this.shieldGfx) {
        this.shieldGfx.setPosition(this.x, this.y - 30);
        this.shieldGfx.setVisible(true);
      }
      if (this.shieldUntil <= 0 && this.shieldGfx) {
        this.shieldGfx.destroy();
        this.shieldGfx = null;
      }
    }

    const vx = (this.body as Phaser.Physics.Arcade.Body).velocity.x;
    this.isMoving = Math.abs(vx) > 5;

    // A small dead zone around straight-up/down aim (instead of flipping the
    // instant cos(aimAngle) crosses 0) stops the character flickering
    // between facings when the pointer hovers near vertical.
    const cosAngle = Math.cos(this.aimAngle);
    if (!this.isTurning) {
      if (cosAngle > 0.15 && this.facing !== 1) this.playTurnAnimation(1);
      else if (cosAngle < -0.15 && this.facing !== -1) this.playTurnAnimation(-1);
    }

    this.updatePose();
    this.updateGunTransform();
  }

  /**
   * A quick "squash to a sliver, flip, expand back out" tween — turning to
   * face the other way reads as a deliberate spin instead of an instant
   * mirror-swap, which is especially important now that the head is a
   * real photo (a plain instant flip barely registered as "turning").
   */
  private playTurnAnimation(newFacing: 1 | -1): void {
    this.isTurning = true;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.08,
      duration: 55,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.facing = newFacing;
        this.setFlipX(this.facing < 0);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          duration: 70,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.isTurning = false;
          },
        });
      },
    });
  }

  private updatePose(): void {
    if (this.hurtFlashUntil > 0) {
      this.setTexture(`${this.texturePrefix}_hurt`);
      return;
    }
    if (this.reloadPoseUntil > 0) {
      this.setTexture(`${this.texturePrefix}_reload`);
      return;
    }
    if (this.shootPoseUntil > 0) {
      this.setTexture(`${this.texturePrefix}_shoot`);
      return;
    }
    if (this.isMoving) {
      this.walkToggleTimer += 90;
      if (this.walkToggleTimer > 110) {
        this.walkToggleTimer = 0;
        this.walkFrame = 1 - this.walkFrame;
      }
      this.setTexture(this.walkFrame === 0 ? `${this.texturePrefix}_walk1` : `${this.texturePrefix}_walk2`);
      return;
    }
    this.setTexture(`${this.texturePrefix}_idle`);
  }

  private updateGunTransform(): void {
    const { gunOffsetX, gunOffsetY } = this.charDef.layout;
    this.gun.setPosition(this.x + this.facing * gunOffsetX, this.y + gunOffsetY);
    this.gun.setRotation(this.aimAngle);
    this.gun.setFlipY(this.facing < 0);
  }

  recoil(): void {
    const kick = 4;
    this.gun.x -= Math.cos(this.aimAngle) * kick;
    this.gun.y -= Math.sin(this.aimAngle) * kick;
  }

  destroyWithGun(): void {
    this.gun.destroy();
    this.shieldGfx?.destroy();
    this.destroy();
  }
}
