# yoda shoe ecommerce

A mobile-first footwear store built with **Next.js 16 (App Router) + shadcn/ui (Base UI) + Tailwind v4 + Supabase**.

Runs immediately in **demo mode** (no credentials needed) and upgrades to full persistence the moment
you drop in your Supabase project keys.

---

## ✨ Features

**Storefront**
- Clean, light design — Nunito Sans typography throughout (bold), generous whitespace
- Fully responsive: mobile bottom tab bar, sheet menus, safe-area padding, desktop hover states
- ⌘K / Ctrl+K instant search dialog with live results, quick category links, and a thumb-friendly mobile layout
- Catalog with shareable filters (category, brand, size in-stock, colour swatches, price range slider, sale-only) + 5 sort modes — all state lives in the URL
- Product page: hover image zoom, size selector with per-size stock states, quantity, stock signals, share (Web Share API), spec accordions
- Reviews: distribution bars, verified badges, write-a-review dialog (saves to Supabase when connected)
- Wishlist (localStorage-persisted) with heart toggle everywhere
- Cart: hover quick-add sizes on cards, free-shipping progress drawer, full cart page
- 3-step checkout (contact → shipping → payment) with per-step validation, order summary, and success page
- Checkout requires sign-in when Supabase is connected, then returns the shopper to the saved bag; demo mode keeps guest checkout working
- Recently viewed rail, 404 page, toasts, reveal animations, admin-controlled announcement banner
- Admin-controlled welcome discount popup (shown once per browser) and holiday/vacation delivery warning on checkout

**Auth (Supabase)**
- Email/password sign-up + sign-in, password visibility toggle
- Continue with Google on both auth screens (Supabase OAuth)
- `/auth/callback` code exchange route
- Auth state in the header + account dropdown; sign out

**Account & Admin**
- `/account`: profile card, saved delivery details (name, phone, address) that prefill checkout, quick links, order history (merges Supabase orders + local demo orders)
- Checkout drafts and delivery caches are bound to the signed-in account; sign-out/account switching clears them so no previous name, phone or address is reused
- `/admin`: mobile-first workspace with card layouts on phones and full tables on desktop; deep-linkable tabs via `?tab=orders|inventory|customers|insights|storefront`
- Performance header with 7/30/90-day period selector, KPI cards with period-over-period deltas, and a responsive revenue trend chart
- Product create/edit/duplicate/delete with image previews, size-stock editing, searchable inventory, health filters, sort, CSV export and a low-stock restock queue
- Order search, status filter, sorting, detail dialog, clickable fulfilment pipeline, customer spend summary and CSV export
- Customer profiles at `/admin/customers/[key]` — lifetime KPIs, six-month spend trend, contact/shipping details, top products, category mix, and searchable order history with CSV export and inline status updates
- Insights tab with top products by revenue, category mix, repeat rate and period metrics
- Storefront tab: edit the company name, currency, free-shipping threshold, announcement banner (enabled, message, link, dismissible), welcome discount popup (enabled, headline, description, code, CTA, delay), holiday/vacation checkout warning and home-page hero (visibility, badge, headline, highlighted word, description, CTA labels/links, photo position/fit, trust badges, editor’s-pick card, image, featured product) with live previews
- Admin writes are gated by `profiles.is_admin`; demo-mode edits stay in the session, live mode persists through Supabase RLS

**Supabase**
- `supabase/schema.sql` — products, orders (JSONB items), reviews, wishlist, profiles + auto-profile trigger, site settings, admin helper, RLS policies, indexes
- `supabase/seed.sql` — demo catalogue with the exact product data used by the app
- `proxy.ts` — session refresh + route protection (`/account`, `/admin`, `/checkout` require sign-in when configured)

**Server safety**
- `POST /api/orders` re-validates every line server-side against the catalogue — client-tampered totals/quantities are ignored, unavailable size/stock is rejected, and live orders require an authenticated Supabase session.

---

## 🚀 Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything works out of the box in demo mode.

## 🔑 Connect Supabase (optional but recommended)

1. Create a project at [database.new](https://database.new).
2. Run `supabase/schema.sql`, then `supabase/seed.sql` in **SQL Editor** (copy → paste → Run).
3. Copy `.env.local.example` → `.env.local` (already present with placeholders) and paste:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```
4. Restart `npm run dev`.

> **Google sign-in:** enable **Authentication → Providers → Google** in Supabase and paste your
> Google OAuth client ID + secret. Add `https://<project-ref>.supabase.co/auth/v1/callback` as the
> authorized redirect URI in Google Cloud, then add your app URL (for example
> `http://localhost:3000/auth/callback`) to Supabase's redirect URLs.

> Updating an existing project? Re-run `supabase/schema.sql` — it is idempotent and adds the
> `phone`, `address`, `city`, `postal_code` and `country` columns used by saved delivery details,
> plus the `site_settings` table (including the `welcome_popup` and `vacation_mode` columns) used by the admin Storefront tab.

Auth, order persistence, admin product/order management, storefront settings and review saving go live automatically.
To make your account an admin: `update profiles set is_admin = true where email = 'you@example.com';`

> Client-side signups: if you want email confirmation disabled for quick testing, set it in
> **Authentication → Providers → Email → “Confirm email” = off**.

## 🗂 Structure

```
app/                    # App Router pages (+ /api/orders, /auth/…)
components/
  ui/                   # shadcn/ui (Base UI) primitives
  storefront/           # header, search, cart drawer, cards, filters, gallery…
  admin/  account/  auth/  providers/
lib/
  data/                 # demo catalogue, query engine, reviews
  supabase/             # config, browser & server clients (demo-aware)
  types.ts  format.ts
proxy.ts                # Next 16 middleware (Supabase session guard)
supabase/               # schema.sql + seed.sql
public/img/products/    # local product photography (Unsplash)
```

## 🎨 Notes

- Images are Unsplash photos added to `public/img/products` for demo purposes — swap in your own product shots for production.
- The colourways/description copy intentionally uses generic wording; adapt freely.
