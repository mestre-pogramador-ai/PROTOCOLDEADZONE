import { describe, expect, it } from 'vitest';
import { RoundDirector, difficultyForRound, preparationSeconds } from '../gameplay/rounds/RoundDirector';
import { ECONOMY, EconomyManager } from '../gameplay/economy/EconomyManager';
import { chooseSpawn } from '../gameplay/rounds/SpawnDirector';
import { enemyCanOccupy } from '../gameplay/enemies/Navigation';
import { EnemyManager } from '../gameplay/enemies/EnemyManager';

describe('M5 — escalonamento e rodadas',()=>{
 it('respeita os budgets e marcos de saúde/concorrência',()=>{
  for (const [round,total,cap,hp] of [[1,8,6,100],[5,17,10,135],[10,30,16,190],[20,59,28,310],[30,90,36,400]]) {
   const d=difficultyForRound(round);
   expect(d.total).toBe(total);expect(d.maxConcurrent).toBe(cap);expect(d.infectedHp).toBe(hp);
  }
  expect(preparationSeconds(1)).toBe(30);expect(preparationSeconds(6)).toBe(25);
  expect(preparationSeconds(10)).toBe(22);expect(preparationSeconds(17)).toBe(20);
  expect(preparationSeconds(25)).toBe(18);
  expect(()=>difficultyForRound(0)).toThrow();
 });
 it('aguarda preparação, permite T cedo, nunca supera o cap e não consome falhas',()=>{
  const rounds=new RoundDirector();let alive=0;
  expect(rounds.snapshot().phase).toBe('preparation');
  rounds.tick(10,()=>alive,()=>{throw Error('spawn não deve ocorrer na preparação');});
  expect(rounds.snapshot().prepRemaining).toBe(20);
  expect(rounds.beginNow()).toBe(true);expect(rounds.beginNow()).toBe(false);
  rounds.tick(.1,()=>alive,()=>false);
  expect(rounds.snapshot().spawned).toBe(0);
  for(let i=0;i<1000;i++)rounds.tick(1/60,()=>alive,()=>{alive++;return true;});
  expect(rounds.snapshot().spawned).toBe(6);
  expect(rounds.snapshot().remainingToSpawn).toBe(2);
  expect(rounds.snapshot().alive).toBe(6);
  alive-=2;rounds.recordKill();rounds.recordKill();
  for(let i=0;i<180;i++)rounds.tick(1/60,()=>alive,()=>{alive++;return true;});
  expect(rounds.snapshot().spawned).toBe(8);
  expect(rounds.snapshot().alive).toBe(6);
  alive=0;
  const event=rounds.tick(1/60,()=>alive,()=>false);
  expect(event.completedRound).toBe(1);
  expect(rounds.snapshot().round).toBe(2);
  expect(rounds.snapshot().phase).toBe('preparation');
  expect(rounds.snapshot().completed).toBe(1);
  expect(rounds.tick(1/60,()=>0,()=>true).completedRound).toBeNull();
 });
 it('fica congelado sem ticks e reset limpa todos os contadores',()=>{
  const r=new RoundDirector();const a=r.snapshot();expect(r.snapshot()).toEqual(a);
  r.beginNow();let alive=0;r.tick(1,()=>alive,()=>{alive++;return true;});
  r.reset();expect(r.snapshot()).toEqual(a);
 });
});

describe('M5 — economia transacional',()=>{
 it('ganha hit limitado, kill não duplica, headshot substitui bônus',()=>{
  const e=new EconomyManager();expect(e.balance).toBe(500);
  expect(e.awardHit(1,11)).toBe(10);expect(e.awardHit(1,11)).toBe(0);
  for(let id=12;id<22;id++)e.awardHit(1,id);
  expect(e.balance).toBe(550);
  expect(e.awardKill(1,true)).toBe(90);expect(e.awardKill(1,false)).toBe(0);
  expect(e.awardKill(2,false)).toBe(60);
  expect(e.balance).toBe(700);
  expect(e.awardRound(1)).toBe(60);expect(e.awardRound(1)).toBe(0);
  expect(e.snapshot().lifetimeEarned).toBe(260);
 });
 it('compra atômica, não cobra duas vezes, reset remove compra',()=>{
  const e=new EconomyManager();
  expect(e.buy('door-containment-security',750)).toBe(false);
  e.awardRound(1);e.awardRound(2);e.awardRound(3);e.awardRound(4);
  expect(e.balance).toBe(800);
  expect(e.buy('door-containment-security',ECONOMY.containmentDoorPrice)).toBe(true);
  expect(e.balance).toBe(50);
  expect(e.buy('door-containment-security',ECONOMY.containmentDoorPrice)).toBe(true);
  expect(e.balance).toBe(50);
  expect(e.snapshot().doorPurchased).toBe(true);
  expect(e.buy('other',-1)).toBe(false);
  e.reset();expect(e.balance).toBe(500);expect(e.snapshot().doorPurchased).toBe(false);
 });
});

describe('M5 — spawn e instâncias',()=>{
 it('seleciona ponto alcançável e não nasce ao lado do jogador',()=>{
  const spawn=chooseSpawn({x:-1,z:0,doorOpen:false,sequence:1,enemies:[]});
  expect(spawn).not.toBeNull();
  if(!spawn)return;
  expect(enemyCanOccupy(spawn[0],spawn[1],false)).toBe(true);
  expect(Math.hypot(spawn[0]+1,spawn[1])).toBeGreaterThanOrEqual(6.5);
 });
 it('mantém IDs únicos entre ondas, recicla mortos e preserva API legada',()=>{
  const m=new EnemyManager();m.clear();const id=m.spawn(-6,-6,135);
  expect(m.snapshots()[0].maxHp).toBe(135);
  expect(m.applyDamage(id,135)).toBe(true);
  m.tick(2.6,0,0,false);
  expect(m.snapshots().length).toBe(0);
  expect(m.spawn(6,6)).toBeGreaterThan(id);
  m.setCount(3);expect(m.alive()).toBe(3);m.reset();expect(m.alive()).toBe(3);
 });
});
