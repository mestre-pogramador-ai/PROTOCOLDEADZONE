import { CONTAINMENT_MODULES, DOOR } from '../../world/maps/containment';
export const ENEMY_RADIUS=.38;
export function enemyCanOccupy(x:number,z:number,doorOpen:boolean):boolean {
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 for(const m of CONTAINMENT_MODULES){if(!m.collision||m.kind==='floor'||m.position[1]-m.size[1]/2>1.25)continue;
  if(Math.abs(x-m.position[0])<m.size[0]/2+ENEMY_RADIUS&&Math.abs(z-m.position[2])<m.size[2]/2+ENEMY_RADIUS)return false;
 }
 if(!doorOpen&&Math.abs(x-DOOR.position[0])<DOOR.size[0]/2+ENEMY_RADIUS&&Math.abs(z-DOOR.position[2])<DOOR.size[2]/2+ENEMY_RADIUS)return false;
 return (x>=-7.55&&x<=7.55&&z>=-7.55&&z<=7.55)||(x>=8.45&&x<=19.55&&Math.abs(z)<=1.55)||(doorOpen&&x>=7.45&&x<=8.55&&Math.abs(z)<=1.3);
}
/** Grid-based BFS. Recalculated sparingly by the enemy manager; no physics or UI side effects. */
export function findEnemyPath(sx:number,sz:number,tx:number,tz:number,doorOpen:boolean):[number,number][] {
 const cell=.65,minX=-7.8,minZ=-7.8,nx=43,nz=25;
 const key=(x:number,z:number)=>z*nx+x;
 const toGrid=(x:number,z:number):[number,number]=>[Math.max(0,Math.min(nx-1,Math.round((x-minX)/cell))),Math.max(0,Math.min(nz-1,Math.round((z-minZ)/cell)))];
 const toWorld=(x:number,z:number):[number,number]=>[minX+x*cell,minZ+z*cell];
 const [startX,startZ]=toGrid(sx,sz),[endX,endZ]=toGrid(tx,tz);
 const start=key(startX,startZ),goal=key(endX,endZ),prev=new Int32Array(nx*nz).fill(-1),queue=new Int32Array(nx*nz);let head=0,tail=0;queue[tail++]=start;prev[start]=start;
 const directions=[[1,0],[-1,0],[0,1],[0,-1]];
 while(head<tail){const cur=queue[head++];if(cur===goal)break;const x=cur%nx,z=Math.floor(cur/nx);
  for(const [dx,dz] of directions){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const k=key(xx,zz);if(prev[k]!==-1)continue;const [wx,wz]=toWorld(xx,zz);if(!enemyCanOccupy(wx,wz,doorOpen))continue;prev[k]=cur;queue[tail++]=k;}
 }
 if(prev[goal]===-1)return [];
 const path:[number,number][]=[];let cur=goal;while(cur!==start&&path.length<nx*nz){path.push(toWorld(cur%nx,Math.floor(cur/nx)));cur=prev[cur];}path.reverse();return path;
}
export function hasEnemyLineOfSight(x:number,z:number,tx:number,tz:number,doorOpen:boolean):boolean {
 const dist=Math.hypot(tx-x,tz-z),steps=Math.ceil(dist/.18);
 for(let i=1;i<steps;i++){const a=i/steps;if(!enemyCanOccupy(x+(tx-x)*a,z+(tz-z)*a,doorOpen))return false;}return true;
}
