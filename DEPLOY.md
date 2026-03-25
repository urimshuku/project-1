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

---

## 4. Venue booking API (`book-venue`)

The **Book the Space** form posts to the Edge Function `book-venue`, which validates input, inserts into `bookings`, and sends email via Resend.

### 4.1 Resume the project (if paused)

In [Supabase Dashboard](https://supabase.com/dashboard) → your project: if status is **Paused / Inactive**, click **Restore project**. Deploy and database commands only work on an active project.

### 4.2 Apply migrations (creates `bookings` table)

From this repo (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed and the project linked):

```bash
npx supabase db push
```

If the CLI asks for a database password or times out, set `SUPABASE_DB_PASSWORD` to your **database password** (Dashboard → **Project Settings** → **Database**) and retry, or run the SQL in `supabase/migrations/20260324170000_create_bookings_table.sql` from the SQL Editor.

### 4.3 Set Edge Function secrets

Booking needs Resend and where to notify staff. Your project may already have `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` from other functions—keep those.

**Option A — edit a local file (recommended):**

1. Open `supabase/.env.secrets` in your editor (gitignored; only on your machine).
2. Set `RESEND_API_KEY` and `BOOKING_ADMIN_EMAIL` (optional: `BOOKING_FROM_EMAIL`).
3. Push secrets to Supabase:

```bash
npx supabase secrets set --env-file supabase/.env.secrets
```

See `supabase/.env.secrets.example` for the same keys with placeholders.

**Option B — CLI one-liners:**

```bash
npx supabase secrets set RESEND_API_KEY=re_your_key_here
npx supabase secrets set BOOKING_ADMIN_EMAIL=you@yourdomain.com
```

Optional (defaults exist in code—override with your verified Resend domain):

```bash
npx supabase secrets set BOOKING_FROM_EMAIL="Studio Space <bookings@studiospace.community>"
```

### 4.4 Deploy the function

```bash
npx supabase functions deploy book-venue
```

The site calls: `{VITE_SUPABASE_URL}/functions/v1/book-venue` with the anon key in the `Authorization` header (same pattern as Paysera).

### 4.5 Verify

- Dashboard → **Edge Functions** → `book-venue` shows the new deployment.
- **Table Editor** → `bookings` exists after migration.
- Submit the booking form; check row + Resend delivery.
