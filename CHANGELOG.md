# Changelog

All notable changes to Traqify are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v1.15.0] - 2025-05-27

### Added
- **Manual order: inline customer creation** -- the Create Order modal now has a 3-mode customer picker: Walk-in, Existing customer (searchable dropdown), or New customer (name required; email + phone optional). Selecting "New customer" creates the customer record, creates a MANUAL-source audit log, and wires up the customer to the order in one step
- **Manual order: customer confirmation email** -- if a new customer provides an email address, a store-branded order confirmation email is sent automatically after the order is created
- **storeOrderConfirmationEmailTemplate** -- new shared store-email template used by both the manual order flow and the store checkout flow; accepts org contact details and logo; uses the white-mode `wrapStoreEmail` wrapper
- **Product average rating** -- `GET /api/products` and the store `getStoreProducts` endpoint now compute `averageRating` (rounded to 1 d.p.) from approved reviews and include it in each product object; replaces the raw review count everywhere
- **Rating display** -- dashboard Products page and store product cards now show the average rating as "4.8/5.0" instead of a raw count; store product detail page shows an average summary pill above the review grid

### Changed
- **All email templates standardized to white mode** -- removed all dark-background sections and emojis from every template; added `recipientEmail` optional parameter (defaults to `""`) to all Traqify platform templates so the footer reads "This email was sent to [email] from Traqify"
- **Store-facing emails moved to `wrapStoreEmail`** -- `orderApprovedEmailTemplate`, `orderCompletedEmailTemplate`, and `wishlistReminderTemplate` now use the store wrapper (org logo, contact line, "sent to [email] from [store] through Traqify" footer) and accept `contact` + `customerEmail` parameters
- **Store checkout email refactored** -- `storeCheckout` controller now calls `storeOrderConfirmationEmailTemplate` instead of embedding inline HTML; `orgContact.website` removed from footer per design spec
- **`updateOrderStatus` passes org contact to email templates** -- APPROVED and COMPLETED status emails now include the org's email, phone, and address in the footer
- **Overview charts: candlestick-style bars** -- all three charts (Revenue, Order growth, Customer growth) converted from `AreaChart` to `ComposedChart` with `Bar` (rounded tops, max 16 px wide) + semi-transparent `Area` gradient fill; grid verticals hidden for a cleaner look
- **Order/Customer chart Y-axis**: `allowDecimals={false}` added so integer-only axes render cleanly

### Fixed
- **Product star rating showing count instead of average** -- all star badges now show the computed average (e.g. "4.8/5.0") instead of the total approved review count
- **Store product detail review list** -- individual review items now show "X.X/5.0" format; a summary pill ("4.8/5.0 - 3 reviews") is displayed above the grid

---

## [v1.14.0] - 2025-05-11

### Added
- **Payment auto-backfill**: `GET /api/payments` now auto-creates `Payment` records for any `COMPLETED`/`APPROVED` orders that have no payment record; runs on every payments-page load until fully caught up, then becomes a no-op
- **Dashboard order payment**: creating an order manually from the dashboard now immediately creates a `COMPLETED` Payment record alongside it, so the payments page and revenue chart stay in sync from day one

### Changed
- **Overview revenue source**: `getOverview`, `getRevenueChart` now aggregate `Payment.amount` where `status = COMPLETED` instead of `Order.totalAmount` where `status = COMPLETED`; manually recorded payments and store-checkout payments both flow into the revenue stats and chart
- **Revenue/Order charts: full date range**: `getRevenueChart` now returns every day in the selected period filled with `{ revenue: 0, orders: 0 }` for days with no data, producing a smooth growth curve instead of scattered dots
- **Customer chart: full date range + baseline**: `getCustomerChart` now seeds the cumulative count with all customers created before the period start, then fills every day in the range, so the line never starts from 0 when pre-period customers exist
- **Y-axis starts from 0**: all three charts (`Revenue`, `Order growth`, `Customer growth`) now have `domain={[0, "auto"]}` on their `YAxis` so the area always starts from the zero baseline
- **Period change refreshes overview stats**: switching the 7/30/90-day period now also re-fetches the overview KPI cards, not just the charts
- **Window focus refresh**: returning to the Overview tab after adding an order, customer, or payment in another tab/window now silently re-fetches all overview data and charts

