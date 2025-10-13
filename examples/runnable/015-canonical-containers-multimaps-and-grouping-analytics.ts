import type { RunnableExample } from "./types";
import { canonicalKey, hashCanonical } from "./json-canonical";

type Purchase = {
  readonly orderId: string;
  readonly customer: string;
  readonly category: string;
  readonly region: string;
  readonly sku: string;
  readonly quantity: number;
  readonly revenue: number;
  readonly tags: readonly string[];
};

type CustomerSummary = {
  readonly canonicalName: string;
  readonly representative: string;
  readonly totalOrders: number;
  readonly totalQuantity: number;
  readonly totalRevenue: number;
  readonly distinctSkus: readonly string[];
};

type CategoryGrouping = {
  readonly canonicalCategory: string;
  readonly representative: string;
  readonly customers: readonly string[];
  readonly totalRevenue: number;
};

type TopCustomer = {
  readonly canonicalName: string;
  readonly representative: string;
  readonly totalRevenue: number;
};

type DistinctTracker = Map<string, string>;

type CustomerSummaryMap = Map<string, CustomerSummary>;
type CategoryMultimap = Map<string, CategoryGrouping>;

const purchases: readonly Purchase[] = [
  {
    orderId: "o-1001",
    customer: "Ada Lovelace",
    category: "Hardware",
    region: "North",
    sku: "Sensor-01",
    quantity: 2,
    revenue: 500,
    tags: ["upgrade", "priority"],
  },
  {
    orderId: "o-1002",
    customer: "ada lovelace",
    category: "hardware",
    region: "north",
    sku: "Sensor-02",
    quantity: 1,
    revenue: 275,
    tags: ["renewal"],
  },
  {
    orderId: "o-1003",
    customer: "Grace Hopper",
    category: "Software",
    region: "West",
    sku: "Analytics-Pro",
    quantity: 3,
    revenue: 450,
    tags: ["expansion", "priority"],
  },
  {
    orderId: "o-1004",
    customer: "Grace Hopper",
    category: "software",
    region: "west",
    sku: "Analytics-Plus",
    quantity: 2,
    revenue: 380,
    tags: ["expansion"],
  },
  {
    orderId: "o-1005",
    customer: "Carol Shaw",
    category: "Services",
    region: "North",
    sku: "Onsite-Audit",
    quantity: 1,
    revenue: 900,
    tags: ["priority"],
  },
  {
    orderId: "o-1006",
    customer: "carol shaw",
    category: "hardware",
    region: "NORTH",
    sku: "Sensor-01",
    quantity: 1,
    revenue: 250,
    tags: ["upsell"],
  },
  {
    orderId: "o-1007",
    customer: "Bob Stone",
    category: "Software",
    region: "West",
    sku: "Analytics-Pro",
    quantity: 2,
    revenue: 300,
    tags: ["renewal"],
  },
] as const;

const lowercase = (value: string): string => value.trim().toLowerCase();

function canonicalString(value: string): { readonly key: string; readonly representative: string } {
  const representative = lowercase(value);
  return { key: canonicalKey(representative), representative };
}

function appendDistinct(values: readonly string[], candidate: string): readonly string[] {
  return values.includes(candidate) ? values : [...values, candidate];
}

function recordDistinct(tracker: DistinctTracker, key: string, label: string): void {
  if (!tracker.has(key)) {
    tracker.set(key, label);
  }
}

function summarizeCustomers(records: readonly Purchase[]): {
  readonly customers: CustomerSummaryMap;
  readonly distinctTags: DistinctTracker;
} {
  const summaries: CustomerSummaryMap = new Map();
  const tagTracker: DistinctTracker = new Map();

  records.forEach((record) => {
    const { key: customerKey, representative } = canonicalString(record.customer);
    const previous = summaries.get(customerKey);
    const canonicalSku = canonicalString(record.sku).representative;

    const nextSummary: CustomerSummary = previous
      ? {
          canonicalName: previous.canonicalName,
          representative: previous.representative,
          totalOrders: previous.totalOrders + 1,
          totalQuantity: previous.totalQuantity + record.quantity,
          totalRevenue: previous.totalRevenue + record.revenue,
          distinctSkus: appendDistinct(previous.distinctSkus, canonicalSku),
        }
      : {
          canonicalName: customerKey,
          representative,
          totalOrders: 1,
          totalQuantity: record.quantity,
          totalRevenue: record.revenue,
          distinctSkus: [canonicalSku],
        };

    summaries.set(customerKey, nextSummary);

    record.tags.forEach((tag) => {
      const { key: tagKey, representative: tagLabel } = canonicalString(tag);
      recordDistinct(tagTracker, tagKey, tagLabel);
    });
  });

  return { customers: summaries, distinctTags: tagTracker };
}

