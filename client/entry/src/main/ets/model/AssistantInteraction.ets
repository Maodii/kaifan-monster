import { Recipe, Ingredient } from './Models';
import { estimateRecipeCost, RecipeCost } from './UsabilityCore';
export class AnswerBlock {kind:string='text';text:string='';constructor(kind:string,text:string){this.kind=kind;this.text=text;}}
/** Presentation only: model markup never becomes HTML, links, commands or business actions. */
export function answerInline(text:string):string{
 return text.replace(/!\[([^\]\n]*)\]\([^\n)]*(?:\)|$)/g,'$1').replace(/\[([^\]\n]+)\]\([^\n)]*(?:\)|$)/g,'$1')
  .replace(/\*{2,3}|_{2,3}|~~/g,'').replace(/(^|[^\d])\*([^*\s][^*\n]*?)\*(?!\d)/g,'$1$2')
  .replace(/(^|[\s（(])_([^_\n]+)_/g,'$1$2').replace(/`+/g,'').replace(/^\*+(?=\S)|\*+$/g,'').trim();
}
export function answerBlocks(text:string):AnswerBlock[]{
 const lines:string[]=text.slice(0,8000).replace(/\r\n?/g,'\n').split('\n');const result:AnswerBlock[]=[];
 for(const raw of lines){const line:string=raw.trim();if(!line||/^(`{3,}|~{3,})/.test(line)||/^[-*_]{3,}$/.test(line)||/^#{1,6}\s*$/.test(line)){continue;}let kind:string='text';let value:string=line;
  if(/^\|?[ :|\-]+\|[ :|\-]*$/.test(line)){continue;}
  if(/^#{1,6}\s*/.test(line)){kind='heading';value=line.replace(/^#{1,6}\s*/,'');}
  else if(/^[-*+•]\s+/.test(line)){kind='list';value=line.replace(/^[-*+•]\s+/,'');}
  else if(/^\d+[.、)]\s*/.test(line)){kind='step';}
  else if(/^>\s*/.test(line)){value=line.replace(/^(>\s*)+/,'');}
  if(value.includes('|')&&(value.startsWith('|')||value.endsWith('|'))){value=value.replace(/^\||\|$/g,'').split('|').map((cell:string)=>cell.trim()).filter((cell:string)=>!!cell).join(' · ');}
  value=answerInline(value);if(value){result.push(new AnswerBlock(kind,value));}
 }
 return result;
}
export function answerPlainText(text:string):string{return answerBlocks(text).map((block:AnswerBlock)=>block.text).join('\n');}
export function answerPreview(text:string,expanded:boolean):string{return !expanded&&text.length>700?text.slice(0,700)+'…':text;}
export function refineQuestion(kind:string):string{
 if(kind==='short'){return '把上一条建议缩成三条重点，保留关键火候与安全提醒。';}
 if(kind==='detail'){return '把上一条建议分步讲清，每步说明用量依据、火候与熟度判断；未知内容明确说明。';}
 if(kind==='cheap'){return '在不改变明确忌口和人数的前提下，给上一条建议更省钱的搭配；标注费用为估算。';}
 return '在不改变明确忌口和人数的前提下，让上一条建议更清淡，说明调味调整与口感变化。';
}
export class AssistantFault {title:string='连接暂时中断';hint:string='内容仍在，可手动重试。';action:string='retry';fresh:boolean=false;}
export function assistantFault(message:string):AssistantFault{
 const out:AssistantFault=new AssistantFault();
 if(/登录|会话已变化|账号已变化/.test(message)){out.title='需要重新登录';out.hint='本机记录仍可查看。';out.action='login';}
 else if(/频繁|限制|繁忙|较多/.test(message)){out.title='暂时排队中';out.hint='请稍后手动重试，不会自动重复请求。';out.action='wait';}
 else if(/请求已结束|结果已过期|请求内容已变化/.test(message)){out.title='本次请求已结束';out.hint='再次发送将创建新请求。';out.fresh=true;}
 else if(/格式|位置无效|回复过长/.test(message)){out.title='回复未能完整读取';out.hint='已保留问题，可以重新发送。';out.fresh=true;}
 return out;
}
class DraftEntry {key:string='';text:string='';constructor(key:string,text:string){this.key=key;this.text=text;}}
/** Small in-memory draft bank, discarded on account change/new conversation. */
export class AssistantDraftBank {
 private rows:DraftEntry[]=[];
 remember(key:string,text:string):void{this.rows=this.rows.filter((row:DraftEntry)=>row.key!==key);if(text.trim()){this.rows.push(new DraftEntry(key.slice(0,260),text.slice(0,1500)));}this.rows=this.rows.slice(-8);}
 read(key:string):string{return this.rows.find((row:DraftEntry)=>row.key===key)?.text||'';}
 clear():void{this.rows=[];}
}
export function assistantDraftKey(task:string,ids:string[]):string{return task+':'+ids.slice(0,3).join('|');}
export function referenceOrder(recipes:Recipe[],order:string,people:number):Recipe[]{
 const rows:Recipe[]=recipes.slice();if(order==='time'){rows.sort((a:Recipe,b:Recipe)=>(a.minutes>0?a.minutes:Infinity)-(b.minutes>0?b.minutes:Infinity));}
 if(order==='cost'){rows.sort((a:Recipe,b:Recipe)=>{const ca:RecipeCost=estimateRecipeCost(a,people),cb:RecipeCost=estimateRecipeCost(b,people);return (ca.usable?ca.total:Infinity)-(cb.usable?cb.total:Infinity);});}return rows;
}
export class ComparisonRow {label:string='';left:string='';right:string='';constructor(label:string,left:string,right:string){this.label=label;this.left=left;this.right=right;}}
export function compareDishes(left:Recipe,right:Recipe,people:number):ComparisonRow[]{
 const a:RecipeCost=estimateRecipeCost(left,people),b:RecipeCost=estimateRecipeCost(right,people);
 return [new ComparisonRow('菜品',left.name,right.name),new ComparisonRow('用时',left.minutes>0?'约'+left.minutes+'分钟':'待核',right.minutes>0?'约'+right.minutes+'分钟':'待核'),new ComparisonRow(people+'人费用',a.usable?'约¥'+a.total:'待估算',b.usable?'约¥'+b.total:'待估算'),new ComparisonRow('主要食材',left.ingredients.filter((i:Ingredient)=>!i.optional).slice(0,4).map((i:Ingredient)=>i.name).join('、'),right.ingredients.filter((i:Ingredient)=>!i.optional).slice(0,4).map((i:Ingredient)=>i.name).join('、'))];
}
export function assistantWaitLabel(elapsed:number,hasText:boolean):string{if(hasText){return '正在回答';}if(elapsed>=8){return '还在准备，可以随时停止';}return '正在想一想';}
export function pollingDelay(empty:number):number{return empty>=4?1000:empty>=2?600:300;}
export function transientAssistantFailure(message:string):boolean{return /网络|连接不到|中断|超时|network|fetch|ECONN|socket/i.test(message)&&!/读取位置|请求已结束/.test(message);}
