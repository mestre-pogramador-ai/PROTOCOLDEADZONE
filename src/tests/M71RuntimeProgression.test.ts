import {expect,it,vi} from 'vitest';
import {Runtime} from '../app/Runtime';
import * as spawns from '../gameplay/rounds/SpawnDirector';
import type {Action} from '../core/input/InputManager';
/** Scripted shooting lane: only spawn placement and AI motion/attacks are replaced.
 * Runtime's input, clock, Rapier player, shots/hitscan, damage, ammo, purchases,
 * economy, rewards, metrics and ten-wave composition are real production code.
 */
it('finishes ten waves through Runtime with 80% body hits, paid ammo and real reloads',async()=>{
 vi.stubGlobal('window',{addEventListener:()=>{},removeEventListener:()=>{}});
 const r=await Runtime.create();
 const rows:object[]=[];
 try{
  r.start();r.setPointerLocked(true);
  vi.spyOn(r.enemies,'tick').mockReturnValue([]);
  vi.spyOn(spawns,'chooseSpawn').mockImplementation(()=>r.enemies.alive()?null:[-1,-4]);
  const input=vi.spyOn(r.input,'snapshot');
  for(let tick=0;tick<180000&&r.getRoundState().completed<10;tick++){
   const pressed=new Set<Action>();
   const state=r.getWeaponState();
   if(r.getRoundState().phase==='preparation'&&tick>100)pressed.add('beginRound');
   if(state.reserve<=15)pressed.add('interact');
   if(state.ammo===0&&state.reserve>0)pressed.add('reload');
   if(r.enemies.alive())pressed.add('fire');
   const miss=(state.shotsFired+1)%5===0;
   const look=r.getLook();
   const originY=r.getSnapshot().current.position[1]+.65;
   r.look((look.yaw-(miss?Math.PI/2:0))/.0022,(look.pitch-Math.atan2(1.08-originY,4))/.0022);
   input.mockReturnValue({moveX:0,moveY:0,held:new Set(),pressed});
   const before=r.getRoundState().completed;
   r.frame(1/60);
   const credits=r.getEconomyState();
   expect(credits.credits).toBe(500+credits.lifetimeEarned-credits.lifetimeSpent);
   if(r.getRoundState().completed>before)rows.push({round:r.getRoundState().completed,
    shots:r.getWeaponState().shotsFired,credits:credits.credits,spent:credits.lifetimeSpent});
  }
  expect(r.getRoundState()).toMatchObject({round:11,completed:10});
  expect(r.getResults()).toMatchObject({kills:187,shots:1271,hits:1017,completedRounds:10});
  expect(r.getResults().accuracy).toBe(80);
  expect(r.getEconomyState().lifetimeSpent).toBeGreaterThan(0);
  expect(r.getCombatState().health).toBe(100);
  console.info('M71_RUNTIME',JSON.stringify({results:r.getResults(),rows}));
 }finally{r.dispose();vi.restoreAllMocks();vi.unstubAllGlobals();}
},20000);
