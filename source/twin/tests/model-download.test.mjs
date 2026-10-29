import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,existsSync,openSync,closeSync,readFileSync,statSync,writeSync,ftruncateSync,fsyncSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createModelCache,inspectModelCache,modelFiles,CPU_MODEL,MOBILE_MODEL} from '../src/model-cache.js';
import {createHash} from 'node:crypto';
import {expectedModelIntegrity} from '../src/model-integrity.js';
import {EMBEDDING_MODEL} from '../src/domain.js';
import {downloadModelFile,prepareModelFiles} from '../src/model-download.js';
import {downloadDirectory} from '../src/model-download-storage.js';

// File System API adapter backed by real temporary files, including exclusive writer locks.
function filesystem(t){
 const root=mkdtempSync(join(tmpdir(),'twin-download-')),locks=new Set();
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const directory=path=>({
  async getDirectoryHandle(name,{create=false}={}){const p=join(path,name);if(create)mkdirSync(p,{recursive:true});if(!existsSync(p))throw Error('not found');return directory(p);},
  async getFileHandle(name,{create=false}={}){
   const p=join(path,name);if(create&&!existsSync(p))closeSync(openSync(p,'w'));if(!existsSync(p))throw Error('not found');
   return {
    async getFile(){return new Blob([readFileSync(p)]);},
    async createSyncAccessHandle(){
     if(locks.has(p))throw new DOMException('busy','NoModificationAllowedError');locks.add(p);const fd=openSync(p,'r+');
     return {getSize:()=>statSync(p).size,truncate:n=>ftruncateSync(fd,n),write:(value,{at})=>writeSync(fd,value,0,value.byteLength,at),flush:()=>fsyncSync(fd),close(){closeSync(fd);locks.delete(p);}};
    }
   };
  }
 });
 return {getDirectory:async()=>directory(root)};
}
const url=modelFiles(CPU_MODEL).at(-1);
function response(data,{start=0,total=data.length,etag='"model-v1"',status=206,broken=false}={}){
 let step=0;
 const body=new ReadableStream({pull(controller){if(step++===0)controller.enqueue(new TextEncoder().encode(data));else if(broken)controller.error(Error('connection dropped'));else controller.close();}});
 const r=new Response(body,{status,headers:{'content-length':String(status===200?total:data.length),'content-range':`bytes ${start}-${start+data.length-1}/${total}`,etag}});
 r.arrayBuffer=()=>{throw Error('must not buffer whole response');};r.clone=()=>{throw Error('must not clone response');};
 return r;
}
async function interrupted(directory){
 await assert.rejects(downloadModelFile(url,{directory,integrity:null,fetcher:async()=>response('abcd',{total:10,broken:true})}),/connection dropped/);
}
test('interrupted bytes are hidden from cache, then resumed after a new session',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true);await interrupted(directory);
 assert.equal(await (await createModelCache({storage:null,opfs,integrity:()=>null})).match(url),undefined);
 let range;
 await downloadModelFile(url,{directory,integrity:null,fetcher:async(_url,options)=>{range=options.headers.Range;return response('efghij',{start:4,total:10});}});
 assert.equal(range,'bytes=4-8388611');
 const restarted=await createModelCache({storage:null,opfs,integrity:()=>null});assert.equal(await (await restarted.match(url)).text(),'abcdefghij');
});
test('a server ignoring Range replaces the partial file instead of appending',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true);await interrupted(directory);
 await downloadModelFile(url,{directory,integrity:null,fetcher:async()=>response('0123456789',{status:200})});
 assert.equal(await (await (await createModelCache({storage:null,opfs,integrity:()=>null})).match(url)).text(),'0123456789');
});
test('a changed remote model restarts rather than mixing versions',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true);await interrupted(directory);const ranges=[];
 await downloadModelFile(url,{directory,integrity:null,fetcher:async(_url,options)=>{
  ranges.push(options.headers.Range);
  return ranges.length===1?response('456789',{start:4,total:10,etag:'"v2"'}):response('0123456789',{etag:'"v2"'});
 }});
 assert.deepEqual(ranges,['bytes=4-8388611','bytes=0-8388607']);
 assert.equal(await (await (await createModelCache({storage:null,opfs,integrity:()=>null})).match(url)).text(),'0123456789');
});
test('invalid ranges and truncated HTTP 200 bodies never become complete models',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true);await interrupted(directory);
 await assert.rejects(downloadModelFile(url,{directory,integrity:null,fetcher:async()=>response('xyz',{start:0,total:10})}),/RANGE_INVALID/);
 await assert.rejects(downloadModelFile(url,{directory,integrity:null,fetcher:async()=>response('xyz',{status:200,total:10})}),/INCOMPLETE/);
 assert.equal(await (await createModelCache({storage:null,opfs,integrity:()=>null})).match(url),undefined);
});
test('multi-range downloads stream chunks to disk without response buffering or cloning',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true),total=9*1024*1024+5,calls=[],events=[];
 await downloadModelFile(url,{directory,integrity:null,onProgress:p=>events.push(p),fetcher:async(_url,options)=>{
  const [,a,b]=/bytes=(\d+)-(\d+)/.exec(options.headers.Range),start=Number(a),end=Math.min(Number(b),total-1);calls.push(start);
  let position=start;
  const r=new Response(new ReadableStream({pull(controller){if(position>end){controller.close();return;}const length=Math.min(64*1024,end-position+1);controller.enqueue(new Uint8Array(length).fill(42));position+=length;}}),{status:206,headers:{'content-range':`bytes ${start}-${end}/${total}`,etag:'"large"'}});
  r.arrayBuffer=()=>{throw Error('buffered');};r.clone=()=>{throw Error('cloned');};return r;
 }});
 assert.deepEqual(calls,[0,8*1024*1024]);assert.equal(events.at(-1).phase,'saved');
 const saved=await (await createModelCache({storage:null,opfs,integrity:()=>null})).match(url);assert.equal(Number(saved.headers.get('content-length')),total);
});
test('setup downloads only the missing eighth file and reaches complete on a fresh cache',async t=>{
 const opfs=filesystem(t),files=[...modelFiles(EMBEDDING_MODEL),...modelFiles(CPU_MODEL)],requested=[];
 const cache={match:async file=>files.slice(0,-1).includes(file)?new Response('existing'):undefined};
 await prepareModelFiles({cache,opfs,integrity:()=>null,fetcher:async file=>{requested.push(file);return response('last file');}});
 assert.deepEqual(requested,[url]);
 const persisted=await createModelCache({storage:null,opfs,integrity:()=>null});
 const combined={match:async file=>(await cache.match(file))||(await persisted.match(file))};
 assert.equal((await inspectModelCache(combined)).found,8);assert.equal((await inspectModelCache(combined)).cached,true);
});
test('quota failures cannot leave a completion marker',async t=>{
 const opfs=filesystem(t),real=await downloadDirectory(opfs,true);
 const directory={async getFileHandle(name,options){const h=await real.getFileHandle(name,options);if(!name.endsWith('.data'))return h;return {async createSyncAccessHandle(){const sync=await h.createSyncAccessHandle();sync.write=()=>{throw new DOMException('disk full','QuotaExceededError');};return sync;}};}};
 await assert.rejects(downloadModelFile(url,{directory,integrity:null,fetcher:async()=>response('file')}),/MODEL_STORAGE_FULL/);
 assert.equal(await (await createModelCache({storage:null,opfs,integrity:()=>null})).match(url),undefined);
});
test('mobile setup reuses MiniLM and fetches only the selected lightweight model',async t=>{
 const opfs=filesystem(t),requested=[],cache={match:async file=>modelFiles(EMBEDDING_MODEL).includes(file)?new Response('saved embeddings'):undefined};
 await prepareModelFiles({mode:'mobile',cache,opfs,integrity:()=>null,fetcher:async file=>{requested.push(file);return response('mobile file');}});
 assert.deepEqual(requested,modelFiles(MOBILE_MODEL));
 const persisted=await createModelCache({storage:null,opfs,integrity:()=>null}),combined={match:async file=>(await cache.match(file))||(await persisted.match(file))};
 assert.equal((await inspectModelCache(combined,'mobile')).cached,true);
});

