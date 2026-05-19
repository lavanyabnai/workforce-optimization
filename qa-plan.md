# QA Plan — C-Store WFM MVP

**Goal**: every demo-blocking acceptance criterion is verifiable, and the demo can survive a hostile Q&A. This is not a comprehensive enterprise QA plan — it's a focused, demo-survival plan.

**Structure**: smoke tests (must pass before any demo), feature tests (per PRD §F), demo-script walk-through, hostile Q&A rehearsal, regression backstop.

---

## 1. Smoke tests (5 min, run before every demo)

These are the "if any of these fails, postpone the demo" tests.

| # | Test | Expected | Pass |
|---|---|---|---|
| S1 | `npm run dev` from repo root | Both servers up, no errors in either terminal | ☐ |
| S2 | Open localhost:3000 | Redirects to /plans, page renders within 2s | ☐ |
| S3 | Hit `?reset=1` | "Demo data reset" toast appears, all 4 fixture scenarios visible | ☐ |
| S4 | Open headline scenario "FY26 Increase Wage Rate" | Wizard loads on Step 1 with all 6 cards rendered | ☐ |
| S5 | Click through Steps 1 → 6 | No broken state, all numbers populate, no console errors | ☐ |
| S6 | Submit on Step 6 | Status flips to "In Review", success toast, back on Plans list | ☐ |
| S7 | Switch persona to Marco, open the just-submitted scenario | "Approve" button visible. Click → status flips to "Approved" | ☐ |
| S8 | Switch persona to Lin, navigate to /schedules/S-0001 | Schedule wizard loads on Step 1 with the approved envelope visible | ☐ |
| S9 | Walk Schedule wizard Steps 1 → 4, click Run Optimizer | Returns in <5s with a populated 7-day grid, KPIs match | ☐ |
| S10 | Open AI Assistant on Plan wizard Step 6, click any scripted prompt | Streaming response with at least one citation link that scrolls when clicked | ☐ |

If any test fails: don't demo. Reset, fix, re-run.

---

## 2. Feature tests (per PRD §F)

### F1 — Sidebar + nav shell

- [ ] F1-T1: All 5 nav items navigate to the correct route.
- [ ] F1-T2: Active route is highlighted with the correct signal-green left-stripe styling.
- [ ] F1-T3: Top-bar avatar dropdown opens; persona switcher shows all 3 personas.
- [ ] F1-T4: User footer shows correct name/role per active persona.
- [ ] F1-T5: 404 page is branded.

### F2 — Plans list

- [ ] F2-T1: 4 fixture scenarios render as tiles with correct status pills.
- [ ] F2-T2: Filter chip "Draft" → only Draft scenarios shown.
- [ ] F2-T3: Filter chip "Approved" → only Approved scenarios shown.
- [ ] F2-T4: Search "FY26" → only matching scenarios shown.
- [ ] F2-T5: Clear filters → all 4 scenarios shown again.
- [ ] F2-T6: "New Scenario" modal opens, accepts a name, creates a Draft, navigates to its Step 1.
- [ ] F2-T7: Tile hover → sticker shadow grows in (5px 5px 0 0 var(--c-ink)).

### F3 — Plan Wizard

#### Step 1 — Prerequisites
- [ ] F3-T1.1: All 6 cards render with correct status pills.
- [ ] F3-T1.2: Labor Standards card starts in "Needs Refresh" (orange border, cream bg).
- [ ] F3-T1.3: Clicking "Refresh from FY26 study →" flips the card to Ready, banner updates to "6 of 6".
- [ ] F3-T1.4: Bottom action bar Next → navigates to Step 2.

#### Step 2 — Operating Hours
- [ ] F3-T2.1: Table renders 100 rows.
- [ ] F3-T2.2: 3 stores show "Deviates" badge.
- [ ] F3-T2.3: Filter "Show deviations only" leaves 3 rows visible.
- [ ] F3-T2.4: Bulk edit toolbar appears when ≥1 row selected.

#### Step 3 — Labor Model
- [ ] F3-T3.1: 3 sections (SPLH, IPLH, Fixed Coverage) all render.
- [ ] F3-T3.2: Editing an SPLH value moves the right-side preview chart within 200ms.
- [ ] F3-T3.3: Adding a Fixed Coverage rule renders a new chip.

