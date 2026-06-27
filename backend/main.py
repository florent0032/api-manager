from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
import httpx
import time

from database import engine, get_db, Base
from models import Supplier, ApiKey
from schemas import (
    SupplierCreate, SupplierUpdate, SupplierOut,
    ApiKeyCreate, ApiKeyUpdate, ApiKeyOut,
    HealthTestRequest, HealthTestResult, HealthTestResponse,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Manager", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Suppliers ====================

@app.get("/api/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).order_by(Supplier.id).all()
    result = []
    for s in suppliers:
        key_count = len(s.keys)
        healthy_count = sum(1 for k in s.keys if k.status == "healthy")
        out = SupplierOut.model_validate(s)
        out.key_count = key_count
        out.healthy_key_count = healthy_count
        result.append(out)
    return result


@app.post("/api/suppliers", response_model=SupplierOut)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    existing = db.query(Supplier).filter(Supplier.name == data.name).first()
    if existing:
        raise HTTPException(400, "供应商名称已存在")
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    out = SupplierOut.model_validate(supplier)
    out.key_count = 0
    out.healthy_key_count = 0
    return out


@app.get("/api/suppliers/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "供应商不存在")
    out = SupplierOut.model_validate(supplier)
    out.key_count = len(supplier.keys)
    out.healthy_key_count = sum(1 for k in supplier.keys if k.status == "healthy")
    return out


@app.put("/api/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "供应商不存在")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    out = SupplierOut.model_validate(supplier)
    out.key_count = len(supplier.keys)
    out.healthy_key_count = sum(1 for k in supplier.keys if k.status == "healthy")
    return out


@app.delete("/api/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "供应商不存在")
    db.delete(supplier)
    db.commit()
    return {"ok": True}


# ==================== API Keys ====================

@app.get("/api/keys", response_model=list[ApiKeyOut])
def list_keys(supplier_id: int = None, status: str = None, db: Session = Depends(get_db)):
    q = db.query(ApiKey)
    if supplier_id is not None:
        q = q.filter(ApiKey.supplier_id == supplier_id)
    if status:
        q = q.filter(ApiKey.status == status)
    return q.order_by(ApiKey.id).all()


@app.post("/api/keys", response_model=ApiKeyOut)
def create_key(data: ApiKeyCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(404, "供应商不存在")
    if data.base_url not in supplier.base_urls:
        raise HTTPException(400, f"base_url 不在供应商的可用列表中: {supplier.base_urls}")
    # 重复性检查
    existing = db.query(ApiKey).filter(
        ApiKey.supplier_id == data.supplier_id,
        ApiKey.api_key == data.api_key,
    ).first()
    if existing:
        raise HTTPException(400, "该密钥已存在，请勿重复添加")
    expire = data.expire_at
    if expire is None:
        expire = datetime.now(timezone.utc) + timedelta(days=1)
    key = ApiKey(
        supplier_id=data.supplier_id,
        api_key=data.api_key,
        base_url=data.base_url,
        expire_at=expire,
        remaining=data.remaining,
        notes=data.notes,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key


@app.get("/api/keys/{key_id}", response_model=ApiKeyOut)
def get_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(404, "密钥不存在")
    return key


@app.put("/api/keys/{key_id}", response_model=ApiKeyOut)
def update_key(key_id: int, data: ApiKeyUpdate, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(404, "密钥不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(key, field, value)
    db.commit()
    db.refresh(key)
    return key


@app.post("/api/keys/batch-delete")
def batch_delete_keys(data: dict, db: Session = Depends(get_db)):
    """批量删除密钥"""
    key_ids = data.get("key_ids", [])
    if not key_ids:
        raise HTTPException(400, "请选择要删除的密钥")

    keys = db.query(ApiKey).filter(ApiKey.id.in_(key_ids)).all()
    if not keys:
        raise HTTPException(404, "未找到指定密钥")

    deleted_count = len(keys)
    for key in keys:
        db.delete(key)
    db.commit()

    return {"ok": True, "deleted_count": deleted_count}


@app.delete("/api/keys/{key_id}")
def delete_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(404, "密钥不存在")
    db.delete(key)
    db.commit()
    return {"ok": True}


# ==================== Health Test ====================

async def test_single_key(base_url: str, api_key: str, model: str) -> dict:
    """Test a single API key. Auto-detect Anthropic vs OpenAI format from URL."""
    base = base_url.rstrip("/")
    is_openai = "/v1" in base and "/anthropic" not in base

    if is_openai:
        # OpenAI-compatible: POST {base_url}/chat/completions
        url = f"{base}/chat/completions" if not base.endswith("/chat/completions") else base
        headers = {
            "Authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        }
        payload = {
            "model": model,
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "hi"}],
        }
    else:
        # Anthropic: POST {base_url}/v1/messages
        url = f"{base}/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": model,
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "hi"}],
        }

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            elapsed = int((time.time() - start) * 1000)

            if resp.status_code == 200:
                return {"status": "healthy", "latency_ms": elapsed, "error": None}

            # Parse error body
            try:
                err = resp.json().get("error", {})
                err_msg = err.get("message", "")
                err_type = err.get("type", "")
            except Exception:
                err_msg = resp.text[:200]
                err_type = ""

            if resp.status_code == 429:
                if "quota" in err_msg.lower() or "exhausted" in err_msg.lower():
                    return {"status": "unhealthy", "latency_ms": elapsed, "error": "配额耗尽 (quota exhausted)"}
                return {"status": "frequent", "latency_ms": elapsed, "error": "请求频繁，被限流 (429)"}

            if resp.status_code == 401:
                return {"status": "unhealthy", "latency_ms": elapsed, "error": f"非法 API Key (401): {err_msg}"}

            if resp.status_code == 403:
                return {"status": "unhealthy", "latency_ms": elapsed, "error": f"无权限访问 (403): {err_msg}"}

            return {"status": "unhealthy", "latency_ms": elapsed, "error": f"HTTP {resp.status_code}: {err_msg}"}

    except httpx.ConnectError:
        elapsed = int((time.time() - start) * 1000)
        return {"status": "unhealthy", "latency_ms": elapsed, "error": "连接失败，请求不可达"}
    except httpx.TimeoutException:
        elapsed = int((time.time() - start) * 1000)
        return {"status": "unhealthy", "latency_ms": elapsed, "error": "请求超时 (30s)"}
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return {"status": "unhealthy", "latency_ms": elapsed, "error": f"未知错误: {str(e)[:150]}"}


@app.post("/api/health-test", response_model=HealthTestResponse)
async def health_test(req: HealthTestRequest, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == req.supplier_id).first()
    if not supplier:
        raise HTTPException(404, "供应商不存在")

    keys_q = db.query(ApiKey).filter(ApiKey.supplier_id == req.supplier_id)
    if req.key_ids:
        keys_q = keys_q.filter(ApiKey.id.in_(req.key_ids))
    keys = keys_q.all()

    if not keys:
        return HealthTestResponse(results=[], total=0, healthy=0, unhealthy=0)

    models = req.models if req.models else [supplier.default_model] if supplier.default_model else []
    if not models:
        models = supplier.available_models[:1] if supplier.available_models else ["claude-sonnet-4-20250514"]

    results = []
    healthy_count = 0
    unhealthy_count = 0
    frequent_count = 0

    for i, key in enumerate(keys):
        model = models[0]  # test with first model
        mask = key.api_key[:8] + "..." + key.api_key[-6:]
        # Mark as testing
        key.status = "testing"
        db.commit()

        # Small delay between tests to avoid triggering rate limits
        if i > 0:
            import asyncio
            await asyncio.sleep(0.5)

        result = await test_single_key(key.base_url, key.api_key, model)
        key.status = result["status"]
        key.test_latency_ms = result["latency_ms"]
        key.test_error = result.get("error") or ""
        key.last_tested_at = datetime.now(timezone.utc)
        db.commit()

        if result["status"] == "healthy":
            healthy_count += 1
        elif result["status"] == "frequent":
            frequent_count += 1
        else:
            unhealthy_count += 1

        results.append(HealthTestResult(
            key_id=key.id,
            api_key_mask=mask,
            status=result["status"],
            latency_ms=result["latency_ms"],
            error=result.get("error"),
            model_tested=model,
        ))

    return HealthTestResponse(
        results=results,
        total=len(results),
        healthy=healthy_count,
        unhealthy=unhealthy_count,
        frequent=frequent_count,
    )


# ==================== Seed Data ====================

@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    """Seed the database with the Xiaomi supplier and all provided keys."""
    # Check if already seeded
    existing = db.query(Supplier).filter(Supplier.name == "Xiaomi TokenPlan").first()
    if existing:
        return {"message": "数据已存在", "supplier_id": existing.id}

    supplier = Supplier(
        name="Xiaomi TokenPlan",
        description="小米 TokenPlan API 代理服务，支持 CN 和 SGP 区域",
        base_urls=[
            "https://token-plan-cn.xiaomimimo.com/anthropic",
            "https://token-plan.xiaomimimo.com/anthropic",
        ],
        docs_url="https://platform.xiaomimimo.com/docs/zh-CN/integration/claudecode",
        workbench_url="https://platform.xiaomimimo.com/workbench",
        codex_template='{\n  "env": {\n    "ANTHROPIC_BASE_URL": "{base_url}",\n    "ANTHROPIC_AUTH_TOKEN": "{api_key}",\n    "ANTHROPIC_MODEL": "{model}"\n  }\n}',
        claude_template='{\n  "env": {\n    "ANTHROPIC_BASE_URL": "{base_url}",\n    "ANTHROPIC_AUTH_TOKEN": "{api_key}",\n    "ANTHROPIC_MODEL": "{model}",\n    "ANTHROPIC_DEFAULT_SONNET_MODEL": "{model}",\n    "ANTHROPIC_DEFAULT_OPUS_MODEL": "{model}",\n    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "{model}"\n  }\n}',
        available_models=[
            "mimo-v2.5-pro",
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
            "claude-haiku-4-5-20251001",
        ],
        default_model="mimo-v2.5-pro",
    )
    db.add(supplier)
    db.flush()

    cn_url = "https://token-plan-cn.xiaomimimo.com/anthropic"
    sgp_url = "https://token-plan.xiaomimimo.com/anthropic"

    keys_data = [
        # (api_key, region, expire_date, remaining_B, notes)
        ("tp-sbu5noqomc64nmgpcxzdvh73me6gj9fqpgmv20p2sahnmmgo", "sgp", "2026-06-10", 10, "还有几天，能用但6.10用不了"),
        ("tp-sl77801vpnzz087gov3napcbujv581yvu77niz7fu38v27ni", "sgp", "2026-06-22", 10, "22号到期，用不了"),
        ("tp-cbq9k0vv6inciytw2tikqp7j9wq3z53imvd5tchp615xvne0", "cn", "2026-06-12", 10, "12到期cn，卡死"),
        ("tp-cix2flapwvgwv5nwp4pb7lop1f077vpw1e9fokhxko82cg57", "cn", None, 10, "上周日的，还有10个亿"),
        ("tp-sdemznpcj38pkm2sv8wg14221t9ahbrneg26577495w03sq1", "sgp", None, 10, "未知，卡死"),
        ("tp-sz6oad3207o9y6s1d5t1k51srn3cmt02u4heuqvn9424xl8q", "sgp", None, 10, "sgp，卡死"),
        ("tp-c7zkdm1g6zpwp445v17o8v2d2wq7oifs9p2xjtxef9dekons", "cn", "2026-06-23", 10, "cn，6.8炸了，6.9无法使用"),
        ("tp-c9phcnwqi8muzg623qq5ayu9dvapjink0zvfpjkjc6m3tsch", "cn", None, 10, "cn，卡死了，几乎不能用"),
        ("tp-s3hvq4zllog26cjoylggh9jxxe13je7xdkfcd6fxyixpvkmh", "sgp", None, 10, "sgp，可能用不了"),
        ("tp-cyz93amh06r7c7cjlumyzundw70hha9ek8514brakcv2656p", "cn", None, 10, "cn，不行了，6.9刚用"),
        ("tp-cpjatp2ab0w36fibqwky7080sbie8ejvq49cmn00dwyi7sww", "cn", "2026-06-11", 8.2, "cn，有点卡⭐，82亿，11号到期"),
        ("tp-s83kknlnaiz5kn5wi0ih9q5oncsw993r0wn6io6udg5s06cr", "sgp", None, 10, "sgp，卡住了"),
        ("tp-s94zhtmxe9ljhh8rp03m23dlxate6h88ksnfjr14a3mk73iy", "sgp", None, 10, "sgp，卡死了"),
        ("tp-cci6ap4fzqentskt46180l3hgljdkekw2k3fl0qm1fena1fc", "cn", "2026-07-02", 10, "7.2过期，cn，又可以用了"),
        ("tp-c4fnn7hizgknz01epajdxsj6bhz20bsog7pdnoldrnifgkjs", "cn", "2026-06-26", 10, "cn，26到期"),
        ("tp-s477zzvxmjdto8hrjf2wlhmwvhw3b7cg86xhgafzlbmh6xrf", "sgp", "2026-06-13", 10, "sgp，13到期"),
        ("tp-s1lus9lb43vsk4t8oaj5unwgs3mbuplrzp6ynccq0f15s1ir", "sgp", None, 10, "卡死"),
        ("tp-svnqzaf1lyga15so1ve5d8js1e5v603qf0ga6rw8aq93ix61", "sgp", None, 10, "卡死"),
        ("tp-sp92qmar050o6ws6rxqvfurpwu6dop4pvb9cvxrgvsybodmk", "sgp", None, 10, "sgp，完全用不了"),
        ("tp-clvkjyx3xsvpqf55gdz5shh7pa5srzrf2bsq2zp4gi0kgskw", "sgp", None, 10, "sgp，卡死了，基本不可用"),
        ("tp-snhdypocp5ekxde5eu7pttajh1uqzs8hcbgpv79s5mf4vd9n", "sgp", None, 10, "sgp"),
        ("tp-ccu83edc4zpb3hq6zmypsuvgzo2a817agh1i6gd51tyz2762", "cn", None, 10, "cn，暂时用不了了"),
        ("tp-czgij5zh05poozki9rfhpota044cocgvjfo7fzmashfe4xhw", "cn", "2026-06-12", 10, "cn，12号到期，暂不可用"),
        ("tp-szke84h4djx87dqtxbrnbo508cgmx5ku6crz6heguh1vrfsh", "sgp", "2026-06-16", 10, "sgp，卡住了，16到期"),
        ("tp-cxrlnnhmhue5kum7efct11mgik7842agitub8e0hhwxk7cky", "cn", None, 34.29, "cn，国区token plan 剩余34.29B"),
        ("tp-swp87vlj7u5cimgyohcly1np2lup3xd0pr6ge4hxher03upy", "sgp", None, 10.83, "sgp，暂时能用，6.10用不了"),
        ("tp-cr3rhdwml7bk990z8a708804vna41xaz6rz4gsq38ppkzexk", "cn", "2026-06-10", 10, "10号过期，用不了"),
        ("tp-cbe22u57gjkd760x6u6msndint0q35nrz94mkflvzcqfz133", "cn", "2026-06-29", 10, "29号过期，cn，卡死偶尔回复"),
        ("tp-slo4j17964xsxkljlwfn3l3x3t6r85cx30i11znyyvec3mp5", "sgp", "2026-06-19", 10, "19号，sgp，有点卡"),
        ("tp-e9og8e3kpjl3hvl5c4d5t7tsl0vxpjze7s15nm5gj3d2o9ua", "cn", "2026-07-02", 10, "7.2过期，没法用"),
        ("tp-s0sm51u1zjewz8hn2n49bfcjsi3u7ys6c81732h1m5m34w1i", "sgp", None, 10, "没法用"),
        ("tp-c3laae2edi7w2elg5vaegg6ckgyielcchq6ov4dogwjl8ge8", "cn", "2026-06-29", 10, "cn，6.29过期，没法用"),
        ("tp-cultycqwkixdzpw0ynhoif8nanq3rre4iafjx5oqrsk4rj6k", "cn", "2026-06-12", 10, "cn，12到期，暂时可以用又卡了"),
        ("tp-c1dbh56yqlmw136yk8xrcj6ruulv6rw1i6bv1eu87imzx3wa", "cn", "2026-06-11", 10, "cn，11号到期"),
        ("tp-crqn6ptppraz28d1r4gx6kbjpqtjft0rpyn0unu71heq0syw", "cn", None, 10, "卡了，特别卡"),
        ("tp-cps77cbrg1ocpig6x3o4u0u1d5wrd863pmda2h4xbc2zsd0t", "cn", "2026-06-27", 10, "cn，特别卡，6.27过期"),
        ("tp-c7dft2fdxuh37gk6kimtdco4qty80s6mfo6pg8v13i601h6p", "cn", "2026-06-26", 10, "cn，26到期"),
        ("tp-ctqf9dawluj1hfhc04xv3snnq04eu088f0o3koxmt8folbt1", "cn", "2026-06-11", 11, "11亿token，11到期"),
        ("tp-czhbkxr4drtm35ejt6e2kzhntg3khx4t4p5onbzwflnpwmky", "cn", "2026-06-30", 10, "cn，六月底到期"),
        ("tp-c7wfmdnijk34a696efz4p6af0j4bpy5d0f3tcxtkhum5pi9p", "cn", "2026-07-03", 10, "cn，7.3到期"),
    ]

    for api_key, region, expire_str, remaining, notes in keys_data:
        base_url = cn_url if region == "cn" else sgp_url
        expire_at = None
        if expire_str:
            expire_at = datetime.strptime(expire_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        key = ApiKey(
            supplier_id=supplier.id,
            api_key=api_key,
            base_url=base_url,
            expire_at=expire_at,
            remaining=remaining,
            notes=notes,
        )
        db.add(key)

    db.commit()
    return {"message": f"成功创建供应商和 {len(keys_data)} 个密钥", "supplier_id": supplier.id}


if __name__ == "__main__":
    import uvicorn
    import os
    from dotenv import load_dotenv

    # 加载项目根目录的 .env 文件
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

    port = int(os.getenv("BACKEND_PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