test('SHA-256 verifies all bytes after an interrupted download is resumed',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true),content='abcdefghij';
 const integrity={sha256:createHash('sha256').update(content).digest('hex'),size:10};
 await assert.rejects(downloadModelFile(url,{directory,integrity,fetcher:async()=>response('abcd',{total:10,broken:true})}),/connection dropped/);
 await downloadModelFile(url,{directory,integrity,fetcher:async(_url,options)=>{assert.equal(options.headers.Range,'bytes=4-8388611');return response('efghij',{start:4,total:10});}});
 const cache=await createModelCache({storage:null,opfs,integrity:()=>integrity});
 assert.equal(await (await cache.match(url)).text(),content);
});
test('a corrupt model is rejected, truncated and downloaded afresh instead of being cached',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true),valid='valid-ai!';
 const integrity={sha256:createHash('sha256').update(valid).digest('hex'),size:valid.length};
 await assert.rejects(downloadModelFile(url,{directory,integrity,fetcher:async()=>response('corrupted',{status:200})}),/MODEL_INTEGRITY_FAILED/);
 let cache=await createModelCache({storage:null,opfs,integrity:()=>integrity});assert.equal(await cache.match(url),undefined);
 let range;await downloadModelFile(url,{directory,integrity,fetcher:async(_url,options)=>{range=options.headers.Range;return response(valid,{status:200});}});
 assert.equal(range,'bytes=0-8388607');cache=await createModelCache({storage:null,opfs,integrity:()=>integrity});assert.equal(await (await cache.match(url)).text(),valid);
});
test('small configuration files are checked against their exact Git blob ID',async t=>{
 const opfs=filesystem(t),directory=await downloadDirectory(opfs,true),content='{"format":"twin-test"}\n',bytes=Buffer.from(content);
 const integrity={gitBlob:createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),size:bytes.length};
 await downloadModelFile(url,{directory,integrity,fetcher:async()=>response(content,{status:200})});
 const cache=await createModelCache({storage:null,opfs,integrity:()=>integrity});assert.equal(await (await cache.match(url)).text(),content);
});
test('the production manifest covers every embedding, CPU, mobile and transcription file',()=>{
 const files=[...modelFiles(EMBEDDING_MODEL),...modelFiles(CPU_MODEL),...modelFiles(MOBILE_MODEL)];
 for(const file of ['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'])files.push(`https://huggingface.co/Xenova/whisper-tiny/resolve/main/${file}`);
 assert.equal(files.length,19);
 for(const file of files){const expected=expectedModelIntegrity(file);assert(expected,file);assert(Number.isSafeInteger(expected.size));assert(expected.sha256?.length===64||expected.gitBlob?.length===40,file);}
 assert.equal(expectedModelIntegrity('https://example.com/model'),undefined);
});
