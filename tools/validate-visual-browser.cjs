const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const output=process.env.VISUAL_EVIDENCE_DIR||'/tmp/m811-visual-evidence';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[],httpErrors=[],record={};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
 const observe=()=>page.evaluate(()=>window.visualObserve());
 const command=(type,value)=>page.evaluate(({type,value})=>window.visualCommand(type,value),{type,value});
 const ready=()=>page.waitForFunction(()=>window.visualObserve&&window.visualObserve().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
 const shot=async()=>{await command('aim-head');await page.mouse.down();await page.mouse.up();};
 try{
  await page.goto(process.env.VISUAL_URL||'http://localhost:4175/tools/browser-fixtures/visuals.html');await ready();await page.waitForTimeout(600);
  await page.screenshot({path:path.join(output,'four.png')});await command('sample');await page.waitForTimeout(3000);record.four=await observe();
  for(const head of record.four.heads){if(Math.abs(head.center[1]-head.target[1])>.12||Math.hypot(head.center[0]-head.target[0],head.center[2]-head.target[2])>.2)throw new Error('Head visual is outside the target tolerance');}
  await command('count',20);await ready();await page.waitForTimeout(600);await page.screenshot({path:path.join(output,'twenty.png')});
  await command('sample');await page.waitForTimeout(3000);record.twenty=await observe();
  record.lodBounds=await page.evaluate(()=>window.visualBounds());
  if(record.lodBounds.some(b=>!b||b[1]<1.4||b[1]>2.5))throw new Error('LOD bind-space scale mismatch');
  await command('pose','chase');await command('sample');await page.waitForTimeout(3000);record.animatedTwenty=await observe();
  await command('valid-grid');await ready();await page.waitForTimeout(500);
  await command('sample');await page.waitForTimeout(3000);record.validRoomTwenty=await observe();
  await page.screenshot({path:path.join(output,'valid-room-twenty.png')});
  await command('reset',4);await ready();
  record.poses={};
  for(const state of ['idle','chase','windup','active','recovery','hurt','dead']){
   await command('pose',state);await page.waitForTimeout(state==='dead'?2000:600);
   record.poses[state]=await observe();
   if(state==='dead'){record.corpseFloor=await page.evaluate(()=>window.visualFloor());if(record.corpseFloor.some(y=>y<-.04))throw new Error('Corpse penetrates floor');}
   if(state==='active'||state==='dead')await page.screenshot({path:path.join(output,state+'.png')});
  }
  await command('reset',4);await ready();await command('pose','idle');
  await page.mouse.down({button:'right'});await page.waitForFunction(()=>window.visualObserve().weapon.adsBlend>.99);
  // Wait for equip too: slow software rendering must not capture an ADS still
  // moving upward from the equip pose (wall time is not simulation time).
  await page.waitForFunction(()=>window.visualObserve().results.elapsedSeconds>.6);
  await page.screenshot({path:path.join(output,'ads.png')});record.ads=await observe();
  await page.mouse.up({button:'right'});
  await page.setViewportSize({width:960,height:720});await command('fov',100);await page.waitForTimeout(600);
  await page.screenshot({path:path.join(output,'fov100-4x3.png')});
  await page.setViewportSize({width:1280,height:720});await command('fov',80);
  await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');
  await page.waitForFunction(()=>window.visualObserve().movement.requestedHorizontalMeters>.105);
  await page.waitForTimeout(350);record.sprint=await observe();await page.screenshot({path:path.join(output,'sprint.png')});
  await page.keyboard.up('ShiftLeft');await page.waitForTimeout(350);record.walk=await observe();
  await page.keyboard.up('KeyW');
  await command('reset',4);await ready();await page.screenshot({path:path.join(output,'equip.png')});
  await command('target');await ready();await shot();
  await page.waitForFunction(()=>window.visualObserve().weapon.ammo===14);
  await page.waitForTimeout(400);await shot();await page.waitForFunction(()=>window.visualObserve().combat.kills===1);
  record.realHeadshots=await observe();
  if(record.realHeadshots.results.shots!==2||record.realHeadshots.results.headshots!==2)throw new Error('Headshot/ammo mismatch');
  await page.waitForFunction(()=>window.visualObserve().count===0,null,{timeout:30000});
  await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>{const w=window.visualObserve().weapon;return w.reloading&&w.reloadRemaining/w.reloadDuration<.65;});
  await command('pause');record.reload=await observe();await page.screenshot({path:path.join(output,'reload.png')});
  await command('resume');await page.waitForFunction(()=>!window.visualObserve().weapon.reloading,null,{timeout:30000});
  if((await observe()).weapon.reserve!==88)throw new Error('Animation created or lost ammo');
  record.resets=[];
  for(let i=0;i<3;i++){
   await command('reset',20);await ready();await page.waitForTimeout(400);
   record.resets.push(await observe());
   await command('clear');await page.waitForTimeout(700);record.resets.push(await observe());
  }
  const peaks=record.resets.filter(r=>r.count===20).map(r=>r.memory);
  if(Math.max(...peaks.map(m=>m.geometries))-Math.min(...peaks.map(m=>m.geometries))>3)throw new Error('Geometry count grows after resets');
 }catch(e){errors.push(e.message);}
 finally{
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({record,errors,httpErrors},null,2));
  console.log(JSON.stringify({errors,httpErrors,stages:Object.keys(record)}));await browser.close();
 }
 if(errors.length||httpErrors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
