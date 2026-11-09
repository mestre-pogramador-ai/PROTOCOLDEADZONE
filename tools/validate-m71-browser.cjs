/* Run with Playwright installed, against npm run preview (default localhost:4173).
 * This exercises the production UI, without injecting state or a debug gameplay API.
 */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const output=process.env.M71_EVIDENCE_DIR||'/tmp/m71-browser-evidence';
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1280,height:720}});
 const errors=[],warnings=[],httpErrors=[];
 page.on('response',response=>{if(response.status()>=400)httpErrors.push({status:response.status(),path:new URL(response.url()).pathname});});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning')warnings.push(message.text());});
 const waitText=(selector,text)=>page.waitForFunction(({selector,text})=>document.querySelector(selector)?.innerText.includes(text),{selector,text});
 const record={};
 try{
  await page.goto((process.env.M71_URL||'http://localhost:4173')+'/?debugMovement=1');
  await page.getByRole('button',{name:'INICIAR OPERAÇÃO',exact:true}).click();
  await waitText('.m61-motion-debug','CHÃO');
  await waitText('.m6-interact','RESERVA M9 CHEIA');
  record.initialAmmo=await page.locator('.m6-ammo').innerText();
  await page.mouse.down();await page.mouse.up();await waitText('.m6-ammo','14 / 90');
  record.afterShot=await page.locator('.m6-ammo').innerText();
  await page.keyboard.press('KeyR');await waitText('.m6-ammo','15 / 89');
  await page.keyboard.press('KeyE');await waitText('.m6-credits','494');await waitText('.m6-ammo','15 / 90');
  record.afterPurchase={ammo:await page.locator('.m6-ammo').innerText(),credits:await page.locator('.m6-credits').innerText(),message:await page.locator('.m6-announcement').innerText()};
  record.creditsUnobscured=await page.evaluate(()=>{
   const a=document.querySelector('.m6-credits').getBoundingClientRect(),b=document.querySelector('.m6-errors').getBoundingClientRect();
   return !(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
  });
  if(!record.creditsUnobscured)throw new Error('Diagnostics button obscures credits');
  await page.screenshot({path:path.join(output,'purchase.png')});
  // Wait for the simulated quarter-second debounce to expire.
  await page.waitForTimeout(800);await page.keyboard.press('KeyE');
  await waitText('.m6-announcement','RESERVA M9 CHEIA');await waitText('.m6-credits','494');
  record.fullReserveCharge=0;
  await page.keyboard.press('KeyT');await waitText('.active-tag','HORDA ATIVA');
  record.roundActive=await page.locator('.m6-wave').innerText();
  await page.screenshot({path:path.join(output,'round-active.png')});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'RETOMAR OPERAÇÃO',exact:true}).waitFor();
  record.paused=true;
  await page.getByRole('button',{name:'RETOMAR OPERAÇÃO',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'REINICIAR PARTIDA',exact:true}).click();
  await waitText('.m6-credits','500');await waitText('.m6-ammo','15 / 90');await waitText('.prep-tag','PREPARAÇÃO');
  record.reset={ammo:await page.locator('.m6-ammo').innerText(),credits:await page.locator('.m6-credits').innerText()};
  await page.keyboard.press('F8');
  const download=page.waitForEvent('download');await page.keyboard.press('F9');
  await (await download).saveAs(path.join(output,'diagnostics.json'));
  await page.keyboard.press('Escape');
  const buttonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'BAIXAR ERROS'}).click();
  await (await buttonDownload).saveAs(path.join(output,'button-diagnostics.json'));
  const report=JSON.parse(fs.readFileSync(path.join(output,'diagnostics.json'),'utf8'));
  record.reportVersion=report.version;record.marker=report.entries.some(entry=>entry.code==='user.marker');
  if(!record.marker||report.version!==(process.env.EXPECTED_REPORT_VERSION||'M7.1'))throw new Error('Missing marker or incorrect report version');
 }catch(error){errors.push(error.message);}
 finally{
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({record,errors,warnings,httpErrors},null,2));
  console.log(JSON.stringify({record,errors,warnings,httpErrors}));
  await browser.close();
 }
 if(errors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
