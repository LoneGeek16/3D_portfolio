import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
let pool;
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('Database is not configured');
 if(!pool)pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
 return pool;
}
let initialization;
export async function initializeDatabase(){
 if(!initialization)initialization=(async()=>{
  const client=await database().connect();
  try{await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(84112612)");const sql=await readFile(resolve(process.cwd(),'lib/fitness/schema.sql'),'utf8');await client.query(sql);await client.query('COMMIT');}
  catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 })().catch(e=>{initialization=undefined;throw e});
 return initialization;
}
// Adapt the tested persistence operations to parameterized Postgres queries.
export function queryAdapter(pool){
 return {
  prepare(sql){
   let n=0; const query=sql.replace(/\?/g,()=>'$'+(++n));
   return {
    bind(...values){
     return {
      async first(){return (await pool.query(query,values)).rows[0]??null},
      async run(){return {meta:{changes:(await pool.query(query,values)).rowCount}}}
     };
    }
   };
  }
 };
}
export function progressDatabase(){return queryAdapter(database())}
