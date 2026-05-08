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
| POST | /api/auth/register | public | Register OWNER + org |
| POST | /api/auth/login | public | Login → tokens |
| GET | /api/reports/overview | isAtLeastAuditor | Dashboard stats |
| GET | /api/reviews/product/:id | public | Approved reviews for product |
| POST | /api/reviews | public | Submit review (COMPLETED order required) |
| PATCH | /api/reviews/:id/moderate | isOwnerOrManager | Approve / reject |
| GET | /api/store/:slug | public | Public store products + org info |

## Environment variables

See `.env.example` for the full list. Required:
- `DATABASE_URL`, `DIRECT_URL` (Supabase / PgBouncer)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SMTP_*` (Nodemailer)
- `FRONTEND_URL`
