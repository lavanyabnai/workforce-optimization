import { create } from "zustand";

export type Employee = {
  id: string;
  store_id: string;
  name: string;
  role: string;
  contract: "FT" | "PT";
  max_hrs_week: number;
  hourly_wage: number;
  skills: string[];
  availability: Record<string, { start: string; end: string } | null>;
  preferences: { shift_type: string; max_consecutive_days: number };
};

// Matches the backend solver response exactly
export type Shift = {
  shift_id: string;
  employee_id: string | null;
  employee_name: string | null;
  role: string;
  day: string;
  start: string;
  end: string;
  is_open: boolean;
  shift_label: string;
  review_flag?: boolean;
};

export type OptimizeKPIs = {
  employee_match_pct: number;
  ot_hours: number;
  total_wage: number;
  coverage_pct: number;
  num_open_shifts: number;
};

export type OptimizeResult = {
  schedule_id: string;
  store_id: string;
  week_iso: string;
  kpis: OptimizeKPIs;
  shifts: Shift[];
};

export type Envelope = {
  approved_hours: number;
  approved_wages: number;
  labor_pct: number;
  scenario_name: string;
};

type ScheduleWizardStore = {
  storeId: string;
  week: string;
  envelope: Envelope | null;
  employees: Employee[];
  availabilityEdits: Record<string, Record<string, { start: string; end: string } | null>>;
  demandOverrides: Record<string, number>;
  optimizeResult: OptimizeResult | null;
  publishedSchedules: Record<string, OptimizeResult>;

  setStore: (storeId: string) => void;
  setWeek: (week: string) => void;
  setEnvelope: (envelope: Envelope) => void;
  setEmployees: (employees: Employee[]) => void;
  toggleAvailability: (empId: string, day: string) => void;
  setDemandOverride: (day: string, hour: number, multiplier: number) => void;
  setOptimizeResult: (result: OptimizeResult) => void;
  updateShift: (shiftId: string, patch: Partial<Shift>) => void;
  publishSchedule: () => void;
  getCachedResult: (storeId: string, week: string) => OptimizeResult | null;
};

const DEMO_ENVELOPE: Envelope = {
  approved_hours: 310,
  approved_wages: 5_850,
  labor_pct: 14.8,
  scenario_name: "FY26 Increase Wage Rate (Approved Mar 10, 2026)",
};

export const useScheduleWizardStore = create<ScheduleWizardStore>((set, get) => ({
  storeId: "S-0001",
  week: "2026-W12",
  envelope: DEMO_ENVELOPE,
  employees: [],
  availabilityEdits: {},
  demandOverrides: {},
  optimizeResult: null,
  publishedSchedules: {},

  setStore: (storeId) => set({ storeId }),
  setWeek: (week) => set({ week }),
  setEnvelope: (envelope) => set({ envelope }),
  setEmployees: (employees) => set({ employees }),

  toggleAvailability: (empId, day) =>
    set((s) => {
      const emp = s.employees.find((e) => e.id === empId);
      if (!emp) return s;
      const current = s.availabilityEdits[empId]?.[day] ?? emp.availability[day] ?? null;
      return {
        availabilityEdits: {
          ...s.availabilityEdits,
          [empId]: {
            ...(s.availabilityEdits[empId] ?? {}),
            [day]: current ? null : { start: "09:00", end: "17:00" },
          },
        },
      };
    }),

  setDemandOverride: (day, hour, multiplier) =>
    set((s) => ({ demandOverrides: { ...s.demandOverrides, [`${day}:${hour}`]: multiplier } })),

  setOptimizeResult: (result) => set({ optimizeResult: result }),

  updateShift: (shiftId, patch) =>
    set((s) => {
      if (!s.optimizeResult) return s;
      return {
        optimizeResult: {
          ...s.optimizeResult,
          shifts: s.optimizeResult.shifts.map((sh) =>
            sh.shift_id === shiftId ? { ...sh, ...patch } : sh
          ),
        },
      };
    }),

  publishSchedule: () =>
    set((s) => {
      if (!s.optimizeResult) return s;
      const key = `${s.storeId}:${s.week}`;
      return {
        publishedSchedules: { ...s.publishedSchedules, [key]: s.optimizeResult },
      };
    }),

  getCachedResult: (storeId, week) => {
    const key = `${storeId}:${week}`;
    return get().publishedSchedules[key] ?? null;
  },
}));
