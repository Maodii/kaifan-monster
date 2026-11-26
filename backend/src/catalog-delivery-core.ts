import { createHash } from 'node:crypto';

/** JSON wire strings are checksummed verbatim; clients never need a JSON canonicalizer. */
export interface CatalogDeliveryItem { id:string; sha256:string; bytes:number; }
export interface CatalogDeliveryManifest { format:number; version:string; count:number; totalBytes:number; items:CatalogDeliveryItem[]; }
export interface CatalogDeliveryRecord extends CatalogDeliveryItem { payload:string; }
export interface CatalogDeliverySnapshot { manifest:CatalogDeliveryManifest; records:CatalogDeliveryRecord[]; }
export const CATALOG_MAX_RECORDS=10000;
export const CATALOG_MAX_BYTES=32*1024*1024;
export const CATALOG_MAX_RECORD_BYTES=256*1024;
export function catalogHash(text:string):string {return createHash('sha256').update(text,'utf8').digest('hex');}
export function catalogRoot(items:CatalogDeliveryItem[]):string {return catalogHash(JSON.stringify(items.map(item=>({id:item.id,sha256:item.sha256,bytes:item.bytes}))));}
function canonicalJson(value:unknown):string {
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 const object=value as Record<string,unknown>;
 return '{'+Object.keys(object).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(object[key])).join(',')+'}';
}
export function buildCatalogDelivery(rows:{id:string;payload:Record<string,unknown>}[]):CatalogDeliverySnapshot {
 if(rows.length>CATALOG_MAX_RECORDS)throw new Error('Offline catalog exceeds supported record limit');
 const ids=new Set<string>();
 const records=rows.map(row=>{
  if(!/^[a-f0-9-]{36}$/.test(row.id)||ids.has(row.id))throw new Error('Invalid or duplicate catalog recipe identity');ids.add(row.id);
  // The authoritative primary key always wins over a stale ID embedded in imported JSON.
  const payload=canonicalJson({...row.payload,id:row.id});const bytes=Buffer.byteLength(payload,'utf8');
  if(bytes>CATALOG_MAX_RECORD_BYTES)throw new Error('Offline recipe exceeds supported byte limit');
  return {id:row.id,sha256:catalogHash(payload),bytes,payload};
 }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const items=records.map(({id,sha256,bytes})=>({id,sha256,bytes}));const totalBytes=items.reduce((sum,item)=>sum+item.bytes,0);
 if(totalBytes>CATALOG_MAX_BYTES)throw new Error('Offline catalog exceeds supported byte limit');
 return {manifest:{format:1,version:catalogRoot(items),count:items.length,totalBytes,items},records};
}
