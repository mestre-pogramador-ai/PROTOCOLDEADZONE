import { describe, it, expect, vi } from 'vitest';
import { GameClock } from '../core/clock/GameClock';
const config = { simulationHz: 60, maxStepsPerFrame: 4, maxFrameDeltaMs: 100 };
describe('GameClock', () => {
  it('executa ticks fixos', () => { const c = new GameClock(config); const tick = vi.fn(); c.resume(); expect(c.frame(1/30, tick).steps).toBe(2); expect(tick).toHaveBeenCalledTimes(2); expect(tick).toHaveBeenCalledWith(1/60); });
  it('não avança pausado', () => { const c = new GameClock(config); const tick = vi.fn(); c.frame(1, tick); expect(tick).not.toHaveBeenCalled(); });
  it('limita recuperação e registra descarte', () => { const c = new GameClock(config); c.resume(); const s = c.frame(2, () => {}); expect(s.steps).toBe(4); expect(s.droppedSeconds).toBeGreaterThan(1); });
  it('não acumula atraso após pausa', () => { const c = new GameClock(config); c.resume(); c.frame(0.01, () => {}); c.pause(); c.resume(); expect(c.frame(0.001, () => {}).steps).toBe(0); });
});
