# PRD — C-Store Labor Planning & Schedule Optimization MVP

**Codename**: BlueNorth WFM (working title; replace at demo time)
**Owner**: Shrikanth (BlueNorth AI)
**Status**: Demo-ready MVP scope
**Last updated**: May 2026

---

## 1. Problem statement (Phase 1 outcome)

C-store operators like 7-Eleven need a Legion-class labor planning + schedule optimization product that understands the unique constraints of 24/7 convenience retail: single-clerk overnight risk, foodservice prep that's separate from cashiering, fuel-volume-driven coverage, high-churn workforce, and the franchisee/corporate dual P&L. Today they patch this together with Workday + spreadsheets + manager intuition. We replace that with one closed-loop, AI-native platform.

## 2. Goals & non-goals

### 2.1 Goals (in-scope for MVP demo)

- **G1**. Show a credible Labor Planning workflow that mirrors Legion's 6-step scenario wizard, adapted for c-stores.
- **G2**. Show a Schedule Optimization workflow that produces a weekly schedule for one store using a real OR-Tools solver against forecasted demand.
- **G3**. Demonstrate the **plan-to-execution handoff** — approved scenario guidance flows into the schedule view as binding budget envelopes.
- **G4**. Walk three personas (Planner → Regional Ops → Store Operator) in a single demo journey.
- **G5**. Make all numbers internally consistent so the demo audience can audit any KPI back to a source.

### 2.2 Non-goals (explicitly out for MVP)

- Real Workday / HRIS integration. Stub the contract with a JSON fixture.
- Multi-tenant auth, RBAC, SSO. Demo runs as a single signed-in "Carla K." session.
- Mobile employee app (the 4.9-star Legion app). Show only the corporate planner web app.
- Real ML forecasting. Use a deterministic synthetic demand curve with seasonality + daypart shape — looks AI-native, is fully reproducible.
- Real payroll export. Show a "send to Workday" confirmation only.

## 3. Personas & user journeys

### 3.1 Carla K. — Labor Planner (HQ)

Builds the FY26 Q1 reforecast scenario. **Primary screens**: Plans list → Plan wizard (6 steps) → Submit for review.

### 3.2 Marco T. — Regional Field Ops

Reviews Carla's scenario, sees impact across 100 stores, approves. **Primary screens**: Performance dashboard → Plan detail (read-only) → Approve action.

### 3.3 Lin H. — Store Operator

Receives the approved guidance and builds next week's schedule for Sunnyvale Plaza. **Primary screens**: Schedules → Schedule Optimization wizard → Publish.

### 3.4 The demo journey (single happy path, ~12 min)

```
[00:00] Carla opens Plans → "FY26 Q1 Reforecast" tile
[01:30] Walks Step 1–6 of the plan wizard. Highlights: prerequisites, AI forecast, scenario what-if (wage +$0.50/hr).
[05:00] Run Guidance — shows 161,200 hrs / $2.46M / 15.0% labor %. Submits.
[06:00] Persona swap → Marco reviews, sees per-division impact, approves.
[07:30] Persona swap → Lin opens Schedules view, sees the approved guidance envelope.
[08:00] Lin clicks "Auto-Generate Schedule" for Sunnyvale Plaza, week of Mar 16.
[08:30] Solver runs (~2s), produces 7-day schedule. Shows: 96% employee match, $0 OT, no coverage gaps, $12.4K wage cost (within envelope).
[10:00] Lin makes one manual edit, AI Assistant explains the cost impact.
[11:00] Publishes. Loop closes — actuals from week prior already pre-loaded as fixture, showing 0.4% variance vs plan.
[12:00] Q&A.
```

## 4. Functional requirements

Numbered by screen so we can cite them in tickets.

### F1 — Sidebar + nav shell

- F1.1 Persistent left sidebar with Dashboard / Plans / Performance / Schedules / Stores / Settings.
- F1.2 Top bar with page title, help, notifications, user avatar (initials).
- F1.3 Persona switcher in user menu (Carla / Marco / Lin) — for demo only, hidden in prod build.

### F2 — Plans list

- F2.1 Tile grid of scenarios. Each tile shows: name, status pill (Draft / In Review / Approved / Live), locations, period, last updated.
- F2.2 Filter chips: All / Draft / In Review / Approved / Live / Archived.
- F2.3 "New Scenario" CTA → opens wizard at Step 1.
- F2.4 Search bar (filter by name).

### F3 — Plan wizard (the big one — 6 steps)

