/** Presentation measurements from the imported sight nodes, in metres, Y-up. */
export const M9_SIGHTS={rear:[0,.0803,.0153],front:[0,.0858,-.1646]} as const;
export const ADS_PITCH=Math.atan((M9_SIGHTS.front[1]-M9_SIGHTS.rear[1])/(M9_SIGHTS.front[2]-M9_SIGHTS.rear[2]));
export const ADS_HEIGHT=M9_SIGHTS.rear[1]*Math.cos(ADS_PITCH)-M9_SIGHTS.rear[2]*Math.sin(ADS_PITCH);
export function hipOffsetX(aspect:number){return .21*Math.min(1.25,Math.max(.6,aspect/(16/9)));}
