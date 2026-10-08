import assert from 'node:assert/strict';
import fs from 'node:fs';
import ganache from 'ganache';
import { createPublicClient, createWalletClient, custom, defineChain } from 'viem';
// Standard EVM configured with an Arc chain ID. Not a simulation of Arc's runtime blocklist.
const provider = ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 5 }, chain: { chainId: 5042002 } });
const chain = defineChain({ id: 5042002, name: 'Local Arc-ID simulation', nativeCurrency: { name: 'Simulation units', symbol: 'SIM', decimals: 18 }, rpcUrls: { default: { http: ['http://localhost'] } } });
const publicClient = createPublicClient({ chain, transport: custom(provider), cacheTime: 0 });
const wallets = (await provider.request({ method: 'eth_accounts', params: [] })).map(account => createWalletClient({ account, chain, transport: custom(provider) }));
const [a,b,c,outsider] = wallets;
const addresses = [a.account.address,b.account.address,c.account.address];
const unit = 10n ** 18n, scale = 10n ** 12n;
const artifact = name => JSON.parse(fs.readFileSync(`contracts/artifacts/${name}.json`,'utf8'));
const room = artifact('ArcClear'), receiver = artifact('TestParticipant');
async function deploy(art) { const hash = await a.deployContract({ ...art, args: [], gas:8_000_000n }); const r = await publicClient.waitForTransactionReceipt({hash});assert.equal(r.status,'success');return r.contractAddress; }
const address = await deploy(room), testReceiver = await deploy(receiver);
const balance = who => publicClient.getBalance({address:who});
const read = (fn,args=[]) => publicClient.readContract({address,abi:room.abi,functionName:fn,args});
async function write(wallet,target,abi,fn,args,value=0n) {
 const {request} = await publicClient.simulateContract({account:wallet.account,address:target,abi,functionName:fn,args,value});
 const hash = await wallet.writeContract({...request,gas:3_000_000n}); const r = await publicClient.waitForTransactionReceipt({hash});assert.equal(r.status,'success');return r;
}
const call = (w,fn,args,value=0n) => write(w,address,room.abi,fn,args,value);
const receiverCall = (fn,args) => write(a,testReceiver,receiver.abi,fn,args);
const future = async () => (await publicClient.getBlock()).timestamp + 3600n;
const create = async (members=addresses) => call(a,'createRoom',[members,[0,1,2],[1,2,0],[100_000_000n,90_000_000n,80_000_000n],await future()]);
const approve = async id => {for(const w of [a,b,c]) await call(w,'approveRoom',[id,true]);};
assert.equal(await read('VERSION'),2n); assert.equal(await read('NATIVE_SCALE'),scale);
await create();assert.deepEqual((await read('getRoom',[1n]))[1],[-20_000_000n,10_000_000n,10_000_000n]);
await assert.rejects(()=>call(outsider,'approveRoom',[1n,true]));
await assert.rejects(()=>call(a,'settle',[1n]));await assert.rejects(()=>call(a,'fund',[1n],20n*unit));
await approve(1n);
for(const wrong of [0n,20_000_000n,20n*unit-1n,20n*unit+1n]) await assert.rejects(()=>call(a,'fund',[1n],wrong));
await call(a,'fund',[1n],20n*unit);assert.equal(await balance(address),20n*unit);
await assert.rejects(()=>call(a,'fund',[1n],20n*unit));await assert.rejects(()=>call(b,'fund',[1n],10n*unit));
await assert.rejects(()=>call(b,'approveRoom',[1n,false]));
const bBefore=await balance(addresses[1]),cBefore=await balance(addresses[2]);
await call(outsider,'settle',[1n]);assert.equal(await balance(addresses[1]),bBefore+10n*unit);assert.equal(await balance(addresses[2]),cBefore+10n*unit);assert.equal(await balance(address),0n);
await assert.rejects(()=>call(a,'settle',[1n]));await assert.rejects(()=>call(a,'refund',[1n]));
// A rejecting receiver rolls back the preceding payout and completion flag.
const members=[addresses[0],addresses[1],testReceiver];await create(members);
for(const w of [a,b]) await call(w,'approveRoom',[2n,true]);await receiverCall('approve',[address,2n]);
await call(a,'fund',[2n],20n*unit);await receiverCall('configure',[address,2n,true,false]);
const beforeFailure=await balance(addresses[1]);
await assert.rejects(()=>call(outsider,'settle',[2n]));assert.equal(await balance(addresses[1]),beforeFailure);assert.equal((await read('getRoom',[2n]))[5],false);assert.equal(await balance(address),20n*unit);
// A successful receiver attempts a callback; the settlement cannot be reentered.
await receiverCall('configure',[address,2n,false,true]);await call(outsider,'settle',[2n]);
assert.equal(await publicClient.readContract({address:testReceiver,abi:receiver.abi,functionName:'reentrySucceeded'}),false);assert.equal(await balance(testReceiver),10n*unit);assert.equal(await balance(address),0n);
// Cancellation and room isolation.
await create();await create();for(const id of [3n,4n]){await approve(id);await call(a,'fund',[id],20n*unit);}
await assert.rejects(()=>call(a,'refund',[3n]));await call(b,'cancel',[3n]);
const beforeRefund=await balance(addresses[0]);const refund=await call(a,'refund',[3n]);
assert.equal(await balance(addresses[0]),beforeRefund+20n*unit-refund.gasUsed*refund.effectiveGasPrice);
await assert.rejects(()=>call(a,'refund',[3n]));assert.equal(await balance(address),20n*unit);await call(outsider,'settle',[4n]);assert.equal(await balance(address),0n);
// Expiry recovery.
await create();await approve(5n);await call(a,'fund',[5n],20n*unit);
await provider.request({method:'evm_increaseTime',params:[7200]});await provider.request({method:'evm_mine',params:[]});
await assert.rejects(()=>call(a,'settle',[5n]));await call(a,'refund',[5n]);assert.equal(await balance(address),0n);
const deadline=await future();
await assert.rejects(()=>call(a,'createRoom',[[addresses[0],addresses[0]],[0],[1],[1n],deadline]));
await assert.rejects(()=>call(a,'createRoom',[addresses,[0],[0],[1n],deadline]));await assert.rejects(()=>call(a,'createRoom',[addresses,[0],[1],[0n],deadline]));
// Fully offset cycle.
await call(a,'createRoom',[addresses,[0,1,2],[1,2,0],[10_000_000n,10_000_000n,10_000_000n],deadline]);await approve(6n);await call(outsider,'settle',[6n]);assert.equal(await balance(address),0n);
// Multiple net payers: partial funding cannot settle.
await call(a,'createRoom',[addresses,[0,1],[2,2],[30_000_000n,20_000_000n],deadline]);await approve(7n);await call(a,'fund',[7n],30n*unit);
const cBeforePartial=await balance(addresses[2]);await assert.rejects(()=>call(a,'settle',[7n]));assert.equal(await balance(addresses[2]),cBeforePartial);
await call(b,'fund',[7n],20n*unit);await call(outsider,'settle',[7n]);assert.equal(await balance(addresses[2]),cBeforePartial+50n*unit);assert.equal(await balance(address),0n);
// One micro-USDC transfers exactly 10^12 native base units; no rounding.
await call(a,'createRoom',[addresses,[0],[1],[1n],deadline]);await approve(8n);await call(a,'fund',[8n],scale);
const bBeforeTiny=await balance(addresses[1]);await call(outsider,'settle',[8n]);assert.equal(await balance(addresses[1]),bBeforeTiny+scale);
// The guided testnet plan uses 0.10 / 0.09 / 0.08 USDC obligations.
await call(a,'createRoom',[addresses,[0,1,2],[1,2,0],[100_000n,90_000n,80_000n],deadline]);
assert.deepEqual((await read('getRoom',[9n]))[1],[-20_000n,10_000n,10_000n]);
await approve(9n);await call(a,'fund',[9n],20_000n*scale);
const bBeforeGuided=await balance(addresses[1]), cBeforeGuided=await balance(addresses[2]);
await call(a,'settle',[9n]);
assert.equal(await balance(addresses[1]),bBeforeGuided+10_000n*scale);
assert.equal(await balance(addresses[2]),cBeforeGuided+10_000n*scale);
assert.equal((await read('getRoom',[9n]))[5],true);
assert.equal(await balance(address),0n);
// Deployment is rejected on a different chain ID (safety guard, not chain authentication).
const otherProvider=ganache.provider({logging:{quiet:true},chain:{chainId:1337}});
const otherAccount=(await otherProvider.request({method:'eth_accounts',params:[]}))[0];
const otherClient=createPublicClient({transport:custom(otherProvider)});
await assert.rejects(()=>otherClient.call({account:otherAccount,data:room.bytecode}));
await otherProvider.disconnect();await provider.disconnect();
console.log('Native-USDC contracts passed: conversion, consent, exact funding, atomic rollback, reentrancy, refunds, isolation, expiry, zero-net, multi-payer, and chain guard.');
