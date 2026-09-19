import Phaser from 'phaser';
import { Storage } from '../utils/Storage';
import { AudioManager } from '../systems/AudioManager';
import { Analytics } from '../systems/Analytics';

const FONT = '"Arial Black", Arial, sans-serif';

type View = 'main' | 'instructions' | 'record';

export class MenuScene extends Phaser.Scene {
  private mainContainer!: Phaser.GameObjects.Container;
  private instructionsContainer!: Phaser.GameObjects.Container;
  private recordContainer!: Phaser.GameObjects.Container;
  private soundButtonText!: Phaser.GameObjects.Text;
  private view: View = 'main';

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#6fb8d9');

    this.add.image(width / 2, height * 0.42, 'bg_far').setScrollFactor(0).setAlpha(0.9);
    this.add.image(width / 2, height * 0.55, 'bg_mid').setScrollFactor(0).setAlpha(0.95);
    this.add.tileSprite(width / 2, height - 20, width, 40, 'ground');

    this.add
      .text(width / 2, height * 0.15, 'ALERTA GALLINAZOS', {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#ffe066',
        stroke: '#1a1a1a',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.15 + 36, 'Defiende tu barrio', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#1a1a1a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const heroTexture = `player_${Storage.getSelectedCharacter()}_idle`;
    const heroPreview = this.add
      .image(width / 2, height * 0.46, this.textures.exists(heroTexture) ? heroTexture : 'player_clasico_idle')
      .setScale(1.8);
    this.tweens.add({
      targets: heroPreview,
      y: heroPreview.y - 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.mainContainer = this.add.container(0, 0);
    this.instructionsContainer = this.add.container(0, 0).setVisible(false);
    this.recordContainer = this.add.container(0, 0).setVisible(false);

    this.buildMainMenu(width, height);
    this.buildInstructions(width, height);
    this.buildRecordPanel(width, height);

    AudioManager.startMusic();
  }

  private button(x: number, y: number, label: string, onClick: () => void, w = 260): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, w, 44, 0x1a1a2e, 0.85)
      .setStrokeStyle(3, 0xffe066)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [bg, text]);

    bg.on('pointerover', () => bg.setFillStyle(0x2c2c54, 0.9));
    bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e, 0.85));
    bg.on('pointerdown', () => {
      AudioManager.unlock();
      AudioManager.play('uiClick');
      onClick();
    });
    return container;
  }

  private buildMainMenu(width: number, height: number): void {
    const startY = height * 0.68;
    const gap = 50;
    this.mainContainer.add(
      this.button(width / 2, startY, 'JUGAR', () => {
        Analytics.menuJugarClick();
        this.scene.start('CharacterSelectScene');
      })
    );
    this.mainContainer.add(
      this.button(width / 2, startY + gap, 'INSTRUCCIONES', () => {
        Analytics.menuInstruccionesClick();
        this.setView('instructions');
      })
    );
    this.mainContainer.add(
      this.button(width / 2, startY + gap * 2, 'RÉCORD', () => {
        Analytics.menuRecordClick();
        this.setView('record');
      })
    );

    const settings = AudioManager.getSettings();
    const soundBtn = this.button(width / 2, startY + gap * 3, '', () => {
      const on = AudioManager.toggleMute();
      Analytics.menuSonidoToggle(on);
      this.soundButtonText.setText(`SONIDO: ${on ? 'ON' : 'OFF'}`);
    });
    this.soundButtonText = soundBtn.list[1] as Phaser.GameObjects.Text;
    this.soundButtonText.setText(`SONIDO: ${settings.musicOn && settings.sfxOn ? 'ON' : 'OFF'}`);
    this.mainContainer.add(soundBtn);
  }

  private buildInstructions(width: number, height: number): void {
    const panel = this.add.rectangle(width / 2, height / 2, width * 0.82, height * 0.72, 0x0d0d1a, 0.92).setStrokeStyle(3, 0xffe066);
    const title = this.add
      .text(width / 2, height / 2 - height * 0.3, 'INSTRUCCIONES', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffe066',
      })
      .setOrigin(0.5);

    const body =
      'PC:\n' +
      'A / ← : mover izquierda\n' +
      'D / → : mover derecha\n' +
      'Mouse : apuntar\n' +
      'Click izq. / SPACE : disparar\n' +
      'R : recargar\n\n' +
      'MÓVIL:\n' +
      'Joystick izq. : mover\n' +
      'Zona derecha : apuntar\n' +
      'Botón FUEGO : disparar\n' +
      'Botón R : recargar\n\n' +
      'Elimina gallinazos antes de que te ataquen.\n' +
      'Recoge power-ups y encadena combos para\n' +
      'maximizar tu puntuación.';

    const bodyText = this.add
      .text(width / 2, height / 2 - height * 0.05, body, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0.28);

    const closeBtn = this.button(width / 2, height / 2 + height * 0.32, 'VOLVER', () => this.setView('main'), 180);
    this.instructionsContainer.add([panel, title, bodyText, closeBtn]);
  }

  private buildRecordPanel(width: number, height: number): void {
    const panel = this.add.rectangle(width / 2, height / 2, width * 0.78, height * 0.62, 0x0d0d1a, 0.92).setStrokeStyle(3, 0xffe066);
    const title = this.add
      .text(width / 2, height / 2 - height * 0.24, 'RÉCORD Y ESTADÍSTICAS', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffe066',
      })
      .setOrigin(0.5);

    const high = Storage.getHighScore();
    const stats = Storage.getStats();
    const body =
      `PUNTUACIÓN MÁXIMA: ${high.toLocaleString('es-PE')}\n\n` +
      `Partidas jugadas: ${stats.gamesPlayed}\n` +
      `Enemigos eliminados: ${stats.enemiesKilled}\n` +
      `Mejor combo: x${stats.bestCombo}\n` +
      `Mejor oleada: ${stats.bestWave}\n` +
      `Mejor puntuación: ${stats.bestScore.toLocaleString('es-PE')}`;

    const bodyText = this.add
      .text(width / 2, height / 2 - 10, body, {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const closeBtn = this.button(width / 2, height / 2 + height * 0.24, 'VOLVER', () => this.setView('main'), 180);
    this.recordContainer.add([panel, title, bodyText, closeBtn]);
    this.recordContainer.setDataEnabled();
  }

  private setView(view: View): void {
    this.view = view;
    this.mainContainer.setVisible(view === 'main');
    this.instructionsContainer.setVisible(view === 'instructions');
    if (view === 'record') {
      this.recordContainer.removeAll(true);
      this.buildRecordPanel(this.scale.width, this.scale.height);
    }
    this.recordContainer.setVisible(view === 'record');
  }
}
