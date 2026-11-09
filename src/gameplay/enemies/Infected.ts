export type EnemyState='idle'|'chase'|'windup'|'active'|'recovery'|'hurt'|'dead';
export interface InfectedSnapshot {id:number;x:number;z:number;yaw:number;hp:number;maxHp:number;state:EnemyState;timer:number;deathAge:number;hitFlash:number;walkPhase:number}
export interface EnemyAttack {id:number;damage:number}
export const INFECTED={maxHp:100,speed:2,attackRange:1.45,attackDamage:18,windup:.45,active:.15,recovery:.9,aggro:18,bodyRadius:.38} as const;
/** Deterministic state machine; attack can deal damage at most once per windup. */
export class Infected {
 readonly id:number;readonly maxHp:number;x:number;z:number;yaw=0;hp:number;state:EnemyState='idle';timer=0;deathAge=0;hitFlash=0;walkPhase=0;
 private attackCommitted=false;
 constructor(id:number,x:number,z:number,maxHp:number=INFECTED.maxHp){this.id=id;this.x=x;this.z=z;this.maxHp=Math.max(1,Math.round(maxHp));this.hp=this.maxHp;}
 damage(amount:number):boolean {if(this.state==='dead'||!Number.isFinite(amount)||amount<=0)return false;this.hp=Math.max(0,this.hp-amount);this.hitFlash=.16;if(this.hp===0){this.state='dead';this.timer=0;this.attackCommitted=true;return true;}if(this.state==='chase'||this.state==='idle'||this.state==='windup'){this.state='hurt';this.timer=.19;this.attackCommitted=true;}return false;}
 tick(dt:number,px:number,pz:number,canMove:(x:number,z:number)=>boolean,waypoint?:readonly [number,number],canAttack=true):EnemyAttack|null {
 if(!Number.isFinite(dt)||dt<=0)return null;
 if(this.state==='dead'){this.deathAge+=dt;return null;}this.hitFlash=Math.max(0,this.hitFlash-dt);
 const dx=px-this.x,dz=pz-this.z,dist=Math.hypot(dx,dz);if(dist>.001)this.yaw=Math.atan2(dx,dz);
 if(this.state==='windup'){this.timer-=dt;if(this.timer<=0){this.state='active';this.timer=INFECTED.active;if(!this.attackCommitted){this.attackCommitted=true;return canAttack&&dist<=INFECTED.attackRange+.12?{id:this.id,damage:INFECTED.attackDamage}:null;}}return null;}
 if(this.state==='active'){this.timer-=dt;if(this.timer<=0){this.state='recovery';this.timer=INFECTED.recovery;}return null;}
 if(this.state==='recovery'||this.state==='hurt'){this.timer-=dt;if(this.timer<=0)this.state='chase';return null;}
 if(dist>INFECTED.aggro){this.state='idle';return null;}
 if(dist<=INFECTED.attackRange&&canAttack){this.state='windup';this.timer=INFECTED.windup;this.attackCommitted=false;return null;}
 this.state='chase';const target=waypoint??[px,pz],mx=target[0]-this.x,mz=target[1]-this.z,md=Math.hypot(mx,mz);
 if(md>.015){const speed=Math.min(INFECTED.speed*dt,md);const nx=this.x+mx/md*speed,nz=this.z+mz/md*speed;
  if(canMove(nx,nz)){this.x=nx;this.z=nz;this.walkPhase+=speed*5;}
  else if(canMove(nx,this.z)){this.x=nx;this.walkPhase+=speed*3;}
  else if(canMove(this.x,nz)){this.z=nz;this.walkPhase+=speed*3;}
 }return null;
 }
 snapshot():InfectedSnapshot{return {id:this.id,x:this.x,z:this.z,yaw:this.yaw,hp:this.hp,maxHp:this.maxHp,state:this.state,timer:this.timer,deathAge:this.deathAge,hitFlash:this.hitFlash,walkPhase:this.walkPhase};}
}
