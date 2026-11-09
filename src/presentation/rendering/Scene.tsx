import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { Runtime } from '../../app/Runtime';
import { AMMO_STATION, CONTAINMENT_MODULES, DOOR, type SolidModule } from '../../world/maps/containment';
import { PLAYER } from '../../gameplay/player/PlayerController';
import { interpolatePosition } from '../../gameplay/player/MovementMath';
import { M9Viewmodel } from './M9Viewmodel';
import { InfectedView } from './InfectedView';
const colors:Record<SolidModule['material'],string>={floor:'#26343a',wall:'#35444a',trim:'#637276',hazard:'#8d563e',glass:'#337e80'};
function Module({module}:{module:SolidModule}){return <mesh position={[...module.position]} receiveShadow castShadow={module.kind!=='floor'}><boxGeometry args={[...module.size]}/><meshStandardMaterial color={colors[module.material]} roughness={module.material==='glass'?.22:.83} metalness={module.material==='trim'?.65:.18} transparent={module.material==='glass'} opacity={module.material==='glass'?.73:1}/></mesh>}
function AmmoStationSign(){return <group position={[AMMO_STATION.position[0],1.32,AMMO_STATION.position[2]]}>
 <mesh><boxGeometry args={[.8,.18,.5]}/><meshStandardMaterial color="#78ddbd" emissive="#36af8b" emissiveIntensity={.7}/></mesh>
 <mesh position={[0,.2,0]}><boxGeometry args={[.08,.3,.08]}/><meshStandardMaterial color="#ffd269" emissive="#ffd269" emissiveIntensity={.5}/></mesh>
 </group>;}
function Door({open}:{open:boolean}){return <group position={[DOOR.position[0],DOOR.position[1]+(open?3.3:0),DOOR.position[2]]}><mesh castShadow><boxGeometry args={[...DOOR.size]}/><meshStandardMaterial color="#53666a" metalness={.75} roughness={.35}/></mesh><mesh position={[.17,.1,0]}><boxGeometry args={[.04,.3,1.8]}/><meshStandardMaterial color={open?'#63c5c0':'#c64d4d'} emissive={open?'#17615f':'#651a1a'} emissiveIntensity={1.3}/></mesh></group>}
/** Only bridge to the authoritative clock. Camera follows interpolated Rapier pose. */
export function Scene({runtime}:{runtime:Runtime}){
 const {camera}=useThree();
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
     camera.fov+=(desired-camera.fov)*Math.min(1,delta*12);
     camera.updateProjectionMatrix();
   }
   const look=runtime.getLook();
   camera.rotation.order='YXZ';
   camera.rotation.set(look.pitch,look.yaw,0);
 },-100);
 return <><color attach="background" args={['#11191f']}/><fog attach="fog" args={['#11191f',18,42]}/><ambientLight intensity={.65}/><hemisphereLight args={['#85b9b9','#1b2024',1.1]}/><directionalLight position={[-4,10,5]} intensity={2.1} castShadow shadow-mapSize={[1024,1024]}/><pointLight position={[-3,2.9,0]} intensity={13} color="#63c5c0" distance={9}/><pointLight position={[7,2.9,0]} intensity={12} color="#c64d4d" distance={8}/>{CONTAINMENT_MODULES.map(m=><Module key={m.id} module={m}/>)}<LiveDoor runtime={runtime}/><InfectedView runtime={runtime}/><M9Viewmodel runtime={runtime}/><IndustrialDetails/><AmmoStationSign/>{[-5,0,5].map(x=><group key={x} position={[x,3.36,-7.3]}><mesh><boxGeometry args={[1.9,.07,.3]}/><meshStandardMaterial color="#a6dad4" emissive="#63c5c0" emissiveIntensity={2}/></mesh></group>)}<mesh rotation={[-Math.PI/2,0,0]} position={[0,.016,0]}><planeGeometry args={[15.7,15.7]}/><meshStandardMaterial color="#25383d" roughness={.94}/></mesh></>;
}
function LiveDoor({runtime}:{runtime:Runtime}){const ref=useRef<import('three').Group>(null);useFrame(()=>{if(ref.current)ref.current.position.y=runtime.isDoorOpen()?3.3:0;});return <group ref={ref}><Door open={false}/></group>}

/** Non-colliding industrial dressing; all navigation/collision still comes from the authored map. */
function IndustrialDetails(){return <group>
 {[-5,0,5].map(x=><group key={'stripe'+x} position={[x,.028,-6.9]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.6,.16]}/><meshBasicMaterial color="#c9a15c"/></mesh></group>)}
 {[-6.8,6.8].map(x=><group key={'pipe'+x}><mesh position={[x,2.9,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.09,.09,13.8,10]}/><meshStandardMaterial color="#72858a" metalness={.7} roughness={.45}/></mesh>{[-4,0,4].map(z=><mesh key={z} position={[x,2.9,z]}><torusGeometry args={[.15,.035,6,12]}/><meshStandardMaterial color="#c28b50" metalness={.6}/></mesh>)}</group>)}
 <mesh position={[0,2.8,-7.48]}><boxGeometry args={[2.6,.45,.06]}/><meshStandardMaterial color="#1a292c" emissive="#123e3d" emissiveIntensity={.5}/></mesh>
 <mesh position={[0,2.8,-7.43]}><planeGeometry args={[2.3,.22]}/><meshBasicMaterial color="#9ac7c1"/></mesh>
 {[-4,4].map(x=><group key={'warning'+x} position={[x,1.45,-7.43]}><mesh><boxGeometry args={[.8,.55,.06]}/><meshStandardMaterial color="#e0aa63"/></mesh><mesh position={[0,0,.04]} rotation={[0,0,Math.PI]}><coneGeometry args={[.23,.4,3]}/><meshBasicMaterial color="#1b292b"/></mesh></group>)}
 </group>}
