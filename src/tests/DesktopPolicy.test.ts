import {describe,it,expect} from 'vitest';
import path from 'node:path';
import {createRequire} from 'node:module';
const {isLocal,assetPath}=createRequire(import.meta.url)('../../electron/policy.cjs');
const root=path.resolve('fixture-dist');
describe('Desktop local origin boundary',()=>{
 it('serves root and GLB locally',()=>{expect(assetPath('pdz://game/',root)).toBe(path.join(root,'index.html'));expect(assetPath('pdz://game/assets/a.glb',root)).toBe(path.join(root,'assets','a.glb'));});
 it('rejects network origins, credentials and path escapes',()=>{for(const url of ['https://game/a','file:///etc/passwd','pdz://evil/a','pdz://user@game/a','pdz://game/%2e%2e%2fsecret','pdz://game/a%5cb'])expect(assetPath(url,root)).toBeNull();expect(isLocal('pdz://game.evil/')).toBe(false);});
});
