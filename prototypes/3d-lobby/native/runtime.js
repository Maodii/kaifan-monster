import { createSceneTransition } from './scene-transition.js';
import { createObjectInteractions, installObjectRigs } from './object-interactions.js';
import { finishSurfaces, roomPalette, settlePalette, paletteState } from './art-direction.js';
import * as THREE from 'three';
import {createScenePreview} from './preview.js';
document.addEventListener('securitypolicyviolation',event=>console.info('Lobby resource blocked: '+event.effectiveDirective+' '+event.blockedURI));
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LOBBY_ROUTES, lobbyScene, lobbyQuality } from '../../../client/entry/src/main/ets/model/LobbyCore.ets';

const $ = s => document.querySelector(s);
const rooms = {
 meals: {name:'今日记餐',title:'我的小餐桌',kicker:'把每一餐，过得有滋有味',model:'meals',icon:'ui_today.png',route:'new-meal',action:'记下这一餐',points:[['diary','三餐手账',[-.7,1.8,0]],['meal-plan','日历安排',[-2.7,2.4,-1.8]]]},
 recipes: {name:'菜谱厨房',title:'有烟火气的厨房',kicker:'冰箱有灵感，开饭有办法',model:'kitchen',icon:'ui_recipes.png',route:'recipes',action:'翻开菜谱',points:[['recipes','菜谱与做法',[0,2.2,-1]],['shopping','采购清单',[3,1.3,0]]]},
 pantry: {name:'我的冰箱',title:'给食材安个家',kicker:'记得新鲜，也记得好好吃',model:'pantry',icon:'ui_pantry.png',route:'pantry',action:'打开我的食材',points:[['pantry','库存与消耗',[-1,2.9,0]],['new-food','添一份新鲜',[2.7,1.1,1]]]},
 profile: {name:'我的小怪',title:'我的食光小屋',kicker:'喜欢的生活，慢慢收藏起来',model:'profile',icon:'ui_profile.png',route:'profile',action:'我的吃饭档案',points:[['favorites','喜欢的做法',[-2.8,2,-1.4]],['settings','我的设置',[1,2.2,0]]]}
};
const features = [
 ['吃饭与安排',[['today','今日总览'],['new-meal','记一餐'],['diary','三餐记录'],['meal-plan','未来安排'],['draw','随机抽餐'],['stats','营养与花费']]],
 ['做饭与食材',[['recipes','全部菜谱'],['recipe-search','搜索菜谱'],['favorites','我的收藏'],['pantry','我的食材'],['new-food','新食材入库'],['stock-history','采购与消耗'],['shopping','采购清单']]],
 ['助手与生活',[['ai-assistant','小怪助手'],['profile','我的档案'],['tools','生活工具'],['settings','设置与同步'],['auth','登录与账号']]]
];
let snapshot = {v:1,type:'snapshot',scene:'meals',quality:'balanced',reducedMotion:false,foodCount:0,mealCount:0,shoppingCount:0,favoriteCount:0,planCount:0,nickname:'',mealSummaries:['','','']};
let scenePreview,previewMode=false;
let renderer,scene,camera,controls,model,environment,environmentTarget,light,fill,shadowFloor;
let pendingScene='meals',switchTask=Promise.resolve(),fetchController=null;
let current='meals',loadToken=0,frames=0,raf=0,lastFrame=0,dirty=true,active=true,disposed=false,contextLost=false,engineReady=false,evening=false,roomReady=false,doorTween=null,doorOpen=true;
let resizeObserver,toastTimer,holdTimer,held=false,viewTween=null,fitDistance=16;
let inspectionOrigin=null,hintTimer=0,hintShown=false,adaptiveScale=1,qualitySamples=[],lamp,steamEffect=null;
function syncOverlay(){request('overlay',($('#feature-drawer').open||$('#object-picker').open||objectInteractions.selected||inspectionOrigin)?'features':'none')}
function clearInspection(){inspectionOrigin=null;$('#inspect-back').hidden=true;syncOverlay();}
function returnInspection(){if(!inspectionOrigin||!camera)return false;const origin=inspectionOrigin;clearInspection();if(reduce()){camera.position.copy(origin.position);controls.target.copy(origin.target);controls.update();dirty=true;}else viewTween={from:camera.position.clone(),oldTarget:controls.target.clone(),target:origin.target,to:origin.position};return true;}
function hideHint(){clearTimeout(hintTimer);$('#gesture-hint').hidden=true;}
function showHint(){if(hintShown||previewMode)return;hintShown=true;$('#gesture-hint').hidden=false;hintTimer=setTimeout(hideHint,6500);}

const labels=[],pointers=new Map(),articulationState=new WeakMap();let articulationTweens=[],greeting=null;
let interactionFrame=0;
const objectInteractions=createObjectInteractions({
 stage:$('#stage'),panel:$('#object-panel'),picker:$('#object-picker'),getModel:()=>model,getRoom:()=>current,getSnapshot:()=>snapshot,reduced:()=>reduce(),
 changed:()=>{dirty=true;if(renderer)renderer.shadowMap.needsUpdate=true},route:openRoute,focus:focusPart,overlay:()=>syncOverlay(),
 local:id=>{if(id==='ensure-fridge'&&!doorOpen)toggleDoor();if(id==='lid')toggleArticulation('rig_pot_lid');if(id==='cabinet')toggleArticulation('rig_cabinet_door');if(id==='fridge')toggleDoor();if(id==='light'){evening=!evening;applyLight()}if(id==='greet'){const object=model?.getObjectByName('part_monster_character');if(object&&!greeting){if(reduce())toast('一起好好吃饭！');else greeting={object,base:object.position.y,angle:object.rotation.y,start:performance.now()};dirty=true;}}}
});

