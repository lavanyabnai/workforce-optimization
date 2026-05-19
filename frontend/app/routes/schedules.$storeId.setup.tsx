import { useEffect } from "react";
import { useOutletContext, useNavigate } from "@remix-run/react";
import { useScheduleWizardStore } from "~/stores/scheduleWizard";

const ISO_WEEKS = [
  "2026-W10", "2026-W11", "2026-W12", "2026-W13", "2026-W14", "2026-W15", "2026-W16",
];

function fmtWeek(w: string) {
  const [year, wkStr] = w.split("-W");
  const wk = parseInt(wkStr, 10);
  // ISO week 12 of 2026 starts Mar 16
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  const startMs = jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000 + (wk - 1) * 7 * 86400000;
  const start = new Date(startMs);
  const end = new Date(startMs + 6 * 86400000);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function ScheduleSetup() {
  const { storeId } = useOutletContext<{ storeId: string }>();
  const navigate = useNavigate();

  const storeIdState = useScheduleWizardStore((s) => s.storeId);
  const week = useScheduleWizardStore((s) => s.week);
  const envelope = useScheduleWizardStore((s) => s.envelope);
  const setStore = useScheduleWizardStore((s) => s.setStore);
  const setWeek = useScheduleWizardStore((s) => s.setWeek);

  useEffect(() => {
    if (storeId && storeId !== storeIdState) setStore(storeId);
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canProceed = !!storeIdState && !!week;

  return (
    <div className="wizard-step">
      {/* ── Selectors row ── */}
      <div className="sched-setup-selectors">
        <div className="form-group" style={{ minWidth: 200 }}>
          <label className="form-label">Store</label>
          <select
            className="select"
            value={storeIdState}
            onChange={(e) => {
              setStore(e.target.value);
              navigate(`/schedules/${e.target.value}/setup`, { replace: true });
            }}
          >
            <option value="S-0001">S-0001 — Sunnyvale Plaza</option>
            <option value="S-0002">S-0002 — Castro Street</option>
            <option value="S-0003">S-0003 — Palo Alto Center</option>
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 240 }}>
          <label className="form-label">Week</label>
          <select className="select" value={week} onChange={(e) => setWeek(e.target.value)}>
            {ISO_WEEKS.map((w) => (
              <option key={w} value={w}>
                {w} · {fmtWeek(w)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Budget envelope ── */}
      {envelope && (
        <div className="sched-envelope">
          <div className="sched-envelope__eyebrow">Budget Envelope</div>
          <div className="kpi-strip" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 12 }}>
            <div className="kpi-card">
              <div className="kpi-card__label">Approved Hours</div>
              <div className="kpi-card__value">{envelope.approved_hours.toLocaleString()}</div>
              <div className="kpi-card__caption">hrs / week</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">Approved Wages</div>
              <div className="kpi-card__value">
                ${envelope.approved_wages.toLocaleString()}
              </div>
              <div className="kpi-card__caption">/ week</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">Labor %</div>
              <div className="kpi-card__value">{envelope.labor_pct}%</div>
              <div className="kpi-card__caption">of weekly sales</div>
            </div>
          </div>

          {/* Source line */}
          <div className="sched-envelope__source">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--c-signal-dark)", flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
              <polyline points="4,7 6,9 10,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Source: {envelope.scenario_name}</span>
          </div>
        </div>
      )}

      {/* ── Next CTA ── */}
      <div style={{ marginTop: 32 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canProceed}
          onClick={() => navigate(`/schedules/${storeIdState}/demand`)}
        >
          Configure Demand →
        </button>
      </div>
    </div>
  );
}
