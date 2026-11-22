# Agent guidance

## Product boundary

This repository implements a preliminary house-cost estimator and construction guide for Bangladesh. It does not produce an engineering bill of quantities, structural design, permit decision, or guaranteed market quote.

The original workbook and PDFs are evidence. Do not edit them. Preserve their license and disclaimer material.

## Sources of truth

1. `docs/SOURCE_RULES.md` explains the extracted source rules.
2. `packages/shared/src/calculator.ts` is the executable calculator source of truth.
3. `supabase/migrations/` is the database source of truth.
4. `docs/PRODUCT_SPEC.md` defines free and premium scope.

Never duplicate calculation constants in the mobile or API packages. Import them from `@homexbd/shared`.

## Architecture rules

- Mobile may call Supabase directly only for Auth. Product data goes through Express.
- The mobile app receives only a Supabase publishable key. Supabase secret keys stay on the API.
- Free calculation is deterministic and local-first. The API calculation endpoint is a parity boundary, not a required round trip.
- Premium guide content is fetched after authentication, device validation, and entitlement validation. Do not bundle premium guide text in the client.
- A 99 BDT payment claim never activates premium automatically. Only an administrator may approve it after external statement verification.
- Lifetime premium is an entitlement, not a recurring subscription.
- One account maps to one active installation digest, and one digest maps to one active account. Device binding is a commercial control, not a hardware-security guarantee.

## Security invariants

- Never authorize from `user_metadata`; use database state or trusted app metadata.
- Never accept `user_id`, payment status, calculated totals, entitlement, or device digest from request bodies.
- Always derive the user from a verified access token.
- Keep RLS enabled on every `public` table even when current mobile access is API-only.
- Add explicit grants with each schema change. Do not assume new tables are exposed or hidden.
- Any `SECURITY DEFINER` function must live outside the exposed API schema when possible, use an empty or fixed `search_path`, and have public execution revoked.
- Redact authorization, raw device IDs, and payment identifiers from logs.
- Authenticated, payment, premium, and admin responses use `Cache-Control: no-store`.

## Change workflow

1. Read the nearest documentation and relevant source tests.
2. If a calculator rule changes, update `SOURCE_RULES.md`, shared code, and regression tests in the same change. Record the business owner and effective version.
3. Create migrations with `pnpm exec supabase migration new <name>` after checking current CLI help. Never hand-invent migration filenames.
4. Review grants, RLS policies, indexes, and advisor output for every database change.
5. Run the required commands below.

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @homexbd/mobile exec expo export --platform android --output-dir dist
```

## Definition of done

- User-visible behavior is implemented in Bangla-first copy with clear error states.
- Calculator changes reconcile to independent examples and preserve units and threshold boundaries.
- Auth and payment failures fail closed.
- No secrets, real customer data, or real payment identifiers are committed.
- Tests, TypeScript checks, API build, and at least one Expo platform bundle pass.
- Documentation explains any operational step that cannot be automated.
