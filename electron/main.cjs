const {app,BrowserWindow,Menu,protocol,net,session,dialog}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {ORIGIN,isLocal,assetPath}=require('./policy.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'pdz',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-src 'none'";
let window;
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(()=>{
  const local=session.defaultSession;
  protocol.handle('pdz',async request=>{
   const file=assetPath(request.url,path.join(app.getAppPath(),'dist'));
   if(!file||!['GET','HEAD'].includes(request.method))return new Response('Forbidden',{status:403});
   try {const response=await net.fetch(pathToFileURL(file).href);return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream','Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}
  });
  local.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!isLocal(details.url)&&!details.url.startsWith('blob:'+ORIGIN+'/')&&!details.url.startsWith('devtools:')}));
  local.setPermissionCheckHandler((contents,permission)=>!!contents&&isLocal(contents.getURL())&&['pointerLock','fullscreen'].includes(permission));
  local.setPermissionRequestHandler((contents,permission,callback)=>callback(isLocal(contents.getURL())&&['pointerLock','fullscreen'].includes(permission)));
  local.on('will-download',async(event,item,contents)=>{
   if(!contents||!isLocal(contents.getURL())||!item.getURL().startsWith('blob:'+ORIGIN+'/')||item.getFilename()!=='protocol-dead-zone-errors.json'){event.preventDefault();return;}
   // Electron's native save dialog retains the existing browser Blob export.
   item.setSaveDialogOptions({title:'Salvar relatório de erros',defaultPath:path.join(app.getPath('documents'),'protocol-dead-zone-errors.json'),filters:[{name:'Relatório JSON',extensions:['json']}]});
  });
  window=new BrowserWindow({width:1280,height:800,minWidth:960,minHeight:600,title:'PROTOCOL: DEAD ZONE',backgroundColor:'#11191f',show:false,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}});
  const contents=window.webContents;
  contents.setWindowOpenHandler(()=>({action:'deny'}));
  contents.on('will-navigate',(event,url)=>{if(!isLocal(url))event.preventDefault();});
  contents.on('will-attach-webview',event=>event.preventDefault());
  contents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'&&!input.isAutoRepeat){event.preventDefault();window.setFullScreen(!window.isFullScreen());}});
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Jogo',submenu:[{label:'Tela cheia',click:()=>window.setFullScreen(!window.isFullScreen())},{type:'separator'},{label:'Sair',role:'quit'}]}]));
  window.once('ready-to-show',()=>window.show());
  window.on('closed',()=>{window=null;});
  window.loadURL(ORIGIN+'/index.html');
 }).catch(()=>{dialog.showErrorBox('PROTOCOL: DEAD ZONE','Não foi possível inicializar o aplicativo.');app.quit();});
 app.on('window-all-closed',()=>app.quit());
}
