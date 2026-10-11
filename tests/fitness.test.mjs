import {queryAdapter} from '../lib/fitness/database.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createAuth} from '../lib/fitness/auth.js';
import {createFitnessService} from '../lib/fitness/service.js';
import {handleFitness} from '../api/personalfit.js';
const origin='https://fitness.example.test';
const memory=new PGlite();
await memory.exec(await readFile(new URL('../lib/fitness/schema.sql',import.meta.url),'utf8'));
const pool={
 async query(text,values=[]){const r=await memory.query(text,values);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length}},
 async connect(){return {query:(text,values)=>pool.query(text,values),release(){}}},
 async end(){await memory.close()}
};
const DB=queryAdapter(pool);
const auth=createAuth(pool,{SITE_ORIGIN:origin,BETTER_AUTH_SECRET:'test-only-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
const request=(path,method='GET',body,originHeader=origin)=>new Request(origin+'/api/fitness/'+path,{method,headers:{origin:originHeader,'Content-Type':'application/json','x-vercel-forwarded-for':'192.0.2.10'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
const base={start:'2026-10-12',week:1,done:{},notes:{},profile:'',checks:{},winter:{start:'2026-10-12',week:1,diet:'veg',done:{},notes:{}}};
let userA,userB;
test('email/password creates a secure session; unauthenticated requests have no session',async()=>{
 const signup=await auth.handler(request('auth/sign-up/email','POST',{name:'Player A',email:'a@example.test',password:'test-password-123456'}));
 assert.equal(signup.status,200,await signup.text());
 const cookies=signup.headers.getSetCookie();assert(cookies.some(x=>x.includes('HttpOnly')&&x.includes('Secure')));
 const cookie=cookies.map(x=>x.split(';')[0]).join('; ');
 const session=await auth.api.getSession({headers:new Headers({cookie})});assert.equal(session.user.email,'a@example.test');userA=session.user.id;
 assert.equal(await auth.api.getSession({headers:new Headers({'oai-authenticated-user-id':userA})}),null);
 const second=await auth.handler(request('auth/sign-up/email','POST',{name:'Player B',email:'b@example.test',password:'test-password-123456'}));assert.equal(second.status,200);userB=(await second.json()).user.id;
 const signIn=await auth.handler(request('auth/sign-in/email','POST',{email:'a@example.test',password:'test-password-123456'}));assert.equal(signIn.status,200);
 const csrf=await auth.handler(request('auth/sign-in/email','POST',{email:'a@example.test',password:'test-password-123456'},'https://attacker.test'));assert.equal(csrf.status,403);
 const bad=await auth.handler(request('auth/sign-in/email','POST',{email:'a@example.test',password:'wrong-password-123'}));assert.equal(bad.status,401);
});
test('progress validates input, scopes users, detects stale writes, and deletes only the owner',async()=>{
 assert(userA&&userB);
 const a=createFitnessService({DB,SITE_ORIGIN:origin},userA),b=createFitnessService({DB,SITE_ORIGIN:origin},userB),anon=createFitnessService({DB,SITE_ORIGIN:origin});
 assert.equal((await anon(request('progress'))).status,401);
 assert.equal((await a(request('progress','PUT',{state:base,version:0},'https://attacker.test'))).status,403);
 assert.equal((await a(request('progress','PUT',{state:{...base,winter:{...base.winter,week:13}},version:0}))).status,400);
 assert.equal((await a(request('progress','PUT',{state:base,version:0}))).status,200);
 assert.deepEqual(await (await b(request('progress'))).json(),{state:null,version:0});
 const updated={...base,profile:'private notes'};
 assert.equal((await a(request('progress','PUT',{state:updated,version:1}))).status,200);
 assert.equal((await a(request('progress','PUT',{state:base,version:1}))).status,409);
 assert.equal((await (await a(request('progress'))).json()).state.profile,'private notes');
 assert.equal((await b(request('progress','DELETE',{}))).status,200);
 assert.equal((await (await a(request('progress'))).json()).version,2);
 assert.equal((await a(request('progress','DELETE',{}))).status,200);
 assert.equal((await (await a(request('progress'))).json()).version,0);
});
test('WHOOP state is user/nonce bound, single-use, and tokens are encrypted',async()=>{
 const originalFetch=globalThis.fetch;let tokenCalls=0;
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://api.prod.whoop.com/oauth/oauth2/token');assert.equal(options.method,'POST');tokenCalls++;return Response.json({access_token:'whoop-secret-access',refresh_token:'whoop-secret-refresh',expires_in:3600})};
 try{
 const settings={DB,SITE_ORIGIN:origin,WHOOP_CLIENT_ID:'test-client',WHOOP_CLIENT_SECRET:'test-secret',TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')};
 const a=createFitnessService(settings,userA),b=createFitnessService(settings,userB);
 const connect=await a(request('whoop/connect','POST',{}));assert.equal(connect.status,200);
 const link=new URL((await connect.json()).url);const state=link.searchParams.get('state');assert(state.length>=32);
 const cookie=connect.headers.get('set-cookie').split(';')[0];
 const callback=()=>new Request(origin+'/api/fitness/whoop/callback?state='+encodeURIComponent(state)+'&code=code',{headers:{cookie}});
 assert.match((await b(callback())).headers.get('location'),/failed/);assert.equal(tokenCalls,0);
 assert.match((await a(callback())).headers.get('location'),/connected/);assert.equal(tokenCalls,1);
 assert.match((await a(callback())).headers.get('location'),/failed/);assert.equal(tokenCalls,1);
 const row=(await pool.query('SELECT tokens FROM fitness_whoop WHERE user_id=$1',[userA])).rows[0];assert(!row.tokens.includes('whoop-secret'));
 const status=await (await a(request('whoop/status'))).json();assert.equal(status.connected,true);assert(!('tokens' in status));
 assert.equal((await (await b(request('whoop/status'))).json()).connected,false);
 }finally{globalThis.fetch=originalFetch}
});
test('WHOOP sync refreshes expired credentials and failed revocation preserves the connection',async()=>{
 const originalFetch=globalThis.fetch;let refreshes=0,failRevocation=true;
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('/oauth/oauth2/token')){refreshes++;return Response.json({access_token:'rotated-access',refresh_token:'rotated-refresh',expires_in:3600})}
  if(options.method==='DELETE')return new Response(null,{status:failRevocation?500:204});
  return Response.json({records:[{id:'recent',score_state:'SCORED',score:{strain:4}}]});
 };
 try{
  const key=Buffer.alloc(32,7);const iv=crypto.getRandomValues(new Uint8Array(12));const aes=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
  const value={access_token:'old-access',refresh_token:'old-refresh',expires_at:0};
  const encrypted=Buffer.from(iv).toString('base64')+'.'+Buffer.from(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify(value)))).toString('base64');
  await pool.query('UPDATE fitness_whoop SET tokens=$1 WHERE user_id=$2',[encrypted,userA]);
  const a=createFitnessService({DB,SITE_ORIGIN:origin,WHOOP_CLIENT_ID:'test-client',WHOOP_CLIENT_SECRET:'test-secret',TOKEN_ENCRYPTION_KEY:key.toString('base64')},userA);
  assert.equal((await a(request('whoop/sync','POST',{}))).status,200);assert.equal(refreshes,1);
  const status=await (await a(request('whoop/status'))).json();assert.equal(status.snapshot.workouts.length,1);
  assert.equal((await a(request('whoop/disconnect','POST',{}))).status,502);
  assert.equal((await (await a(request('whoop/status'))).json()).connected,true);
  failRevocation=false;assert.equal((await a(request('whoop/disconnect','POST',{}))).status,200);
  assert.equal((await (await a(request('whoop/status'))).json()).connected,false);
 }finally{globalThis.fetch=originalFetch}
});
test('without production configuration health is explicit and backend fails closed',async()=>{
 assert.equal(process.env.DATABASE_URL,undefined);
 const health=await handleFitness(request('health'));assert.equal((await health.json()).ready,false);
 assert.equal((await handleFitness(request('progress'))).status,503);
});
