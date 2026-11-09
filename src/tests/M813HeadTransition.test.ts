import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {AnimationMixer,Group,Vector3,Texture,Mesh} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createHeadRetarget} from '../presentation/rendering/HeadRetarget';
import {attackClipPhase} from '../presentation/rendering/VisualMotion';
it('keeps the actual brute head inside its existing tolerance across walk-to-windup blends',async()=>{
 const loader=new GLTFLoader();
 // Geometry, skeleton and real clips are loaded; image decoding is irrelevant
 // to this Node pose test. Browser suite still loads all real textures.
 const textures:Texture[]=[];
 loader.register(()=>({name:'test_skip_texture_decode',loadTexture:()=>{const t=new Texture();textures.push(t);return Promise.resolve(t);}}));
 const bytes=readFileSync('public/assets/models/characters/infected-worker.glb');
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const anchor=new Group(),root=new Group(),scene=clone(gltf.scene);anchor.position.set(-.2,0,-4);root.scale.x=1.2;root.add(scene);anchor.add(root);
 const mixer=new AnimationMixer(root),walk=mixer.clipAction(gltf.animations.find(c=>c.name==='Walk')!),attack=mixer.clipAction(gltf.animations.find(c=>c.name==='Attack')!),retarget=createHeadRetarget(scene);
 const hips=scene.getObjectByName('Bip01_Pelvis')??scene.getObjectByName('Hips')??scene;
 let worst=0;
 try{
  for(const weight of [.2,.4,.6,.8,1])for(let frame=0;frame<=20;frame++){
   mixer.stopAllAction();walk.reset().play();attack.reset().play();walk.paused=attack.paused=true;
   walk.setEffectiveWeight(1-weight);attack.setEffectiveWeight(weight);walk.time=frame/20*walk.getClip().duration;
   attack.time=attackClipPhase('windup',.225,.45,.15,.9)*attack.getClip().duration;
   mixer.update(0);anchor.updateMatrixWorld(true);const before=hips.getWorldPosition(new Vector3());
   worst=Math.max(worst,retarget.apply(-.2,-4));expect(hips.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-8);
  }
  expect(worst).toBeLessThan(.235);
 }finally{mixer.stopAllAction();mixer.uncacheRoot(root);textures.forEach(t=>t.dispose());gltf.scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}});}
});
