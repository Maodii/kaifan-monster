import { MealPlan } from './MealPlan';
export const WORKSPACE_KEYS:string[]=['homeRegion','outsideRegion','dietGoal','outsideGoal','learningEnabled','outsideLearning','excluded','taste','recentDays','recommendScene','experience:v1','household:v1'];
export class WorkspacePreference { key:string='';value:string='';constructor(key:string,value:string){this.key=key;this.value=value;} }
// Wire preferences use a flat map represented by this fixed schema to remain ArkTS portable.
export class WorkspacePreferences {
 homeRegion?:string;outsideRegion?:string;dietGoal?:string;outsideGoal?:string;learningEnabled?:string;outsideLearning?:string;excluded?:string;taste?:string;recentDays?:string;recommendScene?:string;
 'experience:v1'?:string; 'household:v1'?:string;
}
export class WorkspacePayload {format:number=1;plans:MealPlan[]=[];preferences:WorkspacePreferences=new WorkspacePreferences();}
export class WorkspaceRecord {payload:WorkspacePayload|null=null;version:number=0;updated_at:string='';}
export class WorkspacePut {baseVersion:number=0;payload:WorkspacePayload=new WorkspacePayload();}
export class WorkspaceCheck {local:WorkspacePayload=new WorkspacePayload();remote:WorkspaceRecord=new WorkspaceRecord();localRevision:string='';conflict:boolean=false;}

/** PostgreSQL JSONB changes property order; compare content using sorted object keys. */
export function workspaceSignature(value:Object):string {
 if(value===null||typeof value!=='object'){return JSON.stringify(value);}
 if(Array.isArray(value)){return '['+(value as Object[]).map((item:Object)=>workspaceSignature(item)).join(',')+']';}
 const keys:string[]=Object.keys(value);const values:Object[]=Object.values(value);return '{'+keys.slice().sort().filter((key:string)=>values[keys.indexOf(key)]!==undefined).map((key:string)=>JSON.stringify(key)+':'+workspaceSignature(values[keys.indexOf(key)])).join(',')+'}';
}
