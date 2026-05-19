import asyncio
import hashlib
import json
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api.schedule import router as schedule_router
from app.api.schedule import prewarm as _schedule_prewarm

FIXTURES_DIR = Path(__file__).parent / "fixtures"

app = FastAPI(title="BlueNorth WFM API")
app.include_router(schedule_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup_prewarm() -> None:
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _schedule_prewarm, "S-0001", "2026-W12")


_scenarios: list[dict[str, Any]] = []
_stores: list[dict[str, Any]] = []
_labor_standards: dict[str, Any] = {}
_employees_cache: list[dict[str, Any]] = []


def _load_scenarios() -> list[dict[str, Any]]:
    global _scenarios
    if not _scenarios:
        _scenarios = json.loads((FIXTURES_DIR / "scenarios.json").read_text())
    return _scenarios


def _load_stores() -> list[dict[str, Any]]:
    global _stores
    if not _stores:
        _stores = json.loads((FIXTURES_DIR / "stores.json").read_text())
    return _stores


def _load_labor_standards() -> dict[str, Any]:
    global _labor_standards
    if not _labor_standards:
        _labor_standards = json.loads((FIXTURES_DIR / "labor_standards.json").read_text())
    return _labor_standards


def _load_employees_all() -> list[dict[str, Any]]:
    global _employees_cache
    if not _employees_cache:
        _employees_cache = json.loads((FIXTURES_DIR / "employees.json").read_text())
    return _employees_cache


# ── Sacred demo constants ─────────────────────────────────────────────────────

_SEED_PERIOD_SALES = 16_400_000
_SEED_TOTAL_HOURS = 161_200
_SEED_TOTAL_WAGES = 2_460_000
_SEED_BASELINE_DELTA = 0.50
_SEED_BASELINE_AVG_WAGE = 14.76
_SEED_EFFECTIVE_SPLH = _SEED_PERIOD_SALES / _SEED_TOTAL_HOURS  # ≈ 101.74

_SEED_DIVISION: dict[str, dict] = {
    "West":    {"hours": 61_256, "stores": 38, "sales": 5_576_000, "wages_budget": 680_000, "wages_projected": 720_000, "labor_pct": 12.9},
    "Central": {"hours": 51_584, "stores": 32, "sales": 5_248_000, "wages_budget": 820_000, "wages_projected": 845_000, "labor_pct": 16.1},
    "East":    {"hours": 48_360, "stores": 30, "sales": 5_576_000, "wages_budget": 960_000, "wages_projected": 995_000, "labor_pct": 17.8},
}

# ── Forecast constants ────────────────────────────────────────────────────────

_DOW_SHAPE = [0.85, 0.80, 0.85, 0.90, 1.08, 1.30, 1.22]

_HOURLY_SHAPE_RAW = [
    0.30, 0.26, 0.25, 0.26, 0.35, 0.62,
    0.88, 1.25, 1.45, 1.28, 1.12, 1.18,
    1.25, 1.18, 1.08, 1.05, 1.22, 1.68,
    2.15, 2.82, 2.80, 2.28, 1.62, 1.10,
]
_HS_MEAN = sum(_HOURLY_SHAPE_RAW) / 24
_HOURLY_SHAPE = [v / _HS_MEAN for v in _HOURLY_SHAPE_RAW]

_BASE_DAILY_DEMAND = 164_000 / 365

# ── Compute engine ────────────────────────────────────────────────────────────

def _compute_wage_delta(wage_cfg: dict) -> float:
    mode = wage_cfg.get("mode", "uniform")
    if mode == "uniform":
        return float(wage_cfg.get("uniform_delta", _SEED_BASELINE_DELTA))
    if mode == "by_role":
        deltas = wage_cfg.get("role_deltas", {})
        return sum(deltas.values()) / len(deltas) if deltas else _SEED_BASELINE_DELTA
    if mode == "by_region":
        deltas = wage_cfg.get("region_deltas", {})
        return sum(deltas.values()) / len(deltas) if deltas else _SEED_BASELINE_DELTA
    return _SEED_BASELINE_DELTA


