const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/backend/node_modules/typescript'),text=fs.readFileSync(root+'/client/entry/src/main/ets/pages/Index.ets','utf8');
function between(a,b){return text.slice(text.indexOf(a),text.indexOf(b,text.indexOf(a)));}
const source='class Harness{'+between(' private async ask(title:',' @Builder optionControl(')+between(' private dateDialog(',' private async confirm(')+'}\nmodule.exports=Harness;';
let active,dateOptions,timeOptions;
const sandbox={module:{exports:{}},ConfirmSheet:props=>props,OptionSheet:props=>props,CustomDialogController:class{constructor(options){this.options=options;active=this;}open(){this.opened=true;}close(){this.closed=true;}},DialogAlignment:{Center:1},BlurStyle:{NONE:0},FontWeight:{Medium:1},ButtonType:{Normal:1},DatePickerDialog:{show:o=>dateOptions=o},TimePickerDialog:{show:o=>timeOptions=o},Math};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,sandbox);
(async()=>{
 const h=new sandbox.module.exports();h.viewportHeight=844;
 let promise=h.ask('确认','长消息');assert.equal(active.options.autoCancel,true);assert.equal(active.options.alignment,1);active.options.cancel();assert.equal(await promise,false);
 promise=h.ask('提示','说明','知道了','');assert.equal(active.options.builder.no,'');active.options.builder.resolved(true);active.options.cancel();assert.equal(await promise,true,'late cancel cannot reverse accepted answer');assert.equal(active.closed,true);
 let calls=0;h.chooseOption('分类',['甲','乙'],'甲',(i,v)=>{calls++;assert.equal(i,1);assert.equal(v,'乙');});active.options.builder.resolved(1);active.options.builder.resolved(1);assert.equal(calls,1);
 h.chooseOption('分类',['甲','乙'],'甲',()=>calls++);active.options.cancel();active.options.builder.resolved(0);assert.equal(calls,1);
 h.chooseOption('分类',['甲','乙'],'甲',()=>calls++);active.options.builder.resolved(9);assert.equal(calls,1);
 h.viewportHeight=320;promise=h.ask('确认','长消息');assert.ok(active.options.builder.bodyHeight<=320*.42);active.options.cancel();await promise;
 let accepted;const callback=v=>accepted=v;h.dateDialog({selected:new Date(2026,10,18),onAccept:callback});assert.equal(dateOptions.onAccept,callback);assert.equal(dateOptions.backgroundColor,'#FFFAF0');assert.equal(dateOptions.acceptButtonStyle.backgroundColor,'#56745E');assert.equal(dateOptions.alignment,1);
 h.timeDialog({useMilitaryTime:true,onAccept:callback});assert.equal(timeOptions.onAccept,callback);assert.equal(timeOptions.useMilitaryTime,true);assert.equal(timeOptions.selectedTextStyle.font.size,20);
 console.log('PASS actual Harmony helpers: confirm/cancel once, notice mode, option bounds/cancel, short-height scroll cap, picker callback and palette preservation');
})().catch(e=>{console.error(e);process.exitCode=1;});
