import { CoreRecipe } from './RecommendationCore';
import { recipeFilterSummary, RecipeFilterOptions } from './RecipeFilterCore';
import { MealPlan } from './MealPlan';
import { WorkspacePayload, WorkspacePreferences, WORKSPACE_KEYS, workspaceSignature } from './WorkspaceCore';
export class WorkspaceMergeRow {
 key:string='';kind:string='';label:string='';local:string='';remote:string='';choice:string='local';conflict:boolean=false;
}
const PREF_LABELS:string[]=['做饭地区','外食地区','做饭目标','外食目标','做饭学习','外食学习','忌口','口味','近期去重天数','推荐场景'];
function prefValue(p:WorkspacePayload,key:string):string{const keys:string[]=Object.keys(p.preferences);const vals:string[]=Object.values(p.preferences);return vals[keys.indexOf(key)]||'';}
function nestedRows(text:string,kind:string):Object[]{if(!text){return [];}const value:Object=JSON.parse(text) as Object;const keys:string[]=Object.keys(value);const values:Object[]=Object.values(value);const list:Object=values[keys.indexOf(kind)];return Array.isArray(list)?list as Object[]:[];}
function field(value:Object,key:string):string{const keys:string[]=Object.keys(value);return String(Object.values(value)[keys.indexOf(key)]||'');}
function flatten(p:WorkspacePayload):WorkspaceMergeRow[]{
 const rows:WorkspaceMergeRow[]=[];
 for(const plan of p.plans){const r:WorkspaceMergeRow=new WorkspaceMergeRow();r.key='plan:'+plan.id;r.kind='plan';r.label=plan.date+' '+plan.occasion+' '+(plan.note||plan.recipeId);r.local=JSON.stringify(plan);rows.push(r);}
 for(const key of WORKSPACE_KEYS){const text:string=prefValue(p,key);if(key==='experience:v1'||key==='household:v1'){
  const kinds:string[]=key==='experience:v1'?['collections','filters']:['members'];for(const kind of kinds){for(const item of nestedRows(text,kind)){const id:string=field(item,kind==='members'?'id':'name');if(!id){continue;}const r:WorkspaceMergeRow=new WorkspaceMergeRow();r.key=kind+':'+id;r.kind=kind;r.label=(kind==='members'?'成员 ':kind==='collections'?'收藏夹 ':'筛选 ')+field(item,'name');r.local=JSON.stringify(item);rows.push(r);}}
 }else if(text!==''){const r:WorkspaceMergeRow=new WorkspaceMergeRow();r.key='pref:'+key;r.kind='pref';r.label=PREF_LABELS[WORKSPACE_KEYS.indexOf(key)]||key;r.local=JSON.stringify(text);rows.push(r);}}
 if(new Set(rows.map((r:WorkspaceMergeRow)=>r.key)).size!==rows.length){throw new Error('发现重复安排或分组名称，请先整理后合并');}return rows;
}
/** Three-way decisions include deletion. Without a known ancestor, differing same-key values require an explicit choice. */
export function workspaceMergeRows(local:WorkspacePayload,remote:WorkspacePayload,base:WorkspacePayload|null=null):WorkspaceMergeRow[]{
 const left:WorkspaceMergeRow[]=flatten(local);const right:WorkspaceMergeRow[]=flatten(remote);const old:WorkspaceMergeRow[]=base?flatten(base):[];const keys:string[]=Array.from(new Set(left.concat(right).concat(old).map((r:WorkspaceMergeRow)=>r.key)));
 return keys.map((key:string)=>{const l:WorkspaceMergeRow|undefined=left.find((r:WorkspaceMergeRow)=>r.key===key);const r:WorkspaceMergeRow|undefined=right.find((v:WorkspaceMergeRow)=>v.key===key);const b:WorkspaceMergeRow|undefined=old.find((v:WorkspaceMergeRow)=>v.key===key);const out:WorkspaceMergeRow=JSON.parse(JSON.stringify(l||r||b)) as WorkspaceMergeRow;out.local=l?.local||'';out.remote=r?.local||'';const ls:string=out.local?workspaceSignature(JSON.parse(out.local) as Object):'';const rs:string=out.remote?workspaceSignature(JSON.parse(out.remote) as Object):'';const bs:string=b?workspaceSignature(JSON.parse(b.local) as Object):'';out.conflict=ls!==rs&&(!base?Boolean(ls&&rs):(ls!==bs&&rs!==bs));out.choice=ls===rs?'local':base&&ls===bs?'remote':base&&rs===bs?'local':!out.local?'remote':'local';if(out.conflict){out.choice='';}return out;});
}
export function mergedWorkspace(rows:WorkspaceMergeRow[]):WorkspacePayload{
 const payload:WorkspacePayload=new WorkspacePayload();const prefs:string[]=[];const collections:string[]=[];const filters:string[]=[];const members:string[]=[];
 for(const row of rows){if(row.conflict&&!['local','remote'].includes(row.choice)){throw new Error('请逐项选择冲突内容');}const text:string=row.choice==='remote'?row.remote:row.local;if(!text){continue;}
  if(row.kind==='plan'){payload.plans.push(JSON.parse(text) as MealPlan);}else if(row.kind==='pref'){prefs.push(JSON.stringify(row.key.slice(5))+':'+text);}else if(row.kind==='collections'){collections.push(text);}else if(row.kind==='filters'){filters.push(text);}else if(row.kind==='members'){members.push(text);}}
 prefs.push(JSON.stringify('experience:v1')+':'+JSON.stringify('{"collections":['+collections.join(',')+'],"filters":['+filters.join(',')+']}'));
 prefs.push(JSON.stringify('household:v1')+':'+JSON.stringify('{"members":['+members.join(',')+']}'));
 payload.preferences=JSON.parse('{'+prefs.join(',')+'}') as WorkspacePreferences;return payload;
}

