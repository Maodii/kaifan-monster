import * as THREE from 'three';
// Authored semantic parts are the targets; no screen-coordinate hotspots or synthetic inventory.
const define=(title,actions,motion='lift')=>({title,actions,motion});
const route=(label,id)=>({label,route:id});
const local=(label,id)=>({label,local:id});
export function installObjectRigs(root){
 const crisper=root.getObjectByName('part_fridge_crisper');if(!crisper||crisper.getObjectByName('rig_crisper_drawer'))return;
 const rig=new THREE.Group();rig.name='rig_crisper_drawer';crisper.add(rig);
 // Fixed steel rails and their mounting screws stay on the refrigerator body.
 let fixed=0,moving=0;
 for(const child of [...crisper.children])if(child!==rig){
  // GLTFLoader sanitizes authored spaces to underscores; match both representations.
  if(/Drawer[ _]fixed[ _]steel[ _]slide|Countersunk[ _]screw|Screw[ _]slot/.test(child.name))fixed++;
  else{rig.add(child);moving++;}
 }
 crisper.userData.drawerRig={fixedPieces:fixed,movingPieces:moving};
}
export const OBJECT_ACTIONS={
 meals:{
  part_diary_calendar:define('日历安排',[route('安排一餐','meal-plan'),route('今日三餐','today')],'tilt'),
  part_diary_journal:define('三餐手账',[route('查看记录','diary'),route('记一餐','new-meal')],'tilt'),
  part_diary_meal:define('这一餐',[route('记一餐','new-meal'),route('抽一餐','draw')]),
  part_diary_receipts:define('餐费小票',[route('花费与营养','stats')],'tilt'),
  part_diary_pen:define('拿起笔',[route('记一餐','new-meal')]),
  part_diary_memories:define('餐桌回忆',[route('查看记录','diary')],'tilt')
 },
 recipes:{
  part_kitchen_pot:define('炖锅',[local('开 / 合锅盖','lid'),route('挑一道菜','recipes')],'none'),
  part_kitchen_cabinet:define('厨房收纳',[local('开 / 合柜门','cabinet'),route('采购清单','shopping')],'none'),
  part_kitchen_chopping:define('备菜台',[route('按食材找菜','recipe-search'),route('查看食材','pantry')]),
  part_kitchen_recipebook:define('厨房食谱',[route('翻菜谱','recipes'),route('抽一餐','draw')],'tilt'),
  part_kitchen_spices:define('调味架',[route('搜索菜谱','recipe-search'),route('采购清单','shopping')]),
  part_kitchen_meal:define('今日成品',[route('记下这餐','new-meal')]),
  part_kitchen_herbs:define('香草小盆',[route('食材入库','new-food'),route('查看食材','pantry')])
 },
 pantry:{
  part_fridge_door:define('冰箱门',[local('开 / 合冰箱门','fridge'),route('查看库存','pantry')],'none'),
  part_fridge_dairy:define('乳品层',[route('库存与消耗','pantry'),route('采购清单','shopping')]),
  part_fridge_eggs:define('鸡蛋托',[route('库存与消耗','pantry'),route('搜索做法','recipe-search')]),
  part_fridge_produce:define('蔬果层',[route('库存与消耗','pantry'),route('搜索做法','recipe-search')]),
  part_fridge_crisper:define('保鲜抽屉',[local('拉开 / 推回','drawer'),route('采购与消耗','stock-history')],'none'),
  part_fridge_market:define('补货袋',[route('采购清单','shopping'),route('新食材入库','new-food')])
 },
 community:{
  part_square_posts:define('餐桌照片墙',[route('看看大家的餐桌','community'),route('搜索分享','community-search')],'tilt'),
  part_square_menu:define('今日话题',[route('搜索分享','community-search'),route('餐桌广场','community')],'tilt'),
  part_square_tableware:define('同桌的一餐',[route('记录我的一餐','new-meal'),route('餐桌广场','community')]),
  part_square_market:define('分享餐篮',[route('记一餐','new-meal'),route('餐桌广场','community')]),
  part_square_lights:define('广场灯串',[local('日 / 夜','light')],'none')
 },
 profile:{
  part_monster_character:define('开饭小怪',[local('打个招呼','greet'),route('我的档案','profile')],'none'),
  part_monster_favorites:define('收藏小柜',[route('喜欢的做法','favorites')],'tilt'),
  part_monster_nameplate:define('我的名牌',[route('编辑档案','profile')],'tilt'),
  part_monster_wardrobe:define('生活偏好',[route('设置与偏好','settings')],'tilt'),
  part_monster_badges:define('食光徽章',[route('花费与营养','stats')]),
  part_monster_mirror:define('食光镜',[local('日 / 夜','light'),route('我的档案','profile')],'none')
 }
};
export function createObjectInteractions({stage,panel,picker,getModel,getRoom,getSnapshot,reduced,changed,route,local,focus,overlay}){
 let selected=null,pulse=null,drawer=null;const drawers=new WeakMap();
 const title=panel.querySelector('h2'),summary=panel.querySelector('p'),buttons=panel.querySelector('.object-actions');
 function settle(){if(pulse){pulse.object.position.copy(pulse.position);pulse.object.rotation.copy(pulse.rotation);pulse=null;}if(drawer){drawer.object.position.z=drawer.to;drawer=null;}changed();}
 function close(){selected=null;panel.hidden=true;settle();overlay('none');}
 function clear(){close();if(picker.open)picker.close();}
 function caption(){const s=getSnapshot();if(getRoom()==='meals')return selected?.id==='part_diary_journal'?(s.mealSummaries.filter(Boolean).join(' · ')||'今天还没有记餐'):`今天 ${s.mealCount} 餐 · ${s.planCount} 项安排`;if(getRoom()==='pantry')return `${s.foodCount} 份库存 · ${s.shoppingCount} 项待采购`;if(selected?.id==='part_monster_favorites')return `${s.favoriteCount} 份喜欢的做法`;return '';}
 function refresh(){if(!selected)return;summary.textContent=caption();summary.hidden=!summary.textContent;}
 function choose(object){
  if(!object||!getModel())return false;
  let target=object;while(target&&!OBJECT_ACTIONS[getRoom()]?.[target.name])target=target.parent;
  if(!target)return false;settle();const spec=OBJECT_ACTIONS[getRoom()][target.name];selected={id:target.name,object:target,spec};
  title.textContent=spec.title;buttons.replaceChildren();
  for(const action of spec.actions){const b=document.createElement('button');b.textContent=action.label;b.onclick=()=>{if(action.route){close();route(action.route)}else if(action.local==='drawer'){toggleDrawer(target)}else local(action.local)};buttons.append(b);}
  const view=document.createElement('button');view.textContent='看细节';view.className='object-inspect';view.onclick=()=>{const object=selected?.object;close();if(object)focus({object})};buttons.append(view);
  panel.hidden=false;refresh();overlay('objects');
  if(!reduced()&&spec.motion!=='none')pulse={object:target,position:target.position.clone(),rotation:target.rotation.clone(),motion:spec.motion,elapsed:0};
  changed();return true;
 }
 function toggleDrawer(object){
  object=object.getObjectByName('rig_crisper_drawer')||object;
  let state=drawers.get(object);if(!state){state={base:object.position.z,open:false};drawers.set(object,state)}
  state.open=!state.open;if(state.open)local('ensure-fridge');const to=state.base+(state.open?.48:0);
  drawer={object,from:object.position.z,to,elapsed:0};if(reduced())settle();changed();
 }
 function tick(delta){
  if(reduced()){if(pulse||drawer)settle();return false;}
  let moving=false;
  if(pulse){pulse.elapsed=Math.min(420,pulse.elapsed+delta);const t=pulse.elapsed/420,w=Math.sin(t*Math.PI)*(1-t);pulse.object.position.y=pulse.position.y+(pulse.motion==='lift'?.045:.012)*w;pulse.object.rotation.z=pulse.rotation.z+(pulse.motion==='tilt'?.035:.015)*w;moving=true;if(t===1){pulse.object.position.copy(pulse.position);pulse.object.rotation.copy(pulse.rotation);pulse=null}}
  if(drawer){drawer.elapsed=Math.min(520,drawer.elapsed+delta);const t=drawer.elapsed/520;drawer.object.position.z=THREE.MathUtils.lerp(drawer.from,drawer.to,1-(1-t)**3);moving=true;if(t===1)drawer=null;}
  if(moving)changed();return moving;
 }
 function showPicker(){if(!getModel())return;picker.querySelector('.object-list').replaceChildren();for(const [id,spec]of Object.entries(OBJECT_ACTIONS[getRoom()]||{})){const object=getModel().getObjectByName(id);if(!object)continue;const b=document.createElement('button');b.textContent=spec.title;b.onclick=()=>{picker.close();choose(object);panel.querySelector('button').focus({preventScroll:true});};picker.querySelector('.object-list').append(b)}picker.showModal();overlay('objects');}
 panel.querySelector('.object-close').onclick=close;picker.querySelector('.object-picker-close').onclick=()=>picker.close();picker.addEventListener('close',()=>overlay('none'));
 function retractDrawer(){const object=getModel()?.getObjectByName('rig_crisper_drawer'),state=object&&drawers.get(object);if(state){if(drawer?.object===object)drawer=null;state.open=false;object.position.z=state.base;changed();}}
 return {choose,tick,settle,close,clear,refresh,showPicker,retractDrawer,back(){if(picker.open){picker.close();return true}if(selected){close();return true}return false},get selected(){return selected?.id||null},get moving(){return !!(pulse||drawer)}};
}
