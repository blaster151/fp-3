import type { FiniteCategory } from "../finite-cat";
import type {
  FiniteFunctor,
  FiniteNaturalTransformation,
} from "./mnne-lax-monoidal";
import type { MnneWellBehavedWitness } from "./mnne-well-behaved";
import {
  TwoObjectCategory,
  nonIdentity as TwoNonIdentity,
  type TwoArrow,
  type TwoObject,
} from "../two-object-cat";

interface NaturalComponent<Obj, Arr> {
  readonly object: Obj;
  readonly arrow: Arr;
}

export interface MnneRelativeMonadWitness<
  DomObj,
  DomArr,
  CodObj,
  CodArr,
> {
  readonly functor: FiniteFunctor<DomObj, DomArr, CodObj, CodArr>;
  readonly unit: ReadonlyArray<NaturalComponent<DomObj, CodArr>>;
  readonly extension: (
    source: DomObj,
    target: DomObj,
    arrow: CodArr,
  ) => CodArr;
}

export interface MnneMonadLanComparisonComponent<DomObj, CodArr> {
  readonly object: DomObj;
  readonly forward: CodArr;
  readonly backward: CodArr;
}

export interface MnneRelativeMonadLanWitness<
  DomObj,
  DomArr,
  CodObj,
  CodArr,
> {
  readonly wellBehaved: MnneWellBehavedWitness<DomObj, DomArr, CodObj, CodArr>;
  readonly relativeMonad: MnneRelativeMonadWitness<DomObj, DomArr, CodObj, CodArr>;
  readonly lan: FiniteFunctor<CodObj, CodArr, CodObj, CodArr>;
  readonly etaSharp: FiniteNaturalTransformation<CodObj, CodArr>;
  readonly muSharp: FiniteNaturalTransformation<CodObj, CodArr>;
  readonly comparison: ReadonlyArray<MnneMonadLanComparisonComponent<DomObj, CodArr>>;
  readonly lanExtension: (
    source: DomObj,
    target: DomObj,
    arrow: CodArr,
  ) => CodArr;
}

export interface MnneRelativeMonadLanReport<
  DomObj,
  DomArr,
  CodObj,
  CodArr,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly checkedObjects: number;
  readonly comparisonCount: number;
  readonly extensionChecks: number;
  readonly witness: MnneRelativeMonadLanWitness<DomObj, DomArr, CodObj, CodArr>;
}

const verifyFunctorBetween = <DomObj, DomArr, CodObj, CodArr>(
  domain: FiniteCategory<DomObj, DomArr>,
  codomain: FiniteCategory<CodObj, CodArr>,
  functor: FiniteFunctor<DomObj, DomArr, CodObj, CodArr>,
): ReadonlyArray<string> => {
  const issues: string[] = [];
  for (const object of domain.objects) {
    const mappedIdentity = functor.onArrows(domain.id(object));
    const expected = codomain.id(functor.onObjects(object));
    if (!codomain.eq(mappedIdentity, expected)) {
      issues.push(`Functor fails to preserve identity at ${String(object)}.`);
    }
  }
  for (const g of domain.arrows) {
    for (const f of domain.arrows) {
        if (!Object.is(domain.dst(f), domain.src(g))) {
        continue;
      }
      const composed = functor.onArrows(domain.compose(g, f));
      const mapped = codomain.compose(
        functor.onArrows(g),
        functor.onArrows(f),
      );
      if (!codomain.eq(composed, mapped)) {
        issues.push(
          `Functor fails to preserve composition for arrows ${String(f)} then ${String(
            g,
          )}.`,
        );
      }
    }
  }
  return issues;
};

const verifyEndofunctor = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  functor: FiniteFunctor<Obj, Arr, Obj, Arr>,
): ReadonlyArray<string> => verifyFunctorBetween(base, base, functor);

const findComponent = <Obj, Arr>(
  components: ReadonlyArray<NaturalComponent<Obj, Arr>>,
  object: Obj,
  objectEquals: (left: Obj, right: Obj) => boolean,
): Arr | undefined => {
  for (const component of components) {
    if (objectEquals(component.object, object)) {
      return component.arrow;
    }
  }
  return undefined;
};

