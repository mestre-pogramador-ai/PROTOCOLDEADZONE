import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {AnimationClip,AnimationMixer,Group,LoopOnce,Mesh,NumberKeyframeTrack,SkinnedMesh,Quaternion,Vector3} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {ENEMY_ARCHETYPES,type EnemyKind} from '../../gameplay/enemies/EnemyArchetypes';
import type {Runtime} from '../../app/Runtime';
import {MODEL_PATHS,useModel,variantMaterial,remappedLodGeometry} from './ModelAssets';
import {attackClipPhase,presentationDelta} from './VisualMotion';
/** Local skinned GLB, shared geometry/texture, one cloned skeleton per actor. */
export function InfectedView({runtime}:{runtime:Runtime}){
 const [ids,setIds]=useState(()=>runtime.enemies.snapshots().map(e=>e.id));
 const revision=useRef(runtime.enemies.rosterRevision);
 useFrame(()=>{if(revision.current!==runtime.enemies.rosterRevision){revision.current=runtime.enemies.rosterRevision;setIds(runtime.enemies.snapshots().map(e=>e.id));}});
 return <>{ids.map(id=><InfectedSlot key={id} runtime={runtime} id={id}/>)}</>;
}
const PALETTES:Record<EnemyKind,string>={common:'#a3aaa0',runner:'#c3ad84',brute:'#9ba8b8',predator:'#bca3a9'};
function InfectedSlot({runtime,id}:{runtime:Runtime;id:number}){
 const gltf=useModel(MODEL_PATHS.infected);
 const low=useModel(MODEL_PATHS.infectedLod);
 const previousAlpha=useRef(0);
 const anchor=useRef<Group>(null);
 const kind=runtime.enemies.renderState(id)?.kind??'common';
 const rig=useMemo(()=>{
  if(!gltf)return null;
  const scene=clone(gltf.scene);
  const hurtPivot=new Group();hurtPivot.name='HurtPivot';
  const deathPivot=new Group();deathPivot.name='DeathPivot';deathPivot.position.y=.9;
  const scaleRoot=new Group();scaleRoot.scale.set(kind==='brute'?.272:kind==='runner'?.246:.257,.257,.257);
  scaleRoot.position.y=-.9;scaleRoot.add(scene);deathPivot.add(scaleRoot);hurtPivot.add(deathPivot);
  const material=variantMaterial(gltf,kind,PALETTES[kind]).clone();
  scene.traverse(o=>{if(o instanceof Mesh){o.material=material;o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;}});
  let originalGeometry:import('three').BufferGeometry|undefined;scene.traverse(o=>{if(o instanceof SkinnedMesh)originalGeometry=o.geometry;});
  const mixer=new AnimationMixer(hurtPivot);
  const clips=gltf.animations.map(source=>{
   const clip=source.clone();
   // Only vertical hip movement is visual; horizontal root motion must not move the actor.
   for(const track of clip.tracks)if(track.name.endsWith('Hips.position')){
    const bone=scene.getObjectByName('Hips');
    for(let i=0;i<track.values.length;i+=3){track.values[i]=bone?.position.x??0;track.values[i+2]=bone?.position.z??0;}
   }
   return clip;
  });
  const clip=(name:string)=>clips.find(c=>c.name.includes(name))!;
  const idle=mixer.clipAction(clip('Idle')),walk=mixer.clipAction(clip(kind==='runner'||kind==='predator'?'Run':'Walk')),bite=mixer.clipAction(clip('Bite'));
  const hurt=mixer.clipAction(new AnimationClip('HitReaction',.2,[new NumberKeyframeTrack('HurtPivot.rotation[z]',[0,.06,.2],[0,-.025,0])]));
  hurt.setLoop(LoopOnce,1);hurt.clampWhenFinished=true;
  // The source has no death take. Reuse its low, folded-limb pose as a visual
  // collapse, frozen halfway; this does not introduce crawling AI or root motion.
  const collapse=clip('Crawl').clone();collapse.name='Collapse_from_Crawl';
  const death=mixer.clipAction(collapse);death.setLoop(LoopOnce,1);death.clampWhenFinished=true;
  idle.play();
  return {root:hurtPivot,mixer,idle,walk,bite,hurt,death,current:idle,lastState:'idle',material,
   originalGeometry,head:scene.getObjectByName('Head'),headTop:scene.getObjectByName('HeadTop_End'),spine:scene.getObjectByName('Spine'),
   skin:(()=>{let skin:SkinnedMesh|undefined;scene.traverse(o=>{if(o instanceof SkinnedMesh)skin=o;});return skin;})(),
   scratch:{head:new Vector3(),top:new Vector3(),pivot:new Vector3(),direction:new Vector3(),up:new Vector3(0,1,0),
    correction:new Quaternion(),target:new Quaternion(),world:new Quaternion(),parent:new Quaternion()}};
 },[gltf,kind]);
 useEffect(()=>()=>{if(rig){rig.material.dispose();rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.root);rig.root.traverse(o=>{if(o instanceof SkinnedMesh)o.skeleton.dispose();});}},[rig]);
 useFrame((state)=>{
  const e=runtime.enemies.renderState(id);
  if(!e||!rig||!anchor.current)return;
  const timing=runtime.getFrameTiming();
  const dt=runtime.lifecycle.state==='running'?presentationDelta(previousAlpha.current,timing.steps,timing.alpha):0;
  previousAlpha.current=timing.alpha;
  anchor.current.position.set(e.x,0,e.z);anchor.current.rotation.y=e.yaw;
  const settings=ENEMY_ARCHETYPES[e.kind].stats;
  const attacking=e.state==='windup'||e.state==='active'||e.state==='recovery';
  const next=e.state==='dead'?rig.death:e.state==='chase'?rig.walk:attacking?rig.bite:rig.idle;
  if(rig.current!==next){rig.current.fadeOut(.10);next.reset().fadeIn(.10).play();rig.current=next;}
  rig.walk.timeScale=rig.walk.getClip().duration*settings.speed/(e.kind==='runner'||e.kind==='predator'?1.5:1.35);
  rig.bite.paused=attacking;
  if(attacking)rig.bite.time=attackClipPhase(e.state,e.timer,settings.windup,settings.active,settings.recovery)*rig.bite.getClip().duration;
  if(e.state==='hurt'&&rig.lastState!=='hurt')rig.hurt.reset().play();
  if(e.state==='dead'){
   rig.death.paused=true;const progress=Math.min(1,e.deathAge/.75);
   rig.death.time=progress*rig.death.getClip().duration*.5;
   const pivot=rig.root.getObjectByName('DeathPivot');if(pivot)pivot.position.y=.9+.05*progress;
  }
  rig.mixer.update(dt);
  // Reusing an ID after reset must not retain a corpse transform.
  if(e.state!=='dead'){rig.death.stop();const pivot=rig.root.getObjectByName('DeathPivot');if(pivot){pivot.rotation.x=0;pivot.position.y=.9;}}
  rig.material.emissive.setRGB(e.hitFlash*.6,e.hitFlash*.36,e.hitFlash*.24);
  if(e.state!=='dead'&&rig.head&&rig.headTop&&rig.spine){
   // Retarget the imported hunch to the existing headshot column by rotating the
   // spine, not by translating the actor or changing a hitbox.
   const s=rig.scratch;
   rig.head.getWorldPosition(s.head);rig.headTop.getWorldPosition(s.top);rig.spine.getWorldPosition(s.pivot);
   s.direction.copy(s.head).add(s.top).multiplyScalar(.5).sub(s.pivot).normalize();
   s.correction.identity().slerp(s.target.setFromUnitVectors(s.direction,s.up),.9);
   rig.spine.getWorldQuaternion(s.world);s.world.premultiply(s.correction);
   rig.spine.parent!.getWorldQuaternion(s.parent).invert();rig.spine.quaternion.copy(s.parent.multiply(s.world));
  }
  if(rig.skin){
   const distant=anchor.current.position.distanceTo(state.camera.position)>7;
   rig.skin.geometry=distant&&low?remappedLodGeometry(gltf!,low):
    rig.originalGeometry!;
   rig.skin.castShadow=!distant;
  }
  rig.lastState=e.state;
 });
 return <group ref={anchor} name={'infected-'+id} dispose={null}>{rig&&<primitive object={rig.root} dispose={null}/>}</group>;
}
