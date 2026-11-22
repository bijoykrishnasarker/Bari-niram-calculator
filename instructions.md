# Developer instructions

## 1. Prerequisites

- Node.js 22.18 or newer. Supabase JavaScript libraries no longer support Node 20 in the current platform generation.
- pnpm 11.25 or the version in the root `packageManager` field.
- A dedicated Supabase project.
- A public HTTPS URL for the Express API before production release.

Install dependencies from this directory:

```powershell
pnpm install --frozen-lockfile
```

## 2. Configure Supabase

Create a Supabase project, then use the Connect dialog to create or copy:

- a publishable key (`sb_publishable_...`) for the mobile app and server-side user-token verification;
- a secret key (`sb_secret_...`) for the Express API only.

Do not use the legacy `anon` and `service_role` keys for a new implementation. Never place a secret key in an `EXPO_PUBLIC_` variable.

Enable email/password authentication and keep email confirmation enabled for production. Add this mobile redirect URL to the Auth allow list:

```text
homexbd://auth/callback
```

### Apply the migration

The migration is in `supabase/migrations/20261120161357_initial_schema.sql`.

For a new project, either paste the complete file into the Supabase SQL Editor and run it once, or use the pinned CLI:

```powershell
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push --remote --dry-run
pnpm exec supabase db push --remote --yes
```

Supabase CLI v3 targets the local database by default; `--remote` is intentional. Review the dry run before applying. The migration is written for a dedicated project and changes default Data API privileges for future `public` tables.

After deployment, run the database security and performance advisors from the Supabase dashboard. Local advisor verification is unavailable without Docker or a connected project.

### Add the first administrator

Create and verify the administrator through the normal Auth flow. Then run this in the SQL Editor, replacing the email:

```sql
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing;
```

Administrator status is stored in `admin_users`, not user-editable metadata.

## 3. Configure environments

Copy `apps/api/.env.example` to `apps/api/.env` and fill every value.

Generate `DEVICE_HASH_PEPPER` with at least 32 random characters. It is a server secret used to HMAC device installation IDs. Rotating it invalidates all existing comparisons, so plan a device-rebinding migration before rotation.

Set `BKASH_ACCOUNT_NUMBER` to the real receiving account. Until it is a valid Bangladesh mobile number, the client disables payment submission.

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set only public values. On a physical phone, `localhost` points to the phone; use the development machine's LAN IP for `EXPO_PUBLIC_API_URL`.

## 4. Run locally

Start the API:

```powershell
pnpm dev:api
```

Start the mobile app in another terminal:

```powershell
pnpm dev:mobile
```

The free calculator works without Supabase or API variables. Login, premium guide content, payments, and saved projects require both services.

## 5. Manual bKash review

The customer sends exactly 99 BDT, signs in, binds the current installation, and submits the amount plus the sender number's last four digits. The request remains `pending`.

An administrator must:

1. Compare amount, approximate time, account email, and the four-digit suffix with the actual bKash statement.
2. Reject ambiguous or duplicate matches.
3. Approve only a confirmed transaction.

Admin API flow:

```text
GET  /v1/admin/payments
POST /v1/admin/payments/{paymentId}/approve
POST /v1/admin/payments/{paymentId}/reject
```

Every call requires the administrator's Supabase bearer token and that administrator account's bound `x-device-id`. Approval and entitlement creation occur in one database transaction.

## 6. Device resets

The app stores a random installation ID in OS secure storage. The API stores only an HMAC digest. Reinstalling the app or clearing secure storage can require a reset.

After validating account ownership, an administrator may call:

```text
POST /v1/admin/users/{userId}/device/reset
```

The next authenticated installation can then bind. Do not reset a device based only on an email message; require an ownership verification process.

## 7. Required checks

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @homexbd/mobile exec expo export --platform android --output-dir dist
```

The calculator regression tests must continue to match the source workbook examples: 7,000,000 BDT for 1,000 sq ft × 2 Standard/Other and 770,000 BDT for 100 sq ft × 2 Standard/Dhaka.

## 8. Production checklist

- Use HTTPS for the API and a strict `CORS_ORIGINS` allow list for any web clients.
- Store the Supabase secret key and device pepper in the hosting platform's secret manager.
- Configure custom SMTP, email templates, and the production mobile redirect URL.
- Create and test at least two non-admin accounts, one premium account, one rejected payment, a device mismatch, and a device reset.
- Run Supabase advisors and test table grants plus RLS in the dashboard RLS tester.
- Back up the database and document the bKash reconciliation owner and response time.
- Publish a privacy policy, terms, refund policy, and support process appropriate to Bangladesh before accepting money.
