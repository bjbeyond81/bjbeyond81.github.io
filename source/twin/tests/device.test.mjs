import test from 'node:test';import assert from 'node:assert/strict';
import {probeWebGPU,appleMobile} from '../src/device.js';
test('missing, failed and non-f16 GPUs use the CPU fallback',async()=>{
 assert.equal(await probeWebGPU(undefined),false);
 assert.equal(await probeWebGPU({requestAdapter:async()=>{throw Error('unavailable');}}),false);
 assert.equal(await probeWebGPU({requestAdapter:async()=>({features:new Set()})}),false);
 assert.equal(await probeWebGPU({requestAdapter:async()=>({features:new Set(['shader-f16'])})}),true);
});
test('a stalled GPU probe finishes so it cannot block the journal startup',async()=>{
 assert.equal(await probeWebGPU({requestAdapter:()=>new Promise(()=>{})},20),false);
});
test('iPhone and desktop-mode iPad avoid automatic model loading during unlock',()=>{
 assert.equal(appleMobile('Mozilla iPhone','iPhone',5),true);
 assert.equal(appleMobile('Mozilla Macintosh','MacIntel',5),true);
 assert.equal(appleMobile('Mozilla Macintosh','MacIntel',0),false);
 assert.equal(appleMobile('Mozilla Windows','Win32',0),false);
});
