import {M9,M9Controller} from '../weapons/M9';
import {EconomyManager} from './EconomyManager';
export const AMMO_SUPPLY={pack:30,price:180,unitPrice:6,emergency:15,emergencySeconds:30} as const;
export type AmmoResult={status:'paid'|'emergency'|'full'|'insufficient'|'cooldown'|'duplicate'|'invalid';quantity:number;cost:number};
const denied=(status:AmmoResult['status']):AmmoResult=>({status,quantity:0,cost:0});
/** Session-scoped transaction authority. Synchronous debit + delivery, no async gap. */
export class AmmoSupply {
 private delivered=new Set<number>();
 private emergencyRemaining=0;
 private purchaseRemaining=0;
 constructor(private readonly weapon:M9Controller,private readonly economy:EconomyManager){}
 tick(dt:number):void {
  if(!Number.isFinite(dt)||dt<=0)return;
  this.emergencyRemaining=Math.max(0,this.emergencyRemaining-dt);
  this.purchaseRemaining=Math.max(0,this.purchaseRemaining-dt);
 }
 reset():void{this.delivered.clear();this.emergencyRemaining=0;this.purchaseRemaining=0;}
 snapshot(){return {emergencyRemaining:this.emergencyRemaining};}
 buy(requestId:number):AmmoResult {
  if(!Number.isSafeInteger(requestId)||requestId<1)return denied('invalid');
  const receipt='ammo:'+requestId;
  if(this.delivered.has(requestId)||this.economy.hasPurchase(receipt))return denied('duplicate');
  if(this.purchaseRemaining>1e-8)return denied('cooldown');
  const state=this.weapon.snapshot();
  const quantity=Math.min(AMMO_SUPPLY.pack,M9.maxReserve-state.reserve);
  if(quantity<=0)return denied('full');
  const cost=quantity*AMMO_SUPPLY.unitPrice;
  if(this.economy.balance<cost){
   if(state.ammo+state.reserve>0)return denied('insufficient');
   if(this.emergencyRemaining>1e-8)return denied('cooldown');
   this.weapon.addReserve(AMMO_SUPPLY.emergency);this.delivered.add(requestId);
   this.emergencyRemaining=AMMO_SUPPLY.emergencySeconds;this.purchaseRemaining=.25;
   return {status:'emergency',quantity:AMMO_SUPPLY.emergency,cost:0};
  }
  if(!this.economy.buy(receipt,cost,'ammo'))return denied('insufficient');
  this.weapon.addReserve(quantity);this.delivered.add(requestId);this.purchaseRemaining=.25;
  return {status:'paid',quantity,cost};
 }
}
