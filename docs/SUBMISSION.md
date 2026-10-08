# Arc Microgrants submission draft

**Status: prepared draft, not submission ready.** The repository is currently private and the contract has not been deployed to Arc mainnet. The website is an owner-private preview. Do not submit this draft as if those requirements were complete.

## Project title

ArcClear — Native-USDC Clearing Rooms on Arc

## Short description

ArcClear lets counterparties offset mutually agreed obligations and fund only the net balance. Participants approve an immutable plan, net payers fund it directly with native USDC, and a smart contract pays all net receivers in one atomic settlement. In the example, 270 USDC in obligations clears with 20 USDC of deposited principal, excluding gas.

## Problem and audience

Small teams and businesses that owe one another money often treat every outgoing invoice as a separate payment. ArcClear explores whether a shared, consent-based clearing room can reduce the principal deposited to settle those obligations. The initial audience is small groups with repeated two-way payment relationships.

## What we built

A responsive settlement workspace, editable obligations, original/optimized payment graphs, exact integer netting, demo receipts, wallet integration, and a native-USDC Solidity contract supporting approval, exact funding, atomic settlement, cancellation, and refunds. Room links load the shared plan directly from Arc after deployment.

## Why Arc and Circle

The payment flow is built around Arc's native USDC: the deposited value, receiver payouts, and network fees use one asset. Payers fund their net balance with a payable contract call rather than an ERC-20 allowance and transferFrom flow. Deterministic confirmed settlement is appropriate for completing a shared clearing batch. This connects USDC utility with programmable treasury liquidity, a direction identified by Circle's grant program.

The netting mathematics is portable. The current native-value implementation specifically settles USDC on Arc; the same flow on Ethereum would use ETH. ArcClear does not claim a technology monopoly or integrations with CCTP, Gateway, or Circle Wallets.

## Demonstration

- Northstar owes Orbit Labs 100 USDC.
- Orbit Labs owes Studio Three 90 USDC.
- Studio Three owes Northstar 80 USDC.
- Northstar's net payment is 20 USDC.
- Orbit Labs and Studio Three receive 10 USDC each.
- Deposited principal is 92.59% lower than the 270-USDC sum of obligations.

This percentage concerns settlement funding relative to total invoices; it is not profit, gas savings, or a guaranteed saving versus every sequential gross-payment schedule.

## Technical evidence

Local tests cover 300 generated netting scenarios, exact native-unit conversion, consent, incorrect funding values, failed payout rollback, callback reentrancy, replay prevention, cancellation, room isolation, expiry, zero-net cycles, multiple payers, tiny values, and wrong-chain deployment rejection. Local EVM tests cannot reproduce Arc's blocklist and native-transfer runtime policy. Arc RPC validation remains required.

## Links and evidence

| Item | Current value / action |
|---|---|
| Source | https://github.com/Bonavia/ArcClear — change to public before submission |
| Website | https://arcclear.yeffry-diaz.chatgpt.site — make reviewer accessible before submission |
| Arc mainnet contract | Pending; add verified address after deployment |
| Creation / approval / funding / settlement transactions | Pending; add explorer links from real demonstration |
| Builder profile | Provide the builder's chosen public GitHub, X, or Farcaster profile |
| Mainnet verification record | Complete `docs/MAINNET_EVIDENCE.md` |

## Next milestone

Deploy and verify the native-USDC contract, perform one small end-to-end mainnet settlement, and provide public evidence. Then validate the workflow with a small group of actual counterparties and record usage without claiming unmeasured traction.

## Before submitting

Follow the [current program requirements](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq). Verify eligibility, source visibility, website access, a working mainnet component, evidence links, and builder profile. The published deadline is October 14, 2026, at 23:59 ET; dates may be adjusted by the organizer. This draft does not itself submit an application.
