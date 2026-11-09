import {BufferGeometry,BoxGeometry,CylinderGeometry,PlaneGeometry,Float32BufferAttribute,Matrix4,Euler,Quaternion,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ATLAS_TILES,type EnvironmentPart,type Surface} from './EnvironmentLayout';
export interface EnvironmentBatch{surface:Surface;geometry:BufferGeometry;castShadow:boolean;receiveShadow:boolean;}
/** Flat bevels for industrial housings: 44 triangles instead of 108 for a
 * one-segment rounded box. No dense curved mesh on small machine edges. */
function beveledBox(w:number,h:number,d:number):BufferGeometry{
 const half=[w/2,h/2,d/2],r=Math.min(.035,w/5,h/5,d/5),vertices:number[]=[];
 const face=(points:number[][],normal:Vector3)=>{
  const a=new Vector3(...points[0] as [number,number,number]),b=new Vector3(...points[1] as [number,number,number]),c=new Vector3(...points[2] as [number,number,number]);
  if(b.sub(a).cross(c.sub(a)).dot(normal)<0)points.reverse();
  for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);
 };
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const b=(axis+1)%3,c=(axis+2)%3,n=new Vector3().setComponent(axis,sign);
  face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([sb,sc])=>{const p=[0,0,0];p[axis]=sign*half[axis];p[b]=sb*(half[b]-r);p[c]=sc*(half[c]-r);return p;}),n);
 }
 for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const sa of [-1,1])for(const sb of [-1,1]){
  const c=3-a-b,n=new Vector3().setComponent(a,sa).setComponent(b,sb);
  const point=(outerA:boolean,sc:number)=>{const p=[0,0,0];p[a]=sa*(half[a]-(outerA?0:r));p[b]=sb*(half[b]-(outerA?r:0));p[c]=sc*(half[c]-r);return p;};
  face([point(true,-1),point(false,-1),point(false,1),point(true,1)],n);
 }
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const signs=[sx,sy,sz];face([0,1,2].map(axis=>half.map((v,i)=>signs[i]*(v-(i===axis?0:r)))),new Vector3(sx,sy,sz));
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));g.computeVertexNormals();return g;
}
/** Meter-based UVs avoid the stretched wall textures of the original block renderer. */
export function createPartGeometry(part:EnvironmentPart):BufferGeometry{
 const [w,h,d]=part.size;
 let g:BufferGeometry;
 if(part.shape==='plane')g=new PlaneGeometry(w,h);
 else if(part.shape==='cylinder')g=new CylinderGeometry(w/2,w/2,h,8,1);
 else if(part.shape==='rounded')g=beveledBox(w,h,d);
 else g=new BoxGeometry(w,h,d);
 if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}
 const transform=new Matrix4().compose(new Vector3(...part.position),new Quaternion().setFromEuler(new Euler(...(part.rotation??[0,0,0]))),new Vector3(1,1,1));
 g.applyMatrix4(transform);
 const uv=g.getAttribute('uv');
 if(part.tile){
  const [x,y,tw,th]=ATLAS_TILES[part.tile],pad=3;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(x+pad+uv.getX(i)*(tw-2*pad))/1024,1-(y+th-pad-uv.getY(i)*(th-2*pad))/1024);
 }else if(['floor','concrete','paint','metal'].includes(part.surface)){
  const p=g.getAttribute('position'),n=g.getAttribute('normal');
  for(let i=0;i<p.count;i++){
   const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
   const scale=part.surface==='floor'?1.6:2;
   uv.setXY(i,(nx>ny&&nx>nz?p.getZ(i):p.getX(i))/scale,(ny>nx&&ny>nz?p.getZ(i):p.getY(i))/scale);
  }
 }
 // A common vertex layout allows boxes, cylinders and bevelled meshes to share one draw.
 if(!g.getAttribute('uv'))g.setAttribute('uv',new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
 return g;
}
export function buildEnvironmentBatches(parts:readonly EnvironmentPart[]):EnvironmentBatch[]{
 const grouped=new Map<string,{surface:Surface;shadow:boolean;pieces:BufferGeometry[]}>();
 try{
  for(const p of parts){const key=p.surface+'/'+Boolean(p.shadow),group=grouped.get(key)??{surface:p.surface,shadow:Boolean(p.shadow),pieces:[]};group.pieces.push(createPartGeometry(p));grouped.set(key,group);}
  const batches:EnvironmentBatch[]=[];
  for(const {surface,shadow,pieces}of grouped.values()){
   const geometry=mergeGeometries(pieces);if(!geometry)throw new Error(`Cannot batch environment surface ${surface}`);
   // Roof/walls never cast the sun's shadow indoors. Props remain grounded by the
   // single soft shadow; indirect room illumination is represented by hemi/ambient.
   batches.push({surface,geometry,castShadow:shadow,receiveShadow:shadow||surface==='floor'});
  }
  return batches;
 }finally{for(const {pieces} of grouped.values())for(const g of pieces)g.dispose();}
}
export function disposeEnvironmentBatches(batches:readonly EnvironmentBatch[]){for(const batch of batches)batch.geometry.dispose();}
