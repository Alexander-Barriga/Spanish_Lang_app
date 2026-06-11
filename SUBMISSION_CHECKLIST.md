# Spanish Lab — App Store submission checklist

Living checklist of everything between "code is written" and "Submit for Review" in App Store Connect. Items I (the agent) was able to complete are marked `[x]` with a short note. Items that require accounts/dashboards/credit cards/design assets I could not touch are marked `[ ]` and grouped by responsibility.

Cross-references:
- `APP_REVIEW_NOTES.md` — copy-paste template for App Review Information.
- `RENDER_REDEPLOY.md` — runbook to bring the production backend back up on Starter tier.
- `REVENUECAT_SETUP.md` — RevenueCat dashboard wiring (already in repo).
- `APP_STORE_METADATA.md` — descriptions, keywords, screenshot specs.

---

## Hard blockers

### B1. Render backend is currently dead
- [ ] **You: redeploy the Render service** following `RENDER_REDEPLOY.md`.
  - Reason it's a blocker: every URL in `mobile/src/config/constants.ts:8,12`, `APP_STORE_METADATA.md:72-78`, and `REVENUECAT_SETUP.md:59` 404s right now. Apple reviewers click the privacy/terms URLs.
- [x] `backend/render.yaml` written so the redeploy is declarative and reproducible.
- [x] `RENDER_REDEPLOY.md` written with step-by-step instructions including secret minting.
- [x] `npm run probe-render` ready to verify the redeploy worked.

