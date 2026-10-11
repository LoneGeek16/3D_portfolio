# ARISE backend activation

The portfolio and fitness page remain in one Vite/Vercel project. The `/api/fitness/*` prefix routes to a Node.js Vercel Function. Better Auth handles email/password accounts; Postgres holds namespaced account, progress and WHOOP tables. No secrets belong in GitHub.

## Activate cloud accounts

1. Open the **3-d-portfolio** project in Vercel, choose Storage, and connect a **Neon Postgres** database. Ensure `DATABASE_URL` is added to Production.
2. In project Settings → Environment Variables, add:
   - `SITE_ORIGIN`: `https://jagadishreddy.in`
   - `BETTER_AUTH_SECRET`: a random secret of at least 32 characters. Generate locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`; paste the output only in Vercel.
3. Redeploy the latest `main`. The first health/account request initializes only `fitness_*` tables, under a Postgres advisory lock. It does not modify portfolio tables. Database credentials need permission to create these tables.
4. Visit `/api/fitness/health`: `configured: true` and `ready: true` confirm a reachable initialized database. Create an account in `/personalfitgoals`. Import the browser plan explicitly if needed.

The code performs no production migration during a build. Runtime initialization requires all three backend configuration variables. Missing or failed setup keeps the page in browser mode and shows an explicit status. Email verification and password-recovery delivery are not configured; use a password manager. Do not enable account recovery without adding a mail service and verified sender.

## Optional WHOOP

Register your own app in WHOOP’s developer dashboard and configure these Production env vars:

- `WHOOP_CLIENT_ID`
- `WHOOP_CLIENT_SECRET`
- `TOKEN_ENCRYPTION_KEY`: base64 encoding of 32 random bytes, generated with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.

Keep the encryption key stable. Changing it makes existing encrypted tokens unreadable until reconnected. WHOOP credentials and keys never go in HTML, notes, or GitHub.

Exact redirect URI:
`https://jagadishreddy.in/api/fitness/whoop/callback`

Privacy policy:
`https://jagadishreddy.in/personalfitgoals/privacy`

Redeploy after adding variables, sign in to the fitness account, then choose Connect WHOOP. Sync is manual. It fetches up to ten recent records per category, not full history. Disconnect revokes and deletes imported records only when revocation succeeds or the access token is already invalid. Tokens are encrypted; health snapshots are not end-to-end encrypted.

## Operation

- Optimistic versions prevent silent overwrites between devices. A conflict requires export/reload.
- Unsaved changes warn before closing. A retry never overwrites a newer cloud version.
- Cloud data is keyed by verified account session, never a client-supplied user ID.
- Mutating progress/WHOOP requests require the configured origin.
- OAuth state is bound to the user, nonce cookie and expiry, and consumed once.
- Token refresh, sync and disconnect use a database lease to avoid overlapping operations.
- No scheduled sync, email delivery, analytics or automatic training adjustment is implemented.
- Backup/export progress before importing or deleting. Provider backups/logs have independent retention.

## Development checks

`npm test` runs account/service checks with PGlite (an embedded Postgres engine) and mocked WHOOP; it does not contact production or prove live WHOOP authorization. `npm run build` builds the portfolio and copies the fitness HTML. The frontend uses the Vercel API when deployed; `vite` alone does not emulate Vercel Functions.
