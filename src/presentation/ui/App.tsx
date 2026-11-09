import { ENEMY_ARCHETYPES, ENEMY_KINDS } from '../../gameplay/enemies/EnemyArchetypes';
import { attachDiagnostics, downloadDiagnostics, diagnostics } from '../../core/diagnostics/Diagnostics';
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Runtime } from '../../app/Runtime';
import { supportsWebGL2 } from '../../app/config';
import { Scene } from '../rendering/Scene';
import { useUIStore } from './uiStore';
import { M9, type WeaponState } from '../../gameplay/weapons/M9';
import { ECONOMY, type EconomySnapshot } from '../../gameplay/economy/EconomyManager';
import type { RoundSnapshot } from '../../gameplay/rounds/RoundDirector';
import { type OperationResults, formatDuration } from '../../gameplay/session/SessionMetrics';
import { AudioDirector } from '../audio/AudioDirector';
import { type BestRecord, readBest, storeBest } from '../../infrastructure/persistence/LocalBest';
import { type GameSettings, readSettings, saveSettings } from '../../infrastructure/persistence/Settings';

type CombatUI=ReturnType<Runtime['getCombatState']>;
const number=(n:number)=>n.toLocaleString('pt-BR');
function safeStorage():Storage|null{try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}}
function HeaderTitle(){return <><span className="terminal-kicker">OMEGA SYSTEMS / EMERGÊNCIA BIOLÓGICA / SETOR 01</span><div className="m6-wordmark">PROTOCOL <b>DEAD ZONE</b></div></>;}

