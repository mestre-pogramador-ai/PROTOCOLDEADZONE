/** Damage is applied once per immunity window, with a directional source for the HUD. */
export class PlayerDamage {
 maxHealth=100;private damageMultiplier=1;
 health=100;immunity=0;events=0;lastSource:{x:number;z:number}|null=null;
 configure(maxHealth:number,damageMultiplier:number,healIncrease=false):void{
  if(!Number.isFinite(maxHealth)||maxHealth<100||!Number.isFinite(damageMultiplier)||damageMultiplier<=0)return;
  const increase=Math.max(0,maxHealth-this.maxHealth);
  this.maxHealth=maxHealth;this.damageMultiplier=damageMultiplier;
  this.health=Math.min(maxHealth,this.health+(healIncrease&&this.health>0?increase:0));
 }
 tick(dt:number):void{this.immunity=Math.max(0,this.immunity-dt);}
 apply(amount:number,source?:{x:number;z:number}):boolean{
  if(this.health<=0||this.immunity>0||!Number.isFinite(amount)||amount<=0)return false;
  this.health=Math.max(0,Math.round((this.health-amount*this.damageMultiplier)*100)/100);this.immunity=.65;this.events++;
  this.lastSource=source?{...source}:null;return true;
 }
 reset():void{this.maxHealth=100;this.damageMultiplier=1;this.health=100;this.immunity=0;this.events=0;this.lastSource=null;}
}
