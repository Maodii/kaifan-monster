import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildCookingGuide} from '../src/cooking-guide';
const path='data/recipes.json';const catalog=JSON.parse(readFileSync(path,'utf8'));let changed=0;
for(const recipe of catalog.recipes){const guide=buildCookingGuide(recipe);if(JSON.stringify(recipe.editorialGuide)!==JSON.stringify(guide)){recipe.editorialGuide=guide;changed++;}}
catalog.sourceRevision=createHash('sha256').update(JSON.stringify(catalog.recipes)).digest('hex')+'|reviewed-ingredients-v2';
const value=JSON.stringify(catalog);writeFileSync(path,value);writeFileSync('../client/entry/src/main/resources/rawfile/recipes.json',value);
console.log('Refreshed actual shared guides:',changed);
