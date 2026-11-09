import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AnimationMixer,Group,Vector3,Texture,SkinnedMesh,Mesh,Sphere} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import metadata from '../../public/assets/manifests/character-bounds-m814.json';
import {applyCharacterCulling} from '../presentation/rendering/CharacterCulling';
import {createHeadRetarget} from '../presentation/rendering/HeadRetarget';
describe('M8.1.4 conservative animation culling',()=>{
 for(const family of ['worker','hunter'] as const)it('contains actual '+family+' vertices across clips, retarget and variant scales',async()=>{
  const asset=metadata.assets[family],bytes=readFileSync('public/'+asset.path),textures:Texture[]=[];
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
  const loader=new GLTFLoader();loader.register(()=>({name:'test_skip_images',loadTexture:()=>{const t=new Texture();textures.push(t);return Promise.resolve(t);}}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),root=new Group();root.add(gltf.scene);
  const skins:SkinnedMesh[]=[];gltf.scene.traverse(o=>{if(o instanceof SkinnedMesh){skins.push(o);expect(applyCharacterCulling(o,family),o.name).toBe(true);}});
  // Mirror the renderer's shared skeleton. The exported LODs/vest must retain
  // the same inverse bind matrices; metadata is measured before instancing.
  for(const skin of skins.slice(1)){expect(skin.skeleton.boneInverses.map(m=>m.elements)).toEqual(skins[0].skeleton.boneInverses.map(m=>m.elements));if(skin.skeleton!==skins[0].skeleton)skin.skeleton.dispose();skin.skeleton=skins[0].skeleton;}
  const mixer=new AnimationMixer(root),retarget=createHeadRetarget(gltf.scene),p=new Vector3();
  try{
   for(const scale of family==='worker'?[.86,1,1.2]:[.83]){
    root.scale.x=scale;root.rotation.z=.035;
    for(const clip of gltf.animations){mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();action.paused=true;
     for(let step=0;step<10;step++){
      action.time=clip.duration*(step+.37)/10;mixer.update(0);root.updateMatrixWorld(true);if(clip.name!=='Death')retarget.apply(0,0);root.updateMatrixWorld(true);
      for(const skin of skins){const sphere=skin.boundingSphere!;let maxDistance=0;for(let i=0;i<skin.geometry.getAttribute('position').count;i++)maxDistance=Math.max(maxDistance,skin.getVertexPosition(i,p).distanceTo(sphere.center));expect(maxDistance,`${clip.name}/${skin.name}/${scale}`).toBeLessThan(sphere.radius);}
     }
    }
   }
  }finally{mixer.stopAllAction();mixer.uncacheRoot(root);textures.forEach(t=>t.dispose());gltf.scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 },15000);
 it('keeps unknown meshes uncullable instead of risking disappearing characters',()=>{
  const mesh=new SkinnedMesh();mesh.name='unknown-future-rig';mesh.boundingSphere=new Sphere();expect(applyCharacterCulling(mesh,'worker')).toBe(false);expect(mesh.frustumCulled).toBe(false);mesh.geometry.dispose();
 });
});
