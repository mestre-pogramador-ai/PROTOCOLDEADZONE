import {Sphere,Vector3,type SkinnedMesh} from 'three';
import bounds from '../../../public/assets/manifests/character-bounds-m814.json';
import inventory from '../../../public/assets/manifests/visual-assets-m812.json';
/** Asset-local, animation-conservative bounds. Three tests these independently
 * against the camera and shadow frusta; off-camera actors still cast shadows. */
export function applyCharacterCulling(mesh:SkinnedMesh,family:'worker'|'hunter'):boolean{
 const asset=bounds.assets[family],current=inventory.assets.find(a=>a.path===asset.path.replace('assets/',''));
 const record=(asset.meshes as Record<string,{center:number[];radius:number}>)[mesh.name];
 if(!record||asset.sha256!==current?.sha256){mesh.frustumCulled=false;return false;}
 mesh.boundingSphere=new Sphere(new Vector3().fromArray(record.center),record.radius);mesh.frustumCulled=true;return true;
}
