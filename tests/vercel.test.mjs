import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {newDb} from 'pg-mem';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {createVercelHandler} from '../server/vercel.mjs';
const db=newDb({noAstCoverageCheck:true});const {Pool}=db.adapters.createPg();const pool=new Pool();
const handler=createVercelHandler({pool,env:{VERCEL_URL:'arcclear-preview.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'arcclear-example.vercel.app'}});
const server=http.createServer(async(req,res)=>{
 // Emulate Vercel's parsed JSON bodies and rewrite query.
 if(req.method==='POST') {const chunks=[];for await(const x of req)chunks.push(x);req.body=JSON.parse(Buffer.concat(chunks).toString());}
 return handler(req,res);
});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
try {
 const health=await fetch(base+'/api/index?route=health');assert.equal(health.status,200);assert.equal((await health.json()).database,'connected');
 const wallet=privateKeyToAccount(generatePrivateKey());const origin='https://arcclear-example.vercel.app';
 const challenge=await fetch(base+'/api/index?route=auth/challenge',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({address:wallet.address})});assert.equal(challenge.status,200);const data=await challenge.json();
 const signature=await wallet.signMessage({message:data.message});
 const verified=await fetch(base+'/api/index?route=auth/verify',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({nonce:data.nonce,signature})});assert.equal(verified.status,200);assert.ok(verified.headers.get('set-cookie').includes('; Secure'));
 const rejected=await fetch(base+'/api/index?route=auth/challenge',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify({address:wallet.address})});assert.equal(rejected.status,403);
 console.log('Vercel adapter passed: cold-start schema initialization, rewritten API paths, parsed request bodies, wallet sign-in, secure cookies, and origin rejection.');
}finally{await new Promise(resolve=>server.close(resolve));await pool.end();}
