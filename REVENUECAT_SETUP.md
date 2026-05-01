# RevenueCat Paywall Setup

Reference for getting the paywall live end-to-end. The code is wired; the manual steps below configure the dashboards / secrets that the code reads from.

---

## 1. Apply the database migration

The schema additions are inline in `backend/supabase-schema.sql`:

- New columns on `public.users`: `is_premium`, `subscription_tier`, `subscription_expires_at`, `entitlement_source`, `revenuecat_app_user_id`.
- New tables: `public.redemption_codes`, `public.redemption_code_uses`.

Run the file in the Supabase SQL editor (it is idempotent — `IF NOT EXISTS` / `DO $$` blocks).

---

## 2. App Store Connect

### 2a. Create the subscription products

Under `My Apps -> Spanish Lab -> In-App Purchases -> Subscriptions`:

1. Create a Subscription Group named `Spanish Lab Premium`.
2. Add two auto-renewable subscriptions inside it:

   | Product Reference Name | Product ID                      | Price (closest tier)        |
   | ---------------------- | ------------------------------- | --------------------------- |
   | Spanish Lab Monthly    | `spanishlab_monthly_1499`       | $14.99 / month              |
   | Spanish Lab Annual     | `spanishlab_annual_9999`        | $99.99 / year               |

   These IDs match the constants in `mobile/app.json -> extra.revenuecat`. If you change them, update `app.json` as well.

3. Fill in localizations, review screenshot, and tax/banking. Submit for review **with the binary** — they cannot be reviewed standalone.

### 2b. (Optional) Intro offer (free trial)

Apple's native free-trial mechanism is configured per subscription product (e.g., "1 week free, then $14.99/month"). If you want to offer a true Apple-recognized free trial in addition to the freemium "Episode 1 free" tier, add it to the monthly subscription as an Introductory Offer.

### 2c. (Optional) Offer Codes for public promos

Marketing / influencer codes should use Apple Offer Codes (Apps -> In-App Purchases -> Manage Offers -> Offer Codes). These are redeemed inside the app via Apple's native sheet (already wired — see "Have a code?" in the paywall).

---

## 3. RevenueCat dashboard

1. Create a Project. Add an iOS app linked to bundle id `com.spanishlab.app`.
2. **Entitlement**: create one named `premium`.
3. **Products**: import the two App Store Connect products. Attach both to the `premium` entitlement.
4. **Offering**: create one named `default`. Add two packages:
   - `monthly` -> `spanishlab_monthly_1499`
   - `annual`  -> `spanishlab_annual_9999`
   Mark `default` as the current offering.
5. **API Keys**:
   - Copy the iOS public SDK key (e.g. `appl_xxxxxxxx`). This goes into `mobile/app.json -> extra.revenuecat.iosApiKey` (or, preferably, an EAS secret — see "EAS secrets" below).
   - Copy the secret/master key (NOT the public key) into the backend env as `REVENUECAT_SECRET_KEY`. Used by `/subscription/verify` for defence-in-depth lookups.
6. **Webhook**:
   - URL: `https://spanish-lab-api.onrender.com/api/v1/webhooks/revenuecat`
   - Authorization header: `Bearer ${RC_WEBHOOK_SECRET}` — generate a random secret (e.g. `openssl rand -hex 32`) and put the same value in your backend env as `RC_WEBHOOK_SECRET` and in the RC dashboard's "Authorization header value" field.
   - Send all default events.

---

## 4. Backend env vars

Add to `backend/.env` (and Render's environment):

```
REVENUECAT_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RC_WEBHOOK_SECRET=<the same random hex you put into the RC dashboard>
```

The webhook receiver rejects all events when `RC_WEBHOOK_SECRET` is unset, so set this before flipping the dashboard webhook on.

---

## 5. Mobile config (EAS secrets recommended)

`mobile/app.json` defaults the RC keys to `YOUR_REVENUECAT_*_API_KEY` placeholders. The `SubscriptionContext` no-ops in Expo Go and when keys are placeholders — that is by design.

For dev / TestFlight / production builds:

1. Run `npx eas init` once to fill in the EAS `projectId` placeholder in `app.json` (`extra.eas.projectId`).
2. Set the RC keys via EAS secrets:

   ```sh
   eas secret:create --scope project --name REVENUECAT_IOS_KEY --value appl_xxxxxxxxxxxxxxxx
   ```

3. Reference them in `app.json` (or `app.config.ts` if you migrate) so they end up under `Constants.expoConfig.extra.revenuecat.iosApiKey`. The simplest path is to commit the two product IDs in `app.json` and load only the API key from the secret via `app.config.ts`.

---

## 6. Generate comp / reviewer codes

Server-side single-use codes that grant `is_premium=true`. Use them for:

- Apple App Review (include one in App Review Information when submitting).
- Internal QA / hand-picked partners.
- Promo-at-very-small-scale (otherwise prefer Apple Offer Codes).

```sh
cd backend
# 5 codes, no expiry, no note
npm run generate-codes -- 5

# 1 code for the App Review demo, expires in 90 days
npm run generate-codes -- 1 "apple-review-2026" 90
```

The plaintext is printed once at the bottom of the script's output. The DB only stores `SHA-256(code)` so you cannot recover them later.

Users redeem via the paywall's "Have a code?" button.

---

## 7. Verifying end-to-end

1. **DB migration applied** — confirm `is_premium`, `subscription_tier`, etc. exist on `public.users`.
2. **Backend up** with `REVENUECAT_SECRET_KEY` and `RC_WEBHOOK_SECRET` set.
3. **Webhook test** in the RC dashboard: trigger a test event, confirm the user row updates.
4. **Sandbox purchase** from a development build: confirm `is_premium` flips to `true` via the webhook within seconds, and the mobile UI flips immediately via the in-app `Purchases.purchasePackage` flow.
5. **Comp code redemption**: generate one, paste it into "Have a code?", confirm `is_premium=true` and `entitlement_source='comp_code'` on the row.
6. **Paywall enforcement**: as a free user, try to start an episode 2 conversation — server should respond `403 { code: 'PAYWALL' }` and the app should route to `/paywall`.

---

## 8. App Store submission checklist

- [ ] Subscription products approved in App Store Connect.
- [ ] App Review Information includes a valid comp code so the reviewer can bypass the paywall.
- [ ] Privacy policy + Terms of service URLs reachable (already linked from the paywall via `legalRoutes`).
- [ ] Paywall renders the legally-required disclosures (already in `mobile/app/paywall.tsx`).
- [ ] "Restore Purchases" button works (already wired).
- [ ] No hardcoded promo codes shipped in the binary.
