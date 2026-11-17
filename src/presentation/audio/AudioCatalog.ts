export const AUDIO_FILES=['m9-shot','slide','magazine','metal','step-1','step-2','door','cloth',
 'infected-1','infected-2','infected-3','infected-4','infected-5','infected-6','infected-7','infected-8',
 'menu','preparation','suspense','combat','critical','gameover','vent','electric','concrete','glass','flesh','alarm','click','headshot','kill','denied','purchase'] as const;
export type Sound=typeof AUDIO_FILES[number];
export type MusicState='menu'|'preparation'|'suspense'|'combat'|'critical'|'gameover';
export function musicState(health:number,phase:string,nearest:number):MusicState{
 return health<=25?'critical':phase==='preparation'?'preparation':nearest<5?'combat':nearest<15?'suspense':'preparation';
}
export function audioUrl(name:Sound):string{return new URL(`assets/audio/${name}.wav`,document.baseURI).href;}
export const VOICE_LIMIT=32,ENEMY_VOICE_LIMIT=10;

export function musicLevel(state:MusicState,time:number,volume:number):number{return (state==='preparation'||state==='suspense')&&Math.floor(time/20)%4===3?0:volume;}