### Fixed
- **Payments page empty for existing orders**: older orders placed before the Payment model was introduced now appear automatically on the first visit to the payments page after deployment
- **Revenue chart missing store-checkout revenue**: store orders (`APPROVED`) now have Payment records (created at checkout) and appear in the revenue chart
- **Customer chart starting above 0**: cumulative customer line no longer resets to 0 at the start of each period; it carries forward the pre-period customer count as the baseline

---

## [v1.13.0] - 2025-05-13

### Added
- **Payments auto-creation**: store checkout now automatically creates a `Payment` record (PENDING for bank transfer, COMPLETED for verified Paystack) so the payments dashboard is populated from the first order
- **Staff removal email**: `staffRemovedEmailTemplate` added; backend sends removal notification email when an OWNER removes a staff member from the organization
- **Customer view modal**: clicking any row on the Customers page (or the eye icon) opens a full-detail modal showing contact info, source, date added, and up to 5 recent orders with status and amount
- **Reviews stats cards**: Reviews dashboard now shows 4 summary cards (total reviews, average star rating, pending count, approved count) when any reviews exist
- **Review order context**: each review card now displays the linked order number (e.g. "Order #STR-XYZ") from the order that generated the review
- **Newsletter CSV Status column**: CSV export for newsletter subscribers now includes a "Status" column (value: "Active") for all exported rows
- **Audit Logs report card**: Reports page now has an Audit Logs card with "View Audit Logs" (navigates to the audit-logs page) and "Download PDF" buttons
- **Audit Logs PDF report**: backend supports `audit-logs` as a valid report type; generates a PDF with Action, Entity, Performed By, Email, Details, Date columns and is date-range filtered
- **Reports empty state**: when a report has no data, the PDF now renders "No data available for the selected date range." instead of returning HTTP 400

### Changed
- **Reports 400 guard removed**: `downloadReport` and `emailReport` no longer return HTTP 400 on empty data; an empty PDF with a "no data" message is generated instead
- **Audit log detail page**: removed `max-w-2xl` constraint; page is now full-width with responsive padding (`p-4 sm:p-6`); meta grid uses `lg:grid-cols-4` for wide screens
- **Footer newsletter form**: replaced manual `useState` and HTML `required` attributes with `react-hook-form` + `zod` validation; inline error messages appear below each field on blur/submit; no native browser required-field popups
- **Staff actions audit**: confirmed RESTRICT (`PATCH /api/staff/:id/access`), RESET-PASSWORD (`POST /api/staff/:id/reset-password`), and DELETE (`DELETE /api/staff/:id`) all work end-to-end with correct email templates (`accountRestrictedEmailTemplate`, `passwordResetByAdminEmailTemplate`, `staffRemovedEmailTemplate`) and audit log entries
- **Reviews backend**: `getDashboardReviews` now includes the linked `order { id, orderNumber }` in the response
- **Order email**: `order.controller.ts` fixed to pass a properly typed items array to `newOrderEmailTemplate` instead of `orderItems.length`

### Fixed
- **Payments page empty**: root cause was that no `Payment` record was ever created on store checkout; fixed by auto-creating one in `storeCheckout`
- **Reports 400 on empty data**: Revenue, Orders, and Payments reports no longer error when the selected date range has no records
- **`order.controller.ts` type error**: `newOrderEmailTemplate` call now receives `{ name, qty, subtotal }[]` array instead of a bare number

---

## [v1.11.0] - 2025-05-10

### Added
- Staff page: pending invites visible in table with amber "Pending" badge and clock icon
- Staff page: "Cancel invite" action for pending invites (soft-delete with audit log)
- Staff page: "Pending invite" option added to status filter
- Backend: `DELETE /api/staff/invites/:inviteId` endpoint for cancelling pending invites
- Backend: Lazy expiry detection in `getInvites` -- expired PENDING invites are auto-marked EXPIRED with audit log entry
- Payments: "Record payment" button now opens a centered modal overlay
- Customers: "Add customer" button now opens a centered modal overlay
- Overview: time and timezone moved from storefront button row to greeting/date section
- Overview: first-time welcome modal now shows role-specific message for invited members (MANAGER/AUDITOR/CASHIER)
- Invite accept page: all header content (logo, title, org, role badge) moved inside the form card; left-aligned
- Invite accept page: eye icon added to "Confirm password" field
- Settings: "Company" tab now visible to all roles (MANAGER/CASHIER/AUDITOR see read-only company details)
- Settings Security: password change validation rejects passwords containing name or email address
- Settings Security: policy hint text updated to reflect restrictions

