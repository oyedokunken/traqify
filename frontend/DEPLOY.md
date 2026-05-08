# Frontend Deployment Guide (Vercel)

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=traqify-nextauth-secret-2024-production

GOOGLE_CLIENT_ID=120412435332-7vgnrlvs6uavdc7frsfpmsdoe5c00evt.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_97ea3775550f1bd74cdaa1818a57b6a280f177e8

NEXT_PUBLIC_SUPABASE_URL=https://brhnlhvdkmciqncdcovq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyaG5saHZka21jaXFuY2Rjb3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjM1MTMsImV4cCI6MjA5MzczOTUxM30.aqktdoMySliMgVw8FUQbJbRY0c-qfl_pzi6s_xvlZAE
```

## Deployment Steps

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Root Directory: `frontend` (or leave blank if frontend is at root)
4. Framework Preset: Next.js
5. Click **Configure**
6. Add all environment variables above
7. Click **Deploy**

## Local Development

Copy to `.env.local`:

```bash
cp .env.local.example .env.local
```

Then fill in the values above.
