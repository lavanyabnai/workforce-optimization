import { useEffect, useState } from "react";
import { useOutletContext } from "@remix-run/react";
import { useScheduleWizardStore, type Employee } from "~/stores/scheduleWizard";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ROLE_COLORS: Record<string, string> = {
  "Store Manager":   "#7b2d8b",
  "Shift Lead":      "#0077cc",
  "Cashier":         "#00c36c",
  "Sales Associate": "#ff6600",
  "Food Service":    "#009e56",
  "Coffee Bar":      "#b45309",
  "7NOW Driver":     "#e8244e",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("");
}

type PrefDrawerState = { empId: string; current: string } | null;

export default function ScheduleConstraints() {
  const { storeId } = useOutletContext<{ storeId: string }>();
  const employees = useScheduleWizardStore((s) => s.employees);
  const availEdits = useScheduleWizardStore((s) => s.availabilityEdits);
  const setEmployees = useScheduleWizardStore((s) => s.setEmployees);
  const toggleAvailability = useScheduleWizardStore((s) => s.toggleAvailability);

  const [prefDrawer, setPrefDrawer] = useState<PrefDrawerState>(null);
  const [fetchedRef] = useState({ done: false });

  useEffect(() => {
    if (fetchedRef.done || employees.length > 0) return;
    fetchedRef.done = true;
    fetch(`http://localhost:8000/api/employees?store_id=${storeId}`)
      .then((r) => r.json())
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {});
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function getAvailability(emp: Employee, day: string) {
    const edit = availEdits[emp.id]?.[day];
    if (edit !== undefined) return edit;
    return emp.availability[day] ?? null;
  }

  function cellActive(emp: Employee, day: string): boolean {
    return getAvailability(emp, day) !== null;
  }

  return (
    <div className="wizard-step">
      <p className="subtitle" style={{ marginBottom: 16 }}>
        Review employee roster, availability, and constraints for the selected week.
        Click availability cells to toggle · Click <strong>Add Preference</strong> to set shift type.
      </p>

      <div className="table-wrapper" style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 960 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Contract</th>
              <th style={{ textAlign: "right" }}>Max Hrs/Wk</th>
              <th style={{ textAlign: "right" }}>Wage</th>
              <th>Skills</th>
              <th>Availability</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                {/* Name */}
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      className="sched-avatar"
                      style={{ background: ROLE_COLORS[emp.role] ?? "var(--c-ink)" }}
                    >
                      {initials(emp.name)}
                    </span>
                    <span style={{ fontWeight: 600 }}>{emp.name}</span>
                  </div>
                </td>

                {/* Role */}
                <td>
                  <span style={{ color: ROLE_COLORS[emp.role], fontWeight: 600, fontSize: 12 }}>
                    {emp.role}
                  </span>
                </td>

                {/* Contract */}
                <td>
                  <span className={`pill ${emp.contract === "FT" ? "pill-green" : "pill-grey"}`}>
                    {emp.contract}
                  </span>
                </td>

                {/* Max Hrs */}
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {emp.max_hrs_week}h
                </td>

                {/* Wage */}
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  ${emp.hourly_wage.toFixed(2)}
                </td>

                {/* Skills */}
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {emp.skills.map((sk) => (
                      <span key={sk} className="sched-skill-chip">{sk.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </td>

                {/* Availability mini-grid */}
                <td>
                  <div className="sched-avail-grid" title="Click to toggle availability">
                    {DAYS.map((day) => {
                      const active = cellActive(emp, day);
                      const avail = getAvailability(emp, day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`sched-avail-cell${active ? " active" : ""}`}
                          title={
                            active && avail
                              ? `${day}: ${avail.start}–${avail.end}`
                              : `${day}: Unavailable`
                          }
                          onClick={() => toggleAvailability(emp.id, day)}
                        >
                          {day[0]}
                        </button>
                      );
                    })}
                  </div>
                </td>

                {/* Row action */}
                <td>
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={() =>
                      setPrefDrawer({
                        empId: emp.id,
                        current: emp.preferences?.shift_type ?? "day",
                      })
                    }
                  >
                    Add Preference
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <div className="empty">
          <div className="spinner" />
          <p className="empty__label" style={{ marginTop: 12 }}>Loading roster…</p>
        </div>
      )}

      {/* ── Preference drawer ── */}
      {prefDrawer && (
        <div className="modal-backdrop" onClick={() => setPrefDrawer(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 340 }}
          >
            <div className="modal__header">
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
                Set Preferred Shift
              </span>
              <button type="button" className="modal__close" onClick={() => setPrefDrawer(null)}>✕</button>
            </div>
            <div className="modal__body">
              {["morning", "day", "evening", "overnight"].map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    cursor: "pointer",
                    borderBottom: "var(--border-default)",
                  }}
                >
                  <input
                    type="radio"
                    name="pref"
                    value={type}
                    defaultChecked={prefDrawer.current === type}
                    onChange={() => setPrefDrawer({ ...prefDrawer, current: type })}
                  />
                  <span style={{ textTransform: "capitalize" }}>{type}</span>
                </label>
              ))}
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn-light btn-sm"
                onClick={() => setPrefDrawer(null)}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm"
                onClick={() => setPrefDrawer(null)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
