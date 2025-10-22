import type { SimpleCat } from "./simple-cat";

interface SimpleCatWithEquality<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly eq?: (left: Arr, right: Arr) => boolean;
  readonly equalMor?: (left: Arr, right: Arr) => boolean;
}

const arrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): ((left: Arr, right: Arr) => boolean) | undefined => {
  const enriched = category as SimpleCatWithEquality<Obj, Arr>;
  if (typeof enriched.eq === "function") {
    return enriched.eq.bind(enriched);
  }
  if (typeof enriched.equalMor === "function") {
    return enriched.equalMor.bind(enriched);
  }
  return undefined;
};

const arrowsEqual = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  left: Arr,
  right: Arr,
): boolean => {
  const equality = arrowEquality(category);
  return equality ? equality(left, right) : Object.is(left, right);
};

export const Dual = <Obj, Arr>(C: SimpleCat<Obj, Arr>): SimpleCat<Obj, Arr> => ({
  id: (object) => C.id(object),
  compose: (g, f) => C.compose(f, g),
  src: (arrow) => C.dst(arrow),
  dst: (arrow) => C.src(arrow),
});

export interface OppositeCategoryOptions<Obj, Arr> {
  readonly sampleObjects?: ReadonlyArray<Obj>;
  readonly sampleArrows?: ReadonlyArray<Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface OppositeObjectFailure<Obj> {
  readonly object: Obj;
  readonly reason: string;
}

export interface OppositeArrowFailure<Arr> {
  readonly arrow: Arr;
  readonly reason: string;
}

export interface OppositeCategoryReport<Obj, Arr> {
  readonly objectFailures: ReadonlyArray<OppositeObjectFailure<Obj>>;
  readonly arrowFailures: ReadonlyArray<OppositeArrowFailure<Arr>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface OppositeCategoryWitness<Obj, Arr> {
  readonly original: SimpleCat<Obj, Arr>;
  readonly opposite: SimpleCat<Obj, Arr>;
  readonly doubleOpposite: SimpleCat<Obj, Arr>;
  readonly report: OppositeCategoryReport<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

const analyzeDoubleOpposite = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  samples: OppositeCategoryOptions<Obj, Arr>,
): OppositeCategoryReport<Obj, Arr> => {
  const double = Dual(Dual(category));
  const sampleObjects = samples.sampleObjects ?? [];
  const sampleArrows = samples.sampleArrows ?? [];

  const objectFailures: OppositeObjectFailure<Obj>[] = [];
  for (const object of sampleObjects) {
    const originalId = category.id(object);
    const doubleId = double.id(object);
    if (!arrowsEqual(category, originalId, doubleId)) {
      objectFailures.push({
        object,
        reason: "Identity morphism changed under double opposite.",
      });
      continue;
    }
    if (!Object.is(category.src(originalId), double.src(doubleId))) {
      objectFailures.push({
        object,
        reason: "Source of the identity morphism changed under double opposite.",
      });
    }
    if (!Object.is(category.dst(originalId), double.dst(doubleId))) {
      objectFailures.push({
        object,
        reason: "Target of the identity morphism changed under double opposite.",
      });
    }
  }

  const arrowFailures: OppositeArrowFailure<Arr>[] = [];
  for (const arrow of sampleArrows) {
    const originalSource = category.src(arrow);
    const originalTarget = category.dst(arrow);
    if (!Object.is(originalSource, double.src(arrow))) {
      arrowFailures.push({
        arrow,
        reason: "Source changed under double opposite.",
      });
      continue;
    }
    if (!Object.is(originalTarget, double.dst(arrow))) {
      arrowFailures.push({
        arrow,
        reason: "Target changed under double opposite.",
      });
      continue;
    }
  }

  const holds = objectFailures.length === 0 && arrowFailures.length === 0;
  const details: string[] = [];
  if (holds) {
    details.push(
      `Double opposite agrees on ${sampleObjects.length} sampled object(s) and ${sampleArrows.length} sampled arrow(s).`,
    );
  } else {
    if (objectFailures.length > 0) {
      details.push("Object identities disagreed under double opposite.");
    }
    if (arrowFailures.length > 0) {
      details.push("Arrow endpoints disagreed under double opposite.");
    }
  }

  return { objectFailures, arrowFailures, holds, details };
};

export const oppositeCategoryWithWitness = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  options: OppositeCategoryOptions<Obj, Arr> = {},
): OppositeCategoryWitness<Obj, Arr> => {
  const opposite = Dual(category);
  const doubleOpposite = Dual(opposite);
  const report = analyzeDoubleOpposite(category, options);
  const witness: OppositeCategoryWitness<Obj, Arr> = {
    original: category,
    opposite,
    doubleOpposite,
    report,
  };
  if (options.metadata && options.metadata.length > 0) {
    return { ...witness, metadata: options.metadata };
  }
  return witness;
};

export const isInvolutive = <Obj, Arr>(
  C: SimpleCat<Obj, Arr>,
  sampleArrows: ReadonlyArray<Arr>,
  sampleObjects: ReadonlyArray<Obj>,
): boolean => {
  const report = analyzeDoubleOpposite(C, {
    sampleArrows,
    sampleObjects,
  });
  return report.holds;
};
