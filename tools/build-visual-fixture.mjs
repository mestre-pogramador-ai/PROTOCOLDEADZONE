import {build} from 'vite';
await build({build:{outDir:process.env.VISUAL_FIXTURE_DIR||'/tmp/m811-visual-build',emptyOutDir:true,
 rollupOptions:{input:'tools/browser-fixtures/visuals.html'}}});
