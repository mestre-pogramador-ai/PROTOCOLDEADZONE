import {CONTAINMENT_MODULES,DOOR} from '../../world/maps/containment';
import {createIndustrialProp,createStructuralParts,createSecurityDoorParts,partBuilder,type IndustrialPropKind} from './EnvironmentModuleKit';
export {ATLAS_TILES} from './EnvironmentTypes';
export type {EnvironmentPart,Surface} from './EnvironmentTypes';
/** Map adapter only: the reusable presentation kit has no containment dependency. */
export function createEnvironmentLayout(){
 const {parts,add,plane}=partBuilder('containment');
 for(const m of CONTAINMENT_MODULES){
  if(m.kind!=='prop'){parts.push(...createStructuralParts({...m,kind:m.kind}));continue;}
  const kind:IndustrialPropKind=m.id.startsWith('containment-pod')?'pod':m.id==='control-console'?'console':m.id==='power-cabinet'?'cabinet':m.id==='ammo-station'?'ammo':m.id.startsWith('perk-')?'perk':'crate';
  parts.push(...createIndustrialProp(m.id,kind,m.size,m.position));
 }
 // Signs are wall mounted, a few millimetres in front of lining. They do not block routes.
 plane('north-wall','banner',[0,2.68,-7.79],[3.8,.713,1]);
 for(const x of [-5.7,5.7])plane('north-wall','bio',[x,1.52,-7.79],[.78,.78,1]);
 plane('west-wall','failure',[-7.79,1.62,2.2],[1.15,.575,1],[0,Math.PI/2,0]);
 plane('south-wall','banner',[-4.8,2.7,7.79],[2.8,.525,1],[0,Math.PI,0]);
 for(const x of [-6.8,6.8]){
  add('north-wall',x<0?'cyan':'red',[x,2.72,-7.806],[.65,.14,.025],'rounded');
 }
 // Floor stencils/debris are flat, never new walkable obstructions.
 plane('floor-main','floor',[0,.003,-5.7],[2,.9,1],[-Math.PI/2,0,0]);
 for(const [x,z]of [[-3.25,-3.1],[-4.3,4.95],[-5.6,.85]])plane('floor-main','stain',[x,.003,z],[1.35,.55,1],[-Math.PI/2,0,0]);
 plane('north-wall','scuff',[3.9,.95,-7.79],[1.1,.275,1]);
 for(const x of [-6.8,6.8])for(const z of [-6,-3,0,3,6])add('floor-main','hazard',[x,.004,z],[.075,.004,.8]);
 for(const z of [-1.45,1.45])add('floor-main','hazard',[6.3,.004,z],[2.4,.004,.07]);
 return parts;
}
export function createDoorLayout(){return createSecurityDoorParts(DOOR.id,DOOR.size);}
