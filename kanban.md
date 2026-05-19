# Kanban Board — C-Store WFM MVP

**Format**: each ticket has ID, title, description, acceptance criteria, dependencies, estimate (in hours of focused work), and demo-blocking flag (🔴 = blocks demo, 🟡 = nice-to-have).

**Columns**: Backlog → Ready → In Progress → In Review → Done.
Suggested execution order is encoded by ticket ID (BNW-001 first, BNW-NN last). Tickets in the same milestone can be parallelized.

---

## Milestone 0 — Foundation (Day 1)

### BNW-001 🔴 Scaffold the monorepo

**Description**: Create `frontend/` (Remix + Vite + TS) and `backend/` (FastAPI + uv) at the same level. Set up shared scripts in root `package.json` for `dev` (runs both concurrently).
**Acceptance**:
- `npm run dev` brings up Remix on :3000 and FastAPI on :8000.
- Both have a working healthcheck endpoint visible in browser.
- Git initialized with a `.gitignore` covering `node_modules/`, `__pycache__/`, `.venv/`, `*.db`.
**Dependencies**: none.
**Estimate**: 2h.

### BNW-002 🔴 Lift the 7-Eleven design system

**Description**: Copy `colors_and_type.css` and `app.css` from the uploaded design system + labor planning wireframe into `frontend/app/styles/`. Import in `root.tsx`. Verify all CSS variables resolve in a smoke-test route.
**Acceptance**:
- `--c-signal` (#00C36C), `--c-orange`, `--c-ink`, `--font-display`, etc. all resolve.
- Archivo, DM Sans, JetBrains Mono load. Self-host the WOFF2 files in `frontend/public/fonts/` (no Google Fonts at demo).
- A test page rendering `<button class="btn btn-primary">` looks identical to the wireframe.
**Dependencies**: BNW-001.
**Estimate**: 2h.

### BNW-003 🔴 Seed fixtures for stores, employees, scenarios

**Description**: Author JSON fixtures used everywhere:
- `stores.json`: 100 7-Eleven stores split West 38 / Central 32 / East 30. One store (Sunnyvale Plaza, ID `S-0001`) gets full detail for the Schedule wizard.
- `employees.json`: 12 employees for S-0001 across the 7 WFM roles (Store Manager, Shift Lead, Cashier, Sales Associate, Food Service, Coffee Bar, 7NOW Driver).
- `scenarios.json`: 4 scenarios at various statuses (1 Draft, 1 In Review, 1 Approved, 1 Live). The headline "FY26 Increase Wage Rate" lives here.
- `labor_standards.json`: SPLH targets per role, IPLH for foodservice, fixed coverage for overnight.
**Acceptance**:
- Loading any fixture into Python via `json.load` produces no errors and matches the SQLite schema in the PRD §7.
- The headline scenario's numbers (161,200 hrs, $2.46M, 15.0%) are reconstructible from the inputs in `scenario_inputs`.
**Dependencies**: BNW-001.
**Estimate**: 3h.

---

## Milestone 1 — App shell & navigation (Day 1–2)

### BNW-004 🔴 Sidebar + top bar + routing shell

**Description**: Build the persistent `Sidebar` and `TopBar` React components matching the wireframe. Set up Remix routes for `/plans`, `/plans/$id`, `/performance`, `/schedules`, `/schedules/$storeId`. Active-nav highlighting works.
**Acceptance**:
- All five nav items render and route correctly.
- "Carla K. · Labor Planner" footer renders.
- Persona switcher (Carla / Marco / Lin) is in the top-right avatar menu (functional for demo, hidden in prod).
**Dependencies**: BNW-002.
**Estimate**: 3h.

### BNW-005 🟡 404 + loading + error boundaries

**Description**: Custom 404 page (`branded`), Remix-level error boundary, route-level pending UI.
**Acceptance**: navigating to `/nonsense` shows a branded 404, not the default Remix one. Pending UI shows the brand stripe.
**Dependencies**: BNW-004.
**Estimate**: 1.5h.

---

## Milestone 2 — Plans list (Day 2)

### BNW-006 🔴 Plans list page

**Description**: Implement the F2 Plans tiles grid. Status pills color-coded per design system (Draft = grey, In Review = orange, Approved = signal green, Live = ink with green dot). Filter chips and search bar wired to a `useSearchParams` filter.
**Acceptance**:
- Renders the 4 fixture scenarios as tiles.
- Filter chips actually filter.
- Search box filters by name with 150ms debounce.
- "New Scenario" button opens a modal that creates a Draft and routes into the wizard.
**Dependencies**: BNW-003, BNW-004.
**Estimate**: 4h.

---

## Milestone 3 — Plan wizard (Days 2–4, the largest milestone)

### BNW-007 🔴 Wizard shell + stepper

**Description**: Build `plans.$id.tsx` as the wizard shell. Renders title, subtitle, the 6-step stepper, and an `<Outlet />` for the active step. Bottom action bar (Back / Save Draft / Next) is part of the shell.
**Acceptance**:
- All 6 steps are clickable.
- The stepper highlights the current step.
- `*` required indicator renders on steps 1, 2, 5, 6.
- URL reflects the current step (`/plans/$id/prerequisites`, etc).
**Dependencies**: BNW-002.
**Estimate**: 3h.

### BNW-008 🔴 Step 1 — Prerequisites

**Description**: 6 cards in a 2×3 grid: Baseline Plan, Plan Period, Location Scope, Cost Center Mapping, Labor Standards Library, Approval Workflow. Each card has a status pill (Ready / Needs Refresh / Not Configured) and a select / chip group. The Labor Standards card shows the "Needs Refresh" state to drive a learning moment in the demo.
**Acceptance**:
- All 6 cards render with the wireframe's exact layout.
- The "5 of 6 prerequisites ready" black banner appears at the bottom.
- Clicking "Refresh from FY26 study →" on the Labor Standards card flips it to Ready and the banner updates to 6 of 6.
**Dependencies**: BNW-007.
**Estimate**: 4h.

### BNW-009 🔴 Step 2 — Operating Hours

**Description**: Per-store hours table. Filter and search. Flag rows where hours deviate from 24/7. Bulk-edit action.
**Acceptance**:
- Table renders 100 rows, virtualized.
- Filter by "Deviates from 24/7" shows 3 stores in the fixture data.
- Bulk-edit changes propagate to fixture state.
**Dependencies**: BNW-007.
**Estimate**: 3h.

### BNW-010 🔴 Step 3 — Labor Model

**Description**: Three sub-sections: SPLH targets (table by role), IPLH targets (foodservice only), Fixed Coverage rules (overnight, fuel, cleaning). A live preview chart on the right shows the synthesized demand-to-labor curve.
**Acceptance**:
- Editing any SPLH target re-draws the preview chart.
- The chart legend shows the three driver types in distinct colors.
**Dependencies**: BNW-007, BNW-003.
**Estimate**: 5h.

### BNW-011 🔴 Step 4 — Wage Rate

**Description**: Three input modes: Uniform (single `$/hr`), By Role (table per role), By Region (table per region). Live KPI ticker shows `New total wages` and `Δ vs baseline` updating in real time.
**Acceptance**:
- All three modes work. Switching modes preserves the prior mode's values as drafts.
- The $0.50/hr uniform increase moves baseline $2.40M → $2.46M (matches the headline scenario).
**Dependencies**: BNW-007.
**Estimate**: 3h.

### BNW-012 🔴 Step 5 — Demand Forecast

**Description**: Backend endpoint `POST /api/forecast` runs the synthetic forecast (pandas-based, daypart + DoW seasonality) and returns 12-period × division demand. Frontend renders as a heatmap + line chart. Allow per-cell manual override with an "AI Assist" suggestion popover.
**Acceptance**:
- The endpoint returns in <500ms.
- The chart renders the West/Central/East curves with peak Saturday demand and overnight troughs.
- Manual override shows a small ink-colored dot on the cell (audit trail).
**Dependencies**: BNW-007, BNW-016.
**Estimate**: 6h.

### BNW-013 🔴 Step 6 — Run Guidance

**Description**: Compile prior steps into a `POST /api/scenarios/$id/run` call. Render the wireframe's exact KPI strip (Total Hours / Wages / Labor %), the by-division SVG bar chart, the per-division breakdown table, and the bottom action bar with "Submit for Review."
**Acceptance**:
- All three KPIs are computed live from prior steps' inputs.
- Submitting changes status to In Review and routes back to Plans list with a success toast.
- The chart values match the table values to the dollar.
**Dependencies**: BNW-008, BNW-009, BNW-010, BNW-011, BNW-012.
**Estimate**: 5h.

---

## Milestone 4 — Backend forecasting & solver (Days 3–5, parallel with Milestone 3)

### BNW-014 🔴 FastAPI scaffolding + SQLite + fixture loader

**Description**: FastAPI app with health check, CORS for :3000, SQLite via SQLAlchemy, fixtures loaded on startup if DB is empty.
**Acceptance**:
- `GET /health` returns `{status: ok}`.
- `GET /api/scenarios` returns the 4 fixture scenarios.
**Dependencies**: BNW-003.
**Estimate**: 3h.

### BNW-015 🔴 Scenario compute endpoint

**Description**: `POST /api/scenarios/$id/run` reads inputs, computes total hours / wages / labor %, persists outputs, returns full result.
**Acceptance**:
- Idempotent (re-running with same inputs gives same outputs).
- Returns in <300ms.
- Matches the headline numbers for the seed scenario.
**Dependencies**: BNW-014.
**Estimate**: 4h.

### BNW-016 🔴 Synthetic forecast endpoint

**Description**: `POST /api/forecast` produces a 12-period × N-division demand curve using `base + day_of_week_seasonality + daypart_shape + small_noise`. Reproducible (seeded).
**Acceptance**:
- Returns deterministic output for same inputs.
- Realistic shape: Sat > Fri > weekdays, peak 5–7pm, trough 2–4am.
**Dependencies**: BNW-014.
**Estimate**: 3h.

### BNW-017 🔴 Schedule optimizer — OR-Tools CP-SAT model

**Description**: `POST /api/schedule/optimize` takes a store ID, week, demand curve, employee roster, constraints. Builds CP-SAT model:
- Variables: `x[i,j,t]` binary (employee i, shift j, day t).
- Hard: coverage floor per 15-min interval, max hours/week per employee, min 8h rest, one shift per day, skill match.
- Soft objectives (weighted sum): minimize wage cost, maximize preference satisfaction, minimize OT, minimize over-coverage.
- Returns: shifts list, KPIs (employee match %, OT hours, total wage), per-day coverage trace.
**Acceptance**:
- Runs in <5s on the 12-employee, 7-day fixture.
- Always returns a feasible solution (coverage shortage is penalized, not infeasible).
- Match % is ≥90% for the seed roster.
- Total wage is within the approved envelope from the seed scenario.
**Dependencies**: BNW-014, BNW-016.
**Estimate**: 8h. (Largest single ticket. Budget for an extra half-day to tune objective weights.)

### BNW-018 🔴 Schedule explain endpoint

**Description**: `POST /api/schedule/explain` takes a proposed manual edit and returns the cost impact + constraint violations + alternative suggestions. Powers the AI Assistant on the Schedule screen.
**Acceptance**:
- Returns in <500ms.
- Output includes `delta_wage`, `delta_match_pct`, `violated_constraints[]`, `suggested_alternatives[]`.
**Dependencies**: BNW-017.
**Estimate**: 3h.

---

## Milestone 5 — Schedule Optimization wizard (Days 5–6)

### BNW-019 🔴 Schedule wizard shell + 5-step stepper

**Description**: `schedules.$storeId.tsx`. Mirrors the Plan wizard's structure with the 5 steps from PRD §F4.
**Acceptance**: All 5 steps clickable, URL reflects step, bottom action bar present.
**Dependencies**: BNW-007 (component reuse).
**Estimate**: 2h.

### BNW-020 🔴 Step 1 — Setup (store + week + envelope)

**Description**: Pick store and ISO week. Renders the approved guidance envelope as a 3-KPI strip (Hours, Wages, Labor %). The envelope is a hard cap displayed visibly.
**Acceptance**:
- Envelope numbers match the approved scenario.
- Envelope renders with a visible "BUDGET ENVELOPE" eyebrow label.
**Dependencies**: BNW-019.
**Estimate**: 2h.

### BNW-021 🔴 Step 2 — Demand (15-min curve, by role)

**Description**: Stacked area chart of forecasted demand by role across the week, 15-min granularity. Toggle per role on/off. Editable: drag-to-adjust a daypart with snap-to-15min.
**Acceptance**:
- Chart renders 7×24×4 = 672 data points smoothly.
- Editing propagates to the solver inputs.
**Dependencies**: BNW-019, BNW-016.
**Estimate**: 5h.

### BNW-022 🔴 Step 3 — Constraints (employee roster)

**Description**: Table of 12 employees with columns: name, role, contract, max hrs/wk, hourly wage, skills, availability heatmap (7×24 grid). Inline edit on availability and preferences.
**Acceptance**:
- Availability heatmap is keyboard-navigable.
- Editing persists to fixture state for the solver call.
**Dependencies**: BNW-019.
**Estimate**: 4h.

### BNW-023 🔴 Step 4 — Optimize (run solver, show results)

**Description**: Big "Run Optimizer" CTA. Shows a loading state ("Solving… exploring 12,400 candidate schedules"). On result: KPI strip + ScheduleGrid (lifted from `7-11_DS/ui_kits/wfm/ScheduleGrid.jsx`) showing the 7-day grid with role-colored shift cards.
**Acceptance**:
- KPIs match what the solver returns (no front-end fudging).
- Schedule grid renders all shifts with correct role colors per the WFM design system.
- Open shifts (unfilled) show the clock icon, manned shifts show employee avatar initials.
- Warning icons appear on any shift the solver flagged for review.
**Dependencies**: BNW-019, BNW-017.
**Estimate**: 5h.

### BNW-024 🔴 Step 5 — Review & publish + manual edits

**Description**: Drag/drop or click-to-swap shift assignments. Each edit hits `POST /api/schedule/explain` and updates a live "impact" panel. Final "Publish" CTA writes to fixture state and returns to schedules list.
**Acceptance**:
- One manual edit shows the AI Assistant's explanation streaming in.
- Publish flips the schedule status from Draft → Published and shows a toast.
**Dependencies**: BNW-023, BNW-018.
**Estimate**: 5h.

---

## Milestone 6 — Performance dashboard (Day 6)

### BNW-025 🟡 Performance KPI strip + sparklines

**Description**: F5 dashboard. 4 KPI cards with 12-period sparkline + variance band per metric. Per-division table below.
**Acceptance**:
- Sparklines render with the brand stripe pattern.
- Plan-vs-actual variance is computed from fixture data.
**Dependencies**: BNW-002, BNW-015.
**Estimate**: 4h.

### BNW-026 🟡 "Reforecast Now" handoff to Plan wizard

**Description**: Button on the Performance page that creates a new Draft scenario seeded from current actuals and routes into the Plan wizard. Closes the loop.
**Acceptance**: clicking it creates a new tile in /plans and lands on `/plans/$newId/prerequisites`.
**Dependencies**: BNW-025, BNW-006.
**Estimate**: 2h.

---

## Milestone 7 — AI Assistant (Day 7)

### BNW-027 🔴 AI Assistant slide-out shell

**Description**: F6 panel. Right-side, 380px wide, slides over content (not push). Sticky header with "Ask BlueNorth" title and close.
**Acceptance**:
- Opens/closes smoothly with CSS transition.
- Available on Plan wizard and Schedule wizard, hidden on Plans list and Performance.
**Dependencies**: BNW-007, BNW-019.
**Estimate**: 3h.

### BNW-028 🔴 Pre-scripted demo prompts + streaming UI

**Description**: 4 scripted prompts on Plan wizard ("Why did labor % go up?", "Compare to last quarter", "Suggest a wage scenario", "Which prerequisite is blocking?") and 4 on Schedule wizard ("Why is Maria over-scheduled?", "Cheapest way to close the Sat 6am gap?", "Will this pass compliance?", "Compare to last week's actuals"). Each returns a pre-written response with citations rendered as `<sup>` links that scroll to the cited card.
**Acceptance**:
- Streaming feels like an LLM (chunks of 8–20 chars every 30ms).
- Each citation, when clicked, scrolls to and highlights the cited element.
- Free-text input shows a fallback "I'd need more info on that — try one of the prompts above" response.
**Dependencies**: BNW-027.
**Estimate**: 5h.

---

## Milestone 8 — Persona switching & demo polish (Day 8)

### BNW-029 🔴 Persona switcher

**Description**: User menu has Carla / Marco / Lin. Switching changes:
- The footer name + role.
- Read/write permissions (Marco read-only on Plans wizard but sees Approve button on In Review scenarios; Lin sees only Schedules nav item).
- The top-bar avatar initials.
**Acceptance**: walking Carla → Marco → Lin shows the right CTAs at each step.
**Dependencies**: BNW-004.
**Estimate**: 3h.

### BNW-030 🔴 Approve action (Marco persona only)

**Description**: When status = In Review and persona = Marco, the Plan detail header shows an "Approve" button. Clicking it flips status to Approved and triggers a fake notification to Lin.
**Acceptance**: status transition is persisted, visible on Plans list.
**Dependencies**: BNW-029, BNW-013.
**Estimate**: 2h.

### BNW-031 🟡 Demo "reset" button

**Description**: Hidden dev-only button (URL `?reset=1`) that wipes SQLite and reloads fixtures. Lets you re-run the demo in 5 seconds if anything goes sideways.
**Acceptance**: pressing it puts the app back to pristine demo state.
**Dependencies**: BNW-014.
**Estimate**: 1h.

### BNW-032 🔴 Final visual polish

**Description**: Side-by-side compare every screen with the wireframe `index.html`. Fix spacing, alignment, font weights, shadows. Verify all KPI numbers cross-check.
**Acceptance**:
- All sticker-shadow CTAs render with `5px 5px 0 0 var(--c-ink)` + 2px ink border.
- All eyebrow labels (UPPERCASE, 12px, tracked) match.
- JetBrains Mono is used everywhere a number needs to look "receipt-like."
- The `--font-display` (Archivo, 800-weight, ALL CAPS) hero text matches.
**Dependencies**: all UI tickets.
**Estimate**: 4h.

---

## Out-of-scope (parking lot)

| Idea | Why parked |
|---|---|
| Workday integration | Demo uses a JSON "guidance bundle" stub. Real integration is post-MVP. |
| Mobile employee app | Beyond demo scope. The 4.9★ Legion app feature is mentioned in pitch but not built. |
| Real ML forecast (LightGBM / NeuralProphet) | Synthetic forecast is faster, more predictable, and visually indistinguishable in a demo. |
| Predictive-scheduling-law compliance engine | CA / NY / IL rules are non-trivial. v2. |
| Multi-tenant SaaS auth | Single-user demo. |
| Audit log UI | Backend logs everything; UI surface is v2. |

---

## Effort summary

| Milestone | Total hours |
|---|---|
| M0 Foundation | 7h |
| M1 Shell | 4.5h |
| M2 Plans list | 4h |
| M3 Plan wizard | 26h |
| M4 Backend | 21h |
| M5 Schedule wizard | 23h |
| M6 Performance | 6h |
| M7 AI Assistant | 8h |
| M8 Persona + polish | 10h |
| **Total** | **~109h** (≈ 8 working days at 14h/day, single dev with Claude Code) |

Critical path: BNW-001 → 002 → 007 → 013 → 020 → 023 → 028 → 032.
