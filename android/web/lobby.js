"use strict";
// The installed lobby owns no records or credentials: destinations reuse the existing application.
const LobbyCore = require('LobbyCore');
// Compatibility bridge remains for AI destinations; no 3D runtime is installed.
const LOBBY_ENABLED = false;
const lobbyHost = {visible:false,scene:'meals',frame:null,mode:'simple',quality:'balanced',foreground:true};
const previousLobbySettings=loadSettings;
loadSettings=async function(){
 closeLobbyFrame();await previousLobbySettings();
 lobbyHost.mode=LOBBY_ENABLED&&(await store.getSetting('displayMode','simple'))==='3d'?'3d':'simple';
 lobbyHost.quality=LobbyCore.lobbyQuality(await store.getSetting('lobbyQuality','balanced'));
 lobbyHost.scene='meals';lobbyHost.visible=lobbyHost.mode==='3d';
};
function lobbySnapshot(){
 const today=M.dateString(new Date());return {v:1,type:'snapshot',scene:lobbyHost.scene,quality:lobbyHost.quality,reducedMotion:!!parity.reducedMotion,
  nickname:String(profileData?.displayName||settings.localProfile?.displayName||'').slice(0,32),date:today,
  mealSummaries:['早餐','午餐','晚餐'].map(kind=>store.state.meals.filter(m=>M.dateString(new Date(m.date))===today&&m.mealType===kind).map(m=>m.name).join('、').slice(0,70)),
  foodCount:store.state.foods.filter(f=>f.quantity>0).length,
  mealCount:store.state.meals.filter(m=>M.dateString(new Date(m.date))===today).length,
  planCount:store.state.plans.filter(p=>p.date===today&&!p.completed).length,
  shoppingCount:store.state.shopping.filter(i=>!i.purchased).length,favoriteCount:store.state.favorites.length};
}
function sendLobbySnapshot(){if(lobbyHost.frame?.contentWindow)lobbyHost.frame.contentWindow.postMessage({channel:'kaifan-lobby-v1',snapshot:lobbySnapshot(),active:lobbyHost.foreground},location.origin)}
function closeLobbyFrame(){if(lobbyHost.frame){try{lobbyHost.frame.contentWindow?.LobbyNative?.dispose()}catch{}lobbyHost.frame.remove();lobbyHost.frame=null}document.getElementById('native-lobby')?.remove();document.body.classList.remove('in-3d-lobby')}
function showLobbyFrame(){
 if(!LOBBY_ENABLED){lobbyHost.visible=false;closeLobbyFrame();return;}
 document.body.classList.add('in-3d-lobby');
 if(!lobbyHost.frame){const wrap=document.createElement('section');wrap.id='native-lobby';wrap.setAttribute('aria-label','3D生活大厅');const frame=document.createElement('iframe');frame.title='开饭小怪3D大厅';frame.src='lobby/index.html';frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.setAttribute('allow','');frame.onload=sendLobbySnapshot;wrap.append(frame);document.body.append(wrap);lobbyHost.frame=frame;}else sendLobbySnapshot();
}
async function setLobbyMode(mode){
 lobbyHost.mode=LOBBY_ENABLED&&mode==='3d'?'3d':'simple';if(LOBBY_ENABLED)await store.setting('displayMode',lobbyHost.mode);lobbyHost.visible=lobbyHost.mode==='3d';
 if(!lobbyHost.visible)closeLobbyFrame();render();
}
async function openInstalledLobby(){
 if(!LOBBY_ENABLED){lobbyHost.visible=false;closeLobbyFrame();return;}
 if(busy)return;if(draftDirty){toast('先保存或返回当前编辑，再进入大厅');return;}
 if(page==='guide')P.invoke('keepAwake',{enabled:false});await setLobbyMode('3d');
}
async function openLobbyDestination(route){
 if(!LobbyCore.LOBBY_ROUTES.includes(route))return false;
 lobbyHost.visible=false;closeLobbyFrame();
 if(route==='new-meal'){await actions('mealNew','晚餐');return true}
 if(route==='new-food'){await actions('foodNew');return true}
 if(route==='community'){await actions('community');return true}
 if(route==='profile'){await actions('loadProfile');go('profile');return true}
 const target={today:'today',diary:'meals',recipes:'recipes',pantry:'pantry',shopping:'shopping',draw:'draw','meal-plan':'plans',favorites:'collections',stats:'stats','stock-history':'stockHistory',tools:'lobby-tools',settings:'mine',auth:'account','recipe-search':'recipe-search','community-search':'community-search'}[route];
 if(!target){render();return false}go(target);return true;
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==lobbyHost.frame?.contentWindow||event.data?.channel!=='kaifan-lobby-v1')return;
 const request=LobbyCore.parseLobbyRequest(event.data.request);if(!request)return;
 if(request.type==='ready'){sendLobbySnapshot();return}
 if(request.type==='scene'){lobbyHost.scene=LobbyCore.lobbyScene(request.value);return}
 if(request.type==='mode'){setLobbyMode(request.value).catch(e=>toast(e.message));return}
 if(request.type==='route'){openLobbyDestination(request.value).catch(e=>{render();toast(e.message)})}
});
const previousLobbyRender=render;
render=function(){
 document.getElementById('lobby-return')?.remove();
 if(LOBBY_ENABLED&&lobbyHost.visible){document.getElementById('nav').hidden=true;document.getElementById('page-header').hidden=true;showLobbyFrame();return;}
 closeLobbyFrame();previousLobbyRender();
 if(LOBBY_ENABLED&&!draftDirty&&!['meal','food','recipeEdit','publish','profile'].includes(page)){
  const bar=document.createElement('div');bar.id='lobby-return';const button=document.createElement('button');button.textContent=lobbyHost.mode==='3d'?'返回3D大厅':'3D大厅';button.onclick=()=>openInstalledLobby().catch(e=>toast(e.message));bar.append(button);screen.before(bar);
 }
};
window.parityViews['lobby-tools']=()=>heading('生活工具')+[['household','家人食量与忌口'],['batchFoods','批量入库'],['timers','厨房计时'],['leftovers','剩菜安排'],['dining-places','外食足迹'],['workspace','安排与偏好同步'],['trash','回收站']].map(([route,name])=>btn(name,'go',route)).join('');
const previousLobbyAppearance=settingsDetailView;
settingsDetailView=function(){return (LOBBY_ENABLED&&parity.settingsGroup==='外观与动效'?`<section class="lobby-mode-choice"><h2>显示模式</h2><div class="row"><button data-action="lobbyMode" data-value="simple" aria-pressed="${lobbyHost.mode==='simple'}">简洁模式</button><button data-action="lobbyMode" data-value="3d" aria-pressed="${lobbyHost.mode==='3d'}">3D大厅</button></div><h3>3D画质</h3><div class="row">${[['economy','省电'],['balanced','均衡'],['high','精细']].map(([id,label])=>`<button data-action="lobbyQuality" data-value="${id}" aria-pressed="${lobbyHost.quality===id}">${label}</button>`).join('')}</div></section>`:'')+previousLobbyAppearance()};
window.parityViews.settingsDetail=settingsDetailView;
const previousLobbyActions=actions;
actions=async function(action,value){if(action==='lobbyMode'){await setLobbyMode(value);return}if(action==='lobbyQuality'){if(!LOBBY_ENABLED)return;lobbyHost.quality=LobbyCore.lobbyQuality(value);await store.setting('lobbyQuality',lobbyHost.quality);render();return}return previousLobbyActions(action,value)};
const previousLobbyBack=window.handleBack;
window.handleBack=function(){
 if(lobbyHost.visible){try{if(lobbyHost.frame?.contentWindow?.LobbyNative?.back())return true}catch{}return false;}
 if(LOBBY_ENABLED&&lobbyHost.mode==='3d'&&!draftDirty&&['today','recipes','meals','pantry','mine','community'].includes(page)){lobbyHost.visible=true;render();return true}
 return previousLobbyBack();
};
const previousLobbyVisibility=window.platformVisibility;
window.platformVisibility=function(visible){lobbyHost.foreground=!!visible;sendLobbySnapshot();return previousLobbyVisibility(visible)};
window.addEventListener('pagehide',closeLobbyFrame);
window.__lobbyHost={state:lobbyHost,open:openInstalledLobby,destination:openLobbyDestination,snapshot:lobbySnapshot,setMode:setLobbyMode};

const previousLobbyNativeRoute=window.openNativeRoute;
window.openNativeRoute=function(route){
 // Notification and widget links must leave the3D overlay before routing to existing screens.
 lobbyHost.visible=false;closeLobbyFrame();return previousLobbyNativeRoute(route);
};
