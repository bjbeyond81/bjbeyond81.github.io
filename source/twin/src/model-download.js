import {cpuModel,modelFiles,createModelCache,inspectModelCache} from './model-cache.js';
import {EMBEDDING_MODEL} from './domain.js';
import {downloadDirectory,downloadName,downloadMetadata} from './model-download-storage.js';

const RANGE_BYTES=8*1024*1024;
const fail=code=>new Error(code);
async function writeMetadata(directory,url,meta){
  const handle=await (await directory.getFileHandle(downloadName(url)+'.json',{create:true})).createSyncAccessHandle();
  try{
    const data=new TextEncoder().encode(JSON.stringify(meta));handle.truncate(0);
    let offset=0;while(offset<data.length){const n=handle.write(data.subarray(offset),{at:offset});if(!n)throw fail('MODEL_STORAGE_WRITE_FAILED');offset+=n;}
    handle.flush();
  }finally{handle.close();}
}

// Runs in a dedicated worker. Never buffer or clone the full model in JavaScript.
export async function downloadModelFile(url,{directory,fetcher=globalThis.fetch,onProgress=()=>{},timeoutMs=45_000}={}){
  if(!directory)throw fail('MODEL_STORAGE_UNAVAILABLE');
  const entry=await directory.getFileHandle(downloadName(url)+'.data',{create:true});
  let handle;
  try{handle=await entry.createSyncAccessHandle();}
  catch(error){throw fail(error.name==='NoModificationAllowedError'?'MODEL_DOWNLOAD_BUSY':'MODEL_STORAGE_UNAVAILABLE');}
  let meta=await downloadMetadata(directory,url),offset=handle.getSize(),resets=0;
  if(meta?.url!==url||!meta.total||!meta.etag||offset>meta.total){handle.truncate(0);offset=0;meta=null;}
  const file=url.split('/resolve/main/')[1];
  const report=()=>onProgress({phase:'download',file,loaded:offset,total:meta?.total||null,progress:meta?.total?offset/meta.total:null});
  try{
    // A tab may have closed after the last flush but before writing the marker.
    if(meta?.total&&offset===meta.total){
      handle.close();handle=null;
      await writeMetadata(directory,url,{...meta,size:offset,complete:true});
      onProgress({phase:'saved',file,loaded:offset,total:offset,progress:1});return;
    }
    // Clear an old completion marker before changing any bytes.
    await writeMetadata(directory,url,{...meta,url,complete:false});
    report();
    while(true){
      const controller=new AbortController();
      let timer,reader,response;
      const deadline=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),timeoutMs);};
      try{
        deadline();
        response=await fetcher(url,{cache:'no-store',headers:{Range:`bytes=${offset}-${offset+RANGE_BYTES-1}`},signal:controller.signal});
        if(!response.ok)throw fail(`MODEL_DOWNLOAD_HTTP_${response.status}`);
        const etag=response.headers.get('etag');
        const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||'');
        let expected;
        if(response.status===206){
          if(!range||Number(range[1])!==offset||Number(range[2])<offset||Number(range[2])>=Number(range[3]))throw fail('MODEL_DOWNLOAD_RANGE_INVALID');
          expected=Number(range[2])+1;
          if(offset&&((meta?.etag&&etag!==meta.etag)||(meta?.total&&Number(range[3])!==meta.total))){
            await response.body?.cancel();
            if(++resets>1)throw fail('MODEL_DOWNLOAD_CHANGED');
            handle.truncate(0);offset=0;meta=null;
            await writeMetadata(directory,url,{url,complete:false});continue;
          }
          meta={url,total:Number(range[3]),etag,type:response.headers.get('content-type'),complete:false};
        }else if(response.status===200){
          // Servers that ignore Range must replace the partial file, never append to it.
          handle.truncate(0);offset=0;
          const length=Number(response.headers.get('content-length'))||null;
          expected=length;meta={url,total:length,etag,type:response.headers.get('content-type'),complete:false};
        }else throw fail('MODEL_DOWNLOAD_RANGE_INVALID');
        await writeMetadata(directory,url,meta);
        if(!response.body)throw fail('MODEL_DOWNLOAD_EMPTY');
        reader=response.body.getReader();
        let flushed=offset,lastReport=0;
        report();
        while(true){
          deadline();const {done,value}=await reader.read();if(done)break;
          if(expected&&offset+value.byteLength>expected)throw fail('MODEL_DOWNLOAD_RANGE_INVALID');
          let written=0;
          while(written<value.byteLength){const n=handle.write(value.subarray(written),{at:offset});if(!n)throw fail('MODEL_STORAGE_WRITE_FAILED');written+=n;offset+=n;}
          if(offset-flushed>=4*1024*1024){handle.flush();flushed=offset;}
          if(Date.now()-lastReport>200){report();lastReport=Date.now();}
        }
        if(expected&&offset!==expected)throw fail('MODEL_DOWNLOAD_INCOMPLETE');
        if(!offset)throw fail('MODEL_DOWNLOAD_EMPTY');
        handle.flush();report();
        if(response.status===200||offset===meta.total){
          // Do not expose a complete model until all bytes are durably written.
          handle.close();handle=null;
          await writeMetadata(directory,url,{...meta,total:offset,size:offset,complete:true});
          onProgress({phase:'saved',file,loaded:offset,total:offset,progress:1});return;
        }
      }finally{
        clearTimeout(timer);controller.abort();try{await reader?.cancel();}catch{}
        try{reader?.releaseLock();}catch{}
        if(!reader)try{await response?.body?.cancel();}catch{}
      }
    }
  }catch(error){
    if(error.name==='QuotaExceededError')throw fail('MODEL_STORAGE_FULL');
    if(error.name==='AbortError')throw fail('MODEL_DOWNLOAD_TIMEOUT');
    throw error;
  }finally{if(handle){try{handle.flush();}catch{}handle.close();}}
}

export async function prepareModelFiles({mode='cpu',onProgress=()=>{},cache,opfs=globalThis.navigator?.storage,fetcher=globalThis.fetch}={}){
  cache ||= await createModelCache({opfs});
  const files=[...modelFiles(EMBEDDING_MODEL),...(mode!=='gpu'?modelFiles(cpuModel(mode)):[])];
  let directory;
  for(const url of files){
    if(await cache.match(url))continue;
    directory ||= await downloadDirectory(opfs,true);
    await downloadModelFile(url,{directory,fetcher,onProgress});
  }
  // Reopen the directory: it may not have existed when the first cache was created.
  return inspectModelCache(await createModelCache({opfs}),mode);
}
