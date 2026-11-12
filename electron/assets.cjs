const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {assetPath}=require('./policy.cjs');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
async function assetResponse(url,method,root,csp){
 const file=assetPath(url,root);if(!file||!['GET','HEAD'].includes(method))return new Response('Forbidden',{status:403});
 try{const body=await readFile(file);return new Response(method==='HEAD'?null:body,{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}
}
module.exports={assetResponse};
