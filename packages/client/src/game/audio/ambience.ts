// What sounds all game long: the deep hum of the boat and, while the power is
// out, the alarm in soft pulses. Both fade in and out to avoid clicks.

import type { Sound } from './engine';
import { alarmPulse } from './recipes';

/** Seconds between alarm pulses. */
const ALARM_EVERY_S = 3.5;
const HUM_GAIN = 0.05;
const FADE_S = 1.2;

export class Ambience {
  private hum: { gain: GainNode; stop: () => void } | null = null;
  private alarm: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly sound: Sound) {}

  /** Starts the hum (if not already on) and sets the alarm. */
  start(alarm: boolean) {
    this.sound.unlock();
    if (!this.hum) this.hum = this.buildHum();
    this.setAlarm(alarm);
  }

  setAlarm(on: boolean) {
    if (on && !this.alarm) {
      alarmPulse(this.sound);
      this.alarm = setInterval(() => alarmPulse(this.sound), ALARM_EVERY_S * 1000);
    } else if (!on && this.alarm) {
      clearInterval(this.alarm);
      this.alarm = null;
    }
  }

  stop() {
    this.setAlarm(false);
    this.hum?.stop();
    this.hum = null;
  }

  /** Two low sines and some dark noise, breathing slowly. */
  private buildHum() {
    const c = this.sound.context;
    const out = this.sound.output;
    if (!c || !out) return null;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(HUM_GAIN, c.currentTime + FADE_S);
    gain.connect(out);

    const low = c.createOscillator();
    low.frequency.value = 55;
    const lowGain = c.createGain();
    lowGain.gain.value = 0.6;
    low.connect(lowGain).connect(gain);
    const fifth = c.createOscillator();
    fifth.frequency.value = 82.5;
    const fifthGain = c.createGain();
    fifthGain.gain.value = 0.25;
    fifth.connect(fifthGain).connect(gain);

    const noise = this.sound.noiseSource();
    const dark = c.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 170;
    const noiseGain = c.createGain();
    noiseGain.gain.value = 0.9;
    noise?.connect(dark).connect(noiseGain).connect(gain);

    // A slow swell, like the boat breathing.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.08;
    const depth = c.createGain();
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(lowGain.gain);

    const sources = [low, fifth, lfo, ...(noise ? [noise] : [])];
    for (const s of sources) s.start();
    return {
      gain,
      stop: () => {
        const t = c.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + FADE_S);
        for (const s of sources) s.stop(t + FADE_S + 0.1);
      },
    };
  }
}
