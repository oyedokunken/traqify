# Backend Changelog

All notable changes to the Traqify backend are documented in this file.

---

## [v1.20.0] - 2026-05-17

### Added
- **Invited user registration block** -- `POST /api/auth/register` now checks for pending or accepted staff invites before creating an account; returns 409 with `isInvited: true` if the email has an active invite
- **Invited user check in `checkEmail`** -- `POST /api/auth/check-email` now returns `isInvited` flag when the email has a pending or accepted staff invite, allowing the frontend to block registration early
- **Google OAuth invite block** -- `GET /api/auth/google-callback` now checks for pending staff invites before creating a new Google account; redirects to `/login?error=invited_user` if blocked
- **Downloadable product email support** -- order completion emails now include download buttons or file attachment links for downloadable products

### Changed
- **Google OAuth and email/password login are no longer mutually exclusive** -- removed the restriction in `googleCallback` that blocked Google OAuth for users who registered with email/password; any user can now sign in with either method
- **Login error message updated** -- users with Google-only accounts (no password) now see a message suggesting they can reset their password to set one up
- **Email footer formatting** -- horizontal rule and consistent font styling applied to the Traqify description text in both platform and store email footers

---

## [v1.19.0] - 2026-05-12

### Added
- Approval/rejection confirmation modals support in review moderation
- Mark-delivered confirmation support in logistics
- Manual order initial status changed to APPROVED
- Traqify brand logo in all platform email templates

---

## [v1.18.0] - 2026-05-12

### Fixed
- Downloadable file upload 500 error resolved by routing to `downloadables` Supabase bucket

---

See root `CHANGELOG.md` for the complete history.
