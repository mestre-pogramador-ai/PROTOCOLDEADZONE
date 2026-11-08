import {describe,it,expect} from 'vitest';
import {Infected,INFECTED} from '../gameplay/enemies/Infected';
import {EnemyManager} from '../gameplay/enemies/EnemyManager';
import {enemyCanOccupy,findEnemyPath,hasEnemyLineOfSight} from '../gameplay/enemies/Navigation';
import {PlayerDamage} from '../gameplay/combat/PlayerDamage';
const free=()=>true;
describe('M4.1 combat and AI polish',()=>{
 it('a single windup delivers no more than one hit',()=>{const e=new Infected(1,0,-1);let hits=0;for(let i=0;i<70;i++){const attack=e.tick(1/60,0,0,free);if(attack)hits++;}expect(hits).toBe(1);});
 it('attack cancels when victim moves outside range',()=>{const e=new Infected(1,0,-1);e.tick(1/60,0,0,free);let hits=0;for(let i=0;i<35;i++)if(e.tick(1/60,0,8,free))hits++;expect(hits).toBe(0);});
 it('a hurt enemy cannot apply its cancelled windup',()=>{const e=new Infected(1,0,-1);e.tick(1/60,0,0,free);e.damage(32);let hits=0;for(let i=0;i<30;i++)if(e.tick(1/60,0,0,free))hits++;expect(hits).toBe(0);});
 it('player damage has a real invulnerability window',()=>{const d=new PlayerDamage();expect(d.apply(18)).toBe(true);expect(d.apply(18)).toBe(false);expect(d.health).toBe(82);d.tick(.65);expect(d.apply(18)).toBe(true);expect(d.health).toBe(64);expect(d.events).toBe(2);});
 it('solid walls and closed doors block occupancy',()=>{expect(enemyCanOccupy(0,-8,false)).toBe(false);expect(enemyCanOccupy(8,0,false)).toBe(false);expect(enemyCanOccupy(8,0,true)).toBe(true);});
 it('navigation returns a route around the containment pod',()=>{const path=findEnemyPath(-6,-4,-2,-4,false);expect(path.length).toBeGreaterThan(0);for(const [x,z] of path)expect(enemyCanOccupy(x,z,false)).toBe(true);expect(hasEnemyLineOfSight(-6,-4,-2,-4,false)).toBe(false);});
 it('manager supports six enemies and clears them on reset',()=>{const manager=new EnemyManager();manager.setCount(6);expect(manager.alive()).toBe(6);for(const e of manager.snapshots())manager.applyDamage(e.id,INFECTED.maxHp);expect(manager.alive()).toBe(0);manager.reset();expect(manager.alive()).toBe(6);});
});
