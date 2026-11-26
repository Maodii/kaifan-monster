// Deduplicate embedded image payloads across the five offline rooms, preserving meshopt data exactly.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
module.exports=function shareTextures(file,dir){
 const raw=fs.readFileSync(file);if(raw.readUInt32LE(0)!==0x46546c67)throw Error('Not GLB');
 const jsonLength=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+jsonLength).toString());
 if(!(doc.images||[]).some(i=>i.bufferView!==undefined))return (doc.images||[]).map(i=>i.uri);
 const binHeader=20+jsonLength,bin=raw.subarray(binHeader+8,binHeader+8+raw.readUInt32LE(binHeader));
 const indices=doc.images.map(i=>i.bufferView);if(indices.some((v,i)=>v!==i))throw Error('Expected contiguous image prefix from gltfpack');
 const count=indices.length,prefix=Math.max(...indices.map(i=>{const v=doc.bufferViews[i];if(v.buffer!==0)throw Error('Image buffer');return (v.byteOffset+v.byteLength+3)&~3}));
 fs.mkdirSync(dir,{recursive:true});
 for(const image of doc.images){
  const view=doc.bufferViews[image.bufferView],payload=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);
  const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[image.mimeType];if(!ext)throw Error('Unsupported image format');
  const name=crypto.createHash('sha256').update(payload).digest('hex').slice(0,24)+ext,dest=path.join(dir,name);
  if(!fs.existsSync(dest))fs.writeFileSync(dest,payload);
  image.uri='../textures/'+name;delete image.bufferView;delete image.mimeType;
 }
 // Accessors (including sparse payloads) reference bufferView indices, while meshopt offsets reference the binary buffer.
 function remap(value){if(!value||typeof value!=='object')return;for(const [k,v] of Object.entries(value)){if(k==='bufferView'){if(v<count)throw Error('Geometry references image storage');value[k]=v-count}else remap(v)}}
 remap(doc);doc.bufferViews=doc.bufferViews.slice(count);
 for(const v of doc.bufferViews){
  if(v.buffer===0){if((v.byteOffset||0)<prefix)throw Error('Overlapping binary ranges');v.byteOffset-=prefix}
  const compressed=v.extensions?.EXT_meshopt_compression;
  if(compressed?.buffer===0){if((compressed.byteOffset||0)<prefix)throw Error('Overlapping compressed ranges');compressed.byteOffset-=prefix}
 }
 const binary=bin.subarray(prefix);doc.buffers[0].byteLength=binary.length;
 let encoded=Buffer.from(JSON.stringify(doc));encoded=Buffer.concat([encoded,Buffer.alloc((4-encoded.length%4)%4,32)]);
 const output=Buffer.alloc(12+8+encoded.length+8+binary.length);output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);output.writeUInt32LE(encoded.length,12);output.writeUInt32LE(0x4e4f534a,16);encoded.copy(output,20);const h=20+encoded.length;output.writeUInt32LE(binary.length,h);output.writeUInt32LE(0x004e4942,h+4);binary.copy(output,h+8);fs.writeFileSync(file,output);
 return doc.images.map(i=>i.uri);
};
