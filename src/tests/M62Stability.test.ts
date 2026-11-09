import {beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {PhysicsWorld} from '../physics/PhysicsWorld';
import {type InputSnapshot} from '../core/input/InputManager';
import {EnemyManager} from '../gameplay/enemies/EnemyManager';
import {enemyCanOccupy,enemyCanTraverse} from '../gameplay/enemies/Navigation';
import {Infected} from '../gameplay/enemies/Infected';
import {M9Controller} from '../gameplay/weapons/M9';
import {traceCombatShot} from '../gameplay/combat/EnemyHitScan';
import {RoundDirector} from '../gameplay/rounds/RoundDirector';
import {Runtime} from '../app/Runtime';
import {Diagnostics} from '../core/diagnostics/Diagnostics';
const dt=1/60;
const input=(x=0,z=0,sprint=false):InputSnapshot=>({moveX:x,moveY:z,held:new Set(sprint?['sprint']:[]),pressed:new Set()});
describe('M6.2 collision stability',()=>{
 beforeAll(async()=>{await RAPIER.init();});
 for(const [x,z] of [[0,-1],[1,0],[1,-1],[-1,0],[-1,1],[0,1]]){
  it('sustained sprint and wall sliding '+[x,z],()=>{
   const world=new PhysicsWorld();
   try{
    for(let i=0;i<100;i++)world.step(dt,input(),0);
    for(let i=0;i<600;i++){
     const before=world.snapshot().current.position;
     world.step(dt,input(x,z,true),0);
     const after=world.snapshot().current.position;
     const dx=after[0]-before[0],dz=after[2]-before[2];
     expect(after.every(Number.isFinite)).toBe(true);
     expect(Math.hypot(dx,dz)).toBeLessThan(.14);
     expect(dx*x+dz*z).toBeGreaterThan(-.005);
    }
   }finally{world.dispose();}
  });
 }
});
describe('M6.2 crowds',()=>{
 for(const count of [1,3,6,12,20])it('keeps '+count+' infected outside solids and separated',()=>{
  const m=new EnemyManager();m.clear();
  for(let i=0;i<count;i++)m.spawn(-2+(i%5)*.9,1+Math.floor(i/5)*.9);
  const start=performance.now();
  for(let tick=0;tick<600;tick++){
   m.tick(dt,5,-3,false);
   const enemies=m.snapshots();
   for(const e of enemies)expect(enemyCanOccupy(e.x,e.z,false)).toBe(true);
   for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++)
    expect(Math.hypot(enemies[i].x-enemies[j].x,enemies[i].z-enemies[j].z)).toBeGreaterThanOrEqual(.72);
  }
  const validationMs=performance.now()-start;
  const bench=performance.now();
  for(let tick=0;tick<600;tick++)m.tick(dt,-2,-3,false);
  console.info('crowd',count,'validation ms',+validationMs.toFixed(2),'simulation-only ms/600 ticks',+(performance.now()-bench).toFixed(2));
 });
 it('resolves initially overlapping infected without crossing level geometry',()=>{
  const m=new EnemyManager();m.clear();for(let i=0;i<20;i++)m.spawn(0,0);
  for(let tick=0;tick<180;tick++)m.tick(dt,5,-3,false);
  const enemies=m.snapshots();
  for(const e of enemies)expect(enemyCanOccupy(e.x,e.z,false)).toBe(true);
  for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++)
   expect(Math.hypot(enemies[i].x-enemies[j].x,enemies[i].z-enemies[j].z)).toBeGreaterThan(.72);
 });
 it('pursues around a pod rather than stopping at its face',()=>{
  const m=new EnemyManager();m.clear();m.spawn(-6,-4);
  for(let tick=0;tick<600;tick++)m.tick(dt,-2,-4,false);
  const e=m.snapshots()[0];
  expect(Math.hypot(e.x+2,e.z+4)).toBeLessThan(1.6);
 });
 it('rejects swept movement through a cabinet and closed door',()=>{
  expect(enemyCanTraverse(0,0,Infinity,0,false)).toBe(false);
  expect(enemyCanTraverse(-7,0,-5,0,false)).toBe(false);
  expect(enemyCanTraverse(7,0,9,0,false)).toBe(false);
  expect(enemyCanTraverse(7,0,9,0,true)).toBe(true);
 });
 it('does not hit through a newly closed obstacle during windup',()=>{
  const e=new Infected(1,0,0);e.tick(dt,0,1,()=>true);
  let hits=0;for(let i=0;i<60;i++)if(e.tick(dt,0,1,()=>true,undefined,false))hits++;
  expect(hits).toBe(0);
 });
});
describe('M6.2 weapon and lifecycle',()=>{
 it('releases ADS while reloading and conserves ammunition',()=>{
  const w=new M9Controller();
  w.tick(dt,{fire:true,ads:true,reload:false});
  w.tick(dt,{fire:false,ads:true,reload:true});
  expect(w.snapshot().ads).toBe(false);
  for(let i=0;i<90;i++)w.tick(dt,{fire:true,ads:true,reload:false});
  expect(w.snapshot().ammo).toBe(15);expect(w.snapshot().reserve).toBe(89);
 });
 it('headshots select the nearest living target and obey wall occlusion',()=>{
  const near=new Infected(1,0,-2).snapshot(),far=new Infected(2,0,-4).snapshot();
  const q={origin:[0,1.78,0] as const,yaw:0,pitch:0,maxDistance:80,doorOpen:false,id:1,damage:32};
  expect(traceCombatShot(q,[far,near])).toMatchObject({enemyId:1,headshot:true});
  expect(traceCombatShot(q,[{...near,z:-10}]).enemyId).toBeNull();
  expect(traceCombatShot(q,[{...near,state:'dead'},far]).enemyId).toBe(2);
 });
 it('pause freezes physics, reload and waves; reset restores session',async()=>{
  vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
  const r=await Runtime.create();
  try{
   r.start();r.beginRoundNow();r.frame(dt);
   r.weapon.tick(dt,{fire:true,ads:false,reload:false});
   r.weapon.tick(dt,{fire:false,ads:false,reload:true});
   r.pause();
   const p=r.getSnapshot().current,weapon=r.getWeaponState(),round=r.getRoundState();
   for(let i=0;i<90;i++)r.frame(.1);
   expect(r.getSnapshot().current).toEqual(p);expect(r.getWeaponState()).toEqual(weapon);expect(r.getRoundState()).toEqual(round);
   r.resume();r.frame(dt);expect(r.getWeaponState().reloadRemaining).toBeLessThan(weapon.reloadRemaining);
   r.reset();expect(r.getWeaponState().ammo).toBe(15);expect(r.enemies.alive()).toBe(0);expect(r.getEconomyState().credits).toBe(500);
  }finally{r.dispose();vi.unstubAllGlobals();}
 });
 it('progresses three waves with real manager retirement and resets cleanly',()=>{
  const rounds=new RoundDirector(),enemies=new EnemyManager();enemies.clear();
  const completed:number[]=[];
  for(let tick=0;tick<10000&&completed.length<3;tick++){
   if(rounds.snapshot().phase==='preparation')rounds.beginNow();
   const result=rounds.tick(dt,()=>enemies.alive(),hp=>{enemies.spawn(3,-2,hp);return true;});
   if(result.completedRound!==null)completed.push(result.completedRound);
   for(const e of enemies.snapshots())if(e.state!=='dead'&&enemies.applyDamage(e.id,e.hp))rounds.recordKill();
   enemies.tick(dt,-1,0,false);
  }
  expect(completed).toEqual([1,2,3]);expect(rounds.snapshot().round).toBe(4);
  rounds.reset();enemies.clear();
  expect(rounds.snapshot()).toMatchObject({round:1,completed:0,spawned:0,phase:'preparation'});
  expect(enemies.snapshots()).toEqual([]);
 });
 it('bounds reports and excludes free text values',()=>{
  const d=new Diagnostics(2);
  d.record('info','test',{tick:1});
  d.record('warning','user.marker');
  d.record('error','browser.error',{line:12,secret:'token' as unknown as number});
  const report=JSON.parse(d.report());expect(report.entries).toHaveLength(2);
  expect(d.report()).not.toContain('token');expect(d.report()).not.toContain('secret');
 });
});
