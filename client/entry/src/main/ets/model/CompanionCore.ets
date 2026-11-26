/** Small deterministic state helpers; no user data, network, timers or platform globals. */
export class CompanionAnchor {side:string='right';fraction:number=0.54;x:number=0;y:number=0;}
export function companionAnchor(width:number,height:number,x:number,y:number,size:number=64):CompanionAnchor{
 const out:CompanionAnchor=new CompanionAnchor();const w:number=Number.isFinite(width)?Math.max(240,width):390;const h:number=Number.isFinite(height)?Math.max(220,height):844;
 const low:number=Math.min(96,Math.max(8,h-size-100));const high:number=Math.max(low,h-size-104);const rawX:number=Number.isFinite(x)?x:w;const rawY:number=Number.isFinite(y)?y:(low+high)/2;
 out.side=rawX+size/2<w/2?'left':'right';out.x=out.side==='left'?4:Math.max(4,w-size-4);out.y=Math.min(high,Math.max(low,rawY));out.fraction=high>low?(out.y-low)/(high-low):0;return out;
}
export function companionReflow(width:number,height:number,side:string,fraction:number,size:number=64):CompanionAnchor{
 const h:number=Math.max(220,Number.isFinite(height)?height:844);const low:number=Math.min(96,Math.max(8,h-size-100));const high:number=Math.max(low,h-size-104);const f:number=Number.isFinite(fraction)?Math.min(1,Math.max(0,fraction)):0.54;
 return companionAnchor(width,h,side==='left'?0:width,low+(high-low)*f,size);
}
export function companionIdlePose(turn:number):string{return ['idle','peek','blink','stretch','wave','surprise','eat','sleep'][Math.abs(Math.floor(turn))%8];}
export function companionCanShow(route:string,keyboard:boolean,modal:boolean,lobby:boolean):boolean{return !keyboard&&!modal&&!lobby&&!['about-support','draw','ai-assistant','auth','account','account-security','account-recovery','guide','cook-guide','photo','publish'].includes(route);}

/** Only a deliberate downward pull on the dialog grip dismisses, never horizontal swipes. */
export function companionShouldDismiss(dx:number,dy:number):boolean{return Number.isFinite(dx)&&Number.isFinite(dy)&&dy>=64&&dy>Math.abs(dx)*1.35;}
/** Shared restrained motion values; renderers animate properties, no per-frame simulation. */
export function companionDragTilt(dx:number):number{return Number.isFinite(dx)?Math.max(-9,Math.min(9,dx*0.065)):0;}
export function companionPullDistance(dy:number):number{return Number.isFinite(dy)?Math.max(0,Math.min(180,dy)):0;}
