import type { MetaFunction } from "@remix-run/node";
import { useParams } from "@remix-run/react";
import { useId, useMemo, useState } from "react";
import type { FixedCoverageRule } from "~/stores/wizard";
import { useWizardStore } from "~/stores/wizard";

export const meta: MetaFunction = () => [{ title: "Labor Model — BlueNorth WFM" }];
export const handle = { pageTitle: "Plan Wizard" };

// ── Chart computation ─────────────────────────────────────────────────────────

const HOUR_SHAPE = [
  0.018, 0.010, 0.008, 0.008, 0.012, 0.022,
  0.042, 0.058, 0.052, 0.044, 0.040, 0.042,
  0.048, 0.042, 0.040, 0.040, 0.046, 0.058,
  0.068, 0.062, 0.052, 0.042, 0.032, 0.024,
];

const ROLE_WEIGHTS: Record<string, number> = {
  "Store Manager": 0.08,
  "Shift Lead": 0.12,
  "Cashier": 0.25,
  "Sales Associate": 0.20,
  "Food Service": 0.15,
  "Coffee Bar": 0.10,
  "7NOW Driver": 0.10,
};

const DAILY_ITEMS: Record<string, number> = {
  sandwiches: 40,
  hot_dogs: 60,
  taquitos: 80,
  fresh_coffee: 120,
  pizza: 30,
};

const DAILY_SALES = 5000;

type HourPoint = {
  h: number;
  fixed: number;
  iplh: number;
  splh: number;
};

function computeChart(
  splh: Record<string, number>,
  iplh: Record<string, number>,
  rules: FixedCoverageRule[]
): HourPoint[] {
  return Array.from({ length: 24 }, (_, h) => {
    const splhHrs = Object.entries(ROLE_WEIGHTS).reduce((sum, [role, w]) => {
      const rate = splh[role] ?? 130;
      return sum + (DAILY_SALES * HOUR_SHAPE[h] * w) / rate;
    }, 0);

    const iplhHrs = Object.entries(DAILY_ITEMS).reduce((sum, [item, qty]) => {
      const rate = iplh[item] ?? 20;
      return sum + (qty * HOUR_SHAPE[h]) / rate;
    }, 0);

    const fixedHrs = rules.reduce((sum, rule) => {
      const sh = parseInt(rule.start.split(":")[0], 10);
      const eh = parseInt(rule.end.split(":")[0], 10);
      const active = eh > sh ? h >= sh && h < eh : h >= sh || h < eh;
      return sum + (active ? rule.min_count : 0);
    }, 0);

    return { h, fixed: fixedHrs, iplh: iplhHrs, splh: splhHrs };
  });
}

// ── SVG chart ────────────────────────────────────────────────────────────────

const CHART_W = 320;
const CHART_H = 150;
const PAD_L = 28;
const PAD_B = 24;
const PAD_T = 8;
const PAD_R = 8;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

function xPos(h: number) {
  return PAD_L + (h / 23) * PLOT_W;
}
function yPos(v: number, maxV: number) {
  return PAD_T + PLOT_H - (v / maxV) * PLOT_H;
}

function polyPoints(
  pts: { x: number; y: number }[],
  baseline: { x: number; y: number }[]
): string {
  const top = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const bot = [...baseline].reverse().map((p) => `${p.x},${p.y}`).join(" ");
  return `${top} ${bot}`;
}

