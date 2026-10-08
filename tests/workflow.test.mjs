import assert from 'node:assert/strict';
import { nextWorkflowStep } from '../lib/workflow.ts';
import { controlHelp } from '../lib/control-help.ts';
const ready={connected:true,contractConfigured:true,walletsReady:true,hasObligations:true,isMember:true,roomExists:false,settled:false,cancelled:false,expired:false,approved:false,allApproved:false,funded:false,requiresFunding:false,hasFunded:false};
const cases=[
 [{connected:false},'connect'],[{contractConfigured:false},'contract'],[{walletsReady:false},'participants'],[{hasObligations:false},'obligation'],[{isMember:false},'member'],[{},'create'],
 [{roomExists:true},'approve'],[{roomExists:true,approved:true},'wait-approvals'],
 [{roomExists:true,approved:true,allApproved:true,requiresFunding:true},'fund'],
 [{roomExists:true,approved:true,allApproved:true},'wait-funding'],
 [{roomExists:true,approved:true,allApproved:true,funded:true},'settle'],
 [{roomExists:true,settled:true},'done'],[{roomExists:true,cancelled:true,hasFunded:true},'refund'],[{roomExists:true,expired:true,hasFunded:true},'refund'],
 [{roomExists:true,cancelled:true},'closed'],[{roomExists:true,expired:true,isMember:false},'closed'],
 // Closed and settled states take precedence over empty drafts; no replay or new deposit action.
 [{settled:true,connected:false,contractConfigured:false},'done'],
 [{roomExists:true,cancelled:true,connected:false,hasFunded:false},'closed'],
];
for(const [patch,id] of cases){const step=nextWorkflowStep({...ready,...patch});assert.equal(step.id,id);assert(step.body.length>30);}
assert.match(controlHelp('Save workspace',{disabled:true}),/Database storage is unavailable/);
assert.match(controlHelp('Participant 2 wallet',{field:true}),/private key/);
assert.match(controlHelp('Fund with native USDC'),/exact net/);
assert.match(controlHelp('Settlement room1'),/loaded onchain room/);
assert.match(controlHelp('Remove Research',{disabled:true}),/locked/);
assert.match(controlHelp('Amount in USDC',{field:true}),/six decimal/);
console.log('Workflow guidance passed: draft prerequisites, member approvals, funding, settlement, closed-room recovery, and control explanations.');