export function workspaceMergeSummary(row:WorkspaceMergeRow,side:string,recipes:CoreRecipe[]=[]):string{
 const text:string=side==='remote'?row.remote:row.local;if(!text){return '已移除 / 未设置';}
 if(row.kind==='pref'){const v:string=JSON.parse(text) as string;return v==='true'?'开启':v==='false'?'关闭':v;}
 const value:Object=JSON.parse(text) as Object;
 if(row.kind==='plan'){const plan:MealPlan=value as MealPlan;return plan.date+' '+plan.occasion+' · '+(plan.note||recipes.find((r:CoreRecipe)=>r.id===plan.recipeId)?.name||'菜谱安排')+' · '+plan.people+'人'+(plan.completed?' · 已完成':'');}
 if(row.kind==='members'){const excluded:Object=Object.values(value)[Object.keys(value).indexOf('excluded')];return field(value,'name')+' · '+field(value,'appetite')+'成人份 · '+(field(value,'enabled')==='true'?'参与':'不参与')+(Array.isArray(excluded)&&excluded.length?' · 不吃 '+(excluded as string[]).join('、'):'');}
 if(row.kind==='collections'){const ids:Object=Object.values(value)[Object.keys(value).indexOf('ids')];return field(value,'name')+' · '+(Array.isArray(ids)?ids.length:0)+'道菜'+(Array.isArray(ids)&&recipes.length?' · '+(ids as string[]).slice(0,8).map((id:string)=>recipes.find((r:CoreRecipe)=>r.id===id)?.name||'已移除菜谱').join('、'):'');}
 const options:Object=Object.values(value)[Object.keys(value).indexOf('options')];return field(value,'name')+' · '+(options?recipeFilterSummary(options as RecipeFilterOptions):'条件待核对')+' · '+(field(value,'favorites')==='true'?'仅收藏':'全部菜谱')+' · '+field(value,'order');
}
