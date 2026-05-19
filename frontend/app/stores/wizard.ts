import { create } from "zustand";

export type FixedCoverageRule = {
  id: string;
  daypart: string;
  start: string;
  end: string;
  role: string;
  min_count: number;
};

export type HoursOverride = {
  open: string;
  close: string;
};

export type WizardPrereqs = {
  baselinePlanId: string;
  locationScope: string;
  laborStandardsReady: boolean;
  approvalWorkflow: string;
};

export type WizardHours = {
  storeOverrides: Record<string, HoursOverride | null>;
};

export type WizardLaborModel = {
  splhTargets: Record<string, number>;
  iplhTargets: Record<string, number>;
  fixedCoverageRules: FixedCoverageRule[];
};

export type WageMode = "uniform" | "by_role" | "by_region";

export type WizardWageRate = {
  mode: WageMode;
  uniformDelta: number;
  roleDeltas: Record<string, number>;
  regionDeltas: Record<string, number>;
};

export type ForecastCell = {
  period: number;
  division: string;
  demand_dollars: number;
};

export type WizardForecast = {
  overrides: ForecastCell[];
};

export type RunResult = {
  total_hours: number;
  total_wages: number;
  labor_pct: number;
  by_division: Record<
    string,
    {
      hours: number;
      wages_budget: number;
      wages_projected: number;
      labor_pct: number;
    }
  >;
};

export type WizardInputs = {
  prereqs: WizardPrereqs;
  hours: WizardHours;
  laborModel: WizardLaborModel;
  wageRate: WizardWageRate;
  forecast: WizardForecast;
};

type WizardStore = {
  drafts: Record<string, Partial<WizardInputs>>;
  runResults: Record<string, RunResult>;
  initFromServer: (id: string, inputs: Record<string, unknown>) => void;
  setPrereqs: (id: string, patch: Partial<WizardPrereqs>) => void;
  setHours: (id: string, patch: Partial<WizardHours>) => void;
  setLaborModel: (id: string, patch: Partial<WizardLaborModel>) => void;
  setWageRate: (id: string, patch: Partial<WizardWageRate>) => void;
  setForecast: (id: string, patch: Partial<WizardForecast>) => void;
  setRunResult: (id: string, result: RunResult) => void;
  getForecastCell: (id: string, period: number, division: string) => number | null;
  setForecastCell: (id: string, period: number, division: string, value: number) => void;
  resetForecastCell: (id: string, period: number, division: string) => void;
};

const DEFAULT_SPLH: Record<string, number> = {
  "Store Manager": 200,
  "Shift Lead": 180,
  "Cashier": 130,
  "Sales Associate": 120,
  "Food Service": 110,
  "Coffee Bar": 100,
  "7NOW Driver": 95,
};

const DEFAULT_IPLH: Record<string, number> = {
  sandwiches: 18,
  hot_dogs: 22,
  taquitos: 24,
  fresh_coffee: 30,
  pizza: 14,
};

const DEFAULT_RULES: FixedCoverageRule[] = [
  { id: "FCR-001", daypart: "overnight", start: "00:00", end: "06:00", role: "Cashier", min_count: 1 },
  { id: "FCR-002", daypart: "overnight", start: "00:00", end: "06:00", role: "Shift Lead", min_count: 1 },
  { id: "FCR-003", daypart: "morning_rush", start: "06:00", end: "10:00", role: "Coffee Bar", min_count: 1 },
  { id: "FCR-004", daypart: "evening_peak", start: "17:00", end: "20:00", role: "Cashier", min_count: 2 },
];

const DEFAULT_ROLE_DELTAS: Record<string, number> = {
  "Store Manager": 0.50,
  "Shift Lead": 0.50,
  "Cashier": 0.50,
  "Sales Associate": 0.50,
  "Food Service": 0.50,
  "Coffee Bar": 0.50,
  "7NOW Driver": 0.50,
};

const DEFAULT_REGION_DELTAS: Record<string, number> = {
  West: 0.50,
  Central: 0.50,
  East: 0.50,
};

function buildLaborModelFromInputs(inputs: Record<string, unknown>): WizardLaborModel {
  const lm = (inputs.labor_model ?? {}) as Record<string, unknown>;
  return {
    splhTargets: (lm.splh_targets as Record<string, number>) ?? { ...DEFAULT_SPLH },
    iplhTargets: (lm.iplh_targets as Record<string, number>) ?? { ...DEFAULT_IPLH },
    fixedCoverageRules: Array.isArray(lm.fixed_coverage)
      ? (lm.fixed_coverage as FixedCoverageRule[])
      : DEFAULT_RULES,
  };
}

