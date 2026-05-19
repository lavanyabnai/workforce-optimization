import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useOutletContext, useParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { usePersonaStore } from "~/stores/persona";
import type { RunResult } from "~/stores/wizard";
import { useWizardStore } from "~/stores/wizard";
import type { WizardScenario } from "./plans.$id";
import { apiUrl } from "~/lib/api";

export const meta: MetaFunction = () => [{ title: "Run Guidance — BlueNorth WFM" }];
export const handle = { pageTitle: "Plan Wizard" };

type GroupBy = "Division" | "Region" | "Period";

const DIVISIONS = ["West", "Central", "East"];

function fmtHours(n: number) { return n.toLocaleString("en-US"); }
function fmtWages(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  return "$" + n.toLocaleString("en-US");
}
function fmtPct(n: number) { return n.toFixed(1) + "%"; }

// ── KPI strip ──────────────────────────────────────────────────────────────

function KpiStrip({ result }: { result: RunResult }) {
  return (
    <div className="kpi-strip">
      <div className="kpi-card">
        <span className="kpi-card__label">Total Hours</span>
        <span className="kpi-card__value">
          {fmtHours(result.total_hours)}
          <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 6, opacity: 0.6 }}>hrs</span>
        </span>
        <span className="kpi-card__caption">Across 100 stores · FY26</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-card__label">Total Wages</span>
        <span className="kpi-card__value">{fmtWages(result.total_wages)}</span>
        <span className="kpi-card__caption">With wage adjustment applied</span>
      </div>
      <div className="kpi-card kpi-card--accent">
        <span className="kpi-card__label">Labor %</span>
        <span className="kpi-card__value">{fmtPct(result.labor_pct)}</span>
        <span className="kpi-card__caption">Target 14.8% · within tolerance</span>
      </div>
    </div>
  );
}

// ── SVG bar chart ──────────────────────────────────────────────────────────

