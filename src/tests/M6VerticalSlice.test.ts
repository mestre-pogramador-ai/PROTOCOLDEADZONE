import {describe,it,expect} from 'vitest';
import {SessionMetrics,formatDuration} from '../gameplay/session/SessionMetrics';
import {readBest,storeBest,BEST_KEY,type StorageAdapter} from '../infrastructure/persistence/LocalBest';
import {readSettings,saveSettings,normalizeSettings,DEFAULT_SETTINGS,SETTINGS_KEY} from '../infrastructure/persistence/Settings';
import {GameClock} from '../core/clock/GameClock';
import {validateConfig,engineConfig} from '../app/config';
import {EventBus,type AppEvents} from '../core/events/EventBus';
import {AudioDirector} from '../presentation/audio/AudioDirector';

function store():StorageAdapter&{data:Map<string,string>}{
 const data=new Map<string,string>();return {data,getItem:(k)=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}};
}
const sample={kills:10,completedRounds:2,currentRound:3,earned:1100,spent:750,credits:850,doorPurchased:true};
describe('M6 — resultados e estatísticas da sessão',()=>{
 it('contabiliza apenas tiros confirmados e precisão sem dividir por zero',()=>{
  const s=new SessionMetrics();expect(s.snapshot(sample).accuracy).toBe(0);
  s.tick(20.7);s.recordShot(true,true);s.recordShot(false,false);s.recordShot(true,false);
  s.recordDamage(18);s.recordDamage(12);s.tick(3.4);
  const r=s.snapshot(sample);
  expect(r).toMatchObject({shots:3,hits:2,headshots:1,accuracy:66.7,elapsedSeconds:24,damageTaken:30,damageEvents:2,completedRounds:2,finalCredits:850,doorPurchased:true});
  expect(formatDuration(65)).toBe('01:05');expect(formatDuration(-2)).toBe('00:00');
 });
 it('descarta durações e danos inválidos; reinício limpa toda a métrica',()=>{
  const s=new SessionMetrics();s.tick(-3);s.tick(Infinity);s.recordDamage(NaN);s.recordShot(true,false);
  expect(s.snapshot(sample).elapsedSeconds).toBe(0);expect(s.snapshot(sample).damageEvents).toBe(0);
  s.reset();expect(s.snapshot(sample).shots).toBe(0);
 });
});
describe('M6 — persistência offline resiliente',()=>{
 it('salva melhor resultado e não substitui um recorde superior',()=>{
  const mem=store();const stats=new SessionMetrics();const low=stats.snapshot(sample);
  expect(readBest(mem)).toBeNull();expect(storeBest(mem,low)?.kills).toBe(10);
  expect(mem.data.has(BEST_KEY)).toBe(true);
  const worse={...low,kills:9};expect(storeBest(mem,worse)?.kills).toBe(10);
  const better={...low,completedRounds:3,kills:1};expect(storeBest(mem,better)?.completedRounds).toBe(3);
 });
 it('recupera dados corrompidos e indisponibilidade de storage sem travar',()=>{
  const mem=store();mem.data.set(BEST_KEY,'{invalid json');expect(readBest(mem)).toBeNull();
  expect(readBest(null)).toBeNull();expect(storeBest(null,new SessionMetrics().snapshot(sample))).not.toBeNull();
  const broken={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
  expect(readBest(broken)).toBeNull();expect(storeBest(broken,new SessionMetrics().snapshot(sample))).not.toBeNull();
 });
 it('normaliza valores de settings, respeita FOV e preserva defaults',()=>{
  const mem=store();
  expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  const settings=normalizeSettings({masterVolume:9,effectsVolume:-9,ambientVolume:NaN,fov:200,sensitivity:.1,muted:true,reducedMotion:true,showControls:false});
  expect(settings).toMatchObject({masterVolume:1,effectsVolume:0,ambientVolume:.2,fov:100,sensitivity:.3,muted:true,reducedMotion:true,showControls:false});
  saveSettings(mem,settings);expect(mem.data.has(SETTINGS_KEY)).toBe(true);expect(readSettings(mem)).toEqual(settings);
  mem.data.set(SETTINGS_KEY,'not json');expect(readSettings(mem)).toEqual(DEFAULT_SETTINGS);
 });
});
describe('M6 — loop central e áudio isolado',()=>{
 it('interrompe ticks imediatamente após pause dentro de um tick',()=>{
  const clock=new GameClock(validateConfig(engineConfig));clock.resume();let steps=0;
  const result=clock.frame(1/20,()=>{steps++;clock.pause();});
  expect(steps).toBe(1);expect(result.steps).toBe(1);
  clock.frame(1,()=>steps++);expect(steps).toBe(1);
  clock.resume();clock.frame(1/60,()=>steps++);expect(steps).toBe(2);
 });
 it('conecta e descarta ouvintes sem iniciar áudio automaticamente',()=>{
  const bus=new EventBus<AppEvents>();const before=bus.listenerCount();
  const audio=new AudioDirector(bus,DEFAULT_SETTINGS);
  expect(bus.listenerCount()).toBeGreaterThan(before);
  bus.emit('combat:shot',{hit:true,headshot:true}); // no AudioContext until user gesture
  audio.setSettings({...DEFAULT_SETTINGS,muted:true});
  audio.dispose();audio.dispose();expect(bus.listenerCount()).toBe(before);
 });
});
