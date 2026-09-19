declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

/**
 * Thin wrapper around the gtag.js call already installed in index.html.
 * Every user-behavior signal worth knowing (menu clicks, character choice,
 * wave progress, power-ups, combos, pauses, deaths) funnels through here as
 * a named GA4 custom event instead of scattering raw gtag() calls through
 * the scenes/systems. Safe to call even if gtag hasn't loaded (e.g. ad
 * blockers) — it just no-ops.
 */
export const Analytics = {
  menuJugarClick(): void {
    track('menu_jugar_click');
  },
  menuInstruccionesClick(): void {
    track('menu_instrucciones_click');
  },
  menuRecordClick(): void {
    track('menu_record_click');
  },
  menuSonidoToggle(enabled: boolean): void {
    track('menu_sonido_toggle', { enabled });
  },

  characterSelectBack(): void {
    track('character_select_back');
  },

  gameStart(character: string): void {
    track('game_start', { character });
  },
  waveReached(wave: number): void {
    track('wave_reached', { wave });
  },
  bossEncountered(wave: number): void {
    track('boss_encountered', { wave });
  },
  bossDefeated(wave: number): void {
    track('boss_defeated', { wave });
  },
  powerupCollected(type: string): void {
    track('powerup_collected', { type });
  },
  comboReached(multiplier: number): void {
    track('combo_reached', { multiplier });
  },
  gamePaused(reason: 'manual' | 'auto_blur'): void {
    track('game_paused', { reason });
  },
  weaponReload(): void {
    track('weapon_reload');
  },

  gameOver(params: { score: number; wave: number; character: string; kills: number; bestCombo: number }): void {
    track('game_over', params);
  },
  newHighScore(score: number): void {
    track('new_high_score', { score });
  },
  gameOverRetryClick(): void {
    track('game_over_retry_click');
  },
  gameOverMenuClick(): void {
    track('game_over_menu_click');
  },

  touchControlsDetected(): void {
    track('touch_controls_detected');
  },
};
