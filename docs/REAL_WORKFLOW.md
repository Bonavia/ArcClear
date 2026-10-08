# Test a real Arc settlement from the site

This flow sends signed transactions to **Arc Testnet** using test USDC. It is separate from the Demo tab, which simulates approvals and moves no funds.

## Start

Update your checkout, install dependencies, and start the app:

```sh
git pull
npm install
npm run dev
```

Open http://localhost:5173 in a browser with MetaMask or another Ethereum-compatible wallet. Choose **Live on Arc** if your saved workspace opens in Demo mode.

## Wallets and contract

1. Click **Connect to Arc** in the workflow panel. Approve connection and adding/switching to Arc Testnet in your wallet.
2. Open **Get test USDC**. On Circle’s faucet, choose Arc Testnet and fund three distinct wallet accounts. Each account needs gas, even receivers. You can use three accounts in the same wallet for testing; in real collaboration each participant controls their own wallet.
3. Click **Deploy with wallet** and confirm the testnet deployment transaction. Wait for confirmation. The site saves the confirmed contract address in this browser. If you already have a current v2 deployment, enter it in **Arc settings** instead.
4. Click **Use 0.02 USDC test plan**. Assign Northstar, Orbit Labs, and Studio Three to the three wallet addresses. **Use wallet** assigns the wallet's currently selected account to that participant; select the appropriate account in your wallet before each assignment. Click **Done**.

No seed phrase or private key is requested. The browser deployment button is testnet-only. Mainnet deployment remains an explicit separate operation.

## Create, approve, fund, settle

1. Select Northstar's wallet account, then click **Create onchain room**. Confirm the transaction. Creation does not approve the plan automatically.
2. Click **Approve settlement plan** and confirm with Northstar.
3. Switch to Orbit Labs in your wallet, connect that account if needed, and approve. Repeat with Studio Three. Each participant must approve the same room independently.
4. With all three approvals confirmed, switch back to Northstar and click **Fund with native USDC**. The transaction sends exactly 0.02 test USDC, plus separate gas.
5. Click **Settle on Arc** with a participant wallet. Confirm and wait for the receipt. Orbit Labs and Studio Three each receive 0.01 test USDC. The room displays confirmed settlement, and the wallet that submitted settlement gets a local receipt with an explorer link.

The three obligations are 0.10, 0.09, and 0.08 USDC. They total 0.27 USDC; the net funding is 0.02 USDC. No tokens are approved through an ERC-20 allowance.

Approvals and funding refresh from the chain every five seconds. If updates fail, the page reports this and offers manual Refresh. Wallet balance is also refreshed; it includes native USDC once, not a duplicate ERC-20 balance.

## Separate browsers or collaborators

Click **Share room** after creation. A collaborator opens the link, connects their participant wallet, and clicks **Load room from Arc** in settings. Obligations, approvals, and funding come from the chain; display names are local labels.

A localhost link requires ArcClear running on each collaborator's computer at the same port. For general remote access, deploy the static build to an HTTPS host. The old ChatGPT-hosted preview is not automatically updated by GitHub changes.

## Recovery and evidence

Before settlement, any participant can cancel. Funded payers can then click **Reclaim my deposit**. Expiry also permits individual refunds. Cancellation is irreversible for that room; create another room to retry.

Record the deployment transaction, contract address, room ID, creation, three approvals, funding, and settlement explorer links. Recipient balance increases are 0.01 USDC each, excluding any gas they spent in other actions.

Implementation checks cover the exact small plan on a local EVM configured with Arc's chain ID. This does not prove Arc runtime behavior. No public Arc deployment or end-to-end Arc transaction has been performed by the assistant: wallet signatures and faucet funding must be completed by the tester.

References:

- https://docs.arc.io/arc/references/connect-to-arc
- https://faucet.circle.com
