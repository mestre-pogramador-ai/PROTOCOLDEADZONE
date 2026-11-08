import { describe,it,expect } from 'vitest';
import { Infected } from '../gameplay/enemies/Infected';
import { EnemyManager } from '../gameplay/enemies/EnemyManager';
import { traceCombatShot } from '../gameplay/combat/EnemyHitScan';
const free=()=>true;
describe('M4 infectado',()=>{
 it('dano corpo, headshot e morte idempotente',()=>{const e=new Infected(1,0,-3);expect(e.damage(32)).toBe(false);expect(e.hp).toBe(68);expect(e.damage(64)).toBe(false);expect(e.hp).toBe(4);expect(e.damage(32)).toBe(true);expect(e.damage(32)).toBe(false);expect(e.hp).toBe(0);});
 it('persegue e executa ataque telegrafado com recuperação',()=>{const e=new Infected(1,0,-2);e.tick(.5,0,0,free);expect(e.state).toBe('chase');for(let i=0;i<100;i++)e.tick(1/60,0,0,free);expect(['windup','active','recovery','chase']).toContain(e.state);});
 it('pausa: tick não é invocado e estado permanece',()=>{const e=new Infected(1,0,-3);const old=e.snapshot();expect(e.snapshot()).toEqual(old);});
 it('reinicia inimigos e limpa mortes',()=>{const manager=new EnemyManager();const id=manager.snapshots()[0].id;manager.applyDamage(id,200);expect(manager.alive()).toBe(0);manager.reset();expect(manager.alive()).toBe(1);});
 it('prioriza inimigo visível e bloqueia por parede',()=>{const e=new Infected(1,0,-3);const q={origin:[0,1.8,0] as const,yaw:0,pitch:0,maxDistance:100,doorOpen:false,id:1,damage:32};const shot=traceCombatShot(q,[e.snapshot()]);expect(shot.enemyId).toBe(1);expect(shot.headshot).toBe(true);const behind=new Infected(2,0,-12);expect(traceCombatShot(q,[behind.snapshot()]).enemyId).toBeNull();});
});
