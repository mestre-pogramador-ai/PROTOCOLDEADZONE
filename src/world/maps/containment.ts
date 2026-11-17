/** M1: mapa fixo autoral; medidas em metros, Y para cima. */
export type Vec3 = readonly [number, number, number];
export interface SolidModule { id: string; kind: 'floor' | 'wall' | 'ceiling' | 'prop' | 'doorFrame'; position: Vec3; size: Vec3; material: 'floor' | 'wall' | 'trim' | 'hazard' | 'glass'; collision: boolean }
export const PERK_MACHINES=[
 {id:'perk-vitality',perk:'vitality',position:[-3,.9,7.1] as Vec3},
 {id:'perk-quick-hands',perk:'quickHands',position:[0,.9,7.1] as Vec3},
 {id:'perk-impulse',perk:'impulse',position:[3.5,.9,7.1] as Vec3},
 {id:'perk-armor',perk:'reactiveArmor',position:[6,.9,7.1] as Vec3},
] as const;
export const CONTAINMENT_MODULES: readonly SolidModule[] = [
  ...PERK_MACHINES.map(m=>({id:m.id,kind:'prop' as const,position:m.position,size:[.6,1.8,.45] as Vec3,material:'trim' as const,collision:true})),
  {id:'ammo-station',kind:'prop',position:[-2.5,.6,-1.5],size:[.8,1.2,.5],material:'trim',collision:true},
  // M8.1.3: physical closure matches wall height; elevated collider is ignored by 2D navigation.
  {id:'ceiling-main',kind:'ceiling',position:[0,3.6,0],size:[16,.2,16],material:'wall',collision:true},
  {id:'floor-main',kind:'floor',position:[0,-0.25,0],size:[16,.5,16],material:'floor',collision:true},
  {id:'floor-corridor',kind:'floor',position:[14,-.25,0],size:[12,.5,4],material:'floor',collision:true},
  {id:'north-wall',kind:'wall',position:[0,1.75,-8],size:[16,3.5,.35],material:'wall',collision:true},
  {id:'south-wall',kind:'wall',position:[0,1.75,8],size:[16,3.5,.35],material:'wall',collision:true},
  {id:'west-wall',kind:'wall',position:[-8,1.75,0],size:[.35,3.5,16],material:'wall',collision:true},
  {id:'east-north',kind:'wall',position:[8,1.75,-5],size:[.35,3.5,6],material:'wall',collision:true},
  {id:'east-south',kind:'wall',position:[8,1.75,5],size:[.35,3.5,6],material:'wall',collision:true},
  {id:'corridor-north',kind:'wall',position:[14,1.75,-2],size:[12,3.5,.35],material:'wall',collision:true},
  {id:'corridor-south',kind:'wall',position:[14,1.75,2],size:[12,3.5,.35],material:'wall',collision:true},
  {id:'corridor-end',kind:'wall',position:[20,1.75,0],size:[.35,3.5,4],material:'wall',collision:true},
  {id:'door-frame-left',kind:'doorFrame',position:[8,1.75,-1.7],size:[.6,3.5,.35],material:'trim',collision:true},
  {id:'door-frame-right',kind:'doorFrame',position:[8,1.75,1.7],size:[.6,3.5,.35],material:'trim',collision:true},
  {id:'door-frame-top',kind:'doorFrame',position:[8,3.3,0],size:[.6,.4,3.4],material:'trim',collision:true},
  {id:'containment-pod-a',kind:'prop',position:[-4,.7,-4],size:[1.8,1.4,1.3],material:'glass',collision:true},
  {id:'containment-pod-b',kind:'prop',position:[-4,.7,4],size:[1.8,1.4,1.3],material:'glass',collision:true},
  {id:'control-console',kind:'prop',position:[4,.55,-5.5],size:[2,1.1,.85],material:'trim',collision:true},
  {id:'medical-crate-a',kind:'prop',position:[1,.5,5.6],size:[1,1,1],material:'hazard',collision:true},
  {id:'medical-crate-b',kind:'prop',position:[2.1,.35,5.7],size:[.7,.7,.7],material:'trim',collision:true},
  {id:'power-cabinet',kind:'prop',position:[-6,.95,0],size:[.7,1.9,1.3],material:'trim',collision:true},
  {id:'corridor-crate',kind:'prop',position:[17,.5,1],size:[1,1,1],material:'hazard',collision:true},
];
export const AMMO_STATION={id:'ammo-station',position:[-2.5,1,-1.5] as Vec3,range:2.2};
export const DOOR = { id:'door-containment-security', position:[8,1.5,0] as Vec3, size:[.28,3,2.9] as Vec3 };
export const NAV_NODES = [
  {id:'containment-center',position:[0,0,0] as Vec3,links:['containment-door']},
  {id:'containment-door',position:[6.5,0,0] as Vec3,links:['containment-center','security-corridor'],requiresOpenDoor:DOOR.id},
  {id:'security-corridor',position:[12,0,0] as Vec3,links:['containment-door','corridor-end'],requiresOpenDoor:DOOR.id},
  {id:'corridor-end',position:[18,0,0] as Vec3,links:['security-corridor']},
] as const;
export function validateContainmentMap(): string[] {
  const errors: string[]=[];const ids=new Set<string>();
  for(const m of CONTAINMENT_MODULES){if(ids.has(m.id))errors.push(`ID repetido: ${m.id}`);ids.add(m.id);if(m.size.some(n=>!Number.isFinite(n)||n<=0))errors.push(`Dimensão inválida: ${m.id}`);}
  const navIds=new Set<string>(NAV_NODES.map(n=>n.id));
  for(const n of NAV_NODES)for(const link of n.links)if(!navIds.has(link))errors.push(`Nó inexistente: ${link}`);
  return errors;
}
