import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation, useNavigate, useParams } from "@remix-run/react";
import { AiAssistant, AiAssistantToggle } from "~/components/AiAssistant";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `Schedule — ${data?.storeName ?? "Store"} — BlueNorth WFM` },
];

export const handle = { pageTitle: "Schedule Wizard" };

type StoreData = { id: string; name: string; city: string; state: string; division: string };

export async function loader({ params }: LoaderFunctionArgs) {
  const res = await fetch("http://localhost:8000/api/stores");
  const stores: StoreData[] = res.ok ? await res.json() : [];
  const store = stores.find((s) => s.id === params.storeId) ?? {
    id: params.storeId ?? "S-0001",
    name: "Sunnyvale Plaza",
    city: "Sunnyvale",
    state: "CA",
    division: "West",
  };
  return json({ store, storeName: store.name });
}

const STEPS = [
  { id: "setup",       label: "Setup",           required: true },
  { id: "demand",      label: "Demand",          required: true },
  { id: "constraints", label: "Constraints",     required: true },
  { id: "optimize",    label: "Optimize",        required: true },
  { id: "review",      label: "Review & Publish", required: true },
];

export default function ScheduleWizardShell() {
  const { store } = useLoaderData<typeof loader>();
  const { storeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const segments = location.pathname.split("/");
  const currentStepId = segments[segments.length - 1];
  const currentIdx = STEPS.findIndex((s) => s.id === currentStepId);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;

  function goTo(stepId: string) {
    navigate(`/schedules/${storeId}/${stepId}`);
  }

  function handleBack() {
    if (safeIdx > 0) goTo(STEPS[safeIdx - 1].id);
    else navigate("/schedules");
  }

  function handleNext() {
    if (safeIdx < STEPS.length - 1) goTo(STEPS[safeIdx + 1].id);
  }

  return (
    <div className="wizard-page">
      {/* ── Header ── */}
      <div className="wizard-header">
        <div className="wizard-header__breadcrumb">
          <Link to="/schedules" className="breadcrumb-link">Schedules</Link>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{store.name}</span>
        </div>
        <div className="wizard-header__title-row">
          <div>
            <h1 className="wizard-header__title">{store.name}</h1>
            <p className="wizard-header__subtitle">
              <span className="eyebrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-ink-60)" }}>
                Schedule Optimization
              </span>
              {" · "}{store.city}, {store.state}
              {" · "}{store.division} Division
            </p>
          </div>
          <div className="pill pill-grey">{store.id}</div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="stepper" role="tablist" aria-label="Schedule wizard steps">
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
              onClick={() => goTo(step.id)}
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
        <Outlet context={{ store, storeId }} />
      </div>

      {/* ── Bottom bar ── */}
      <div className="bottom-bar">
        <div className="bottom-bar__left">
          <button type="button" className="btn btn-light" onClick={handleBack}>
            ← {safeIdx === 0 ? "Back to Schedules" : "Back"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--c-ink-60)" }}>
          Step {safeIdx + 1} of {STEPS.length}
        </div>
        <div className="bottom-bar__right">
          {safeIdx < STEPS.length - 1 && (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>

      {/* ── AI Assistant (floating toggle + panel) ── */}
      <AiAssistantToggle />
      <AiAssistant context="schedule" />
    </div>
  );
}
