import {createPortal,useFrame,useThree} from '@react-three/fiber';
import {useEffect,useMemo,useRef} from 'react';
import {AnimationMixer,Group,Mesh,PerspectiveCamera,PMREMGenerator,Quaternion,Scene,Vector3} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Runtime} from '../../app/Runtime';
import {M9} from '../../gameplay/weapons/M9';
import {MODEL_PATHS,useModel} from './ModelAssets';
import {magazineTravel,reloadProgress,presentationDelta} from './VisualMotion';
/** Independent render pass. Animation never changes physics, shot origin or ammunition. */
export function M9Viewmodel({runtime}:{runtime:Runtime}){
 const {gl,size}=useThree();
 const weapon=useModel(MODEL_PATHS.m9),arms=useModel(MODEL_PATHS.arms);
 const overlay=useMemo(()=>new Scene(),[]);
 const viewCamera=useMemo(()=>new PerspectiveCamera(55,1,.01,3),[]);
 const root=useRef<Group>(null),flash=useRef<Mesh>(null),tracer=useRef<Mesh>(null),impact=useRef<Mesh>(null);
 const previousAlpha=useRef(0);
 const animation=useRef({lastShot:0,shotAge:10,time:0,equip:1,sprint:0});
 const scratch=useMemo(()=>({a:new Vector3(),b:new Vector3(),direction:new Vector3(),axis:new Vector3(0,1,0),q:new Quaternion()}),[]);
 const gun=useMemo(()=>weapon?clone(weapon.scene):null,[weapon]);
 const handRig=useMemo(()=>{
  if(!arms)return null;
  const scene=clone(arms.scene),mixer=new AnimationMixer(scene);
  const clip=arms.animations.find(a=>a.name.includes('Reload'));
  const action=clip?mixer.clipAction(clip).play():null;if(action)action.paused=true;
  return {scene,mixer,action,duration:clip?.duration??1};
 },[arms]);
 const slide=useMemo(()=>gun?.getObjectByName('Slide'),[gun]);
 const magazine=useMemo(()=>gun?.getObjectByName('Magazine'),[gun]);
 const trigger=useMemo(()=>gun?.getObjectByName('Trigger'),[gun]);
 useEffect(()=>{
  const pmrem=new PMREMGenerator(gl),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);overlay.environment=environment.texture;
  room.dispose();pmrem.dispose();
  return ()=>{overlay.environment=null;environment.dispose();};
 },[gl,overlay]);
 useEffect(()=>()=>{if(handRig){handRig.mixer.stopAllAction();handRig.mixer.uncacheRoot(handRig.scene);handRig.scene.traverse(o=>{if(o instanceof Mesh&&'skeleton' in o)(o as import('three').SkinnedMesh).skeleton.dispose();});}},[handRig]);
 useEffect(()=>{
  const reset=runtime.bus.on('session:reset',()=>{animation.current={lastShot:0,shotAge:10,time:0,equip:0,sprint:0};});
  const equip=runtime.bus.on('session:started',()=>{animation.current.equip=0;});
  return ()=>{reset();equip();};
 },[runtime]);
 useFrame((state)=>{
  const current=runtime.getWeaponState(),motion=runtime.getMovementDiagnostics(),a=animation.current;
  const timing=runtime.getFrameTiming();
  const dt=runtime.lifecycle.state==='running'?presentationDelta(previousAlpha.current,timing.steps,timing.alpha):0;
  previousAlpha.current=timing.alpha;
  a.time+=dt;a.equip=Math.min(1,a.equip+dt*3.5);
  if(current.shotsFired>a.lastShot){a.lastShot=current.shotsFired;a.shotAge=0;}else a.shotAge+=dt;
  const moving=dt>0?motion.requestedHorizontalMeters*60:0;
  const targetSprint=moving>6&&!current.ads?1:0;
  a.sprint+=(targetSprint-a.sprint)*(1-Math.exp(-dt*12));
  const ads=current.adsBlend,progress=current.reloading?reloadProgress(current.reloadRemaining,current.reloadDuration):0;
  const kick=Math.exp(-a.shotAge*30)*M9.recoilKick;
  if(root.current){
   const breathe=Math.sin(a.time*1.8)*.0015*(1-ads);
   const bob=Math.sin(a.time*9)*Math.min(.004,moving*.001)*(1-ads);
   root.current.position.set(.15*(1-ads),-.10+ads*.006+breathe+bob-a.sprint*.10-(1-a.equip)*.22,-.48+kick*.18);
   root.current.rotation.set(kick+a.sprint*.38+Math.sin(progress*Math.PI)*.18,0,-a.sprint*.16);
  }
  if(slide)slide.position.z=Math.exp(-a.shotAge*42)*.026;
  if(trigger)trigger.rotation.x=-Math.exp(-a.shotAge*25)*.10;
  if(magazine)magazine.position.y=-magazineTravel(progress)*.17;
  if(handRig?.action){handRig.action.time=progress*handRig.duration;handRig.mixer.update(0);}
  if(flash.current)flash.current.visible=a.shotAge<.045;
  const shot=runtime.getShotTrace();
  if(tracer.current&&impact.current){
   tracer.current.visible=!!shot&&a.shotAge<.07;impact.current.visible=!!shot?.hit;
   if(shot){
    scratch.a.set(...shot.start);scratch.b.set(...shot.end);
    scratch.direction.copy(scratch.b).sub(scratch.a);const distance=scratch.direction.length();
    tracer.current.position.copy(scratch.a.add(scratch.b).multiplyScalar(.5));
    tracer.current.quaternion.copy(scratch.q.setFromUnitVectors(scratch.axis,scratch.direction.normalize()));
    tracer.current.scale.set(1,distance,1);impact.current.position.set(...shot.end);
   }
  }
  viewCamera.aspect=size.width/size.height;viewCamera.updateProjectionMatrix();
  // Aggregate both passes for render diagnostics, not just the final overlay pass.
  gl.info.autoReset=false;gl.info.reset();const clear=gl.autoClear;
  gl.autoClear=true;gl.render(state.scene,state.camera);
  gl.autoClear=false;gl.clearDepth();gl.render(overlay,viewCamera);gl.autoClear=clear;
 },1);
 return <>
  {createPortal(<>
   <hemisphereLight args={['#d5e6ee','#292b27',2]}/>
   <directionalLight position={[1,2,1]} intensity={3} color="#ffe9ca"/>
   <directionalLight position={[-1,.5,-1]} intensity={1} color="#81b9bd"/>
   <group ref={root} dispose={null}>
    {gun&&<primitive object={gun} dispose={null}/>}
    {handRig&&<primitive object={handRig.scene} dispose={null}/>}
    <mesh ref={flash} position={[0,.065,-.19]} visible={false} rotation={[0,0,.4]}><planeGeometry args={[.06,.065]}/><meshBasicMaterial color="#ffd79a" transparent opacity={.9} depthWrite={false}/></mesh>
   </group>
  </>,overlay)}
  <mesh ref={tracer} visible={false}><cylinderGeometry args={[.003,.003,1,4]}/><meshBasicMaterial color="#eec883" transparent opacity={.6} depthWrite={false}/></mesh>
  <mesh ref={impact} visible={false}><octahedronGeometry args={[.025]}/><meshBasicMaterial color="#cfc4a5"/></mesh>
 </>;
}
