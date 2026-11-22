# HomeXBD House Cost Calculator

React Native, Express, TypeScript, and Supabase foundation for the HomeXBD house-cost calculator and construction guide.

The implementation keeps the original spreadsheet and PDFs unchanged. Their verified rules are represented once in `packages/shared`, used by both the mobile app and API, and covered by regression tests.

## Included

- Expo React Native app with an offline free calculator, free guide, email authentication, bKash claim form, lifetime-premium gating, one-installation binding, and saved projects.
- Express 5 API with validation, rate limiting, secure headers, redacted logging, manual payment-review endpoints, and cache controls.
- Supabase migration for profiles, one-device bindings, manual payment claims, lifetime entitlements, guide sections, saved projects, admin users, RLS, and explicit grants.
- Product, architecture, API, caching, source-rule, security, and developer guidance.

## Important product decision

The 99 BDT purchase is a one-time lifetime entitlement, not a recurring subscription. A submitted amount and sender-number suffix remain `pending` until an administrator verifies the payment against the real bKash statement. The app never auto-approves from four digits.

## Start here

1. Read [instructions.md](./instructions.md).
2. Review [docs/SOURCE_RULES.md](./docs/SOURCE_RULES.md) before changing calculator logic.
3. Review [SECURITY.md](./SECURITY.md) before connecting production credentials.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm build` before release.

## Workspace

```text
apps/mobile        Expo React Native application
apps/api           Express API
packages/shared    Calculator rules, schemas, and shared contracts
supabase           Versioned database migration
docs               Product and engineering documentation
```

The original `.xlsx` and `.pdf` files remain the product evidence and are not bundled into the app.
