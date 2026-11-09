import {useEffect,useMemo} from 'react';
import {CanvasTexture,RepeatWrapping,SRGBColorSpace,MeshStandardMaterial,MeshBasicMaterial,DoubleSide,type Material,type Texture} from 'three';
import {usePackedRoughness} from './EnvironmentShaders';
import {ATLAS_TILES,type Surface} from './EnvironmentLayout';
/** Original, deterministic local PBR art. No network, external fonts or private data. */
export interface EnvironmentSignage{roomName:string;subtitle:string;doorName:string;floorArea:string;powerCircuit:string}
export const CONTAINMENT_SIGNAGE:EnvironmentSignage={roomName:'CONTENÇÃO // B-01',subtitle:'INSTALAÇÃO BIOLÓGICA • ACESSO CONTROLADO',doorName:'INTERTRAVA B-01',floorArea:'ÁREA DE CONTENÇÃO',powerCircuit:'CIRCUITO B-01'};
export function createRoomSurfaces(overrides:Partial<EnvironmentSignage>={}){
 const signage={...CONTAINMENT_SIGNAGE,...overrides};
 const textures:Texture[]=[];
 const make=(w:number,h:number,paint:(ctx:CanvasRenderingContext2D)=>void,srgb=true,repeat=false)=>{
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)throw new Error('Room surface canvas unavailable');paint(ctx);
  const t=new CanvasTexture(c);if(srgb)t.colorSpace=SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=RepeatWrapping;t.anisotropy=4;textures.push(t);return t;
 };
 let seed=813;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
 const paintSurface=(base:string,kind:Surface,roughness=false)=>make(512,512,c=>{
  c.fillStyle=roughness?'#d2d2d2':base;c.fillRect(0,0,512,512);
  for(let i=0;i<3800;i++){
   const shade=Math.floor(70+random()*170);c.fillStyle=roughness?`rgba(${shade},${shade},${shade},.2)`:`rgba(${shade},${shade},${shade},.08)`;
   c.fillRect(random()*512,random()*512,kind==='concrete'?1+random()*4:1+random()*18,1+random()*3);
  }
  if(kind==='floor'){
   c.fillStyle=roughness?'#f5f5f5':'#242f34';c.fillRect(0,0,4,512);c.fillRect(0,0,512,4);
   c.strokeStyle=roughness?'#9c9c9c':'#657174';c.lineWidth=1;c.strokeRect(6,6,500,500);
   for(let i=0;i<24;i++){c.strokeStyle=roughness?'rgba(80,80,80,.22)':'rgba(20,26,25,.2)';c.beginPath();const x=random()*512,y=random()*512;c.moveTo(x,y);c.lineTo(x+15+random()*100,y+random()*15);c.stroke();}
   for(const x of [16,496])for(const y of [16,496]){c.fillStyle=roughness?'#aaa':'#253135';c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
  }else if(kind==='paint'){
   // Chipped paint and a small amount of rust at panel edges, not a uniform noise filter.
   c.fillStyle=roughness?'#eee':'#344247';c.fillRect(0,0,512,3);c.fillRect(0,509,512,3);
   for(let i=0;i<150;i++){c.fillStyle=roughness?'#9e9e9e':i%4?'#53615e':'#75634e';c.fillRect(random()*512,i%2?random()*14:495+random()*16,2+random()*13,1+random()*4);}
  }else if(kind==='metal'){
   for(let i=0;i<120;i++){c.fillStyle=roughness?'rgba(110,110,110,.18)':'rgba(200,216,215,.12)';c.fillRect(0,random()*512,512,1);}
  }
 },!roughness,true);
 const materials={} as Record<Surface,Material>;
 for(const [kind,base,metalness]of [['floor','#6b7879',.15],['concrete','#818a87',.04],['paint','#84928c',.35],['metal','#55666c',.78]] as const){
  const map=paintSurface(base,kind),material=new MeshStandardMaterial({map,roughness:kind==='metal'?.64:1,metalness});
  if(kind==='floor'||kind==='paint'){
   const roughness=paintSurface(base,kind,true),albedo=map.image as HTMLCanvasElement,roughCanvas=roughness.image as HTMLCanvasElement;
   const ctx=albedo.getContext('2d')!,pixels=ctx.getImageData(0,0,512,512),rough=roughCanvas.getContext('2d')!.getImageData(0,0,512,512);
   for(let i=0;i<pixels.data.length;i+=4)pixels.data[i+3]=rough.data[i+1];
   ctx.putImageData(pixels,0,0);map.needsUpdate=true;roughness.dispose();textures.splice(textures.indexOf(roughness),1);usePackedRoughness(material);
  }
  materials[kind]=material;
 }
 materials.rubber=new MeshStandardMaterial({color:'#202c30',roughness:.91,metalness:.08});
 materials.hazard=new MeshStandardMaterial({color:'#bd9858',roughness:.78,metalness:.1});
 materials.glass=new MeshStandardMaterial({color:'#79b5b0',roughness:.19,metalness:.1,transparent:true,opacity:.22,depthWrite:false,side:DoubleSide});
 materials.cyan=new MeshStandardMaterial({color:'#b3ded9',emissive:'#75b7bd',emissiveIntensity:1.15,roughness:.5});
 materials.red=new MeshStandardMaterial({color:'#df6e58',emissive:'#c14836',emissiveIntensity:.85,roughness:.6});
 const atlas=make(1024,1024,c=>{
  c.fillStyle='#172c32';c.fillRect(0,0,1024,1024);
  const tile=(key:keyof typeof ATLAS_TILES,fn:(ctx:CanvasRenderingContext2D,w:number,h:number)=>void)=>{
   const[x,y,w,h]=ATLAS_TILES[key];c.save();c.beginPath();c.rect(x+2,y+2,w-4,h-4);c.clip();c.translate(x,y);
   c.strokeStyle='#79938f';c.lineWidth=3;c.strokeRect(9,9,w-18,h-18);fn(c,w,h);c.restore();
  };
  const text=(s:string,x:number,y:number,size:number,color='#c9ded5')=>{c.font=`600 ${size}px monospace`;c.fillStyle=color;c.fillText(s,x,y);};
  const stripes=(w:number,y:number)=>{for(let x=-40;x<w+50;x+=48){c.fillStyle='#b49752';c.beginPath();c.moveTo(x,y);c.lineTo(x+24,y);c.lineTo(x+4,y+20);c.lineTo(x-20,y+20);c.fill();}};
  tile('banner',(_,w)=>{text(signage.roomName,35,85,64);text(signage.subtitle,37,132,29);stripes(w,158);});
  tile('bio',(_,w)=>{c.fillStyle='#baa15f';c.fillRect(12,12,w-24,232);text('☣',53,144,132,'#17292c');text('QUARENTENA',22,193,28,'#17292c');text('RISCO 03',48,225,22,'#17292c');});
  tile('console',()=>{
   text('CONTROLE DE CONTENÇÃO',24,43,28);text('PRESSÃO  0.23',26,86,21,'#8dd9c1');text('SELAGEM: FALHA',26,118,21,'#ee9b70');
   c.strokeStyle='#5da5a8';c.lineWidth=2;for(let y=155;y<230;y+=18){c.beginPath();for(let x=25;x<470;x+=6)c.lineTo(x,y+Math.sin(x*.07)*7+(x%81===0?14:0));c.stroke();}
   for(let i=0;i<7;i++){c.fillStyle=i<5?'#558a82':'#d28264';c.fillRect(300+i*24,65,15,64);}
  });
  tile('ammo',()=>{text('M9 // 9mm',19,57,30);text('REPOSIÇÃO',23,111,29,'#91d4b0');text('[ E ] COMPRAR',24,158,24);text('CRÉDITOS / HUD',22,209,20,'#c5aa71');});
  tile('cabinet',()=>{text('ALTA TENSÃO',19,48,27,'#d4ba72');text('⚡',78,150,85,'#d1a55f');text(signage.powerCircuit,20,193,23);text('FALHA / REDE',28,229,21,'#e18a71');});
  tile('crate',()=>{text('BIO // 03',23,55,32);text('EQUIPAMENTO',23,102,25);text('ESTERILIZADO',23,139,24,'#92b9ae');stripes(256,188);text('PZD - 041',45,238,20);});
  tile('door',()=>{text(signage.doorName,29,61,43);text('SEGURANÇA',35,117,35,'#d6b572');text('ACESSO CONDICIONADO',34,165,28);stripes(512,210);});
  tile('floor',()=>{text('MANTENHA LIVRE',38,89,47,'#b9a679');text(signage.floorArea,40,148,36,'#b9a679');stripes(512,209);});
  tile('failure',()=>{text('SELAGEM PERDIDA',27,69,43,'#e5a28a');text('ISOLAR / NÃO OPERAR',29,121,31);text('SISTEMA EM EMERGÊNCIA',29,174,29,'#d0b47a');stripes(512,215);});
  tile('stain',()=>{c.clearRect(0,0,256,64);for(let i=0;i<90;i++){c.fillStyle=i%3?'#343a32':'#464337';c.beginPath();c.ellipse(15+random()*225,12+random()*40,2+random()*17,1+random()*5,-.15,0,Math.PI*2);c.fill();}});
  tile('scuff',()=>{c.clearRect(0,0,256,64);for(let i=0;i<12;i++){c.fillStyle='#364044';c.beginPath();c.ellipse(20+random()*220,8+random()*48,1+random()*4,1+random()*3,0,0,Math.PI*2);c.fill();}});
 });
 materials.atlas=new MeshBasicMaterial({map:atlas,toneMapped:false,alphaTest:.1});
 return{materials,textures,dispose:()=>{Object.values(materials).forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
export function useRoomSurfaces(overrides?:Partial<EnvironmentSignage>){const resources=useMemo(()=>createRoomSurfaces(overrides),[overrides]);useEffect(()=>()=>resources.dispose(),[resources]);return resources;}
