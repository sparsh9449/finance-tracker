import os
import resend


def _client():
    resend.api_key = os.getenv("RESEND_API_KEY")
    return resend.Emails


def send_new_subscription(merchant: str, amount: float, frequency: str):
    to = os.getenv("ALERT_EMAIL_TO")
    from_ = os.getenv("ALERT_EMAIL_FROM", "onboarding@resend.dev")
    if not to or not resend.api_key:
        print(f"[alert] new subscription skipped (no config): {merchant} ${amount}")
        return
    _client().send({
        "from": from_,
        "to": [to],
        "subject": f"New subscription detected: {merchant}",
        "html": f"""
        <h2>New recurring charge detected</h2>
        <p><strong>{merchant}</strong> — ${amount:.2f} / {frequency}</p>
        <p>Log in to your Finance Tracker to review.</p>
        """,
    })
    print(f"[alert] sent new subscription email: {merchant}")


def send_price_increase(merchant: str, old_amount: float, new_amount: float, frequency: str):
    to = os.getenv("ALERT_EMAIL_TO")
    from_ = os.getenv("ALERT_EMAIL_FROM", "onboarding@resend.dev")
    if not to or not resend.api_key:
        print(f"[alert] price increase skipped (no config): {merchant} ${old_amount} -> ${new_amount}")
        return
    _client().send({
        "from": from_,
        "to": [to],
        "subject": f"Price increase: {merchant} went from ${old_amount:.2f} to ${new_amount:.2f}",
        "html": f"""
        <h2>Subscription price increase detected</h2>
        <p><strong>{merchant}</strong> increased from
           <strong>${old_amount:.2f}</strong> to <strong>${new_amount:.2f}</strong> / {frequency}</p>
        <p>Log in to your Finance Tracker to review.</p>
        """,
    })
    print(f"[alert] sent price increase email: {merchant} ${old_amount} -> ${new_amount}")
