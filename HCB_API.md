# HCB API Reference

Reverse-engineered from https://github.com/hackclub/hcb.

## Authentication

HCB uses **Doorkeeper OAuth 2.0** for API v4. All authenticated requests require:

```
Authorization: Bearer hcb_<token>
```

Tokens are prefixed with `hcb_` followed by a 32-byte URL-safe base64 string. They expire after 2 hours by default.

### OAuth Authorization Code Flow

1. Redirect the user to the authorization endpoint:
   ```
   GET /api/v4/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=card_grants:write
   ```
2. After the user consents, exchange the returned `code` for a token:
   ```http
   POST /api/v4/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&code=...&client_id=...&client_secret=...&redirect_uri=...
   ```
3. The response includes `access_token` (the `hcb_...` token) and `refresh_token`.

### Device Code Flow

POST to `/api/v4/oauth/authorize` with `response_type=device_code`, then poll while the user verifies at:
```
https://hcb.hackclub.com/api/v4/oauth/device
```

### Other OAuth Endpoints

```
GET  /api/v4/oauth/authorize   # show authorization dialog
POST /api/v4/oauth/token       # exchange code for token
POST /api/v4/oauth/revoke      # revoke a token
```

### Scopes

Tokens without the `restricted` scope have full access. Restricted tokens require explicit scopes such as:

- `card_grants:write`
- `organizations:read`
- `user_lookup`

---

## Card Grants

### Create a Grant

```http
POST /api/v4/organizations/:organization_id/card_grants
Authorization: Bearer hcb_<token>
Content-Type: application/json

{
  "amount_cents": 5000,
  "email": "recipient@example.com",
  "purpose": "Club supplies",
  "invite_message": "Here's your grant!",
  "expiration_at": "2026-12-31"
}
```

`:organization_id` accepts the public ID (e.g. `org_1234`) or the organization slug.

**Requirements:**
- Token must have the `card_grants:write` scope (or be a non-restricted token)
- Authenticated user must be a **manager or higher** on the organization
- The organization's plan must have card grants enabled

**Parameters:**

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `amount_cents` | integer | yes | Must be > 0 |
| `email` | string | yes | Recipient email; user is auto-created if not found |
| `purpose` | string | no | Max 30 characters |
| `invite_message` | string | no | Included in the invitation email |
| `instructions` | string | no | Card usage instructions |
| `one_time_use` | boolean | no | Whether the card is single-use |
| `pre_authorization_required` | boolean | no | Whether admin must approve before card activates |
| `merchant_lock` | string | no | Comma-separated allowed merchant IDs |
| `category_lock` | string | no | Comma-separated allowed merchant category codes |
| `keyword_lock` | string | no | Keyword restriction |
| `expiration_at` | string | no | ISO 8601 date; defaults to org preference (~1 year) |

**Response:** HTTP 201 on success with a grant object (ID prefixed `cdg_`) and a `Location` header. HTTP 422 on failure with `{ "error": "invalid_operation", "messages": ["..."] }`.

The response body includes:
- `id` — public ID (`cdg_` prefix)
- `amount_cents`
- `email`
- `purpose`
- `merchant_lock`, `category_lock`, `keyword_lock`
- `allowed_merchants`, `allowed_categories`
- `one_time_use`
- `pre_authorization_required`
- `expires_on`
- `status` — `active`, `canceled`, or `expired`
- `card_id` — Stripe virtual card ID (null until activated)

### Other Grant Endpoints

```
GET   /api/v4/organizations/:organization_id/card_grants   # list org's grants (requires manager)
GET   /api/v4/user/card_grants                             # list current user's grants
GET   /api/v4/card_grants/:id                              # get a single grant
PATCH /api/v4/card_grants/:id                              # update a grant
POST  /api/v4/card_grants/:id/activate                     # create the Stripe virtual card
POST  /api/v4/card_grants/:id/topup                        # add funds (param: amount_cents)
POST  /api/v4/card_grants/:id/withdraw                     # remove funds (param: amount_cents)
POST  /api/v4/card_grants/:id/cancel                       # cancel the grant
GET   /api/v4/card_grants/:id/transactions                 # transaction history
```
