"""Adopt generated originals and derive bounded seamless PBR textures, preserving editable sources."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
dest=ROOT/'art-source/lobby3d/textures';dest.mkdir(exist_ok=True)
for key in ['wood','linen','seared-food']:
 original=dest/f'{key}-original.png';candidate=ROOT/f'work/generated-art/lobby3d/{key}-surface.png'
 if not original.exists():candidate.rename(original)
 im=Image.open(original).convert('RGB');w,h=im.size
 # Remove generated edge vignette and directional illumination before tiling.
 im=im.crop((int(w*.16),int(h*.16),int(w*.84),int(h*.84))).resize((512,512),Image.Resampling.LANCZOS)
 a=np.asarray(im,dtype=np.float32)/255
 illumination=np.asarray(im.filter(ImageFilter.GaussianBlur(40)),dtype=np.float32)/255
 a=np.clip(a/np.maximum(illumination,.08)*np.mean(illumination,axis=(0,1)),0,1)
 # Reflected quadrants give equal derivatives at wrap boundaries, no soft cross seam.
 a=np.concatenate((a,a[:,::-1]),axis=1);a=np.concatenate((a,a[::-1]),axis=0)
 albedo=Image.fromarray(np.uint8(a*255));albedo.save(dest/f'{key}-albedo.jpg',quality=93,subsampling=0)
 height=(a@np.array([.2126,.7152,.0722])).astype(np.float32)
 gy=(np.roll(height,-1,axis=0)-np.roll(height,1,axis=0))*.5
 gx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*.5
 n=np.stack((-gx*5,-gy*5,np.ones_like(gx)),axis=2);n/=np.linalg.norm(n,axis=2,keepdims=True)
 Image.fromarray(np.uint8((n*.5+.5)*255)).save(dest/f'{key}-normal.png',optimize=True)
 rough=np.clip((.66 if key=='wood' else .42 if key=='seared-food' else .91)+(height-height.mean())*.23,.4,.99)
 # glTF ORM: red occlusion=1, green roughness, blue metal=0.
 orm=np.stack((np.ones_like(rough),rough,np.zeros_like(rough)),axis=2)
 Image.fromarray(np.uint8(orm*255)).save(dest/f'{key}-orm.jpg',quality=93,subsampling=0)
 print(key,'adopted and seamless',1024,flush=True)
