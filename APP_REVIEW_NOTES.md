# App Review Information — copy-paste template

This is the text to paste into App Store Connect → your app version → **App Review Information → Notes** during submission. It tells Apple's reviewer how the app works, how to test a purchase with a sandbox account, and where to find account deletion.

---

## Demo account (optional)

| Field | Value |
| --- | --- |
| Sign-in email | alexanderbarriga03+appreview@gmail.com |
| Password | appreview03 |

> Registration is optional. The reviewer can use the app fully as a guest. The demo account is only needed if they want to test the registered-account / sign-in flow.

---

## Notes for the reviewer (paste verbatim)

```
Spanish Lab is a freemium subjunctive-grammar learning app. Episode 1 and its
tasks are free. Episodes 2 through 8 are gated behind a "Spanish Lab Premium"
auto-renewable subscription (Monthly $14.99 / Annual $99.99).

NO REGISTRATION REQUIRED
On the welcome screen, tap "Get Started" to begin as a guest — no email or
personal information is required to use Episode 1 or to purchase a subscription.
Creating an account is optional (Profile tab → "Create Account") and only serves
to save progress across devices.

HOW TO TEST THE SUBSCRIPTION (sandbox)
We have configured an Apple Sandbox tester:
  Email:    alexanderbarriga03+sandbox@gmail.com
  Password: Glendale03@!
On the test device: Settings → App Store → sign out of the production Apple ID.
Install the app, tap "Get Started", open any locked episode (2-8) to reach the
paywall, choose Annual or Monthly, tap Subscribe, and sign in with the sandbox
tester when StoreKit prompts. The purchase unlocks Episodes 2-8 immediately.

Subscription products under review with this build:
  - spanishlab_monthly_1499  ($14.99 / month, auto-renewable)
  - spanishlab_annual_9999   ($99.99 / year,  auto-renewable)
Both products belong to the "Spanish Lab Premium" subscription group and grant
the "premium" entitlement managed by RevenueCat.

ACCOUNT DELETION
Available in-app: Profile tab → "Delete Account" → confirm. This permanently
deletes the account and all associated data. (A screen recording of this flow is
attached to this submission.)

MICROPHONE
Microphone access is used for the AI voice-conversation feature. If permission
is denied, voice features are simply unavailable — the app does not ask the user
to reconsider. A one-time notice with a link to Settings is shown only if access
was previously turned off.

Privacy / Terms (also linked from the paywall screen):
  https://spanish-lang-app.onrender.com/privacy
  https://spanish-lang-app.onrender.com/terms

Support contact: alexanderbarriga03@gmail.com
```

---

## Required: account-deletion screen recording

Apple requires a screen recording (captured on a physical device) demonstrating
the full account-deletion flow. Record and attach it to the App Review
Information Notes:

1. Launch the app and tap **Get Started** (or sign in with the demo account).
2. Go to the **Profile** tab.
3. Tap **Delete Account**.
4. Confirm in the dialog.
5. Show that the account is gone (you are returned to the welcome screen and the
   account can no longer be used to sign in).

---

## Pre-submission self-check

Before hitting **Submit for Review**, verify these from the reviewer's perspective:

- [ ] On a fresh install, "Get Started" reaches Episode 1 and the paywall with NO login required.
- [ ] On the paywall (iPad and iPhone), the Annual and Monthly cards are responsive and a sandbox purchase completes and unlocks Episodes 2-8.
- [ ] Denying the microphone shows no "please grant / reconsider" prompt.
- [ ] Profile → Delete Account fully deletes the account (verified on a test account).
- [ ] `https://spanish-lang-app.onrender.com/privacy` returns a real HTML page (200 OK).
- [ ] `https://spanish-lang-app.onrender.com/terms` returns a real HTML page (200 OK) listing both monthly and annual prices.
- [ ] First app launch from a cold state does not show a 30-60s loading screen (proxy for "Render Starter, not Free" — verified by `npm run probe-render`).
- [ ] Supabase anonymous sign-ins are enabled and `public.users.email` is nullable (see deployment steps).
