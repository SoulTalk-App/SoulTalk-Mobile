/**
 * Content data for SoulTalk app
 * Text content extracted from Figma designs
 */

export const privacyPolicy = {
  title: 'Privacy Policy',
  effectiveDate: 'April 15, 2026',
  content: `SoulTalk ("SoulTalk," "we," "our," or "us") respects your privacy and is committed to protecting personal data. This Privacy Policy describes how we collect, use, disclose, store, and protect information when you access or use the SoulTalk mobile application, website, and related services (collectively, the "Services").

By using the Services, you acknowledge that you have read and understood this Privacy Policy.

1. INFORMATION WE COLLECT

We collect only the information reasonably necessary to provide, maintain, and improve the Services.

a. Account Information
• Email address
• Account identifiers
• Preferences and settings
• Optional profile information voluntarily provided by the user

b. User Content and Journal Data
• Journal entries and reflective inputs submitted by users
• Raw journal text is processed transiently and is not retained in full
• After processing, data is summarized, tokenized, abstracted, or otherwise minimized
• Stored representations are intentionally limited and are not designed to reconstruct original text

c. Technical and Usage Information
• Device type, operating system, app version
• Interaction logs, timestamps, and error reports
• Used solely for security, stability, and performance improvement

2. HOW WE USE INFORMATION

We use information to:
• Provide and operate the Services
• Generate AI-assisted insights and summaries
• Authenticate users and secure accounts
• Monitor performance, prevent abuse, and improve reliability
• Comply with legal obligations

SoulTalk does not use personal data for advertising, profiling, or marketing.

3. ARTIFICIAL INTELLIGENCE AND AUTOMATED PROCESSING

SoulTalk uses artificial intelligence and automated systems to analyze user-submitted content and generate insights.
• AI outputs are probabilistic and interpretive
• Outputs do not constitute facts, diagnoses, or professional advice
• No automated processing produces legal, medical, or therapeutic decisions
• Human review of user content is extremely limited and restricted to security, compliance, or system integrity purposes

4. DATA MINIMIZATION AND RETENTION

SoulTalk applies data minimization principles by:
• Limiting retention of raw user inputs
• Storing summarized or tokenized representations instead of full text
• Retaining personal data only as long as necessary to provide the Services or meet legal requirements

Users may request deletion of their account and associated data at any time.

5. DATA SECURITY

We implement administrative, technical, and organizational safeguards designed to protect personal data, including:
• Encryption in transit and at rest
• Token-based access controls
• Segmented systems and least-privilege access
• Security practices aligned with HIPAA-aligned standards

No method of transmission or storage is completely secure. We cannot guarantee absolute security.

6. NO ADVERTISING, TRACKING, OR DATA BROKERAGE

SoulTalk does not:
• Engage in targeted advertising
• Sell or rent personal data
• Track users across apps or websites
• Share data with third parties for marketing purposes

7. THIRD-PARTY PROCESSORS

SoulTalk may use vetted service providers to support infrastructure, hosting, or analytics. These providers are contractually obligated to process data solely on our instructions and maintain confidentiality and security safeguards.

8. USER RIGHTS

Depending on your jurisdiction, you may have the right to:
• Access personal data
• Correct or update information
• Request deletion of data
• Obtain a copy of your data
• Object to or restrict certain processing

Users may delete their account directly within the app or by contacting: privacy@soultalkapp.com

9. INTERNATIONAL DATA TRANSFERS

Your information may be processed and stored in the United States or other jurisdictions where SoulTalk or its service providers operate. These jurisdictions may have different data protection laws than your country of residence.

10. CHILDREN'S PRIVACY

The Services are intended for users 18 years of age or older. We do not knowingly collect data from minors.

11. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. Changes will be posted with an updated effective date. Continued use of the Services constitutes acceptance of the revised policy.

12. CONTACT

Privacy questions or requests may be sent to: privacy@soultalkapp.com`,
};