const validateNaturalTransformation = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  objectEquals: (left: Obj, right: Obj) => boolean,
  transformation: FiniteNaturalTransformation<Obj, Arr>,
): ReadonlyArray<string> => {
  const issues: string[] = [];
  const { source, target, components } = transformation;
  for (const object of base.objects) {
    const component = findComponent(components, object, objectEquals);
    if (!component) {
      issues.push(`Missing component at object ${String(object)}.`);
      continue;
    }
    const expectedSource = source.onObjects(object);
    const expectedTarget = target.onObjects(object);
    if (
      !objectEquals(base.src(component), expectedSource) ||
      !objectEquals(base.dst(component), expectedTarget)
    ) {
      issues.push(
        `Component at ${String(object)} has boundary ${String(
          base.src(component),
        )} → ${String(base.dst(component))} but expected ${String(
          expectedSource,
        )} → ${String(expectedTarget)}.`,
      );
    }
  }
  for (const arrow of base.arrows) {
    const srcObj = base.src(arrow);
    const dstObj = base.dst(arrow);
    const srcComponent = findComponent(components, srcObj, objectEquals);
    const dstComponent = findComponent(components, dstObj, objectEquals);
    if (!srcComponent || !dstComponent) {
      continue;
    }
    const left = base.compose(target.onArrows(arrow), srcComponent);
    const right = base.compose(dstComponent, source.onArrows(arrow));
    if (!base.eq(left, right)) {
      issues.push(`Naturality fails for arrow ${String(arrow)}.`);
    }
  }
  return issues;
};

const getComponentOrIssue = <Obj, Arr>(
  issues: string[],
  label: string,
  base: FiniteCategory<Obj, Arr>,
  objectEquals: (left: Obj, right: Obj) => boolean,
  transformation: FiniteNaturalTransformation<Obj, Arr>,
  object: Obj,
): Arr | undefined => {
  const component = findComponent(transformation.components, object, objectEquals);
  if (!component) {
    issues.push(`${label}: missing component at ${String(object)}.`);
    return undefined;
  }
  const expectedSource = transformation.source.onObjects(object);
  const expectedTarget = transformation.target.onObjects(object);
  if (
    !objectEquals(base.src(component), expectedSource) ||
    !objectEquals(base.dst(component), expectedTarget)
  ) {
    issues.push(
      `${label}: component at ${String(object)} has boundary ${String(
        base.src(component),
      )} → ${String(base.dst(component))} but expected ${String(expectedSource)} → ${String(
        expectedTarget,
      )}.`,
    );
    return undefined;
  }
  return component;
};

