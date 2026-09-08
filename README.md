# Email Footprint

A secure, privacy-first single-page web app that infers which sites may be linked to an email address using breach data and public sources.

**[GitHub Repository](https://github.com/kale70328/email-footprint)** | **[Live Demo (Vercel)](https://email-footprint-kale70328.vercel.app)** (Pending Setup)

## Features

- 🔍 **Instant lookup** — scan an email against breach data in seconds
- 🔒 **Privacy-first** — no persistent storage; all data cleared after 5 min
- ✉️ **Email verification** — 6-digit code flow to unlock full results
- 📋 **Detailed account cards** — site name, breach source, confidence, actions
- 📥 **JSON export** — one-click download of your full report
- ♿ **Accessible** — WCAG AA compliant, keyboard navigable
- 📱 **Mobile-first responsive** design

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/email-footprint.git
cd email-footprint

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Verification & Security

- ✉️ **Dynamic 6-Digit OTP**: Cryptographically generated per verification request with a 10-minute expiration.
- 🧪 **Local Development Fallback**: In non-production environments without `RESEND_API_KEY`, the OTP is logged to the server console and provided in the response payload for easy local testing.
- 🚀 **Production Mode**: In production, `dev_code` is strictly withheld. Delivery is handled via Resend when `RESEND_API_KEY` is configured.
- 🔒 **One-Time Use**: OTPs are invalidated immediately upon successful verification.

## Running Tests

```bash
npm test
```

Tests cover utility functions, component rendering, breach lookup route handling, and the end-to-end verification flow.

## Project Structure

```
email-footprint/
├── app/
│   ├── page.tsx              # Home — email input + hero
│   ├── results/page.tsx      # Masked summary + verify CTA
│   ├── verify/page.tsx       # 6-digit code entry
│   ├── details/page.tsx      # Full verified account list
│   ├── privacy/page.tsx      # Privacy policy
│   └── api/
│       ├── lookup/route.ts          # GET /api/lookup?email= (XposedOrNot lookup)
│       ├── send-verification/route.ts # POST /api/send-verification (generate & dispatch OTP)
│       ├── verify-code/route.ts     # POST /api/verify-code (validate OTP & return accounts)
│       └── mock-accounts/route.ts   # GET /api/mock-accounts?email=
├── components/
│   ├── SearchBar.tsx
│   ├── ResultCard.tsx
│   ├── LoadingSkeleton.tsx
│   ├── Modal.tsx
│   ├── VerificationInput.tsx
│   ├── ToastProvider.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── PrivacyBanner.tsx
├── lib/
│   ├── otpStore.ts           # Server-side in-memory OTP store & validator
│   ├── types.ts              # TypeScript interfaces
│   └── utils.ts              # Client session, masking, and formatting utilities
└── __tests__/
    ├── components.test.tsx
    ├── lookup.test.ts
    ├── utils.test.ts
    └── verification.test.ts
```

## Breach Data & APIs

### 1. Breach Lookup (`/api/lookup`)
Queries the public [XposedOrNot](https://xposedornot.com) API (`https://api.xposedornot.com/v1/check-email/`) with no API key or subscription needed. It groups breach results into categories (social, ecommerce, gaming, productivity, finance, etc.) and returns a masked count for unverified users.

### 2. Email Verification & Dispatch (`/api/send-verification`)
Generates a secure 6-digit OTP and stores it server-side for 10 minutes. If `RESEND_API_KEY` is set, it dispatches an email via Resend (`https://api.resend.com/emails`). If not set, it operates in developer fallback mode.

### 3. Account Unlock (`/api/verify-code`)
Verifies the submitted 6-digit OTP. Once validated, it retrieves the email's complete breach record from XposedOrNot, formats each breach into a structured account card with mitigation recommendations, and returns the unlocked account list.

### Environment Variables

Create a `.env.local` file based on `.env.local.example`:

```env
# Optional: Resend email API for delivering verification emails in production
RESEND_API_KEY=

# Optional: Redis URL for distributed OTP store (defaults to in-memory store)
REDIS_URL=redis://localhost:6379

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Exporting Results

Click the **Export JSON** button on the Details page to download a timestamped JSON report:

```json
{
  "email": "j***n@example.com",
  "generatedAt": "2024-01-15T12:00:00.000Z",
  "note": "Results are inferences from public breach data — not confirmations.",
  "accounts": [...]
}
```

## Privacy

- No user accounts or sign-up required
- All session data stored in `sessionStorage` only (browser-local)
- Auto-cleared after 5 minutes of inactivity
- "Clear session" button available in the nav at all times
- This app never requests or stores passwords
- See [`privacy-snippet.md`](./privacy-snippet.md) for exact UI copy

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Fonts:** Bricolage Grotesque, DM Sans, DM Mono (Google Fonts)
- **Testing:** Jest + React Testing Library

## License

MIT
