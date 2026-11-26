// One bounded presentation bitmap, never two live 3D scenes or an extra GPU render target.
export function createSceneTransition({stage,canvas,reduce,enabled}){
 const cover=document.createElement('canvas');cover.id='scene-transition';cover.setAttribute('aria-hidden','true');stage.append(cover);
 let generation=0,raf=0,resolve=null,phase='idle',hasFrame=false;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),onMotion=()=>{if(motion.matches){stop(true);reset()}};motion.addEventListener('change',onMotion);
 const softened=()=>!reduce()&&enabled();
 function stop(result=false){cancelAnimationFrame(raf);raf=0;if(resolve){const done=resolve;resolve=null;done(result)}}
 function reset(){stage.removeAttribute('data-transition');canvas.style.removeProperty('filter');canvas.style.removeProperty('opacity');cover.hidden=true;cover.style.removeProperty('filter');cover.style.removeProperty('opacity');cover.width=cover.height=1;hasFrame=false;phase='idle';}
 function tween(duration,paint){return new Promise(done=>{resolve=done;let previous,elapsed=0;const step=ms=>{elapsed+=previous===undefined?0:Math.max(0,Math.min(64,ms-previous));previous=ms;const t=Math.min(1,elapsed/duration);paint(1-(1-t)**3);if(t===1){raf=0;resolve=null;done(true)}else raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)})}
 function capture(source){
  if(hasFrame||!source)return;try{const r=stage.getBoundingClientRect(),scale=Math.min(1,640/Math.max(r.width,r.height));cover.width=Math.max(1,Math.round(r.width*scale));cover.height=Math.max(1,Math.round(r.height*scale));const c=cover.getContext('2d');c.clearRect(0,0,cover.width,cover.height);
   if(source instanceof HTMLImageElement){const ir=source.getBoundingClientRect(),w=source.naturalWidth,h=source.naturalHeight,s=Math.min(ir.width/w,ir.height/h)*scale;c.drawImage(source,(ir.x-r.x)*scale+(ir.width*scale-w*s)/2,(ir.y-r.y)*scale+(ir.height*scale-h*s)/2,w*s,h*s)}else c.drawImage(source,0,0,cover.width,cover.height);
   hasFrame=true;cover.hidden=false;cover.style.opacity='1';
  }catch{cover.width=cover.height=1;hasFrame=false;cover.hidden=true;}
 }
 return {
  begin(token,source){stop();generation=token;if(!softened()){reset();return Promise.resolve(true)}capture(source);phase='leaving';stage.dataset.transition=phase;
   // Hold the small old frame across fetch/decode, while the original model is released.
   if(!hasFrame){phase='loading';stage.dataset.transition=phase;return Promise.resolve(true)}
   const fromBlur=Number.parseFloat(cover.style.filter.replace('blur(',''))||0,fromOpacity=Number.parseFloat(cover.style.opacity)||1;
   return tween(140,t=>{cover.style.filter=`blur(${(fromBlur+(5-fromBlur)*t).toFixed(2)}px)`;cover.style.opacity=String(fromOpacity+(.92-fromOpacity)*t)}).then(ok=>{if(ok&&token===generation){phase='loading';stage.dataset.transition=phase}return ok});
  },
  reveal(token){if(token!==generation)return Promise.resolve(false);stop();if(!softened()){reset();return Promise.resolve(true)}phase='entering';stage.dataset.transition=phase;canvas.style.opacity='.45';canvas.style.filter='blur(5px)';
   return tween(320,t=>{canvas.style.filter=`blur(${((1-t)*5).toFixed(2)}px)`;canvas.style.opacity=String(.45+t*.55);if(hasFrame)cover.style.opacity=String((1-t)*.92)}).then(ok=>{if(ok&&token===generation)reset();return ok});
  },
  settle(continuePending=false){stop(continuePending);reset()},fail(token){if(token===generation){stop();reset()}},dispose(){motion.removeEventListener('change',onMotion);stop();reset();cover.remove()},
  get state(){return {phase,generation,busy:phase!=='idle',bitmapPixels:hasFrame?cover.width*cover.height:0,pending:!!raf}}
 };
}
