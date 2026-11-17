import {Box3,Vector3} from 'three';
import {modelCacheSnapshot} from '../../src/presentation/rendering/ModelAssets';
import {createRoot} from 'react-dom/client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Runtime} from '../../src/app/Runtime';
import {Scene} from '../../src/presentation/rendering/Scene';
import {ENEMY_KINDS} from '../../src/gameplay/enemies/EnemyArchetypes';
import {useEffect} from 'react';
async function boot(){
const r=await Runtime.create();r.start();r.pause();
// Fixed render laboratory, not a progression playthrough.
r.rounds.tick=()=>({started:false,completedRound:null});
const originalTick=r.enemies.tick.bind(r.enemies);
let pose:string|null=null,poseTime=0;
r.enemies.tick=(dt,...args)=>{
 if(!pose)return originalTick(dt,...args);
 poseTime+=dt;
 for(const e of r.enemies.snapshots()){
  const target=r.enemies.renderState(e.id)!;
  const stats={windup:.45,active:.15,recovery:.9};
  Object.assign(target,{state:pose,walkPhase:poseTime*7,
   timer:pose==='windup'?stats.windup*.5:pose==='active'?stats.active*.5:stats.recovery*.5,
   hitFlash:pose==='hurt'?.1:0,deathAge:pose==='dead'?Math.min(1.5,poseTime):0});
 }
 return [];
};
let frames:number[]=[];let previous=performance.now();
function spawn(count:number){
 r.enemies.clear();
 for(let i=0;i<count;i++)r.enemies.spawn(-3.4+(i%4)*1.6,-4-Math.floor(i/4)*1.8,100,ENEMY_KINDS[i%4]);
}
spawn(4);
function Probe(){
 const {gl,scene}=useThree();
 useFrame(()=>{const now=performance.now();frames.push(now-previous);previous=now;if(frames.length>240)frames.shift();},2);

 useEffect(()=>{Object.assign(window,{
  visualFloor:()=>r.enemies.snapshots().slice(0,4).map(e=>{
   const actor=scene.getObjectByName('infected-'+e.id);return actor?new Box3().setFromObject(actor,true).min.y:0;
  }),
  visualBounds:()=>r.enemies.snapshots().map(e=>{
   const actor=scene.getObjectByName('infected-'+e.id);
   return actor?new Box3().setFromObject(actor,true).getSize(new Vector3()).toArray():null;
  }),
  visualObserve:()=>({heads:r.enemies.snapshots().slice(0,4).map(e=>{
   const actor=scene.getObjectByName('infected-'+e.id),head=actor?.getObjectByName('Head'),top=actor?.getObjectByName('HeadTop_End');
   if(!head||!top)return null;const a=head.getWorldPosition(new Vector3()),b=top.getWorldPosition(new Vector3());a.add(b).multiplyScalar(.5);
   return {id:e.id,center:a.toArray(),target:[e.x,1.78,e.z]};
  }),frames,enemies:r.enemies.snapshots(),programs:gl.info.programs?.length,render:{...gl.info.render},memory:{...gl.info.memory},movement:r.getMovementDiagnostics(),assets:modelCacheSnapshot(),weapon:r.getWeaponState(),combat:r.getCombatState(),trace:r.getShotTrace(),results:r.getResults(),count:r.enemies.snapshots().length}),
  visualCommand:(command:string,value?:number|string)=>{
   if(command==='valid-grid'){
    r.enemies.clear();for(let i=0;i<20;i++)r.enemies.spawn(-2.5+(i%4)*1.2,-3-Math.floor(i/4),100,ENEMY_KINDS[i%4]);
   }
   if(command==='count')spawn(typeof value==='number'?value:4);
   if(command==='sample'){frames=[];previous=performance.now();}
   if(command==='pose'){pose=String(value);poseTime=0;r.resume();r.setPointerLocked(true);}
   if(command==='resume'){r.resume();r.setPointerLocked(true);}
   if(command==='pause')r.pause();
   if(command==='target'){pose=null;r.enemies.clear();r.enemies.spawn(-1,-4,100,'common');r.resume();r.setPointerLocked(true);}
   if(command==='aim-head'){
    const target=r.enemies.snapshots().find(e=>e.state!=='dead');
    if(target){const p=r.getSnapshot().current.position,look=r.getLook(),dx=target.x-p[0],dz=target.z-p[2];
     const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(1.78-(p[1]+.65),Math.hypot(dx,dz));
     r.look((look.yaw-yaw)/.0022,(look.pitch-pitch)/.0022);}
   }
   if(command==='reset'){pose=null;r.reset();r.pause();spawn(typeof value==='number'?value:4);}
   if(command==='clear')r.enemies.clear();
   if(command==='fov')r.configureView(typeof value==='number'?value:80,1);
  },
 });},[gl]);
 return null;
}
createRoot(document.getElementById('root')!).render(<Canvas shadows dpr={1} camera={{fov:80,near:.03,far:100}}><Scene runtime={r}/><Probe/></Canvas>);

}void boot();
