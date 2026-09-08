# Email Footprint

Email Footprint is a lightweight, privacy-focused web application that helps users discover where their email address has appeared across publicly disclosed data breaches. By querying breach records, it infers linked online services and provides actionable security advice to help users reclaim control over their digital footprint.

**Live Demo:** [https://email-footprint.vercel.app](https://email-footprint.vercel.app)  
Open the URL in any browser and enter an email address to immediately check its public breach footprint without signing up or creating an account.

---

## Features

- 🔍 **Email Breach Lookup**: Instant lookups against breach data powered by the free public **XposedOrNot API**.
- 📊 **Breach Count & Account Inferences**: Displays total exposed records and potential associated online accounts.
- 🏷️ **Category Detection & Security Hints**: Organizes breaches into categories (social, e-commerce, gaming, productivity, finance, forums, streaming) with actionable security recommendations.
- 🔒 **Privacy-Focused & Session-Only**: Zero persistent server tracking. Results live solely in browser `sessionStorage` and automatically clear after 5 minutes of inactivity.
- 📥 **JSON Export**: One-click download of a structured, timestamped audit report.
- ✉️ **Ownership Verification (Additional Feature)**: Optional 6-digit OTP challenge to verify email ownership and unlock deeper account details.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router) & React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide React icons
- **Data Source**: XposedOrNot Public API (no mandatory API keys required)
- **Testing**: Jest & React Testing Library (36 passing unit/integration tests)
- **Deployment**: Vercel

---

## Project Structure

```
email-footprint/
├── app/
│   ├── page.tsx                  # Home page with search input & hero
│   ├── results/page.tsx          # Masked summary, breach counts & category hints
│   ├── verify/page.tsx           # 6-digit OTP verification page
│   ├── details/page.tsx          # Full verified accounts view
│   ├── privacy/page.tsx          # Privacy policy & data handling details
│   └── api/
│       ├── lookup/route.ts       # GET /api/lookup (XposedOrNot lookup)
│       ├── send-verification/    # POST /api/send-verification (generates & sends OTP)
│       └── verify-code/route.ts  # POST /api/verify-code (validates OTP & returns details)
├── components/                   # Reusable UI components (SearchBar, ResultCard, Navbar, etc.)
├── lib/
│   ├── otpStore.ts               # In-memory OTP storage with expiration & one-time use
│   ├── types.ts                  # Core TypeScript domain models
│   └── utils.ts                  # Client session handling, masking, and helpers
└── __tests__/                    # Automated test suites
    ├── components.test.tsx
    ├── lookup.test.ts
    ├── utils.test.ts
    └── verification.test.ts
```

---

## Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build

To build and run the production application locally:

```bash
npm run build
npm start
```

---

## Testing

Run the automated test suite:

```bash
npm test
```

The test suite includes **36 tests across 4 test suites** covering utilities, UI components, breach lookup handling, and the complete verification workflow.

---

## Deployment

This project is deployed on **Vercel** with continuous deployment linked to the GitHub `main` branch. Any push or merged pull request to `main` automatically triggers an optimized production build.

---

## Privacy & Limitations

- **Inferences, Not Confirmations**: Results are gathered from public breach indexes. Appearance in a breach indicates that an email was part of an exposed database, but does not confirm that the associated account is currently compromised or still active.
- **Zero Credential Storage**: Email Footprint never requests, handles, or stores passwords.
- **Ephemeral Sessions**: Data stays strictly inside your browser session and is purged automatically.

---

## Future Improvements

- **Dedicated Email Delivery**: Add custom transactional email templates via Resend/AWS SES for high-volume production deployments.
- **Enhanced Frontend UX**: Add interactive domain filters, breach timeline charts, and direct shortcuts to password-reset pages.

