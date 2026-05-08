# Frontend Deployment Guide

## Required Environment Variables

Create a .env.local file (or set these in your hosting platform).
**Never commit .env.local to version control.**

### API
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

### Supabase (if used on frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

### Paystack Public Key (for payment UI)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

### Google OAuth (handled by backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

## Steps
1. npm install
2. npm run build
3. npm start

## Hosting
- Vercel: Set env vars in project settings, deploy with vercel CLI or GitHub integration
- Netlify: Set env vars in Site settings > Build & deploy > Environment
