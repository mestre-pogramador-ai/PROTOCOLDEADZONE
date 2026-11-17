/* Real AI, movement, damage, hitscan and finite ammo. The fixture seeds stationary
 * initial groups and disables wave scheduling; aiming is automated. No god mode,
 * direct elimination, damage setter, free reload or synthetic credit payout. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out='/tmp/m814-real-combat';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(90000);const errors=[],httpErrors=[],record=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 const command=(type,value)=>page.evaluate(({type,value})=>window.visualCommand(type,value),{type,value});
 const observe=()=>page.evaluate(()=>window.visualObserve());
 try{
  await page.goto('http://localhost:4175/tools/browser-fixtures/visuals.html');await page.waitForFunction(()=>window.visualObserve?.().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
  for(const count of [6,12,20]){
   await command('real-crowd',count);await page.waitForFunction(()=>window.visualObserve().heads.every(h=>h!==null)&&window.visualObserve().count>0);
   await page.evaluate(()=>new Promise(resolve=>{let n=0;const tick=()=>{if(++n===6)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));
   const initial=await observe();await page.evaluate(()=>{window.visualCommand('sample');window.visualCommand('resume');});
   for(let i=0;i<9;i++){
    const before=await observe();if(before.combat.gameOver)break;
    await page.waitForFunction(()=>window.visualObserve().combat.gameOver||window.visualObserve().weapon.cooldownRemaining<=0);
    if((await observe()).combat.gameOver)break;
    await command('aim-head');await page.mouse.down();
    try{await page.waitForFunction(n=>window.visualObserve().combat.gameOver||window.visualObserve().weapon.shotsFired>n,before.weapon.shotsFired);}finally{await page.mouse.up();}
   }
   const final=await observe();await command('pause');
   if(final.weapon.ammo!==15-final.results.shots||final.results.hits>final.results.shots||final.results.shots===0||final.combat.kills===0)throw new Error('Real combat/ammo invariant failed for '+count);
   record.push({count,initial,final});await page.screenshot({path:path.join(out,'combat-'+count+'.png')});console.log(JSON.stringify({count,shots:final.results.shots,kills:final.combat.kills,health:final.combat.health,gameOver:final.combat.gameOver}));
  }
 }catch(e){errors.push(e.message);}finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({record,errors,httpErrors},null,2));console.log(JSON.stringify({errors,httpErrors}));await browser.close();}
 if(errors.length||httpErrors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
