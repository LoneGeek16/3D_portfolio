import { configured,getAuth } from '../lib/fitness/auth.js';
import { initializeDatabase,progressDatabase } from '../lib/fitness/database.js';
import { createFitnessService } from '../lib/fitness/service.js';
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function handleFitness(request){
 const url=new URL(request.url);
 const route=url.searchParams.get('route')||url.pathname.replace(/^\/api\/fitness\/?/,'');
 url.searchParams.delete('route');url.pathname='/api/fitness/'+route;
 const req=new Request(url,request);
 if(route==='health'){
  if(!configured())return json({configured:false,ready:false,whoopConfigured:false});
  try{await initializeDatabase();return json({configured:true,ready:true,whoopConfigured:!!(process.env.WHOOP_CLIENT_ID&&process.env.WHOOP_CLIENT_SECRET&&process.env.TOKEN_ENCRYPTION_KEY&&Buffer.from(process.env.TOKEN_ENCRYPTION_KEY,'base64').length===32)});}catch{return json({configured:true,ready:false,error:'Database connection or initialization failed.'},503)}
 }
 if(!configured())return json({error:'Cloud accounts are not configured yet. Browser progress remains available.'},503);
 try{
  await initializeDatabase();
  if(route.startsWith('auth/'))return await getAuth().handler(req);
  const session=await getAuth().api.getSession({headers:req.headers});
  const service=createFitnessService({DB:progressDatabase(),...process.env},session?.user?.id);
  return await service(req);
 }catch{return json({error:'The backend is temporarily unavailable. Export any unsaved progress and retry.'},503);}
}
export default {fetch:handleFitness};
