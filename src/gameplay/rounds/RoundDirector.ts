/** M5: ondas determinísticas, sem relógio ou timer adicional ao GameClock. */
export type RoundPhase = 'preparation' | 'active';
export interface RoundDifficulty { round: number; total: number; maxConcurrent: number; infectedHp: number; spawnInterval: number; preparationSeconds: number }
export interface RoundSnapshot extends RoundDifficulty {
  phase: RoundPhase;
  prepRemaining: number;
  spawned: number;
  remainingToSpawn: number;
  eliminated: number;
  alive: number;
  completed: number;
}
export interface RoundTickEvents { started: boolean; completedRound: number | null }
const ANCHORS = [
  { round: 1, hp: 100, cap: 6 },
  { round: 5, hp: 135, cap: 10 },
  { round: 10, hp: 190, cap: 16 },
  { round: 15, hp: 250, cap: 22 },
  { round: 20, hp: 310, cap: 28 },
  { round: 30, hp: 400, cap: 36 },
] as const;
export function preparationSeconds(round: number): number {
  return round <= 3 ? 30 : round <= 7 ? 25 : round <= 12 ? 22 : round <= 20 ? 20 : 18;
}
export function difficultyForRound(round: number): RoundDifficulty {
  if (!Number.isInteger(round) || round < 1 ) throw new Error('Rodada inválida');
  const total = Math.ceil(5 + 2 * round + .15 * round ** 1.5);
  let hp: number = 400 + Math.max(0, round - 30) * 8;
  let cap: number = 36;
  if (round <= 30) {
    const upper = ANCHORS.find(anchor => anchor.round >= round) ?? ANCHORS[ANCHORS.length - 1];
    const lower = [...ANCHORS].reverse().find(anchor => anchor.round <= round) ?? ANCHORS[0];
    const span = upper.round - lower.round;
    const t = span === 0 ? 0 : (round - lower.round) / span;
    hp = Math.round(lower.hp + (upper.hp - lower.hp) * t);
    cap = Math.round(lower.cap + (upper.cap - lower.cap) * t);
  }
  return { round, total, maxConcurrent: cap, infectedHp: hp,
    spawnInterval: Math.max(.38, 1.1 - round * .026), preparationSeconds: preparationSeconds(round) };
}
/**
 * Callback spawn() returns true ONLY when an enemy was added. A failed spawn never
 * consumes the wave quota. The director never owns enemies or gives credits.
 */
export class RoundDirector {
  private round = 1;
  private phase: RoundPhase = 'preparation';
  private prepRemaining = preparationSeconds(1);
  private spawned = 0;
  private eliminated = 0;
  private completed = 0;
  private spawnTimer = 0;
  private alive = 0;

  reset(): void { this.round = 1; this.phase = 'preparation'; this.prepRemaining = preparationSeconds(1);
    this.spawned = 0; this.eliminated = 0; this.completed = 0; this.spawnTimer = 0; this.alive = 0; }
  beginNow(): boolean {
    if (this.phase !== 'preparation') return false;
    this.phase = 'active'; this.prepRemaining = 0; this.spawnTimer = 0;
    return true;
  }
  recordKill(): void { if (this.phase === 'active' && this.eliminated < this.spawned) this.eliminated++; }
  snapshot(): RoundSnapshot {
    const d = difficultyForRound(this.round);
    return { ...d, phase: this.phase, prepRemaining: this.prepRemaining, spawned: this.spawned,
      remainingToSpawn: d.total - this.spawned, eliminated: this.eliminated, alive: this.alive, completed: this.completed };
  }
  tick(dt: number, countAlive: () => number, spawn: (hp: number) => boolean): RoundTickEvents {
    const events: RoundTickEvents = { started: false, completedRound: null };
    if (!Number.isFinite(dt) || dt <= 0) return events;
    this.alive = countAlive();
    if (this.phase === 'preparation') {
      this.prepRemaining = Math.max(0, this.prepRemaining - dt);
      if (this.prepRemaining <= 0) { events.started = this.beginNow(); }
      return events;
    }
    const diff = difficultyForRound(this.round);
    this.spawnTimer -= dt;
    // one attempted spawn per fixed tick; cap is strictly on living enemies
    if (this.spawned < diff.total && this.alive < diff.maxConcurrent && this.spawnTimer <= 0) {
      if (spawn(diff.infectedHp)) { this.spawned++; this.alive = countAlive(); this.spawnTimer = diff.spawnInterval; }
      else this.spawnTimer = .3;
    }
    if (this.spawned === diff.total && this.alive === 0) {
      const finished = this.round;
      this.completed = finished;
      this.round++;
      this.phase = 'preparation';
      this.prepRemaining = preparationSeconds(this.round);
      this.spawned = 0; this.eliminated = 0; this.spawnTimer = 0;
      events.completedRound = finished;
    }
    return events;
  }
}
