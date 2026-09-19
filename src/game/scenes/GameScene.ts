import Phaser from 'phaser';
import { PLAYER_CONFIG } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { Vulture } from '../entities/Vulture';
import { BossVulture } from '../entities/BossVulture';
import { WeaponSystem } from '../systems/WeaponSystem';
import { ComboSystem } from '../systems/ComboSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { EnemySpawner, type PerchPoint } from '../systems/EnemySpawner';
import { HUD } from '../ui/HUD';
import { MobileControls, isTouchDevice } from '../ui/MobileControls';
import { AudioManager } from '../systems/AudioManager';
import { Storage } from '../utils/Storage';
import { Analytics } from '../systems/Analytics';

/** Ties every system together: input, entities, collisions, HUD, waves. */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private weapon!: WeaponSystem;
  private combo!: ComboSystem;
  private powerups!: PowerUpSystem;
  private waveSystem!: WaveSystem;
  private spawner!: EnemySpawner;
  private hud!: HUD;
  private mobileControls: MobileControls | null = null;

  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private bossProjectiles!: Phaser.Physics.Arcade.Group;
  private currentBoss: BossVulture | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;

  private isFiringHeld = false;
  private mobileAxis: -1 | 0 | 1 = 0;

  private score = 0;
  private kills = 0;
  private gameOverTriggered = false;

  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.score = 0;
    this.kills = 0;
    this.gameOverTriggered = false;
    this.currentBoss = null;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#6fb8d9');

    this.buildEnvironment(width, height);
    const perchPoints = this.buildPoles(width, height);

    const characterId = Storage.getSelectedCharacter();
    this.player = new Player(this, width / 2, PLAYER_CONFIG.startY, 50, width - 50, characterId);
    Analytics.gameStart(characterId);

    this.enemyGroup = this.physics.add.group();
    this.bossProjectiles = this.physics.add.group();

    this.spawner = new EnemySpawner(this, this.enemyGroup, this.bossProjectiles, perchPoints, width, height);
    this.weapon = new WeaponSystem(this, this.player);
    this.combo = new ComboSystem();
    this.powerups = new PowerUpSystem(this, this.player, this.weapon);
    this.waveSystem = new WaveSystem();
    this.hud = new HUD(this);
    this.hud.setHighScore(Storage.getHighScore());

    this.wireSystems();
    this.setupInput(width, height);
    this.setupCollisions();

    if (isTouchDevice()) {
      Analytics.touchControlsDetected();
      this.mobileControls = new MobileControls(this, {
        onMoveAxis: (axis) => (this.mobileAxis = axis),
        onAim: (x, y) => this.player.aimAt(x, y),
        onFireDown: () => {
          this.isFiringHeld = true;
          this.weapon.tryFire(this.time.now);
        },
        onFireUp: () => (this.isFiringHeld = false),
        onReload: () => this.weapon.startReload(),
      });
    }

    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));

    const clearFiring = () => (this.isFiringHeld = false);
    // Auto-pause if the player alt-tabs or switches apps mid-game.
    const onBlur = () => {
      clearFiring();
      this.pauseGame('auto_blur');
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    this.hud.onPauseClick = () => this.pauseGame('manual');

    AudioManager.startMusic();
  }

  private pauseGame(reason: 'manual' | 'auto_blur' = 'manual'): void {
    if (this.gameOverTriggered || this.scene.isPaused()) return;
    this.isFiringHeld = false;
    AudioManager.stopMusic();
    Analytics.gamePaused(reason);
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  private buildEnvironment(width: number, height: number): void {
    this.add.rectangle(width / 2, height / 2, width, height, 0x6fb8d9).setDepth(-10);
    this.bgFar = this.add.tileSprite(width / 2, height * 0.32, width, 220, 'bg_far').setDepth(-8).setAlpha(0.85);
    this.bgMid = this.add.tileSprite(width / 2, height * 0.5, width, 260, 'bg_mid').setDepth(-6).setAlpha(0.95);

    for (let i = 0; i < 4; i++) {
      const cloud = this.add
        .image(Phaser.Math.Between(0, width), Phaser.Math.Between(20, 120), 'cloud')
        .setDepth(-9)
        .setAlpha(0.8)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      this.tweens.add({
        targets: cloud,
        x: cloud.x + width + 200,
        duration: Phaser.Math.Between(30000, 60000),
        repeat: -1,
        onRepeat: () => cloud.setX(-100),
      });
    }

    this.add.tileSprite(width / 2, height - 20, width, 40, 'ground').setDepth(5);
  }

  private buildPoles(width: number, height: number): PerchPoint[] {
    const positions = [width * 0.14, width * 0.38, width * 0.63, width * 0.87];
    const points: PerchPoint[] = [];
    positions.forEach((x, i) => {
      const baseY = height * 0.58;
      const pole = this.add.image(x, baseY, 'pole').setOrigin(0.5, 1).setDepth(4 + (i % 2));
      points.push({ x, y: baseY - pole.height + 10 });
    });
    return points;
  }

  private wireSystems(): void {
    this.weapon.onAmmoChange = (ammo, max) => this.hud.setAmmo(ammo, max, this.weapon.isReloading(), this.weapon.reloadProgress());
    this.weapon.onReloadStart = () => {
      this.hud.setAmmo(this.weapon.ammo, this.weapon.maxAmmo, true, 0);
      Analytics.weaponReload();
    };
    this.weapon.onReloadEnd = () => this.hud.setAmmo(this.weapon.ammo, this.weapon.maxAmmo, false, 1);

    this.combo.onComboChange = (mult) => {
      this.hud.setCombo(mult);
      if (mult > 1) Analytics.comboReached(mult);
    };

    this.powerups.onPickupText = (x, y, label) => this.hud.showPickupText(x, y, label);
    this.powerups.onBomb = () => this.triggerBomb();

    this.waveSystem.onWaveStart = (wave, isBoss, isSpecial) => {
      this.hud.setWave(wave);
      if (isBoss) {
        this.hud.showWaveBanner(`¡JEFE! OLEADA ${wave}`, '#e53935');
        Analytics.bossEncountered(wave);
      } else if (isSpecial) {
        this.hud.showWaveBanner(`OLEADA ESPECIAL ${wave}`, '#ffe066');
      } else {
        this.hud.showWaveBanner(`OLEADA ${wave}`);
      }
      // Fired every 5 waves (plus wave 1) rather than every single wave, to
      // keep event volume reasonable while still tracking how far players get.
      if (wave === 1 || wave % 5 === 0) Analytics.waveReached(wave);
      AudioManager.play('waveStart');
    };
    this.waveSystem.onSpawnRequest = () => {
      this.spawner.spawnRandom(this.waveSystem.waveNumber, this.waveSystem.difficultyMultiplier);
    };
    this.waveSystem.onBossSpawnRequest = () => {
      this.currentBoss = this.spawner.spawnBoss(this.waveSystem.waveNumber, this.waveSystem.difficultyMultiplier);
      this.hud.showBossBar(true);
    };
  }

  private setupInput(width: number, height: number): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keyA = keyboard.addKey('A');
      this.keyD = keyboard.addKey('D');
      this.keyR = keyboard.addKey('R');
      this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyR.on('down', () => this.weapon.startReload());
      this.keySpace.on('down', () => {
        this.isFiringHeld = true;
        this.weapon.tryFire(this.time.now);
      });
      this.keySpace.on('up', () => (this.isFiringHeld = false));

      this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.keyP = keyboard.addKey('P');
      this.keyEsc.on('down', () => this.pauseGame());
      this.keyP.on('down', () => this.pauseGame());
    }

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isTouchDevice()) return;
      this.player.aimAt(pointer.worldX, pointer.worldY);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isTouchDevice()) return;
      AudioManager.unlock();
      if (pointer.leftButtonDown()) {
        this.player.aimAt(pointer.worldX, pointer.worldY);
        this.isFiringHeld = true;
        // Fire immediately on press too — a fast click's down+up can both
        // resolve before the next update() tick, so relying solely on the
        // held-flag in update() would silently eat quick taps.
        this.weapon.tryFire(this.time.now);
      }
    });
    this.input.on('pointerup', () => {
      if (isTouchDevice()) return;
      this.isFiringHeld = false;
    });

    void width;
    void height;
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.weapon.bulletGroup, this.enemyGroup, (bulletObj, enemyObj) => {
      this.onBulletHitEnemy(bulletObj as Phaser.Physics.Arcade.Image, enemyObj as Vulture);
    });

    this.physics.add.overlap(this.player, this.enemyGroup, (_p, enemyObj) => {
      this.onEnemyTouchPlayer(enemyObj as Vulture);
    });

    this.physics.add.overlap(this.player, this.bossProjectiles, (_p, projObj) => {
      this.onBossProjectileHitPlayer(projObj as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(this.player, this.powerups.group, (_p, itemObj) => {
      this.powerups.collect(itemObj as Phaser.Physics.Arcade.Sprite);
    });
  }

  private onBulletHitEnemy(bullet: Phaser.Physics.Arcade.Image, enemy: Vulture): void {
    if (!bullet.active || !enemy.isAlive()) return;
    bullet.disableBody(true, true);
    const dmg = (bullet.getData('damage') as number) ?? 1;
    if (enemy.takeDamage(dmg)) {
      this.resolveEnemyDeath(enemy);
    }
  }

  private onEnemyTouchPlayer(enemy: Vulture): void {
    if (!enemy.isAlive() || this.player.isDead) return;
    this.player.takeDamage(enemy.contactDamage);
    enemy.die();
  }

  private onBossProjectileHitPlayer(proj: Phaser.Physics.Arcade.Sprite): void {
    if (!proj.active || this.player.isDead) return;
    const dmg = (proj.getData('damage') as number) ?? 10;
    proj.destroy();
    this.player.takeDamage(dmg);
  }

  private resolveEnemyDeath(enemy: Vulture): void {
    const multiplier = this.combo.registerKill();
    const points = enemy.points * multiplier;
    this.score += points;
    this.kills += 1;
    this.hud.setScore(this.score);
    this.hud.showFloatingScore(enemy.x, enemy.y, enemy.points, multiplier);
    this.powerups.maybeDrop(enemy.x, enemy.y);

    if (enemy.vultureType === 'boss') {
      this.hud.showBossBar(false);
      this.currentBoss = null;
      Analytics.bossDefeated(this.waveSystem.waveNumber);
      this.cameras.main.shake(400, 0.012);
      const burst = this.add.particles(enemy.x, enemy.y, 'particle_spark', {
        speed: { min: 120, max: 320 },
        lifespan: 600,
        scale: { start: 1.4, end: 0 },
        quantity: 24,
      });
      burst.explode(24);
      this.time.delayedCall(650, () => burst.destroy());
    }
  }

  private triggerBomb(): void {
    this.cameras.main.flash(250, 255, 255, 255);
    this.cameras.main.shake(300, 0.01);
    const enemies = this.enemyGroup.getChildren().slice() as Vulture[];
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      if (enemy.vultureType === 'boss') {
        if (enemy.takeDamage(Math.round(enemy.maxHealth * 0.3))) this.resolveEnemyDeath(enemy);
      } else {
        if (enemy.takeDamage(9999)) this.resolveEnemyDeath(enemy);
      }
    }
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.hud.layout(gameSize.width, gameSize.height);
    this.mobileControls?.reposition(gameSize.width, gameSize.height);
  }

  update(time: number, delta: number): void {
    if (this.gameOverTriggered) return;

    this.bgFar.tilePositionX += delta * 0.006;
    this.bgMid.tilePositionX += delta * 0.015;

    const axis = this.mobileAxis !== 0 ? this.mobileAxis : this.getKeyboardAxis();
    if (axis < 0) this.player.moveLeft();
    else if (axis > 0) this.player.moveRight();
    else this.player.stopMoving();

    this.player.update(time, delta);
    this.weapon.update(time, delta);
    // Guard against a missed pointerup (e.g. releasing outside the canvas)
    // leaving the weapon stuck in a continuous-fire state.
    if (!isTouchDevice() && !this.input.activePointer.isDown && !this.keySpace?.isDown) {
      this.isFiringHeld = false;
    }
    if (this.isFiringHeld) this.weapon.tryFire(time);
    this.combo.update(delta);

    const aliveCount = (this.enemyGroup.getChildren() as Vulture[]).filter((e) => e.isAlive()).length;
    this.waveSystem.update(time, delta, aliveCount);

    const bounds = new Phaser.Geom.Rectangle(-300, -300, this.scale.width + 600, this.scale.height + 600);
    (this.enemyGroup.getChildren() as Vulture[]).forEach((enemy) => {
      if (!enemy.active) return;
      enemy.update(time, delta, this.player.x, this.player.y);
      if (enemy.state === 'dead') {
        this.enemyGroup.remove(enemy, true, true);
      } else if (!Phaser.Geom.Rectangle.Contains(bounds, enemy.x, enemy.y)) {
        this.enemyGroup.remove(enemy, true, true);
        if (enemy.vultureType === 'boss') {
          this.hud.showBossBar(false);
          this.currentBoss = null;
        }
      }
    });

    this.bossProjectiles.getChildren().forEach((child) => {
      const proj = child as Phaser.Physics.Arcade.Sprite;
      if (proj.active && !Phaser.Geom.Rectangle.Contains(bounds, proj.x, proj.y)) proj.destroy();
    });

    this.weapon.cullOffscreenBullets(new Phaser.Geom.Rectangle(-20, -20, this.scale.width + 40, this.scale.height + 40));

    this.hud.setAmmo(this.weapon.ammo, this.weapon.maxAmmo, this.weapon.isReloading(), this.weapon.reloadProgress());
    if (this.currentBoss && this.currentBoss.active) this.hud.setBossHealth(this.currentBoss.healthRatio());

    this.hud.setHealth(this.player.health / this.player.maxHealth);

    if (this.player.isDead && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      Analytics.gameOver({
        score: this.score,
        wave: this.waveSystem.waveNumber,
        character: Storage.getSelectedCharacter(),
        kills: this.kills,
        bestCombo: this.combo.bestComboThisRun,
      });
      this.time.delayedCall(800, () => {
        this.scene.start('GameOverScene', {
          score: this.score,
          wave: this.waveSystem.waveNumber,
          kills: this.kills,
          bestCombo: this.combo.bestComboThisRun,
        });
      });
    }
  }

  private getKeyboardAxis(): -1 | 0 | 1 {
    const left = this.cursors?.left.isDown || this.keyA?.isDown;
    const right = this.cursors?.right.isDown || this.keyD?.isDown;
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  }
}
