import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

const FONT = '"Arial Black", Arial, sans-serif';

/**
 * Lightweight overlay scene launched on top of a paused GameScene. Kept
 * separate (rather than a pause flag inside GameScene) so its own buttons
 * and ESC/P handling keep working while GameScene's update/physics/timers
 * are fully frozen via `this.scene.pause()`.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.62);

    this.add
      .text(width / 2, height * 0.3, 'PAUSA', {
        fontFamily: FONT,
        fontSize: '44px',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const startY = height * 0.5;
    const gap = 58;
    this.button(width / 2, startY, 'CONTINUAR', () => this.resumeGame());
    this.button(width / 2, startY + gap, 'REINTENTAR', () => {
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('GameScene');
    });
    this.button(width / 2, startY + gap * 2, 'MENÚ PRINCIPAL', () => {
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('MenuScene');
    });

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.resumeGame());
      keyboard.addKey('P').on('down', () => this.resumeGame());
    }
  }

  private resumeGame(): void {
    AudioManager.play('uiClick');
    AudioManager.startMusic();
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 260, 46, 0x1a1a2e, 0.9)
      .setStrokeStyle(3, 0xffe066)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x2c2c54, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e, 0.9));
    bg.on('pointerdown', () => {
      AudioManager.play('uiClick');
      onClick();
    });
  }
}