const validateComparisonIso = <DomObj, DomArr, CodObj, CodArr>(
  issues: string[],
  witness: MnneRelativeMonadLanWitness<DomObj, DomArr, CodObj, CodArr>,
): void => {
  const {
    wellBehaved: { domain, codomain, inclusion, objectEqualsDomain, objectEqualsCodomain },
    comparison,
    lan,
    relativeMonad: { functor },
  } = witness;
  for (const { object, forward, backward } of comparison) {
    const lanObject = lan.onObjects(inclusion.onObjects(object));
    const relativeObject = functor.onObjects(object);
    const forwardDomain = codomain.src(forward);
    const forwardCodomain = codomain.dst(forward);
    const backwardDomain = codomain.src(backward);
    const backwardCodomain = codomain.dst(backward);
    if (!objectEqualsCodomain(forwardDomain, lanObject)) {
      issues.push(
        `Comparison forward component at ${String(object)} has source ${String(
          forwardDomain,
        )} but expected ${String(lanObject)}.`,
      );
    }
    if (!objectEqualsCodomain(forwardCodomain, relativeObject)) {
      issues.push(
        `Comparison forward component at ${String(object)} has target ${String(
          forwardCodomain,
        )} but expected ${String(relativeObject)}.`,
      );
    }
    if (!objectEqualsCodomain(backwardDomain, relativeObject)) {
      issues.push(
        `Comparison backward component at ${String(object)} has source ${String(
          backwardDomain,
        )} but expected ${String(relativeObject)}.`,
      );
    }
    if (!objectEqualsCodomain(backwardCodomain, lanObject)) {
      issues.push(
        `Comparison backward component at ${String(object)} has target ${String(
          backwardCodomain,
        )} but expected ${String(lanObject)}.`,
      );
    }
    const identityRelative = codomain.id(relativeObject);
    const identityLan = codomain.id(lanObject);
    const forwardThenBackward = codomain.compose(forward, backward);
    const backwardThenForward = codomain.compose(backward, forward);
    if (!codomain.eq(forwardThenBackward, identityRelative)) {
      issues.push(
        `Comparison components at ${String(
          object,
        )} fail to yield identity on T(${String(object)}).`,
      );
    }
    if (!codomain.eq(backwardThenForward, identityLan)) {
      issues.push(
        `Comparison components at ${String(
          object,
        )} fail to yield identity on Lan(J(${String(object)})).`,
      );
    }
  }
  for (const arrow of domain.arrows) {
    const sourceObject = domain.src(arrow);
    const targetObject = domain.dst(arrow);
    const sourceComponent = comparison.find((component) =>
      objectEqualsDomain(component.object, sourceObject),
    );
    const targetComponent = comparison.find((component) =>
      objectEqualsDomain(component.object, targetObject),
    );
    if (!sourceComponent || !targetComponent) {
      continue;
    }
    const lanArrow = lan.onArrows(inclusion.onArrows(arrow));
    const functorArrow = functor.onArrows(arrow);
    const left = codomain.compose(targetComponent.forward, lanArrow);
    const right = codomain.compose(functorArrow, sourceComponent.forward);
    if (!codomain.eq(left, right)) {
      issues.push(
        `Comparison components fail naturality on arrow ${String(arrow)}.`,
      );
    }
  }
  for (const object of domain.objects) {
    if (!comparison.some((component) => objectEqualsDomain(component.object, object))) {
      issues.push(`Missing comparison component at domain object ${String(object)}.`);
    }
  }
};

const validateUnitCompatibility = <DomObj, DomArr, CodObj, CodArr>(
  issues: string[],
  witness: MnneRelativeMonadLanWitness<DomObj, DomArr, CodObj, CodArr>,
): void => {
  const {
    wellBehaved: { domain, inclusion, codomain, objectEqualsDomain, objectEqualsCodomain },
    relativeMonad: { unit, functor },
    etaSharp,
    comparison,
  } = witness;
  for (const object of domain.objects) {
    const unitComponent = findComponent(unit, object, objectEqualsDomain);
    if (!unitComponent) {
      issues.push(`Relative monad unit missing at ${String(object)}.`);
      continue;
    }
    const sourceObj = inclusion.onObjects(object);
    const targetObj = functor.onObjects(object);
    if (
      !objectEqualsCodomain(codomain.src(unitComponent), sourceObj) ||
      !objectEqualsCodomain(codomain.dst(unitComponent), targetObj)
    ) {
      issues.push(
        `Relative monad unit at ${String(object)} has boundary ${String(
          codomain.src(unitComponent),
        )} → ${String(codomain.dst(unitComponent))} but expected ${String(sourceObj)} → ${String(
          targetObj,
        )}.`,
      );
      continue;
    }
    const comparisonComponent = comparison.find((entry) =>
      objectEqualsDomain(entry.object, object),
    );
    if (!comparisonComponent) {
      issues.push(`Missing comparison component for ${String(object)}.`);
      continue;
    }
    const etaComponent = getComponentOrIssue(
      issues,
      "η#",
      codomain,
      objectEqualsCodomain,
      etaSharp,
      sourceObj,
    );
    if (!etaComponent) {
      continue;
    }
    const forward = comparisonComponent.forward;
    const composed = codomain.compose(forward, etaComponent);
    if (!codomain.eq(composed, unitComponent)) {
      issues.push(
        `Unit compatibility fails at ${String(object)}: pr_T ∘ η# does not equal η.`,
      );
    }
  }
};

