from sqlalchemy import Column, String, Numeric, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PlaidItem(Base):
    __tablename__ = "plaid_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    access_token = Column(String, nullable=False)
    item_id = Column(String, unique=True, nullable=False)
    cursor = Column(String, nullable=True)  # for transactions/sync pagination
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True)  # Plaid account_id
    plaid_item_id = Column(UUID(as_uuid=True), ForeignKey("plaid_items.id"), nullable=False)
    name = Column(String)
    official_name = Column(String)
    type = Column(String)
    subtype = Column(String)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True)  # Plaid transaction_id
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(Date, nullable=False)
    name = Column(String)
    merchant_name = Column(String)
    category = Column(String)
    pending = Column(Boolean, default=False)
    removed = Column(Boolean, default=False)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    merchant_name = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    frequency = Column(String)  # monthly, weekly, annual
    last_charged = Column(Date)
    first_seen = Column(Date)
    active = Column(Boolean, default=True)
    alerted_amount = Column(Numeric(12, 2))  # last amount we sent an alert for
