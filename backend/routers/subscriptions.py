from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict
from database import get_db
from routers.plaid import DEMO_USER_EMAIL
import models
import decimal
import datetime

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

# (name, expected_gap_days, tolerance_days)
FREQUENCY_WINDOWS = [
    ("weekly",   7,   3),
    ("monthly",  30,  7),
    ("annual",   365, 30),
]


def _merchant_key(txn: models.Transaction) -> str:
    return (txn.merchant_name or txn.name or "").lower().strip()


def _infer_frequency(gaps: list[int]) -> str | None:
    if not gaps:
        return None
    avg = sum(gaps) / len(gaps)
    for name, expected, tol in FREQUENCY_WINDOWS:
        if abs(avg - expected) <= tol and all(abs(g - expected) <= tol * 2 for g in gaps):
            return name
    return None


def _amounts_consistent(amounts: list[float]) -> bool:
    avg = sum(amounts) / len(amounts)
    threshold = max(avg * 0.10, 1.0)  # 10% or $1, whichever is larger
    return all(abs(a - avg) <= threshold for a in amounts)


def detect_subscriptions(db: Session, account_ids: list[str]) -> list[dict]:
    txns = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.account_id.in_(account_ids),
            models.Transaction.removed == False,
            models.Transaction.pending == False,
            models.Transaction.amount > 0,  # positive = money out in Plaid
        )
        .order_by(models.Transaction.date)
        .all()
    )

    groups: dict[str, list[models.Transaction]] = defaultdict(list)
    for t in txns:
        key = _merchant_key(t)
        if key:
            groups[key].append(t)

    results = []
    for merchant, group in groups.items():
        if len(group) < 2:
            continue

        amounts = [float(t.amount) for t in group]
        if not _amounts_consistent(amounts):
            continue

        dates = [t.date for t in group]
        gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        frequency = _infer_frequency(gaps)
        if not frequency:
            continue

        results.append({
            "merchant_name": group[0].merchant_name or group[0].name,
            "amount": round(sum(amounts) / len(amounts), 2),
            "frequency": frequency,
            "first_seen": dates[0],
            "last_charged": dates[-1],
            "account_id": group[-1].account_id,
        })

    return results


def save_subscriptions(db: Session, detected: list[dict]):
    for sub in detected:
        existing = (
            db.query(models.Subscription)
            .filter_by(account_id=sub["account_id"], merchant_name=sub["merchant_name"])
            .first()
        )
        if existing:
            existing.amount = decimal.Decimal(str(sub["amount"]))
            existing.last_charged = sub["last_charged"]
            existing.frequency = sub["frequency"]
            existing.active = True
        else:
            db.add(models.Subscription(
                account_id=sub["account_id"],
                merchant_name=sub["merchant_name"],
                amount=decimal.Decimal(str(sub["amount"])),
                frequency=sub["frequency"],
                first_seen=sub["first_seen"],
                last_charged=sub["last_charged"],
                alerted_amount=decimal.Decimal(str(sub["amount"])),
            ))
    db.commit()


@router.post("/detect")
def detect(db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=DEMO_USER_EMAIL).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found.")

    account_ids = [
        a.id for a in
        db.query(models.Account)
        .join(models.PlaidItem, models.Account.plaid_item_id == models.PlaidItem.id)
        .filter(models.PlaidItem.user_id == user.id)
        .all()
    ]
    if not account_ids:
        raise HTTPException(status_code=404, detail="No accounts found.")

    detected = detect_subscriptions(db, account_ids)
    save_subscriptions(db, detected)
    return {"detected": len(detected), "subscriptions": detected}


@router.get("/")
def get_subscriptions(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Subscription)
        .filter_by(active=True)
        .order_by(models.Subscription.amount.desc())
        .all()
    )
    return [
        {
            "id": str(s.id),
            "merchant_name": s.merchant_name,
            "amount": float(s.amount),
            "frequency": s.frequency,
            "first_seen": str(s.first_seen),
            "last_charged": str(s.last_charged),
        }
        for s in rows
    ]