#### Step 4 — Wage Rate
- [ ] F3-T4.1: Three mode toggle (Uniform / By Role / By Region) all switchable.
- [ ] F3-T4.2: Uniform $0.50/hr default loads.
- [ ] F3-T4.3: Live ticker updates within 300ms of input change.
- [ ] F3-T4.4: Default value moves baseline $2.40M → $2.46M (printed in mono with the delta visible).

#### Step 5 — Demand Forecast
- [ ] F3-T5.1: Forecast loads within 500ms of step enter.
- [ ] F3-T5.2: Saturday demand > Friday > weekdays (visual inspection of chart shape).
- [ ] F3-T5.3: Editing a cell shows the audit dot.
- [ ] F3-T5.4: "Reset to AI forecast" reverts the override.

#### Step 6 — Run Guidance
- [ ] F3-T6.1: KPI strip values: Total Hours = 161,200; Wages = $2,460,000; Labor % = 15.0%.
- [ ] F3-T6.2: SVG bar chart values: West $680K/$720K; Central $820K/$845K; East $960K/$995K.
- [ ] F3-T6.3: Per-division table rows sum to KPI strip totals.
- [ ] F3-T6.4: Group-by toggle (Region/Division/Period) changes the chart.
- [ ] F3-T6.5: View toggle (Grid/Chart) swaps chart for table.
- [ ] F3-T6.6: Submit for Review → status flips to In Review, navigates to Plans list, toast appears.

### F4 — Schedule Optimization Wizard

#### Step 1 — Setup
- [ ] F4-T1.1: Store + week selectors load with sensible defaults.
- [ ] F4-T1.2: Envelope KPI strip renders 3 numbers from the linked approved scenario.
- [ ] F4-T1.3: "Source: FY26 Increase Wage Rate (Approved …)" line with green checkmark visible.

#### Step 2 — Demand
- [ ] F4-T2.1: Stacked area chart renders 7×24 hours.
- [ ] F4-T2.2: Toggling a role hides its area.
- [ ] F4-T2.3: Drag adjustment snaps to 15-min boundaries.

#### Step 3 — Constraints
- [ ] F4-T3.1: 12 employees in table.
- [ ] F4-T3.2: Availability heatmap is keyboard-navigable.
- [ ] F4-T3.3: Toggling availability cells persists across step navigation.

#### Step 4 — Optimize
- [ ] F4-T4.1: "RUN OPTIMIZER" CTA visible (Archivo 800, sticker shadow).
- [ ] F4-T4.2: Click triggers a streaming progress message.
- [ ] F4-T4.3: Solver returns in <5s.
- [ ] F4-T4.4: KPI strip shows Employee Match % ≥ 90 (signal green); OT = 0 (signal green); Total Wage ≤ envelope; Coverage = 100%.
- [ ] F4-T4.5: ScheduleGrid renders 7-day grid with role-colored shift cards.
- [ ] F4-T4.6: Open shifts show clock icon; manned shifts show employee initials.

#### Step 5 — Review & Publish
- [ ] F4-T5.1: Click a shift → drawer opens with Reassign/Open/Delete options.
- [ ] F4-T5.2: Make a bad edit (Maria → unavailable shift) → AI Assistant explains violation.
- [ ] F4-T5.3: Alternative suggestion is clickable and resolves the violation.
- [ ] F4-T5.4: Publish → success toast → navigates to /schedules.

### F5 — Performance dashboard

- [ ] F5-T1: 4 KPI cards render with sparklines and variance bands.
- [ ] F5-T2: Variance vs plan = ~0.4% (matches research target).
- [ ] F5-T3: Per-division table renders.
- [ ] F5-T4: "Reforecast Now" creates a new Draft and routes into the Plan wizard.

### F6 — AI Assistant

- [ ] F6-T1: Toggle button visible on Plan wizard and Schedule wizard, hidden elsewhere.
- [ ] F6-T2: Opens with smooth slide-in (no jank).
- [ ] F6-T3: All 4 Plan-wizard scripted prompts render distinct responses.
- [ ] F6-T4: All 4 Schedule-wizard scripted prompts render distinct responses.
- [ ] F6-T5: Streaming feels human (chunks every 30ms, not all-at-once).
- [ ] F6-T6: Each citation chip scrolls to and pulse-highlights the cited element.
- [ ] F6-T7: Free-text "random question" returns the deterministic fallback.

