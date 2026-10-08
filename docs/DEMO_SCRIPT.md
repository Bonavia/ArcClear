# Two-minute demo script

## 0:00 — The problem

"Three counterparties owe each other money. Paying every invoice independently moves 270 USDC of gross principal. We can agree on one clearing plan instead."

Show the original graph and each obligation. Avoid claiming every independent payment schedule requires 270 USDC of simultaneous float.

## 0:20 — The result

Select **Optimized**. "Northstar has a 20-USDC net payment; the other two receive 10 each. The room needs 20 USDC of deposited principal, excluding gas. The incoming and outgoing obligations are offset with everyone's consent."

## 0:45 — Why Arc

"We use Arc's native USDC for deposits and payouts. The payer funds the exact amount through one payable call; there is no token-allowance step. Fees also use USDC. On a typical EVM chain this native-value flow would use a different asset."

## 1:05 — Approval and execution

For a demo-only recording: clearly show **Demo** and say "These approvals are simulated; no real money moves."

For a verified live recording: load the mainnet room, show the three wallet approvals, exact native funding, and settlement transaction. Only say "mainnet" if the recorded deployment is real.

## 1:35 — Verifiable completion

Show the receipt and explorer links. Explain that every receiver payout executes together or the settlement reverts. Show the separate cancellation/refund flow if available.

## 1:50 — Ecosystem contribution

"ArcClear is a small reusable clearing primitive for Arc treasury workflows. The next step is validating it with actual counterparties. The source and deployment evidence let other builders inspect and reproduce it."
