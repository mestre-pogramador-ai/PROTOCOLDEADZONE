import {Object3D,Quaternion,Vector3} from 'three';
/** Small CCD correction of the torso, leaving hips/legs and gameplay volumes intact.
 * Imported crouches may otherwise put the visible head outside the fixed headshot
 * sphere. Only correct poses outside the tolerance; retain source motion inside it.
 */
export function createHeadRetarget(root:Object3D){
 const nodes=new Map<string,Object3D>();root.traverse(o=>nodes.set(o.name.replace(/[\s_.]/g,'').toLowerCase(),o));
 const head=nodes.get('head'),top=nodes.get('headtopend');
 const names=nodes.has('bip01neck')?['bip01neck','bip01spine3','bip01spine2','bip01spine1','bip01spine']:['neck','ribs','spine'];
 const joints=names.map(n=>nodes.get(n)).filter((n):n is Object3D=>!!n);
 const center=new Vector3(),end=new Vector3(),pivot=new Vector3(),from=new Vector3(),to=new Vector3(),goal=new Vector3(),target=new Vector3();
 const wanted=new Quaternion(),correction=new Quaternion(),world=new Quaternion(),parent=new Quaternion();
 const read=()=>{head!.getWorldPosition(center);top!.getWorldPosition(end);return center.add(end).multiplyScalar(.5);};
 return {apply(x:number,z:number){
  if(!head||!top||!joints.length)return 0;
  target.set(x,1.78,z);read();const before=center.distanceTo(target);if(before<=.20)return before;
  goal.copy(center).sub(target).normalize().multiplyScalar(.17).add(target);
  for(let pass=0;pass<2;pass++)for(const joint of joints){
   read();if(center.distanceToSquared(target)<=.20*.20)return center.distanceTo(target);
   joint.getWorldPosition(pivot);from.copy(center).sub(pivot);to.copy(goal).sub(pivot);
   if(from.lengthSq()<1e-8||to.lengthSq()<1e-8)continue;
   wanted.setFromUnitVectors(from.normalize(),to.normalize());
   const angle=2*Math.acos(Math.min(1,Math.abs(wanted.w)));
   correction.identity().slerp(wanted,Math.min(1,.24/Math.max(angle,1e-6)));
   joint.getWorldQuaternion(world);world.premultiply(correction);
   joint.parent!.getWorldQuaternion(parent).invert();joint.quaternion.copy(parent.multiply(world)).normalize();
   joint.updateWorldMatrix(false,true);
  }
  return read().distanceTo(target);
 }};
}