---

## 3. Cross-cutting checks

### Number audit (the demo's reputational anchor)

Every one of these numbers must match across UI, backend, fixture, and demo script:

| Number | Where it appears |
|---|---|
| **161,200** | Step 6 KPI; sum of per-division table hours; backend `/run` response |
| **$2,460,000** | Step 6 KPI; sum of per-division wages; backend `/run` response; Step 4 ticker |
| **15.0%** | Step 6 KPI; backend `/run` response |
| **14.8%** | Step 6 "Target" caption; labor_standards.json |
| **96%** | Schedule Step 4 KPI; solver response |
| **100 locations** | Plans list tile; wizard subtitle; stores.json count |
| **38 / 32 / 30** | Per-division breakdown table; stores.json regional split |

Run: `grep -r "161,200\|2,460,000\|15\.0%\|96%\|100 locations\|38\|32\|30" frontend/app backend/app/fixtures` and verify every occurrence is contextually correct.

### Branding compliance

- [ ] All sticker-shadow CTAs use `box-shadow: 5px 5px 0 0 var(--c-ink)` + 2px ink border.
- [ ] All eyebrow labels are UPPERCASE, 12px, 0.05em letter-spacing, Archivo 800.
- [ ] All money is JetBrains Mono.
- [ ] All hour counts are JetBrains Mono.
- [ ] Primary CTAs are signal green (#00C36C).
- [ ] Hero/marketing backgrounds are ink (#0A0A0A).
- [ ] No emoji anywhere in the UI.
- [ ] No soft gradients in UI chrome.
- [ ] 7-Eleven wordmark uses the SVG from `assets/`, never redrawn.

### Performance

- [ ] Plans list paints in <1s on a cold load.
- [ ] Plan wizard Step 6 KPI strip renders in <1.5s from step enter.
- [ ] Schedule optimizer returns in <5s.
- [ ] No layout shift (CLS) on initial load of any route.
- [ ] No console errors or warnings across the full demo path.

### Cross-browser

- [ ] Chrome 130+ (primary demo browser).
- [ ] Safari 17+ (backup).
- [ ] Edge 130+ (just in case the demo machine is corporate Windows).

---

## 4. Demo script walk-through (timing-aware)

Run the full demo journey from `prd.md` §3.4 with a stopwatch. Target ≤12 minutes.

Per pause point, ask:
1. Can a stranger understand what's on screen in 3 seconds?
2. Does every visible number obviously have a backstory I can defend?
3. Would I be embarrassed by anything if a customer pointed at it?

| Time | Beat | Pass |
|---|---|---|
| 0:00 | Plans list opens. 4 tiles visible. Headline tile is in middle. | ☐ |
| 0:30 | Open headline scenario. Subtitle says "100 locations · Period 10 → Period 12". | ☐ |
| 1:00 | Step 1 walks through. Labor Standards "Needs Refresh" is the visual interest point. | ☐ |
| 2:00 | Refresh Labor Standards. Banner counter ticks up. | ☐ |
| 2:30 | Step 2: filter to deviations. 3 stores. Explains the franchisee/24-7 problem. | ☐ |
| 3:30 | Step 3: live preview shows the SPLH+IPLH+Fixed-coverage curve. | ☐ |
| 4:30 | Step 4: $0.50/hr wage bump. Ticker moves $2.40M → $2.46M visibly. | ☐ |
| 5:00 | Step 5: AI forecast curve. Mention "real product would use LightGBM + weather + events". | ☐ |
| 5:30 | Step 6: KPIs populate. 161,200 / $2.46M / 15.0%. Submit. | ☐ |
| 6:00 | Switch persona to Marco. Open scenario. Approve. | ☐ |
| 7:30 | Switch persona to Lin. /schedules/S-0001. Step 1 envelope shows approved values. | ☐ |
| 8:00 | Walk Steps 2 (demand), 3 (constraints). Step 4 Run Optimizer. | ☐ |
| 8:30 | Solver returns. Match 96%, OT 0, wage within envelope. | ☐ |
| 9:30 | Step 5: make a bad edit (Maria to unavailable shift). AI Assistant explains. | ☐ |
| 10:30 | Click suggested alternative. Violation resolves. Publish. | ☐ |
| 11:00 | Open /performance. Show closed loop (0.4% variance vs plan). | ☐ |
| 11:30 | Wrap. Q&A. | ☐ |

---

## 5. Hostile Q&A rehearsal

For each question, the answer + the screen to show. Practice these out loud.

| Q | A | Show |
|---|---|---|
| "Where does the forecast actually come from?" | Synthetic for the demo. Production uses LightGBM + weather + local events, like Legion. The wireframe is what the AI-generated output would look like. | Step 5 chart. |
| "How does this differ from Legion?" | Three things: 1) C-store-specific labor model (SPLH + IPLH + fixed coverage in one), 2) franchisee/corporate dual P&L view, 3) Indian GCC delivery cost. Plus we're not married to a US-only customer base. | Research §7. |
| "Why MILP and not heuristics?" | MILP gives provably optimal solutions on this problem size (<200 employees per store). We use CP-SAT, which handles the c-store week in <5s and gives us sensitivity analysis for free — change SPLH, see the cost. | Run optimizer live. |
| "What happens at 1000 stores?" | Per-store optimizer is independent; we parallelize. Plan-level rollup happens in the FastAPI compute, which scales linearly. We can show the math. | Performance dashboard. |
| "How does this fit with Workday?" | Workday remains the system of record for scheduling and HRIS. We publish a "guidance bundle" that Workday consumes — they keep the employee app, we keep the planning + optimization. | (Verbal.) |
| "What about predictive scheduling laws (CA, NY)?" | v1 surfaces the constraint to the operator (min-rest, advance-notice). v2 enforces it in the optimizer. We have the model; we don't have the v1 UI surface for this MVP. | (Honest answer.) |
| "Is the wage delta computation right? It looks too simple." | The demo uses uniform-or-by-role. Production would model wage compression effects, OT thresholds, and shift-differential. We can mock that in 2 sprints if it's a buying objection. | Step 4. |
| "Why didn't you just use Tailwind?" | The 7-Eleven design system has its own token file; Tailwind would have introduced two competing systems. Vanilla CSS + tokens kept the build closer to production-grade. | Tech stack slide. |
| "Can I see the OR-Tools model code?" | Yes — backend/app/solver/milp.py. Hard constraints first, soft objectives as weighted sum, all weights documented. | Open file in editor. |
| "Show me a failure case." | Try the persona switcher → Lin → Plan wizard. Empty state with "You don't have access" — RBAC works. Or click "Mark Open" on every shift in Schedule Step 5 → coverage falls, KPI goes red, AI Assistant explains. | Live demo. |

