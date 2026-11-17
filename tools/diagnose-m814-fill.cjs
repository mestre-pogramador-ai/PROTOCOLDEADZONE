/* Diagnostic only. The product remains 1280x720/DPR1 in validation; reduced
 * viewport and unlit materials are cost probes, never an applied quality preset. */
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],records=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const command=(type,value)=>page.evaluate(({type,value})=>window.visualCommand(type,value),{type,value});
 const raf=n=>page.evaluate(n=>new Promise(resolve=>{let count=0;const tick=()=>{if(++count===n)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}),n);
 try{
  await page.goto('http://localhost:4175/tools/browser-fixtures/visuals.html');await page.waitForFunction(()=>window.visualObserve?.().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
  await command('clear');await command('pause');
  for(const view of ['ceiling','floor']){
   if(view==='floor')await command('profile-floor-view');else await command('environment-view','ceiling');
   for(const width of [1280,640]){
    await page.setViewportSize({width,height:width*9/16});
    for(const option of ['default','unlit-room']){
     await command('profile-option',option);await raf(8);await command('sample');await raf(16);
     records.push({view,viewport:[width,width*9/16],option,data:await page.evaluate(()=>window.visualObserve())});
    }
   }
  }
 }catch(e){errors.push(e.message);}finally{fs.writeFileSync('/tmp/m814-fill-diagnostics.json',JSON.stringify({records,errors},null,2));console.log(JSON.stringify({errors,samples:records.length}));await browser.close();}
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
