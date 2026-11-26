// Exact-source Cycles stills for environments whose WebGL context is unavailable.
// The fallback stays visibly labelled; it never claims to be realtime rotation.
export function createScenePreview(stage,onError){
 const card=document.createElement('div');card.id='scene-preview';card.hidden=true;
 let image=document.createElement('img');image.alt='';image.draggable=false;image.decoding='async';
 const badge=document.createElement('span');badge.className='preview-label';badge.textContent='场景预览';badge.title='当前设备使用离线场景图，可拖动和缩放';
 card.append(image,badge);stage.prepend(card);
 let imageToken=0,disposed=false;let zoom=1,x=0,y=0,shown=false,scene='',points=new Map(),pinch=null;
 const paint=()=>{const maxX=card.clientWidth*Math.max(0,zoom-1)*.55,maxY=card.clientHeight*Math.max(0,zoom-1)*.55;x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));image.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;};
 const observer=new ResizeObserver(paint);observer.observe(card);
 const changeZoom=(next)=>{zoom=Math.max(1,Math.min(3,next));paint()};
 const reset=()=>{zoom=1;x=y=0;paint()};
 
 card.addEventListener('pointerdown',e=>{card.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size===2){const [a,b]=[...points.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom}}});
 card.addEventListener('pointermove',e=>{const old=points.get(e.pointerId);if(!old)return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size===2){const[a,b]=[...points.values()];if(pinch?.distance>1)changeZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance)}else if(points.size===1){x+=e.clientX-old.x;y+=e.clientY-old.y;paint()}});
 const release=e=>{points.delete(e.pointerId);pinch=null};card.addEventListener('pointerup',release);card.addEventListener('pointercancel',release);
 card.addEventListener('wheel',e=>{e.preventDefault();changeZoom(zoom*(e.deltaY>0?.9:1.1))},{passive:false});
 return {async show(key,name){const token=++imageToken,candidate=document.createElement('img');candidate.alt=name+' · 离线场景预览';candidate.draggable=false;candidate.decoding='async';candidate.src='previews/'+key+'.png';try{await candidate.decode();}catch{if(token===imageToken&&!disposed){console.info('Lobby preview image failed: '+key);onError()}return false}if(disposed||token!==imageToken)return false;image.replaceWith(candidate);image=candidate;shown=true;scene=key;card.hidden=false;stage.classList.add('preview-mode');stage.setAttribute('aria-label','离线场景预览，拖动平移，双指缩放');reset();console.info('Lobby preview image loaded: '+scene+' '+image.naturalWidth+'x'+image.naturalHeight);return true;},zoom(factor){changeZoom(zoom*factor)},reset,light(evening){image.style.setProperty('--preview-brightness',evening?'.81':'1');image.style.setProperty('--preview-sepia',evening?'.16':'0');image.style.filter='brightness(var(--preview-brightness)) sepia(var(--preview-sepia))'},dispose(){disposed=true;imageToken++;shown=false;observer.disconnect();points.clear();image.removeAttribute('src');card.remove()},get state(){return {scene,zoom,x,y,visible:shown}}};
}
