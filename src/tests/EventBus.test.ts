import { describe, it, expect, vi } from 'vitest';
import { EventBus, type AppEvents } from '../core/events/EventBus';
describe('EventBus', () => { it('emite e remove inscrições', () => { const b = new EventBus<AppEvents>(); const fn = vi.fn(); const off = b.on('session:started', fn); b.emit('session:started', { sessionId: 1 }); off(); b.emit('session:started', { sessionId: 2 }); expect(fn).toHaveBeenCalledTimes(1); expect(b.listenerCount()).toBe(0); }); });
