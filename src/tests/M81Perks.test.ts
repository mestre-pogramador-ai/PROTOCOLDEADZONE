import {beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {PerkRegistry,perkRegistry,PERK_DEFINITIONS,RESERVED_PERKS} from '../gameplay/perks/PerkRegistry';
import {PerkManager} from '../gameplay/perks/PerkManager';
import {PerkEffectResolver} from '../gameplay/perks/PerkEffectResolver';
import {EconomyManager} from '../gameplay/economy/EconomyManager';
import {PlayerDamage} from '../gameplay/combat/PlayerDamage';
import {M9Controller} from '../gameplay/weapons/M9';
import {PhysicsWorld} from '../physics/PhysicsWorld';
import {Runtime} from '../app/Runtime';
import {enemyCanOccupy} from '../gameplay/enemies/Navigation';
import {PERK_MACHINES} from '../world/maps/containment';
import {WAVE_SPAWNS} from '../gameplay/rounds/SpawnDirector';
import type {InputSnapshot} from '../core/input/InputManager';
const dt=1/60;
const idle:InputSnapshot={held:new Set(),pressed:new Set(),moveX:0,moveY:0};
function funded(){const economy=new EconomyManager();for(let r=1;r<=50;r++)economy.awardRound(r);return economy;}
describe('M8.1 perk acquisition',()=>{
 for(const definition of PERK_DEFINITIONS)it('acquires '+definition.id+' once at its exact price',()=>{
  const economy=funded(),manager=new PerkManager(economy);const before=economy.balance;
  expect(manager.buy(definition.id)).toBe('acquired');expect(economy.balance).toBe(before-definition.price);
  expect(manager.buy(definition.id)).toBe('owned');expect(economy.balance).toBe(before-definition.price);
  expect(manager.snapshot()).toHaveLength(1);
 });
 it('does not charge or activate on insufficient credit or unknown/reserved IDs',()=>{
  const e=new EconomyManager(),m=new PerkManager(e);
  expect(m.buy('vitality')).toBe('insufficient');
  for(const id of RESERVED_PERKS)expect(m.buy(id)).toBe('unavailable');
  expect(m.snapshot()).toEqual([]);expect(e.balance).toBe(500);
 });
 it('enforces four slots with an extension definition without enabling future mechanics',()=>{
  const registry=new PerkRegistry([...PERK_DEFINITIONS,{id:'fixture-fifth',name:'Fixture',price:1,icon:'?',color:'#fff',description:'test only',modifiers:{}}]);
  const e=funded(),m=new PerkManager(e,registry);
  for(const p of PERK_DEFINITIONS)expect(m.buy(p.id)).toBe('acquired');
  const balance=e.balance;expect(m.buy('fixture-fifth')).toBe('limit');
  expect(m.snapshot()).toHaveLength(4);expect(e.balance).toBe(balance);
  expect(m.buy('vitality')).toBe('owned');
 });
 it('clears on death, disables buying and resets with the economy',()=>{
  const e=funded(),m=new PerkManager(e);m.buy('impulse');
  m.clearOnDeath();expect(m.effects().speedMultiplier).toBe(1);expect(m.buy('vitality')).toBe('inactive');
  e.reset();m.reset();expect(m.snapshot()).toEqual([]);expect(e.balance).toBe(500);
 });
 it('resolves identical ownership without compounding effects',()=>{
  const p=perkRegistry.get('impulse')!;
  expect(PerkEffectResolver.resolve([p,p]).speedMultiplier).toBe(1.12);
 });
 it('rejects duplicate definitions and nonfinite modifiers',()=>{
  expect(()=>new PerkRegistry([PERK_DEFINITIONS[0],PERK_DEFINITIONS[0]])).toThrow();
  expect(()=>new PerkRegistry([{...PERK_DEFINITIONS[0],modifiers:{speedMultiplier:NaN}}])).toThrow();
 });
});
describe('M8.1 effect application',()=>{
 it('Vitality preserves missing HP, does not stack healing, and cannot resurrect',()=>{
  const damage=new PlayerDamage();damage.apply(40);
  damage.configure(150,1,true);expect(damage.health).toBe(110);expect(damage.maxHealth).toBe(150);
  damage.configure(150,1,true);expect(damage.health).toBe(110);
  damage.tick(1);damage.apply(500);damage.configure(150,1,true);expect(damage.health).toBe(0);
  damage.reset();expect(damage.health).toBe(100);expect(damage.maxHealth).toBe(100);
 });
 it('reactive armor preserves immunity and applies exact 15% reduction',()=>{
  const d=new PlayerDamage();d.configure(150,.85,true);
  expect(d.apply(18)).toBe(true);expect(d.health).toBe(134.7);
  expect(d.apply(18)).toBe(false);d.tick(.65);d.apply(28);expect(d.health).toBe(110.9);
  d.reset();d.apply(18);expect(d.health).toBe(82);
 });
 it('quick hands applies to the next reload and keeps an active duration latched',()=>{
  const w=new M9Controller();
  w.tick(dt,{fire:true,ads:false,reload:false});w.tick(dt,{fire:false,ads:false,reload:true});
  const before=w.snapshot();w.configureReloadMultiplier(.75);
  expect(w.snapshot().reloadRemaining).toBe(before.reloadRemaining);expect(w.snapshot().reloadDuration).toBe(1.5);
  w.tick(1.5,{fire:false,ads:false,reload:false});
  w.tick(1,{fire:true,ads:false,reload:false});w.tick(dt,{fire:false,ads:false,reload:true});
  expect(w.snapshot().reloadDuration).toBe(1.125);
  w.tick(1.125,{fire:false,ads:false,reload:false});expect(w.snapshot().ammo).toBe(15);
  w.reset();w.tick(dt,{fire:true,ads:false,reload:false});w.tick(dt,{fire:false,ads:false,reload:true});
  expect(w.snapshot().reloadDuration).toBe(1.5);
 });
});
describe('M8.1 Rapier and placement',()=>{
 beforeAll(async()=>{await RAPIER.init();});
 it('boosts grounded movement by 12%',()=>{
  const a=new PhysicsWorld(),b=new PhysicsWorld();
  try{
   for(let i=0;i<100;i++){a.step(dt,idle,0);b.step(dt,idle,0);}
   const startA=a.snapshot().current.position[2],startB=b.snapshot().current.position[2];
   for(let i=0;i<30;i++){a.step(dt,{...idle,moveY:1},0);b.step(dt,{...idle,moveY:1},0,1.12);}
   expect(b.movementDiagnostics().requestedHorizontalMeters/a.movementDiagnostics().requestedHorizontalMeters).toBeCloseTo(1.12,8);
   // KCC ground-contact corrections alter authoritative displacement by millimeters.
   expect(Math.abs((b.snapshot().current.position[2]-startB)/(a.snapshot().current.position[2]-startA)-1.12)).toBeLessThan(.002);

  }finally{a.dispose();b.dispose();}
 });
 it('preserves the identical jump trajectory at the same physical position',()=>{
  const a=new PhysicsWorld(),b=new PhysicsWorld();
  try{
   for(let i=0;i<100;i++){a.step(dt,idle,0);b.step(dt,idle,0,1.12);}
   for(let i=0;i<100;i++){
    const input=i===0?{...idle,pressed:new Set(['jump'] as const)}:idle;
    a.step(dt,input,0);b.step(dt,input,0,1.12);
    expect(b.snapshot().current.position[1]).toBeCloseTo(a.snapshot().current.position[1],8);
    expect(b.movementDiagnostics().verticalVelocity).toBe(a.movementDiagnostics().verticalVelocity);
   }
  }finally{a.dispose();b.dispose();}
 });
 it('boosted sprint still stops and slides at walls without backward displacement',()=>{
  const w=new PhysicsWorld();
  try{
   for(let i=0;i<100;i++)w.step(dt,idle,0);
   for(let i=0;i<600;i++){
    const before=w.snapshot().current.position;
    w.step(dt,{...idle,held:new Set(['sprint']),moveX:1,moveY:-1},0,1.12);
    const after=w.snapshot().current.position;
    expect(after[2]).toBeGreaterThan(-7.6);expect(after[0]).toBeLessThan(7.6);
    expect(after[0]-before[0]-(after[2]-before[2])).toBeGreaterThan(-.005);
   }
  }finally{w.dispose();}
 });
 it('keeps original wave spawn points and machine approaches navigable',()=>{
  for(const [x,z] of WAVE_SPAWNS)expect(enemyCanOccupy(x,z,false)).toBe(true);
  for(const m of PERK_MACHINES){
   expect(enemyCanOccupy(m.position[0],m.position[2]-1.4,false)).toBe(true);
   expect(enemyCanOccupy(m.position[0],m.position[2],false)).toBe(false);
  }
 });
});
it('Runtime removes perks on death and restores baseline on restart',async()=>{
 vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
 const r=await Runtime.create();
 try{
  r.start();for(let round=1;round<=50;round++)r.economy.awardRound(round);
  for(const p of PERK_DEFINITIONS)r.perks.buy(p.id);
  expect(r.getCombatState()).toMatchObject({health:150,maxHealth:150});
  r.pause();const before=r.getEconomyState();expect(r.interact()).toBe(false);r.frame(100);
  expect(r.getEconomyState()).toEqual(before);expect(r.perks.snapshot()).toHaveLength(4);
  r.resume();const id=r.enemies.spawn(2,-2);
  vi.spyOn(r.enemies,'tick').mockReturnValue([{id,damage:200}]);r.frame(dt);
  expect(r.getCombatState()).toMatchObject({health:0,maxHealth:100,gameOver:true});
  expect(r.perks.snapshot()).toEqual([]);
  r.reset();expect(r.getCombatState()).toMatchObject({health:100,maxHealth:100,gameOver:false});
  expect(r.perks.effects()).toMatchObject({reloadMultiplier:1,speedMultiplier:1,damageMultiplier:1});
  expect(r.getEconomyState().credits).toBe(500);expect(r.getWeaponState()).toMatchObject({ammo:15,reserve:90});
 }finally{r.dispose();vi.restoreAllMocks();vi.unstubAllGlobals();}
});
