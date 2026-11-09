import type {ShotQuery} from '../weapons/HitScan';
import {traceCombatShot} from './EnemyHitScan';
import type {EnemyManager} from '../enemies/EnemyManager';
import type {EconomyManager} from '../economy/EconomyManager';
/** Shared production hit resolution: a paid bullet reaches this only after takeShot(). */
export function resolveShot(query:ShotQuery,headshotMultiplier:number,enemies:EnemyManager,economy:EconomyManager){
 const trace=traceCombatShot(query,enemies.snapshots());
 const hit=trace.enemyId!==null;
 let killed=false;
 if(hit){
  economy.awardHit(trace.enemyId!,query.id);
  killed=enemies.applyDamage(trace.enemyId!,query.damage*(trace.headshot?headshotMultiplier:1));
  if(killed)economy.awardKill(trace.enemyId!,trace.headshot);
 }
 return {trace,hit,killed};
}
