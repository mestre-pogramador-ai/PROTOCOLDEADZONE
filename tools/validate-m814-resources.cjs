const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[],cycles=[];
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const command=(type,value)=>page.evaluate(({type,value})=>window.visualCommand(type,value),{type,value});const observe=()=>page.evaluate(()=>window.visualObserve());
 const raf=n=>page.evaluate(n=>new Promise(resolve=>{let i=0;const tick=()=>{if(++i===n)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}),n);
 try{
  await page.goto('http://localhost:4175/tools/browser-fixtures/visuals.html');await page.waitForFunction(()=>window.visualObserve?.().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
  for(let i=0;i<3;i++){
   await command('reset',20);await page.waitForFunction(()=>window.visualObserve().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));await raf(8);const loaded=await observe();
   await command('clear');await page.waitForFunction(()=>window.visualObserve().assets.length===2);await raf(3);const cleared=await observe();
   if(cleared.count!==0||cleared.assets.some(a=>a.refs<=0))throw new Error('Unexpected retained asset after clear');cycles.push({loaded,cleared});
  }
  const cleared=cycles.map(c=>c.cleared.memory);if(cleared.some(m=>m.geometries!==cleared[0].geometries||m.textures!==cleared[0].textures))throw new Error('Resource growth after equivalent settled resets');
 }catch(e){errors.push(e.message);}finally{fs.writeFileSync('/tmp/m814-resource-cycles.json',JSON.stringify({cycles,errors},null,2));console.log(JSON.stringify({errors,loaded:cycles.map(c=>c.loaded.memory),cleared:cycles.map(c=>c.cleared.memory)}));await browser.close();}
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
