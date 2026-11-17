import {Runtime} from '../../src/app/Runtime';
import {AudioDirector,type AudioFrame} from '../../src/presentation/audio/AudioDirector';
import {DEFAULT_SETTINGS,saveSettings,readSettings} from '../../src/infrastructure/persistence/Settings';
const r=await Runtime.create(),d=new AudioDirector(r.bus,DEFAULT_SETTINGS);
let override:Partial<AudioFrame>|null=null,previous=performance.now();
function frame(time:number){r.frame((time-previous)/1000);previous=time;requestAnimationFrame(frame);}requestAnimationFrame(frame);
function mix(){const p=r.getSnapshot().current;d.update({position:[p.position[0],p.position[1]+p.eyeHeight,p.position[2]],yaw:r.getLook().yaw,health:r.getCombatState().health,phase:r.getRoundState().phase,enemies:r.enemies.snapshots(),weapon:r.getWeaponState(),...override});return d.snapshot();}
const interval=setInterval(mix,100);
document.querySelector('#unlock')!.addEventListener('click',()=>d.unlock());
document.querySelector('#start')!.addEventListener('click',()=>{r.start();r.setPointerLocked(true);});
Object.assign(window,{audioTest:{ready:()=>d.ready(),observe:()=>({audio:d.snapshot(),weapon:r.getWeaponState(),combat:r.getCombatState(),credits:r.getEconomyState()}),
 spawn:()=>{const p=r.getSnapshot().current.position;r.enemies.spawn(p[0],p[2]-2,100);},
 override:(value:Partial<AudioFrame>|null)=>{override=value;return mix();},pause:()=>r.pause(),resume:()=>r.resume(),reset:()=>{override=null;r.reset();r.setPointerLocked(true);},
 volume:(v:number)=>{const s={...DEFAULT_SETTINGS,musicVolume:v};saveSettings(localStorage,s);d.setSettings(readSettings(localStorage));},
 mute:(muted:boolean)=>{const s={...readSettings(localStorage),muted};saveSettings(localStorage,s);d.setSettings(s);},
 gameover:()=>r.bus.emit('session:gameover',{rounds:0,kills:r.getCombatState().kills}),
 dispose:()=>{clearInterval(interval);d.dispose();r.dispose();},}});
