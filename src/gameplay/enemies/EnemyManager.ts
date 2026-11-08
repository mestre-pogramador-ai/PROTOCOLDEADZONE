import {Infected,INFECTED,type InfectedSnapshot,type EnemyAttack} from './Infected';
import {canOccupyWithSeparation,resolveEnemySeparation} from './Separation';
import {enemyCanOccupy,findEnemyPath,hasEnemyLineOfSight} from './Navigation';
const SPAWNS:readonly [number,number][]=[[3,-2],[5.3,4.6],[4.5,-3.4],[-5,5],[-5,-5],[5.6,1.8]];
interface Route{timer:number;path:[number,number][];index:number;targetX:number;targetZ:number;doorOpen:boolean}
export class EnemyManager {
 private enemies:Infected[]=[];private count=1;private nextId=1;private routes=new Map<number,Route>();
 constructor(){this.reset();}
 reset():void{this.nextId=1;this.enemies=SPAWNS.slice(0,this.count).map(([x,z])=>new Infected(this.nextId++,x,z));this.routes.clear();}
 clear():void{this.enemies=[];this.nextId=1;this.routes.clear();}
 spawn(x:number,z:number,maxHp:number=INFECTED.maxHp):number {const id=this.nextId++;this.enemies.push(new Infected(id,x,z,maxHp));return id;}
 setCount(count:number):void{this.count=Math.max(1,Math.min(6,Math.floor(count)));this.reset();}
 snapshots():InfectedSnapshot[]{return this.enemies.map(e=>e.snapshot());}
 snapshotById(id:number):InfectedSnapshot|undefined{return this.enemies.find(e=>e.id===id)?.snapshot();}
 alive():number{return this.enemies.filter(e=>e.state!=='dead').length;}
 applyDamage(id:number,amount:number):boolean{return this.enemies.find(e=>e.id===id)?.damage(amount)??false;}
 tick(dt:number,px:number,pz:number,doorOpen:boolean):EnemyAttack[]{const attacks:EnemyAttack[]=[];
  for(const e of this.enemies){if(e.state==='dead'){e.tick(dt,px,pz,()=>false);continue;}
   const clear=hasEnemyLineOfSight(e.x,e.z,px,pz,doorOpen);let route=this.routes.get(e.id);
   if(!route){route={timer:0,path:[],index:0,targetX:Infinity,targetZ:Infinity,doorOpen};this.routes.set(e.id,route);}
   route.timer-=dt;
   if(route.timer<=0||Math.hypot(route.targetX-px,route.targetZ-pz)>1.1||route.doorOpen!==doorOpen){route.path=clear?[]:findEnemyPath(e.x,e.z,px,pz,doorOpen);route.index=0;route.timer=.55+(e.id%3)*.11;route.targetX=px;route.targetZ=pz;route.doorOpen=doorOpen;}
   let waypoint:readonly [number,number]|undefined;
   if(!clear&&route.path.length){while(route.index<route.path.length-1&&Math.hypot(e.x-route.path[route.index][0],e.z-route.path[route.index][1])<.5)route.index++;waypoint=route.path[route.index];}
   const attack=e.tick(dt,px,pz,(x,z)=>enemyCanOccupy(x,z,doorOpen)&&canOccupyWithSeparation(x,z,e.id,this.enemies,INFECTED.bodyRadius*1.9),waypoint,clear);if(attack)attacks.push(attack);
  }
  // Resolve pre-existing overlaps after movement, never push through walls or closed doors.
  resolveEnemySeparation(this.enemies,(x,z)=>enemyCanOccupy(x,z,doorOpen),INFECTED.bodyRadius*2);
  // Keep a corpse briefly for the death animation; then recycle its view/route.
  const retired=this.enemies.filter(e=>e.state==='dead'&&e.deathAge>=2.5);
  if(retired.length){const ids=new Set(retired.map(e=>e.id));this.enemies=this.enemies.filter(e=>!ids.has(e.id));for(const id of ids)this.routes.delete(id);}
  return attacks;
 }
}
