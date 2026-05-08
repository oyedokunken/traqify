# Changelog

All notable changes to Traqify are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] - 2026-05-08

### Added
- **Supabase Storage uploads**: product images (`products` bucket), org logos and user avatars (`avatars` bucket); replaced local disk `multer.diskStorage` with `memoryStorage` + `uploadFile()`
- **Wishlist system**: localStorage persistence + `POST /api/store/:slug/wishlist` backend sync; email capture modal on first wishlist item; reminder emails at 30min, 2hr, 1 day, 3 days via background job
- **Logistics page**: `/dashboard/[slug]/logistics` shows APPROVED orders as cards with customer contact info, item list, and "Mark delivered" button; OWNER/MANAGER only
- **APPROVED order status**: new `APPROVED` value in `OrderStatus` enum; quick-approve button (✓) on orders table; Approve button in order detail modal
- **Product type field**: `ProductType` enum (SIMPLE, DOWNLOADABLE, VARIABLE); `downloadUrl` field; product modal shows download URL input when type is DOWNLOADABLE
- **Wishlist email job**: `processWishlistEmails()` runs every 5 minutes via `setInterval` in backend entrypoint; auto-deletes wishlists older than 4 days
- **Store info section**: public store page now shows store details (logo, name, contact, website) in a dark banner section below products, linkable via `#store-info` anchor
- **Store off-canvas mobile menu**: left-sliding drawer on mobile with category navigation, cart/wishlist counts, and About Store link
- **Cart and wishlist in store navbar**: cart and wishlist icons with live count badges in public store header
- **Category nav in store header**: desktop horizontal pill-style tabs for categories in store navbar
- **Full-width logo display**: if org logo is uploaded, header shows full-width `object-contain` image; if not, shows text store name
- **Product detail drawer**: image gallery with thumbnail strip, wishlist toggle button, discount % badge
- **Image deduplication**: `imageUrl` and `imageUrls[]` are deduped before cycling to prevent showing same image twice
- **User avatar upload**: `POST /api/auth/upload-avatar` endpoint; avatar displayed in topbar and sidebar
- **Open Graph image**: `/public/og.jpg` set as OG and Twitter card image in root `layout.tsx`
- **React phone input on create-org**: `PhoneInput` with international dialling, defaults to NG; replaces plain text input
- **Address required on create-org**: business address field is now required (min 5 chars)
- **Industry dropdown sorted alphabetically** in create-org and settings pages
- **Favicon updated**: `app/icon.svg` now uses the Traqify grid mark (4 squares) consistent with the app logo
- **Footer mobile fix**: footer columns stack properly on mobile; bottom links wrap correctly with `flex-wrap`
- **SECURITY.md and CONTRIBUTING.md** project root documentation files added
- **Sidebar Logistics item**: `Truck` icon, OWNER/MANAGER visibility
- **`info` Badge variant**: blue badge style for APPROVED status

### Changed
- Public store layout: 2-column (filter sidebar + products) instead of 3-column; store info moved from right sidebar to dedicated section below products
- `updateOrderStatus` backend now accepts APPROVED in addition to PENDING/COMPLETED/CANCELLED
- `getStoreProducts` now filters `status: "published"` and returns full org contact fields
- `OrderDetailModal` and orders page both updated to handle APPROVED status with Approve/Mark-completed buttons

### Fixed
- Old favicon (letter T path shape) replaced with correct grid logo mark
- Footer links overflow on mobile (now flex-wrap)
- `imageUrl` being shown twice on hover cycle (deduped with `Array.from(new Set(...))`)
- `useState` inside IIFE render pattern in detail drawer (hoisted `activeDetailImg` to component level)
- `Set` spread TypeScript error (replaced with `Array.from(new Set(...))`)

---

## [1.1.0] - 2026-05-08

