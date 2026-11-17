/* Funded App fixture only: real keyboard, Rapier movement and economic purchases.
 * No teleport, direct enemy kill or production debug endpoint. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const output=process.env.M813_INTERACTION_DIR||'/tmp/m813-interactions';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],httpErrors=[],record={};page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
 const observe=()=>page.evaluate(()=>window.m81Observe());
 const axis=async(index,target)=>{const positive=target>(await observe()).position[index],key=index===0?(positive?'KeyD':'KeyA'):(positive?'KeyS':'KeyW');await page.keyboard.down(key);try{await page.waitForFunction(({index,target,positive})=>positive?window.m81Observe().position[index]>=target:window.m81Observe().position[index]<=target,{index,target,positive});}finally{await page.keyboard.up(key);}};
 try{
  await page.goto('http://localhost:4174/tools/browser-fixtures/perks.html');await page.getByRole('button',{name:'INICIAR OPERAÇÃO',exact:true}).click();
  await page.waitForFunction(()=>window.m81Observe().position[1]<.9);record.initial=await observe();
  const shots=record.initial.weapon.shotsFired;await page.mouse.down();try{await page.waitForFunction(n=>window.m81Observe().weapon.shotsFired>n,shots);}finally{await page.mouse.up();}
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.m81Observe().weapon.reserve===89&&!window.m81Observe().weapon.reloading);
  const balance=(await observe()).economy.credits;await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.m81Observe().weapon.reserve===90);
  record.ammo=await observe();if(record.ammo.economy.credits!==balance-6)throw new Error('Ammo station debit mismatch');
  // Face east while retaining cardinal movement controls relative to north until the door.
  await axis(0,7.35);await page.keyboard.down('KeyD');await page.waitForTimeout(1800);await page.keyboard.up('KeyD');
  record.closed=await observe();if(record.closed.position[0]>7.6||record.closed.position[0]<7.3)throw new Error('Closed door failed to block capsule');
  await page.evaluate(()=>{const look=window.m81Observe().look,e=new MouseEvent('mousemove');Object.defineProperties(e,{movementX:{value:(look.yaw+Math.PI/2)/.0022},movementY:{value:look.pitch/.0022}});document.dispatchEvent(e);});
  await page.screenshot({path:path.join(output,'door-closed-hud.png')});
  const doorBalance=record.closed.economy.credits;await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.m81Observe().doorOpen);
  record.door=await observe();if(record.door.economy.credits!==doorBalance-750)throw new Error('Door debit mismatch');
  await page.keyboard.press('KeyE');await page.waitForTimeout(400);if((await observe()).economy.credits!==doorBalance-750)throw new Error('Door double charge');
  await page.keyboard.down('KeyW');try{await page.waitForFunction(()=>window.m81Observe().position[0]>9.2);}finally{await page.keyboard.up('KeyW');}
  record.passage=await observe();await page.screenshot({path:path.join(output,'door-open-passage.png')});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'REINICIAR PARTIDA',exact:true}).click();await page.waitForFunction(()=>window.m81Observe().economy.credits===500&&!window.m81Observe().doorOpen);
  record.reset=await observe();
 }catch(e){errors.push(e.message);}finally{fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({record,errors,httpErrors},null,2));console.log(JSON.stringify({errors,httpErrors,stages:Object.keys(record)}));await browser.close();}
 if(errors.length||httpErrors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
