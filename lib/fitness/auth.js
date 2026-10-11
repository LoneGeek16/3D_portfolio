import { betterAuth } from 'better-auth';
import { database } from './database.js';
let auth;
export function configured(){try{return !!(process.env.DATABASE_URL&&process.env.BETTER_AUTH_SECRET?.length>=32&&new URL(process.env.SITE_ORIGIN).protocol==='https:'&&new URL(process.env.SITE_ORIGIN).origin===process.env.SITE_ORIGIN)}catch{return false}}
export function getAuth(){
 if(!configured())throw new Error('Account backend is not configured');
 if(!auth)auth=createAuth(database(),process.env);
 return auth;
}
export function createAuth(pool,settings){return betterAuth({
  database:pool,secret:settings.BETTER_AUTH_SECRET,
  baseURL:settings.SITE_ORIGIN,basePath:'/api/fitness/auth',
  trustedOrigins:[settings.SITE_ORIGIN],
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128},
  user:{modelName:'fitness_user'},session:{modelName:'fitness_session'},
  account:{modelName:'fitness_account'},verification:{modelName:'fitness_verification'},
  advanced:{useSecureCookies:true,ipAddress:{ipAddressHeaders:["x-vercel-forwarded-for"]}},
  rateLimit:{enabled:true,storage:'database',modelName:'fitness_rate_limit',window:60,max:30}
 });
}
