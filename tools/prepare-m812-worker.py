"""Preserve the original FBX2glTF skin/binds while assembling licensed clips.
Usage: python tools/prepare-m812-worker.py <sources>. Offline dependency: Pillow.
Do not round-trip this legacy FBX skeleton through Blender's bone rest conversion.
"""
import json,struct,sys,copy,io
from pathlib import Path
from PIL import Image,ImageOps
src=Path(sys.argv[1])
def read(path):
 b=path.read_bytes();length=struct.unpack_from('<I',b,12)[0]
 return json.loads(b[20:20+length]),bytearray(b[28+length:])
g,data=read(src/'pixel-walk.glb')
def append(blob):
 while len(data)%4:data.append(0)
 offset=len(data);data.extend(blob);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)})
 return len(g['bufferViews'])-1
def floats(values,kind,count):
 index=append(struct.pack('<'+'f'*len(values),*values));g['accessors'].append({'bufferView':index,'componentType':5126,'count':count,'type':kind})
 return len(g['accessors'])-1
def values(accessor):
 a=g['accessors'][accessor];v=g['bufferViews'][a['bufferView']];count=a['count']*{'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
 return list(struct.unpack_from('<'+'f'*count,data,v.get('byteOffset',0)+a.get('byteOffset',0)))
names={n['name']:i for i,n in enumerate(g['nodes'])}
g['animations'][0]['name']='Walk'
for file,name in [('pixel-attack.glb','Attack'),('pixel-dead.glb','Death')]:
 other,blob=read(src/file);viewbase=len(g['bufferViews']);accessbase=len(g['accessors'])
 while len(data)%4:data.append(0)
 offset=len(data);data.extend(blob)
 for v in other['bufferViews']:
  v=copy.deepcopy(v);v['buffer']=0;v['byteOffset']=v.get('byteOffset',0)+offset;g['bufferViews'].append(v)
 for a in other['accessors']:
  a=copy.deepcopy(a);a['bufferView']+=viewbase;g['accessors'].append(a)
 a=copy.deepcopy(other['animations'][0]);a['name']=name
 for s in a['samplers']:s['input']+=accessbase;s['output']+=accessbase
 channels=[]
 for c in a['channels']:
  nameOfNode=other['nodes'][c['target']['node']]['name']
  if nameOfNode in names:c['target']['node']=names[nameOfNode];channels.append(c)
 a['channels']=channels;g['animations'].append(a)
# In-place root motion: target is a child of an identity RootNode, in Y-up units.
hips=names['Bip01'];base=None
for c in g['animations'][0]['channels']:
 if c['target']=={'node':hips,'path':'translation'}:base=values(g['animations'][0]['samplers'][c['sampler']]['output'])[:3]
assert base
for a in g['animations']:
 for c in a['channels']:
  if c['target']=={'node':hips,'path':'translation'}:
   sampler=a['samplers'][c['sampler']];v=values(sampler['output'])
   for i in range(0,len(v),3):v[i]=base[0];v[i+2]=base[2]
   sampler['output']=floats(v,'VEC3',len(v)//3)
# Static authored walk pose for Idle, retaining the exact bind-compatible channels.
idle={'name':'Idle','channels':[],'samplers':[]};times=floats([0,2],'SCALAR',2);g['accessors'][times].update(min=[0],max=[2])
for c in g['animations'][0]['channels']:
 s=g['animations'][0]['samplers'][c['sampler']];a=g['accessors'][s['output']];width={'VEC3':3,'VEC4':4}[a['type']];v=values(s['output'])[:width]
 sampler=len(idle['samplers']);idle['samplers'].append({'input':times,'output':floats(v+v,a['type'],2),'interpolation':'LINEAR'})
 channel=copy.deepcopy(c);channel['sampler']=sampler;idle['channels'].append(channel)
g['animations'].append(idle)
# Restrict the scene to the real body and skeleton; drop FBX floor/helper meshes.
body=names['default'];g['nodes'][0]['children']=[body,hips];g['nodes'][body]['name']='LOD0'
g['nodes'][names['Bip01 Head']]['name']='Head';g['nodes'][names['Bip01 HeadNub']]['name']='HeadTop_End';g['nodes'][hips]['name']='Hips'
# Transform measured in the original evaluated pose (Blender Z-up -> glTF Y-up).
factor=3.4086314467965844
g['nodes'].append({'name':'InfectedAsset','translation':[-.4083681106567383*factor,.00612028781324625*factor,.21674060821533203*factor],'scale':[factor]*3,'children':[0]})
g['scenes']=[{'name':'Contaminated worker','nodes':[len(g['nodes'])-1]}];g['scene']=0
g['images']=[];g['textures']=[];g['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
def texture(filename,rough=False):
 image=Image.open(src/'zombie-pixelhouse'/filename).convert('RGB');image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
 if rough:
  gray=ImageOps.grayscale(image).point(lambda value:max(107,min(240,int(255-value*.65))))
  image=Image.merge('RGB',(Image.new('L',gray.size,255),gray,Image.new('L',gray.size,0)))
 b=io.BytesIO();image.save(b,format='PNG' if rough else 'JPEG',**({} if rough else {'quality':92}))
 view=append(b.getvalue());g['images'].append({'name':'Worker '+filename,'bufferView':view,'mimeType':'image/png' if rough else 'image/jpeg'})
 g['textures'].append({'source':len(g['images'])-1,'sampler':0});return len(g['textures'])-1
diffuse=texture('difusse.jpg');normal=texture('normal.JPG');rough=texture('especular.jpg',True)
g['materials'][0]={'name':'Contaminated workwear','pbrMetallicRoughness':{'baseColorTexture':{'index':diffuse},'metallicRoughnessTexture':{'index':rough},'metallicFactor':0,'roughnessFactor':1},'normalTexture':{'index':normal,'scale':.65},'doubleSided':False}
# Extra helper meshes are unreachable, but retain harmless material indices.
for m in g['meshes']:
 for p in m['primitives']:p['material']=0
g['buffers']=[{'byteLength':len(data)}]
encoded=json.dumps(g,separators=(',',':')).encode()
while len(encoded)%4:encoded+=b' '
while len(data)%4:data.append(0)
result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(data))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(data),0x004e4942)+data
path=Path('public/assets/models/characters/infected-worker.glb');path.write_bytes(result);print(path,len(result))
