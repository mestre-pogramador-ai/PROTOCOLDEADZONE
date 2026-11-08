import { Box3, Euler, Ray, Vector3 } from 'three';
import { CONTAINMENT_MODULES, DOOR } from '../../world/maps/containment';
export interface ShotTrace { id: number; start: [number,number,number]; end: [number,number,number]; hit: boolean; surfaceId: string | null; damage: number }
export interface ShotQuery { origin: readonly [number,number,number]; yaw: number; pitch: number; maxDistance: number; doorOpen: boolean; id: number; damage: number }
/** Deterministic static AABB query matching M1 box colliders; replace with shared physics queries when adding dynamic targets in M4. */
export function traceContainmentShot(q: ShotQuery): ShotTrace {
  const origin=new Vector3(...q.origin);
  const direction=new Vector3(0,0,-1).applyEuler(new Euler(q.pitch,q.yaw,0,'YXZ')).normalize();
  const ray=new Ray(origin,direction);
  let closest=q.maxDistance;
  let surfaceId:string|null=null;
  const hitPoint=new Vector3();
  for (const m of CONTAINMENT_MODULES) {
    if(!m.collision)continue;
    const half=new Vector3(...m.size).multiplyScalar(.5);
    const center=new Vector3(...m.position);
    const point=ray.intersectBox(new Box3(center.clone().sub(half),center.clone().add(half)),new Vector3());
    if(point){const dist=point.distanceTo(origin);if(dist<closest&&dist>.0001){closest=dist;surfaceId=m.id;hitPoint.copy(point);}}
  }
  if(!q.doorOpen){
    const center=new Vector3(...DOOR.position),half=new Vector3(...DOOR.size).multiplyScalar(.5);
    const point=ray.intersectBox(new Box3(center.clone().sub(half),center.clone().add(half)),new Vector3());
    if(point){const dist=point.distanceTo(origin);if(dist<closest&&dist>.0001){closest=dist;surfaceId=DOOR.id;hitPoint.copy(point);}}
  }
  const end=surfaceId?hitPoint:origin.clone().addScaledVector(direction,closest);
  return {id:q.id,start:[origin.x,origin.y,origin.z],end:[end.x,end.y,end.z],hit:surfaceId!==null,surfaceId,damage:q.damage};
}
