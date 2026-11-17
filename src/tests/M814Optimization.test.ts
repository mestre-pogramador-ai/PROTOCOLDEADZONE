import {describe,it,expect,vi} from 'vitest';
import {MeshStandardMaterial,Texture,ShaderChunk,Box3,Vector3} from 'three';
import before from './fixtures/m813-visual-parts.json';
import {createEnvironmentLayout,createDoorLayout} from '../presentation/rendering/EnvironmentLayout';
import {buildEnvironmentBatches,disposeEnvironmentBatches} from '../presentation/rendering/EnvironmentGeometry';
import {createIndustrialProp,createStructuralParts,createSecurityDoorParts,createLuminaire,createConduit,createPanel,placeVisualParts} from '../presentation/rendering/EnvironmentModuleKit';
import {usePackedRoughness} from '../presentation/rendering/EnvironmentShaders';
const canonical=(parts:readonly unknown[])=>JSON.parse(JSON.stringify(parts.map(part=>{const{id,...p}=part as {id?:string;[key:string]:unknown};void id;return p;}),(_key,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v));
describe('M8.1.4 environment preservation and reusable kit',()=>{
 it('preserves every M8.1.3 visual part, placement, dimension and shadow setting',()=>{
  expect(canonical(createEnvironmentLayout())).toEqual(canonical(before.room));
  expect(canonical(createDoorLayout())).toEqual(canonical(before.door));
 });
 it('keeps unique part IDs after composing structure, props and wall dressing',()=>{
  const p=createEnvironmentLayout();expect(new Set(p.map(p=>p.id)).size).toBe(p.length);
 });
 it('reuses props at elevated/rotated placements without a map or Runtime',()=>{
  const base=createIndustrialProp('test-cabinet','cabinet',[.7,1.9,1.3],[0,.95,0]);
  const moved=createIndustrialProp('test-cabinet','cabinet',[.7,1.9,1.3],[10,3.95,20],Math.PI/2);
  expect(canonical(moved)).toEqual(canonical(placeVisualParts(base,[10,3,20],Math.PI/2)));
  expect(moved.every(p=>p.anchor==='test-cabinet')).toBe(true);
 });
 it('generates floor, wall, roof, door, lights, pipes and panels without containment IDs',()=>{
  const structural=[createStructuralParts({id:'test-floor',kind:'floor',position:[0,-.25,0],size:[8,.5,8]}),createStructuralParts({id:'test-wall',kind:'wall',position:[0,1.75,-4],size:[8,3.5,.35]},{wallAxis:'x',faceSign:1}),createStructuralParts({id:'test-roof',kind:'ceiling',position:[0,3.6,0],size:[8,.2,8]})];
  for(const parts of structural){expect(parts.length).toBeGreaterThan(0);for(const p of parts){expect(p.position.every(Number.isFinite)).toBe(true);expect(p.size.every(n=>Number.isFinite(n)&&n>0)).toBe(true);expect(p.anchor).toMatch(/^test-/);}}
  expect(createSecurityDoorParts('test-door',[.28,3,2.9])).toHaveLength(10);
  expect(createLuminaire('test-lamp',[1,3,1])).toHaveLength(2);
  expect(createConduit('test-pipe','test-wall',[0,2.7,0],7,'x').shape).toBe('cylinder');
  expect(createPanel('test-panel','bio',[0,2,0],[1,1,1]).shape).toBe('plane');
 });
 it('partitions batches by reusable spatial buckets without losing geometry or shadow casters',()=>{
  const p=createEnvironmentLayout(),batches=buildEnvironmentBatches(p,part=>part.anchor.includes('corridor')?'corridor':'room');
  try{expect(new Set(batches.map(b=>b.bucket))).toEqual(new Set(['room','corridor']));
   for(const bucket of ['room','corridor'])expect(batches.filter(b=>b.bucket===bucket).length).toBeLessThanOrEqual(13);
   const reference=buildEnvironmentBatches(p);try{expect(batches.reduce((n,b)=>n+b.geometry.index!.count,0)).toBe(reference.reduce((n,b)=>n+b.geometry.index!.count,0));}finally{disposeEnvironmentBatches(reference);}
   expect(batches.some(b=>b.bucket==='corridor'&&b.castShadow)).toBe(true);
   for(const b of batches)expect(b.geometry.boundingSphere?.radius).toBeGreaterThan(0);
  }finally{disposeEnvironmentBatches(batches);}
 });
 it('indexes static geometry without changing triangle count, bounds or disposal',()=>{
  const batches=buildEnvironmentBatches(createEnvironmentLayout()),door=buildEnvironmentBatches(createDoorLayout());
  try{const all=[...batches,...door];expect(all.every(b=>b.geometry.index)).toBe(true);
   expect(all.reduce((n,b)=>n+b.geometry.index!.count/3,0)).toBe(7178);
   expect(all.reduce((n,b)=>n+b.geometry.getAttribute('position').count,0)).toBeLessThan(7178*3*.8);
   const box=new Box3();for(const b of batches){b.geometry.computeBoundingBox();box.union(b.geometry.boundingBox!);}expect(box.containsPoint(new Vector3(0,3.5,0))).toBe(true);
   const disposed=vi.fn();all.forEach(b=>b.geometry.addEventListener('dispose',disposed));disposeEnvironmentBatches(batches);disposeEnvironmentBatches(door);expect(disposed).toHaveBeenCalledTimes(all.length);
  }catch(e){disposeEnvironmentBatches(batches);disposeEnvironmentBatches(door);throw e;}
 });
});
describe('M8.1.4 exact shader specializations',()=>{
 it('reuses the albedo sample for roughness and forbids translucent/alpha-tested materials',()=>{
  const texture=new Texture(),m=new MeshStandardMaterial({map:texture});usePackedRoughness(m);
  const shader={fragmentShader:'#include <roughnessmap_fragment>'};m.onBeforeCompile(shader as Parameters<typeof m.onBeforeCompile>[0],null as never);
  expect(shader.fragmentShader).toBe('float roughnessFactor = roughness * sampledDiffuseColor.a;');expect(m.transparent).toBe(false);expect(m.roughnessMap).toBeNull();
  for(const options of [{transparent:true},{alphaTest:.1},{opacity:.5}])expect(()=>usePackedRoughness(new MeshStandardMaterial({map:texture,...options}))).toThrow();
  expect(ShaderChunk.opaque_fragment).toContain('diffuseColor.a = 1.0');m.dispose();texture.dispose();
 });
});
