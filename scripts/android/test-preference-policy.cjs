const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),java='/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/',work=fs.mkdtempSync(path.join(root,'work/preference-policy-'));
const checks=[];try{
fs.writeFileSync(work+'/PreferenceHarness.java',`import com.kaifan.monster.PreferenceNames;public class PreferenceHarness{public static void main(String[] args){for(String name:args)System.out.println(PreferenceNames.allowed(name));}}`);
const compile=spawnSync(java+'javac',['-d',work,root+'/android/app/src/main/java/com/kaifan/monster/PreferenceNames.java',work+'/PreferenceHarness.java'],{encoding:'utf8'});assert.equal(compile.status,0,compile.stderr);
const names=['kaifan_privacy','shiku_settings','shiku_account_spaces','shiku_android_global','kaifan_other','../kaifan_privacy','shiku_','shiku_a/b'];
const run=spawnSync(java+'java',['-cp',work,'PreferenceHarness',...names],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.deepEqual(run.stdout.trim().split(/\r?\n/),['true','true','true','true','false','false','false','false']);checks.push('Actual native Java policy permits privacy and existing app stores, rejects arbitrary/path names');
const native=fs.readFileSync(root+'/android/app/src/main/java/com/kaifan/monster/MainActivity.java','utf8');assert(native.includes('PreferenceNames.allowed(name)'));checks.push('Android bridge uses the tested policy');
const {HostAdapter}=require('./host-adapter.cjs'),a=new HostAdapter();try{for(const [i,name] of names.entries()){const response=JSON.parse(a.invoke('prefGet',JSON.stringify({name,key:'version',fallback:''})));assert.equal(!!response.error,i>=4,name);}checks.push('Host bridge applies the same native namespace boundaries');}finally{a.close();}
const report={passed:true,checks,scope:'Compiled and executed production Java preference policy; not device SharedPreferences evidence'};fs.writeFileSync(root+'/work/reports/android-startup-v0918-native-policy.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{fs.rmSync(work,{recursive:true,force:true});}
