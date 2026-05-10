# Traqify Backend

Express + TypeScript API server for the Traqify multi-tenant store management platform.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **ORM**: Prisma 5 (PostgreSQL / Supabase)
- **Language**: TypeScript
- **Email**: Nodemailer
- **Auth**: JWT (access + refresh tokens), bcrypt
- **PDF**: PDFKit
- **Payments**: Paystack webhook verification

## Getting started

```bash
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev
npm run dev            # starts on port 5000
```

## Project structure

```
src/
  config/         database.ts (Prisma client), email.ts (Nodemailer transport)
  controllers/    auth, org, product, order, inventory, customer, staff,
                  report, audit, store, category, newsletter, review
  middleware/     auth.middleware.ts (JWT + active-check)
                  rbac.middleware.ts (requireRole / requireMinRole / named guards)
                  error.middleware.ts
  routes/         one file per controller
  emails/         templates.ts (all HTML email templates)
  utils/          audit.ts (createAuditLog helper)
  index.ts        Express app setup, route registration, Paystack webhook, wishlist cron
prisma/
  schema.prisma   full data model
  migrations/     timestamped SQL migrations
```

## RBAC role hierarchy

| Role    | Score | Capabilities |
|---------|-------|-------------|
| OWNER   | 4     | Full access |
| MANAGER | 3     | Products, inventory, orders, customers, staff invites |
| AUDITOR | 2     | Read-all, audit logs, financial reports |
| CASHIER | 1     | Create orders, view own transactions, browse catalog |

Named middleware guards:
- `isOwnerOnly` — OWNER only
- `isOwnerOrManager` — OWNER or MANAGER
- `isAtLeastAuditor` — OWNER, MANAGER, AUDITOR (excludes CASHIER)
- `isAtLeastCashier` — all roles

## Key routes

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | /api/auth/send-otp | public | Send OTP for email verification |
| POST | /api/auth/verify-email | public | Verify OTP (supports pre-registration flow) |
| POST | /api/auth/register | public | Register user (email pre-verified in new flow) |
| POST | /api/auth/login | public | Login → tokens |
| GET | /api/auth/google | public | Google OAuth redirect |
| GET | /api/auth/google/callback | public | Google OAuth callback |
| GET | /api/reports/overview | isAtLeastAuditor | Dashboard stats |
| GET | /api/reviews/product/:id | public | Approved reviews for product |
| POST | /api/reviews | public | Submit review (COMPLETED order required) |
| GET | /api/reviews | isOwnerOrManager | Paginated reviews with status filter |
| PATCH | /api/reviews/:id/moderate | isOwnerOrManager | Approve / reject |
| DELETE | /api/reviews/:id | isOwnerOrManager | Delete review |
| POST | /api/newsletter/subscribe | public | Subscribe to newsletter |
| GET | /api/newsletter/subscribers | isOwnerOrManager | All subscribers |
| GET | /api/audit-logs | isAtLeastAuditor | Paginated audit logs with filters |
| GET | /api/audit-logs/unread-count | isAtLeastAuditor | Unread audit log count |
| PATCH | /api/audit-logs/mark-read | isAtLeastAuditor | Mark logs as read/unread |
| POST | /api/store/:slug/checkout | public | Public store checkout |
| GET | /api/store/:slug | public | Public store products + org info |

## Environment variables

See `.env.example` for the full list. Required:
- `DATABASE_URL`, `DIRECT_URL` (Supabase / PgBouncer)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SMTP_*` (Nodemailer)
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (File storage)
- `PAYSTACK_SECRET_KEY` (Payments)
