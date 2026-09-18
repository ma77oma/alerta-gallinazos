import { Storage, type GameSettings } from '../utils/Storage';

export type SfxKey =
  | 'shoot'
  | 'reload'
  | 'hit'
  | 'wingFlap'
  | 'kill'
  | 'powerup'
  | 'waveStart'
  | 'boss'
  | 'gameOver'
  | 'playerHurt'
  | 'uiClick';

/**
 * Global audio controller. Real audio files can be dropped into
 * `src/assets/sounds/` and wired up in `loadReal()` — until then every
 * effect is synthesized with the Web Audio API so the game is playable
 * with zero external assets. See README for how to swap in real files.
 */
class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private settings: GameSettings = Storage.getSettings();
  private musicTimer: number | null = null;
  private musicStep = 0;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Must be called after a user gesture to unlock audio on mobile browsers. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  getSettings(): GameSettings {
    return this.settings;
  }

  setMusicOn(on: boolean): void {
    this.settings.musicOn = on;
    Storage.setSettings(this.settings);
    if (!on) this.stopMusic();
  }

  setSfxOn(on: boolean): void {
    this.settings.sfxOn = on;
    Storage.setSettings(this.settings);
  }

  toggleMute(): boolean {
    const nowOn = !(this.settings.musicOn && this.settings.sfxOn);
    this.setMusicOn(nowOn);
    this.setSfxOn(nowOn);
    return nowOn;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.2,
    slideTo?: number
  ): void {
    if (!this.settings.sfxOn) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ctx.currentTime + duration);
    }
    const vol = volume * this.settings.sfxVolume;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noise(duration: number, volume = 0.2): void {
    if (!this.settings.sfxOn) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * this.settings.sfxVolume, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  play(key: SfxKey): void {
    switch (key) {
      case 'shoot':
        this.tone(680, 0.07, 'square', 0.12, 220);
        break;
      case 'reload':
        this.tone(320, 0.12, 'triangle', 0.15, 480);
        break;
      case 'hit':
        this.tone(180, 0.08, 'sawtooth', 0.15, 90);
        break;
      case 'wingFlap':
        this.noise(0.06, 0.05);
        break;
      case 'kill':
        this.tone(520, 0.16, 'square', 0.16, 120);
        break;
      case 'powerup':
        this.tone(440, 0.09, 'sine', 0.18, 880);
        window.setTimeout(() => this.tone(880, 0.12, 'sine', 0.16, 1320), 70);
        break;
      case 'waveStart':
        this.tone(220, 0.2, 'triangle', 0.2, 440);
        window.setTimeout(() => this.tone(440, 0.2, 'triangle', 0.18, 660), 140);
        break;
      case 'boss':
        this.tone(90, 0.5, 'sawtooth', 0.25, 60);
        window.setTimeout(() => this.tone(70, 0.6, 'sawtooth', 0.22, 50), 200);
        break;
      case 'gameOver':
        this.tone(400, 0.3, 'sawtooth', 0.2, 100);
        break;
      case 'playerHurt':
        this.tone(150, 0.15, 'square', 0.2, 60);
        break;
      case 'uiClick':
        this.tone(600, 0.05, 'square', 0.1, 700);
        break;
    }
  }

  startMusic(): void {
    if (!this.settings.musicOn || this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [220, 246, 262, 246, 220, 196, 220, 262];
    this.musicTimer = window.setInterval(() => {
      if (!this.settings.musicOn) return;
      const freq = notes[this.musicStep % notes.length];
      this.tone(freq, 0.35, 'triangle', 0.05 * this.settings.musicVolume * 5);
      this.musicStep++;
    }, 420);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