function buildHoursFromInputs(inputs: Record<string, unknown>): WizardHours {
  const oh = (inputs.operating_hours ?? {}) as Record<string, unknown>;
  const devStores = Array.isArray(oh.deviating_stores) ? (oh.deviating_stores as string[]) : [];
  const devHours = (oh.deviated_hours ?? { open: "06:00", close: "23:00" }) as HoursOverride;
  const overrides: Record<string, HoursOverride | null> = {};
  for (const s of devStores) overrides[s] = devHours;
  return { storeOverrides: overrides };
}

function buildWageRateFromInputs(inputs: Record<string, unknown>): WizardWageRate {
  const wr = (inputs.wage_rate ?? {}) as Record<string, unknown>;
  return {
    mode: (wr.mode as WageMode) ?? "uniform",
    uniformDelta: (wr.uniform_delta as number) ?? 0.50,
    roleDeltas: (wr.role_deltas as Record<string, number>) ?? { ...DEFAULT_ROLE_DELTAS },
    regionDeltas: (wr.region_deltas as Record<string, number>) ?? { ...DEFAULT_REGION_DELTAS },
  };
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  drafts: {},
  runResults: {},

  initFromServer: (id, inputs) => {
    const existing = get().drafts[id] ?? {};
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: {
          prereqs: existing.prereqs ?? {
            baselinePlanId: "PLAN-2025-BASELINE",
            locationScope: "all",
            laborStandardsReady: false,
            approvalWorkflow: "carla",
          },
          hours: existing.hours ?? buildHoursFromInputs(inputs),
          laborModel: existing.laborModel ?? buildLaborModelFromInputs(inputs),
          wageRate: existing.wageRate ?? buildWageRateFromInputs(inputs),
          forecast: existing.forecast ?? { overrides: [] },
        },
      },
    }));
  },

  setPrereqs: (id, patch) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: { ...s.drafts[id], prereqs: { ...(s.drafts[id]?.prereqs ?? {}), ...patch } as WizardPrereqs },
      },
    })),

  setHours: (id, patch) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: {
          ...s.drafts[id],
          hours: { storeOverrides: {}, ...(s.drafts[id]?.hours ?? {}), ...patch },
        },
      },
    })),

  setLaborModel: (id, patch) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: {
          ...s.drafts[id],
          laborModel: { ...(s.drafts[id]?.laborModel ?? {}), ...patch } as WizardLaborModel,
        },
      },
    })),

  setWageRate: (id, patch) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: {
          ...s.drafts[id],
          wageRate: { ...(s.drafts[id]?.wageRate ?? {}), ...patch } as WizardWageRate,
        },
      },
    })),

  setForecast: (id, patch) =>
    set((s) => ({
      drafts: {
        ...s.drafts,
        [id]: {
          ...s.drafts[id],
          forecast: { ...(s.drafts[id]?.forecast ?? { overrides: [] }), ...patch },
        },
      },
    })),

  setRunResult: (id, result) =>
    set((s) => ({ runResults: { ...s.runResults, [id]: result } })),

  getForecastCell: (id, period, division) => {
    const overrides = get().drafts[id]?.forecast?.overrides ?? [];
    const found = overrides.find((o) => o.period === period && o.division === division);
    return found ? found.demand_dollars : null;
  },

  setForecastCell: (id, period, division, value) =>
    set((s) => {
      const existing = s.drafts[id]?.forecast?.overrides ?? [];
      const filtered = existing.filter((o) => !(o.period === period && o.division === division));
      return {
        drafts: {
          ...s.drafts,
          [id]: {
            ...s.drafts[id],
            forecast: { overrides: [...filtered, { period, division, demand_dollars: value }] },
          },
        },
      };
    }),

  resetForecastCell: (id, period, division) =>
    set((s) => {
      const existing = s.drafts[id]?.forecast?.overrides ?? [];
      return {
        drafts: {
          ...s.drafts,
          [id]: {
            ...s.drafts[id],
            forecast: {
              overrides: existing.filter((o) => !(o.period === period && o.division === division)),
            },
          },
        },
      };
    }),
}));
