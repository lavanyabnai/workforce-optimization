# Claude Code Execution Prompts — Multi-Session

**How to use this file**: each section below is a self-contained Claude Code session. Copy the whole "Prompt" block into Claude Code, let it run to "done", verify the acceptance criteria, then move to the next session. Sessions are designed to be ≤ 3 hours of work each, and each ends in a runnable state you can demo.

**Project root**: assume `~/projects/cstore-wfm/`.
**Working assumption**: you have `docs/research.md`, `docs/prd.md`, `docs/kanban.md` (this output), plus the uploaded `7-11_DS/` design system folder and `labor-planning-app/` wireframe in the repo's `_reference/` directory before you start.

**Important conventions to set in every session**:
- Use the planning tool (todo list) at the start of every session. Tick items as you go.
- Read the relevant kanban ticket(s) before writing code.
- Never invent fixture data — pull from `_reference/labor-planning-app/index.html` for the headline numbers (161,200 hrs / $2.46M / 15.0%).
- Always cross-reference UI against `_reference/labor-planning-app/index.html` before declaring a screen done.

---

## Session 1 — Foundation & Design System (BNW-001, BNW-002, BNW-003)

**Estimated time**: 2.5h.
**Outcome**: monorepo running both apps locally, design system applied, fixtures loadable.

### Prompt

```
You are setting up the foundation for a c-store labor-planning + scheduling MVP (a Legion clone for 7-Eleven). Before writing any code:

1. Read `docs/prd.md` (especially §6 Tech Stack and §7 Data Model) and `docs/kanban.md` tickets BNW-001, BNW-002, BNW-003 in full.
2. Read `_reference/7-11_DS/SKILL.md`, `_reference/7-11_DS/colors_and_type.css`, and `_reference/labor-planning-app/css/app.css` to understand the design system.
3. Make a todo list with one item per acceptance criterion across the three tickets. Stick to it.

Then implement, in this order:

A) Monorepo scaffold (BNW-001):
- Init `frontend/` with `npm create remix@latest` (Vite, TypeScript, no built-in Tailwind).
- Init `backend/` with `uv init` (Python 3.11+), pinned to FastAPI, uvicorn, sqlalchemy, ortools, pandas, pydantic.
- Root `package.json` with a `dev` script using `concurrently` to run both apps.
- `.gitignore` covering node_modules, __pycache__, .venv, *.db, .DS_Store.
- Healthcheck: GET / on Remix returns "BlueNorth WFM" h1; GET /health on FastAPI returns {"status":"ok"}.

B) Design system lift (BNW-002):
- Copy `_reference/7-11_DS/colors_and_type.css` to `frontend/app/styles/colors_and_type.css`.
- Copy `_reference/labor-planning-app/css/app.css` to `frontend/app/styles/app.css`.
- Self-host Archivo, DM Sans, and JetBrains Mono WOFF2 files in `frontend/public/fonts/` — replace the @import in colors_and_type.css with @font-face declarations pointing at /fonts/.
- Import both stylesheets in `app/root.tsx` via Remix's `links` export.
- Create a smoke-test route `/_dev` showing one of each: `<button class="btn btn-primary">`, `<button class="btn btn-sticker">`, a `.pill.pill-green`, a `.card.card-sticker` with a `.kpi` inside it. Numbers in mono, headings in display, body in DM Sans.

C) Fixtures (BNW-003):
- Author `backend/app/fixtures/stores.json` with 100 stores. Distribution: West 38, Central 32, East 30. Store ID `S-0001` = "Sunnyvale Plaza", franchise, 24/7. Use realistic store names from a Bay Area + Texas + NYC blend.
- Author `backend/app/fixtures/employees.json` with 12 employees for S-0001. Roles must cover all 7 from the WFM design system: Store Manager (1), Shift Lead (2), Cashier (3), Sales Associate (2), Food Service (2), Coffee Bar (1), 7NOW Driver (1). Mix of FT/PT contracts. Realistic hourly wages ($17–$26).
- Author `backend/app/fixtures/scenarios.json` with 4 scenarios. The headline "FY26 Increase Wage Rate" must produce 161,200 hrs / $2.46M / 15.0% when run through the compute pipeline (back-solve the inputs from these targets). The other 3 scenarios should be at varied statuses: 1 Draft, 1 In Review, 1 Approved.
- Author `backend/app/fixtures/labor_standards.json` with: SPLH targets per role (e.g. Cashier $130/hr, Shift Lead $180/hr), IPLH for Food Service (15 items/hr), fixed coverage rule for overnight (1 Cashier + 0.5 Shift Lead per store, midnight–6am).

Verification before declaring "done":
- `npm run dev` from repo root brings up both apps with no errors.
- Visiting localhost:3000/_dev shows all design-system components rendering with correct fonts and colors.
- Visiting localhost:8000/health returns ok.
- `python -c "import json; [json.load(open(f)) for f in ['backend/app/fixtures/stores.json','backend/app/fixtures/employees.json','backend/app/fixtures/scenarios.json','backend/app/fixtures/labor_standards.json']]"` runs without errors.

Don't move on until every acceptance criterion in BNW-001, BNW-002, BNW-003 is checked.
```

