from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SupplierCreate(BaseModel):
    name: str
    description: str = ""
    base_urls: list[str] = []
    docs_url: str = ""
    workbench_url: str = ""
    codex_template: str = ""
    claude_template: str = ""
    available_models: list[str] = []
    default_model: str = ""


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_urls: Optional[list[str]] = None
    docs_url: Optional[str] = None
    workbench_url: Optional[str] = None
    codex_template: Optional[str] = None
    claude_template: Optional[str] = None
    available_models: Optional[list[str]] = None
    default_model: Optional[str] = None


class SupplierOut(BaseModel):
    id: int
    name: str
    description: str
    base_urls: list[str]
    docs_url: str
    workbench_url: str
    codex_template: str
    claude_template: str
    available_models: list[str]
    default_model: str
    created_at: datetime
    updated_at: datetime
    key_count: int = 0
    healthy_key_count: int = 0

    class Config:
        from_attributes = True


class ApiKeyCreate(BaseModel):
    supplier_id: int
    api_key: str
    base_url: str
    expire_at: Optional[datetime] = None
    remaining: float = 10.0
    notes: str = ""


class ApiKeyUpdate(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    expire_at: Optional[datetime] = None
    remaining: Optional[float] = None
    notes: Optional[str] = None


class ApiKeyOut(BaseModel):
    id: int
    supplier_id: int
    api_key: str
    base_url: str
    expire_at: Optional[datetime]
    remaining: float
    status: str
    last_tested_at: Optional[datetime]
    test_latency_ms: Optional[int]
    test_error: str = ""
    notes: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HealthTestRequest(BaseModel):
    supplier_id: int
    key_ids: list[int] = []
    models: list[str] = []


class HealthTestResult(BaseModel):
    key_id: int
    api_key_mask: str
    status: str
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    model_tested: str = ""


class HealthTestResponse(BaseModel):
    results: list[HealthTestResult]
    total: int
    healthy: int
    unhealthy: int
    frequent: int = 0
