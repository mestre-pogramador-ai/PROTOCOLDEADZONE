"""Rebuild original DSP layers; external inputs are downloaded separately with provenance."""
from pathlib import Path
import numpy as np, wave, json, hashlib, subprocess, urllib.request
root=Path('public/assets/audio');root.mkdir(parents=True,exist_ok=True)
manifest=[]
def record(name,source,license,author,changes):
 p=root/name;manifest.append(dict(file=name,source=source,license=license,author=author,changes=changes,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
def convert(src,name,source,license,author):
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-ac','1','-ar','44100','-af','alimiter=limit=0.8',str(root/name)],check=True);record(name,source,license,author,'Mono 44100 Hz PCM WAV, limiter; playback variants use modest pitch changes.')
# Reproducible download/extraction of verified sources (requires py7zr).
if not Path('/tmp/pdz-shots/shots/pistol.wav').exists():
 import py7zr
 urllib.request.urlretrieve('https://opengameart.org/sites/default/files/shots.7z','/tmp/shots.7z')
 with py7zr.SevenZipFile('/tmp/shots.7z') as z:z.extractall('/tmp/pdz-shots')
if not Path('/tmp/pdz-zombies/zombies/zombie-1.wav').exists():
 import zipfile
 urllib.request.urlretrieve('https://opengameart.org/sites/default/files/zombies.zip','/tmp/zombies.zip')
 with zipfile.ZipFile('/tmp/zombies.zip') as z:z.extractall('/tmp/pdz-zombies')
convert('/tmp/pdz-shots/shots/pistol.wav','m9-shot.wav','https://opengameart.org/content/chaingun-pistol-rifle-shotgun-shots','CC-BY-3.0','Michel Baradari (apollo-music.de)')
for i in range(1,9):convert(f'/tmp/pdz-zombies/zombies/zombie-{i}.wav',f'infected-{i}.wav','https://opengameart.org/content/zombies-sound-pack','CC0-1.0','artisticdude')
sha=Path('/tmp/rpg-sha').read_text().strip();base=f'https://raw.githubusercontent.com/Boyquotes/kenney-rpg-audio-for-godot/{sha}/'
for src,name in [('metal_click','slide'),('metal_latch','magazine'),('metal_pot_1','metal'),('footstep_0','step-1'),('footstep_1','step-2'),('door_close_1','door'),('cloth_1','cloth')]:
 url=base+'addons/kenney%20rpg%20audio/'+src+'.ogg';p=Path('/tmp')/(src+'.ogg');urllib.request.urlretrieve(url,p);convert(p,name+'.wav',url,'CC0-1.0','Kenney (mirror Boyquotes)')
urllib.request.urlretrieve(base+'LICENSE',root/'licenses/KENNEY-CC0.txt')
(root/'licenses/SHOT-CREDIT.txt').write_text(Path('/tmp/pdz-shots/shots/info.txt').read_text())
(root/'licenses/SOURCES.md').write_text('''# Audio attribution\nPistol: Michel Baradari / apollo-music.de, CC BY 3.0, https://opengameart.org/content/chaingun-pistol-rifle-shotgun-shots (download shots.7z). Attribution required; converted to mono PCM, playback pitch variants.\nZombie vocals: artisticdude, CC0, https://opengameart.org/content/zombies-sound-pack (zombies.zip). Converted to mono PCM.\nFoley: Kenney RPG Audio, CC0, pinned mirror and exact paths in manifest.json; source https://kenney.nl/assets/rpg-audio.\nOriginal DSP music/ambience/impact designs: tools/prepare-audio.py, created for PROTOCOL: DEAD ZONE, CC0 to the extent applicable. These are designed/synthesized audio files, not field recordings.\nNo recordings are certified as M9-specific or separately recorded for each zombie archetype.\n''')
rng=np.random.default_rng(814)
def save(name,x):
 x=np.asarray(x);x*=np.minimum(1,.75/(np.max(np.abs(x))+1e-8));
 with wave.open(str(root/(name+'.wav')),'wb') as w:w.setparams((1,2,22050,0,'NONE','not compressed'));w.writeframes((x*32767).astype('<i2').tobytes())
 record(name+'.wav','tools/prepare-audio.py','CC0-1.0','PROTOCOL DEAD ZONE original DSP','Original synthesis; not a recording. Seamless layer or enveloped transient.')
for i,name in enumerate(['menu','preparation','suspense','combat','critical','gameover','vent','electric']):
 t=np.arange(22050*8)/22050;freq=[44,36,51,62,48,27,58,120][i]
 x=sum(np.sin(2*np.pi*f*t+(.12*np.sin(2*np.pi*.25*t))) *a for f,a in [(freq,.09),(freq*1.5,.04),(freq+1,.025)])
 x*=.6+.4*np.sin(np.pi*t/8)**2
 # integer-period frequencies/phases return at loop boundary; 20ms edge fade suppresses residual clicks.
 edge=np.minimum(1,np.minimum(t/.02,(8-t)/.02));save(name,x*edge)
for name,freq,dur in [('concrete',91,.18),('glass',2300,.35),('flesh',130,.15),('alarm',740,1.2),('click',500,.09),('headshot',800,.16),('kill',280,.22),('denied',150,.2),('purchase',650,.25)]:
 t=np.arange(int(22050*dur))/22050;noise=rng.normal(0,.08,len(t));x=(np.sin(2*np.pi*freq*t)*.15+noise)*np.exp(-t/(dur/5))*np.minimum(1,t/.004);save(name,x)
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(len(manifest),'local WAVs',sum(x['bytes'] for x in manifest),'bytes')