---

## Session 2 — App shell, navigation, Plans list (BNW-004, BNW-005, BNW-006)

**Estimated time**: 3h.
**Outcome**: clickable navigation skeleton; Plans list renders the four fixture scenarios with filtering and search.

### Prompt

```
Continuing the c-store WFM build. You finished Session 1; design system is wired and fixtures load. Now build the app shell and the Plans list.

Pre-flight:
1. Re-read `docs/kanban.md` tickets BNW-004, BNW-005, BNW-006 in full.
2. Open `_reference/labor-planning-app/index.html` and locate the sidebar HTML (lines 14–83), the top bar (87–105), and the Plans list view (108–252). These are your visual reference. Match them exactly.
3. Make a todo list per acceptance criterion.

Implement:

A) `app/components/Sidebar.tsx`:
- Inline the 7-Eleven SVG mark from the wireframe (it's an SVG path block, copy verbatim).
- Two nav sections: "Workspace" (Dashboard, Plans, Performance, Schedules) and "Admin" (Stores, Settings).
- Active nav item highlights with the existing `.nav-item.active` styles.
- Footer with avatar "CK" and "Carla K. / Labor Planner". Avatar bg is signal green per design tokens.
- Use Remix `NavLink` for active-route detection.

B) `app/components/TopBar.tsx`:
- Page title (dynamic, from route metadata via `useMatches`).
- Help and notifications icon buttons (SVG inlined from wireframe).
- Brand stripe + user avatar.
- Make the avatar clickable: opens a small dropdown with a persona switcher (Carla / Marco / Lin) and a Sign Out item. The persona switcher writes to a `zustand` store and reloads the active route.

C) `app/root.tsx`:
- Wrap children in a `.app` flex container.
- Render Sidebar on the left, then `<main className="main">` with TopBar + `<Outlet />`.
- Custom branded ErrorBoundary + 404 (BNW-005).
- Add a global pending-UI bar at the top (uses Remix's `useNavigation`) that flashes signal green when navigating.

D) Routes:
- `/` redirects to `/plans`.
- `/plans` is implemented next (step E).
- `/performance`, `/schedules`, `/dashboard` are simple "Coming soon" stubs styled with `.empty` per the wireframe.

E) Plans list page `/plans` (BNW-006):
- Read from a loader that calls `GET /api/scenarios` (proxy to FastAPI).
- For now, FastAPI needs a placeholder endpoint that just returns the 4 fixture scenarios as JSON.
- Render the page header (h1 "Labor Plans", subtitle, "Export" and "New Scenario" buttons) per wireframe lines 110–125.
- Filter chip strip below the header: All / Draft / In Review / Approved / Live / Archived. Synced to ?status= search param. Active chip has signal-green background per design system.
- Search input with magnifying-glass icon. Debounces 150ms, syncs to ?q= search param.
- Tile grid of scenario cards. Each card:
  - Status pill (use the wireframe's pill colors).
  - Scenario name in Archivo 800, uppercase tracking.
  - Locations count, period, last-updated.
  - "Sticker shadow" on hover: box-shadow transitions to 5px 5px 0 0 var(--c-ink).
- "New Scenario" CTA opens a modal: name input + period select. Submitting POSTs to /api/scenarios, returns the new ID, navigates to /plans/{id}/prerequisites.

For now `/plans/$id/prerequisites` can be a stub — we build it in Session 3.

Verification:
- All 4 fixture scenarios render. Filter and search work. Persona switcher visibly changes the footer name/role.
- 404 on `/garbage` is branded, not default Remix.
- No console errors. Screen-share readable at 1280×720.
```

---

## Session 3 — Plan Wizard, Steps 1–3 (BNW-007, BNW-008, BNW-009, BNW-010)

**Estimated time**: 3h.
**Outcome**: planner can walk steps 1–3 of the FY26 scenario, edit inputs, see live previews. State persists across step navigation.

### Prompt

