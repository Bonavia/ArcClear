<p align="center">
  <img src="https://github.com/Bonavia/ArcClear/blob/main/public/ArcClear.png" width="100%" alt="Bonavia" style="border-radius: 24px;">
</p>

# ArcClear

**Clear shared obligations with less USDC funding.**

ArcClear is a netting interface with an Arc-native approval-based USDC settlement contract for Arc. It makes the funding reduction visible before participants approve or deposit funds.

## Demo

Northstar owes Orbit Labs 100 USDC, Orbit Labs owes Studio Three 90 USDC, and Studio Three owes Northstar 80 USDC. The gross obligations total 270 USDC. Net settlement requires Northstar to fund 20 USDC; Orbit Labs and Studio Three receive 10 USDC each. Funding is reduced by 92.59% against total invoice amounts, excluding gas.

This is a funding comparison, not profit, debt forgiveness, or a guaranteed reduction versus every possible sequential payment order. Creation, approvals, deposits, and settlement each require transactions. The graph shows logical net routes; the contract pools net deposits and pays net receivers.

## Features

- Editable obligations and 2–10 participants; up to 64 obligations per room.
- Integer micro-USDC arithmetic with six decimal places.
- Original and optimized payment network visualizations.
- Explicit demo approval and settlement flow; no fake transaction hashes.
- Device-local drafts and receipts; JSON plan export.
- Ethereum-compatible wallet connection, Arc chain switching, and transaction simulation.
- Shared onchain rooms with immutable obligations and unanimous participant approval.
- Exact native-USDC deposits with no token allowance, atomic payouts, participant cancellation, and deposit recovery.
- Shareable links that load room obligations and approvals from Arc.
- Optional read-only WebMCP tool, `read_settlement_plan`.

## Documentation

- [Why Arc and Circle](docs/ARC_CIRCLE_FIT.md): technical fit and honest limits
- [Previous winner research](docs/WINNER_RESEARCH.md): observed integration patterns
- [Submission draft](docs/SUBMISSION.md): project description and outstanding requirements
- [Mainnet evidence checklist](docs/MAINNET_EVIDENCE.md): real deployment and verification record
- [Two-minute demo](docs/DEMO_SCRIPT.md): recording outline

**Positioning:** Arc-first native-USDC clearing, not a claim that netting is possible only on Arc. The first generic ERC-20 prototype was revised to remove token allowance funding and rely on Arc's native USDC for value transfer and gas. On a conventional EVM chain the same native-value flow would settle a different asset.

## Test the real workflow

The site opens in Live on Arc mode. Its guided workflow lets you connect to Arc Testnet, open Circle’s faucet, deploy ArcClear directly with your browser wallet, prepare a 0.02 USDC net-funding plan, and create, approve, fund, and settle a shared room. No private key is entered into the site. See [the real-workflow guide](docs/REAL_WORKFLOW.md).

Approvals and funding refresh every five seconds. Use three different wallet accounts, each funded for gas; each signs its own approval. Real transaction hashes link to the explorer. Demo mode remains available separately.

## Current status

The interface opens with the live setup checklist; Demo mode is also available. Solidity contracts are compiled and tested on a local EVM; Arc RPC validation remains pending in this environment. **No Arc mainnet or testnet deployment is included or claimed.** Live mode needs a deployed ArcClear contract and funded participant wallets. A demo-only web deployment does not meet the Arc Microgrants mainnet requirement.

The contract is an unaudited prototype. The UI never stores keys or signs without a wallet prompt. Local workspace data is not an account system or private backend. Live participants, obligations, amounts, and approvals are public onchain. Names and invoice descriptions are local display labels, not verified identities.

## Run locally

Use Node.js 24+ and run these commands on your own computer:

```sh
git clone https://github.com/Bonavia/ArcClear.git
cd ArcClear
npm install
npm run dev
```

Your default browser opens at **http://localhost:5173**. Keep the terminal running. The full React/TypeScript interface now runs with ordinary Vite; demo mode requires no ChatGPT account or hosted preview. See [local setup and troubleshooting](docs/LOCAL_SETUP.md).

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The production build is a static `dist/` folder. Preview it at http://localhost:4173. The existing pnpm lockfile is also supported (`pnpm install --frozen-lockfile`, `pnpm dev`).

