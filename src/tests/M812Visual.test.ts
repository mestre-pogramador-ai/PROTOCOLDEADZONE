import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PerspectiveCamera,Vector3,Euler,Group,Bone} from 'three';
import {createHeadRetarget} from '../presentation/rendering/HeadRetarget';
import {ADS_HEIGHT,ADS_PITCH,hipOffsetX,M9_SIGHTS} from '../presentation/rendering/ViewmodelLayout';
import {DEATH_GROUNDING} from '../presentation/rendering/DeathGrounding';
import {deathGrounding} from '../presentation/rendering/VisualMotion';

const manifest=JSON.parse(readFileSync('public/assets/manifests/visual-assets-m812.json','utf8'));
function parse(path:string){const b=readFileSync('public/assets/'+path);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
describe('M8.1.2 real local asset contract',()=>{
 for(const asset of manifest.assets)it('validates physical replacement '+asset.path,()=>{
  const bytes=readFileSync('public/assets/'+asset.path),g=parse(asset.path);
  expect(bytes.subarray(0,4).toString()).toBe('glTF');expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.length).toBe(asset.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
  expect(asset.source).toMatch(/^https:\/\/opengameart.org\/content\//);
  expect(readFileSync('public/assets/manifests/'+asset.license+'.txt','utf8').length).toBeGreaterThan(1000);
  for(const image of g.images??[]){expect(image.uri).toBeUndefined();expect(g.bufferViews[image.bufferView].byteLength).toBeGreaterThan(100);}
  for(const buffer of g.buffers)expect(buffer.uri).toBeUndefined();
  for(const skin of g.skins??[])for(const joint of skin.joints){expect(Number.isInteger(joint)).toBe(true);expect(joint).toBeGreaterThanOrEqual(0);expect(joint).toBeLessThan(g.nodes.length);}
  for(const n of g.nodes){for(const c of n.children??[])expect(g.nodes[c]).toBeDefined();if(n.skin!==undefined)expect(g.skins[n.skin]).toBeDefined();}
  const triangles=g.meshes.reduce((total:number,m:{primitives:{indices:number}[]})=>total+m.primitives.reduce((n,p)=>n+g.accessors[p.indices].count/3,0),0);
  expect(triangles).toBe(asset.triangles);
 });
 it('ships textured metal/polymer and actual movable M9 parts and sights',()=>{
  const g=parse('models/weapons/m9-service.glb');
  for(const name of ['Frame','Slide','Magazine','Hammer','Trigger','RearSight','FrontSight'])expect(g.nodes.some((n:{name:string})=>n.name===name)).toBe(true);
  expect(g.materials.some((m:{pbrMetallicRoughness:{metallicFactor:number;baseColorTexture:unknown}})=>m.pbrMetallicRoughness.metallicFactor>.7&&m.pbrMetallicRoughness.baseColorTexture)).toBe(true);
  expect(g.materials.some((m:{pbrMetallicRoughness:{roughnessFactor:number;metallicFactor:number}})=>m.pbrMetallicRoughness.metallicFactor===0&&m.pbrMetallicRoughness.roughnessFactor>.7)).toBe(true);
 });
 it('keeps anatomical fingers, fitted glove panels and support-hand animation',()=>{
  const g=parse('models/viewmodels/operator-arms.glb');
  expect(g.skins[0].joints.length).toBeGreaterThan(40);
  expect(g.nodes.some((n:{name:string})=>n.name==='GloveReinforcements')).toBe(true);
  expect(g.nodes.filter((n:{name:string})=>/index|middle|thumb/.test(n.name)).length).toBeGreaterThan(12);
  expect(g.animations.some((a:{name:string})=>a.name==='SupportReload')).toBe(true);
 });
 it('uses real character death/attack clips, PBR maps and smaller skinned LODs',()=>{
  for(const file of ['infected-worker.glb','infected-hunter.glb']){
   const g=parse('models/characters/'+file);
   for(const name of ['Idle','Walk','Attack','Death'])expect(g.animations.some((a:{name:string})=>a.name===name)).toBe(true);
   const high=g.nodes.find((n:{name:string})=>n.name==='LOD0'),low=g.nodes.find((n:{name:string})=>n.name==='LOD1');
   expect(high.skin).toBe(low.skin);
   const tris=(i:number)=>g.meshes[i].primitives.reduce((n:number,p:{indices:number})=>n+g.accessors[p.indices].count,0)/3;
   expect(tris(low.mesh)).toBeLessThan(tris(high.mesh)*.6);
  }
  const worker=parse('models/characters/infected-worker.glb');expect(worker.materials[0].normalTexture).toBeDefined();expect(worker.materials[0].pbrMetallicRoughness.metallicRoughnessTexture).toBeDefined();
  expect(worker.nodes.some((n:{name:string})=>n.name==='DamagedFlakVest')).toBe(true);
  const hunter=parse('models/characters/infected-hunter.glb');expect(hunter.animations.some((a:{name:string})=>a.name==='Run')).toBe(true);
 });
});
describe('M8.1.2 framing and grounded animation',()=>{
 it('corrects an imported upper-body hunch without moving the hips or feet',()=>{
  const root=new Group(),hips=new Bone(),spine=new Bone(),ribs=new Bone(),neck=new Bone(),head=new Bone(),top=new Bone(),foot=new Bone();
  spine.name='spine';ribs.name='ribs';neck.name='neck';head.name='Head';top.name='HeadTop_End';
  hips.position.y=.9;spine.position.y=.1;ribs.position.y=.3;neck.position.y=.2;head.position.y=.12;top.position.y=.12;
  hips.add(spine,foot);spine.add(ribs);ribs.add(neck);neck.add(head);head.add(top);foot.position.y=-.9;root.add(hips);
  spine.rotation.x=.6;root.updateMatrixWorld(true);const before=foot.getWorldPosition(new Vector3());
  const retarget=createHeadRetarget(root),error=retarget.apply(0,0);
  expect(error).toBeLessThan(.235);expect(foot.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-8);
  expect(hips.position.y).toBe(.9);expect(spine.quaternion.length()).toBeCloseTo(1,6);
 });
 it('aligns the actual imported sight coordinates at multiple screen aspects',()=>{
  const gun=parse('models/weapons/m9-service.glb');
  for(const [key,name] of [['rear','RearSight'],['front','FrontSight']] as const){
   const marker=gun.nodes.find((n:{name:string})=>n.name===name);expect(marker.translation).toHaveLength(3);
   marker.translation.forEach((v:number,i:number)=>expect(v).toBeCloseTo(M9_SIGHTS[key][i],5));
  }
  for(const aspect of [4/3,16/9,21/9]){
   const camera=new PerspectiveCamera(55,aspect,.01,3);camera.updateMatrixWorld();
   for(const sight of Object.values(M9_SIGHTS)){
    const point=new Vector3(...sight).applyEuler(new Euler(ADS_PITCH,0,0)).add(new Vector3(0,-ADS_HEIGHT,-.48)).project(camera);
    expect(Math.abs(point.x)).toBeLessThan(.001);expect(Math.abs(point.y)).toBeLessThan(.001);
   }
   expect(hipOffsetX(aspect)).toBeGreaterThan(.12);expect(hipOffsetX(aspect)).toBeLessThan(.27);
  }
 });
 it('ties conservative grounding to the real asset hashes and limits visual lift rate',()=>{
  const measurements=JSON.parse(readFileSync('public/assets/animations/grounding-m812.json','utf8'));
  for(const [kind,samples] of Object.entries(DEATH_GROUNDING)){
   const record=measurements[kind],bytes=readFileSync('public/'+record.asset);
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
   expect(samples).toEqual(record.liftMeters);expect(samples).toHaveLength(33);
   samples.forEach((v,i)=>{expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThan(.125);if(i)expect(Math.abs(v-samples[i-1])).toBeLessThanOrEqual(.020001);});
  }
 });
 it('interpolates corpse presentation without changing the 2.5 s removal rule',()=>{
  for(const kind of ['common','runner','brute','predator'] as const){
   expect(deathGrounding(kind,0)).toBe(DEATH_GROUNDING[kind][0]);
   expect(deathGrounding(kind,2.5)).toBe(DEATH_GROUNDING[kind][32]);
   for(let i=1;i<100;i++)expect(Math.abs(deathGrounding(kind,i/100*2.15)-deathGrounding(kind,(i-1)/100*2.15))).toBeLessThan(.01);
  }
 });
});
