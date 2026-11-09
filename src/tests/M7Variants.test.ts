import {describe,expect,it,vi} from 'vitest';
import {ENEMY_ARCHETYPES,ENEMY_KINDS,enemyKindForSpawn,type EnemyKind} from '../gameplay/enemies/EnemyArchetypes';
import {Infected,INFECTED} from '../gameplay/enemies/Infected';
import {EnemyManager} from '../gameplay/enemies/EnemyManager';
import {RoundDirector,difficultyForRound} from '../gameplay/rounds/RoundDirector';
import {enemyCanOccupy} from '../gameplay/enemies/Navigation';
import {traceCombatShot} from '../gameplay/combat/EnemyHitScan';
import {Runtime} from '../app/Runtime';
const dt=1/60;
describe('M7 deterministic wave composition',()=>{
 it('introduces types only at their thresholds and preserves common enemies',()=>{
  for(let round=1;round<=30;round++){
   const types=Array.from({length:difficultyForRound(round).total},(_,i)=>enemyKindForSpawn(round,i));
   for(const kind of types)expect(ENEMY_ARCHETYPES[kind].unlockRound).toBeLessThanOrEqual(round);
   expect(types).toContain('common');
   if(round<4)expect(new Set(types)).toEqual(new Set(['common']));
  }
  expect(enemyKindForSpawn(4,0)).toBe('runner');
  expect(enemyKindForSpawn(7,0)).toBe('brute');
  expect(enemyKindForSpawn(10,0)).toBe('predator');
  expect(()=>enemyKindForSpawn(0,0)).toThrow();
  expect(()=>enemyKindForSpawn(1,-1)).toThrow();
 });
 it('advances ten waves with scaled HP and retries the same type after a failed spawn',()=>{
  const r=new RoundDirector();let alive=0;let reject=true;
  const completed:number[]=[];const received=new Map<number,EnemyKind[]>();
  for(let tick=0;tick<30000&&completed.length<10;tick++){
   if(r.snapshot().phase==='preparation')r.beginNow();
   const state=r.snapshot();
   const result=r.tick(dt,()=>alive,(hp,kind)=>{
    expect(kind).toBe(enemyKindForSpawn(state.round,state.spawned));
    expect(hp).toBe(Math.round(difficultyForRound(state.round).infectedHp*ENEMY_ARCHETYPES[kind].hpMultiplier));
    if(reject){reject=false;return false;}reject=true;
    received.set(state.round,[...(received.get(state.round)??[]),kind]);alive++;return true;
   });
   if(alive){alive=0;r.recordKill();}
   if(result.completedRound!==null)completed.push(result.completedRound);
  }
  expect(completed).toEqual([1,2,3,4,5,6,7,8,9,10]);
  expect(received.get(4)).toContain('runner');expect(received.get(7)).toContain('brute');expect(received.get(10)).toContain('predator');
  for(const [round,kinds] of received)expect(kinds).toHaveLength(difficultyForRound(round).total);
  r.reset();expect(r.snapshot().round).toBe(1);expect(enemyKindForSpawn(1,0)).toBe('common');
 });
});
describe.each(ENEMY_KINDS)('M7 %s combat',kind=>{
 const stats=ENEMY_ARCHETYPES[kind].stats;
 it('moves at its configured speed and preserves the common baseline',()=>{
  const e=new Infected(1,0,0,100,kind);e.tick(dt,0,6,()=>true);
  expect(e.z).toBeCloseTo(stats.speed*dt);
  expect(INFECTED).toMatchObject({speed:2,attackDamage:18,windup:.45,recovery:.9});
 });
 it('delivers exactly one hit during a swing, after the complete windup',()=>{
  const e=new Infected(1,0,0,100,kind);e.tick(dt,0,1,()=>true);
  const attacks=[];
  for(let i=0;i<Math.ceil((stats.windup+stats.active+.1)/dt);i++){
   const hit=e.tick(dt,0,1,()=>true);if(hit)attacks.push(hit);
   if((i+1)*dt<stats.windup-1e-8)expect(attacks).toHaveLength(0);
  }
  expect(attacks).toEqual([{id:1,damage:stats.attackDamage}]);
 });
 it('cannot hit through cover or after lethal damage',()=>{
  const e=new Infected(1,0,0,100,kind);e.tick(dt,0,1,()=>true);
  for(let i=0;i<120;i++)expect(e.tick(dt,0,1,()=>true,undefined,false)).toBeNull();
  e.damage(100);
  for(let i=0;i<120;i++)expect(e.tick(dt,0,1,()=>true)).toBeNull();
 });
 it('retains headshots and nearest-solid occlusion',()=>{
  const e=new Infected(1,0,-2,100,kind).snapshot();
  const q={origin:[0,1.78,0] as const,yaw:0,pitch:0,maxDistance:80,doorOpen:false,id:1,damage:32};
  expect(traceCombatShot(q,[e])).toMatchObject({enemyId:1,headshot:true});
  expect(traceCombatShot(q,[{...e,z:-10}]).enemyId).toBeNull();
 });
});
describe('M7 mixed crowds and lifecycle',()=>{
 it('keeps 20 mixed enemies outside solids and separated for 20 simulated seconds',()=>{
  const m=new EnemyManager();m.clear();
  for(let i=0;i<20;i++)m.spawn(-2+(i%5)*.9,1+Math.floor(i/5)*.9,100,ENEMY_KINDS[i%4]);
  expect(m.composition()).toEqual({common:5,runner:5,brute:5,predator:5});
  for(let tick=0;tick<1200;tick++){
   m.tick(dt,5,-3,false);const enemies=m.snapshots();
   for(const e of enemies)expect(enemyCanOccupy(e.x,e.z,false)).toBe(true);
   for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++)
    expect(Math.hypot(enemies[i].x-enemies[j].x,enemies[i].z-enemies[j].z)).toBeGreaterThan(.72);
  }
  const id=m.snapshots()[0].id;m.applyDamage(id,100);
  expect(Object.values(m.composition()).reduce((a,b)=>a+b,0)).toBe(19);
  m.clear();expect(m.alive()).toBe(0);expect(m.composition()).toEqual({common:0,runner:0,brute:0,predator:0});
 });
 it('freezes every variant during pause and removes them on reset',async()=>{
  vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
  const r=await Runtime.create();
  try{
   r.start();
   ENEMY_KINDS.forEach((kind,i)=>r.enemies.spawn(2+i,-2,100,kind));
   r.frame(dt);r.pause();const before=r.enemies.snapshots();
   for(let i=0;i<60;i++)r.frame(.1);
   expect(r.enemies.snapshots()).toEqual(before);
   r.resume();r.frame(dt);expect(r.enemies.snapshots()).not.toEqual(before);
   r.reset();expect(r.enemies.snapshots()).toEqual([]);expect(r.getRoundState().round).toBe(1);
  }finally{r.dispose();vi.unstubAllGlobals();}
 });
});
