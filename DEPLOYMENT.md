# Production Deployment Guide - AgriCosmo AI Platform

This guide outlines the production deployment steps for the AgriCosmo AI Platform, configuring frontend deployment on Vercel, backend deployment on Render, and database/auth/storage integration on Supabase.

---

## 1. Supabase Setup (Database, Auth, & Storage)

AgriCosmo uses Supabase for structured data persistence, user auth, and compressed scanning image storage.

### A. Database Connection
1. In your Supabase Dashboard, navigate to **Project Settings > Database**.
2. Copy the **URI connection string** under "Connection strings" (use the Pooler connection URL if available, ensuring it's in transaction/session mode).
3. Set this as `DATABASE_URL` in the backend environment. Replace the scheme prefix `postgres://` or `postgresql://` with `postgresql+asyncpg://` to support SQLAlchemy's asynchronous drivers.

### B. Storage Buckets
1. In the Supabase Dashboard, go to **Storage**.
2. Create a new bucket named **`agricosmo-scans`**.
3. Set the bucket privacy to **Public** so public URLs are retrievable (otherwise, update backend credentials and storage service to use signed URLs).
4. Under Policies, configure a policy allowing authenticated users to upload and view resources.

---

## 2. Backend Deployment (Render)

The FastAPI backend runs on Render as a Web Service.

### A. Web Service Setup
1. Create a new **Web Service** on Render connected to your git repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Language**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Select a plan (e.g., Free or Starter tier).

### B. Environment Variables
In the Render dashboard under your service's **Environment** tab, add:

| Key | Example / Description |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `ENV_STATE` | `production` |
| `SECRET_KEY` | *[Long secure random string]* |
| `JWT_SECRET_KEY` | *[Long secure random string]* |
| `DATABASE_URL` | *[Your Supabase Database Connection URI]* |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | *[Your Supabase anon public key]* |
| `SUPABASE_SERVICE_ROLE_KEY` | *[Your Supabase service role private key]* |
| `NEWS_API_KEY` | *[Your NewsAPI subscription key]* |
| `DATA_GOV_API_KEY` | *[Your Data.gov.in API key]* |
| `GROQ_API_KEY` | *[Your Groq API key for Chatbot]* |
| `OPENWEATHER_API_KEY` | *[Your OpenWeather API key]* |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |

---

## 3. Frontend Deployment (Vercel)

The Vite+React frontend is deployed on Vercel as a Static Site.

### A. Project Import
1. Import your repository into the Vercel Dashboard.
2. Configure project options:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the following **Environment Variables**:

| Key | Description |
| --- | --- |
| `VITE_ENVIRONMENT` | `production` |
| `VITE_API_URL` | `https://your-backend.onrender.com/api/v1` |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` |

---

## 4. Troubleshooting & Best Practices

### CORS Failures
If you receive CORS errors on the frontend:
* Ensure `FRONTEND_URL` on Render environment variables contains the exact scheme and host (e.g. `https://my-app.vercel.app`) without trailing slashes.
* Set `BACKEND_CORS_ORIGINS=["https://my-app.vercel.app"]` explicitly.

### Port Binding Issues
FastAPI dynamically binds to `$PORT` environment variable supplied by Render. Ensure uvicorn's startup flag specifies `--port $PORT` or relies on Render binding standard.

### NewsAPI Free-Tier Restriction
Note that the NewsAPI free tier limits calls to `localhost`. If deploying on Render/Vercel using a free tier NewsAPI key, external fetches might receive a 426 status from NewsAPI. In this case, the AgriCosmo backend will gracefully fall back to displaying the local cached agricultural news, avoiding any application crash.
