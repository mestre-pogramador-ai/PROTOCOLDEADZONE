/* Offline bounds sampling in the actual Three.js renderer, using only the fixture.
 * Run before applying a previous grounding table to a different asset revision.
 */
const {chromium}=require('playwright'),fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto('http://localhost:4175/tools/browser-fixtures/visuals.html?rawGrounding=1');
  await page.waitForFunction(()=>window.visualObserve?.().assets.length===4&&window.visualObserve().assets.every(a=>a.loaded));
  await page.evaluate(()=>window.visualCommand('pose','dead'));await page.waitForFunction(()=>window.visualObserve().poseTime>2.2);
  const floors=[[],[],[],[]];
  for(let i=0;i<=32;i++){
   await page.evaluate(age=>window.visualCommand('death-sample',age),2.15*i/32);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const values=await page.evaluate(()=>window.visualFloor());
   values.forEach((v,j)=>floors[j].push(+v.toFixed(6)));
  }
  const record={},curves={};
  for(const [i,kind] of ['common','runner','brute','predator'].entries()){
   const asset='public/assets/models/characters/infected-'+(kind==='predator'?'hunter':'worker')+'.glb';
   const raw=floors[i].map(y=>+Math.max(0,.004-y).toFixed(6));
   const lift=raw.map((_,i)=>+Math.max(...raw.map((v,j)=>v-.02*Math.abs(i-j))).toFixed(6));
   if(Math.max(...lift)>.25)throw new Error('Unexpected grounding excursion; inspect the asset instead of hiding a bad rig');
   record[kind]={asset:asset.replace('public/',''),sha256:crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex'),sourceFloorMeters:floors[i],liftMeters:lift};curves[kind]=lift;
  }
  fs.writeFileSync('public/assets/animations/grounding-m812.json',JSON.stringify(record,null,2)+'\n');
  fs.writeFileSync('src/presentation/rendering/DeathGrounding.ts','// Generated from actual Three.js skinned mesh bounds by tools/measure-m812-grounding.cjs.\nexport const DEATH_GROUNDING='+JSON.stringify(curves)+' as const;\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(record).map(([k,v])=>[k,{minFloor:Math.min(...v.sourceFloorMeters),maxLift:Math.max(...v.liftMeters)}]))));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
