export const M9 = {
  id: 'm9', displayName: 'M9', damage: 32, headshotMultiplier: 2,
  rpm: 360, magazineSize: 15, reserveOnSpawn: 90, maxReserve: 90,
  reloadSeconds: 1.5, adsSeconds: 0.15, adsMoveSpeed: 3.1,
  range: 80, recoilKick: 0.095,
} as const;
export interface WeaponState { ammo: number; reserve: number; reloading: boolean; reloadRemaining: number; reloadDuration:number; ads: boolean; adsBlend: number; cooldownRemaining: number; shotsFired: number }
export type FireResult = { id: number; damage: number; headshotMultiplier: number; range: number };
/** M9 state is simulation-authoritative; UI/animations only observe snapshots. */
export class M9Controller {
  private reloadMultiplier=1;private reloadDuration:number=M9.reloadSeconds;
  configureReloadMultiplier(value:number):void{if(Number.isFinite(value)&&value>0)this.reloadMultiplier=value;}
  private ammo: number = M9.magazineSize; private reserve: number = M9.reserveOnSpawn; private reloadRemaining = 0; private cooldown = 0;
  private ads = false; private adsBlend = 0; private shotsFired = 0; private pendingShot: FireResult | null = null;
  tick(dt: number, intent: { fire: boolean; ads: boolean; reload: boolean }): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.pendingShot = null;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.ads = intent.ads && !intent.reload && this.reloadRemaining <= 0;
    this.adsBlend = Math.max(0, Math.min(1, this.adsBlend + (this.ads ? 1 : -1) * dt / M9.adsSeconds));
    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - dt);
      if(this.reloadRemaining < 1e-8)this.reloadRemaining=0;
      if (this.reloadRemaining === 0) this.finishReload();
      return;
    }
    if (intent.reload) this.beginReload();
    if (this.reloadRemaining > 0) return;
    if (intent.fire && this.cooldown <= 0 && this.ammo > 0) {
      this.ammo--; this.shotsFired++; this.cooldown = 60 / M9.rpm;
      this.pendingShot = { id: this.shotsFired, damage: M9.damage, headshotMultiplier: M9.headshotMultiplier, range: M9.range };
    }
  }
  private beginReload(): void { if (this.ammo === M9.magazineSize || this.reserve === 0) return; this.reloadDuration=M9.reloadSeconds*this.reloadMultiplier;this.reloadRemaining = this.reloadDuration; }
  private finishReload(): void { const moved = Math.min(M9.magazineSize - this.ammo, this.reserve); this.ammo += moved; this.reserve -= moved; }
  addReserve(quantity:number):number {
    if(!Number.isSafeInteger(quantity)||quantity<=0)return 0;
    const added=Math.min(quantity,M9.maxReserve-this.reserve);
    this.reserve+=added;return added;
  }
  takeShot(): FireResult | null { const shot = this.pendingShot; this.pendingShot = null; return shot; }
  snapshot(): WeaponState { return { ammo:this.ammo, reserve:this.reserve, reloading:this.reloadRemaining>0, reloadRemaining:this.reloadRemaining,reloadDuration:this.reloadDuration, ads:this.ads, adsBlend:this.adsBlend, cooldownRemaining:this.cooldown, shotsFired:this.shotsFired }; }
  reset(): void { this.reloadMultiplier=1;this.reloadDuration=M9.reloadSeconds;this.ammo=M9.magazineSize; this.reserve=M9.reserveOnSpawn; this.reloadRemaining=0; this.cooldown=0; this.ads=false; this.adsBlend=0; this.shotsFired=0; this.pendingShot=null; }
}
