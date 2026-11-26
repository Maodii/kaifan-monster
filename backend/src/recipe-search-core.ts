import { CoreRecipe, recipeGroupKey } from './recommend-core';
import { normalizeSearch, equivalentText, searchRecipe, recipeCuisineGroup, CUISINE_GROUPS, CuisineGroup, SearchMatch } from './recipe-discovery-core';
import { SEARCH_PINYIN_GROUPS } from './search-pinyin-data';
import { RecipeQueryIntent, parseRecipeQuery, matchesRecipeQueryIntent } from './recipe-query-intent';

const characterReadings: Map<string,string> = new Map<string,string>();
function initializeReadings(): void {
 if (characterReadings.size) { return; }
 for (const group of SEARCH_PINYIN_GROUPS) {
  const colon: number=group.indexOf(':'); const reading: string=group.slice(0,colon);
  for (const char of group.slice(colon+1)) { characterReadings.set(char,reading); }
 }
 // Food-context readings; general-purpose character readings alone are ambiguous.
 characterReadings.set('茄','qie'); characterReadings.set('长','chang');
}
export class SearchPronunciation { full: string = ''; initials: string = ''; complete: boolean = true; }
class PhraseReading {
 phrase: string; readings: string[];
 constructor(phrase: string,readings: string[]) { this.phrase=phrase;this.readings=readings; }
}
const phraseReadings: PhraseReading[] = [new PhraseReading('重庆',['chong','qing']),new PhraseReading('西藏',['xi','zang']),new PhraseReading('薄荷',['bo','he']),new PhraseReading('朝天椒',['chao','tian','jiao']),new PhraseReading('调味',['tiao','wei']),new PhraseReading('焯水',['chao','shui'])];
function plainLatin(value: string): string {
 return normalizeSearch(value).replace(/[āáǎà]/g,'a').replace(/[ēéěè]/g,'e').replace(/[īíǐì]/g,'i').replace(/[ōóǒò]/g,'o').replace(/[ūúǔùüǖǘǚǜ]/g,'u').replace(/[ńňǹ]/g,'n').replace(/[1-5'’\s-]/g,'');
}
export function searchPronunciation(value: string): SearchPronunciation {
 initializeReadings(); const out: SearchPronunciation=new SearchPronunciation(); const text: string=plainLatin(value);
 for (let at: number=0;at<text.length;) {
  const phrase: PhraseReading | undefined=phraseReadings.find((p: PhraseReading) => text.startsWith(p.phrase,at));
  if (phrase) { out.full+=phrase.readings.join('');out.initials+=phrase.readings.map((p: string) => p[0]).join('');at+=phrase.phrase.length;continue; }
  const char: string=text[at]; const reading: string | undefined=characterReadings.get(char);
  if (reading) { out.full+=reading;out.initials+=reading[0]; }
  else if (/[a-z0-9]/.test(char)) { out.full+=char;out.initials+=char; }
  else if (/[^\s,，、;；()（）·]/.test(char)) { out.complete=false;out.full+='?';out.initials+='?'; }
  at++;
 }
 return out;
}

class SearchField {
 text: string = ''; phonetic: string = ''; initials: string = ''; kind: string = '';
 constructor(text: string,kind: string) {
  this.text=normalizeSearch(text);this.kind=kind;
  const reading: SearchPronunciation=searchPronunciation(text);
  if (reading.complete) { this.phonetic=reading.full;this.initials=reading.initials; }
 }
}
class IndexedRecipe { recipe: CoreRecipe; fields: SearchField[] = []; constructor(recipe: CoreRecipe) { this.recipe=recipe; } }
const cookingTerms: string[]=['红烧','清蒸','清炒','凉拌','油炸','香煎','炖','炒','蒸','煮','烤','焖','汤','粥','饭','面','鱼香','宫保','麻辣','酸辣','糖醋','咖喱','蒜蓉','豆豉'];
/** Built from live recipe metadata. New recipes automatically contribute their names and ingredients. */
export class RecipeSearchIndex {
 rows: IndexedRecipe[] = []; vocabulary: Map<string,number> = new Map<string,number>(); phoneticVocabulary: Map<string,string> = new Map<string,string>(); recipeIds: string[] = [];
 ingredientNames: string[] = []; averageNameLength: number = 1; private frequencyCache: Map<string,number> = new Map<string,number>();
 constructor(recipes: CoreRecipe[]) {
  for (const recipe of recipes) {
   const row: IndexedRecipe=new IndexedRecipe(recipe);
   this.addField(row,recipe.name,'name');
   const identity: string=recipeGroupKey(recipe);
   if(identity.startsWith('name:')&&identity.slice(5)!==normalizeSearch(recipe.name)){this.addField(row,identity.slice(5),'alias');}
   for (const alias of recipe.aliases||[]) { this.addField(row,alias,'alias'); }
   for (const ingredient of recipe.ingredients) { this.addField(row,ingredient.name,ingredient.optional?'seasoning':'ingredient');if(!this.ingredientNames.includes(ingredient.name)){this.ingredientNames.push(ingredient.name);} }
   for (const region of [recipe.region||'',recipe.cuisine||'',recipeCuisineGroup(recipe)]) { this.addField(row,region,'cuisine'); }
   this.rows.push(row);this.recipeIds.push(recipe.id);
  }
  for (const group of CUISINE_GROUPS) { for (const text of group.regions) { this.addWord(text); } }
  for (const word of cookingTerms) { this.addWord(word); }
  this.averageNameLength=recipes.length?recipes.reduce((sum: number,recipe: CoreRecipe)=>sum+recipe.name.length,0)/recipes.length:1;
 }
 /** IDF is per recipe, not per alias or repeated ingredient occurrence. */
 termWeight(term: string): number {
  const text: string=equivalentText(term);let count: number | undefined=this.frequencyCache.get(text);
  if(count===undefined){count=this.rows.filter((row: IndexedRecipe)=>row.fields.some((field: SearchField)=>equivalentText(field.text).includes(text))).length;this.frequencyCache.set(text,count);}
  return 1+Math.min(4,Math.log(1+(this.rows.length-count+0.5)/(count+0.5)))*0.25;
 }
 private addWord(text: string): void {
  const normalized: string=equivalentText(text);
  if (/^[\u4e00-\u9fff]{2,20}$/.test(normalized)) {
   this.vocabulary.set(normalized,(this.vocabulary.get(normalized)||0)+1);
   const reading: SearchPronunciation=searchPronunciation(text);
   if(reading.complete){this.phoneticVocabulary.set(reading.full,normalized);if(reading.initials.length>=2){this.phoneticVocabulary.set(reading.initials,normalized);}}
  }
 }
 private addField(row: IndexedRecipe,text: string,kind: string): void {
  if (!text.trim()) { return; }
  for (const form of [normalizeSearch(text),equivalentText(text)]) {
   if (!row.fields.some((field: SearchField) => field.text===form&&field.kind===kind)) { row.fields.push(new SearchField(form,kind)); }
   this.addWord(form);
  }
 }
}
/** Dynamic programming maximizes known character coverage without discarding unknown characters. */
function segmentHan(text: string,index: RecipeSearchIndex): string[] {
 const count: number=text.length; const scores: number[]=new Array<number>(count+1).fill(-Infinity); const next: number[]=new Array<number>(count).fill(0);
 scores[count]=0;
 for (let at: number=count-1;at>=0;at--) {
  scores[at]=scores[at+1]-12;next[at]=at+1;
  for (let end: number=at+1;end<=Math.min(count,at+20);end++) {
   const word: string=text.slice(at,end);
   if (!index.vocabulary.has(word)) { continue; }
   const length: number=end-at;const score: number=scores[end]+length*10+length*length;
   if (score>scores[at]) { scores[at]=score;next[at]=end; }
  }
 }
 const words: string[]=[];let unknown: string='';
 for (let at: number=0;at<count;) {
  const word: string=text.slice(at,next[at]);
  if (index.vocabulary.has(word)) { if(unknown){words.push(unknown);unknown='';}words.push(word); }
  else { unknown+=word; }
  at=next[at];
 }
 if (unknown) { words.push(unknown); }
 return words;
}
export function segmentRecipeQuery(index: RecipeSearchIndex,query: string): string[] {
 const normalized: string=equivalentText(query).slice(0,120);
 const chunks: string[]=normalized.replace(/([\u4e00-\u9fff])([a-z])/g,'$1 $2').replace(/([a-z])([\u4e00-\u9fff])/g,'$1 $2').split(/[\s,，、;；]+/).filter((v: string) => !!v);
 // Full pinyin with syllable spaces/apostrophes remains one pronunciation query.
 if (chunks.length&&chunks.every((v: string) => /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ1-5'’]+$/.test(v))) {
  const roman: string=plainLatin(chunks.join(''));
  if(roman){return segmentRoman(roman,index);}return chunks;
 }
 const words: string[]=[];
 for (const chunk of chunks) { const parts: string[]=/^[\u4e00-\u9fff]+$/.test(chunk)?segmentHan(chunk,index):[chunk];for(const part of parts){if(!words.includes(part)){words.push(part);}} }
 return words;
}
function segmentRoman(text: string,index: RecipeSearchIndex): string[] {
 if(index.phoneticVocabulary.has(text)){return [text];}
 const next: number[]=new Array<number>(text.length+1).fill(-1);next[text.length]=text.length;
 for(let at: number=text.length-1;at>=0;at--){for(let end: number=text.length;end>=at+2;end--){if(next[end]>=0&&index.phoneticVocabulary.has(text.slice(at,end))){next[at]=end;break;}}}
 if(next[0]<0){return [text];}
 const parts: string[]=[];for(let at: number=0;at<text.length;){const part: string=text.slice(at,next[at]);if(!parts.includes(part)){parts.push(part);}at=next[at];}
 return parts;
}
/** Bounded Damerau-Levenshtein: insertion, deletion, substitution or adjacent transposition. */
export function boundedSearchDistance(a: string,b: string,limit: number): number {
 if (Math.abs(a.length-b.length)>limit) { return limit+1; }
 let priorPrior: number[]=[];let prior: number[]=Array.from({length:b.length+1},(_v: number,i: number) => i);
 for (let i: number=1;i<=a.length;i++) {
  const current: number[]=new Array<number>(b.length+1).fill(limit+1);current[0]=i;let minimum: number=current[0];
  for(let j: number=Math.max(1,i-limit);j<=Math.min(b.length,i+limit);j++){
   current[j]=Math.min(prior[j]+1,current[j-1]+1,prior[j-1]+(a[i-1]===b[j-1]?0:1));
   if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]){current[j]=Math.min(current[j],priorPrior[j-2]+1);}
   minimum=Math.min(minimum,current[j]);
  }
  if(minimum>limit){return limit+1;}priorPrior=prior;prior=current;
 }
 return prior[b.length];
}
class TermMatch { score: number = 0; level: string = ''; reason: string = ''; confidence: number = 1; }
function fieldWeight(kind: string): number { return kind==='name'?24:kind==='alias'?20:kind==='ingredient'?12:kind==='seasoning'?4:6; }
function matchTerm(row: IndexedRecipe,term: string,averageNameLength: number): TermMatch {
 const out: TermMatch=new TermMatch();const normalized: string=equivalentText(term);const reading: SearchPronunciation=searchPronunciation(term);
 if(!normalized){return out;}
 const roman: boolean=/^[a-z]+$/.test(plainLatin(term));const latin: string=plainLatin(term);
 for(const field of row.fields){
  let value: number=0;let level: string='';let reason: string='';let confidence: number=1;const weight: number=fieldWeight(field.kind);
  if(equivalentText(field.text).includes(normalized)){value=80+weight;level='segmented';reason='按分词匹配：'+term;}
  else if(reading.complete&&reading.full.length>=4&&field.phonetic.includes(reading.full)) {value=55+weight;level='pinyin';confidence=0.9;reason='按拼音或同音字匹配：'+term;}
  else if(roman&&latin.length>=2&&latin.length<=8&&(field.initials===latin||(latin.length>=3&&latin.length/field.initials.length>=0.6&&field.initials.startsWith(latin)))){value=42+weight;level='pinyin';confidence=field.initials===latin?0.75:0.65;reason='按拼音首字母匹配：'+term;}
  else {
   const limit: number=normalized.length>=8?2:1;
   // Two-character substitutions require phonetic evidence; shared 肉/菜 alone is insufficient.
   if(/^[\u4e00-\u9fff]{3,}$/.test(normalized)&&field.text.length>=3&&field.kind!=='cuisine'&&boundedSearchDistance(normalized,equivalentText(field.text),limit)<=limit){value=25+weight;level='fuzzy';confidence=0.65;reason='按近似文字匹配：'+term;}
   else if(roman&&latin.length>=5&&field.phonetic&&field.kind!=='cuisine'){
    const phoneticLimit: number=latin.length>=9&&(field.kind==='name'||field.kind==='alias')&&latin[0]===field.phonetic[0]?2:1;
    if(boundedSearchDistance(latin,field.phonetic,phoneticLimit)<=phoneticLimit){value=20+weight;level='fuzzy';confidence=0.65;reason='按近似拼音匹配：'+term;}
   }
  }
  if(field.kind==='name'||field.kind==='alias'){value*=0.75+0.25/(0.6+0.4*field.text.length/Math.max(1,averageNameLength));}
  if(value>out.score){out.score=value;out.level=level;out.reason=reason;out.confidence=confidence;}
 }
 return out;
}
export class RecipeSearchHit {
 recipeId: string = ''; score: number = 0; level: string = ''; reasons: string[] = []; matchedTerms: number = 0; confidence: number = 1;
}
export class RecipeSearchResult {
 mode: string = 'empty'; query: string = ''; tokens: string[] = []; hits: RecipeSearchHit[] = []; recipes: CoreRecipe[] = [];
 message: string = ''; suggestedCuisines: string[] = [];
 intent: RecipeQueryIntent = new RecipeQueryIntent();
}
class EvaluatedRecipe { row: IndexedRecipe; hit: RecipeSearchHit; complete: boolean = false; constructor(row: IndexedRecipe) { this.row=row;this.hit=new RecipeSearchHit();this.hit.recipeId=row.recipe.id; } }
function evaluate(row: IndexedRecipe,query: string,terms: string[],index: RecipeSearchIndex): EvaluatedRecipe {
 const out: EvaluatedRecipe=new EvaluatedRecipe(row);const exact: SearchMatch=searchRecipe(row.recipe,query);
 let weakest: number=3;let score: number=0;
 for(const term of terms){const match: TermMatch=matchTerm(row,term,index.averageNameLength);if(!match.score){continue;}out.hit.matchedTerms++;score+=match.score*index.termWeight(term);out.hit.confidence=Math.min(out.hit.confidence,match.confidence);weakest=Math.min(weakest,match.level==='segmented'?3:match.level==='pinyin'?2:1);if(!out.hit.reasons.includes(match.reason)){out.hit.reasons.push(match.reason);}}
 if(exact.matched){out.complete=true;out.hit.score=8000+Math.min(999,exact.score+score/Math.max(1,terms.length));out.hit.level='exact';out.hit.reasons=exact.reasons;out.hit.matchedTerms=terms.length;out.hit.confidence=1;return out;}
 out.complete=!!terms.length&&out.hit.matchedTerms===terms.length;
 out.hit.level=weakest===3?'segmented':weakest===2?'pinyin':'fuzzy';
 out.hit.score=(weakest===3?6000:weakest===2?4000:2000)+score/Math.max(1,terms.length);
 return out;
}
function cuisineFromTerm(term: string): string {
 const text: string=equivalentText(term);const sound: string=searchPronunciation(term).full;
 const group: CuisineGroup | undefined=CUISINE_GROUPS.find((g: CuisineGroup) => g.regions.some((name: string) => text===equivalentText(name)||(sound.length>=4&&sound===searchPronunciation(name).full)));
 return group?group.id:'';
}
const cuisineNeighbors: string[][]=[['川菜','湘菜'],['粤菜','闽菜','浙菜'],['鲁菜','苏菜','徽菜']];
function relatedCuisine(group: string,cues: string[]): boolean { return cuisineNeighbors.some((neighbors: string[]) => neighbors.includes(group)&&cues.some((cue: string) => neighbors.includes(cue))); }
/** eligibleIds is an allow-list, never a soft preference. Empty allow-list means no results.
 * Full direct matches always beat fuzzy matches; fallback is separately labelled and bounded. */
export function searchRecipeCatalog(index: RecipeSearchIndex,query: string,eligibleIds: string[] = index.recipeIds,fallbackLimit: number = 12,preferredCuisines: string[] = []): RecipeSearchResult {
 const out: RecipeSearchResult=new RecipeSearchResult();out.query=query;out.intent=parseRecipeQuery(query,index.ingredientNames);out.tokens=segmentRecipeQuery(index,out.intent.text);
 if(out.intent.invalidReason){out.message=out.intent.invalidReason;return out;}
 const allowed: Set<string>=new Set<string>(eligibleIds);const eligible: IndexedRecipe[]=index.rows.filter((row: IndexedRecipe) => allowed.has(row.recipe.id)&&matchesRecipeQueryIntent(row.recipe,out.intent));
 if(!eligible.length){out.message=out.intent.explanations.length?'没有符合搜索条件的菜：'+out.intent.explanations.join(' · '):'当前筛选条件下没有可推荐的菜，试试调整筛选；忌口仍会保留。';return out;}
 const permitted: Set<string>=new Set<string>(eligible.map((row: IndexedRecipe)=>row.recipe.id));
 const byId: Map<string,CoreRecipe>=new Map<string,CoreRecipe>();eligible.forEach((row: IndexedRecipe) => {byId.set(row.recipe.id,row.recipe);});
 if(!out.tokens.length){out.mode=out.intent.explanations.length?'matched':'all';out.message=out.intent.explanations.length?'已按条件筛选：'+out.intent.explanations.join(' · '):'';out.recipes=eligible.map((row: IndexedRecipe) => row.recipe);out.hits=eligible.map((row: IndexedRecipe) => {const hit: RecipeSearchHit=new RecipeSearchHit();hit.recipeId=row.recipe.id;hit.level=out.mode==='all'?'all':'constraint';return hit;});return out;}
 const evaluated: EvaluatedRecipe[]=index.rows.map((row: IndexedRecipe) => evaluate(row,out.intent.text,out.tokens,index));
 const matches: EvaluatedRecipe[]=evaluated.filter((row: EvaluatedRecipe) => permitted.has(row.hit.recipeId)&&row.complete);
 const stableOrder=(a: EvaluatedRecipe,b: EvaluatedRecipe): number => b.hit.score-a.hit.score||a.row.recipe.name.localeCompare(b.row.recipe.name)||a.hit.recipeId.localeCompare(b.hit.recipeId);
 if(matches.length){
  matches.sort(stableOrder);out.mode='matched';out.hits=matches.map((row: EvaluatedRecipe) => row.hit);out.recipes=matches.map((row: EvaluatedRecipe) => row.row.recipe);
  if(!matches.some((row: EvaluatedRecipe) => row.hit.level==='exact')){out.message=matches[0].hit.level==='segmented'?'已拆分关键词，为你找到相关菜谱':'已按拼音或近似文字，为你找到相关菜谱';}
  if(out.intent.explanations.length){out.message='已按条件筛选：'+out.intent.explanations.join(' · ')+(out.message?'；'+out.message:'');}
  return out;
 }
 // Infer cuisine only from evidence in the query or real matching catalog metadata.
 const cues: string[]=[];
 for(const term of out.tokens){const group: string=cuisineFromTerm(term);if(group&&!cues.includes(group)){cues.push(group);}}
 const anchors: EvaluatedRecipe[]=evaluated.filter((row: EvaluatedRecipe) => row.complete||row.hit.matchedTerms>0).sort(stableOrder).slice(0,5);
 for(const anchor of anchors){const group: string=recipeCuisineGroup(anchor.row.recipe);if(group&&!cues.includes(group)){cues.push(group);}}
 if(!cues.length){for(const preferred of preferredCuisines){const group: string=cuisineFromTerm(preferred);if(group&&!cues.includes(group)){cues.push(group);}}}
 out.suggestedCuisines=cues;
 const suggestions: EvaluatedRecipe[]=evaluated.filter((row: EvaluatedRecipe) => permitted.has(row.hit.recipeId));
 for(const suggestion of suggestions){
  const group: string=recipeCuisineGroup(suggestion.row.recipe);const same: boolean=!!group&&cues.includes(group);const neighbor: boolean=!!group&&relatedCuisine(group,cues);
  suggestion.hit.score=suggestion.hit.matchedTerms*100+ (same?60:neighbor?25:0)+(suggestion.row.recipe.category==='家常菜'?2:0);
  suggestion.hit.level='similar';suggestion.hit.confidence=0;suggestion.hit.reasons=suggestion.hit.matchedTerms?['部分关键词相关，未完全匹配']:same?['与搜索线索或偏好同菜系']:neighbor?['口味风格相近的菜系']:['换一道家常菜灵感'];
 }
 suggestions.sort(stableOrder);const limit: number=Number.isFinite(fallbackLimit)?Math.max(1,Math.min(30,Math.floor(fallbackLimit))):12;
 out.mode='similar';out.hits=suggestions.slice(0,limit).map((row: EvaluatedRecipe) => row.hit);out.recipes=out.hits.map((hit: RecipeSearchHit) => byId.get(hit.recipeId)!);
 const hasCuisine: boolean=out.recipes.some((recipe: CoreRecipe) => {const group: string=recipeCuisineGroup(recipe);return !!group&&(cues.includes(group)||relatedCuisine(group,cues));});
 out.message=hasCuisine?'没有找到完全匹配的结果，为你推荐相似菜系':'没有找到匹配结果，先看看这些家常菜灵感';
 if(out.intent.explanations.length){out.message+='（'+out.intent.explanations.join(' · ')+'）';}
 return out;
}
/** Convenience API: all returned recipe references come from the supplied hard-filtered candidates. */
export function searchRecipeCandidates(candidates: CoreRecipe[],query: string,preferredCuisines: string[] = [],fallbackLimit: number = 12): RecipeSearchResult {
 const index: RecipeSearchIndex=new RecipeSearchIndex(candidates);
 return searchRecipeCatalog(index,query,index.recipeIds,fallbackLimit,preferredCuisines);
}
