import type {Vec3} from './EnvironmentTypes';
export interface EnvironmentLightRig{ambient:number;sky:string;ground:string;hemisphere:number;sun:{position:Vec3;color:string;intensity:number};points:readonly{position:Vec3;color:string;intensity:number;distance:number}[]}
export const CONTAINMENT_LIGHTS:EnvironmentLightRig={ambient:.75,sky:'#b5c9ce',ground:'#454c48',hemisphere:1.35,sun:{position:[-4,10,5],intensity:1.7,color:'#e0e9e3'},points:[{position:[-3,2.95,-1],intensity:16,color:'#7ec2cb',distance:11},{position:[7,2.85,-2.8],intensity:12,color:'#d16c58',distance:8}]};
/** Static light budget: one soft shadow, no point-light shadows. Mesh luminaires
 * are separate modules and do not each create another dynamic light. */
export function EnvironmentLights({rig=CONTAINMENT_LIGHTS}:{rig?:EnvironmentLightRig}){return <>
 <ambientLight intensity={rig.ambient}/><hemisphereLight args={[rig.sky,rig.ground,rig.hemisphere]}/>
 <directionalLight position={[...rig.sun.position]} intensity={rig.sun.intensity} color={rig.sun.color} castShadow shadow-radius={3} shadow-normalBias={.025} shadow-mapSize={[1024,1024]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-camera-far={35}/>
 {rig.points.map((p,i)=><pointLight key={i} position={[...p.position]} intensity={p.intensity} color={p.color} distance={p.distance}/>)}
 </>;}
