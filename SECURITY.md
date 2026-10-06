# Security

This document describes the security architecture, controls, and practices in place across the Traqify platform. It covers both the Express API backend and the Next.js frontend.

---

## Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Send reports to: **security@traqify.com** or reach the maintainer directly via [@oyedokunken](https://github.com/oyedokunken).

Include in your report:

- A clear description of the vulnerability
- Reproduction steps
- Potential impact
- A suggested fix if you have one (optional)

You will receive an acknowledgement within 48 hours and a full response within 7 days.

---

## Transport Security

- All traffic in production runs over HTTPS (enforced by Vercel).
- The backend uses [Helmet](https://helmetjs.github.io/) to set security-relevant HTTP response headers on every request, including `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and `Content-Security-Policy`.
- CORS is configured with an explicit origin allowlist tied to `FRONTEND_URL`. Requests from any other origin are rejected.
- The `Authorization` header and `Content-Type` are the only allowed headers.

```ts
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

---

## Authentication

### Email and Password

- Passwords are hashed with `bcryptjs` at a cost factor of 12 before storage. Plain-text passwords are never persisted.
- Login returns a signed JWT access token and a signed JWT refresh token.
- A failed login with an unverified email triggers a new OTP to be sent without revealing whether the password was correct.

### OTP Email Verification

- Every new account must verify its email address via a 6-digit OTP before it can log in.
- OTPs are generated with `crypto.randomInt(100000, 999999)` (cryptographically secure).
- The OTP is hashed with SHA-256 before being stored. Only the hash is persisted in the database; the plain OTP is delivered by email only.
- OTPs expire after 10 minutes.
- After 5 incorrect attempts on a single OTP record the record is marked used and must be re-requested, preventing brute-force enumeration of the 6-digit space.

### Google OAuth 2.0

- The OAuth flow uses the `passport-google-oauth20` server-side strategy.
- After the callback, the backend stores the access token and refresh token in a short-lived `OAuthSession` database record (expires in 2 minutes) and redirects the browser with only a one-time opaque code in the URL.
- The frontend exchanges that code by calling `GET /api/auth/oauth-exchange/:code`. The code is deleted immediately after the first successful exchange.
- Tokens are never embedded in redirect URLs, preventing them from appearing in browser history or server access logs.

### Password Reset

- Reset tokens are generated with `crypto.randomBytes(32)` (256 bits of entropy).
- Tokens expire after 1 hour and are single-use.
- The `POST /api/auth/forgot-password` endpoint returns an identical response whether the email exists or not, preventing account enumeration.

---

## Session Management

### JWT Tokens

- Access tokens are signed with `JWT_SECRET` and expire according to `JWT_EXPIRES_IN` (default: 7 days).
- Refresh tokens are signed with `JWT_REFRESH_SECRET` and expire after 30 days.
- Both tokens carry a `tokenVersion` claim matching the user's current `tokenVersion` value in the database.

### Token Version Invalidation

Every JWT contains a `tokenVersion` integer. The authentication middleware and the refresh endpoint compare the token's `tokenVersion` against the value stored on the `User` row.

The `tokenVersion` is incremented in the database whenever:

- The user calls `POST /api/auth/logout` (server-side logout).
- The user changes their password via `POST /api/auth/change-password`.
- An admin resets the user's password via the staff management interface.

When the versions do not match the request is rejected with a 401. This guarantees that all existing access and refresh tokens for a user become invalid immediately on logout or password change, regardless of their remaining expiry.

### Token Storage

Access tokens and refresh tokens are stored in `localStorage` on the frontend. This is a pragmatic trade-off for a client-rendered SPA. The consequence is that a successful XSS attack could read the tokens. Migrating to `httpOnly` Secure `SameSite=Strict` cookies would eliminate this risk entirely and is the recommended direction for a future hardening cycle.

---

## Authorization

### Role-Based Access Control

Four roles are defined with a numeric hierarchy:

| Role    | Score | Description |
|---------|-------|-------------|
| OWNER   | 4     | Full platform access |
| MANAGER | 3     | Operational access: products, inventory, orders, customers, staff invites |
| AUDITOR | 2     | Read-only access to all data, audit logs, and financial reports |
| CASHIER | 1     | Create and manage own orders; browse catalogue; manage customers |

Named middleware guards used at the route level:

| Guard             | Minimum required role |
|-------------------|-----------------------|
| `isOwnerOnly`     | OWNER |
| `isOwnerOrManager`| MANAGER |
| `isAtLeastAuditor`| AUDITOR |
| `isAtLeastCashier`| CASHIER (any authenticated member) |

### Organization Scope Enforcement

Every query that touches business data is scoped to `organizationId` taken from the authenticated user's JWT. No controller accepts an `organizationId` from the request body or query string for data access decisions. Cross-tenant data access is structurally prevented at the query level.

### OWNER Protection

The `OWNER` account cannot be deactivated, removed, or have its role changed by any other staff member. These protections are enforced at the controller level in `toggleStaffAccess`, `removeStaff`, and `updateStaffRole`.

### Invite Role Cap

The `inviteStaffSchema` Zod validator rejects any invitation that specifies the `OWNER` role. Staff can only be invited as `MANAGER`, `CASHIER`, or `AUDITOR`.

---

## Input Validation

- All incoming request bodies are validated with **Zod** schemas before reaching any controller. Invalid requests are rejected at the boundary with a 400.
- All database queries use **Prisma**, which parameterizes all values, preventing SQL injection.
- Frontend forms use `react-hook-form` with Zod resolvers for client-side validation. Server-side validation is always the authoritative check.

### Password Policy

All password fields (registration, reset, invite accept, change password) enforce:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

---

## Rate Limiting

Two tiers are applied via `express-rate-limit`:

| Limiter       | Window    | Max requests | Applied to |
|---------------|-----------|--------------|------------|
| Global        | 15 minutes | 200          | All routes |
| Auth          | 15 minutes | 20           | `/api/auth/*` |

Both limiters are applied per IP address. The auth limiter provides additional protection against credential stuffing and OTP enumeration.

---

## File Uploads

All file handling uses `multer` with `memoryStorage`. Files are never written to the server's local filesystem.

| Upload type       | Allowed MIME types | Max size |
|-------------------|--------------------|---------|
| Product images    | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| Avatar / Logo     | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| Downloadable products | PDF, ZIP, Office documents, common image and audio/video formats | 4 MB |

Files that do not match the allowlist are rejected before being read into memory. After validation, files are uploaded to **Supabase Storage** and only the resulting public URL is stored in the database.

---

## Payment Security

- Paystack payment status is always verified server-side by calling the Paystack Verify API with the `paystackReference` provided by the client.
- The server independently recalculates the order total from stored product prices. The `verifiedAmount` returned by Paystack must match the server-computed `totalAmount` within 1 kobo. A mismatch rejects the order with a 402 before any inventory change or order record is created.
- Payment amounts, statuses, and references submitted by clients for internal payment records (`POST /api/payments`) can only be created or updated by `OWNER` or `MANAGER` roles.

---

## Audit Logging

Every write operation (create, update, delete) records an `AuditLog` entry containing:

- `userId` and `organizationId`
- `action` (CREATE / UPDATE / DELETE / LOGIN / EXPORT)
- `entity` and `entityId`
- `details` (human-readable description)
- `ipAddress` and `userAgent`

Audit logs are append-only from the API surface. There is no delete endpoint. Only `AUDITOR` and above can read them. Only `OWNER` and `MANAGER` can mark them as read.

---

## Cron Job Security

A daily Vercel Cron job calls `GET /api/cron/ping` to keep the Supabase Free-tier database from pausing.

- Vercel injects `Authorization: Bearer <CRON_SECRET>` on every scheduled invocation.
- The endpoint verifies the header value before executing any database operation.
- The `CRON_SECRET` environment variable must not contain leading or trailing whitespace (a Vercel requirement for HTTP header values).
- The secret must be set in the Vercel project environment variables and must not be committed to the repository.

---

## Error Handling

- In production (`NODE_ENV=production`), the error handler returns a generic message and a status code. Stack traces are never sent to the client.
- In development, stack traces are included to aid debugging.
- Unmatched routes are caught by the `notFound` middleware before the generic error handler, returning a structured 404 rather than the Express HTML default.

---

## Environment Variables

No secrets are committed to the repository. Every sensitive value is set via environment variables. The file `.env.example` lists all required keys without values.

At startup, the API server validates that the following variables are present. If any are missing the process throws before accepting any traffic:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL`
- `PAYSTACK_SECRET_KEY`
- `FRONTEND_URL`

See `backend/.env.example` for the full list of variables including Supabase, Google OAuth, SMTP, and cron configuration.

---

## Known Limitations and Accepted Trade-offs

- **localStorage token storage**: Tokens remain accessible to JavaScript running on the page. A future migration to `httpOnly` Secure cookies would eliminate XSS-based token theft.
- **No per-user session list**: Users cannot see or revoke individual device sessions. The `tokenVersion` mechanism invalidates all sessions simultaneously on logout or password change but does not support selective revocation.
- **Supabase Free-tier pausing**: The cron job runs at most once per day (Vercel Hobby limit). If the database is paused manually or by Supabase, it must be resumed from the Supabase dashboard before the API can accept requests.
- **Public review submission**: Product reviews can be submitted by anyone who has a valid `orderId` and `productId` combination. There is no authenticated customer identity check. This is intentional for a guest checkout flow but may allow reviews from guessed order IDs (UUIDs mitigate this in practice).
