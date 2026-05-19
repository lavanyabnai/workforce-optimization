export type AssistantScript = {
  prompt: string;
  chunks: string[];
  citations: { label: string; selector: string }[];
};

export const PLAN_SCRIPTS: AssistantScript[] = [
  {
    prompt: "Why did labor % go up?",
    chunks: [
      "Labor % rose ",
      "from 14.9 to 15.0",
      " due to the $0.50",
      "/hr uniform wage",
      " increase across ",
      "all 100 stores—",
      "adding ~$60K.",
    ],
    citations: [
      { label: "Labor % KPI", selector: ".kpi-card--accent" },
      { label: "Wages KPI", selector: ".kpi-card:nth-child(2)" },
    ],
  },
  {
    prompt: "Compare to last quarter",
    chunks: [
      "Vs. Q3 FY26, ",
      "wages are up $60K",
      " (+2.5%) while ",
      "hours held flat ",
      "at 161,200. East",
      " division is the",
      " biggest driver.",
    ],
    citations: [
      { label: "East row", selector: ".data-table tbody tr:nth-child(3)" },
      { label: "Hours KPI", selector: ".kpi-card:nth-child(1)" },
    ],
  },
  {
    prompt: "Suggest a wage scenario",
    chunks: [
      "Try $0.35/hr uni",
      "form—saves $24K ",
      "and keeps labor %",
      " at 14.9. Or lock",
      " East at $0.50, ",
      "West/Central at ",
      "$0.25.",
    ],
    citations: [
      { label: "Wages KPI", selector: ".kpi-card:nth-child(2)" },
      { label: "Labor % KPI", selector: ".kpi-card--accent" },
    ],
  },
  {
    prompt: "Which prerequisite is blocking?",
    chunks: [
      "Labor Standards ",
      "Library shows ",
      "'Needs Refresh'.",
      " Click Refresh ",
      "from FY26 study ",
      "to unblock and ",
      "reach 6 of 6.",
    ],
    citations: [
      { label: "Labor Standards", selector: ".prereq-card:nth-child(5)" },
      { label: "Status banner", selector: ".prereq-banner" },
    ],
  },
];

export const SCHEDULE_SCRIPTS: AssistantScript[] = [
  {
    prompt: "Why is Maria over-scheduled?",
    chunks: [
      "Maria has 42 hrs ",
      "logged vs. her ",
      "40 hr weekly cap.",
      " Sat evening shift",
      " overlaps her ",
      "Mon–Fri contract ",
      "limit.",
    ],
    citations: [
      { label: "Constraints table", selector: ".data-table tbody tr:first-child" },
      { label: "Coverage KPI", selector: ".kpi-strip .kpi-card:last-child" },
    ],
  },
  {
    prompt: "Cheapest way to close the Sat 6am gap?",
    chunks: [
      "Swap in Alex ",
      "(Cashier, Sat ",
      "06:00–14:00, ",
      "$16/hr)—saves $4",
      " vs. next cheapest",
      " option, Jordan.",
    ],
    citations: [
      { label: "Open shift", selector: ".schedule-cell--open" },
      { label: "Wage KPI", selector: ".kpi-strip .kpi-card:nth-child(2)" },
    ],
  },
  {
    prompt: "Will this pass compliance?",
    chunks: [
      "Yes—all shifts ",
      "meet 8h rest. No",
      " employee exceeds",
      " 40 hrs. CA 72-hr",
      " predictive notice",
      " requirement is ",
      "met.",
    ],
    citations: [
      { label: "Budget envelope", selector: ".kpi-strip .kpi-card:first-child" },
      { label: "Match % KPI", selector: ".kpi-strip .kpi-card:nth-child(3)" },
    ],
  },
  {
    prompt: "Compare to last week's actuals",
    chunks: [
      "This week's plan ",
      "is $240 under ",
      "last week's actual",
      "s ($5,610 vs ",
      "$5,850). Coverage",
      " improved from ",
      "91% to 95%.",
    ],
    citations: [
      { label: "Wage KPI", selector: ".kpi-strip .kpi-card:nth-child(2)" },
      { label: "Coverage KPI", selector: ".kpi-strip .kpi-card:last-child" },
    ],
  },
];

export const FALLBACK_RESPONSE =
  "I'd need more context on that — try one of the suggested prompts above.";
