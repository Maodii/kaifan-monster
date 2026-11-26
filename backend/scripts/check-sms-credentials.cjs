// Read-only provider check. Never print credentials, provider messages or response models.
const fs=require('fs');
const {default:Client,QueryGateVerifyBillingPublicRequest}=require('@alicloud/dypnsapi20170525');
const {Config}=require('@alicloud/openapi-client');
const {RuntimeOptions}=require('@darabonba/typescript');
async function main(){
 let id=process.env.ALIYUN_ACCESS_KEY_ID,secret=process.env.ALIYUN_ACCESS_KEY_SECRET;
 if(process.argv[2]){const lines=fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);const values=lines[1].split(',').map(v=>v.trim().replace(/^"|"$/g,''));[id,secret]=values;}
 if(!id||!secret)throw Error('credentials_missing');
 const client=new Client(new Config({accessKeyId:id,accessKeySecret:secret,endpoint:'dypnsapi.aliyuncs.com',regionId:'cn-hangzhou'}));
 try{const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date()).replace(/[^0-9]/g,'');const r=await client.queryGateVerifyBillingPublicWithOptions(new QueryGateVerifyBillingPublicRequest({authenticationType:4,month:date}),new RuntimeOptions({autoretry:false,connectTimeout:5000,readTimeout:10000}));const code=r.body?.code;const report={action:'QueryGateVerifyBillingPublic',credentialAccepted:code==='OK'||code==='200',code:/^[A-Za-z0-9_.-]{1,100}$/.test(code||'')?code:'unknown',smsSent:0};console.log(JSON.stringify(report));if(code!=='OK'&&code!=='200')process.exitCode=1;}catch(e){console.log(JSON.stringify({credentialAccepted:false,code:/^[A-Za-z0-9_.-]{1,100}$/.test(e.code||'')?e.code:'network_or_provider_error',smsSent:0}));process.exitCode=1;}
}
main().catch(()=>{console.log('Credential check unavailable; secrets withheld');process.exitCode=1;});
