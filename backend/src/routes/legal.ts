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
    <li>Spanish Lab offers a freemium model: Episode 1 is available for free. Episodes 2 through 8 require an active subscription.</li>
    <li>Subscriptions are billed at <strong>$14.99 per month</strong>.</li>
    <li>Payment is charged to your Apple ID account at confirmation of purchase.</li>
    <li>Subscriptions <strong>automatically renew</strong> unless canceled at least 24 hours before the end of the current billing period.</li>
    <li>Your account will be charged for renewal within 24 hours prior to the end of the current period at the same price.</li>
    <li>You can manage and cancel your subscription in your device's Settings &gt; Apple ID &gt; Subscriptions.</li>
    <li>Any unused portion of a free trial period will be forfeited when you purchase a subscription.</li>
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

export default router;
