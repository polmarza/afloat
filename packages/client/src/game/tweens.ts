// Minimal tween runner driven by the render loop (no dependencies).

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

interface Tween {
  start: number;
  duration: number;
  update: (k: number) => void;
  ease: Ease;
  resolve: () => void;
}

export class Tweens {
  private list: Tween[] = [];
  private now = 0;

  /** Runs `update(k)` with k going 0→1 over `duration` ms, after `delay` ms. */
  add(duration: number, update: (k: number) => void, opts: { ease?: Ease; delay?: number } = {}): Promise<void> {
    return new Promise((resolve) => {
      this.list.push({ start: this.now + (opts.delay ?? 0), duration, update, ease: opts.ease ?? ease.outCubic, resolve });
    });
  }

  wait(ms: number) {
    return this.add(ms, () => {});
  }

  tick(now: number) {
    this.now = now;
    const done: Tween[] = [];
    for (const t of this.list) {
      if (now < t.start) continue;
      const raw = Math.min(1, (now - t.start) / Math.max(1, t.duration));
      t.update(t.ease(raw));
      if (raw >= 1) done.push(t);
    }
    if (done.length) {
      this.list = this.list.filter((t) => !done.includes(t));
      for (const t of done) t.resolve();
    }
  }

  clear() {
    this.list = [];
  }
}
