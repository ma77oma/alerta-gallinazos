import { COMBO_CONFIG } from '../config/GameConfig';

/**
 * Tracks kill streaks. The multiplier climbs as kills land within the
 * rolling time window and resets to x1 if that window expires.
 */
export class ComboSystem {
  private killsInWindow = 0;
  private windowRemaining = 0;
  private currentMultiplier = 1;
  bestComboThisRun = 1;

  onComboChange?: (multiplier: number) => void;

  registerKill(): number {
    this.killsInWindow += 1;
    this.windowRemaining = COMBO_CONFIG.windowMs;
    const newMultiplier = this.computeMultiplier();
    if (newMultiplier !== this.currentMultiplier) {
      this.currentMultiplier = newMultiplier;
      this.bestComboThisRun = Math.max(this.bestComboThisRun, this.currentMultiplier);
      this.onComboChange?.(this.currentMultiplier);
    }
    return this.currentMultiplier;
  }

  private computeMultiplier(): number {
    const thresholds = COMBO_CONFIG.thresholds;
    let mult = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this.killsInWindow >= thresholds[i]) {
        mult = i + 1;
        break;
      }
    }
    return mult;
  }

  update(delta: number): void {
    if (this.windowRemaining <= 0) return;
    this.windowRemaining -= delta;
    if (this.windowRemaining <= 0) {
      this.reset();
    }
  }

  reset(): void {
    if (this.killsInWindow === 0 && this.currentMultiplier === 1) return;
    this.killsInWindow = 0;
    this.windowRemaining = 0;
    if (this.currentMultiplier !== 1) {
      this.currentMultiplier = 1;
      this.onComboChange?.(1);
    }
  }

  getMultiplier(): number {
    return this.currentMultiplier;
  }
}
