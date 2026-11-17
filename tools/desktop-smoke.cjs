const {_electron}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out='desktop-evidence';fs.mkdirSync(out,{recursive:true});const errors=[],requests=[];
 const options=process.env.DESKTOP_EXECUTABLE?{executablePath:path.resolve(process.env.DESKTOP_EXECUTABLE)}:{args:['.']};
 const stage=name=>{console.log('DESKTOP_SMOKE',name);fs.writeFileSync(path.join(out,'stage.txt'),name);};
 stage('launch');
 const app=await _electron.launch({...options,chromiumSandbox:true,timeout:60000});
 const child=app.process();
 try{
  stage('window');const page=await app.firstWindow();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{requests.push(r.url());if(!r.url().startsWith('pdz://game/')&&!r.url().startsWith('blob:'))errors.push('Nonlocal request');});
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
  stage('local assets and start');await page.goto('pdz://game/index.html?debugMovement=1');
  await page.getByRole('button',{name:'INICIAR OPERAÇÃO',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.m6-ammo')?.textContent.includes('15 / 90'));
  stage('physics and movement');await page.waitForFunction(()=>document.querySelector('.m61-motion-debug')?.textContent.includes('CHÃO'));
  await page.keyboard.down('KeyW');try{await page.waitForFunction(()=>Number(document.querySelector('.m61-motion-debug')?.textContent.match(/passo permitido ([0-9.]+)/)?.[1])>.001);}finally{await page.keyboard.up('KeyW');}
  stage('fire');await page.mouse.down();try{await page.waitForFunction(()=>document.querySelector('.m6-ammo')?.textContent.includes('14 / 90'));}finally{await page.mouse.up();}
  stage('reload');await page.keyboard.press('KeyR');await page.waitForFunction(()=>document.querySelector('.m6-ammo')?.textContent.includes('15 / 89'));
  const security=await page.evaluate(()=>({node:typeof window.require,process:typeof window.process,pointerLock:!!document.pointerLockElement}));
  if(security.node!=='undefined'||security.process!=='undefined'||!security.pointerLock)throw new Error('Isolation or Pointer Lock failed');
  stage('pause');if(!await page.getByRole('button',{name:'RETOMAR OPERAÇÃO',exact:true}).isVisible())await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETOMAR OPERAÇÃO',exact:true}).waitFor();
  const nativeKey=key=>app.evaluate(({BrowserWindow},keyCode)=>{const contents=BrowserWindow.getAllWindows()[0].webContents;contents.sendInputEvent({type:'keyDown',keyCode});contents.sendInputEvent({type:'keyUp',keyCode});},key);
  stage('fullscreen');await nativeKey('F11');let full=false;for(let i=0;i<30&&!full;i++){full=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen());if(!full)await page.waitForTimeout(100);}if(!full)throw new Error('Fullscreen failed');await nativeKey('F11');
  await page.screenshot({path:path.join(out,'paused.png')});
  // Wait for Electron's completed event, not just a partially written file.
  const saveReport=async(file,trigger)=>{
   fs.rmSync(file,{force:true});
   await app.evaluate(({app,session},file)=>{
    app.desktopSmokeDownloadState='pending';
    session.defaultSession.once('will-download',(_event,item)=>{
     item.setSavePath(file);
     item.once('done',(_event,state)=>{app.desktopSmokeDownloadState=state;});
    });
   },file);
   await trigger();let state='pending';
   for(let i=0;i<150&&state==='pending';i++){state=await app.evaluate(({app})=>app.desktopSmokeDownloadState);if(state==='pending')await page.waitForTimeout(100);}
   if(state!=='completed')throw new Error('Diagnostic download '+state);
  };
  stage('diagnostics keyboard');const reportPath=path.resolve(out,'diagnostics.json');
  await nativeKey('F8');await saveReport(reportPath,()=>nativeKey('F9'));
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));if(!report.entries.some(e=>e.code==='user.marker'))throw new Error('Diagnostic marker missing');
  stage('diagnostics button');const buttonPath=path.resolve(out,'button-diagnostics.json');
  await saveReport(buttonPath,()=>page.getByRole('button',{name:'BAIXAR ERROS'}).click());JSON.parse(fs.readFileSync(buttonPath,'utf8'));
  const gpu=await app.evaluate(({app})=>app.getGPUFeatureStatus());
  const webgl=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');if(!gl)return {available:false};const ext=gl.getExtension('WEBGL_debug_renderer_info');return {available:true,renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),version:gl.getParameter(gl.VERSION)};});
  if(!webgl.available)throw new Error('WebGL2 context unavailable');
  const menu=await app.evaluate(({Menu})=>Menu.getApplicationMenu().items[0].submenu.items.map(i=>i.label));
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({security,menu,gpu,webgl,requests,errors},null,2));if(errors.length)throw new Error(errors.join('\n'));
  stage('close');const exited=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Application did not close')),15000);child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Abnormal exit '+code));});});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
  // Playwright keeps a Node inspector connection open. Its graceful close
  // detaches the inspector; waiting for OS exit first can deadlock the driver.
  await app.close();await exited;stage('passed');
 }catch(error){if(child.exitCode===null){fs.writeFileSync(path.join(out,'download-state.json'),JSON.stringify(await app.evaluate(({app})=>app.desktopSmokeDownloadState||'not started').catch(()=>null)));const page=app.windows()[0];if(page){await page.screenshot({path:path.join(out,'failure.png'),timeout:10000}).catch(()=>{});fs.writeFileSync(path.join(out,'failure-state.txt'),await page.locator('body').innerText({timeout:5000}).catch(()=>''));}}throw error;}finally{fs.writeFileSync(path.join(out,'network-and-errors.json'),JSON.stringify({requests,errors},null,2));if(child.exitCode===null)await app.close();}
})().catch(e=>{fs.mkdirSync('desktop-evidence',{recursive:true});fs.writeFileSync('desktop-evidence/failure.txt',e.stack||String(e));console.error(e);process.exitCode=1;});
