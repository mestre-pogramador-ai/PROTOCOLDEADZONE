/** Damage is applied once per immunity window, with a directional source for the HUD. */
export class PlayerDamage {
 health=100;immunity=0;events=0;lastSource:{x:number;z:number}|null=null;
 tick(dt:number):void{this.immunity=Math.max(0,this.immunity-dt);}
 apply(amount:number,source?:{x:number;z:number}):boolean{
  if(this.health<=0||this.immunity>0||!Number.isFinite(amount)||amount<=0)return false;
  this.health=Math.max(0,this.health-amount);this.immunity=.65;this.events++;
  this.lastSource=source?{...source}:null;return true;
 }
 reset():void{this.health=100;this.immunity=0;this.events=0;this.lastSource=null;}
}
