const {chromium}=require('playwright-core'),fs=require('node:fs');
(async()=>{
 const out=process.env.AUDIO_EVIDENCE||'/tmp/audio-browser-evidence';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[],files=[];let record={};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());if(r.url().endsWith('.wav'))files.push(r.url());});
 const observe=()=>page.evaluate(()=>window.audioTest.observe());
 const command=(method,value)=>page.evaluate(({method,value})=>window.audioTest[method](value),{method,value});
 const assert=(ok,why)=>{if(!ok)throw new Error(why);};
 async function fire(){await page.mouse.down();await page.waitForTimeout(35);await page.mouse.up();await page.waitForTimeout(210);}
 try{
  await page.goto('http://localhost:4186/tools/browser-fixtures/audio.html');await page.waitForFunction(()=>window.audioTest);
  await page.click('#unlock');await command('ready');await page.waitForTimeout(150);record.menu=await observe();assert(record.menu.audio.loaded===33,'Missing decoded audio');assert(record.menu.audio.music==='menu','Menu');
  await page.click('#start');await page.waitForTimeout(200);await command('spawn');for(let i=0;i<4;i++)await fire();await page.waitForTimeout(200);record.combat=await observe();assert(record.combat.combat.kills>=1,'Real hitscan kill');assert(record.combat.audio.played['m9-shot']>=2&&record.combat.audio.played.kill>=1,'Confirmed combat audio');
  await page.keyboard.press('KeyR');await page.waitForTimeout(1800);record.reload=await observe();assert(record.reload.weapon.ammo===15&&record.reload.audio.played.magazine>=2,'Reload');
  for(let i=0;i<16;i++)await fire();record.empty=await observe();assert(record.empty.weapon.ammo===0&&record.empty.audio.played.click>=1,'Dry fire');
  await command('volume',.07);assert((await observe()).audio.volumes.musicVolume===.07,'Persistent music control');
  await command('mute',true);await page.waitForTimeout(350);assert((await observe()).audio.masterGain<.01,'Master mute');await command('mute',false);await page.waitForTimeout(350);assert((await observe()).audio.masterGain>.6,'Unmute');
  const enemies=Array.from({length:20},(_,i)=>({id:100+i,kind:['common','runner','brute','predator'][i%4],x:(i%5)-2,z:-2-Math.floor(i/5),state:'chase',walkPhase:i,timer:0,hp:100,maxHp:100,yaw:0,hitFlash:0,deathAge:0}));
  await command('override',{phase:'active',health:100,enemies});await page.waitForTimeout(2800);record.crowd=await observe();assert(record.crowd.audio.music==='combat','Combat music');assert(record.crowd.audio.enemyVoices<=10&&record.crowd.audio.voices<=32,'Voice budgets');
  record.peaks=await page.evaluate(async()=>{let total=0,enemy=0;for(let i=0;i<100;i++){const s=window.audioTest.observe().audio;total=Math.max(total,s.voices);enemy=Math.max(enemy,s.enemyVoices);await new Promise(r=>setTimeout(r,20));}return {total,enemy};});assert(record.peaks.total<=32&&record.peaks.enemy<=10,'Sampled voice peak');
  await command('override',{phase:'active',health:20,enemies});await page.waitForTimeout(2400);assert((await observe()).audio.music==='critical','Critical layer');
  await command('override',{phase:'active',health:100,enemies:enemies.map(e=>({...e,z:-12}))});await page.waitForTimeout(2500);assert((await observe()).audio.music==='suspense','Suspense');
  await command('pause');await page.waitForTimeout(200);const paused=await observe();await page.waitForTimeout(300);assert((await observe()).audio.context==='suspended','Pause suspend');assert(JSON.stringify((await observe()).audio.played)===JSON.stringify(paused.audio.played),'No paused cues');
  await command('resume');await page.waitForTimeout(200);assert((await observe()).audio.context==='running','Resume');
  await command('reset');await page.waitForTimeout(300);record.reset=await observe();assert(record.reset.weapon.ammo===15&&record.reset.audio.loaded===33,'Reset/cache');
  await command('gameover');await page.waitForTimeout(200);record.gameover=await observe();assert(record.gameover.audio.music==='gameover','Gameover music');
  await command('dispose');record.disposed=await observe();assert(record.disposed.audio.voices===0&&record.disposed.audio.loaded===0,'Dispose');assert(files.length===33,'No redundant asset downloads');assert(errors.length===0,'Console or assets');
  record.passed=true;
 }catch(e){record.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(out+'/result.json',JSON.stringify({record,files,errors},null,2));await browser.close();}console.log(JSON.stringify({passed:record.passed,failure:record.failure,errors,files:files.length}));
})();
