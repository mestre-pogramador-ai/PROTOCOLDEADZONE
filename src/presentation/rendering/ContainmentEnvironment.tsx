import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {MeshStandardMaterial,type Group} from 'three';
import type {Runtime} from '../../app/Runtime';
import {DOOR} from '../../world/maps/containment';
import {createEnvironmentLayout,createDoorLayout} from './EnvironmentLayout';
import {buildEnvironmentBatches,disposeEnvironmentBatches,type EnvironmentBatch} from './EnvironmentGeometry';
import {useRoomSurfaces} from './RoomSurfaces';
import {PerkMachines} from './PerkMachines';
export function ContainmentEnvironment({runtime}:{runtime:Runtime}){
 const resources=useRoomSurfaces();
 const doorStatus=useMemo(()=>(resources.materials.red as MeshStandardMaterial).clone(),[resources]);
 const lastOpen=useRef<boolean|null>(null);
 useEffect(()=>()=>doorStatus.dispose(),[doorStatus]);
 const batches=useMemo(()=>buildEnvironmentBatches(createEnvironmentLayout(),p=>p.anchor.includes('corridor')?'corridor':'room'),[]);
 const door=useMemo(()=>buildEnvironmentBatches(createDoorLayout()),[]);
 useEffect(()=>()=>{disposeEnvironmentBatches(batches);disposeEnvironmentBatches(door);},[batches,door]);
 const doorRef=useRef<Group>(null);
 useFrame(()=>{if(doorRef.current){const open=runtime.isDoorOpen(),y=DOOR.position[1]+(open?3.3:0);if(doorRef.current.position.y!==y)doorRef.current.position.y=y;if(lastOpen.current!==open){lastOpen.current=open;doorStatus.color.set(open?'#94d8c9':'#df6e58');doorStatus.emissive.set(open?'#428f89':'#c14836');}}});
 const draw=(batch:EnvironmentBatch,isDoor=false)=><mesh key={batch.bucket+batch.surface+batch.castShadow} name={`environment-${batch.surface}`} geometry={batch.geometry} material={isDoor&&batch.surface==='red'?doorStatus:resources.materials[batch.surface]} castShadow={batch.castShadow} receiveShadow={batch.receiveShadow} dispose={null}/>;
 return <group name="containment-environment">
  <group name="environment-static">{batches.map(b=>draw(b))}</group>
  <group name="environment-door" ref={doorRef} position={[...DOOR.position]}>{door.map(b=>draw(b,true))}</group>
  <PerkMachines/>
 </group>;
}
