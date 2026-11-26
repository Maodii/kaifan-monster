"use strict";
// Presentation-only selection surface. The original select remains the form source of truth.
let activeChoiceSurface=null;
function closeChoiceSurface(restore=true){
 const state=activeChoiceSurface;if(!state)return;
 activeChoiceSurface=null;state.finished=true;state.observer?.disconnect();
 if(state.dialog.open)state.dialog.close();state.dialog.remove();document.body.classList.remove('choice-surface-open');
 if(restore&&state.select.isConnected)state.select.focus({preventScroll:true});
}
function watchChoiceOwner(state){state.observer=new MutationObserver(()=>{if(activeChoiceSurface===state&&!state.select.isConnected)closeChoiceSurface(false);});state.observer.observe(document.getElementById('screen'),{childList:true,subtree:true});}
function openChoiceSurface(select){
 if(!(select instanceof HTMLSelectElement)||select.disabled||select.multiple||select.size>1)return false;
 if(activeChoiceSurface?.select===select)return true;
 closeChoiceSurface(false);
 const dialog=document.createElement('dialog');dialog.className='choice-surface';dialog.setAttribute('aria-labelledby','choice-surface-title');
 const state={dialog,select,finished:false,buttons:[]};activeChoiceSurface=state;
 const heading=document.createElement('div');heading.className='surface-heading';
 const title=document.createElement('h2');title.id='choice-surface-title';title.textContent=select.labels?.[0]?.childNodes?.[0]?.textContent?.trim()||select.getAttribute('aria-label')||'选择选项';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='surface-close';cancel.textContent='×';cancel.setAttribute('aria-label','取消选择');cancel.onclick=()=>closeChoiceSurface();heading.append(title,cancel);dialog.append(heading);
 const options=Array.from(select.options),body=document.createElement('div');body.className='surface-option-list';body.setAttribute('role','group');body.setAttribute('aria-label',title.textContent);
 let search=null;
 if(options.length>8){search=document.createElement('input');search.type='search';search.placeholder='查找选项';search.setAttribute('aria-label','查找'+title.textContent);search.className='surface-option-search';dialog.append(search);}
 const empty=document.createElement('p');empty.className='surface-empty';empty.textContent='没有匹配的选项';empty.setAttribute('role','status');empty.hidden=true;
 options.forEach((option,index)=>{
  const button=document.createElement('button');button.type='button';button.className='surface-option';button.textContent=option.label;button.dataset.index=String(index);button.setAttribute('aria-pressed',String(index===select.selectedIndex));button.disabled=option.disabled||option.parentElement?.disabled===true;
  button.onclick=()=>{
   if(activeChoiceSurface!==state||state.finished||!select.isConnected||select.disabled||button.disabled)return;
   if(select.options[index]!==option){closeChoiceSurface();return;}const changed=select.selectedIndex!==index;closeChoiceSurface(false);select.selectedIndex=index;
   if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
   if(select.isConnected)select.focus({preventScroll:true});
  };state.buttons.push(button);body.append(button);
 });body.append(empty);dialog.append(body);
 if(search)search.addEventListener('input',()=>{const term=search.value.normalize('NFKC').trim().toLocaleLowerCase();let visible=0;for(const button of state.buttons){button.hidden=!button.textContent.normalize('NFKC').toLocaleLowerCase().includes(term);if(!button.hidden)visible++;}empty.hidden=visible>0;});
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeChoiceSurface();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeChoiceSurface();}});
 dialog.addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||event.target===search&&['Home','End'].includes(event.key))return;
  const visible=state.buttons.filter(button=>!button.hidden&&!button.disabled);if(!visible.length)return;
  event.preventDefault();const current=visible.indexOf(document.activeElement);const index=event.key==='Home'?0:event.key==='End'?visible.length-1:event.key==='ArrowDown'?(current+1)%visible.length:(current<=0?visible.length:current)-1;visible[index].focus();
 });
 document.body.append(dialog);watchChoiceOwner(state);document.body.classList.add('choice-surface-open');dialog.showModal();
 (search||state.buttons.find(button=>button.getAttribute('aria-pressed')==='true'&&!button.disabled)||cancel).focus({preventScroll:true});return true;
}
document.addEventListener('pointerdown',event=>{const select=event.target.closest?.('select');if(select&&openChoiceSurface(select))event.preventDefault();},true);
document.addEventListener('click',event=>{const select=event.target.closest?.('select');if(select&&openChoiceSurface(select)){event.preventDefault();event.stopPropagation();}},true);
document.addEventListener('keydown',event=>{if(event.target instanceof HTMLSelectElement&&['Enter',' ','ArrowDown','ArrowUp'].includes(event.key)&&openChoiceSurface(event.target))event.preventDefault();},true);
const surfaceOriginalBack=window.handleBack;window.handleBack=function(){if(activeChoiceSurface){closeChoiceSurface();return true;}return surfaceOriginalBack();};
const surfaceOriginalGo=go;go=function(next,keep=false){closeChoiceSurface(false);return surfaceOriginalGo(next,keep);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeChoiceSurface(false);});
const surfaceOriginalVisibility=window.platformVisibility;window.platformVisibility=function(visible){if(!visible)closeChoiceSurface(false);return surfaceOriginalVisibility(visible);};

