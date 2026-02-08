# Custom domain setup – detailed guide

This guide walks you through moving your site from:

**Current URL:** `https://urimshuku.github.io/studio-space-donations/`  
**Target URL:** your own domain (e.g. `https://www.mystudio.com` or `https://donations.mystudio.com`).

You need:

- A domain name you own (e.g. from Namecheap, Google Domains, Cloudflare, GoDaddy).
- Access to the GitHub repo and to your domain’s DNS settings.

---

## Part 1: Choose your domain

Decide exactly which address you want people to use:

| Type | Example | When to use |
|------|---------|-------------|
| **Subdomain** | `www.mystudio.com` | Most common. Use `www` or something like `donations`. |
| **Subdomain** | `donations.mystudio.com` | Good if the rest of your site is at `mystudio.com`. |
| **Apex (root)** | `mystudio.com` | Use only this domain for the whole site. |

**Recommendation:** Use a subdomain like `www.mystudio.com` or `donations.mystudio.com`; DNS is simpler (one CNAME) and GitHub supports it reliably.

Write down your chosen domain. You’ll use it in all three parts below.

---

## Part 2: Set the domain in your repository

The file `public/CNAME` tells GitHub Pages which custom domain to use. Whatever you put there must **exactly** match what you’ll enter in GitHub Settings and in DNS.

### Step 2.1 – Open the file

- In your project, open **`public/CNAME`**.
- It currently contains: `www.yourdomain.com`

### Step 2.2 – Replace with your real domain

- Delete `www.yourdomain.com`.
- Type **only** your domain, with no `https://` and no trailing slash.
- One domain per line; no spaces.

**Examples:**

```text
www.mystudio.com
```

or

```text
donations.mystudio.com
```

or (apex):

```text
mystudio.com
```

### Step 2.3 – Save and deploy

- Save **`public/CNAME`**.
- Commit and push to your default branch (e.g. `main`):

```bash
git add public/CNAME
git commit -m "Set custom domain in CNAME"
git push origin main
```

After the GitHub Actions deploy finishes, the CNAME file will be in the root of your published site. GitHub will use it when you add the custom domain in Settings (Part 3).

---

## Part 3: Configure the custom domain on GitHub

GitHub must know that your repo’s GitHub Pages site is allowed to serve at your custom domain.

### Step 3.1 – Open repo Settings

1. Go to: **https://github.com/urimshuku/studio-space-donations**
2. Click the **Settings** tab (top menu of the repo).

### Step 3.2 – Open Pages settings

1. In the left sidebar, under **“Code and automation”**, click **Pages**.
2. You should see **“Build and deployment”** with **Source: GitHub Actions**.

### Step 3.3 – Add your custom domain

1. Find the **“Custom domain”** section.
2. In the text box, enter your domain **exactly** as in `public/CNAME` (e.g. `www.mystudio.com`).
   - No `https://` or `http://`.
   - No trailing slash.
3. Click **Save**.

### Step 3.4 – What you might see

- **“DNS check is still in progress”** or **“Waiting for DNS”**  
  Normal. You haven’t (or have just) set up DNS. Continue to Part 4.

- **“Certificate provisioned”** or similar  
  DNS is correct and GitHub has issued HTTPS. You’re done with GitHub.

### Step 3.5 – Enforce HTTPS (after DNS works)

Once the custom domain shows as verified:

1. In the same **Custom domain** section, enable **Enforce HTTPS** if it’s not already on.
2. This redirects `http://` to `https://` for your domain.

---

## Part 4: Configure DNS at your domain provider

This is where you point your domain name to GitHub’s servers. The exact UI depends on your provider; the **record types and values** are the same.

### Option A – Using a subdomain (e.g. `www.mystudio.com` or `donations.mystudio.com`)

You add **one CNAME record**.

| Field | What to enter | Example |
|-------|----------------|---------|
| **Type** | CNAME | CNAME |
| **Name / Host / Subdomain** | The part *before* your domain | `www` or `donations` |
| **Value / Target / Points to** | `urimshuku.github.io` | `urimshuku.github.io` |
| **TTL** | 300, 3600, or “Auto” | 300 |

- **Name:**  
  - For `www.mystudio.com` → use `www`.  
  - For `donations.mystudio.com` → use `donations`.  
  Some providers want only the subdomain; others want `www.mystudio.com`. If one doesn’t work, try the other.
- **Value:** Must be exactly **`urimshuku.github.io`** (no `https://`, no path).

#### Example – Cloudflare

