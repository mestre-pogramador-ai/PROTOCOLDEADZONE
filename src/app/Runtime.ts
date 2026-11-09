import RAPIER from '@dimforge/rapier3d-compat';
import { engineConfig, validateConfig } from './config';
import { GameClock, type FrameStats } from '../core/clock/GameClock';
import { EventBus, type AppEvents } from '../core/events/EventBus';
import { InputManager } from '../core/input/InputManager';
import { Lifecycle } from '../core/lifecycle/Lifecycle';
import { AssetManager } from '../infrastructure/assets/AssetManager';
import { PhysicsWorld, type PhysicsSnapshot } from '../physics/PhysicsWorld';
import { DOOR } from '../world/maps/containment';
import { M9Controller } from '../gameplay/weapons/M9';
import { traceCombatShot, type CombatTrace } from '../gameplay/combat/EnemyHitScan';
import { EnemyManager } from '../gameplay/enemies/EnemyManager';
import { PLAYER } from '../gameplay/player/PlayerController';
import { PlayerDamage } from '../gameplay/combat/PlayerDamage';
import { RoundDirector } from '../gameplay/rounds/RoundDirector';
import { chooseSpawn } from '../gameplay/rounds/SpawnDirector';
import { ECONOMY, EconomyManager } from '../gameplay/economy/EconomyManager';
import { SessionMetrics } from '../gameplay/session/SessionMetrics';

// One WASM initialization per module, including concurrent StrictMode mounts.
let rapierReady: Promise<void> | undefined;
function initializeRapier(): Promise<void> {
  return rapierReady ??= RAPIER.init().catch(error => {
    rapierReady = undefined;
    throw error;
  });
}

