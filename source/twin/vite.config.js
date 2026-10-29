import { defineConfig } from 'vite';
import {collectNotices} from './scripts/notices.mjs';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const walk = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir,e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]);
export default defineConfig({
  base: './',
  server: {allowedHosts:['terminal.local']},
  preview: {allowedHosts:['terminal.local']},
  // Transformers is used only for CPU inference; WebLLM owns GPU generation.
  resolve: {alias:{'onnxruntime-web/webgpu':'onnxruntime-web/wasm'},conditions:['onnxruntime-web-use-extern-wasm','module','browser','development|production']},
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 1800 },
  plugins: [{name:'twin-offline',
    buildStart() {
      collectNotices();
      const dest=resolve('public/ort'); rmSync(dest,{recursive:true,force:true}); mkdirSync(dest,{recursive:true});
      // Version matches Transformers.js' own ONNX runtime. Local WASM needs no CDN at runtime.
      const root=resolve('node_modules/onnxruntime-web/dist');
      for (const file of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm']) copyFileSync(join(root,file),join(dest,file));
    },
    closeBundle() {
      const files=walk('dist').filter(p=>p!=='sw.js');
      const digest=createHash('sha256'); for(const file of files.sort()) digest.update(readFileSync(join('dist',file)));
      const template=readFileSync('scripts/sw-template.js','utf8');
      writeFileSync('dist/sw.js',template.replace('__VERSION__',digest.digest('hex').slice(0,16)).replace('__PRECACHE__',JSON.stringify(files.map(p=>'./'+p))));
      writeFileSync('dist/.nojekyll','');
    }
  }]
});
