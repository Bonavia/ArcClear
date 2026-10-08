export const CONTROL_HELP: Record<string, string> = {
  'Settlement room': 'Open the current live settlement draft or loaded onchain room.',
  'Receipts': 'View settlement receipts stored in this browser. Open their explorer links to verify transactions.',
  'Participants': 'Edit participant names and wallet addresses before creation. Created room members cannot be changed.',
  'How clearing works': 'Open the full usage guide, glossary, and troubleshooting help.',
  'User guide': 'Open step-by-step instructions for every action, wallet signing, storage, and recovery.',
  'New room': 'Start an empty local draft. This does not cancel, refund, or delete an existing room on Arc.',
  'Load workspace': 'Sign in with your wallet and load its saved PostgreSQL draft. This replaces your current local draft.',
  'Save workspace': 'Sign in and save this wallet’s draft and room reference to PostgreSQL. It does not submit an Arc transaction.',
  'Use 0.02 USDC test plan': 'Replace the editable draft with three Testnet obligations totaling 0.27 USDC. Assign three unique wallets; the payer funds 0.02 USDC plus gas.',
  'Connect to Arc': 'Approve wallet connection and adding or switching to the selected Arc network. Connection does not transfer funds.',
  'Connect wallet': 'Connect the selected browser wallet account. Switch accounts in your wallet to act as another participant.',
  'Get test USDC ↗': 'Open Circle’s faucet. Choose Arc Testnet and fund every test participant for gas, including receivers.',
  'Deploy with wallet': 'Deploy the current ArcClear v2 contract on Arc Testnet. Confirm the deployment transaction and its gas fee in your wallet.',
  'Contract setup': 'Choose the Arc network, enter a v2 contract address, set the deadline, or load an existing room ID.',
  'Set up contract': 'Deploy a Testnet contract or enter an existing v2 address. No approval or deposit happens during setup.',
  'Assign participant wallets': 'Set a unique nonzero wallet for each participant. The creator must use one of these accounts.',
  'Review participant wallets': 'Check the member addresses, then choose one of those accounts in your browser wallet.',
  'Participant wallets': 'Manage the addresses that approve the plan, pay net balances, and receive payouts.',
  'Share room': 'Copy a link containing the network, contract, and room ID. Members load the same onchain plan; localhost links need a local server on each computer.',
  'Original': 'Show every agreed obligation before netting. This view does not change the room or send a transaction.',
  'Optimized': 'Show net payment routes after offsetting obligations. The contract pools deposits and pays receivers; graph routes are explanatory.',
  'Export plan': 'Download the plan, wallet addresses, amounts, and room reference as JSON. Exporting does not sign or pay anything.',
  'Add obligation': 'Add an agreed debt to the editable draft. Created onchain obligations cannot be edited.',
  'Add first obligation': 'Choose a payer, receiver, positive USDC amount, and reference to start the draft.',
  'Create onchain room': 'Submit the immutable plan and deadline to Arc. The creator pays gas; creation does not approve or fund the room.',
  'Configure Arc contract': 'Open contract setup to deploy or select a contract for this network.',
  'Approve settlement plan': 'Approve the entire immutable plan with the connected member’s wallet. This costs gas but transfers no settlement principal.',
  'Connect participant wallet': 'Choose a wallet account whose address is listed in this room. Each member approves independently.',
  'Refresh approvals': 'Read current approvals from Arc. No wallet signature or gas is needed.',
  'Refresh funding': 'Read current deposits from Arc. Each payer funds their own amount; receivers do not deposit.',
  'Fund with native USDC': 'Deposit the connected payer’s exact net USDC amount, plus separate gas. Deposits are recoverable after cancellation or expiry.',
  'Settle on Arc': 'Confirm one transaction that pays all net receivers atomically. All approvals and payer deposits must be complete.',
  'Waiting for net funding': 'A net payer still needs to deposit. Receivers cannot fund on a payer’s behalf.',
  'Reclaim my deposit': 'After cancellation or expiry, send a refund transaction from the wallet that deposited. Each payer claims its own refund.',
  'Refresh': 'Read the latest room state from Arc without signing a transaction. Live rooms also refresh every five seconds.',
  'Cancel room': 'Permanently close this unsettled room with a member transaction. Payers must reclaim their deposits individually afterward.',
  'View latest transaction': 'Open the submitted transaction in the selected network’s explorer. A submitted hash alone does not mean confirmation.',
  'View transaction': 'Verify transaction status, sender, contract, and payouts in the Arc explorer.',
  'How does netting work?': 'Open the guide explaining obligations, net funding, and atomic settlement.',
  'Back to room': 'Return to the current live draft or onchain room.',
  'Open settlement room': 'Open the live workflow to create or load a room.',
  'Use wallet': 'Assign the currently selected browser-wallet account to this participant. Switch accounts first to assign a different member.',
  'Add participant': 'Add a member to the draft. Rooms support 2–10 members; each needs a different wallet.',
  'Done': 'Close participant editing. Draft changes are local until you save or create the room.',
  'Load room from Arc': 'Read a room using this network, contract, and ID. Its immutable obligations replace the current draft.',
  'Save setup': 'Keep the network, contract, and deadline for this draft. This does not deploy or send a transaction.',
  'Arc network reference': 'Open Circle’s official network reference to check Arc chain IDs, RPC URLs, and native USDC details.',
  'Got it': 'Close this guide and return to the live workflow.',
  'Close dialog': 'Close this dialog without submitting a transaction.',
  'Dismiss notification': 'Hide this status message; it does not undo the completed action.',
  'Dismiss error': 'Hide this error. Correct the cause and retry the action when ready.',
};
export function controlHelp(label: string, { disabled = false, field = false, busy = false }: { disabled?: boolean; field?: boolean; busy?: boolean } = {}) {
  const text = label.trim().replace(/\s+/g, ' ');
  const normalized = text.replace(/^(Settlement room|Receipts|Participants)\s*\d+$/, '$1');
  let help = CONTROL_HELP[normalized] ?? '';
  if (text === 'ArcClear.') help = 'Return to ArcClear. The current draft is stored in this browser; this does not cancel any room on Arc.';
  if (/^Deploy new testnet contract/.test(text)) help = CONTROL_HELP['Deploy with wallet'];
  if (/^Remove /.test(text)) help = field ? '' : 'Remove this item from the editable draft. A participant must not be used in obligations, and at least two participants must remain.';
  if (/^Participant \d+ name/.test(text)) help = 'Local display name, up to 24 characters. A name does not verify identity; the wallet address controls onchain actions.';
  if (/^Participant \d+ wallet/.test(text)) help = 'Use a full 0x wallet address. Every room member must have a different, nonzero address; never enter a private key.';
  if (/^From\b/.test(text) && field) help = 'The participant who owes this obligation. Choose a different participant from the receiver.';
  if (/^To\b/.test(text) && field) help = 'The participant owed this obligation. Choose a different participant from the payer.';
  if (/^Amount in USDC/.test(text)) help = 'Positive USDC amount with up to six decimal places. This obligation is netted against the other debts; gas is separate.';
  if (/^Reference/.test(text)) help = 'Short description of the agreed debt, up to 80 characters. This display label is local; avoid confidential invoice details in public data.';
  if (/^Network/.test(text) && field) help = 'Testnet uses test USDC; Mainnet uses real USDC. Contracts and room IDs belong to the selected network.';
  if (/^ArcClear contract address/.test(text)) help = 'Paste the full address of an ArcClear v2 deployment on the selected network. A wallet address is not a settlement contract.';
  if (/^Room deadline/.test(text)) help = 'Time allowed to approve, fund, and settle, up to 30 days. After expiry, settlement stops and payers can reclaim deposits.';
  if (/^Load an existing room/.test(text)) help = 'Positive numeric room ID from the creation receipt or shared link. Use the matching contract and network.';
  if (!help) help = field ? 'Review this value before submitting the draft.' : 'Open this control to continue the live workflow.';
  if (disabled) {
    if (busy) return 'Wait for the current wallet request or transaction to finish. ' + help;
    if (text === 'Load room from Arc') return 'Enter a valid contract address and a positive room ID to load the room. ' + help;
    if (/workspace/i.test(text)) return 'Database storage is unavailable. Your draft remains in this browser; Arc transactions can still work. See the guide for self-hosted setup. ' + help;
    if (/Remove|participant|obligation|Network|contract address|Room deadline/i.test(text)) return 'This control is locked for an existing room, a referenced item, or a room limit. Start a new draft to edit a locked plan. ' + help;
  }
  return help;
}
