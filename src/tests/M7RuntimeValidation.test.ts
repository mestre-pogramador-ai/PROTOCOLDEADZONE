import {expect,it,vi} from 'vitest';
import {Runtime} from '../app/Runtime';
import {ENEMY_ARCHETYPES,enemyKindForSpawn,type EnemyKind} from '../gameplay/enemies/EnemyArchetypes';
import {difficultyForRound} from '../gameplay/rounds/RoundDirector';

it('integrates real Runtime, Rapier and spawn positions through ten complete waves',async()=>{
 vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
 const runtime=await Runtime.create();
 const counts=new Map<number,number>();
 const seen=new Set<number>();
 const types=new Set<EnemyKind>();
 try{
  runtime.start();
  for(let tick=0;tick<30000&&runtime.getRoundState().completed<10;tick++){
   if(runtime.getRoundState().phase==='preparation')runtime.beginRoundNow();
   const round=runtime.getRoundState().round;
   runtime.frame(1/60);
   for(const enemy of runtime.enemies.snapshots()){
    if(enemy.state==='dead')continue;
    expect(seen.has(enemy.id)).toBe(false);
    seen.add(enemy.id);types.add(enemy.kind);
    const ordinal=counts.get(round)??0;
    expect(enemy.kind).toBe(enemyKindForSpawn(round,ordinal));
    expect(enemy.maxHp).toBe(Math.round(difficultyForRound(round).infectedHp*ENEMY_ARCHETYPES[enemy.kind].hpMultiplier));
    expect([enemy.x,enemy.z].every(Number.isFinite)).toBe(true);
    counts.set(round,ordinal+1);
    // Test-only instant elimination validates orchestration, not weapon/ammo balance.
    if(runtime.enemies.applyDamage(enemy.id,enemy.hp))runtime.rounds.recordKill();
   }
  }
  expect(runtime.getRoundState()).toMatchObject({round:11,completed:10,phase:'preparation'});
  expect(types).toEqual(new Set(['common','runner','brute','predator']));
  for(let round=1;round<=10;round++)expect(counts.get(round)).toBe(difficultyForRound(round).total);
  expect(runtime.getCombatState().health).toBe(100);
  runtime.reset();
  expect(runtime.getRoundState()).toMatchObject({round:1,completed:0});
  expect(runtime.enemies.snapshots()).toEqual([]);
  expect(runtime.getWeaponState()).toMatchObject({ammo:15,reserve:90});
 }finally{runtime.dispose();vi.unstubAllGlobals();}
},20000);
