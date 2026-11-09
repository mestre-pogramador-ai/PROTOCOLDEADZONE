const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const output=process.env.M81_EVIDENCE_DIR||'/tmp/m81-browser-evidence';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:900}});
 const errors=[],warnings=[],record={};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
 const observe=()=>page.evaluate(()=>window.m81Observe());
 async function axis(index,target){
  const p=(await observe()).position;if(Math.abs(p[index]-target)<.06)return;
  const positive=target>p[index];const key=index===0?(positive?'KeyD':'KeyA'):(positive?'KeyS':'KeyW');
  await page.keyboard.down(key);
  try{await page.waitForFunction(({index,target,positive})=>{
   const p=window.m81Observe().position[index];return positive?p>=target-.03:p<=target+.03;
  },{index,target,positive},{timeout:12000});}finally{await page.keyboard.up(key);}
 }
 async function faceSouth(){
  const look=(await observe()).look;
  await page.evaluate(({x,y})=>{
   const event=new MouseEvent('mousemove');Object.defineProperties(event,{movementX:{value:x},movementY:{value:y}});document.dispatchEvent(event);
  },{x:(look.yaw-Math.PI)/.0022,y:look.pitch/.0022});
 }
 async function faceNorth(){
  const look=(await observe()).look;
  await page.evaluate(({x,y})=>{const event=new MouseEvent('mousemove');Object.defineProperties(event,{movementX:{value:x},movementY:{value:y}});document.dispatchEvent(event);},
   {x:look.yaw/.0022,y:look.pitch/.0022});
 }
 async function purchase(id,price){
  await page.waitForFunction(id=>window.m81Observe().interaction?.id===id,id);
  const before=(await observe()).economy.credits;
  await page.keyboard.press('KeyE');
  await page.waitForFunction(id=>window.m81Observe().perks.includes(id),id);
  const after=await observe();if(before-after.economy.credits!==price)throw new Error('Incorrect perk debit '+id);
  await page.waitForFunction(id=>document.querySelector('.m81-perks')?.innerText.includes(id),
   {vitality:'Vitalidade',quickHands:'Mãos Rápidas',impulse:'Impulso',reactiveArmor:'Blindagem Reativa'}[id]);
  record[id]={before,after:after.economy.credits,effects:after.effects};
 }
 try{
  await page.goto(process.env.M81_URL||'http://localhost:4174/tools/browser-fixtures/perks.html');
  await page.getByRole('button',{name:'INICIAR OPERAÇÃO',exact:true}).click();
  record.initial=await observe();
  await axis(2,5.4);await axis(0,-3);await faceSouth();
  await purchase('vitality',2500);
  if((await observe()).combat.maxHealth!==150)throw new Error('Vitality not applied');
  await page.screenshot({path:path.join(output,'vitality-machine.png')});
  const duplicateBefore=(await observe()).economy.credits;await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>document.querySelector('.m6-announcement')?.innerText.includes('JÁ ADQUIRIDO'));
  if((await observe()).economy.credits!==duplicateBefore)throw new Error('Duplicate perk charged');
  await faceNorth();await axis(0,0);
  await page.mouse.down();await page.mouse.up();
  await page.waitForFunction(()=>window.m81Observe().weapon.ammo===14);
  await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>window.m81Observe().weapon.reloading);
  await purchase('quickHands',2000);
  record.reloadDuringPurchase=(await observe()).weapon.reloadDuration;
  if(record.reloadDuringPurchase!==1.5)throw new Error('Active reload was modified');
  await page.waitForFunction(()=>!window.m81Observe().weapon.reloading);
  await page.mouse.down();await page.mouse.up();await page.waitForFunction(()=>window.m81Observe().weapon.ammo===14);
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.m81Observe().weapon.reloading);
  record.nextReload=(await observe()).weapon.reloadDuration;if(record.nextReload!==1.125)throw new Error('Quick reload not applied');
  await page.waitForFunction(()=>!window.m81Observe().weapon.reloading);
  await axis(2,4.6);await axis(0,3.5);await axis(2,5.4);await purchase('impulse',2000);
  await axis(0,6);await purchase('reactiveArmor',3500);
  record.all=await observe();
  record.noOverlap=await page.evaluate(()=>{
   const perks=document.querySelector('.m81-perks').getBoundingClientRect();
   return ['.m6-wave','.m6-credits','.m6-health','.m6-ammo','.m6-errors'].every(selector=>{
    const b=document.querySelector(selector).getBoundingClientRect();
    return !(perks.left<b.right&&perks.right>b.left&&perks.top<b.bottom&&perks.bottom>b.top);
   });
  });
  if(!record.noOverlap)throw new Error('Perk HUD overlaps existing HUD');
  await page.screenshot({path:path.join(output,'four-perks.png')});
  const hp=(await observe()).combat.health;
  await page.evaluate(()=>window.m81SpawnAttacker());
  await page.waitForFunction(hp=>window.m81Observe().combat.health<hp,hp);
  await page.keyboard.press('Escape');
  record.armorHit=(await observe()).combat;
  if(record.armorHit.health!==134.7)throw new Error('Armor did not reduce 18 damage to 15.3');
  record.paused=await observe();await page.waitForTimeout(500);
  if((await observe()).weapon.reloadRemaining!==record.paused.weapon.reloadRemaining)throw new Error('Pause changed reload');
  await page.keyboard.press('F8');const download=page.waitForEvent('download');await page.keyboard.press('F9');
  await (await download).saveAs(path.join(output,'diagnostics.json'));
  await page.getByRole('button',{name:'REINICIAR PARTIDA',exact:true}).click();
  await page.waitForFunction(()=>window.m81Observe().economy.credits===500&&window.m81Observe().combat.maxHealth===100);
  record.reset=await observe();if(record.reset.perks.length)throw new Error('Perks survived restart');
  await axis(2,5.4);await axis(0,-3);
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.querySelector('.m6-announcement')?.innerText.includes('INSUFICIENTES'));
  record.insufficient=await observe();if(record.insufficient.economy.credits!==500||record.insufficient.perks.length)throw new Error('Insufficient credit acquired a perk');
  const diagnostics=JSON.parse(fs.readFileSync(path.join(output,'diagnostics.json'),'utf8'));
  record.reportVersion=diagnostics.version;
  if(diagnostics.version!=='M8.1'||!diagnostics.entries.some(e=>e.code==='user.marker'))throw new Error('Diagnostic export failed');
 }catch(e){errors.push(e.message);}
 finally{fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({record,errors,warnings},null,2));console.log(JSON.stringify({record,errors,warnings}));await browser.close();}
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
