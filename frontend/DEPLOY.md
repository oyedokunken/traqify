# Frontend Deployment Guide (Vercel)

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://traqify-api.vercel.app
NEXT_PUBLIC_APP_URL=https://traqify.vercel.app

NEXTAUTH_URL=https://traqify.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your-paystack-public-key

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
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
