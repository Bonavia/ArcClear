# Open ArcClear on your computer

Install Node.js 24 or later and Git. Run these commands in your own terminal:

```sh
git clone https://github.com/Bonavia/ArcClear.git
cd ArcClear
npm install
npm run dev
```

If you already cloned the repository, run `git pull` inside it instead of cloning again, then install and start.

The app automatically opens your default browser at **http://localhost:5173**. If your browser does not open, paste that address into Chrome, Firefox, Edge, or Safari. Keep the terminal running; Ctrl+C stops the server. A localhost address belongs to the computer running the command. Starting the app inside ChatGPT does not start a server on your laptop.

The full interface runs as a React/Vite browser app. It needs no ChatGPT login, Cloudflare Worker, hosted preview, database, API key, or contract deployment to use demo mode. Drafts and receipts are saved in this browser's local storage.

## Try the demo

1. Open the settlement room and inspect the three example obligations.
2. Click **Optimize payments** to compare 270 USDC of obligations with 20 USDC of net funding.
3. Click **Simulate all approvals**, then **Run demo settlement**.
4. Inspect the receipt or edit participants and obligations.

Demo mode moves no real USDC. For real transactions, install an Ethereum-compatible browser wallet, deploy the current ArcClear contract on Arc, and enter its address in **Arc settings**. See the README and mainnet evidence checklist. A wallet extension must be installed in the browser displaying the app.

Shareable room links use the current website origin. A `localhost` link can only work for another participant if they also run ArcClear locally on port 5173. Publish the `dist/` folder to an HTTPS static host for a generally accessible shared link.

## Build and check

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Production files are written to `dist/`. Preview opens at http://localhost:4173 (paste this address into your browser). Production hosting must serve `index.html` for app routes. Existing platform build helpers remain in the repository for history, but the active development and build commands use Vite directly.

The repository also supports its existing pnpm lockfile: `pnpm install --frozen-lockfile`, followed by `pnpm dev`. CI uses pnpm.

## Troubleshooting

- **Node version error:** run `node --version`; use Node 24 or later.
- **Port 5173 is already in use:** stop the other server, or run `npm run dev -- --port 5174` and open http://localhost:5174.
- **Page will not load:** confirm the terminal prints Vite's Local URL and keep it running.
- **Wallet not found:** use the browser where your wallet extension is installed.
- **Private repository access:** clone using a GitHub account with Bonavia/ArcClear access.
