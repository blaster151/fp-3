import type { SimpleCat } from "./simple-cat";

export interface Functor<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly F0: (object: SrcObj) => TgtObj;
  readonly F1: (arrow: SrcArr) => TgtArr;
}

interface SimpleCatWithEquality<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly eq: (left: Arr, right: Arr) => boolean;
}

const hasArrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): category is SimpleCatWithEquality<Obj, Arr> =>
  typeof (category as Partial<SimpleCatWithEquality<Obj, Arr>>).eq === "function";

const equalityWitness = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): ((left: Arr, right: Arr) => boolean) | undefined =>
  (hasArrowEquality(category) ? category.eq.bind(category) : undefined);

export interface FunctorIdentityFailure<SrcObj, TgtArr, TgtObj> {
  readonly object: SrcObj;
  readonly expectedIdentity: TgtArr;
  readonly mappedIdentity: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly equalityConsidered: boolean;
  readonly reason: string;
}

export interface FunctorCompositionFailure<SrcArr, TgtArr, TgtObj> {
  readonly pair: { readonly f: SrcArr; readonly g: SrcArr };
  readonly expectedComposite: TgtArr;
  readonly mappedComposite: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly equalityConsidered: boolean;
  readonly reason: string;
}

export interface FunctorCompositionIgnoredPair<SrcArr> {
  readonly pair: { readonly f: SrcArr; readonly g: SrcArr };
  readonly reason: string;
}

export interface FunctorEndpointFailure<SrcArr, TgtObj> {
  readonly arrow: SrcArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly reason: string;
}

export interface FunctorIdentityCheckResult<SrcObj, TgtArr, TgtObj> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>>;
}

export interface FunctorCompositionCheckResult<SrcArr, TgtArr, TgtObj> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FunctorCompositionFailure<SrcArr, TgtArr, TgtObj>>;
  readonly ignoredPairs: ReadonlyArray<FunctorCompositionIgnoredPair<SrcArr>>;
}

export interface FunctorEndpointCheckResult<SrcArr, TgtObj> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FunctorEndpointFailure<SrcArr, TgtObj>>;
}

export const checkFunctorIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  objects: ReadonlyArray<SrcObj>,
): FunctorIdentityCheckResult<SrcObj, TgtArr, TgtObj> => {
  const eq = equalityWitness(D);
  const failures: FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>[] = [];
  for (const object of objects) {
    const mappedIdentity = F.F1(C.id(object));
    const expectedIdentity = D.id(F.F0(object));
    const mappedSource = D.src(mappedIdentity);
    const mappedTarget = D.dst(mappedIdentity);
    const expectedSource = D.src(expectedIdentity);
    const expectedTarget = D.dst(expectedIdentity);

    const reasons: string[] = [];
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `mapped identity has source ${String(mappedSource)} instead of ${String(expectedSource)}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `mapped identity has target ${String(mappedTarget)} instead of ${String(expectedTarget)}`,
      );
    }
    if (eq && !eq(mappedIdentity, expectedIdentity)) {
      reasons.push("mapped identity arrow differs from target identity under equality check");
    }
    if (reasons.length > 0) {
      failures.push({
        object,
        expectedIdentity,
        mappedIdentity,
        expectedSource,
        expectedTarget,
        mappedSource,
        mappedTarget,
        equalityConsidered: eq !== undefined,
        reason: reasons.join("; "),
      });
    }
  }
  return { holds: failures.length === 0, failures };
};

export const checkFunctorComposition = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<{ readonly f: SrcArr; readonly g: SrcArr }>,
): FunctorCompositionCheckResult<SrcArr, TgtArr, TgtObj> => {
  const eq = equalityWitness(D);
  const failures: FunctorCompositionFailure<SrcArr, TgtArr, TgtObj>[] = [];
  const ignoredPairs: FunctorCompositionIgnoredPair<SrcArr>[] = [];
  for (const pair of arrows) {
    if (!Object.is(C.dst(pair.f), C.src(pair.g))) {
      ignoredPairs.push({
        pair,
        reason: "pair skipped: domain/codomain mismatch",
      });
      continue;
    }
    const mappedComposite = F.F1(C.compose(pair.g, pair.f));
    const expectedComposite = D.compose(F.F1(pair.g), F.F1(pair.f));
    const mappedSource = D.src(mappedComposite);
    const mappedTarget = D.dst(mappedComposite);
    const expectedSource = D.src(expectedComposite);
    const expectedTarget = D.dst(expectedComposite);

    const reasons: string[] = [];
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `mapped composite has source ${String(mappedSource)} instead of ${String(expectedSource)}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `mapped composite has target ${String(mappedTarget)} instead of ${String(expectedTarget)}`,
      );
    }
    if (eq && !eq(mappedComposite, expectedComposite)) {
      reasons.push("mapped composite differs from composed images under equality check");
    }
    if (reasons.length > 0) {
      failures.push({
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
  return { holds: failures.length === 0, failures, ignoredPairs };
};

export const checkFunctorEndpointCompatibility = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<SrcArr>,
): FunctorEndpointCheckResult<SrcArr, TgtObj> => {
  const failures: FunctorEndpointFailure<SrcArr, TgtObj>[] = [];
  for (const arrow of arrows) {
    const mapped = F.F1(arrow);
    const expectedSource = F.F0(C.src(arrow));
    const expectedTarget = F.F0(C.dst(arrow));
    const mappedSource = D.src(mapped);
    const mappedTarget = D.dst(mapped);

    const reasons: string[] = [];
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `mapped arrow has source ${String(mappedSource)} instead of ${String(expectedSource)}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `mapped arrow has target ${String(mappedTarget)} instead of ${String(expectedTarget)}`,
      );
    }
    if (reasons.length > 0) {
      failures.push({
        arrow,
        expectedSource,
        expectedTarget,
        mappedSource,
        mappedTarget,
        reason: reasons.join("; "),
      });
    }
  }
  return { holds: failures.length === 0, failures };
};

export const preservesIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  objects: ReadonlyArray<SrcObj>,
): boolean => checkFunctorIdentity(C, D, F, objects).holds;

export const preservesComposition = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<{ f: SrcArr; g: SrcArr }>,
): boolean => checkFunctorComposition(C, D, F, arrows).holds;
