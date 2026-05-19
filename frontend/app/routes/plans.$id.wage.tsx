import type { MetaFunction } from "@remix-run/node";
import { useOutletContext, useParams } from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RunResult, WageMode } from "~/stores/wizard";
import { useWizardStore } from "~/stores/wizard";
import type { WizardScenario } from "./plans.$id";

export const meta: MetaFunction = () => [{ title: "Wage Rate — BlueNorth WFM" }];
export const handle = { pageTitle: "Plan Wizard" };

const ROLES = [
  "Store Manager",
  "Shift Lead",
  "Cashier",
  "Sales Associate",
  "Food Service",
  "Coffee Bar",
  "7NOW Driver",
];
const REGIONS = ["West", "Central", "East"];

function fmt$(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDelta(n: number) {
  return (n >= 0 ? "+" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WageRate() {
  const { scenario } = useOutletContext<{ scenario: WizardScenario }>();
  const { id } = useParams();
  const sid = id!;

  const wageRate = useWizardStore((s) => s.drafts[sid]?.wageRate);
  const setWageRate = useWizardStore((s) => s.setWageRate);

  const mode: WageMode = wageRate?.mode ?? "uniform";
  const uniformDelta = wageRate?.uniformDelta ?? 0.50;
  const roleDeltas = wageRate?.roleDeltas ?? {};
  const regionDeltas = wageRate?.regionDeltas ?? {};

  const [ticker, setTicker] = useState<RunResult | null>(null);
  const [tickerLoading, setTickerLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Derive wage payload for dry-run call
  function wagePayload() {
    if (mode === "uniform") {
      return { mode: "uniform", uniform_delta: uniformDelta, baseline_avg_wage: 14.76 };
    }
    if (mode === "by_role") {
      return { mode: "by_role", role_deltas: roleDeltas, baseline_avg_wage: 14.76 };
    }
    return { mode: "by_region", region_deltas: regionDeltas, baseline_avg_wage: 14.76 };
  }

  const triggerDryRun = useCallback(() => {
    clearTimeout(debounceRef.current);
    setTickerLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/scenarios/${scenario.id}/run?dryRun=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wage_rate: wagePayload() }),
        });
        if (res.ok) setTicker(await res.json());
      } finally {
        setTickerLoading(false);
      }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, mode, uniformDelta, roleDeltas, regionDeltas]);

  useEffect(() => {
    triggerDryRun();
    return () => clearTimeout(debounceRef.current);
  }, [triggerDryRun]);

  function setMode(m: WageMode) {
    setWageRate(sid, { mode: m });
  }

  function setUniform(v: number) {
    setWageRate(sid, { uniformDelta: v });
  }

  function setRoleDelta(role: string, v: number) {
    setWageRate(sid, { roleDeltas: { ...roleDeltas, [role]: v } });
  }

  function setRegionDelta(region: string, v: number) {
    setWageRate(sid, { regionDeltas: { ...regionDeltas, [region]: v } });
  }

  const BASE_WAGES = 2_400_000;
  const tickerWages = ticker?.total_wages ?? BASE_WAGES;
  const tickerDelta = tickerWages - BASE_WAGES;

  return (
    <div className="wizard-step wage-step">
      <div className="page-header" style={{ marginBottom: "var(--space-lg)" }}>
        <span className="eyebrow">Step 4 of 6</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, margin: "var(--space-xs) 0" }}>
          Wage Rate
        </h2>
        <p className="subtitle">Configure uniform, by-role, or by-region wage adjustments.</p>
      </div>

      <div className="wage-layout">
        {/* ── Left: inputs ── */}
        <div className="wage-inputs">
          {/* Mode selector */}
          <div className="seg-ctrl" role="tablist" aria-label="Wage adjustment mode">
            {(["uniform", "by_role", "by_region"] as WageMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                className={`seg-ctrl__btn${mode === m ? " active" : ""}`}
                onClick={() => setMode(m)}
                type="button"
              >
                {m === "uniform" ? "Uniform" : m === "by_role" ? "By Role" : "By Region"}
              </button>
            ))}
          </div>

          {/* Mode content */}
          {mode === "uniform" && (
            <div className="card" style={{ marginTop: "var(--space-md)" }}>
              <p style={{ fontSize: 13, color: "var(--c-ink-60)", marginBottom: "var(--space-sm)" }}>
                Apply a single $/hr adjustment across all roles and regions.
              </p>
              <label className="input-label">
                Wage delta ($/hr)
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginTop: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>+$</span>
                  <input
                    type="number"
                    className="mono-input"
                    style={{ width: 120 }}
                    value={uniformDelta.toFixed(2)}
                    step={0.01}
                    min={0}
                    max={10}
                    onChange={(e) => setUniform(parseFloat(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: 13, color: "var(--c-ink-60)" }}>/hr above baseline $14.76</span>
                </div>
              </label>
            </div>
          )}

          {mode === "by_role" && (
            <div className="card" style={{ marginTop: "var(--space-md)" }}>
              <p style={{ fontSize: 13, color: "var(--c-ink-60)", marginBottom: "var(--space-sm)" }}>
                Set a wage delta per role.
              </p>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Role</th>
                    <th style={{ textAlign: "right" }}>Delta ($/hr)</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role}>
                      <td>{role}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>+$</span>
                          <input
                            type="number"
                            className="mono-input"
                            style={{ width: 72, textAlign: "right" }}
                            value={(roleDeltas[role] ?? 0.50).toFixed(2)}
                            step={0.01}
                            min={0}
                            max={10}
                            onChange={(e) => setRoleDelta(role, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mode === "by_region" && (
            <div className="card" style={{ marginTop: "var(--space-md)" }}>
              <p style={{ fontSize: 13, color: "var(--c-ink-60)", marginBottom: "var(--space-sm)" }}>
                Set a wage delta per region.
              </p>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Region</th>
                    <th style={{ textAlign: "right" }}>Delta ($/hr)</th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map((region) => (
                    <tr key={region}>
                      <td>{region}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>+$</span>
                          <input
                            type="number"
                            className="mono-input"
                            style={{ width: 72, textAlign: "right" }}
                            value={(regionDeltas[region] ?? 0.50).toFixed(2)}
                            step={0.01}
                            min={0}
                            max={10}
                            onChange={(e) => setRegionDelta(region, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right: KPI ticker ── */}
        <div className="wage-ticker card">
          <div className="wage-ticker__header">
            <span className="eyebrow" style={{ fontSize: 11 }}>Live Preview</span>
            {tickerLoading && <span className="spinner-sm" />}
          </div>

          <div className="wage-ticker__kpi">
            <span className="wage-ticker__label">New total wages</span>
            <span className="wage-ticker__value" style={{ fontFamily: "var(--font-mono)" }}>
              {fmt$(tickerWages)}
            </span>
          </div>

          <div className="wage-ticker__delta" style={{ color: tickerDelta >= 0 ? "var(--c-signal-dark)" : "#e06c4a" }}>
            <span className="wage-ticker__label">Δ vs baseline ($2.40M)</span>
            <span className="wage-ticker__value wage-ticker__value--sm" style={{ fontFamily: "var(--font-mono)" }}>
              {fmtDelta(tickerDelta)}
            </span>
          </div>

          {ticker && (
            <>
              <div className="wage-ticker__divider" />
              <div className="wage-ticker__row">
                <span>Total hours</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{ticker.total_hours.toLocaleString()}</span>
              </div>
              <div className="wage-ticker__row">
                <span>Labor %</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{ticker.labor_pct.toFixed(1)}%</span>
              </div>
              <div className="wage-ticker__divider" />
              {Object.entries(ticker.by_division).map(([div, d]) => (
                <div key={div} className="wage-ticker__row wage-ticker__row--sm">
                  <span>{div}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{fmt$(d.wages_projected)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
