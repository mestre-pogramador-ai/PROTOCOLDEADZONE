export type EnemyKind = 'common' | 'runner' | 'brute' | 'predator';
export interface EnemyStats {
  maxHp:number; speed:number; attackRange:number; attackDamage:number;
  windup:number; active:number; recovery:number; aggro:number; bodyRadius:number;
}
interface Archetype {
  label:string; unlockRound:number; hpMultiplier:number;
  color:string; headColor:string; markerColor:string; stats:Readonly<EnemyStats>;
}
const common:Readonly<EnemyStats> = {
  maxHp:100,speed:2,attackRange:1.45,attackDamage:18,
  windup:.45,active:.15,recovery:.9,aggro:18,bodyRadius:.38,
};
/** Same collision/hit volumes for every type; colors and attack cadence identify roles. */
export const ENEMY_ARCHETYPES:Readonly<Record<EnemyKind,Readonly<Archetype>>> = {
  common:{label:'Infectado Comum',unlockRound:1,hpMultiplier:1,
    color:'#62746c',headColor:'#98a498',markerColor:'#c64d4d',stats:common},
  runner:{label:'Corredor',unlockRound:4,hpMultiplier:.7,
    color:'#aa7942',headColor:'#d9b77b',markerColor:'#ffd269',
    stats:{...common,speed:3.2,attackDamage:14,windup:.35,recovery:.8}},
  brute:{label:'Brutamontes',unlockRound:7,hpMultiplier:1.8,
    color:'#526a96',headColor:'#9aacc9',markerColor:'#72b8ff',
    stats:{...common,speed:1.35,attackDamage:28,windup:.8,recovery:1.3}},
  predator:{label:'Predador',unlockRound:10,hpMultiplier:1.2,
    color:'#8d4764',headColor:'#c98fba',markerColor:'#f28ee3',
    stats:{...common,speed:2.6,attackDamage:22,windup:.55,recovery:.75}},
};
export const ENEMY_KINDS:readonly EnemyKind[]=['common','runner','brute','predator'];
/** Spawn ordinal is successful spawns in this wave: failed attempts never skip a type. */
export function enemyKindForSpawn(round:number,ordinal:number):EnemyKind {
  if(!Number.isInteger(round)||round<1||!Number.isInteger(ordinal)||ordinal<0)
    throw new Error('Composição de rodada inválida');
  if(round>=10&&ordinal%10===0)return 'predator';
  if(round>=7&&ordinal%6===0)return 'brute';
  if(round>=4&&ordinal%4===0)return 'runner';
  return 'common';
}
export function unlockedEnemy(round:number):EnemyKind|undefined {
  return ENEMY_KINDS.find(kind=>kind!=='common'&&ENEMY_ARCHETYPES[kind].unlockRound===round);
}
