// One distributable source tree, shared by the two package builders. No extra source-art copies.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),esbuild=require(root+'/backend/node_modules/esbuild');
const src=root+'/prototypes/3d-lobby/native',out=root+'/work/lobby3d-bundle';
fs.mkdirSync(out+'/models',{recursive:true});
const previewReport=JSON.parse(fs.readFileSync(root+'/work/reports/lobby3d-cycles-previews.json','utf8'));
const blendHash=crypto.createHash('sha256').update(fs.readFileSync(root+'/art-source/lobby3d/detailed-spaces.blend')).digest('hex');
if(previewReport.status!=='complete'||previewReport.source_sha256!==blendHash)throw Error('Offline preview source is incomplete or stale');
fs.mkdirSync(out+'/previews',{recursive:true});
for(const name of ['meals','kitchen','pantry','community','profile']){
 const view=previewReport.renders.find(r=>r.view===name+'-full');if(!view?.camera_fit)throw Error('Preview missing projection fit: '+name);
 fs.copyFileSync(root+'/'+view.path,out+'/previews/'+name+'.png');
}

esbuild.buildSync({entryPoints:[src+'/runtime.js'],bundle:true,minify:true,format:'iife',target:['chrome90'],loader:{'.ets':'ts'},outfile:out+'/lobby.js',nodePaths:[root+'/prototypes/3d-lobby/node_modules'],legalComments:'eof'});
for(const file of ['index.html','lobby.css'])fs.copyFileSync(src+'/'+file,out+'/'+file);
fs.copyFileSync(root+'/client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf',out+'/hand.ttf');
for(const f of ['brand_monster.png','ui_today.png','ui_recipes.png','ui_pantry.png','ui_community.png','ui_profile.png'])fs.copyFileSync(root+'/client/entry/src/main/resources/base/media/'+f,out+'/'+f);
const {execFileSync}=require('child_process');
const compressionPath=root+'/work/reports/lobby3d-model-compression.json';
const shareTextures=require('./share-textures.cjs'),usedTextures=new Set();
const compressionOptions='cc-kn-km-ke-vpf-vtf-vn12';
const previous=fs.existsSync(compressionPath)?JSON.parse(fs.readFileSync(compressionPath)):{};const compressed={};
for(const f of ['meals','kitchen','pantry','community','profile']){
 const input=root+'/prototypes/3d-lobby/assets/'+f+'.glb',output=out+'/models/'+f+'.glb';
 const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
 if(!fs.existsSync(output)||previous[f]?.sourceHash!==sourceHash||previous[f]?.compressionOptions!==compressionOptions){
  execFileSync(process.execPath,[root+'/prototypes/3d-lobby/node_modules/gltfpack/cli.js','-i',input,'-o',output,'-cc','-kn','-km','-ke','-vpf','-vtf','-vn','12'],{stdio:'inherit'});
 }
 for(const uri of shareTextures(output,out+'/textures'))usedTextures.add(path.basename(uri));
 compressed[f]={sourceHash,compressionOptions,sourceBytes:fs.statSync(input).size,packagedBytes:fs.statSync(output).size,topologySimplification:false};
}
// Only remove this builder's obsolete hashed texture payloads after all five references are known.
for(const name of fs.readdirSync(out+'/textures'))if(/^[0-9a-f]{24}\.(png|jpg|webp)$/.test(name)&&!usedTextures.has(name))fs.unlinkSync(out+'/textures/'+name);
fs.writeFileSync(compressionPath,JSON.stringify(compressed,null,2)+'\n');
fs.copyFileSync(root+'/prototypes/3d-lobby/node_modules/three/LICENSE',out+'/THREE-LICENSE.txt');
fs.copyFileSync(root+'/prototypes/3d-lobby/node_modules/gltfpack/LICENSE.md',out+'/MESHOPT-LICENSE.txt');
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else files.push({path:path.relative(out,file),bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})}}walk(out);
fs.writeFileSync(root+'/work/reports/lobby3d-native-assets.json',JSON.stringify({generatedAt:new Date().toISOString(),files,totalBytes:files.reduce((n,f)=>n+f.bytes,0)},null,2)+'\n');
console.log('Bundled offline lobby:',files.length,'files',files.reduce((n,f)=>n+f.bytes,0),'bytes');
