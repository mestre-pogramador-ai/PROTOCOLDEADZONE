import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AUDIO_FILES,musicState,musicLevel} from '../presentation/audio/AudioCatalog';
import {DEFAULT_SETTINGS,normalizeSettings,readSettings,saveSettings} from '../infrastructure/persistence/Settings';
import {AudioDirector} from '../presentation/audio/AudioDirector';
import {EventBus,type AppEvents} from '../core/events/EventBus';
describe('M8.1.4A local audio delivery',()=>{
 it('includes every sample with verified bytes, PCM header, hash, source and license',()=>{
  const entries=JSON.parse(fs.readFileSync('public/assets/audio/manifest.json','utf8'));
  expect(entries).toHaveLength(AUDIO_FILES.length);
  for(const name of AUDIO_FILES){const data=fs.readFileSync(`public/assets/audio/${name}.wav`);const e=entries.find((e:{file:string})=>e.file===name+'.wav');expect(data.toString('ascii',0,4)).toBe('RIFF');expect(e.bytes).toBe(data.length);expect(e.sha256).toBe(crypto.createHash('sha256').update(data).digest('hex'));expect(e.source).toBeTruthy();expect(['CC0-1.0','CC-BY-3.0']).toContain(e.license);}
 });
 it('chooses threat music with critical health priority and quiet preparation',()=>{
  expect(musicState(100,'preparation',1)).toBe('preparation');expect(musicState(20,'active',1)).toBe('critical');expect(musicState(100,'active',3)).toBe('combat');expect(musicState(100,'active',12)).toBe('suspense');expect(musicState(100,'active',30)).toBe('preparation');
 });
 it('allows silence in exploration but keeps critical/combat cues audible',()=>{expect(musicLevel('preparation',65,.3)).toBe(0);expect(musicLevel('suspense',65,.3)).toBe(0);expect(musicLevel('combat',65,.3)).toBe(.3);expect(musicLevel('critical',65,.3)).toBe(.3);});
 it('migrates old settings and persists independent music volume',()=>{
  expect(normalizeSettings({musicVolume:NaN}).musicVolume).toBe(.3);expect(normalizeSettings({musicVolume:2}).musicVolume).toBe(1);
  let value='';const store={getItem:()=>value,setItem:(_k:string,v:string)=>{value=v;}};saveSettings(store,{...DEFAULT_SETTINGS,musicVolume:.12});expect(readSettings(store).musicVolume).toBe(.12);
 });
 it('does not autoplay, tolerates events before unlock and releases subscriptions idempotently',()=>{
  const bus=new EventBus<AppEvents>();const d=new AudioDirector(bus,DEFAULT_SETTINGS);expect(d.snapshot().context).toBe('locked');bus.emit('session:started',{sessionId:1});bus.emit('combat:shot',{hit:false,headshot:false});d.dispose();d.dispose();expect(bus.listenerCount()).toBe(0);expect(d.snapshot().voices).toBe(0);
 });
});
