import {PerkMachines} from './PerkMachines';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect,useMemo,useRef } from 'react';
import {CatmullRomCurve3,PCFSoftShadowMap,TubeGeometry,Vector3,type Texture} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {useRoomSurfaces} from './RoomSurfaces';
import type { Runtime } from '../../app/Runtime';
import { AMMO_STATION, CONTAINMENT_MODULES, DOOR, type SolidModule } from '../../world/maps/containment';
import { PLAYER } from '../../gameplay/player/PlayerController';
import { interpolatePosition } from '../../gameplay/player/MovementMath';
import { M9Viewmodel } from './M9Viewmodel';
import { InfectedView } from './InfectedView';
const colors:Record<SolidModule['material'],string>={floor:'#26343a',wall:'#35444a',trim:'#637276',hazard:'#8d563e',glass:'#337e80'};
function Module({module,surface}:{module:SolidModule;surface?:Texture}){return <mesh position={[...module.position]} receiveShadow castShadow={module.kind!=='floor'}><boxGeometry args={[...module.size]}/><meshStandardMaterial map={surface} color={colors[module.material]} roughness={module.material==='glass'?.22:.83} metalness={module.material==='trim'?.65:.18} transparent={module.material==='glass'} opacity={module.material==='glass'?.73:1}/></mesh>}
function AmmoStationSign(){return <group position={[AMMO_STATION.position[0],1.32,AMMO_STATION.position[2]]}>
 <mesh><boxGeometry args={[.8,.18,.5]}/><meshStandardMaterial color="#78ddbd" emissive="#36af8b" emissiveIntensity={.7}/></mesh>
 <mesh position={[0,.2,0]}><boxGeometry args={[.08,.3,.08]}/><meshStandardMaterial color="#ffd269" emissive="#ffd269" emissiveIntensity={.5}/></mesh>
 </group>;}
function Door({open}:{open:boolean}){return <group position={[DOOR.position[0],DOOR.position[1]+(open?3.3:0),DOOR.position[2]]}><mesh castShadow><boxGeometry args={[...DOOR.size]}/><meshStandardMaterial color="#53666a" metalness={.75} roughness={.35}/></mesh><mesh position={[.17,.1,0]}><boxGeometry args={[.04,.3,1.8]}/><meshStandardMaterial color={open?'#63c5c0':'#c64d4d'} emissive={open?'#17615f':'#651a1a'} emissiveIntensity={1.3}/></mesh></group>}
/** Only bridge to the authoritative clock. Camera follows interpolated Rapier pose. */
export function Scene({runtime,groundingEnabled=true}:{runtime:Runtime;groundingEnabled?:boolean}){
 const {camera,gl}=useThree();
 const surfaces=useRoomSurfaces();
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
 return <><color attach="background" args={['#11191f']}/><fog attach="fog" args={['#11191f',18,42]}/><ambientLight intensity={.65}/><hemisphereLight args={['#85b9b9','#1b2024',1.1]}/><directionalLight position={[-4,10,5]} intensity={2.1} castShadow shadow-radius={3} shadow-normalBias={.03} shadow-mapSize={[1024,1024]}/><pointLight position={[-3,2.9,0]} intensity={13} color="#63c5c0" distance={9}/><pointLight position={[7,2.9,-3]} intensity={12} color="#c64d4d" distance={8}/>{CONTAINMENT_MODULES.map(m=><Module key={m.id} module={m} surface={m.material==='wall'?surfaces.wall:undefined}/>)}<LiveDoor runtime={runtime}/><InfectedView runtime={runtime} groundingEnabled={groundingEnabled}/><M9Viewmodel runtime={runtime}/><IndustrialDetails containment={surfaces.containment} warning={surfaces.warning}/><AmmoStationSign/><PerkMachines/>{[-5,0,5].map(x=><group key={x} position={[x,3.36,-7.3]}><mesh><boxGeometry args={[1.9,.07,.3]}/><meshStandardMaterial color="#a6dad4" emissive="#63c5c0" emissiveIntensity={2}/></mesh></group>)}<mesh rotation={[-Math.PI/2,0,0]} position={[0,.016,0]}><planeGeometry args={[15.7,15.7]}/><meshStandardMaterial map={surfaces.floor} color="#7d9292" metalness={.12} roughness={.94}/></mesh></>;
}
function LiveDoor({runtime}:{runtime:Runtime}){const ref=useRef<import('three').Group>(null);useFrame(()=>{if(ref.current)ref.current.position.y=runtime.isDoorOpen()?3.3:0;});return <group ref={ref}><Door open={false}/></group>}

/** Non-colliding industrial dressing; all navigation/collision still comes from the authored map. */
function IndustrialDetails({containment,warning}:{containment:Texture;warning:Texture}){
 const cables=useMemo(()=>{
  const pieces=[-7,7].flatMap(x=>[0,.13].map(offset=>new TubeGeometry(new CatmullRomCurve3([new Vector3(x+offset,3.22,7),new Vector3(x+offset,3.1,2),new Vector3(x+offset,3.18,-3),new Vector3(x+offset,3.22,-7.7)]),32,.018,5,false)));
  const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());return merged;
 },[]);
 useEffect(()=>()=>cables.dispose(),[cables]);
 return <group>
 <mesh geometry={cables}><meshStandardMaterial color="#222b2c" roughness={.88}/></mesh>
 {[-6.4,6.4].map(x=><group key={'emergency'+x} position={[x,2.75,-7.78]}><mesh><boxGeometry args={[.7,.14,.04]}/><meshStandardMaterial color={x<0?'#66bfc2':'#b8554a'} emissive={x<0?'#286c72':'#6d231d'} emissiveIntensity={1}/></mesh></group>)}
 {[-5,0,5].map(x=><group key={'stripe'+x} position={[x,.028,-6.9]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.6,.16]}/><meshBasicMaterial color="#c9a15c"/></mesh></group>)}
 {[-6.8,6.8].map(x=><group key={'pipe'+x}><mesh position={[x,2.9,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.09,.09,13.8,10]}/><meshStandardMaterial color="#72858a" metalness={.7} roughness={.45}/></mesh>{[-4,0,4].map(z=><mesh key={z} position={[x,2.9,z]}><torusGeometry args={[.15,.035,6,12]}/><meshStandardMaterial color="#c28b50" metalness={.6}/></mesh>)}</group>)}
 <mesh position={[0,2.75,-7.8]}><boxGeometry args={[2.8,.74,.04]}/><meshStandardMaterial color="#1a292c" metalness={.6} roughness={.6}/></mesh>
 <mesh position={[0,2.75,-7.774]}><planeGeometry args={[2.65,.66]}/><meshBasicMaterial map={containment}/></mesh>
 {[-4.7,4.7].map(x=><mesh key={'warning'+x} position={[x,1.6,-7.79]}><planeGeometry args={[.85,.85]}/><meshStandardMaterial map={warning} roughness={.9}/></mesh>)}
 </group>}
