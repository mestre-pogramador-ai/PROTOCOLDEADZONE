import {describe,expect,it} from 'vitest';
import {M9Controller,M9} from '../gameplay/weapons/M9';
import {EconomyManager} from '../gameplay/economy/EconomyManager';
import {AmmoSupply,AMMO_SUPPLY} from '../gameplay/economy/AmmoSupply';
import {EnemyManager} from '../gameplay/enemies/EnemyManager';
import {RoundDirector} from '../gameplay/rounds/RoundDirector';
import {resolveShot} from '../gameplay/combat/ResolveShot';
import {SessionMetrics} from '../gameplay/session/SessionMetrics';
const dt=1/60;
/** Controlled firing lane: aiming/spawn position and target motion are simulated.
 * All damage, bullets, reloads, rewards and payments use production systems.
 * No direct enemy damage/death calls, free ammunition or credits.
 */
describe('M7.1 finite-resource survival economy',()=>{
 for(const profile of [{name:'headshots',head:true,missEvery:0},{name:'body-80pct',head:false,missEvery:5},{name:'body-67pct',head:false,missEvery:3}]){
  it('completes R1–R10: '+profile.name,()=>{
   const w=new M9Controller(),economy=new EconomyManager(),supply=new AmmoSupply(w,economy);
   const enemies=new EnemyManager(),rounds=new RoundDirector(),metrics=new SessionMetrics();enemies.clear();
   let request=0,purchases=0,delivered=0,kills=0,misses=0,reloads=0,door=false;
   const evidence:object[]=[];
   for(let tick=0;tick<180000&&rounds.snapshot().completed<10;tick++){
    metrics.tick(dt);supply.tick(dt);
    if(rounds.snapshot().phase==='preparation')rounds.beginNow();
    if(!door&&economy.balance>=1000){expect(economy.buy('door-containment-security',750)).toBe(true);door=true;}
    if(w.snapshot().reserve<=15){
     const buy=supply.buy(++request);
     expect(buy.status).not.toBe('emergency');
     if(buy.status==='paid'){purchases++;delivered+=buy.quantity;}
    }
    const before=w.snapshot();
    const reload=before.ammo===0&&before.reserve>0&&!before.reloading;
    if(reload)reloads++;
    w.tick(dt,{fire:enemies.alive()>0,ads:profile.head,reload});
    const shot=w.takeShot();
    if(shot){
     const target=enemies.snapshots().find(e=>e.state!=='dead');
     expect(target).toBeDefined();
     const miss=profile.missEvery>0&&shot.id%profile.missEvery===0;
     if(miss)misses++;
     const {trace,hit,killed}=resolveShot({origin:[-1,1.525,0],
      yaw:miss?Math.PI/2:0,pitch:Math.atan2((profile.head?1.78:1.08)-1.525,4),
      maxDistance:shot.range,doorOpen:door,id:shot.id,damage:shot.damage},
      shot.headshotMultiplier,enemies,economy);
     expect(hit).toBe(!miss);
     metrics.recordShot(hit,trace.headshot);
     if(killed){kills++;rounds.recordKill();}
    }
    const result=rounds.tick(dt,()=>enemies.alive(),(hp,kind)=>{
     // One live target per lane; failed spawn attempts retain the ordinal/type.
     if(enemies.alive()>0)return false;
     enemies.spawn(-1,-4,hp,kind);return true;
    });
    if(result.completedRound!==null){
     economy.awardRound(result.completedRound);
     evidence.push({round:result.completedRound,shots:w.snapshot().shotsFired,balance:economy.balance,purchases,reloads});
    }
    const state=economy.snapshot();
    expect(state.credits).toBeGreaterThanOrEqual(0);
    expect(state.credits).toBe(500+state.lifetimeEarned-state.lifetimeSpent);
    expect(w.snapshot().reserve).toBeLessThanOrEqual(M9.maxReserve);

   }
   expect(rounds.snapshot()).toMatchObject({completed:10,round:11});
   expect(kills).toBe(187);expect(evidence).toHaveLength(10);expect(purchases).toBeGreaterThan(0);
   expect(door).toBe(true);expect(reloads).toBeGreaterThan(0);
   const state=w.snapshot(),credits=economy.snapshot();
   expect(state.shotsFired+state.ammo+state.reserve).toBe(105+delivered);
   expect(credits.lifetimeSpent).toBe(750+delivered*AMMO_SUPPLY.unitPrice);
   console.info('M71_PROGRESSION',JSON.stringify({profile:profile.name,kills,misses,shots:state.shotsFired,purchases,delivered,reloads,credits,evidence}));
  },20000);
 }
});
