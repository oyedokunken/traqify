# Traqify Backend Wiki

## Overview

Express.js + TypeScript API server powering the Traqify multi-tenant store management platform.

---

## Authentication

### Email/Password Login
- `POST /api/auth/login` validates email + bcrypt password
- Users who only have a Google account (no password set) are told to use Google Sign-In or reset their password
- Email/password and Google OAuth are **not mutually exclusive** -- a user can use either method

### Google OAuth
- `GET /api/auth/google-redirect` starts the OAuth flow
- `GET /api/auth/google-callback` exchanges the code, upserts the user, and issues JWT tokens
- Users with pending staff invites are blocked from creating new Google accounts

### Registration
- `POST /api/auth/register` creates a new user after email OTP verification
- Users with pending or accepted staff invites cannot register -- they receive a 409 error with `isInvited: true`
- The `POST /api/auth/check-email` endpoint returns an `isInvited` flag so the frontend can block registration early

### Staff Invite Flow
- `POST /api/auth/accept-invite` creates a user account linked to the inviting organization
- Invites expire after 3 days (72 hours)
- Invited users can only join via the invite link -- they cannot create a standalone account

---

## RBAC

Role hierarchy: OWNER (4) > MANAGER (3) > AUDITOR (2) > CASHIER (1)

Middleware guards:
- `isOwnerOnly` -- OWNER only
- `isOwnerOrManager` -- OWNER or MANAGER
- `isAtLeastAuditor` -- OWNER, MANAGER, AUDITOR
- `isAtLeastCashier` -- all roles

---

## Key Endpoints

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | /api/auth/register | public | Register (email pre-verified) |
| POST | /api/auth/login | public | Login |
| POST | /api/auth/check-email | public | Check email + invite status |
| GET | /api/auth/google-callback | public | Google OAuth callback |
| POST | /api/auth/accept-invite | public | Accept staff invitation |
| GET | /api/reports/overview | isAtLeastAuditor | Dashboard KPIs |
| GET | /api/payments | isAtLeastAuditor | List payments |
| POST | /api/store/:slug/checkout | public | Public store checkout |

---

## Email Templates

All templates defined in `src/emails/templates.ts`. No emojis, no em dashes. Both platform and store email footers include a horizontal rule separator and consistent font styling.

---

See root `WIKI.md` for the complete platform documentation.