Tests cover exact decimals, invalid inputs, 300 generated conservation scenarios, unanimous consent, funding preconditions, atomic rollback, replay prevention, cancellation, room isolation, expiry, exactly-once refunds, native precision, wrong funding values, reentrancy, and wrong-chain deployment. Ganache uses a JavaScript fallback if optional native binaries are unavailable.

## Deploy the contract

```sh
pnpm contracts:compile
```

Set `DEPLOYER_PRIVATE_KEY` securely in your environment. Never commit it or paste it into the browser. The deployer needs USDC for Arc gas.

```sh
# Testnet; requires test USDC.
pnpm contracts:deploy

# Mainnet; spends real USDC gas.
CONFIRM_MAINNET=YES pnpm contracts:deploy -- --mainnet
```

The script writes the address and transaction hash to `deployments/testnet.json` or `deployments/mainnet.json`, without private keys.

1. Open **Participants** and assign unique wallet addresses.
2. Add the obligations participants agree to clear.
3. Open **Arc settings**, choose the network, and enter the deployed contract address.
4. Connect a participant wallet and create the room.
5. Share the room link; each member loads and approves the exact plan using their own wallet.
6. Net payers fund their net amount directly with native USDC; no token allowance is required. Reserve extra USDC for gas.
7. Settle once all members approve and all net payers fund native USDC. All receiver payouts succeed together or revert.
8. After cancellation or expiry, each payer can reclaim their deposit. Any member can cancel before settlement.

## Contract design

`contracts/ArcClear.sol` derives balances from ordered obligations. Every member approves the same immutable room. Approval changes stop once funding begins. Members, obligations, amounts, and deadlines cannot change. Net payers deposit exactly their balance. Settlement requires every approval and deposit, then pays every receiver atomically. Completed rooms cannot replay. A reentrancy guard protects native-value transfers; accounting isolates deposits by room.

Zero-net cycles settle after unanimous approval without deposits. After cancellation or expiry, refunds are claimed individually, so one rejecting recipient cannot prevent another permitted payer from reclaiming their own funds.

Arc native balances use 18 decimals. ArcClear's obligation accounting uses six-decimal micro-USDC, converted explicitly by multiplying by 10^12 for payable deposits and native payouts. The contract rejects incorrect funding values. There is no ERC-20 allowance or transferFrom path. Gas is separate, paid in the same native USDC asset. Deployment rejects chain IDs other than Arc Mainnet and Testnet; this is a safety guard, not proof of network authenticity.

| | Arc Mainnet | Arc Testnet |
|---|---|---|
| Chain ID | 5042 | 5042002 |
| RPC | https://rpc.mainnet.arc.io | https://rpc.testnet.arc.io |
| Explorer | https://explorer.arc.io | https://explorer.testnet.arc.io |
| ERC-20 USDC | `0x3600000000000000000000000000000000000000` | Same address |

Verify network details before deployment:

- https://github.com/circlefin/skills/tree/master/plugins/circle/skills/use-arc
- https://www.arc.io/network
- https://www.arc.io/blog/usdc-for-every-action-how-arc-simplifies-building-onchain

Onchain clearing records do not independently establish invoice validity, legal netting agreements, or legal discharge of obligations. Keep confidential invoice information off public chain data.

## v0.2 native-USDC revision

This revision is incompatible with the previous ERC-20 constructor and funding ABI. Deploy the current contract with **no constructor arguments**. The application checks contract version 2 when loading a room. Existing v1 rooms would need to be completed or refunded using v1 tools; they are not migrated. No v1 deployment was made by this project.

Native payouts may fail under Arc's protocol rules or if a recipient contract rejects payment. All payouts then roll back; the unsettled room can be cancelled. A network-blocklisted payer may also be unable to receive a refund. Local tests model rejecting recipients and callbacks but do not emulate Arc's runtime blocklist.

## Microgrants submission

Complete a real mainnet deployment, demonstrate a small real settlement, make the repository public, and provide the live URL, contract address, transaction hash, and builder profile. Deploying the demo website does not automatically complete these requirements.

## Structure

- `src/main.tsx` and `index.html`: local browser entry point
- `app/`: interface and styling
- `components/`: network visualization
- `lib/`: netting engine, Arc clients, generated ABI
- `contracts/`: Solidity, test-only recipient, artifacts
- `scripts/`: contract compilation and deployment; legacy platform helpers
- `tests/`: calculator and local-EVM tests

MIT licensed. Built for Bonavia.