const validateExtensionCompatibility = <DomObj, DomArr, CodObj, CodArr>(
  issues: string[],
  witness: MnneRelativeMonadLanWitness<DomObj, DomArr, CodObj, CodArr>,
): number => {
  const {
    wellBehaved: { domain, codomain, inclusion, objectEqualsCodomain },
    relativeMonad: { functor, extension },
    lanExtension,
  } = witness;
  let checks = 0;
  for (const source of domain.objects) {
    const sourceObj = inclusion.onObjects(source);
    const extendedSource = functor.onObjects(source);
    for (const target of domain.objects) {
      const targetObj = functor.onObjects(target);
      for (const arrow of codomain.arrows) {
        if (
          !objectEqualsCodomain(codomain.src(arrow), sourceObj) ||
          !objectEqualsCodomain(codomain.dst(arrow), targetObj)
        ) {
          continue;
        }
        checks += 1;
        let lanResult: CodArr;
        let relativeResult: CodArr;
        try {
          lanResult = lanExtension(source, target, arrow);
        } catch (error) {
          issues.push(
            `Lan-based extension threw at (${String(source)}, ${String(target)}): ${String(
              error,
            )}.`,
          );
          continue;
        }
        try {
          relativeResult = extension(source, target, arrow);
        } catch (error) {
          issues.push(
            `Relative extension threw at (${String(source)}, ${String(target)}): ${String(
              error,
            )}.`,
          );
          continue;
        }
        const lanDomain = codomain.src(lanResult);
        const lanCodomain = codomain.dst(lanResult);
        if (
          !objectEqualsCodomain(lanDomain, extendedSource) ||
          !objectEqualsCodomain(lanCodomain, targetObj)
        ) {
          issues.push(
            `Lan extension at (${String(source)}, ${String(target)}) has boundary ${String(
              lanDomain,
            )} → ${String(lanCodomain)} but expected ${String(extendedSource)} → ${String(
              targetObj,
            )}.`,
          );
        }
        const relDomain = codomain.src(relativeResult);
        const relCodomain = codomain.dst(relativeResult);
        if (
          !objectEqualsCodomain(relDomain, extendedSource) ||
          !objectEqualsCodomain(relCodomain, targetObj)
        ) {
          issues.push(
            `Relative extension at (${String(source)}, ${String(target)}) has boundary ${String(
              relDomain,
            )} → ${String(relCodomain)} but expected ${String(extendedSource)} → ${String(
              targetObj,
            )}.`,
          );
          continue;
        }
        if (!codomain.eq(lanResult, relativeResult)) {
          issues.push(
            `Extension comparison failed at (${String(source)}, ${String(
              target,
            )}): Lan-derived result does not match relative extension.`,
          );
        }
      }
    }
  }
  return checks;
};

const validateMonadLaws = <Obj, Arr>(
  issues: string[],
  base: FiniteCategory<Obj, Arr>,
  objectEquals: (left: Obj, right: Obj) => boolean,
  functor: FiniteFunctor<Obj, Arr, Obj, Arr>,
  etaSharp: FiniteNaturalTransformation<Obj, Arr>,
  muSharp: FiniteNaturalTransformation<Obj, Arr>,
): void => {
  for (const object of base.objects) {
    const mu = getComponentOrIssue(issues, "μ#", base, objectEquals, muSharp, object);
    const eta = getComponentOrIssue(issues, "η#", base, objectEquals, etaSharp, object);
    if (!mu || !eta) {
      continue;
    }
    const tx = functor.onObjects(object);
    const etaTx = getComponentOrIssue(issues, "η#", base, objectEquals, etaSharp, tx);
    const muTx = getComponentOrIssue(issues, "μ#", base, objectEquals, muSharp, tx);
    if (!etaTx || !muTx) {
      continue;
    }
    const leftUnit = base.compose(mu, functor.onArrows(eta));
    const rightUnit = base.compose(mu, etaTx);
    const identity = base.id(functor.onObjects(object));
    if (!base.eq(leftUnit, identity)) {
      issues.push(`Left unit law fails at ${String(object)}.`);
    }
    if (!base.eq(rightUnit, identity)) {
      issues.push(`Right unit law fails at ${String(object)}.`);
    }
    const assocLeft = base.compose(mu, functor.onArrows(mu));
    const assocRight = base.compose(mu, muTx);
    if (!base.eq(assocLeft, assocRight)) {
      issues.push(`Associativity fails at ${String(object)}.`);
    }
  }
};

