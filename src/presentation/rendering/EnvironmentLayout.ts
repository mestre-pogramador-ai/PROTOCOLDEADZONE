import {CONTAINMENT_MODULES,DOOR,type Vec3} from '../../world/maps/containment';
/** Original environment art, in metres. Decorations are attached to existing solids,
 * never used as navigation geometry. One explicit map ceiling supplies its collider. */
export const ATLAS_TILES={banner:[0,0,1024,192],bio:[0,192,256,256],console:[256,192,512,256],ammo:[768,192,256,256],cabinet:[0,448,256,256],crate:[256,448,256,256],door:[512,448,512,256],floor:[0,704,512,256],failure:[512,704,512,256],stain:[0,960,256,64],scuff:[256,960,256,64]} as const;
export type Surface='floor'|'concrete'|'paint'|'metal'|'rubber'|'hazard'|'glass'|'cyan'|'red'|'atlas';
export interface EnvironmentPart {id:string;anchor:string;shape:'box'|'rounded'|'cylinder'|'plane';position:Vec3;size:Vec3;rotation?:Vec3;surface:Surface;tile?:keyof typeof ATLAS_TILES;shadow?:boolean;}
export function createEnvironmentLayout():EnvironmentPart[]{
 const parts:EnvironmentPart[]=[];let serial=0;
 const add=(anchor:string,surface:Surface,position:Vec3,size:Vec3,shape:EnvironmentPart['shape']='box',rotation?:Vec3,tile?:EnvironmentPart['tile'])=>parts.push({id:`${anchor}/${serial++}`,anchor,surface,position,size,shape,rotation,tile,shadow:CONTAINMENT_MODULES.some(m=>m.id===anchor&&(m.kind==='prop'||m.kind==='doorFrame'))&&!['glass','atlas','cyan','red'].includes(surface)});
 const plane=(anchor:string,tile:EnvironmentPart['tile'],p:Vec3,s:Vec3,r?:Vec3)=>add(anchor,'atlas',p,s,'plane',r,tile);
 for(const m of CONTAINMENT_MODULES){
  const [x,y,z]=m.position,[w,h,d]=m.size,a=m.id;
  const box=(surface:Surface,p:Vec3,s:Vec3,rounded=false,r?:Vec3)=>add(a,surface,p,s,rounded?'rounded':'box',r);
  if(m.kind==='floor'){box('floor',m.position,m.size);continue;}
  if(m.kind==='ceiling'){
   box('concrete',m.position,m.size);
   for(const bx of [-6,-2,2,6])box('metal',[bx,3.445,0],[.09,.11,15.65]);
   for(const bz of [-6,-2,2,6])box('paint',[0,3.445,bz],[15.65,.11,.09]);
   for(const bx of [-5,0,5])for(const bz of [-5,1,6]){
    box('rubber',[bx,3.43,bz],[1.7,.12,.4],true);
    box('cyan',[bx,3.362,bz],[1.52,.015,.24]);
   }
   continue;
  }
  if(m.kind==='wall'){
   box('concrete',m.position,m.size);
   // Interior-facing lining: at most 3 cm beyond the original wall's inner face.
   const alongX=w>d,sign=alongX?(z>0?-1:1):(x>0?-1:1),length=alongX?w:d;
   const face=(yy:number,offset:number):Vec3=>alongX?[x+offset,yy,z+sign*(d/2+.01)]:[x+sign*(w/2+.01),yy,z+offset];
   const dim=(ww:number,hh:number,dd:number):Vec3=>alongX?[ww,hh,dd]:[dd,hh,ww];
   box('paint',face(1.25,0),dim(length-.1,1.65,.025));
   box('metal',face(.22,0),dim(length-.05,.34,.035));
   box('metal',face(2.18,0),dim(length-.05,.07,.035));
   box('paint',face(3.08,0),dim(length-.05,.36,.025));
   const count=Math.max(1,Math.round(length/2));
   for(let i=0;i<=count;i++)box('metal',face(1.75,-length/2+.08+i*(length-.16)/count),dim(.045,3.38,.035));
   // Service conduits are flush to the wall, above combat sightlines.
   for(const yy of [2.61,2.73])add(a,'metal',face(yy,0),[.022,length-.1,.022],'cylinder',alongX?[0,0,Math.PI/2]:[Math.PI/2,0,0]);
   for(let i=0;i<count;i++)box('rubber',face(2.67,-length/2+1+i*length/count),dim(.08,.24,.04));
   continue;
  }
  if(m.kind==='doorFrame'){box('metal',m.position,m.size,true);continue;}
  if(a.startsWith('containment-pod')){
   box('paint',[x,.24,z],[w-.05,.48,d-.05],true);
   box('rubber',[x,.5,z],[w-.08,.05,d-.08]);
   box('metal',[x,1.34,z],[w-.02,.11,d-.02],true);
   for(const xx of [-1,1])for(const zz of [-1,1])box('metal',[x+xx*(w/2-.055),.9,z+zz*(d/2-.055)],[.09,.8,.09],true);
   // Only two translucent sheets; sides remain open for legible machinery.
   for(const zz of [-1,1])box('glass',[x,.92,z+zz*(d/2-.04)],[w-.18,.72,.025]);
   box('rubber',[x,.63,z],[1.25,.15,.65],true);
   for(const xx of [-.58,.58])box('metal',[x+xx,.88,z],[.11,.48,.45],true);
   box('cyan',[x,1.29,z+d/2-.02],[1.4,.025,.018]);
   plane(a,'crate',[x,.25,z+d/2-.02],[.68,.26,1]);
  }else if(a==='control-console'){
   box('paint',[x,.38,z],[w-.06,.76,d-.06],true);
   box('rubber',[x,.08,z],[w-.08,.16,d-.08]);
   box('metal',[x,.875,z],[w-.02,.12,.66],true,[.48,0,0]);
   plane(a,'console',[x,.934,z+.03],[1.55,.46,1],[-Math.PI/2+.48,0,0]);
   for(let i=0;i<9;i++)box('rubber',[x-.6+i*.15,.37,z+d/2-.014],[.06,.32,.012]);
   box('cyan',[x,.7,z+d/2-.015],[1.7,.024,.015]);
  }else if(a==='power-cabinet'){
   box('rubber',m.position,[w-.08,h-.04,d-.08],true);
   box('paint',[x+.018,y,z],[w-.05,h-.08,d-.08],true);
   for(const zz of [-.3,.3]){
    box('metal',[x+w/2-.01,.95,z+zz],[.015,1.65,.54],true);
    box('rubber',[x+w/2,1,z+zz-.17],[.008,.3,.035]);
    for(let i=0;i<5;i++)box('rubber',[x+w/2+.002,.28+i*.065,z+zz],[.008,.023,.4]);
   }
   plane(a,'cabinet',[x+w/2+.005,1.4,z],[.7,.47,1],[0,Math.PI/2,0]);
   box('red',[x+w/2+.003,1.75,z-.4],[.006,.045,.1]);
  }else if(a.startsWith('medical-crate')||a==='corridor-crate'){
   box('paint',m.position,[w-.025,h-.025,d-.025],true);
   for(const xx of [-1,1])for(const zz of [-1,1])box('rubber',[x+xx*(w/2-.07),y,z+zz*(d/2-.07)],[.13,h,.13],true);
   for(const xx of [-.28,.28]){
    box('metal',[x+xx*w,y+h/2-.04,z],[.07,.075,d-.04]);
    box('metal',[x+xx*w,y+.22*h,z+d/2-.016],[.09,.14,.025],true);
   }
   plane(a,'crate',[x,y,z+d/2-.006],[w*.62,h*.5,1]);
  }else if(a==='ammo-station'||a.startsWith('perk-')){
   box('rubber',m.position,[w-.08,h-.02,d-.07],true);
   box('paint',[x,y+.02,z],[w-.065,h-.08,d-.025],true);
   // Ammo faces +Z; perks face -Z (toward the centre of the room).
   const sign=a==='ammo-station'?1:-1,front=z+sign*(d/2-.007);
   box('metal',[x,.1,z],[w,.2,d],true);
   for(let i=0;i<4;i++)box('rubber',[x,.22+i*.07,front],[w*.65,.028,.012]);
   box('rubber',[x,h*.67,front],[w*.82,.38,.018],true);
   if(a==='ammo-station'){
    plane(a,'ammo',[x,h*.67,front+.012],[w*.73,.29,1]);
    box('cyan',[x,1.15,z+d/2-.007],[w*.74,.045,.012]);
   }else{
    box('metal',[x,.85,front],[w*.6,.22,.015],true);
    box('rubber',[x,.85,front+.004],[w*.43,.08,.013]);
   }
  }
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
/** Coordinates local to the existing moving door; no independent physics or purchases. */
export function createDoorLayout():EnvironmentPart[]{
 const a=DOOR.id;const parts:EnvironmentPart[]=[];
 const add=(surface:Surface,p:Vec3,s:Vec3,shape:EnvironmentPart['shape']='box',tile?:EnvironmentPart['tile'])=>parts.push({id:`${a}/${parts.length}`,anchor:a,surface,position:p,size:s,shape,tile,rotation:shape==='plane'?[0,-Math.PI/2,0]:undefined,shadow:true});
 add('rubber',[0,0,0],[.22,3,2.9],'rounded');
 for(const z of [-.735,.735]){
  add('paint',[-.009,0,z],[.245,2.87,1.39],'rounded');
  add('metal',[-.134,-.65,z],[.012,.07,1.25]);
  add('metal',[-.134,.65,z],[.012,.07,1.25]);
 }
 add('atlas',[-.146,.38,0],[1.95,.975,1],'plane','door');
 for(const z of [-1.3,1.3])add('red',[-.144,0,z],[.014,2.4,.035]);
 return parts;
}