| Step | Name | Purpose |
|---|---|---|
| F3.1 | Prerequisites | Lock in baseline plan, period, location scope, cost center mapping, labor standards version, approval chain. |
| F3.2 | Operating Hours | Per-store hours; flag stores deviating from 24/7 corporate standard. |
| F3.3 | Labor Model | Choose SPLH / IPLH / hybrid + fixed coverage rules; preview the demand→labor curve. |
| F3.4 | Wage Rate | Apply uniform / by-role / by-region wage changes; show $ impact in real time. |
| F3.5 | Demand Forecast | Show AI-generated 12-week forecast at the period × division level; allow manual adjustment. |
| F3.6 | Run Guidance | Compile all inputs → produce hours, wages, labor % KPIs + per-division breakdown chart + table. Submit for review. |

Cross-cutting:
- F3.7 Bottom bar with Back / Save Draft / Next on every step.
- F3.8 Stepper at top showing progress and required (`*`) markers.
- F3.9 "Edit Details" action in header to rename / re-scope the scenario.

### F4 — Schedule Optimization wizard (new, not in original wireframe)

| Step | Name | Purpose |
|---|---|---|
| F4.1 | Setup | Pick store + week. Show approved guidance envelope (hours/$/labor %). |
| F4.2 | Demand | 15-min interval demand curve for the week, by role. Editable. |
| F4.3 | Constraints | Employee roster (12 employees), availability, skills, max hours, preferences. |
| F4.4 | Optimize | Run solver. Show progress, then result: weekly grid + KPIs (employee match %, OT, wage $, coverage gaps). |
| F4.5 | Review | Manual edits; AI Assistant explains tradeoffs ("Adding Maria to Sat 6am increases wages by $36 and improves coverage score by 4 points"). Publish. |

### F5 — Performance dashboard

- F5.1 Plan-vs-actual KPI strip: Hours, Wages, Labor %, Forecast Accuracy.
- F5.2 12-week sparkline per metric with variance band.
- F5.3 Per-division table with drill-down to store.
- F5.4 "Reforecast Now" CTA — kicks back into the Plan wizard with current actuals as new baseline (closing the loop).

### F6 — AI Assistant (floating panel, available on F3 + F4)

- F6.1 Right-side slide-out panel.
- F6.2 Suggested-prompts list at the top ("Why did labor % go up?", "Compare to last quarter", "Suggest a wage scenario").
- F6.3 Free-text input. Responses are pre-scripted for the demo (no live LLM call) but rendered in streaming style so they feel real.
- F6.4 Citations: every claim in a response cites a card / row on the current screen so the answer is auditable.

## 5. Non-functional requirements

- **NFR-1**: Loads in <2s on a demo laptop. No external network calls during the demo.
- **NFR-2**: Solver runs in <5s for a single store, 7 days, 12 employees. (Will be the case with OR-Tools CP-SAT.)
- **NFR-3**: Looks and feels 7-Eleven-branded. Uses the design system tokens (signal green, ink black, orange/red accents, sticker shadows, Archivo + DM Sans + JetBrains Mono).
- **NFR-4**: Keyboard-navigable (demo is screen-shared; mouse-only would look amateur).
- **NFR-5**: All KPIs are computed live from the underlying fixtures — no hard-coded "magic" numbers. If a planner changes the wage in Step 4, the labor % on Step 6 must move.

## 6. Tech stack

### 6.1 Frontend

