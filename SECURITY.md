# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| 1.4.x   | ✅ Yes    |
| 1.3.x   | ✅ Yes    |
| 1.2.x   | ✅ Yes    |
| < 1.2   | ❌ No     |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email security reports to: **security@traqify.com** (or reach the maintainer via [@oyedokunken](https://github.com/oyedokunken)).

Include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fix (optional)

You will receive an acknowledgement within **48 hours** and a full response within **7 days**.

---

## Security Architecture

### Authentication

- **JWT access tokens** — short-lived (15 min), signed with `JWT_SECRET`, stored in `localStorage` on the frontend
- **Refresh tokens** — long-lived (7 days), stored alongside access tokens; `/api/auth/refresh` issues new access tokens
- **Google OAuth 2.0** — handled server-side via `passport-google-oauth20`; conflicts between email/password and OAuth accounts are surfaced as clear error messages
- **OTP email verification** — required before any account is fully activated; OTPs expire after 10 minutes
- **Password hashing** — all passwords hashed with `bcryptjs` (salt rounds: 10) before storage

### Authorisation (RBAC)

Four roles with descending privilege: `OWNER > MANAGER > CASHIER > AUDITOR`

- Route-level enforcement via `authenticate` and `isOwnerOnly` / `isOwnerOrManager` Express middleware
- All authenticated routes require a valid JWT; expired tokens are rejected with `401`
- Organisation scope is enforced on every query — users can only access their own organisation's data
- **OWNER protection**: the OWNER account cannot be restricted, removed, or have their password reset by any other staff member — enforced at the controller level on `toggleStaffAccess`, `removeStaff`, and `resetStaffPassword`
- **Invite role cap**: `inviteStaffSchema` only allows MANAGER / CASHIER / AUDITOR — the OWNER role can never be assigned via invitation

### CORS

- Configured with an explicit `FRONTEND_URL` allowlist (set via environment variable)
- Only the Next.js frontend origin is permitted in production
- Credentials (`cookies`, `Authorization` header) are allowed for that origin only

```ts
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

### Axios (Frontend)

- Base URL set to `NEXT_PUBLIC_API_URL`
- `Authorization: Bearer <token>` header injected on every request via Axios interceptor
- On `401` response, interceptor calls `/api/auth/refresh`; if refresh also fails, user is redirected to `/login`
- No credentials/cookies are used — tokens are stored in `localStorage`

### File Uploads

- All uploads go through `multer` with `memoryStorage` (never written to disk)
- File type restricted to `image/jpeg`, `image/png`, `image/webp`
- Maximum file size: **5 MB** for products, **2 MB** for avatars/logos
- Files are uploaded directly to **Supabase Storage** and the public URL is stored in the database
- Upload endpoints are protected by `authenticate` + role middleware

### Input Validation

- All backend request bodies validated with **Zod** schemas before reaching controllers
- Prisma parameterised queries prevent SQL injection
- Frontend forms use `react-hook-form` + Zod resolvers for client-side validation

### Audit Logging

- Every create/update/delete action records an `AuditLog` entry with `userId`, `organizationId`, `action`, `entity`, `entityId`, `details`, `ipAddress`, and `userAgent`
- Audit logs are read-only from the frontend (OWNER and AUDITOR roles only)

### Environment Variables

Sensitive values are never committed to the repository. See `.env.example` for required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `REFRESH_TOKEN_SECRET` — token signing secrets
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Supabase admin access
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `SMTP_*` — email sending credentials
- `PAYSTACK_SECRET_KEY` — payment processing

---

## Known Limitations

- Refresh tokens are stored in `localStorage` (not `httpOnly` cookies). This is a pragmatic trade-off for a SPA. Production deployments should consider migrating to `httpOnly` cookie refresh tokens.
- Per-route rate limiting is applied on auth endpoints via `express-rate-limit`; consider stricter limits under high traffic.
- Paystack payment verification is performed server-side before order creation; client-side reference values are never trusted without verification.
