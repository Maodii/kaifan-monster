import { Pool, PoolClient, QueryResultRow } from 'pg';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
@Injectable()
export class Database implements OnModuleDestroy {
 readonly pool = new Pool({host:process.env.PGHOST || '127.0.0.1',port:Number(process.env.POSTGRES_PORT||5432),user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,database:process.env.POSTGRES_DB,max:10,connectionTimeoutMillis:3000});
 async query<T extends QueryResultRow=QueryResultRow>(sql:string,values:unknown[]=[]):Promise<T[]> { return (await this.pool.query<T>(sql,values)).rows; }
 async transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T> {
  const c=await this.pool.connect();try { await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r; }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async onModuleDestroy():Promise<void>{await this.pool.end();}
}
