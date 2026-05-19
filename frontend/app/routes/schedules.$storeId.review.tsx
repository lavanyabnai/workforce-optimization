import { useState } from "react";
import { useOutletContext, useNavigate } from "@remix-run/react";
import {
  useScheduleWizardStore,
  type Shift,
} from "~/stores/scheduleWizard";
import { ScheduleGrid, ROLE_COLORS } from "./schedules.$storeId.optimize";
import { apiUrl } from "~/lib/api";

type ExplainResult = {
  delta_wage: number;
  delta_match_pct: number;
  violated_constraints: string[];
  suggested_alternatives: Array<{
    type: string;
    description: string;
    employee_id: string | null;
    estimated_delta_wage: number;
  }>;
};

function isoWeekLabel(w: string): string {
  const [yearStr, weekPart] = w.split("-W");
  const year = parseInt(yearStr);
  const weekNum = parseInt(weekPart);
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // 0=Mon
  const week1Mon = new Date(jan4.getTime() - dow * 86400000);
  const weekStart = new Date(week1Mon.getTime() + (weekNum - 1) * 7 * 86400000);
  return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── AI assistant panel ────────────────────────────────────────────────────────

type AIPanelProps = {
  selectedShift: Shift | null;
  explainResult: ExplainResult | null;
  explaining: boolean;
  onAction: (action: "unassign" | "assign") => void;
  onClose: () => void;
};

function AIPanel({ selectedShift, explainResult, explaining, onAction, onClose }: AIPanelProps) {
  return (
    <div className="sched-ai-panel">
      <div className="sched-ai-panel__header">
        <span>AI Assistant</span>
        {selectedShift && (
          <button type="button" className="modal__close" onClick={onClose} style={{ fontSize: 12 }}>✕</button>
        )}
      </div>
      <div className="sched-ai-panel__body">
        {!selectedShift && (
          <p className="sched-ai-panel__hint">
            Click any shift card to see cost-impact analysis and manual edit options.
          </p>
        )}

        {selectedShift && (
          <>
            {/* Shift summary */}
            <div className="sched-shift-drawer__header">
              <div
                className="sched-shift-drawer__role"
                style={{ color: ROLE_COLORS[selectedShift.role] ?? "var(--c-ink)" }}
              >
                {selectedShift.role}
              </div>
              <div className="sched-shift-drawer__name">
                {selectedShift.is_open ? "Open shift" : selectedShift.employee_name}
              </div>
              <div className="sched-shift-drawer__time">
                {selectedShift.day} · {selectedShift.start}–{selectedShift.end}
              </div>
            </div>

            {/* Actions */}
            <div className="sched-shift-drawer__actions">
              {!selectedShift.is_open && (
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => onAction("unassign")}
                >
                  Mark Open
                </button>
              )}
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => onAction("assign")}
              >
                {selectedShift.is_open ? "Assign Employee" : "Reassign"}
              </button>
            </div>

            {/* Explain result */}
            {explaining && (
              <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                <div className="spinner" />
              </div>
            )}

            {!explaining && explainResult && (
              <div className="sched-explain-result">
                <div className="sched-explain-deltas">
                  <div className="sched-explain-delta">
                    <span className="sched-explain-delta__label">Wage impact</span>
                    <span
                      className="sched-explain-delta__value"
                      style={{
                        color:
                          explainResult.delta_wage > 0
                            ? "var(--c-red)"
                            : explainResult.delta_wage < 0
                            ? "var(--c-signal-dark)"
                            : "var(--c-ink)",
                      }}
                    >
                      {explainResult.delta_wage >= 0 ? "+" : ""}
                      ${explainResult.delta_wage.toFixed(2)}
                    </span>
                  </div>
                  <div className="sched-explain-delta">
                    <span className="sched-explain-delta__label">Match %</span>
                    <span
                      className="sched-explain-delta__value"
                      style={{
                        color:
                          explainResult.delta_match_pct < 0
                            ? "var(--c-red)"
                            : "var(--c-ink)",
                      }}
                    >
                      {explainResult.delta_match_pct >= 0 ? "+" : ""}
                      {explainResult.delta_match_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {explainResult.violated_constraints.length > 0 && (
                  <div className="sched-explain-violations">
                    <div className="sched-explain-section-label">Constraint violations</div>
                    <ul>
                      {explainResult.violated_constraints.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {explainResult.suggested_alternatives.length > 0 && (
                  <div className="sched-explain-alts">
                    <div className="sched-explain-section-label">Suggestions</div>
                    {explainResult.suggested_alternatives.map((alt, i) => (
                      <div key={i} className="sched-explain-alt">
                        <span className="sched-explain-alt__desc">{alt.description}</span>
                        {alt.estimated_delta_wage !== 0 && (
                          <span className="sched-explain-alt__delta">
                            {alt.estimated_delta_wage >= 0 ? "+" : ""}
                            ${alt.estimated_delta_wage.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {explainResult.violated_constraints.length === 0 &&
                  explainResult.suggested_alternatives.length === 0 && (
                    <p style={{ color: "var(--c-signal-dark)", fontSize: 12, marginTop: 8 }}>
                      No constraint violations — edit looks safe.
                    </p>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main step ────────────────────────────────────────────────────────────────

export default function ScheduleReview() {
  const { storeId: urlStoreId } = useOutletContext<{ storeId: string }>();
  const navigate = useNavigate();

  const storeId = useScheduleWizardStore((s) => s.storeId);
  const week = useScheduleWizardStore((s) => s.week);
  const optimizeResult = useScheduleWizardStore((s) => s.optimizeResult);
  const publishedSchedules = useScheduleWizardStore((s) => s.publishedSchedules);
  const publishSchedule = useScheduleWizardStore((s) => s.publishSchedule);

  const cacheKey = `${storeId || urlStoreId}:${week}`;
  const cached = publishedSchedules[cacheKey] ?? null;
  const result = optimizeResult ?? cached;

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [published, setPublished] = useState(false);

  async function fireExplain(action: "unassign" | "assign") {
    if (!result || !selectedShift) return;
    setExplaining(true);
    setExplainResult(null);
    try {
      const res = await fetch(
        apiUrl(`/api/schedule/${result.schedule_id}/explain`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            edit: {
              action,
              shift_id: selectedShift.shift_id,
              employee_id: selectedShift.employee_id,
              target_employee_id: null,
            },
          }),
        }
      );
      if (res.ok) {
        const data: ExplainResult = await res.json();
        setExplainResult(data);
      }
    } finally {
      setExplaining(false);
    }
  }

  function confirmPublish() {
    publishSchedule();
    setShowPublishModal(false);
    setPublished(true);
    setTimeout(() => navigate("/schedules"), 1800);
  }

  if (!result) {
    return (
      <div className="wizard-step">
        <div className="empty" style={{ minHeight: 240 }}>
          <p className="empty__label">Run the optimizer first (Step 4 — Optimize).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step" style={{ paddingBottom: 0 }}>
      <div className="sched-review-layout">
        {/* ── Left: schedule grid ── */}
        <div className="sched-review-grid">
          <div className="sched-grid-wrap">
            <ScheduleGrid
              shifts={result.shifts}
              onShiftClick={(shift) => {
                setSelectedShift(shift);
                setExplainResult(null);
              }}
            />
          </div>

          {/* Legend */}
          <div className="sched-legend" style={{ marginTop: 12 }}>
            <span className="sched-legend__item">
              <span style={{ fontSize: 13 }}>🕐</span> Open shift
            </span>
            <span className="sched-legend__item">
              <span style={{ fontSize: 13 }}>⚠️</span> Flagged
            </span>
            {Object.entries(ROLE_COLORS).map(([role, color]) => (
              <span key={role} className="sched-legend__item">
                <span className="sched-legend__dot" style={{ background: color }} />
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: AI panel ── */}
        <AIPanel
          selectedShift={selectedShift}
          explainResult={explainResult}
          explaining={explaining}
          onAction={fireExplain}
          onClose={() => { setSelectedShift(null); setExplainResult(null); }}
        />
      </div>

      {/* ── Publish CTA bar ── */}
      <div className="sched-publish-bar">
        <div style={{ fontSize: 13, color: "var(--c-ink-60)" }}>
          {result.shifts.length} shifts · week of {isoWeekLabel(week)}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minWidth: 160 }}
          onClick={() => setShowPublishModal(true)}
        >
          Publish Schedule
        </button>
      </div>

      {/* ── Publish confirm modal ── */}
      {showPublishModal && (
        <div className="modal-backdrop" onClick={() => setShowPublishModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal__header">
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                Confirm Publish
              </span>
              <button type="button" className="modal__close" onClick={() => setShowPublishModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                Publish schedule for week of {isoWeekLabel(week)}?
              </p>
            </div>
            <div className="modal__footer">
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => setShowPublishModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={confirmPublish}>
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {published && (
        <div className="toast-bar toast-bar--success">
          ✓ Schedule published for {isoWeekLabel(week)}
        </div>
      )}
    </div>
  );
}