### Changed
- Staff invite expiry: extended from 48 hours to 3 days (72 hours)
- Email template: invite expiry copy updated from "48 hours" to "3 days"
- Products page: "Add product" button gated behind `categoriesLoaded` flag to prevent false "No categories" modal on first render

### Fixed
- Review controller: added `console.error` logging to expose actual 500 errors in Vercel function logs

## [v1.10.0] - 2026-05-10

### Added
- **Profile: phone + role fields**: Settings > Profile tab now shows four fields in a 2x2 grid (Name, Role, Email, Phone); role is an immutable display field; phone is editable and saved to the database via `PATCH /api/auth/me`; form resets when user data loads
- **Payments report PDF**: `payments` report type added to report controller; PDF table includes reference, method, amount, status, order, notes, date columns; empty-range guard returns 400 with clear message
- **Payments feature card**: "Payment Tracking" card added to landing page features grid
- **Audit log row navigation**: clicking any row on the audit-logs page navigates to `/dashboard/[slug]/audit-logs/[id]` detail page; checkbox cell stops propagation so selection still works independently
- **Audit log success modal**: marking notifications read/unread (bulk or all) now shows a confirmation modal: "[N] notifications marked read/unread"

### Changed
- **Report tagline**: PDF header tagline changed from "Business Management Platform" to "Enterprise Store Management System"
- **Email footer tagline**: changed from "Traqify - Store Management Platform" to "Traqify - an enterprise store management system"
- **Empty report guard**: `downloadReport` and `emailReport` now return HTTP 400 with descriptive message if no rows match the selected date range (instead of generating a blank PDF)
- **Notification bell dropdown**: limited to 3 recent notifications (was 6); each notification is now a single compact line: `ACTION · User · 04:16 PM`
- **Overview header layout**: "Open Storefront" button and live clock are now displayed inline on both desktop and mobile; button uses `whitespace-nowrap flex-shrink-0` to prevent wrapping
- **`AuthUser` interface**: `phone?: string | null` field added

### Fixed
- **Em dashes removed**: all literal em dash characters (`\u2014`) removed from `CHANGELOG.md`, `WIKI.md`, and every source file (`store/page.tsx`, `email.ts`, `payments/page.tsx`, `audit-logs/[id]/page.tsx`, `sidebar.tsx`, `inventory/page.tsx`, `customers/page.tsx`, `products/new/page.tsx`, `store/[slug]/page.tsx`, `features.tsx`)
- **Prisma client regenerated**: `npx prisma generate` run after `Payment` model was confirmed in schema; `prisma.payment` TS error resolved

---

## [1.9.0] - 2026-05-10

### Added
- **Payments module**: New `Payment` Prisma model (`PaymentStatus`: PENDING/COMPLETED/FAILED/REFUNDED) with `amount`, `currency`, `method`, `reference`, `notes`, `orderId` FK; backend controller (`getPayments`, `getPaymentById`, `createPayment`, `updatePayment`) at `GET/POST/PATCH /api/payments`; frontend `/dashboard/[slug]/payments` page with 4 summary cards (total, completed, pending, failed+refunded), search/filter, paginated table with clickable detail modal and inline status updates
- **Payments report**: "Payments Report" card added to `/dashboard/[slug]/reports` page (PDF download + email)
- **Single audit log detail page**: `/dashboard/[slug]/audit-logs/[id]`  -  shows action, entity, details, performed-by card with user avatar/role, timestamp, log ID, network info (IP, user agent); auto-marks log as read on open; `GET /api/audit-logs/:id` backend endpoint added
- **Notification bell dropdown**: topbar bell now opens a dropdown with the 6 most recent audit logs; unread logs highlighted in red; persistent unread count badge using real `GET /api/audit-logs/unread-count` API (polls every 30 s); "Mark all read" button; "View all notifications" link to audit-logs page; each notification clickable to its single detail page; bell hidden for CASHIER role
- **Inventory filters**: category dropdown and stock-status filter (In Stock / Low Stock / Out of Stock) with "Clear filters" button added to inventory page
- **Store publish validation**: clicking "Publish store" now checks logo, description, business email, published products, and categories; shows an explicit numbered error modal listing every missing item before proceeding
- **Customer source badge**: `source` field (`MANUAL` | `PURCHASE`) added to `Customer` Prisma model; customers table shows green "Auto" pill for purchase-created customers and gray "Manual" pill for admin-added ones
- **Go to Categories CTA in product gate**: products page category-gate dialog now has a "Go to Categories" button linking directly to the categories page

