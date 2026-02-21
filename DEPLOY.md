# Deploying to GitHub Pages with Supabase

To stop seeing "Showing demo categories" and use your real database:

## 1. Add GitHub Actions secrets

1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add:
   - **Name:** `VITE_SUPABASE_URL`  
     **Value:** your project URL (e.g. `https://xxxx.supabase.co`) from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**.
   - **Name:** `VITE_SUPABASE_ANON_KEY`  
     **Value:** the **anon** / **public** key from the same API settings.

## 2. Apply database migrations

From your project folder (with Supabase CLI installed and project linked):

```bash
npx supabase db push
```

## 3. Redeploy

The site is built when you push to `main`. After adding secrets you must trigger a new build:

- **Option A:** Push any new commit to `main`.
- **Option B:** Go to **Actions** → open the latest "Deploy to GitHub Pages" run → **Re-run all jobs**.

After the new build finishes, the site will use your Supabase project and the demo message will disappear once categories are loaded from the database.
