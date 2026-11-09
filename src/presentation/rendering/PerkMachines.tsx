import {useEffect,useMemo} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {PERK_MACHINES} from '../../world/maps/containment';
import {perkRegistry} from '../../gameplay/perks/PerkRegistry';
export function PerkMachines(){return <>{PERK_MACHINES.map(machine=><Machine key={machine.id} machine={machine}/>)}</>;}
function Machine({machine}:{machine:typeof PERK_MACHINES[number]}){
 const perk=perkRegistry.get(machine.perk)!;
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#102027';ctx.fillRect(0,0,512,160);ctx.strokeStyle=perk.color;ctx.lineWidth=8;ctx.strokeRect(4,4,504,152);
  ctx.textAlign='center';ctx.fillStyle=perk.color;ctx.font='bold 36px sans-serif';ctx.fillText(perk.name,256,65);
  ctx.fillStyle='#ffffff';ctx.font='30px sans-serif';ctx.fillText(perk.price.toLocaleString('pt-BR')+' CR',256,120);
  const result=new CanvasTexture(canvas);result.colorSpace=SRGBColorSpace;return result;
 },[perk]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group position={[machine.position[0],0,machine.position[2]]}>
  <mesh position={[0,1.45,-.235]}><boxGeometry args={[.48,.45,.035]}/><meshStandardMaterial color={perk.color} emissive={perk.color} emissiveIntensity={.3}/></mesh>
  <mesh position={[0,2.05,-.25]} rotation={[0,Math.PI,0]}><planeGeometry args={[1.5,.47]}/><meshBasicMaterial map={texture}/></mesh>
 </group>;
}
