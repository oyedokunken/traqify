# Deploying the Frontend to Vercel

This guide covers deploying the Traqify frontend (Next.js 14) to Vercel using the Vercel web dashboard.

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier works)
- Your code pushed to a GitHub repository
- Backend already deployed and its URL available (e.g. `https://traqify-api.vercel.app`)

---

## Steps

### 1. Push your code to GitHub

Make sure your latest code is committed and pushed:
```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

### 2. Import your project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub account and choose the `traqify` repository
4. Under **"Root Directory"**, set it to `frontend`
5. Vercel will auto-detect **Next.js** — leave the build settings as defaults

### 3. Add environment variables

In the Vercel project settings, add the following under **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 4. Deploy

Click **"Deploy"**. Vercel will build and deploy your frontend.

Your site will be live at `https://your-project-name.vercel.app`.

---

## Custom Domain (optional)

1. Go to your Vercel project settings
2. Click **"Domains"**
3. Add your domain and follow the DNS setup instructions

---

## Redeploy

Any push to the `main` branch will automatically trigger a new deployment.

To redeploy manually, go to your Vercel project dashboard and click **"Redeploy"** on the latest deployment.

---

## Important Notes

- **Do not commit `.env.local`** — add environment variables through the Vercel dashboard only
- Update your backend `FRONTEND_URL` env var to point to your Vercel frontend URL
- Update Google Console Authorized JavaScript Origins with your Vercel frontend URL
