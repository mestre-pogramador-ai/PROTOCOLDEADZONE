import {Box3,Vector3,Mesh,SkinnedMesh,type Object3D,type Camera} from 'three';
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
   hitFlash:pose==='hurt'?.1:0,deathAge:pose==='dead'?Math.min(2.3,poseTime):0});
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

 useEffect(()=>{let viewScene:Object3D|undefined,viewCamera:Camera|undefined;Object.assign(window,{
  visualViewmodel:()=>{
   if(!viewScene||!viewCamera)return null;
   const point=new Vector3();
   const bounds=()=>({minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
   const gun=bounds(),hands={R:bounds(),L:bounds()};
   const include=(box:ReturnType<typeof bounds>,p:Vector3)=>{if(p.z< -1||p.z>1)return;box.minX=Math.min(box.minX,p.x);box.maxX=Math.max(box.maxX,p.x);box.minY=Math.min(box.minY,p.y);box.maxY=Math.max(box.maxY,p.y);};
   viewScene.getObjectByName('M9')?.traverse(o=>{
    if(o instanceof Mesh)for(let i=0;i<o.geometry.getAttribute('position').count;i++)include(gun,point.fromBufferAttribute(o.geometry.getAttribute('position'),i).applyMatrix4(o.matrixWorld).project(viewCamera!));
   });
   viewScene.traverse(o=>{
    if(!(o instanceof SkinnedMesh))return;
    const indices=o.geometry.getAttribute('skinIndex'),weights=o.geometry.getAttribute('skinWeight');
    for(let i=0;i<indices.count;i++)for(const side of ['R','L'] as const){
     let weight=0;
     for(let j=0;j<4;j++){const bone=o.skeleton.bones[indices.getComponent(i,j)];if(bone.name.endsWith(side)&&/hand|palm|thumb|f_/.test(bone.name))weight+=weights.getComponent(i,j);}
     if(weight>.6)include(hands[side],o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld).project(viewCamera!));
    }
   });
   const sight=(name:string)=>viewScene!.getObjectByName(name)?.getWorldPosition(new Vector3()).project(viewCamera!).toArray();
   return {gun,hands,sights:{front:sight('FrontSight'),rear:sight('RearSight')},magazine:viewScene.getObjectByName('Magazine')?.position.toArray(),slide:viewScene.getObjectByName('Slide')?.position.toArray()};
  },
  visualFloor:()=>r.enemies.snapshots().slice(0,4).map(e=>{
   const actor=scene.getObjectByName('infected-'+e.id),point=new Vector3();let floor=Infinity;
   actor?.traverse(o=>{
    if(!(o instanceof Mesh)||!o.visible)return;
    const index=o.geometry.index,position=o.geometry.getAttribute('position');
    const used=index?new Set(Array.from({length:index.count},(_,i)=>index.getX(i))):Array.from({length:position.count},(_,i)=>i);
    for(const i of used){
     if(o instanceof SkinnedMesh)o.getVertexPosition(i,point);else point.fromBufferAttribute(position,i);
     floor=Math.min(floor,point.applyMatrix4(o.matrixWorld).y);
    }
   });return Number.isFinite(floor)?floor:0;
  }),
  visualBounds:()=>r.enemies.snapshots().map(e=>{
   const actor=scene.getObjectByName('infected-'+e.id);
   return actor?new Box3().setFromObject(actor,true).getSize(new Vector3()).toArray():null;
  }),
  visualObserve:()=>({heads:r.enemies.snapshots().slice(0,4).map(e=>{
   const actor=scene.getObjectByName('infected-'+e.id),head=actor?.getObjectByName('Head'),top=actor?.getObjectByName('HeadTop_End');
   if(!head||!top)return null;const a=head.getWorldPosition(new Vector3()),b=top.getWorldPosition(new Vector3());a.add(b).multiplyScalar(.5);
   return {id:e.id,center:a.toArray(),target:[e.x,1.78,e.z]};
  }),poseTime,frames,enemies:r.enemies.snapshots(),programs:gl.info.programs?.length,render:{...gl.info.render},memory:{...gl.info.memory},movement:r.getMovementDiagnostics(),assets:modelCacheSnapshot(),weapon:r.getWeaponState(),combat:r.getCombatState(),trace:r.getShotTrace(),results:r.getResults(),count:r.enemies.snapshots().length}),
  visualCommand:(command:string,value?:number|string)=>{
   if(command==='combat'){
    pose=null;r.enemies.clear();
    r.enemies.spawn(-1.8,-3.2,100,'common');r.enemies.spawn(-.7,-3.5,70,'runner');r.enemies.spawn(.5,-4,180,'brute');r.enemies.spawn(-.2,-5,120,'predator');
    r.resume();r.setPointerLocked(true);
   }
   if(command==='death-sample'){
    r.pause();for(const e of r.enemies.snapshots()){const actor=r.enemies.renderState(e.id)!;actor.state='dead';actor.deathAge=Number(value);}
   }
   if(command==='close'){pose='idle';poseTime=0;r.enemies.clear();r.enemies.spawn(-1,-1.85,100,'common');r.resume();r.setPointerLocked(true);}
   if(command==='showcase'){pose='idle';poseTime=0;r.enemies.clear();for(let i=0;i<4;i++)r.enemies.spawn(-2.1+i*1.1,-3.2,100,ENEMY_KINDS[i]);r.resume();r.setPointerLocked(true);}
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
 });
 const original=gl.render.bind(gl);gl.render=(renderScene,renderCamera)=>{if(renderScene.name==='FPSViewmodel'){viewScene=renderScene;viewCamera=renderCamera;}original(renderScene,renderCamera);};
 return ()=>{gl.render=original;};
 },[gl]);
 return null;
}
createRoot(document.getElementById('root')!).render(<Canvas shadows dpr={1} camera={{fov:80,near:.03,far:100}}><Scene runtime={r} groundingEnabled={!new URLSearchParams(location.search).has("rawGrounding")}/><Probe/></Canvas>);

}void boot();
