export interface GameSettings {
  masterVolume:number;
  effectsVolume:number;
  ambientVolume:number;
  muted:boolean;
  reducedMotion:boolean;
  showControls:boolean;
  fov:number;
  sensitivity:number;
}
export const SETTINGS_KEY='protocol-dead-zone:settings:v1';
export const DEFAULT_SETTINGS:GameSettings={
  masterVolume:.65,effectsVolume:.85,ambientVolume:.2,muted:false,reducedMotion:false,
  showControls:true,fov:80,sensitivity:1,
};
export interface SettingsStorage{getItem(key:string):string|null;setItem(key:string,value:string):void}
const clamp=(v:unknown,min:number,max:number,fallback:number):number=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function normalizeSettings(data:unknown):GameSettings{
 const x=(data&&typeof data==='object'?data:{}) as Partial<GameSettings>;
 return {
  masterVolume:clamp(x.masterVolume,0,1,DEFAULT_SETTINGS.masterVolume),
  effectsVolume:clamp(x.effectsVolume,0,1,DEFAULT_SETTINGS.effectsVolume),
  ambientVolume:clamp(x.ambientVolume,0,1,DEFAULT_SETTINGS.ambientVolume),
  muted:typeof x.muted==='boolean'?x.muted:DEFAULT_SETTINGS.muted,
  reducedMotion:typeof x.reducedMotion==='boolean'?x.reducedMotion:DEFAULT_SETTINGS.reducedMotion,
  showControls:typeof x.showControls==='boolean'?x.showControls:DEFAULT_SETTINGS.showControls,
  fov:clamp(x.fov,70,100,DEFAULT_SETTINGS.fov),
  sensitivity:clamp(x.sensitivity,.3,2.5,DEFAULT_SETTINGS.sensitivity),
 };
}
export function readSettings(storage:SettingsStorage|null):GameSettings{
 try{const data=storage?.getItem(SETTINGS_KEY);return data?normalizeSettings(JSON.parse(data)):normalizeSettings({});}catch{return normalizeSettings({});}
}
export function saveSettings(storage:SettingsStorage|null,data:GameSettings):void{
 try{storage?.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(data)));}catch{/* private mode */}
}
