# Engineering best practices

## Calculator and construction content

- Keep formulas in `@homexbd/shared`; never retype rates in a screen or route.
- Preserve units in names: `floorAreaSqFt`, `effectiveRatePerSqFt`, and `amountBdt` are intentionally explicit.
- Version calculation rules and store the version with every saved project.
- Add boundary tests before changing rates, multipliers, splits, thresholds, or rounding.
- Do not invent engineering quantities from the current source. A material-by-material bill of quantities needs owner-approved formulas and validation by a qualified Bangladesh construction professional.
- Display the preliminary-estimate warning beside results, not only in legal pages.

## React Native

- Keep the free calculation local so it remains fast and usable offline.
- Store session ciphertext in AsyncStorage and its key in OS SecureStore. Store the installation ID only in SecureStore.
- Treat everything in an Expo bundle, including `EXPO_PUBLIC_` values, as public.
- Do not bundle premium guide bodies. Fetch them only after the API validates session, device, and entitlement.
- Refresh Supabase tokens only while the app is active and handle email-confirmation deep links explicitly.
- Give every async action a loading, success, validation, offline, and server-error state.
- Test on low-end Android hardware and with Bangla font scaling before release.

## Express API

- Keep routes thin: validate, authorize, call a typed service, and return a stable contract.
- Validate headers, route parameters, and bodies with bounded schemas. Reject unknown ownership and status fields.
- Use small request-body limits, secure headers, origin allow lists, rate limits, request IDs, and structured logs with redaction.
- Never log complete request bodies for authentication or payments.
- Derive calculations on the server instead of accepting a client-calculated total for saved records.
- Use `Cache-Control: no-store` on every user-specific or sensitive response.
- Preserve graceful shutdown so deployments do not cut active requests unnecessarily.

## Supabase

- Use publishable keys for public clients and a named secret key for the Express service. Rotate them independently.
- Keep RLS enabled on every `public` table even if current grants allow only `service_role`.
- Specify grants in the same migration as policies. New tables are not automatically exposed on current Supabase projects.
- Write ownership policies with `(select auth.uid()) = user_id`; `TO authenticated` alone is not object authorization.
- Give update policies both `USING` and `WITH CHECK`.
- Do not use user metadata for roles. Store administrator and entitlement state in tables controlled by the backend.
- Avoid `SECURITY DEFINER`. When a trigger truly requires it, put the function in a private schema, set `search_path`, fully qualify objects, and revoke public execution.
- Run security and performance advisors after every migration and test policies as anon, normal user A, normal user B, premium user, and admin.

## Payments and entitlements

- Model this product as a lifetime entitlement, not a recurring subscription.
- Store the minimum claim data needed for reconciliation. Do not collect a full sender phone number, PIN, OTP, or bKash password.
- Keep pending-payment uniqueness and price checks in the database, not only the UI.
- Require a real external statement match. Four digits and 99 BDT can collide.
- Make approval idempotent and transactional. A failed entitlement insert must roll back the approval.
- Keep a reviewer ID, review time, and short note for auditability.
- Define an ownership-verification procedure before device resets or email changes.

## Caching

- Cache immutable/public rule configuration and free guide content with an ETag and bounded TTL.
- Cache a stale public value on the device for offline use, but do not treat cache freshness as authorization.
- Never cache access tokens, `/v1/me`, payment state, premium guide responses, projects, device state, or admin queues in a CDN/shared cache.
- Do not introduce Redis at MVP scale. Add it only after measuring database load or when several API replicas need immediate shared invalidation.

## Dependencies and operations

- Pin exact dependency versions and commit `pnpm-lock.yaml`.
- Approve native dependency build scripts narrowly; this workspace allows esbuild only.
- Use Node 22.18 or newer and TypeScript 5 or newer.
- Keep separate development, staging, and production Supabase projects and secret keys.
- Release only after TypeScript, unit/API tests, API build, Android bundle, database advisor, and manual end-to-end payment checks pass.
