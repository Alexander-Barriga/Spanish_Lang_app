import { Router, Request, Response } from 'express';

const router = Router();

router.get('/privacy', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Spanish Lab</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #333; }
    h1 { color: #1a1f36; }
    h2 { color: #444; margin-top: 2em; }
    p, li { font-size: 15px; }
    .updated { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: March 10, 2026</p>

  <p>Spanish Lab ("we", "our", or "us") operates the Spanish Lab mobile application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our app.</p>

  <h2>Information We Collect</h2>
  <ul>
    <li><strong>Account Information</strong>: Email address used for authentication.</li>
    <li><strong>Voice Recordings</strong>: Audio recorded during voice conversations is temporarily processed for speech-to-text transcription and is not stored permanently.</li>
    <li><strong>Writing Samples</strong>: Text you submit for writing exercises is stored to provide AI feedback and track your progress.</li>
    <li><strong>Usage Data</strong>: Episode progress, conversation history, and learning statistics.</li>
  </ul>

  <h2>How We Use Your Information</h2>
  <ul>
    <li>To provide and maintain the Spanish Lab learning experience.</li>
    <li>To generate personalized AI feedback on your writing and conversations.</li>
    <li>To track your learning progress across episodes.</li>
    <li>To process voice input for speech-to-text transcription.</li>
  </ul>

  <h2>Third-Party Services</h2>
  <p>We use the following third-party services to operate the app:</p>
  <ul>
    <li><strong>Supabase</strong>: Database and authentication services.</li>
    <li><strong>OpenAI</strong>: AI-powered conversation and writing feedback.</li>
    <li><strong>ElevenLabs</strong>: Text-to-speech audio generation.</li>
    <li><strong>Apple</strong>: In-App Purchase processing and payment.</li>
    <li><strong>RevenueCat</strong>: Subscription management.</li>
  </ul>
  <p>Each third-party service operates under its own privacy policy.</p>

  <h2>Data Retention</h2>
  <p>Your account data and learning progress are retained as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>

  <h2>Data Security</h2>
  <p>We use industry-standard security measures including encrypted connections (HTTPS), secure authentication tokens, and access controls to protect your data.</p>

  <h2>Children's Privacy</h2>
  <p>Spanish Lab is intended for users aged 4 and above. We do not knowingly collect personal information from children under 13 without parental consent.</p>

  <h2>Your Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Access your personal data.</li>
    <li>Request correction of inaccurate data.</li>
    <li>Request deletion of your data.</li>
    <li>Withdraw consent at any time.</li>
  </ul>

  <h2>Contact Us</h2>
  <p>If you have questions about this Privacy Policy, please contact us at: <strong>spanishlab.app@gmail.com</strong></p>
</body>
</html>`);
});

router.get('/terms', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Spanish Lab</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #333; }
    h1 { color: #1a1f36; }
    h2 { color: #444; margin-top: 2em; }
    p, li { font-size: 15px; }
    .updated { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Terms of Service</h1>
  <p class="updated">Last updated: March 10, 2026</p>

  <p>Welcome to Spanish Lab. By using our app, you agree to these Terms of Service.</p>

  <h2>Description of Service</h2>
  <p>Spanish Lab is a mobile application for learning Spanish subjunctive grammar through story-based episodes, AI-powered conversations, writing exercises, and articles.</p>

  <h2>Subscription Terms</h2>
  <ul>
    <li>Spanish Lab offers a freemium model: Episode 1 and its associated tasks are available for free. Episodes 2 through 8 require an active <strong>Spanish Lab Premium</strong> subscription.</li>
    <li>Spanish Lab Premium is offered in two tiers:
      <ul>
        <li><strong>Monthly:</strong> $14.99 per month, auto-renewing every month.</li>
        <li><strong>Annual:</strong> $99.99 per year, auto-renewing every year.</li>
      </ul>
    </li>
    <li>Payment is charged to your Apple ID account at confirmation of purchase.</li>
    <li>Subscriptions <strong>automatically renew</strong> at the same price unless auto-renewal is turned off at least 24 hours before the end of the current billing period.</li>
    <li>Your Apple ID account will be charged for renewal within 24 hours prior to the end of the current period at the price listed above for the plan you selected.</li>
    <li>You can manage your subscriptions and turn off auto-renewal at any time by going to your device's <em>Settings &gt; Apple ID &gt; Subscriptions</em>, or via <em>App Store &gt; Account &gt; Subscriptions</em>.</li>
    <li>No cancellation of the current subscription period is allowed during an active subscription period.</li>
    <li>Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.</li>
    <li>Promotional or comp codes redeemed inside the app grant access according to their stated duration and do not auto-renew.</li>
  </ul>

  <h2>User Conduct</h2>
  <p>You agree not to:</p>
  <ul>
    <li>Use the app for any unlawful purpose.</li>
    <li>Attempt to reverse-engineer, decompile, or disassemble the app.</li>
    <li>Share your account credentials with others.</li>
    <li>Submit abusive, harmful, or inappropriate content through writing exercises or conversations.</li>
  </ul>

  <h2>Intellectual Property</h2>
  <p>All content in Spanish Lab, including episode scripts, character dialogue, articles, and AI-generated feedback, is the property of Spanish Lab or its licensors and is protected by copyright law.</p>

  <h2>Disclaimer</h2>
  <p>Spanish Lab is provided "as is" without warranties of any kind. We do not guarantee specific learning outcomes. AI-generated content may occasionally contain errors.</p>

  <h2>Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, Spanish Lab shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app.</p>

  <h2>Changes to Terms</h2>
  <p>We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance of the new Terms.</p>

  <h2>Contact Us</h2>
  <p>If you have questions about these Terms, please contact us at: <strong>spanishlab.app@gmail.com</strong></p>
</body>
</html>`);
});

router.get('/support', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support - Spanish Lab</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #333; }
    h1 { color: #1a1f36; }
    h2 { color: #444; margin-top: 2em; }
    p, li { font-size: 15px; }
    a { color: #007aff; }
  </style>
</head>
<body>
  <h1>Spanish Lab Support</h1>

  <p>We're here to help. If you have a question, issue, or feedback about Spanish Lab, please reach out.</p>

  <h2>Contact Us</h2>
  <p>Email: <a href="mailto:spanishlab.app@gmail.com">spanishlab.app@gmail.com</a></p>
  <p>We typically respond within 24 hours.</p>

  <h2>Common Topics</h2>
  <ul>
    <li><strong>Subscription / billing issues</strong> — contact us at the email above or manage your subscription via <em>Settings &gt; Apple ID &gt; Subscriptions</em>.</li>
    <li><strong>Comp code redemption</strong> — tap "Have a code?" on the paywall screen and enter your code.</li>
    <li><strong>Account or login issues</strong> — use "Forgot password?" on the sign-in screen or email us.</li>
    <li><strong>Bug reports</strong> — describe what happened and your device/iOS version and we'll investigate.</li>
  </ul>

  <h2>Privacy &amp; Terms</h2>
  <p><a href="/privacy">Privacy Policy</a> &nbsp;|&nbsp; <a href="/terms">Terms of Service</a></p>
</body>
</html>`);
});

export default router;
