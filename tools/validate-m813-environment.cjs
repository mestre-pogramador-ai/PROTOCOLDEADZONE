/* Same cameras and workloads before/after; actual game input is tested separately. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const phase=process.env.ENV_PHASE||'after',output=process.env.ENV_EVIDENCE_DIR||'/tmp/m813-'+phase;fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],httpErrors=[],record={};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
 const command=(type,value)=>page.evaluate(({type,value})=>window.visualCommand(type,value),{type,value});
 const observe=()=>page.evaluate(()=>window.visualObserve());
 const raf=()=>page.evaluate(()=>new Promise(resolve=>{let count=0;const step=()=>{if(++count===4)resolve();else requestAnimationFrame(step);};requestAnimationFrame(step);}));
 try{
  await page.goto(process.env.ENV_URL||'http://localhost:4175/tools/browser-fixtures/visuals.html');
  await page.waitForFunction(()=>window.visualObserve?.().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
  await command('clear');await raf();
  for(const view of ['player','wide','ceiling','console','pods','perks','door']){
   await command('environment-view',view);await raf();await page.screenshot({path:path.join(output,view+'.png')});
  }
  await command('environment-view','player');await command('sample');await page.waitForTimeout(5000);record.empty=await observe();
  await command('showcase');await raf();await command('pause');await raf();await command('sample');await page.waitForTimeout(5000);record.four=await observe();
  await page.screenshot({path:path.join(output,'infected-four.png')});
  await command('valid-grid');await command('pose','chase');await raf();await command('sample');await page.waitForTimeout(5000);record.twenty=await observe();
  await page.screenshot({path:path.join(output,'infected-twenty.png')});
 }catch(e){errors.push(e.message);}
 finally{fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({phase,record,errors,httpErrors},null,2));console.log(JSON.stringify({phase,errors,httpErrors,stages:Object.keys(record)}));await browser.close();}
 if(errors.length||httpErrors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