/** R3F drives this ONE simulation; Rapier, waves and economy never own another loop. */
export class Runtime {
  readonly bus=new EventBus<AppEvents>();
  readonly lifecycle=new Lifecycle(this.bus);
  readonly clock=new GameClock(validateConfig(engineConfig));
  readonly input=new InputManager();
  readonly assets=new AssetManager();
  readonly weapon=new M9Controller();
  readonly enemies=new EnemyManager();
  readonly rounds=new RoundDirector();
  readonly economy=new EconomyManager();
  readonly metrics=new SessionMetrics();
  private physics:PhysicsWorld;
  private disposed=false;
  private frameStats:FrameStats={steps:0,alpha:0,droppedSeconds:0};
  private yaw=0;private pitch=0;private sensitivity=.0022;private locked=false;private fov=80;
  private lastTrace:CombatTrace|null=null;private traceAge=Infinity;
  private readonly playerDamage=new PlayerDamage();
  private hitAge=Infinity;private kills=0;private lastHeadshot=false;
  private gameOver=false;private lastDamageAngle=0;
  private spawnSequence=0;
  private notification='';private notificationRemaining=0;
  private constructor(){this.physics=new PhysicsWorld();this.enemies.clear();}
  static async create():Promise<Runtime>{await initializeRapier();return new Runtime();}
  setPointerLocked(v:boolean):void{this.locked=v;if(!v)this.input.clear();}
  look(dx:number,dy:number):void{if(!this.locked||this.lifecycle.state!=='running')return;this.yaw-=dx*this.sensitivity;this.pitch=Math.max(-1.45,Math.min(1.45,this.pitch-dy*this.sensitivity));}
  getLook(){return {yaw:this.yaw,pitch:this.pitch};}
  configureView(fov:number,sensitivity:number):void{
    if(Number.isFinite(fov))this.fov=Math.max(70,Math.min(100,fov));
    if(Number.isFinite(sensitivity))this.sensitivity=.0022*Math.max(.3,Math.min(2.5,sensitivity));
  }
  getFov():number{return this.fov;}
  start():void{this.ensureActive();if(this.gameOver)return;this.input.attach();this.input.clear();this.physics.syncInterpolation();this.lifecycle.start();this.clock.resume();}
  pause():void{if(this.lifecycle.state!=='running')return;this.lifecycle.pause();this.clock.pause();this.input.clear();}
  resume():void{this.ensureActive();if(this.gameOver)return;this.input.clear();this.physics.syncInterpolation();this.lifecycle.resume();this.clock.resume();}
  reset():void{
    this.ensureActive();this.clock.pause();this.lifecycle.reset();
    this.physics.dispose();this.physics=new PhysicsWorld();this.clock.reset();this.input.clear();
    this.weapon.reset();this.enemies.clear();this.rounds.reset();this.economy.reset();this.metrics.reset();
    this.lastTrace=null;this.traceAge=Infinity;this.yaw=0;this.pitch=0;
    this.playerDamage.reset();this.hitAge=Infinity;this.kills=0;this.lastHeadshot=false;
    this.gameOver=false;this.lastDamageAngle=0;this.spawnSequence=0;
    this.notification='';this.notificationRemaining=0;this.start();
  }
  /** Legacy debug hook from M4, not part of M5 wave control. */
  setEnemyCount(count:number):void{this.enemies.setCount(count);}
  /** Debug only: game interaction uses buyDoor() to enforce the economy. */
  setDoorOpen(open:boolean):void{this.ensureActive();this.physics.setDoorOpen(open);}
  isDoorOpen():boolean{return this.physics.isDoorOpen();}
  canInteract():boolean{const p=this.physics.snapshot().current.position;return Math.hypot(p[0]-DOOR.position[0],p[2]-DOOR.position[2])<2.8;}
  private announce(text:string):void{this.notification=text;this.notificationRemaining=2.2;}
  beginRoundNow():boolean{
    if(this.gameOver||this.lifecycle.state!=='running')return false;
    const started=this.rounds.beginNow();
    if(started){const round=this.rounds.snapshot().round;this.announce(`RODADA ${round} INICIADA`);this.bus.emit('round:started',{round});}
    return started;
  }
  interact():boolean{
    if(!this.canInteract()||this.gameOver)return false;
    if(this.economy.hasPurchase(DOOR.id)){
      // Purchased passage stays open; prevents accidentally trapping the player.
      this.physics.setDoorOpen(true);return true;
    }
    if(!this.economy.buy(DOOR.id,ECONOMY.containmentDoorPrice)){
      this.announce(`CRÉDITOS INSUFICIENTES: ${ECONOMY.containmentDoorPrice}`);this.bus.emit('economy:denied',{price:ECONOMY.containmentDoorPrice});return false;
    }
    this.physics.setDoorOpen(true);this.announce('ACESSO AO CORREDOR LIBERADO');this.bus.emit('economy:purchase',{price:ECONOMY.containmentDoorPrice});return true;
  }
  frame(delta:number):void{
    if(this.disposed||this.lifecycle.state!=='running'||this.gameOver)return;
    this.frameStats=this.clock.frame(delta,dt=>{
      this.metrics.tick(dt);
      const input=this.input.snapshot();
      this.physics.step(dt,input,this.yaw);
      const pose=this.physics.snapshot().current;
      const [px,,pz]=pose.position;
      if(input.pressed.has('interact'))this.interact();
      if(input.pressed.has('beginRound'))this.beginRoundNow();
      const beforeReload=this.weapon.snapshot().reloading;
      this.weapon.tick(dt,{fire:this.locked&&input.pressed.has('fire'),ads:this.locked&&input.held.has('ads'),reload:input.pressed.has('reload')});
      const afterReload=this.weapon.snapshot().reloading;
      if(!beforeReload&&afterReload)this.bus.emit('weapon:reloadStarted',{});
      else if(beforeReload&&!afterReload)this.bus.emit('weapon:reloaded',{});
      const shot=this.weapon.takeShot();
      if(shot){
        const origin:[number,number,number]=[px,pose.position[1]+(pose.crouching?.38:PLAYER.eyeOffset),pz];
        const targets=this.enemies.snapshots();
        const trace=traceCombatShot({origin,yaw:this.yaw,pitch:this.pitch,maxDistance:shot.range,
          doorOpen:this.isDoorOpen(),id:shot.id,damage:shot.damage},targets);
        this.lastTrace=trace;this.traceAge=0;
        const target=targets.find(e=>e.id===trace.enemyId&&e.state!=='dead');
        this.metrics.recordShot(!!target,!!target&&trace.headshot);
        this.bus.emit('combat:shot',{hit:!!target,headshot:!!target&&trace.headshot});
        if(target){
          this.economy.awardHit(target.id,shot.id);
          const killed=this.enemies.applyDamage(target.id,shot.damage*(trace.headshot?shot.headshotMultiplier:1));
          if(killed){
            this.kills++;this.rounds.recordKill();
            this.economy.awardKill(target.id,trace.headshot);
            this.bus.emit('combat:enemyKilled',{headshot:trace.headshot});
          }
          this.lastHeadshot=trace.headshot;
        }else this.lastHeadshot=false;
      }else this.traceAge+=dt;
      this.hitAge+=dt;this.playerDamage.tick(dt);
      const attacks=this.enemies.tick(dt,px,pz,this.isDoorOpen());
      const living=this.enemies.snapshots();
      for(const attack of attacks){
        const enemy=living.find(e=>e.id===attack.id);
        const previousHealth=this.playerDamage.health;
        if(enemy&&this.playerDamage.apply(attack.damage,{x:enemy.x,z:enemy.z})){
          this.metrics.recordDamage(previousHealth-this.playerDamage.health);
          this.bus.emit('combat:damage',{health:this.playerDamage.health,amount:previousHealth-this.playerDamage.health});
          this.hitAge=0;
          this.lastDamageAngle=Math.atan2(enemy.x-px,enemy.z-pz)-this.yaw;
        }
      }
      this.notificationRemaining=Math.max(0,this.notificationRemaining-dt);
      if(this.playerDamage.health<=0){this.gameOver=true;this.bus.emit('session:gameover',{rounds:this.rounds.snapshot().completed,kills:this.kills});this.pause();return;}
      const result=this.rounds.tick(dt,()=>this.enemies.alive(),hp=>{
        const spawn=chooseSpawn({x:px,z:pz,doorOpen:this.isDoorOpen(),
          sequence:this.spawnSequence++,yaw:this.yaw,enemies:this.enemies.snapshots()});
        if(!spawn)return false;
        this.enemies.spawn(spawn[0],spawn[1],hp);
        return true;
      });
      if(result.started){const round=this.rounds.snapshot().round;this.announce(`RODADA ${round} INICIADA`);this.bus.emit('round:started',{round});}
      if(result.completedRound!==null){
        const reward=this.economy.awardRound(result.completedRound);
        this.announce(`RODADA ${result.completedRound} CONCLUÍDA · +${reward} CR`);
        this.bus.emit('round:completed',{round:result.completedRound,reward});
      }
    });
  }
  getShotTrace():CombatTrace|null{return this.traceAge<.13?this.lastTrace:null;}
  getWeaponState(){return this.weapon.snapshot();}
  getRoundState(){return this.rounds.snapshot();}
  getEconomyState(){return this.economy.snapshot();}
  getResults(){const r=this.rounds.snapshot(),e=this.economy.snapshot();return this.metrics.snapshot({
    kills:this.kills,completedRounds:r.completed,currentRound:r.round,
    earned:e.lifetimeEarned,spent:e.lifetimeSpent,credits:e.credits,doorPurchased:e.doorPurchased,
  });}
  getPrompt(){return {message:this.notificationRemaining>0?this.notification:'',remaining:this.notificationRemaining};}
  getCombatState(){return {health:this.playerDamage.health,maxHealth:100,kills:this.kills,alive:this.enemies.alive(),
    hitRecently:this.hitAge<.55,damageAngle:this.lastDamageAngle,gameOver:this.gameOver,lastHeadshot:this.lastHeadshot,
    hitMarker:this.traceAge<.14&&this.lastTrace!==null&&this.lastTrace.enemyId!==null,
    damageEvents:this.playerDamage.events,invulnerability:this.playerDamage.immunity};}
  getSnapshot():PhysicsSnapshot&{alpha:number;steps:number;droppedSeconds:number}{return {...this.physics.snapshot(),alpha:this.lifecycle.state==='running'?this.frameStats.alpha:1,steps:this.frameStats.steps,droppedSeconds:this.frameStats.droppedSeconds};}
  /** Optional developer overlay; not coupled to React's frame-by-frame store. */
  getMovementDiagnostics(){return this.physics.movementDiagnostics();}
  dispose():void{if(this.disposed)return;this.disposed=true;this.clock.pause();this.input.detach();this.lifecycle.dispose();this.physics.dispose();this.assets.clear();}
  private ensureActive():void{if(this.disposed)throw new Error('Runtime descartado');}
}