const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const reduce=()=>snapshot.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
let lightTween=null;
const sceneTransition=createSceneTransition({stage:$('#stage'),canvas:$('#scene'),reduce,enabled:()=>active&&!disposed&&!document.hidden&&snapshot.quality!=='economy'});


const request=(type,value='')=>{
 const message=JSON.stringify({v:1,type,value});
 if(window.LobbyHost?.dispatch){try{return window.LobbyHost.dispatch(message)!==false}catch{return false}}
 if(window.parent!==window){window.parent.postMessage({channel:'kaifan-lobby-v1',request:message},location.origin);return true}
 toast('请在应用中打开对应功能');return false;
};
function openRoute(route){if(!LOBBY_ROUTES.includes(route))return false;return request('route',route)}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function updateText(){
 objectInteractions.refresh();
 const room=rooms[current];$('#room-title').textContent=room.title;$('#room-kicker').textContent=room.kicker;$('#room-open').textContent=room.action;
 const s=snapshot;$('#room-summary').textContent=current==='meals'?`今天 ${s.mealCount} 餐 · ${s.planCount} 项安排`:current==='recipes'?`${s.favoriteCount} 份喜欢的做法`:current==='pantry'?`${s.foodCount} 份食材 · ${s.shoppingCount} 项待采购`:current==='profile'?(s.nickname||'今天也开饭'):'把真实的一餐，分享给同桌的人';
 document.body.dataset.motion=reduce()?'reduce':'normal';document.body.dataset.quality=snapshot.quality;document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scene===current)));
}
function disposeModel(root){if(!root)return;const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.isReflector)o.getRenderTarget().dispose();if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const x of Object.values(m))if(x?.isTexture&&x!==environment)textures.add(x)}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();if(t.image&&typeof t.image.close==='function')t.image.close()});root.removeFromParent()}
function prepare(root){
 installObjectRigs(root);finishSurfaces(root,renderer);root.updateMatrixWorld(true);const groups=[];
 root.traverse(o=>{if(!o.isMesh&&(o.name.startsWith('part_')||o.name.startsWith('rig_')))groups.push(o);if(!o.isMesh)return;
  o.castShadow=o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.envMapIntensity=.55;if(['pile','grain'].includes(m.name))o.castShadow=false;if(m.name.startsWith('plush')){m.sheen=.55;m.sheenColor=new THREE.Color('#d3accf');m.sheenRoughness=.82}if(m.name==='steel'){m.roughness=Math.max(.24,m.roughness)}if(m.name==='glass')m.depthWrite=false;}
 });
 // Preserve semantic part/hinge ownership and vertex attributes when merging surfaces.
 for(const group of groups){const buckets=new Map();group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;let owner=o.parent;while(owner&&owner!==group&&!owner.name.startsWith('part_')&&!owner.name.startsWith('rig_'))owner=owner.parent;if(owner!==group)return;const attributes=Object.keys(o.geometry.attributes).sort().join(',');const key=o.material.uuid+':'+attributes;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o)});const inv=group.matrixWorld.clone().invert();for(const list of buckets.values()){if(list.length<2)continue;const geometries=list.map(o=>{const g=o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld));if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));return g});const merged=mergeGeometries(geometries,false);if(merged){const batch=new THREE.Mesh(merged,list[0].material);batch.name=group.name+'_surface';batch.castShadow=list.some(o=>o.castShadow);batch.receiveShadow=true;group.add(batch);for(const o of list){o.removeFromParent();o.geometry.dispose()}}geometries.forEach(g=>g.dispose())}}
 return root;
}
// One bounded planar reflection for the actual silvered mirror; no screen-space fake.
function installMirrorReflection(root){
 let face;root.traverse(o=>{if(o.isMesh&&o.material?.name==='silvered_mirror')face=o});
 if(!face)return;root.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(face),center=bounds.getCenter(v(0,0,0)),size=bounds.getSize(v(0,0,0));
 const w=size.x,h=size.y,r=w/2,base=-h/2,spring=h/2-r;
 const shape=new THREE.Shape();shape.moveTo(-r,base+.07);shape.lineTo(-r,spring);
 shape.absarc(0,spring,r,Math.PI,0,true);shape.lineTo(r,base+.07);shape.quadraticCurveTo(r,base,r-.07,base);shape.lineTo(-r+.07,base);shape.quadraticCurveTo(-r,base,-r,base+.07);
 const resolution=snapshot.quality==='high'?768:snapshot.quality==='economy'?256:512;
 const mirror=new Reflector(new THREE.ShapeGeometry(shape,96),{textureWidth:resolution,textureHeight:resolution,clipBias:.003,color:0xf1f3ef,multisample:0});
 mirror.getRenderTarget().texture.type=THREE.UnsignedByteType;mirror.name='LivePlanarMirror';mirror.userData.route='profile';mirror.castShadow=false;mirror.receiveShadow=false;
 const parent=face.parent;parent.add(mirror);mirror.position.copy(parent.worldToLocal(v(center.x,center.y,bounds.max.z+.002)));mirror.quaternion.copy(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
 face.visible=false;mirror.userData.opticalSurface=true;mirror.userData.reflectionResolution=resolution;
}
// Real records stay native; these small paper faces are presentation-only snapshots.
function updatePaperFaces(){
 if(!model)return;
 let layer=model.getObjectByName('LivePaperFaces');
 if(layer){disposeModel(layer)}
 layer=new THREE.Group();layer.name='LivePaperFaces';model.add(layer);
 const create=(name,w,h,position,rotation,paint)=>{
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*h/w);const c=canvas.getContext('2d');
  c.fillStyle='#f7edda';c.fillRect(0,0,canvas.width,canvas.height);paint(c,canvas.width,canvas.height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.88});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);face.name=name;face.userData.route={LiveCalendar:'meal-plan',LiveMealJournal:'diary',LiveMealSlip:'stats',LiveNamePlaque:'profile'}[name];face.position.set(...position);face.rotation.set(...rotation);face.receiveShadow=true;layer.add(face);return face;
 };
 const font=(c,size)=>c.font=`${size}px Hand, sans-serif`;
 const safeDate=/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date||'')?new Date(snapshot.date+'T12:00:00'):new Date();
 const year=safeDate.getFullYear(),month=safeDate.getMonth(),day=safeDate.getDate();
 if(current==='meals'){
  create('LiveCalendar',2.32,1.80,[-1.7,2.43,-.809],[0,0,0],(c,w,h)=>{
   c.textAlign='center';c.fillStyle='#bb6658';font(c,61);c.fillText(`${year} · ${month+1} 月`,w/2,80);
   const weekdays=['一','二','三','四','五','六','日'];font(c,24);c.fillStyle='#537c6f';weekdays.forEach((v,i)=>c.fillText(v,(i+.5)*w/7,133));
   const start=(new Date(year,month,1).getDay()+6)%7,total=new Date(year,month+1,0).getDate();font(c,29);
   for(let d=1;d<=total;d++){const cell=start+d-1,col=cell%7,row=Math.floor(cell/7),x=(col+.5)*w/7,y=188+row*61;if(d===day){c.fillStyle='#bb6658';c.beginPath();c.moveTo(x-22,y-33);c.arcTo(x+34,y-33,x+34,y+15,12);c.arcTo(x+34,y+15,x-34,y+15,12);c.arcTo(x-34,y+15,x-34,y-33,12);c.arcTo(x-34,y-33,x+34,y-33,12);c.closePath();c.fill()}c.fillStyle=d===day?'#fff5df':'#334e48';c.fillText(String(d),x,y)}
  });
  create('LiveMealJournal',1.39,1.84,[-1.10,1.62,.55],[-Math.PI/2,0,0],(c,w,h)=>{
   c.textAlign='left';c.fillStyle='#537c6f';font(c,64);c.fillText('今天吃了什么',54,105);const kinds=['早餐','午餐','晚餐'];
   for(let i=0;i<3;i++){const y=235+i*230;c.fillStyle='#bb6658';font(c,44);c.fillText(kinds[i],58,y);c.fillStyle='#334e48';font(c,36);const value=snapshot.mealSummaries[i]||'还没记下';const chars=[...value];for(let row=0;row<2;row++)c.fillText(chars.slice(row*15,(row+1)*15).join('')+(row===1&&chars.length>30?'…':''),58,y+66+row*48);c.strokeStyle='#d8c7a8';c.lineWidth=2;c.beginPath();c.moveTo(56,y+162);c.lineTo(w-56,y+162);c.stroke()}
  });
  create('LiveMealSlip',.78,1.12,[1,1.467,-1.05],[-Math.PI/2,0,0],(c,w,h)=>{
   c.textAlign='center';c.fillStyle='#537c6f';font(c,80);c.fillText('今日食光',w/2,140);c.fillStyle='#be6d59';font(c,110);c.fillText(`${snapshot.mealCount} 餐`,w/2,350);c.fillStyle='#334e48';font(c,58);c.fillText(`${snapshot.planCount} 项安排`,w/2,510);font(c,48);c.fillText(`${month+1}月${day}日`,w/2,690);
  });
 }
 if(current==='profile')create('LiveNamePlaque',2.94,.60,[0,.64,2.524],[0,0,0],(c,w,h)=>{c.textAlign='center';c.fillStyle='#537c6f';const name=snapshot.nickname||'今天也开饭';font(c,Math.min(72,660/Math.max(4,[...name].length)));c.fillText(name,w/2,86,710);font(c,24);c.fillStyle='#bb6658';c.fillText('我的口味 · 我的三餐',w/2,130)});
 dirty=true;
}