```
Continuing the c-store WFM build. App shell and Plans list are done. Now build the Plan Wizard shell plus the first three of six wizard steps.

Pre-flight:
1. Re-read `docs/kanban.md` BNW-007 through BNW-010.
2. Open `_reference/labor-planning-app/index.html` lines 253–500 — that's the wireframe for the wizard shell + step 1 (Prerequisites). Reproduce the layout pixel-faithfully.
3. Make a todo list per acceptance criterion.

Implement:

A) Wizard shell `/plans/$id` (BNW-007):
- Loader fetches the scenario from `GET /api/scenarios/$id`.
- Layout: breadcrumb back-link, page title row with scenario name + subtitle ("Scenario · 100 locations · Period 10 → Period 12 · Last saved …"), Edit Details button.
- 6-step stepper as a row of `<button class="step">` per the wireframe (lines 274–302). Each step shows a numbered circle, label, and `*` if required.
- Bottom action bar (`.bottom-bar`) is a sticky child of the shell, always visible regardless of step.
- `<Outlet />` for the step content.
- Child routes: `/plans/$id/prerequisites`, `/plans/$id/hours`, `/plans/$id/labor`, `/plans/$id/wage`, `/plans/$id/forecast`, `/plans/$id/guidance`.
- Wizard state lives in a `zustand` store keyed by scenarioId — each step's edits are merged in. On step navigation, draft is auto-saved via a Remix fetcher (`PUT /api/scenarios/$id/inputs`).

B) Step 1 Prerequisites (BNW-008):
- 6 cards in a 2-column grid (`.split-2`). Each card has:
  - Title (Archivo 800, 14px, uppercase, tracked).
  - One-line caption.
  - Status pill (Ready = pill-green, Needs Refresh = pill-orange, Configured = pill-green).
  - A select / chip group / link as appropriate.
- Cards exactly as in wireframe lines 327–421: Baseline Plan, Plan Period, Location Scope, Cost Center Mapping, Labor Standards Library, Approval Workflow.
- Labor Standards card starts in "Needs Refresh" state with the orange border + cream background. The "Refresh from FY26 study →" link, when clicked, flips it to Ready.
- Bottom black banner (lines 425–434) shows "5 of 6 prerequisites ready" and a Mark All Ready button. The "5" is dynamic — updates to 6 when Labor Standards is refreshed.

C) Step 2 Operating Hours (BNW-009):
- Table of 100 stores. Columns: Store, Region, Open, Close, Hours/day, Status.
- 24/7 stores show "24/7 · 168 hrs/wk" in mono; deviating stores show their actual hours in mono + a pill-orange "Deviates" badge.
- 3 stores in the fixture should deviate (set their hours to 6am–11pm). Filter chip "Show deviations only" shows just those 3.
- Bulk edit: select N stores via checkboxes → toolbar appears with "Apply 24/7 to selected" / "Apply custom hours to selected" actions.

D) Step 3 Labor Model (BNW-010):
- Split layout: left = three accordion sections (SPLH Targets / IPLH Targets / Fixed Coverage Rules), right = live preview chart.
- SPLH Targets: table of all 7 roles with editable SPLH dollar inputs.
- IPLH Targets: editable items/hour input per foodservice subtype (sandwiches, hot dogs, taquitos, fresh coffee, pizza). 5 rows.
- Fixed Coverage Rules: a list of rules with daypart × role × min-count. Add/remove rules with chips.
- Right-side preview: stacked area chart showing demand-driven hours (SPLH + IPLH contributions) plus fixed coverage floor as a horizontal band. SVG, no external lib. Updates within 200ms of any edit.

State guarantees:
- Editing on Step 1 then jumping to Step 3 and back must preserve every input.
- Step 2 deviation flags must persist after a full page reload.

Verification:
- Click through prerequisites → operating hours → labor model with no broken state.
- Editing an SPLH value visibly moves the preview chart.
- Refreshing Labor Standards flips the "5 of 6" banner to "6 of 6" and re-renders the banner content (no full page reload).
- Bottom-bar "Next" button navigates correctly through all three steps.
```

---

## Session 4 — Plan Wizard, Steps 4–6 + backend compute (BNW-011, BNW-012, BNW-013, BNW-014, BNW-015, BNW-016)

**Estimated time**: 3.5h.
**Outcome**: end-to-end Plan Wizard works. Submitting Step 6 changes scenario status. Headline numbers match research targets.

### Prompt

