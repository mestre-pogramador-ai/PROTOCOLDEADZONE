/* Khronos glTF Validator; install offline tooling under ASSET_TOOLS_NODE_PATH. */
const fs=require('node:fs'),path=require('node:path');
const validator=require(require.resolve('gltf-validator',{paths:[process.env.ASSET_TOOLS_NODE_PATH||'/tmp/m812-assets/node_modules']}));
(async()=>{
 const output=process.env.GLTF_EVIDENCE_DIR||'/tmp/m812-gltf-validation';fs.mkdirSync(output,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync('public/assets/manifests/visual-assets-m812.json'));
 let errors=0;
 for(const asset of manifest.assets){
  const report=await validator.validateBytes(new Uint8Array(fs.readFileSync('public/assets/'+asset.path)),{uri:asset.path,maxIssues:200,externalResourceFunction:()=>Promise.reject(new Error('External asset forbidden'))});
  fs.writeFileSync(path.join(output,path.basename(asset.path)+'.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({asset:asset.path,errors:report.issues.numErrors,warnings:report.issues.numWarnings,infos:report.issues.numInfos}));errors+=report.issues.numErrors;
 }
 if(errors)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
