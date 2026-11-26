import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Database } from '../src/database';
const base='http://127.0.0.1:3000/api/v1';let uid='';
async function main(){
 const reg=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`catalog-${randomUUID()}@example.test`,password:'catalog-test-password-long',deviceName:'catalog-test'})});assert.equal(reg.status,201);const user=await reg.json() as any;uid=user.userId;
 async function get(path:string){const res=await fetch(base+path,{headers:{Authorization:`Bearer ${user.accessToken}`}});return {status:res.status,data:await res.json() as any};}
 const recipes=await get('/catalog/recipes?search='+encodeURIComponent('鸡'));assert.equal(recipes.status,200);assert(recipes.data.length>0);const recipe=recipes.data[0];
 const two=await get(`/catalog/recipes/${recipe.id}/portions?people=2`);const four=await get(`/catalog/recipes/${recipe.id}/portions?people=4&seasoning=${encodeURIComponent('清淡')}`);assert.equal(two.status,200);assert.equal(four.status,200);assert.equal(four.data.requiresConfirmation,true);assert(four.data.ingredients.length>0);assert.equal((await get(`/catalog/recipes/${recipe.id}/portions?people=0`)).status,400);assert.equal((await get(`/catalog/recipes/${recipe.id}/portions?spice=invalid`)).status,400);
 const diet=await get('/catalog/recipes?category='+encodeURIComponent('减脂餐'));assert.equal(diet.status,200);assert(diet.data.length>0);assert(diet.data.every((r:any)=>r.payload.dietTags.includes('减脂餐')));
 const regional=await get('/catalog/recipes?region='+encodeURIComponent('四川'));assert.equal(regional.status,200);assert(regional.data.length>0);assert(regional.data.every((r:any)=>r.payload.region==='四川'));
 const rec=await get('/catalog/recommendations?region='+encodeURIComponent('四川'));assert.equal(rec.status,200);assert(rec.data.length>0);
 const ingredients=await get('/catalog/recipes?search='+encodeURIComponent('藜麦'));assert.equal(ingredients.status,200);assert(ingredients.data.some((r:any)=>r.payload.ingredients.some((i:any)=>i.name.includes('藜麦'))));
 const before=await get('/account/profile');const saved=await fetch(base+'/account/profile',{method:'PATCH',headers:{Authorization:`Bearer ${user.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({version:before.data.version,displayName:'目录验证',regionCode:'510000',avatarPreset:'cat',avatarMode:'preset',bio:'',dietGoal:'控制热量'})});assert.equal(saved.status,200);
 const defaults=await get('/catalog/recommendations?learning=false');const explicit=await get('/catalog/recommendations?learning=false&homeRegion='+encodeURIComponent('四川')+'&goal='+encodeURIComponent('控制热量'));assert.equal(defaults.status,200);assert.deepEqual(defaults.data,explicit.data);assert(defaults.data.some((r:any)=>r.reasons.includes('符合你选择的饮食目标')));assert(defaults.data.some((r:any)=>r.reasons.includes('符合你的地区偏好')));
 const overridden=await get('/catalog/recommendations?learning=false&goal='+encodeURIComponent('均衡饮食'));assert(!overridden.data.some((r:any)=>r.reasons.includes('符合你选择的饮食目标')));
 const quick=await get('/catalog/recommendations?maxMinutes=15&intent=cook&learning=false');assert.equal(quick.status,200);assert(quick.data.length>0);assert(quick.data.every((r:any)=>r.recipe.minutes>0&&r.recipe.minutes<=15));assert.equal((await get('/catalog/recommendations?maxMinutes=-1')).status,400);assert.equal((await get('/catalog/recommendations?intent=invalid')).status,400);assert.equal((await get('/catalog/recommendations?batch=-1')).status,400);
 const outside=await get('/catalog/recommendations?intent=record');assert.equal(outside.status,200);assert(!outside.data.some((r:any)=>r.reasons.includes('符合你的地区偏好')));
 async function sendEvent(intent:string){return fetch(base+'/catalog/recommendations/events',{method:'POST',headers:{Authorization:`Bearer ${user.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({recipeId:recipe.id,action:'dislike',intent})});}
 assert.equal((await sendEvent('record')).status,201);assert.equal((await sendEvent('invalid')).status,400);
 const afterOutside=await get('/catalog/recommendations?intent=cook');const unchanged=await get('/catalog/recommendations?intent=cook&learning=false');assert.deepEqual(afterOutside.data,unchanged.data);
 await get('/catalog/recommendations?intent=record');
 const db=new Database();try{const rows=await db.query('SELECT intent FROM user_taste_profile WHERE user_id=$1 ORDER BY intent',[uid]);assert.deepEqual(rows.map(r=>r.intent),['cook','record']);
 const cleared=await fetch(base+'/catalog/recommendations/learning?intent=cook',{method:'DELETE',headers:{Authorization:`Bearer ${user.accessToken}`}});assert.equal(cleared.status,200);const feedback=await db.query('SELECT intent FROM recommendation_events WHERE user_id=$1',[uid]);assert.deepEqual(feedback.map(r=>r.intent),['record']);}finally{await db.onModuleDestroy();}
 console.log('PASS separate API event/model storage, invalid intent, independent learning clear, record ignores cooking profile');
 console.log('PASS catalog: seeded library, region filters, authenticated portion preview, 2/4 people, invalid inputs');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(uid){const db=new Database();try{await db.query('DELETE FROM recommendation_events WHERE user_id=$1',[uid]);await db.query('DELETE FROM users WHERE id=$1',[uid]);}finally{await db.onModuleDestroy();}}});
