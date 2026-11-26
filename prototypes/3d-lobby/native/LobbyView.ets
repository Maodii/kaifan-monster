import { webview } from '@kit.ArkWeb';

class LobbyProxy {
 private handler: (message: string) => void;
 constructor(handler: (message: string) => void) { this.handler = handler; }
 dispatch(message: string): boolean {
  if (typeof message !== 'string' || message.length > 512) { return false; }
  this.handler(message);
  return true;
 }
}

@Component
export struct LobbyView {
 @Prop @Watch('snapshotChanged') snapshot: string = '';
 @Prop @Watch('backRequested') backTick: number = 0;
 @StorageLink('appForeground') @Watch('foregroundChanged') foreground: boolean = true;
 onRequest: (message: string) => void = () => {};
 private pageReady: boolean = false;
 private controller: webview.WebviewController = new webview.WebviewController();
 private proxy: LobbyProxy = new LobbyProxy((message: string) => {
  this.getUIContext().runScopedTask(() => {
   if (message === '{"v":1,"type":"ready","value":""}') { this.sendSnapshot(); this.foregroundChanged(); }
   this.onRequest(message);
  });
 });
 private snapshotChanged(): void { this.sendSnapshot(); }
 private backRequested(): void {
  if (!this.pageReady) { return; }
  this.controller.runJavaScript('window.LobbyNative&&window.LobbyNative.back()').catch(() => {});
 }
 private foregroundChanged(): void {
  if (!this.pageReady) { return; }
  this.controller.runJavaScript('window.LobbyNative&&window.LobbyNative.setActive(' + (this.foreground ? 'true' : 'false') + ')').catch(() => {});
 }
 private allowedDocument(url: string): boolean {
  const base: string = url.split('#')[0].split('?')[0];
  return base === 'resource://rawfile/lobby/index.html' ||
   (base.startsWith('file:///') && base.endsWith('/resources/rawfile/lobby/index.html'));
 }
 private sendSnapshot(): void {
  if (!this.pageReady) { return; }
  this.controller.runJavaScript('window.LobbyNative&&window.LobbyNative.receiveSnapshot(' + JSON.stringify(this.snapshot) + ')').catch(() => {});
 }
 aboutToDisappear(): void {
  if (this.pageReady) {
   try { this.controller.runJavaScript('window.LobbyNative&&window.LobbyNative.dispose()').catch(() => {}); } catch (_) {}
  }
  this.pageReady = false;
 }
 build() {
  Web({src: $rawfile('lobby/index.html'), controller: this.controller})
   .javaScriptAccess(true).domStorageAccess(false).databaseAccess(false)
   .fileAccess(true).imageAccess(true).onlineImageAccess(true).geolocationAccess(false)
   .mixedMode(MixedMode.None).width('100%').height('100%')
   .javaScriptProxy({object:this.proxy,name:'LobbyHost',methodList:['dispatch'],controller:this.controller})
   .onLoadIntercept((event) => { return event && event.data.isMainFrame() ? !this.allowedDocument(event.data.getRequestUrl()) : false; })
   .onConsole((event) => { if(event){const message:string=event.message.getMessage();if(message.startsWith('Lobby ') || message.startsWith('THREE.WebGLRenderer')){console.info('[LobbyWeb] '+message);}}return false; })
   .onPageEnd(() => {
    this.controller.runJavaScript("(()=>{const out={};for(const name of ['webgl2','webgl']){const canvas=document.createElement('canvas');try{const gl=canvas.getContext(name);out[name]=!!gl;if(gl){out[name+'Version']=gl.getParameter(gl.VERSION);const ext=gl.getExtension('WEBGL_lose_context');if(ext)ext.loseContext()}}catch(e){out[name]=String(e)}}console.info('Lobby graphics capabilities: '+JSON.stringify(out))})()").catch(() => {});
    this.pageReady = true; this.sendSnapshot(); this.foregroundChanged(); })
 }
}
