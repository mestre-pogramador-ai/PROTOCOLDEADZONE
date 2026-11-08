import {describe,it,expect} from 'vitest';
import {Infected} from '../gameplay/enemies/Infected';
import {canOccupyWithSeparation,resolveEnemySeparation} from '../gameplay/enemies/Separation';
import {PlayerDamage} from '../gameplay/combat/PlayerDamage';
import {EnemyManager} from '../gameplay/enemies/EnemyManager';
describe('M4.2 combat and separation',()=>{
 it('rejects overlapping movement but ignores dead enemies',()=>{const a=new Infected(1,0,0),b=new Infected(2,1,0);expect(canOccupyWithSeparation(.4,0,2,[a,b])).toBe(false);a.damage(200);expect(canOccupyWithSeparation(.4,0,2,[a,b])).toBe(true);});
 it('separates six overlapped enemies without entering blocked geometry',()=>{const enemies=Array.from({length:6},(_,i)=>new Infected(i+1,0,0));resolveEnemySeparation(enemies,(x,z)=>Math.abs(x)<2&&Math.abs(z)<2);for(const e of enemies)expect(Math.abs(e.x)).toBeLessThan(2);expect(new Set(enemies.map(e=>`${e.x.toFixed(4)},${e.z.toFixed(4)}`)).size).toBeGreaterThan(1);});
 it('does not apply repeated player damage during immunity',()=>{const d=new PlayerDamage();expect(d.apply(18,{x:1,z:2})).toBe(true);expect(d.apply(18,{x:1,z:2})).toBe(false);expect(d.health).toBe(82);expect(d.events).toBe(1);expect(d.lastSource).toEqual({x:1,z:2});d.tick(.66);expect(d.apply(18)).toBe(true);d.reset();expect(d.health).toBe(100);expect(d.events).toBe(0);});
 it('maintains the six enemy selection after reset',()=>{const m=new EnemyManager();m.setCount(6);expect(m.alive()).toBe(6);m.reset();expect(m.alive()).toBe(6);});
 it('each attack windup can only deal one hit',()=>{const e=new Infected(1,0,0),canMove=()=>true;e.tick(1/60,0,1,canMove);let hits=0;for(let i=0;i<45;i++){if(e.tick(1/60,0,1,canMove))hits++;}expect(hits).toBe(1);});
});
