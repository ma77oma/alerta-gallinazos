import Phaser from 'phaser';

export interface MobileControlsCallbacks {
  onMoveAxis: (axis: -1 | 0 | 1) => void;
  onAim: (worldX: number, worldY: number) => void;
  onFireDown: () => void;
  onFireUp: () => void;
  onReload: () => void;
}

/** Detects touch support at runtime — desktop players never see these. */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Virtual joystick (movement) + right-side aim drag zone + fire/reload
 * buttons. Only instantiated by GameScene when isTouchDevice() is true.
 */
export class MobileControls {
  private scene: Phaser.Scene;
  private cb: MobileControlsCallbacks;

  private joystickBase: Phaser.GameObjects.Arc;
  private joystickThumb: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };

  private aimPointerId: number | null = null;
  private aimZone: Phaser.GameObjects.Rectangle;

  private fireButton: Phaser.GameObjects.Arc;
  private fireLabel: Phaser.GameObjects.Text;
  private reloadButton: Phaser.GameObjects.Arc;
  private reloadLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, callbacks: MobileControlsCallbacks) {
    this.scene = scene;
    this.cb = callbacks;
    scene.input.addPointer(3);

    const { width, height } = scene.scale;
    const joyX = 110;
    const joyY = height - 120;
    this.joystickOrigin = { x: joyX, y: joyY };

    this.joystickBase = scene.add
      .circle(joyX, joyY, 60, 0x000000, 0.28)
      .setScrollFactor(0)
      .setDepth(200)
      .setStrokeStyle(2, 0xffffff, 0.5);
    this.joystickThumb = scene.add
      .circle(joyX, joyY, 28, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(201);

    this.aimZone = scene.add
      .rectangle(width * 0.55, height * 0.4, width * 0.9, height * 0.75, 0xffffff, 0.001)
      .setScrollFactor(0)
      .setDepth(150)
      .setInteractive();

    this.fireButton = scene.add
      .circle(width - 90, height - 110, 46, 0xe53935, 0.55)
      .setScrollFactor(0)
      .setDepth(200)
      .setStrokeStyle(3, 0xffffff, 0.7)
      .setInteractive();
    this.fireLabel = scene.add
      .text(width - 90, height - 110, 'FUEGO', {
        fontFamily: 'Arial Black',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    this.reloadButton = scene.add
      .circle(width - 170, height - 170, 32, 0x4a90e2, 0.55)
      .setScrollFactor(0)
      .setDepth(200)
      .setStrokeStyle(3, 0xffffff, 0.7)
      .setInteractive();
    this.reloadLabel = scene.add
      .text(width - 170, height - 170, 'R', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    this.bindEvents();
  }

  private bindEvents(): void {
    const scene = this.scene;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const distToJoy = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.joystickOrigin.x,
        this.joystickOrigin.y
      );
      if (this.joystickPointerId === null && distToJoy < 90) {
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
        return;
      }
      if (this.aimPointerId === null) {
        this.aimPointerId = pointer.id;
        this.cb.onAim(pointer.worldX, pointer.worldY);
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.updateJoystick(pointer);
      } else if (pointer.id === this.aimPointerId) {
        this.cb.onAim(pointer.worldX, pointer.worldY);
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.joystickThumb.setPosition(this.joystickOrigin.x, this.joystickOrigin.y);
        this.cb.onMoveAxis(0);
      }
      if (pointer.id === this.aimPointerId) {
        this.aimPointerId = null;
      }
    });

    this.fireButton.on('pointerdown', () => this.cb.onFireDown());
    this.fireButton.on('pointerup', () => this.cb.onFireUp());
    this.fireButton.on('pointerout', () => this.cb.onFireUp());

    this.reloadButton.on('pointerdown', () => this.cb.onReload());

    void this.aimZone;
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const maxDist = 50;
    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const dist = Math.min(maxDist, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const tx = this.joystickOrigin.x + Math.cos(angle) * dist;
    const ty = this.joystickOrigin.y + Math.sin(angle) * dist;
    this.joystickThumb.setPosition(tx, ty);

    const threshold = 12;
    if (dx > threshold) this.cb.onMoveAxis(1);
    else if (dx < -threshold) this.cb.onMoveAxis(-1);
    else this.cb.onMoveAxis(0);
  }

  reposition(width: number, height: number): void {
    this.joystickOrigin = { x: 110, y: height - 120 };
    this.joystickBase.setPosition(this.joystickOrigin.x, this.joystickOrigin.y);
    this.joystickThumb.setPosition(this.joystickOrigin.x, this.joystickOrigin.y);
    this.fireButton.setPosition(width - 90, height - 110);
    this.fireLabel.setPosition(width - 90, height - 110);
    this.reloadButton.setPosition(width - 170, height - 170);
    this.reloadLabel.setPosition(width - 170, height - 170);
    this.aimZone.setPosition(width * 0.55, height * 0.4);
    this.aimZone.setSize(width * 0.9, height * 0.75);
  }

  destroy(): void {
    this.joystickBase.destroy();
    this.joystickThumb.destroy();
    this.aimZone.destroy();
    this.fireButton.destroy();
    this.fireLabel.destroy();
    this.reloadButton.destroy();
    this.reloadLabel.destroy();
  }
}
