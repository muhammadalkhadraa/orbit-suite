import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private enabled = false;
  private audioCtx: AudioContext | null = null;
  private readonly STORAGE_KEY = 'orbit_pref_audio_enabled';

  constructor() {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        this.enabled = stored === 'true';
      } catch {
        this.enabled = false;
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(value: boolean): void {
    this.enabled = value;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, String(value));
      } catch {
        // Ignore localStorage restrictions
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass();
        } catch {
          this.audioCtx = null;
        }
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        this.audioCtx.resume();
      } catch {
        // Ignore resume error
      }
    }

    return this.audioCtx;
  }

  public playTone(frequency: number, duration: number, delay = 0, type: OscillatorType = 'sine'): void {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    } catch {
      // Audio playback failsafe
    }
  }

  public playSuccessChime(): void {
    if (!this.enabled) return;
    // Harmonic major third: C5 (523.25 Hz) then E5 (659.25 Hz)
    this.playTone(523.25, 0.12, 0);
    this.playTone(659.25, 0.18, 0.08);
  }

  public playWarningChime(): void {
    if (!this.enabled) return;
    // Alert tone: A4 (440 Hz) then F4 (349.23 Hz)
    this.playTone(440, 0.12, 0);
    this.playTone(349.23, 0.18, 0.08);
  }

  public playErrorChime(): void {
    if (!this.enabled) return;
    // Low alert: E4 (329.63 Hz) then C4 (261.63 Hz)
    this.playTone(329.63, 0.14, 0);
    this.playTone(261.63, 0.22, 0.09);
  }
}