```
Continuing the c-store WFM build. Wizard shell + steps 1–3 are done. Now finish the wizard and stand up the backend compute + forecast endpoints.

Pre-flight:
1. Re-read `docs/kanban.md` BNW-011 through BNW-016.
2. Re-read `docs/research.md` §4 (Labor-model fundamentals) and §9 (Demo data anchors). The headline scenario must produce **161,200 hrs / $2,460,000 / 15.0%** when run; any deviation means the back-solve is wrong.
3. Open wireframe lines 700–1015 for steps 4–6 visual reference.

Implement (start with backend so frontend has something to call):

A) FastAPI scaffold (BNW-014):
- `app/main.py`: FastAPI app, CORS allowing localhost:3000, on-startup seed of SQLite from JSON fixtures (idempotent — skip if DB non-empty).
- `app/db.py`: SQLAlchemy models matching `docs/prd.md` §7.
- Endpoints (`app/api/scenarios.py`, `app/api/forecast.py`):
  - `GET /api/scenarios`, `GET /api/scenarios/{id}`, `PUT /api/scenarios/{id}/inputs`, `POST /api/scenarios/{id}/run`, `POST /api/scenarios/{id}/submit`, `POST /api/scenarios/{id}/approve`.
  - `POST /api/forecast`.

B) Scenario compute (BNW-015):
- Inputs from the wizard state are merged into a single config dict.
- Hours = forecasted_sales / target_SPLH, summed per role, period, division. (Use the labor_standards.json + the forecast output.)
- Wages = hours × wage_rate per role, modified by the Step 4 wage scenario.
- Labor % = wages / forecasted_sales.
- Per-division output uses the West/Central/East split from stores.json.
- Tune fixture defaults until running the seed scenario yields exactly **161,200 hrs · $2,460,000 · 15.0% labor %**. This is the demo's audit-the-numbers anchor.
- Make every intermediate number queryable (e.g. `GET /api/scenarios/{id}/run?explain=true`) — this powers the AI Assistant later.

C) Synthetic forecast (BNW-016):
- `POST /api/forecast` accepts {store_ids[], period_start, period_end, granularity}. Returns demand_units + demand_dollars per interval.
- Generator = base_demand × dow_seasonality[0..6] × daypart_shape[0..95] × noise_seed.
- Seed by store_id so it's deterministic.
- Shape must look realistic: Sat > Fri > weekdays, peak 5–7pm at ~3× trough, trough 2–4am at ~0.3× mean.

D) Step 4 Wage Rate (BNW-011):
- Three sub-modes (segmented control at top): Uniform / By Role / By Region.
- Uniform: single $/hr input. Default value = +$0.50/hr.
- By Role: table of 7 roles with $/hr deltas.
- By Region: table of 3 regions with $/hr deltas.
- Right-side live KPI ticker: "New total wages" + "Δ vs baseline" updating on every input change. Uses a debounced `/api/scenarios/{id}/run?dryRun=true` call.
- Default Uniform $0.50/hr must move baseline $2.40M → $2.46M.

E) Step 5 Demand Forecast (BNW-012):
- Top filter strip: division + period range pickers.
- Two viz: a heatmap (period × division, sales $) and a line chart (period × division). User can toggle.
- Cells/points are click-to-edit. Edited values get a small ink dot in the corner (audit). "Reset to AI forecast" button reverts.
- Backend call: `POST /api/forecast` on mount, results cached for the wizard session.

F) Step 6 Run Guidance (BNW-013):
- On step enter: call `POST /api/scenarios/{id}/run`. Show a 1-second loading spinner labelled "Compiling guidance from 6 inputs…"
- KPI strip (3 cards per wireframe lines 868–893): Total Hours, Wages, Labor %. Each card has a label, big mono number, and a one-line caption.
- Group-by toggle (Region / Division / Period) drives the chart.
- View toggle (Grid / Chart) switches between the table and the SVG bar chart.
- Per-division SVG bar chart (Budget vs Projected) matching wireframe lines 921–973. Y-axis labels in mono, bars in signal/orange, trend line in ink.
- Per-division breakdown table below.
- Bottom action bar: Back / Save Draft / Submit for Review. Submit calls `POST /api/scenarios/{id}/submit`, flips status to In Review, navigates to `/plans` with a success toast.

Verification:
- Click through all 6 wizard steps end-to-end with no broken state.
- Wage delta of +$0.50/hr in Step 4 visibly moves Labor % in Step 6 to within ±0.05% of 15.0%.
- Submitting on Step 6 changes the scenario's status pill on the Plans list to In Review immediately.
- Forecast endpoint returns same values for same inputs across multiple calls.
- All KPI numbers cross-check: chart total = table total = KPI strip total = backend response.
```

