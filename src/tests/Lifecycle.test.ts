import { describe, it, expect } from 'vitest';
import { Lifecycle } from '../core/lifecycle/Lifecycle';
import { EventBus, type AppEvents } from '../core/events/EventBus';
describe('Lifecycle', () => { it('controla transições e sessões', () => { const l = new Lifecycle(new EventBus<AppEvents>()); l.start(); expect(l.state).toBe('running'); l.pause(); expect(l.state).toBe('paused'); l.resume(); expect(l.state).toBe('running'); l.reset(); expect(l.state).toBe('ready'); l.start(); expect(l.sessionId).toBe(2); l.dispose(); expect(l.state).toBe('disposed'); }); });
