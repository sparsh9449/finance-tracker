from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
import models
import decimal
from alerts import send_new_subscription, send_price_increase

PRICE_CHANGE_THRESHOLD = 0.50  # only alert if price changes by more than $0.50


def run_sync_and_detect():
    from routers.plaid import get_plaid_client, DEMO_USER_EMAIL
    from routers.transactions import sync_item
    from routers.subscriptions import detect_subscriptions, save_subscriptions

    print("[scheduler] running daily sync + detection")
    db = SessionLocal()
    try:
        user = db.query(models.User).filter_by(email=DEMO_USER_EMAIL).first()
        if not user:
            print("[scheduler] no user found, skipping")
            return

        # 1. sync transactions
        client = get_plaid_client()
        items = db.query(models.PlaidItem).filter_by(user_id=user.id).all()
        for item in items:
            sync_item(item, db, client)

        # 2. detect subscriptions
        account_ids = [
            a.id for a in
            db.query(models.Account)
            .join(models.PlaidItem, models.Account.plaid_item_id == models.PlaidItem.id)
            .filter(models.PlaidItem.user_id == user.id)
            .all()
        ]
        detected = detect_subscriptions(db, account_ids)

        # 3. diff against last alerted state and send emails
        for sub in detected:
            existing = (
                db.query(models.Subscription)
                .filter_by(account_id=sub["account_id"], merchant_name=sub["merchant_name"])
                .first()
            )
            if not existing:
                send_new_subscription(sub["merchant_name"], sub["amount"], sub["frequency"])
            elif existing.alerted_amount is not None:
                old = float(existing.alerted_amount)
                new = sub["amount"]
                if new - old > PRICE_CHANGE_THRESHOLD:
                    send_price_increase(sub["merchant_name"], old, new, sub["frequency"])
                    existing.alerted_amount = decimal.Decimal(str(new))
                    db.commit()

        # 4. upsert subscriptions table
        save_subscriptions(db, detected)
        print(f"[scheduler] done — {len(detected)} subscriptions found")

    except Exception as e:
        print(f"[scheduler] error: {e}")
    finally:
        db.close()


def make_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_sync_and_detect, "interval", hours=24, id="daily_sync")
    return scheduler
