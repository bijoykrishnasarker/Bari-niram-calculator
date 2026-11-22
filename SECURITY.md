# Security Policy

## System and Scope

This policy covers the React Native app in `apps/mobile`, the Express API in `apps/api`, shared calculation code in `packages/shared`, and Supabase objects defined in `supabase`.

The deployed system is internet-facing. It stores Supabase account identifiers, account email addresses, HMAC device digests, payment claims containing an amount and sender-number suffix, lifetime entitlements, and saved calculator projects. The original workbook and PDF files are development evidence and must not be served as public runtime assets.

## Threat Model and Trust Boundaries

Attacker-controlled inputs include every mobile/API field, bearer token, device installation ID, request header, guide query, project name, payment suffix, and administrator note. A user may control the phone, reverse engineer the app, replay requests, create several accounts, or call Supabase and Express endpoints outside the UI.

Trusted boundaries are:

- Supabase Auth verifies account sessions.
- Express verifies the bearer token and enforces product workflows.
- The Supabase secret key and `DEVICE_HASH_PEPPER` exist only in trusted server secret storage.
- Administrators are identified by `public.admin_users` and must verify payments against the external bKash statement.
- Database constraints, explicit grants, and RLS provide defense in depth.

bKash itself and the administrator's access to its statement are external systems. Four digits supplied by a customer are untrusted correlation data, not cryptographic proof.

## Security Invariants

- The mobile app must never contain a Supabase secret/service-role key, database password, device pepper, or administrator credential.
- Every protected Express request must derive its user ID from a verified Supabase access token. Request bodies never choose ownership.
- Authorization must not use `raw_user_meta_data` or user-editable JWT metadata.
- Every exposed-schema table keeps RLS enabled. Grants and policies must be reviewed together.
- The API may use a secret key only after its own ownership and role checks, because the secret bypasses RLS.
- A user can have at most one active device digest, and an active digest can belong to at most one user.
- Raw installation IDs are never stored server-side. They are HMAC-SHA256 digested with a server-only pepper and compared in constant time.
- A payment request must be exactly 99 BDT with four numeric suffix digits. Submission remains pending and cannot create an entitlement.
- Only a bound administrator in `admin_users` may approve or reject. Approval and lifetime-entitlement creation must be atomic.
- Premium content and saved projects require a valid session, matching device, and active lifetime entitlement.
- Authorization headers, raw installation IDs, and payment suffixes must not appear in logs or analytics.
- Authentication, payment, entitlement, project, premium-guide, and administrator responses must not be stored by shared caches.

## Reportable Findings and Severity Context

Report vulnerabilities that realistically allow:

- unauthenticated or cross-account access to payment, project, device, entitlement, or premium-guide data;
- premium activation without administrator approval or approval by a non-admin;
- bypass of the one-active-device database constraints through an API race;
- exposure of the Supabase secret key, device pepper, session token, payment suffix, or private account data;
- injection, unsafe deserialization, unrestricted request bodies, denial of service, or unbounded database access;
- stale or public caching of protected responses;
- a calculator change that silently produces materially wrong totals from valid inputs.

Treat secret-key exposure, arbitrary entitlement creation, administrator takeover, or broad cross-account data access as critical. Treat single-account cross-tenant access or payment-approval bypass as high. Evaluate device-control bypass in light of the known limitation below, but report any server-side bypass that defeats the documented active-binding checks.

## Out of Scope, Exclusions, and Accepted Risk

- Rooted/jailbroken devices and a fully compromised client OS are not trusted execution environments.
- The installation ID is resettable and spoofable by a determined client. It is an abuse deterrent, not hardware attestation or DRM.
- Manual bKash statement access, bKash account security, mobile carrier security, and social-engineering controls are operational dependencies outside this codebase.
- The estimator is intentionally approximate and is not a structural design or final bill of quantities. Product disagreements with documented workbook rules are not security findings unless tampering or cross-user impact is involved.
- Denial of access after an app reinstall is an accepted tradeoff until the administrator completes an ownership-verified device reset.

## Known Limitations and Compensating Controls

- Last four digits plus amount are not unique proof. The compensating control is mandatory human verification against the actual bKash statement; auto-approval is prohibited.
- A custom bKash merchant API or signed webhook is not integrated. If one becomes available, verify signatures and idempotency before changing the manual workflow.
- The API currently uses a Supabase secret client for product data. It therefore performs explicit ownership filtering in code while RLS remains enabled for future direct-user access.
- Device pepper rotation requires a planned rebind because only digests are stored.
- Local Supabase advisor execution requires Docker, which is not present in this workspace. Run hosted advisors before deployment.
- Email confirmation deep links depend on correct Supabase redirect allow-list and mobile scheme configuration.

## Reporting

Do not open a public issue containing customer data, tokens, keys, payment details, or an active exploit. Send a private report to the repository owner with affected version, impact, reproduction steps using test data, and suggested remediation. Rotate any exposed credential immediately and invalidate affected sessions where supported.
