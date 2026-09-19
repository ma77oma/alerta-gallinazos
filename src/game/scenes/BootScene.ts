import Phaser from 'phaser';
import { TextureGenerator } from '../utils/TextureGenerator';
import kingtekaFullUrl from '../../assets/images/kingteka_full.png';
import ciriloFullUrl from '../../assets/images/cirilo_full.png';
import pnkzFullUrl from '../../assets/images/pnkz_full.png';
import najasorFullUrl from '../../assets/images/najasor_full.png';
import charlesFullUrl from '../../assets/images/charles_full.png';
import fuzoFullUrl from '../../assets/images/fuzo_full.png';
import cevicheroFullUrl from '../../assets/images/cevichero_full.png';
import axelFullUrl from '../../assets/images/axel_full.png';

/**
 * Generates every sprite texture procedurally (see TextureGenerator) so
 * the game needs zero external art assets to be fully playable, then
 * hands off to the main menu. The "Kingteka" character's body is the one
 * exception — it's a real (background-removed) illustration composited
 * onto that character's sprite slots, see applyFullBodySprite() below.
 *
 * To use a real photo for a player's face instead of the drawn one, load
 * it here and call `generator.applyCustomFace('<key>', '<characterId>')`
 * after `generateAll()` (see TextureGenerator.applyCustomFace — it
 * composites the photo onto every pose without touching the body).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('kingteka_full', kingtekaFullUrl);
    this.load.image('cirilo_full', ciriloFullUrl);
    this.load.image('pnkz_full', pnkzFullUrl);
    this.load.image('najasor_full', najasorFullUrl);
    this.load.image('charles_full', charlesFullUrl);
    this.load.image('fuzo_full', fuzoFullUrl);
    this.load.image('cevichero_full', cevicheroFullUrl);
    this.load.image('axel_full', axelFullUrl);
  }

  create(): void {
    const { width, height } = this.scale;
    const loadingText = this.add
      .text(width / 2, height / 2, 'Cargando...', {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const generator = new TextureGenerator(this);
    generator.generateAll();
    generator.applyFullBodySprite('kingteka_full', 'clasico');
    generator.applyFullBodySprite('cirilo_full', 'turbo');
    generator.applyFullBodySprite('pnkz_full', 'narizon');
    generator.applyFullBodySprite('najasor_full', 'lentes');
    generator.applyFullBodySprite('charles_full', 'grandote');
    generator.applyFullBodySprite('fuzo_full', 'fuzo');
    generator.applyFullBodySprite('cevichero_full', 'cevichero');
    generator.applyFullBodySprite('axel_full', 'chato');

    loadingText.destroy();
    this.scene.start('MenuScene');
  }
}
