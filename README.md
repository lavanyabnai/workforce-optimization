# BlueNorth WFM — C-Store Labor Planning Demo

A Legion-class **Labor Planning + Schedule Optimization** demo for 7-Eleven c-stores, built with Remix (frontend) and FastAPI + OR-Tools (backend).

---

## Install

**Prerequisites**: Node 20+, Python 3.11+, `uv` (Python package manager)

```bash
# From the repo root
npm install

# Install Python deps (runs inside backend/.venv)
cd backend
uv sync
cd ..
```

---

## Run

```bash
# From the repo root — starts both servers concurrently
npm run dev
```

- Frontend: http://localhost:3000 (Remix + Vite)
- Backend: http://localhost:8000 (FastAPI)
- API docs: http://localhost:8000/docs

Both servers hot-reload on file changes.

---

## Demo walkthrough (~12 min)

Open http://localhost:3000 — you land on the Plans list.

| Time | Step |
|------|------|
| 0:00 | **Plans list** — 4 fixture scenarios. Click "FY26 Increase Wage Rate". |
| 1:00 | **Step 1 Prerequisites** — 5 of 6 ready. Click "Refresh from FY26 study →" on Labor Standards. |
| 2:30 | **Step 2 Operating Hours** — filter "Show deviations only" → 3 stores. |
| 3:30 | **Step 3 Labor Model** — edit SPLH targets; preview chart updates live. |
| 4:30 | **Step 4 Wage Rate** — $0.50/hr uniform. Ticker: $2.40M → $2.46M. |
| 5:00 | **Step 5 Demand Forecast** — AI-generated heatmap; Sat peak visible. |
| 5:30 | **Step 6 Run Guidance** — KPIs: 161,200 hrs · $2.46M · 15.0%. Submit. |
| 6:00 | **Switch persona → Marco** (avatar menu top-right). Open scenario. Approve. |
| 7:30 | **Switch persona → Lin**. Open Schedules → S-0001 Sunnyvale Plaza. |
| 8:00 | Walk Steps 1–3. Step 4: Run Optimizer (<5 s). Grid populates. |
| 9:30 | **Step 5 Review** — click an open shift → AI explains violation → accept suggestion. Publish. |
| 11:00 | **Performance** — sparklines, 0.4% variance vs plan. Reforecast Now → new Draft. |

---

## Reset demo data

```
http://localhost:3000/?reset=1
```

Wipes the in-memory backend state and reloads all fixtures. Returns to the Plans list with a toast. Should complete in under 2 seconds.

---

## Persona switcher

The persona switcher (avatar menu → Switch Persona) is visible automatically on localhost. On any other host, append `?persona-switcher=1` to any URL to enable it — the flag persists via `localStorage` for the session.

| Persona | Name | Access |
|---------|------|--------|
| Carla K. | VP Operations | Full read/write on Plans + Schedules |
| Marco T. | Regional Manager | Read-only on Plans; Approve button when In Review |
| Lin H. | Sr Manager | Schedules only; no Plans access |

---

## Sacred demo numbers

Do not change these individually — they form a coherent story across every screen.

| Number | Appears in |
|--------|-----------|
| **161,200** hrs | Step 6 KPI · Performance |
| **$2,460,000** wages | Step 6 KPI · Step 4 ticker end-state · Performance |
| **15.0%** labor % | Step 6 KPI |
| **14.8%** target labor % | Step 6 caption · labor_standards.json |
| **100 locations** | Plans tile · Wizard subtitle |
| **P10 → P12** | Plans tile · Wizard subtitle |
| **$0.50/hr** wage delta | Step 4 uniform input |
| **W $680K→$720K · C $820K→$845K · E $960K→$995K** | Step 6 division chart |

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Remix 2.x · Vite 5.4 · TypeScript · Zustand |
| Backend | FastAPI · uv · OR-Tools CP-SAT |
| Fonts | Archivo · DM Sans · JetBrains Mono (self-hosted, no CDN) |
| Fixtures | JSON files loaded into memory on startup |

No database — all state is in-memory, reset-safe via `?reset=1`.
