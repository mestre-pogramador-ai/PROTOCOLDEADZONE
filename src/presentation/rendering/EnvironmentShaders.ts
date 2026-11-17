import {MeshStandardMaterial} from 'three';
/** Pack linear roughness G into the sRGB albedo's untouched linear alpha.
 * OPAQUE Standard surfaces force output alpha=1; no transparency is introduced.
 * The sampled diffuse texel is reused instead of sampling a second map. */
export function usePackedRoughness(material:MeshStandardMaterial){
 if(material.transparent||material.alphaTest||material.opacity!==1||!material.map)throw new Error('Packed roughness requires an opaque mapped surface');
 material.roughnessMap=null;
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor = roughness * sampledDiffuseColor.a;');};
 material.customProgramCacheKey=()=> 'pdz-packed-roughness-v1';
 material.userData.environmentShader='packed-roughness';
}
