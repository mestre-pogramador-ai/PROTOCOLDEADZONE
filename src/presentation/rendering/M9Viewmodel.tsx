import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Group, Mesh, Quaternion, Vector3 } from 'three';
import type { Runtime } from '../../app/Runtime';
/** Low-poly procedural placeholder, not final licensed GLB. Visual-only and never used for authoritative hitscan. */
export function M9Viewmodel({runtime}:{runtime:Runtime}) {
  const {camera}=useThree();
  const gun=useRef<Group>(null);
  const flash=useRef<Mesh>(null);
  const tracer=useRef<Mesh>(null);
  const impact=useRef<Mesh>(null);
  const lastShot=useRef(0);
  const recoil=useRef(0);const slide=useRef<Mesh>(null);
  const axis=new Vector3(0,1,0);
  useFrame((_,delta)=>{
    const state=runtime.getWeaponState();
    if(state.shotsFired<lastShot.current){lastShot.current=state.shotsFired;recoil.current=0;}
    else if(state.shotsFired>lastShot.current){lastShot.current=state.shotsFired;recoil.current=.11;}
    recoil.current=Math.max(0,recoil.current-delta*1.25);if(slide.current)slide.current.position.z=-.17+recoil.current*.8;
    if(gun.current){
      const ads=state.adsBlend;
      const local=new Vector3(-.33+ads*.33,-.28+ads*.18,-.62+ads*.08);
      gun.current.position.copy(local.applyQuaternion(camera.quaternion).add(camera.position));
      gun.current.quaternion.copy(camera.quaternion);
      gun.current.rotateX(-recoil.current+(state.reloading?Math.sin((1.5-state.reloadRemaining)*6)*.38:0));
    }
    const shot=runtime.getShotTrace();
    if(flash.current)flash.current.visible=!!shot;
    if(tracer.current&&impact.current){
      tracer.current.visible=!!shot;impact.current.visible=!!shot?.hit;
      if(shot){
        const start=new Vector3(...shot.start),end=new Vector3(...shot.end);
        const vector=end.clone().sub(start),length=vector.length();
        tracer.current.position.copy(start.add(end).multiplyScalar(.5));
        tracer.current.quaternion.copy(new Quaternion().setFromUnitVectors(axis,vector.normalize()));
        tracer.current.scale.set(1,length,1);
        impact.current.position.set(...shot.end);
      }
    }
  });
  return <>
    <group ref={gun}>
      <mesh position={[0,-.01,0]} castShadow><boxGeometry args={[.14,.16,.48]}/><meshStandardMaterial color="#27343a" metalness={.8} roughness={.3}/></mesh>
      <mesh ref={slide} position={[0,.075,-.17]}><boxGeometry args={[.115,.075,.29]}/><meshStandardMaterial color="#4b5c60" metalness={.85} roughness={.28}/></mesh>
      <mesh position={[0,-.16,.13]} rotation={[.26,0,0]}><boxGeometry args={[.12,.28,.13]}/><meshStandardMaterial color="#1c2529" metalness={.3} roughness={.65}/></mesh>
      <mesh position={[0,.125,-.2]}><boxGeometry args={[.025,.04,.045]}/><meshStandardMaterial color="#63c5c0" emissive="#236a67" emissiveIntensity={.5}/></mesh>
      <mesh position={[0,-.01,-.31]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,.10,12]}/><meshStandardMaterial color="#111719" metalness={.8}/></mesh>
      <mesh position={[-.12,-.24,.22]} rotation={[.35,0,-.2]}><boxGeometry args={[.18,.32,.22]}/><meshStandardMaterial color="#424d48" roughness={.95}/></mesh>
      <mesh position={[.11,-.24,.22]} rotation={[.35,0,.2]}><boxGeometry args={[.18,.32,.22]}/><meshStandardMaterial color="#424d48" roughness={.95}/></mesh>
      <mesh position={[0,.11,.06]}><boxGeometry args={[.12,.045,.18]}/><meshStandardMaterial color="#6c7775" metalness={.8} roughness={.28}/></mesh>
      <mesh ref={flash} position={[0,-.01,-.4]} visible={false}><sphereGeometry args={[.08,8,6]}/><meshBasicMaterial color="#ffca68" transparent opacity={.85} depthWrite={false}/></mesh>
    </group>
    <mesh ref={tracer} visible={false}><cylinderGeometry args={[.007,.007,1,5]}/><meshBasicMaterial color="#ffd69a" transparent opacity={.8} depthWrite={false}/></mesh>
    <mesh ref={impact} visible={false}><sphereGeometry args={[.045,8,6]}/><meshBasicMaterial color="#e0aa63"/></mesh>
  </>;
}