### Changed
- **Registration flow**: `handleStep3` now calls `login(email, password)` from auth context after org creation to get a fresh JWT with `organizationId`; eliminates re-login requirement and wrong localStorage key usage
- **Create-organization flow**: `onSubmit` attempts JWT refresh (via refresh token) before `refreshUser()` so new org members have a valid token before dashboard redirect
- **Overview welcome modal**: guarded by `user?.organizationId` dependency so new users see the first-time modal (not the "welcome back" modal) on their very first visit
- **Overview layout**: "Open Storefront" button now renders above the live clock instead of beside it
- **Products page**: initial load errors are silently swallowed (empty state shown instead of error modal) since 0 products is a valid state
- **Sidebar nav order**: enterprise-logical ordering  -  Overview → Orders → Products → Inventory → Categories → Payments → Customers → Staff → Storefront → Logistics → Newsletter → Reviews → Reports → Audit Logs → Settings
- **Sidebar Audit Logs**: MANAGER added to allowed roles (consistent with `isAtLeastAuditor` API middleware)

### Fixed
- **Store `togglePublish` syntax**: missing closing `}` on async function corrected
- **Products page missing `Link` import**: `next/link` import added after categories modal CTA was added

---

## [1.7.0] - 2026-05-10

### Added
- **OTP-first registration flow**: Step 1 now asks for email only and immediately sends a verification code before any personal or org details are collected; `POST /api/auth/send-otp` no longer requires the user to exist in the database
- **Google auth indicator in Settings**: Security tab shows Google SVG logo and "Signed in with Google" when `signInMethod === "GOOGLE"`; password change form is hidden for Google accounts with a note to manage via Google Account settings
- **`signInMethod` in login response**: `POST /api/auth/login` now returns `signInMethod` in the user payload so the frontend can correctly detect auth method on every login
- **Low stock email notifications**: inventory controller triggers `lowStockAlert` email template to org OWNER when stock update falls at or below the low-stock threshold; creates audit log entry
- **Comprehensive audit logging**: added `createAuditLog` calls to `emailReport` (report controller) and store publish/unpublish toggle (org controller); `changePassword` already had it

### Changed
- **Register step 2 → step 3 flow fixed**: after account creation the JWT is stored in React state (not `localStorage`) and used to call `POST /api/organizations`; after org creation the app re-logs in to issue a fresh JWT that includes `organizationId`, then redirects directly to `/dashboard/[slug]/overview`  -  no manual login required
- **`verifyEmail` endpoint**: handles the case where the user does not exist yet (new OTP-first flow) by validating OTP and returning success without attempting a user update
- **`verify-email` page redirect**: shows "Redirecting you to complete setup…" when `returnTo=register`; redirects to `/register?verifiedEmail=...` after verification
- **Product image display**: product cards on the dashboard products page and public store product detail modal changed from `object-contain` with padding to `object-cover`  -  full image visible without top/bottom cropping
- **Org logo storage**: logo uploads go directly to the Supabase `avatars` bucket via `POST /api/organizations/:slug/upload-logo`; local `backend/uploads/` folder removed
- **Backend README**: expanded key routes table with all new auth, review, newsletter, and audit-log endpoints; added Google OAuth and Supabase env vars
- **Frontend README**: updated project structure with OTP-first register note, unread badge on audit logs, and Google-disabled password change

### Fixed
- **`sendOTP` 404 on register**: endpoint previously returned 404 if the email had no account  -  now sends OTP to any email address, looked up only for a personalised greeting
- **Register skipping org creation**: `handleStep2` was writing tokens to `localStorage` and calling `router.push("/")` immediately, bypassing step 3; now correctly advances to step 3
- **JWT missing `organizationId` after org creation**: `createOrganization` doesn't reissue a token, so after step 3 the app calls `POST /api/auth/login` to get a fresh token that includes the new org ID before redirecting to the dashboard

---

## [1.6.0] - 2026-05-08

