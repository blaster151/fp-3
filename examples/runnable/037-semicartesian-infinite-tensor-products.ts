import type { RunnableExample } from "./types";

type Index = number;
type Coordinate = string;

type FiniteSupportElement = {
  readonly defaultValue: Coordinate;
  readonly assignments: ReadonlyArray<{ readonly index: Index; readonly value: Coordinate }>;
};

type FiniteSubset = ReadonlyArray<Index>;

type Projection = ReadonlyArray<{ readonly index: Index; readonly value: Coordinate }>;

type ProjectionCompatibility = {
  readonly larger: FiniteSubset;
  readonly smaller: FiniteSubset;
  readonly consistent: boolean;
};

type ConeComponent<Source> = {
  readonly index: Index;
  readonly map: (source: Source) => Coordinate;
};

type Cone<Source> = {
  readonly sources: ReadonlyArray<Source>;
  readonly components: ReadonlyArray<ConeComponent<Source>>;
};

type UniversalCheck<Source> = {
  readonly label: string;
  readonly holds: boolean;
  readonly mismatches: ReadonlyArray<{
    readonly source: Source;
    readonly index: Index;
    readonly expected: Coordinate;
    readonly observed: Coordinate;
  }>;
};

type UniquenessCheck<Source> = {
  readonly label: string;
  readonly holds: boolean;
  readonly counterexamples: ReadonlyArray<{
    readonly source: Source;
    readonly witness: Coordinate;
  }>;
};

function makeElement(
  defaultValue: Coordinate,
  ...assignments: ReadonlyArray<{ readonly index: Index; readonly value: Coordinate }>
): FiniteSupportElement {
  return {
    defaultValue,
    assignments: assignments.filter((assignment, index) =>
      assignments.findIndex((candidate) => candidate.index === assignment.index) === index,
    ),
  };
}

function lookupCoordinate(element: FiniteSupportElement, index: Index): Coordinate {
  const assignment = element.assignments.find((entry) => entry.index === index);
  return assignment?.value ?? element.defaultValue;
}

function project(element: FiniteSupportElement, subset: FiniteSubset): Projection {
  return subset
    .toSorted((left, right) => left - right)
    .map((index) => ({ index, value: lookupCoordinate(element, index) }));
}

function restrictProjection(projection: Projection, subset: FiniteSubset): Projection {
  const subsetSet = new Set(subset);
  return projection.filter((entry) => subsetSet.has(entry.index));
}

function isSubsetOf(candidate: FiniteSubset, potentialSuperset: FiniteSubset): boolean {
  const superset = new Set(potentialSuperset);
  return candidate.every((value) => superset.has(value));
}

function checkProjectionCompatibility(
  element: FiniteSupportElement,
  subsets: ReadonlyArray<FiniteSubset>,
): ReadonlyArray<ProjectionCompatibility> {
  const sorted = subsets.toSorted((a, b) => a.length - b.length);
  const results: ProjectionCompatibility[] = [];

  sorted.forEach((smaller, index) => {
    sorted.slice(index + 1).forEach((larger) => {
      if (!isSubsetOf(smaller, larger)) {
        return;
      }
      const projectedLarger = project(element, larger);
      const restricted = restrictProjection(projectedLarger, smaller);
      const direct = project(element, smaller);
      const consistent = JSON.stringify(restricted) === JSON.stringify(direct);
      results.push({ larger, smaller, consistent });
    });
  });

  return results;
}

type LoadProfile = "baseline" | "spike" | "tail" | "transient";

type Lift<Source> = (source: Source) => FiniteSupportElement;

type UniversalPropertyResult<Source> = {
  readonly universal: UniversalCheck<Source>;
  readonly uniqueness: UniquenessCheck<Source>;
};

function checkUniversalProperty<Source>(
  cone: Cone<Source>,
  lift: Lift<Source>,
  defaultValue: Coordinate,
  uniquenessReference: Lift<Source>,
): UniversalPropertyResult<Source> {
  const mismatches: Array<{ source: Source; index: Index; expected: Coordinate; observed: Coordinate }> = [];
  const counterexamples: Array<{ source: Source; witness: Coordinate }> = [];

  cone.sources.forEach((source) => {
    const lifted = lift(source);
    const indices = cone.components.map((component) => component.index);
    const supportedOnly = lifted.assignments.every((assignment) => indices.includes(assignment.index));
    if (!supportedOnly) {
      const stray = lifted.assignments.find((assignment) => !indices.includes(assignment.index));
      if (stray) {
        mismatches.push({
          source,
          index: stray.index,
          expected: defaultValue,
          observed: stray.value,
        });
      }
    }

    cone.components.forEach((component) => {
      const expected = component.map(source);
      const observed = lookupCoordinate(lifted, component.index);
      if (expected !== observed) {
        mismatches.push({ source, index: component.index, expected, observed });
      }
    });

    const reference = uniquenessReference(source);
    const indicesToCompare = new Set<number>([
      ...reference.assignments.map((entry) => entry.index),
      ...lifted.assignments.map((entry) => entry.index),
    ]);
    indicesToCompare.forEach((index) => {
      const witness = lookupCoordinate(lifted, index);
      const baseline = lookupCoordinate(reference, index);
      if (witness !== baseline) {
        counterexamples.push({ source, witness: `${index}:${witness}` });
      }
    });
  });

  const universal: UniversalCheck<Source> = {
    label: "Universal lift condition",
    holds: mismatches.length === 0,
    mismatches,
  };

  const uniqueness: UniquenessCheck<Source> = {
    label: "Uniqueness of lifts",
    holds: counterexamples.length === 0,
    counterexamples,
  };

  return { universal, uniqueness };
}

