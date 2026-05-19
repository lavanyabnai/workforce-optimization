import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "@remix-run/react";
import { useScheduleWizardStore, type Shift, type OptimizeResult } from "~/stores/scheduleWizard";
import { apiUrl } from "~/lib/api";

export const ROLE_COLORS: Record<string, string> = {
  "Store Manager":   "#7b2d8b",
  "Shift Lead":      "#0077cc",
  "Cashier":         "#00c36c",
  "Sales Associate": "#ff6600",
  "Food Service":    "#009e56",
  "Coffee Bar":      "#b45309",
  "7NOW Driver":     "#e8244e",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFTS_ORDER = ["06:00", "09:00", "10:00", "14:00", "16:00", "22:00"];
const SHIFT_LABELS: Record<string, string> = {
  "06:00": "Morning 6a–2p",
  "09:00": "Mid-Morning 9a–5p",
  "10:00": "Day 10a–6p",
  "14:00": "Evening 2p–10p",
  "16:00": "Late 4p–10p",
  "22:00": "Overnight 10p–6a",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

// ── ScheduleGrid ──────────────────────────────────────────────────────────────

type ShiftCardProps = {
  shift: Shift;
  onClick?: (shift: Shift) => void;
};

function ShiftCard({ shift, onClick }: ShiftCardProps) {
  const color = ROLE_COLORS[shift.role] ?? "var(--c-ink)";
  return (
    <div
      className={`sched-shift-card${shift.is_open ? " open" : ""}${shift.review_flag ? " flagged" : ""}`}
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={() => onClick?.(shift)}
      title={shift.is_open ? `Open: ${shift.role}` : `${shift.employee_name} · ${shift.role}`}
    >
      <div className="sched-shift-card__role" style={{ color }}>
        {shift.role.split(" ")[0]}
      </div>
      <div className="sched-shift-card__meta">
        {shift.is_open ? (
          <span className="sched-shift-icon" title="Open shift">
            🕐
          </span>
        ) : (
          <span className="sched-shift-avatar" style={{ background: color }}>
            {initials(shift.employee_name)}
          </span>
        )}
        {shift.review_flag && (
          <span className="sched-shift-icon" title="Flagged for review">⚠️</span>
        )}
      </div>
    </div>
  );
}

type ScheduleGridProps = {
  shifts: Shift[];
  onShiftClick?: (shift: Shift) => void;
};

export function ScheduleGrid({ shifts, onShiftClick }: ScheduleGridProps) {
  const usedStartTimes = Array.from(new Set(shifts.map((s) => s.start))).sort(
    (a, b) => SHIFTS_ORDER.indexOf(a) - SHIFTS_ORDER.indexOf(b)
  );

  return (
    <div className="sched-grid">
      {/* Header row */}
      <div className="sched-grid__header">
        <div className="sched-grid__time-col" />
        {DAYS.map((day) => (
          <div key={day} className="sched-grid__day-header">{day}</div>
        ))}
      </div>

      {/* Shift rows */}
      {usedStartTimes.map((startTime) => (
        <div key={startTime} className="sched-grid__row">
          <div className="sched-grid__time-label">
            <span>{SHIFT_LABELS[startTime] ?? startTime}</span>
          </div>
          {DAYS.map((day) => {
            const dayShifts = shifts.filter(
              (s) => s.day === day && s.start === startTime
            );
            return (
              <div key={day} className="sched-grid__cell">
                {dayShifts.map((sh) => (
                  <ShiftCard key={sh.shift_id} shift={sh} onClick={onShiftClick} />
                ))}
                {dayShifts.length === 0 && (
                  <div className="sched-grid__empty-cell" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── KPI strip ────────────────────────────────────────────────────────────────

type KPIStripProps = {
  kpis: OptimizeResult["kpis"];
  envelope: { approved_wages: number } | null;
};

function OptKPIStrip({ kpis, envelope }: KPIStripProps) {
  const matchOk = kpis.employee_match_pct >= 90;
  const otOk = kpis.ot_hours === 0;
  const wageOk = !envelope || kpis.total_wage <= envelope.approved_wages;
  const covOk = kpis.coverage_pct >= 100;

  return (
    <div className="kpi-strip" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
      <div className={`kpi-card${matchOk ? " kpi-card--accent" : ""}`}>
        <div className="kpi-card__label">Employee Match %</div>
        <div className="kpi-card__value" style={{ color: matchOk ? "var(--c-signal-dark)" : "var(--c-red)" }}>
          {kpis.employee_match_pct.toFixed(1)}%
        </div>
        <div className="kpi-card__caption">Target ≥ 90%</div>
      </div>
      <div className={`kpi-card${otOk ? "" : " kpi-card--red"}`}>
        <div className="kpi-card__label">Overtime Hours</div>
        <div className="kpi-card__value" style={{ color: otOk ? "var(--c-ink)" : "var(--c-red)" }}>
          {kpis.ot_hours}h
        </div>
        <div className="kpi-card__caption">Target 0</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-card__label">Total Wage</div>
        <div className="kpi-card__value" style={{ fontSize: 22, color: wageOk ? "var(--c-signal-dark)" : "var(--c-red)" }}>
          ${kpis.total_wage.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="kpi-card__caption">
          {envelope ? `Envelope $${envelope.approved_wages.toLocaleString()}` : "Weekly wages"}
        </div>
      </div>
      <div className={`kpi-card${covOk ? "" : ""}`}>
        <div className="kpi-card__label">Coverage</div>
        <div className="kpi-card__value" style={{ color: covOk ? "var(--c-signal-dark)" : "var(--c-red)" }}>
          {kpis.coverage_pct.toFixed(0)}%
        </div>
        {kpis.num_open_shifts > 0 && (
          <div className="kpi-card__caption" style={{ color: "var(--c-red)" }}>
            {kpis.num_open_shifts} open shift{kpis.num_open_shifts > 1 ? "s" : ""}
          </div>
        )}
        {kpis.num_open_shifts === 0 && (
          <div className="kpi-card__caption">Full coverage</div>
        )}
      </div>
    </div>
  );
}

// ── Streaming progress ────────────────────────────────────────────────────────

const PROGRESS_MSGS = [
  "Initialising CP-SAT model…",
  "Loading employee roster constraints…",
  "Building availability matrix…",
  "Generating candidate schedules…",
  "Exploring 12,400 schedule combinations…",
  "Applying coverage floor constraints…",
  "Optimising wage cost objective…",
  "Finalising solution…",
];

// ── Main step ────────────────────────────────────────────────────────────────

export default function ScheduleOptimize() {
  const { storeId } = useOutletContext<{ storeId: string }>();
  const storeIdState = useScheduleWizardStore((s) => s.storeId);
  const week = useScheduleWizardStore((s) => s.week);
  const envelope = useScheduleWizardStore((s) => s.envelope);
  const optimizeResult = useScheduleWizardStore((s) => s.optimizeResult);
  const publishedSchedules = useScheduleWizardStore((s) => s.publishedSchedules);
  const setOptimizeResult = useScheduleWizardStore((s) => s.setOptimizeResult);

  const [running, setRunning] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [dotCount, setDotCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-enter: show cached result immediately
  const cacheKey = `${storeIdState || storeId}:${week}`;
  const cached = publishedSchedules[cacheKey] ?? null;
  const result = optimizeResult ?? cached;

  function startProgress() {
    setRunning(true);
    setMsgIdx(0);
    setDotCount(0);
    let tick = 0;
    intervalRef.current = setInterval(() => {
      tick++;
      setDotCount((d) => (d + 1) % 4);
      if (tick % 3 === 0) setMsgIdx((i) => Math.min(i + 1, PROGRESS_MSGS.length - 1));
    }, 250);
  }

  function stopProgress() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  async function runOptimizer() {
    startProgress();
    const [res] = await Promise.all([
      fetch(apiUrl("/api/schedule/optimize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeIdState || storeId, week_iso: week }),
      }),
      new Promise((r) => setTimeout(r, 2000)), // min 2s ramp-up
    ]);
    stopProgress();
    if (res.ok) {
      const data: OptimizeResult = await res.json();
      setOptimizeResult(data);
    }
  }

  return (
    <div className="wizard-step">
      {!result && !running && (
        <div className="sched-optimize-cta">
          <div className="sched-optimize-eyebrow">Ready to Optimize</div>
          <p style={{ color: "var(--c-ink-60)", maxWidth: 480, textAlign: "center", marginBottom: 24 }}>
            The solver will assign all 12 employees across the 7-day week,
            respecting availability, max hours, and coverage requirements.
          </p>
          <button
            type="button"
            className="btn btn-sticker"
            style={{ fontSize: 18, padding: "16px 40px", letterSpacing: "0.06em" }}
            onClick={runOptimizer}
          >
            Run Optimizer
          </button>
        </div>
      )}

      {running && (
        <div className="sched-progress-strip">
          <div className="spinner" />
          <div>
            <div className="sched-progress-msg">{PROGRESS_MSGS[msgIdx]}</div>
            <div className="sched-progress-dots">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="sched-progress-dot"
                  style={{ opacity: i === dotCount * 3 || i === dotCount * 3 + 1 || i === dotCount * 3 + 2 ? 1 : 0.2 }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {result && !running && (
        <>
          {/* KPI strip */}
          <OptKPIStrip kpis={result.kpis} envelope={envelope} />

          {/* Re-run button */}
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "16px 0 8px" }}>
            <button type="button" className="btn btn-light btn-sm" onClick={runOptimizer}>
              ↺ Re-run Optimizer
            </button>
          </div>

          {/* Schedule grid */}
          <div className="sched-grid-wrap">
            <ScheduleGrid shifts={result.shifts} />
          </div>

          {/* Legend */}
          <div className="sched-legend">
            <span className="sched-legend__item">
              <span style={{ fontSize: 14 }}>🕐</span> Open shift
            </span>
            <span className="sched-legend__item">
              <span style={{ fontSize: 14 }}>⚠️</span> Flagged for review
            </span>
            {Object.entries(ROLE_COLORS).map(([role, color]) => (
              <span key={role} className="sched-legend__item">
                <span className="sched-legend__dot" style={{ background: color }} />
                {role}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
