# Contributing to Traqify

Thank you for your interest in contributing! This guide covers everything you need to set up a development environment, follow the project conventions, and submit quality pull requests.

---

## Table of Contents

- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Code conventions](#code-conventions)
- [Commit messages](#commit-messages)
- [Pull request process](#pull-request-process)
- [Adding new features](#adding-new-features)
- [Reporting bugs](#reporting-bugs)

---

## Getting started

### Prerequisites

| Tool | Min version |
|------|------------|
| Node.js | 18.x |
| npm | 9.x |
| PostgreSQL | 14+ (or Supabase project) |

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/traqify.git
cd traqify
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, JWT_SECRET, SUPABASE_URL, SMTP_*, etc.

# Frontend
cp frontend/.env.example frontend/.env.local
# Fill in NEXT_PUBLIC_API_URL
```

### 4. Run database migrations

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Start dev servers

```bash
# Terminal 1 — backend (port 5000)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend && npm run dev
```

---

## Project structure

```
traqify/
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── config/           # DB, email, Supabase clients
│   │   ├── controllers/      # Route handlers
│   │   ├── emails/           # HTML email templates
│   │   ├── middleware/       # auth, upload, RBAC
│   │   └── routes/           # Express routers
│   └── prisma/               # Schema + migrations
│
├── frontend/                 # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/           # Login, register, invite pages
│   │   ├── (public)/         # Landing page
│   │   ├── create-organization/
│   │   ├── dashboard/[slug]/ # All dashboard pages
│   │   └── store/[slug]/     # Public storefront
│   ├── components/
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── landing/          # Landing page sections
│   │   ├── shared/           # Navbar, footer, logo, etc.
│   │   └── ui/               # shadcn/ui primitives
│   └── lib/                  # API client, auth context, utils
│
└── *.md                      # Project documentation
```

---

## Development workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/what-you-are-fixing
   ```

2. Make focused, well-scoped commits (see [Commit messages](#commit-messages))

3. Run TypeScript checks before opening a PR:
   ```bash
   cd backend && npx tsc --noEmit
   cd frontend && npx tsc --noEmit
   ```

4. Open a pull request against `main`

---

## Code conventions

### General

- **TypeScript everywhere** — no `any` types unless unavoidable; prefer explicit interfaces
- **Functional components** — React class components are not used
- **Named exports** — prefer named exports over default exports for components (exception: Next.js `page.tsx` files)
- **Tailwind CSS** — all styling via Tailwind utility classes; no separate CSS files except `globals.css`
- **Brand colours**: `#DE1010` (primary red), `#0a0a0a` (near-black), `#111111` (dark), white
- **Font**: Jost (loaded via Google Fonts)

### Backend

- Controllers are async functions that take `(req: Request, res: Response): Promise<void>`
- Every controller wraps logic in a `try/catch` and returns a JSON error on failure
- All DB access goes through the Prisma client at `src/config/database.ts`
- Authentication middleware: `authenticate` (verifies JWT), `isOwnerOrManager`, `isOwnerOnly`
- Create an audit log entry (`createAuditLog`) for every state-changing operation

### Frontend

- API calls use the shared `api` Axios instance from `lib/api.ts`
- Authentication state is consumed via `useAuth()` from `lib/auth-context.tsx`
- Dashboard pages live under `app/dashboard/[slug]/`; each page uses `Topbar` + page body
- Shared UI primitives come from `components/ui/` (shadcn/ui); extend, don't duplicate

---

## Commit messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>(<scope>): <short description>

[optional body]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no feature/fix |
| `chore` | Dependency updates, build scripts |
| `perf` | Performance improvement |

**Examples:**
```
feat(store): add off-canvas mobile menu with category nav
fix(orders): prevent APPROVED status from bypassing validation
docs: update README with Supabase Storage setup
chore(deps): bump prisma to 5.15.0
```

---

## Pull request process

1. **Title** — use the same Conventional Commits format as your commit messages
2. **Description** — include: what changed, why, and how to test it
3. **TypeScript must compile** — both `backend` and `frontend` `tsc --noEmit` must pass
4. **No breaking schema changes** without a migration file
5. **One concern per PR** — split large features into reviewable chunks

PRs that modify the Prisma schema must include the generated migration file (`prisma/migrations/`).

---

## Adding new features

### New dashboard page

1. Create `app/dashboard/[slug]/<page-name>/page.tsx`
2. Add the nav item to `components/dashboard/sidebar.tsx` (`navItems` array)
3. Add any required backend routes/controllers

### New backend endpoint

1. Add controller function in `src/controllers/<entity>.controller.ts`
2. Register the route in `src/routes/<entity>.routes.ts`
3. Mount the router in `src/index.ts` if it's a new router
4. Add an audit log call for state-changing operations

### New email template

1. Add the template function to `src/emails/templates.ts`
2. Call `sendEmail({ to, subject, html: template(...) })` from the relevant controller

---

## Reporting bugs

Open a [GitHub issue](https://github.com/oyedokunken/traqify/issues) with:

- **Environment** (OS, Node version, browser)
- **Steps to reproduce**
- **Expected vs actual behaviour**
- **Screenshots** if applicable

For security vulnerabilities, see [SECURITY.md](./SECURITY.md).
