export interface EngineConfig { simulationHz: number; maxStepsPerFrame: number; maxFrameDeltaMs: number }
export const engineConfig: Readonly<EngineConfig> = Object.freeze({ simulationHz: 60, maxStepsPerFrame: 4, maxFrameDeltaMs: 100 });
export function validateConfig(c: EngineConfig): EngineConfig {
  if (!Number.isFinite(c.simulationHz) || c.simulationHz < 15 || c.simulationHz > 240) throw new Error('simulationHz inválido');
  if (!Number.isInteger(c.maxStepsPerFrame) || c.maxStepsPerFrame < 1 || c.maxStepsPerFrame > 16) throw new Error('maxStepsPerFrame inválido');
  if (!Number.isFinite(c.maxFrameDeltaMs) || c.maxFrameDeltaMs < 16 || c.maxFrameDeltaMs > 1000) throw new Error('maxFrameDeltaMs inválido');
  return c;
}
export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try { const canvas = document.createElement('canvas'); return !!canvas.getContext('webgl2'); } catch { return false; }
}
