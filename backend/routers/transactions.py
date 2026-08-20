from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from database import get_db
import models
import decimal
from routers.plaid import get_plaid_client, DEMO_USER_EMAIL
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.transactions_refresh_request import TransactionsRefreshRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.exceptions import ApiException
from categorizer import categorize

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _get_category(txn) -> str | None:
    try:
        if txn.personal_finance_category:
            return txn.personal_finance_category.primary
    except Exception:
        pass
    if txn.category:
        return txn.category[0]
    return None


def _sync_accounts(item: models.PlaidItem, db: Session, client):
    try:
        resp = client.accounts_get(AccountsGetRequest(access_token=item.access_token))
    except ApiException as e:
        raise HTTPException(status_code=400, detail=str(e.body))
    for acct in resp.accounts:
        if not db.get(models.Account, acct.account_id):
            db.add(models.Account(
                id=acct.account_id,
                plaid_item_id=item.id,
                name=acct.name,
                official_name=acct.official_name,
                type=str(acct.type),
                subtype=str(acct.subtype),
            ))
    db.commit()


def sync_item(item: models.PlaidItem, db: Session, client) -> dict:
    _sync_accounts(item, db, client)

    cursor = item.cursor  # None on first run — do NOT send empty string to Plaid

    # Only refresh on first sync (no cursor yet) — Sandbox needs this to seed
    # transactions. Calling it on every sync hits Plaid's rate limit.
    if cursor is None:
        try:
            client.transactions_refresh(TransactionsRefreshRequest(access_token=item.access_token))
        except ApiException:
            pass
    counts = {"added": 0, "modified": 0, "removed": 0}

    while True:
        try:
            req = (
                TransactionsSyncRequest(access_token=item.access_token, cursor=cursor)
                if cursor
                else TransactionsSyncRequest(access_token=item.access_token)
            )
            resp = client.transactions_sync(req)
        except ApiException as e:
            raise HTTPException(status_code=400, detail=str(e.body))

        for txn in resp.added:
            if not db.get(models.Transaction, txn.transaction_id):
                plaid_cat = _get_category(txn)
                db.add(models.Transaction(
                    id=txn.transaction_id,
                    account_id=txn.account_id,
                    amount=decimal.Decimal(str(txn.amount)),
                    date=txn.date,
                    name=txn.name,
                    merchant_name=txn.merchant_name,
                    category=categorize(txn.name, txn.merchant_name, plaid_cat),
                    pending=txn.pending,
                ))
                counts["added"] += 1

        for txn in resp.modified:
            row = db.get(models.Transaction, txn.transaction_id)
            if row:
                row.amount = decimal.Decimal(str(txn.amount))
                row.pending = txn.pending
                row.name = txn.name
                counts["modified"] += 1

        for removed in resp.removed:
            row = db.get(models.Transaction, removed.transaction_id)
            if row:
                row.removed = True
                counts["removed"] += 1

        db.commit()
        cursor = resp.next_cursor or None
        if not resp.has_more:
            break

    item.cursor = cursor
    db.commit()
    return counts


@router.post("/sync")
def sync_transactions(db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=DEMO_USER_EMAIL).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found. Connect a bank first.")
    items = db.query(models.PlaidItem).filter_by(user_id=user.id).all()
    if not items:
        raise HTTPException(status_code=404, detail="No linked accounts. Connect a bank first.")

    client = get_plaid_client()
    total = {"added": 0, "modified": 0, "removed": 0}
    for item in items:
        result = sync_item(item, db, client)
        for k in total:
            total[k] += result[k]

    return {"status": "ok", **total}


@router.get("/summary")
def get_summary(
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    filters = [
        models.Transaction.removed == False,
        models.Transaction.pending == False,
        models.Transaction.amount > 0,
    ]
    if start_date:
        filters.append(models.Transaction.date >= date_type.fromisoformat(start_date))
    if end_date:
        filters.append(models.Transaction.date <= date_type.fromisoformat(end_date))
    base = db.query(models.Transaction).filter(*filters)
    by_category = (
        base.with_entities(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label("total"),
        )
        .group_by(models.Transaction.category)
        .all()
    )
    by_month = (
        base.with_entities(
            extract("year", models.Transaction.date).label("year"),
            extract("month", models.Transaction.date).label("month"),
            func.sum(models.Transaction.amount).label("total"),
        )
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )
    total = sum(float(r.total) for r in by_category)
    return {
        "total_spend": round(total, 2),
        "by_category": [
            {"category": r.category or "UNCATEGORIZED", "total": round(float(r.total), 2)}
            for r in sorted(by_category, key=lambda r: r.total, reverse=True)
        ],
        "by_month": [
            {"month": f"{int(r.year)}-{int(r.month):02d}", "total": round(float(r.total), 2)}
            for r in by_month
        ],
    }


@router.get("/")
def get_transactions(
    limit: int = 100,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    filters = [
        models.Transaction.removed == False,
        models.Transaction.pending == False,
    ]
    if start_date:
        filters.append(models.Transaction.date >= date_type.fromisoformat(start_date))
    if end_date:
        filters.append(models.Transaction.date <= date_type.fromisoformat(end_date))
    rows = (
        db.query(models.Transaction)
        .filter(*filters)
        .order_by(models.Transaction.date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "account_id": t.account_id,
            "amount": float(t.amount),
            "date": str(t.date),
            "name": t.name,
            "merchant_name": t.merchant_name,
            "category": t.category,
        }
        for t in rows
    ]
