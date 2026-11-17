import type {EconomyManager} from '../economy/EconomyManager';
import {perkRegistry,type PerkRegistry} from './PerkRegistry';
import {PerkEffectResolver} from './PerkEffectResolver';
export type PerkPurchase='acquired'|'owned'|'limit'|'insufficient'|'unavailable'|'inactive';
export class PerkManager {
 static readonly limit=4;
 private owned=new Set<string>();
 private active=true;
 private resolved=PerkEffectResolver.resolve([]);
 constructor(private readonly economy:EconomyManager,private readonly registry:PerkRegistry=perkRegistry,
  private readonly onChange:()=>void=()=>{}){}
 has(id:string):boolean{return this.owned.has(id);}
 snapshot(){return [...this.owned].map(id=>this.registry.get(id)!);}
 effects(){return this.resolved;}
 buy(id:string):PerkPurchase {
  if(!this.active)return 'inactive';
  if(this.owned.has(id)||this.economy.hasPurchase('perk:'+id))return 'owned';
  const perk=this.registry.get(id);if(!perk)return 'unavailable';
  if(this.owned.size>=PerkManager.limit)return 'limit';
  if(!this.economy.buy('perk:'+id,perk.price,'perk'))return 'insufficient';
  this.owned.add(id);this.refresh();return 'acquired';
 }
 clearOnDeath():void{this.active=false;this.owned.clear();this.refresh();}
 reset():void{this.active=true;this.owned.clear();this.refresh();}
 private refresh():void{this.resolved=PerkEffectResolver.resolve(this.snapshot());this.onChange();}
}
