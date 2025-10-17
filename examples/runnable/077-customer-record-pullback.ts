import type { FiniteCategory } from "../../finite-cat";
import { makeFinitePullbackCalculator, type PullbackData } from "../../pullback";
import type { RunnableExample } from "./types";

type SalesRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
};

type SupportRow = {
  readonly id: string;
  readonly ticket: string;
  readonly status: "Open" | "Closed";
};

type JointRow = {
  readonly id: string;
  readonly sales: SalesRow;
  readonly support: SupportRow;
};

type MarketingRow = {
  readonly campaign: string;
  readonly id: string;
};

type CustomerObject = "Sales" | "Support" | "IdIndex" | "Joint" | "Marketing";

interface CustomerArrow {
  readonly name: string;
  readonly src: CustomerObject;
  readonly dst: CustomerObject;
  readonly apply: (value: unknown) => unknown;
}

const salesRows: ReadonlyArray<SalesRow> = [
  { id: "A-001", name: "Alice Johnson", email: "alice@example.com" },
  { id: "B-002", name: "Bob Singh", email: "bob@example.com" },
  { id: "C-003", name: "Cara Nwosu", email: "cara@example.com" },
];

const supportRows: ReadonlyArray<SupportRow> = [
  { id: "A-001", ticket: "#2024-17", status: "Open" },
  { id: "B-002", ticket: "#2024-18", status: "Closed" },
  { id: "D-004", ticket: "#2024-25", status: "Open" },
];

const marketingRows: ReadonlyArray<MarketingRow> = [
  { campaign: "Spring loyalty", id: "A-001" },
  { campaign: "Reactivation", id: "B-002" },
];

const idUniverse: ReadonlyArray<string> = ["A-001", "B-002", "C-003", "D-004"];

const salesById = new Map(salesRows.map((row) => [row.id, row] as const));
const supportById = new Map(supportRows.map((row) => [row.id, row] as const));

const jointRows: ReadonlyArray<JointRow> = salesRows.flatMap((sales) => {
  const support = supportById.get(sales.id);
  return support ? [{ id: sales.id, sales, support } as const] : [];
});

const jointById = new Map(jointRows.map((row) => [row.id, row] as const));

const marketingToJointById = new Map(
  marketingRows
    .map((row) => {
      const joint = jointById.get(row.id);
      return joint ? ([row.id, joint] as const) : undefined;
    })
    .filter((entry): entry is readonly [string, JointRow] => entry !== undefined),
);

const objectElements: Record<CustomerObject, ReadonlyArray<unknown>> = {
  Sales: salesRows,
  Support: supportRows,
  IdIndex: idUniverse,
  Joint: jointRows,
  Marketing: marketingRows,
};

const objectEq: Record<CustomerObject, (a: unknown, b: unknown) => boolean> = {
  Sales: (a, b) => (a as SalesRow).id === (b as SalesRow).id,
  Support: (a, b) => (a as SupportRow).id === (b as SupportRow).id,
  IdIndex: (a, b) => a === b,
  Joint: (a, b) => (a as JointRow).id === (b as JointRow).id,
  Marketing: (a, b) => (a as MarketingRow).id === (b as MarketingRow).id,
};

const makeArrow = (
  name: string,
  src: CustomerObject,
  dst: CustomerObject,
  apply: (value: unknown) => unknown,
): CustomerArrow => ({ name, src, dst, apply });

const idArrow = (object: CustomerObject): CustomerArrow =>
  makeArrow(`id_${object}`, object, object, (value) => value);

const salesToId = makeArrow("salesToId", "Sales", "IdIndex", (value) => (value as SalesRow).id);
const supportToId = makeArrow("supportToId", "Support", "IdIndex", (value) => (value as SupportRow).id);
const jointToSales = makeArrow("jointToSales", "Joint", "Sales", (value) => (value as JointRow).sales);
const jointToSupport = makeArrow("jointToSupport", "Joint", "Support", (value) => (value as JointRow).support);
const marketingToSales = makeArrow("marketingToSales", "Marketing", "Sales", (value) => {
  const { id } = value as MarketingRow;
  const match = salesById.get(id);
  if (!match) throw new Error(`Marketing row ${id} missing Sales entry.`);
  return match;
});
const marketingToSupport = makeArrow("marketingToSupport", "Marketing", "Support", (value) => {
  const { id } = value as MarketingRow;
  const match = supportById.get(id);
  if (!match) throw new Error(`Marketing row ${id} missing Support entry.`);
  return match;
});
const marketingToJoint = makeArrow("marketingToJoint", "Marketing", "Joint", (value) => {
  const { id } = value as MarketingRow;
  const match = marketingToJointById.get(id);
  if (!match) throw new Error(`Marketing row ${id} missing reconciled entry.`);
  return match;
});

