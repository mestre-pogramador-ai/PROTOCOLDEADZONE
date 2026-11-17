import {createServer} from 'vite';
import {writeFileSync} from 'node:fs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {createEnvironmentLayout,createDoorLayout}=await server.ssrLoadModule('/src/presentation/rendering/EnvironmentLayout.ts');
 const {buildEnvironmentBatches,createPartGeometry,disposeEnvironmentBatches}=await server.ssrLoadModule('/src/presentation/rendering/EnvironmentGeometry.ts');
 const parts=createEnvironmentLayout(),doorParts=createDoorLayout();let rawBytes=0,rawVertices=0;
 for(const p of [...parts,...doorParts]){const g=createPartGeometry(p);rawVertices+=g.getAttribute('position').count;for(const a of Object.values(g.attributes))rawBytes+=a.array.byteLength;g.dispose();}
 const room=buildEnvironmentBatches(parts,p=>p.anchor.includes('corridor')?'corridor':'room'),door=buildEnvironmentBatches(doorParts),all=[...room,...door];
 const result={parts:parts.length,roomBatches:room.filter(b=>b.bucket==='room').length,corridorBatches:room.filter(b=>b.bucket==='corridor').length,doorBatches:door.length,triangles:all.reduce((n,b)=>n+b.geometry.index.count/3,0),vertexCount:all.reduce((n,b)=>n+b.geometry.getAttribute('position').count,0),attributeBytes:all.reduce((n,b)=>n+Object.values(b.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0),0),indexBytes:all.reduce((n,b)=>n+b.geometry.index.array.byteLength,0),legacyNonIndexedEquivalent:{vertices:rawVertices,attributeBytes:rawBytes},note:'CPU typed-array byte lengths, not measured VRAM; legacy equivalent from unchanged nonindexed part meshes'};
 writeFileSync('/tmp/m814-geometry-inventory.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));disposeEnvironmentBatches(all);
}finally{await server.close();}
