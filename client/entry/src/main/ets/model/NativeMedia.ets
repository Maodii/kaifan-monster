import { LengthMetricsUnit } from '@kit.ArkUI';
import { common } from '@kit.AbilityKit';
import { fileIo, fileUri } from '@kit.CoreFileKit';
import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { cameraPicker, camera } from '@kit.CameraKit';
import { image } from '@kit.ImageKit';
import { util } from '@kit.ArkTS';
import { scanBarcode, scanCore } from '@kit.ScanKit';
import { PhotoCell, photoLayout } from './PhotoLayoutCore';
export class LocalPhoto { original: string = ''; compressed: string = ''; }
export class NativeMedia {
 static async compose(context:common.UIAbilityContext,paths:string[],cover:boolean,key:string):Promise<LocalPhoto>{
  const cells:PhotoCell[]=photoLayout(paths.length);if(!/^[a-zA-Z0-9-]{1,80}$/.test(key)){throw new Error('照片编辑标识无效');}
  const canvas:OffscreenCanvas=new OffscreenCanvas(1200,1200,LengthMetricsUnit.PX);const c:OffscreenCanvasRenderingContext2D=canvas.getContext('2d');c.fillStyle='#fff5e5';c.fillRect(0,0,1200,1200);
  for(let index:number=0;index<paths.length;index++){
   if(!paths[index].startsWith(context.filesDir+'/photos/')){throw new Error('照片路径无效');}
   const input:fileIo.File=fileIo.openSync(paths[index],fileIo.OpenMode.READ_ONLY);const decoder:image.ImageSource=image.createImageSource(input.fd);
   try{const info:image.ImageInfo=await decoder.getImageInfo();const scale:number=Math.min(1,1400/Math.max(info.size.width,info.size.height));const pixels:image.PixelMap=await decoder.createPixelMap({desiredSize:{width:Math.max(1,Math.round(info.size.width*scale)),height:Math.max(1,Math.round(info.size.height*scale))}});
    try{const dim:image.ImageInfo=await pixels.getImageInfo();const cell:PhotoCell=cells[index];const ratio:number=cover?Math.max(cell.width/dim.size.width,cell.height/dim.size.height):Math.min(cell.width/dim.size.width,cell.height/dim.size.height);const w:number=dim.size.width*ratio;const h:number=dim.size.height*ratio;
     c.save();c.beginPath();c.rect(cell.x,cell.y,cell.width,cell.height);c.clip();c.drawImage(pixels,cell.x+(cell.width-w)/2,cell.y+(cell.height-h)/2,w,h);c.restore();
    }finally{await pixels.release();}
   }finally{decoder.release();fileIo.closeSync(input);}
  }
  const result:LocalPhoto=new LocalPhoto();result.original=paths[0];result.compressed=context.filesDir+'/photos/compose-'+key+'.jpg';const pixels:image.PixelMap=c.getPixelMap(0,0,1200,1200);const packer:image.ImagePacker=image.createImagePacker();
  try{const data:ArrayBuffer=await packer.packing(pixels,{format:'image/jpeg',quality:88});const out:fileIo.File=fileIo.openSync(result.compressed,fileIo.OpenMode.CREATE|fileIo.OpenMode.READ_WRITE|fileIo.OpenMode.TRUNC);try{fileIo.writeSync(out.fd,data);}finally{fileIo.closeSync(out);}}finally{await pixels.release();await packer.release();}
  return result;
 }
 static async scan(context: common.UIAbilityContext): Promise<string> {
  const result: scanBarcode.ScanResult = await scanBarcode.startScanForResult(context, { scanTypes: [scanCore.ScanType.EAN13_CODE, scanCore.ScanType.UPC_A_CODE, scanCore.ScanType.UPC_E_CODE], enableAlbum: true });
  if (!result || !result.originalValue) { throw new Error('当前设备未提供扫码结果，请使用输入条码或食材模板'); } return result.originalValue;
 }
 static async select(context: common.UIAbilityContext, takePhoto: boolean): Promise<LocalPhoto> {
  const directory: string = context.filesDir + '/photos'; try { fileIo.mkdirSync(directory); } catch (_) { /* 已存在时复用。 */ }
  const id: string = util.generateRandomUUID(); let uri: string = '';
  if (takePhoto) {
   const capture: string = directory + '/' + id + '-capture.jpg'; const file: fileIo.File = fileIo.openSync(capture, fileIo.OpenMode.CREATE | fileIo.OpenMode.READ_WRITE); fileIo.closeSync(file);
   const result: cameraPicker.PickerResult = await cameraPicker.pick(context, [cameraPicker.PickerMediaType.PHOTO], { cameraPosition: camera.CameraPosition.CAMERA_POSITION_BACK, saveUri: fileUri.getUriFromPath(capture) });
   if (!result || result.resultCode !== 0) { fileIo.unlinkSync(capture); throw new Error('已取消拍照'); } uri = result.resultUri;
  } else {
   const result: photoAccessHelper.PhotoSelectResult = await new photoAccessHelper.PhotoViewPicker().select({ MIMEType: photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE, maxSelectNumber: 1 });
   if (result.photoUris.length === 0) { throw new Error('未选择照片'); } uri = result.photoUris[0];
  }
  const photo: LocalPhoto = new LocalPhoto(); photo.original = directory + '/' + id + '-original'; photo.compressed = directory + '/' + id + '.jpg';
  const source: fileIo.File = fileIo.openSync(uri, fileIo.OpenMode.READ_ONLY);
  try { if (fileIo.statSync(source.fd).size > 50 * 1024 * 1024) { throw new Error('原图超过50MB，请选择较小照片'); } fileIo.copyFileSync(source.fd, photo.original); } finally { fileIo.closeSync(source); }
  const input: fileIo.File = fileIo.openSync(photo.original, fileIo.OpenMode.READ_ONLY); const decoder: image.ImageSource = image.createImageSource(input.fd);
  const packer: image.ImagePacker = image.createImagePacker();
  try {
   const info: image.ImageInfo = await decoder.getImageInfo(); const ratio: number = Math.min(1, 1600 / Math.max(info.size.width, info.size.height));
   const pixels: image.PixelMap = await decoder.createPixelMap({ desiredSize: { width: Math.max(1, Math.round(info.size.width * ratio)), height: Math.max(1, Math.round(info.size.height * ratio)) } });
   try { const bytes: ArrayBuffer = await packer.packing(pixels, { format: 'image/jpeg', quality: 82 }); const out: fileIo.File = fileIo.openSync(photo.compressed, fileIo.OpenMode.CREATE | fileIo.OpenMode.READ_WRITE); try { fileIo.writeSync(out.fd, bytes); } finally { fileIo.closeSync(out); } } finally { await pixels.release(); }
  } finally { await packer.release(); decoder.release(); fileIo.closeSync(input); }
  // 相机临时捕获文件由该调用独占；原图已保留。
  if (takePhoto) { const capture: string = directory + '/' + id + '-capture.jpg'; try { fileIo.unlinkSync(capture); } catch (_) {} }
  return photo;
 }
}
