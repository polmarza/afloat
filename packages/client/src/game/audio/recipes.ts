// What each sound is made of. Every function builds one sound from tones and
// filtered noise (see engine.ts). Frequencies, lengths and levels are sound
// design, not rules, so they live here.

import type { EventCardId } from '@afloat/shared/content/events';
import type { Sound } from './engine';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// ------------------------------------------------------------------ actions

/** One step on the deck plates; `wet`: in a flooded room. */
export function footstep(s: Sound, wet: boolean) {
  if (wet) {
    s.noise({ dur: 0.2, gain: 0.16, attack: 0.01, filter: { type: 'lowpass', freq: 900, to: 400 } });
    s.tone({ freq: rand(300, 420), to: rand(700, 900), dur: 0.07, gain: 0.04, at: 0.03 });
    return;
  }
  s.noise({ dur: 0.06, gain: 0.12, filter: { type: 'bandpass', freq: rand(1600, 2200), q: 1.4 } });
  s.tone({ freq: rand(110, 130), to: 70, dur: 0.07, gain: 0.12 });
}

export function dice(s: Sound, success: boolean) {
  for (let i = 0; i < 5; i++) s.noise({ at: i * 0.065 + rand(0, 0.02), dur: 0.03, gain: rand(0.08, 0.16), filter: { type: 'highpass', freq: 2800 } });
  s.tone({ at: 0.36, freq: 190, to: 120, dur: 0.09, gain: 0.2 });
  const [a, b] = success ? [660, 880] : [440, 294];
  s.tone({ at: 0.46, freq: a, dur: 0.12, gain: 0.07, type: 'square', filter: { type: 'lowpass', freq: 1800 } });
  s.tone({ at: 0.58, freq: b, dur: 0.2, gain: 0.07, type: 'square', filter: { type: 'lowpass', freq: 1800 } });
}

/** The hatch unlocks with a thunk and opens with a pneumatic hiss. */
export function doorOpen(s: Sound) {
  s.tone({ freq: 95, to: 55, dur: 0.28, gain: 0.4 });
  s.noise({ dur: 0.12, gain: 0.18, filter: { type: 'bandpass', freq: 420, q: 1 } });
  s.noise({ at: 0.08, attack: 0.06, dur: 0.6, gain: 0.08, filter: { type: 'highpass', freq: 2600, to: 4000 } });
}

/** It won't budge: a dull hit and a rattle. */
export function doorFail(s: Sound) {
  s.tone({ freq: 115, to: 80, dur: 0.16, gain: 0.3 });
  for (let i = 0; i < 5; i++) s.noise({ at: 0.06 + i * 0.05, dur: 0.035, gain: 0.1 * (1 - i * 0.15), filter: { type: 'bandpass', freq: 950, q: 2 } });
}

/** A heavy door slams shut (closed by a short circuit, or jammed by a collapse). */
export function doorSlam(s: Sound) {
  s.tone({ freq: 72, to: 45, dur: 0.45, gain: 0.45 });
  s.noise({ dur: 0.22, gain: 0.2, filter: { type: 'lowpass', freq: 650 } });
  s.tone({ freq: 523, dur: 0.6, gain: 0.03, type: 'triangle', attack: 0.01 });
}

/** A new room drops into place, then its lights come on. */
export function roomReveal(s: Sound) {
  s.noise({ attack: 0.15, dur: 0.85, gain: 0.08, filter: { type: 'bandpass', freq: 260, to: 1300, q: 0.8 } });
  s.tone({ freq: 55, dur: 0.9, gain: 0.12, attack: 0.1 });
  s.tone({ at: 0.75, freq: 1250, dur: 0.06, gain: 0.03 });
  s.tone({ at: 0.85, freq: 1250, dur: 0.06, gain: 0.03 });
}

export function sonar(s: Sound) {
  s.tone({ freq: 1150, dur: 1.0, gain: 0.08 });
  s.tone({ at: 0.45, freq: 1150, dur: 0.8, gain: 0.025 });
}

/** Rummaging; with something found, a little chime. */
export function search(s: Sound, found: boolean) {
  s.noise({ dur: 0.22, gain: 0.07, attack: 0.04, filter: { type: 'bandpass', freq: 2400, q: 0.7 } });
  s.noise({ at: 0.2, dur: 0.18, gain: 0.05, attack: 0.04, filter: { type: 'bandpass', freq: 3000, q: 0.7 } });
  if (!found) return;
  s.tone({ at: 0.32, freq: 1318, dur: 0.4, gain: 0.06, type: 'triangle' });
  s.tone({ at: 0.4, freq: 1760, dur: 0.5, gain: 0.05, type: 'triangle' });
}

