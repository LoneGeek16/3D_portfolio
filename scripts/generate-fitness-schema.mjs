import { getAuthTables } from 'better-auth/db';
import { writeFile } from 'node:fs/promises';
const tables=getAuthTables({user:{modelName:'fitness_user'},session:{modelName:'fitness_session'},account:{modelName:'fitness_account'},verification:{modelName:'fitness_verification'},rateLimit:{storage:'database',modelName:'fitness_rate_limit'}});
const quote=x=>'"'+x.replaceAll('"','""')+'"';
let sql='-- Auth schema generated from the installed Better Auth version.\n';
for(const table of Object.values(tables)){
 const fields=['id TEXT PRIMARY KEY'];
 for(const [key,f] of Object.entries(table.fields)){
  let part=quote(f.fieldName||key)+' '+({string:'TEXT',boolean:'BOOLEAN',date:'TIMESTAMPTZ',number:f.bigint?'BIGINT':'INTEGER'}[f.type]);
  if(f.required)part+=' NOT NULL';if(f.unique)part+=' UNIQUE';
  if(f.references)part+=' REFERENCES '+quote(tables[f.references.model].modelName)+'('+quote(f.references.field)+') ON DELETE CASCADE';
  fields.push(part);
 }
 sql+='CREATE TABLE IF NOT EXISTS '+quote(table.modelName)+' (\n  '+fields.join(',\n  ')+'\n);\n';
 for(const [key,f] of Object.entries(table.fields))if(f.index)sql+='CREATE INDEX IF NOT EXISTS '+quote(table.modelName+'_'+key+'_idx')+' ON '+quote(table.modelName)+'('+quote(f.fieldName||key)+');\n';
}
sql+=`\nCREATE TABLE IF NOT EXISTS fitness_progress (
 user_id TEXT PRIMARY KEY REFERENCES fitness_user(id) ON DELETE CASCADE,
 data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE IF NOT EXISTS fitness_whoop (
 user_id TEXT PRIMARY KEY REFERENCES fitness_user(id) ON DELETE CASCADE,
 tokens TEXT NOT NULL, snapshot TEXT, synced_at TEXT, lock_until BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fitness_oauth_state (
 state TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES fitness_user(id) ON DELETE CASCADE,
 nonce TEXT NOT NULL, expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS fitness_oauth_expiry ON fitness_oauth_state(expires);
`;
await writeFile(new URL('../lib/fitness/schema.sql',import.meta.url),sql);
console.log('Generated namespaced fitness and account tables.');
