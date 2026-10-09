# ArcClear user guide

Open **User guide** from the header or Tools menu for the complete in-app walkthrough. Each action has a hover/focus tooltip. Tap the **?** icons next to metrics and fields on a touch screen. Press Escape to dismiss a tooltip. Disabled actions also have explanations, and locked plans show an inline reason.

The **Your next step** panel follows the actual draft, wallet, approval, and funding state. The main settlement button follows the same state so it guides you through missing prerequisites instead of attempting creation too early.

## 1. Connect and fund

Connect an Ethereum-compatible browser wallet and approve the selected Arc network. Start on Testnet. Use Circle's faucet to give every participant USDC for gas. Every member must use a different wallet address, even when one person tests with several accounts.

Connecting a wallet transfers no USDC. PostgreSQL sign-in uses a separate message signature, which authorizes workspace access without approving a contract or payment.

## 2. Set up and review

The site operator configures the network and ArcClear v2 address through the environment. **Configured deployment** shows the contract. **Room options** sets the deadline or loads an existing room ID. A shared or saved room must match this deployment.

Assign 2–10 unique participant wallets. Add positive obligations with payer, receiver, amount, and reference. Amounts have at most six decimal places. Display names and references are local labels; the addresses and amounts control onchain behavior.

**Original** shows every obligation. **Optimized** shows logical net payment routes. These views do not sign or change anything. **USDC required** is the total net principal; gas is extra. **Funding reduction** is a comparison to invoice value, not profit or debt forgiveness.

For a quick real-transaction test, use the 0.02 USDC test plan and follow [REAL_WORKFLOW.md](REAL_WORKFLOW.md).

## 3. Create, share, and approve

Create the onchain room from a participant wallet. Creation fixes the members, obligations, and deadline, and pays gas. Creation does not approve the plan automatically.

Share room copies the network, contract, and room ID. Each member opens the link, loads the room from Arc, reviews the plan, and approves with their own wallet. Localhost links need a running local app at the same port on each computer; remote collaboration needs an HTTPS deployment.

Room state refreshes every five seconds. Refresh reads the latest state without a wallet transaction.

## 4. Fund and settle

After every approval, each net payer funds their exact net amount as native USDC. Receivers deposit nothing, but need gas for their approval. Fully offset cycles need no deposits.

Once every payer funds, a participant submits settlement. Payouts succeed together or revert. The site distinguishes **Submitted · awaiting confirmation**, **Transaction confirmed**, and **Transaction reverted**. A hash alone is not proof of success; verify it in the explorer.

Receipts show confirmed settlements submitted through this browser. They are device-local and link to the explorer. Other participants can see the settled room by refreshing its onchain state.

## Storage, editing, and recovery

Save workspace explicitly saves the wallet's draft and room reference to PostgreSQL after sign-in. Load workspace replaces the current local draft. Export JSON first to retain an unsaved plan. A save conflict requires loading the newest saved revision. Database outages do not block wallet transactions; unsaved drafts remain in the browser.

Onchain rooms cannot be edited. Any member can cancel an unsettled room. After cancellation or expiry, each payer claims its own refund in a separate gas-paying transaction. The guide distinguishes cancellation from refunds.

New room starts a local draft and does not cancel or refund the old room. Preserve its contract, network, and room ID using Save or Export so it remains easy to recover.

## Troubleshooting

- **No wallet:** use the browser containing your wallet extension.
- **Not a member:** switch to a listed account in your wallet; connect again if needed.
- **Invalid contract:** check its network and v2 deployment address. A participant wallet address is not a contract.
- **Insufficient USDC:** allow for the net deposit and gas. Receivers also need gas.
- **Missing approvals/deposits:** the other participant wallets must act; use Refresh to retry failed updates.
- **Rejected request:** no transaction was submitted by that rejected request. Review and retry.
- **Pending transaction:** inspect the explorer before treating it as successful.
- **Database unavailable:** continue the live workflow; for self-hosted setup, follow [DATABASE.md](DATABASE.md).

## Verification

Automated guidance tests cover draft prerequisites, membership, independent approvals, funding, settlement, closed-room recovery, and tooltip text. Build, database API tests with SQL emulation, and native-USDC contract tests with a local EVM also run in CI.

External Aiven access and public Arc transactions remain unverified from the assistant environment. The browser executable could not be downloaded here, so full browser interaction and visual checks were not completed. Do not interpret passing local checks as a completed public Arc settlement.
