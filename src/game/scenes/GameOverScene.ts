import Phaser from 'phaser';
import { Storage } from '../utils/Storage';
import { AudioManager } from '../systems/AudioManager';

const FONT = '"Arial Black", Arial, sans-serif';

export interface GameOverData {
  score: number;
  wave: number;
  kills: number;
  bestCombo: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a0d0d');
    AudioManager.play('gameOver');

    const { stats, isNewHighScore } = Storage.recordGameEnd({
      score: data.score,
      wave: data.wave,
      kills: data.kills,
      bestComboThisRun: data.bestCombo,
    });

    this.add
      .text(width / 2, height * 0.16, 'GAME OVER', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#e53935',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    if (isNewHighScore) {
      this.add
        .text(width / 2, height * 0.16 + 46, '¡NUEVO RÉCORD!', {
          fontFamily: FONT,
          fontSize: '20px',
          color: '#ffe066',
        })
        .setOrigin(0.5);
    }

    const lines = [
      `PUNTUACIÓN: ${data.score.toLocaleString('es-PE')}`,
      `RÉCORD: ${Storage.getHighScore().toLocaleString('es-PE')}`,
      `OLEADA ALCANZADA: ${data.wave}`,
      `ENEMIGOS ELIMINADOS: ${data.kills}`,
      `MEJOR COMBO: x${data.bestCombo}`,
    ];

    this.add
      .text(width / 2, height * 0.42, lines.join('\n'), {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    void stats;

    this.button(width / 2, height * 0.76, 'REINTENTAR', () => {
      this.scene.start('GameScene');
    });
    this.button(width / 2, height * 0.76 + 62, 'MENÚ PRINCIPAL', () => {
      this.scene.start('MenuScene');
    });
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 260, 52, 0x1a1a2e, 0.9)
      .setStrokeStyle(3, 0xffe066)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: '19px', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x2c2c54, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e, 0.9));
    bg.on('pointerdown', () => {
      AudioManager.play('uiClick');
      onClick();
    });
  }
}
