import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceRecorder,decodeVoice} from '../src/voice.js';
function setup(){
 let clock=0,tick,stopped=0,completed;const states=[];
 class Recorder{
  static isTypeSupported(type){return type==='audio/mp4';}
  constructor(_stream,options){this.state='inactive';this.mimeType=options.mimeType;}
  start(){this.state='recording';}
  stop(){if(this.state==='inactive')return;this.state='inactive';this.ondataavailable({data:new Blob(['recorded audio'],{type:this.mimeType})});this.onstop();}
 }
 const recorder=createVoiceRecorder({mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})},Recorder,now:()=>clock,interval:fn=>(tick=fn,1),clear(){},onChange:state=>states.push(state),onComplete:result=>completed=result});
 return {recorder,states,advance:ms=>clock+=ms,tick:()=>tick(),stopped:()=>stopped,completed:()=>completed};
}
test('recording is a local audio blob and stopping releases microphone tracks',async()=>{
 const s=setup();await s.recorder.start();assert.equal(s.recorder.recording,true);s.advance(3000);const audio=await s.recorder.stop();
 assert.equal(audio.blob.type,'audio/mp4');assert.equal(await audio.blob.text(),'recorded audio');assert.equal(audio.duration,3);assert.equal(s.recorder.recording,false);assert(s.stopped()>0);
});
test('three-minute recording limit stops automatically and still delivers a saved draft',async()=>{
 const s=setup();await s.recorder.start();s.advance(180_100);s.tick();await new Promise(setImmediate);
 assert.equal(s.recorder.recording,false);assert.equal(s.completed().duration,180);assert(s.stopped()>0);
});
test('cancelling a pending microphone request stops a subsequently granted stream',async()=>{
 let resolve,stopped=0;const microphone=new Promise(r=>resolve=r);
 const recorder=createVoiceRecorder({mediaDevices:{getUserMedia:()=>microphone},Recorder:class{}}),pending=recorder.start();
 recorder.cancel();resolve({getTracks:()=>[{stop:()=>stopped++}]});await assert.rejects(pending,/AI_CANCELLED/);assert.equal(stopped,1);assert.equal(recorder.recording,false);
});
test('cancelled recordings are not delivered as a new journal attachment',async()=>{
 const s=setup();await s.recorder.start();s.advance(1000);s.recorder.cancel();await new Promise(setImmediate);assert.equal(s.completed(),undefined);assert(s.stopped()>0);
});
test('microphone denial and unsupported browsers do not silently invoke remote recognition',async()=>{
 const denied=createVoiceRecorder({mediaDevices:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}},Recorder:class{}});await assert.rejects(denied.start(),error=>error.name==='NotAllowedError');
 await assert.rejects(createVoiceRecorder({mediaDevices:null,Recorder:null}).start(),/VOICE_NOT_SUPPORTED/);
});
test('audio decoding rejects silence and recordings over the duration limit',async()=>{
 class Offline{
  async decodeAudioData(){return {duration:1};}
  createBufferSource(){return {connect(){},start(){}};}
  async startRendering(){return {getChannelData:()=>new Float32Array(16000)};}
 }
 await assert.rejects(decodeVoice(new Blob(['data']),{Offline}),/VOICE_SILENT/);
 class Long extends Offline{async decodeAudioData(){return {duration:1000};}}
 await assert.rejects(decodeVoice(new Blob(['data']),{Offline:Long}),/VOICE_TOO_LONG/);
});