/** Handing over or using an item. */
export function itemClick(s: Sound) {
  s.tone({ freq: 900, dur: 0.05, gain: 0.05, type: 'square', filter: { type: 'lowpass', freq: 2500 } });
  s.tone({ at: 0.06, freq: 1200, dur: 0.06, gain: 0.04, type: 'square', filter: { type: 'lowpass', freq: 2500 } });
}

/** The laboratory: sparks. */
export function craft(s: Sound) {
  for (let i = 0; i < 7; i++) s.noise({ at: rand(0, 0.5), dur: 0.025, gain: rand(0.06, 0.12), filter: { type: 'highpass', freq: 4200 } });
  search(s, true);
}

/** Wrench on metal. */
export function repair(s: Sound) {
  for (let i = 0; i < 3; i++) {
    s.tone({ at: i * 0.16, freq: rand(760, 880), dur: 0.14, gain: 0.06, type: 'triangle' });
    s.noise({ at: i * 0.16, dur: 0.04, gain: 0.08, filter: { type: 'bandpass', freq: 2000, q: 1.5 } });
  }
}

/** A system comes back to life: a motor spinning up. */
export function systemOnline(s: Sound) {
  s.tone({ freq: 40, to: 110, dur: 1.3, gain: 0.12, type: 'sawtooth', attack: 0.3, filter: { type: 'lowpass', freq: 420 } });
  s.tone({ at: 1.0, freq: 220, dur: 0.6, gain: 0.05 });
  s.tone({ at: 1.1, freq: 330, dur: 0.6, gain: 0.04 });
}

export function heal(s: Sound) {
  [523, 659, 784].forEach((f, i) => s.tone({ at: i * 0.1, freq: f, dur: 0.25, gain: 0.05 }));
}

// ------------------------------------------------------------------ dangers

export function damage(s: Sound) {
  s.tone({ freq: 85, to: 40, dur: 0.32, gain: 0.38 });
  s.noise({ dur: 0.2, gain: 0.2, filter: { type: 'lowpass', freq: 320 } });
}

export function knockedOut(s: Sound) {
  s.tone({ freq: 330, to: 110, dur: 0.9, gain: 0.07, attack: 0.02 });
}

export function death(s: Sound) {
  s.tone({ freq: 220, to: 55, dur: 1.7, gain: 0.08, attack: 0.05 });
  s.tone({ freq: 110, to: 40, dur: 1.9, gain: 0.08, attack: 0.1 });
}

/** The hull groans under the pressure. */
export function hullCreak(s: Sound) {
  if (!s.throttle('creak', 2500)) return;
  s.tone({ freq: rand(58, 66), to: rand(44, 50), dur: 1.1, gain: 0.1, type: 'sawtooth', attack: 0.2, filter: { type: 'lowpass', freq: 300, q: 8 } });
  s.noise({ dur: 1.2, gain: 0.07, attack: 0.3, filter: { type: 'bandpass', freq: 150, q: 2 } });
}

/** Water bursting in. */
export function flood(s: Sound) {
  s.noise({ attack: 0.2, dur: 2.2, gain: 0.2, filter: { type: 'lowpass', freq: 1300, to: 550 } });
  for (let i = 0; i < 10; i++) s.tone({ at: rand(0.2, 2), freq: rand(380, 700), to: rand(800, 1200), dur: 0.06, gain: 0.03 });
}

/** The pumps drain a room. */
export function drain(s: Sound) {
  s.noise({ dur: 1.6, gain: 0.13, attack: 0.1, filter: { type: 'lowpass', freq: 800, to: 260 } });
  for (let i = 0; i < 4; i++) s.tone({ at: i * 0.35, freq: 62, dur: 0.25, gain: 0.12 });
}

export function fire(s: Sound) {
  s.noise({ attack: 0.3, dur: 1.5, gain: 0.12, filter: { type: 'lowpass', freq: 420 } });
  for (let i = 0; i < 14; i++) s.noise({ at: rand(0, 1.3), dur: 0.02, gain: rand(0.05, 0.12), filter: { type: 'highpass', freq: 2200 } });
}

