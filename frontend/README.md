# Traqify Frontend

Next.js 14 app router frontend for the Traqify multi-tenant store management platform.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion
- **Forms**: react-hook-form + Zod
- **HTTP**: Axios with JWT interceptor (auto token-refresh on 401)
- **Icons**: Lucide React
- **Charts**: Recharts

## Getting started

```bash
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
npm install
npm run dev                        # starts on port 3000
```

## Project structure

```
app/
  (auth)/           login, register (OTP-first flow), forgot-password, reset-password, verify pages
  dashboard/[slug]/ per-org dashboard
    overview/       stats cards + revenue/customer charts
    products/       product grid + new/edit product forms
    orders/         orders table + detail modal
    inventory/      stock management
    customers/      customer list + detail modal
    staff/          staff list + invite / manage members (OWNER/MANAGER)
    categories/     category CRUD (OWNER/MANAGER)
    store/          storefront toggle + settings (OWNER/MANAGER)
    logistics/      delivery zones (OWNER/MANAGER)
    newsletter/     subscriber list + CSV export + refresh modal (OWNER/MANAGER)
    reviews/        approve/reject/delete customer reviews (OWNER/MANAGER)
    reports/        PDF + email reports (OWNER/MANAGER/AUDITOR)
    audit-logs/     immutable action history with unread badge (OWNER/AUDITOR)
    settings/       profile, org, password tabs (password disabled for Google users) (ALL roles)
  store/[slug]/     public storefront
    page.tsx        product grid, cart drawer, wishlist
    products/[id]/  product detail + customer reviews
    checkout/       Paystack payment + order success + review prompts
components/
  dashboard/        Sidebar, Topbar, ProductModal, OrderModal, ...
  shared/           ErrorModal, SuccessModal, ScrollToTop, ...
  ui/               shadcn/ui primitives (Button, Input, Badge, ...)
lib/
  api.ts            Axios instance with 401 → token-refresh interceptor
  auth-context.tsx  AuthProvider + useAuth hook
  sidebar-context.tsx SidebarProvider + useSidebar (mobile drawer)
  use-role-guard.ts useRoleGuard(allowedRoles, redirectTo) — blocks page by role
  utils.ts          formatCurrency, cn, getInitials, ROLE_LABELS, ...
```

## RBAC on the frontend

The sidebar `navItems` array controls which pages appear per role. Role guards
(`useRoleGuard`) on individual pages redirect blocked users to overview.

| Role    | Sidebar pages |
|---------|--------------|
| OWNER   | All |
| MANAGER | All except Audit Logs |
| AUDITOR | Overview, Products, Inventory, Orders, Customers, Reports, Audit Logs, Settings |
| CASHIER | Overview, Products, Orders, Customers, Settings |

## Environment variables

```
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
```
