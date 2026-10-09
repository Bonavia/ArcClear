# Open ArcClear on your computer

Install Node.js 24 or later and Git, then run:

```sh
git clone https://github.com/Bonavia/ArcClear.git
cd ArcClear
npm install
```

If you already cloned the repository, run `git pull` inside it instead of cloning again.

Copy `config.env.example` to `.env.local` and privately set DATABASE_URL to your PostgreSQL connection URL. The network and contract are configured using public Vite variables:

```dotenv
VITE_ARC_NETWORK=testnet
VITE_ARCCLEAR_CONTRACT_ADDRESS=0x8206202479c8f954c84126fe28289d148fd09393
```

These may be in `.env` or `.env.local`; `.env.local` overrides `.env`. The API loads DATABASE_URL from either file; existing process environment variables take precedence. Network/address values are public, so their VITE_ prefix is intentional. Use `mainnet` with a contract actually deployed on Mainnet; do not reuse the Testnet address by assumption.

Restart `npm run dev` after edits, or rebuild production with `npm run build`. New drafts use these defaults. Existing saved rooms and shared links keep their own network and contract so their room IDs load correctly. Switching networks clears an unrelated contract address.

Then start:

```sh
npm run dev
```

The API runs on port 8787 and your browser opens at **http://localhost:5173**. Keep the terminal running; Ctrl+C stops both processes. Starting the app inside ChatGPT does not start a server on your laptop.

ArcClear supports **Live on Arc only**. Connect your browser wallet, fund it with test USDC, use the configured contract, assign participant wallets, and create a room. Every member signs their own approval; net payers fund their net balance and a participant settles. See [the real workflow](REAL_WORKFLOW.md).

The Tools menu no longer has Arc settings. Network and contract cannot be changed in the frontend. **Room options** controls deadlines and loads room IDs. Links or saved rooms from another deployment are rejected.

Click **Save workspace** or **Load workspace** to use PostgreSQL after wallet sign-in. Local drafts remain available if the API/database is offline. See [database setup](DATABASE.md).

## Checks and production

```sh
npm run typecheck
npm test
npm run build
npm start
```

Production runs at http://localhost:8787 and serves the browser UI plus the API. Deploy it as a Node.js application with server-side database secrets; a static build alone does not include PostgreSQL storage.

A localhost shared-room link requires ArcClear running at the same port on the collaborator's machine. Use a public HTTPS server for general shared links.

## Troubleshooting

- **Node error:** use Node 24 or later.
- **Port 5173 occupied:** stop the other process. Changing the UI origin also requires updating APP_ORIGIN.
- **Wallet not found:** use the browser where your wallet extension is installed.
- **PostgreSQL unavailable:** check `.env` and `.env.local`, the displayed health error, DNS, Aiven network access, and `npm run db:migrate`.
- **Workspace conflict:** load the latest saved workspace before saving again.
- **Private repository:** clone using an account with Bonavia/ArcClear access.
