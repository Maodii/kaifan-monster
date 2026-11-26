"use strict";
// Recipe and community search intentionally keep separate input, results and navigation.
const communitySearch={draft:"",term:"",rows:[],cursor:"",more:false,applied:"",scope:"public",request:0,error:"",loading:false,started:false};
window.communitySearchTerm="";
const searchLoadSettings=loadSettings;
loadSettings=async function(){
  Object.assign(communitySearch,{draft:"",term:"",rows:[],cursor:"",more:false,applied:"",scope:"public",error:"",loading:false,started:false});
  communitySearch.request++;searchPostReturn="";window.communitySearchTerm="";await searchLoadSettings();
};
const standaloneRecipeSearchView=searchView;
window.parityViews["recipe-search"]=()=>standaloneRecipeSearchView().replace('<form data-submit="search">','<form class="recipe-search-form" data-submit="search">');
const searchRecipesView=recipesView;
recipesView=()=> (filter.search.trim()?`<p class="recipe-search-results">菜谱结果 · ${esc(filter.search)}</p>`:"")+searchRecipesView();
function communitySearchView(){
  const s=communitySearch;
  return heading("搜索社区分享","查帖子、心得和问题")+
    form("communitySearch",input("communityKeyword","社区关键词",s.draft,"search",'maxlength="80" autocomplete="off"'),"搜索帖子").replace('<form data-submit="communitySearch">','<form class="community-search-form" data-submit="communitySearch">')+
    (s.loading?'<p role="status">正在查找社区分享…</p>':"")+
    (s.error?`<p role="alert">${esc(s.error)}</p>${btn("重试","communitySearchRetry")}`:"")+
    (s.started?`<section class="community-search-results" aria-label="社区帖子搜索结果"><h2>${esc(s.term)} · 帖子结果</h2>${s.rows.map(p=>`<article class="card" data-community-post="${esc(p.id)}"><span class="badge">${p.demo_data?"演示内容":"真实分享"}</span>${p.photoUrl?`<img class="cover" src="${esc(p.photoUrl)}" alt="分享照片">`:""}<h3>${esc(p.payload?.name || "餐桌分享")}</h3><p>${esc(p.author_name || "小怪朋友")}</p><p>${esc(p.payload?.notes || p.payload?.trialFailure || "")}</p>${btn("看看","communitySearchPost",p.id)}</article>`).join("")}${!s.loading&&!s.error&&!s.rows.length?empty("还没有找到相关帖子，换个关键词试试"):""}${s.more?btn("再看20条帖子","communitySearchMore"):""}</section>`:'<p class="hint">只搜索社区帖子，不会写入菜谱搜索记录或热榜。</p>');
}
window.parityViews["community-search"]=communitySearchView;
async function loadCommunitySearch(more=false){
  const s=communitySearch,token=livingOwner(),request=++s.request;
  if(!cloud.session.accessToken){s.error="登录后可搜索社区分享";s.loading=false;render();return;}
  s.loading=true;s.error="";render();
  try{
    const result=await api("/community/posts/page?scope="+encodeURIComponent(s.scope)+s.applied+"&q="+encodeURIComponent(s.term)+(more&&s.cursor?"&cursor="+encodeURIComponent(s.cursor):""));
    if(!livingCurrent(token)||request!==s.request||page!=="community-search")return;
    s.rows=(more?s.rows:[]).concat(result.items).filter((p,i,rows)=>rows.findIndex(x=>x.id===p.id)===i).slice(-100);s.cursor=result.nextCursor || "";s.more=!!result.hasMore;
    const rows=s.rows.filter(p=>p.payload?.photoId&&!p.photoUrl);
    for(let i=0;i<rows.length;i+=4)await Promise.all(rows.slice(i,i+4).map(async p=>{
      try{const photo=await api("/photos/"+encodeURIComponent(p.payload.photoId)+"/download");if(livingCurrent(token)&&request===s.request&&page==="community-search")p.photoUrl=remotePhoto(photo.url);}catch{}
    }));
  }catch(e){if(livingCurrent(token)&&request===s.request)s.error="暂时没连上，已有帖子仍可查看。请重试。";}
  finally{if(livingCurrent(token)&&request===s.request){s.loading=false;if(page==="community-search")render();}}
}
document.addEventListener("input",event=>{if(event.target.name==="communityKeyword")communitySearch.draft=event.target.value;});
const independentSearchSubmit=submit;
submit=async function(action){
  if(action!=="communitySearch")return independentSearchSubmit(action);
  const term=val("communityKeyword").normalize("NFKC").trim().replace(/\s+/g," ").slice(0,80);
  communitySearch.draft=term;if(!term)throw Error("请输入社区关键词");
  Object.assign(communitySearch,{term,rows:[],cursor:"",more:false,applied:living.communityApplied,scope:communityScope,started:true});window.communitySearchTerm=term;
  await loadCommunitySearch();
};
let searchPostReturn="";
function searchParent(){
  if(page==="recipe-search")return "recipes";
  if(page==="community-search")return "community";
  if(page==="post"&&searchPostReturn){const parent=searchPostReturn;searchPostReturn="";return parent;}
  return "";
}
const independentSearchActions=actions;
actions=async function(action,value){
  if(action==="communitySearchMore"){await loadCommunitySearch(true);return;}
  if(action==="communitySearchRetry"){await loadCommunitySearch();return;}
  if(action==="communitySearchPost"){
    const request=communitySearch.request,token=livingOwner();
    const [post,comments]=await Promise.all([api("/community/posts/"+encodeURIComponent(value)),api("/community/posts/"+encodeURIComponent(value)+"/comments")]);
    if(!livingCurrent(token)||request!==communitySearch.request||page!=="community-search")return;
    currentPost=post;commentList=comments;searchPostReturn="community-search";go("post");return;
  }
  if(action==="back"){await window.requestAppBack();return;}
  if(action==="post")searchPostReturn="";
  await independentSearchActions(action,value);
};
const independentSearchGo=go;
go=function(next,keep=false){
  const route=next==="search"?"recipe-search":next,s=communitySearch;
  if(route==="community-search"&&page!==route&&(s.scope!==communityScope||s.applied!==living.communityApplied)){
    Object.assign(s,{term:"",rows:[],cursor:"",more:false,error:"",loading:false,started:false,scope:communityScope,applied:living.communityApplied});s.request++;window.communitySearchTerm="";
  }
  if(page==="community-search"&&route!==page){s.request++;s.loading=false;}
  independentSearchGo(route,keep);
};
const independentSearchBack=window.handleBack;
window.handleBack=function(){
  if(history.length){if(page==="post")searchPostReturn="";return independentSearchBack();}
  const parent=searchParent();if(parent){go(parent,true);return true;}return independentSearchBack();
};

document.addEventListener("change",event=>{if(page==="meal"&&event.target.name==="diningMode"){rememberMealForm();render();}});