function LaborChart({ data }: { data: HourPoint[] }) {
  const maxV = useMemo(() => {
    return Math.max(
      ...data.map((d) => d.fixed + d.iplh + d.splh),
      1
    ) * 1.15;
  }, [data]);

  const fixedPts = data.map((d) => ({ x: xPos(d.h), y: yPos(d.fixed, maxV) }));
  const iplhPts = data.map((d) => ({ x: xPos(d.h), y: yPos(d.fixed + d.iplh, maxV) }));
  const splhPts = data.map((d) => ({ x: xPos(d.h), y: yPos(d.fixed + d.iplh + d.splh, maxV) }));

  const baseBottom = data.map((d) => ({ x: xPos(d.h), y: yPos(0, maxV) }));
  const baseSplhBottom = data.map((d) => ({
    x: xPos(d.h),
    y: yPos(d.fixed + d.iplh, maxV),
  }));
  const baseIplhBottom = data.map((d) => ({
    x: xPos(d.h),
    y: yPos(d.fixed, maxV),
  }));

  const yLabels = [0, Math.round(maxV / 2), Math.round(maxV)];

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      style={{ width: "100%", display: "block" }}
      aria-label="Labor demand preview chart"
    >
      {/* Grid lines */}
      {yLabels.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            x2={CHART_W - PAD_R}
            y1={yPos(v, maxV)}
            y2={yPos(v, maxV)}
            stroke="var(--c-ink-10)"
            strokeWidth="1"
          />
          <text
            x={PAD_L - 4}
            y={yPos(v, maxV) + 4}
            textAnchor="end"
            fontSize="9"
            fill="var(--c-ink-40)"
            fontFamily="var(--font-mono)"
          >
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Fixed coverage area (orange) */}
      <polygon
        points={polyPoints(fixedPts, baseBottom)}
        fill="var(--c-orange)"
        opacity="0.25"
      />
      <polyline
        points={fixedPts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="var(--c-orange)"
        strokeWidth="1.5"
        strokeDasharray="4,3"
      />

      {/* IPLH area (blue) */}
      <polygon
        points={polyPoints(iplhPts, baseIplhBottom)}
        fill="#4B87FF"
        opacity="0.20"
      />
      <polyline
        points={iplhPts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#4B87FF"
        strokeWidth="1.5"
      />

      {/* SPLH area (signal green) */}
      <polygon
        points={polyPoints(splhPts, baseSplhBottom)}
        fill="var(--c-signal)"
        opacity="0.25"
      />
      <polyline
        points={splhPts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="var(--c-signal-dark)"
        strokeWidth="1.5"
      />

      {/* X-axis hour labels */}
      {[0, 6, 12, 18, 23].map((h) => (
        <text
          key={h}
          x={xPos(h)}
          y={CHART_H - 6}
          textAnchor="middle"
          fontSize="9"
          fill="var(--c-ink-40)"
          fontFamily="var(--font-mono)"
        >
          {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
        </text>
      ))}

      {/* Bottom axis line */}
      <line
        x1={PAD_L}
        x2={CHART_W - PAD_R}
        y1={PAD_T + PLOT_H}
        y2={PAD_T + PLOT_H}
        stroke="var(--c-ink-20)"
        strokeWidth="1"
      />
    </svg>
  );
}

// ── Accordion ────────────────────────────────────────────────────────────────

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion__item">
      <button
        type="button"
        className="accordion__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        >
          <polyline points="2,4 7,10 12,4" />
        </svg>
      </button>
      {open && <div className="accordion__content">{children}</div>}
    </div>
  );
}

// ── Inline number input for SPLH / IPLH values ───────────────────────────────

function NumInput({
  value,
  onChange,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  const uid = useId();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {prefix && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-ink-60)" }}>
          {prefix}
        </span>
      )}
      <input
        id={uid}
        type="number"
        className="input"
        style={{ width: 80, fontFamily: "var(--font-mono)", fontSize: 13, padding: "4px 8px" }}
        value={value}
        min={1}
        step={1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {suffix && (
        <span style={{ fontSize: 11, color: "var(--c-ink-60)", whiteSpace: "nowrap" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

// ── Fixed Coverage Rule row ──────────────────────────────────────────────────

const ROLES = [
  "Store Manager", "Shift Lead", "Cashier",
  "Sales Associate", "Food Service", "Coffee Bar", "7NOW Driver",
];

const DAYPART_LABELS: Record<string, string> = {
  overnight: "Overnight (12a–6a)",
  morning_rush: "Morning Rush (6a–10a)",
  midday: "Midday (10a–2p)",
  afternoon: "Afternoon (2p–5p)",
  evening_peak: "Evening Peak (5p–8p)",
  late_evening: "Late Evening (8p–12a)",
};

function CoverageRuleRow({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: FixedCoverageRule;
  onUpdate: (patch: Partial<FixedCoverageRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="coverage-rule-row">
      <select
        className="select"
        style={{ width: 190, fontSize: 12 }}
        value={rule.daypart}
        onChange={(e) => {
          const def: Record<string, { start: string; end: string }> = {
            overnight: { start: "00:00", end: "06:00" },
            morning_rush: { start: "06:00", end: "10:00" },
            midday: { start: "10:00", end: "14:00" },
            afternoon: { start: "14:00", end: "17:00" },
            evening_peak: { start: "17:00", end: "20:00" },
            late_evening: { start: "20:00", end: "00:00" },
          };
          const times = def[e.target.value] ?? { start: "00:00", end: "06:00" };
          onUpdate({ daypart: e.target.value, ...times });
        }}
      >
        {Object.entries(DAYPART_LABELS).map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>

      <select
        className="select"
        style={{ width: 140, fontSize: 12 }}
        value={rule.role}
        onChange={(e) => onUpdate({ role: e.target.value })}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <NumInput
        value={rule.min_count}
        suffix="min"
        onChange={(v) => onUpdate({ min_count: v })}
      />

      <button
        type="button"
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--c-ink-40)",
          fontSize: 16,
          lineHeight: 1,
          padding: "0 4px",
        }}
        aria-label="Remove rule"
      >
        ×
      </button>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function LaborModel() {
  const { id } = useParams();
  const laborModel = useWizardStore((s) => s.drafts[id!]?.laborModel);
  const setLaborModel = useWizardStore((s) => s.setLaborModel);

  const splh = laborModel?.splhTargets ?? {};
  const iplh = laborModel?.iplhTargets ?? {};
  const rules = laborModel?.fixedCoverageRules ?? [];

  const chartData = useMemo(
    () => computeChart(splh, iplh, rules),
    [splh, iplh, rules]
  );

  function setSplh(role: string, v: number) {
    setLaborModel(id!, { splhTargets: { ...splh, [role]: v } });
  }

  function setIplh(item: string, v: number) {
    setLaborModel(id!, { iplhTargets: { ...iplh, [item]: v } });
  }

  function updateRule(idx: number, patch: Partial<FixedCoverageRule>) {
    const updated = rules.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setLaborModel(id!, { fixedCoverageRules: updated });
  }

  function removeRule(idx: number) {
    setLaborModel(id!, { fixedCoverageRules: rules.filter((_, i) => i !== idx) });
  }

  function addRule() {
    const newRule: FixedCoverageRule = {
      id: `FCR-${Date.now()}`,
      daypart: "overnight",
      start: "00:00",
      end: "06:00",
      role: "Cashier",
      min_count: 1,
    };
    setLaborModel(id!, { fixedCoverageRules: [...rules, newRule] });
  }

  const splhRoles = Object.keys(ROLE_WEIGHTS);
  const iplhItems = ["sandwiches", "hot_dogs", "taquitos", "fresh_coffee", "pizza"];
  const iplhLabels: Record<string, string> = {
    sandwiches: "Sandwiches",
    hot_dogs: "Hot Dogs",
    taquitos: "Taquitos",
    fresh_coffee: "Fresh Coffee",
    pizza: "Pizza",
  };

  return (
    <div className="wizard-step">
      <div className="labor-split">
        {/* ── Left: accordion ── */}
        <div>
          <div className="accordion">
            {/* SPLH Targets */}
            <AccordionSection title="SPLH Targets — Sales per Labor Hour by Role">
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>SPLH Target</th>
                    <th style={{ fontSize: 10 }}>Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {splhRoles.map((role) => (
                    <tr key={role}>
                      <td style={{ fontWeight: 500 }}>{role}</td>
                      <td>
                        <NumInput
                          value={splh[role] ?? 130}
                          prefix="$"
                          suffix="/ hr"
                          onChange={(v) => setSplh(role, v)}
                        />
                      </td>
                      <td>
                        <span className="pill pill-grey" style={{ fontSize: 10 }}>SPLH</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AccordionSection>

            {/* IPLH Targets */}
            <AccordionSection title="IPLH Targets — Items per Labor Hour (Foodservice)">
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Item Type</th>
                    <th>IPLH Target</th>
                    <th style={{ fontSize: 10 }}>Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {iplhItems.map((item) => (
                    <tr key={item}>
                      <td style={{ fontWeight: 500 }}>{iplhLabels[item]}</td>
                      <td>
                        <NumInput
                          value={iplh[item] ?? 20}
                          suffix="items / hr"
                          onChange={(v) => setIplh(item, v)}
                        />
                      </td>
                      <td>
                        <span className="pill pill-grape" style={{ fontSize: 10 }}>IPLH</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AccordionSection>

            {/* Fixed Coverage Rules */}
            <AccordionSection title="Fixed Coverage Rules — Minimum Staffing by Daypart">
              {rules.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--c-ink-60)", margin: "0 0 var(--space-md)" }}>
                  No rules configured. Add a rule below.
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {rules.map((rule, idx) => (
                  <CoverageRuleRow
                    key={rule.id}
                    rule={rule}
                    onUpdate={(patch) => updateRule(idx, patch)}
                    onRemove={() => removeRule(idx)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-light btn-sm"
                style={{ marginTop: "var(--space-md)" }}
                onClick={addRule}
              >
                + Add Rule
              </button>
            </AccordionSection>
          </div>
        </div>

        {/* ── Right: live preview chart ── */}
        <div className="labor-chart-panel">
          <p className="labor-chart__title">Demand-Driven Labor Preview</p>
          <p style={{ fontSize: 11, color: "var(--c-ink-60)", marginBottom: "var(--space-md)", marginTop: "-var(--space-xs)" }}>
            Typical day · single store · updates live
          </p>
          <LaborChart data={chartData} />
          <div className="labor-chart__legend">
            <div className="labor-chart__legend-item">
              <div className="labor-chart__legend-dot" style={{ background: "var(--c-signal-dark)" }} />
              SPLH-driven
            </div>
            <div className="labor-chart__legend-item">
              <div className="labor-chart__legend-dot" style={{ background: "#4B87FF" }} />
              IPLH-driven
            </div>
            <div className="labor-chart__legend-item">
              <div className="labor-chart__legend-dot" style={{ background: "var(--c-orange)" }} />
              Fixed coverage floor
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
