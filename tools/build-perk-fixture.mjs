import {build} from 'vite';
await build({build:{outDir:process.env.M81_FIXTURE_DIR||'/tmp/m81-perk-build',emptyOutDir:true,
 rollupOptions:{input:'tools/browser-fixtures/perks.html'}}});
