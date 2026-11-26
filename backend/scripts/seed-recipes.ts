import { readFile } from 'node:fs/promises';
import { Database } from '../src/database';
interface SeedIngredient {name:string;quantity:number;unit:string;optional?:boolean;amountText?:string;quantitySource?:string;quantityBasis?:string;}
interface SeedRecipe {id:string;name:string;region:string;category:string;taste:string;minutes:number;ingredients:SeedIngredient[];steps:string[];dietTags?:string[];}
export async function seedRecipes(db: Database): Promise<number> {
 const catalog=JSON.parse(await readFile('data/recipes.json','utf8')) as {sourceRevision:string;recipes:SeedRecipe[]};
 await db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(842157)');
  for(const r of catalog.recipes){
   // Administrator-reviewed online recipes survive source imports and container restarts.
   if((await c.query('SELECT 1 FROM admin_recipe_override WHERE recipe_id=$1',[r.id])).rowCount)continue;
   const changed=await c.query('INSERT INTO recipe_catalog(id,name,region,category,taste,minutes,source_revision,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=excluded.name,region=excluded.region,category=excluded.category,taste=excluded.taste,minutes=excluded.minutes,source_revision=excluded.source_revision,payload=excluded.payload,updated_at=now() WHERE recipe_catalog.source_revision<>excluded.source_revision RETURNING id',[r.id,r.name,r.region,r.category,r.taste,r.minutes,catalog.sourceRevision,r]);
   if(changed.rowCount || !(await c.query('SELECT 1 FROM recipe_ingredient WHERE recipe_id=$1 LIMIT 1',[r.id])).rowCount){
    await c.query('DELETE FROM recipe_ingredient WHERE recipe_id=$1',[r.id]);
    await c.query('DELETE FROM recipe_step WHERE recipe_id=$1',[r.id]);
    await c.query('DELETE FROM recipe_diet_tag WHERE recipe_id=$1',[r.id]);
    for(const [n,i] of r.ingredients.entries())await c.query('INSERT INTO recipe_ingredient(recipe_id,position,name,quantity,unit,optional,amount_text,quantity_source,quantity_basis) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[r.id,n,i.name,i.quantity,i.unit,!!i.optional,i.amountText||'',i.quantitySource||'',i.quantityBasis||'']);
    for(const [n,step] of r.steps.entries())await c.query('INSERT INTO recipe_step(recipe_id,position,instruction) VALUES($1,$2,$3)',[r.id,n,step]);
    for(const tag of new Set(r.dietTags||[]))await c.query('INSERT INTO recipe_diet_tag(recipe_id,tag) VALUES($1,$2)',[r.id,tag]);
   }
  }
  const index=JSON.parse(await readFile('data/recipe-source-index.json','utf8'));
  for(const source of index.sources)await c.query('INSERT INTO recipe_source(url,platform,author,facts,accessed_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(url) DO UPDATE SET facts=excluded.facts,accessed_at=excluded.accessed_at',[source.url,source.platform,source.author||'',source,index.accessed]);
 });return catalog.recipes.length;
}
async function main():Promise<void>{const db=new Database();try{console.log('Seeded',await seedRecipes(db),'versioned recipes and normalized ingredient/step/tag rows');}finally{await db.onModuleDestroy();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
