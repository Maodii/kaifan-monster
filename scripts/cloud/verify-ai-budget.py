#!/usr/bin/env python3
"""Exercise exact local Lua in cloud Redis, isolated keys only, no credentials returned."""
import json
from pathlib import Path
import re
import subprocess
root=Path(__file__).resolve().parents[2]
source=(root/'backend/src/assistant-budget.ts').read_text()
reserve=re.search(r'RESERVE_SCRIPT=`(.*?)`;',source,re.S).group(1)
settle=re.search(r'SETTLE_SCRIPT=`(.*?)`;',source,re.S).group(1)
node=r'''
const Redis=require('ioredis'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const redis=new Redis({host:process.env.REDIS_HOST,port:Number(process.env.REDIS_PORT),password:process.env.REDIS_PASSWORD,maxRetriesPerRequest:1,retryStrategy:()=>null});redis.on('error',()=>{});
let data='';process.stdin.on('data',x=>data+=x);process.stdin.on('end',async()=>{const {reserve,settle}=JSON.parse(data),prefix='ai:audit:'+randomUUID(),all=[];
function keys(owner,id,token){const k=['m:'+owner,'d:'+owner,'g','gm','active:'+owner,'seen:'+id,'r:'+token].map(x=>prefix+':'+x);all.push(...k);return k;}
const a=keys('a','req-a','ta'),b=keys('b','req-b','tb');let passed=false;
try{const take=(k,t)=>redis.eval(reserve,7,...k,t,JSON.stringify({limitsEnabled:true,perUserMinute:3,perUserDay:100,globalMinute:10,globalDay:500})),end=(k,t,charge=false,attempted=false)=>redis.eval(settle,7,...k,t,charge?'charge':'refund',attempted?'attempted':'not_attempted','limited');
const first=await Promise.all([take(a,'ta'),take(a,'ta')]);assert.equal(first.filter(x=>Number(x)===1).length,1);assert.equal(Number(await take(b,'tb')),1);
await end(a,'wrong');assert.equal(await redis.get(a[1]),'1');await end(a,'ta');await end(a,'ta');assert.equal(await redis.get(a[1]),'0');assert.equal(await redis.get(a[2]),'1');
assert.equal(Number(await take(a,'ta')),1);await end(a,'ta',true,true);assert.equal(Number(await take(a,'ta')),-2);
await end(b,'tb',false,true);assert.equal(await redis.get(b[1]),'0');assert.equal(await redis.get(a[2]),'2');
const c=keys('c','req-c','tc');await redis.set(c[1],100,'EX',60);assert.equal(Number(await take(c,'tc')),0);assert.equal(await redis.get(c[4]),null);assert.ok((await redis.ttl(a[5]))>0);const unlimited=JSON.stringify({limitsEnabled:false});
const many=Array.from({length:12},(_,i)=>keys('c','unlimited-'+i,'u'+i));
assert.deepEqual(await Promise.all(many.map((k,i)=>redis.eval(reserve,7,...k,'u'+i,unlimited))),Array(12).fill(1));
assert.equal(Number(await redis.eval(reserve,7,...many[0],'u0',unlimited)),-2);
await redis.eval(settle,7,...many[0],'u0','refund','not_attempted','unlimited');
assert.equal(await redis.get(c[1]),'100');
const daily=JSON.stringify({limitsEnabled:false,dailyLimitEnabled:true,perUserDay:50,unlimited:false});
const dayKeys=Array.from({length:60},(_,i)=>keys('daily-user','daily-'+i,'dt'+i));
const admitted=await Promise.all(dayKeys.map((k,i)=>redis.eval(reserve,7,...k,'dt'+i,daily)));
assert.equal(admitted.filter(x=>Number(x)===1).length,50);assert.equal(admitted.filter(x=>Number(x)===-3).length,10);
assert.equal(await redis.get(dayKeys[0][1]),'50');
await redis.eval(settle,7,...dayKeys[0],'dt0','refund','not_attempted','daily');
await redis.eval(settle,7,...dayKeys[0],'dt0','refund','not_attempted','daily');
assert.equal(await redis.get(dayKeys[0][1]),'49');
const retry=keys('daily-user','refunded-retry','retry');assert.equal(Number(await redis.eval(reserve,7,...retry,'retry',daily)),1);
const admin=keys('daily-user','admin-bypass','admin');assert.equal(Number(await redis.eval(reserve,7,...admin,'admin',JSON.stringify({limitsEnabled:true,dailyLimitEnabled:true,perUserDay:50,unlimited:true}))),1);
assert.equal(await redis.get(admin[1]),'50');
const other=keys('second-user','second','second');assert.equal(Number(await redis.eval(reserve,7,...other,'second',daily)),1);
passed=true;
}catch{process.exitCode=1;}finally{await redis.del(...new Set(all));await redis.quit();console.log(JSON.stringify({passed,isolated_keys_cleaned:true,real_model_calls:0,checks:17}));}});
'''
remote='import subprocess,json\npayload='+repr(json.dumps({'reserve':reserve,'settle':settle}))+'\nnode='+repr(node)+'\nr=subprocess.run(["docker","exec","-i","shiku-api-1","node","-e",node],input=payload,text=True,capture_output=True,timeout=20)\nprint(r.stdout.strip())\nraise SystemExit(r.returncode)\n'
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=35)
if r.returncode:raise SystemExit('Isolated cloud Redis verification failed; no credentials printed')
report=json.loads(r.stdout)
(root/'work/reports/server-ai-budget.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
