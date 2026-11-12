const path = require('node:path');
const ORIGIN = 'pdz://game';
function isLocal(url) { try { const u=new URL(url); return u.protocol==='pdz:'&&u.hostname==='game'&&!u.port&&!u.username&&!u.password; } catch { return false; } }
function assetPath(url, root) {
 if (!isLocal(url)) return null;
 try {
  const name=decodeURIComponent(new URL(url).pathname);
  if (name.includes('\\')||name.includes('\0')) return null;
  const result=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  return result.startsWith(path.resolve(root)+path.sep)?result:null;
 } catch { return null; }
}
module.exports={ORIGIN,isLocal,assetPath};
