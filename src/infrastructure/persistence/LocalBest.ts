import type { OperationResults } from '../../gameplay/session/SessionMetrics';
/** Stores only a local best-run summary; no telemetry, server or external account. */
export type BestRecord=Pick<OperationResults,'completedRounds'|'kills'|'elapsedSeconds'|'accuracy'>;
export interface StorageAdapter{getItem(key:string):string|null;setItem(key:string,value:string):void}
export const BEST_KEY='protocol-dead-zone:best-run:v1';
export function readBest(storage:StorageAdapter|null):BestRecord|null {
 if(!storage)return null;
 try {
  const raw=storage.getItem(BEST_KEY);if(!raw)return null;
  const data:unknown=JSON.parse(raw);
  if(typeof data!=='object'||data===null)return null;
  const x=data as Partial<BestRecord>;
  if(![x.completedRounds,x.kills,x.elapsedSeconds,x.accuracy].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))return null;
  return {completedRounds:x.completedRounds!,kills:x.kills!,elapsedSeconds:x.elapsedSeconds!,accuracy:x.accuracy!};
 }catch{return null;}
}
export function storeBest(storage:StorageAdapter|null,result:OperationResults):BestRecord|null{
 const candidate:BestRecord={completedRounds:result.completedRounds,kills:result.kills,elapsedSeconds:result.elapsedSeconds,accuracy:result.accuracy};
 const old=readBest(storage);
 if(old&&(old.completedRounds>candidate.completedRounds||
  (old.completedRounds===candidate.completedRounds&&old.kills>=candidate.kills)))return old;
 try{storage?.setItem(BEST_KEY,JSON.stringify(candidate));}catch{/* storage blocked: play offline anyway */}
 return candidate;
}
