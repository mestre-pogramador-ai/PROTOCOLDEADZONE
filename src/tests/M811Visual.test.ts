import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Bone,BufferGeometry,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,SkinnedMesh,Skeleton,Texture,Uint16BufferAttribute} from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {acquireModel,modelCacheSnapshot,modelUrl,remappedLodGeometry} from '../presentation/rendering/ModelAssets';
import {attackClipPhase,magazineTravel,reloadProgress,presentationDelta} from '../presentation/rendering/VisualMotion';
describe('M8.1.1 shipped asset contract',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/manifests/visual-assets.json','utf8'));
 for(const asset of manifest.assets)it('validates local geometry/license/hash: '+asset.path,()=>{
  const data=readFileSync('public/assets/'+asset.path);
  expect(data.subarray(0,4).toString()).toBe('glTF');
  expect(data.readUInt32LE(4)).toBe(2);expect(data.readUInt32LE(8)).toBe(data.length);
  expect(data.length).toBe(asset.bytes);expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256);
  const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  for(const buffer of json.buffers)expect(buffer.uri).toBeUndefined();
  for(const image of json.images??[])expect(image.uri).toBeUndefined();
  expect(asset.triangles).toBeGreaterThan(asset.path.includes('-lod')?400:1000);expect(asset.triangles).toBeLessThan(15000);
  expect(existsSync('public/assets/manifests/'+asset.license+'.txt')).toBe(true);
 });
 it('ships separate weapon parts and true skinned/animated characters and hands',()=>{
  const parse=(path:string)=>{const b=readFileSync('public/assets/'+path);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());};
  const weapon=parse('models/weapons/m9.glb');
  for(const name of ['Frame','Slide','Trigger','Hammer','Magazine'])expect(weapon.nodes.some((n:{name:string})=>n.name===name)).toBe(true);
  // Source children inherit a 100x FBX scale. Losing it during conversion can
  // leave valid named meshes which are nevertheless invisible in the game.
  for(const [name,minimumLength] of [['Slide',.18],['Trigger',.025],['Hammer',.012]] as const){
   const node=weapon.nodes.find((n:{name:string})=>n.name===name);
   const bounds=weapon.meshes[node.mesh].primitives.map((p:{attributes:{POSITION:number}})=>weapon.accessors[p.attributes.POSITION]);
   const size=[0,1,2].map(axis=>Math.max(...bounds.map((a:{max:number[]})=>a.max[axis]))-Math.min(...bounds.map((a:{min:number[]})=>a.min[axis])));
   expect(Math.max(...size),name+' must retain metric dimensions').toBeGreaterThan(minimumLength);
   expect(Math.max(...size)).toBeLessThan(.3);
  }
  const arms=parse('models/viewmodels/tactical-arms.glb');
  expect(arms.skins[0].joints.length).toBeGreaterThan(30);
  expect(arms.animations.some((a:{name:string})=>a.name.includes('Reload'))).toBe(true);
  const zombie=parse('models/characters/infected.glb');
  for(const clip of ['Idle','Walk','Run','Bite'])expect(zombie.animations.some((a:{name:string})=>a.name.includes(clip))).toBe(true);
  const lod=manifest.assets.find((a:{path:string})=>a.path.includes('infected-lod'));
  expect(lod.triangles).toBeLessThan(manifest.assets.find((a:{path:string})=>a.path.endsWith('/infected.glb')).triangles*.5);
 });
 it('converts a LOD mesh into the original bind space before replacing geometry',()=>{
  const make=(scale:number,position:number)=>{
   const scene=new Group(),geometry=new BufferGeometry();
   geometry.setAttribute('position',new Float32BufferAttribute([position,0,0],3));
   geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,0,0,0],4));
   geometry.setAttribute('skinWeight',new Float32BufferAttribute([1,0,0,0],4));
   const mesh=new SkinnedMesh(geometry,new MeshStandardMaterial()),bone=new Bone();bone.name='Hips';
   scene.add(bone);scene.add(mesh);mesh.scale.setScalar(scale);mesh.bind(new Skeleton([bone]));
   return {scene,animations:[]} as unknown as GLTF;
  };
  const base=make(100,.01),low=make(100,1);
  let skin:SkinnedMesh|undefined;low.scene.traverse(o=>{if(o instanceof SkinnedMesh)skin=o;});
  skin!.skeleton.boneInverses[0].makeScale(.01,.01,.01);
  const geometry=remappedLodGeometry(base,low);
  expect(geometry.getAttribute('position').getX(0)).toBeCloseTo(.01,6);
 });
 it('resolves local assets under an app subpath',()=>{
  expect(modelUrl('assets/models/weapons/m9.glb','https://example.com/game/index.html','./')).toBe('https://example.com/game/assets/models/weapons/m9.glb');
 });
});
describe('visual-only motion contracts',()=>{
 it('withdraws/inserts magazine without changing gameplay state',()=>{
  expect(magazineTravel(0)).toBe(0);expect(magazineTravel(.5)).toBe(1);expect(magazineTravel(1)).toBe(0);
  for(let i=0;i<=100;i++)expect(magazineTravel(i/100)).toBeGreaterThanOrEqual(0);
  expect(reloadProgress(.75,1.5)).toBe(.5);expect(reloadProgress(.5625,1.125)).toBe(.5);
  expect(reloadProgress(-1,1.5)).toBe(1);
 });
 it('uses central simulation timing rather than unrestricted render delta',()=>{
  expect(presentationDelta(.8,1,.1)).toBeCloseTo(.005);
  expect(presentationDelta(.7,4,.3)).toBeCloseTo(.06);
  expect(presentationDelta(.9,0,0)).toBe(0);
 });
 it('keeps attack phases contiguous at authoritative state boundaries',()=>{
  expect(attackClipPhase('windup',0,.45,.15,.9)).toBeCloseTo(attackClipPhase('active',.15,.45,.15,.9));
  expect(attackClipPhase('active',0,.45,.15,.9)).toBeCloseTo(attackClipPhase('recovery',.9,.45,.15,.9));
 });
});
describe('reference-counted GLTF lifetime',()=>{
 afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
 it('shares a load and disposes geometry/material/texture only after the last release',async()=>{
  vi.useFakeTimers();vi.stubGlobal('document',{baseURI:'https://local/'});
  const scene=new Group(),geometry=new BufferGeometry(),texture=new Texture(),material=new MeshStandardMaterial({map:texture});
  scene.add(new Mesh(geometry,material));
  const gltf={scene,animations:[]} as unknown as GLTF;
  const load=vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue(gltf);
  texture.image={close:vi.fn()};const closed=texture.image.close;
  const gd=vi.spyOn(geometry,'dispose'),md=vi.spyOn(material,'dispose'),td=vi.spyOn(texture,'dispose');
  const a=acquireModel('fixture.glb'),b=acquireModel('fixture.glb');await a.ready;
  expect(load).toHaveBeenCalledTimes(1);a.release();vi.advanceTimersByTime(400);expect(gd).not.toHaveBeenCalled();
  b.release();b.release();vi.advanceTimersByTime(400);
  expect(gd).toHaveBeenCalledOnce();expect(md).toHaveBeenCalledOnce();expect(td).toHaveBeenCalledOnce();expect(closed).toHaveBeenCalledOnce();
  expect(modelCacheSnapshot()).toEqual([]);
 });
 it('evicts a failed load so retry does not reuse a rejected promise',async()=>{
  vi.useFakeTimers();vi.stubGlobal('document',{baseURI:'https://local/'});
  const load=vi.spyOn(GLTFLoader.prototype,'loadAsync').mockRejectedValueOnce(new Error('fixture'));
  const a=acquireModel('missing.glb');await expect(a.ready).rejects.toThrow();a.release();
  load.mockResolvedValueOnce({scene:new Group(),animations:[]} as unknown as GLTF);
  const b=acquireModel('missing.glb');await b.ready;expect(load).toHaveBeenCalledTimes(2);b.release();
  vi.advanceTimersByTime(400);expect(modelCacheSnapshot()).toEqual([]);
 });
});