def _compute_scenario_run(scenario_inputs: dict, explain: bool = False) -> dict:
    wage_cfg = scenario_inputs.get("wage_rate", {})
    user_delta = _compute_wage_delta(wage_cfg)
    extra_delta = user_delta - _SEED_BASELINE_DELTA

    total_hours = _SEED_TOTAL_HOURS
    wage_adjustment = round(total_hours * extra_delta)
    total_wages = _SEED_TOTAL_WAGES + wage_adjustment
    period_sales = _SEED_PERIOD_SALES
    labor_pct = round(total_wages / period_sales * 100, 1)

    by_division: dict[str, dict] = {}
    for div, d in _SEED_DIVISION.items():
        div_extra = round(d["hours"] * extra_delta)
        div_wages_proj = d["wages_projected"] + div_extra
        div_labor_pct = round(div_wages_proj / d["sales"] * 100, 1)
        by_division[div] = {
            "hours": d["hours"],
            "wages_budget": d["wages_budget"],
            "wages_projected": div_wages_proj,
            "labor_pct": div_labor_pct,
        }

    result: dict[str, Any] = {
        "total_hours": total_hours,
        "total_wages": total_wages,
        "labor_pct": labor_pct,
        "by_division": by_division,
    }

    if explain:
        result["_explain"] = {
            "mode": wage_cfg.get("mode", "uniform"),
            "user_delta": user_delta,
            "seed_delta": _SEED_BASELINE_DELTA,
            "extra_delta": extra_delta,
            "wage_adjustment": wage_adjustment,
            "period_sales": period_sales,
            "effective_splh": round(_SEED_EFFECTIVE_SPLH, 2),
            "total_hours": total_hours,
        }

    return result


# ── Synthetic forecast ────────────────────────────────────────────────────────

def _store_seed(store_id: str) -> int:
    return int(hashlib.md5(store_id.encode()).hexdigest()[:8], 16)


def _division_for_store(store_id: str, stores: list[dict]) -> str:
    for s in stores:
        if s["id"] == store_id:
            return s.get("division", "West")
    return "West"


def _generate_period_forecast(
    store_ids: list[str],
    period_start: int,
    period_end: int,
    stores: list[dict],
) -> list[dict]:
    div_stores: dict[str, list[str]] = {"West": [], "Central": [], "East": []}
    for sid in store_ids:
        div = _division_for_store(sid, stores)
        div_stores.setdefault(div, []).append(sid)

    rows = []
    for period in range(period_start, period_end + 1):
        for div, sids in div_stores.items():
            period_dollars = 0.0
            period_units = 0
            for sid in sids:
                rng = random.Random(_store_seed(sid) ^ (period * 997))
                div_scale = {"West": 0.895, "Central": 1.0, "East": 1.134}.get(div, 1.0)
                for day in range(28):
                    dow = (day + (period - 1) * 28) % 7
                    noise = rng.gauss(1.0, 0.04)
                    daily = _BASE_DAILY_DEMAND * div_scale * _DOW_SHAPE[dow] * max(noise, 0.7)
                    period_dollars += daily
                    period_units += int(daily / 3.50)
            rows.append({
                "period": period,
                "division": div,
                "demand_dollars": round(period_dollars),
                "demand_units": period_units,
            })
    return rows


# ── Request/response models ───────────────────────────────────────────────────

class NewScenarioRequest(BaseModel):
    name: str
    period_start: int
    period_end: int
    seed_from_actuals: bool = False


class UpdateInputsRequest(BaseModel):
    inputs: dict[str, Any]


class DryRunRequest(BaseModel):
    wage_rate: dict[str, Any] | None = None


class ForecastRequest(BaseModel):
    store_ids: list[str]
    period_start: int
    period_end: int
    granularity: str = "period"


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Scenarios ─────────────────────────────────────────────────────────────────

@app.get("/api/scenarios")
async def list_scenarios():
    return _load_scenarios()


@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    scenarios = _load_scenarios()
    for s in scenarios:
        if s["id"] == scenario_id:
            return s
    raise HTTPException(status_code=404, detail="Scenario not found")


