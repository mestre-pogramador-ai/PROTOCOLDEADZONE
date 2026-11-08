/** Session-scoped numbers are counted by confirmed simulation events, never by a React render. */
export interface OperationResults {
  elapsedSeconds: number;
  shots: number;
  hits: number;
  headshots: number;
  kills: number;
  accuracy: number;
  completedRounds: number;
  highestRound: number;
  creditsEarned: number;
  creditsSpent: number;
  finalCredits: number;
  doorPurchased: boolean;
  damageTaken: number;
  damageEvents: number;
}
export class SessionMetrics {
  private seconds=0;
  private shots=0;
  private hits=0;
  private headshots=0;
  private damageTaken=0;
  private damageEvents=0;
  tick(dt:number):void {if(Number.isFinite(dt)&&dt>0)this.seconds+=dt;}
  recordShot(hit:boolean,headshot:boolean):void {
    this.shots++;
    if(hit){this.hits++;if(headshot)this.headshots++;}
  }
  recordDamage(amount:number):void {if(Number.isFinite(amount)&&amount>0){this.damageTaken+=amount;this.damageEvents++;}}
  reset():void {this.seconds=0;this.shots=0;this.hits=0;this.headshots=0;this.damageTaken=0;this.damageEvents=0;}
  snapshot(summary:{kills:number;completedRounds:number;currentRound:number;earned:number;spent:number;credits:number;doorPurchased:boolean}):OperationResults{
    return {
      elapsedSeconds:Math.floor(this.seconds), shots:this.shots,hits:this.hits,headshots:this.headshots,
      accuracy:this.shots>0?Math.round(this.hits/this.shots*1000)/10:0,
      kills:summary.kills, completedRounds:summary.completedRounds,highestRound:Math.max(1,summary.currentRound),
      creditsEarned:summary.earned,creditsSpent:summary.spent,finalCredits:summary.credits,
      doorPurchased:summary.doorPurchased,damageTaken:this.damageTaken,damageEvents:this.damageEvents,
    };
  }
}
export function formatDuration(seconds:number):string{
  const safe=Math.max(0,Math.floor(Number.isFinite(seconds)?seconds:0));
  return `${String(Math.floor(safe/60)).padStart(2,'0')}:${String(safe%60).padStart(2,'0')}`;
}
