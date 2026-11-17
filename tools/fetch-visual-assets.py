"""Download the public, licensed originals used by the conversion pipeline.
Python stdlib + py7zr (only for extracting the CC0 arms source).
"""
import hashlib,json,sys,urllib.request
from pathlib import Path
destination=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/m811-sources');destination.mkdir(parents=True,exist_ok=True)
for record in json.loads(Path('public/assets/manifests/sources.json').read_text()):
 data=urllib.request.urlopen(urllib.request.Request(record['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=60).read()
 if hashlib.sha256(data).hexdigest()!=record['sha256']:raise RuntimeError('Source changed: '+record['file'])
 (destination/record['file']).write_bytes(data)
 print(record['file'],len(data))
import py7zr
with py7zr.SevenZipFile(destination/'fps-arms.7z') as archive:archive.extractall(destination/'arms')
