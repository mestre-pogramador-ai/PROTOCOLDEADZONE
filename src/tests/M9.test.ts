import { describe, expect, it } from 'vitest';
import { M9, M9Controller } from '../gameplay/weapons/M9';
import { traceContainmentShot } from '../gameplay/weapons/HitScan';
const idle={fire:false,ads:false,reload:false};
function step(w:M9Controller,n:number,intent=idle){for(let i=0;i<n;i++)w.tick(1/60,intent);}
describe('M9 authoritative combat',()=>{
  it('starts with 15/90 and correct baseline',()=>{const w=new M9Controller();expect(w.snapshot().ammo).toBe(15);expect(w.snapshot().reserve).toBe(90);expect(M9.damage).toBe(32);expect(M9.rpm).toBe(360);});
  it('fires no faster than 360 rpm and spends one bullet per shot',()=>{const w=new M9Controller();step(w,60,{...idle,fire:true});expect(w.snapshot().shotsFired).toBe(6);expect(w.snapshot().ammo).toBe(9);});
  it('reloads only after 1.5 seconds and never creates ammunition',()=>{const w=new M9Controller();w.tick(1/60,{...idle,fire:true});w.takeShot();w.tick(1/60,{...idle,reload:true});expect(w.snapshot().reloading).toBe(true);step(w,89);expect(w.snapshot().ammo).toBe(14);step(w,1);expect(w.snapshot().ammo).toBe(15);expect(w.snapshot().reserve).toBe(89);});
  it('does not fire during reload',()=>{const w=new M9Controller();w.tick(1/60,{...idle,fire:true});w.takeShot();w.tick(1/60,{...idle,reload:true});step(w,50,{...idle,fire:true});expect(w.snapshot().shotsFired).toBe(1);});
  it('does not reload when full or out of reserve',()=>{const w=new M9Controller();w.tick(1/60,{...idle,reload:true});expect(w.snapshot().reloading).toBe(false);});
  it('consumes pending shot only once and resets',()=>{const w=new M9Controller();w.tick(1/60,{...idle,fire:true});expect(w.takeShot()?.id).toBe(1);expect(w.takeShot()).toBeNull();w.reset();expect(w.snapshot().shotsFired).toBe(0);});
  it('ADS interpolates with fixed time',()=>{const w=new M9Controller();step(w,9,{...idle,ads:true});expect(w.snapshot().adsBlend).toBeCloseTo(1);step(w,9);expect(w.snapshot().adsBlend).toBeCloseTo(0);});
});
describe('Containment hitscan',()=>{
  it('hits the cabinet before the west wall when it obstructs the shot',()=>{
    const trace=traceContainmentShot({origin:[0,1.7,0],yaw:Math.PI/2,pitch:0,maxDistance:80,doorOpen:false,id:1,damage:32});
    expect(trace.hit).toBe(true);
    expect(trace.surfaceId).toBe('power-cabinet');
  });
  it('hits the west wall along an unobstructed path',()=>{const trace=traceContainmentShot({origin:[0,1.7,2],yaw:Math.PI/2,pitch:0,maxDistance:80,doorOpen:false,id:1,damage:32});expect(trace.hit).toBe(true);expect(trace.surfaceId).toBe('west-wall');});
  it('closed door blocks shots but open door does not',()=>{const q={origin:[6,1.7,0] as const,yaw:-Math.PI/2,pitch:0,maxDistance:80,id:1,damage:32};expect(traceContainmentShot({...q,doorOpen:false}).surfaceId).toBe('door-containment-security');expect(traceContainmentShot({...q,doorOpen:true}).surfaceId).not.toBe('door-containment-security');});
});