---

## 6. Feedback collection structure

Right after the demo, capture feedback in this structure (1-pager per audience member if needed):

```
Demo date: ___
Audience: ___ (role, company)

OVERALL RECEPTION (1–5): _

WHAT RESONATED (verbatim quotes):
1.
2.
3.

WHAT FELT WEAK OR CONFUSING:
1.
2.

OBJECTIONS RAISED:
1.
2.

SPECIFIC FEATURES THEY ASKED ABOUT:
1.
2.

QUESTIONS I COULDN'T ANSWER ON THE SPOT:
1.
2.

EXPLICIT NEXT STEPS (if any):
- Follow up by: ___
- Owner: ___
- Action: ___

DEMO-PRODUCT GAPS TO FILE AS TICKETS:
1. (description) — (where in the journey it hit)
2. ...
```

File the gaps as BNW-### tickets in the kanban backlog within 24h. Don't lose the signal.

---

## 7. Regression backstop

Before every subsequent demo:

1. Run all S1–S10 smoke tests.
2. Run the number audit (`grep` check on the 7 sacred numbers).
3. Walk the demo journey once at 0.5× speed, looking for any visual or numeric regression introduced since the last demo.
4. Hit `?reset=1` and verify clean state.

If any of these fails: don't demo. Fix first.
