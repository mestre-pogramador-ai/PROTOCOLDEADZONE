import {useFrame} from '@react-three/fiber';
import {useRef,useState} from 'react';
import type {Group,Mesh,MeshStandardMaterial} from 'three';
import type {Runtime} from '../../app/Runtime';
import type {InfectedSnapshot} from '../../gameplay/enemies/Infected';
/** Procedural humanoid placeholder. Rig groups expose animation states without touching combat logic. */
export function InfectedView({runtime}:{runtime:Runtime}){
 const [ids,setIds]=useState<number[]>(()=>runtime.enemies.snapshots().map(e=>e.id));
 const previous=useRef(ids.join(','));
 useFrame(()=>{const next=runtime.enemies.snapshots().map(e=>e.id);const signature=next.join(',');if(previous.current!==signature){previous.current=signature;setIds(next);}});
 return <>{ids.map(id=><InfectedSlot key={id} runtime={runtime} id={id}/>)}</>;
}
function InfectedSlot({runtime,id}:{runtime:Runtime;id:number}){
 const root=useRef<Group>(null),body=useRef<Group>(null),leftArm=useRef<Group>(null),rightArm=useRef<Group>(null),leftLeg=useRef<Group>(null),rightLeg=useRef<Group>(null),chest=useRef<Mesh>(null),head=useRef<Mesh>(null);
 useFrame(()=>{
  const e:InfectedSnapshot|undefined=runtime.enemies.snapshotById(id);if(!e||!root.current||!body.current)return;
  root.current.visible=e.state!=='dead'||e.deathAge<2.5;root.current.position.set(e.x,0,e.z);root.current.rotation.y=e.yaw;
  const dying=e.state==='dead',death=Math.min(1,e.deathAge/.6),walking=e.state==='chase',swing=walking?Math.sin(e.walkPhase)*.5:0;
  body.current.position.y=dying?-.55*death:walking?Math.abs(Math.sin(e.walkPhase))*.035:0;
  body.current.rotation.x=dying?-1.45*death:e.state==='windup'?.28:e.state==='active'?-.4:e.state==='hurt'?-.27:.11;
  body.current.rotation.z=dying?.16*death:e.state==='hurt'?Math.sin(e.hitFlash*25)*.13:walking?Math.sin(e.walkPhase*.5)*.055:0;
  if(leftArm.current)leftArm.current.rotation.x=swing+(e.state==='windup'?-1.8:e.state==='active'?-2.5:-.2);
  if(rightArm.current)rightArm.current.rotation.x=-swing+(e.state==='windup'?-1.8:e.state==='active'?-2.5:-.2);
  if(leftLeg.current)leftLeg.current.rotation.x=-swing*.75;if(rightLeg.current)rightLeg.current.rotation.x=swing*.75;
  if(chest.current)(chest.current.material as MeshStandardMaterial).emissive.set(e.hitFlash>0?'#d2aaa0':'#000000');
  if(head.current)(head.current.material as MeshStandardMaterial).emissive.set(e.hitFlash>0?'#b87b72':'#000000');
 });
 return <group ref={root}><group ref={body}>
  <mesh position={[0,.95,0]} castShadow><capsuleGeometry args={[.19,.7,5,10]}/><meshStandardMaterial color="#39494a" roughness={.95}/></mesh>
  <mesh ref={chest} position={[0,1.24,0]} castShadow rotation={[.12,0,0]}><boxGeometry args={[.68,.65,.34]}/><meshStandardMaterial color="#62746c" roughness={.9}/></mesh>
  <mesh position={[0,1.26,-.19]}><boxGeometry args={[.42,.37,.018]}/><meshStandardMaterial color="#9d9d82" roughness={.95}/></mesh>
  <mesh position={[0,1.26,-.206]}><boxGeometry args={[.24,.045,.02]}/><meshStandardMaterial color="#c64d4d" emissive="#461414"/></mesh>
  <mesh ref={head} position={[0,1.77,-.04]} castShadow rotation={[.14,.07,-.09]}><icosahedronGeometry args={[.245,1]}/><meshStandardMaterial color="#98a498" roughness={1}/></mesh>
  <mesh position={[-.087,1.8,-.252]}><sphereGeometry args={[.028,8,6]}/><meshBasicMaterial color="#ed6b57"/></mesh><mesh position={[.085,1.8,-.25]}><sphereGeometry args={[.028,8,6]}/><meshBasicMaterial color="#ed6b57"/></mesh>
  {[-1,1].map(side=><group key={`arm${side}`} ref={side===-1?leftArm:rightArm} position={[side*.43,1.46,0]}><mesh position={[side*.015,-.32,-.04]} castShadow rotation={[0,0,side*.12]}><capsuleGeometry args={[.105,.47,4,8]}/><meshStandardMaterial color={side===-1?'#66776e':'#536b65'} roughness={.94}/></mesh><mesh position={[side*.06,-.68,-.07]}><sphereGeometry args={[.115,8,8]}/><meshStandardMaterial color="#8c9a87"/></mesh></group>)}
  {[-1,1].map(side=><group key={`leg${side}`} ref={side===-1?leftLeg:rightLeg} position={[side*.2,.83,0]}><mesh position={[0,-.38,0]} castShadow><capsuleGeometry args={[.12,.55,4,8]}/><meshStandardMaterial color="#293a3c" roughness={.95}/></mesh><mesh position={[0,-.73,-.1]}><boxGeometry args={[.24,.15,.37]}/><meshStandardMaterial color="#1b2729"/></mesh></group>)}
 </group></group>;
}