export const analyzeMnneRelativeMonadLanExtension = <
  DomObj,
  DomArr,
  CodObj,
  CodArr,
>(
  witness: MnneRelativeMonadLanWitness<DomObj, DomArr, CodObj, CodArr>,
): MnneRelativeMonadLanReport<DomObj, DomArr, CodObj, CodArr> => {
  const issues: string[] = [];
  const {
    wellBehaved: { domain, codomain, objectEqualsCodomain },
    relativeMonad,
    lan,
    etaSharp,
    muSharp,
  } = witness;

  issues.push(
    ...verifyFunctorBetween(domain, codomain, relativeMonad.functor),
    ...verifyEndofunctor(codomain, lan),
    ...validateNaturalTransformation(codomain, objectEqualsCodomain, etaSharp),
    ...validateNaturalTransformation(codomain, objectEqualsCodomain, muSharp),
  );

  validateComparisonIso(issues, witness);
  validateUnitCompatibility(issues, witness);
  const extensionChecks = validateExtensionCompatibility(issues, witness);
  validateMonadLaws(
    issues,
    codomain,
    objectEqualsCodomain,
    lan,
    etaSharp,
    muSharp,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Lan_J T witness extends the relative monad to a monad on C and matches the recorded comparison."
      : `Lan_J T witness reported ${issues.length} issue(s).`,
    checkedObjects: codomain.objects.length,
    comparisonCount: witness.comparison.length,
    extensionChecks,
    witness,
  };
};

export const describeIdentityLanExtensionWitness = (): MnneRelativeMonadLanWitness<
  TwoObject,
  TwoArrow,
  TwoObject,
  TwoArrow
> => {
  const wellBehaved = {
    domain: TwoObjectCategory,
    codomain: TwoObjectCategory,
    inclusion: {
      onObjects: (object: TwoObject) => object,
      onArrows: (arrow: TwoArrow) => arrow,
    },
    objectEqualsDomain: (left: TwoObject, right: TwoObject) => left === right,
    objectEqualsCodomain: (left: TwoObject, right: TwoObject) => left === right,
  } satisfies MnneWellBehavedWitness<TwoObject, TwoArrow, TwoObject, TwoArrow>;

  const functor: FiniteFunctor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
    onObjects: (object) => object,
    onArrows: (arrow) => arrow,
  };

  const components: ReadonlyArray<NaturalComponent<TwoObject, TwoArrow>> =
    TwoObjectCategory.objects.map((object) => ({
      object,
      arrow: TwoObjectCategory.id(object),
    }));

  const naturalTransformation: FiniteNaturalTransformation<TwoObject, TwoArrow> = {
    source: {
      onObjects: (object) => object,
      onArrows: (arrow) => arrow,
    },
    target: {
      onObjects: (object) => object,
      onArrows: (arrow) => arrow,
    },
    components,
  };

  return {
    wellBehaved,
    relativeMonad: {
      functor,
      unit: components,
      extension: (_source, _target, arrow) => arrow,
    },
    lan: functor,
    etaSharp: naturalTransformation,
    muSharp: naturalTransformation,
    comparison: components.map(({ object, arrow }) => ({
      object,
      forward: arrow,
      backward: arrow,
    })),
    lanExtension: (_source, _target, arrow) => arrow,
  } satisfies MnneRelativeMonadLanWitness<TwoObject, TwoArrow, TwoObject, TwoArrow>;
};

export const describeBrokenLanExtensionWitness = (): MnneRelativeMonadLanWitness<
  TwoObject,
  TwoArrow,
  TwoObject,
  TwoArrow
> => {
  const witness = describeIdentityLanExtensionWitness();
  return {
    ...witness,
    comparison: witness.comparison.map((component, index) =>
      index === 0
        ? { ...component, forward: TwoNonIdentity }
        : component,
    ),
  };
};
