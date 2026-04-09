# V-KOOL Booking Tool — Deployment Guide
## From zero to live in ~2 hours

---

## STEP 1 — Push code to GitHub (10 min)

1. Go to github.com → click **New repository**
2. Name it `vkool-booking` → set to **Private** → click Create
3. Open a terminal on your computer and run:

```bash
# Navigate to the project folder (adjust path as needed)
cd vkool-booking

# Initialize git and push
git init
git add .
git commit -m "Initial V-KOOL booking app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/vkool-booking.git
git push -u origin main
```

---

## STEP 2 — Set up Supabase database (15 min)

1. Go to **supabase.com** → open your project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `supabase-schema.sql` from this project
5. Copy the entire contents and paste into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success" — your tables are created

**Get your Supabase keys:**
- Go to **Settings → API**
- Copy: `Project URL`, `anon public` key, `service_role secret` key
- Save these — you'll need them in Step 4

---

## STEP 3 — Set up Google Calendar (20 min)

1. Go to **console.cloud.google.com**
2. Create a new project (name it "vkool-booking")
3. Enable the **Google Calendar API**:
   - Click **APIs & Services → Library**
   - Search "Google Calendar API" → Enable
4. Create a Service Account:
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → Service Account**
   - Name: `vkool-calendar` → Create
   - Role: **Editor** → Done
5. Create a key for the service account:
   - Click the service account you just created
   - Go to **Keys** tab → **Add Key → Create new key → JSON**
   - Download the JSON file — it contains your `client_email` and `private_key`
6. Create a Google Calendar for bookings:
   - Go to **calendar.google.com**
   - Click **+** next to "Other calendars" → Create new calendar
   - Name it "V-KOOL San Salvador Reservas"
   - Go to the calendar's **Settings → Share with specific people**
   - Add the `client_email` from your JSON key with **"Make changes to events"** permission
   - Copy the **Calendar ID** from Settings (looks like `xxxxx@group.calendar.google.com`)

---

## STEP 4 — Configure Wompi webhook (10 min)

1. Log into your **Wompi dashboard** (dashboard.wompi.co)
2. Go to **Developers → Webhooks**
3. Add a new webhook URL:
   ```
   https://cotizar.vkoolsv.com/api/webhooks/wompi
   ```
   (Use your Vercel preview URL during testing first)
4. Select event: `transaction.updated`
5. Copy the **Events secret** that Wompi generates

---

## STEP 5 — Deploy to Vercel (15 min)

1. Go to **vercel.com** → click **Add New → Project**
2. Import your `vkool-booking` GitHub repository
3. Framework preset will auto-detect as **Next.js** — leave defaults
4. Before clicking Deploy, click **Environment Variables** and add ALL of these:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Your Wompi public key (`pub_test_...`) |
| `WOMPI_PRIVATE_KEY` | Your Wompi private key (`priv_test_...`) |
| `WOMPI_EVENTS_SECRET` | Your Wompi webhook secret |
| `WOMPI_API_URL` | `https://sandbox.wompi.co/v1` (test) |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | `reservas@vkoolsv.com` |
| `COMPANY_EMAIL` | `v-koolsansalvador@pacifictrading.net` |
| `GOOGLE_CLIENT_EMAIL` | `client_email` from your JSON key file |
| `GOOGLE_PRIVATE_KEY` | `private_key` from your JSON key file |
| `GOOGLE_CALENDAR_ID` | Your calendar ID from Step 3 |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (update after deploy) |

5. Click **Deploy** — Vercel builds and deploys automatically (~2 min)

---

## STEP 6 — Set up custom subdomain (10 min)

1. In Vercel → your project → **Settings → Domains**
2. Add `cotizar.vkoolsv.com`
3. Vercel will show you a CNAME record to add
4. Go to wherever your domain DNS is managed (GoDaddy, Namecheap, etc.)
5. Add the CNAME record: `cotizar` → `cname.vercel-dns.com`
6. Wait 5-15 minutes for DNS to propagate
7. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars to `https://cotizar.vkoolsv.com`

---

## STEP 7 — Set up Resend email domain (10 min)

1. Go to **resend.com → Domains → Add Domain**
2. Add `vkoolsv.com`
3. Resend gives you DNS records to add — add them to your domain DNS
4. Wait for verification (usually 5-30 min)
5. Now emails from `reservas@vkoolsv.com` will work

---

## STEP 8 — Test end-to-end (20 min)

1. Go to `https://cotizar.vkoolsv.com`
2. Fill out the form with test data
3. Select a date and time
4. On payment step, you'll be redirected to Wompi sandbox
5. Use Wompi test card: `4242 4242 4242 4242` / Any future date / Any CVV
6. After payment, you should be redirected to the confirmation page
7. Check that:
   - ✅ Booking appears in Supabase (`bookings` table, status = `paid`)
   - ✅ Event appears in Google Calendar
   - ✅ Customer confirmation email received
   - ✅ Company notification email received at `v-koolsansalvador@pacifictrading.net`

---

## STEP 9 — Update Wix website (5 min)

1. Log into Wix → open your V-KOOL site
2. Find the **"Cotizar"** button(s)
3. Change the link from the current contact page to:
   ```
   https://cotizar.vkoolsv.com
   ```
4. Publish the Wix site

---

## STEP 10 — Go live with real Wompi keys

When testing is complete and you're ready to take real payments:

1. In Vercel → Environment Variables, change:
   - `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` → your **production** public key
   - `WOMPI_PRIVATE_KEY` → your **production** private key
   - `WOMPI_API_URL` → `https://production.wompi.co/v1`
2. Update your Wompi webhook URL to your production URL
3. Redeploy (Vercel → Deployments → Redeploy)

---

## Managing discount codes

To activate a seasonal coupon (e.g. for Easter):

1. Go to **Supabase → Table Editor → coupons**
2. Find the `PASCUA25` row
3. Set `active` to `true`
4. Set `expires_at` to the end date (e.g. `2025-04-25 23:59:59`)
5. Save — it's live immediately, no code deployment needed

To create a new code:
```sql
insert into coupons (code, type, value, active, usage_limit, expires_at)
values ('PROMO30', 'percentage', 30, true, 100, '2025-12-31 23:59:59');
```

---

## Adding future locations (Santa Ana, San Miguel, Usulután)

1. Create a new Google Calendar for that location
2. Share it with your service account (same as Step 3)
3. In `src/lib/types.ts`, find the location entry and set:
   - `active: true`
   - `calendarId: 'new-calendar-id@group.calendar.google.com'`
   - `email: 'actual-email@pacifictrading.net'`
4. Push to GitHub — Vercel auto-deploys
5. That's it. The booking tool now shows a location selector.

---

## Support

If anything breaks, check:
- **Vercel logs**: Vercel dashboard → your project → Functions → View logs
- **Supabase logs**: Supabase → Logs → API logs
- **Wompi events**: Wompi dashboard → Events log
