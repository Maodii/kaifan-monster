import { Database } from '../src/database';
import { readFile } from 'node:fs/promises';
async function main(){const report=JSON.parse(await readFile('../work/reports/native-profile-smoke.json','utf8'));const email=report.testEmail;if(!/^native-profile-[a-f0-9]{32}@example\.test$/.test(email))throw new Error('Not an isolated native-test account');const db=new Database();try{const users=await db.query('DELETE FROM users u WHERE email=$1 AND NOT EXISTS(SELECT 1 FROM food_items f WHERE f.user_id=u.id) RETURNING id',[email]);console.log('Temporary native test accounts removed:',users.length);}finally{await db.onModuleDestroy();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
