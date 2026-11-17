import {build} from 'vite';
await build({build:{target:'esnext',outDir:'/tmp/pdz-audio-browser',emptyOutDir:true,rollupOptions:{input:'tools/browser-fixtures/audio.html'}}});