function renderProjection(subset: FiniteSubset, projection: Projection): string {
  const formatted = projection.map((entry) => `${entry.index}↦${entry.value}`).join(", ");
  return `  π_{${subset.join(",")}}(x) = { ${formatted} }`;
}

function renderCompatibility(result: ProjectionCompatibility): string {
  const descriptor = `π_{${result.larger.join(",")}} ⇒ π_{${result.smaller.join(",")}}`;
  return result.consistent ? `  ✔ ${descriptor}` : `  ✘ ${descriptor}`;
}

function renderUniversalCheck<Source>(check: UniversalCheck<Source>): readonly string[] {
  const header = check.holds ? `✔ ${check.label}` : `✘ ${check.label}`;
  if (check.mismatches.length === 0) {
    return [header];
  }
  const mismatches = check.mismatches.map(
    (mismatch) =>
      `  • Source ${mismatch.source} at index ${mismatch.index}: expected ${mismatch.expected}, observed ${mismatch.observed}`,
  );
  return [header, ...mismatches];
}

function renderUniquenessCheck<Source>(check: UniquenessCheck<Source>): readonly string[] {
  const header = check.holds ? `✔ ${check.label}` : `✘ ${check.label}`;
  if (check.counterexamples.length === 0) {
    return [header];
  }
  const entries = check.counterexamples.map(
    (example) => `  • Source ${example.source} deviates with coordinate ${example.witness}`,
  );
  return [header, ...entries];
}

function runSemicartesianInfiniteTensorProducts() {
  const defaultValue: Coordinate = "0";
  const element = makeElement(
    defaultValue,
    { index: 0, value: "base" },
    { index: 2, value: "drift" },
    { index: 5, value: "tail" },
  );

  const subsets: ReadonlyArray<FiniteSubset> = [
    [0],
    [2],
    [0, 2],
    [0, 2, 5],
    [0, 1, 2, 5],
  ];

  const projectionSection = subsets.map((subset) => renderProjection(subset, project(element, subset)));
  const compatibilitySection = checkProjectionCompatibility(element, subsets).map(renderCompatibility);

  const cone: Cone<LoadProfile> = {
    sources: ["baseline", "spike", "tail", "transient"],
    components: [
      { index: 0, map: (source) => (source === "spike" ? "peak" : "base") },
      { index: 1, map: (source) => (source === "transient" ? "transient" : defaultValue) },
      { index: 2, map: (source) => (source === "tail" ? "decay" : defaultValue) },
      { index: 5, map: (source) => (source === "tail" ? "tail" : defaultValue) },
    ],
  };

  const soundLift: Lift<LoadProfile> = (source) => {
    const assignments = cone.components
      .map((component) => {
        const value = component.map(source);
        return value === defaultValue ? undefined : { index: component.index, value };
      })
      .filter((entry): entry is { readonly index: Index; readonly value: Coordinate } => entry !== undefined);
    return makeElement(defaultValue, ...assignments);
  };

  const faultyLift: Lift<LoadProfile> = (source) => {
    if (source === "spike") {
      return makeElement(defaultValue, { index: 0, value: "base" }, { index: 3, value: "spurious" });
    }
    return soundLift(source);
  };

  const soundCheck = checkUniversalProperty(cone, soundLift, defaultValue, soundLift);
  const faultyCheck = checkUniversalProperty(cone, faultyLift, defaultValue, soundLift);

  const projectionSectionHeader = ["== Sample projections ==", ...projectionSection];
  const compatibilityHeader = ["", "== Compatibility across nested finite subsets ==", ...compatibilitySection];

  const soundSection = [
    "",
    "== Universal property (sound lift) ==",
    ...renderUniversalCheck(soundCheck.universal),
    ...renderUniquenessCheck(soundCheck.uniqueness),
  ];

  const faultySection = [
    "",
    "== Universal property (faulty lift) ==",
    ...renderUniversalCheck(faultyCheck.universal),
    ...renderUniquenessCheck(faultyCheck.uniqueness),
  ];

  const logs = [...projectionSectionHeader, ...compatibilityHeader, ...soundSection, ...faultySection];
  return { logs };
}

export const stage037SemicartesianInfiniteTensorProducts: RunnableExample = {
  id: "037",
  title: "Semicartesian infinite tensor products",
  outlineReference: 37,
  summary:
    "Validates projection compatibility and universal lifts for infinite semicartesian tensor products built from finite-support elements.",
  async run() {
    return runSemicartesianInfiniteTensorProducts();
  },
};
