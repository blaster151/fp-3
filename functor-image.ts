import type {
  FunctorComposablePair,
  FunctorWitness,
  FunctorWithWitness,
  FunctorComparisonReport,
} from "./functor";
import { compareFunctors, composeFunctors, constructFunctorWithWitness } from "./functor";
import type { SimpleCat } from "./simple-cat";
import { makeSubcategory, type SmallCategory } from "./subcategory";

type EqualityWitness<TgtArr> = (left: TgtArr, right: TgtArr) => boolean;

type CategoryWithEquality<Obj, Arr> = SimpleCat<Obj, Arr> & {
  readonly eq?: EqualityWitness<Arr>;
};

const extractEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): EqualityWitness<Arr> | undefined =>
  (category as CategoryWithEquality<Obj, Arr>).eq;

const arrowEquals = <Arr>(
  eq: EqualityWitness<Arr> | undefined,
  left: Arr,
  right: Arr,
): boolean => (eq ? eq(left, right) : Object.is(left, right));

const uniquePush = <T>(list: T[], set: Set<T>, value: T): void => {
  if (!set.has(value)) {
    set.add(value);
    list.push(value);
  }
};

export interface FunctorImageArrowRecord<SrcArr, TgtArr, TgtObj> {
  readonly sourceArrow: SrcArr;
  readonly imageArrow: TgtArr;
  readonly imageSource: TgtObj;
  readonly imageTarget: TgtObj;
}

export interface FunctorImageIdentityFailure<SrcObj, TgtObj, TgtArr> {
  readonly object: SrcObj;
  readonly imageObject: TgtObj;
  readonly expectedIdentity: TgtArr;
  readonly mappedIdentity: TgtArr;
  readonly equalityConsidered: boolean;
  readonly reason: string;
}

export interface FunctorImageEndpointFailure<SrcArr, TgtObj, TgtArr> {
  readonly sourceArrow: SrcArr;
  readonly imageArrow: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly reason: string;
}

export interface FunctorImageCompositionFailure<SrcArr, TgtArr, TgtObj> {
  readonly pair: FunctorComposablePair<SrcArr>;
  readonly expectedComposite: TgtArr;
  readonly mappedComposite: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly equalityConsidered: boolean;
  readonly reason: string;
}

export interface FunctorImageAnalysis<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly objectImages: ReadonlyArray<TgtObj>;
  readonly arrowImages: ReadonlyArray<TgtArr>;
  readonly arrowRecords: ReadonlyArray<
    FunctorImageArrowRecord<SrcArr, TgtArr, TgtObj>
  >;
  readonly identityFailures: ReadonlyArray<
    FunctorImageIdentityFailure<SrcObj, TgtObj, TgtArr>
  >;
  readonly compositionFailures: ReadonlyArray<
    FunctorImageCompositionFailure<SrcArr, TgtArr, TgtObj>
  >;
  readonly endpointFailures: ReadonlyArray<
    FunctorImageEndpointFailure<SrcArr, TgtObj, TgtArr>
  >;
  readonly closureHolds: boolean;
  readonly details: ReadonlyArray<string>;
}

const describeReason = (
  base: string,
  extras: ReadonlyArray<string>,
): string => (extras.length === 0 ? base : `${base}: ${extras.join("; ")}`);

const makeArrowRecord = <SrcObj, SrcArr, TgtObj, TgtArr>(
  witness: FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrow: SrcArr,
  arrowImages: TgtArr[],
  arrowImageSet: Set<TgtArr>,
  objectImages: TgtObj[],
  objectImageSet: Set<TgtObj>,
  endpointFailures: FunctorImageEndpointFailure<SrcArr, TgtObj, TgtArr>[],
): FunctorImageArrowRecord<SrcArr, TgtArr, TgtObj> => {
  const imageArrow = witness.functor.F1(arrow);
  const mappedSource = witness.target.src(imageArrow);
  const mappedTarget = witness.target.dst(imageArrow);
  uniquePush(objectImages, objectImageSet, mappedSource);
  uniquePush(objectImages, objectImageSet, mappedTarget);
  uniquePush(arrowImages, arrowImageSet, imageArrow);

  const expectedSource = witness.functor.F0(witness.source.src(arrow));
  const expectedTarget = witness.functor.F0(witness.source.dst(arrow));
  const reasons: string[] = [];
  if (!Object.is(mappedSource, expectedSource)) {
    reasons.push(
      `source maps to ${String(mappedSource)} but expected ${String(expectedSource)}`,
    );
  }
  if (!Object.is(mappedTarget, expectedTarget)) {
    reasons.push(
      `target maps to ${String(mappedTarget)} but expected ${String(expectedTarget)}`,
    );
  }
  if (reasons.length > 0) {
    endpointFailures.push({
      sourceArrow: arrow,
      imageArrow,
      expectedSource,
      expectedTarget,
      mappedSource,
      mappedTarget,
      reason: reasons.join("; "),
    });
  }

  return {
    sourceArrow: arrow,
    imageArrow,
    imageSource: mappedSource,
    imageTarget: mappedTarget,
  };
};

