import type { MetaFunction } from "@remix-run/node";
import { useOutletContext, useParams } from "@remix-run/react";
import { useWizardStore } from "~/stores/wizard";
import type { WizardScenario } from "./plans.$id";

export const meta: MetaFunction = () => [{ title: "Prerequisites — BlueNorth WFM" }];
export const handle = { pageTitle: "Plan Wizard" };

const LOCATION_SCOPE_OPTIONS = [
  { value: "all", label: "All 100 Stores" },
  { value: "west", label: "West (38)" },
  { value: "central", label: "Central (32)" },
  { value: "east", label: "East (30)" },
];

const APPROVAL_OPTIONS = [
  { value: "carla", label: "Carla K. — VP Operations" },
  { value: "marco", label: "Marco T. — Central Division Director" },
  { value: "lin", label: "Lin H. — Sr. Manager, Labor Planning" },
];

function StatusPill({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="pill pill-green">Ready</span>
  ) : (
    <span className="pill pill-orange">Needs Refresh</span>
  );
}

export default function Prerequisites() {
  const { scenario } = useOutletContext<{ scenario: WizardScenario }>();
  const { id } = useParams();
  const prereqs = useWizardStore((s) => s.drafts[id!]?.prereqs);
  const setPrereqs = useWizardStore((s) => s.setPrereqs);

  const laborStandardsReady = prereqs?.laborStandardsReady ?? false;
  const locationScope = prereqs?.locationScope ?? "all";
  const baselinePlanId = prereqs?.baselinePlanId ?? "PLAN-2025-BASELINE";
  const approvalWorkflow = prereqs?.approvalWorkflow ?? "carla";

  const readyCount = laborStandardsReady ? 6 : 5;

  function set(patch: Parameters<typeof setPrereqs>[1]) {
    setPrereqs(id!, patch);
  }

  return (
    <div className="wizard-step">
      <div className="prereq-grid">
        {/* 1 — Baseline Plan */}
        <div className="prereq-card">
          <div className="prereq-card__header">
            <span className="prereq-card__title">Baseline Plan</span>
            <StatusPill ready />
          </div>
          <p className="prereq-card__caption">
            Approved scenario to compare hours and wages against.
          </p>
          <div className="prereq-card__control">
            <select
              className="select"
              value={baselinePlanId}
              onChange={(e) => set({ baselinePlanId: e.target.value })}
            >
              <option value="PLAN-2025-BASELINE">FY25 Baseline Actuals</option>
              <option value="PLAN-2026-Q1-WAGE">FY26 Increase Wage Rate</option>
            </select>
          </div>
        </div>

        {/* 2 — Plan Period */}
        <div className="prereq-card">
          <div className="prereq-card__header">
            <span className="prereq-card__title">Plan Period</span>
            <StatusPill ready />
          </div>
          <p className="prereq-card__caption">
            Fiscal periods this plan covers. Period 10 → 12 = Q4 FY26.
          </p>
          <div className="prereq-card__control" style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
            {["Q1 · P1–P3", "Q2 · P4–P6", "Q3 · P7–P9", "Q4 · P10–P12"].map((q, i) => {
              const active = scenario.period_start === i * 3 + 1;
              return (
                <button
                  key={q}
                  type="button"
                  className={`filter-chip${active ? " active" : ""}`}
                  style={{ fontSize: 12 }}
                  onClick={() => {/* period locked to scenario */}}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 — Location Scope */}
        <div className="prereq-card">
          <div className="prereq-card__header">
            <span className="prereq-card__title">Location Scope</span>
            <StatusPill ready />
          </div>
          <p className="prereq-card__caption">
            Which stores are included. Defaults to all 100 across all divisions.
          </p>
          <div className="prereq-card__control" style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
            {LOCATION_SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`filter-chip${locationScope === opt.value ? " active" : ""}`}
                style={{ fontSize: 12 }}
                onClick={() => set({ locationScope: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 — Cost Center Mapping */}
        <div className="prereq-card">
          <div className="prereq-card__header">
            <span className="prereq-card__title">Cost Center Mapping</span>
            <StatusPill ready />
          </div>
          <p className="prereq-card__caption">
            Maps P&amp;L GL accounts to WFM role categories. Required for wage export.
          </p>
          <div className="prereq-card__control">
            <a href="#" className="prereq-link" onClick={(e) => e.preventDefault()}>
              View mapping (7 roles → 4 GL accounts) →
            </a>
            <p style={{ fontSize: 11, color: "var(--c-ink-60)", marginTop: 6, marginBottom: 0 }}>
              Last synced from Workday: Mar 10, 2026
            </p>
          </div>
        </div>

        {/* 5 — Labor Standards Library */}
        <div className={`prereq-card${laborStandardsReady ? "" : " prereq-card--needs-refresh"}`}>
          <div className="prereq-card__header">
            <span className="prereq-card__title">Labor Standards Library</span>
            <StatusPill ready={laborStandardsReady} />
          </div>
          <p className="prereq-card__caption">
            FY26 SPLH targets, IPLH benchmarks, and fixed coverage floors. Used in Step 3.
          </p>
          <div className="prereq-card__control">
            {laborStandardsReady ? (
              <p style={{ fontSize: 12, color: "var(--c-signal-dark)", fontWeight: 600, margin: 0 }}>
                ✓ FY26 study imported — 7 roles, 5 foodservice items, 4 coverage rules
              </p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "var(--c-orange)", margin: "0 0 8px" }}>
                  FY25 benchmarks active. FY26 field study completed Jan 2026.
                </p>
                <button
                  type="button"
                  className="prereq-refresh-link"
                  onClick={() => set({ laborStandardsReady: true })}
                >
                  Refresh from FY26 study →
                </button>
              </>
            )}
          </div>
        </div>

        {/* 6 — Approval Workflow */}
        <div className="prereq-card">
          <div className="prereq-card__header">
            <span className="prereq-card__title">Approval Workflow</span>
            <StatusPill ready />
          </div>
          <p className="prereq-card__caption">
            Configure who must approve before this scenario is published to scheduling.
          </p>
          <div className="prereq-card__control">
            <select
              className="select"
              value={approvalWorkflow}
              onChange={(e) => set({ approvalWorkflow: e.target.value })}
            >
              {APPROVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Black banner ── */}
      <div className="prereq-banner">
        <span className="prereq-banner__text">
          <span className="prereq-banner__count">{readyCount} of 6</span> prerequisites ready
          {!laborStandardsReady && (
            <span style={{ marginLeft: 8, opacity: 0.65, fontSize: 12 }}>
              — Labor Standards needs refresh before proceeding
            </span>
          )}
        </span>
        <button
          type="button"
          className="btn btn-light btn-sm"
          onClick={() => set({ laborStandardsReady: true })}
          disabled={readyCount === 6}
          style={{ opacity: readyCount === 6 ? 0.5 : 1 }}
        >
          Mark All Ready
        </button>
      </div>
    </div>
  );
}