1. Domain → **DNS** → **Records**.
2. **Add record**:
   - Type: **CNAME**
   - Name: `www` (or `donations`)
   - Target: `urimshuku.github.io`
   - Proxy status: **DNS only** (grey cloud) recommended while testing; you can enable proxy later if you want.
3. Save.

#### Example – Namecheap

1. **Domain List** → your domain → **Manage** → **Advanced DNS**.
2. **Add New Record**:
   - Type: **CNAME Record**
   - Host: `www` (or `donations`)
   - Value: `urimshuku.github.io`
   - TTL: Automatic (or 300).
3. Save.

#### Example – Google Domains (or Google Cloud DNS)

1. **DNS** (or **Manage DNS**).
2. **Custom records** (or **Create record**):
   - Type: **CNAME**
   - Host name: `www` (or `donations`)
   - Data: `urimshuku.github.io`
3. Save.

#### Example – GoDaddy

1. **My Products** → domain → **DNS** (or **Manage DNS**).
2. **Add** (or **Add record**):
   - Type: **CNAME**
   - Name: `www` (or `donations`) — often “Name” is just the subdomain.
   - Value: `urimshuku.github.io`
   - TTL: 600 or 1 hour.
3. Save.

---

### Option B – Using apex/root domain (e.g. `mystudio.com`)

You add **four A records** (no CNAME for the apex on standard DNS).

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| A | `@` (or leave blank, or `mystudio.com`) | `185.199.108.153` | 300 |
| A | `@` | `185.199.109.153` | 300 |
| A | `@` | `185.199.110.153` | 300 |
| A | `@` | `185.199.111.153` | 300 |

- **Name:** Often `@` or blank for “root”; some providers use the full domain.
- **Value:** The four IPs above. Create four separate A records if your provider doesn’t allow multiple values in one.

**Note:** If you use Cloudflare proxy (orange cloud), their IPs are used; GitHub’s IPs may not be required. For a first setup, “DNS only” and the four A records above are a safe choice.

---

## Part 5: Wait for DNS and verify

### 5.1 – Propagation

- DNS changes can take from **5 minutes** to **48 hours**.
- You can keep checking GitHub **Settings → Pages → Custom domain**; when DNS is correct, the warning will clear and the certificate will provision.

### 5.2 – Check DNS yourself (optional)

From a terminal:

```bash
# Subdomain (replace www with your subdomain, mystudio.com with your domain)
dig www.mystudio.com CNAME +short
# Expected: urimshuku.github.io. (or a CNAME to it)

# Apex
dig mystudio.com A +short
# Expected: the four GitHub IPs listed above
```

Or use: https://dnschecker.org — enter your domain and check CNAME (subdomain) or A (apex) globally.

### 5.3 – Test the site

- Open `https://your-domain.com` (e.g. `https://www.mystudio.com`) in a browser.
- You should see your Studio Space Donations site.
- Try a donation flow; success and cancel URLs use your current origin, so they will work on the custom domain.

---

## Part 6: Troubleshooting

| Problem | What to check |
|--------|----------------|
| “DNS check is still in progress” for a long time | Confirm CNAME (subdomain) points to `urimshuku.github.io` or A (apex) to the four IPs; no typos. Wait up to 48 hours. |
| “Invalid domain” or similar on GitHub | Domain in **Settings → Pages** must match **`public/CNAME`** exactly (no `https://`, no slash). |
| Site loads on GitHub URL but not on custom domain | DNS not propagated yet, or wrong record type/name/value. Re-check Part 4. |
| “Certificate not ready” / HTTPS not working | Wait for GitHub to provision the certificate after DNS is correct; can take up to ~24 hours. |
| Mixed content or redirect issues | Prefer **Enforce HTTPS** in GitHub Pages settings and use `https://` when linking to your site. |

---

## Summary checklist

- [ ] **Part 1:** Decide the exact domain (e.g. `www.mystudio.com`).
- [ ] **Part 2:** Put that domain in **`public/CNAME`**, commit, and push.
- [ ] **Part 3:** In GitHub **Settings → Pages**, set **Custom domain** to the same domain and Save.
- [ ] **Part 4:** At your DNS provider, add CNAME (subdomain) to `urimshuku.github.io` or four A records (apex) to GitHub’s IPs.
- [ ] **Part 5:** Wait for DNS and certificate; then open `https://your-domain.com` and test.
- [ ] **Part 6:** If something doesn’t work, use the troubleshooting table above.

After this, your custom URL will show your site, and the existing app (including Stripe redirects) will work on that URL without any code changes.
