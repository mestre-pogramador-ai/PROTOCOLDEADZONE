import {Euler,Quaternion,Vector3} from 'three';
import type {Vec3,EnvironmentPart,Surface} from './EnvironmentTypes';
/** Pure presentation kit: no Runtime, map singleton, physics, purchase or spawn dependency. */
export interface VisualModuleSpec{id:string;position:Vec3;size:Vec3;kind:'floor'|'wall'|'ceiling'|'doorFrame'}
export type IndustrialPropKind='pod'|'console'|'cabinet'|'crate'|'ammo'|'perk';
export function partBuilder(anchor:string,shadow=false){
 const parts:EnvironmentPart[]=[];
 const add=(a:string,surface:Surface,position:Vec3,size:Vec3,shape:EnvironmentPart['shape']='box',rotation?:Vec3,tile?:EnvironmentPart['tile'])=>parts.push({id:`${a}/${parts.length}`,anchor:a,surface,position,size,shape,rotation,tile,shadow:shadow&&!['glass','atlas','cyan','red'].includes(surface)});
 const box=(surface:Surface,p:Vec3,s:Vec3,rounded=false,r?:Vec3)=>add(anchor,surface,p,s,rounded?'rounded':'box',r);
 const plane=(a:string,tile:EnvironmentPart['tile'],p:Vec3,s:Vec3,r?:Vec3)=>add(a,'atlas',p,s,'plane',r,tile);
 return{parts,add,box,plane};
}
export function centredSlots(length:number,spacing:number):number[]{const count=Math.max(1,Math.floor(length/spacing));return Array.from({length:count},(_,i)=>(i-(count-1)/2)*spacing);}
export function createLuminaire(anchor:string,position:Vec3):EnvironmentPart[]{
 const {parts,box}=partBuilder(anchor);box('rubber',position,[1.7,.12,.4],true);box('cyan',[position[0],position[1]-.068,position[2]],[1.52,.015,.24]);return parts;
}
export function createConduit(id:string,anchor:string,position:Vec3,length:number,axis:'x'|'z'):EnvironmentPart{return{id,anchor,surface:'metal',position,size:[.022,length,.022],shape:'cylinder',rotation:axis==='x'?[0,0,Math.PI/2]:[Math.PI/2,0,0],shadow:false};}
export function createPanel(anchor:string,tile:EnvironmentPart['tile'],position:Vec3,size:Vec3,rotation?:Vec3):EnvironmentPart{return{id:anchor+'/panel',anchor,surface:'atlas',position,size,shape:'plane',rotation,tile,shadow:false};}
export function placeVisualParts(parts:readonly EnvironmentPart[],position:Vec3,yaw=0):EnvironmentPart[]{
 const q=new Quaternion().setFromEuler(new Euler(0,yaw,0));return parts.map(p=>{const point=new Vector3(...p.position).applyQuaternion(q).add(new Vector3(...position)),r=new Euler().setFromQuaternion(q.clone().multiply(new Quaternion().setFromEuler(new Euler(...(p.rotation??[0,0,0])))));return{...p,position:point.toArray() as [number,number,number],rotation:p.rotation||yaw?[r.x,r.y,r.z]:undefined};});
}
export function createStructuralParts(m:VisualModuleSpec,options:{wallAxis?:'x'|'z';faceSign?:1|-1}={}):EnvironmentPart[]{
 const {parts,box}=partBuilder(m.id,m.kind==='doorFrame');const[x,y,z]=m.position,[w,h,d]=m.size,a=m.id;
  if(m.kind==='floor'){box('floor',m.position,m.size);return parts;}
  if(m.kind==='ceiling'){
   box('concrete',m.position,m.size);
   for(const bx of centredSlots(w,4).map(v=>x+v))box('metal',[bx,y-h/2-.055,z],[.09,.11,d-.35]);
   for(const bz of centredSlots(d,4).map(v=>z+v))box('paint',[x,y-h/2-.055,bz],[w-.35,.11,.09]);
   for(const bx of [-5,0,5].map(v=>x+v*w/16))for(const bz of [-5,1,6].map(v=>z+v*d/16)){
    parts.push(...createLuminaire(`${a}/lamp-${bx}-${bz}`,[bx,y-h/2-.07,bz]).map(p=>({...p,anchor:a})));
   }
   return parts;
  }
  if(m.kind==='wall'){
   box('concrete',m.position,m.size);
   // Interior-facing lining: at most 3 cm beyond the original wall's inner face.
   const alongX=options.wallAxis?options.wallAxis==='x':w>d,sign=options.faceSign??(alongX?(z>0?-1:1):(x>0?-1:1)),length=alongX?w:d;
   const face=(yy:number,offset:number):Vec3=>alongX?[x+offset,y-h/2+yy*h/3.5,z+sign*(d/2+.01)]:[x+sign*(w/2+.01),y-h/2+yy*h/3.5,z+offset];
   const dim=(ww:number,hh:number,dd:number):Vec3=>alongX?[ww,hh*h/3.5,dd]:[dd,hh*h/3.5,ww];
   box('paint',face(1.25,0),dim(length-.1,1.65,.025));
   box('metal',face(.22,0),dim(length-.05,.34,.035));
   box('metal',face(2.18,0),dim(length-.05,.07,.035));
   box('paint',face(3.08,0),dim(length-.05,.36,.025));
   const count=Math.max(1,Math.round(length/2));
   for(let i=0;i<=count;i++)box('metal',face(1.75,-length/2+.08+i*(length-.16)/count),dim(.045,3.38,.035));
   // Service conduits are flush to the wall, above combat sightlines.
   for(const yy of [2.61,2.73])parts.push(createConduit(`${a}/pipe-${yy}`,a,face(yy,0),length-.1,alongX?'x':'z'));
   for(let i=0;i<count;i++)box('rubber',face(2.67,-length/2+1+i*length/count),dim(.08,.24,.04));
   return parts;
  }
  if(m.kind==='doorFrame'){box('metal',m.position,m.size,true);return parts;}
 return parts;
}
export function createIndustrialProp(id:string,kind:IndustrialPropKind,size:Vec3,position:Vec3,yaw=0):EnvironmentPart[]{
 const m={id,position:[0,size[1]/2,0] as Vec3,size};
 const {parts,box,plane}=partBuilder(id,true);const[x,y,z]=m.position,[w,h,d]=m.size,a=id;
  if(kind==='pod'){
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
  }else if(kind==='console'){
   box('paint',[x,.38,z],[w-.06,.76,d-.06],true);
   box('rubber',[x,.08,z],[w-.08,.16,d-.08]);
   box('metal',[x,.875,z],[w-.02,.12,.66],true,[.48,0,0]);
   plane(a,'console',[x,.934,z+.03],[1.55,.46,1],[-Math.PI/2+.48,0,0]);
   for(let i=0;i<9;i++)box('rubber',[x-.6+i*.15,.37,z+d/2-.014],[.06,.32,.012]);
   box('cyan',[x,.7,z+d/2-.015],[1.7,.024,.015]);
  }else if(kind==='cabinet'){
   box('rubber',m.position,[w-.08,h-.04,d-.08],true);
   box('paint',[x+.018,y,z],[w-.05,h-.08,d-.08],true);
   for(const zz of [-.3,.3]){
    box('metal',[x+w/2-.01,.95,z+zz],[.015,1.65,.54],true);
    box('rubber',[x+w/2,1,z+zz-.17],[.008,.3,.035]);
    for(let i=0;i<5;i++)box('rubber',[x+w/2+.002,.28+i*.065,z+zz],[.008,.023,.4]);
   }
   plane(a,'cabinet',[x+w/2+.005,1.4,z],[.7,.47,1],[0,Math.PI/2,0]);
   box('red',[x+w/2+.003,1.75,z-.4],[.006,.045,.1]);
  }else if(kind==='crate'){
   box('paint',m.position,[w-.025,h-.025,d-.025],true);
   for(const xx of [-1,1])for(const zz of [-1,1])box('rubber',[x+xx*(w/2-.07),y,z+zz*(d/2-.07)],[.13,h,.13],true);
   for(const xx of [-.28,.28]){
    box('metal',[x+xx*w,y+h/2-.04,z],[.07,.075,d-.04]);
    box('metal',[x+xx*w,y+.22*h,z+d/2-.016],[.09,.14,.025],true);
   }
   plane(a,'crate',[x,y,z+d/2-.006],[w*.62,h*.5,1]);
  }else if(kind==='ammo'||kind==='perk'){
   box('rubber',m.position,[w-.08,h-.02,d-.07],true);
   box('paint',[x,y+.02,z],[w-.065,h-.08,d-.025],true);
   // Ammo faces +Z; perks face -Z (toward the centre of the room).
   const sign=kind==='ammo'?1:-1,front=z+sign*(d/2-.007);
   box('metal',[x,.1,z],[w,.2,d],true);
   for(let i=0;i<4;i++)box('rubber',[x,.22+i*.07,front],[w*.65,.028,.012]);
   box('rubber',[x,h*.67,front],[w*.82,.38,.018],true);
   if(kind==='ammo'){
    plane(a,'ammo',[x,h*.67,front+.012],[w*.73,.29,1]);
    box('cyan',[x,1.15,z+d/2-.007],[w*.74,.045,.012]);
   }else{
    box('metal',[x,.85,front],[w*.6,.22,.015],true);
    box('rubber',[x,.85,front+.004],[w*.43,.08,.013]);
   }
  }
 return placeVisualParts(parts,[position[0],position[1]-h/2,position[2]],yaw);
}
export function createSecurityDoorParts(id:string,size:Vec3):EnvironmentPart[]{
 const a=id;const parts:EnvironmentPart[]=[];
 const add=(surface:Surface,p:Vec3,s:Vec3,shape:EnvironmentPart['shape']='box',tile?:EnvironmentPart['tile'])=>parts.push({id:`${a}/${parts.length}`,anchor:a,surface,position:p,size:s,shape,tile,rotation:shape==='plane'?[0,-Math.PI/2,0]:undefined,shadow:true});
 add('rubber',[0,0,0],[.22,3,2.9],'rounded');
 for(const z of [-.735,.735]){
  add('paint',[-.009,0,z],[.245,2.87,1.39],'rounded');
  add('metal',[-.134,-.65,z],[.012,.07,1.25]);
  add('metal',[-.134,.65,z],[.012,.07,1.25]);
 }
 add('atlas',[-.146,.38,0],[1.95,.975,1],'plane','door');
 for(const z of [-1.3,1.3])add('red',[-.144,0,z],[.014,2.4,.035]);
 return parts.map(p=>({...p,position:p.position.map((v,i)=>v*size[i]/[.28,3,2.9][i]) as [number,number,number],size:p.size.map((v,i)=>p.shape==='plane'?v*(i===0?size[2]/2.9:i===1?size[1]/3:1):v*size[i]/[.28,3,2.9][i]) as [number,number,number]}));
}
