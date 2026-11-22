# API contract

Base path: `/v1`. JSON bodies are limited to 16 KB. Protected routes use:

```http
Authorization: Bearer <supabase-access-token>
X-Device-Id: <installation-uuid>
```

The raw device ID is sent only over HTTPS and is never stored server-side.

## Public

| Method | Path                      | Purpose                                              | Cache                   |
| ------ | ------------------------- | ---------------------------------------------------- | ----------------------- |
| GET    | `/health`                 | Process liveness                                     | no-store                |
| GET    | `/v1/config`              | Rule metadata, fixed price, configured bKash account | public 1 hour + ETag    |
| POST   | `/v1/calculator/estimate` | Server parity calculation                            | no-store                |
| GET    | `/v1/guides/free`         | Free guide sections                                  | public 5 minutes + ETag |

## Authenticated

| Method | Path                  | Extra requirement     | Purpose                                                |
| ------ | --------------------- | --------------------- | ------------------------------------------------------ |
| POST   | `/v1/devices/bind`    | device header         | Bind first installation or the post-reset installation |
| GET    | `/v1/me`              | none                  | Entitlement, binding flag, and latest payment state    |
| POST   | `/v1/payments`        | matching bound device | Submit exactly 99 BDT plus four numeric suffix digits  |
| GET    | `/v1/payments/latest` | matching bound device | Read the caller's latest payment claim                 |

## Premium

These routes require verified Auth, matching device, and lifetime entitlement.

| Method | Path                       | Purpose                                          |
| ------ | -------------------------- | ------------------------------------------------ |
| GET    | `/v1/guides/premium`       | Full guide                                       |
| GET    | `/v1/projects`             | List up to 100 saved projects                    |
| POST   | `/v1/projects`             | Calculate on the server and save a named project |
| DELETE | `/v1/projects/{projectId}` | Delete only the caller's project                 |

## Administrator

These routes additionally require membership in `admin_users`.

| Method | Path                                     | Purpose                                                 |
| ------ | ---------------------------------------- | ------------------------------------------------------- |
| GET    | `/v1/admin/payments`                     | Pending review queue                                    |
| POST   | `/v1/admin/payments/{paymentId}/approve` | Atomic approval and lifetime entitlement                |
| POST   | `/v1/admin/payments/{paymentId}/reject`  | Reject with optional note                               |
| POST   | `/v1/admin/users/{userId}/device/reset`  | Disable the active binding after ownership verification |

Review body:

```json
{ "note": "Matched the 99 BDT statement entry." }
```

## Error envelope

```json
{
  "error": {
    "code": "DEVICE_MISMATCH",
    "message": "This account is already bound to another device.",
    "requestId": "..."
  }
}
```

Clients should branch on `code`, not English message text. No endpoint accepts a body-supplied `userId`, result total, status, role, or entitlement.
