import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";

export const meta: MetaFunction = () => [{ title: "Dashboard — BlueNorth WFM" }];
export const handle = { pageTitle: "Dashboard" };

type Scenario = {
  id: string;
  name: string;
  status: "Draft" | "In Review" | "Approved" | "Live";
  period_start: number;
  period_end: number;
  locations: number;
  updated_at: string;
};

export async function loader() {
  const res = await fetch("http://localhost:8000/api/scenarios");
  if (!res.ok) throw new Error("Failed to load scenarios");
  const scenarios: Scenario[] = await res.json();
  return json({ scenarios });
}

// ── Sacred headline numbers (from the FY26 Live plan) ─────────────────────────
const KPI_HOURS    = 161_200;
const KPI_WAGES    = "$2.46M";
const KPI_LABOR    = 15.0;
const KPI_STORES   = 100;

const PIPELINE_STAGES: Array<{ status: string; color: string }> = [
  { status: "Draft",     color: "var(--c-ink-30)" },
  { status: "In Review", color: "var(--c-orange)"  },
  { status: "Approved",  color: "var(--c-signal)"  },
  { status: "Live",      color: "var(--c-ink)"     },
];

function statusPillClass(s: string) {
  switch (s) {
    case "Draft":     return "pill pill-grey";
    case "In Review": return "pill pill-orange";
    case "Approved":  return "pill pill-green";
    case "Live":      return "pill pill-ink pill--dot";
    default:          return "pill pill-grey";
  }
}

function formatPeriod(start: number, end: number) {
  return start === end ? `P${start}` : `P${start} → P${end}`;
}

function formatUpdated(iso: string) {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { scenarios } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const counts = scenarios.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const recent = [...scenarios].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-xl)" }}>
        <div>
          <span className="eyebrow">FY26 · All Divisions</span>
          <h1 style={{ margin: "var(--space-xs) 0 0" }}>Dashboard</h1>
          <p className="subtitle">Labor planning overview · 100 stores · West / Central / East</p>
        </div>
        <button
          className="btn btn-sticker"
          type="button"
          style={{ marginTop: 4, flexShrink: 0 }}
          onClick={() => navigate("/plans")}
        >
          + New Scenario
        </button>
      </div>

      {/* ── 4-KPI strip ── */}
      <div className="kpi-strip perf-kpi-strip" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="kpi-card">
          <span className="kpi-card__label">Annualized Hours</span>
          <span className="kpi-card__value">
            {KPI_HOURS.toLocaleString()}
            <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 6, opacity: 0.6 }}>hrs</span>
          </span>
          <span className="kpi-card__caption">FY26 Live plan · 100 stores</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-card__label">Labor Budget</span>
          <span className="kpi-card__value">{KPI_WAGES}</span>
          <span className="kpi-card__caption">+$0.50/hr wage adjustment applied</span>
        </div>

        <div className="kpi-card kpi-card--accent">
          <span className="kpi-card__label">Labor %</span>
          <span className="kpi-card__value">{KPI_LABOR.toFixed(1)}%</span>
          <span className="kpi-card__caption">Target 14.8% · within tolerance</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-card__label">Active Locations</span>
          <span className="kpi-card__value">{KPI_STORES}</span>
          <span className="kpi-card__caption">W 38 · C 32 · E 30</span>
        </div>
      </div>

      {/* ── Plan pipeline + Quick actions ── */}
      <div className="split-2" style={{ gap: "var(--space-xl)", alignItems: "start", marginBottom: "var(--space-xl)" }}>

        {/* Plan pipeline */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-lg)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Plan Pipeline
            </h3>
            <Link to="/plans" className="btn btn-light btn-sm">View All →</Link>
          </div>

          <div style={{ display: "flex", gap: 0 }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const count = counts[stage.status] ?? 0;
              const isFirst = i === 0;
              const isLast  = i === PIPELINE_STAGES.length - 1;
              return (
                <div
                  key={stage.status}
                  style={{
                    flex: 1,
                    padding: "var(--space-md) var(--space-sm)",
                    textAlign: "center",
                    background: count > 0
                      ? `color-mix(in srgb, ${stage.color} 10%, transparent)`
                      : "var(--c-cream)",
                    border: `1px solid ${count > 0 ? stage.color : "var(--c-ink-10)"}`,
                    borderRight: isLast ? undefined : "none",
                    borderRadius: isFirst
                      ? "var(--radius-md) 0 0 var(--radius-md)"
                      : isLast
                      ? "0 var(--radius-md) var(--radius-md) 0"
                      : 0,
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 28,
                    fontWeight: 700,
                    color: count > 0 ? stage.color : "var(--c-ink-20)",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}>
                    {count}
                  </div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--c-ink-60)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                    {stage.status}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: "var(--c-ink-60)", margin: "var(--space-md) 0 0" }}>
            {scenarios.length} total scenario{scenarios.length !== 1 ? "s" : ""} · FY26 planning cycle
          </p>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, margin: "0 0 var(--space-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Quick Actions
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {[
              {
                label:  "New Labor Plan",
                sub:    "Start a wage or demand scenario",
                to:     "/plans",
                accent: true,
              },
              {
                label:  "Optimize Schedules",
                sub:    "Run the OR-Tools optimizer for a store",
                to:     "/schedules",
                accent: false,
              },
              {
                label:  "View Performance",
                sub:    "Plan vs. actuals across all 100 stores",
                to:     "/performance",
                accent: false,
              },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => navigate(a.to)}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  padding:        "10px var(--space-md)",
                  border:         a.accent ? "1.5px solid var(--c-signal)" : "var(--border-default)",
                  borderRadius:   "var(--radius-md)",
                  background:     a.accent ? "var(--c-signal-light)" : "var(--c-white)",
                  cursor:         "pointer",
                  textAlign:      "left",
                  transition:     "box-shadow var(--transition-fast), background var(--transition-fast)",
                  width:          "100%",
                  fontFamily:     "var(--font-body)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--c-ink)" }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-ink-60)", marginTop: 2 }}>
                    {a.sub}
                  </div>
                </div>
                <span style={{ color: a.accent ? "var(--c-signal-dark)" : "var(--c-ink-30)", fontSize: 18, lineHeight: 1 }}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent plans table ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Recent Plans
          </h3>
          <Link to="/plans" style={{ fontSize: 12, color: "var(--c-signal-dark)", fontWeight: 600 }}>
            View all →
          </Link>
        </div>

        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Scenario</th>
              <th>Period</th>
              <th>Locations</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr
                key={s.id}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/plans/${s.id}/prerequisites`)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/plans/${s.id}/prerequisites`);
                }}
              >
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center" }}>
                  {formatPeriod(s.period_start, s.period_end)}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center" }}>
                  {s.locations}
                </td>
                <td>
                  <span className={statusPillClass(s.status)}>{s.status}</span>
                </td>
                <td style={{ textAlign: "right", fontSize: 12, color: "var(--c-ink-60)" }}>
                  {formatUpdated(s.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
