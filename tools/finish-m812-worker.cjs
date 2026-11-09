/* Offline mesh processing; meshoptimizer is a tooling dependency, not game code.
 * ASSET_TOOLS_NODE_PATH=/tmp/m812-assets/node_modules node tools/finish-m812-worker.cjs
 */
const fs=require('node:fs');
const {BufferGeometry,BufferAttribute}=require('three');
const {MeshoptSimplifier}=require(require.resolve('meshoptimizer',{paths:[process.env.ASSET_TOOLS_NODE_PATH||'/tmp/m812-assets/node_modules']}));
(async()=>{
 await MeshoptSimplifier.ready;
 const path='public/assets/models/characters/infected-worker.glb';
 const bytes=fs.readFileSync(path),length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length));let bin=Buffer.from(bytes.subarray(28+length));
 const arity={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 const constructors={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array};
 function array(index){
  const a=g.accessors[index],v=g.bufferViews[a.bufferView],Type=constructors[a.componentType],width=arity[a.type],stride=v.byteStride||width*Type.BYTES_PER_ELEMENT;
  const result=new Type(a.count*width);
  for(let i=0;i<a.count;i++){
   const start=(v.byteOffset||0)+(a.byteOffset||0)+i*stride;
   const buffer=bin.subarray(start,start+width*Type.BYTES_PER_ELEMENT);
   result.set(new Type(Uint8Array.from(buffer).buffer),i*width);
  }
  return result;
 }
 function append(data){
  const padding=(4-bin.length%4)%4;bin=Buffer.concat([bin,Buffer.alloc(padding)]);const offset=bin.length;bin=Buffer.concat([bin,Buffer.from(data)]);
  g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.byteLength});return g.bufferViews.length-1;
 }
 function accessor(data,type,componentType){
  const view=append(Buffer.from(data.buffer,data.byteOffset,data.byteLength));
  g.accessors.push({bufferView:view,componentType,count:data.length/arity[type],type});return g.accessors.length-1;
 }
 function compact(attributes,indices,override){
  const used=[...new Set(indices)].sort((a,b)=>a-b),map=new Map(used.map((old,i)=>[old,i])),result={};
  for(const [name,id] of Object.entries(attributes)){
   const original=g.accessors[id],values=name==='POSITION'&&override?override:array(id),Type=constructors[original.componentType],width=arity[original.type],packed=new Type(used.length*width);
   used.forEach((old,i)=>packed.set(values.subarray(old*width,(old+1)*width),i*width));
   const next=accessor(packed,original.type,original.componentType);if(original.normalized)g.accessors[next].normalized=true;
   if(name==='POSITION'){g.accessors[next].min=[0,1,2].map(c=>Math.min(...used.map(i=>values[i*3+c])));g.accessors[next].max=[0,1,2].map(c=>Math.max(...used.map(i=>values[i*3+c])));}
   result[name]=next;
  }
  return {attributes:result,indices:accessor(Uint16Array.from(indices,i=>map.get(i)),'SCALAR',5123)};
 }
 const body=g.nodes.find(n=>n.name==='LOD0'),primitive=g.meshes[body.mesh].primitives[0];
 const positions=array(primitive.attributes.POSITION),indices=array(primitive.indices);
 const tangentGeometry=new BufferGeometry();tangentGeometry.setAttribute('position',new BufferAttribute(positions,3));tangentGeometry.setAttribute('normal',new BufferAttribute(array(primitive.attributes.NORMAL),3));tangentGeometry.setAttribute('uv',new BufferAttribute(array(primitive.attributes.TEXCOORD_0),2));tangentGeometry.setIndex(new BufferAttribute(indices,1));tangentGeometry.computeTangents();
 primitive.attributes.TANGENT=accessor(tangentGeometry.getAttribute('tangent').array,'VEC4',5126);tangentGeometry.dispose();
 const [simple,error]=MeshoptSimplifier.simplify(indices,positions,3,Math.floor(indices.length*.52/3)*3,.01,['LockBorder']);
 const low=structuredClone(body);low.name='LOD1';low.mesh=g.meshes.length;
 g.meshes.push({name:'Distance humanoid',primitives:[{...primitive,...compact(primitive.attributes,simple)}]});g.nodes.push(low);g.nodes[0].children.push(g.nodes.length-1);
 console.log('LOD triangles',indices.length/3,'->',simple.length/3,'relative error',error);
 const joints=array(primitive.attributes.JOINTS_0),weights=array(primitive.attributes.WEIGHTS_0),normals=array(primitive.attributes.NORMAL);
 const jointNames=g.skins[body.skin].joints.map(i=>g.nodes[i].name);
 const scale=g.accessors[primitive.attributes.WEIGHTS_0].normalized?(weights instanceof Uint16Array?65535:255):1;
 function chest(vertex){let weight=0;for(let j=0;j<4;j++)if(/Spine[23]|Clavicle/.test(jointNames[joints[vertex*4+j]]))weight+=weights[vertex*4+j]/scale;return weight;}
 const vestIndices=[];
 for(let i=0;i<indices.length;i+=3)if((chest(indices[i])+chest(indices[i+1])+chest(indices[i+2]))/3>.58)vestIndices.push(indices[i],indices[i+1],indices[i+2]);
 const shell=positions.slice();
 for(let i=0;i<shell.length;i++)shell[i]+=normals[i]*.0014;
 const weave=fs.readFileSync('public/assets/textures/m812/ranger-weave.png');g.images.push({name:'Original ballistic weave',bufferView:append(weave),mimeType:'image/png'});g.textures.push({source:g.images.length-1,sampler:0});
 const material=g.materials.length;g.materials.push({name:'Damaged ballistic textile',pbrMetallicRoughness:{baseColorFactor:[.95,.95,.95,1],baseColorTexture:{index:g.textures.length-1},metallicFactor:0,roughnessFactor:.88},doubleSided:true});
 const plateMaterial=g.materials.length;g.materials.push({name:'Worn protective plates',pbrMetallicRoughness:{baseColorFactor:[.04,.06,.045,1],metallicFactor:.12,roughnessFactor:.82},doubleSided:true});
 const plateIndices=vestIndices.filter((_,i)=>{
  const start=Math.floor(i/3)*3;
  return [0,1,2].every(j=>{const vertex=vestIndices[start+j];let shoulder=0;for(let k=0;k<4;k++)if(/Clavicle|UpperArm/.test(jointNames[joints[vertex*4+k]]))shoulder+=weights[vertex*4+k]/scale;return normals[vertex*3]<-.5&&shoulder<.1;});
 });
 const plate=positions.slice();for(let i=0;i<plate.length;i++)plate[i]+=normals[i]*.0038;
 const vest=structuredClone(body);vest.name='DamagedFlakVest';vest.mesh=g.meshes.length;
 g.meshes.push({name:'Fitted protective vest',primitives:[{...primitive,...compact(primitive.attributes,vestIndices,shell),material},{...primitive,...compact(primitive.attributes,plateIndices,plate),material:plateMaterial}]});g.nodes.push(vest);g.nodes[0].children.push(g.nodes.length-1);
 const normalized=g.scenes[0].nodes[0];g.nodes.push({name:'AuthoredForward',rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2],children:[normalized]});g.scenes[0].nodes=[g.nodes.length-1];
 // Remove source helper planes/objects; only the humanoid, vest and real LOD remain.
 const reachable=new Set();function visit(i){if(reachable.has(i))return;reachable.add(i);for(const c of g.nodes[i].children||[])visit(c);}
 g.scenes[0].nodes.forEach(visit);
 const used=[...reachable].sort((a,b)=>a-b),nodeMap=new Map(used.map((old,i)=>[old,i]));
 const meshIds=[...new Set(used.map(i=>g.nodes[i].mesh).filter(i=>i!==undefined))],meshMap=new Map(meshIds.map((old,i)=>[old,i]));
 const skinIds=[...new Set(used.map(i=>g.nodes[i].skin).filter(i=>i!==undefined))],skinMap=new Map(skinIds.map((old,i)=>[old,i]));g.skins=skinIds.map(i=>g.skins[i]);
 g.nodes=used.map(i=>{const n=g.nodes[i];if(n.children)n.children=n.children.map(c=>nodeMap.get(c));if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);if(n.skin!==undefined)n.skin=skinMap.get(n.skin);return n;});g.meshes=meshIds.map(i=>g.meshes[i]);
 g.scenes[0].nodes=g.scenes[0].nodes.map(i=>nodeMap.get(i));
 for(const skin of g.skins){skin.joints=skin.joints.map(i=>nodeMap.get(i));if(skin.skeleton!==undefined)skin.skeleton=nodeMap.get(skin.skeleton);}
 for(const a of g.animations)a.channels=a.channels.filter(c=>nodeMap.has(c.target.node)).map(c=>({...c,target:{...c.target,node:nodeMap.get(c.target.node)}}));
 // Repack only referenced accessors/views; discard unused source helper payload.
 for(const a of g.animations){const ids=[...new Set(a.channels.map(c=>c.sampler))],map=new Map(ids.map((old,i)=>[old,i]));a.samplers=ids.map(i=>a.samplers[i]);a.channels.forEach(c=>c.sampler=map.get(c.sampler));}
 const accessed=new Set();for(const m of g.meshes)for(const p of m.primitives){Object.values(p.attributes).forEach(i=>accessed.add(i));accessed.add(p.indices);}
 for(const s of g.skins)accessed.add(s.inverseBindMatrices);for(const a of g.animations)for(const s of a.samplers){accessed.add(s.input);accessed.add(s.output);}
 const ids=[...accessed].sort((a,b)=>a-b),accessMap=new Map(ids.map((old,i)=>[old,i]));
 const views=[...new Set([...ids.map(i=>g.accessors[i].bufferView),...g.images.map(i=>i.bufferView)])].sort((a,b)=>a-b),viewMap=new Map(views.map((old,i)=>[old,i]));
 let packed=Buffer.alloc(0);const newViews=views.map(i=>{const v=g.bufferViews[i],padding=(4-packed.length%4)%4;packed=Buffer.concat([packed,Buffer.alloc(padding)]);const offset=packed.length;packed=Buffer.concat([packed,bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)]);return {...v,buffer:0,byteOffset:offset};});
 g.accessors=ids.map(i=>({...g.accessors[i],bufferView:viewMap.get(g.accessors[i].bufferView)}));g.bufferViews=newViews;g.images.forEach(i=>i.bufferView=viewMap.get(i.bufferView));bin=packed;
 for(const m of g.meshes)for(const p of m.primitives){for(const k of Object.keys(p.attributes))p.attributes[k]=accessMap.get(p.attributes[k]);p.indices=accessMap.get(p.indices);}
 for(const s of g.skins)s.inverseBindMatrices=accessMap.get(s.inverseBindMatrices);for(const a of g.animations)for(const s of a.samplers){s.input=accessMap.get(s.input);s.output=accessMap.get(s.output);}
 for(const mesh of g.meshes)for(const p of mesh.primitives){for(const id of Object.values(p.attributes))g.bufferViews[g.accessors[id].bufferView].target=34962;g.bufferViews[g.accessors[p.indices].bufferView].target=34963;}
 g.buffers=[{byteLength:bin.length}];let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);fs.writeFileSync(path,Buffer.concat([header,json,bh,bin]));console.log('Vest triangles',vestIndices.length/3);
})().catch(e=>{console.error(e);process.exitCode=1;});
