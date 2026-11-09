/* Controlled render laboratory: same camera/assets/dpr and balanced workloads.
 * Infected use real skinning/animations, but stationary test poses instead of AI.
 * Actual AI/combat and the production App are validated by separate harnesses. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const phase=process.env.PROFILE_PHASE||'after',out=process.env.PROFILE_OUT||'/tmp/m814-'+phase;fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(90000);
 const errors=[],warnings=[],httpErrors=[],record={phase,loads:[],ablations:[],culling:[],settings:{browser:browser.version(),viewport:[1280,720],dpr:1,sampleFrames:24,warmupFrames:8}};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 const command=(type,value)=>page.evaluate(({type,value})=>window.visualCommand(type,value),{type,value});
 const raf=n=>page.evaluate(n=>new Promise(resolve=>{let count=0;const step=()=>{if(++count===n)resolve();else requestAnimationFrame(step);};requestAnimationFrame(step);}),n);
 const observe=()=>page.evaluate(()=>window.visualObserve());
 const sample=async(frames=24)=>{await raf(8);await command('sample');await raf(frames);return observe();};
 try{
  await page.goto('http://localhost:4175/tools/browser-fixtures/visuals.html');await page.waitForFunction(()=>window.visualObserve?.().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
  await command('pose','chase');await raf(12);await command('pause');await command('clear');
  for(const view of ['player','wide','ceiling','console','pods','perks','door']){await command('environment-view',view);await raf(4);await page.screenshot({path:path.join(out,view+'.png')});}
  await command('environment-view','player');
  for(const count of [0,6,12,20,20,12,6,0]){
   await command('valid-grid',count);await command('pose','chase');
   const data=await sample();record.loads.push({count,data});
   if(count)await page.screenshot({path:path.join(out,'infected-'+count+'.png')});
   console.log(JSON.stringify({stage:'load',count,frames:data.frames.length}));
  }
  if(process.env.PROFILE_CULLING==='1'){
   await command('valid-grid',20);await command('pose','chase');await raf(12);await command('pause');await command('profile-culling-view');
   for(const option of ['no-character-culling','default']){await command('profile-option',option);const data=await sample();record.culling.push({option,data});await page.screenshot({path:path.join(out,'culling-'+option+'.png')});}
   await command('profile-option','default');await command('environment-view','player');
  }
  if(process.env.PROFILE_ABLATIONS==='1'){
   await command('clear');
   for(const option of ['default','no-shadow','no-roughness','no-glass','unlit-room','default']){
    await command('profile-option',option);const data=await sample();record.ablations.push({option,data});console.log(JSON.stringify({stage:'ablation',option}));
   }
   await command('profile-option','default');
  }
 }catch(e){errors.push(e.message);}finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({record,errors,warnings,httpErrors},null,2));console.log(JSON.stringify({phase,errors,httpErrors}));await browser.close();}
 if(errors.length||httpErrors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
