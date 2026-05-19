import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { useMemo, useState } from "react";
import { useWizardStore } from "~/stores/wizard";
import type { HoursOverride } from "~/stores/wizard";

export const meta: MetaFunction = () => [{ title: "Operating Hours — BlueNorth WFM" }];
export const handle = { pageTitle: "Plan Wizard" };

type StoreRow = {
  id: string;
  name: string;
  region: string;
  division: string;
  hours_open: { type: string; open?: string; close?: string };
};

export async function loader(_: LoaderFunctionArgs) {
  const res = await fetch("http://localhost:8000/api/stores");
  if (!res.ok) throw new Response("Failed to load stores", { status: 500 });
  const stores: StoreRow[] = await res.json();
  return json({ stores });
}

function hrsPerDay(open: string, close: string): number {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  return closeMins > openMins
    ? (closeMins - openMins) / 60
    : (24 * 60 - openMins + closeMins) / 60;
}

function formatHoursLabel(open: string, close: string): string {
  const h = hrsPerDay(open, close);
  return `${open}–${close} · ${h.toFixed(0)} hrs/day`;
}

export default function OperatingHours() {
  const { stores } = useLoaderData<typeof loader>();
  const { id } = useParams();
  const hours = useWizardStore((s) => s.drafts[id!]?.hours);
  const setHours = useWizardStore((s) => s.setHours);

  const overrides = hours?.storeOverrides ?? {};

  const [showDeviatesOnly, setShowDeviatesOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState("06:00");
  const [bulkClose, setBulkClose] = useState("23:00");

  function isDeviate(store: StoreRow): boolean {
    if (overrides[store.id] !== undefined) {
      return overrides[store.id] !== null;
    }
    return store.hours_open.type === "custom";
  }

  function getEffectiveHours(store: StoreRow): { open: string; close: string; is247: boolean } {
    const ov = overrides[store.id];
    if (ov !== null && ov !== undefined) {
      return { open: ov.open, close: ov.close, is247: false };
    }
    if (store.hours_open.type === "custom" && overrides[store.id] === undefined) {
      return { open: store.hours_open.open!, close: store.hours_open.close!, is247: false };
    }
    return { open: "00:00", close: "00:00", is247: true };
  }

  const displayedStores = useMemo(() => {
    return showDeviatesOnly ? stores.filter(isDeviate) : stores;
  }, [stores, showDeviatesOnly, overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const deviateCount = useMemo(
    () => stores.filter(isDeviate).length,
    [stores, overrides] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function toggleSelect(storeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === displayedStores.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayedStores.map((s) => s.id)));
    }
  }

  function applyBulk247() {
    const patch: Record<string, HoursOverride | null> = { ...overrides };
    for (const sid of selected) patch[sid] = null; // null = revert to 24/7
    setHours(id!, { storeOverrides: patch });
    setSelected(new Set());
  }

  function applyBulkCustom() {
    const patch: Record<string, HoursOverride | null> = { ...overrides };
    for (const sid of selected) patch[sid] = { open: bulkOpen, close: bulkClose };
    setHours(id!, { storeOverrides: patch });
    setSelected(new Set());
  }

  const allSelected = selected.size === displayedStores.length && displayedStores.length > 0;

  return (
    <div className="wizard-step">
      {/* Toolbar row */}
      <div className="hours-toolbar">
        <span style={{ fontSize: 13, color: "var(--c-ink-60)" }}>
          {stores.length} stores · {deviateCount} deviate from 24/7
        </span>
        <button
          type="button"
          className={`filter-chip${showDeviatesOnly ? " active" : ""}`}
          style={{ fontSize: 12 }}
          onClick={() => {
            setShowDeviatesOnly((v) => !v);
            setSelected(new Set());
          }}
        >
          Show deviations only {deviateCount > 0 && `(${deviateCount})`}
        </button>
      </div>

      {/* Bulk-edit toolbar (appears when rows are checked) */}
      {selected.size > 0 && (
        <div className="bulk-toolbar">
          <span style={{ fontWeight: 600 }}>{selected.size} selected</span>
          <span style={{ color: "var(--c-ink-40)", margin: "0 4px" }}>|</span>
          <button type="button" className="btn btn-sm btn-dark" onClick={applyBulk247}>
            Apply 24/7
          </button>
          <span style={{ fontSize: 12, color: "var(--c-ink-60)" }}>or custom:</span>
          <input
            type="time"
            className="input"
            style={{ width: 110 }}
            value={bulkOpen}
            onChange={(e) => setBulkOpen(e.target.value)}
          />
          <span style={{ fontSize: 12 }}>–</span>
          <input
            type="time"
            className="input"
            style={{ width: 110 }}
            value={bulkClose}
            onChange={(e) => setBulkClose(e.target.value)}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={applyBulkCustom}>
            Apply
          </button>
          <button
            type="button"
            className="btn btn-sm btn-light"
            onClick={() => setSelected(new Set())}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="table-wrapper" style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer" }}
                  aria-label="Select all"
                />
              </th>
              <th>Store</th>
              <th>Region</th>
              <th>Hours</th>
              <th>Hrs/wk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedStores.map((store) => {
              const { open, close, is247 } = getEffectiveHours(store);
              const hpd = is247 ? 24 : hrsPerDay(open, close);
              const hpw = is247 ? 168 : Math.round(hpd * 7);
              const deviate = isDeviate(store);
              const isSelected = selected.has(store.id);
              return (
                <tr
                  key={store.id}
                  style={{ background: isSelected ? "var(--c-signal-light)" : undefined }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(store.id)}
                      style={{ cursor: "pointer" }}
                      aria-label={`Select ${store.name}`}
                    />
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{store.name}</span>
                    <span style={{ fontSize: 11, color: "var(--c-ink-40)", marginLeft: 6 }}>
                      {store.id}
                    </span>
                  </td>
                  <td>{store.region}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {is247 ? "24/7 · 168 hrs/wk" : formatHoursLabel(open, close)}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {hpw}
                  </td>
                  <td>
                    {deviate ? (
                      <span className="pill pill-orange">Deviates</span>
                    ) : (
                      <span className="pill pill-green">24/7</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showDeviatesOnly && deviateCount === 0 && (
        <div className="empty" style={{ paddingTop: "var(--space-xl)" }}>
          <p className="empty__label">No stores deviate from 24/7</p>
        </div>
      )}
    </div>
  );
}
