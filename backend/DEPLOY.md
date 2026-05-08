# Backend Deployment Guide (Vercel)

## Step 1: Prepare Your Environment

### Required Services
- **Supabase** (PostgreSQL + Storage) — create free project at https://supabase.com
- **Gmail** with App Password — for email sending
- **Google Cloud Project** — for OAuth 2.0 (optional, for "Continue with Google")
- **Paystack** — for payment processing

---

## Step 2: Get Your Credentials

### Supabase
1. Go to your Supabase project > Settings > Database
2. Copy **Connection String (Pooling)** → `DATABASE_URL`
3. Copy **Connection String (Direct)** → `DIRECT_URL`
4. Go to Settings > API
5. Copy **Project URL** → `SUPABASE_URL`
6. Copy **anon public key** → `SUPABASE_ANON_KEY`
7. Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Supabase Storage Buckets
Create these public buckets in Supabase Storage:
- `products` (max file size: 5MB)
- `avatars` (max file size: 2MB)

### Gmail SMTP
1. Enable 2FA on your Gmail account
2. Go to Google Account > Security > App Passwords
3. Generate new app password (16 characters)
4. Use these for `SMTP_USER` and `SMTP_PASS`

### Paystack
1. Sign up at https://paystack.co
2. Go to Settings > API Keys
3. Copy **Secret Key** → `PAYSTACK_SECRET_KEY`
4. Copy **Public Key** → `PAYSTACK_PUBLIC_KEY`

### Google OAuth (Optional)
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add your Vercel domain to Authorized JavaScript Origins and Redirect URIs
4. Copy Client ID and Client Secret

---

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Configure these settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Click **Configure**
5. Add all environment variables (see below)
6. Click **Deploy**

### Option B: Via Vercel CLI
```bash
npm install -g vercel
cd backend
vercel
```

---

## Step 4: Environment Variables in Vercel

Add these in Vercel Project Settings > Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Your Supabase pooled connection string | PostgreSQL connection with pgbouncer |
| `DIRECT_URL` | Your Supabase direct connection string | For Prisma migrations |
| `PORT` | `5000` | API port (Vercel overrides, but set for reference) |
| `NODE_ENV` | `production` | Environment mode |
| `API_URL` | `https://your-backend.vercel.app` | Your deployed backend URL |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your frontend URL (for CORS) |
| `JWT_SECRET` | Generate with `openssl rand -base64 64` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Generate with `openssl rand -base64 64` | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | `7d` | Access token lifetime |
| `SUPABASE_URL` | Your Supabase project URL | e.g., https://xyz.supabase.co |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Public key for client requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Full access key for server |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | Your Gmail address | e.g., you@gmail.com |
| `SMTP_PASS` | Your Gmail App Password | 16-char app password |
| `SMTP_FROM` | `"Traqify <your@gmail.com>"` | From email header |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Optional, for Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret | Optional |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | `pk_live_...` or `pk_test_...` | Paystack public key |

---

## Step 5: Configure vercel.json (Optional)

Create `vercel.json` in the backend folder to configure build and start:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.ts"
    }
  ]
}
```

---

## Step 6: Run Migrations After Deployment

After first deployment, run migrations via Vercel CLI:

```bash
vercel env pull .env
npx prisma migrate deploy
```

Or use Prisma's recommended approach — add a postinstall script to `package.json`:

```json
"scripts": {
  "postinstall": "npx prisma generate"
}
```

---

## Testing Your Deployment

```bash
# Health check
curl https://your-backend.vercel.app/health

# Should return:
# { "status": "ok", "timestamp": "..." }
```

---

## Common Issues

### Issue: Prisma Client Generation
Vercel builds run `npm install` automatically. Ensure your `package.json` has:
```json
"scripts": {
  "postinstall": "npx prisma generate"
}
```

### Issue: Database Connection Timeout
Supabase free tier has connection limits. Use the pooled connection string (`DATABASE_URL`) with `?pgbouncer=true`.

### Issue: File Upload Fails
Ensure Supabase Storage buckets are **public** and have correct file size limits.

---

## Local Development (.env.example)

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Then fill in your local credentials (use Supabase local or dev project).

---

## Environment Variables Reference (.env.example)

Copy these directly to Vercel environment variables:

```env
DATABASE_URL="postgresql://postgres.brhnlhvdkmciqncdcovq:OyedokunKehinde100%25@aws-1-eu-west-2.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.brhnlhvdkmciqncdcovq:OyedokunKehinde100%25@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

PORT=5000
NODE_ENV=development
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

JWT_SECRET=6LFKB57OkIeA46Fnxv0a3T+GCKZWsq6lrj5miS5H3AFIzAh/MnY7DQ3JBFlYktaLoOrMPoZ/ICvyOtAXw2M0UQ==
JWT_REFRESH_SECRET=H22gXMGJ3Qinv72opaefqVXDQ9VLx/5pjhNEOEZ8SWrdk9SPCJSPSrYJvOLHIkY4X6pCtLx/o37HgyPWb+kvPA==
JWT_EXPIRES_IN=7d

SUPABASE_URL=https://brhnlhvdkmciqncdcovq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyaG5saHZka21jaXFuY2Rjb3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjM1MTMsImV4cCI6MjA5MzczOTUxM30.aqktdoMySliMgVw8FUQbJbRY0c-qfl_pzi6s_xvlZAE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyaG5saHZka21jaXFuY2Rjb3ZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODE2MzUxMywiZXhwIjoyMDkzNzM5NTEzfQ.NKVvltDs8rigCsc6eIZrtkmmuN6zraIXOY8s2kSWqYE

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=decimaltechy@gmail.com
SMTP_PASS=bqpbovtfljvazbfq
SMTP_FROM="Traqify <decimaltechy@gmail.com>"

GOOGLE_CLIENT_ID=120412435332-7vgnrlvs6uavdc7frsfpmsdoe5c00evt.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

PAYSTACK_SECRET_KEY=sk_test_34a878fc9cee510f2eeb4fc5a3f7ffe88ee18238
PAYSTACK_PUBLIC_KEY=pk_test_97ea3775550f1bd74cdaa1818a57b6a280f177e8
```
