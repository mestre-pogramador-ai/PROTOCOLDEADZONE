import {DEATH_GROUNDING} from './DeathGrounding';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function deathGrounding(kind:keyof typeof DEATH_GROUNDING,age:number):number{
 const samples=DEATH_GROUNDING[kind],position=clamp(age/2.15)*(samples.length-1),index=Math.floor(position);
 return samples[index]+(samples[Math.min(index+1,samples.length-1)]-samples[index])*(position-index);
}
export function smoothStep(value:number){const x=clamp(value);return x*x*(3-2*x);}
export function reloadProgress(remaining:number,duration:number):number{
 return duration>0?clamp(1-remaining/duration):0;
}
export function magazineTravel(progress:number):number{
 if(progress<.12)return 0;
 if(progress<.4)return smoothStep((progress-.12)/.28);
 if(progress<.6)return 1;
 return 1-smoothStep((progress-.6)/.3);
}
export function attackClipPhase(state:string,timer:number,windup:number,active:number,recovery:number):number{
 if(state==='windup')return .1+.32*clamp(1-timer/windup);
 if(state==='active')return .42+.2*clamp(1-timer/active);
 return .62+.38*clamp(1-timer/recovery);
}

// Presentation follows the central fixed clock, including capped/dropped frames.
export function presentationDelta(previousAlpha:number,steps:number,alpha:number):number{
 return Math.max(0,Math.min(.1,(steps+alpha-previousAlpha)/60));
}
