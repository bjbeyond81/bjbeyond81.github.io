export const MAX_VOICE_SECONDS=180;
export const MAX_VOICE_BYTES=4*1024*1024;
export function createVoiceRecorder({mediaDevices=globalThis.navigator?.mediaDevices,Recorder=globalThis.MediaRecorder,onChange=()=>{},onComplete=()=>{},onError=()=>{},now=()=>Date.now(),interval=globalThis.setInterval,clear=globalThis.clearInterval}={}){
 let recorder,stream,timer,started=0,requesting=false,generation=0,completion;
 const tracksOff=()=>{for(const track of stream?.getTracks?.()||[])track.stop();stream=null;if(timer)clear(timer);timer=null;};
 function stop(){if(requesting){generation++;requesting=false;onChange({state:'idle',seconds:0});return Promise.resolve(null);}if(!recorder)return completion||Promise.reject(new Error('VOICE_NOT_RECORDING'));if(recorder.state!=='inactive')recorder.stop();tracksOff();return completion;}
 return {
  get recording(){return requesting||Boolean(recorder&&recorder.state!=='inactive');},
  async start(){
   if(requesting||recorder)throw new Error('VOICE_RECORDING_BUSY');
   if(!Recorder||!mediaDevices?.getUserMedia)throw new Error('VOICE_NOT_SUPPORTED');
   const epoch=++generation;requesting=true;onChange({state:'requesting',seconds:0});
   try{
    const incoming=await mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
    if(epoch!==generation){incoming.getTracks().forEach(t=>t.stop());throw new Error('AI_CANCELLED');}
    stream=incoming;requesting=false;
    const mimeType=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>Recorder.isTypeSupported?.(type));
    recorder=new Recorder(stream,{...(mimeType?{mimeType}:{}),audioBitsPerSecond:64000});
    const current=recorder,chunks=[];let size=0,failure;
    completion=new Promise((resolve,reject)=>{
     current.ondataavailable=event=>{if(event.data?.size){size+=event.data.size;chunks.push(event.data);if(size>MAX_VOICE_BYTES){failure=new Error('VOICE_TOO_LARGE');stop().catch(()=>{});}}};
     current.onerror=()=>{failure=new Error('VOICE_RECORDING_FAILED');tracksOff();if(current.state!=='inactive')current.stop();else{recorder=null;reject(failure);onError(failure);}};
     current.onstop=()=>{
      tracksOff();recorder=null;
      if(epoch!==generation){reject(new Error('AI_CANCELLED'));return;}
      if(failure){reject(failure);onError(failure);onChange({state:'idle',seconds:0});return;}
      const blob=new Blob(chunks,{type:current.mimeType||mimeType||'audio/mp4'}),duration=Math.min(MAX_VOICE_SECONDS,Math.max(.1,(now()-started)/1000));
      if(!blob.size){const error=new Error('VOICE_EMPTY');reject(error);onError(error);return;}
      const result={blob,duration,mimeType:blob.type};resolve(result);onChange({state:'ready',seconds:duration});onComplete(result);
     };
    });
    completion.catch(()=>{});started=now();current.start(1000);onChange({state:'recording',seconds:0});
    timer=interval(()=>{const seconds=(now()-started)/1000;onChange({state:'recording',seconds:Math.min(MAX_VOICE_SECONDS,seconds)});if(seconds>=MAX_VOICE_SECONDS)stop().catch(()=>{});},250);
   }catch(error){requesting=false;tracksOff();recorder=null;onChange({state:'idle',seconds:0});throw error;}
  },
  stop,
  cancel(){generation++;requesting=false;if(recorder?.state!=='inactive')try{recorder?.stop();}catch{}recorder=null;tracksOff();completion=null;onChange({state:'idle',seconds:0});}
 };
}
export async function decodeVoice(blob,{Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext}={}){
 if(!Offline)throw new Error('VOICE_DECODE_UNSUPPORTED');
 if(!blob?.size||blob.size>MAX_VOICE_BYTES)throw new Error('VOICE_TOO_LARGE');
 const decoder=new Offline(1,1,16000),decoded=await decoder.decodeAudioData(await blob.arrayBuffer());
 if(!decoded.duration||decoded.duration>MAX_VOICE_SECONDS+1)throw new Error('VOICE_TOO_LONG');
 const renderer=new Offline(1,Math.ceil(decoded.duration*16000),16000),source=renderer.createBufferSource();source.buffer=decoded;source.connect(renderer.destination);source.start();
 const rendered=await renderer.startRendering(),samples=new Float32Array(rendered.getChannelData(0));
 let energy=0;for(let i=0;i<samples.length;i++)energy+=samples[i]*samples[i];if(Math.sqrt(energy/samples.length)<.0001)throw new Error('VOICE_SILENT');
 return samples;
}