// Date and time inputs use the same shell instead of WebView's default picker window.
function openTemporalSurface(input){
 if(!(input instanceof HTMLInputElement)||!['date','time'].includes(input.type)||input.disabled||input.readOnly)return false;
 if(activeChoiceSurface?.select===input)return true;closeChoiceSurface(false);
 const dialog=document.createElement('dialog');dialog.className='choice-surface temporal-surface';dialog.setAttribute('aria-labelledby','choice-surface-title');
 const state={dialog,select:input,finished:false,buttons:[]};activeChoiceSurface=state;
 const header=document.createElement('div');header.className='surface-heading';const title=document.createElement('h2');title.id='choice-surface-title';title.textContent=input.labels?.[0]?.childNodes?.[0]?.textContent?.trim()||input.getAttribute('aria-label')||(input.type==='date'?'选择日期':'选择时间');const close=document.createElement('button');close.type='button';close.className='surface-close';close.textContent='×';close.setAttribute('aria-label','取消选择');close.onclick=()=>closeChoiceSurface();header.append(title,close);dialog.append(header);
 const error=document.createElement('p');error.className='surface-error';error.setAttribute('role','alert');error.hidden=true;
 function commit(value){
  if(activeChoiceSurface!==state||state.finished||!input.isConnected||input.disabled||input.readOnly)return;
  const previous=input.value;input.value=value;
  if(!input.checkValidity()){input.value=previous;error.textContent='请选择允许范围内的'+(input.type==='date'?'日期':'时间');error.hidden=false;return;}
  closeChoiceSurface(false);if(previous!==value){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}if(input.isConnected)input.focus({preventScroll:true});
 }
 if(input.type==='date'){
  const now=new Date(),initial=/^\d{4}-\d{2}-\d{2}$/.test(input.value)?input.value:M.dateString(now);let month=initial.slice(0,7);
  const toolbar=document.createElement('div');toolbar.className='surface-month-toolbar';const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('strong');previous.type=next.type='button';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','上个月');next.setAttribute('aria-label','下个月');label.setAttribute('aria-live','polite');toolbar.append(previous,label,next);dialog.append(toolbar);
  const weekdays=document.createElement('div');weekdays.className='surface-calendar-week';for(const day of ['一','二','三','四','五','六','日']){const span=document.createElement('span');span.textContent=day;weekdays.append(span);}dialog.append(weekdays);
  const calendar=document.createElement('div');calendar.className='surface-calendar';calendar.setAttribute('role','group');calendar.setAttribute('aria-label','日期');dialog.append(calendar);
  function shift(delta){const date=new Date(month+'-01T12:00:00');date.setMonth(date.getMonth()+delta);return M.dateString(date).slice(0,7);}
  function draw(){label.textContent=month.replace('-','年')+'月';previous.disabled=!!input.min&&shift(-1)<input.min.slice(0,7);next.disabled=!!input.max&&shift(1)>input.max.slice(0,7);calendar.replaceChildren();const first=new Date(month+'-01T12:00:00'),offset=(first.getDay()+6)%7,days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');calendar.append(blank);}for(let day=1;day<=days;day++){const value=month+'-'+String(day).padStart(2,'0'),button=document.createElement('button');button.type='button';button.textContent=String(day);button.setAttribute('aria-label',value);button.setAttribute('aria-pressed',String(value===input.value));if(value===M.dateString(now))button.className='is-today';button.disabled=!!input.min&&value<input.min||!!input.max&&value>input.max;button.onclick=()=>commit(value);calendar.append(button);}}
  previous.onclick=()=>{month=shift(-1);draw();};next.onclick=()=>{month=shift(1);draw();};draw();
  const today=document.createElement('button');today.type='button';today.className='surface-today';today.textContent='选今天';today.onclick=()=>commit(M.dateString(now));dialog.append(today);
 }else{
  const parts=(input.value||'12:00').split(':');const fields=document.createElement('div');fields.className='surface-time-fields';const values=[];
  for(const [index,name] of ['小时','分钟'].entries()){
   const label=document.createElement('label');label.append(name);const field=document.createElement('input');field.type='number';field.inputMode='numeric';field.min='0';field.max=index===0?'23':'59';field.step='1';field.value=parts[index];field.setAttribute('aria-label',name);label.append(field);fields.append(label);values.push(field);
  }dialog.append(fields);const quick=document.createElement('div');quick.className='surface-time-quick';for(const minute of ['00','15','30','45']){const button=document.createElement('button');button.type='button';button.textContent=minute+'分';button.onclick=()=>{values[1].value=minute;};quick.append(button);}dialog.append(quick);
  const footer=document.createElement('div');footer.className='surface-actions';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='取消';cancel.onclick=()=>closeChoiceSurface();const save=document.createElement('button');save.type='button';save.textContent='确定';save.className='primary';save.onclick=()=>{if(values.some(field=>field.value===''||!field.checkValidity())){error.textContent='小时为0–23，分钟为0–59';error.hidden=false;return;}commit(values.map(field=>String(Number(field.value)).padStart(2,'0')).join(':'));};footer.append(cancel,save);dialog.append(footer);
 }
 dialog.append(error);dialog.addEventListener('cancel',event=>{event.preventDefault();closeChoiceSurface();});dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeChoiceSurface();});document.body.append(dialog);watchChoiceOwner(state);document.body.classList.add('choice-surface-open');dialog.tabIndex=-1;dialog.showModal();dialog.focus({preventScroll:true});return true;
}
document.addEventListener('pointerdown',event=>{if(openTemporalSurface(event.target))event.preventDefault();},true);
document.addEventListener('click',event=>{if(openTemporalSurface(event.target)){event.preventDefault();event.stopPropagation();}},true);
document.addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement&&['Enter',' '].includes(event.key)&&openTemporalSurface(event.target))event.preventDefault();},true);
