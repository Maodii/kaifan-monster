import * as THREE from 'three';

// Surface-specific response, without new textures, duplicate geometry or post-process buffers.
export const ROOM_PALETTES={
 meals:{paper:'#faf0dd',edge:'#e9d7bc',accent:'#a4664c',lamp:'#ffd5a1'},
 recipes:{paper:'#f2eddb',edge:'#d6dfcf',accent:'#54725e',lamp:'#ffe1ae'},
 pantry:{paper:'#eaf2eb',edge:'#cbded8',accent:'#467d81',lamp:'#d8edf2'},
 community:{paper:'#f8e9df',edge:'#e7ccd3',accent:'#a86271',lamp:'#ffcea9'},
 profile:{paper:'#f1e9f4',edge:'#dad0e6',accent:'#826193',lamp:'#e8c9ff'}
};
export function finishSurfaces(root,renderer){
 const replacements=new Map(),originals=new Set(),textures=new Set();
 // Two tiny deterministic material maps, shared for this room and disposed with its materials.
 // Authored color/UV maps stay intact; no extra render targets or high-resolution image downloads.
 let weave,grain;
 const microMap=(woven)=>{
  const bytes=new Uint8Array(128*128*4);let seed=9137;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const i=(y*128+x)*4;
   if(woven){bytes[i]=128+Math.round(Math.sin(x*Math.PI/2)*9);bytes[i+1]=128+Math.round(Math.sin(y*Math.PI/2)*9);bytes[i+2]=254;}
   else{const n=232+(seed>>>28);bytes[i]=bytes[i+1]=bytes[i+2]=n;}
   bytes[i+3]=255;
  }
  const texture=new THREE.DataTexture(bytes,128,128);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.repeat.set(woven?7:3,woven?7:3);texture.needsUpdate=true;return texture;
 };
 root.traverse(o=>{
  if(!o.isMesh)return;
  const finish=m=>{
   if(replacements.has(m))return replacements.get(m);
   const name=m.name.toLowerCase();let result=m;
   if(/^(cream|white|enamel|blue|plush.*|lavender|purple_dark|linen)$/.test(name)&&m.isMeshStandardMaterial){
    result=new THREE.MeshPhysicalMaterial();if(m.isMeshPhysicalMaterial)result.copy(m);else THREE.MeshStandardMaterial.prototype.copy.call(result,m);originals.add(m);
    if(/plush|lavender|purple_dark|linen/.test(name)){
     result.sheen=/linen/.test(name)?.25:.65;result.sheenRoughness=.86;
     result.sheenColor=new THREE.Color(/linen/.test(name)?'#d5c3a4':'#d1b3df');result.roughness=Math.max(.78,result.roughness);
    }else{result.clearcoat=name==='enamel'?.24:.14;result.clearcoatRoughness=.25;}
   }
   if(/brass/.test(name)){result.metalness=Math.max(.65,result.metalness);result.roughness=Math.max(.28,result.roughness);}
   if(/steel|darkmetal/.test(name))result.roughness=Math.max(name==='darkmetal'?.35:.26,result.roughness);
   if(/paper/.test(name))result.roughness=Math.max(.9,result.roughness);
   if(/leaf|rice|potato/.test(name))result.roughness=Math.max(.58,result.roughness);
   if(/tomato|oil|broth/.test(name))result.roughness=THREE.MathUtils.clamp(result.roughness,.20,.48);
   if(/linen|cloth|fabric/.test(name)&&!result.normalMap){weave||=microMap(true);result.normalMap=weave;result.normalScale=new THREE.Vector2(.16,.16);}
   if(/brass|steel|paper|enamel/.test(name)&&!result.roughnessMap){grain||=microMap(false);result.roughnessMap=grain;}
   for(const value of Object.values(result))if(value?.isTexture)textures.add(value);
   replacements.set(m,result);return result;
  };
  o.material=Array.isArray(o.material)?o.material.map(finish):finish(o.material);
 });
 for(const texture of textures){texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;}
 for(const m of originals)m.dispose();
 root.userData.surfaceFinish={materials:replacements.size,textures:textures.size,microMaps:Number(!!weave)+Number(!!grain),version:2};
}
let colorFrame=0,colorTarget='',displayed=null,latest=null;
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const hex=values=>'#'+values.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
const blend=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
const paint=values=>{displayed=values;for(const [name,value]of Object.entries(values))document.documentElement.style.setProperty('--room-'+name,hex(value));};
export function settlePalette(){cancelAnimationFrame(colorFrame);colorFrame=0;if(latest)paint(latest);}
export function roomPalette(key,{evening=document.body.dataset.evening==='true',immediate=false}={}){
 const palette=ROOM_PALETTES[key]||ROOM_PALETTES.meals;document.body.dataset.room=key;
 const target=Object.fromEntries(Object.entries(palette).map(([name,value])=>[name,evening&&['paper','edge'].includes(name)?blend(rgb(value),rgb(name==='paper'?'#e6d9d4':'#bfc9d5'),name==='paper'?.28:.45):rgb(value)]));
 const signature=JSON.stringify(target),quiet=immediate||document.hidden||document.body.dataset.motion==='reduce'||matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(quiet){colorTarget=signature;latest=target;settlePalette();return palette}
 if(signature===colorTarget)return palette;cancelAnimationFrame(colorFrame);colorTarget=signature;latest=target;
 if(!displayed){paint(target);return palette}const from=displayed;let previous,elapsed=0;
 const step=ms=>{elapsed+=previous===undefined?0:Math.max(0,Math.min(64,ms-previous));previous=ms;const t=Math.min(1,elapsed/520),ease=t*t*(3-2*t);paint(Object.fromEntries(Object.keys(target).map(k=>[k,blend(from[k],target[k],ease)])));if(t<1)colorFrame=requestAnimationFrame(step);else colorFrame=0};colorFrame=requestAnimationFrame(step);return palette;
}
export function paletteState(){return {pending:!!colorFrame,colors:displayed?Object.fromEntries(Object.entries(displayed).map(([k,v])=>[k,hex(v)])):null};}
document.addEventListener('visibilitychange',()=>{if(document.hidden)settlePalette()});

matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)settlePalette()});
