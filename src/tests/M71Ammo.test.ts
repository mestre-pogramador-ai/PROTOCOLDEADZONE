import {describe,expect,it,vi} from 'vitest';
import {M9,M9Controller} from '../gameplay/weapons/M9';
import {EconomyManager} from '../gameplay/economy/EconomyManager';
import {AmmoSupply,AMMO_SUPPLY} from '../gameplay/economy/AmmoSupply';
import {Runtime} from '../app/Runtime';
const idle={fire:false,ads:false,reload:false};
function fixture(){const weapon=new M9Controller(),economy=new EconomyManager();return {weapon,economy,supply:new AmmoSupply(weapon,economy)};}
function consumeAll(w:M9Controller){
 for(let i=0;i<3000&&(w.snapshot().ammo+w.snapshot().reserve)>0;i++)
  w.tick(1/60,{fire:true,ads:false,reload:w.snapshot().ammo===0});
}
describe('M7.1 atomic ammo supply',()=>{
 it('does not debit a full reserve and respects the cap',()=>{
  const {supply,economy,weapon}=fixture();
  expect(supply.buy(1).status).toBe('full');expect(economy.balance).toBe(500);
  weapon.tick(1/60,{...idle,fire:true});weapon.tick(1/60,{...idle,reload:true});
  for(let i=0;i<90;i++)weapon.tick(1/60,idle);
  expect(weapon.snapshot().reserve).toBe(89);
  expect(supply.buy(2)).toEqual({status:'paid',quantity:1,cost:6});
  expect(weapon.snapshot().reserve).toBe(M9.maxReserve);expect(economy.balance).toBe(494);
  expect(economy.snapshot().lastNotice?.reason).toBe('ammo');
 });
 it('delivers once per request, even after more ammo is spent',()=>{
  const {supply,economy,weapon}=fixture();consumeAll(weapon);
  expect(supply.buy(12)).toMatchObject({status:'paid',quantity:30,cost:180});
  const balance=economy.balance;
  consumeAll(weapon);supply.tick(30);
  expect(supply.buy(12).status).toBe('duplicate');
  expect(weapon.snapshot().reserve).toBe(0);expect(economy.balance).toBe(balance);
  expect(supply.buy(13).status).toBe('paid');
  expect(supply.buy(14).status).toBe('cooldown');
 });
 it('rejects invalid requests and insufficient funds while ammunition remains',()=>{
  const {supply,economy,weapon}=fixture();
  expect(supply.buy(NaN).status).toBe('invalid');
  economy.buy('test-expense',500);consumeAll(weapon);
  weapon.addReserve(1);
  expect(supply.buy(1).status).toBe('insufficient');
  expect(economy.balance).toBe(0);expect(weapon.snapshot().reserve).toBe(1);
 });
 it('provides bounded emergency ammo only when empty and poor, using simulation time',()=>{
  const {supply,economy,weapon}=fixture();economy.buy('test-expense',500);consumeAll(weapon);
  expect(supply.buy(1)).toEqual({status:'emergency',quantity:15,cost:0});
  expect(supply.buy(1).status).toBe('duplicate');
  consumeAll(weapon);
  expect(supply.buy(2).status).toBe('cooldown');
  supply.tick(29);expect(supply.buy(2).status).toBe('cooldown');
  supply.tick(1);expect(supply.buy(2).status).toBe('emergency');
  expect(economy.snapshot()).toMatchObject({credits:0,lifetimeEarned:0,lifetimeSpent:500});
 });
 it('purchases during reload cannot create ammunition or overflow capacity',()=>{
  const {supply,weapon}=fixture();consumeAll(weapon);supply.buy(1);
  weapon.tick(1/60,{...idle,reload:true});supply.tick(.3);
  supply.buy(2);
  for(let i=0;i<90;i++)weapon.tick(1/60,idle);
  expect(weapon.snapshot()).toMatchObject({ammo:15,reserve:45,reloading:false});
 });
 it('allows preparation purchases, blocks pause interaction and resets all resources',async()=>{
  vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
  const r=await Runtime.create();
  try{
   r.start();consumeAll(r.weapon);
   expect(r.getRoundState().phase).toBe('preparation');
   expect(r.getInteraction()?.kind).toBe('ammo');
   expect(r.interact()).toBe(true);
   expect(r.getEconomyState().credits).toBe(320);
   expect(r.getWeaponState().reserve).toBe(30);
   r.pause();const balance=r.getEconomyState().credits;
   r.frame(60);expect(r.interact()).toBe(false);expect(r.getEconomyState().credits).toBe(balance);
   r.reset();
   expect(r.getEconomyState()).toMatchObject({credits:500,lifetimeSpent:0,lifetimeEarned:0});
   expect(r.getWeaponState()).toMatchObject({ammo:15,reserve:90});
   expect(r.ammoSupply.snapshot().emergencyRemaining).toBe(0);
  }finally{r.dispose();vi.unstubAllGlobals();}
 });
 it('does not let emergency cooldown advance while Runtime is paused',async()=>{
  vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
  const r=await Runtime.create();
  try{
   r.start();r.economy.buy('test-expense',500);consumeAll(r.weapon);
   expect(r.interact()).toBe(true);expect(r.ammoSupply.snapshot().emergencyRemaining).toBe(30);
   r.pause();r.frame(60);expect(r.ammoSupply.snapshot().emergencyRemaining).toBe(30);
   r.resume();r.frame(1/60);expect(r.ammoSupply.snapshot().emergencyRemaining).toBeLessThan(30);
  }finally{r.dispose();vi.unstubAllGlobals();}
 });
 it('an independent supply cannot replay an existing paid economy receipt',()=>{
  const {supply,economy,weapon}=fixture();consumeAll(weapon);supply.buy(1);consumeAll(weapon);
  const replay=new AmmoSupply(weapon,economy);
  expect(replay.buy(1).status).toBe('duplicate');expect(weapon.snapshot().reserve).toBe(0);
  expect(economy.snapshot().lifetimeSpent).toBe(180);
 });
 it('prices each bullet below a paid hit without changing M9 damage or rewards',()=>{
  expect(AMMO_SUPPLY.price).toBe(AMMO_SUPPLY.pack*AMMO_SUPPLY.unitPrice);
  expect(AMMO_SUPPLY.unitPrice).toBeLessThan(10);
  expect(M9).toMatchObject({damage:32,headshotMultiplier:2,magazineSize:15,reserveOnSpawn:90,reloadSeconds:1.5,rpm:360});
 });
});
