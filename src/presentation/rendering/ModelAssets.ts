import {useEffect,useState} from 'react';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {BufferGeometry,Mesh,SkinnedMesh,MeshStandardMaterial,Texture,type Material} from 'three';
import {diagnostics} from '../../core/diagnostics/Diagnostics';
export const MODEL_PATHS={
 m9:'assets/models/weapons/m9-service.glb',
 arms:'assets/models/viewmodels/operator-arms.glb',
 infected:'assets/models/characters/infected-worker.glb',
 hunter:'assets/models/characters/infected-hunter.glb',
} as const;
interface Entry {refs:number;promise:Promise<GLTF>;value?:GLTF;timer?:ReturnType<typeof setTimeout>}
const entries=new Map<string,Entry>();
const extraGeometry=new WeakMap<GLTF,BufferGeometry>();
const extraMaterials=new WeakMap<GLTF,Map<string,MeshStandardMaterial>>();
export function modelUrl(path:string,base=document.baseURI,prefix=import.meta.env.BASE_URL):string{
 return new URL(prefix+path,base).href;
}
function disposeModel(gltf:GLTF):void{
 const materials=new Set<Material>(),textures=new Set<Texture>();
 gltf.scene.traverse(o=>{
  if(!(o instanceof Mesh))return;
  o.geometry.dispose();
  for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
 });
 for(const m of extraMaterials.get(gltf)?.values()??[])materials.add(m);
 for(const m of materials){
  for(const value of Object.values(m))if(value instanceof Texture)textures.add(value);
  m.dispose();
 }
 const images=new Set<{close?:()=>void}>();
 for(const texture of textures){if(texture.image)images.add(texture.image);texture.dispose();}
 for(const image of images)image.close?.();
 extraMaterials.delete(gltf);extraGeometry.get(gltf)?.dispose();extraGeometry.delete(gltf);
}
function retire(path:string,entry:Entry){
 clearTimeout(entry.timer);
 entry.timer=setTimeout(()=>{
  if(entry.refs||!entry.value)return;
  disposeModel(entry.value);if(entries.get(path)===entry)entries.delete(path);
 },300);
}
export function acquireModel(path:string){
 let entry=entries.get(path);
 if(!entry){
  const loader=new GLTFLoader();
  entry={refs:0,promise:Promise.resolve(null as unknown as GLTF)};
  const current=entry;
  entry.promise=loader.loadAsync(modelUrl(path)).then(value=>{
   current.value=value;if(!current.refs)retire(path,current);
   diagnostics.record('info','visual.modelLoaded',{bytesKnown:true});return value;
  }).catch(error=>{if(entries.get(path)===current)entries.delete(path);diagnostics.record('error','visual.modelLoadFailed');throw error;});
  entries.set(path,entry);
 }
 clearTimeout(entry.timer);entry.refs++;
 const current=entry;let released=false;
 return {ready:entry.promise,release:()=>{if(released)return;released=true;current.refs--;if(!current.refs)retire(path,current);}};
}
export function acquireVisualBundle(){
 const handles=Object.values(MODEL_PATHS).map(acquireModel);
 return {ready:Promise.all(handles.map(h=>h.ready)),release:()=>handles.forEach(h=>h.release())};
}
export function useModel(path:string):GLTF|null{
 const [model,setModel]=useState<GLTF|null>(null);
 useEffect(()=>{
  let cancelled=false;const handle=acquireModel(path);
  handle.ready.then(value=>{if(!cancelled)setModel(value);}).catch(()=>{});
  return ()=>{cancelled=true;handle.release();};
 },[path]);
 return model;
}
export function variantMaterial(gltf:GLTF,key:string,color:string):MeshStandardMaterial {
 let cache=extraMaterials.get(gltf);if(!cache){cache=new Map();extraMaterials.set(gltf,cache);}
 let material=cache.get(key);
 if(!material){
  let original:MeshStandardMaterial|undefined;
  gltf.scene.traverse(o=>{if(o instanceof Mesh&&o.material instanceof MeshStandardMaterial)original=o.material;});
  material=original?.clone()??new MeshStandardMaterial();
  material.color.set(color);material.metalness=0;material.roughness=.92;cache.set(key,material);
 }
 return material;
}
export function modelCacheSnapshot(){return [...entries].map(([path,e])=>({path,refs:e.refs,loaded:!!e.value}));}

export function remappedLodGeometry(base:GLTF,lod:GLTF):BufferGeometry{
 const cached=extraGeometry.get(base);if(cached)return cached;
 let original:SkinnedMesh|undefined,low:SkinnedMesh|undefined;
 base.scene.traverse(o=>{if(o instanceof SkinnedMesh)original=o;});
 lod.scene.traverse(o=>{if(o instanceof SkinnedMesh)low=o;});
 if(!original||!low)throw new Error('LOD requires skinned meshes');
 // Blender exports the derived mesh in world units; original FBX-derived mesh
 // carries a 107x node scale. Put LOD vertices in the original mesh's bind space.
 const mapping=low.skeleton.bones.map(b=>original!.skeleton.bones.findIndex(target=>target.name===b.name));
 if(mapping.some(i=>i<0))throw new Error('Incompatible LOD bones');
 // Use inverse bind matrices, not node transforms: the two exporters encode
 // different geometry units even when their mesh world scales are identical.
 const bindTransform=original.skeleton.boneInverses[mapping[0]].clone().invert().multiply(low.skeleton.boneInverses[0]);
 const geometry=low.geometry.clone().applyMatrix4(bindTransform);
 const indices=geometry.getAttribute('skinIndex');
 for(let i=0;i<indices.count;i++)for(let j=0;j<4;j++)indices.setComponent(i,j,mapping[indices.getComponent(i,j)]);
 indices.needsUpdate=true;extraGeometry.set(base,geometry);return geometry;
}
