"""
Schedule optimization endpoints — BNW-017 / BNW-018.

POST /api/schedule/optimize   → run CP-SAT, return shifts + KPIs
POST /api/schedule/{id}/explain → cost-impact analysis for a proposed manual edit
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.solver.milp import DAYS, SHIFTS, _avail_intervals, _shift_available, solve

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"

# ── In-memory stores ──────────────────────────────────────────────────────────
# schedule_id → full result dict
_schedules: dict[str, dict[str, Any]] = {}

# pre-warm cache keyed by (store_id, week_iso)
_prewarm_cache: dict[tuple[str, str], dict[str, Any]] = {}


def _load_employees(store_id: str) -> list[dict]:
    all_emps = json.loads((FIXTURES_DIR / "employees.json").read_text())
    return [e for e in all_emps if e.get("store_id") == store_id]


def _load_envelope(scenario_id: str | None) -> dict[str, Any]:
    """Return {max_hours, max_wages} from the approved scenario, or sensible defaults."""
    if scenario_id:
        try:
            scenarios = json.loads((FIXTURES_DIR / "scenarios.json").read_text())
            for s in scenarios:
                if s["id"] == scenario_id:
                    outputs = s.get("scenario_outputs") or {}
                    return {
                        "max_hours": outputs.get("total_hours", 200),
                        "max_wages": outputs.get("total_wages", 15_000),
                    }
        except Exception:
            pass
    # Default weekly single-store envelope
    return {"max_hours": 200, "max_wages": 15_000}


# ── Request models ────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    store_id: str
    week_iso: str
    scenario_id_for_envelope: str | None = None


class EditAction(BaseModel):
    action: str                      # 'assign' | 'unassign' | 'swap'
    shift_id: str | None = None
    employee_id: str | None = None
    target_employee_id: str | None = None   # for swap


class ExplainRequest(BaseModel):
    edit: EditAction


# ── Optimize endpoint ─────────────────────────────────────────────────────────

@router.post("/optimize")
async def optimize_schedule(body: OptimizeRequest) -> dict[str, Any]:
    cache_key = (body.store_id, body.week_iso)
    if cache_key in _prewarm_cache:
        cached = _prewarm_cache.pop(cache_key)
        # Re-register under the schedule id from cache
        _schedules[cached["schedule_id"]] = cached
        return cached

    employees = _load_employees(body.store_id)
    if not employees:
        raise HTTPException(status_code=404, detail=f"No employees found for store {body.store_id}")

    envelope = _load_envelope(body.scenario_id_for_envelope)
    result = solve(body.store_id, body.week_iso, employees, envelope)

    _schedules[result["schedule_id"]] = result
    return result


# ── Explain endpoint ──────────────────────────────────────────────────────────

@router.post("/{schedule_id}/explain")
async def explain_edit(schedule_id: str, body: ExplainRequest) -> dict[str, Any]:
    schedule = _schedules.get(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    edit = body.edit
    employees = _load_employees(schedule["store_id"])
    emp_map = {e["id"]: e for e in employees}

    violated: list[str] = []
    alternatives: list[dict] = []
    delta_wage = 0.0
    delta_match_pct = 0.0

    if edit.action == "assign":
        emp_id = edit.employee_id
        shift_id = edit.shift_id
        if not emp_id or not shift_id:
            raise HTTPException(status_code=400, detail="assign requires employee_id and shift_id")

        emp = emp_map.get(emp_id)
        if not emp:
            raise HTTPException(status_code=404, detail=f"Employee {emp_id} not found")

        # Parse shift_id: format is "{eid}_{day}_{label}" or "OPEN_{role}_{day}_{iv}"
        day = None
        shift_label = None
        slot_role = emp["role"]   # default — refined below for open shifts

        # Try to find day and label from existing shift records
        for sr in schedule.get("shifts", []):
            if sr.get("shift_id") == shift_id:
                day = sr.get("day")
                shift_label = sr.get("shift_label")
                slot_role = sr.get("role", slot_role)
                break

        if day is None:
            # Parse from open shift format: OPEN_{role}_{day}_{iv}
            for d in DAYS:
                if d in shift_id:
                    day = d
                    break
            # Extract role from "OPEN_{role}_{day}_{iv}"
            if shift_id.startswith("OPEN_"):
                for d in DAYS:
                    if d in shift_id:
                        role_part = shift_id[5:shift_id.index(d) - 1]  # between "OPEN_" and "_{day}"
                        slot_role = role_part.replace("_", " ")
                        # Normalize to fixture role names
                        _ROLE_NORM = {
                            "7NOW Driver": "7NOW Driver",
                            "Coffee Bar": "Coffee Bar",
                            "Food Service": "Food Service",
                            "Sales Associate": "Sales Associate",
                            "Cashier": "Cashier",
                            "Shift Lead": "Shift Lead",
                            "Store Manager": "Store Manager",
                        }
                        slot_role = _ROLE_NORM.get(slot_role, slot_role)
                        break
            # For open shifts, use morning as default shift label for alternatives
            shift_label = shift_label or "morning"

        if day is None:
            violated.append("Cannot parse shift day from shift_id")
            return _explain_response(violated, alternatives, delta_wage, delta_match_pct)

        # Check availability
        avail_day = emp.get("availability", {}).get(day)
        avail_ivs = _avail_intervals(avail_day)
        target_shift = None
        if shift_label:
            target_shift = next((s for s in SHIFTS if s.label == shift_label), None)

        if not avail_ivs:
            violated.append(
                f"{emp['name']} is not available on {day} — "
                f"availability window is null for this day."
            )
        else:
            if target_shift and not _shift_available(target_shift, avail_ivs):
                violated.append(
                    f"{emp['name']} is available on {day} but not for the "
                    f"{target_shift.label} shift ({target_shift.start_hour:02d}:00–"
                    f"{(target_shift.start_hour + target_shift.duration) % 24:02d}:00). "
                    f"Available window: {avail_day.get('start')}–{avail_day.get('end')}."
                )

        # Check if already assigned on that day
        already_assigned = any(
            sr["employee_id"] == emp_id and sr["day"] == day and not sr["is_open"]
            for sr in schedule.get("shifts", [])
        )
        if already_assigned:
            violated.append(
                f"{emp['name']} is already scheduled on {day}. "
                "One shift per day per employee."
            )

        # Check weekly hours cap
        current_hours = sum(
            s.duration
            for sr in schedule.get("shifts", [])
            if sr["employee_id"] == emp_id and not sr["is_open"]
            for s in SHIFTS if s.label == sr.get("shift_label")
        )
        added_hours = target_shift.duration if target_shift else 8
        if current_hours + added_hours > emp.get("max_hrs_week", 40):
            violated.append(
                f"Assigning this shift would give {emp['name']} "
                f"{current_hours + added_hours}h this week, exceeding their "
                f"{emp['max_hrs_week']}h contract cap."
            )

        if violated:
            delta_wage = emp.get("hourly_wage", 15.0) * added_hours
            delta_match_pct = 0.0

            # Build 2-3 alternatives using the SLOT's role, not the employee's role
            alternatives = _suggest_alternatives(
                schedule, emp, day, shift_label, employees, violated, slot_role=slot_role
            )
        else:
            # No violations — estimate cost impact
            delta_wage = emp.get("hourly_wage", 15.0) * added_hours
            delta_match_pct = round(1 / max(len(employees), 1) * 100, 1)

    elif edit.action == "unassign":
        emp_id = edit.employee_id
        shift_id = edit.shift_id
        matched = next(
            (sr for sr in schedule.get("shifts", [])
             if sr.get("shift_id") == shift_id and sr.get("employee_id") == emp_id),
            None
        )
        if not matched:
            violated.append(f"Shift {shift_id} not found for employee {emp_id}")
        else:
            shift_obj = next((s for s in SHIFTS if s.label == matched.get("shift_label")), None)
            hrs = shift_obj.duration if shift_obj else 8
            delta_wage = -(emp_map.get(emp_id, {}).get("hourly_wage", 15.0) * hrs)
            delta_match_pct = round(-1 / max(len(employees), 1) * 100, 1)

            # Check if this creates a coverage gap
            role = matched["role"]
            day = matched["day"]
            violated.append(
                f"Removing {emp_map.get(emp_id, {}).get('name', emp_id)}'s shift on {day} "
                f"may create a coverage gap for {role}. "
                "Check coverage trace before publishing."
            )
            alternatives = _find_replacement(schedule, matched, employees)

    elif edit.action == "swap":
        from_id = edit.employee_id
        to_id = edit.target_employee_id
        shift_id = edit.shift_id
        if not all([from_id, to_id, shift_id]):
            raise HTTPException(status_code=400, detail="swap requires employee_id, target_employee_id, and shift_id")

        matched = next(
            (sr for sr in schedule.get("shifts", []) if sr.get("shift_id") == shift_id),
            None
        )
        to_emp = emp_map.get(to_id)
        if not matched or not to_emp:
            violated.append("Shift or target employee not found")
        else:
            day = matched["day"]
            avail_ivs = _avail_intervals(to_emp.get("availability", {}).get(day))
            shift_obj = next((s for s in SHIFTS if s.label == matched.get("shift_label")), None)
            if shift_obj and not _shift_available(shift_obj, avail_ivs):
                violated.append(
                    f"{to_emp['name']} is not available for this shift on {day}."
                )
            wage_diff = (
                to_emp.get("hourly_wage", 15.0)
                - emp_map.get(from_id, {}).get("hourly_wage", 15.0)
            )
            hrs = shift_obj.duration if shift_obj else 8
            delta_wage = wage_diff * hrs
            if not violated:
                alternatives = []

    return _explain_response(violated, alternatives, delta_wage, delta_match_pct)


def _explain_response(
    violated: list[str],
    alternatives: list[dict],
    delta_wage: float,
    delta_match_pct: float,
) -> dict[str, Any]:
    return {
        "delta_wage": round(delta_wage, 2),
        "delta_match_pct": round(delta_match_pct, 1),
        "violated_constraints": violated,
        "suggested_alternatives": alternatives,
    }


def _suggest_alternatives(
    schedule: dict,
    emp: dict,
    day: str,
    shift_label: str | None,
    all_employees: list[dict],
    violated: list[str],
    slot_role: str | None = None,
) -> list[dict]:
    """Return up to 3 minimum-cost ways to address the violations."""
    alts = []

    # Use slot_role (the role needed by the open slot) when searching for alternatives,
    # falling back to the employee's own role.
    role = slot_role or emp["role"]
    shift_label = shift_label or "morning"   # default for open slots

    # Alt 1: find another employee with the required role who is available that day
    for candidate in sorted(all_employees, key=lambda e: e.get("hourly_wage", 99)):
        if candidate["id"] == emp["id"]:
            continue
        if candidate["role"] != role:
            continue
        avail_ivs = _avail_intervals(candidate.get("availability", {}).get(day))
        target_shift = next((s for s in SHIFTS if s.label == shift_label), None) if shift_label else None
        if target_shift and _shift_available(target_shift, avail_ivs):
            alts.append({
                "type": "swap_employee",
                "description": (
                    f"Assign {candidate['name']} ({candidate['role']}, "
                    f"${candidate['hourly_wage']:.2f}/hr) instead — "
                    f"available on {day} for the {shift_label} shift."
                ),
                "employee_id": candidate["id"],
                "estimated_delta_wage": round(
                    (candidate["hourly_wage"] - emp.get("hourly_wage", 15.0)) * (target_shift.duration if target_shift else 8), 2
                ),
            })
        if len(alts) >= 2:
            break

    # Alt 2: suggest moving the shift to a day the employee IS available
    for candidate_day in DAYS:
        if candidate_day == day:
            continue
        avail_ivs = _avail_intervals(emp.get("availability", {}).get(candidate_day))
        target_shift = next((s for s in SHIFTS if s.label == shift_label), None) if shift_label else None
        if target_shift and _shift_available(target_shift, avail_ivs):
            alts.append({
                "type": "move_day",
                "description": (
                    f"Move {emp['name']}'s shift to {candidate_day} — "
                    f"they are available for the {shift_label} shift that day."
                ),
                "employee_id": emp["id"],
                "proposed_day": candidate_day,
                "estimated_delta_wage": 0.0,
            })
            break

    # Alt 3: mark as open shift if no one can cover
    if len(alts) < 3:
        alts.append({
            "type": "open_shift",
            "description": (
                f"Leave the {day} {role} slot as an open shift and post it for "
                "pickup — any qualified employee can claim it."
            ),
            "employee_id": None,
            "estimated_delta_wage": 0.0,
        })

    return alts[:3]


def _find_replacement(
    schedule: dict,
    unassigned_shift: dict,
    all_employees: list[dict],
) -> list[dict]:
    """Suggest replacement employees for an unassigned shift."""
    role = unassigned_shift["role"]
    day = unassigned_shift["day"]
    shift_label = unassigned_shift.get("shift_label")
    already_working_that_day = {
        sr["employee_id"]
        for sr in schedule.get("shifts", [])
        if sr["day"] == day and not sr["is_open"]
    }
    alts = []
    for emp in sorted(all_employees, key=lambda e: e.get("hourly_wage", 99)):
        if emp["id"] == unassigned_shift.get("employee_id"):
            continue
        if emp["id"] in already_working_that_day:
            continue
        if emp["role"] != role:
            continue
        avail_ivs = _avail_intervals(emp.get("availability", {}).get(day))
        target_shift = next((s for s in SHIFTS if s.label == shift_label), None) if shift_label else None
        if target_shift and _shift_available(target_shift, avail_ivs):
            alts.append({
                "type": "replacement",
                "description": (
                    f"{emp['name']} is available on {day} for the {shift_label} shift "
                    f"(${emp.get('hourly_wage', 15):.2f}/hr)."
                ),
                "employee_id": emp["id"],
                "estimated_delta_wage": round(emp.get("hourly_wage", 15.0) * (target_shift.duration if target_shift else 8), 2),
            })
        if len(alts) >= 3:
            break

    if not alts:
        alts.append({
            "type": "open_shift",
            "description": f"Post the {day} {role} slot as open — no available replacement found.",
            "employee_id": None,
            "estimated_delta_wage": 0.0,
        })
    return alts


# ── Pre-warm helper (called from main.py startup) ─────────────────────────────

def prewarm(store_id: str = "S-0001", week_iso: str = "2026-W12") -> None:
    """Run the solver eagerly and stash result in cache. Fire-and-forget on startup."""
    try:
        employees = _load_employees(store_id)
        if not employees:
            return
        envelope = _load_envelope(None)
        result = solve(store_id, week_iso, employees, envelope)
        _prewarm_cache[(store_id, week_iso)] = result
        # Also register in schedules so /explain works immediately
        _schedules[result["schedule_id"]] = result
    except Exception as exc:
        # Never crash startup
        print(f"[schedule prewarm] warning: {exc}")
