import type { EngineConfig } from '../../app/config';
export interface FrameStats { steps: number; alpha: number; droppedSeconds: number }
/** O bridge R3F chama frame; a simulação recebe apenas ticks fixos. */
export class GameClock {
  private accumulator = 0;
  private paused = true;
  private dropped = 0;
  readonly fixedDelta: number;
  constructor(private readonly config: EngineConfig) { this.fixedDelta = 1 / config.simulationHz; }
  resume(): void { this.paused = false; this.accumulator = 0; }
  pause(): void { this.paused = true; this.accumulator = 0; }
  reset(): void { this.accumulator = 0; this.dropped = 0; }
  frame(deltaSeconds: number, tick: (dt: number) => void): FrameStats {
    if (this.paused || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return { steps: 0, alpha: 0, droppedSeconds: this.dropped };
    const capped = Math.min(deltaSeconds, this.config.maxFrameDeltaMs / 1000);
    this.dropped += Math.max(0, deltaSeconds - capped);
    this.accumulator += capped;
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.fixedDelta && steps < this.config.maxStepsPerFrame && !this.paused) {
      tick(this.fixedDelta); steps++;
      // Pause/game-over can happen *inside* tick; stop without an extra damage tick.
      if(this.paused){this.accumulator=0;break;}
      this.accumulator -= this.fixedDelta;
    }
    if (this.accumulator >= this.fixedDelta) {
      const overflow = Math.floor(this.accumulator / this.fixedDelta) * this.fixedDelta;
      this.dropped += overflow; this.accumulator -= overflow;
    }
    return { steps, alpha: Math.max(0, Math.min(1, this.accumulator / this.fixedDelta)), droppedSeconds: this.dropped };
  }
}