/** Fire put out: a hiss of steam. */
export function steam(s: Sound) {
  s.noise({ dur: 1.0, gain: 0.1, attack: 0.02, filter: { type: 'highpass', freq: 3000, to: 5000 } });
}

export function collapse(s: Sound) {
  s.noise({ dur: 1.3, gain: 0.3, attack: 0.02, filter: { type: 'lowpass', freq: 220 } });
  s.tone({ freq: 60, to: 35, dur: 0.9, gain: 0.3 });
  for (let i = 0; i < 6; i++) s.noise({ at: rand(0.1, 1), dur: 0.05, gain: 0.08, filter: { type: 'bandpass', freq: rand(600, 1500), q: 2 } });
}

export function shortCircuit(s: Sound) {
  for (let i = 0; i < 8; i++) s.noise({ at: rand(0, 0.5), dur: rand(0.02, 0.06), gain: 0.1, filter: { type: 'highpass', freq: 3000 } });
  s.tone({ freq: 100, dur: 0.5, gain: 0.04, type: 'sawtooth', filter: { type: 'lowpass', freq: 900 } });
}

/** The CO₂ scrubber fails: air hissing away. */
export function scrubberFailure(s: Sound) {
  s.noise({ dur: 1.4, gain: 0.12, attack: 0.1, filter: { type: 'bandpass', freq: 1500, to: 900, q: 0.6 } });
}

// ------------------------------------------------------------- game notices

/** A crisis card is drawn: a two-note alert, then the card's own sound. */
export function eventCard(s: Sound, card: EventCardId) {
  s.tone({ freq: 392, dur: 0.16, gain: 0.06, type: 'square', filter: { type: 'lowpass', freq: 1200 } });
  s.tone({ at: 0.18, freq: 523, dur: 0.24, gain: 0.06, type: 'square', filter: { type: 'lowpass', freq: 1200 } });
  if (card === 'collapse') collapse(s);
  else if (card === 'short_circuit') shortCircuit(s);
  else if (card === 'scrubber_failure') scrubberFailure(s);
  // Floods and fires sound when the room actually floods or catches fire.
}

/** A new round starts: a deep ship's bell. */
export function roundBell(s: Sound) {
  s.tone({ freq: 196, dur: 1.8, gain: 0.1, attack: 0.005 });
  s.tone({ freq: 470, dur: 1.2, gain: 0.035, attack: 0.005 });
  s.tone({ freq: 784, dur: 0.6, gain: 0.015, attack: 0.005 });
}

/** It's your turn. */
export function yourTurn(s: Sound) {
  s.tone({ freq: 784, dur: 0.12, gain: 0.07, type: 'triangle' });
  s.tone({ at: 0.11, freq: 1046, dur: 0.22, gain: 0.07, type: 'triangle' });
}

export function podLaunch(s: Sound) {
  s.noise({ attack: 0.2, dur: 1.5, gain: 0.16, filter: { type: 'bandpass', freq: 200, to: 2200, q: 0.8 } });
  for (let i = 0; i < 12; i++) s.tone({ at: rand(0.3, 1.6), freq: rand(500, 900), to: rand(1000, 1600), dur: 0.05, gain: 0.03 });
}

export function surface(s: Sound) {
  s.tone({ freq: 80, to: 300, dur: 2.2, gain: 0.1, type: 'sawtooth', attack: 0.4, filter: { type: 'lowpass', freq: 600 } });
  s.noise({ at: 1.6, attack: 0.2, dur: 1.4, gain: 0.15, filter: { type: 'lowpass', freq: 1800, to: 600 } });
}

export function victory(s: Sound) {
  [523, 659, 784, 1046].forEach((f, i) => s.tone({ at: i * 0.14, freq: f, dur: 0.9 - i * 0.1, gain: 0.06, type: 'triangle' }));
}

export function defeat(s: Sound) {
  [392, 311, 262, 196].forEach((f, i) => s.tone({ at: i * 0.32, freq: f, dur: 0.7, gain: 0.07 }));
}

/** One beat of the alarm while the power is out (two low tones). */
export function alarmPulse(s: Sound) {
  s.tone({ freq: 330, dur: 0.42, gain: 0.05, type: 'square', attack: 0.04, filter: { type: 'lowpass', freq: 700 } });
  s.tone({ at: 0.5, freq: 247, dur: 0.5, gain: 0.05, type: 'square', attack: 0.04, filter: { type: 'lowpass', freq: 700 } });
}
