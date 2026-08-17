# Personal Finance & Subscription Tracker

A full-stack finance tracker that connects to real bank accounts via Plaid, auto-categorizes transactions, detects recurring subscriptions, and sends email alerts when a new subscription appears or a price increases.

**Live demo:** https://finance-tracker-two-bay-83.vercel.app

---

## What it does

- **Bank connection** — OAuth-style Plaid Link flow stores an access token server-side; no credentials ever touch the frontend
- **Transaction sync** — pulls transactions via Plaid's `transactions/sync` cursor API, deduplicates on re-sync
- **Auto-categorization** — rule-based merchant name matching layered on top of Plaid's own category field
- **Subscription detection** — groups transactions by merchant, checks amount consistency (±10%) and interval regularity (weekly / monthly / annual) to flag recurring charges
- **Email alerts** — daily APScheduler job diffs newly detected subscriptions against last-alerted state and sends email via Resend on new subscriptions or price increases
- **Dashboard** — spend by category chart, monthly trend chart, and subscription list

---

## Architecture

```
Browser (Vercel)
    │
    │  REST/JSON
    ▼
FastAPI backend (Railway)
    ├── /plaid/*        Plaid Link token + token exchange
    ├── /transactions/* Sync + summary + categorization
    ├── /subscriptions/* Detection + storage
    └── /alerts/trigger Manual job trigger
    │
    ├── APScheduler     Daily background job (sync → detect → email)
    ├── Plaid API       Bank data (Sandbox / Development)
    ├── Resend          Transactional email
    └── PostgreSQL (Neon)
            ├── users
            ├── plaid_items     (access tokens, sync cursor)
            ├── accounts
            ├── transactions
            └── subscriptions
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL (Neon free tier) |
| Bank data | Plaid API (Sandbox) |
| Background jobs | APScheduler |
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Email | Resend |
| Hosting | Railway (backend), Vercel (frontend) |

---

## Local setup

### Prerequisites
- Python 3.11+
- Node 18+
- A free [Neon](https://neon.tech) database
- A free [Plaid](https://plaid.com) Sandbox account
- A free [Resend](https://resend.com) account

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in .env with your keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Click **Connect Bank Account**, use Plaid Sandbox credentials (`user_good` / `pass_good`, select Plaid Checking), then click **Sync Now**.

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `PLAID_CLIENT_ID` | From Plaid dashboard → Team Settings → Keys |
| `PLAID_SECRET` | Sandbox secret from Plaid dashboard |
| `PLAID_ENV` | `sandbox` or `production` |
| `RESEND_API_KEY` | From Resend dashboard |
| `ALERT_EMAIL_TO` | Where to send alerts |
| `ALERT_EMAIL_FROM` | Verified sender (use `onboarding@resend.dev` for testing) |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |

---

## How subscription detection works

Transactions are grouped by merchant name. For each merchant with 2+ charges:

1. **Amount consistency** — all charges must be within 10% of the mean (or $1, whichever is larger). This handles minor price rounding without false-positives.
2. **Interval regularity** — the average gap between charges must fall within a known billing window (weekly ≈7d, monthly ≈30d, annual ≈365d), and no individual gap can deviate more than 2× the tolerance. This handles calendar drift (28-day February vs 31-day March) without matching one-off repeat purchases.

If both checks pass, the merchant is flagged as a subscription. On each daily run, the detected amount is compared against `alerted_amount` (stored at first detection). A difference of more than $0.50 triggers a price-increase email.

---

## Deployment

- **Backend** → Railway: connect GitHub repo, set root directory to `backend/`, add env vars
- **Frontend** → Vercel: connect GitHub repo, set root directory to `frontend/`, set `VITE_API_URL` to Railway URL
