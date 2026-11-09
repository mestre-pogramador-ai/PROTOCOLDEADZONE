import {useFrame,useThree} from '@react-three/fiber';
import {useEffect,useRef} from 'react';
import {PCFSoftShadowMap} from 'three';
import type {Runtime} from '../../app/Runtime';
import {PLAYER} from '../../gameplay/player/PlayerController';
import {interpolatePosition} from '../../gameplay/player/MovementMath';
import {M9Viewmodel} from './M9Viewmodel';
import {InfectedView} from './InfectedView';
import {ContainmentEnvironment} from './ContainmentEnvironment';
/** Only bridge to the authoritative clock. Camera follows interpolated Rapier pose. */
export function Scene({runtime,groundingEnabled=true}:{runtime:Runtime;groundingEnabled?:boolean}){
 const {camera,gl}=useThree();
 useEffect(()=>{const previous=gl.shadowMap.type;gl.shadowMap.type=PCFSoftShadowMap;return()=>{gl.shadowMap.type=previous;};},[gl]);
 // Eye offset is visual-only; physical capsule always follows the fixed-step Rapier world.
 const smoothEyeHeight=useRef<number>(PLAYER.eyeOffset);
 useFrame((_state,delta)=>{
   runtime.frame(delta);
   const s=runtime.getSnapshot();
   const previous={x:s.previous.position[0],y:s.previous.position[1],z:s.previous.position[2]};
   const current={x:s.current.position[0],y:s.current.position[1],z:s.current.position[2]};
   const render=interpolatePosition(previous,current,s.alpha);
   // Smooth camera height independently without writing any pose back into the physics body.
   const k=1-Math.exp(-Math.min(.1,Math.max(0,delta))*12);
   smoothEyeHeight.current+=(s.current.eyeHeight-smoothEyeHeight.current)*k;
   camera.position.set(render.x,render.y+smoothEyeHeight.current,render.z);
   const weapon=runtime.getWeaponState();
   if('fov' in camera && typeof camera.fov==='number'){
     const desired=runtime.getFov()+(Math.max(50,runtime.getFov()-18)-runtime.getFov())*weapon.adsBlend;
     if(Math.abs(desired-camera.fov)>.001){camera.fov+=(desired-camera.fov)*Math.min(1,delta*12);camera.updateProjectionMatrix();}
   }
   const look=runtime.getLook();
   camera.rotation.order='YXZ';
   camera.rotation.set(look.pitch,look.yaw,0);
 },-100);
 return <>
  <color attach="background" args={['#17232b']}/><fog attach="fog" args={['#17232b',22,46]}/>
  <ambientLight intensity={.75}/><hemisphereLight args={['#b5c9ce','#454c48',1.35]}/>
  <directionalLight position={[-4,10,5]} intensity={1.7} color="#e0e9e3" castShadow shadow-radius={3} shadow-normalBias={.025} shadow-mapSize={[1024,1024]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-camera-far={35}/>
  <pointLight position={[-3,2.95,-1]} intensity={16} color="#7ec2cb" distance={11}/>
  <pointLight position={[7,2.85,-2.8]} intensity={12} color="#d16c58" distance={8}/>
  <ContainmentEnvironment runtime={runtime}/><InfectedView runtime={runtime} groundingEnabled={groundingEnabled}/><M9Viewmodel runtime={runtime}/>
 </>;
}
