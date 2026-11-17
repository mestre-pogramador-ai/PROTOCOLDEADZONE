import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {AnimationClip,AnimationMixer,Group,LoopOnce,Mesh,MeshStandardMaterial,NumberKeyframeTrack,SkinnedMesh} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {ENEMY_ARCHETYPES} from '../../gameplay/enemies/EnemyArchetypes';
import type {Runtime} from '../../app/Runtime';
import {MODEL_PATHS,useModel} from './ModelAssets';
import {attackClipPhase,presentationDelta,deathGrounding} from './VisualMotion';
import {applyCharacterCulling} from './CharacterCulling';
import {createHeadRetarget} from './HeadRetarget';

/** Art follows authoritative actor states; never drives collision or damage. */
export function InfectedView({runtime,groundingEnabled=true}:{runtime:Runtime;groundingEnabled?:boolean}){
 const [ids,setIds]=useState(()=>runtime.enemies.snapshots().map(e=>e.id));
 const revision=useRef(runtime.enemies.rosterRevision);
 useFrame(()=>{if(revision.current!==runtime.enemies.rosterRevision){revision.current=runtime.enemies.rosterRevision;setIds(runtime.enemies.snapshots().map(e=>e.id));}});
 return <>{ids.map(id=><InfectedSlot key={id} runtime={runtime} id={id} groundingEnabled={groundingEnabled}/>)}</>;
}
function InfectedSlot({runtime,id,groundingEnabled}:{runtime:Runtime;id:number;groundingEnabled:boolean}){
 const kind=runtime.enemies.renderState(id)?.kind??'common';
 const gltf=useModel(kind==='predator'?MODEL_PATHS.hunter:MODEL_PATHS.infected);
 const previousAlpha=useRef(0),anchor=useRef<Group>(null);
 const rig=useMemo(()=>{
  if(!gltf)return null;
  const scene=clone(gltf.scene),root=new Group();root.name='HurtPivot';root.add(scene);
  const materials=new Map<MeshStandardMaterial,MeshStandardMaterial>(),skins:SkinnedMesh[]=[];
  scene.traverse(o=>{
   if(!(o instanceof Mesh))return;
   const convert=(source:MeshStandardMaterial)=>{
    let material=materials.get(source);if(!material){material=source.clone();materials.set(source,material);}return material;
   };
   o.material=Array.isArray(o.material)?o.material.map(m=>convert(m as MeshStandardMaterial)):convert(o.material as MeshStandardMaterial);
   o.receiveShadow=false;o.frustumCulled=false;if(o instanceof SkinnedMesh){applyCharacterCulling(o,kind==='predator'?'hunter':'worker');skins.push(o);}
  });
  // The exported LODs/vest share bind matrices and joint order; one cloned skeleton.
  if(skins.length>1)for(const skin of skins.slice(1)){skin.skeleton.dispose();skin.skeleton=skins[0].skeleton;}
  const mixer=new AnimationMixer(root);
  const action=(name:string)=>mixer.clipAction(gltf.animations.find(c=>c.name===name)!);
  const idle=action('Idle'),walk=action(kind==='predator'?'Run':'Walk'),attack=action('Attack'),death=action('Death');
  death.setLoop(LoopOnce,1);death.clampWhenFinished=true;
  const hurt=mixer.clipAction(new AnimationClip('Impact',.19,[new NumberKeyframeTrack('HurtPivot.rotation[z]',[0,.06,.19],[0,-.035,0])]));
  hurt.setLoop(LoopOnce,1);hurt.clampWhenFinished=true;idle.play();
  const high=scene.getObjectByName('LOD0'),low=scene.getObjectByName('LOD1'),vest=scene.getObjectByName('DamagedFlakVest');
  if(vest)vest.visible=kind==='brute';
  if(kind==='runner'){root.scale.x=.86;root.rotation.x=.08;root.position.z=-.12;}
  if(kind==='brute')root.scale.x=1.20;
  if(kind==='predator')root.scale.x=.83;
  return {root,mixer,idle,walk,attack,death,hurt,current:idle,lastState:'idle',materials:[...materials.values()],skins,high,low,vest,retarget:createHeadRetarget(scene)};
 },[gltf,kind]);
 useEffect(()=>()=>{
  if(!rig)return;rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.root);
  for(const material of rig.materials)material.dispose();
  for(const skeleton of new Set(rig.skins.map(s=>s.skeleton)))skeleton.dispose();
 },[rig]);
 useFrame(state=>{
  const e=runtime.enemies.renderState(id);if(!e||!rig||!anchor.current)return;
  const timing=runtime.getFrameTiming();
  const dt=runtime.lifecycle.state==='running'?presentationDelta(previousAlpha.current,timing.steps,timing.alpha):0;
  previousAlpha.current=timing.alpha;
  anchor.current.position.set(e.x,0,e.z);anchor.current.rotation.y=e.yaw;
  rig.root.position.y=e.state==='dead'&&groundingEnabled?deathGrounding(kind,e.deathAge):0;
  if(kind==='runner'){
   const settling=e.state==='dead'?Math.min(1,e.deathAge/.2):0;
   rig.root.rotation.x=.08*(1-settling);rig.root.position.z=-.12*(1-settling);
  }
  if(e.state!=='dead'&&rig.lastState==='dead'){
   rig.mixer.stopAllAction();rig.idle.reset().play();rig.current=rig.idle;
  }
  const stats=ENEMY_ARCHETYPES[kind].stats,attacking=e.state==='windup'||e.state==='active'||e.state==='recovery';
  const next=e.state==='dead'?rig.death:e.state==='chase'?rig.walk:attacking?rig.attack:rig.idle;
  if(rig.current!==next){rig.current.fadeOut(.10);next.reset().fadeIn(.10).play();rig.current=next;}
  rig.walk.timeScale=rig.walk.getClip().duration*stats.speed/(kind==='predator'?1.65:1.45);
  rig.attack.paused=attacking;
  if(attacking)rig.attack.time=attackClipPhase(e.state,e.timer,stats.windup,stats.active,stats.recovery)*rig.attack.getClip().duration;
  if(e.state==='hurt'&&rig.lastState!=='hurt')rig.hurt.reset().play();
  rig.death.paused=e.state==='dead';
  // Fit the authored take inside the existing 2.5 s corpse lifetime.
  if(e.state==='dead')rig.death.time=Math.min(1,e.deathAge/2.15)*rig.death.getClip().duration;
  rig.mixer.update(dt);
  if(e.state!=='dead')rig.retarget.apply(e.x,e.z);
  for(const material of rig.materials)material.emissive.setRGB(e.hitFlash*.35,e.hitFlash*.12,e.hitFlash*.08);
  const near=anchor.current.position.distanceToSquared(state.camera.position)<49;
  if(rig.high)rig.high.visible=near;if(rig.low)rig.low.visible=!near;
  if(rig.vest)rig.vest.visible=kind==='brute';
  for(const skin of rig.skins)skin.castShadow=near&&skin.visible;
  rig.lastState=e.state;
 });
 return <group ref={anchor} name={'infected-'+id} dispose={null}>{rig&&<primitive object={rig.root} dispose={null}/>}</group>;
}
