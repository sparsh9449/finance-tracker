from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import models
import os
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.exceptions import ApiException

router = APIRouter(prefix="/plaid", tags=["plaid"])

_plaid_client = None

def get_plaid_client():
    global _plaid_client
    if _plaid_client is None:
        env_map = {
            "sandbox": plaid.Environment.Sandbox,
            "production": plaid.Environment.Production,
        }
        env = os.getenv("PLAID_ENV", "sandbox").lower()
        configuration = plaid.Configuration(
            host=env_map[env],
            api_key={
                "clientId": os.getenv("PLAID_CLIENT_ID"),
                "secret": os.getenv("PLAID_SECRET"),
            },
        )
        _plaid_client = plaid_api.PlaidApi(plaid.ApiClient(configuration))
    return _plaid_client


DEMO_USER_EMAIL = "demo@financetracker.local"

def get_or_create_demo_user(db: Session) -> models.User:
    user = db.query(models.User).filter_by(email=DEMO_USER_EMAIL).first()
    if not user:
        user = models.User(email=DEMO_USER_EMAIL)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/link-token")
def create_link_token(db: Session = Depends(get_db)):
    user = get_or_create_demo_user(db)
    try:
        req = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="Finance Tracker",
            country_codes=[CountryCode("US"), CountryCode("CA")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=str(user.id)),
        )
        response = get_plaid_client().link_token_create(req)
        return {"link_token": response["link_token"]}
    except ApiException as e:
        raise HTTPException(status_code=400, detail=str(e.body))


class ExchangeRequest(BaseModel):
    public_token: str


@router.post("/exchange-token")
def exchange_token(body: ExchangeRequest, db: Session = Depends(get_db)):
    user = get_or_create_demo_user(db)
    try:
        req = ItemPublicTokenExchangeRequest(public_token=body.public_token)
        response = get_plaid_client().item_public_token_exchange(req)
        access_token = response["access_token"]
        item_id = response["item_id"]
    except ApiException as e:
        raise HTTPException(status_code=400, detail=str(e.body))

    existing = db.query(models.PlaidItem).filter_by(item_id=item_id).first()
    if not existing:
        db.add(models.PlaidItem(user_id=user.id, access_token=access_token, item_id=item_id))
        db.commit()

    return {"status": "connected", "item_id": item_id}
