# Render redeploy runbook — Spanish Lab backend

The deployed backend at `https://spanish-lang-app.onrender.com` is currently dead (`x-render-routing: no-server`). Until it's back up, the mobile app's production builds, the RevenueCat webhook, and Apple's review of your privacy/terms URLs all 404. This runbook gets it back to a launch-ready state on the **Starter ($7/mo) compute tier** so there is no cold-start sleep.

## 0. Prerequisites

You'll need these handy. Most are already in `backend/.env`; the production webhook secret is the only one you need to mint fresh.

```
SUPABASE_URL                    (already set locally)
SUPABASE_ANON_KEY               (already set locally)
SUPABASE_SERVICE_ROLE_KEY       (already set locally)
OPENAI_API_KEY                  (already set locally)
ELEVENLABS_API_KEY              (already set locally)
ELEVENLABS_VOICE_ID_ARGENTINA   (already set locally)
ELEVENLABS_VOICE_ID_MEXICO      (already set locally)
ELEVENLABS_VOICE_ID_COLOMBIA    (already set locally)
REVENUECAT_SECRET_KEY           (mint in RevenueCat dashboard if not yet)
RC_WEBHOOK_SECRET               (mint a new strong secret — see step 2)
NODE_ENV=production             (literal value)
PORT=3001                       (literal value)
```

Mint a strong webhook secret locally:

```sh
openssl rand -hex 32
# copy the output for steps 2 and 4
```

## 1. Decide between resurrecting vs creating fresh

Log in at <https://dashboard.render.com>. If the service `spanish-lab-api` is listed as **Suspended**:

- Click into it → **Resume Service**. You'll keep the same hostname (`https://spanish-lang-app.onrender.com`), so all the URLs in `mobile/src/config/constants.ts`, `APP_STORE_METADATA.md`, and `REVENUECAT_SETUP.md` continue to work without code changes.

If the service does not exist, create a new one:

- **New +** → **Web Service** → connect your GitHub repo.
- **Root directory**: `backend`
- **Runtime**: Docker (uses `backend/Dockerfile`).
- **Region**: pick the one closest to your target users (Oregon for US west, Ohio for US central/east).
- **Branch**: `main` (or whichever you deploy from).
- **Service name**: name it `spanish-lab-api` so the resulting URL matches the existing references. If you name it something else, you'll need to update `mobile/src/config/constants.ts:8,12`, `REVENUECAT_SETUP.md:59`, and `APP_STORE_METADATA.md:72-78`.

Alternatively, this repo now ships `backend/render.yaml`. After committing it to your repo, you can use **New +** → **Blueprint** → point at the repo and Render reads `render.yaml` to provision everything declaratively.

## 2. Set the compute tier to Starter

This is the most important setting:

- Service → **Settings** → **Instance Type** → **Starter ($7/mo)**.
- Confirm RAM 512 MB, CPU 0.5, **does not sleep**.
- (Free tier is the default; if you forget this step, you ship a 30-60s cold-start UX and risk an Apple rejection.)

## 3. Set environment variables

Service → **Environment** → **Add Environment Variable** for each row in step 0. Critical ones:

- `RC_WEBHOOK_SECRET` — paste the `openssl rand -hex 32` output from step 0.
- `NODE_ENV=production`
- `PORT=3001` (matches the `EXPOSE 3001` in `backend/Dockerfile:37`).
- All Supabase keys (URL, anon, service-role) — copy from `backend/.env:6-8`.
- OpenAI + ElevenLabs keys — copy from `backend/.env:11-17`.
- `REVENUECAT_SECRET_KEY` — from RevenueCat dashboard → API Keys → secret key (NOT the public iOS key).

Click **Save Changes** at the bottom. Render will trigger a redeploy.

## 4. Update RevenueCat webhook header

In the RevenueCat dashboard:

- Project Settings → Integrations → Webhook
- URL: `https://spanish-lang-app.onrender.com/api/v1/webhooks/revenuecat`
- Authorization header: `Bearer <PASTE_THE_SAME_RC_WEBHOOK_SECRET_FROM_STEP_2>`
- Click **Send test event** at the bottom; verify it returns 200.

## 5. Smoke-test that the redeploy worked

From your laptop:

```sh
cd backend
npx ts-node scripts/probe-render.ts
```

Expected output:

- First hit `/health` returns **status=200** (not 404).
- Warm samples ~50-200ms.
- Verdict block: "✅ No cold-start signal observed in this run."

Also visit these URLs in a browser — both must return real HTML, not 404:

- <https://spanish-lang-app.onrender.com/privacy>
- <https://spanish-lang-app.onrender.com/terms>
- <https://spanish-lang-app.onrender.com/health>

If `/privacy` and `/terms` 404 but `/health` works, the legal route is mounted but the Render build skipped a file. Check Render's build logs.

## 6. Confirm cold-start is actually disabled

This is the only way to truly verify Starter tier:

```sh
# Right after the redeploy completes, time the first hit while the server is warm.
npx ts-node scripts/probe-render.ts

# Wait 25-30 minutes without sending any traffic (close all browser tabs to it).
# Then rerun the probe:
npx ts-node scripts/probe-render.ts
```

On Starter the second run's first hit should still be < 1s. On Free it would be 30-60s. If you see a 30-60s first hit you accidentally left it on Free compute — go back to step 2.

## 7. Run the paywall E2E suite against production

The E2E harness honors the `API_BASE` environment variable:

```sh
cd backend
API_BASE=https://spanish-lang-app.onrender.com npx ts-node scripts/run-paywall-e2e.ts
```

All Phase A-D tests should pass against production. If the webhook tests fail with 401, your `RC_WEBHOOK_SECRET` is mismatched between Render env and the test env — set it locally too:

```sh
RC_WEBHOOK_SECRET=<same value as on Render> \
API_BASE=https://spanish-lang-app.onrender.com \
npx ts-node scripts/run-paywall-e2e.ts
```

## 8. Mint the App Review comp code (last)

Now that the production DB is reachable from the deployed backend (Supabase was already cloud-hosted, but this confirms the path end-to-end):

```sh
cd backend
npm run generate-codes -- 1 "apple-review-2026" 90
```

Copy the plaintext code from the bottom of the output. Paste it into `APP_REVIEW_NOTES.md` (the placeholder marked `<REPLACE WITH PLAINTEXT FROM \`npm run generate-codes\` OUTPUT>`) before pasting that whole block into App Store Connect → App Review Information.

The code's plaintext is **only printed once**. The DB stores `SHA-256(code)` — no recovery path.

## Rollback plan

If anything in steps 1-3 goes wrong, click **Manual Deploy** → **Deploy a previous commit** in Render's UI. Render keeps the last 5 builds on the Hobby workspace tier (free) — see [Render's pricing](https://render.com/pricing) under "Instant rollbacks".

## After this runbook, what's left?

`SUBMISSION_CHECKLIST.md` (or scroll up in your chat for the regenerated list) shows the remaining items. The big ones outside this runbook are:

- App icon design (1024×1024, no transparency, no rounded corners)
- Apple Developer enrollment + App Store Connect app record
- IAP product creation in App Store Connect
- RevenueCat dashboard product/offering wiring
- EAS production build + first TestFlight upload
- App Store screenshots
