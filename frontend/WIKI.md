# Traqify Frontend Wiki

## Overview

Next.js 14 App Router frontend for the Traqify multi-tenant store management platform.

---

## Authentication Pages

### Login (`/login`)
- Email + password form with Zod validation
- "Continue with Google" button for OAuth
- Handles error params: `oauth_failed`, `invited_user`
- Email/password and Google OAuth are **not mutually exclusive**

### Register (`/register`)
- 3-step registration: email verification, account details, organization setup
- Checks for pending staff invites before allowing registration
- Invited users see an error modal explaining they can only belong to one organization

### Invite Accept (`/invite/[token]`)
- Accepts staff invitations with name and password setup
- Redirects to the dashboard after acceptance

---

## Landing Page

### Sections
- Hero, Logo Scroller, About, Features, Stats, How It Works, Why Traqify, Testimonials, Everything, FAQ, CTA
- All sections use `px-5 sm:px-6 lg:px-8` for consistent mobile padding
- Hero image column has additional `px-4 sm:px-0` padding on mobile

### FAQ
- 8 questions covering pricing, staff limits, multi-location, store, security, reports, payments, and mobile
- Answers provide security assurance without technical details
- No em dashes or emojis

### Footer
- 2-column grid on mobile/tablet, 5-column grid on desktop
- "Stay updated" newsletter section spans full width on mobile (`col-span-2 lg:col-span-1`)

---

## Dashboard

All dashboard pages use `p-5 md:p-6` padding for mobile responsiveness.

### Key Pages
- **Overview** -- KPI cards, revenue/order/customer charts, Quick Links
- **Products** -- product grid with category pills, review counts, type badges
- **Orders** -- clickable table rows, detail modal, approve/delete actions
- **Reviews** -- approve/reject/delete with confirmation modals
- **Logistics** -- mark-delivered with confirmation modal
- **Reports** -- 9 report types, PDF download, email delivery

---

See root `WIKI.md` for the complete platform documentation.