---

## Session 5 — OR-Tools Schedule Optimizer (BNW-017, BNW-018)

**Estimated time**: 3.5h.
**Outcome**: working solver returning a feasible schedule in <5s with KPIs and an explain endpoint.

### Prompt

```
Continuing the c-store WFM build. Plan side is complete. Now build the OR-Tools schedule optimizer.

Pre-flight:
1. Re-read `docs/kanban.md` BNW-017 and BNW-018.
2. Re-read `docs/research.md` §5 (Optimization model).
3. Make a todo list. Get the model running with hard constraints only, *then* add soft objectives, *then* tune weights.

Implement:

A) `backend/app/solver/milp.py` — CP-SAT model:

Inputs:
- store_id, week_iso
- demand: dict[role][day][interval_15min] -> required_headcount (from POST /api/forecast)
- employees: list of {id, name, role, contract, max_hrs_week, hourly_wage, skills, availability[day][interval] -> bool, preferences{shift_type: weight}}
- envelope: {max_hours, max_wages} from the approved scenario

Decision variables:
- x[i, d, s] ∈ {0,1} — employee i works shift s on day d. Shifts are pre-enumerated (6am–2pm, 2pm–10pm, 10pm–6am, plus the same patterns with ±2h shifts to give the solver options).

Hard constraints:
- For each (role, day, interval): sum of x[i,d,s] over (i,s) where employee i has the role and shift s covers that interval ≥ demand[role][day][interval]. If infeasible, soften to a high-penalty objective (NEVER let the solver return infeasible — we'd lose the demo).
- For each employee i: sum of x[i,d,s] × hours[s] over all (d,s) ≤ max_hrs_week.
- For each (i, d): sum of x[i,d,s] ≤ 1 (one shift per day).
- For each (i, d): if x[i, d-1, late_evening] = 1 AND x[i, d, early_morning] = 1, infeasible (8h rest rule).
- For each (i, d, s): if not availability[i][d][s], x[i,d,s] = 0.
- For each (i, d, s): if employee i doesn't have the required skill for the role, x[i,d,s] = 0.

Soft objective (weighted sum, minimize):
- W_wage × sum(x[i,d,s] × hours[s] × wage[i])
- + W_overcover × max(0, scheduled - demand) summed
- + W_preference × sum((1 - preference_match) × x[i,d,s])
- + W_overtime × max(0, hours_per_employee - 40) summed
- Weights default: W_wage=1.0, W_overcover=0.3, W_preference=2.0, W_overtime=5.0. Document these in the code.

Solver:
- cp_model.CpSolver()
- solver.parameters.max_time_in_seconds = 8
- solver.parameters.num_search_workers = 4

B) `backend/app/api/schedule.py` — endpoints:

- `POST /api/schedule/optimize`:
  - Body: {store_id, week_iso, scenario_id_for_envelope}
  - Calls the solver. Returns {shifts: [{employee_id, day, start, end, role, is_open}], kpis: {employee_match_pct, ot_hours, total_wage, coverage_pct, num_open_shifts}, coverage_trace: per-day per-15min planned-vs-required}.
  - Persists to the Schedule table.

- `POST /api/schedule/{id}/explain`:
  - Body: {edit: {action: 'assign'|'unassign'|'swap', shift_id, employee_id}}
  - Re-runs solver with the proposed edit as an additional constraint.
  - Returns: {delta_wage, delta_match_pct, violated_constraints[], suggested_alternatives[]} where alternatives are 2–3 minimum-cost ways to resolve any violations the edit introduces.

C) Pre-warm the solver:
- On FastAPI startup, after fixture load, fire-and-forget a `optimize` call for the seed store + a default week. Stash the result in memory so the first demo call returns instantly while still running real solver work.

Verification:
- `POST /api/schedule/optimize` with body {store_id: "S-0001", week_iso: "2026-W12"} returns in <5s.
- Coverage_pct = 100% (or, if any open shifts, they're flagged in is_open=true and explained).
- employee_match_pct ≥ 90%.
- total_wage ≤ envelope.max_wages.
- Running again with same inputs gives same outputs (solver determinism via seed).
- `POST /api/schedule/{id}/explain` with a deliberately bad edit (assign Maria to a shift she's unavailable for) returns a non-empty violated_constraints[] with at least one suggested_alternative.
```

---

## Session 6 — Schedule Wizard UI (BNW-019, BNW-020, BNW-021, BNW-022, BNW-023, BNW-024)

