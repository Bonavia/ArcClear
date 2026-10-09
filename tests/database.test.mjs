import assert from 'node:assert/strict';
import { once } from 'node:events';
import { newDb } from 'pg-mem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createApiServer } from '../server/index.mjs';
import { migrate } from '../server/database.mjs';
// pg-mem does not track AST coverage for repeated CREATE TABLE IF NOT EXISTS.
const database = newDb({ noAstCoverageCheck: true }); const { Pool } = database.adapters.createPg(); const pool = new Pool();
await migrate(pool); await migrate(pool); // Schema setup is safe to repeat.
const { server } = createApiServer({ pool }); server.listen(0,'127.0.0.1'); await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const owner=privateKeyToAccount(generatePrivateKey()), other=privateKeyToAccount(generatePrivateKey());
let cookie='';
async function call(path,{method='GET',data,origin='http://localhost:5173',session=cookie}={}){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Origin:origin,...(session?{Cookie:session}:{})},...(data?{body:JSON.stringify(data)}:{})});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function login(wallet){
 const c=await call('/api/auth/challenge',{method:'POST',data:{address:wallet.address}});assert.equal(c.status,200);
 const signature=await wallet.signMessage({message:c.data.message});
 const verified=await call('/api/auth/verify',{method:'POST',data:{nonce:c.data.nonce,signature}});assert.equal(verified.status,200);cookie=verified.cookie;
 assert.equal((await call('/api/auth/verify',{method:'POST',data:{nonce:c.data.nonce,signature}})).status,401);
 return cookie;
}
try{
 assert.equal((await call('/api/health')).data.database,'connected');
 assert.equal((await call('/api/workspace')).status,401);
 assert.equal((await call('/api/auth/challenge',{method:'POST',origin:'https://untrusted.example',data:{address:owner.address}})).status,403);
 const challenge=await call('/api/auth/challenge',{method:'POST',data:{address:owner.address}});
 const wrong=await other.signMessage({message:challenge.data.message});
 assert.equal((await call('/api/auth/verify',{method:'POST',data:{nonce:challenge.data.nonce,signature:wrong}})).status,401);
 const ownerCookie=await login(owner);
 const draft={participants:[{id:'a',name:'A',address:owner.address,color:'#4361ee'},{id:'b',name:'B',address:other.address,color:'#f97352'}],obligations:[{id:'1',from:'a',to:'b',amount:'0.02',reference:'Test'}],network:'testnet',contract:'',roomId:null};
 const saved=await call('/api/workspace',{method:'PUT',data:{revision:0,data:draft}});assert.equal(saved.status,200);assert.equal(Number(saved.data.revision),1);
 assert.deepEqual((await call('/api/workspace')).data.workspace.data,draft);
 assert.equal((await call('/api/workspace',{method:'PUT',data:{revision:0,data:draft}})).status,409);
 assert.equal((await call('/api/workspace',{method:'PUT',data:{revision:1,data:{...draft,obligations:[{...draft.obligations[0],amount:'-5'}]}}})).status,400);
 const second=await call('/api/workspace',{method:'PUT',data:{revision:1,data:draft}});assert.equal(Number(second.data.revision),2);
 assert.equal((await call('/api/workspace',{method:'PUT',data:{revision:1,data:draft}})).status,409);
 await login(other);assert.equal((await call('/api/workspace')).data.workspace,null);
 assert.deepEqual((await call('/api/workspace',{session:ownerCookie})).data.workspace.data,draft);
 assert.equal((await call('/api/auth/logout',{method:'POST'})).status,200);
 assert.equal((await call('/api/workspace')).status,401);
 console.log('Database API passed: schema, wallet signatures, replay rejection, owner isolation, validation, conflict detection, logout. SQL emulation; external Aiven connection remains unverified.');
}finally{await new Promise(resolve=>server.close(resolve));await pool.end();}

// Environment loading must match documented precedence without leaking connection details.
const { loadServerEnvironment } = await import('../server/environment.mjs');
const { databaseIssue, createDatabase } = await import('../server/database.mjs');
const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'arcclear-env-'));
try {
 fs.writeFileSync(path.join(directory,'.env'),'DATABASE_URL=postgres://base.invalid/db\nAPI_PORT=8888\n');
 assert.equal(loadServerEnvironment(directory,{}).DATABASE_URL,'postgres://base.invalid/db');
 fs.writeFileSync(path.join(directory,'.env.local'),'DATABASE_URL=postgres://local.invalid/db\n');
 assert.equal(loadServerEnvironment(directory,{}).DATABASE_URL,'postgres://local.invalid/db');
 const env=loadServerEnvironment(directory,{DATABASE_URL:'postgres://process.invalid/db'});
 assert.equal(env.DATABASE_URL,'postgres://process.invalid/db'); assert.equal(env.API_PORT,'8888');
 const issue=databaseIssue({code:'EAI_AGAIN',message:'sensitive connection details'});
 assert.equal(issue.code,'EAI_AGAIN'); assert.ok(!issue.message.includes('sensitive'));
 assert.equal(databaseIssue({code:'unknown',message:'secret'}).code,'DATABASE_UNAVAILABLE');
 assert.throws(()=>createDatabase({DATABASE_URL:'invalid-secret'}),/valid PostgreSQL URL/);
 const unavailable=createApiServer({pool,initiallyReady:false}); unavailable.setReady(false,{code:'EAI_AGAIN'});
 unavailable.server.listen(0,'127.0.0.1'); await once(unavailable.server,'listening');
 try {const response=await fetch(`http://127.0.0.1:${unavailable.server.address().port}/api/health`);assert.equal(response.status,503); assert.equal((await response.json()).code,'EAI_AGAIN');}
 finally {await new Promise(resolve=>unavailable.server.close(resolve));}
 console.log('Environment precedence and sanitized database health diagnostics passed.');
} finally {fs.rmSync(directory,{recursive:true,force:true});}
