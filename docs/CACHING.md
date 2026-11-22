# Caching strategy

## Decision

No Redis or other shared cache is needed for the MVP. The calculator is a pure local function, and the only cacheable server data is a small public configuration and guide. Supabase remains the source of truth for user and payment state.

## Mobile

| Data                               | Strategy                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Calculator                         | Run locally; no network cache                                                             |
| Free guide                         | AsyncStorage, 24-hour TTL, ETag revalidation, stale fallback when offline                 |
| Public configuration               | AsyncStorage, 1-hour TTL, ETag revalidation                                               |
| Auth session                       | Encrypted ciphertext in AsyncStorage; encryption key in SecureStore; not a response cache |
| Premium guide                      | Memory/view state only; refetch after entitlement/session changes                         |
| Account, device, payment, projects | No persistent response cache                                                              |

The app bundles only the three free guide sections as an offline fallback. It does not bundle premium text.

## API

| Endpoint                                                          | Header                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `/v1/config`                                                      | `public, max-age=3600, stale-while-revalidate=86400` + ETag |
| `/v1/guides/free`                                                 | `public, max-age=300, stale-while-revalidate=3600` + ETag   |
| `/health` and calculator POST                                     | `no-store`                                                  |
| All authenticated, premium, payment, project, and admin endpoints | `no-store`                                                  |

The API keeps guide rows in a per-process five-minute TTL cache. This reduces repeated Supabase reads without introducing distributed invalidation. A new replica warms its own cache.

## Invalidation

- Deploying new shared calculator code changes the rules version and API ETag.
- Free-guide edits can remain stale for at most five minutes at the API and one day on an offline device. Online devices revalidate after their local TTL.
- Premium-guide changes are intentionally not persisted on device and appear on the next fetch.
- Entitlement and payment changes are never CDN cached. The client refreshes `/v1/me` after submission and approval checks.

## When to add a shared cache

Consider a managed Redis-compatible service only when measurements show one of these:

- several API replicas produce unacceptable repeated guide/config database load;
- public configuration must invalidate globally in seconds;
- a verified pricing catalog becomes large or frequently requested;
- rate limits must be coordinated across replicas.

If added, use versioned keys, bounded TTLs, encryption in transit, least-privilege credentials, and explicit invalidation. Never store Supabase access tokens, raw device IDs, or payment claims in that cache.
