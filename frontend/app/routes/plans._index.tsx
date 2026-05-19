import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useLoaderData,
  useNavigate,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import { useCallback, useEffect, useRef, useState } from "react";

export const meta: MetaFunction = () => [{ title: "Labor Plans — BlueNorth WFM" }];

export const handle = { pageTitle: "Labor Plans" };

type ScenarioStatus = "Draft" | "In Review" | "Approved" | "Live" | "Archived";

type Scenario = {
  id: string;
  name: string;
  status: ScenarioStatus;
  period_start: number;
  period_end: number;
  locations: number;
  updated_at: string;
};

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "Draft" },
  { label: "In Review", value: "In Review" },
  { label: "Approved", value: "Approved" },
  { label: "Live", value: "Live" },
  { label: "Archived", value: "Archived" },
];

function statusPillClass(status: ScenarioStatus): string {
  switch (status) {
    case "Draft":
      return "pill pill-grey";
    case "In Review":
      return "pill pill-orange";
    case "Approved":
      return "pill pill-green";
    case "Live":
      return "pill pill-ink pill--dot";
    case "Archived":
      return "pill pill-grey";
  }
}

function formatPeriod(start: number, end: number): string {
  if (start === end) return `P${start}`;
  return `P${start} → P${end}`;
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // Demo reset: ?reset=1 wipes DB and reloads fixtures
  if (url.searchParams.get("reset") === "1") {
    await fetch("http://localhost:8000/api/admin/reset", { method: "POST" }).catch(() => {});
    return redirect("/plans?toast=reset");
  }

  const status = url.searchParams.get("status") ?? "";
  const q = url.searchParams.get("q") ?? "";

  const apiUrl = new URL("/api/scenarios", "http://localhost:8000");
  const res = await fetch(apiUrl.toString());
  if (!res.ok) throw new Error("Failed to load scenarios");
  let scenarios: Scenario[] = await res.json();

  if (status) {
    scenarios = scenarios.filter((s) => s.status === status);
  }
  if (q) {
    const lower = q.toLowerCase();
    scenarios = scenarios.filter((s) => s.name.toLowerCase().includes(lower));
  }

  return json({ scenarios, status, q });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const period_start = Number(form.get("period_start") ?? 1);
  const period_end = Number(form.get("period_end") ?? 3);

  if (!name) return json({ error: "Name is required" }, { status: 400 });

  const res = await fetch("http://localhost:8000/api/scenarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, period_start, period_end }),
  });

  if (!res.ok) return json({ error: "Failed to create scenario" }, { status: 500 });
  const created: Scenario = await res.json();
  return redirect(`/plans/${created.id}/prerequisites`);
}

function NewScenarioModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 className="modal__title" id="modal-title">New Scenario</h2>
        <Form method="post">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Scenario name</label>
            <input
              className="input"
              id="name"
              name="name"
              type="text"
              placeholder="e.g. FY26 Q3 Demand Reforecast"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="period_start">Period</label>
            <select className="select" id="period_start" name="period_start" defaultValue="1">
              <option value="1">Q1 FY26 (Jan–Mar)</option>
              <option value="4">Q2 FY26 (Apr–Jun)</option>
              <option value="7">Q3 FY26 (Jul–Sep)</option>
              <option value="10">Q4 FY26 (Oct–Dec)</option>
            </select>
            <input type="hidden" name="period_end" value="3" />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create &amp; Continue
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate();

  return (
    <div
      className="card card-sticker"
      style={{ cursor: "pointer" }}
      onClick={() => navigate(`/plans/${scenario.id}/prerequisites`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/plans/${scenario.id}/prerequisites`);
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-sm)" }}>
        <span className={statusPillClass(scenario.status)}>{scenario.status}</span>
      </div>
      <div className="card__title">{scenario.name}</div>
      <div className="card__subtitle">
        {scenario.locations} locations · {formatPeriod(scenario.period_start, scenario.period_end)}
      </div>
      <div style={{ marginTop: "auto", paddingTop: "var(--space-md)", fontSize: 12, color: "var(--c-ink-60)" }}>
        Updated {formatUpdated(scenario.updated_at)}
      </div>
    </div>
  );
}

export default function PlansIndex() {
  const { scenarios, status, q } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  // Show toast from query param (e.g. after submit or reset)
  useEffect(() => {
    const toastParam = searchParams.get("toast");
    if (toastParam === "submitted") {
      setToast("Plan submitted for review");
    } else if (toastParam === "approved") {
      setToast("Scenario approved ✓");
    } else if (toastParam === "reset") {
      setToast("Demo data reset — original 4 scenarios restored");
    } else {
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.delete("toast");
    setSearchParams(params, { replace: true });
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }
        params.delete("status");
        if (status) params.set("status", status);
        setSearchParams(params, { replace: true });
      }, 150);
    },
    [searchParams, setSearchParams, status]
  );

  function handleChipClick(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>Labor Plans</h1>
          <p className="subtitle">Manage and review labor planning scenarios across all locations</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", flexShrink: 0, marginTop: 4 }}>
          <button className="btn btn-light" type="button">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1v8M3 5l4 4 4-4M1 11h12v2H1z" />
            </svg>
            Export
          </button>
          <button
            className="btn btn-sticker"
            type="button"
            onClick={() => setModalOpen(true)}
          >
            + New Scenario
          </button>
        </div>
      </div>

      {/* Filter strip + search row */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-xl)", flexWrap: "wrap" }}>
        <div className="filter-strip">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`filter-chip${status === f.value ? " active" : ""}`}
              onClick={() => handleChipClick(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", marginLeft: "auto", minWidth: 220 }}>
          <input
            className="input input-search"
            type="search"
            placeholder="Search plans…"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search plans"
          />
        </div>
      </div>

      {/* Tile grid */}
      {scenarios.length === 0 ? (
        <div className="empty">
          <p className="empty__label">No plans match your filters</p>
        </div>
      ) : (
        <div className="tile-grid">
          {scenarios.map((s) => (
            <ScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      )}

      {/* New Scenario modal */}
      {modalOpen && <NewScenarioModal onClose={() => setModalOpen(false)} />}

      {/* Success toast */}
      {toast && (
        <div className="toast-bar toast-bar--success" role="status" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,8 6,12 14,4" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
