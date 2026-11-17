import {describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {isLocal,assetPath}=createRequire(import.meta.url)('../../electron/policy.cjs');
const root=path.resolve('fixture-dist');
describe('Desktop local origin boundary',()=>{
 it('serves root and GLB locally',()=>{expect(assetPath('pdz://game/',root)).toBe(path.join(root,'index.html'));expect(assetPath('pdz://game/assets/a.glb',root)).toBe(path.join(root,'assets','a.glb'));});
 it('rejects network origins, credentials and path escapes',()=>{for(const url of ['https://game/a','file:///etc/passwd','pdz://evil/a','pdz://user@game/a','pdz://game/%2e%2e%2fsecret','pdz://game/a%5cb'])expect(assetPath(url,root)).toBeNull();expect(isLocal('pdz://game.evil/')).toBe(false);});
});

const {assetResponse}=createRequire(import.meta.url)('../../electron/assets.cjs');
it('serves local modules with strict MIME and CSP without a network server',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'pdz-'));
 try{await writeFile(path.join(root,'main.js'),'export const local=true');const r=await assetResponse('pdz://game/main.js','GET',root,"default-src 'self'");expect(r.status).toBe(200);expect(r.headers.get('Content-Type')).toBe('text/javascript');expect(r.headers.get('Content-Security-Policy')).toContain("'self'");expect(await r.text()).toContain('local=true');expect((await assetResponse('pdz://game/missing.glb','GET',root,'')).status).toBe(404);expect((await assetResponse('https://evil/main.js','GET',root,'')).status).toBe(403);}finally{await rm(root,{recursive:true,force:true});}
});
