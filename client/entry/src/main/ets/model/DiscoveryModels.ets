export class FavoriteCount { recipeId:string=''; count:number=0; realCount?:number; demoCount:number=0; }
export class HotSearch { term:string=''; count:number=0; }
export class DiscoverySummary { demoData:boolean=false; favoriteRevision:number=0; favorites:FavoriteCount[]=[]; mine:string[]=[]; hotSearches:HotSearch[]=[]; demoHotSearches:HotSearch[]=[]; rankingBasis:string='real-users'; updatedAt:string=''; }
export class FavoriteUpdate { saved:boolean=false; constructor(saved:boolean){this.saved=saved;} }
export class SearchHeatEvent { term:string=''; constructor(term:string){this.term=term;} }

export class FavoriteSnapshot {recipeIds:string[]=[];confirmed:boolean=true;expectedRevision:number=0;constructor(ids:string[],revision:number){this.recipeIds=ids;this.expectedRevision=revision;}}
