# Deploy ArcClear to Vercel

Import https://github.com/Bonavia/ArcClear into Vercel. Keep the repository root as the root directory and use the Vite framework preset. `vercel.json` supplies `npm run build`, the `dist` output directory, API routing, and SQL schema inclusion. Use Node.js 24.x. Keep the automatic dependency install command so Vercel uses the committed pnpm lockfile.

Add these environment variables before deploying:

| Variable | Value | Visibility |
| --- | --- | --- |
| `VITE_ARC_NETWORK` | `testnet` | Public browser configuration |
| `VITE_ARCCLEAR_CONTRACT_ADDRESS` | `0x8206202479c8f954c84126fe28289d148fd09393` | Public browser configuration |
| `DATABASE_URL` | Your Aiven PostgreSQL connection URL with `sslmode=require` | Server secret; never prefix with VITE_ |
| `APP_ORIGIN` | Optional: exact HTTPS URL when using a custom domain | Server configuration |

For the default Vercel URL, the API uses Vercel's deployment URL automatically. For a custom domain, set APP_ORIGIN to that domain and redeploy. Sign-in requests must come from the configured origin. Production and Preview variables are separate; preview deployments should use a separate database if you want isolated data.

Vercel serves the frontend and `/api/*` from the same deployment. The API reuses a PostgreSQL pool within a warm function instance and initializes the additive `arcclear` schema on first use. Failed initialization retries on the next request. No persistent Node process or background timer is required. Database access rules must allow connections from Vercel; changing the hosting provider does not establish that Aiven is reachable.

After deployment, open `/api/health`. HTTP 200 with `database: connected` confirms database connectivity and schema initialization. Then connect a wallet, save a draft, and load it again. If health returns 503, use the displayed code to check DNS, service status, credentials, and access rules. Public Arc transactions still require participant wallet signatures and test USDC.

Environment files and credentials are excluded from GitHub. Set secrets in Vercel's project settings. Changing public VITE_ values requires a new build. Do not paste database credentials into a client-side variable.
