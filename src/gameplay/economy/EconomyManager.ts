/** M5: única autoridade para créditos da partida, com recibos idempotentes. */
export const ECONOMY = {
  startingCredits: 500,
  hitCredits: 10,
  maxPaidHitsPerEnemy: 5,
  commonKill: 60,
  headshotKill: 90, // substitui o bônus de morte comum, não soma
  containmentDoorPrice: 750,
} as const;
export type CreditReason = 'hit' | 'kill' | 'headshot' | 'round' | 'door' | 'ammo';
export interface CreditNotice { delta: number; reason: CreditReason; serial: number }
export interface EconomySnapshot { credits: number; lifetimeEarned: number; lifetimeSpent: number; lastNotice: CreditNotice | null; doorPurchased: boolean }
export class EconomyManager {
  private credits = ECONOMY.startingCredits;
  private earned = 0;
  private spent = 0;
  private hitsByEnemy = new Map<number, number>();
  private transactions = new Set<string>();
  private notice: CreditNotice | null = null;
  private serial = 0;
  reset(): void {
    this.credits = ECONOMY.startingCredits; this.earned = 0; this.spent = 0;
    this.hitsByEnemy.clear(); this.transactions.clear(); this.notice = null; this.serial = 0;
  }
  get balance(): number { return this.credits; }
  private reward(key: string, amount: number, reason: CreditReason): number {
    if (this.transactions.has(key)) return 0;
    this.transactions.add(key);
    this.credits += amount; this.earned += amount;
    this.notice = { delta: amount, reason, serial: ++this.serial };
    return amount;
  }
  awardHit(enemyId: number, shotId: number): number {
    if (!Number.isInteger(enemyId) || enemyId <= 0 || !Number.isInteger(shotId) || shotId <= 0) return 0;
    const key = `hit:${enemyId}:${shotId}`;
    if (this.transactions.has(key)) return 0;
    const paid = this.hitsByEnemy.get(enemyId) ?? 0;
    this.transactions.add(key);
    if (paid >= ECONOMY.maxPaidHitsPerEnemy) return 0;
    this.hitsByEnemy.set(enemyId, paid + 1);
    return this.reward(`payout:${key}`, ECONOMY.hitCredits, 'hit');
  }
  awardKill(enemyId: number, headshot: boolean): number {
    if (!Number.isInteger(enemyId) || enemyId <= 0) return 0;
    return this.reward(`kill:${enemyId}`, headshot ? ECONOMY.headshotKill : ECONOMY.commonKill,
      headshot ? 'headshot' : 'kill');
  }
  awardRound(round: number): number {
    if (!Number.isInteger(round) || round < 1) return 0;
    return this.reward(`round:${round}`, 50 + 10 * round, 'round');
  }
  hasPurchase(id: string): boolean { return this.transactions.has(`buy:${id}`); }
  buy(id: string, cost: number, reason: 'door'|'ammo' = 'door'): boolean {
    if (!id || !Number.isSafeInteger(cost) || cost < 0) return false;
    const key = `buy:${id}`;
    if (this.transactions.has(key)) return true;
    if (this.credits < cost) return false;
    this.transactions.add(key); this.credits -= cost; this.spent += cost;
    this.notice = { delta: -cost, reason, serial: ++this.serial };
    return true;
  }
  snapshot(): EconomySnapshot {
    return { credits: this.credits, lifetimeEarned: this.earned, lifetimeSpent: this.spent,
      lastNotice: this.notice ? { ...this.notice } : null,
      doorPurchased: this.hasPurchase('door-containment-security') };
  }
}
