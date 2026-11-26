export class PhotoCell {x:number=0;y:number=0;width:number=0;height:number=0;constructor(x:number,y:number,width:number,height:number){this.x=x;this.y=y;this.width=width;this.height=height;}}
export function photoLayout(count:number,size:number=1200,gap:number=12):PhotoCell[]{
 if(!Number.isInteger(count)||count<1||count>4||size<100||size>1600){throw new Error('照片拼图支持1至4张');}
 const half:number=(size-gap)/2;
 if(count===1){return [new PhotoCell(0,0,size,size)];}
 if(count===2){return [new PhotoCell(0,0,half,size),new PhotoCell(half+gap,0,half,size)];}
 if(count===3){return [new PhotoCell(0,0,half,half),new PhotoCell(half+gap,0,half,half),new PhotoCell(0,half+gap,size,half)];}
 return [new PhotoCell(0,0,half,half),new PhotoCell(half+gap,0,half,half),new PhotoCell(0,half+gap,half,half),new PhotoCell(half+gap,half+gap,half,half)];
}
