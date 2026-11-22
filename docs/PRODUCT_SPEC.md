# Product specification

## Goal

Help a Bangladesh homeowner make an early house-construction budget and learn basic cost-control practices without presenting the result as a professional estimate.

## Audience

- First-time homeowners and small property owners.
- Bangla-first mobile users.
- Users who need a quick early budget before hiring an architect, engineer, or quantity surveyor.

## Free tier

- No login required for the calculator.
- Inputs: per-floor construction area, floor count, construction type, and location.
- Outputs: total built-up area, adjusted rate, total estimate, min/max range, and workbook budget warning.
- Three introductory guide sections.
- Offline calculation and bundled free-guide fallback.

## Lifetime premium tier

- One-time price: 99 BDT.
- Login with a verified email is required.
- One active account per installation and one active installation per account.
- Detailed 50% structure, 30% finishing, 10% electrical, and 10% plumbing split.
- Potential 10% savings indicator.
- Full ten-section construction guide.
- Cloud-saved project history.
- Access continues indefinitely unless the account is terminated for a policy violation or the product owner changes terms lawfully and with appropriate notice.

## Purchase workflow

1. User signs in and verifies email.
2. App displays the configured bKash receiving account and fixed 99 BDT amount.
3. User pays externally in bKash.
4. App binds the current installation and accepts the amount plus sender-number suffix.
5. Request remains pending.
6. Administrator matches it to the real statement.
7. Approval atomically creates the lifetime entitlement.

No automatic approval is allowed with the current evidence fields.

## Non-goals for this version

- Detailed cement, sand, aggregate, steel, brick, labor, door, window, paint, fixture, or MEP quantities.
- Structural sizing, foundation selection, soil analysis, drawing review, permit validation, or code compliance.
- Real-time material prices.
- Recurring billing, bKash checkout API, refunds automation, coupons, or family sharing.
- Tamper-proof DRM or hardware attestation.

## Future material calculator gate

Do not add an “all items” bill of quantities by guessing coefficients. Before that feature begins, the owner must supply or approve:

- item formulas and units;
- structural-system and material assumptions;
- waste factors and regional price sources;
- effective dates and rate-update ownership;
- independent examples verified by a qualified engineer or quantity surveyor;
- a clear distinction between quantity estimate and market-price estimate.

Add those rules as a new version rather than silently changing `homexbd-workbook-v1`.

## Success measures

- Calculator parity tests remain exact for source examples.
- A free user can calculate without network access.
- No customer becomes premium before payment review.
- Cross-account and mismatched-device requests fail closed.
- Support can resolve a legitimate device replacement through a recorded admin reset.
