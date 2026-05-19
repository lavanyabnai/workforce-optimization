import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { apiUrl } from "~/lib/api";

export const meta: MetaFunction = () => [{ title: "Performance — BlueNorth WFM" }];
export const handle = { pageTitle: "Performance" };

// ── Fixture data (12 periods, plan vs actuals) ─────────────────────────────

const PERIODS = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);

const HOURS_PLAN    = [13200,13400,13100,13600,13800,14200,13900,13700,13500,13300,13100,13400];
const HOURS_ACTUAL  = [12540,13000,12350,13150,13100,13820,13310,13100,12910,12870,12970,13346];

const WAGES_PLAN    = [201000,204000,198000,207000,210500,216000,212000,208500,205000,202000,199000,197000];
const WAGES_ACTUAL  = [193200,197000,190400,199100,203000,209000,204900,200200,197300,195000,196200,196200];

const SALES_BASE    = [1_366_000,1_380_000,1_350_000,1_400_000,1_425_000,1_460_000,1_440_000,1_420_000,1_400_000,1_380_000,1_360_000,1_340_000];

const LABOR_PCT_PLAN   = WAGES_PLAN.map((w, i) => parseFloat((w / SALES_BASE[i] * 100).toFixed(1)));
const LABOR_PCT_ACTUAL = WAGES_ACTUAL.map((w, i) => parseFloat((w / SALES_BASE[i] * 100).toFixed(1)));

const FORECAST_ACC_PLAN   = Array(12).fill(95.0) as number[];
const FORECAST_ACC_ACTUAL = [93.5,94.2,91.8,95.1,94.8,96.2,93.7,94.5,92.3,95.0,93.8,94.1];

const DIVISION_DATA = [
  { name: "West",    stores: 38, plan_hours: 61256, actual_hours: 58300, plan_wages: 720_000, actual_wages: 697_000, plan_labor_pct: 12.9, actual_labor_pct: 12.5 },
  { name: "Central", stores: 32, plan_hours: 51584, actual_hours: 49200, plan_wages: 845_000, actual_wages: 820_000, plan_labor_pct: 16.1, actual_labor_pct: 15.6 },
  { name: "East",    stores: 30, plan_hours: 48360, actual_hours: 46100, plan_wages: 995_000, actual_wages: 965_000, plan_labor_pct: 17.8, actual_labor_pct: 17.3 },
];

// ── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({
  plan,
  actual,
  bandPct = 0.05,
}: {
  plan: number[];
  actual: number[];
  bandPct?: number;
}) {
  const W = 220, H = 56;
  const PAD = 4;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const allVals = [...plan, ...actual];
  const minV = Math.min(...allVals) * (1 - bandPct * 1.5);
  const maxV = Math.max(...allVals) * (1 + bandPct * 0.5);
  const range = maxV - minV || 1;

  function scaleX(i: number) { return PAD + (i / (plan.length - 1)) * innerW; }
  function scaleY(v: number) { return PAD + innerH - ((v - minV) / range) * innerH; }

  const planPts  = plan.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`).join(" ");
  const actualPts = actual.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`).join(" ");

  // Variance band: plan ± bandPct%
  const bandTop = plan.map((v, i) => `${scaleX(i)},${scaleY(v * (1 + bandPct))}`).join(" ");
  const bandBot = [...plan].reverse().map((v, i, arr) => `${scaleX(arr.length - 1 - i)},${scaleY(v * (1 - bandPct))}`).join(" ");
  const bandPath = `M${bandTop} L${bandBot} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} aria-hidden="true">
      {/* variance band */}
      <path d={bandPath} fill="var(--c-signal)" opacity={0.12} />
      {/* plan line */}
      <path d={planPts} fill="none" stroke="var(--c-ink-40)" strokeWidth={1.5} strokeDasharray="3 2" />
      {/* actual line */}
      <path d={actualPts} fill="none" stroke="var(--c-signal-dark)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* last-point dot */}
      <circle cx={scaleX(actual.length - 1)} cy={scaleY(actual[actual.length - 1])} r={3} fill="var(--c-signal-dark)" />
    </svg>
  );
}

// ── KPI card with sparkline ────────────────────────────────────────────────

function KpiCard({
  label,
  plan,
  actual,
  format,
  caption,
}: {
  label: string;
  plan: number[];
  actual: number[];
  format: (v: number) => string;
  caption?: string;
}) {
  const latest = actual[actual.length - 1];
  const latestPlan = plan[plan.length - 1];
  const delta = ((latest - latestPlan) / Math.abs(latestPlan)) * 100;
  const deltaPos = delta >= 0;

  return (
    <div className="kpi-card perf-kpi-card">
      <span className="kpi-card__label">{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-xs)", marginBottom: 4 }}>
        <span className="kpi-card__value" style={{ fontSize: 22 }}>{format(latest)}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: deltaPos ? "var(--c-signal-dark)" : "#e06c4a",
            fontFamily: "var(--font-mono)",
          }}
        >
          {deltaPos ? "+" : ""}{delta.toFixed(1)}% vs plan
        </span>
      </div>
      <Sparkline plan={plan} actual={actual} />
      {caption && (
        <span className="kpi-card__caption" style={{ marginTop: 4 }}>{caption}</span>
      )}
    </div>
  );
}

// ── Division table ────────────────────────────────────────────────────────────

function DivisionTable({ onDrillDown }: { onDrillDown: (name: string) => void }) {
  return (
    <table className="data-table" style={{ width: "100%" }}>
      <thead>
        <tr>
          <th>Division</th>
          <th style={{ textAlign: "right" }}>Stores</th>
          <th style={{ textAlign: "right" }}>Plan Hours</th>
          <th style={{ textAlign: "right" }}>Actual Hours</th>
          <th style={{ textAlign: "right" }}>Plan Wages</th>
          <th style={{ textAlign: "right" }}>Actual Wages</th>
          <th style={{ textAlign: "right" }}>Δ Wages</th>
          <th style={{ textAlign: "right" }}>Labor %</th>
        </tr>
      </thead>
      <tbody>
        {DIVISION_DATA.map((d) => {
          const delta = d.actual_wages - d.plan_wages;
          return (
            <tr
              key={d.name}
              style={{ cursor: "pointer" }}
              onClick={() => onDrillDown(d.name)}
              title={`Drill into ${d.name} division`}
            >
              <td style={{ fontWeight: 600 }}>
                {d.name}
                <span style={{ marginLeft: 6, fontSize: 10, color: "var(--c-ink-40)", fontFamily: "var(--font-mono)" }}>
                  ↗
                </span>
              </td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{d.stores}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {d.plan_hours.toLocaleString()}
              </td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {d.actual_hours.toLocaleString()}
              </td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                ${(d.plan_wages / 1000).toFixed(0)}K
              </td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                ${(d.actual_wages / 1000).toFixed(0)}K
              </td>
              <td style={{
                textAlign: "right",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: delta >= 0 ? "var(--c-signal-dark)" : "#e06c4a",
              }}>
                {delta >= 0 ? "+" : ""}${(delta / 1000).toFixed(0)}K
              </td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {d.actual_labor_pct.toFixed(1)}%
              </td>
            </tr>
          );
        })}
        <tr style={{ borderTop: "2px solid var(--c-ink-20)", fontWeight: 700 }}>
          <td>Total</td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {DIVISION_DATA.reduce((s, d) => s + d.stores, 0)}
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {DIVISION_DATA.reduce((s, d) => s + d.plan_hours, 0).toLocaleString()}
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {DIVISION_DATA.reduce((s, d) => s + d.actual_hours, 0).toLocaleString()}
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            ${(DIVISION_DATA.reduce((s, d) => s + d.plan_wages, 0) / 1000).toFixed(0)}K
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            ${(DIVISION_DATA.reduce((s, d) => s + d.actual_wages, 0) / 1000).toFixed(0)}K
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "#e06c4a" }}>
            -${(DIVISION_DATA.reduce((s, d) => s + (d.plan_wages - d.actual_wages), 0) / 1000).toFixed(0)}K
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {(
              DIVISION_DATA.reduce((s, d) => s + d.actual_wages, 0) /
              DIVISION_DATA.reduce((s, d) => s + d.actual_wages / d.actual_labor_pct * 100, 0) *
              100
            ).toFixed(1)}%
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ── Per-store stub detail ─────────────────────────────────────────────────────

function DrillDownStub({ division, onBack }: { division: string; onBack: () => void }) {
  return (
    <div className="card" style={{ padding: "var(--space-xl)", textAlign: "center" }}>
      <span className="eyebrow">{division} Division</span>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, margin: "var(--space-sm) 0" }}>
        Per-Store Detail
      </h3>
      <p style={{ color: "var(--c-ink-60)", fontSize: 14, marginBottom: "var(--space-lg)" }}>
        Store-level breakdown coming in v2.
      </p>
      <button type="button" className="btn btn-light" onClick={onBack}>
        ← Back to Overview
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Performance() {
  const navigate = useNavigate();
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const [reforecasting, setReforecasting] = useState(false);

  async function handleReforecast() {
    setReforecasting(true);
    try {
      const res = await fetch(apiUrl("/api/scenarios"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `FY26 Reforecast — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          period_start: 1,
          period_end: 12,
          seed_from_actuals: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        navigate(`/plans/${created.id}/prerequisites`);
      }
    } finally {
      setReforecasting(false);
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-xl)" }}>
        <div>
          <span className="eyebrow">FY26 · All Divisions</span>
          <h1 style={{ margin: "var(--space-xs) 0 0" }}>Performance</h1>
          <p className="subtitle">Plan vs. actuals across 100 stores · 12 periods</p>
        </div>
        <button
          className="btn btn-sticker"
          type="button"
          onClick={handleReforecast}
          disabled={reforecasting}
          style={{ marginTop: 4, flexShrink: 0 }}
        >
          {reforecasting ? "Creating…" : "Reforecast Now →"}
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-md)", fontSize: 12, color: "var(--c-ink-60)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--c-ink-40)" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
          Plan
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--c-signal-dark)" strokeWidth="2" />
          </svg>
          Actual
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <rect x="0" y="0" width="24" height="8" fill="var(--c-signal)" opacity="0.15" />
          </svg>
          ±5% variance band
        </span>
      </div>

      {/* 4-KPI strip */}
      <div className="kpi-strip perf-kpi-strip">
        <KpiCard
          label="Total Hours"
          plan={HOURS_PLAN}
          actual={HOURS_ACTUAL}
          format={(v) => v.toLocaleString("en-US")}
          caption="vs. 161,200 plan"
        />
        <KpiCard
          label="Total Wages"
          plan={WAGES_PLAN}
          actual={WAGES_ACTUAL}
          format={(v) => "$" + (v / 1000).toFixed(0) + "K"}
          caption="per period · FY26"
        />
        <KpiCard
          label="Labor %"
          plan={LABOR_PCT_PLAN}
          actual={LABOR_PCT_ACTUAL}
          format={(v) => v.toFixed(1) + "%"}
          caption="wages ÷ sales"
        />
        <KpiCard
          label="Forecast Accuracy"
          plan={FORECAST_ACC_PLAN}
          actual={FORECAST_ACC_ACTUAL}
          format={(v) => v.toFixed(1) + "%"}
          caption="demand forecast vs. actuals"
        />
      </div>

      {/* Division table or drill-down */}
      <div className="card" style={{ marginTop: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, margin: 0 }}>
            By Division
          </h3>
          <span style={{ fontSize: 11, color: "var(--c-ink-60)" }}>Click a row to drill down</span>
        </div>

        {drillDown ? (
          <DrillDownStub division={drillDown} onBack={() => setDrillDown(null)} />
        ) : (
          <DivisionTable onDrillDown={(name) => setDrillDown(name)} />
        )}
      </div>

      {/* Period labels strip */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "var(--space-sm) 0",
        fontSize: 10,
        color: "var(--c-ink-40)",
        fontFamily: "var(--font-mono)",
        marginTop: "var(--space-sm)",
      }}>
        {PERIODS.map((p) => <span key={p}>{p}</span>)}
      </div>
    </div>
  );
}
