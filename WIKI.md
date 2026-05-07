# Traqify Wiki

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Roles & Permissions](#roles--permissions)
4. [Organization Setup](#organization-setup)
5. [Products & Inventory](#products--inventory)
6. [Orders](#orders)
7. [Customers](#customers)
8. [Staff Management](#staff-management)
9. [Public Store](#public-store)
10. [Reports & Analytics](#reports--analytics)
11. [Audit Logs](#audit-logs)
12. [Email System](#email-system)
13. [API Reference](#api-reference)

---

## Architecture Overview

Traqify is a full-stack multi-tenant SaaS application.

**Frontend** — Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Recharts
**Backend** — Express.js, TypeScript, Prisma ORM, PostgreSQL (Supabase)
**Auth** — JWT (access + refresh tokens), OTP email verification, Google OAuth 2.0
**Storage** — Supabase Storage buckets

---

## Authentication

### Email / Password
1. Register with name, email, password, and org details
2. OTP sent to email (6 digits, 10 min expiry)
3. Verify OTP to activate account
4. Login returns `token` + `refreshToken` stored in localStorage
5. Token refresh happens automatically via axios interceptor at 401

### Google OAuth
1. Click "Continue with Google" ? redirects to `GET /api/auth/google-redirect`
2. Backend redirects to Google consent screen
3. Google redirects to `GET /api/auth/google-callback?code=...`
4. Backend exchanges code for user info, upserts user, returns tokens
5. Frontend `/auth-callback` page reads tokens from URL params and stores them

### Forgot Password
1. POST `/api/auth/forgot-password` with email
2. Reset link emailed (valid 1 hour)
3. POST `/api/auth/reset-password` with token + new password

---

## Roles & Permissions

| Action                  | OWNER | MANAGER | CASHIER | AUDITOR |
|-------------------------|:-----:|:-------:|:-------:|:-------:|
| View products/inventory |  ?    |   ?     |   ?     |   ?     |
| Create/edit products    |  ?    |   ?     |         |         |
| Create orders           |  ?    |   ?     |   ?     |         |
| View orders             |  ?    |   ?     |   ?     |   ?     |
| Manage customers        |  ?    |   ?     |   ?     |         |
| Invite staff            |  ?    |   ?     |         |         |
| View staff list         |  ?    |   ?     |         |         |
| View reports            |  ?    |   ?     |         |   ?     |
| View audit logs         |  ?    |         |         |   ?     |
| Manage org settings     |  ?    |         |         |         |

---

## Organization Setup

1. After account creation, user is prompted to create an organization
2. Org details: name, email, phone, address, industry, size
3. A URL slug is auto-generated from the org name
4. The owner is automatically linked to the organization
5. All dashboard routes are scoped by slug: `/dashboard/[slug]/[section]`

---

## Products & Inventory

### Adding Products
- Navigate to **Products** ? Click **Add product**
- Fill in: name, SKU, category, price, compare price, description
- Upload image (JPG/PNG/WebP, max 2MB) — previewed before save
- Set initial stock and low-stock alert threshold
- Toggle active/inactive status

### Inventory
- Inventory is automatically linked to each product
- Adjust stock via the **Inventory** page
- Low-stock badge appears when quantity = lowStockAlert
- Dashboard overview shows total low-stock count

---

## Orders

### Creating Orders (POS)
1. Go to **Orders** ? Click **Create order**
2. Search and add products with quantities
3. Optionally link to an existing customer
4. Set payment method and notes
5. Submit ? inventory decremented automatically

### Order Status
- `PENDING` ? `PROCESSING` ? `COMPLETED` or `CANCELLED` / `REFUNDED`

---

## Customers

- Add customers with name, email, phone, address
- Full order history per customer
- Search by name or email

---

## Staff Management

1. Go to **Staff** ? Click **Invite staff**
2. Enter name, email, and role
3. Invitation email sent with a secure link (48 hr expiry)
4. Invited member clicks link, sets password, and joins org
5. Owner can restrict/unrestrict accounts

---

## Public Store

Each org gets a public catalog at `/store/[slug]`.

- Browse products with search, category filter, sort, in-stock filter
- Add to cart, adjust quantities, remove items
- Guest checkout: name, email, phone, address, payment method
- Order confirmation email sent automatically

---

## Reports & Analytics

### Overview Dashboard
- **OWNER/MANAGER**: Revenue KPI, orders, products, customers, revenue AreaChart, top products BarChart
- **AUDITOR**: Revenue KPI, orders, revenue AreaChart, order status PieChart
- **CASHIER**: Orders and products KPIs only

### Sales Report
- Filter by date range
- Total revenue, total items sold, order list
- Printable with org branding

---

## Audit Logs

- Every create, update, delete, login action is logged
- Fields: user name + email, action type, entity, description, timestamp
- Paginated with search
- Visible to OWNER and AUDITOR

---

## Email System

Emails sent via Nodemailer + Gmail SMTP (app password).
Templates defined in `backend/src/emails/templates.ts`:
- `otpEmailTemplate(name, otp)`
- `passwordResetEmailTemplate(name, resetUrl)`
- `staffInviteEmailTemplate(orgName, role, inviteUrl)`
- `welcomeEmailTemplate(name, orgName, dashboardUrl)`
- `accountRestrictedEmailTemplate(name)`
- `passwordResetByAdminEmailTemplate(name, tempPassword)`

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register + send OTP |
| POST | /api/auth/verify-otp | Verify OTP |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET  | /api/auth/google-redirect | Start Google OAuth |
| GET  | /api/auth/google-callback | Google OAuth callback |
| POST | /api/auth/forgot-password | Send reset link |
| POST | /api/auth/reset-password | Reset password |
| PUT  | /api/auth/change-password | Change password (auth) |
| GET  | /api/auth/me | Get current user |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List products |
| POST | /api/products | Create product |
| PATCH | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| POST | /api/products/upload-image | Upload product image |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/orders | List orders |
| POST | /api/orders | Create order |
| PATCH | /api/orders/:id/status | Update status |
| GET | /api/orders/:id | Get order detail |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/reports/overview | Dashboard stats |
| GET | /api/reports/revenue-chart | Revenue by day |
| GET | /api/reports/top-products | Top products |
| GET | /api/reports/sales | Sales report |

### Public Store
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/store/:slug | Get org + products |
| POST | /api/store/:slug/checkout | Guest checkout |

### Newsletter
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/newsletter/subscribe | Subscribe to newsletter |
