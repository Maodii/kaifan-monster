// Three GPU scenes share one small shader; all content and controls remain semantic HTML.
const vertexSource = `attribute vec2 position; void main(){ gl_Position=vec4(position,0.,1.); }`;
const fragmentSource = `
precision mediump float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
uniform float mode;
uniform float impulse;
uniform float scroll;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float line(float value,float width){return 1.-smoothstep(width,width+.006,abs(value));}
mat2 rotation(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
 p+=pointer*.025;
 float t=time*.23;
 float grain=hash(gl_FragCoord.xy*.7);
 vec3 purple=vec3(.62,.44,.71), green=vec3(.47,.62,.48), gold=vec3(.84,.65,.27);
 vec3 color=purple;
 float alpha=0.;
 if(mode<.5){
   vec2 q=rotation(-.32+pointer.x*.1)*p; q.y*=1.18;
   float a=atan(q.y,q.x),r=length(q);
   float curve=.327+.022*sin(a*3.+t)+.012*cos(a*5.-t*.7);
   float distance=r-curve;
   float halo=exp(-distance*distance*130.);
   float thin=line(distance+.052+.012*sin(a*4.-t),.0018);
   float outer=line(distance-.065+.008*cos(a*3.+t*.6),.0013);
   float highlight=pow(max(0.,cos(a-t*.5)),8.);
   color=mix(purple,gold,.5+.5*sin(a+t));color=mix(color,vec3(.79,.68,.87),highlight*.6);
   alpha=halo*.32+thin*.4+outer*.25;
   float paperStreak=.5+.5*sin(r*1250.+noise(q*26.)*12.);
   alpha*=.74+paperStreak*.26;
   for(int i=0;i<7;i++){
     float fi=float(i),angle=fi*.897+t*.1;
     vec2 star=vec2(cos(angle)*.423,sin(angle)*.367);
     vec2 s=abs(q-star);
     float glint=exp(-dot(s,s)*17000.)+.35*exp(-s.x*450.-s.y*70.)+.35*exp(-s.x*70.-s.y*450.);
     float glow=.35+.25*sin(t*1.2+fi*2.);
     alpha+=glint*glow;
   }
 }else if(mode<1.5){
   vec2 q=p-vec2(.16,0.); q.x*=.65;
   float r=length(q),a=atan(q.y,q.x);
   float wave=sin(r*32.-t*1.4+sin(a*3.+t)*.5);
   float fade=exp(-r*2.8);
   float fine=pow(max(0.,wave),18.);
   float ringRadius=.06+impulse*.8;
   float ring=exp(-pow((r-ringRadius)*65.,2.))*(1.-impulse);
   alpha=(fine*.075+ring*.42)*fade;
   color=mix(purple,gold,.5+.5*sin(a+r*4.+t));
 }else{
   vec2 q=rotation(.22)*p;q.x*=.85;
   float r=length(q),a=atan(q.y,q.x);
   float surface=r+.025*sin(a*4.+t*.5)+.015*sin(q.x*13.+t)+scroll*.025;
   float lines=pow(.5+.5*cos(surface*110.),24.);
   float fade=1.-smoothstep(.25,.62,r);
   float highlight=exp(-pow((surface-.3-impulse*.2)*55.,2.))*(1.-impulse);
   alpha=(lines*.12+highlight*.18)*fade;
   color=mix(green,purple,.5+.5*sin(a+t*.3));
 }
 alpha=clamp(alpha*(.86+grain*.14),0.,.72);
 gl_FragColor=vec4(color,alpha);
}`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');
const scenes = [];
// Invert the cubic-bezier time axis, then evaluate its bounded value axis.
function bezier(progress,x1,y1,x2,y2){
  const sample=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;
  let lo=0,hi=1,t=progress;for(let i=0;i<12;i++){t=(lo+hi)/2;if(sample(t,x1,x2)<progress)lo=t;else hi=t;}
  return progress<=0?0:progress>=1?1:sample(t,y1,y2);
}
class PaperScene {
  constructor(host, mode) {
    this.host=host;this.mode=mode;this.visible=false;this.lost=false;this.last=0;this.t=0;this.target=[0,0];this.pointer=[0,0];this.burstAt=-100;this.frame=0;
    this.canvas=document.createElement('canvas');this.canvas.className=`webgl-layer webgl-layer-${mode}`;this.canvas.setAttribute('aria-hidden','true');host.prepend(this.canvas);
    this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    if(!this.gl){host.dataset.webgl='unavailable';this.canvas.remove();return;}
    try{this.init();}catch(error){host.dataset.webgl='unavailable';this.canvas.remove();return;}
    host.dataset.webgl='ready';
    this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.start();},{rootMargin:'70px'});this.observer.observe(host);
    this.resizeObserver=new ResizeObserver(()=>{this.resize();this.start();});this.resizeObserver.observe(host);
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;cancelAnimationFrame(this.frame);this.frame=0;host.dataset.webgl='lost';});
    this.canvas.addEventListener('webglcontextrestored',()=>{try{this.init();this.resize();this.lost=false;host.dataset.webgl='ready';this.start();}catch{host.dataset.webgl='unavailable';}});
    this.resize();
  }
  init(){
    const gl=this.gl;
    const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
    const vertex=compile(gl.VERTEX_SHADER,vertexSource),fragment=compile(gl.FRAGMENT_SHADER,fragmentSource);
    this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Shader link failed');
    gl.useProgram(this.program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const p=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
    this.uniforms=Object.fromEntries(['resolution','pointer','time','mode','impulse','scroll'].map(name=>[name,gl.getUniformLocation(this.program,name)]));
  }
  resize(){const r=this.host.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,innerWidth<761?1.25:1.5);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  trigger(){if(reduced.matches)return;this.burstAt=performance.now();this.start();}
  start(){if(!this.gl||this.lost||this.frame||document.hidden||!this.visible)return;this.frame=requestAnimationFrame(now=>this.tick(now));}
  tick(now){
    this.frame=0;if(document.hidden||!this.visible||this.lost)return;
    const interval=innerWidth<761?1000/30:1000/60;
    if(!reduced.matches&&now-this.last<interval-1){this.start();return;}
    const delta=Math.min(50,now-this.last||16);this.last=now;if(!reduced.matches)this.t+=delta/1000;
    const k=1.-Math.exp(-delta/150);this.pointer=this.pointer.map((v,i)=>v+(this.target[i]-v)*k);
    const gl=this.gl,u=this.uniforms;gl.useProgram(this.program);gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);gl.uniform2f(u.pointer,reduced.matches?0:this.pointer[0],reduced.matches?0:this.pointer[1]);
    gl.uniform1f(u.time,reduced.matches?0:this.t);gl.uniform1f(u.mode,this.mode);gl.uniform1f(u.impulse,bezier(Math.min(1,(now-this.burstAt)/850),.16,.78,.24,1));gl.uniform1f(u.scroll,reduced.matches?0:Math.max(-1,Math.min(1,this.host.getBoundingClientRect().top/innerHeight)));
    gl.drawArrays(gl.TRIANGLES,0,6);this.canvas.dataset.rendered='true';
    if(!reduced.matches)this.start();
  }
  dispose(){cancelAnimationFrame(this.frame);this.observer?.disconnect();this.resizeObserver?.disconnect();if(this.gl&&!this.lost){this.gl.deleteProgram(this.program);this.gl.deleteBuffer(this.buffer);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}}
}
for(const [selector,mode] of [['.hero-art',0],['.draw-section',1],['.screen-panel',2]]){
  const host=document.querySelector(selector);if(host)scenes.push(new PaperScene(host,mode));
}
const hero=document.querySelector('.hero-art');
hero.addEventListener('pointermove',event=>{
  if(reduced.matches||!finePointer.matches)return;
  const rect=hero.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
  scenes[0].target=[x,-y];hero.style.setProperty('--pointer-x',`${x*7}px`);hero.style.setProperty('--pointer-y',`${y*6}px`);hero.style.setProperty('--pointer-r',`${x*.9}deg`);
});
hero.addEventListener('pointerleave',()=>{scenes[0].target=[0,0];hero.style.setProperty('--pointer-x','0px');hero.style.setProperty('--pointer-y','0px');hero.style.setProperty('--pointer-r','0deg');});
const curve={prep:'cubic-bezier(0.42,0,0.70,0.40)',hit:'cubic-bezier(0.16,0.78,0.24,1)',follow:'cubic-bezier(0.22,0.61,0.36,1)',reset:'cubic-bezier(0.33,0,0.20,1)'};
const active=new Map();
function animate(element,frames,options){active.get(element)?.cancel();const a=element.animate(frames,options);active.set(element,a);a.finished.then(()=>{if(active.get(element)===a)active.delete(element);}).catch(()=>{});}
document.addEventListener('monster:draw',()=>{
  if(reduced.matches)return;
  scenes[1]?.trigger();
  animate(document.querySelector('#draw-image'),[
    {transform:'scale(1) rotate(0deg)',offset:0,easing:curve.prep},
    {transform:'scale(.975,1.025) rotate(-.5deg)',offset:1/6,easing:curve.hit},
    {transform:'scale(1.035,.985) rotate(.9deg)',offset:1/3,easing:curve.follow},
    {transform:'scale(.997,1.003) rotate(-.15deg)',offset:13/18,easing:curve.reset},
    {transform:'scale(1) rotate(0deg)',offset:1}
  ],{duration:600});
  animate(document.querySelector('.note-footer'),[{opacity:.65,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,delay:150,easing:curve.follow});
});
document.addEventListener('monster:preview',()=>{
  if(reduced.matches)return;scenes[2]?.trigger();
  animate(document.querySelector('#app-screen'),[
    {transform:'translateY(0)',offset:0,easing:curve.prep},
    {transform:'translateY(1px)',offset:1/6,easing:curve.hit},
    {transform:'translateY(-1.5px)',offset:3/8,easing:curve.follow},
    {transform:'translateY(.25px)',offset:17/24,easing:curve.reset},
    {transform:'translateY(0)',offset:1}
  ],{duration:400});
  animate(document.querySelector('#screen-caption'),[{opacity:.8},{opacity:1}],{duration:280,delay:66.67,easing:curve.follow});
});
document.addEventListener('monster:preference',()=>{if(!reduced.matches)scenes[1]?.trigger();});
document.addEventListener('monster:save',()=>{
  if(reduced.matches)return;
  animate(document.querySelector('#save-inspiration span'),[
    {transform:'scale(1)',offset:0,easing:curve.prep},
    {transform:'scale(.97)',offset:1/6,easing:curve.hit},
    {transform:'scale(1.035)',offset:3/8,easing:curve.follow},
    {transform:'scale(.998)',offset:3/4,easing:curve.reset},
    {transform:'scale(1)',offset:1}
  ],{duration:400});
});
if(!reduced.matches){
  animate(document.querySelector('.hero-monster'),[
    {transform:'rotate(-5deg) scale(1)',offset:0,easing:curve.prep},
    {transform:'rotate(-5.4deg) scale(.98,1.02)',offset:1/6,easing:curve.hit},
    {transform:'rotate(-4.4deg) scale(1.025,.99)',offset:3/8,easing:curve.follow},
    {transform:'rotate(-5.1deg) scale(.998,1.002)',offset:3/4,easing:curve.reset},
    {transform:'rotate(-5deg) scale(1)',offset:1}
  ],{duration:800});
  animate(document.querySelector('.hero-art canvas')||document.querySelector('.art-orbit'),[{opacity:0},{opacity:1}],{duration:650,delay:50,easing:curve.follow});
  animate(document.querySelector('.hello'),[{opacity:0,transform:'rotate(9deg) translateY(3px)'},{opacity:1,transform:'rotate(10deg) translateY(0)'}],{duration:450,delay:116.67,easing:curve.follow});
}
// Reveal once; no invisible content when JavaScript/WebGL is unsupported.
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target);}}),{threshold:.08});
if(!reduced.matches)document.querySelectorAll('.section-heading,.feature,.draw-copy,.recipe-note,.steps li,.closing').forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--reveal-delay',`${i%3*65}ms`);revealObserver.observe(el);});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){scenes.forEach(s=>{cancelAnimationFrame(s.frame);s.frame=0;s.last=0;});active.forEach(a=>a.finish());}
  else scenes.forEach(s=>s.start());
});
reduced.addEventListener('change',()=>{active.forEach(a=>a.finish());document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in-view'));scenes.forEach(s=>s.start());hero.style.setProperty('--pointer-x','0px');hero.style.setProperty('--pointer-y','0px');hero.style.setProperty('--pointer-r','0deg');});
window.addEventListener('pagehide',()=>scenes.forEach(s=>{cancelAnimationFrame(s.frame);s.frame=0;}));
window.addEventListener('pageshow',()=>scenes.forEach(s=>s.start()));
window.addEventListener('unload',()=>{revealObserver.disconnect();scenes.forEach(s=>s.dispose());});
