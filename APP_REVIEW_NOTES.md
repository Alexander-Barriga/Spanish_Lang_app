# App Review Information — copy-paste template

This is the text to paste into App Store Connect → your app version → **App Review Information → Notes** during submission. It tells Apple's reviewer how to bypass the paywall and exercise premium features without paying.

---

## Demo account

| Field | Value |
| --- | --- |
| Sign-in email | alexanderbarriga03+appreview@gmail.com |
| Password | appreview03 |

> Create this account *after* the Render backend is redeployed. Sign up through the live app once and reuse those credentials.

---

## Notes for the reviewer (paste verbatim)

```
Spanish Lab is a freemium subjunctive-grammar learning app. Episode 1 and its
tasks are free. Episodes 2 through 8 are gated behind a "Spanish Lab Premium"
auto-renewable subscription (Monthly $14.99 / Annual $99.99).

To review premium features without making an in-app purchase, use the comp code
below. After signing in with the demo account above:

1. Walk through onboarding (or skip if already onboarded).
2. On the paywall screen, tap "Have a code?".
3. Paste the code below and tap Redeem.
4. Episodes 2-8 will unlock immediately.

Comp code: SPANLAB-4QNZ-5KTZ-ZY9R

If the code is consumed (single-use) and you need to re-test on a different
account, reach out at alexanderbarriga03@gmail.com and we will issue a new one
within 24 hours.

Test card / sandbox tester:
We have configured an Apple Sandbox tester for verifying live purchase flows:
  Email:    alexanderbarriga03+sandbox@gmail.com
  Password: Glendale03@!
Sign out of the App Store on the test device, install the app, attempt a
purchase, and sign in with the sandbox tester when prompted.

Subscription products under review with this build:
  - spanishlab_monthly_1499  ($14.99 / month, auto-renewable)
  - spanishlab_annual_9999   ($99.99 / year,  auto-renewable)

Both products belong to the "Spanish Lab Premium" subscription group. Both grant
the "premium" entitlement managed by RevenueCat.

Privacy / Terms (also linked from the paywall screen):
  https://spanish-lang-app.onrender.com/privacy
  https://spanish-lang-app.onrender.com/terms

Microphone permission is required for the AI conversation feature in Episode 1
(free) and in Episodes 2-8 (premium). The app declines gracefully if denied.

Support contact: alexanderbarriga03@gmail.com
```

---

## How to mint the comp code

From `backend/`, run:

```sh
npm run generate-codes -- 1 "apple-review-2026" 90
```

That generates **one** single-use code with a 90-day expiry, tagged with the note `apple-review-2026`. The plaintext is printed once at the bottom of the script's output (the database only stores `SHA-256(code)`). Paste the plaintext into the placeholder above before submitting.

If the code expires before review completes, mint a new one and update the App Review Notes via Resolution Center; you don't need to re-submit a binary just to swap the code.

---

## Pre-submission self-check

Before hitting **Submit for Review**, verify these from the reviewer's perspective:

- [ ] Demo account email + password actually log in on the live app.
- [ ] Comp code redeems successfully (test it yourself on a fresh test account first).
- [ ] `https://spanish-lang-app.onrender.com/privacy` returns a real HTML page (200 OK).
- [ ] `https://spanish-lang-app.onrender.com/terms` returns a real HTML page (200 OK).
- [ ] `/terms` lists **both** monthly and annual prices (already updated in `backend/src/routes/legal.ts`).
- [ ] First app launch from a cold state does not show a 30-60s loading screen (proxy for "Render Starter, not Free" — verified by `npm run probe-render`).
- [ ] Microphone permission prompt copy is clear and tied to a feature the reviewer can reach.
