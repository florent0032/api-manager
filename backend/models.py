from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, default="")
    base_urls = Column(JSON, default=list)
    docs_url = Column(String(500), default="")
    workbench_url = Column(String(500), default="")
    codex_template = Column(Text, default="")
    claude_template = Column(Text, default="")
    available_models = Column(JSON, default=list)
    default_model = Column(String(100), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    keys = relationship("ApiKey", back_populates="supplier", cascade="all, delete-orphan")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    api_key = Column(String(200), nullable=False)
    base_url = Column(String(500), nullable=False)
    expire_at = Column(DateTime, nullable=True)
    remaining = Column(Float, default=10.0)
    status = Column(String(20), default="unknown")
    last_tested_at = Column(DateTime, nullable=True)
    test_latency_ms = Column(Integer, nullable=True)
    test_error = Column(Text, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier", back_populates="keys")
