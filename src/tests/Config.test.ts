import { describe, it, expect } from 'vitest';
import { validateConfig } from '../app/config';
describe('config', () => { it('rejeita valores inválidos', () => { expect(() => validateConfig({ simulationHz: 0, maxStepsPerFrame: 4, maxFrameDeltaMs: 100 })).toThrow(); }); });
