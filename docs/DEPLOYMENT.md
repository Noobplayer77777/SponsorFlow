# SponsorFlow Production Deployment Guide

SponsorFlow is a full-stack Next.js + Express.js + PostgreSQL platform designed to run efficiently on modern cloud providers. This guide covers deploying the application to production using **Vercel** (Frontend) and **Railway/Render** (Backend & DB).

---

## 1. Prerequisites

Before starting, ensure you have the following accounts and tools:
- A [Vercel](https://vercel.com/) account for the Next.js frontend.
- A [Railway](https://railway.app/) or [Render](https://render.com/) account for the Node.js backend, PostgreSQL database, and Redis instance.
- A [Google Cloud Console](https://console.cloud.google.com/) account for Google OAuth credentials.
- An [Upstash](https://upstash.com/) or Railway Redis instance for BullMQ background jobs.
- (Optional) A [Google AI Studio](https://aistudio.google.com/) API Key for AI features.

---

## 2. Environment Variables Reference

You will need to set these environment variables in your deployment environments.

### Backend (`backend/.env`)
```env
# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Database (PostgreSQL connection string)
DATABASE_URL=postgres://user:pass@host:port/dbname

# Redis (For BullMQ Follow-ups)
REDIS_URL=redis://default:pass@host:port

# Google OAuth (For Authentication & Gmail API)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend-domain.up.railway.app/api/auth/google/callback

# JWT & Session Security
JWT_SECRET=generate-a-long-secure-random-string

# AI Assistance (Optional)
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (`frontend/.env.local` -> Vercel Environment Variables)
```env
# Next.js Public Variables
NEXT_PUBLIC_API_URL=https://your-backend-domain.up.railway.app/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 3. Deployment Steps

### Phase A: Database & Redis (Railway/Render)
1. Log into Railway and create a **New Project**.
2. Provision a **PostgreSQL** database.
3. Provision a **Redis** instance.
4. Copy the `DATABASE_URL` and `REDIS_URL` connection strings.

### Phase B: Backend Deployment (Railway/Render)
1. In the same Railway project, link your GitHub repository.
2. Select the `backend` directory as the root directory (or use a Dockerfile if preferred).
3. Under **Variables**, add all the Backend Environment Variables listed above.
4. Set the Build Command to: `npm install && npx prisma generate && npm run build`
5. Set the Start Command to: `npm start`
6. Wait for the deployment to finish and copy the public URL (e.g., `https://sponsorflow-api.up.railway.app`).

### Phase C: Frontend Deployment (Vercel)
1. Log into Vercel and **Add New Project**.
2. Import the SponsorFlow GitHub repository.
3. Set the **Framework Preset** to Next.js.
4. Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, add `NEXT_PUBLIC_API_URL` (pointing to the backend URL from Phase B) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
6. Click **Deploy**.

---

## 4. Post-Deployment Database Migration

Once the backend is live, you must push the Prisma schema to the production database to create the tables.

If you have railway CLI installed:
```bash
railway run npx prisma db push
```

Alternatively, you can temporarily add `npx prisma db push` to your build command in Railway for the first deployment, and then remove it afterward.

---

## 5. Security Considerations & Best Practices

- **API Keys & Secrets:** NEVER expose `JWT_SECRET`, `DATABASE_URL`, or `GOOGLE_CLIENT_SECRET` in the frontend environment.
- **Google OAuth Consent Screen:** Ensure you configure your OAuth consent screen in Google Cloud to Production status to avoid token expiration issues. Add your Vercel and Railway domains to the Authorized Domains list.
- **Rate Limiting:** The backend automatically applies `express-rate-limit` (max 200 requests / 15 mins per IP).
- **CORS:** Ensure `FRONTEND_URL` is set strictly in the backend `.env` so that `cors()` rejects unauthorized origins.
- **Database Backups:** Enable automated daily backups in your PostgreSQL hosting provider (Railway automatically handles this on pro plans).

---

## 6. Troubleshooting

**Error: P1001: Can't reach database server**
- Verify your `DATABASE_URL` is correct.
- Ensure your database allows external connections if you are running migrations from your local machine.

**Error: Invalid Google OAuth redirect_uri_mismatch**
- Ensure the `GOOGLE_REDIRECT_URI` exactly matches the URI configured in the Google Cloud Console. No trailing slashes.

**Follow-up Notifications Not Triggering**
- Verify the `REDIS_URL` is correct in the backend. The worker relies on Redis to schedule and trigger jobs via BullMQ.