### Added
- **Product reviews**: end-to-end review system  -  `Review` Prisma model with `ReviewStatus` (PENDING/APPROVED/REJECTED), unique constraint on `[orderId, productId]`; backend controller (`submitReview`, `getProductReviews`, `getDashboardReviews`, `moderateReview`, `deleteReview`) and routes at `/api/reviews`
- **Reviews dashboard page**: `/dashboard/[slug]/reviews`  -  tabbed PENDING/APPROVED/REJECTED views, search, approve/reject/delete actions; OWNER/MANAGER only
- **Review submission on order success**: checkout success screen now prompts customers to rate each purchased product with a 1–5 star widget and optional comment; review submitted to `/api/reviews`
- **Public product detail reviews**: approved reviews shown in a grid below upsells on `/store/[slug]/products/[id]`
- **Review count on product cards**: amber star pill with review count shown on dashboard products page and public store product grid (only when count > 0)
- **Staff page filters**: Role filter (All / Owner / Manager / Cashier / Auditor) and Status filter (All / Active / Restricted) alongside the existing search input
- **Newsletter refresh modal**: clicking "Refresh" on the newsletter page shows a success modal summarising Total subscribers, Last 7 days, and This month; shows error modal on failure
- **Reviews sidebar nav item**: "Reviews" added to sidebar for OWNER/MANAGER with `Star` icon

### Changed
- **RBAC hierarchy**: swapped AUDITOR (2) and CASHIER (1) scores so `isAtLeastAuditor` correctly excludes CASHIER from financial reports and read-all routes while AUDITOR retains full read access
- **Sidebar Customers**: AUDITOR added to allowed roles (AUDITOR has read-all access per role matrix)
- **Settings layout**: Full name and Email fields are now side-by-side (50%/50% grid) on desktop; Website and Store description fields are side-by-side (50%/50% grid) on desktop
- **Store logo link**: logo (or store name) on public store header is now wrapped in an anchor tag linking to `org.website` (opens in new tab) when a website URL is set
- **Overview API**: replaced `$queryRaw` low-stock query with safe Prisma `findMany` + JS filter to eliminate 500 errors; revenue growth display uses `?? 0` fallback to prevent "undefined%"
- **Overview data fetch**: split single `Promise.all` into three independent calls so a chart failure never blanks the stats cards
- **Store controller `getStoreProducts`**: `description` field added to org select; approved review count (`_count.reviews` where status=APPROVED) added to product include
- **Product controller `getProducts`**: `_count.reviews` added alongside `_count.orderItems` in product list include

### Fixed
- **Overview undefined% / undefined total orders**: `data?.revenueGrowth` and `data?.totalOrders` now use `?? 0` fallback; stats cards correctly show 0 when API response is null
- **CASHIER accessing financial reports**: corrected `roleHierarchy` so CASHIER (score 1) is below `isAtLeastAuditor` threshold (score 2)
- **Newsletter modal JSX syntax**: wrapped newsletter page return in fragment `<>` to allow modal alongside main content div

---

## [1.4.0] - 2026-05-08

### Added
- **Newsletter dashboard**: `/dashboard/[slug]/newsletter`  -  subscriber stats (total / last 7 days / this month), searchable table, status badge, CSV export, live refresh; OWNER/MANAGER only
- **Admin new-order notification email**: `newOrderEmailTemplate` sent to org OWNER on every new order placed  -  both from dashboard (`POST /api/orders`) and public store checkout
- **Overview: Open Storefront button**: button in the overview header links to the public store; if store is unpublished, shows an error modal with a link to the Storefront settings page
- **Overview: chart period filter**: toggle between 7 / 30 / 90-day windows for all three charts (revenue, orders, customer growth)  -  updates chart titles dynamically
- **Products: type filter**: "All types" dropdown on the products page filters by SIMPLE / DOWNLOADABLE / VARIABLE; backed by new `productType` query param on `GET /api/products`
- **Products: type pill**: product cards now show a coloured badge for product type (secondary / info / warning)
- **Store description field**: `description String?` column added to the `Organization` Prisma model; editable in Settings > Organization tab (textarea, max 500 chars); rendered below store name in the public store info banner
- **Store sort bar**: sort dropdown above products grid on the public store (`/store/[slug]`)  -  Newest, Oldest, Price low→high, Price high→low, Name A–Z; client-side sort with page reset
- **Backend `oldest` sort**: `getStoreProducts` handles `sort=oldest` (`createdAt asc`)
- **RBAC hardening**: `removeStaff` and `resetStaffPassword` backend functions now return `403` if the target user has the OWNER role

### Changed
- **Orders page**: table rows are now fully clickable (opens the order detail modal); action buttons (approve, eye, delete) stop click propagation so they still work independently
- **Settings page**: org form default values now include `description`; fetched org data resets `description` field on load; `updateOrgSchema` now includes `industry`, `size`, and `description` (was dropping them silently)
- **`getOverview` API**: response now includes `storePublished` and `orgSlug` so the overview page can determine storefront link and status without an extra request
- **Sidebar**: "Store" label renamed to "Storefront"; "Newsletter" nav item added (OWNER/MANAGER only)

