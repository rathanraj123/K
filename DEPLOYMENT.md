# AgriCosmo AI Production Deployment Guide

This guide details the exact steps required to deploy the AgriCosmo AI platform in a production environment with zero local dependencies.

## Architecture

*   **Frontend:** Hosted on Vercel.
*   **Backend:** Hosted on Render (Web Service + Background Worker).
*   **Database & Storage:** Hosted on Supabase (PostgreSQL + S3 Object Storage).
*   **Message Broker & Cache:** Hosted on Upstash Redis (or Render Redis).

---

## 1. Supabase Setup (Database & Storage)

1.  Create a new project on [Supabase](https://supabase.com/).
2.  Navigate to **Project Settings -> Database**.
    *   Copy the **Connection String (URI)**. It should look like `postgresql://postgres.[project]:[password]@aws-0-region.pooler.supabase.com:6543/postgres`.
    *   Ensure **Connection Pooling** is enabled (Session mode is preferred for asyncpg, but the backend disables prepared statements to safely support Transaction mode).
3.  Navigate to **Project Settings -> API**.
    *   Copy the `Project URL`.
    *   Copy the `anon` `public` key (used by frontend).
    *   Copy the `service_role` `secret` key (used strictly by backend).
4.  Navigate to **Storage**.
    *   Create a new public bucket named `agricosmo-scans`.

---

## 2. Render Setup (Backend)

1.  Create a new account on [Render](https://render.com/).
2.  Navigate to **Blueprints** and connect your GitHub repository.
3.  Select the `backend/render.yaml` file to automate the deployment.
4.  Render will automatically propose creating two services:
    *   `agricosmo-api` (Web Service)
    *   `agricosmo-worker` (Background Celery Worker)
5.  In the Render Dashboard, configure the following Environment Variables for **both** services:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Your Supabase Connection String (from step 1.2). |
| `SUPABASE_URL` | Your Supabase Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase `service_role` key. Do not use the anon key. |
| `REDIS_URL` | A Redis connection string (e.g., from Upstash or a Render Redis instance). |
| `GROQ_API_KEY` | Your Groq API key for LLM analytics. |
| `BACKEND_CORS_ORIGINS` | Comma-separated list of your Vercel domains (e.g., `https://my-app.vercel.app`). |

6.  Deploy both services. The `start.sh` script will automatically run database migrations before the API boots.

---

## 3. Vercel Setup (Frontend)

1.  Create a new project on [Vercel](https://vercel.com/) and import your GitHub repository.
2.  Set the **Root Directory** to `frontend`.
3.  The Framework Preset should automatically detect **Vite**.
4.  Configure the following Environment Variables:

| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | The public URL of your deployed Render Web Service (e.g., `https://agricosmo-api.onrender.com/api/v1`). |
| `VITE_SUPABASE_URL` | Your Supabase Project URL. |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase `anon` `public` key. |
| `VITE_ENVIRONMENT` | `production` |

5.  Deploy the frontend.

---

## 4. Final Validation

1.  Navigate to your Vercel URL.
2.  Ensure that the login page loads correctly (Frontend is working).
3.  Attempt to log in. (Validates Frontend -> Backend -> Database connectivity).
4.  Upload a crop scan. (Validates Backend -> Supabase Storage, and Backend -> Celery Worker -> Redis connectivity).

## Troubleshooting

*   **App Crash on Render (Logs say CRITICAL SECURITY ERROR):** You forgot to set the `SECRET_KEY` in the Render environment variables.
*   **Database Migrations Failed:** Verify your `DATABASE_URL` is correct and includes your Supabase password.
*   **Images Not Loading:** Ensure the `agricosmo-scans` bucket in Supabase is set to "Public".
