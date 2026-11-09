"""Inventory distributable GLBs. No geometry generation or invented metrics."""
import json,struct,hashlib
from pathlib import Path
root=Path('public/assets')
records=[]
meta={
 'models/weapons/m9.glb':('9mm Pistol / M9','Quaternius','https://poly.pizza/m/BoZWhFdsj4','CC-BY-3.0'),
 'models/viewmodels/tactical-arms.glb':('FPS arms — tactical adaptation','para / MakeHuman team','https://opengameart.org/content/fps-arms-rigged-only','CC0-1.0'),
 'models/characters/infected.glb':('Animated Zombie','Quaternius','https://poly.pizza/m/jkrEvQZb8J','CC-BY-3.0'),
 'models/characters/infected-lod.glb':('Animated Zombie LOD','Quaternius / project adaptation','https://poly.pizza/m/jkrEvQZb8J','CC-BY-3.0'),
}
for filename,(name,author,source,license) in meta.items():
 data=(root/filename).read_bytes()
 assert data[:4]==b'glTF'
 length=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+length])
 triangles=sum((gltf['accessors'][p['indices']]['count'] if 'indices' in p else gltf['accessors'][p['attributes']['POSITION']]['count'])//3
  for m in gltf['meshes'] for p in m['primitives'] if p.get('mode',4)==4)
 records.append(dict(name=name,path=filename,format='GLB 2.0',author=author,source=source,license=license,
  bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),triangles=triangles,
  primitives=sum(len(m['primitives']) for m in gltf['meshes']),
  textures=[i.get('name','embedded') for i in gltf.get('images',[])],
  skins=len(gltf.get('skins',[])),joints=[len(s['joints']) for s in gltf.get('skins',[])],
  animations=[a.get('name','unnamed') for a in gltf.get('animations',[])],status='provisional-integrated'))
(root/'manifests/visual-assets.json').write_text(json.dumps({'version':'M8.1.1','assets':records,
 'proceduralAnimations':['weapon Idle/Walk/Sprint/Fire/ADS/Equip','magazine withdrawal/insertion normalized to reloadDuration','infected HitReaction; Collapse adapted from Crawl'],
 'licenseCopies':'CC-BY-3.0.txt and CC0-1.0.txt from SPDX license-list-data; official license URLs in ATTRIBUTION.md'},indent=2)+'\n')
print(json.dumps(records,indent=2))
