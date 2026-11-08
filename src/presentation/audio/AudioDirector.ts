import type { EventBus, AppEvents } from '../../core/events/EventBus';
import type { GameSettings } from '../../infrastructure/persistence/Settings';

type Cue='shot'|'enemyHit'|'headshot'|'kill'|'damage'|'reload'|'reloaded'|'round'|'clear'|'purchase'|'denied'|'death';
/**
 * Local procedural placeholder audio. The AudioContext is only created/resumed in a
 * real user gesture; cues are triggered by confirmed game events, not by React renders.
 * Replace with licensed recordings in later milestones without touching gameplay.
 */
export class AudioDirector {
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private effects:GainNode|null=null;
 private atmosphere:GainNode|null=null;
 private drones:OscillatorNode[]=[];
 private subscriptions:Array<()=>void>=[];
 private destroyed=false;
 private voices=0;
 private settings:GameSettings;
 constructor(bus:EventBus<AppEvents>,settings:GameSettings){
  this.settings={...settings};
  this.subscriptions=[
   bus.on('combat:shot',s=>{this.cue('shot');if(s.hit)this.cue(s.headshot?'headshot':'enemyHit');}),
   bus.on('combat:damage',()=>this.cue('damage')),
   bus.on('combat:enemyKilled',()=>this.cue('kill')),
   bus.on('weapon:reloadStarted',()=>this.cue('reload')),
   bus.on('weapon:reloaded',()=>this.cue('reloaded')),
   bus.on('round:started',()=>this.cue('round')),
   bus.on('round:completed',()=>this.cue('clear')),
   bus.on('economy:purchase',()=>this.cue('purchase')),
   bus.on('economy:denied',()=>this.cue('denied')),
   bus.on('session:gameover',()=>this.cue('death')),
  ];
 }
 unlock():void{
  if(this.destroyed||typeof window==='undefined')return;
  try{
   if(!this.ctx){
    const AudioCtor=window.AudioContext;
    if(!AudioCtor)return;
    this.ctx=new AudioCtor();
    this.master=this.ctx.createGain();this.effects=this.ctx.createGain();this.atmosphere=this.ctx.createGain();
    this.master.gain.value=0;this.atmosphere.gain.value=0;
    this.effects.connect(this.master);this.atmosphere.connect(this.master);this.master.connect(this.ctx.destination);
    this.startAtmosphere();this.applyVolumes();
   }
   if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});
  }catch{/* Audio disabled/unsupported: visual gameplay remains functional. */}
 }
 setSettings(settings:GameSettings):void{this.settings={...settings};this.applyVolumes();}
 private applyVolumes():void{
  if(!this.ctx||!this.master||!this.effects||!this.atmosphere)return;
  const t=this.ctx.currentTime;
  this.master.gain.setTargetAtTime(this.settings.muted?0:this.settings.masterVolume,t,.025);
  this.effects.gain.setTargetAtTime(this.settings.effectsVolume,t,.025);
  this.atmosphere.gain.setTargetAtTime(this.settings.ambientVolume*.11,t,.05);
 }
 private startAtmosphere():void{
  if(!this.ctx||!this.atmosphere)return;
  for(const [freq,shape] of [[53,'sine'],[81,'triangle']] as const){
   const osc=this.ctx.createOscillator();osc.type=shape;osc.frequency.value=freq;
   osc.connect(this.atmosphere);osc.start();this.drones.push(osc);
  }
 }
 private cue(type:Cue):void{
  if(!this.ctx||!this.effects||this.destroyed||this.ctx.state!=='running'||this.voices>=18)return;
  const data:Record<Cue,[number,number,number,OscillatorType,number]>={
   shot:[155,58,.16,'sawtooth',.15],enemyHit:[510,190,.075,'triangle',.055],
   headshot:[870,190,.17,'sine',.11],kill:[250,100,.11,'triangle',.045],
   damage:[90,34,.23,'sawtooth',.17],reload:[430,250,.12,'triangle',.05],
   reloaded:[650,510,.13,'sine',.045],round:[170,480,.48,'sawtooth',.075],
   clear:[420,760,.45,'triangle',.08],purchase:[630,940,.23,'sine',.07],
   denied:[240,135,.25,'square',.04],death:[160,38,.9,'triangle',.10],
  };
  const [start,end,duration,shape,volume]=data[type];
  try{
   const now=this.ctx.currentTime;
   const osc=this.ctx.createOscillator(),env=this.ctx.createGain();
   osc.type=shape;osc.frequency.setValueAtTime(start,now);
   osc.frequency.exponentialRampToValueAtTime(Math.max(10,end),now+duration);
   env.gain.setValueAtTime(.0001,now);
   env.gain.exponentialRampToValueAtTime(volume,now+.009);
   env.gain.exponentialRampToValueAtTime(.0001,now+duration);
   osc.connect(env);env.connect(this.effects);
   this.voices++;osc.onended=()=>{this.voices=Math.max(0,this.voices-1);osc.disconnect();env.disconnect();};
   osc.start(now);osc.stop(now+duration+.01);
  }catch{/* Audio should never cause a gameplay error. */}
 }
 dispose():void{
  if(this.destroyed)return;this.destroyed=true;
  for(const unsubscribe of this.subscriptions)unsubscribe();this.subscriptions=[];
  for(const o of this.drones){try{o.stop();o.disconnect();}catch{}}
  this.drones=[];
  if(this.ctx){void this.ctx.close().catch(()=>{});this.ctx=null;}
  this.master=null;this.effects=null;this.atmosphere=null;
 }
}