### B2. App icon files don't exist
- [ ] **You: design or commission a 1024×1024 app icon**, then generate the variants.
  - Files needed (all referenced in `mobile/app.json:7,12,25,32`):
    - `mobile/assets/icon.png` (1024×1024, no transparency, no rounded corners)
    - `mobile/assets/splash-icon.png`
    - `mobile/assets/adaptive-icon.png` (Android foreground)
    - `mobile/assets/favicon.png`
  - Tools: [icon.kitchen](https://icon.kitchen), Figma + Apple's Production Templates, or commission on Fiverr ($30-100).
  - Why I didn't auto-generate one: Apple rejects low-effort/AI-generated icons, and you only get one first impression. Worth a real designer or a deliberate hour in Figma.

### B3. Three placeholders in build configs
These can only be filled after step B5 (Apple Developer enrollment) and after the RC dashboard is set up.
- [ ] `mobile/app.json:51` — `YOUR_EAS_PROJECT_ID` → set automatically by `npx eas init`.
- [ ] `mobile/app.json:54` — `YOUR_REVENUECAT_IOS_API_KEY` → from RevenueCat dashboard.
- [ ] `mobile/app.json:55` — `YOUR_REVENUECAT_ANDROID_API_KEY` → leave as-is if iOS-only launch.
- [ ] `mobile/eas.json:24` — `YOUR_APPLE_ID_EMAIL` → your Apple Developer account email.
- [ ] `mobile/eas.json:25` — `YOUR_APP_STORE_CONNECT_APP_ID` → from App Store Connect record (numeric).
- [ ] `mobile/eas.json:26` — `YOUR_APPLE_TEAM_ID` → 10-char ID from Apple Developer → Membership.

---

## Apple-side setup

### B4. Apple Developer Program enrollment ($99/yr)
- [ ] Enroll at <https://developer.apple.com/programs>. Individual approval typically takes 24-48h.

### B5. App Store Connect app record
- [ ] Create the app at <https://appstoreconnect.apple.com> with bundle id `com.spanishlab.app` (matches `mobile/app.json:18`).
- [ ] Capture the numeric "App ID" → fills `eas.json:25`.

### B6. In-App Purchase products
- [ ] Subscription Group: `Spanish Lab Premium`.
- [ ] Auto-renewable subscription: `spanishlab_monthly_1499` at $14.99/mo (matches `mobile/app.json:57`).
- [ ] Auto-renewable subscription: `spanishlab_annual_9999` at $99.99/yr (matches `mobile/app.json:58`).
- [ ] Localizations + 1024×1024 review screenshot per product.
- [ ] Tax + banking under Agreements, Tax, and Banking.
- [ ] Submit IAPs **with the binary** — they cannot be reviewed standalone.

### B7. App Privacy questionnaire
In App Store Connect → App Privacy. Declare what `backend/src/routes/legal.ts` already commits to in the privacy policy:
- [ ] Email + Name → Linked to user → App Functionality + Account Management.
- [ ] Audio recordings → Linked to user → App Functionality.
- [ ] User Content (writing submissions) → Linked to user → App Functionality.
- [ ] Diagnostics → none currently sent (true at present — no Sentry/analytics in the codebase).

### B8. Export compliance
- [x] `ITSAppUsesNonExemptEncryption: false` added to `mobile/app.json:21` `ios.infoPlist`.
  - This auto-clears the export compliance form on every submission — no per-build action needed.

### B9. App Review Information
- [ ] **You: create a real demo account** on the live app once Render is back up. Paste credentials into `APP_REVIEW_NOTES.md`.
- [ ] **You: mint a comp code** with `npm run generate-codes -- 1 "apple-review-2026" 90` (printed plaintext is one-time-only). Paste into `APP_REVIEW_NOTES.md`.
- [x] `APP_REVIEW_NOTES.md` written with reviewer-ready boilerplate.
- [x] `npm run generate-codes` script already exists (`backend/scripts/generate-redemption-codes.ts`).

### B10. Sandbox tester (for your own E2E test)
- [ ] App Store Connect → Users and Access → Sandbox Testers → create one.
- [ ] On test iPhone, sign out of App Store, install your TestFlight build, attempt purchase, sign in with sandbox tester when prompted.

---

## RevenueCat-side setup

### B11. RC dashboard configuration
- [ ] Create RevenueCat project + iOS app linked to bundle id `com.spanishlab.app`.
- [ ] Create entitlement `premium` (matches `mobile/app.json:56`).
- [ ] Import both App Store Connect products, attach to `premium` entitlement.
- [ ] Create offering `default` with packages `monthly` (`spanishlab_monthly_1499`) and `annual` (`spanishlab_annual_9999`).
- [ ] Mark `default` as the current offering.
- [ ] Webhook URL: `https://spanish-lang-app.onrender.com/api/v1/webhooks/revenuecat` with header `Authorization: Bearer ${RC_WEBHOOK_SECRET}`.
- [ ] Set the same `RC_WEBHOOK_SECRET` in Render's env (covered in `RENDER_REDEPLOY.md` step 2-3).
- [ ] Click "Send test event" in RC dashboard, watch Render logs for `bearer-validated 200`.

---

## Mobile build + submission

### B12. EAS setup and first production build
- [ ] `cd mobile && npx eas init` (fills `app.json:51`).
- [ ] `eas secret:create --scope project --name REVENUECAT_IOS_KEY --value appl_xxxx` (or inline it in `app.json:54` since the public iOS key is not actually a secret — only the master key on the backend is).
- [ ] `eas build --profile production --platform ios`.
- [ ] `eas submit --platform ios --profile production`.

### B13. End-to-end TestFlight smoke test
- [ ] Sign up → onboarding → paywall renders.
- [ ] Tap monthly → Apple sandbox sheet → purchase → app flips to premium → Episode 2 unlocks.
- [ ] Restore Purchases works.
- [ ] "Have a code?" → enter a *fresh* comp code → flips to premium.
- [ ] Force-quit + reopen → still premium (server-cached entitlement persists).
- [ ] Brand-new user → Episode 2 returns 403 PAYWALL → routes to `/paywall`.

### B14. App Store screenshots
- [ ] **Required**: 6.7" iPhone (1290×2796) — at least 3, recommend 5-8.
- [ ] **Recommended**: 6.5" iPhone (1242×2688) for older devices.
- [ ] **iPad** (12.9") if `mobile/app.json:17 supportsTablet: true` stays. Either capture iPad screenshots or set `supportsTablet: false`.
- [ ] Suggested scenes already drafted in `APP_STORE_METADATA.md:62-69`.

### B15. App preview video (optional, recommended)
- [ ] 15-30s portrait video showing the core gameplay loop. Can boost App Store conversion 10-25%.

---

## Code/data hygiene (most are agent-completable)

### B16. Sync App Store metadata to actual product set
- [x] `APP_STORE_METADATA.md` description now lists both monthly $14.99 and annual $99.99 plans.
- [x] IAP section now lists both products with their App Store Connect product IDs.
- [x] Render-outage warning added next to the privacy/terms URLs so this isn't forgotten before submission.

### B17. Apple-required subscription disclosures in Terms
- [x] `backend/src/routes/legal.ts` Terms updated to disclose both monthly and annual prices.
- [x] Standard Apple auto-renewable subscription language added: payment charged at confirmation, auto-renewal disclosure, 24-hour-before cancel rule, manage in Settings, free trial forfeit clause, comp code clarification.
- [x] HTML still served at `/terms` from the same Express route — no front-end changes required.

### B18. Production env hygiene
- [ ] **You: rotate `RC_WEBHOOK_SECRET`** out of `local_dev_secret_for_testing` (currently in `backend/.env:21`) into a fresh `openssl rand -hex 32` value on Render's env (covered in `RENDER_REDEPLOY.md` step 0+3).
- [x] `backend/.env` is and remains gitignored. Local dev value is fine for the local `nodemon` server.

### B19. Production smoke (after B1 Render redeploy)
- [x] `npm run probe-render` script exists (`backend/scripts/probe-render.ts`) — verifies `/health` returns 200 and there's no cold-start signal.
- [x] `npm run audit-supabase` script exists — re-confirms storage headroom (currently 9.5% of 1 GB free cap).
- [x] `npm run check-migration` script exists — verifies paywall schema. Just re-ran it: ✅ all 5 columns + 2 tables present.
- [x] `npm run paywall-e2e` script wired into `backend/package.json` so you can run `API_BASE=https://spanish-lang-app.onrender.com npm run paywall-e2e` after the redeploy.
- [ ] **You: run all four scripts against the live deployment** once Render is back up (`RENDER_REDEPLOY.md` steps 5-7).
- [ ] **You: visit `/privacy` and `/terms` in a real browser** — Apple reviewers click these.

### B20. Phase E (already on the original todo list)
- [ ] Rolled into B6, B11, B12, B13. Phase E is functionally done once those four blocks pass.

---

## Optional polish (pre-launch nice-to-haves)

- [ ] **Crash + analytics**: 30-min Sentry integration. Worth it the first time a TestFlight user reports a crash you can't reproduce.
- [ ] **Audio retention cron**: based on `npm run audit-supabase`, your `audio-recordings` bucket grows ~3-4 MB/day per active user. A 30-day deletion cron keeps you on Supabase free indefinitely. Code lives near `backend/src/services/storage.ts`.
- [ ] **Spending caps on OpenAI + ElevenLabs**: set them *before* TestFlight goes wide so a runaway test user can't drain your card.
- [ ] **`/support` route**: Apple requires a Support URL distinct from the privacy policy. Today `APP_STORE_METADATA.md:72` reuses the privacy URL, which most reviewers accept but some reject. A 5-line addition to `backend/src/routes/legal.ts` would resolve this preemptively.
- [ ] **App preview video** (B15) — high ROI, low effort if you already have screen-recordings.

---

## Suggested order

| Day | What | Who |
|---|---|---|
| 1 | Apple Developer enrollment (kicks off the wait) + start app icon design | You |
| 2 | Resurrect Render service on Starter tier (`RENDER_REDEPLOY.md`) | You |
| 2 | Run probe-render + audit-supabase + check-migration + paywall-e2e against prod | You (scripts ready) |
| 3 | Apple Developer + App Store Connect record + IAP products + privacy questionnaire | You |
| 4 | RevenueCat dashboard wiring + `eas init` + first production build | You |
| 5 | TestFlight smoke test on iPhone + capture screenshots + mint comp code | You |
| 6 | Fill `APP_REVIEW_NOTES.md` placeholders + final metadata sync + hit Submit | You |

About a week of evening-and-weekend work assuming Apple Developer enrollment doesn't snag.
