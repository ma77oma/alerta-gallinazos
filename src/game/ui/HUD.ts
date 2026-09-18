import Phaser from 'phaser';

const FONT = '"Arial Black", Arial, sans-serif';

/**
 * All in-game HUD elements: health/ammo/score/combo/wave readouts, the
 * boss health bar, wave banners, floating score popups and the combo
 * indicator. Everything lives in scroll-factor-0 space so it stays fixed
 * to the camera regardless of world scrolling/shake.
 */
export class HUD {
  private scene: Phaser.Scene;

  private healthBarBg: Phaser.GameObjects.Graphics;
  private healthBarFill: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text;

  private ammoText: Phaser.GameObjects.Text;
  private ammoBar: Phaser.GameObjects.Graphics;

  private scoreText: Phaser.GameObjects.Text;
  private highScoreText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;

  private bossBarBg: Phaser.GameObjects.Graphics;
  private bossBarFill: Phaser.GameObjects.Graphics;
  private bossLabel: Phaser.GameObjects.Text;

  private waveBanner: Phaser.GameObjects.Text;
  private powerupLabels: { text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Text }[] = [];

  private pauseButton: Phaser.GameObjects.Arc;
  private pauseIcon: Phaser.GameObjects.Text;
  onPauseClick?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const pad = 16;

