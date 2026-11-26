#!/usr/bin/env python3
"""One-time conservative migration of legacy day counters; no user contents/IDs output."""
import json
from pathlib import Path
import subprocess
node=r'''
const Redis=require('ioredis'),{createHash}=require('node:crypto');
const r=new Redis({host:process.env.REDIS_HOST,port:Number(process.env.REDIS_PORT),password:process.env.REDIS_PASSWORD,maxRetriesPerRequest:1,retryStrategy:()=>null});r.on('error',()=>{});
(async()=>{const now=new Date(),utc=now.toISOString().slice(0,10),day=new Date(now.getTime()+8*3600000).toISOString().slice(0,10),prefix='ai:day:'+utc+':',marker='ai:v2:migrated:'+day;
const pairs=[];let cursor='0';do{const page=await r.scan(cursor,'MATCH',prefix+'*','COUNT',100);cursor=page[0];for(const key of page[1]){const n=Number(await r.get(key)||0);if(n>0){const owner=key.slice(prefix.length);pairs.push(['ai:v2:day:'+day+':'+createHash('sha256').update(owner).digest('hex'),n]);}}}while(cursor!=='0');
const g=Number(await r.get('ai:global:day:'+utc)||0);pairs.push(['ai:v2:global:day:'+day,g]);
const script="if redis.call('EXISTS',KEYS[1])==1 then return 0 end; for i=2,#KEYS do local n=tonumber(ARGV[i-1]);if n>0 then redis.call('INCRBY',KEYS[i],n);redis.call('EXPIRE',KEYS[i],172800) end end;redis.call('SET',KEYS[1],'done','EX',172800);return 1";
const applied=Number(await r.eval(script,pairs.length+1,marker,...pairs.map(x=>x[0]),...pairs.map(x=>x[1])))===1;
console.log(JSON.stringify({passed:true,applied,legacy_day:utc,business_day:day,positive_user_counters:pairs.length-1,global_attempts_preserved:g,privacy:'counters only; no identifiers emitted'}));await r.quit();})().catch(()=>{console.log(JSON.stringify({passed:false}));r.disconnect();process.exitCode=1;});
'''
remote='import subprocess\nnode='+repr(node)+'\nr=subprocess.run(["docker","exec","shiku-api-1","node","-e",node],capture_output=True,text=True,timeout=20)\nprint(r.stdout.strip());raise SystemExit(r.returncode)\n'
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=35)
if r.returncode:raise SystemExit('Legacy budget migration failed; credentials not printed')
report=json.loads(r.stdout)
p=Path(__file__).resolve().parents[2]/'work/reports/server-ai-budget-migration.json';p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