function groupByCategory(records: readonly Purchase[]): CategoryMultimap {
  const groupings: CategoryMultimap = new Map();

  records.forEach((record) => {
    const { key: categoryKey, representative } = canonicalString(record.category);
    const { representative: customerName } = canonicalString(record.customer);
    const previous = groupings.get(categoryKey);

    const nextGrouping: CategoryGrouping = previous
      ? {
          canonicalCategory: previous.canonicalCategory,
          representative: previous.representative,
          customers: appendDistinct(previous.customers, customerName),
          totalRevenue: previous.totalRevenue + record.revenue,
        }
      : {
          canonicalCategory: categoryKey,
          representative,
          customers: [customerName],
          totalRevenue: record.revenue,
        };

    groupings.set(categoryKey, nextGrouping);
  });

  return groupings;
}

function computeTopCustomers(
  summaries: CustomerSummaryMap,
  limit: number,
): readonly TopCustomer[] {
  return Array.from(summaries.values())
    .map((summary) => ({
      canonicalName: summary.canonicalName,
      representative: summary.representative,
      totalRevenue: summary.totalRevenue,
    }))
    .sort((left, right) => {
      if (right.totalRevenue !== left.totalRevenue) {
        return right.totalRevenue - left.totalRevenue;
      }
      return left.canonicalName.localeCompare(right.canonicalName);
    })
    .slice(0, limit);
}

function formatCustomerSummary(summary: CustomerSummary): string {
  const skuList = summary.distinctSkus.slice().sort().join(", ");
  return [
    `${summary.representative} (orders: ${summary.totalOrders})`,
    `units=${summary.totalQuantity}`,
    `revenue=$${summary.totalRevenue.toFixed(2)}`,
    `skus=[${skuList}]`,
  ].join(", ");
}

function formatCategoryGrouping(grouping: CategoryGrouping): string {
  const customers = grouping.customers.slice().sort().join(", ");
  return [
    `${grouping.representative}`,
    `customers=[${customers}]`,
    `revenue=$${grouping.totalRevenue.toFixed(2)}`,
  ].join(", ");
}

function formatTopCustomer(entry: TopCustomer): string {
  return `${entry.representative} → revenue=$${entry.totalRevenue.toFixed(2)} (hash=${hashCanonical(entry.canonicalName)})`;
}

function describeDistinct(tracker: DistinctTracker): string {
  const entries = Array.from(tracker.entries()).sort(([left], [right]) => left.localeCompare(right));
  return entries.map(([, label]) => label).join(", ");
}

export const canonicalContainersMultimapsAndGroupingAnalytics: RunnableExample = {
  id: "015",
  title: "Canonical containers, multimaps, and grouping analytics",
  outlineReference: 15,
  summary:
    "Canonical map/set/multimap operations for customer analytics with top-k extraction, distinct tag tracking, and deterministic formatting.",
  async run() {
    const { customers, distinctTags } = summarizeCustomers(purchases);
    const categories = groupByCategory(purchases);
    const topCustomers = computeTopCustomers(customers, 2);

    const sortedCustomerSummaries = Array.from(customers.values()).sort((left, right) =>
      left.canonicalName.localeCompare(right.canonicalName),
    );
    const sortedCategories = Array.from(categories.values()).sort((left, right) =>
      left.canonicalCategory.localeCompare(right.canonicalCategory),
    );

    const logs = [
      "== Source purchases ==",
      ...purchases.map(
        (purchase) =>
          `${purchase.orderId}: ${lowercase(purchase.customer)} bought ${purchase.quantity}×${lowercase(purchase.sku)} ` +
          `for $${purchase.revenue.toFixed(2)} [${purchase.tags.map(lowercase).join(", ")}]`,
      ),
      "== Canonical customer summaries ==",
      ...sortedCustomerSummaries.map((summary) => formatCustomerSummary(summary)),
      "== Category multimaps ==",
      ...sortedCategories.map((grouping) => formatCategoryGrouping(grouping)),
      "== Top revenue customers ==",
      ...topCustomers.map((entry) => formatTopCustomer(entry)),
      "== Distinct engagement tags (canonical order) ==",
      describeDistinct(distinctTags) || "(none)",
    ];

    return { logs };
  },
};
