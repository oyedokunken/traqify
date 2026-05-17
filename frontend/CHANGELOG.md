# Frontend Changelog

All notable changes to the Traqify frontend are documented in this file.

---

## [v1.20.0] - 2026-05-17

### Added
- **Delete confirmation modal on Reviews page** -- clicking Delete now shows a confirmation dialog before the review is permanently removed
- **Category pill on store product cards** -- each product card displays its category name in a white pill badge
- **Total review count on store product cards** -- product cards show the number of approved reviews alongside the average star rating
- **Invited user registration block** -- registration page now checks for pending staff invites and shows an error modal if the user is invited to an organization
- **Google OAuth invite block** -- login page handles `invited_user` error from Google OAuth redirect

### Changed
- **Google OAuth login restriction removed** -- removed the `email_account` error handler; users who registered with email can now also use Google OAuth
- **Mobile padding on all landing page sections** -- updated horizontal padding from `px-4` to `px-5` on Hero, About, Features, Stats, How It Works, Why Traqify, Testimonials, Everything, FAQ, and CTA sections
- **Mobile padding on all dashboard pages** -- updated padding from `p-4` to `p-5` on mobile for all dashboard pages
- **Hero image column mobile padding** -- added `px-4 sm:px-0` padding to the hero image column on mobile
- **FAQ answers rewritten** -- removed all tech stack mentions and technical details; security answer provides assurance without referencing specific technologies; no em dashes or emojis
- **Footer mobile layout** -- "Stay updated" column spans full width on mobile/tablet (`col-span-2 lg:col-span-1`), creating a 2x2 grid layout; desktop unchanged

### Fixed
- **5.0 default rating bug** -- product detail page no longer displays hardcoded decorative 5.0 stars; shows computed average rating only when reviews exist

---

## [v1.19.0] - 2026-05-12

### Added
- Approval/rejection confirmation modals on Reviews page
- Mark-delivered confirmation modal on Logistics page
- Quick Links card repositioned after charts on Overview page

---

See root `CHANGELOG.md` for the complete history.
