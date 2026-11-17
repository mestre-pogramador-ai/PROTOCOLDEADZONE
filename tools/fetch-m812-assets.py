"""Fetch verified licensed sources. Runtime never calls this offline tool."""
import hashlib,json,sys,urllib.request,zipfile
from pathlib import Path
destination=Path(sys.argv[1]);destination.mkdir(parents=True,exist_ok=True)
for record in json.loads(Path('public/assets/manifests/sources-m812.json').read_text()):
 with urllib.request.urlopen(urllib.request.Request(record['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as response:data=response.read()
 if hashlib.sha256(data).hexdigest()!=record['sha256']:raise RuntimeError('Source changed: '+record['file'])
 path=destination/record['file'];path.write_bytes(data)
 with zipfile.ZipFile(path) as archive:
  if any(Path(n).is_absolute() or '..' in Path(n).parts for n in archive.namelist()):raise RuntimeError('Unsafe archive path')
  archive.extractall(path.with_suffix(''))
 print(record['file'],len(data),record['license'])
