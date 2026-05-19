import type { MetaFunction } from "@remix-run/node";
import { useOutletContext, useParams } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { useWizardStore } from "~/stores/wizard";
import type { WizardScenario } from "./plans.$id";

export const meta: MetaFunction = () => [{ title: "Demand Forecast — BlueNorth WFM" }];
export const handle = { pageTitle: "Plan Wizard" };

const DIVISIONS = ["West", "Central", "East"];

type ForecastRow = {
  period: number;
  division: string;
  demand_dollars: number;
  demand_units: number;
};

type ViewMode = "heatmap" | "line";

function fmt$(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── Line chart component ──────────────────────────────────────────────────────

const LINE_COLORS: Record<string, string> = {
  West: "#00c36c",
  Central: "#f0a500",
  East: "#3a7dff",
};

function LineChart({ rows, periods, editedKeys }: { rows: ForecastRow[]; periods: number[]; editedKeys: Set<string> }) {
  const W = 520, H = 200, PAD_L = 56, PAD_B = 32, PAD_T = 12, PAD_R = 16;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_B - PAD_T;

  const byDiv: Record<string, number[]> = {};
  for (const div of DIVISIONS) byDiv[div] = periods.map((p) => rows.find((r) => r.period === p && r.division === div)?.demand_dollars ?? 0);

  const allVals = Object.values(byDiv).flat();
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);

  function x(i: number) { return PAD_L + (i / Math.max(periods.length - 1, 1)) * innerW; }
  function y(v: number) { return PAD_T + innerH - ((v - minVal) / (maxVal - minVal)) * innerH; }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => minVal + f * (maxVal - minVal));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, height: H }}>
      {/* grid */}
      {yTicks.map((v) => (
        <line key={v} x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--c-ink-20)" strokeWidth={1} />
      ))}
      {/* y labels */}
      {yTicks.map((v) => (
        <text key={v} x={PAD_L - 4} y={y(v) + 4} textAnchor="end" fontSize={10} fill="var(--c-ink-60)" fontFamily="var(--font-mono)">
          {v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`}
        </text>
      ))}
      {/* x labels */}
      {periods.map((p, i) => (
        <text key={p} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--c-ink-60)" fontFamily="var(--font-mono)">
          P{p}
        </text>
      ))}
      {/* lines */}
      {DIVISIONS.map((div) => {
        const pts = byDiv[div];
        const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
        return (
          <g key={div}>
            <path d={d} fill="none" stroke={LINE_COLORS[div]} strokeWidth={2} strokeLinejoin="round" />
            {pts.map((v, i) => {
              const key = `${periods[i]}-${div}`;
              const isEdited = editedKeys.has(key);
              return (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={isEdited ? 5 : 3}
                  fill={isEdited ? LINE_COLORS[div] : "var(--c-white)"}
                  stroke={LINE_COLORS[div]}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        );
      })}
      {/* legend */}
      {DIVISIONS.map((div, i) => (
        <g key={div} transform={`translate(${PAD_L + i * 90},${PAD_T - 2})`}>
          <line x1={0} x2={16} y1={5} y2={5} stroke={LINE_COLORS[div]} strokeWidth={2} />
          <circle cx={8} cy={5} r={3} fill="var(--c-white)" stroke={LINE_COLORS[div]} strokeWidth={2} />
          <text x={20} y={9} fontSize={10} fill="var(--c-ink)" fontFamily="var(--font-display)" fontWeight={600}>{div}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Heatmap component ─────────────────────────────────────────────────────────

function Heatmap({
  rows,
  periods,
  editedKeys,
  onCellClick,
}: {
  rows: ForecastRow[];
  periods: number[];
  editedKeys: Set<string>;
  onCellClick: (period: number, division: string, current: number) => void;
}) {
  const vals = rows.map((r) => r.demand_dollars);
  const maxVal = Math.max(...vals, 1);

  function intensity(v: number) {
    return Math.round((v / maxVal) * 220);
  }

  function cellBg(v: number) {
    const a = intensity(v);
    return `rgba(0,195,108,${(a / 255).toFixed(2)})`;
  }

  function textColor(v: number) {
    return intensity(v) > 120 ? "var(--c-ink)" : "var(--c-ink-60)";
  }

  return (
    <div className="heatmap-wrap" style={{ overflowX: "auto" }}>
      <table className="heatmap-table">
        <thead>
          <tr>
            <th>Period</th>
            {DIVISIONS.map((div) => <th key={div}>{div}</th>)}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period}>
              <td className="heatmap-row-label">P{period}</td>
              {DIVISIONS.map((div) => {
                const row = rows.find((r) => r.period === period && r.division === div);
                const val = row?.demand_dollars ?? 0;
                const key = `${period}-${div}`;
                const isEdited = editedKeys.has(key);
                return (
                  <td
                    key={div}
                    className="heatmap-cell"
                    style={{ background: cellBg(val), color: textColor(val), cursor: "pointer", position: "relative" }}
                    onClick={() => onCellClick(period, div, val)}
                    title="Click to edit"
                  >
                    {isEdited && <span className="heatmap-edit-dot" />}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{fmt$(val)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Edit cell dialog ──────────────────────────────────────────────────────────

function EditCellModal({
  period,
  division,
  initialValue,
  onSave,
  onReset,
  onCancel,
  isEdited,
}: {
  period: number;
  division: string;
  initialValue: number;
  onSave: (v: number) => void;
  onReset: () => void;
  onCancel: () => void;
  isEdited: boolean;
}) {
  const [val, setVal] = useState(String(Math.round(initialValue)));
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Edit P{period} · {division}
          </span>
          <button className="modal__close" onClick={onCancel} type="button">✕</button>
        </div>
        <div className="modal__body">
          <label className="input-label">
            Demand ($)
            <input
              type="number"
              className="mono-input"
              style={{ width: "100%", marginTop: 6 }}
              value={val}
              min={0}
              onChange={(e) => setVal(e.target.value)}
              autoFocus
            />
          </label>
        </div>
        <div className="modal__footer">
          {isEdited && (
            <button className="btn btn-light btn-sm" onClick={onReset} type="button">
              Reset to AI
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => onSave(parseFloat(val) || 0)} type="button">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DemandForecast() {
  const { scenario } = useOutletContext<{ scenario: WizardScenario }>();
  const { id } = useParams();
  const sid = id!;

  const getForecastCell = useWizardStore((s) => s.getForecastCell);
  const setForecastCell = useWizardStore((s) => s.setForecastCell);
  const resetForecastCell = useWizardStore((s) => s.resetForecastCell);
  const overrides = useWizardStore((s) => s.drafts[sid]?.forecast?.overrides ?? []);

  const [aiRows, setAiRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("heatmap");
  const [divFilter, setDivFilter] = useState<string>("All");
  const [editingCell, setEditingCell] = useState<{ period: number; division: string; value: number } | null>(null);
  const fetchedRef = useRef(false);

  const periods = Array.from(
    { length: scenario.period_end - scenario.period_start + 1 },
    (_, i) => scenario.period_start + i
  );

  // Fetch AI forecast once per session
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/stores");
        const stores: { id: string }[] = await res.json();
        const storeIds = stores.map((s) => s.id);

        const fc = await fetch("/api/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_ids: storeIds,
            period_start: scenario.period_start,
            period_end: scenario.period_end,
            granularity: "period",
          }),
        });
        const data: { rows: ForecastRow[] } = await fc.json();
        setAiRows(data.rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [scenario.period_start, scenario.period_end]);

  // Merge AI rows with user overrides
  const displayRows: ForecastRow[] = aiRows.map((r) => {
    const override = getForecastCell(sid, r.period, r.division);
    return override !== null ? { ...r, demand_dollars: override } : r;
  });

  const editedKeys = new Set(overrides.map((o) => `${o.period}-${o.division}`));

  const filteredRows = divFilter === "All"
    ? displayRows
    : displayRows.filter((r) => r.division === divFilter);

  const filteredPeriods = periods;

  function handleCellClick(period: number, division: string, value: number) {
    setEditingCell({ period, division, value });
  }

  function handleSave(v: number) {
    if (!editingCell) return;
    setForecastCell(sid, editingCell.period, editingCell.division, v);
    setEditingCell(null);
  }

  function handleReset() {
    if (!editingCell) return;
    resetForecastCell(sid, editingCell.period, editingCell.division);
    setEditingCell(null);
  }

  function handleResetAll() {
    overrides.forEach((o) => resetForecastCell(sid, o.period, o.division));
  }

  return (
    <div className="wizard-step">
      <div className="page-header" style={{ marginBottom: "var(--space-lg)" }}>
        <span className="eyebrow">Step 5 of 6</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, margin: "var(--space-xs) 0" }}>
          Demand Forecast
        </h2>
        <p className="subtitle">
          12-period × division demand curve. Powered by AI synthetic forecast with manual override.
        </p>
      </div>

      {/* Filter strip */}
      <div className="filter-strip">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-ink-60)" }}>Division</span>
          <div className="seg-ctrl seg-ctrl--sm">
            {["All", ...DIVISIONS].map((d) => (
              <button
                key={d}
                className={`seg-ctrl__btn${divFilter === d ? " active" : ""}`}
                onClick={() => setDivFilter(d)}
                type="button"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          {editedKeys.size > 0 && (
            <button className="btn btn-light btn-sm" onClick={handleResetAll} type="button">
              Reset all to AI
            </button>
          )}
          <div className="seg-ctrl seg-ctrl--sm">
            {(["heatmap", "line"] as ViewMode[]).map((v) => (
              <button
                key={v}
                className={`seg-ctrl__btn${view === v ? " active" : ""}`}
                onClick={() => setView(v)}
                type="button"
              >
                {v === "heatmap" ? "Heatmap" : "Line Chart"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="card" style={{ marginTop: "var(--space-md)" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
            <span className="spinner" />
            <span style={{ fontSize: 13, color: "var(--c-ink-60)" }}>Loading AI forecast…</span>
          </div>
        ) : view === "heatmap" ? (
          <Heatmap
            rows={divFilter === "All" ? displayRows : filteredRows}
            periods={filteredPeriods}
            editedKeys={editedKeys}
            onCellClick={handleCellClick}
          />
        ) : (
          <LineChart
            rows={displayRows}
            periods={filteredPeriods}
            editedKeys={editedKeys}
          />
        )}

        {editedKeys.size > 0 && (
          <div style={{ marginTop: "var(--space-sm)", fontSize: 12, color: "var(--c-ink-60)" }}>
            <span className="heatmap-edit-dot" style={{ display: "inline-block" }} />
            {" "}{editedKeys.size} cell{editedKeys.size !== 1 ? "s" : ""} manually overridden
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingCell && (
        <EditCellModal
          period={editingCell.period}
          division={editingCell.division}
          initialValue={editingCell.value}
          isEdited={editedKeys.has(`${editingCell.period}-${editingCell.division}`)}
          onSave={handleSave}
          onReset={handleReset}
          onCancel={() => setEditingCell(null)}
        />
      )}
    </div>
  );
}