    // HEALTH
    this.healthBarBg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.healthBarFill = scene.add.graphics().setScrollFactor(0).setDepth(101);
    this.healthText = scene.add
      .text(pad, pad - 2, 'VIDA', { fontFamily: FONT, fontSize: '13px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(102);

    // AMMO
    this.ammoBar = scene.add.graphics().setScrollFactor(0).setDepth(101);
    this.ammoText = scene.add
      .text(pad, pad + 44, '12 / 12', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(102);

    // SCORE / COMBO / WAVE (top right)
    this.scoreText = scene.add
      .text(0, pad - 2, 'PUNTOS: 0', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setOrigin(1, 0);

    this.highScoreText = scene.add
      .text(0, pad + 22, 'RÉCORD: 0', {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#cfd8e3',
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setOrigin(1, 0);

    this.comboText = scene.add
      .text(0, pad + 44, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ff6b3d',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setOrigin(1, 0);

    this.waveText = scene.add
      .text(0, 0, 'OLEADA 1', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#a8e6a1',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setOrigin(0.5, 0);

    // BOSS BAR
    this.bossBarBg = scene.add.graphics().setScrollFactor(0).setDepth(100).setVisible(false);
    this.bossBarFill = scene.add.graphics().setScrollFactor(0).setDepth(101).setVisible(false);
    this.bossLabel = scene.add
      .text(0, 0, 'GALLINAZO GIGANTE', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(102)
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.waveBanner = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setScrollFactor(0)
      .setDepth(150)
      .setOrigin(0.5)
      .setAlpha(0);

    // PAUSE BUTTON (bottom-right corner — clear of the health/ammo/score
    // readouts and, on mobile, clear of the joystick/fire/reload buttons).
    this.pauseButton = scene.add
      .circle(0, 0, 20, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(110)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true });
    this.pauseIcon = scene.add
      .text(0, 0, '❚❚', { fontFamily: FONT, fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);
    this.pauseButton.on('pointerdown', () => this.onPauseClick?.());

    this.layout(scene.scale.width, scene.scale.height);
    this.setHealth(1);
    this.setAmmo(12, 12, false, 1);
  }

  layout(width: number, height: number): void {
    this.scoreText.setX(width - 16);
    this.highScoreText.setX(width - 16);
    this.comboText.setX(width - 16);
    this.waveText.setX(width / 2).setY(16);
    this.bossLabel.setX(width / 2).setY(16);
    this.waveBanner.setPosition(width / 2, height / 2 - 40);
    this.pauseButton.setPosition(width - 32, height - 32);
    this.pauseIcon.setPosition(width - 32, height - 32);
    this.drawHealthChrome();
  }

  private drawHealthChrome(): void {
    const pad = 16;
    this.healthBarBg.clear();
    this.healthBarBg.fillStyle(0x000000, 0.45);
    this.healthBarBg.fillRoundedRect(pad, pad + 14, 200, 18, 6);
  }

  setHealth(ratio: number): void {
    const pad = 16;
    this.healthBarFill.clear();
    const w = Math.max(0, 196 * ratio);
    const color = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffa726 : 0xe53935;
    this.healthBarFill.fillStyle(color, 1);
    this.healthBarFill.fillRoundedRect(pad + 2, pad + 16, w, 14, 5);
  }

  setAmmo(ammo: number, max: number, reloading: boolean, reloadProgress: number): void {
    const pad = 16;
    this.ammoBar.clear();
    this.ammoBar.fillStyle(0x000000, 0.45);
    this.ammoBar.fillRoundedRect(pad, pad + 60, 140, 12, 5);
    if (reloading) {
      this.ammoBar.fillStyle(0x4a90e2, 1);
      this.ammoBar.fillRoundedRect(pad + 2, pad + 62, 136 * reloadProgress, 8, 4);
      this.ammoText.setText('RECARGANDO...');
    } else {
      const ratio = max > 0 ? ammo / max : 0;
      this.ammoBar.fillStyle(ratio > 0.3 ? 0xffd54f : 0xe53935, 1);
      this.ammoBar.fillRoundedRect(pad + 2, pad + 62, 136 * ratio, 8, 4);
      this.ammoText.setText(`${ammo} / ${max}`);
    }
  }

  setScore(score: number): void {
    this.scoreText.setText(`PUNTOS: ${score.toLocaleString('es-PE')}`);
  }

  setHighScore(score: number): void {
    this.highScoreText.setText(`RÉCORD: ${score.toLocaleString('es-PE')}`);
  }

  setCombo(multiplier: number): void {
    if (multiplier <= 1) {
      this.comboText.setText('');
      return;
    }
    this.comboText.setText(`COMBO x${multiplier}`);
    this.scene.tweens.add({
      targets: this.comboText,
      scale: { from: 1.4, to: 1 },
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  setWave(wave: number): void {
    this.waveText.setText(`OLEADA ${wave}`);
  }

  showBossBar(visible: boolean): void {
    this.bossBarBg.setVisible(visible);
    this.bossBarFill.setVisible(visible);
    this.bossLabel.setVisible(visible);
    this.waveText.setVisible(!visible);
  }

  setBossHealth(ratio: number): void {
    const width = this.scene.scale.width;
    const barW = Math.min(500, width - 120);
    const x = width / 2 - barW / 2;
    this.bossBarBg.clear();
    this.bossBarBg.fillStyle(0x000000, 0.5);
    this.bossBarBg.fillRoundedRect(x, 38, barW, 16, 6);
    this.bossBarFill.clear();
    this.bossBarFill.fillStyle(0xd94b4b, 1);
    this.bossBarFill.fillRoundedRect(x + 2, 40, Math.max(0, (barW - 4) * ratio), 12, 4);
  }

  showWaveBanner(text: string, color = '#ffffff'): void {
    this.waveBanner.setText(text);
    this.waveBanner.setColor(color);
    this.waveBanner.setAlpha(0);
    this.waveBanner.setScale(0.6);
    this.scene.tweens.add({
      targets: this.waveBanner,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(900, () => {
          this.scene.tweens.add({ targets: this.waveBanner, alpha: 0, duration: 300 });
        });
      },
    });
  }

  showFloatingScore(x: number, y: number, points: number, combo: number): void {
    const label = combo > 1 ? `+${points} (x${combo})` : `+${points}`;
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setDepth(105)
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  showPickupText(x: number, y: number, label: string): void {
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#8ec2ff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setDepth(105)
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }

  destroy(): void {
    this.powerupLabels.forEach((p) => {
      p.text.destroy();
      p.icon.destroy();
    });
  }
}