**Estimated time**: 3.5h.
**Outcome**: store operator can click through the 5-step Schedule wizard, run the solver, view the schedule grid, make manual edits, and publish.

### Prompt

```
Continuing the c-store WFM build. Solver is live. Now build the 5-step Schedule Optimization wizard UI.

Pre-flight:
1. Re-read `docs/kanban.md` BNW-019 through BNW-024.
2. Open `_reference/7-11_DS/ui_kits/wfm/ScheduleGrid.jsx` — this is the component you'll lift. Also open `_reference/7-11_DS/ui_kits/wfm/kit.css`.
3. Open `_reference/labor-planning-app/index.html` lines 1045–1048 — the Schedules stub. Replace it with a real flow.

Implement:

A) Reuse the wizard shell pattern from the Plan Wizard. Create `schedules.$storeId.tsx` as a Remix route with nested children for the 5 steps. Use the existing `<Stepper>` component.

B) Step 1 Setup (BNW-020):
- Top-left: store selector (defaults to S-0001). Period selector (defaults to ISO week 2026-W12).
- Big "BUDGET ENVELOPE" eyebrow + 3-KPI strip showing approved hours / wages / labor % from the linked scenario.
- A read-only "Source: FY26 Increase Wage Rate (Approved Mar 10, 2026)" line with a small green checkmark icon.
- Next button enabled when both selectors have valid values.

C) Step 2 Demand (BNW-021):
- Stacked area chart of forecasted demand by role for the selected week.
- X-axis: 7 days × 24 hours, with day labels.
- Role toggles at the top — clicking a role toggles its area visibility.
- Drag-to-adjust a region of the chart (snap to 15-min). Adjustments are sent to the optimizer as overrides.
- Caption at the bottom: "AI-generated forecast. Drag any region to override." with a "Reset to AI" link.

D) Step 3 Constraints (BNW-022):
- Table of 12 employees. Columns: Name, Role, Contract (FT/PT pill), Max Hrs/Wk, Hourly Wage (mono), Skills (chip group), Availability (7×24 mini-grid).
- Availability grid cells are clickable to toggle on/off. Hover shows day + time.
- Add an "Add Preference" row action to set preferred shift type per employee.

E) Step 4 Optimize (BNW-023):
- Big primary CTA: "RUN OPTIMIZER" (Archivo, 800, sticker-shadow style).
- On click: show a streaming progress strip — "Solving model… exploring candidate schedules… [animated dot pattern]." Use a fake 2s ramp-up while the real solver runs in the background; pre-warm result returns instantly.
- On result: replace the CTA with a 4-KPI strip:
  - **Employee Match %** (target 96%, signal green if ≥90)
  - **Overtime Hours** (target 0, red if >0)
  - **Total Wage** (mono, formatted $X,XXX, green if ≤envelope)
  - **Coverage** (target 100%, red badge if any gap)
- Below the KPIs: the ScheduleGrid component lifted from the UI kit. Hard-code-replace its WEEK + SHIFTS fixtures with the solver's response. Match role colors via the existing ROLE_COLORS map.
- Open shifts (is_open=true) show the clock icon; manned shifts show employee initial avatars.
- Warn icons appear on shifts the solver flagged for review.

F) Step 5 Review & Publish (BNW-024):
- Same ScheduleGrid as Step 4, but with click-to-edit on shift cards.
- Right-side AI Assistant panel (build a minimal version here; full version in Session 7).
- Manual edit flow: clicking a shift opens a small drawer with "Reassign…" / "Mark Open" / "Delete" actions. On edit, fire POST /api/schedule/{id}/explain. Render the response (delta_wage, delta_match_pct, violated_constraints, alternatives) in the assistant panel.
- Publish CTA at the bottom-right: confirms with a modal (one-sentence: "Publish schedule for week of Mar 16, 2026?"), then writes to fixture state, shows a success toast, and routes back to /schedules.

State guarantees:
- The KPIs in step 4 and step 5 match the solver output exactly.
- Re-entering the wizard for the same store + week shows the previously-optimized schedule (cached, not re-solved).

Verification:
- Click through all 5 steps end-to-end. Run the optimizer. See a populated 7-day grid.
- Make one manual edit (assign Maria to a shift she's unavailable for). See the AI Assistant explain the violation.
- Publish. Routes back to /schedules with a success toast.
- ScheduleGrid colors match the WFM design-system role tokens (no defaults / fallbacks).
```

---

## Session 7 — AI Assistant, Persona Switching, Performance Dashboard (BNW-025 through BNW-031)

**Estimated time**: 3h.
**Outcome**: AI Assistant streams scripted answers with citations; persona switcher works; performance dashboard renders; demo reset button works.