const objects: ReadonlyArray<CustomerObject> = ["Joint", "Sales", "Support", "IdIndex", "Marketing"];

const baseArrows: ReadonlyArray<CustomerArrow> = [
  idArrow("Sales"),
  idArrow("Support"),
  idArrow("IdIndex"),
  idArrow("Joint"),
  idArrow("Marketing"),
  salesToId,
  supportToId,
  jointToSales,
  jointToSupport,
  marketingToSales,
  marketingToSupport,
  marketingToJoint,
];

const compose = (g: CustomerArrow, f: CustomerArrow): CustomerArrow => {
  if (f.dst !== g.src) {
    throw new Error(`Cannot compose ${g.name} ∘ ${f.name}: codomain/domain mismatch.`);
  }
  return makeArrow(`${g.name}∘${f.name}`, f.src, g.dst, (value) => g.apply(f.apply(value)));
};

const eqArrow = (a: CustomerArrow, b: CustomerArrow): boolean => {
  if (a.src !== b.src || a.dst !== b.dst) return false;
  const domain = objectElements[a.src];
  const eqCodomain = objectEq[a.dst];
  return domain.every((element) => eqCodomain(a.apply(element), b.apply(element)));
};

const CustomerCategory: FiniteCategory<CustomerObject, CustomerArrow> = {
  objects,
  arrows: baseArrows,
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: eqArrow,
};

const pullbacks = makeFinitePullbackCalculator(CustomerCategory);

const describeJointRow = (row: JointRow): string =>
  `${row.id}: ${row.sales.name} ↔ ${row.support.ticket} (${row.support.status})`;

const describePullback = (data: PullbackData<CustomerObject, CustomerArrow>): readonly string[] => [
  `Apex chosen by universal property: ${data.apex}`,
  `  • projection to Sales: ${data.toDomain.name}`,
  `  • projection to Support: ${data.toAnchor.name}`,
];

function reconcileCustomerRecords(): readonly string[] {
  const pullbackData = pullbacks.pullback(salesToId, supportToId);

  const jointConsistency = eqArrow(
    compose(salesToId, pullbackData.toDomain),
    compose(supportToId, pullbackData.toAnchor),
  );

  const reconciledRows = jointRows.map((row) => describeJointRow(row));

  const marketingChecks = marketingRows.map((row) => {
    const projectedSales = marketingToSales.apply(row) as SalesRow;
    const projectedSupport = marketingToSupport.apply(row) as SupportRow;
    const reconciled = marketingToJoint.apply(row) as JointRow;
    const matchesPair =
      reconciled.sales.id === projectedSales.id && reconciled.support.id === projectedSupport.id;
    return `Marketing campaign '${row.campaign}' factors through joint view? ${matchesPair}`;
  });

  return [
    "== Source tables ==",
    ...salesRows.map((row) => `Sales ${row.id}: ${row.name} <${row.email}>`),
    ...supportRows.map((row) => `Support ${row.id}: ticket ${row.ticket} (${row.status})`),
    "",
    "== Pullback search over FinSet diagram ==",
    ...describePullback(pullbackData),
    `  • commuting square confirmed? ${jointConsistency}`,
    "",
    "== Golden record pairs ==",
    ...reconciledRows,
    "",
    "== Marketing projections factor uniquely ==",
    ...marketingChecks,
  ];
}

export const stage077CustomerRecordPullback: RunnableExample = {
  id: "077",
  title: "Customer record pullback reconciliation",
  outlineReference: 77,
  summary:
    "Model sales/support spreadsheets as a FinSet cospan, compute their pullback, and show marketing views factor through the reconciled golden records.",
  run: async () => ({ logs: reconcileCustomerRecords() }),
};

