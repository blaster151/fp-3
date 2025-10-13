import type { RunnableExample } from "./types";

type RecordCover<I extends PropertyKey, K extends PropertyKey> = Readonly<Record<I, ReadonlySet<K>>>;
type Sections<I extends PropertyKey, K extends PropertyKey, A> = Readonly<Record<I, Readonly<Partial<Record<K, A>>>>>;

type GlueErr<I extends PropertyKey, K extends PropertyKey, A> =
  | { readonly _tag: "Conflict"; readonly i: I; readonly j: I; readonly left: Readonly<Partial<Record<K, A>>>; readonly right: Readonly<Partial<Record<K, A>>> }
  | { readonly _tag: "Incomplete"; readonly i: I; readonly details: ReadonlyArray<string> };

type GlueValidation<E, A> =
  | { readonly _tag: "VOk"; readonly value: A }
  | { readonly _tag: "VErr"; readonly errors: ReadonlyArray<E> };

const isValidationOk = <E, A>(value: GlueValidation<E, A>): value is { readonly _tag: "VOk"; readonly value: A } =>
  value._tag === "VOk";

const isValidationErr = <E, A>(value: GlueValidation<E, A>): value is { readonly _tag: "VErr"; readonly errors: ReadonlyArray<E> } =>
  value._tag === "VErr";

function intersect<K>(a: ReadonlySet<K>, b: ReadonlySet<K>): ReadonlyArray<K> {
  const result: K[] = [];
  a.forEach((value) => {
    if (b.has(value)) {
      result.push(value);
    }
  });
  return result;
}

function restrictSection<I extends PropertyKey, K extends PropertyKey, A>(
  cover: RecordCover<I, K>,
): (from: I, to: I) => (section: Readonly<Partial<Record<K, A>>>) => Readonly<Partial<Record<K, A>>> {
  return (from, to) => (section) => {
    const overlapKeys = intersect(cover[from], cover[to]);
    const restricted: Partial<Record<K, A>> = {};
    overlapKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(section, key)) {
        restricted[key] = section[key];
      }
    });
    return restricted;
  };
}