### Prompt

```
Continuing the c-store WFM build. Plan and Schedule flows are end-to-end. Now build the cross-cutting features that complete the demo journey.

Pre-flight: read kanban tickets BNW-025 through BNW-031. Make a todo list per acceptance criterion.

Implement:

A) AI Assistant slide-out (BNW-027, BNW-028):
- `app/components/AiAssistant.tsx`: 380px-wide right-side slide-out, controlled by a zustand store (`ui.assistantOpen`).
- Toggle button: a small floating circle in the bottom-right with the BlueNorth "i" symbol, present on /plans/$id/* and /schedules/$storeId/*.
- Panel header: "Ask BlueNorth" + close button.
- Suggested prompts list (4 scripted, context-aware):
  - On Plan Wizard: "Why did labor % go up?", "Compare to last quarter", "Suggest a wage scenario", "Which prerequisite is blocking?"
  - On Schedule Wizard: "Why is Maria over-scheduled?", "Cheapest way to close the Sat 6am gap?", "Will this pass compliance?", "Compare to last week's actuals"
- Free-text input at the bottom (Send button or Enter).
- Each scripted response is a JSON object in `app/lib/assistant-scripts.ts` with: `chunks[]` (8–20-char text chunks) + `citations[]` (DOM selectors of cards/rows to highlight).
- Render: stream chunks to the textarea every 30ms. After streaming completes, render citation links as superscript chips below the answer.
- Clicking a citation chip scrolls the cited element into view and applies a 1.5s pulse animation (signal-green outline).
- Free-text input returns a deterministic fallback: "I'd need more context on that — try one of the suggested prompts above."

B) Persona switcher behavior (BNW-029, BNW-030):
- Persona is set via the TopBar avatar dropdown (already exists from Session 2). On change, write to zustand `session.persona` and reload the route via `navigate(0)`.
- Carla: full access. Sees "Submit for Review" on Step 6.
- Marco: read-only on Plan wizard steps 1–5. On Step 6, instead of "Submit for Review", sees "Approve" + "Request Changes" buttons (only enabled when scenario.status = In Review). Approve calls `POST /api/scenarios/{id}/approve` and flips status to Approved.
- Lin: sidebar shows only Schedules (other nav items rendered but disabled with a tooltip "Available to your manager only"). Plan wizard pages return a "You don't have access" empty state.
- Avatar bg color changes per persona: Carla = signal-green, Marco = orange, Lin = grape (slurpee palette).

C) Performance dashboard (BNW-025, BNW-026):
- `/performance` route.
- 4-KPI strip: Hours, Wages, Labor %, Forecast Accuracy. Each card has a sparkline (12 periods) with a variance band.
- Variance is computed from fixtures: take the seed scenario's outputs as "plan", and fixture-author a parallel "actuals" array slightly below plan.
- Per-division table below with drill-down (clicking a row navigates to a per-store detail view, which can be a stub for v1).
- "Reforecast Now" button at the top-right: clicking creates a new Draft scenario seeded with current actuals via `POST /api/scenarios` (with a flag `seed_from_actuals: true`) and navigates to its Step 1.

D) Demo reset (BNW-031):
- Hidden behind `?reset=1` query param.
- On detection, calls `POST /api/admin/reset` which truncates the SQLite DB and re-runs the fixture seeder.
- Returns user to /plans with a small "Demo data reset" toast.

Verification:
- Open AI Assistant on Plan Wizard Step 6, click "Why did labor % go up?" — see a streaming response of ~80 chars and at least 2 citation chips that, when clicked, scroll to and highlight the matching card.
- Switch persona to Marco on an In-Review scenario — see Approve + Request Changes buttons. Click Approve — status flips. Switch back to Carla — see the new Approved pill on Plans list.
- Switch to Lin — Schedules is the only enabled nav item.
- Visit /performance — see 4 sparklines with variance bands. Click Reforecast Now — see a new Draft tile on /plans.
- Visit /plans?reset=1 — see a toast and the original 4 scenarios restored.
```

---

## Session 8 — Final Polish, Visual QA, Demo Rehearsal (BNW-032 + QA pass)

**Estimated time**: 3h.
**Outcome**: every screen matches the wireframe within reason; numbers cross-check; demo can be run cold in <15s.

### Prompt

