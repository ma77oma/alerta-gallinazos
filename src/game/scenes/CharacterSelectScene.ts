import Phaser from 'phaser';
import { CHARACTERS } from '../config/Characters';
import { Storage } from '../utils/Storage';
import { AudioManager } from '../systems/AudioManager';
import { Analytics } from '../systems/Analytics';

const FONT = '"Arial Black", Arial, sans-serif';

/**
 * Lets the player pick which of the CHARACTERS (see config/Characters.ts)
 * to play as. The choice is persisted via Storage and read by GameScene
 * when it builds the Player, so it carries over between runs until changed
 * here again.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private selectedId: string = Storage.getSelectedCharacter();
  private cards: { id: string; bg: Phaser.GameObjects.Rectangle }[] = [];
  private previewLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.selectedId = Storage.getSelectedCharacter();
    this.cards = [];

    this.add.rectangle(width / 2, height / 2, width, height, 0x6fb8d9);
    this.add.image(width / 2, height * 0.32, 'bg_far').setAlpha(0.85);
    this.add.image(width / 2, height * 0.5, 'bg_mid').setAlpha(0.9);
    this.add.tileSprite(width / 2, height - 20, width, 40, 'ground');

    this.add
      .text(width / 2, 30, 'ELIGE TU PERSONAJE', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.previewLabel = this.add
      .text(width / 2, 66, '', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Grid layout so the roster can grow past a single row without
    // overflowing the 960-wide canvas.
    const cols = 4;
    const cardW = 128;
    const cardH = 168;
    const gapX = 14;
    const gapY = 12;
    const count = CHARACTERS.length;
    const rows = Math.ceil(count / cols);
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = width / 2 - totalW / 2 + cardW / 2;
    const totalH = rows * cardH + (rows - 1) * gapY;
    const startY = height * 0.5 - totalH / 2 + cardH / 2;

    CHARACTERS.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.buildCard(def.id, def.label, x, y, cardW, cardH);
    });

    this.refreshSelection();

    this.button(width / 2 - 140, height - 56, 'VOLVER', () => {
      Analytics.characterSelectBack();
      this.scene.start('MenuScene');
    });
    this.button(width / 2 + 140, height - 56, 'JUGAR', () => {
      Storage.setSelectedCharacter(this.selectedId);
      AudioManager.play('uiClick');
      this.scene.start('GameScene');
    });
  }

  private buildCard(id: string, label: string, x: number, y: number, cardW: number, cardH: number): void {
    const bg = this.add
      .rectangle(x, y, cardW, cardH, 0x1a1a2e, 0.85)
      .setStrokeStyle(3, 0x555577)
      .setInteractive({ useHandCursor: true });

    const portrait = this.add.image(x, y - 22, `player_${id}_idle`).setScale(1.25);
    const maxPortraitH = cardH * 0.62;
    if (portrait.displayHeight > maxPortraitH) {
      portrait.setScale((maxPortraitH / portrait.height) as number);
    }
    this.add
      .text(x, y + cardH / 2 - 20, label, {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      if (this.selectedId !== id) bg.setStrokeStyle(3, 0xffffff);
    });
    bg.on('pointerout', () => this.refreshSelection());
    bg.on('pointerdown', () => {
      this.selectedId = id;
      AudioManager.play('uiClick');
      this.refreshSelection();
    });

    this.cards.push({ id, bg });
  }

  private refreshSelection(): void {
    for (const card of this.cards) {
      const selected = card.id === this.selectedId;
      card.bg.setStrokeStyle(selected ? 4 : 3, selected ? 0xffe066 : 0x555577);
      card.bg.setFillStyle(0x1a1a2e, selected ? 0.95 : 0.85);
    }
    const def = CHARACTERS.find((c) => c.id === this.selectedId);
    this.previewLabel.setText(def ? def.label.toUpperCase() : '');
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add
      .rectangle(x, y, 220, 48, 0x1a1a2e, 0.9)
      .setStrokeStyle(3, 0xffe066)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x2c2c54, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(0x1a1a2e, 0.9));
    bg.on('pointerdown', onClick);
  }
}