- **Framework**: **Remix** (Vite-powered, TypeScript). Chosen because: a) you already use Remix; b) the nested-routing model maps cleanly onto the wizard → step structure; c) loaders/actions give us proper backend boundaries without standing up a separate API for the demo.
- **Styling**: Plain CSS with the 7-Eleven token file (`colors_and_type.css`) lifted directly from the uploaded design system. No Tailwind for the demo — the design system already has every token we need.
- **State**: React server components via Remix loaders for navigation state; `useFetcher` for the wizard's intra-step inputs; small `zustand` store for the AI Assistant panel state.
- **Charts**: Inline SVG (matches the wireframe's existing style) for the simple charts; **Recharts** if we end up needing tooltips / interactivity on the demand curve.
- **Schedule grid**: lift the WFM `ScheduleGrid.jsx` component from the uploaded `7-11_DS/ui_kits/wfm/` straight into the project.

### 6.2 Backend

- **API**: **FastAPI** (Python 3.11), single service, runs on localhost:8000.
- **Solver**: **Google OR-Tools 9.x** (CP-SAT).
- **Forecasting**: Pure pandas — synthetic demand curve = base + weekday seasonality + daypart shape + small noise. Looks like a forecast, fully reproducible.
- **Data layer**: SQLite (file-based), seeded from JSON fixtures on boot. Zero infra to demo.
- **Why split frontend / backend instead of doing it all in Remix**: the OR-Tools solver call is the centerpiece. Having a real `POST /optimize` endpoint that returns in 2s is a more credible demo than a Node.js shim.

### 6.3 Repo layout

```
cstore-wfm/
├── frontend/                  # Remix app
│   ├── app/
│   │   ├── root.tsx
│   │   ├── routes/
│   │   │   ├── _index.tsx                # redirects to /plans
│   │   │   ├── plans._index.tsx          # F2 Plans list
│   │   │   ├── plans.$id.tsx             # F3 Plan wizard shell
│   │   │   ├── plans.$id.$step.tsx       # individual wizard steps
│   │   │   ├── performance._index.tsx    # F5 dashboard
│   │   │   ├── schedules._index.tsx      # schedules list
│   │   │   ├── schedules.$storeId.tsx    # F4 schedule wizard
│   │   │   └── api.optimize.ts           # proxies to FastAPI
│   │   ├── components/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── stepper.tsx
│   │   │   ├── kpi-card.tsx
│   │   │   ├── schedule-grid.tsx
│   │   │   ├── ai-assistant.tsx
│   │   │   └── ...
│   │   ├── styles/
│   │   │   ├── colors_and_type.css       # from design system
│   │   │   └── app.css                   # from wireframe
│   │   └── lib/
│   │       ├── fixtures.ts               # scenarios, employees, stores
│   │       └── api.ts                    # fetch wrappers
│   └── package.json
├── backend/                   # FastAPI + OR-Tools
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── plans.py
│   │   │   ├── schedule.py
│   │   │   └── forecast.py
│   │   ├── solver/
│   │   │   ├── milp.py                   # CP-SAT model
│   │   │   └── constraints.py
│   │   ├── forecast/
│   │   │   └── synthetic.py
│   │   └── fixtures/
│   │       ├── stores.json
│   │       ├── employees.json
│   │       └── scenarios.json
│   ├── pyproject.toml
│   └── README.md
└── docs/
    ├── research.md
    ├── prd.md
    ├── kanban.md
    ├── execution-prompts.md
    └── qa-plan.md
```

## 7. Data model (minimum viable schema)

```python
Store(id, name, region, division, type[Corporate|Franchise], hours_open[json], lat, lon)
Employee(id, store_id, name, role, contract[FT|PT], max_hrs_week, hourly_wage, skills[list], availability[json], preferences[json])
LaborStandard(role, driver[SPLH|IPLH|FIXED], rate, daypart)
Scenario(id, name, status, baseline_id, period_start, period_end, locations[list], created_by, created_at)
ScenarioInput(scenario_id, step, payload[json])  # one row per wizard step
ScenarioOutput(scenario_id, total_hours, total_wages, labor_pct, by_division[json])
Forecast(store_id, period, interval_15min, demand_units, demand_dollars)
Schedule(id, store_id, week_iso, status, employee_match_pct, total_wage, ot_hours)
Shift(schedule_id, employee_id, day, start, end, role, is_open)
```

## 8. Acceptance criteria — demo-readiness checklist

The MVP is "demo-ready" when **all** of the following are true:

- [ ] You can click through the Plans list → open the "FY26 Increase Wage Rate" scenario → walk all 6 steps with no broken state.
- [ ] Changing the wage on Step 4 visibly changes the Labor % on Step 6 within 200ms.
- [ ] Submitting Step 6 changes the scenario status from Draft → In Review in the Plans list.
- [ ] Approving via the Marco persona changes status In Review → Approved.
- [ ] The approved guidance envelope (hours/$/labor %) appears in the Schedule wizard's Setup step.
- [ ] Clicking "Optimize" on the Schedule wizard hits the FastAPI solver, returns in <5s, populates a 7-day grid with no coverage gaps.
- [ ] The schedule's total wage cost is within the approved envelope (printed in green).
- [ ] At least one solver constraint is observably honored when violated (e.g., max 40h/week shows a red badge if exceeded by manual edit).
- [ ] AI Assistant responds with a streaming-style response in <2s to all four scripted prompts.
- [ ] No console errors. No 404s. No broken images.
- [ ] All branding is on-token: signal green primary, ink black for hero, sticker shadows on CTAs, Archivo + DM Sans + JetBrains Mono.

## 9. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Solver returns infeasible for demo fixtures | M | Soften shift-coverage constraint to a high-penalty objective, never a hard infeasibility. Always returns *some* schedule. |
| Live demo network failure | L | Everything runs on localhost. No CDN, no external fonts at demo time (self-host Archivo + DM Sans + JetBrains Mono). |
| Wireframe styling breaks in Remix's CSS pipeline | M | Lift CSS verbatim; do a visual diff against `labor-planning-app/index.html` before the demo. |
| Story doesn't land for c-store audience | M | Lead with the 7-Eleven franchisee overnight letter (Jan 2026) — it's a real, current pain. Saves the demo if Q&A goes off-script. |
| Demo computer is slow | L | Pre-warm the solver on app boot; pre-cache the optimization result for the headline scenario so the worst-case is also <5s. |