function SettingsPanel({settings,onChange,onClose}:{settings:GameSettings;onChange:(s:GameSettings)=>void;onClose:()=>void}){
 const slider=(label:string,key:'masterVolume'|'effectsVolume'|'ambientVolume',scale=100)=><label className="option-line" key={key}><span>{label}<strong>{Math.round(settings[key]*scale)}%</strong></span><input type="range" min="0" max="100" step="1" value={Math.round(settings[key]*100)} onChange={e=>onChange({...settings,[key]:Number(e.target.value)/100})}/></label>;
 return <div className="menu-screen settings-screen" role="dialog" aria-modal="true" aria-label="Configurações"><div className="menu-card options-card"><div className="menu-eyebrow">PAINEL DE CONTROLE / PERFIL LOCAL</div><h2>CONFIGURAÇÕES</h2><p>As preferências são salvas apenas neste navegador.</p>
  <div className="options-grid">
   <div className="option-group"><h3>ÁUDIO</h3>{slider('Volume geral','masterVolume')}{slider('Efeitos','effectsVolume')}{slider('Ambiente','ambientVolume')}<label className="option-check"><input type="checkbox" checked={settings.muted} onChange={e=>onChange({...settings,muted:e.target.checked})}/> Silenciar tudo</label></div>
   <div className="option-group"><h3>VISUAL E CONTROLE</h3><label className="option-line"><span>Campo de visão (FOV)<strong>{settings.fov}°</strong></span><input type="range" min="70" max="100" step="1" value={settings.fov} onChange={e=>onChange({...settings,fov:Number(e.target.value)})}/></label><label className="option-line"><span>Sensibilidade do mouse<strong>{settings.sensitivity.toFixed(1)}×</strong></span><input type="range" min="0.3" max="2.5" step="0.1" value={settings.sensitivity} onChange={e=>onChange({...settings,sensitivity:Number(e.target.value)})}/></label><label className="option-check"><input type="checkbox" checked={settings.reducedMotion} onChange={e=>onChange({...settings,reducedMotion:e.target.checked})}/> Reduzir movimentos visuais</label><label className="option-check"><input type="checkbox" checked={settings.showControls} onChange={e=>onChange({...settings,showControls:e.target.checked})}/> Mostrar lembrete de controles</label></div>
  </div><button className="menu-primary" onClick={onClose}>VOLTAR</button>
 </div></div>;
}
function ResultsPanel({result,best,onRetry,onSettings}:{result:OperationResults;best:BestRecord|null;onRetry:()=>void;onSettings:()=>void}){
 return <div className="menu-screen results-screen" role="dialog" aria-modal="true" aria-label="Resultados da operação"><div className="menu-card results-card"><div className="menu-eyebrow danger-text">SINAL VITAL PERDIDO // RELATÓRIO OPERACIONAL</div><h2 className="danger-text">OPERADOR ELIMINADO</h2><p>Operação encerrada. Os recursos da partida serão reiniciados na próxima tentativa.</p>
 <div className="results-grid"><div><small>RODADAS CONCLUÍDAS</small><strong>{String(result.completedRounds).padStart(2,'0')}</strong></div><div><small>ELIMINAÇÕES</small><strong>{number(result.kills)}</strong></div><div><small>PRECISÃO</small><strong>{result.accuracy}%</strong></div><div><small>SOBREVIVÊNCIA</small><strong>{formatDuration(result.elapsedSeconds)}</strong></div><div><small>CRÉDITOS GANHOS</small><strong>{number(result.creditsEarned)}</strong></div><div><small>DISPAROS / ACERTOS</small><strong>{result.shots} / {result.hits}</strong></div></div>
 {best&&<div className="best-run">RECORDE LOCAL · {best.completedRounds} rodadas concluídas · {best.kills} eliminações</div>}
 <div className="menu-buttons"><button className="menu-primary" onClick={onRetry}>REINICIAR OPERAÇÃO</button><button className="menu-secondary" onClick={onSettings}>CONFIGURAÇÕES</button></div>
 </div></div>;
}
/** HUD polls at 100ms; authoritative simulation remains inside the single R3F GameClock. */
export function App(){
 useEffect(attachDiagnostics,[]);
 const [runtime,setRuntime]=useState<Runtime|null>(null);
 const [weapon,setWeapon]=useState<WeaponState|null>(null);
 const [combat,setCombat]=useState<CombatUI|null>(null);
 const [round,setRound]=useState<RoundSnapshot|null>(null);
 const [economy,setEconomy]=useState<EconomySnapshot|null>(null);
 const [liveMetrics,setLiveMetrics]=useState<OperationResults|null>(null);
 const [finalResults,setFinalResults]=useState<OperationResults|null>(null);
 const [prompt,setPrompt]=useState('');
 const [composition,setComposition]=useState<ReturnType<Runtime['enemies']['composition']>>({common:0,runner:0,brute:0,predator:0});
 const [nearDoor,setNearDoor]=useState(false);
 const [locked,setLocked]=useState(false);
 const showMovementDebug=typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('debugMovement');
 const [movementDebug,setMovementDebug]=useState<ReturnType<Runtime['getMovementDiagnostics']>|null>(null);
 const [settings,setSettings]=useState<GameSettings>(()=>readSettings(safeStorage()));
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [best,setBest]=useState<BestRecord|null>(()=>readBest(safeStorage()));
 const viewport=useRef<HTMLDivElement>(null);
 const audio=useRef<AudioDirector|null>(null);
 const deathHandled=useRef(false);
 const status=useUIStore(s=>s.status),message=useUIStore(s=>s.message),setStatus=useUIStore(s=>s.setStatus);

 useEffect(()=>{
  let cancelled=false,instance:Runtime|null=null;
  if(!supportsWebGL2()){setStatus('error','WebGL 2 não está disponível neste navegador.');return;}
  Runtime.create().then(r=>{if(cancelled){r.dispose();return;}instance=r;setRuntime(r);setStatus('ready');}).catch((e:unknown)=>{diagnostics.record('error','runtime.initialization');if(!cancelled)setStatus('error',e instanceof Error?e.message:String(e));});
  return()=>{cancelled=true;instance?.dispose();};
 },[setStatus]);

 useEffect(()=>{
  if(!runtime)return;
  const director=new AudioDirector(runtime.bus,settings);audio.current=director;
  const onLock=()=>{
   const isLocked=document.pointerLockElement===viewport.current;
   setLocked(isLocked);runtime.setPointerLocked(isLocked);
   if(!isLocked&&runtime.lifecycle.state==='running'){runtime.pause();setStatus('paused');}
  };
  const onMove=(e:MouseEvent)=>runtime.look(e.movementX,e.movementY);
  const pause=()=>{
   if(runtime.lifecycle.state==='running'){runtime.pause();setStatus('paused');if(document.pointerLockElement)void document.exitPointerLock();}
  };
  const onVisibility=()=>{if(document.hidden)pause();};
  const onKey=(e:KeyboardEvent)=>{if(e.code==='Escape')pause();};
  document.addEventListener('pointerlockchange',onLock);
  document.addEventListener('mousemove',onMove);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('blur',pause);
  window.addEventListener('keydown',onKey);
  const interval=window.setInterval(()=>{
   const c=runtime.getCombatState();
   setNearDoor(runtime.canInteract());setWeapon(runtime.getWeaponState());setCombat(c);
   setComposition(runtime.enemies.composition());setRound(runtime.getRoundState());setEconomy(runtime.getEconomyState());
   setLiveMetrics(runtime.getResults());setPrompt(runtime.getPrompt().message);
   if(showMovementDebug)setMovementDebug(runtime.getMovementDiagnostics());
   if(c.gameOver&&!deathHandled.current){
    deathHandled.current=true;
    const result=runtime.getResults();setFinalResults(result);setBest(storeBest(safeStorage(),result));
    setStatus('dead');if(document.pointerLockElement)void document.exitPointerLock();
   }
  },100);
  return()=>{
   document.removeEventListener('pointerlockchange',onLock);
   document.removeEventListener('mousemove',onMove);
   document.removeEventListener('visibilitychange',onVisibility);
   window.removeEventListener('blur',pause);
   window.removeEventListener('keydown',onKey);
   window.clearInterval(interval);director.dispose();if(audio.current===director)audio.current=null;
  };
 // The director must not be recreated when the settings sliders change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[runtime,setStatus]);

 useEffect(()=>{saveSettings(safeStorage(),settings);audio.current?.setSettings(settings);runtime?.configureView(settings.fov,settings.sensitivity);},[settings,runtime]);

 const toggleFullscreen=useCallback(()=>{
  if(!document.fullscreenElement)void viewport.current?.requestFullscreen?.().catch(()=>{});
  else void document.exitFullscreen?.().catch(()=>{});
 },[]);
 const enter=()=>{
  if(!runtime||runtime.getCombatState().gameOver)return;
  audio.current?.unlock();setSettingsOpen(false);
  if(runtime.lifecycle.state==='ready'||runtime.lifecycle.state==='stopped')runtime.start();
  else if(runtime.lifecycle.state==='paused')runtime.resume();
  setStatus('running');
  try{void viewport.current?.requestPointerLock();}catch{/* game stays playable with click to retry */}
 };
 const pause=()=>{if(!runtime)return;runtime.pause();setStatus('paused');if(document.pointerLockElement)void document.exitPointerLock();};
 const reset=()=>{
  if(!runtime)return;audio.current?.unlock();deathHandled.current=false;setFinalResults(null);setSettingsOpen(false);
  runtime.reset();setWeapon(runtime.getWeaponState());setCombat(runtime.getCombatState());
  setComposition(runtime.enemies.composition());setRound(runtime.getRoundState());setEconomy(runtime.getEconomyState());setStatus('running');
  try{void viewport.current?.requestPointerLock();}catch{/* retry on click */}
 };
 const openSettings=()=>{if(status==='running')pause();setSettingsOpen(true);};
 const health=combat?.health??100;
 const phase=round?.phase??'preparation';
 const remaining=(round?.remainingToSpawn??0)+(round?.alive??0);
 const showHUD=status==='running';
 return <main className={`m6-shell ${settings.reducedMotion?'reduce-motion':''}`}>
  <div className="m6-game" ref={viewport} onContextMenu={e=>e.preventDefault()} onClick={()=>{
    if(runtime&&status==='running'&&!locked){audio.current?.unlock();try{void viewport.current?.requestPointerLock();}catch{/* permission denied */}}
   }}>
   <button className="m6-errors" onClick={downloadDiagnostics}>BAIXAR ERROS</button>
   {runtime&&<Canvas camera={{position:[-1,2,0],fov:settings.fov,near:.05,far:100}} shadows dpr={[1,1.75]}><Scene runtime={runtime}/></Canvas>}
   {!runtime&&<div className="boot-screen" role="status"><HeaderTitle/><p>{message||'Preparando módulos...'}</p></div>}
   {runtime&&<>
    <div className="world-label" aria-hidden="true">OMEGA SYSTEMS <span>SETOR 01 / CONTENÇÃO</span></div>
    {showHUD&&<>
     <div className="m6-wave"><div className="hud-label">CONTAINMENT / STATUS</div><div className="wave-big">{String(round?.round??1).padStart(2,'0')}<span>RODADA</span></div>
      {phase==='preparation'?<div className="prep-tag">PREPARAÇÃO · {Math.ceil(round?.prepRemaining??30)}s <small>[ T ] INICIAR</small></div>:<div className="active-tag">● HORDA ATIVA</div>}
      <div className="hud-sub">INFECTADOS RESTANTES <strong>{remaining}</strong></div>
      {(round?.round??1)>=4&&<div className="m7-threats" aria-label="Ameaças vivas">{ENEMY_KINDS.filter(kind=>composition[kind]>0).map(kind=><span key={kind} style={{color:ENEMY_ARCHETYPES[kind].markerColor}}>{ENEMY_ARCHETYPES[kind].label}: {composition[kind]}</span>)}</div>}<div className="hud-sub">ELIMINAÇÕES <strong>{combat?.kills??0}</strong></div>
     </div>
     <div className="m6-credits"><span className="hud-label">CRÉDITOS</span><strong>{number(economy?.credits??500)}</strong><small>CR</small></div>
     <div className={`m6-reticle ${weapon?.ads?'ads':''} ${combat?.hitMarker?'confirmed':''}`} aria-hidden="true">{combat?.hitMarker?'×':'+'}</div>
     <div className={`m6-health ${health<=30?'danger':''}`}><div className="hud-label">INTEGRIDADE DO OPERADOR</div><div className="health-number">{health} <small>/ 100</small></div><div className="health-fill"><span style={{width:`${health}%`}}/></div></div>
     <div className="m6-ammo"><span className="hud-label">M9 / PISTOLA TÁTICA</span><strong>{weapon?.ammo??M9.magazineSize}<small> / {weapon?.reserve??M9.reserveOnSpawn}</small></strong><span className="ammo-note">{weapon?.reloading?`RECARREGANDO · ${weapon.reloadRemaining.toFixed(1)}s`:weapon?.ads?'MIRA ADS':'SEMI-AUTOMÁTICA · 32 DMG'}</span></div>
     {showMovementDebug&&movementDebug&&<div className="m61-motion-debug" aria-label="Diagnóstico de movimento">
       <strong>M7 · RAPIER KCC</strong><span>{movementDebug.grounded?'CHÃO':'AR'} · contatos {movementDebug.collisions}</span>
       <span>vel. Y {movementDebug.verticalVelocity.toFixed(2)} m/s</span>
       <span>passo solicitado {movementDebug.requestedHorizontalMeters.toFixed(3)} m</span>
       <span>passo permitido {movementDebug.resolvedHorizontalMeters.toFixed(3)} m</span>
     </div>}
     {settings.showControls&&<div className="m6-controls">WASD MOVER · MOUSE MIRAR · CLIQUE DISPARAR · R RECARREGAR · SHIFT CORRER · E INTERAGIR · T RODADA · ESC PAUSA</div>}
     {nearDoor&&<div className="m6-interact">{economy?.doorPurchased?'CORREDOR DESBLOQUEADO':`[ E ] DESTRAVAR PORTA · ${ECONOMY.containmentDoorPrice} CR`}</div>}
     {prompt&&<div className="m6-announcement" role="status">{prompt}</div>}
     {combat?.hitRecently&&<><div className="m6-damage"/><div className="m6-direction" style={{transform:`translateX(-50%) rotate(${-(combat.damageAngle??0)}rad)`}}>▼</div></>}
     <button className="m6-icon-action" onClick={pause} aria-label="Pausar operação">Ⅱ PAUSA</button>
     <button className="m6-fullscreen" onClick={toggleFullscreen}>⛶ TELA CHEIA</button>
    </>}
    {status==='ready'&&!settingsOpen&&<div className="menu-screen" role="dialog" aria-modal="true" aria-label="Menu principal"><div className="menu-card start-card"><div className="menu-eyebrow">CONEXÃO ESTABELECIDA // NÍVEL DE AMEAÇA: CRÍTICO</div><HeaderTitle/><h2>A CONTENÇÃO FALHOU.</h2><p>Você está isolado na Instalação Ômega. Elimine os infectados, sobreviva às rodadas e use os créditos para destravar o corredor.</p>
      <div className="menu-buttons"><button className="menu-primary" onClick={enter}>INICIAR OPERAÇÃO</button><button className="menu-secondary" onClick={openSettings}>CONFIGURAÇÕES</button><button className="menu-secondary" onClick={toggleFullscreen}>TELA CHEIA</button></div>
      <div className="menu-foot">M7 / VARIANTES DE INFECTADOS · M9 · SETOR DE CONTENÇÃO · SEM CONTA OU SERVIDOR</div>
      {best&&<div className="best-run">SEU RECORDE LOCAL · {best.completedRounds} rodadas · {best.kills} eliminações</div>}
     </div></div>}
    {status==='paused'&&!settingsOpen&&<div className="menu-screen" role="dialog" aria-modal="true" aria-label="Menu de pausa"><div className="menu-card pause-card"><div className="menu-eyebrow">SIMULAÇÃO SUSPENSA</div><h2>OPERAÇÃO PAUSADA</h2><p>Rodada {round?.round??1} · {combat?.kills??0} eliminações · {formatDuration(liveMetrics?.elapsedSeconds??0)} de sobrevivência</p><div className="menu-buttons"><button className="menu-primary" onClick={enter}>RETOMAR OPERAÇÃO</button><button className="menu-secondary" onClick={openSettings}>CONFIGURAÇÕES</button><button className="menu-secondary" onClick={toggleFullscreen}>TELA CHEIA</button><button className="menu-danger" onClick={reset}>REINICIAR PARTIDA</button></div><div className="menu-foot">O tempo, inimigos e recargas permanecem congelados durante a pausa.</div></div></div>}
    {status==='dead'&&!settingsOpen&&finalResults&&<ResultsPanel result={finalResults} best={best} onRetry={reset} onSettings={openSettings}/>}
    {settingsOpen&&<SettingsPanel settings={settings} onChange={setSettings} onClose={()=>setSettingsOpen(false)}/>}
    {status==='error'&&<div className="menu-screen" role="alert"><div className="menu-card"><h2>FALHA NA INICIALIZAÇÃO</h2><p>{message}</p><p>Verifique suporte a WebGL 2 e atualize o navegador.</p></div></div>}
   </>}
  </div>
 </main>;
}
