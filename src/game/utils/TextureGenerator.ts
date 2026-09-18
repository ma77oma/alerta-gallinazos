import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig';
import { CHARACTERS, getCharacterById, type CharacterDef } from '../config/Characters';

const POSE_NAMES = ['idle', 'walk1', 'walk2', 'shoot', 'hurt', 'reload'] as const;

/**
 * Draws every sprite used in the game as vector shapes and bakes them into
 * textures via Graphics.generateTexture. This means the game is fully
 * playable without any external art assets — swap in real sprite sheets
 * later by replacing the texture keys generated here (see README).
 */
export class TextureGenerator {
  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.g = scene.make.graphics({ x: 0, y: 0 }, false);
  }

  generateAll(): void {
    this.generatePlayerFrames();
    this.generateGun();
    this.generateBullet();
    this.generateMuzzleFlash();
    this.generateFeather();
    this.generateSmoke();
    this.generateSpark();
    this.generateVulture('vulture_normal', 34, 0x4a4238, 0x2b2620, false);
    this.generateVulture('vulture_fast', 24, 0x704a3a, 0x3a2620, false);
    this.generateVulture('vulture_heavy', 48, 0x3a3a44, 0x1f1f28, false);
    this.generateVulture('vulture_aggressive', 34, 0x7a2a2a, 0x3a1414, true);
    this.generateBoss();
    this.generatePowerUps();
    this.generateEnvironment();
    this.generateUIBits();
    this.g.destroy();
  }

  private clear(): Phaser.GameObjects.Graphics {
    this.g.clear();
    return this.g;
  }

  /**
   * Composites a real photo (circular-cropped, see BootScene) on top of
   * every generated pose for one character, in place of the procedural
   * cartoon face — the body/limbs/animations stay exactly as drawn, only
   * the head area is replaced. Safe to call even if no photo was loaded
   * (no-op).
   */
  applyCustomFace(faceKey: string, characterId = 'clasico'): void {
    if (!this.scene.textures.exists(faceKey)) return;
    const def = getCharacterById(characterId);
    const { canvasW: w, canvasH: h, cx, headCy, headR } = def.layout;
    const faceCx = cx;
    const faceCy = headCy;
    const faceDiameter = headR * 2 + 10;

    for (const pose of POSE_NAMES) {
      const key = `player_${def.id}_${pose}`;
      if (!this.scene.textures.exists(key)) continue;

      const rt = this.scene.make.renderTexture({ width: w, height: h }, false);
      rt.draw(key, 0, 0);

      const faceImg = this.scene.make.image({ key: faceKey }, false);
      faceImg.setDisplaySize(faceDiameter, faceDiameter);
      faceImg.setPosition(faceCx, faceCy);
      rt.draw(faceImg);
      faceImg.destroy();

      const ring = this.scene.make.graphics({}, false);
      ring.lineStyle(3, 0x1a1a1a, 1);
      ring.strokeCircle(faceCx, faceCy, faceDiameter / 2 - 1);
      rt.draw(ring, 0, 0);
      ring.destroy();

      this.scene.textures.remove(key);
      rt.saveTexture(key);
      rt.destroy();
    }
  }

  /**
   * Replaces every pose of one character with a single static illustration
   * (already background-removed — see BootScene) instead of the procedural
   * drawing. The image is scaled to fit that character's existing canvas
   * (so hitbox sizing and the gun anchor point, both derived from
   * layout.canvasW/H, stay correct) and anchored to the ground line. Since
   * it's one static image, that character loses per-pose walk/shoot/reload
   * art — it'll still flip, recoil and aim normally, just without a
   * changing pose. Safe to call even if no image was loaded (no-op).
   */
  applyFullBodySprite(imageKey: string, characterId: string): void {
    if (!this.scene.textures.exists(imageKey)) return;
    const def = getCharacterById(characterId);
    const { canvasW: w, canvasH: h } = def.layout;
    const source = this.scene.textures.get(imageKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const srcW = source.width;
    const srcH = source.height;
    const margin = 6;
    const scale = Math.min(w / srcW, (h - margin) / srcH);
    const dispW = srcW * scale;
    const dispH = srcH * scale;

    for (const pose of POSE_NAMES) {
      const key = `player_${def.id}_${pose}`;
      const rt = this.scene.make.renderTexture({ width: w, height: h }, false);

      const shadow = this.scene.make.graphics({}, false);
      shadow.fillStyle(0x000000, 0.22);
      shadow.fillEllipse(w / 2, h - margin / 2, dispW * 0.75, 10);
      rt.draw(shadow, 0, 0);
      shadow.destroy();

      const img = this.scene.make.image({ key: imageKey }, false);
      img.setDisplaySize(dispW, dispH);
      img.setPosition(w / 2, h - margin - dispH / 2);
      rt.draw(img);
      img.destroy();

      this.scene.textures.remove(key);
      rt.saveTexture(key);
      rt.destroy();
    }
  }

  // ---------------------------------------------------------------- player
  private generatePlayerFrames(): void {
    for (const def of CHARACTERS) {
      POSE_NAMES.forEach((pose, i) => this.drawPlayer(`player_${def.id}_${pose}`, i, def));
    }
  }

  private drawPlayer(key: string, pose: number, def: CharacterDef): void {
    const g = this.clear();
    const { headR, headCy, torsoY, torsoH, torsoW, legY, legLen, shoeY, shoeH, canvasW: w, canvasH: h, cx } = def.layout;
    const legOffset = pose === 1 ? 6 : pose === 2 ? -6 : 0;
    const armPose = pose === 3 ? 'shoot' : pose === 5 ? 'reload' : 'idle';
    const skin = pose === 4 ? 0xe08060 : def.skin;
    const legW = torsoW * 0.3;
    const legGap = torsoW * 0.08;

    // shadow
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(cx, h - 4, torsoW * 0.9, 12);

    // back legs
    g.fillStyle(def.pants, 1);
    g.fillRoundedRect(cx - legW - legGap + legOffset, legY, legW, legLen, 5);
    g.fillRoundedRect(cx + legGap - legOffset, legY, legW, legLen, 5);
    // shoes
    g.fillStyle(def.shoe, 1);
    g.fillRoundedRect(cx - legW - legGap - 2 + legOffset, shoeY, legW + 4, shoeH, 4);
    g.fillRoundedRect(cx + legGap - 2 - legOffset, shoeY, legW + 4, shoeH, 4);

    // torso
    g.fillStyle(def.shirt, 1);
    g.fillRoundedRect(cx - torsoW / 2, torsoY, torsoW, torsoH, torsoW * 0.3);
    if (def.shirtPrint !== 'none') this.drawShirtPrint(g, def.shirtPrint, cx, torsoY, torsoW, torsoH);
    // belt
    g.fillStyle(0x8a5a2a, 1);
    g.fillRoundedRect(cx - torsoW / 2, torsoY + torsoH * 0.78, torsoW, torsoH * 0.16, 3);

    // back arm
    const armW = torsoW * 0.27;
    const armH = torsoH * 0.56;
    g.fillStyle(skin, 1);
    if (armPose === 'reload') {
      g.fillRoundedRect(cx + torsoW * 0.42, torsoY + torsoH * 0.32, armW, armH, 6);
    } else {
      g.fillRoundedRect(cx - torsoW / 2 - armW * 0.6, torsoY + torsoH * 0.22, armW, armH, 6);
    }

    // head + ears
    g.fillStyle(skin, 1);
    g.fillCircle(cx, headCy, headR);
    g.fillCircle(cx - headR, headCy + headR * 0.05, headR * 0.25);
    g.fillCircle(cx + headR, headCy + headR * 0.05, headR * 0.25);

    if (def.special === 'crazyMask') {
      this.drawCrazyMask(g, cx, headCy, headR, pose);
    } else {
      this.drawHair(g, def, cx, headCy, headR);
      if (def.special === 'frozenFace') {
        this.drawFrozenFace(g, cx, headCy, headR);
      } else {
        this.drawFace(g, def, cx, headCy, headR, pose);
        if (def.scar) this.drawScar(g, cx, headCy, headR);
      }
      this.drawBeard(g, def, cx, headCy, headR, pose === 4);
    }
    if (def.glasses) this.drawGlasses(g, cx, headCy, headR);

    // front arm ending in a fist (the gun is a separate rotating sprite)
    g.fillStyle(skin, 1);
    const armY = torsoY + (armPose === 'shoot' ? torsoH * 0.36 : torsoH * 0.3);
    g.fillRoundedRect(cx + torsoW * 0.24, armY, armW * 1.05, armH * 0.55, 6);
    g.fillCircle(cx + torsoW * 0.24 + armW * 1.05, armY + armH * 0.275, headR * 0.4);

    g.generateTexture(key, w, h);
  }

  private drawHair(g: Phaser.GameObjects.Graphics, def: CharacterDef, cx: number, headCy: number, headR: number): void {
    if (def.hairStyle === 'bald') {
      // subtle shine highlight instead of hair
      g.fillStyle(0xffffff, 0.18);
      g.fillEllipse(cx - headR * 0.3, headCy - headR * 0.5, headR * 0.5, headR * 0.28);
      return;
    }

    g.fillStyle(def.hair, 1);
    if (def.hairStyle === 'big') {
      // large poofy/long hair framing the whole head
      g.fillCircle(cx, headCy - headR * 0.15, headR * 1.35);
      g.fillCircle(cx - headR * 1.1, headCy + headR * 0.3, headR * 0.55);
      g.fillCircle(cx + headR * 1.1, headCy + headR * 0.3, headR * 0.55);
      // re-expose the face circle on top so hair only frames it
      g.fillStyle(def.skin, 1);
      g.fillCircle(cx, headCy, headR);
      g.fillStyle(def.hair, 1);
      return;
    }

    // short/default: arc + fringe
    g.slice(cx, headCy - headR * 0.2, headR * 1.05, Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(-10), false);
    g.fillPath();
    g.fillRoundedRect(cx - headR * 1.05, headCy - headR * 0.7, headR * 2.1, headR * 0.6, headR * 0.4);
  }

  /**
   * A wacky green party mask: swept pointy "hair", bulging eyes and a huge
   * toothy grin — a generic loco-mask archetype (not a 1:1 copy of any
   * specific copyrighted character's exact look/outfit).
   */
  private drawCrazyMask(g: Phaser.GameObjects.Graphics, cx: number, headCy: number, headR: number, pose: number): void {
    const maskColor = 0x3fae4a;
    const maskShade = 0x2e8f3a;

    // face-covering green (slightly larger than the skin head so it reads
    // as a mask worn over the face rather than actual skin)
    g.fillStyle(maskColor, 1);
    g.fillCircle(cx, headCy, headR * 1.08);

    // swept pointy "hair" — three flame-like points leaning back
    g.fillTriangle(
      cx - headR * 0.75, headCy - headR * 0.55,
      cx - headR * 0.15, headCy - headR * 1.7,
      cx + headR * 0.05, headCy - headR * 0.55
    );
    g.fillTriangle(
      cx - headR * 0.05, headCy - headR * 0.65,
      cx + headR * 0.55, headCy - headR * 1.9,
      cx + headR * 0.4, headCy - headR * 0.55
    );
    g.fillTriangle(
      cx + headR * 0.3, headCy - headR * 0.5,
      cx + headR * 0.95, headCy - headR * 1.35,
      cx + headR * 0.7, headCy - headR * 0.35
    );

    // brow shading
    g.fillStyle(maskShade, 0.5);
    g.fillEllipse(cx, headCy - headR * 0.18, headR * 1.5, headR * 0.4);

    // bulging eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - headR * 0.38, headCy - headR * 0.02, headR * 0.24);
    g.fillCircle(cx + headR * 0.4, headCy - headR * 0.02, headR * 0.24);
    g.fillStyle(0x1a1a1a, 1);
    const pupilR = pose === 4 ? headR * 0.06 : headR * 0.11;
    g.fillCircle(cx - headR * 0.34, headCy, pupilR);
    g.fillCircle(cx + headR * 0.44, headCy, pupilR);

    // huge toothy grin
    const mouthW = headR * 1.15;
    const mouthH = headR * 0.42;
    const mouthY = headCy + headR * 0.28;
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - mouthW / 2, mouthY, mouthW, mouthH, mouthH * 0.35);
    g.lineStyle(Math.max(1.5, headR * 0.06), 0x1a1a1a, 1);
    g.strokeRoundedRect(cx - mouthW / 2, mouthY, mouthW, mouthH, mouthH * 0.35);
    g.lineStyle(Math.max(1, headR * 0.035), 0x1a1a1a, 0.55);
    for (let i = 1; i < 4; i++) {
      const lx = cx - mouthW / 2 + (mouthW * i) / 4;
      g.lineBetween(lx, mouthY + 1, lx, mouthY + mouthH - 1);
    }
  }

  private drawShirtPrint(
    g: Phaser.GameObjects.Graphics,
    print: 'fish' | 'racing',
    cx: number,
    torsoY: number,
    torsoW: number,
    torsoH: number
  ): void {
    if (print === 'fish') {
      const fx = cx;
      const fy = torsoY + torsoH * 0.4;
      g.fillStyle(0xffe066, 1);
      g.fillEllipse(fx + torsoW * 0.03, fy, torsoW * 0.26, torsoW * 0.13);
      g.fillTriangle(
        fx - torsoW * 0.12, fy,
        fx - torsoW * 0.24, fy - torsoW * 0.09,
        fx - torsoW * 0.24, fy + torsoW * 0.09
      );
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(fx + torsoW * 0.13, fy, torsoW * 0.018);
      return;
    }

    // racing: two contrasting stripes + a circular number badge
    g.fillStyle(0xffffff, 1);
    g.fillRect(cx - torsoW / 2, torsoY + torsoH * 0.14, torsoW, torsoH * 0.1);
    g.fillRect(cx - torsoW / 2, torsoY + torsoH * 0.42, torsoW, torsoH * 0.1);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(cx, torsoY + torsoH * 0.32, torsoW * 0.14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, torsoY + torsoH * 0.32, torsoW * 0.09);
  }

  private drawScar(g: Phaser.GameObjects.Graphics, cx: number, headCy: number, headR: number): void {
    g.lineStyle(Math.max(1.5, headR * 0.07), 0xa85a4a, 0.85);
    g.lineBetween(cx - headR * 0.58, headCy - headR * 0.55, cx - headR * 0.18, headCy + headR * 0.12);
  }

  /** A calm, unmoving stare — used instead of drawFace() so the expression
   *  never changes even when hurt, for a deadpan "frozen" look. */
  private drawFrozenFace(g: Phaser.GameObjects.Graphics, cx: number, headCy: number, headR: number): void {
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(cx, headCy + headR * 0.08, headR * 1.55, headR * 0.95);

    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(cx - headR * 0.32, headCy - headR * 0.02, headR * 0.08);
    g.fillCircle(cx + headR * 0.32, headCy - headR * 0.02, headR * 0.08);

    g.lineStyle(Math.max(1.5, headR * 0.05), 0x8a6a5a, 0.75);
    g.lineBetween(cx - headR * 0.22, headCy + headR * 0.36, cx + headR * 0.22, headCy + headR * 0.36);
  }

  private drawFace(
    g: Phaser.GameObjects.Graphics,
    def: CharacterDef,
    cx: number,
    headCy: number,
    headR: number,
    pose: number
  ): void {
    g.fillStyle(0x1a1a1a, 1);
    if (pose === 4) {
      // hurt: x_x eyes
      g.lineStyle(2, 0x1a1a1a, 1);
      g.lineBetween(cx - headR * 0.6, headCy - headR * 0.2, cx - headR * 0.3, headCy + headR * 0.1);
      g.lineBetween(cx - headR * 0.3, headCy - headR * 0.2, cx - headR * 0.6, headCy + headR * 0.1);
      g.lineBetween(cx + headR * 0.3, headCy - headR * 0.2, cx + headR * 0.6, headCy + headR * 0.1);
      g.lineBetween(cx + headR * 0.6, headCy - headR * 0.2, cx + headR * 0.3, headCy + headR * 0.1);
    } else {
      g.fillCircle(cx - headR * 0.4, headCy - headR * 0.05, headR * 0.13);
      g.fillCircle(cx + headR * 0.4, headCy - headR * 0.05, headR * 0.13);
    }

    if (def.noseSize === 'big') {
      g.fillStyle(def.skin, 1);
      g.fillEllipse(cx, headCy + headR * 0.16, headR * 0.26, headR * 0.36);
      g.fillStyle(0x000000, 0.12);
      g.fillEllipse(cx, headCy + headR * 0.16, headR * 0.26, headR * 0.36);
    }
  }

  private drawBeard(
    g: Phaser.GameObjects.Graphics,
    def: CharacterDef,
    cx: number,
    headCy: number,
    headR: number,
    hidden: boolean
  ): void {
    if (def.beard === 'none') return;
    const alpha = hidden ? 0 : 1;

    if (def.beard === 'full') {
      g.fillStyle(def.hair, alpha);
      g.fillRoundedRect(cx - headR * 0.85, headCy + headR * 0.1, headR * 1.7, headR * 0.95, headR * 0.5);
      // leave a small skin gap for the mouth
      g.fillStyle(def.skin, alpha);
      g.fillRoundedRect(cx - headR * 0.28, headCy + headR * 0.32, headR * 0.56, headR * 0.16, headR * 0.08);
      return;
    }

    // stache / goatee: mustache
    g.fillStyle(0x8a3a1a, alpha);
    g.fillRoundedRect(cx - headR * 0.45, headCy + headR * 0.3, headR * 0.9, headR * 0.2, headR * 0.1);

    if (def.beard === 'goatee') {
      g.fillStyle(def.hair, alpha);
      g.fillRoundedRect(cx - headR * 0.22, headCy + headR * 0.55, headR * 0.44, headR * 0.35, headR * 0.15);
    }
  }

  private drawGlasses(g: Phaser.GameObjects.Graphics, cx: number, headCy: number, headR: number): void {
    const lensY = headCy - headR * 0.05;
    const lensR = headR * 0.24;
    const lensOffset = headR * 0.4;
    g.lineStyle(headR * 0.09, 0x1a1a1a, 1);
    g.strokeCircle(cx - lensOffset, lensY, lensR);
    g.strokeCircle(cx + lensOffset, lensY, lensR);
    g.lineBetween(cx - lensOffset + lensR, lensY, cx + lensOffset - lensR, lensY);
    g.fillStyle(0xbfe3ff, 0.25);
    g.fillCircle(cx - lensOffset, lensY, lensR - 1);
    g.fillCircle(cx + lensOffset, lensY, lensR - 1);
  }

  private generateGun(): void {
    const g = this.clear();
    const w = 46;
    const h = 22;
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(8, 6, 34, 10, 3);
    g.fillRect(30, 14, 6, 10);
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(38, 8, 8, 6);
    g.fillStyle(0x8a5a2a, 1);
    g.fillRoundedRect(10, 14, 8, 8, 2);
    g.generateTexture('weapon_gun', w, h);
    g.clear();
  }

  // --------------------------------------------------------------- bullet
  private generateBullet(): void {
    const g = this.clear();
    g.fillStyle(0xfff2a8, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffcc33, 1);
    g.fillCircle(6, 6, 3);
    g.generateTexture('bullet', 12, 12);
  }

  private generateMuzzleFlash(): void {
    const g = this.clear();
    g.fillStyle(0xffe27a, 1);
    g.fillPoints(this.starPoints(16, 16, 8, 16, 6), true);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(16, 16, 6);
    g.generateTexture('muzzle_flash', 32, 32);
  }

  private starPoints(cx: number, cy: number, innerR: number, outerR: number, points: number): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      pts.push(new Phaser.Geom.Point(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
    return pts;
  }

  private generateFeather(): void {
    const g = this.clear();
    g.fillStyle(0x2a2a2a, 1);
    g.fillEllipse(8, 5, 12, 6);
    g.fillStyle(0x555555, 1);
    g.fillEllipse(8, 5, 6, 3);
    g.generateTexture('feather', 16, 10);
  }

  private generateSmoke(): void {
    const g = this.clear();
    g.fillStyle(0xcccccc, 0.55);
    g.fillCircle(10, 10, 10);
    g.generateTexture('particle_smoke', 20, 20);
  }

  private generateSpark(): void {
    const g = this.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_spark', 8, 8);
  }

  // -------------------------------------------------------------- vulture
  private generateVulture(
    key: string,
    size: number,
    bodyColor: number,
    wingColor: number,
    angry: boolean
  ): void {
    this.drawVultureFrame(`${key}_1`, size, bodyColor, wingColor, angry, 0);
    this.drawVultureFrame(`${key}_2`, size, bodyColor, wingColor, angry, 1);
    this.drawVultureFrame(`${key}_hit`, size, 0xffffff, 0xffffff, angry, 0);
  }

  private drawVultureFrame(
    key: string,
    size: number,
    bodyColor: number,
    wingColor: number,
    angry: boolean,
    flap: number
  ): void {
    const g = this.clear();
    const w = size * 2.2;
    const h = size * 1.6;
    const cx = w / 2;
    const cy = h / 2;
    const wingSpread = flap === 0 ? size * 1.05 : size * 0.65;
    const wingLift = flap === 0 ? -size * 0.5 : size * 0.15;

    // wings (behind body)
    g.fillStyle(wingColor, 1);
    g.fillTriangle(
      cx,
      cy,
      cx - wingSpread,
      cy + wingLift,
      cx - wingSpread * 0.4,
      cy + size * 0.35
    );
    g.fillTriangle(
      cx,
      cy,
      cx + wingSpread,
      cy + wingLift,
      cx + wingSpread * 0.4,
      cy + size * 0.35
    );

    // body
    g.fillStyle(bodyColor, 1);
    g.fillEllipse(cx, cy, size * 0.85, size * 0.62);
    // head
    g.fillStyle(angry ? 0xb03030 : 0xc9c9c9, 1);
    g.fillCircle(cx + size * 0.42, cy - size * 0.28, size * 0.26);
    // beak
    g.fillStyle(COLORS.vultureBeak, 1);
    g.fillTriangle(
      cx + size * 0.64,
      cy - size * 0.28,
      cx + size * 0.98,
      cy - size * 0.2,
      cx + size * 0.64,
      cy - size * 0.14
    );
    // eye
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx + size * 0.5, cy - size * 0.32, size * 0.05);
    if (angry) {
      g.lineStyle(2, 0x000000, 1);
      g.lineBetween(cx + size * 0.38, cy - size * 0.42, cx + size * 0.55, cy - size * 0.36);
    }
    // tail
    g.fillStyle(wingColor, 1);
    g.fillTriangle(
      cx - size * 0.5,
      cy + size * 0.1,
      cx - size * 0.95,
      cy - size * 0.05,
      cx - size * 0.95,
      cy + size * 0.25
    );

    g.generateTexture(key, w, h);
  }

  private generateBoss(): void {
    this.drawBossFrame('boss_vulture_1', 0);
    this.drawBossFrame('boss_vulture_2', 1);
    this.drawBossFrame('boss_vulture_hit', 0, true);
  }

  private drawBossFrame(key: string, flap: number, hit = false): void {
    const g = this.clear();
    const size = 100;
    const w = size * 2.4;
    const h = size * 1.7;
    const cx = w / 2;
    const cy = h / 2;
    const wingSpread = flap === 0 ? size * 1.15 : size * 0.7;
    const wingLift = flap === 0 ? -size * 0.5 : size * 0.2;
    const bodyColor = hit ? 0xffffff : 0x241d1d;
    const wingColor = hit ? 0xffffff : 0x120d0d;

    g.fillStyle(wingColor, 1);
    g.fillTriangle(cx, cy, cx - wingSpread, cy + wingLift, cx - wingSpread * 0.4, cy + size * 0.4);
    g.fillTriangle(cx, cy, cx + wingSpread, cy + wingLift, cx + wingSpread * 0.4, cy + size * 0.4);

    g.fillStyle(bodyColor, 1);
    g.fillEllipse(cx, cy, size * 0.95, size * 0.72);
    // spiky collar
    g.fillStyle(hit ? 0xffffff : 0x4a1414, 1);
    for (let i = -2; i <= 2; i++) {
      g.fillTriangle(
        cx + i * 14,
        cy - size * 0.3,
        cx + i * 14 - 6,
        cy - size * 0.5,
        cx + i * 14 + 6,
        cy - size * 0.5
      );
    }
    g.fillStyle(hit ? 0xffffff : 0xd94b4b, 1);
    g.fillCircle(cx + size * 0.46, cy - size * 0.3, size * 0.3);
    g.fillStyle(COLORS.vultureBeak, 1);
    g.fillTriangle(
      cx + size * 0.72,
      cy - size * 0.3,
      cx + size * 1.18,
      cy - size * 0.18,
      cx + size * 0.72,
      cy - size * 0.06
    );
    g.fillStyle(0xffe200, 1);
    g.fillCircle(cx + size * 0.55, cy - size * 0.36, size * 0.07);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx + size * 0.55, cy - size * 0.36, size * 0.03);

    g.generateTexture(key, w, h);
  }

  // ------------------------------------------------------------- powerups
  private generatePowerUps(): void {
    this.powerUpIcon('powerup_ammo', 0xd9a63d, 'AMMO');
    this.powerUpIcon('powerup_health', 0xe04848, 'HP');
    this.powerUpIcon('powerup_rapidfire', 0xff8c1a, 'RF');
    this.powerUpIcon('powerup_tripleshot', 0x3ad9c8, 'x3');
    this.powerUpIcon('powerup_shield', 0x4a90e2, 'SH');
    this.powerUpIcon('powerup_bomb', 0x8a2be2, 'BOOM');
  }

  private powerUpIcon(key: string, color: number, _label: string): void {
    const g = this.clear();
    const size = 34;
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(size / 2, size / 2 + 2, size / 2 - 2);
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 2 - 3);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(size / 2, size / 2, size / 2 - 3);
    g.generateTexture(key, size, size);
  }

  // ---------------------------------------------------------- environment
  private generateEnvironment(): void {
    // far buildings
    let g = this.clear();
    this.drawBuildingRow(g, COLORS.buildingFar, 3, 40);
    g.generateTexture('bg_far', GameW(), 220);

    g = this.clear();
    this.drawBuildingRow(g, COLORS.buildingMid, 4, 70);
    g.generateTexture('bg_mid', GameW(), 260);

    // pole with cable
    g = this.clear();
    g.fillStyle(0x3a2f2a, 1);
    g.fillRect(8, 0, 6, 160);
    g.fillRect(0, 0, 22, 8);
    g.lineStyle(2, 0x1a1a1a, 1);
    g.beginPath();
    g.moveTo(0, 6);
    g.lineTo(22, 6);
    g.strokePath();
    g.generateTexture('pole', 24, 160);

    // cloud
    g = this.clear();
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(20, 16, 30, 16);
    g.fillEllipse(40, 12, 26, 14);
    g.fillEllipse(58, 18, 24, 13);
    g.generateTexture('cloud', 80, 32);

    // ground strip
    g = this.clear();
    g.fillStyle(COLORS.ground, 1);
    g.fillRect(0, 0, GameW(), 40);
    g.fillStyle(0x4a3a2c, 1);
    for (let i = 0; i < GameW(); i += 40) {
      g.fillRect(i, 0, 20, 4);
    }
    g.generateTexture('ground', GameW(), 40);
  }

  private drawBuildingRow(g: Phaser.GameObjects.Graphics, color: number, count: number, minH: number): void {
    const w = GameW();
    const segW = w / count;
    for (let i = 0; i < count; i++) {
      const bh = minH + Math.random() * minH * 1.6;
      const bx = i * segW;
      g.fillStyle(color, 1);
      g.fillRect(bx, 260 - bh, segW - 6, bh);
      g.fillStyle(0xffe9a0, 0.5);
      for (let wy = 260 - bh + 8; wy < 250; wy += 16) {
        for (let wx = bx + 6; wx < bx + segW - 12; wx += 14) {
          if (Math.random() > 0.4) g.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }

  private generateUIBits(): void {
    const g = this.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 10, 10, 3);
    g.generateTexture('pixel_white', 10, 10);
  }
}

function GameW(): number {
  return 960;
}
