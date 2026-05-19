import { useState, useRef, useCallback } from "react";
import { useScheduleWizardStore } from "~/stores/scheduleWizard";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROLES = ["Store Manager", "Shift Lead", "Cashier", "Sales Associate", "Food Service", "Coffee Bar", "7NOW Driver"];

const ROLE_COLORS: Record<string, string> = {
  "Store Manager":   "#7b2d8b",
  "Shift Lead":      "#0077cc",
  "Cashier":         "#00c36c",
  "Sales Associate": "#ff6600",
  "Food Service":    "#009e56",
  "Coffee Bar":      "#b45309",
  "7NOW Driver":     "#e8244e",
};

// 24-hour normalized shape (same as backend)
const HOURLY_SHAPE = [
  0.30, 0.26, 0.25, 0.26, 0.35, 0.62,
  0.88, 1.25, 1.45, 1.28, 1.12, 1.18,
  1.25, 1.18, 1.08, 1.05, 1.22, 1.68,
  2.15, 2.82, 2.80, 2.28, 1.62, 1.10,
];
const DOW_SHAPE = [0.85, 0.80, 0.85, 0.90, 1.08, 1.30, 1.22];

// Base headcount demand at peak (demand units = staff count needed)
const ROLE_BASE: Record<string, number> = {
  "Store Manager":   0.18,
  "Shift Lead":      0.28,
  "Cashier":         0.55,
  "Sales Associate": 0.22,
  "Food Service":    0.32,
  "Coffee Bar":      0.20,
  "7NOW Driver":     0.12,
};

type Point = { day: number; hour: number; role: string; value: number };

function generateDemand(overrides: Record<string, number>): Point[] {
  const pts: Point[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const mult = overrides[`${DAYS[d]}:${h}`] ?? 1.0;
      for (const role of ROLES) {
        const v = ROLE_BASE[role] * DOW_SHAPE[d] * HOURLY_SHAPE[h] * mult;
        pts.push({ day: d, hour: h, role, value: Math.max(0, v) });
      }
    }
  }
  return pts;
}

// Chart dimensions
const W = 868;
const H = 240;
const PAD_L = 36;
const PAD_B = 28;
const CHART_W = W - PAD_L;
const CHART_H = H - PAD_B;
const N_TICKS = 168; // 7 × 24

