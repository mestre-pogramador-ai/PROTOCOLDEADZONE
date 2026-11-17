import type {EventBus,AppEvents} from '../../core/events/EventBus';
import type {GameSettings} from '../../infrastructure/persistence/Settings';
import type {InfectedSnapshot} from '../../gameplay/enemies/Infected';
import type {WeaponState} from '../../gameplay/weapons/M9';
import {diagnostics} from '../../core/diagnostics/Diagnostics';
import {AUDIO_FILES,audioUrl,musicState,musicLevel,VOICE_LIMIT,ENEMY_VOICE_LIMIT,type Sound,type MusicState} from './AudioCatalog';
type Position=readonly [number,number,number];
type Group='effects'|'enemy'|'music'|'ambient';
interface Voice {source:AudioBufferSourceNode;gain:GainNode;panner?:PannerNode;group:Group;owner?:number;retiring?:boolean;name:Sound}
interface Observed {state:string;phase:number;next:number}
export interface AudioFrame {position:Position;yaw:number;pitch?:number;health:number;phase:string;enemies:readonly InfectedSnapshot[];weapon:WeaponState}
/** Presentation-only sample mixer. No clock, damage, ammunition or AI authority. */
export class AudioDirector {
 private ctx:AudioContext|null=null;private master:GainNode|null=null;private limiter:DynamicsCompressorNode|null=null;
 private channels=new Map<Group,GainNode>();private buffers=new Map<Sound,AudioBuffer>();private voices=new Set<Voice>();
 private subscriptions:Array<()=>void>=[];private observed=new Map<number,Observed>();private loading:Promise<void>|null=null;
 private destroyed=false;private paused=false;private dead=false;private running=false;private music:MusicState='menu';
 private settings:GameSettings;private inserted=false;private variation=0;private nextAmbient=0;private lastMusic=-Infinity;
 private played:Partial<Record<Sound,number>>={};
 private abort=new AbortController();private failed=0;
 constructor(bus:EventBus<AppEvents>,settings:GameSettings){
  this.settings={...settings};this.subscriptions=[
   bus.on('combat:shot',s=>{this.play('m9-shot',.65);this.play('slide',.13);if(s.impact)this.play(s.impact,.3,s.position);if(s.headshot)this.play('headshot',.17);}),
   bus.on('weapon:empty',()=>this.play('click',.25)),
   bus.on('combat:damage',()=>this.play('flesh',.3)),bus.on('combat:enemyKilled',()=>this.play('kill',.15)),
   bus.on('weapon:reloadStarted',()=>{this.inserted=false;this.play('magazine',.25);}),
   bus.on('weapon:reloaded',()=>{this.play('slide',.3);this.inserted=false;}),
   bus.on('round:started',()=>this.setMusic('suspense')),bus.on('round:completed',()=>this.setMusic('preparation')),
   bus.on('economy:purchase',()=>this.play('purchase',.2)),bus.on('economy:denied',()=>this.play('denied',.15)),
   bus.on('world:doorOpened',()=>this.play('door',.4,[8,1,0])),
   bus.on('session:started',()=>{this.running=true;this.paused=false;this.dead=false;this.setMusic('preparation');this.resume();}),
   bus.on('session:resumed',()=>{this.paused=false;this.resume();}),
   bus.on('session:paused',()=>{if(this.dead)return;this.paused=true;if(this.ctx)void this.ctx.suspend().catch(()=>{});}),
   bus.on('session:gameover',()=>{this.dead=true;this.running=false;this.stopGroup('enemy');this.setMusic('gameover');}),
   bus.on('session:reset',()=>{this.stopAll();this.observed.clear();this.dead=false;this.running=false;this.paused=false;this.inserted=false;this.lastMusic=-Infinity;this.played={};this.music='menu';}),
   bus.on('session:ended',()=>{this.running=false;this.stopAll();}),
  ];
 }
 unlock():void{
  if(this.destroyed||typeof window==='undefined')return;
  try{if(!this.ctx){this.ctx=new window.AudioContext();this.master=this.ctx.createGain();this.limiter=this.ctx.createDynamicsCompressor();
   this.limiter.threshold.value=-10;this.limiter.ratio.value=6;this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);
   for(const group of ['effects','enemy','music','ambient'] as const){const g=this.ctx.createGain();g.connect(this.master);this.channels.set(group,g);}this.applyVolumes();
   this.loading=Promise.all(AUDIO_FILES.map(async name=>{try{const r=await fetch(audioUrl(name),{signal:this.abort.signal});if(!r.ok)throw new Error('audio asset');const b=await this.ctx!.decodeAudioData(await r.arrayBuffer());if(!this.destroyed)this.buffers.set(name,b);}catch{if(!this.destroyed){this.failed++;diagnostics.record('warning','audio.asset.failed');}}})).then(()=>{if(!this.destroyed){this.ensureBeds();diagnostics.record('info','audio.ready',{loaded:this.buffers.size,failed:this.failed});}});
  }this.resume();}catch{diagnostics.record('warning','audio.unavailable');}
 }
 ready():Promise<void>{return this.loading??Promise.resolve();}
 private resume():void{if(this.ctx&&!this.paused){if(this.ctx.state==='suspended')void this.ctx.resume().then(()=>this.ensureBeds()).catch(()=>{});this.ensureBeds();}}
 setSettings(settings:GameSettings):void{this.settings={...settings};this.applyVolumes();}
 private applyVolumes():void{if(!this.ctx||!this.master)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.settings.muted?0:this.settings.masterVolume,t,.04);
  for(const [group,node] of this.channels)node.gain.setTargetAtTime(group==='music'?this.settings.musicVolume:group==='ambient'?this.settings.ambientVolume:this.settings.effectsVolume,t,.08);
 }
 private play(name:Sound,volume:number,position?:Position,group:Group='effects',owner?:number,rate=1,loop=false):Voice|undefined{
  const ctx=this.ctx,buffer=this.buffers.get(name);if(!ctx||!buffer||this.destroyed||this.paused||ctx.state!=='running')return;
  if(group==='enemy'&&([...this.voices].filter(v=>v.group==='enemy').length>=ENEMY_VOICE_LIMIT||this.voices.size>=24||[...this.voices].filter(v=>v.owner===owner).length>=2))return;
  if(this.voices.size>=VOICE_LIMIT){const victim=[...this.voices].find(v=>v.group==='enemy');if(!victim)return;this.stop(victim);}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate*(loop?1:1+((this.variation++%5)-2)*.012);
  gain.gain.value=volume;source.connect(gain);let panner:PannerNode|undefined;
  if(position){panner=ctx.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=2;panner.maxDistance=30;panner.rolloffFactor=1.3;this.position(panner,position);gain.connect(panner);panner.connect(this.channels.get(group)!);}else gain.connect(this.channels.get(group)!);
  const voice:Voice={source,gain,panner,group,owner,name};this.voices.add(voice);this.played[name]=(this.played[name]??0)+1;source.onended=()=>this.release(voice);source.start();return voice;
 }
 private position(p:PannerNode,pos:Position):void{if(!this.ctx)return;const t=this.ctx.currentTime;for(const [param,value] of [[p.positionX,pos[0]],[p.positionY,pos[1]],[p.positionZ,pos[2]]] as const)param.setTargetAtTime(value,t,.05);}
 private release(v:Voice):void{this.voices.delete(v);v.source.disconnect();v.gain.disconnect();v.panner?.disconnect();}
 private stop(v:Voice):void{v.source.onended=null;try{v.source.stop();}catch{}this.release(v);}
 private stopAll():void{for(const v of [...this.voices])this.stop(v);}
 private stopGroup(group:Group):void{for(const v of [...this.voices])if(v.group===group)this.stop(v);}
 private setMusic(state:MusicState):void{if(state===this.music)return;this.music=state;this.lastMusic=-Infinity;this.ensureBeds();}
 private ensureBeds():void{
  if(!this.ctx||this.paused||!this.buffers.size)return;
  if(![...this.voices].some(v=>v.group==='music'&&!v.retiring&&v.name===this.music)){
   // Retire previous layers with a bounded crossfade; prune rapid transitions.
   for(const v of [...this.voices])if(v.group==='music'){if(v.retiring)this.stop(v);else{v.retiring=true;v.gain.gain.cancelScheduledValues(this.ctx.currentTime);v.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.5);v.source.stop(this.ctx.currentTime+3);}}
   const v=this.play(this.music,0,undefined,'music',undefined,1,true);if(v)v.gain.gain.setTargetAtTime(.55,this.ctx.currentTime,.7);
  }
  if(this.running)for(const [name,pos] of [['vent',[-6,3,-5]],['electric',[4,1,-5]]] as const){if(![...this.voices].some(v=>v.name===name))this.play(name,.25,pos,'ambient',undefined,1,true);}
 }
 update(frame:AudioFrame):void{
  if(!this.ctx||this.destroyed||!this.running||this.paused||this.dead)return;
  const now=this.ctx.currentTime,l=this.ctx.listener,pitch=frame.pitch??0;for(const [p,v] of [[l.positionX,frame.position[0]],[l.positionY,frame.position[1]],[l.positionZ,frame.position[2]],[l.forwardX,-Math.sin(frame.yaw)*Math.cos(pitch)],[l.forwardY,Math.sin(pitch)],[l.forwardZ,-Math.cos(frame.yaw)*Math.cos(pitch)],[l.upX,Math.sin(frame.yaw)*Math.sin(pitch)],[l.upY,Math.cos(pitch)],[l.upZ,Math.cos(frame.yaw)*Math.sin(pitch)]] as const)p.setTargetAtTime(v,now,.04);
  if(frame.weapon.reloading&&!this.inserted&&frame.weapon.reloadRemaining<=frame.weapon.reloadDuration*.3){this.play('magazine',.3);this.inserted=true;}
  let nearest=Infinity;const ids=new Set<number>();
  for(const e of frame.enemies){ids.add(e.id);const dist=Math.hypot(e.x-frame.position[0],e.z-frame.position[2]);if(e.state!=='dead')nearest=Math.min(nearest,dist);
   let previous=this.observed.get(e.id);if(!previous){previous={state:e.state,phase:e.walkPhase,next:now+1+(e.id%11)*.37};this.observed.set(e.id,previous);}
   for(const v of this.voices)if(v.owner===e.id&&v.panner)this.position(v.panner,[e.x,1.4,e.z]);
   const rate={common:.88,runner:1.13,brute:.65,predator:1.28}[e.kind];const pair={common:1,runner:3,brute:5,predator:7}[e.kind];
   const vocal=()=>this.play(`infected-${pair+e.id%2}` as Sound,.45,[e.x,1.4,e.z],'enemy',e.id,rate);
   if(previous.state!==e.state){if(['windup','hurt','dead'].includes(e.state)&&dist<28)vocal();if(e.state==='active')this.play('cloth',.35,[e.x,1,e.z],'enemy',e.id,rate);if(e.state==='chase'){previous.next=now+(e.id%7)*.19;}}
   if(e.state!=='dead'&&dist<25&&now>=previous.next){vocal();previous.next=now+4+(e.id%9)*.63;}
   if(e.state==='chase'&&Math.floor(e.walkPhase/Math.PI)!==Math.floor(previous.phase/Math.PI)&&dist<18)this.play(e.id%2?'step-1':'step-2',.24,[e.x,.1,e.z],'enemy',e.id,rate);
   previous.state=e.state;previous.phase=e.walkPhase;
  }
  for(const id of this.observed.keys())if(!ids.has(id))this.observed.delete(id);
  const desired=musicState(frame.health,frame.phase,nearest);if(now-this.lastMusic>2){this.setMusic(desired);this.lastMusic=now;}
  const music=this.channels.get('music');if(music)music.gain.setTargetAtTime(musicLevel(desired,now,this.settings.musicVolume),now,1);
  if(now>this.nextAmbient){this.play(Math.floor(now)%2?'alarm':'metal',.12,[-5,2,6],'ambient');this.nextAmbient=now+12+(Math.floor(now)%9);}
  this.ensureBeds();
 }
 snapshot(){return {masterGain:this.master?.gain.value??0,musicGain:this.channels.get('music')?.gain.value??0,played:{...this.played},volumes:{...this.settings},loaded:this.buffers.size,failed:this.failed,voices:this.voices.size,enemyVoices:[...this.voices].filter(v=>v.group==='enemy').length,music:this.music,paused:this.paused,context:this.ctx?.state??'locked'};}
 dispose():void{if(this.destroyed)return;this.destroyed=true;this.abort.abort();for(const off of this.subscriptions)off();this.subscriptions=[];this.stopAll();this.observed.clear();this.buffers.clear();for(const node of this.channels.values())node.disconnect();this.channels.clear();this.master?.disconnect();this.limiter?.disconnect();if(this.ctx)void this.ctx.close().catch(()=>{});this.ctx=null;}
}