### Fixed
- **Invite accept redirect**: was using `res.data.user.organization?.slug` (always `undefined`)  -  now correctly uses `res.data.orgSlug` returned by the `acceptInvite` endpoint
- **`initialStock` / `lowStockAlert` validation**: inputs on `/products/new` were registered without `valueAsNumber: true`; Zod received a string, failed `z.number()` validation, and blocked form submission
- **`updateOrgSchema` missing fields**: `industry` and `size` were in `createOrganizationSchema` but absent from `updateOrgSchema`, silently dropping those fields on every settings save
- **Logistics order count**: count query was not filtering by APPROVED status, showing incorrect totals
- **PDF report 404 on empty data**: `downloadReport` and `emailReport` returned `404` when no rows matched the date range; now generates an empty PDF instead
- **Admin order email `orgOwner.email` missing**: `orgOwner` select in `store.controller.ts` was missing the `email` field, causing the notification send to fail silently

---

## [1.3.0] - 2026-05-08

### Added
- **Audit log completeness**: LOGIN event on successful email/password sign-in; CREATE/Order event on store checkout; EXPORT/Report on PDF download and email; detailed store publish/unpublish log message
- **Audit log frontend**: `describeLog()` entity map extended with `ProductCategory` and `StaffInvite`; `actionVariant` map covers LOGIN, LOGOUT, EXPORT, INVITE badge colours
- **Order status emails**: `orderApprovedEmailTemplate` and `orderCompletedEmailTemplate`  -  sent to customer on status change (non-blocking)
- **Low-stock email alert**: sent to org OWNER when inventory stock ≤ `lowStockAlert` threshold on update
- **Customer chart API**: `GET /api/reports/customer-chart?period=` returns cumulative daily customer registration data
- **Variable product attributes UI**: `/products/new` attribute builder (name + comma-separated values) generates `ProductVariant` rows on save
- **Downloadable product toggle**: URL tab or file upload tab on `/products/new`
- **Validation error modal**: Zod `onFormError` handler surfaces field errors in AnimatePresence overlay on `/products/new`
- **Store checkout audit log**: `CREATE/Order` logged via `orgOwner.id` after successful checkout

### Changed
- **Google Fonts → `next/font/google`**: Jost font is now self-hosted at build time; removes external `fonts.googleapis.com` request that violated Vercel's Content Security Policy
- **Overview charts**: order bar chart replaced with AreaChart; customer chart fetches real API data instead of mock
- **Product card images**: `object-cover` on store product cards (fills container, no whitespace)
- **Individual product main image**: `aspect-[4/5]` + `object-contain p-2` (portrait images no longer cropped at top/bottom)
- **Inventory API**: `getInventory` now includes `productCategory: { name: true }` relation
- **Frontend inventory page**: renders `product.productCategory?.name` as badge
- **`backend/.env.example`**: fully rewritten  -  clean section headers, precise comments linking to source dashboards, no duplicate entries
- **`frontend/.env.local.example`**: new file with all four required `NEXT_PUBLIC_*` variables documented

### Fixed
- **CORS broken in production**: `FRONTEND_URL` was not set on Vercel → Express defaulted to `http://localhost:3000` → blocked all requests from `traqify.vercel.app`
- **All API calls failing in production**: `NEXT_PUBLIC_API_URL` not set on Vercel frontend → Axios fell back to `http://localhost:5000` → CORS + network errors
- **Google OAuth `redirect_uri_mismatch`**: `API_URL` not set on Vercel → redirect used `http://localhost:5000`; also added `https://traqify-api.vercel.app/api/auth/google-callback` to Google Cloud Console
- **Express rate-limit `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`**: added `app.set("trust proxy", 1)` so Vercel's proxy headers are trusted
- **SMTP cold-start noise**: removed `transporter.verify()` module-level call (ran on every Vercel serverless cold start, logged false failures); errors now surfaced per-send via `sendEmail()` catch
- **Emails not sending in production**: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` were missing from Vercel env vars
- **`Cannot GET /`**: added `app.get("/")` root handler returning JSON API info
- **`backend/.env` duplicate JWT entries**: cleaned to single correct base64 JWT_SECRET / JWT_REFRESH_SECRET

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
