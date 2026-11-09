export type AppEvents = {
  'app:ready': { sessionId: number };
  'session:started': { sessionId: number };
  'session:paused': { sessionId: number };
  'session:resumed': { sessionId: number };
  'session:reset': { sessionId: number };
  'session:ended': { sessionId: number };
  'asset:failed': { key: string; message: string };
  'combat:shot': { hit: boolean; headshot: boolean };
  'combat:damage': { health: number; amount: number };
  'combat:enemyKilled': { headshot: boolean };
  'weapon:reloadStarted': Record<string, never>;
  'weapon:reloaded': Record<string, never>;
  'round:started': { round: number };
  'round:completed': { round: number; reward: number };
  'perk:changed': Record<string,never>;
  'ammo:received': { quantity:number; cost:number };
  'economy:purchase': { price: number };
  'economy:denied': { price: number };
  'session:gameover': { rounds: number; kills: number };
};
export class EventBus<E extends object> {
  private handlers = new Map<keyof E, Set<(payload: never) => void>>();
  on<K extends keyof E>(type: K, fn: (payload: E[K]) => void): () => void {
    const group = this.handlers.get(type) ?? new Set<(payload: never) => void>();
    group.add(fn as (payload: never) => void); this.handlers.set(type, group);
    return () => { group.delete(fn as (payload: never) => void); if (!group.size) this.handlers.delete(type); };
  }
  emit<K extends keyof E>(type: K, payload: E[K]): void {
    for (const fn of [...(this.handlers.get(type) ?? [])]) fn(payload as never);
  }
  clear(): void { this.handlers.clear(); }
  listenerCount(): number { return [...this.handlers.values()].reduce((n, s) => n + s.size, 0); }
}
