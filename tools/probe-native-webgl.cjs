const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{const page=await browser.newPage(),result=await page.evaluate(()=>{
  const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return{available:false,reason:'WebGL2 context unavailable without explicit software override'};
  const extension=gl.getExtension('WEBGL_debug_renderer_info'),renderer=gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL??gl.RENDERER);
  return{available:true,renderer,software:/SwiftShader|llvmpipe|softpipe/i.test(renderer)};
 });fs.writeFileSync('/tmp/m814-native-probe.json',JSON.stringify({browser:browser.version(),...result},null,2));console.log(JSON.stringify(result));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