```
Final session. The app works end-to-end. Now make it demo-ready.

Pre-flight: open `docs/qa-plan.md` and use it as your checklist. Also re-read kanban ticket BNW-032 and the PRD §8 acceptance criteria.

Do these in order; don't skip:

A) Visual diff pass.
For each screen, open the screen and `_reference/labor-planning-app/index.html` (or the wireframe JSX in `_reference/7-11_DS/ui_kits/wfm/`) side-by-side at the same zoom. Walk through:
- Header structure (h1 size, subtitle, action buttons).
- Card padding, border-radius, border thickness.
- Pill colors (every status uses the exact design-system pill class).
- Button styles (primary, light, dark, sticker shadow — verify the 5px 5px 0 0 ink shadow on sticker CTAs).
- Eyebrow labels (UPPERCASE, 12px, 0.05em letter-spacing).
- All numbers in mono (JetBrains Mono, not the body font).
- Brand stripe rendering on hover, loading, and accent surfaces.
Note every visual deviation in a todo list, then fix them.

B) Number audit.
For the headline FY26 scenario:
- Plans list tile: "100 locations" / "P10 → P12" / "FY26 Increase Wage Rate"
- Wizard subtitle: "Scenario · 100 locations · Period 10 → Period 12 · Last saved …"
- Step 4 (Wage Rate): Uniform input shows +$0.50/hr; baseline-to-new delta shows $2.40M → $2.46M.
- Step 6 KPI strip: Total Hours = 161,200 (mono, with "hrs" unit); Wages = $2,460,000; Labor % = 15.0% (with "Target 14.8% · within tolerance" caption).
- Step 6 chart: West $680K Budget / $720K Projected; Central $820K / $845K; East $960K / $995K.
- Step 6 table: rows sum to the KPI strip totals. Pills color-coded.
Every one of these must match. Any deviation = fix the fixture or the compute.

C) Performance numbers.
Performance dashboard's sparkline endpoints for the latest period must match what an approved scenario would produce. Fictional actuals show a 0.4% variance — verify that's what the chart band shows.

D) Demo rehearsal.
Run the full demo journey from `docs/prd.md` §3.4 end-to-end, timing yourself. Target ≤12 min:
- Plans list → Open headline scenario → Walk Steps 1–6 → Submit.
- Switch to Marco → Approve.
- Switch to Lin → Open Schedules → Run optimizer → See result → Make one edit → Get AI explanation → Publish.
- Open Performance → Show closed loop.

For each pause point, ask: "Would a stranger understand what's on screen in 3 seconds?" If no, fix the screen.

E) Demo reset rehearsal.
Hit `?reset=1`. Make sure everything resets in <2 seconds. Run the full demo again from cold to make sure reset is clean.

F) Performance pass.
- Lighthouse on /plans → all green.
- Lighthouse on /plans/$id/guidance → all green.
- Profile the schedule grid render — should be <100ms paint.

G) Browser test.
- Chrome (primary demo browser).
- Safari (in case the demo laptop is a Mac).
- Make sure Archivo, DM Sans, JetBrains Mono all load locally (not Google Fonts CDN).

H) Final cleanup.
- Remove all `console.log` statements.
- Remove the `_dev` smoke-test route.
- Hide the persona switcher behind `?persona-switcher=1` in production builds (always-on in dev).
- Add a README at the repo root with: how to install, how to run, how to demo, how to reset.

Definition of done: every checkbox in `docs/prd.md` §8 is ticked. Every checkbox in `docs/qa-plan.md` is ticked. The demo can be run cold in under 15 seconds (npm run dev → /plans is interactive).
```

---

## Operating tips for these sessions

1. **One session, one outcome.** Don't roll work forward into the next session "while you're at it." It breaks the kanban audit trail and makes regressions hard to localize.

2. **Always start with the planning tool.** Make Claude Code list every acceptance criterion from the relevant tickets as todos. Tick them off as you go. If a session ends with un-ticked items, that's a regression — file it as a new ticket.

3. **Resume strategy.** Each session prompt begins with "Continuing the c-store WFM build" and re-reads the relevant docs. This lets you start a fresh Claude Code session with no prior context.

4. **Re-reference the wireframe.** When in doubt, the source of truth is `_reference/labor-planning-app/index.html` for the Plan side and `_reference/7-11_DS/ui_kits/wfm/` for the Schedule side. Don't ad-lib design decisions.

5. **Numbers are sacred.** The 161,200 / $2.46M / 15.0% / 96% headline numbers appear in the kanban, the PRD, the wireframe, and the demo script. If any of those drifts during a session, it's a stop-the-line bug.

6. **When a session takes >150% of estimate**, stop and journal the cause. Either the ticket was wrong-sized or there's a hidden dependency. Update the kanban before continuing.
