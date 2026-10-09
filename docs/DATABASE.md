# PostgreSQL workspace storage

The browser calls a Node.js API. Only the API holds DATABASE_URL and connects to PostgreSQL. Wallet signatures authorize workspace access; the database is never directly exposed to the browser.

## Configure locally

1. Copy `config.env.example` to `.env` (or `.env.local`). The API reads both; `.env.local` overrides `.env`, and existing process variables override both.
2. Set `DATABASE_URL` to your supplied Aiven connection URL. Keep the real URL only in this ignored file or the deployment provider's secret environment settings. Do not put it in a `VITE_` variable.
3. Run `npm install` and `npm run dev`. This starts the API on port 8787 and the browser UI on port 5173. The API automatically creates the additive `arcclear` schema; it never drops existing tables. You can also run `npm run db:migrate` separately.
4. The site displays **PostgreSQL connected** only after a successful database check. If the database is unavailable, wallet transactions remain available and workspace storage is disabled.

The provided `sslmode=require` requests encrypted transport without server certificate verification. For verified TLS, download the Aiven project CA certificate, set `DATABASE_CA_FILE=./ca.pem`, and use `sslmode=verify-full`. The backend strips URI SSL options before applying the explicit TLS configuration so the CA is preserved.

## Save and load

Click **Save workspace** or **Load workspace**. Connect your wallet and sign the expiring ArcClear sign-in message when prompted. This message does not approve a contract or move USDC. Sign-in lasts seven days using a server-side session and an HttpOnly cookie.

Each wallet has one saved workspace containing participant display names, wallet addresses, obligations, network, contract address, and the latest room reference. Saving is explicit. Existing saved workspaces must be loaded before replacement; revision checks prevent a stale browser from silently overwriting newer data. Switching wallets switches workspace ownership.

The database stores drafts and references, not blockchain approvals, deposits, or claimed settlement success. Loading an existing room re-reads its immutable obligations and current state from Arc. Receipts remain device-local and link to transactions; the database does not independently certify invoices.

## Server and hosting

After `npm run build`, use `npm start`. The Node server serves both `dist/` and `/api` on http://localhost:8787. For a hosted deployment, set `API_HOST=0.0.0.0`, `PORT` or `API_PORT`, `APP_ORIGIN` to the exact public HTTPS origin, and `DATABASE_URL` in server-side secrets. Configure an HTTPS reverse proxy. APP_ORIGIN is used to enforce request origins and secure cookies.

A static host alone can no longer provide workspace storage. It needs this API behind a same-origin `/api` reverse proxy. `npm run preview` previews static UI only; run the API separately with `node server/index.mjs` if storage is needed on port 4173.

## Verification and current limit

`npm run test:database` exercises schema setup, signature validation, single-use nonces, replay rejection, wallet isolation, data validation, optimistic locking, and logout against pg-mem's SQL emulation. CI also runs calculator and native-USDC contract tests.

The supplied Aiven host could not be resolved from the assistant's execution environment (`EAI_AGAIN`). No remote tables or saved records were verified or claimed. Run `npm run db:migrate` from a machine with database network access to verify the real connection. Error responses and logs omit the connection string and password.

If connection fails, check Aiven service status, DNS, port access, IP allowlisting, and your server's environment. Do not paste credentials into diagnostics. Rotate the password shared in chat and update the server environment afterward.

## Connection diagnostics

The storage panel and `/api/health` show sanitized error codes without credentials. `EAI_AGAIN` or `ENOTFOUND` means the hostname cannot resolve; check DNS and the Aiven hostname from the machine running the API. `28P01` means credentials were rejected. `ECONNREFUSED` or `ETIMEDOUT` means service/network access needs checking. Run `npm run db:migrate` to check connectivity and schema setup. Restart after changing environment files. A static-only preview has no database API.
