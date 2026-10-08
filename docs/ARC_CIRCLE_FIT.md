# Why ArcClear belongs on Arc and Circle

## The positioning

**ArcClear is an Arc-native USDC clearing room: participants offset agreed obligations, fund only their net balance, and settle all receiver payouts atomically, using the same asset for payment and network fees.**

The relevant customer is a small group of counterparties with repeated two-way financial obligations: agencies and subcontractors, sister companies, or cooperating service providers. The prototype tests a settlement workflow, not a new lending market or a generic freelancer marketplace.

## What actually depends on Arc

The current contract uses native USDC through `msg.value` and native payouts. This matters because standard EVM native value is usually a different asset from ERC-20 USDC. Deploying the same value-transfer flow on Ethereum would move ETH, not USDC. Maintaining the USDC promise there requires adapting the implementation, using a different native stablecoin environment, or adding a token abstraction.

ArcClear's constructor accepts Arc Mainnet and Arc Testnet chain IDs only. This is an accidental-deployment guard; a local chain can imitate a chain ID, so the check is not proof of chain authenticity or a novel moat. The meaningful dependency is native-value USDC settlement.

Netting arithmetic, unanimous consent, and atomic execution are portable ideas. We should never claim Circle invented netting, that no other chain could implement it, or that reviewers require exclusivity. The defensible claim is **built specifically around Arc's native-USDC model**, not mathematically possible only on Arc.

[Official native-USDC model](https://www.arc.io/blog/usdc-for-every-action-how-arc-simplifies-building-onchain)

## Concrete product advantages

| Arc property | ArcClear implementation | User benefit | Limit |
|---|---|---|---|
| Native USDC value | Exact payable net deposits and native payouts | No ERC-20 allowance transaction for funding | Funding still costs gas |
| USDC-denominated fees | Wallet balances and gas reserve use native USDC | No separate volatile gas asset to acquire | Every signing participant needs gas funds |
| Deterministic finality | A successful settlement receipt marks the batch complete | Clear confirmed settlement status | No application-level latency claim has been measured |
| EVM tooling | Solidity contract, viem wallet flow, public source | Reusable clearing primitive for Arc builders | Tests on a standard local EVM do not reproduce Arc policy rules |

Arc publishes its network properties [here](https://www.arc.io/network). Specific native-transfer restrictions and finality semantics are in the [EVM reference](https://docs.arc.io/arc/references/evm-differences).

## The Circle connection

USDC is the settlement asset, accounting unit, and gas asset. Arc is the execution and settlement layer. Circle's grants identify treasury workflows, meaningful USDC utility, and ecosystem impact as relevant directions. ArcClear demonstrates a programmable liquidity workflow: counterparties settle agreed gross obligations while depositing less net principal.

The business-value hypothesis is that reducing a group's settlement funding barrier can make USDC clearing usable by more counterparties. This is a hypothesis to validate with pilots; it is not evidence of adoption, revenue, or a guaranteed selection advantage.

[Circle grant priorities](https://www.circle.com/grant)

| Component | Status | What it does |
|---|---|---|
| Arc native USDC | Implemented in source; network deployment pending | Value transfers, deposits, refunds, gas |
| Arc settlement contract | Implemented; locally tested | Consent, net balances, funding, atomic payouts |
| viem | Implemented; third-party tooling | Wallet and RPC interaction |
| Circle Wallets | Not integrated | Potential later onboarding option |
| CCTP / Gateway | Not integrated | Potential later funding from other chains |
| Circle Paymaster / gas sponsorship | Not integrated | No gasless experience claimed |
| Circle Smart Contract Platform | Not integrated | Deployment uses a normal EVM wallet |

Do not add unused Circle products to an architecture diagram merely to resemble earlier winners. The microgrant program asks for working Arc relevance; it does not require every previous bounty's integration.

## Revisions made after the fit review

1. Replaced arbitrary ERC-20 token escrow with native-USDC deposits and payouts.
2. Removed the funding allowance request; exact `msg.value` is required instead.
3. Added explicit micro-USDC to native-unit conversion, with no floating-point money calculations.
4. Added the Arc network deployment guard and contract version checks.
5. Added gas-reserve checks and an Arc fee floor to wallet submissions.
6. Renamed the graph's transfer metric to **net routes**: logical graph routes are not the complete blockchain transaction count.
7. Kept demo actions, local receipts, and real transactions distinguishable.

## Claims we deliberately avoid

- "Only Arc can do netting."
- "270 USDC was transferred" when only 20 USDC of principal moved.
- "92.59% cheaper transactions" when the calculation compares net funding with gross obligations.
- "Gasless," "instant across chains," "private onchain," or "Circle Wallets integrated."
- "Production ready" or "mainnet deployed" before validation and deployment evidence exist.
- "Guaranteed grant winner."

The demonstration's denominator is the sum of invoices, not the smallest possible float under an optimized sequence of gross payments. Netting does not guarantee reduced funding versus every sequential payment order. Onchain agreement also does not independently establish legal discharge of commercial invoices.
