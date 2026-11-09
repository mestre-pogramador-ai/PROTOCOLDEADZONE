/** Offline conservative skin bounds from every local animation, plus 0.65 m
 * margin for visual retarget/impact. No vertex work is added to the render loop. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AnimationMixer,Box3,Vector3,SkinnedMesh,Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const result={version:1,samplesPerClip:33,marginMeters:.65,assets:{}};
for(const family of ['worker','hunter']){
 const path=`public/assets/models/characters/infected-${family}.glb`,bytes=readFileSync(path),textures=[];
 const loader=new GLTFLoader();loader.register(()=>({name:'offline_skip_images',loadTexture:()=>{const t=new Texture();textures.push(t);return Promise.resolve(t);}}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const skins=[];gltf.scene.traverse(o=>{if(o instanceof SkinnedMesh)skins.push(o);});
 const boxes=new Map(skins.map(s=>[s,new Box3()])),mixer=new AnimationMixer(gltf.scene),point=new Vector3();
 for(const clip of gltf.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();action.paused=true;
  for(let i=0;i<33;i++){
   action.time=clip.duration*i/32;mixer.update(0);gltf.scene.updateMatrixWorld(true);
   for(const skin of skins){const box=boxes.get(skin),count=skin.geometry.getAttribute('position').count;for(let v=0;v<count;v++)box.expandByPoint(skin.getVertexPosition(v,point));}
  }
 }
 const meshes={};gltf.scene.updateMatrixWorld(true);
 for(const skin of skins){const scale=skin.getWorldScale(new Vector3()),minScale=Math.min(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z));if(minScale<1e-9)throw new Error('Degenerate skin transform');
  const box=boxes.get(skin),center=box.getCenter(new Vector3()),radius=box.getSize(new Vector3()).length()/2+.65/minScale;
  meshes[skin.name]={center:center.toArray(),radius};
 }
 result.assets[family]={path:path.replace('public/',''),sha256:createHash('sha256').update(bytes).digest('hex'),meshes};
 mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);textures.forEach(t=>t.dispose());
 console.log(JSON.stringify({family,meshes:Object.keys(meshes)}));
}
writeFileSync('public/assets/manifests/character-bounds-m814.json',JSON.stringify(result,null,2)+'\n');
