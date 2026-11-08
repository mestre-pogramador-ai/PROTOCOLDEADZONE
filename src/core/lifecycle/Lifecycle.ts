import { EventBus, type AppEvents } from '../events/EventBus';
export type SessionState = 'ready' | 'running' | 'paused' | 'stopped' | 'disposed';
export class Lifecycle {
  state: SessionState = 'ready';
  sessionId = 0;
  constructor(private readonly bus: EventBus<AppEvents>) {}
  start(): void { if (this.state === 'disposed') throw new Error('Lifecycle descartado'); if (this.state === 'running') return; this.sessionId++; this.state = 'running'; this.bus.emit('session:started', { sessionId: this.sessionId }); }
  pause(): void { if (this.state !== 'running') return; this.state = 'paused'; this.bus.emit('session:paused', { sessionId: this.sessionId }); }
  resume(): void { if (this.state !== 'paused') return; this.state = 'running'; this.bus.emit('session:resumed', { sessionId: this.sessionId }); }
  stop(): void { if (this.state === 'disposed' || this.state === 'stopped') return; this.state = 'stopped'; this.bus.emit('session:ended', { sessionId: this.sessionId }); }
  reset(): void { if (this.state === 'disposed') throw new Error('Lifecycle descartado'); this.stop(); this.state = 'ready'; this.bus.emit('session:reset', { sessionId: this.sessionId }); }
  dispose(): void { if (this.state === 'disposed') return; this.stop(); this.state = 'disposed'; }
}
