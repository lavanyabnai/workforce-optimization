import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
} from "@remix-run/react";
import { useEffect } from "react";
import { AiAssistant, AiAssistantToggle } from "~/components/AiAssistant";
import { usePersonaStore } from "~/stores/persona";
import { useWizardStore } from "~/stores/wizard";
import { apiUrl } from "~/lib/api";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.scenario?.name ?? "Plan"} — BlueNorth WFM` },
];

export const handle = { pageTitle: "Plan Wizard" };

export type WizardScenario = {
  id: string;
  name: string;
  status: string;
  period_start: number;
  period_end: number;
  locations: number;
  updated_at: string;
  scenario_inputs: Record<string, unknown>;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const res = await fetch(apiUrl(`/api/scenarios/${params.id}`));
  if (!res.ok) throw new Response("Scenario not found", { status: 404 });
  const scenario: WizardScenario = await res.json();
  return json({ scenario });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const form = await request.formData();
  const rawInputs = String(form.get("inputs") ?? "{}");
  let inputs: Record<string, unknown>;
  try {
    inputs = JSON.parse(rawInputs);
  } catch {
    return json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const clean = Object.fromEntries(Object.entries(inputs).filter(([, v]) => v !== undefined));
  await fetch(apiUrl(`/api/scenarios/${params.id}/inputs`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: clean }),
  });
  return json({ ok: true });
}

const STEPS = [
  { id: "prerequisites", label: "Prerequisites", required: true },
  { id: "hours", label: "Operating Hours", required: true },
  { id: "labor", label: "Labor Model", required: false },
  { id: "wage", label: "Wage Rate", required: false },
  { id: "forecast", label: "Demand Forecast", required: true },
  { id: "guidance", label: "Run Guidance", required: true },
];

function formatUpdated(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPeriod(start: number, end: number) {
  if (start === end) return `Period ${start}`;
  return `Period ${start} → Period ${end}`;
}

export default function PlanWizardShell() {
  const { scenario } = useLoaderData<typeof loader>();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const initFromServer = useWizardStore((s) => s.initFromServer);
  const drafts = useWizardStore((s) => s.drafts);
  const { persona } = usePersonaStore();

  const segments = location.pathname.split("/");
  const currentStepId = segments[segments.length - 1] ?? "prerequisites";
  const currentIdx = STEPS.findIndex((s) => s.id === currentStepId);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;

  useEffect(() => {
    initFromServer(scenario.id, scenario.scenario_inputs);
  }, [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lin cannot access Plans at all
  if (persona.id === "lin") {
    return (
      <div className="wizard-page">
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "var(--space-md)", padding: "var(--space-2xl)" }}>
          <span className="eyebrow">Access restricted</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, margin: 0 }}>
            You don&rsquo;t have access to Plans
          </h2>
          <p style={{ color: "var(--c-ink-60)", fontSize: 14, margin: 0 }}>
            Labor planning is available to your manager. You can view Schedules instead.
          </p>
          <Link to="/schedules" className="btn btn-primary" style={{ marginTop: "var(--space-sm)" }}>
            Go to Schedules →
          </Link>
        </div>
      </div>
    );
  }

  const isMarco = persona.id === "marco";
  const isReadOnly = isMarco && safeIdx < STEPS.length - 1; // steps 1–5 are read-only for Marco

  function autoSave() {
    if (isMarco) return; // Marco cannot save
    const draft = drafts[scenario.id];
    if (!draft) return;
    fetcher.submit(
      {
        inputs: JSON.stringify({
          operating_hours: draft.hours
            ? {
                default: "24/7",
                deviating_stores: Object.entries(draft.hours.storeOverrides ?? {})
                  .filter(([, v]) => v !== null)
                  .map(([k]) => k),
                deviated_hours: { open: "06:00", close: "23:00" },
              }
            : undefined,
          labor_model: draft.laborModel
            ? {
                splh_targets: draft.laborModel.splhTargets,
                iplh_targets: draft.laborModel.iplhTargets,
                fixed_coverage: draft.laborModel.fixedCoverageRules,
              }
            : undefined,
          wage_rate: draft.wageRate
            ? {
                mode: draft.wageRate.mode,
                uniform_delta: draft.wageRate.uniformDelta,
                role_deltas: draft.wageRate.roleDeltas,
                region_deltas: draft.wageRate.regionDeltas,
                baseline_avg_wage: 14.76,
              }
            : undefined,
        }),
      },
      { method: "PUT", action: `/plans/${id}`, encType: "application/x-www-form-urlencoded" }
    );
  }

  function goToStep(stepId: string) {
    autoSave();
    navigate(`/plans/${id}/${stepId}`);
  }

  function handleBack() {
    if (safeIdx > 0) goToStep(STEPS[safeIdx - 1].id);
    else navigate("/plans");
  }

  function handleNext() {
    if (safeIdx < STEPS.length - 1) goToStep(STEPS[safeIdx + 1].id);
  }

  return (
    <div className="wizard-page">
      {/* ── Header ── */}
      <div className="wizard-header">
        <div className="wizard-header__breadcrumb">
          <Link to="/plans" className="breadcrumb-link">Labor Plans</Link>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{scenario.name}</span>
        </div>
        <div className="wizard-header__title-row">
          <div>
            <h1 className="wizard-header__title">{scenario.name}</h1>
            <p className="wizard-header__subtitle">
              <span className="eyebrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-ink-60)" }}>
                Scenario
              </span>
              {" · "}{scenario.locations} locations
              {" · "}{formatPeriod(scenario.period_start, scenario.period_end)}
              {" · Last saved "}{formatUpdated(scenario.updated_at)}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            {isReadOnly && (
              <span className="pill pill-orange" title="Read-only in Regional Manager view">
                Read Only
              </span>
            )}
            <button className="btn btn-light btn-sm" type="button">Edit Details</button>
          </div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="stepper" role="tablist" aria-label="Wizard steps">
        {STEPS.map((step, idx) => {
          const isActive = idx === safeIdx;
          const isCompleted = idx < safeIdx;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`step${isActive ? " active" : ""}${isCompleted ? " completed" : ""}`}
              onClick={() => goToStep(step.id)}
            >
              <span className="step__circle">
                {isCompleted ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                ) : idx + 1}
              </span>
              {step.label}
              {step.required && <span className="step__required">*</span>}
            </button>
          );
        })}
      </div>

      {/* ── Step content ── */}
      <div className="wizard-content">
        <Outlet context={{ scenario }} />
      </div>

      {/* ── Bottom bar ── */}
      <div className="bottom-bar">
        <div className="bottom-bar__left">
          <button type="button" className="btn btn-light" onClick={handleBack}>
            ← {safeIdx === 0 ? "Back to Plans" : "Back"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--c-ink-60)" }}>
          Step {safeIdx + 1} of {STEPS.length}
          {fetcher.state !== "idle" && (
            <span style={{ marginLeft: 8, color: "var(--c-signal-dark)" }}>Saving…</span>
          )}
        </div>
        <div className="bottom-bar__right">
          {!isMarco && (
            <button type="button" className="btn btn-light" onClick={autoSave}>
              Save Draft
            </button>
          )}
          {safeIdx < STEPS.length - 1 && (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>

      {/* ── AI Assistant (floating toggle + panel) ── */}
      <AiAssistantToggle />
      <AiAssistant context="plan" />
    </div>
  );
}
