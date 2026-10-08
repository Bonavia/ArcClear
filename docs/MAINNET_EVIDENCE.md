# Arc validation and mainnet evidence

Status: **not run on Arc**. All contract test results currently come from a standard local EVM with an Arc chain ID. No real deployment, transactions, balances, or latency numbers are claimed.

## Deployment record

| Field | Value |
|---|---|
| Network / chain ID | Pending |
| Contract address / version | Pending / expected version 2 |
| Deployment transaction | Pending |
| Source verification link | Pending |
| Tested source commit | Pending |
| Test date and operator | Pending |

## Required live flow

Start on Arc Testnet. Run mainnet only with funded wallets and an intentionally small amount.

1. Deploy the current contract; confirm `VERSION() == 2` and `NATIVE_SCALE() == 10^12`.
2. Use three controlled wallets and a tiny scaled version of the example: obligations 0.10, 0.09, and 0.08 USDC. Net payer funds 0.02 USDC; receivers get 0.01 each.
3. Record the room ID and immutable obligation hash.
4. Each participant approves from its own wallet. Record each transaction.
5. Check that funding before complete approval fails during simulation.
6. Fund exactly the native-unit value. No allowance transaction should occur.
7. Settle and verify every receiver payout from chain state and transaction logs.
8. Confirm a second settlement is rejected.
9. In a separate room, cancel after funding and verify the payer's refund, accounting separately for its gas.
10. Demonstrate expiry recovery on testnet. Record time and chain state without inventing mainnet results.
11. Load the room link from a second browser and verify contract-derived obligations, approvals, status, and deadline.

## Numerical check

`0.02 USDC = 20,000 micro-USDC = 20,000,000,000,000,000 native base units`.

Principal deposit and native payout amounts must be exact. For a receiver that also sends a transaction, its wallet balance change includes gas: isolate payout value or add back its receipt-derived gas cost. Native and ERC-20 USDC are two representations of one balance, not separate holdings.

## Arc-specific checks

Arc runtime value-transfer rules differ from a normal EVM. Confirm current RPC behavior for the contract's native calls; ordinary local tests do not reproduce blocklists, forbidden burns, or system native-transfer events. Never trigger restricted-address transfers with real funds for testing. Failed payouts must leave the room unsettled and deposits intact. Refunds may also fail for a recipient prohibited by network policy.

Fee submissions use the documented 20-Gwei minimum max fee plus the RPC's estimate. Verify this against current Arc docs and actual inclusion before relying on it. Measure observed confirmation times only after transactions exist; do not equate advertised network finality with a measured application latency guarantee.

## Evidence table

| Step | Room ID | Transaction / explorer link | Result |
|---|---|---|---|
| Deployment | — | Pending | Not run |
| Create room | Pending | Pending | Not run |
| Member approvals | Pending | Pending | Not run |
| Exact native funding | Pending | Pending | Not run |
| Atomic payout | Pending | Pending | Not run |
| Duplicate rejection | Pending | Pending | Not run |
| Separate-room cancellation/refund | Pending | Pending | Not run |

References: [Arc EVM rules](https://docs.arc.io/arc/references/evm-differences), [Connect to Arc](https://docs.arc.io/integrate/connect-to-arc), [native-USDC model](https://www.arc.io/blog/usdc-for-every-action-how-arc-simplifies-building-onchain).
