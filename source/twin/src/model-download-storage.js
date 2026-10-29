// Public model data only. A completion marker keeps interrupted files out of the cache.
export const DOWNLOAD_DIRECTORY='twin-model-downloads-v1';
export const downloadName=url=>btoa(url).replace(/[/+=]/g,'_');
export async function downloadDirectory(opfs=globalThis.navigator?.storage,create=false){
  try{return await (await opfs?.getDirectory?.())?.getDirectoryHandle(DOWNLOAD_DIRECTORY,{create});}catch{return undefined;}
}
export async function downloadMetadata(directory,url){
  if(!directory)return null;
  try{return JSON.parse(await (await (await directory.getFileHandle(downloadName(url)+'.json')).getFile()).text());}catch{return null;}
}
export async function savedDownload(directory,url,integrity){
  const meta=await downloadMetadata(directory,url);
  if(!meta?.complete||meta.url!==url||!Number.isSafeInteger(meta.size)||meta.size<=0)return undefined;
  const expected=integrity?.sha256||integrity?.gitBlob;
  if(expected&&meta.integrity!==expected)return undefined;
  try{
    const file=await (await directory.getFileHandle(downloadName(url)+'.data')).getFile();
    if(file.size===meta.size)return new Response(file,{headers:{'content-length':String(file.size),'content-type':meta.type||'application/octet-stream'}});
  }catch{}
}
