from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
import models  # noqa: F401 — registers all ORM models with Base
from routers import plaid as plaid_router
from routers import transactions as transactions_router
from routers import subscriptions as subscriptions_router
from scheduler import make_scheduler, run_sync_and_detect

_scheduler = make_scheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _scheduler.start()
    yield
    _scheduler.shutdown(wait=False)

app = FastAPI(title="Finance Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plaid_router.router)
app.include_router(transactions_router.router)
app.include_router(subscriptions_router.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/alerts/trigger")
def trigger_alerts():
    """Manually fire the daily job — useful for testing without waiting 24h."""
    run_sync_and_detect()
    return {"status": "done"}