function recordsEqual<K extends PropertyKey, A>(
  left: Readonly<Partial<Record<K, A>>>,
  right: Readonly<Partial<Record<K, A>>>,
): boolean {
  const keys = new Set<K>([...Object.keys(left) as K[], ...Object.keys(right) as K[]]);
  for (const key of keys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

function checkDescent<I extends PropertyKey, K extends PropertyKey, A>(
  cover: RecordCover<I, K>,
  sections: Sections<I, K, A>,
): GlueValidation<GlueErr<I, K, A>, true> {
  const errors: Array<GlueErr<I, K, A>> = [];
  const restrict = restrictSection<I, K, A>(cover);
  const indices = Object.keys(cover) as I[];

  indices.forEach((i) => {
    const requiredKeys = Array.from(cover[i]);
    const section = sections[i];
    const missing = requiredKeys.filter((key) => !Object.prototype.hasOwnProperty.call(section, key));
    if (missing.length > 0) {
      errors.push({ _tag: "Incomplete", i, details: missing.map((key) => `missing ${String(key)}`) });
    }
  });

  for (let a = 0; a < indices.length; a += 1) {
    for (let b = a + 1; b < indices.length; b += 1) {
      const i = indices[a]!;
      const j = indices[b]!;
      const overlapIJ = restrict(i, j)(sections[i]);
      const overlapJI = restrict(j, i)(sections[j]);
      if (!recordsEqual(overlapIJ, overlapJI)) {
        errors.push({ _tag: "Conflict", i, j, left: overlapIJ, right: overlapJI });
      }
    }
  }

  return errors.length === 0 ? { _tag: "VOk", value: true as const } : { _tag: "VErr", errors };
}

function assembleGlobal<I extends PropertyKey, K extends PropertyKey, A>(
  cover: RecordCover<I, K>,
  sections: Sections<I, K, A>,
): Readonly<Record<K, A>> {
  const allKeys = new Set<K>();
  const sets = Object.values(cover) as ReadonlySet<K>[];
  sets.forEach((subset) => {
    subset.forEach((key) => {
      allKeys.add(key);
    });
  });
  const result: Partial<Record<K, A>> = {};
  allKeys.forEach((key) => {
    Object.keys(sections).forEach((index) => {
      const section = sections[index as I];
      if (Object.prototype.hasOwnProperty.call(section, key)) {
        result[key] = section[key];
      }
    });
  });
  return result as Readonly<Record<K, A>>;
}

function glueRecordCover<I extends PropertyKey, K extends PropertyKey, A>(
  cover: RecordCover<I, K>,
  sections: Sections<I, K, A>,
): GlueValidation<GlueErr<I, K, A>, Readonly<Record<K, A>>> {
  const descent = checkDescent(cover, sections);
  if (isValidationErr(descent)) {
    return descent;
  }
  return { _tag: "VOk", value: assembleGlobal(cover, sections) };
}

/**
 * Stage 034 revisits the record-gluing walkthrough with immutable transcripts.
 * Each scenario highlights how the generic descent kit detects overlap conflicts,
 * missing data, and successful assemblies across configuration management and
 * microservice aggregation workflows.
 */

type BasicCoverIndex = "U" | "V";
type BasicKeys = "x" | "y" | "z";

type ConfigSource = "environment" | "configFile" | "defaults" | "commandLine";
type ConfigKey = "database" | "auth" | "logging" | "cache" | "metrics";

type Service = "userService" | "authService" | "prefsService";
type DataField = "userId" | "profile" | "permissions" | "preferences" | "activity";

type Worker = "worker1" | "worker2" | "worker3";
type ComputationKey = "sum" | "product" | "max" | "min" | "average";

type ServiceFieldValue =
  | string
  | ReadonlyArray<string>
  | { readonly name: string; readonly email: string }
  | { readonly theme: string; readonly lang: string }
  | { readonly lastLogin: string; readonly loginCount: number };

function renderGlueOutcome<I extends PropertyKey, K extends PropertyKey, A>(
  label: string,
  result: GlueValidation<GlueErr<I, K, A>, Readonly<Record<K, A>>>,
): readonly string[] {
  if (isValidationOk(result)) {
    return [
      `${label}: ✔ descent succeeded`,
      `  assembled: ${JSON.stringify(result.value, null, 2)}`,
    ];
  }
  const lines = [`${label}: ✘ descent failed`];
  result.errors.forEach((error) => {
    if (error._tag === "Conflict") {
      lines.push(
        `  conflict between ${String(error.i)} and ${String(error.j)}: ${JSON.stringify(error.left)} ≠ ${JSON.stringify(
          error.right,
        )}`,
      );
    } else {
      lines.push(`  ${String(error.i)} incomplete: ${error.details.join(", ")}`);
    }
  });
  return lines;
}

function renderDescentCheck<I extends PropertyKey, K extends PropertyKey, A>(
  label: string,
  result: GlueValidation<GlueErr<I, K, A>, true>,
): readonly string[] {
  if (isValidationOk(result)) {
    return [`${label}: ✔ overlaps compatible`];
  }
  const issues = result.errors
    .map((error) => {
      if (error._tag === "Conflict") {
        return `conflict between ${String(error.i)} and ${String(error.j)}`;
      }
      return `${String(error.i)} missing: ${error.details.join(", ")}`;
    })
    .join("; ");
  return [`${label}: ✘ ${issues}`];
}

function renderRestriction<I extends PropertyKey, K extends PropertyKey, A>(
  label: string,
  cover: RecordCover<I, K>,
  from: I,
  to: I,
  section: Readonly<Partial<Record<K, A>>>,
): string {
  const restricted = restrictSection(cover)(from, to)(section);
  return `${label}: ${String(from)}→${String(to)} overlap ${JSON.stringify(restricted)}`;
}

function runRecordGluingWorkflows() {
  const logs: string[] = [];

  // Scenario 1: basic two-chart overlap with a deliberate conflict.
  const cover: RecordCover<BasicCoverIndex, BasicKeys> = {
    U: new Set(["x", "y"]),
    V: new Set(["y", "z"]),
  };
  const goodSections: Sections<BasicCoverIndex, BasicKeys, number> = {
    U: { x: 1, y: 2 },
    V: { y: 2, z: 3 },
  };
  const badSections: Sections<BasicCoverIndex, BasicKeys, number> = {
    U: { x: 1, y: 2 },
    V: { y: 99, z: 3 },
  };

  const goodDescent = checkDescent(cover, goodSections);
  const badDescent = checkDescent(cover, badSections);
  const goodGlue = glueRecordCover(cover, goodSections);
  const badGlue = glueRecordCover(cover, badSections);

  logs.push("== Basic gluing and overlap checks ==");
  logs.push(renderRestriction("  restriction", cover, "U", "V", goodSections.U));
  logs.push(renderRestriction("  restriction", cover, "V", "U", goodSections.V));
  logs.push(...renderDescentCheck("  compatible sections", goodDescent));
  logs.push(...renderGlueOutcome("  assembled global", goodGlue));
  logs.push(...renderDescentCheck("  conflicting sections", badDescent));
  logs.push(...renderGlueOutcome("  conflict report", badGlue));

  // Scenario 2: configuration management across multiple sources.
  const configCover: RecordCover<ConfigSource, ConfigKey> = {
    environment: new Set(["database", "auth"]),
    configFile: new Set(["auth", "logging", "cache"]),
    defaults: new Set(["logging", "cache", "metrics"]),
    commandLine: new Set(["database", "metrics"]),
  };
  const configSections: Sections<ConfigSource, ConfigKey, string> = {
    environment: {
      database: "postgresql://prod-db:5432",
      auth: "oauth2",
    },
    configFile: {
      auth: "oauth2",
      logging: "info",
      cache: "redis",
    },
    defaults: {
      logging: "info",
      cache: "redis",
      metrics: "prometheus",
    },
    commandLine: {
      database: "postgresql://prod-db:5432",
      metrics: "datadog",
    },
  };

  const configDescent = checkDescent(configCover, configSections);
  const configGlue = glueRecordCover(configCover, configSections);

  logs.push("", "== Configuration descent audit ==");
  logs.push(...renderDescentCheck("  overlap validation", configDescent));
  logs.push(...renderGlueOutcome("  merged configuration", configGlue));

  // Scenario 3: microservice aggregation.
  const serviceCover: RecordCover<Service, DataField> = {
    userService: new Set(["userId", "profile"]),
    authService: new Set(["userId", "permissions"]),
    prefsService: new Set(["userId", "preferences", "activity"]),
  };
  const serviceSections: Sections<Service, DataField, ServiceFieldValue> = {
    userService: {
      userId: "user-123",
      profile: { name: "Alice", email: "alice@example.com" },
    },
    authService: {
      userId: "user-123",
      permissions: ["read", "write"],
    },
    prefsService: {
      userId: "user-123",
      preferences: { theme: "dark", lang: "en" },
      activity: { lastLogin: "2024-01-15", loginCount: 42 },
    },
  };

  const serviceGlue = glueRecordCover(serviceCover, serviceSections);

  logs.push("", "== Microservice aggregation ==");
  logs.push(...renderGlueOutcome("  aggregated profile", serviceGlue));

  // Scenario 4: parallel computation summaries with streaming workers.
  const workerCover: RecordCover<Worker, ComputationKey> = {
    worker1: new Set(["sum", "product"]),
    worker2: new Set(["product", "max", "min"]),
    worker3: new Set(["max", "average"]),
  };
  const data = [1, 2, 3, 4, 5];
  const workerSections: Sections<Worker, ComputationKey, number> = {
    worker1: {
      sum: data.reduce((acc, value) => acc + value, 0),
      product: data.reduce((acc, value) => acc * value, 1),
    },
    worker2: {
      product: data.reduce((acc, value) => acc * value, 1),
      max: Math.max(...data),
      min: Math.min(...data),
    },
    worker3: {
      max: Math.max(...data),
      average: data.reduce((acc, value) => acc + value, 0) / data.length,
    },
  };

  const workerGlue = glueRecordCover(workerCover, workerSections);

  logs.push("", "== Parallel computation reconciliation ==");
  logs.push(...renderGlueOutcome("  consolidated metrics", workerGlue));

  return { logs };
}

export const stage034RecordGluingAndDescentWorkflows: RunnableExample = {
  id: "034",
  title: "Record gluing and descent workflows",
  outlineReference: 34,
  summary:
    "Exercises the record-gluing kit across chart overlaps, configuration merges, microservice aggregation, and parallel analytics while narrating descent diagnostics.",
  async run() {
    return runRecordGluingWorkflows();
  },
};