function DivisionBarChart({ result }: { result: RunResult }) {
  const W = 520, H = 220;
  const PAD_L = 72, PAD_B = 40, PAD_T = 24, PAD_R = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_B - PAD_T;

  const divs = DIVISIONS.filter((d) => result.by_division[d]);
  const maxVal = Math.max(
    ...divs.flatMap((d) => [result.by_division[d].wages_budget, result.by_division[d].wages_projected])
  );

  const groupW = innerW / divs.length;
  const barW = groupW * 0.28;
  const gap = groupW * 0.08;

  function barX(i: number, isProjected: boolean) {
    const base = PAD_L + i * groupW + groupW * 0.12;
    return isProjected ? base + barW + gap : base;
  }
  function barH(v: number) { return (v / maxVal) * innerH; }
  function barY(v: number) { return PAD_T + innerH - barH(v); }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal);

  const trendPts = divs.map((d, i) => {
    const cx = barX(i, true) + barW / 2;
    const cy = barY(result.by_division[d].wages_projected);
    return `${i === 0 ? "M" : "L"}${cx},${cy}`;
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, height: H }}>
        {yTicks.map((v) => (
          <line key={v} x1={PAD_L} x2={W - PAD_R} y1={barY(v)} y2={barY(v)}
            stroke="var(--c-ink-20)" strokeWidth={1} />
        ))}
        {yTicks.map((v) => (
          <text key={v} x={PAD_L - 6} y={barY(v) + 4} textAnchor="end" fontSize={10}
            fill="var(--c-ink-60)" fontFamily="var(--font-mono)">
            {v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`}
          </text>
        ))}
        {divs.map((div, i) => {
          const d = result.by_division[div];
          return (
            <g key={div}>
              <rect x={barX(i, false)} y={barY(d.wages_budget)}
                width={barW} height={barH(d.wages_budget)} fill="var(--c-ink-20)" rx={2} />
              <rect x={barX(i, true)} y={barY(d.wages_projected)}
                width={barW} height={barH(d.wages_projected)} fill="#f0a500" rx={2} />
              <text x={PAD_L + i * groupW + groupW / 2} y={H - 8} textAnchor="middle"
                fontSize={11} fill="var(--c-ink)" fontFamily="var(--font-display)" fontWeight={600}>
                {div}
              </text>
            </g>
          );
        })}
        <path d={trendPts.join(" ")} fill="none" stroke="var(--c-ink)" strokeWidth={2}
          strokeDasharray="4 2" strokeLinejoin="round" />
        <rect x={PAD_L} y={PAD_T - 18} width={10} height={10} fill="var(--c-ink-20)" rx={2} />
        <text x={PAD_L + 14} y={PAD_T - 9} fontSize={10} fill="var(--c-ink-60)" fontFamily="var(--font-display)">Budget</text>
        <rect x={PAD_L + 70} y={PAD_T - 18} width={10} height={10} fill="#f0a500" rx={2} />
        <text x={PAD_L + 84} y={PAD_T - 9} fontSize={10} fill="var(--c-ink-60)" fontFamily="var(--font-display)">Projected</text>
        <line x1={PAD_L + 152} x2={PAD_L + 162} y1={PAD_T - 13} y2={PAD_T - 13}
          stroke="var(--c-ink)" strokeWidth={2} strokeDasharray="4 2" />
        <text x={PAD_L + 166} y={PAD_T - 9} fontSize={10} fill="var(--c-ink-60)" fontFamily="var(--font-display)">Trend</text>
      </svg>
    </div>
  );
}

// ── Division table ──────────────────────────────────────────────────────────

function DivisionTable({ result }: { result: RunResult }) {
  return (
    <table className="data-table" style={{ width: "100%" }}>
      <thead>
        <tr>
          <th>Division</th>
          <th style={{ textAlign: "right" }}>Hours</th>
          <th style={{ textAlign: "right" }}>Budget Wages</th>
          <th style={{ textAlign: "right" }}>Projected Wages</th>
          <th style={{ textAlign: "right" }}>Δ Wages</th>
          <th style={{ textAlign: "right" }}>Labor %</th>
        </tr>
      </thead>
      <tbody>
        {DIVISIONS.filter((d) => result.by_division[d]).map((div) => {
          const d = result.by_division[div];
          const delta = d.wages_projected - d.wages_budget;
          return (
            <tr key={div}>
              <td style={{ fontWeight: 600 }}>{div}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtHours(d.hours)}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtWages(d.wages_budget)}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtWages(d.wages_projected)}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: delta >= 0 ? "var(--c-signal-dark)" : "#e06c4a" }}>
                {delta >= 0 ? "+" : ""}{fmtWages(delta)}
              </td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtPct(d.labor_pct)}</td>
            </tr>
          );
        })}
        <tr style={{ borderTop: "2px solid var(--c-ink-20)", fontWeight: 700 }}>
          <td>Total</td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtHours(result.total_hours)}</td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {fmtWages(Object.values(result.by_division).reduce((s, d) => s + d.wages_budget, 0))}
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtWages(result.total_wages)}</td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {fmtWages(result.total_wages - Object.values(result.by_division).reduce((s, d) => s + d.wages_budget, 0))}
          </td>
          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtPct(result.labor_pct)}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function RunGuidance() {
  const { scenario } = useOutletContext<{ scenario: WizardScenario }>();
  const { id } = useParams();
  const navigate = useNavigate();
  const sid = id!;

  const { persona } = usePersonaStore();
  const isMarco = persona.id === "marco";
  const isInReview = scenario.status === "In Review";

  const wageRate = useWizardStore((s) => s.drafts[sid]?.wageRate);
  const setRunResult = useWizardStore((s) => s.setRunResult);
  const storedResult = useWizardStore((s) => s.runResults[sid]);

  const [result, setResult] = useState<RunResult | null>(storedResult ?? null);
  const [loading, setLoading] = useState(!storedResult);
  const [groupBy] = useState<GroupBy>("Division");
  const [view, setView] = useState<"chart" | "grid">("chart");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const wagePayload = wageRate
      ? {
          mode: wageRate.mode,
          uniform_delta: wageRate.uniformDelta,
          role_deltas: wageRate.roleDeltas,
          region_deltas: wageRate.regionDeltas,
          baseline_avg_wage: 14.76,
        }
      : undefined;

    const minDelay = new Promise((r) => setTimeout(r, 1000));

    fetch(apiUrl(`/api/scenarios/${scenario.id}/run`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wagePayload ? { wage_rate: wagePayload } : {}),
    })
      .then((r) => r.json())
      .then(async (data: RunResult) => {
        await minDelay;
        setResult(data);
        setRunResult(sid, data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, sid]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await fetch(apiUrl(`/api/scenarios/${scenario.id}/submit`), { method: "POST" });
      setSubmitted(true);
      setTimeout(() => navigate("/plans?toast=submitted"), 400);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await fetch(apiUrl(`/api/scenarios/${scenario.id}/approve`), { method: "POST" });
      setApproved(true);
      setTimeout(() => navigate("/plans?toast=approved"), 600);
    } finally {
      setApproving(false);
    }
  }

  // ── Render ──
  return (
    <div className="wizard-step">
      <div className="page-header" style={{ marginBottom: "var(--space-lg)" }}>
        <span className="eyebrow">Step 6 of 6</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, margin: "var(--space-xs) 0" }}>
          Run Guidance
        </h2>
        <p className="subtitle">
          Compile prior steps into planning outputs: KPI strip, by-division breakdown, submit for review.
        </p>
      </div>

      {loading ? (
        <div className="card guidance-loading">
          <span className="spinner" />
          <span className="guidance-loading__label">Compiling guidance from 6 inputs…</span>
        </div>
      ) : result ? (
        <>
          <KpiStrip result={result} />

          <div className="filter-strip" style={{ marginTop: "var(--space-lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-ink-60)" }}>Group by</span>
              <div className="seg-ctrl seg-ctrl--sm">
                {(["Division", "Region", "Period"] as GroupBy[]).map((g) => (
                  <button
                    key={g}
                    className={`seg-ctrl__btn${groupBy === g ? " active" : ""}`}
                    type="button"
                    disabled={g !== "Division"}
                    style={g !== "Division" ? { opacity: 0.4 } : {}}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="seg-ctrl seg-ctrl--sm">
              {(["chart", "grid"] as const).map((v) => (
                <button
                  key={v}
                  className={`seg-ctrl__btn${view === v ? " active" : ""}`}
                  onClick={() => setView(v)}
                  type="button"
                >
                  {v === "chart" ? "Chart" : "Grid"}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: "var(--space-md)" }}>
            {view === "chart" ? <DivisionBarChart result={result} /> : <DivisionTable result={result} />}
          </div>

          {view === "chart" && (
            <div className="card" style={{ marginTop: "var(--space-md)" }}>
              <DivisionTable result={result} />
            </div>
          )}

          {/* ── Action bar: differs by persona ── */}
          <div className="guidance-action-bar">
            {isMarco ? (
              /* Marco sees Approve + Request Changes when In Review */
              isInReview ? (
                <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
                  <button
                    className="btn btn-sticker"
                    type="button"
                    disabled={approving || approved}
                    onClick={handleApprove}
                    style={{ background: "var(--c-signal)" }}
                  >
                    {approved ? "Approved ✓" : approving ? "Approving…" : "Approve →"}
                  </button>
                  <button
                    className="btn btn-light"
                    type="button"
                    disabled={approving || approved}
                    onClick={() => navigate("/plans")}
                  >
                    Request Changes
                  </button>
                  <p style={{ fontSize: 12, color: "var(--c-ink-60)", margin: 0 }}>
                    Scenario is <strong>In Review</strong>
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--c-ink-60)" }}>
                  Approve / Request Changes are enabled when scenario status is <strong>In Review</strong>.
                  Current status: <strong>{scenario.status}</strong>
                </p>
              )
            ) : (
              /* Carla (and default) sees Submit for Review */
              <>
                <button
                  className="btn btn-sticker"
                  type="button"
                  disabled={submitting || submitted}
                  onClick={handleSubmit}
                >
                  {submitted ? "Submitted ✓" : submitting ? "Submitting…" : "Submit for Review →"}
                </button>
                <p style={{ fontSize: 12, color: "var(--c-ink-60)", margin: "var(--space-xs) 0 0" }}>
                  Status will change to <strong>In Review</strong> and notify the approval team.
                </p>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--c-ink-60)" }}>
          Could not load run results. Check backend connectivity.
        </div>
      )}
    </div>
  );
}