@app.post("/api/scenarios", status_code=201)
async def create_scenario(body: NewScenarioRequest):
    scenarios = _load_scenarios()
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    new_id = f"PLAN-NEW-{uuid.uuid4().hex[:8].upper()}"
    scenario = {
        "id": new_id,
        "name": body.name,
        "status": "Draft",
        "baseline_id": None,
        "period_start": body.period_start,
        "period_end": body.period_end,
        "locations": 100,
        "created_by": "carla",
        "created_at": now,
        "updated_at": now,
        "scenario_inputs": {
            "wage_rate": {
                "mode": "uniform",
                "uniform_delta": 0.50,
                "baseline_avg_wage": 14.76,
            },
            "demand_forecast": {
                "method": "synthetic",
                "base_annual_sales": 16_400_000,
                "by_division": {
                    "West": {"sales": 5_576_000, "stores": 38},
                    "Central": {"sales": 5_248_000, "stores": 32},
                    "East": {"sales": 5_576_000, "stores": 30},
                },
            },
        },
        "scenario_outputs": None,
    }
    scenarios.append(scenario)
    return scenario


@app.put("/api/scenarios/{scenario_id}/inputs")
async def update_scenario_inputs(scenario_id: str, body: UpdateInputsRequest):
    scenarios = _load_scenarios()
    for s in scenarios:
        if s["id"] == scenario_id:
            s["scenario_inputs"] = {**s.get("scenario_inputs", {}), **body.inputs}
            s["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            return s
    raise HTTPException(status_code=404, detail="Scenario not found")


@app.post("/api/scenarios/{scenario_id}/run")
async def run_scenario(
    scenario_id: str,
    dry_run: bool = Query(False, alias="dryRun"),
    explain: bool = Query(False),
    body: DryRunRequest | None = None,
):
    scenarios = _load_scenarios()
    scenario = next((s for s in scenarios if s["id"] == scenario_id), None)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    inputs = dict(scenario.get("scenario_inputs", {}))
    if body and body.wage_rate is not None:
        inputs = {**inputs, "wage_rate": body.wage_rate}

    result = _compute_scenario_run(inputs, explain=explain)

    if not dry_run:
        scenario["scenario_outputs"] = {
            "total_hours": result["total_hours"],
            "total_wages": result["total_wages"],
            "labor_pct": result["labor_pct"],
            "by_division": result["by_division"],
        }
        scenario["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return result


@app.post("/api/scenarios/{scenario_id}/submit")
async def submit_scenario(scenario_id: str):
    scenarios = _load_scenarios()
    for s in scenarios:
        if s["id"] == scenario_id:
            s["status"] = "In Review"
            s["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            return s
    raise HTTPException(status_code=404, detail="Scenario not found")


@app.post("/api/scenarios/{scenario_id}/approve")
async def approve_scenario(scenario_id: str):
    scenarios = _load_scenarios()
    for s in scenarios:
        if s["id"] == scenario_id:
            s["status"] = "Approved"
            s["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            return s
    raise HTTPException(status_code=404, detail="Scenario not found")


# ── Stores ────────────────────────────────────────────────────────────────────

@app.get("/api/stores")
async def list_stores():
    return _load_stores()


# ── Forecast ─────────────────────────────────────────────────────────────────

@app.post("/api/forecast")
async def generate_forecast(body: ForecastRequest):
    stores = _load_stores()
    rows = _generate_period_forecast(
        body.store_ids, body.period_start, body.period_end, stores
    )
    return {"rows": rows, "granularity": body.granularity}


# ── Employees ─────────────────────────────────────────────────────────────────

@app.get("/api/employees")
async def list_employees(store_id: str = Query("S-0001")):
    return [e for e in _load_employees_all() if e["store_id"] == store_id]


# ── Admin / demo reset ────────────────────────────────────────────────────────

@app.post("/api/admin/reset")
async def admin_reset():
    """Wipe in-memory state and reload from fixture files. Demo-only."""
    global _scenarios, _stores, _labor_standards, _employees_cache
    _scenarios = []
    _stores = []
    _labor_standards = {}
    _employees_cache = []
    # Re-load immediately so next GET is instant
    _load_scenarios()
    _load_stores()
    _load_labor_standards()
    _load_employees_all()
    return {"status": "reset", "scenarios": len(_scenarios)}
