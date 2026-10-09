export type WorkflowInput = {
  connected: boolean; contractConfigured: boolean; walletsReady: boolean; hasObligations: boolean;
  isMember: boolean; roomExists: boolean; settled: boolean; cancelled: boolean; expired: boolean;
  approved: boolean; allApproved: boolean; funded: boolean; requiresFunding: boolean; hasFunded: boolean;
};
export function nextWorkflowStep(s: WorkflowInput) {
  if (s.settled) return { id: 'done', step: 4, title: 'Settlement complete', body: 'The room is settled. Open the transaction in the explorer to verify payouts.', label: 'Settlement confirmed', disabled: true };
  if (s.cancelled || s.expired) {
    if (s.isMember && s.hasFunded) return { id: 'refund', step: 4, title: 'Recover your deposit', body: 'This room is closed. The connected payer can reclaim its own deposit with a wallet transaction.', label: 'Reclaim my deposit' };
    return { id: 'closed', step: 4, title: s.cancelled ? 'Room cancelled' : 'Room expired', body: 'This room cannot settle. Funded payers can switch to their wallet and reclaim deposits. Start a new draft to try again.', label: 'Room closed', disabled: true };
  }
  if (!s.connected) return { id: 'connect', step: 1, title: 'Connect your wallet', body: 'Connect an Ethereum-compatible browser wallet. Each participant needs a separate wallet address and USDC for gas.', label: 'Connect to Arc' };
  if (!s.contractConfigured) return { id: 'contract', step: 2, title: 'Deployment not configured', body: 'The site operator must configure the Arc network and ArcClear v2 contract in the environment before rooms can be created.', label: 'Configuration required', disabled: true };
  if (!s.roomExists && !s.walletsReady) return { id: 'participants', step: 3, title: 'Assign participant wallets', body: 'Every participant needs a valid, different wallet address. Names are display labels; the addresses control approvals and payouts.', label: 'Assign participant wallets' };
  if (!s.roomExists && !s.hasObligations) return { id: 'obligation', step: 3, title: 'Add an agreed obligation', body: 'Choose who owes whom, the USDC amount, and a reference. Review the complete plan before creating an immutable onchain room.', label: 'Add first obligation' };
  if (!s.isMember) return { id: 'member', step: 3, title: 'Use a participant wallet', body: 'The connected wallet is not a member of this plan. Switch to a listed account in your wallet, or edit participant wallets before creation.', label: 'Review participant wallets' };
  if (!s.roomExists) return { id: 'create', step: 3, title: 'Create the onchain room', body: 'Creation locks the participants, obligations, and deadline. It needs gas but does not automatically approve or fund the plan.', label: 'Create onchain room' };
  if (!s.approved) return { id: 'approve', step: 3, title: 'Approve with this participant', body: 'Check the immutable plan, then confirm approval in your wallet. Every member must approve independently.', label: 'Approve settlement plan' };
  if (!s.allApproved) return { id: 'wait-approvals', step: 3, title: 'Collect the remaining approvals', body: 'Share the room with the other members, or switch accounts to test. Their confirmations appear here automatically every five seconds.', label: 'Refresh approvals' };
  if (s.requiresFunding && !s.hasFunded) return { id: 'fund', step: 4, title: 'Fund your exact net payment', body: 'Send only the connected payer’s net balance as native USDC. The wallet also charges USDC gas; no token allowance is needed.', label: 'Fund with native USDC' };
  if (!s.funded) return { id: 'wait-funding', step: 4, title: 'Waiting for net payers', body: 'Every net payer must fund their own amount. Receivers do not deposit. Switch to a payer wallet or wait for the shared room to refresh.', label: 'Refresh funding' };
  return { id: 'settle', step: 4, title: 'Settle all payouts together', body: 'Approvals and deposits are complete. A participant submits settlement; all receiver payouts succeed together or revert together.', label: 'Settle on Arc' };
}
