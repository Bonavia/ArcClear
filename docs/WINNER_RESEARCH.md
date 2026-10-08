# Previous winners: what to learn, what not to copy

Research checked October 8, 2026. The organizer's [winner summary](https://hidorahacks.medium.com/circle-developer-bounties-group-1-hackathon-winner-summary-a849d41813a3) is the source below. Individual DoraHacks build pages could not be retrieved in this session, so this document does not claim to analyze their complete submissions or code.

## Observable examples

| Winner | Category | Published integration | Lesson for ArcClear |
|---|---|---|---|
| MorphPay | Multichain payments | USDC gateway using CCTP V2 | Explain the actual flow of money and the infrastructure enabling it |
| Gatee | Multichain payments | Ticketing with CCTP and revenue splitting | Tie payment logic to a useful customer workflow |
| PUBSTACK | Gasless experience | Creator payments using Circle Wallets and Gas Station | Show a concrete reduction in payment friction |
| Gasorin | USDC gas fees | Circle Paymaster in a wallet-connected flow | Make the stablecoin's practical role visible |

These descriptions establish what the projects built, not the judges' private rationale. Our inference is that a functioning payment use case and demonstrable integration make a stronger presentation than a concept with Circle logos added.

Circle's original [bounty announcement](https://www.circle.com/blog/circle-announces-bounties-to-help-developers-earn-as-they-build) describes separate integration challenges. Arc Microgrants has different [current requirements](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq): a working Arc mainnet build, public source, a project description, and builder profile.

## Documentation pattern to adopt

| Reviewer question | ArcClear evidence |
|---|---|
| What payment problem is solved? | Counterparties offset incoming and outgoing obligations before depositing principal |
| What is the visible result? | 270 USDC in example obligations becomes 20 USDC in net deposits |
| Why this ecosystem? | Arc native-USDC funding/payouts and USDC gas; no funding allowance step |
| Which integration is real? | Payable Solidity functions, native calls, wallet simulation, Arc network settings |
| Can I reproduce it? | Public source when visibility is changed, setup instructions, deterministic local tests |
| Can I verify the live claim? | Contract address and settlement transaction must be added after real deployment |
| What remains? | Arc RPC validation, mainnet deployment, reviewer access, security review, pilot usage |

## Our differentiation

ArcClear is a clearing primitive with a visible capital-efficiency outcome. It neither copies a payment gateway nor claims to bridge funds. Its native-USDC funding flow removes an allowance transaction compared with its previous ERC-20 prototype. The economic metric is net deposit principal, not crosschain transfer time, token yield, or artificial transaction volume.

Use a short product story, precise integration table, reproducible demo, and explicit evidence links. The working prototype should carry the application; documentation explains it.
