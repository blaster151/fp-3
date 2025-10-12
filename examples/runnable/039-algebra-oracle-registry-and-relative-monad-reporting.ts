import { RunnableExample } from "./types";

type OracleStatus = "active" | "pending" | "failing";

type OracleEntry = {
  readonly id: string;
  readonly status: OracleStatus;
  readonly details: string;
  readonly notes?: string;
};

type Registry = {
  readonly label: string;
  readonly entries: ReadonlyArray<OracleEntry>;
};

type RegistrySummary = {
  readonly label: string;
  readonly total: number;
  readonly active: number;
  readonly pending: number;
  readonly failing: number;
  readonly highlights: ReadonlyArray<string>;
};

type PendingFocus = {
  readonly label: string;
  readonly pending: ReadonlyArray<OracleEntry>;
};

function summariseRegistry(registry: Registry): RegistrySummary {
  const active = registry.entries.filter((entry) => entry.status === "active");
  const pending = registry.entries.filter((entry) => entry.status === "pending");
  const failing = registry.entries.filter((entry) => entry.status === "failing");

  const highlights = [
    ...active.slice(0, 2).map((entry) => `✔ ${entry.id} — ${entry.details}`),
    ...failing.slice(0, 2).map((entry) => `✘ ${entry.id} — ${entry.details}`),
  ];

  return {
    label: registry.label,
    total: registry.entries.length,
    active: active.length,
    pending: pending.length,
    failing: failing.length,
    highlights,
  };
}

function focusPending(registry: Registry): PendingFocus {
  const pending = registry.entries.filter((entry) => entry.status === "pending");
  return { label: registry.label, pending };
}

function renderSummary(summary: RegistrySummary): readonly string[] {
  const header = `== ${summary.label} ==`;
  const lines = [
    header,
    `Total: ${summary.total}`,
    `  ✔ Active: ${summary.active}`,
    `  ⏳ Pending: ${summary.pending}`,
    `  ✘ Failing: ${summary.failing}`,
  ];
  if (summary.highlights.length > 0) {
    lines.push("  Highlights:");
    summary.highlights.forEach((highlight) => lines.push(`    • ${highlight}`));
  }
  return lines;
}

function renderPendingFocus(focus: PendingFocus): readonly string[] {
  if (focus.pending.length === 0) {
    return [`== ${focus.label} (no pending entries) ==`];
  }
  const lines = [`== ${focus.label} pending coverage ==`];
  focus.pending.forEach((entry) => {
    const note = entry.notes ? ` — ${entry.notes}` : "";
    lines.push(`  ⏳ ${entry.id}: ${entry.details}${note}`);
  });
  return lines;
}

function aggregatePortfolio(registries: ReadonlyArray<RegistrySummary>): readonly string[] {
  const total = registries.reduce((sum, summary) => sum + summary.total, 0);
  const active = registries.reduce((sum, summary) => sum + summary.active, 0);
  const pending = registries.reduce((sum, summary) => sum + summary.pending, 0);
  const failing = registries.reduce((sum, summary) => sum + summary.failing, 0);

  return [
    "== Portfolio overview ==",
    `Total oracles: ${total}`,
    `Active: ${active}`,
    `Pending: ${pending}`,
    `Failing: ${failing}`,
  ];
}

function runAlgebraOracleRegistryAndRelativeMonadReporting() {
  const registries: ReadonlyArray<Registry> = [
    {
      label: "Semicartesian",
      entries: [
        { id: "initial-unit", status: "active", details: "Initial object induces canonical global elements." },
        { id: "tensor-projections", status: "pending", details: "Infinite tensor universality", notes: "Awaiting lift audit" },
        { id: "store-lens", status: "active", details: "Store×Lens smoothing witnesses" },
      ],
    },
    {
      label: "Causality",
      entries: [
        { id: "thunkability", status: "active", details: "Thunkable kernels respect deterministic embeddings." },
        { id: "garbling", status: "pending", details: "Dominance comparison", notes: "Requires fresh witnesses" },
      ],
    },
    {
      label: "C*-algebra",
      entries: [
        { id: "axioms", status: "active", details: "C*-identity and involution verified for ℂ." },
        { id: "homomorphisms", status: "active", details: "Conjugation behaves as a *-automorphism." },
        { id: "spectra", status: "pending", details: "Non-trivial spectral radius bounds", notes: "Extend beyond scalars" },
      ],
    },
    {
      label: "Relative monads",
      entries: [
        { id: "registry", status: "active", details: "Two-object equipment witnesses enumerated." },
        { id: "algebras", status: "pending", details: "Opalgebra comparison", notes: "Awaiting density bridge" },
        { id: "skew-bridges", status: "failing", details: "Skew monoid bridge lacks comparison cell." },
      ],
    },
  ];

  const summaries = registries.map(summariseRegistry);
  const pendingFocus = registries.map(focusPending);

  const logs = [
    ...aggregatePortfolio(summaries),
    "",
    ...summaries.flatMap((summary) => [...renderSummary(summary), ""]).slice(0, -1),
    "",
    ...pendingFocus.flatMap((focus) => [...renderPendingFocus(focus), ""]).slice(0, -1),
  ];

  return { logs };
}

export const stage039AlgebraOracleRegistryAndRelativeMonadReporting: RunnableExample = {
  id: "039",
  title: "Algebra oracle registry and relative monad reporting",
  outlineReference: 39,
  summary:
    "Aggregates semicartesian, causality, C*-algebra, and relative monad oracle statuses into a consolidated diagnostic report.",
  async run() {
    return runAlgebraOracleRegistryAndRelativeMonadReporting();
  },
};
