# Traqify Wiki

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Roles and Permissions](#roles-and-permissions)
4. [Organization Setup](#organization-setup)
5. [Products and Inventory](#products-and-inventory)
6. [Orders](#orders)
7. [Customers](#customers)
8. [Staff Management](#staff-management)
9. [Payments](#payments)
10. [Public Store](#public-store)
11. [Newsletter](#newsletter)
12. [Product Reviews](#product-reviews)
13. [Reports and Analytics](#reports-and-analytics)
14. [Audit Logs](#audit-logs)
15. [Email System](#email-system)
16. [API Reference](#api-reference)

---

## Architecture Overview

Traqify is a full-stack multi-tenant SaaS application.

**Frontend** - Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Recharts
**Backend** - Express.js, TypeScript, Prisma ORM, PostgreSQL (Supabase)
**Auth** - JWT (access + refresh tokens), OTP email verification, Google OAuth 2.0
**Storage** - Supabase Storage buckets

---

## Authentication

### Email / Password (OTP-first flow)
1. **Step 1  -  Email**: Enter email address; `POST /api/auth/send-otp` sends a 6-digit code (works even before an account exists)
2. **Step 2  -  Verify**: Enter OTP on `/verify-email`; backend validates code and returns success; redirects to `/register?verifiedEmail=...`
3. **Step 3  -  Account details**: Enter full name and password; `POST /api/auth/register` creates user with `emailVerified: true` and returns a JWT (stored in React state only)
4. **Step 4  -  Org setup**: Enter org name, address, phone, industry; `POST /api/organizations` creates the org using the step-3 JWT; app then calls `POST /api/auth/login` to issue a fresh JWT that includes `organizationId`; redirects to `/dashboard/[slug]/overview`
5. Token refresh happens automatically via Axios interceptor on 401

### Google OAuth
1. Click "Continue with Google"  -  redirects to `GET /api/auth/google-redirect`
2. Backend redirects to Google consent screen
3. Google redirects to `GET /api/auth/google-callback?code=...`
4. Backend exchanges code for user info, upserts user, returns tokens
5. Frontend `/auth-callback` page reads tokens from URL params and stores them

### Forgot Password
1. `POST /api/auth/forgot-password` with email
2. Reset link emailed (valid 1 hour)
3. `POST /api/auth/reset-password` with token + new password

---

## Roles and Permissions

Role hierarchy scores used by backend middleware: OWNER=4, MANAGER=3, AUDITOR=2, CASHIER=1.
`isAtLeastAuditor` allows OWNER/MANAGER/AUDITOR (excludes CASHIER).

| Action                      | OWNER | MANAGER | CASHIER | AUDITOR |
|-----------------------------|:-----:|:-------:|:-------:|:-------:|
| View products/inventory     |  Yes  |   Yes   |   Yes   |   Yes   |
| Create/edit products        |  Yes  |   Yes   |         |         |
| Create orders               |  Yes  |   Yes   |   Yes   |         |
| View orders                 |  Yes  |   Yes   |   Yes   |   Yes   |
| Approve/update order status |  Yes  |   Yes   |         |         |
| View customers              |  Yes  |   Yes   |   Yes   |   Yes   |
| Manage customers            |  Yes  |   Yes   |   Yes   |         |
| Invite staff                |  Yes  |   Yes   |         |         |
| Restrict/remove staff       |  Yes  |   Yes   |         |         |
| View staff list             |  Yes  |   Yes   |         |         |
| View newsletter subscribers |  Yes  |   Yes   |         |         |
| Moderate reviews            |  Yes  |   Yes   |         |         |
| View financial reports      |  Yes  |   Yes   |         |   Yes   |
| View audit logs             |  Yes  |         |         |   Yes   |
| Manage org/store settings   |  Yes  |   Yes   |         |         |
| Change own password         |  Yes  |   Yes   |   Yes   |   Yes   |

**Note**: OWNER accounts cannot be restricted, removed, or have their password reset by other staff.

---

## Organization Setup

1. After account creation, user is prompted to create an organization
2. Org details: name, email, phone, address, industry, size, **description** (shown on public store)
3. A URL slug is auto-generated from the org name
4. The owner is automatically linked to the organization
5. All dashboard routes are scoped by slug: `/dashboard/[slug]/[section]`
6. Settings page (Organization tab) allows editing phone, address, website, industry, size, and description

---

## Products and Inventory

### Adding Products
- Navigate to **Products** -> Click **Add product** (full-page form)
- Fill in: name, SKU, category, price, compare price, description
- Upload up to 4 images (JPG/PNG/WebP, max 2 MB); first image is the cover; drag to reorder
- Choose **product type**: SIMPLE, DOWNLOADABLE (with download URL or file upload), VARIABLE (with attribute builder)
- Set initial stock and low-stock alert threshold
- Toggle published/draft status and visibility

### Filtering Products
The products list supports four filters simultaneously:
- **Search** by product name
- **Category** dropdown (org-scoped categories)
- **Status** (All / Published / Draft)
- **Type** (All types / Simple / Downloadable / Variable)

Product cards show type pills: Simple (gray), Downloadable (blue), Variable (amber).
Products with at least one approved review also show an amber star pill with the review count.

### Inventory
- Inventory is automatically created and linked to each product on creation
- Adjust stock via the **Inventory** page
- Low-stock badge appears on product cards and the inventory page when quantity <= lowStockAlert
- Dashboard overview shows total low-stock count with a warning banner
- An alert email is sent to the org OWNER when inventory drops to or below the threshold

---

## Orders

### Creating Orders (POS)
1. Go to **Orders** -> Click **New order**
2. Search and add products with quantities
3. Optionally link to an existing customer
4. Set payment method and notes
5. Submit -> inventory decremented automatically

### Viewing Orders
- Click **any row** in the orders table to open the full order detail modal
- The eye icon also opens the modal; action buttons (approve, delete) work independently

### Order Status Flow
`PENDING` -> `APPROVED` -> `COMPLETED` or `CANCELLED`

- **Approve**: shows a confirmation modal before changing status
- **Mark delivered**: available on the Logistics page (OWNER/MANAGER only)
- Status changes trigger email notifications to the customer

### Admin Notifications
When a new order is created (from the dashboard or the public store), the org OWNER receives an email with the order summary and a direct link to the orders dashboard.

---

## Customers

- Add customers with name, email, phone, address
- Full order history per customer
- Server-side search by name or email
- Delete with confirmation modal

---

## Staff Management

### Inviting Staff
1. Go to **Staff** -> Click **Invite staff**
2. Enter email and select role (MANAGER, CASHIER, or AUDITOR)
3. An invitation email is sent with a secure link valid for 48 hours
4. Invited member clicks the link, sets their name and password, and joins the org
5. After accepting, they are redirected to their dashboard automatically

### Managing Staff
- **Restrict/restore access**: prevents the member from logging in; sends a notification email
- **Reset password**: sends a temporary password to the member by email
- **Remove**: disconnects the member from the organization permanently
- The OWNER's account cannot be restricted, removed, or have their password reset via staff tools

### RBAC Notes
- Only OWNER and MANAGER can access the Staff page
- MANAGER can invite new staff but cannot assign OWNER role
- All sensitive staff actions (restrict, remove, reset) require confirmation

---

## Payments

The Payments module tracks all financial transactions for an organization.

### Payment Statuses
- **PENDING**  -  payment recorded but not yet confirmed
- **COMPLETED**  -  payment successfully received
- **FAILED**  -  transaction unsuccessful
- **REFUNDED**  -  payment reversed

### Dashboard (`/dashboard/[slug]/payments`)
- **Summary cards**  -  total amount, completed, pending, failed+refunded counts and amounts
- **Search**  -  filter by reference, method, or notes
- **Status filter**  -  All / Pending / Completed / Failed / Refunded
- **Detail modal**  -  click any row to see full payment info; OWNER/MANAGER can mark Pending payments as Completed or Failed inline

### API Endpoints
| Method | Path | Access |
|--------|------|--------|
| GET | /api/payments | OWNER/MANAGER/AUDITOR |
| GET | /api/payments/:id | OWNER/MANAGER/AUDITOR |
| POST | /api/payments | OWNER/MANAGER |
| PATCH | /api/payments/:id | OWNER/MANAGER |

### Creating Payments
Payments can be linked to an existing order via `orderId` or recorded standalone. Required fields: `amount`. Optional: `currency` (default NGN), `status`, `method`, `reference`, `notes`.

---

## Public Store

Each org gets a public catalog at `/store/[slug]`.

### Features
- **Filter sidebar** (desktop): category pills, dual price range slider
- **Mobile drawer**: off-canvas filter panel triggered by the filter icon
- **Sort bar**: sort products by Newest (default), Oldest, Price low to high, Price high to low, Name A-Z
- **Product cards**: image hover-cycling, wishlist heart button, discount badge, View and Add-to-cart buttons
- **Individual product page**: full image gallery with thumbnail strip, qty selector, upsell section
- **Wishlist**: persisted in localStorage and synced to backend; email capture for reminder emails
- **Wishlist reminders**: automated emails at 30 min, 2 hr, 1 day, and 3 days after wishlist creation
- **Cart**: qty controls, remove items, total, checkout button
- **Checkout**: breadcrumb nav, arithmetic CAPTCHA, Paystack inline payment popup
- **Paystack**: backend verifies transaction before creating the order (status: APPROVED)
- **Store info section**: org logo, name, description, star rating, product/category count, contact details

### Publishing
Toggle store visibility from **Storefront** in the dashboard sidebar or from Settings.
Unpublished stores return a 403 and show an "offline" screen to visitors.

---

## Newsletter

Located at `/dashboard/[slug]/newsletter` (OWNER/MANAGER only).

### Stats Cards
- Total subscribers (all time)
- New subscribers in the last 7 days
- New subscribers this calendar month

### Subscriber Table
- Searchable by name or email
- Shows subscriber name, email, join date, and status badge
- **Refresh** button to reload live data
- **Export CSV** button to download all subscribers as a CSV file

### Subscription Form
The public newsletter subscription form on the landing page posts to `POST /api/newsletter/subscribe`.
A welcome email is sent to the subscriber automatically.

---

## Product Reviews

### How reviews work
1. Customer completes a purchase (order status: COMPLETED)
2. On the order success screen, each purchased product shows a "Review" button
3. Customer selects a 1–5 star rating and optional comment, then submits
4. Review is stored with status **PENDING**
5. OWNER or MANAGER visits `/dashboard/[slug]/reviews` to approve or reject
6. Only **APPROVED** reviews are shown publicly

### Backend
- `POST /api/reviews`  -  public endpoint, requires a COMPLETED order and the product must be in that order; one review per (orderId, productId) pair
- `GET /api/reviews/product/:id`  -  public, returns APPROVED reviews for a product
- `GET /api/reviews`  -  authenticated (OWNER/MANAGER), paginated with optional `status` filter
- `PATCH /api/reviews/:id/moderate`  -  body `{ action: "approve" | "reject" }`
- `DELETE /api/reviews/:id`  -  permanently removes a review

### Dashboard Reviews page
Located at `/dashboard/[slug]/reviews`  -  tabs for PENDING / APPROVED / REJECTED.
Actions: **Approve**, **Reject**, **Delete**. Search by customer name, product name, or comment text.

### Review counts on product cards
Products with at least one approved review show an amber star pill (e.g. ★ 3) on:
- Dashboard `/dashboard/[slug]/products` product grid
- Public store `/store/[slug]` product grid

### Public display
Approved reviews appear as a card grid on `/store/[slug]/products/[id]` below the upsell section.

---

## Reports and Analytics

### Overview Dashboard
- Live 12h clock and greeting with the current user's first name
- **Period filter**: toggle between 7 / 30 / 90 days for all three charts
- **Open Storefront button**: opens `/store/[slug]` in a new tab; shows an error modal if the store is unpublished
- Revenue area chart, order growth area chart, customer growth line chart
- Four KPI cards: revenue this month, orders this month, active products, total customers
- Low-stock alert banner if any products are at or below their alert threshold

### Report Types
Six downloadable / emailable report types:
1. **Revenue** - COMPLETED orders with totals
2. **Products** - product catalog with inventory counts
3. **Orders** - all orders with status and customer
4. **Customers** - customer list with order totals
5. **Inventory** - stock levels and alert thresholds
6. **Staff** - staff roster with roles and join dates

### PDF Layout
Dark header band with Traqify logo mark; org name right-aligned; report name in a gray strip below; generation date/time in footer; "Powered by Traqify" tagline.
Empty data generates an empty PDF instead of an error.

---

## Audit Logs

- Every CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, and INVITE action is logged
- Fields: user name + email, action badge (colour-coded), entity, description, IP address, timestamp
- Paginated (50 per page) with local search
- Visible to OWNER and AUDITOR only

---

## Email System

All emails use branded HTML templates defined in `backend/src/emails/templates.ts`.

| Template | Trigger |
|---|---|
| `otpEmailTemplate` | OTP verification on registration |
| `passwordResetEmailTemplate` | Forgot password request |
| `staffInviteEmailTemplate` | Staff invitation |
| `welcomeEmailTemplate` | After OTP verification |
| `accountRestrictedEmailTemplate` | Admin restricts a staff account |
| `passwordResetByAdminEmailTemplate` | Admin resets a staff password |
| `storeStatusEmailTemplate` | Store published / unpublished |
| `orderApprovedEmailTemplate` | Order approved (sent to customer) |
| `orderCompletedEmailTemplate` | Order delivered (sent to customer) |
| `newOrderEmailTemplate` | New order placed (sent to org OWNER) |
| `lowStockAlertEmailTemplate` | Inventory drops to alert threshold |
| `wishlistReminderTemplate` | Wishlist reminder (4 waves) |
| `reportEmailTemplate` | Report emailed as PDF attachment |

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register + send OTP |
| POST | /api/auth/verify-email | Verify OTP |
| POST | /api/auth/send-otp | Resend OTP |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET  | /api/auth/google-redirect | Start Google OAuth |
| GET  | /api/auth/google-callback | Google OAuth callback |
| POST | /api/auth/forgot-password | Send reset link |
| POST | /api/auth/reset-password | Reset password |
| PATCH | /api/auth/me | Update name / avatar |
| POST | /api/auth/change-password | Change password |
| POST | /api/auth/accept-invite | Accept staff invitation |

### Organizations
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/organizations | Create organization |
| GET | /api/organizations/:slug | Get org details (auth) |
| PATCH | /api/organizations/:slug | Update org settings (OWNER) |
| POST | /api/organizations/:slug/upload-logo | Upload org logo (OWNER) |
| GET | /api/organizations/:slug/store | Public store data |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List products (search, categoryId, status, productType, page, limit) |
| POST | /api/products | Create product |
| PATCH | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| POST | /api/products/upload-image | Upload product image |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/orders | List orders (status filter, pagination) |
| POST | /api/orders | Create order |
| GET | /api/orders/:id | Get order detail |
| PATCH | /api/orders/:id/status | Update status |
| DELETE | /api/orders/:id | Delete order |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/reports/overview | KPI stats + storePublished + orgSlug |
| GET | /api/reports/revenue-chart?period= | Daily revenue and orders |
| GET | /api/reports/customer-chart?period= | Cumulative customer registrations |
| GET | /api/reports/:type/pdf | Download PDF report |
| POST | /api/reports/:type/email | Email PDF report |

### Newsletter
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/newsletter/subscribe | Subscribe to newsletter |
| GET | /api/newsletter/subscribers | List subscribers (OWNER/MANAGER) |

### Public Store
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/store/:slug | Store info + products + categories |
| POST | /api/store/:slug/checkout | Guest checkout (Paystack) |
| POST | /api/store/:slug/wishlist | Sync wishlist |

### Staff
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/staff | List staff members |
| POST | /api/staff/invite | Send invitation |
| PATCH | /api/staff/:userId/role | Update role |
| PATCH | /api/staff/:userId/access | Toggle access |
| DELETE | /api/staff/:userId | Remove from org |
| POST | /api/staff/:userId/reset-password | Admin password reset |

### Audit Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/audit | List audit events (search, pagination) |