function demandToPath(stacked: number[][]): string[] {
  // stacked[roleIdx][tick] = cumulative y value
  return stacked.map((series, ri) => {
    const prevSeries = ri > 0 ? stacked[ri - 1] : null;
    const pts: string[] = [];
    // Forward sweep (top edge)
    for (let t = 0; t < N_TICKS; t++) {
      const x = PAD_L + (t / (N_TICKS - 1)) * CHART_W;
      const y = H - PAD_B - (series[t] / 3.0) * CHART_H;
      pts.push(`${t === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    // Back sweep (bottom edge = previous series or zero)
    for (let t = N_TICKS - 1; t >= 0; t--) {
      const x = PAD_L + (t / (N_TICKS - 1)) * CHART_W;
      const prevY = prevSeries ? prevSeries[t] : 0;
      const y = H - PAD_B - (prevY / 3.0) * CHART_H;
      pts.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    }
    pts.push("Z");
    return pts.join(" ");
  });
}

export default function ScheduleDemand() {
  const demandOverrides = useScheduleWizardStore((s) => s.demandOverrides);
  const setDemandOverride = useScheduleWizardStore((s) => s.setDemandOverride);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<{ startTick: number; endTick: number } | null>(null);
  const [adjPopup, setAdjPopup] = useState<{ tick: number; x: number; y: number } | null>(null);
  const [adjValue, setAdjValue] = useState(1.0);
  const svgRef = useRef<SVGSVGElement>(null);

  const points = generateDemand(demandOverrides);

  // Compute stacked series for visible roles
  const visibleRoles = ROLES.filter((r) => !hidden.has(r));
  const stacked: number[][] = ROLES.map(() => new Array(N_TICKS).fill(0));

  for (let t = 0; t < N_TICKS; t++) {
    let cum = 0;
    for (let ri = 0; ri < ROLES.length; ri++) {
      const role = ROLES[ri];
      const pt = points.find((p) => p.day === Math.floor(t / 24) && p.hour === t % 24 && p.role === role);
      cum += hidden.has(role) ? 0 : (pt?.value ?? 0);
      stacked[ri][t] = cum;
    }
  }

  const paths = demandToPath(stacked);

  function tickToXY(tick: number): number {
    return PAD_L + (tick / (N_TICKS - 1)) * CHART_W;
  }

  const svgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const relX = e.clientX - rect.left - PAD_L;
    const tick = Math.round((relX / CHART_W) * (N_TICKS - 1));
    setDrag({ startTick: tick, endTick: tick });
  }, []);

  const svgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const relX = e.clientX - rect.left - PAD_L;
    const tick = Math.min(N_TICKS - 1, Math.max(0, Math.round((relX / CHART_W) * (N_TICKS - 1))));
    setDrag((d) => d ? { ...d, endTick: tick } : null);
  }, [drag]);

  const svgMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setAdjPopup({ tick: drag.startTick, x: e.clientX - rect.left, y: 60 });
    setAdjValue(1.0);
    setDrag(null);
  }, [drag]);

  function applyAdjustment() {
    if (!adjPopup) return;
    const start = Math.min(adjPopup.tick, adjPopup.tick);
    const end = Math.max(adjPopup.tick, adjPopup.tick + 4); // snap to ~1hr block
    for (let t = start; t <= Math.min(end, N_TICKS - 1); t++) {
      const d = Math.floor(t / 24);
      const h = t % 24;
      setDemandOverride(DAYS[d], h, adjValue);
    }
    setAdjPopup(null);
  }

  function resetAI() {
    // Clear all overrides
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        setDemandOverride(DAYS[d], h, 1.0);
      }
    }
  }

  // X-axis day labels
  const dayLabels = DAYS.map((day, d) => {
    const x = PAD_L + ((d * 24 + 12) / (N_TICKS - 1)) * CHART_W;
    return { day, x };
  });

  // Drag selection rect
  const dragRect =
    drag !== null
      ? {
          x: Math.min(tickToXY(drag.startTick), tickToXY(drag.endTick)),
          w: Math.abs(tickToXY(drag.endTick) - tickToXY(drag.startTick)) + 1,
        }
      : null;

  return (
    <div className="wizard-step">
      {/* ── Role toggles ── */}
      <div className="sched-role-toggles">
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={`sched-role-toggle${hidden.has(role) ? " muted" : ""}`}
            onClick={() =>
              setHidden((prev) => {
                const next = new Set(prev);
                if (next.has(role)) next.delete(role);
                else next.add(role);
                return next;
              })
            }
          >
            <span
              className="sched-role-toggle__dot"
              style={{ background: ROLE_COLORS[role] }}
            />
            {role}
          </button>
        ))}
      </div>

      {/* ── Stacked area chart ── */}
      <div className="sched-chart-wrap">
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ cursor: "crosshair", userSelect: "none", maxWidth: "100%" }}
          onMouseDown={svgMouseDown}
          onMouseMove={svgMouseMove}
          onMouseUp={svgMouseUp}
          onMouseLeave={() => setDrag(null)}
        >
          {/* Areas (render back-to-front) */}
          {[...ROLES].reverse().map((role, revIdx) => {
            const ri = ROLES.length - 1 - revIdx;
            return (
              <path
                key={role}
                d={paths[ri]}
                fill={ROLE_COLORS[role]}
                fillOpacity={hidden.has(role) ? 0 : 0.75}
                stroke="none"
              />
            );
          })}

          {/* Day separator lines */}
          {DAYS.map((_, d) => {
            if (d === 0) return null;
            const x = PAD_L + (d * 24 / (N_TICKS - 1)) * CHART_W;
            return (
              <line key={d} x1={x} y1={0} x2={x} y2={H - PAD_B}
                stroke="white" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3,3" />
            );
          })}

          {/* Drag selection */}
          {dragRect && (
            <rect
              x={dragRect.x} y={0}
              width={dragRect.w} height={H - PAD_B}
              fill="var(--c-ink)" fillOpacity={0.12}
              stroke="var(--c-ink)" strokeWidth={1} strokeOpacity={0.3}
            />
          )}

          {/* X-axis baseline */}
          <line x1={PAD_L} y1={H - PAD_B} x2={W} y2={H - PAD_B}
            stroke="var(--c-ink-20)" strokeWidth={1} />

          {/* Day labels */}
          {dayLabels.map(({ day, x }) => (
            <text key={day} x={x} y={H - 6} textAnchor="middle"
              fontSize={10} fontFamily="var(--font-body)" fill="var(--c-ink-60)">
              {day}
            </text>
          ))}

          {/* Y-axis label */}
          <text x={PAD_L - 4} y={CHART_H / 2} textAnchor="middle"
            fontSize={9} fontFamily="var(--font-body)" fill="var(--c-ink-60)"
            transform={`rotate(-90, ${PAD_L - 4}, ${CHART_H / 2})`}>
            Staff
          </text>

          {/* Adjustment popup trigger area */}
          {adjPopup && (
            <foreignObject x={Math.min(adjPopup.x, W - 180)} y={adjPopup.y} width={168} height={120}>
              <div
                style={{
                  background: "var(--c-white)",
                  border: "var(--border-ink)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  boxShadow: "var(--shadow-md)",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Adjust demand</div>
                <input
                  type="range" min={0.5} max={2.0} step={0.1}
                  value={adjValue}
                  onChange={(e) => setAdjValue(parseFloat(e.target.value))}
                  style={{ width: "100%", marginBottom: 6 }}
                />
                <div style={{ fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                  ×{adjValue.toFixed(1)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="btn btn-primary btn-sm"
                    style={{ flex: 1 }} onClick={applyAdjustment}>Apply</button>
                  <button type="button" className="btn btn-light btn-sm"
                    onClick={() => setAdjPopup(null)}>✕</button>
                </div>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>

      {/* ── Caption ── */}
      <div className="sched-chart-caption">
        <span>AI-generated forecast. Drag any region to override.</span>
        <button type="button" className="sched-reset-link" onClick={resetAI}>
          Reset to AI
        </button>
      </div>
    </div>
  );
}
