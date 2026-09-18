import Phaser from 'phaser';
import { POWERUP_DROP_CHANCE } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { WeaponSystem } from './WeaponSystem';
import { AudioManager } from './AudioManager';

export type PowerUpType = 'ammo' | 'health' | 'rapidfire' | 'tripleshot' | 'shield' | 'bomb';

const TEXTURE_BY_TYPE: Record<PowerUpType, string> = {
  ammo: 'powerup_ammo',
  health: 'powerup_health',
  rapidfire: 'powerup_rapidfire',
  tripleshot: 'powerup_tripleshot',
  shield: 'powerup_shield',
  bomb: 'powerup_bomb',
};

const WEIGHTS: Array<[PowerUpType, number]> = [
  ['ammo', 30],
  ['health', 22],
  ['rapidfire', 16],
  ['tripleshot', 14],
  ['shield', 12],
  ['bomb', 6],
];

/**
 * Handles random power-up drops from dead vultures, their on-screen
 * pickup sprites, and applying their effects to the player / weapon.
 */
export class PowerUpSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private weapon: WeaponSystem;
  group: Phaser.Physics.Arcade.Group;
  onBomb?: () => void;
  onPickupText?: (x: number, y: number, label: string) => void;

  constructor(scene: Phaser.Scene, player: Player, weapon: WeaponSystem) {
    this.scene = scene;
    this.player = player;
    this.weapon = weapon;
    this.group = scene.physics.add.group();
  }

  maybeDrop(x: number, y: number): void {
    if (Math.random() > POWERUP_DROP_CHANCE) return;
    const type = this.rollType();
    const sprite = this.group.create(x, y, TEXTURE_BY_TYPE[type]) as Phaser.Physics.Arcade.Sprite;
    sprite.setData('type', type);
    sprite.setDepth(18);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity(Phaser.Math.Between(-20, 20), 70);
    this.scene.tweens.add({
      targets: sprite,
      y: y - 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.scene.time.delayedCall(7000, () => {
      if (sprite.active) {
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: 400,
          onComplete: () => sprite.destroy(),
        });
      }
    });
  }

  private rollType(): PowerUpType {
    const total = WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [type, weight] of WEIGHTS) {
      if (roll < weight) return type;
      roll -= weight;
    }
    return 'ammo';
  }

  collect(sprite: Phaser.Physics.Arcade.Sprite): void {
    const type = sprite.getData('type') as PowerUpType;
    AudioManager.play('powerup');
    let label = '';
    switch (type) {
      case 'ammo':
        this.weapon.refillAmmo(this.weapon.maxAmmo);
        label = '+MUNICIÓN';
        break;
      case 'health':
        this.player.heal(35);
        label = '+VIDA';
        break;
      case 'rapidfire':
        this.weapon.activateRapidFire(6000);
        label = 'RAPID FIRE!';
        break;
      case 'tripleshot':
        this.weapon.activateTripleShot(7000);
        label = 'TRIPLE SHOT!';
        break;
      case 'shield':
        this.player.activateShield(5000);
        label = 'ESCUDO!';
        break;
      case 'bomb':
        this.onBomb?.();
        label = 'BOOM!';
        break;
    }
    this.onPickupText?.(sprite.x, sprite.y, label);
    sprite.destroy();
  }
}