function applyQuality(){if(!renderer)return;model?.traverse(o=>{if(o.isReflector){const n=snapshot.quality==='high'?768:snapshot.quality==='economy'?256:512;o.getRenderTarget().setSize(n,n);o.userData.reflectionResolution=n}});const high=snapshot.quality==='high',low=snapshot.quality==='economy';renderer.setPixelRatio(Math.min(devicePixelRatio||1,high?1.75:low?1:1.35)*adaptiveScale);const shadow=high?2048:low?512:1024;if(light.shadow.mapSize.x!==shadow){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(shadow,shadow)}renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=true;resize();dirty=true}
function sizeCamera(reset=true){
 if(!model||!camera)return;
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),target=bounds.getCenter(new THREE.Vector3());
 const direction=v(.57,.49,.66).normalize(),fov=THREE.MathUtils.degToRad(camera.fov);
 fitDistance=Math.max(8,size.y/(2*Math.tan(fov/2)),size.x/(2*Math.tan(fov/2)*camera.aspect));
 if(reset){
  controls.target.copy(target);
  // Fit all eight actual world-bound corners after rotation, rather than clamping distance and clipping narrow screens.
  for(let i=0;i<10;i++){
   camera.position.copy(target).addScaledVector(direction,fitDistance);camera.lookAt(target);camera.updateMatrixWorld();let largest=0;
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=v(x,y,z).project(camera);largest=Math.max(largest,Math.abs(p.x),Math.abs(p.y))}
   if(largest<=.92)break;fitDistance*=Math.max(1.025,largest/.90);
  }
  controls.minDistance=.65;controls.maxDistance=fitDistance*1.8;controls.update();
 }
 dirty=true;
}
function resize(){if(!renderer)return;const r=$('#stage').getBoundingClientRect();if(r.width<1||r.height<1)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(!pointers.size)sizeCamera();positionLabels();dirty=true}
function rebuildLabels(){labels.length=0;$('#scene-labels').replaceChildren();for(const[route,name,pos]of rooms[current].points){const b=document.createElement('button');b.className='spatial-label';b.textContent=name;b.onclick=()=>openRoute(route);$('#scene-labels').append(b);labels.push({button:b,pos:v(...pos)})}positionLabels()}
function positionLabels(){
 if(previewMode){for(const label of labels)label.button.hidden=false;return}
 if(!camera)return;const r=$('#stage').getBoundingClientRect(),occupied=[];
 for(const label of labels){
  const p=label.pos.clone().project(camera),w=label.button.offsetWidth,h=label.button.offsetHeight,half=w/2+8;
  let x=Math.max(half,Math.min(r.width-half,(p.x*.5+.5)*r.width)),y=Math.max(h+10,Math.min(r.height-62,(-p.y*.5+.5)*r.height));
  const overlaps=o=>Math.abs(x-o.x)<(w+o.w)/2+8&&y-h<o.y+8&&y>o.y-o.h-8;
  for(const o of occupied)if(overlaps(o)){
   const above=o.y-o.h-9,below=o.y+h+9;
   if(above>=h+10)y=above;else if(below<=r.height-62)y=below;
   else{x=Math.max(half,Math.min(r.width-half,o.x+(o.x<r.width/2?1:-1)*((w+o.w)/2+10)))}
  }
  label.button.style.left=x.toFixed(1)+'px';label.button.style.top=y.toFixed(1)+'px';label.button.hidden=p.z>1||p.z< -1;
  if(!label.button.hidden)occupied.push({x,y,w,h});
 }
}
function switchRoom(key,{remember=true}={}){
 objectInteractions.clear();clearInspection();hideHint();pendingScene=lobbyScene(key);const token=++loadToken;fetchController?.abort();
 // Snapshot the current frame before freeing its model; no cache of multiple live rooms.
 let source=previewMode?$('#scene-preview img'):model?$('#scene'):null;
 if(source&&!previewMode&&renderer){renderer.render(scene,camera);frames++;}
 const exit=sceneTransition.begin(token,source);roomPalette(pendingScene,{evening,immediate:reduce()});
 if(previewMode){$('#objects').hidden=true;return (async()=>{if(!await exit||token!==loadToken)return;const next=pendingScene;const shown=await scenePreview.show(rooms[next].model,rooms[next].name);if(token!==loadToken)return;if(!shown){sceneTransition.fail(token);return;}current=next;scenePreview.light(evening);rebuildLabels();updateText();if(remember)request('scene',current);await sceneTransition.reveal(token);})();}
 const requested=pendingScene;
 switchTask=switchTask.catch(()=>{}).then(async()=>{if(!await exit||token!==loadToken||disposed||!active)return;return loadRoom(requested,remember,token)});
 return switchTask;
}
async function loadRoom(key,remember,token){
 if(disposed||!renderer)return;roomReady=false;$('#loading').hidden=false;$('#load-progress').removeAttribute('value');$('#failure').hidden=true;$('#load-text').textContent='正在布置'+rooms[key].name+'…';
 // Free old GPU buffers before allocating the next room; no simultaneous scene cache.
 stopSteam();doorTween=null;articulationTweens=[];greeting=null;viewTween=null;disposeModel(model);model=null;labels.length=0;$('#scene-labels').replaceChildren();renderer.clear();
 try{fetchController=new AbortController();const response=await fetch('models/'+rooms[key].model+'.glb',{signal:fetchController.signal});if(!response.ok)throw Error('model HTTP '+response.status);const data=await response.arrayBuffer();if(token!==loadToken||disposed||!active)return;const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data,new URL('models/',location.href).href);if(token!==loadToken||disposed||!active){disposeModel(gltf.scene);return}model=prepare(gltf.scene);scene.add(model);installMirrorReflection(model);current=key;doorTween=null;articulationTweens=[];greeting=null;const mascot=model.getObjectByName('part_monster_character');if(mascot&&!reduce())greeting={object:mascot,base:mascot.position.y,angle:mascot.rotation.y,start:performance.now()};doorOpen=true;sizeCamera();rebuildLabels();updateText();updatePaperFaces();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);frames++;$('#loading').hidden=true;roomReady=true;dirty=true;if(remember)request('scene',current);applyLight();start();await sceneTransition.reveal(token);if(token===loadToken)showHint();}
 catch(e){if(token!==loadToken||disposed||e.name==='AbortError')return;sceneTransition.fail(token);$('#loading').hidden=true;$('#failure').hidden=false;$('#failure-text').textContent='场景暂时没能加载，已保存的记录仍在。';console.error('Lobby model load:',e.message)}
}
function moveZoom(factor){if(previewMode){scenePreview.zoom(1/factor);return}if(!camera||!roomReady)return;viewTween=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();dirty=true}
function toggleDoor(){const rig=model?.getObjectByName('rig_fridge_door');if(!rig)return false;if(doorOpen)objectInteractions.retractDrawer();doorOpen=!doorOpen;const to=doorOpen?THREE.MathUtils.degToRad(-102):0;if(reduce())rig.rotation.y=to;else doorTween={rig,from:rig.rotation.y,to,start:performance.now()};dirty=true;renderer.shadowMap.needsUpdate=true;return true}
function toggleArticulation(name){
 const rig=model?.getObjectByName(name);if(!rig)return false;
 let state=articulationState.get(rig);if(!state){state={open:name!=='rig_pot_lid',position:rig.position.clone(),rotation:rig.rotation.clone()};articulationState.set(rig,state)}
 state.open=!state.open;if(name==='rig_pot_lid'){if(state.open)startSteam();else stopSteam();}
 const properties=name==='rig_pot_lid'?[['position','y',state.position.y+(state.open?.42:0)],['rotation','x',state.open?-.72:state.rotation.x]]:[['rotation','y',state.open?state.rotation.y:0]];
 articulationTweens=articulationTweens.filter(t=>t.rig!==rig);
 for(const[key,axis,to]of properties){if(reduce())rig[key][axis]=to;else articulationTweens.push({rig,key,axis,from:rig[key][axis],to,start:performance.now()})}
 renderer.shadowMap.needsUpdate=true;dirty=true;return true;
}
function stopSteam(){if(steamEffect){disposeModel(steamEffect.group);steamEffect=null;dirty=true;}}
function startSteam(){
 stopSteam();if(reduce()||!model)return;const rig=model.getObjectByName('rig_pot_lid');if(!rig)return;
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;const c=canvas.getContext('2d'),gradient=c.createRadialGradient(32,65,3,32,65,50);gradient.addColorStop(0,'rgba(255,250,235,.24)');gradient.addColorStop(.5,'rgba(255,250,235,.10)');gradient.addColorStop(1,'rgba(255,250,235,0)');c.fillStyle=gradient;c.fillRect(0,0,64,128);
 const texture=new THREE.CanvasTexture(canvas),group=new THREE.Group();group.name='LiveSteam';model.add(group);group.position.copy(model.worldToLocal(rig.getWorldPosition(v(0,0,0))));
 for(let i=0;i<3;i++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));sprite.scale.set(.21,.38,1);sprite.position.set((i-1)*.065,.13,i*.025);sprite.userData.phase=i;group.add(sprite);}
 steamEffect={group,elapsed:0};dirty=true;
}
function paintLight(t){
 if(!light)return;lamp.color.copy(t.lampColor);lamp.intensity=t.lamp;light.color.copy(t.keyColor);light.intensity=t.key;fill.color.copy(t.fillColor);fill.intensity=t.fill;scene.environmentIntensity=t.environment;renderer.toneMappingExposure=t.exposure;dirty=true;
}
function settleLight(){if(lightTween){paintLight(lightTween.to);lightTween=null;}}
function applyLight(){
 const palette=roomPalette(sceneTransition.state.busy?pendingScene:current,{evening,immediate:reduce()});if(previewMode)scenePreview.light(evening);document.body.dataset.evening=String(evening);if(!light)return;
 const to={lampColor:new THREE.Color(palette.lamp),lamp:evening?5:0,keyColor:new THREE.Color(evening?'#ffd4aa':'#fff1dc'),key:evening?2:2.8,fillColor:new THREE.Color(evening?'#aec9e3':'#e5f1ef'),fill:evening?.8:.7,environment:evening?.30:.55,exposure:evening?.94:1.04};
 if(reduce()||!roomReady||!active){lightTween=null;paintLight(to)}else lightTween={from:{lampColor:lamp.color.clone(),lamp:lamp.intensity,keyColor:light.color.clone(),key:light.intensity,fillColor:fill.color.clone(),fill:fill.intensity,environment:scene.environmentIntensity,exposure:renderer.toneMappingExposure},to};dirty=true;
}
function start(){cancelAnimationFrame(raf);if(!active||disposed||document.hidden||contextLost||!engineReady)return;raf=requestAnimationFrame(frame)}
// Cap motion time per rendered frame so a slow GPU cannot skip an entire gesture tween.
function motionProgress(animation,ms,duration){
 const delta=animation.last===undefined?0:Math.max(0,Math.min(64,ms-animation.last));
 animation.last=ms;animation.elapsed=Math.min(duration,(animation.elapsed||0)+delta);return animation.elapsed/duration;
}
function frame(ms){if(!active||disposed||document.hidden||contextLost||!engineReady)return;raf=requestAnimationFrame(frame);if(sceneTransition.state.phase==='leaving'||sceneTransition.state.phase==='loading')return;if(ms-lastFrame<(snapshot.quality==='economy'?50:33))return;lastFrame=ms;const changed=controls.update();if(lightTween&&reduce())settleLight();if(lightTween){const t=motionProgress(lightTween,ms,520),ease=t*t*(3-2*t),from=lightTween.from,to=lightTween.to;paintLight({lampColor:from.lampColor.clone().lerp(to.lampColor,ease),lamp:THREE.MathUtils.lerp(from.lamp,to.lamp,ease),keyColor:from.keyColor.clone().lerp(to.keyColor,ease),key:THREE.MathUtils.lerp(from.key,to.key,ease),fillColor:from.fillColor.clone().lerp(to.fillColor,ease),fill:THREE.MathUtils.lerp(from.fill,to.fill,ease),environment:THREE.MathUtils.lerp(from.environment,to.environment,ease),exposure:THREE.MathUtils.lerp(from.exposure,to.exposure,ease)});if(t===1)lightTween=null;}objectInteractions.tick(interactionFrame?Math.max(0,Math.min(64,ms-interactionFrame)):0);interactionFrame=ms;
 if(steamEffect){const t=motionProgress(steamEffect,ms,2000);steamEffect.group.children.forEach((o,i)=>{o.position.y=.13+t*.43+i*.04;o.position.x=(i-1)*.065+Math.sin(t*5+i)*.025;o.material.opacity=Math.sin(t*Math.PI)*.7;});dirty=true;if(t===1)stopSteam();}
 if(greeting){const t=motionProgress(greeting,ms,1200),ease=Math.sin(t*Math.PI);greeting.object.position.y=greeting.base+Math.sin(t*Math.PI*2)**2*.035*ease;greeting.object.rotation.y=greeting.angle+Math.sin(t*Math.PI*3)*.055*ease;renderer.shadowMap.needsUpdate=true;dirty=true;if(t===1){greeting.object.position.y=greeting.base;greeting.object.rotation.y=greeting.angle;greeting=null}}
 articulationTweens=articulationTweens.filter(t=>{const progress=motionProgress(t,ms,620);t.rig[t.key][t.axis]=THREE.MathUtils.lerp(t.from,t.to,1-(1-progress)**3);dirty=true;renderer.shadowMap.needsUpdate=true;return progress<1});
 if(viewTween){const t=motionProgress(viewTween,ms,620),ease=1-(1-t)**3;camera.position.lerpVectors(viewTween.from,viewTween.to,ease);controls.target.lerpVectors(viewTween.oldTarget,viewTween.target,ease);controls.update();dirty=true;if(t===1)viewTween=null}
 if(doorTween){const t=motionProgress(doorTween,ms,650);doorTween.rig.rotation.y=THREE.MathUtils.lerp(doorTween.from,doorTween.to,1-(1-t)**3);renderer.shadowMap.needsUpdate=true;dirty=true;if(t===1)doorTween=null}
 if(dirty||changed){positionLabels();const begin=performance.now();renderer.render(scene,camera);const cost=performance.now()-begin;dirty=false;frames++;
  if(snapshot.quality==='balanced'&&document.visibilityState==='visible'&&roomReady){qualitySamples.push(cost);if(qualitySamples.length>24)qualitySamples.shift();if(qualitySamples.length===24&&qualitySamples.filter(n=>n>48).length>=18&&adaptiveScale>.65){adaptiveScale=Math.max(.65,adaptiveScale-.15);qualitySamples=[];applyQuality();}}
 }}
