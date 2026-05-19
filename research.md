# Research: Labor Planning & Schedule Optimization for C-Stores

**Phase 2 deliverable** — informs PRD scope, feature prioritization, and demo narrative.
**Reference customer**: 7-Eleven (corporate-managed + franchised c-stores, US).
**Reference product**: Legion WFM (Labor Planning + Optimized Scheduling).

---

## 1. Why c-stores are a different WFM problem

C-stores aren't grocery, aren't QSR, and aren't pure retail. They sit at the intersection of all three, which is exactly why a Legion-style clone needs c-store-specific modeling. The differences that matter for an MVP:

| Dimension | Grocery / Big-Box | QSR | **C-Store (7-Eleven)** |
|---|---|---|---|
| **Hours** | 16h, fixed | 12–18h, fixed | **24/7, almost always** |
| **Min crew/shift** | 8–20 | 4–10 | **1–3** (often a single clerk overnight) |
| **Demand drivers** | Sales $, basket size | Order count, daypart | **Foot traffic + fuel volume + foodservice tickets + 7NOW delivery** |
| **Labor model unit** | SPLH / IPLH | Transactions per labor hour | **Hybrid: SPLH for retail, task-time for foodservice prep, fixed coverage for overnight** |
| **Workforce** | Tenured, scheduled weeks ahead | High-churn, flex | **High-churn + 24/7 + franchise variability** |
| **Key constraint** | Union rules | Drive-thru SLAs | **Single point of failure: one no-show on overnight = unsafe + non-compliant** |

The single-clerk overnight shift is the operationally critical case. Coverage isn't a "nice schedule" outcome — it's a safety/compliance floor that the optimizer has to treat as a hard constraint, not a soft preference.

## 2. The real labor problem at 7-Eleven (2024–2026)

What's actually happening on the ground (cited because this drives the demo's "so what"):

- Franchisees of 7-Eleven are asking the c-store chain to drop its requirement that stores operate around the clock—a signature of the brand—because they can't find enough workers to staff the overnight shifts. This is the strongest possible signal that **scenario modeling for "what if we close overnight at low-volume stores" is a real corporate question**, not an academic feature.
- Many franchisees project that their overnight sales will barely cover the higher wages they'll need to pay to staff the graveyard shifts. So the demo needs to expose **break-even labor % per daypart**, not just per store.
- The brand's effort to become more like a quick-service restaurant by offering freshly prepared grab-and-go foods has increased stores' need for labor. Foodservice prep is a separate work-content driver from the cashiering line — the labor model must split them.
- 7-Eleven currently runs Workday for human capital management and workflows like scheduling and shift management. So the wedge for a Legion clone is **AI-native planning + scenario modeling**, not basic scheduling — Workday already does the latter.
- RITA, an AI-enabled assistant that "recruits individuals through automation," has helped 7-Eleven reduce store labor hours by 40,000 on a weekly basis. Operations is already comfortable with AI in the labor stack. The demo can lean confidently into "AI Assistant" features.

## 3. Industry challenges in 24/7 c-store scheduling

From a synthesis of operator-facing sources:

- Rotating shifts and overnight work can lead to fatigue and burnout. Employees often struggle with disrupted sleep patterns and inconsistent routines. → fairness rules in the optimizer (max consecutive nights, min rest between shifts).
- 24/7 workplaces tend to have higher turnover rates due to the physical and mental demands of shift work. Constant onboarding and training increase operational costs. → schedule should weight tenure / experience mix per shift.
- 24/7 means 168 hours per week per position. One employee working 40 hours covers roughly 24% of those hours. So baseline coverage for a single store with one clerk on at all times is ~4.2 FTE before any cross-coverage, breaks, or PTO. This number is the **headline KPI** for the demo's "Run Guidance" screen.
- Many reviews mention the lack of proper breaks during shifts. In some locations, you might work an entire 8-9 hour shift without being able to sit down or take a proper meal break. → break compliance is a feature users will trust, not a checkbox.

## 4. Labor-model fundamentals (the math behind the screens)

