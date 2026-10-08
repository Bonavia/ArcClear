<p align="center">
  <img src="https://github.com/Bonavia/ArcClear/blob/main/public/ArcClear.png" width="100%" alt="Bonavia" style="border-radius: 24px;">
</p>

# ArcClear

**Clear shared obligations with less USDC funding.**

ArcClear is a netting interface with an Arc-native approval-based USDC settlement contract for Arc. It makes the funding reduction visible before participants approve or deposit funds.

## Live settlement

ArcClear now runs **Live on Arc only**. Start with an empty draft, assign participant wallets, and add agreed obligations. The testnet workflow can deploy the current contract through your browser wallet and prepare a small real-transaction test plan. Each participant signs their own approval; net payers fund their exact native-USDC balance before settlement.

For example, obligations of 0.10, 0.09, and 0.08 USDC form a three-party cycle totaling 0.27 USDC. Only 0.02 USDC of net funding is needed; the two receivers get 0.01 USDC each. Gas is separate. This is a funding comparison, not profit or debt forgiveness. The graph shows logical routes; the contract pools deposits and pays receivers atomically.

## Features

- Editable obligations and 2–10 participants; up to 64 obligations per room.
- Integer micro-USDC arithmetic with six decimal places.
- Original and optimized payment network visualizations.
- Wallet-signed approvals, funding, and settlement; no simulation mode.
- PostgreSQL workspaces protected by wallet sign-in; device-local receipts and JSON plan export.
- Ethereum-compatible wallet connection, Arc chain switching, and transaction simulation.
- Shared onchain rooms with immutable obligations and unanimous participant approval.
- Exact native-USDC deposits with no token allowance, atomic payouts, participant cancellation, and deposit recovery.
- Shareable links that load room obligations and approvals from Arc.
- Optional read-only WebMCP tool, `read_settlement_plan`.

## Documentation

- [User guide](docs/USER_GUIDE.md): next-step guidance, all actions, tooltips, and recovery

- [Why Arc and Circle](docs/ARC_CIRCLE_FIT.md): technical fit and honest limits
- [Previous winner research](docs/WINNER_RESEARCH.md): observed integration patterns
- [Submission draft](docs/SUBMISSION.md): project description and outstanding requirements
- [Mainnet evidence checklist](docs/MAINNET_EVIDENCE.md): real deployment and verification record
- [Real workflow](docs/REAL_WORKFLOW.md): testnet transactions from the interface
- [Database setup](docs/DATABASE.md): PostgreSQL configuration, authentication, and deployment

**Positioning:** Arc-first native-USDC clearing, not a claim that netting is possible only on Arc. The first generic ERC-20 prototype was revised to remove token allowance funding and rely on Arc's native USDC for value transfer and gas. On a conventional EVM chain the same native-value flow would settle a different asset.

## Test the real workflow

The site always uses Live on Arc. Its guided workflow lets you connect to Arc Testnet, open Circle’s faucet, deploy ArcClear with your browser wallet, prepare a 0.02 USDC net-funding plan, and create, approve, fund, and settle a room. No private key is entered into the site. Approvals and funding refresh every five seconds.

The interface includes a state-aware next-step panel, tooltips for controls and fields, and a complete in-app User guide. Submitted transactions are distinguished from confirmed and reverted transactions.

The Tools menu has no Arc settings entry. Network and contract configuration are available through **Contract setup** in the live workflow.

## PostgreSQL storage

The Node API stores each wallet's workspace: participants, obligations, selected network, deployed contract address, and current room reference. Wallet sign-in uses expiring single-use signature challenges and HttpOnly sessions. Save and Load are explicit, with revision checks to avoid overwrites. Onchain approvals, deposits, and settlement remain authoritative on Arc; receipts remain device-local.

Copy `config.env.example` to `.env.local` and privately set `DATABASE_URL`. The API creates an additive `arcclear` schema on startup. Credentials never enter the browser bundle or GitHub. See [database configuration](docs/DATABASE.md).

## Current status

Build, calculator, wallet-provider deployment, local-EVM settlement, and SQL-emulated API checks pass. **No public Arc deployment or settlement is claimed.** Real testing needs funded wallets and wallet confirmations.

The supplied Aiven connection could not be verified from this environment because hostname resolution failed. Database status remains unavailable until the server connects. Run `npm run db:migrate` from your machine to verify access. No remote database migration success is claimed.

The contract is an unaudited prototype. The UI never stores keys or signs without a wallet prompt. Workspace sign-in proves control of a wallet, not legal identity. Live obligations, amounts, and approvals are public onchain; PostgreSQL drafts are offchain and private to their wallet workspace.

## Run locally

Use Node.js 24+:

```sh
git clone https://github.com/Bonavia/ArcClear.git
cd ArcClear
npm install
```

Copy `config.env.example` to `.env.local`, add your private PostgreSQL URL, then run:

```sh
npm run dev
```

The API starts on port 8787 and the browser opens at **http://localhost:5173**. Keep the terminal running. See [local setup](docs/LOCAL_SETUP.md).

```sh
npm run typecheck
npm test
npm run build
npm start
```

Production serves the UI and API at http://localhost:8787. Host the Node server behind HTTPS with database secrets and APP_ORIGIN configured; static hosting alone does not provide PostgreSQL storage. The pnpm lockfile remains supported, and CI uses pnpm.

Tests cover exact decimals, 300 conservation scenarios, unanimous consent, native deposits and payouts, refund recovery, room isolation, atomic rollback, reentrancy, the small test plan, wallet authentication, nonce replay rejection, owner isolation, validation, and workspace conflicts. Database API tests use SQL emulation rather than the external Aiven instance.

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
3. Open **Contract setup**, choose the network, and enter the deployed contract address.
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

Complete a real mainnet deployment, demonstrate a small real settlement, make the repository public, and provide the live URL, contract address, transaction hash, and builder profile. Deploying the website does not automatically complete these requirements.

## Structure

- `src/main.tsx` and `index.html`: local browser entry point
- `app/`: interface and styling
- `components/`: network visualization
- `lib/`: netting engine, Arc clients, generated ABI
- `contracts/`: Solidity, test-only recipient, artifacts
- `server/` and `db/`: Node API, wallet authentication, PostgreSQL schema
- `scripts/`: local development, migration, contract compilation and deployment; legacy platform helpers
- `tests/`: calculator and local-EVM tests

MIT licensed. Built for Bonavia.