export const termsOfService = {
  title: 'Terms of Service',
  effectiveDate: 'April 15, 2026',
  content: `These Terms of Service ("Terms") govern your use of the SoulTalk Services. By accessing or using the Services, you agree to be bound by these Terms.

1. ELIGIBILITY

You must be at least 18 years old to use the Services.

2. NATURE OF THE SERVICES

SoulTalk provides AI-powered tools for reflection, journaling, and self-development.

SoulTalk:
• Is not a medical device
• Is not a mental health provider
• Does not provide therapy, diagnosis, or treatment

The Services are informational and reflective only.

3. MENTAL HEALTH AND CRISIS DISCLAIMER

SoulTalk is not designed for crisis intervention or emergency support.

If you are experiencing suicidal thoughts, self-harm ideation, or emotional distress requiring immediate assistance, do not rely on the Services.

Please contact:
• United States: Call or text 988
• Emergency services: 911
• International users: findahelpline.com

You are encouraged to seek support from licensed professionals when needed.

4. USER ACCOUNTS

You are responsible for safeguarding your credentials and all activity under your account.

SoulTalk may suspend or terminate accounts for violations of these Terms or applicable laws.

5. USER CONTENT LICENSE

You retain ownership of content you submit.

By submitting content, you grant SoulTalk a limited, non-exclusive, revocable license to process, analyze, tokenize, summarize, and store content solely to provide the Services.

6. ACCEPTABLE USE

You agree not to:
• Use the Services unlawfully
• Attempt to reverse engineer systems or models
• Circumvent security or access controls
• Introduce malware or harmful code

7. INTELLECTUAL PROPERTY

All software, design, trademarks, and platform content (excluding user content) are owned by SoulTalk and protected by intellectual property laws.

8. DISCLAIMER OF WARRANTIES

The Services are provided "as is" and "as available."

SoulTalk disclaims all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, and accuracy of outputs.

9. LIMITATION OF LIABILITY

To the maximum extent permitted by law, SoulTalk shall not be liable for indirect, incidental, consequential, special, or punitive damages, even if advised of the possibility.

Total liability shall not exceed the amount paid by the user to SoulTalk in the twelve months preceding the claim, or one hundred dollars, whichever is greater.

10. INDEMNIFICATION

You agree to indemnify and hold harmless SoulTalk from claims, damages, liabilities, and expenses arising from:
• Your use of the Services
• Your violation of these Terms
• Your violation of applicable laws or rights of others

11. ARBITRATION AND WAIVER OF CLASS ACTIONS

Any dispute arising from these Terms shall be resolved through binding arbitration on an individual basis, unless prohibited by law.

You waive the right to participate in class actions or representative proceedings.

12. TERMINATION

You may terminate your account at any time.

Upon termination, data will be handled according to the Privacy Policy.

13. GOVERNING LAW AND VENUE

These Terms are governed by the laws of the State of Texas. Any permitted court proceedings shall take place in Travis County, Texas.

14. SEVERABILITY

If any provision of these Terms is found unenforceable, the remaining provisions shall remain in effect.

15. CONTACT

Questions regarding these Terms may be sent to: privacy@soultalkapp.com`,
};

export const termsAndConditions = {
  title: 'Terms and Privacy',
  lastUpdated: 'April 15, 2026',
  content: privacyPolicy.content + '\n\n---\n\n' + termsOfService.content,
};

// Onboarding slides - exact text from Figma
export const onboardingSlides = [
  {
    id: '1',
    title: 'Welcome to  SoulTalk',  // Note: double space matches Figma
    tagline: 'Your space to slow down, reflect, and reconnect with your inner world',
    image: 'welcome',
  },
  {
    id: '2',
    title: 'Meet your SoulPal',
    tagline: 'Your tiny companion for the journey inward',
    image: 'soulpal',
  },
  {
    id: '3',
    title: "What You'll Discover",
    tagline: 'A gentler way to understand yourself, one reflection at a time',
    image: 'discover',
  },
];

// Welcome screen content
export const welcomeContent = {
  tagline: 'Your space to slow down, reflect, and reconnect with your inner world',
  primaryButton: 'Get Started',
  secondaryButton: 'I Already Have An Account',
};

// Button labels
export const buttonLabels = {
  getStarted: 'Get Started',
  signIn: 'Sign In',
  signUp: 'Sign Up',
  continue: 'Continue',
  agree: 'I Agree',
  skip: 'Skip',
};

// SoulPal naming screen
export const soulPalContent = {
  question: 'What would you like to name your SoulPal?',
  placeholder: 'Enter a name',
  buttonText: 'Continue',
};

// Setup complete screen
export const setupCompleteContent = {
  title: "You're all set!",
  subtitle: "Your account is ready.\nLet's start your SoulTalk journey!",
  buttonText: 'Continue',
};
