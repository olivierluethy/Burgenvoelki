import { MAX_TICKS_PER_FRAME, TICK_DT } from '../config';

/**
 * Fixed-timestep accumulator. Render frames feed variable `delta`; this yields
 * a whole number of fixed 60 Hz ticks, decoupling the simulation from render
 * frame-rate. Guards against the spiral of death by capping ticks per frame.
 */
export class FixedClock {
  private acc = 0;
  readonly dt = TICK_DT;

  /** Feed elapsed seconds; returns how many fixed ticks to run now. */
  advance(delta: number): number {
    // clamp pathological deltas (tab was backgrounded, breakpoint, etc.)
    this.acc += Math.min(delta, 0.25);
    let ticks = 0;
    while (this.acc >= this.dt && ticks < MAX_TICKS_PER_FRAME) {
      this.acc -= this.dt;
      ticks++;
    }
    // if we hit the cap, drop the backlog so we don't fast-forward forever
    if (ticks >= MAX_TICKS_PER_FRAME) this.acc = 0;
    return ticks;
  }

  /** Fractional progress toward the next tick, for render interpolation. */
  get alpha(): number {
    return this.acc / this.dt;
  }

  reset(): void {
    this.acc = 0;
  }
}