### Added
- **Product categories**: backend CRUD (`/api/categories`), admin page (`/dashboard/[slug]/categories`), sidebar nav item
- **Multi-image products**: up to 4 images per product; first image is cover; all stored in `imageUrls[]` field on Product
- **Auto-SKU generation**: "Auto-generate" button in product modal derives prefix from product name + random suffix
- **Product status field**: `published` / `draft` status alongside `isActive` visibility toggle
- **Store management page**: `/dashboard/[slug]/store` with publish/unpublish toggle, store URL copy, and store capabilities overview
- **`storePublished` flag**: Organization model; public store routes return 403 when unpublished
- **Reports redesign**: 6 report type cards (Revenue, Products, Orders, Customers, Inventory, Staff) with PDF download and email modal
- **Backend PDF generation**: `pdfkit`-powered PDF for each report type via `GET /api/reports/:type/pdf`
- **Report email**: sends PDF as attachment via `POST /api/reports/:type/email`; new `reportEmailTemplate` in email templates
- **React phone number input**: international phone selector on register Step 2 (defaulting to NG)
- **Sidebar**: `Categories` (Tag icon) and `Store` (Globe icon) nav items; fixed Staff icon (`UserCog`)
- **Pagination on Products page**: 20 per page, category filter dropdown (from API), status filter
- **Pagination on Customers page**: 25 per page, server-side search
- **Status filter on Orders page**: server-side filter for PENDING / COMPLETED / CANCELLED

### Changed
- `getProducts` backend now returns `{ products, total }` with `page`, `limit`, `categoryId`, `isActive` query params
- `getCustomers` backend now returns `{ customers, total }` with `page`, `limit`, `search` query params
- `productSchema` validator extended: `categoryId`, `imageUrls`, `status` fields
- `updateOrgSchema` extended: `name`, `email`, `website`, `storePublished`
- `sendEmail` config updated to support optional `attachments` array
- Store public routes: filters `status = "published"` on products; returns `categories` from `ProductCategory` model
- Inventory and report controllers updated to use `categoryId` (string `category` field removed from schema)

### Fixed
- Sidebar `Staff` nav item had `Store` icon; now correctly uses `UserCog`
- Report controller `items` include renamed to `orderItems` matching the Prisma schema

---

## [1.0.0] - 2025-05-07

### Added
- Multi-tenant organization system with owner, manager, cashier, and auditor roles
- JWT authentication with refresh tokens and OTP email verification
- Google OAuth 2.0 redirect-based sign-in flow
- Product management: create, edit, deactivate, image upload with size/type validation
- Inventory management: stock tracking, low-stock alerts, adjustments
- Order management: POS-style creation, order detail modal, status tracking
- Customer management: full purchase history and profile
- Staff management: email invitations, role assignment, account restriction
- Public store page per organization with product catalog, cart, and guest checkout
- Real-time revenue and order analytics dashboard with Recharts (role-based)
- Revenue trend (AreaChart), top products (BarChart), order status (PieChart)
- Audit log system: every action logged with user, timestamp, and details
- Settings page: profile update, password change, organization management
- Reports page: date-range sales report with totals
- Email templates with branded HTML: OTP, password reset, welcome, invite, order confirmation
- Newsletter subscription endpoint with confirmation email
- Scroll-to-top button (red, fixed bottom-right)
- Shared Navbar with off-canvas mobile menu, CTA buttons, Google logo button
- Complete landing page rebuild: Hero, LogoScroller, Features, Stats, HowItWorks, Testimonials, Everything, FAQ, CTA sections
- Animated timeline (how it works) using Framer Motion
- Scrolling testimonials (two rows, opposite directions, pause-on-hover)
- Counter animation for statistics section
- Footer with newsletter subscription form, social links, payment methods image
- Privacy Policy and Terms of Service pages with shared Navbar and Footer
- Auth pages: Logo + title inside form card, left-aligned, Google logo button
- Custom 404 Not Found page
- README.md with full project documentation
- .gitignore for both frontend and backend artifacts
- next.config.mjs (Next.js 14 does not support .ts config files)

### Changed
- Prisma schema: added NewsletterSubscriber model; Order.createdById now optional for store orders
- Backend .env: updated SMTP credentials (Gmail app password) and FRONTEND_URL
- Public layout (/privacy, /terms): now uses shared Navbar and Footer

### Fixed
- Google OAuth redirect_uri_mismatch: backend googleRedirect/googleCallback controllers added
- Set iteration error on categories in store page
- TypeScript compilation errors: implicit any, missing types, field name mismatches
- Stale next.config.ts warning by migrating to next.config.mjs

---

## [Unreleased]

### Planned
- CSV export for reports
- Mobile app (React Native)
- Multi-location branch support
- Stripe/Paystack payment gateway integration
- Webhook notifications
