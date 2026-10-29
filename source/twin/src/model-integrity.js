// Official Hugging Face revisions. LFS weights use their native SHA-256;
// small Git files use the exact blob ID published by the Hub API.
const base='https://huggingface.co/';
const manifests={
 'Xenova/all-MiniLM-L6-v2':{
  revision:'751bff37182d3f1213fa05d7196b954e230abad9',
  files:{
   'config.json':{gitBlob:'72147e4ff4426ebedbfa2146c4a0999def51a313',size:650},
   'tokenizer.json':{gitBlob:'c17ed520ed8438736732a54957a69306b8822215',size:711661},
   'tokenizer_config.json':{gitBlob:'37fca74771bc76a8e01178ce3a6055a0995f8093',size:366},
   'onnx/model_quantized.onnx':{sha256:'afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1',size:22972370}
  }
 },
 'onnx-community/Qwen2.5-0.5B-Instruct':{
  revision:'22942cb7d7ba4cc81bb4673549ca4d4614469b5e',
  files:{
   'config.json':{gitBlob:'eea21cd6f7909a44509a193b7fcdac194766c904',size:678},
   'tokenizer.json':{gitBlob:'d24314ef7f0afd1b678c2e24c767e19f24f86b0e',size:7031673},
   'tokenizer_config.json':{gitBlob:'24afe3594154cfee05edda73aeadf3daae0a53ba',size:7849},
   'onnx/model_quantized.onnx':{sha256:'41834041ab1b29eff9fc592f1a29a1844133aea35832ea9fa91682be13016100',size:512096557}
  }
 },
 'HuggingFaceTB/SmolLM2-360M-Instruct':{
  revision:'a10cc1512eabd3dde888204e902eca88bddb4951',
  files:{
   'config.json':{gitBlob:'4f2ae86545bb5c1d4fcc55644deef86be50a7dee',size:846},
   'tokenizer.json':{gitBlob:'f922b1797f0c88e71addc8393787831f2477a4bd',size:2104556},
   'tokenizer_config.json':{gitBlob:'8c7b22013909450429303ed10be4398bd63f5457',size:3764},
   'onnx/model_quantized.onnx':{sha256:'57987a3a24dc34ad2cb5e7e566840ccaece095e35a24ae4fc5b3086c7ddd6918',size:364564671}
  }
 },
 'Xenova/whisper-tiny':{
  revision:'5332fcc35e32a33b86612b9a57a89be7906102b1',
  files:{
   'config.json':{gitBlob:'dea913aa8ec7d53db029e97c97a766d534c8da04',size:2248},
   'generation_config.json':{gitBlob:'72e54ad7340e05287aa731f9d8556b5368be3fe0',size:3716},
   'preprocessor_config.json':{gitBlob:'91876762a536a746d268353c5cba57286e76b058',size:339},
   'tokenizer.json':{gitBlob:'1e95340ff836fad1b5932e800fb7b8c5e6d78a74',size:2480466},
   'tokenizer_config.json':{gitBlob:'d13b786c04765fb1a06492b53587752cd67665ea',size:282683},
   'onnx/encoder_model_quantized.onnx':{sha256:'fd9d995b9dcb0520f0dbf6cf68651af639fc385f594d9d876e69ca2802dc438e',size:10124910},
   'onnx/decoder_model_merged_quantized.onnx':{sha256:'6c0c125986b007d2e3734bec84c18bda0152071b90b87fadac6d7764499927a0',size:30727765}
  }
 }
};
export function expectedModelIntegrity(url){
 if(!url.startsWith(base))return undefined;
 const relative=url.slice(base.length),match=/^([^/]+\/[^/]+)\/resolve\/main\/(.+)$/.exec(relative);
 if(!match)return undefined;
 const integrity=manifests[match[1]]?.files[match[2]];
 return integrity?{...integrity}:undefined;
}
