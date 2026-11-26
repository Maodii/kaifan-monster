const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/backend/node_modules/typescript');
const source=fs.readFileSync(root+'/client/entry/src/main/ets/pages/Index.ets','utf8');
const offer=source.match(/ private offerUndo\([^\n]+/)[0];
const start=source.indexOf(' private async toggleRecipeFavorite('),end=source.indexOf(' private heartPhase(',start);
const code=ts.transpileModule('class Harness{'+offer+source.slice(start,end)+'}\nmodule.exports=Harness;', {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const sandbox={module:{exports:{}},COMMUNITY_ENABLED:false,setTimeout,clearTimeout};vm.runInNewContext(code,sandbox);
(async()=>{
 const h=new sandbox.module.exports(),state={favorites:[]};let writes=0,motions=0;
 Object.assign(h,{busy:false,page:'recipe',tab:3,favorites:[],selectedRecipe:{id:'r'},heartRevision:0,cloud:{session:{userId:'owner'}},store:{state,async favorite(id){writes++;state.favorites=state.favorites.length?[]:[{recipeId:id}];}},undoTimer:-1,toast(message){throw Error(message);},heartPhase(){motions++;}});
 await h.toggleRecipeFavorite();assert.equal(h.favorites.length,1);assert.equal(h.busy,false);assert.equal(h.undoNotice,'已收藏');
 h.busy=true;await h.undoTask();assert.equal(h.favorites.length,0);assert.equal(h.busy,true,'nested undo must leave outer action lock owned by run');assert.equal(h.undoNotice,'');assert.equal(h.undoTimer,-1);assert.equal(writes,2);assert.equal(motions,2);
 await h.toggleRecipeFavorite();assert.equal(writes,2,'busy normal tap must not write');h.busy=false;
 await h.toggleRecipeFavorite();h.cloud.session.userId='other';await assert.rejects(()=>h.undoTask(),/账号已切换/);clearTimeout(h.undoTimer);assert.equal(writes,3);
 console.log('PASS actual Harmony favorite method: nested run undo commits, no recursive notice, outer busy ownership, busy tap and account guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
