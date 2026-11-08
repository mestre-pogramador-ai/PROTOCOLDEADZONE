import { Vector3, Ray, Sphere } from 'three';
import type { ShotQuery, ShotTrace } from '../weapons/HitScan';
import { traceContainmentShot } from '../weapons/HitScan';
import type { InfectedSnapshot } from '../enemies/Infected';
export interface CombatTrace extends ShotTrace { enemyId:number|null; headshot:boolean }
/** First hit wins: solid environment occludes enemy spheres. */
export function traceCombatShot(query:ShotQuery,enemies:readonly InfectedSnapshot[]):CombatTrace {
 const wall=traceContainmentShot(query);const origin=new Vector3(...query.origin);const ray=new Ray(origin,new Vector3(...wall.end).sub(origin).normalize());
 const wallDistance=origin.distanceTo(new Vector3(...wall.end));let closest=wallDistance;let target:number|null=null;let headshot=false;let point:Vector3|null=null;
 for(const e of enemies){if(e.state==='dead')continue;
  const body=ray.intersectSphere(new Sphere(new Vector3(e.x,1.08,e.z),.49),new Vector3());
  const head=ray.intersectSphere(new Sphere(new Vector3(e.x,1.78,e.z),.25),new Vector3());
  for(const [hit,isHead] of [[body,false],[head,true]] as const){if(!hit)continue;const dist=origin.distanceTo(hit);if(dist<closest-1e-5&&dist<=query.maxDistance){closest=dist;target=e.id;headshot=isHead;point=hit.clone();}}
 }
 return target!==null&&point?{...wall,end:[point.x,point.y,point.z],hit:true,surfaceId:null,enemyId:target,headshot}: {...wall,enemyId:null,headshot:false};
}
