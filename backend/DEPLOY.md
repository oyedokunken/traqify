# Backend Deployment Guide

## Required Environment Variables

Copy .env.example to .env and fill in the values.
**Never commit .env to version control.**

### Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/dbname

### Server
PORT=5000
NODE_ENV=production
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

### JWT
JWT_SECRET=<generate: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 64>
JWT_EXPIRES_IN=7d

### Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

Buckets required (Public): products (5MB), avatars (2MB)

### SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Traqify <your@gmail.com>

### Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
Callback URL: https://api.yourdomain.com/api/auth/google-callback

### Paystack
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_public_key

## Steps
1. npm install
2. npx prisma generate
3. npx prisma migrate deploy
4. npm run build
5. npm start
