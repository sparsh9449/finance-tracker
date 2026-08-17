# Personal Finance & Subscription Tracker

A full-stack app that connects to your bank via Plaid, auto-categorizes transactions,
detects recurring subscriptions, and sends email alerts on price hikes.

## Stack
- **Backend**: Python + FastAPI + SQLAlchemy
- **Database**: PostgreSQL (Supabase or Neon free tier)
- **Bank data**: Plaid API (Sandbox → Development)
- **Jobs**: APScheduler
- **Frontend**: React + Tailwind (Vite)
- **Email**: Resend
- **Hosting**: Railway/Render (backend) + Vercel (frontend)

## Local Setup

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Architecture
See each step in the build spec for detailed explanations.
