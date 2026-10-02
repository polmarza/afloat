// Seeded pseudo-random numbers (mulberry32). The generator's state lives in
// GameState.rngState so a game can be replayed exactly from its seed.

/** Turns any string seed into a 32-bit number (FNV-1a). */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Random source bound to a mutable state holder (usually the GameState). */
export class Rng {
  constructor(private holder: { rngState: number }) {}

  /** Float in [0, 1). */
  next(): number {
    let t = (this.holder.rngState = (this.holder.rngState + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number) {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  shuffle<T>(list: T[]): T[] {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  weighted<K extends string>(weights: Record<K, number>): K {
    const entries = Object.entries(weights) as [K, number][];
    let r = this.next() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [key, w] of entries) {
      r -= w;
      if (r < 0) return key;
    }
    return entries[entries.length - 1][0];
  }
}
