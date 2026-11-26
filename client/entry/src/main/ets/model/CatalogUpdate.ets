import { cryptoFramework } from '@kit.CryptoArchitectureKit';
import { util } from '@kit.ArkTS';
import { http } from '@kit.NetworkKit';
import { relationalStore } from '@kit.ArkData';
import { Cloud } from './Cloud';
import { Recipe } from './Models';

export class CatalogItem { id:string=''; sha256:string=''; bytes:number=0; }
export class CatalogManifest { format:number=1; version:string=''; count:number=0; totalBytes:number=0; items:CatalogItem[]=[]; }
export class CatalogRecord extends CatalogItem { payload:string=''; }
class CatalogPage { format:number=1; version:string=''; records:CatalogRecord[]=[]; }
class CatalogRequest { version:string=''; ids:string[]=[]; }
export class CatalogUpdatePackage {
 baseVersion:string=''; manifest:CatalogManifest=new CatalogManifest(); records:CatalogRecord[]=[];
 removedIds:string[]=[]; unchanged:boolean=false;
}
export async function catalogSha256(value:string):Promise<string> {
 const digest:cryptoFramework.Md=cryptoFramework.createMd('SHA256');
 await digest.update({data:util.TextEncoder.create('utf-8').encodeInto(value)});
 const bytes:cryptoFramework.DataBlob=await digest.digest();
 return Array.from(bytes.data).map((part:number)=>part.toString(16).padStart(2,'0')).join('');
}
function validId(value:string):boolean {return typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);}
export async function validateCatalogManifest(manifest:CatalogManifest):Promise<void> {
 if(manifest.format!==1||!Array.isArray(manifest.items)||!Number.isInteger(manifest.count)||manifest.count<0||manifest.count>10000||manifest.count!==manifest.items.length||!Number.isInteger(manifest.totalBytes)||manifest.totalBytes<0||manifest.totalBytes>32*1024*1024||typeof manifest.version!=='string'||!/^[a-f0-9]{64}$/.test(manifest.version)){throw new Error('菜谱目录格式无效，已保留旧版');}
 let prior:string='';let total:number=0;const items:CatalogItem[]=[];
 for(const original of manifest.items){
  if(!validId(original.id)||original.id<=prior||typeof original.sha256!=='string'||!/^[a-f0-9]{64}$/.test(original.sha256)||!Number.isInteger(original.bytes)||original.bytes<2||original.bytes>256*1024){throw new Error('菜谱目录校验失败，已保留旧版');}
  prior=original.id;total+=original.bytes;const item:CatalogItem=new CatalogItem();item.id=original.id;item.sha256=original.sha256;item.bytes=original.bytes;items.push(item);
 }
 if(total!==manifest.totalBytes||await catalogSha256(JSON.stringify(items))!==manifest.version){throw new Error('菜谱版本校验失败，已保留旧版');}
}
function validateRecipe(payload:string,id:string):Recipe {
 const recipe:Recipe=JSON.parse(payload) as Recipe;
 if(!recipe||recipe.id!==id||typeof recipe.name!=='string'||!recipe.name.trim()||recipe.name.length>200||typeof recipe.region!=='string'||typeof recipe.category!=='string'||!Number.isInteger(recipe.minutes)||recipe.minutes<1||recipe.minutes>2880||!Array.isArray(recipe.ingredients)||recipe.ingredients.length>100||!Array.isArray(recipe.steps)||recipe.steps.length<1||recipe.steps.length>100){throw new Error('菜谱内容无效，已保留旧版');}
 for(const ingredient of recipe.ingredients){if(!ingredient||typeof ingredient.name!=='string'||!ingredient.name.trim()||!Number.isFinite(ingredient.quantity)||ingredient.quantity<0||typeof ingredient.unit!=='string'||ingredient.unit.length>20){throw new Error('菜谱食材无效，已保留旧版');}}
 if(!recipe.steps.every((step:string)=>typeof step==='string'&&step.trim().length>0&&step.length<=4000)){throw new Error('菜谱步骤无效，已保留旧版');}
 return recipe;
}
export async function readCatalogManifest(db:relationalStore.RdbStore):Promise<CatalogManifest|null> {
 const rows:relationalStore.ResultSet=await db.querySql("SELECT value FROM catalog_meta WHERE key='remoteManifest'");
 let text:string='';try{if(rows.goToFirstRow()){text=rows.getString(0);}}finally{rows.close();}
 if(!text){return null;}try{const value:CatalogManifest=JSON.parse(text) as CatalogManifest;await validateCatalogManifest(value);return value;}catch(_){throw new Error('本机菜谱版本信息无效，现有菜谱仍保留');}
}
/** All network and hash work completes before any local transaction begins. */
export async function downloadCatalogUpdate(cloud:Cloud,previous:CatalogManifest|null=null):Promise<CatalogUpdatePackage> {
 if(previous){await validateCatalogManifest(previous);}
 const manifest:CatalogManifest=JSON.parse(await cloud.request('/catalog/offline/manifest',http.RequestMethod.GET)) as CatalogManifest;await validateCatalogManifest(manifest);
 const result:CatalogUpdatePackage=new CatalogUpdatePackage();result.manifest=manifest;result.baseVersion=previous?previous.version:'';
 if(previous&&previous.version===manifest.version){result.unchanged=true;return result;}
 const known:Map<string,string>=new Map<string,string>();if(previous){previous.items.forEach((item:CatalogItem)=>known.set(item.id,item.sha256));}
 const changed:CatalogItem[]=manifest.items.filter((item:CatalogItem)=>known.get(item.id)!==item.sha256);
 const currentIds:Set<string>=new Set<string>(manifest.items.map((item:CatalogItem)=>item.id));if(previous){result.removedIds=previous.items.filter((item:CatalogItem)=>!currentIds.has(item.id)).map((item:CatalogItem)=>item.id);}
 for(let offset:number=0;offset<changed.length;offset+=25){
  const expected:CatalogItem[]=changed.slice(offset,offset+25);const body:CatalogRequest=new CatalogRequest();body.version=manifest.version;body.ids=expected.map((item:CatalogItem)=>item.id);
  const page:CatalogPage=JSON.parse(await cloud.request('/catalog/offline/download',http.RequestMethod.POST,body)) as CatalogPage;
  if(page.format!==1||page.version!==manifest.version||!Array.isArray(page.records)||page.records.length!==expected.length){throw new Error('菜谱更新未完整下载，已保留旧版');}
  const received:Set<string>=new Set<string>();
  for(const record of page.records){
   const wanted:CatalogItem|undefined=expected.find((item:CatalogItem)=>item.id===record.id);
   if(!wanted||received.has(record.id)||typeof record.payload!=='string'||record.sha256!==wanted.sha256||record.bytes!==wanted.bytes||util.TextEncoder.create('utf-8').encodeInto(record.payload).length!==wanted.bytes||await catalogSha256(record.payload)!==wanted.sha256){throw new Error('菜谱下载校验失败，已保留旧版');}
   validateRecipe(record.payload,record.id);received.add(record.id);result.records.push(record);
  }
 }
 return result;
}
/** The caller must serialize this operation with its normal LocalStore write queue. */
export async function applyCatalogUpdate(db:relationalStore.RdbStore,update:CatalogUpdatePackage):Promise<void> {
 if(update.unchanged){return;}await validateCatalogManifest(update.manifest);
 // Recheck before mutation: the package can be held in a UI preview while another update finishes.
 const previous:CatalogManifest|null=await readCatalogManifest(db);
 if((previous?previous.version:'')!==update.baseVersion){throw new Error('本机菜谱已更新，请重新检查');}
 const known:Map<string,string>=new Map<string,string>();if(previous){previous.items.forEach((item:CatalogItem)=>known.set(item.id,item.sha256));}
 const expected:CatalogItem[]=update.manifest.items.filter((item:CatalogItem)=>known.get(item.id)!==item.sha256);
 if(expected.length!==update.records.length){throw new Error('菜谱更新不完整，已保留旧版');}
 const validated:Recipe[]=[];const seen:Set<string>=new Set<string>();
 for(const record of update.records){const item:CatalogItem|undefined=expected.find((candidate:CatalogItem)=>candidate.id===record.id);if(!item||seen.has(record.id)||record.sha256!==item.sha256||util.TextEncoder.create('utf-8').encodeInto(record.payload).length!==item.bytes||await catalogSha256(record.payload)!==item.sha256){throw new Error('菜谱更新校验失败，已保留旧版');}seen.add(record.id);validated.push(validateRecipe(record.payload,record.id));}
 const currentIds:Set<string>=new Set<string>(update.manifest.items.map((item:CatalogItem)=>item.id));
 const removed:string[]=previous?previous.items.filter((item:CatalogItem)=>!currentIds.has(item.id)).map((item:CatalogItem)=>item.id):[];
 await db.beginTransaction();
 try{
  const active:relationalStore.ResultSet=await db.querySql("SELECT value FROM catalog_meta WHERE key='remoteManifest'");let activeVersion:string='';try{if(active.goToFirstRow()){activeVersion=(JSON.parse(active.getString(0)) as CatalogManifest).version;}}finally{active.close();}
  if(activeVersion!==update.baseVersion){throw new Error('本机菜谱已更新，请重新检查');}
  for(const recipe of validated){await db.executeSql('INSERT OR REPLACE INTO recipe_catalog(id,name,region,category,minutes,payload) VALUES(?,?,?,?,?,?)',[recipe.id,recipe.name,recipe.region,recipe.category,recipe.minutes,JSON.stringify(recipe)]);}
  // Retired records remain addressable for meal history/favorites, never delete private recipes or photos.
  const oldRetired:relationalStore.ResultSet=await db.querySql("SELECT value FROM catalog_meta WHERE key='remoteRetiredIds'");let retired:string[]=[];try{if(oldRetired.goToFirstRow()){retired=JSON.parse(oldRetired.getString(0)) as string[];}}finally{oldRetired.close();}
  const retiredIds:string[]=Array.from(new Set<string>(retired.concat(removed))).filter((id:string)=>!currentIds.has(id));
  await db.executeSql("INSERT OR REPLACE INTO catalog_meta(key,value) VALUES('remoteRetiredIds',?)",[JSON.stringify(retiredIds)]);
  await db.executeSql("INSERT OR REPLACE INTO catalog_meta(key,value) VALUES('remoteManifest',?)",[JSON.stringify(update.manifest)]);
  await db.commit();
 }catch(error){await db.rollBack();throw new Error((error as Error).message||'菜谱更新未保存，已保留旧版');}
}