export const analyzeFunctorImage = <SrcObj, SrcArr, TgtObj, TgtArr>(
  witness: FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
): FunctorImageAnalysis<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const arrowImages: TgtArr[] = [];
  const arrowImageSet = new Set<TgtArr>();
  const objectImages: TgtObj[] = [];
  const objectImageSet = new Set<TgtObj>();
  const arrowRecords: FunctorImageArrowRecord<SrcArr, TgtArr, TgtObj>[] = [];
  const endpointFailures: FunctorImageEndpointFailure<SrcArr, TgtObj, TgtArr>[] = [];

  for (const object of witness.objectGenerators) {
    uniquePush(objectImages, objectImageSet, witness.functor.F0(object));
  }

  for (const arrow of witness.arrowGenerators) {
    arrowRecords.push(
      makeArrowRecord(
        witness,
        arrow,
        arrowImages,
        arrowImageSet,
        objectImages,
        objectImageSet,
        endpointFailures,
      ),
    );
  }

  const eq = extractEquality(witness.target);

  const identityFailures: FunctorImageIdentityFailure<SrcObj, TgtObj, TgtArr>[] = [];
  for (const object of witness.objectGenerators) {
    const imageObject = witness.functor.F0(object);
    const expectedIdentity = witness.target.id(imageObject);
    const identityRecord = makeArrowRecord(
      witness,
      witness.source.id(object),
      arrowImages,
      arrowImageSet,
      objectImages,
      objectImageSet,
      endpointFailures,
    );
    const mappedIdentity = identityRecord.imageArrow;
    const reasons: string[] = [];
    if (!arrowEquals(eq, mappedIdentity, expectedIdentity)) {
      reasons.push("mapped identity differs from target identity");
    }
    if (reasons.length > 0) {
      identityFailures.push({
        object,
        imageObject,
        expectedIdentity,
        mappedIdentity,
        equalityConsidered: eq !== undefined,
        reason: reasons.join("; "),
      });
    }
  }

  const compositionFailures: FunctorImageCompositionFailure<SrcArr, TgtArr, TgtObj>[] = [];
  for (const pair of witness.composablePairs) {
    if (!Object.is(witness.source.dst(pair.f), witness.source.src(pair.g))) {
      continue;
    }
    const mappedComposite = witness.functor.F1(
      witness.source.compose(pair.g, pair.f),
    );
    const expectedComposite = witness.target.compose(
      witness.functor.F1(pair.g),
      witness.functor.F1(pair.f),
    );
    const compositeRecord = makeArrowRecord(
      witness,
      witness.source.compose(pair.g, pair.f),
      arrowImages,
      arrowImageSet,
      objectImages,
      objectImageSet,
      endpointFailures,
    );
    const mappedSource = compositeRecord.imageSource;
    const mappedTarget = compositeRecord.imageTarget;
    const expectedSource = witness.target.src(expectedComposite);
    const expectedTarget = witness.target.dst(expectedComposite);
    const reasons: string[] = [];
    if (!arrowEquals(eq, mappedComposite, expectedComposite)) {
      reasons.push("functor image of composite does not match composite of images");
    }
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `composite source ${String(mappedSource)} differs from expected ${String(
          expectedSource,
        )}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `composite target ${String(mappedTarget)} differs from expected ${String(
          expectedTarget,
        )}`,
      );
    }
    if (reasons.length > 0) {
      compositionFailures.push({
        pair,
        expectedComposite,
        mappedComposite,
        expectedSource,
        expectedTarget,
        mappedSource,
        mappedTarget,
        equalityConsidered: eq !== undefined,
        reason: reasons.join("; "),
      });
    }
  }

  const details: string[] = [];
  details.push(
    `Recorded ${objectImages.length} image objects and ${arrowImages.length} image arrows from witness generators.`,
  );
  if (identityFailures.length === 0) {
    details.push("All generator images carry their target-category identities.");
  } else {
    details.push(
      describeReason(
        `${identityFailures.length} identity checks failed`,
        identityFailures.map((failure) => failure.reason),
      ),
    );
  }
  if (compositionFailures.length === 0) {
    details.push(
      "All sampled composites of image arrows agree with the functorially mapped composites.",
    );
  } else {
    details.push(
      describeReason(
        `${compositionFailures.length} composition checks failed`,
        compositionFailures.map((failure) => failure.reason),
      ),
    );
  }
  if (endpointFailures.length > 0) {
    details.push(
      describeReason(
        `${endpointFailures.length} image arrows landed outside the recorded image objects`,
        endpointFailures.map((failure) => failure.reason),
      ),
    );
  }

  const closureHolds =
    identityFailures.length === 0 &&
    compositionFailures.length === 0 &&
    endpointFailures.length === 0;

  return {
    objectImages,
    arrowImages,
    arrowRecords,
    identityFailures,
    compositionFailures,
    endpointFailures,
    closureHolds,
    details,
  };
};

const isSmallCategory = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): category is SmallCategory<Obj, Arr> =>
  Object.prototype.hasOwnProperty.call(category, "objects") &&
  Object.prototype.hasOwnProperty.call(category, "arrows");

const enumerateComposablePairs = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  arrows: Iterable<Arr>,
): ReadonlyArray<FunctorComposablePair<Arr>> => {
  const list = Array.from(arrows);
  const pairs: FunctorComposablePair<Arr>[] = [];
  for (const f of list) {
    for (const g of list) {
      if (Object.is(category.dst(f), category.src(g))) {
        pairs.push({ f, g });
      }
    }
  }
  return pairs;
};

export interface ImageSubcategoryFactorization<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly analysis: FunctorImageAnalysis<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly imageSubcategory?: SmallCategory<TgtObj, TgtArr>;
  readonly inclusion?: FunctorWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>;
  readonly factorization?: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly comparison?: FunctorComparisonReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly details: ReadonlyArray<string>;
  readonly reason?: string;
}

export interface ImageSubcategoryFactorizationOptions<TgtObj, TgtArr> {
  readonly targetAsSmall?: SmallCategory<TgtObj, TgtArr>;
}

export const imageSubcategoryFactorization = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: ImageSubcategoryFactorizationOptions<TgtObj, TgtArr> = {},
): ImageSubcategoryFactorization<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const analysis = analyzeFunctorImage(functor.witness);
  const details: string[] = [...analysis.details];

  if (!analysis.closureHolds) {
    details.push(
      "Image closure failed; subcategory factorization is unavailable.",
    );
    return { analysis, details, reason: "image closure failed" };
  }

  const ambient =
    options.targetAsSmall && options.targetAsSmall === functor.witness.target
      ? options.targetAsSmall
      : (isSmallCategory(functor.witness.target)
          ? (functor.witness.target as SmallCategory<TgtObj, TgtArr>)
          : undefined);

  if (!ambient) {
    details.push(
      "Target category does not expose a SmallCategory structure for subcategory construction.",
    );
    return {
      analysis,
      details,
      reason: "target category lacks SmallCategory structure",
    };
  }

  let imageSubcategory: SmallCategory<TgtObj, TgtArr>;
  try {
    imageSubcategory = makeSubcategory(
      ambient,
      analysis.objectImages,
      analysis.arrowImages,
    );
  } catch (error) {
    details.push(
      `Failed to build image subcategory: ${(error as Error).message}`,
    );
    return { analysis, details, reason: "image subcategory construction failed" };
  }

  details.push(
    `Constructed image subcategory with ${imageSubcategory.objects.size} objects and ${imageSubcategory.arrows.size} arrows.`,
  );

  const inclusionSamples = {
    objects: Array.from(imageSubcategory.objects),
    arrows: Array.from(imageSubcategory.arrows),
    composablePairs: enumerateComposablePairs(
      imageSubcategory,
      imageSubcategory.arrows,
    ),
  };

  const inclusion = constructFunctorWithWitness(
    imageSubcategory,
    functor.witness.target,
    {
      F0: (object: TgtObj) => object,
      F1: (arrow: TgtArr) => arrow,
    },
    inclusionSamples,
    ["Inclusion functor for the wide image subcategory."],
  );

  const factorizationSamples = {
    objects: functor.witness.objectGenerators,
    arrows: functor.witness.arrowGenerators,
    composablePairs: functor.witness.composablePairs,
  };

  const factorization = constructFunctorWithWitness(
    functor.witness.source,
    imageSubcategory,
    functor.functor,
    factorizationSamples,
    ["Factorization of the functor through its image subcategory."],
  );

  const composite = composeFunctors(inclusion, factorization, {
    samples: factorizationSamples,
    metadata: ["Composite recreates the original functor via inclusion."] ,
  });

  const comparisonReport = compareFunctors(composite, functor, {
    samples: factorizationSamples,
  });

  details.push(
    comparisonReport.holds
      ? "Composite with inclusion matches the original functor on supplied generators."
      : describeReason(
          "Composite-inclusion comparison failed",
          comparisonReport.details,
        ),
  );

  return {
    analysis,
    imageSubcategory,
    inclusion,
    factorization,
    comparison: comparisonReport,
    details,
  };
};
