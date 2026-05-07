# Changelog

All notable changes to Traqify are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