### 4.1 SPLH (Sales Per Labor Hour) — the headline metric

SPLH is calculated by dividing a store's total sales by their total labor hours for a given period. The formula is:

```
SPLH = Total Sales Revenue / Total Labor Hours
```

To go from a forecast to a labor budget, the planner flips it:

```
Labor Hours Needed = Forecasted Sales / Target SPLH
```

Per Anticipated sales / SPLH target = Labor hours to schedule, this is the canonical demand→labor translation that the Run Guidance screen renders.

### 4.2 Why pure SPLH falls apart in c-stores

Payroll percent and sales per labor hour (SPLH) are no longer appropriate means of controlling the labor used in your stores. No two stores are created equal. The classic example: store A sells mostly Bologna at $1.99 a pound and Store B sells more upscale meats like Roast Beef at $8.99 a pound, should one earn more labor than the other? SPLH would give them both the same hours.

C-store translation: a high-fuel, low-basket forecourt store and a high-foodservice urban store can both do $50K/wk but need very different labor mixes. So the labor model must combine:

1. **SPLH (variable)** — for cashiering / retail floor, driven by transactions.
2. **IPLH or task-time (variable)** — for foodservice prep, driven by units produced. Budgeted items per labor hour (IPLH) measures the budgeted items sold for every hour worked as defined by your organization.
3. **Fixed coverage (constant)** — for overnight, fuel attendant, cleaning. Driven by hours-open, not sales.

The Labor Model screen in the demo must show all three drivers blended into a single curve.

### 4.3 Labor % targets for c-stores with foodservice

Convenience Stores (c-stores) with foodservice: 20%–30% depending on the service model. The demo's default labor % target is **15% for traditional c-store** and **22% for foodservice-heavy c-store**, anchored to industry benchmarks but presented as configurable.

## 5. Optimization model (math that powers Schedule Optimization)

Staff scheduling is well-studied as a constraint optimization problem. From the literature: Staff scheduling problems arise whenever there is the need for efficient management and distribution of workforce over periods of time... even a basic variant of this problem belongs to the class of NP-hard problems.

For the MVP, we model it as a **MILP** with:

- **Decision variables**: `x[i,j,t] ∈ {0,1}` — employee `i` works shift `j` on day `t`.
- **Hard constraints**:
  - Coverage floor per role per 15-min interval (from demand forecast × labor standards).
  - Max hours/week per employee (FT vs PT contract).
  - Min rest between shifts (8–11h depending on jurisdiction).
  - No double-booking (one shift per day per employee, unless split-shift allowed).
  - Skill match (only food-handler-certified employees on foodservice).
- **Soft objectives** (weighted):
  - Minimize total wage cost.
  - Maximize employee preference satisfaction (the "96% match" Legion claim).
  - Minimize OT.
  - Penalize over-coverage (filler hours).

Solver: **Google OR-Tools CP-SAT** (handles 100s of employees × weekly horizon in <30s; well-aligned with my existing OR-Tools work). Backend produces both the optimal schedule and a sensitivity table ("what does it cost to move SPLH from 15% to 14.5%?").

## 6. Competitive landscape — what Legion does that we must match

From the uploaded Legion product pages, the table-stakes features for the MVP:

**Labor Planning**:
1. AI-driven demand forecasting at the interval level (15-min buckets).
2. True bottom-up budgeting — translate forecast → hours → dollars using labor standards.
3. Scenario-based what-if (wage increase, demand shock, store closure).
4. Closed-loop reforecasting (actuals vs plan, with auto-refresh).
5. Plan-to-execution handoff (approved plan → scheduler guidance).

**Schedule Optimization**:
1. AI-powered demand forecasting (location-specific, weather/events).
2. Labor optimization engine (forecast × standards × constraints).
3. Automated schedule creation with continuous optimization.
4. Productivity-driven employee placement (rank by performance).
5. AI scheduling assistants (natural-language edits, explanations).
6. Schedule analytics & real-time tracking.

Legion claims headline numbers we should reproduce as demo metrics: **96% schedule-to-employee match, 50% reduction in scheduling time, 13× ROI**. These will appear in our top-line KPI strip.

