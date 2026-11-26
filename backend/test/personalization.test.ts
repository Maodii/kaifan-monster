import assert from 'node:assert/strict';
import { CoreRecipe,RankingOptions,rankPersonalized,trainTasteModel,recipeMinutes } from '../src/recommend-core';
const now=Date.parse('2026-11-03T12:00:00+08:00');
const recipes:CoreRecipe[]=[{id:'a',name:'清蒸鱼',ingredients:[{name:'鱼',quantity:200,unit:'g'}],region:'广东',taste:'清淡',category:'家常菜',dietTags:['减脂餐']},{id:'b',name:'麻辣鸡',ingredients:[{name:'鸡肉',quantity:200,unit:'g'}],region:'四川',taste:'香辣',category:'家常菜'}];
const options=new RankingOptions();options.homeRegion='四川';assert.equal(rankPersonalized(recipes,[],[],[],options,now)[0].recipeId,'b');
options.homeRegion='';options.goal='控制热量';assert.equal(rankPersonalized(recipes,[],[],[],options,now)[0].recipeId,'a');
options.goal='均衡饮食';const events=[{recipeId:'b',action:'dislike',date:'2026-11-03T00:00:00Z'}];assert(rankPersonalized(recipes,[],[],events,options,now).find(r=>r.recipeId==='b')!.learned<0);
options.learning=false;assert(rankPersonalized(recipes,[],[],events,options,now).every(r=>r.learned===0));
options.excluded=['鸡肉'];options.homeRegion='四川';assert(!rankPersonalized(recipes,[],[],[],options,now).some(r=>r.recipeId==='b'));
const meal={name:'一餐',date:'2026-11-02T12:00:00Z',items:[{name:'清蒸鱼',recipeId:'a'},{name:'麻辣鸡',recipeId:'b'}]};const model=trainTasteModel(recipes,[meal,meal,{...meal,date:'2030-01-01T12:00:00Z'}],[],now);assert.equal(model.samples,2);
options.excluded=[];options.category='减脂餐';assert.deepEqual(rankPersonalized(recipes,[],[],[],options,now).map(r=>r.recipeId),['a']);
console.log('PASS personalization: region, diet goals, negative feedback, learning off, exclusions, multidish/day dedupe, future ignore');

// Time is a hard user filter; unknown time must not be treated as a quick recipe.
const timed:CoreRecipe[]=[{...recipes[0],id:'quick',minutes:12,steps:['洗净切好原料。','加热至熟透后调味。']},{...recipes[1],id:'slow',minutes:90},{...recipes[1],id:'unknown'}];
const budget=Object.assign(new RankingOptions(),{maxMinutes:15});assert.deepEqual(rankPersonalized(timed,[],[],[],budget,now).map(r=>r.recipeId),['quick']);
const stock=[{name:'鸡肉',quantity:400,unit:'g',expiryDate:'2026-11-04'}];const logging=Object.assign(new RankingOptions(),{intent:'record'});
assert.deepEqual(rankPersonalized(recipes,stock,[],[],logging,now).map(r=>[r.recipeId,r.score,r.reasons]),rankPersonalized(recipes,[],[],[],logging,now).map(r=>[r.recipeId,r.score,r.reasons]));
const lowRating=[{date:'2026-11-02T12:00:00Z',recipeId:'b',rating:1}];assert(rankPersonalized(recipes,[],lowRating,[],new RankingOptions(),now).find(r=>r.recipeId==='b')!.learned<0);
const disabled=Object.assign(new RankingOptions(),{learning:false});assert(rankPersonalized(recipes,[],lowRating,events,disabled,now).every(r=>r.learned===0));
const neutral=rankPersonalized(recipes,[],[],[],new RankingOptions(),now).find(r=>r.recipeId==='b')!;const disliked=rankPersonalized(recipes,[],[],events,new RankingOptions(),now).find(r=>r.recipeId==='b')!;assert(disliked.score<neutral.score-19);
const pool=Array.from({length:20},(_,i)=>({...recipes[i%2],id:'pool-'+i,category:i%2?'汤类':'家常菜'}));const batch=Object.assign(new RankingOptions(),{batch:8});const first=rankPersonalized(pool,[],[],[],new RankingOptions(),now).map(r=>r.recipeId);const shuffled=rankPersonalized(pool,[],[],[],batch,now).map(r=>r.recipeId);assert.equal(new Set(shuffled).size,pool.length);assert.notDeepEqual(shuffled,first);assert.deepEqual(shuffled,rankPersonalized(pool,[],[],[],batch,now).map(r=>r.recipeId));
console.log('PASS intent/time/rating: pantry-neutral record mode, time budget/unknowns, low-rating learning, learning off, direct dislike, deterministic batch diversity');

assert.equal(recipeMinutes({...recipes[0],minutes:90,prepMinutes:5,cookMinutes:10}),90);
assert.equal(recipeMinutes({...recipes[0],minutes:0,prepMinutes:5,cookMinutes:10}),15);
assert.equal(recipeMinutes({...recipes[0],minutes:-1,prepMinutes:-2,cookMinutes:3}),0);

// Separate learning models share the diary, but never the taste samples or feedback.
const outsideMeal={date:'2026-11-02T12:00:00Z',recipeId:'b',rating:1,diningMode:'外卖'};
const homeMeal={...outsideMeal,diningMode:'在家做'};
assert.equal(trainTasteModel(recipes,[outsideMeal],[],now,'cook').samples,0);
assert.equal(trainTasteModel(recipes,[outsideMeal],[],now,'record').samples,1);
assert.equal(trainTasteModel(recipes,[homeMeal],[],now,'record').samples,0);
assert.equal(trainTasteModel(recipes,[homeMeal],[],now,'cook').samples,1);
const outsideEvent={recipeId:'b',action:'dislike',date:'2026-11-03T00:00:00Z',intent:'record'};
assert.deepEqual(rankPersonalized(recipes,[],[],[outsideEvent],new RankingOptions(),now),rankPersonalized(recipes,[],[],[],new RankingOptions(),now));
assert(rankPersonalized(recipes,[],[],[outsideEvent],logging,now).find(r=>r.recipeId==='b')!.learned<0);
assert.deepEqual(rankPersonalized(recipes,[],[],events,logging,now),rankPersonalized(recipes,[],[],[],logging,now));
logging.maxMinutes=1;assert.equal(rankPersonalized(timed,[],[],[],logging,now).length,3);
console.log('PASS separate cook/record taste models, legacy feedback stays cook, outside ignores cooking-time limit');
