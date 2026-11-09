export type Vec3=readonly[number,number,number];
export const ATLAS_TILES={banner:[0,0,1024,192],bio:[0,192,256,256],console:[256,192,512,256],ammo:[768,192,256,256],cabinet:[0,448,256,256],crate:[256,448,256,256],door:[512,448,512,256],floor:[0,704,512,256],failure:[512,704,512,256],stain:[0,960,256,64],scuff:[256,960,256,64]} as const;
export type Surface='floor'|'concrete'|'paint'|'metal'|'rubber'|'hazard'|'glass'|'cyan'|'red'|'atlas';
export interface EnvironmentPart {id:string;anchor:string;shape:'box'|'rounded'|'cylinder'|'plane';position:Vec3;size:Vec3;rotation?:Vec3;surface:Surface;tile?:keyof typeof ATLAS_TILES;shadow?:boolean;}