function setActive(value){active=Boolean(value);if(!active){sceneTransition.settle();settlePalette();settleLight();objectInteractions.clear();interactionFrame=0;hideHint();stopSteam();cancelAnimationFrame(raf);pointers.clear();if(doorTween)doorTween.rig.rotation.y=doorTween.to;doorTween=null;for(const t of articulationTweens)t.rig[t.key][t.axis]=t.to;articulationTweens=[];if(greeting){greeting.object.position.y=greeting.base;greeting.object.rotation.y=greeting.angle;greeting=null}viewTween=null;clearTimeout(holdTimer);fetchController?.abort();}else{dirty=true;if(!previewMode&&engineReady&&(!model||!roomReady||pendingScene!==current))switchRoom(pendingScene,{remember:false});start()}}
function receiveSnapshot(value){try{const s=typeof value==='string'?JSON.parse(value):value;if(!s||s.v!==1||s.type!=='snapshot')return false;const oldQuality=snapshot.quality;snapshot={...snapshot,...s,scene:lobbyScene(s.scene),quality:lobbyQuality(s.quality)};for(const key of ['foodCount','mealCount','shoppingCount','favoriteCount','planCount'])snapshot[key]=Math.min(100000,Math.max(0,Math.floor(Number(snapshot[key])||0)));snapshot.nickname=String(snapshot.nickname||'').slice(0,32);snapshot.mealSummaries=Array.isArray(snapshot.mealSummaries)?[0,1,2].map(i=>String(snapshot.mealSummaries[i]||'').slice(0,70)):['','',''];snapshot.reducedMotion=Boolean(snapshot.reducedMotion);document.body.dataset.motion=reduce()?'reduce':'normal';if(reduce()){sceneTransition.settle(true);settlePalette();settleLight();stopSteam();objectInteractions.settle();}if(reduce()&&greeting){greeting.object.position.y=greeting.base;greeting.object.rotation.y=greeting.angle;greeting=null}controls&&(controls.enableDamping=!reduce());if(snapshot.quality==='economy')sceneTransition.settle(true);if(oldQuality!==snapshot.quality){adaptiveScale=1;qualitySamples=[];applyQuality();}if((renderer||previewMode)&&snapshot.scene!==current)switchRoom(snapshot.scene,{remember:false});updateText();updatePaperFaces();return true}catch{return false}}
function dispose(){if(disposed)return;sceneTransition.dispose();settlePalette();objectInteractions.clear();stopSteam();disposed=true;active=false;loadToken++;fetchController?.abort();cancelAnimationFrame(raf);clearTimeout(toastTimer);clearTimeout(holdTimer);hideHint();resizeObserver?.disconnect();controls?.dispose();scenePreview?.dispose();disposeModel(model);model=null;environmentTarget?.dispose();environmentTarget=null;environment=null;light?.shadow?.map?.dispose();if(shadowFloor){shadowFloor.geometry.dispose();shadowFloor.material.dispose()}renderer?.dispose();renderer?.forceContextLoss();labels.length=0;pointers.clear()}
async function init(){try{
 if(previewMode){scenePreview?.dispose();scenePreview=null;previewMode=false;$('#stage').classList.remove('preview-mode');$('#scene').hidden=false}
 renderer=new THREE.WebGLRenderer({canvas:$('#scene'),antialias:true,alpha:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 scene=new THREE.Scene();const generator=new THREE.PMREMGenerator(renderer),studio=new RoomEnvironment();environmentTarget=generator.fromScene(studio,.03);environment=environmentTarget.texture;scene.environment=environment;studio.dispose();generator.dispose();
 camera=new THREE.PerspectiveCamera(38,1,.1,200);camera.position.set(10,10,14);controls=new OrbitControls(camera,$('#scene'));controls.target.set(0,1,0);controls.enablePan=true;controls.screenSpacePanning=true;controls.panSpeed=.65;controls.enableDamping=!reduce();controls.dampingFactor=.10;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.28;controls.zoomSpeed=.65;controls.addEventListener('change',()=>dirty=true);controls.addEventListener('start',()=>{viewTween=null});
 scene.add(new THREE.HemisphereLight('#fff7e6','#879c87',1));light=new THREE.DirectionalLight('#fff1dc',2.8);light.position.set(-5,9,6);light.castShadow=true;light.shadow.camera.left=light.shadow.camera.bottom=-8;light.shadow.camera.right=light.shadow.camera.top=8;light.shadow.camera.near=.5;light.shadow.camera.far=30;light.shadow.bias=-.00035;light.shadow.normalBias=.022;light.shadow.radius=3;scene.add(light);fill=new THREE.DirectionalLight('#e5f1ef',.7);fill.position.set(5,4,-5);scene.add(fill);const rim=new THREE.DirectionalLight('#f3dcd7',.45);rim.position.set(0,6,-8);scene.add(rim);lamp=new THREE.PointLight('#ffd5a1',0,9,2);lamp.position.set(-1,3.7,1);scene.add(lamp);
 shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({color:'#445b47',opacity:.18}));shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=-.45;shadowFloor.receiveShadow=true;scene.add(shadowFloor);
 engineReady=true;resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('#stage'));applyQuality();applyLight();await switchRoom(snapshot.scene,{remember:false});request('ready');
 }catch(e){engineReady=false;cancelAnimationFrame(raf);resizeObserver?.disconnect();controls?.dispose();renderer?.dispose();environmentTarget?.dispose();environmentTarget=null;environment=null;renderer=null;$('#loading').hidden=true;console.error('Lobby init:',e.message);previewMode=true;scenePreview=createScenePreview($('#stage'),()=>{$('#failure').hidden=false;$('#failure-text').textContent='场景预览暂未准备好，可继续使用简洁版。'});$('#scene').hidden=true;$('#failure').hidden=true;switchRoom(snapshot.scene,{remember:false});request('ready')}}

