import type {Infected} from './Infected';
/** Shared deterministic separation for living enemies. Dead bodies do not block movement. */
export function canOccupyWithSeparation(x:number,z:number,id:number,enemies:readonly Infected[],spacing=.76):boolean {
 return enemies.every(other=>other.id===id||other.state==='dead'||Math.hypot(x-other.x,z-other.z)>=spacing-1e-5);
}
export function resolveEnemySeparation(enemies:readonly Infected[],canOccupy:(x:number,z:number)=>boolean,spacing=.76):void {
 for(let pass=0;pass<3;pass++)for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
  const a=enemies[i],b=enemies[j];if(a.state==='dead'||b.state==='dead')continue;
  const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>=spacing)continue;
  const ux=d>1e-6?dx/d:((a.id+b.id)%2?1:0),uz=d>1e-6?dz/d:((a.id+b.id)%2?0:1),push=(spacing-d)*.5+.0001;
  const ax=a.x-ux*push,az=a.z-uz*push,bx=b.x+ux*push,bz=b.z+uz*push;
  if(canOccupy(ax,az)){a.x=ax;a.z=az;}
  if(canOccupy(bx,bz)){b.x=bx;b.z=bz;}
 }
}
