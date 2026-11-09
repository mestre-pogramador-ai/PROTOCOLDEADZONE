import {useEffect,useMemo} from 'react';
import {CanvasTexture,RepeatWrapping,SRGBColorSpace} from 'three';
/** Original local procedural art. No remote images, no colliders or navigation data. */
export function useRoomSurfaces(){
 const surfaces=useMemo(()=>{
  const make=(width:number,height:number,paint:(ctx:CanvasRenderingContext2D)=>void)=>{
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const context=canvas.getContext('2d');if(!context)throw new Error('Room surface canvas unavailable');
   paint(context);const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
  };
  let seed=812;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  const plate=(ctx:CanvasRenderingContext2D,floor=false)=>{
   ctx.fillStyle=floor?'#344448':'#728080';ctx.fillRect(0,0,512,512);
   for(let i=0;i<2400;i++){const shade=Math.floor(30+random()*150);ctx.fillStyle=`rgba(${shade},${shade},${shade},.055)`;ctx.fillRect(random()*512,random()*512,1+random()*22,1+random()*3);}
   ctx.strokeStyle=floor?'#1c292d':'#2f3d42';ctx.lineWidth=5;ctx.strokeRect(3,3,506,506);
   ctx.strokeStyle='rgba(210,222,219,.20)';ctx.lineWidth=1;ctx.strokeRect(7,7,498,498);
   ctx.fillStyle='#283539';for(const x of [16,496])for(const y of [16,496]){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle='rgba(9,17,20,.15)';ctx.fillRect(0,470,512,42);
  };
  const wall=make(512,512,c=>plate(c)),floor=make(512,512,c=>plate(c,true));
  wall.wrapS=wall.wrapT=floor.wrapS=floor.wrapT=RepeatWrapping;wall.repeat.set(8,2);floor.repeat.set(8,8);
  const containment=make(1024,256,c=>{
   c.fillStyle='#142126';c.fillRect(0,0,1024,256);c.fillStyle='#bcd9cf';c.font='bold 73px sans-serif';c.fillText('CONTENÇÃO // B-01',35,105);
   c.font='32px sans-serif';c.fillStyle='#c7ac6f';c.fillText('RISCO BIOLÓGICO  ·  ACESSO RESTRITO',38,168);
   for(let x=-50;x<1100;x+=70){c.fillStyle='#d2aa59';c.beginPath();c.moveTo(x,222);c.lineTo(x+30,222);c.lineTo(x+10,256);c.lineTo(x-20,256);c.fill();}
  });
  const warning=make(512,512,c=>{
   c.fillStyle='#b79c62';c.fillRect(0,0,512,512);c.strokeStyle='#172629';c.lineWidth=16;c.strokeRect(14,14,484,484);
   c.fillStyle='#172629';c.textAlign='center';c.font='210px sans-serif';c.fillText('☣',256,285);
   c.font='bold 40px sans-serif';c.fillText('QUARENTENA',256,365);c.font='27px sans-serif';c.fillText('NÍVEL DE RISCO 03',256,421);
  });
  return {wall,floor,containment,warning};
 },[]);
 useEffect(()=>()=>{Object.values(surfaces).forEach(t=>t.dispose());},[surfaces]);
 return surfaces;
}