$('#rooms').innerHTML=Object.entries(rooms).map(([id,r])=>`<button data-scene="${id}" aria-pressed="${id===current}"><img src="${r.icon}" alt=""><span>${r.name}</span></button>`).join('');
$('#feature-groups').innerHTML=features.map(([title,list])=>`<h3>${title}</h3><div class="feature-row">${list.map(([id,name])=>`<button data-route="${id}">${name}</button>`).join('')}</div>`).join('');
$('#rooms').onclick=e=>{const button=e.target.closest('[data-scene]');if(button&&button.dataset.scene!==current)switchRoom(button.dataset.scene)};
$('#feature-groups').onclick=e=>{const button=e.target.closest('[data-route]');if(button){$('#feature-drawer').close();openRoute(button.dataset.route)}};
$('#feature-drawer').addEventListener('close',syncOverlay);
$('#more').addEventListener('click',()=>request('overlay','features'));
$('#objects').onclick=()=>{if(!sceneTransition.state.busy&&roomReady)objectInteractions.showPicker()};
$('#room-open').onclick=()=>openRoute(rooms[current].route);$('#draw').onclick=()=>openRoute('draw');$('#simple').onclick=$('#fallback').onclick=()=>request('mode','simple');$('#more').onclick=()=>$('#feature-drawer').showModal();$('#close-drawer').onclick=()=>$('#feature-drawer').close();$('#zoom-in').onclick=()=>moveZoom(.8);$('#zoom-out').onclick=()=>moveZoom(1.25);$('#reset').onclick=()=>{if(previewMode){scenePreview.reset();return}objectInteractions.close();viewTween=null;clearInspection();sizeCamera();dirty=true};$('#retry').onclick=()=>contextLost?location.reload():!engineReady?init():switchRoom(current);$('#light').onclick=()=>{evening=!evening;applyLight()};
$('#inspect-back').onclick=returnInspection;$('#gesture-hint').onclick=hideHint;
const raycaster=new THREE.Raycaster();let multi=false;
function hitAt(x,y){if(!model||!roomReady||sceneTransition.state.busy)return null;const r=$('#scene').getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),camera);return raycaster.intersectObject(model,true)[0]}
function focusPart(hit){
 if(!hit)return;objectInteractions.close();if(!inspectionOrigin)inspectionOrigin={position:camera.position.clone(),target:controls.target.clone()};$('#inspect-back').hidden=false;syncOverlay();hideHint();let object=hit.object;while(object.parent&&!object.name.startsWith('part_')&&!object.userData.route)object=object.parent;
 const box=new THREE.Box3().setFromObject(object),target=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const direction=camera.position.clone().sub(controls.target).normalize(),distance=Math.max(.85,Math.max(size.y,size.x/camera.aspect)*1.8,size.z*1.4),to=target.clone().addScaledVector(direction,distance);
 if(reduce()){camera.position.copy(to);controls.target.copy(target);controls.update()}else viewTween={from:camera.position.clone(),oldTarget:controls.target.clone(),target,to,start:performance.now()};
 dirty=true;toast('拖动查看细节');
}
$('#scene').addEventListener('pointerdown',e=>{
 if(!pointers.size){multi=false;held=false}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});clearTimeout(holdTimer);
 if(pointers.size>1)multi=true;
 else holdTimer=setTimeout(()=>{held=true;focusPart(hitAt(e.clientX,e.clientY))},580);
});
$('#scene').addEventListener('pointermove',e=>{const from=pointers.get(e.pointerId);if(from&&Math.hypot(from.x-e.clientX,from.y-e.clientY)>7)clearTimeout(holdTimer)});
$('#scene').addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);clearTimeout(holdTimer)});
$('#scene').addEventListener('pointerup',e=>{
 clearTimeout(holdTimer);const from=pointers.get(e.pointerId);pointers.delete(e.pointerId);
 if(multi||held||!from||!model||Math.hypot(from.x-e.clientX,from.y-e.clientY)>8)return;
 const hit=hitAt(e.clientX,e.clientY);if(!hit)return;
 let o=hit.object;while(o&&!o.userData.station)o=o.parent;
 const part=hit.object.name;const name=(()=>{let n=hit.object;while(n&&!n.name.startsWith('part_'))n=n.parent;return n?.name||part})();
 if(current==='pantry'&&/door|hinge/.test(name)&&toggleDoor()){objectInteractions.choose(hit.object);return;}
 if(current==='recipes'&&name==='part_kitchen_cabinet'&&toggleArticulation('rig_cabinet_door')){objectInteractions.choose(hit.object);return;}
 if(current==='recipes'&&name==='part_kitchen_pot'&&toggleArticulation('rig_pot_lid')){objectInteractions.choose(hit.object);return;}
 if(objectInteractions.choose(hit.object))return;
 const station=o?.userData.station;let semantic=hit.object;while(semantic&&!semantic.userData.route)semantic=semantic.parent;
 const route=semantic?.userData.route||{draw:'draw',meals:'diary',recipes:'recipes',pantry:'pantry',shopping:'shopping',community:'community',profile:'profile',mascot:'profile'}[station];
 if(route)openRoute(route);
});
$('#scene').addEventListener('webglcontextlost',e=>{e.preventDefault();sceneTransition.settle();settlePalette();settleLight();contextLost=true;cancelAnimationFrame(raf);$('#failure-text').textContent='3D资源暂时不足，记录已保留；可重试或使用简洁版。';$('#failure').hidden=false});$('#scene').addEventListener('webglcontextrestored',()=>location.reload());
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.channel!=='kaifan-lobby-v1')return;if(e.data.snapshot)receiveSnapshot(e.data.snapshot);if(typeof e.data.active==='boolean')setActive(e.data.active)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sceneTransition.settle();settlePalette();settleLight();objectInteractions.clear();interactionFrame=0;hideHint();cancelAnimationFrame(raf);clearTimeout(holdTimer);pointers.clear()}else start()});window.addEventListener('pagehide',dispose);window.addEventListener('beforeunload',dispose);
window.LobbyNative={receiveSnapshot,setActive,dispose,back(){if(objectInteractions.back())return true;if($('#feature-drawer').open){$('#feature-drawer').close();return true}if(returnInspection())return true;return false}};
window.lobbyState={get lighting(){return {pending:!!lightTween,exposure:renderer?.toneMappingExposure||0}},get transition(){return sceneTransition.state},get palette(){return paletteState()},get selectedObject(){return objectInteractions.selected},get objectMotion(){return objectInteractions.moving},get steamActive(){return !!steamEffect},get renderMode(){return previewMode?'preview':'realtime'},get preview(){return scenePreview?.state||null},get ready(){return roomReady},get scene(){return current},get frames(){return frames},get active(){return active&&!disposed},get stats(){return renderer?{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}:null},get adaptiveScale(){return adaptiveScale},get inspecting(){return !!inspectionOrigin},get snapshot(){return {...snapshot}},get model(){return model},get camera(){return camera},switchRoom,openRoute};
document.fonts?.ready.then(()=>{if(model&&!disposed)updatePaperFaces()});
init();