## 7. The c-store-specific differentiators we add

Things Legion's generic platform doesn't surface but a c-store user would immediately notice:

| Feature | Why c-store-specific |
|---|---|
| **Single-clerk-overnight risk panel** | Safety constraint; not a generic retail concern. |
| **Fuel-volume-driven labor** | Forecourt staffing tied to gallons sold, not $ sales. |
| **Foodservice prep timing** | Hot food has a 4-hour holding limit; prep windows must align with daypart demand. |
| **7NOW driver scheduling** | Delivery is a separate role with separate productivity model. |
| **Franchisee P&L view** | Each store is its own business; budget approval flows through the franchisee, not just region. |
| **Daypart break-even** | Show wage-vs-revenue per 4-hour daypart, critical for the "close at night?" decision. |

## 8. User personas

Three personas matter for the demo journey:

1. **Carla K., Labor Planner** (HQ Bedford Park, IL — corporate stores). Builds quarterly plans, models scenarios, hands off to the field. Owns the **Plans** view.
2. **Marco T., Regional Field Ops** (West Coast region, 100 stores). Reviews & approves plans, monitors plan-vs-actual. Owns the **Performance** view.
3. **Lin H., Store Operator** (single 7-Eleven, San Jose). Receives approved guidance, builds weekly schedule, runs the floor. Owns the **Schedules** view.

The demo journey will walk one scenario across all three personas to show closed-loop planning end-to-end.

## 9. Demo data anchors (so numbers tell a coherent story)

Per the wireframe's existing fixtures, the demo will keep:
- Scenario: "FY26 Increase Wage Rate" — model $0.50/hr wage bump across 100 West Coast stores, P10–P12.
- Baseline: FY25 Annual Budget, approved Dec 15, 2025.
- Headline: Total Hours 161,200 · Wages $2.46M · Labor % 15.0% (target 14.8%).
- Per-division split: West (38 stores), Central (32 stores), East (30 stores).

The Schedule Optimization view (new in our build, not in the existing wireframe) will use:
- Store: Sunnyvale Plaza (single-store deep dive).
- Week: ISO week 12, 2026.
- Roles: Store Manager, Shift Lead, Cashier, Sales Associate, Food Service, Coffee Bar, 7NOW Driver (matching the WFM UI kit color tokens).
- Headcount: 12 employees (mix of FT/PT).

## 10. Open questions for the demo audience (anticipate Q&A)

1. **Forecasting model**: how do we handle structural breaks (new store, remodel)? → Hierarchical Bayesian, fall back to cluster average for cold-start.
2. **Franchisee data sharing**: does corporate see store-level employee data? → No PII below role/skill level in the corporate view; only the franchisee sees names.
3. **Workday integration**: how does our plan get into Workday's scheduler? → API-first; we publish a "guidance bundle" (hours, dollars, daypart curve) that Workday consumes.
4. **Compliance scope**: which jurisdictions in v1? → CA, NY, IL, TX (covers most predictive-scheduling laws + meal-break rules).
5. **Why not just buy Legion?**: c-store-specific labor model + Indian GCC delivery cost + faster customization cycle.

---

## Sources used

1. Legion product pages (uploaded): Labor Planning, Schedule Optimization.
2. Restaurant Business Online — 7-Eleven franchisee overnight letter, Jan 2026.
3. C-Store Dive — 7-Eleven AI recruiter RITA, Oct 2024.
4. Chain Store Age — 7-Eleven on Workday + Paradox, Feb 2026.
5. Xenia — 24/7 shift schedules math, Mar 2026.
6. Logile — SPLH vs IPLH for retail productivity, Oct 2025.
7. tSCG — Labor standards (the Bologna-vs-Roast-Beef argument).
8. Paytronix — c-store-with-foodservice labor % benchmark, Jul 2025.
9. TimeForge / 7shifts / TimeWellScheduled — SPLH mechanics, 24/7 challenges.
10. NCBI / PMC — staff scheduling as NP-hard / MaxSAT formulation.
