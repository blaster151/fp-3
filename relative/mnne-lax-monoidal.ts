import type { FiniteCategory } from "../finite-cat";
import {
  TwoObjectCategory,
  nonIdentity as TwoNonIdentity,
  type TwoArrow,
  type TwoObject,
} from "../two-object-cat";

export interface FiniteFunctor<DomObj, DomArr, CodObj, CodArr> {
  readonly onObjects: (object: DomObj) => CodObj;
  readonly onArrows: (arrow: DomArr) => CodArr;
}

export interface FiniteNaturalTransformation<Obj, Arr> {
  readonly source: FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly target: FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly components: ReadonlyArray<{
    readonly object: Obj;
    readonly arrow: Arr;
  }>;
}

export interface MnneLaxMonoidalWitness<Obj, Arr> {
  readonly base: FiniteCategory<Obj, Arr>;
  readonly inclusion: FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly unit: FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly functors: ReadonlyArray<FiniteFunctor<Obj, Arr, Obj, Arr>>;
  readonly triples: ReadonlyArray<{
    readonly left: FiniteFunctor<Obj, Arr, Obj, Arr>;
    readonly middle: FiniteFunctor<Obj, Arr, Obj, Arr>;
    readonly right: FiniteFunctor<Obj, Arr, Obj, Arr>;
  }>;
  readonly objectEquals: (left: Obj, right: Obj) => boolean;
  readonly lan: (functor: FiniteFunctor<Obj, Arr, Obj, Arr>) => FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly tensor: (
    left: FiniteFunctor<Obj, Arr, Obj, Arr>,
    right: FiniteFunctor<Obj, Arr, Obj, Arr>,
  ) => FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly lambda: (
    functor: FiniteFunctor<Obj, Arr, Obj, Arr>,
  ) => FiniteNaturalTransformation<Obj, Arr>;
  readonly rho: (
    functor: FiniteFunctor<Obj, Arr, Obj, Arr>,
  ) => FiniteNaturalTransformation<Obj, Arr>;
  readonly alpha: (
    left: FiniteFunctor<Obj, Arr, Obj, Arr>,
    middle: FiniteFunctor<Obj, Arr, Obj, Arr>,
    right: FiniteFunctor<Obj, Arr, Obj, Arr>,
  ) => FiniteNaturalTransformation<Obj, Arr>;
  readonly tensorTransformations?: (
    left: FiniteNaturalTransformation<Obj, Arr>,
    right: FiniteNaturalTransformation<Obj, Arr>,
  ) => FiniteNaturalTransformation<Obj, Arr>;
}

export interface MnneLaxMonoidalReport<Obj, Arr> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly functorCount: number;
  readonly tripleCount: number;
  readonly base: FiniteCategory<Obj, Arr>;
}

export interface MnneLaxMonoidWitness<Obj, Arr> {
  readonly monoidal: MnneLaxMonoidalWitness<Obj, Arr>;
  readonly functor: FiniteFunctor<Obj, Arr, Obj, Arr>;
  readonly unit: FiniteNaturalTransformation<Obj, Arr>;
  readonly multiplication: FiniteNaturalTransformation<Obj, Arr>;
}

export interface MnneLaxMonoidReport<Obj, Arr> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly base: FiniteCategory<Obj, Arr>;
}

const composeFunctors = <Obj, Arr>(
  left: FiniteFunctor<Obj, Arr, Obj, Arr>,
  right: FiniteFunctor<Obj, Arr, Obj, Arr>,
): FiniteFunctor<Obj, Arr, Obj, Arr> => ({
  onObjects: (object) => left.onObjects(right.onObjects(object)),
  onArrows: (arrow) => left.onArrows(right.onArrows(arrow)),
});

const functorsEqual = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  objectEquals: (left: Obj, right: Obj) => boolean,
  left: FiniteFunctor<Obj, Arr, Obj, Arr>,
  right: FiniteFunctor<Obj, Arr, Obj, Arr>,
): boolean => {
  for (const object of base.objects) {
    if (!objectEquals(left.onObjects(object), right.onObjects(object))) {
      return false;
    }
  }
  for (const arrow of base.arrows) {
    if (!base.eq(left.onArrows(arrow), right.onArrows(arrow))) {
      return false;
    }
  }
  return true;
};

const verifyFunctor = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  functor: FiniteFunctor<Obj, Arr, Obj, Arr>,
): ReadonlyArray<string> => {
  const issues: string[] = [];
  for (const object of base.objects) {
    const mappedIdentity = functor.onArrows(base.id(object));
    const expected = base.id(functor.onObjects(object));
    if (!base.eq(mappedIdentity, expected)) {
      issues.push(`Functor fails to preserve identity at object ${String(object)}.`);
    }
  }
  for (const g of base.arrows) {
    for (const f of base.arrows) {
      if (!base.eq(base.dst(f), base.src(g))) {
        continue;
      }
      const composed = functor.onArrows(base.compose(g, f));
      const mapped = base.compose(functor.onArrows(g), functor.onArrows(f));
      if (!base.eq(composed, mapped)) {
        issues.push(
          `Functor fails to preserve composition on arrows ${String(f)} then ${String(g)}.`,
        );
      }
    }
  }
  return issues;
};

const findComponent = <Obj, Arr>(
  components: ReadonlyArray<{ readonly object: Obj; readonly arrow: Arr }>,
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
    const domainObject = source.onObjects(object);
    const codomainObject = target.onObjects(object);
    const componentSrc = base.src(component);
    const componentDst = base.dst(component);
    if (!objectEquals(componentSrc, domainObject)) {
      issues.push(
        `Component at object ${String(object)} has source ${String(componentSrc)} but expected ${String(domainObject)}.`,
      );
    }
    if (!objectEquals(componentDst, codomainObject)) {
      issues.push(
        `Component at object ${String(object)} has target ${String(componentDst)} but expected ${String(codomainObject)}.`,
      );
    }
  }
  for (const arrow of base.arrows) {
    const sourceObject = base.src(arrow);
    const targetObject = base.dst(arrow);
    const sourceComponent = findComponent(components, sourceObject, objectEquals);
    const targetComponent = findComponent(components, targetObject, objectEquals);
    if (!sourceComponent || !targetComponent) {
      continue;
    }
    const lhs = base.compose(target.onArrows(arrow), sourceComponent);
    const rhs = base.compose(targetComponent, source.onArrows(arrow));
    if (!base.eq(lhs, rhs)) {
      issues.push(`Naturality fails on arrow ${String(arrow)}.`);
    }
  }
  return issues;
};

const composeNaturalTransformations = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  objectEquals: (left: Obj, right: Obj) => boolean,
  first: FiniteNaturalTransformation<Obj, Arr>,
  second: FiniteNaturalTransformation<Obj, Arr>,
): FiniteNaturalTransformation<Obj, Arr> | undefined => {
  if (!functorsEqual(base, objectEquals, first.target, second.source)) {
    return undefined;
  }
  const components = base.objects.map((object) => {
    const firstComponent = findComponent(first.components, object, objectEquals);
    const secondComponent = findComponent(second.components, object, objectEquals);
    if (!firstComponent || !secondComponent) {
      throw new Error(`Missing component for object ${String(object)} during composition.`);
    }
    return {
      object,
      arrow: base.compose(secondComponent, firstComponent),
    };
  });
  return {
    source: first.source,
    target: second.target,
    components,
  };
};

const identityTransformationBetween = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  source: FiniteFunctor<Obj, Arr, Obj, Arr>,
  target: FiniteFunctor<Obj, Arr, Obj, Arr>,
): FiniteNaturalTransformation<Obj, Arr> => ({
  source,
  target,
  components: base.objects.map((object) => ({
    object,
    arrow: base.id(source.onObjects(object)),
  })),
});

const identityTransformation = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  functor: FiniteFunctor<Obj, Arr, Obj, Arr>,
): FiniteNaturalTransformation<Obj, Arr> =>
  identityTransformationBetween(base, functor, functor);

const compareNaturalTransformations = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  objectEquals: (left: Obj, right: Obj) => boolean,
  left: FiniteNaturalTransformation<Obj, Arr>,
  right: FiniteNaturalTransformation<Obj, Arr>,
): boolean => {
  if (!functorsEqual(base, objectEquals, left.source, right.source)) {
    return false;
  }
  if (!functorsEqual(base, objectEquals, left.target, right.target)) {
    return false;
  }
  for (const object of base.objects) {
    const leftComponent = findComponent(left.components, object, objectEquals);
    const rightComponent = findComponent(right.components, object, objectEquals);
    if (!leftComponent || !rightComponent) {
      return false;
    }
    if (!base.eq(leftComponent, rightComponent)) {
      return false;
    }
  }
  return true;
};

export const analyzeMnneLaxMonoidalStructure = <Obj, Arr>(
  witness: MnneLaxMonoidalWitness<Obj, Arr>,
): MnneLaxMonoidalReport<Obj, Arr> => {
  const issues: string[] = [];
  const { base, objectEquals, functors, unit, inclusion, triples } = witness;

  const functorsToCheck = [unit, inclusion, ...functors];
  for (const functor of functorsToCheck) {
    issues.push(...verifyFunctor(base, functor));
  }

  for (const functor of functors) {
    const lanFunctor = witness.lan(functor);
    const recomposed = composeFunctors(lanFunctor, inclusion);
    if (!functorsEqual(base, objectEquals, recomposed, functor)) {
      issues.push("Lan witness does not reproduce the original functor after precomposition with the inclusion.");
    }
  }

  for (const left of functors) {
    for (const right of functors) {
      const expected = composeFunctors(witness.lan(left), right);
      const actual = witness.tensor(left, right);
      if (!functorsEqual(base, objectEquals, expected, actual)) {
        issues.push("Tensor does not agree with composing the left Kan extension with the right functor.");
      }
    }
  }

  for (const functor of functors) {
    const lambda = witness.lambda(functor);
    const lambdaDomain = witness.tensor(unit, functor);
    if (!functorsEqual(base, objectEquals, lambda.source, lambdaDomain)) {
      issues.push("Left unitor domain does not match tensor(unit, F).");
    }
    if (!functorsEqual(base, objectEquals, lambda.target, functor)) {
      issues.push("Left unitor target does not match F.");
    }
    issues.push(...validateNaturalTransformation(base, objectEquals, lambda));

    const rho = witness.rho(functor);
    const rhoDomain = witness.tensor(functor, unit);
    if (!functorsEqual(base, objectEquals, rho.source, rhoDomain)) {
      issues.push("Right unitor domain does not match tensor(F, unit).");
    }
    if (!functorsEqual(base, objectEquals, rho.target, functor)) {
      issues.push("Right unitor target does not match F.");
    }
    issues.push(...validateNaturalTransformation(base, objectEquals, rho));
  }

  for (const triple of triples) {
    const { left, middle, right } = triple;
    const alpha = witness.alpha(left, middle, right);
    const alphaDomain = witness.tensor(witness.tensor(left, middle), right);
    const alphaTarget = witness.tensor(left, witness.tensor(middle, right));
    if (!functorsEqual(base, objectEquals, alpha.source, alphaDomain)) {
      issues.push("Associator domain does not match tensor(tensor(F, G), H).");
    }
    if (!functorsEqual(base, objectEquals, alpha.target, alphaTarget)) {
      issues.push("Associator target does not match tensor(F, tensor(G, H)).");
    }
    issues.push(...validateNaturalTransformation(base, objectEquals, alpha));

    const tensorTransformations =
      witness.tensorTransformations ??
      ((leftTrans: FiniteNaturalTransformation<Obj, Arr>, rightTrans: FiniteNaturalTransformation<Obj, Arr>) => {
        const domain = witness.tensor(leftTrans.source, rightTrans.source);
        const codomain = witness.tensor(leftTrans.target, rightTrans.target);
        if (!functorsEqual(base, objectEquals, domain, codomain)) {
          issues.push(
            "Tensor on transformations cannot be derived because the induced functors disagree.",
          );
        }
        return identityTransformationBetween(base, domain, codomain);
      });

    const leftLambda = witness.lambda(middle);
    const rightRho = witness.rho(left);
    const idLeft = identityTransformation(base, left);
    const idRight = identityTransformation(base, right);

    const alphaFUnitG = witness.alpha(left, unit, middle);
    const idTensorLambda = tensorTransformations(idLeft, leftLambda);
    const leftPath = composeNaturalTransformations(base, objectEquals, alphaFUnitG, idTensorLambda);

    const rhoTensorId = tensorTransformations(rightRho, idRight);

    if (!leftPath || !compareNaturalTransformations(base, objectEquals, leftPath, rhoTensorId)) {
      issues.push("Triangle identity involving λ and ρ does not commute.");
    }
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Lax monoidal witness satisfies the Example 3.2 diagnostics."
      : `Lax monoidal witness encountered ${issues.length} issue(s).`,
    functorCount: functors.length,
    tripleCount: triples.length,
    base,
  };
};

export const analyzeMnneLaxMonoid = <Obj, Arr>(
  witness: MnneLaxMonoidWitness<Obj, Arr>,
): MnneLaxMonoidReport<Obj, Arr> => {
  const issues: string[] = [];
  const { monoidal, functor, unit, multiplication } = witness;
  const { base, objectEquals } = monoidal;

  issues.push(...verifyFunctor(base, functor));

  if (!functorsEqual(base, objectEquals, unit.source, monoidal.unit)) {
    issues.push("Unit transformation must originate from the recorded monoidal unit functor.");
  }
  if (!functorsEqual(base, objectEquals, unit.target, functor)) {
    issues.push("Unit transformation must target the lax monoid functor.");
  }
  issues.push(...validateNaturalTransformation(base, objectEquals, unit));

  const tensorSelf = monoidal.tensor(functor, functor);
  if (!functorsEqual(base, objectEquals, multiplication.source, tensorSelf)) {
    issues.push("Multiplication transformation must start at tensor(F, F).");
  }
  if (!functorsEqual(base, objectEquals, multiplication.target, functor)) {
    issues.push("Multiplication transformation must target the lax monoid functor.");
  }
  issues.push(...validateNaturalTransformation(base, objectEquals, multiplication));

  const tensorTransformations = monoidal.tensorTransformations;
  if (!tensorTransformations) {
    issues.push("Tensor transformation witness is required to analyze lax monoid laws.");
  } else {
    const identity = identityTransformation(base, functor);

    const leftTensor = tensorTransformations(unit, identity);
    const expectedLeftDomain = monoidal.tensor(monoidal.unit, functor);
    if (!functorsEqual(base, objectEquals, leftTensor.source, expectedLeftDomain)) {
      issues.push("Tensor(unit, id) domain mismatch during left unit analysis.");
    }
    const leftComposite = composeNaturalTransformations(base, objectEquals, leftTensor, multiplication);
    const lambda = monoidal.lambda(functor);
    if (!leftComposite || !compareNaturalTransformations(base, objectEquals, leftComposite, lambda)) {
      issues.push("Left unit law μ ∘ (η ⊗ id) = λ_F fails.");
    }

    const rightTensor = tensorTransformations(identity, unit);
    const expectedRightDomain = monoidal.tensor(functor, monoidal.unit);
    if (!functorsEqual(base, objectEquals, rightTensor.source, expectedRightDomain)) {
      issues.push("Tensor(id, unit) domain mismatch during right unit analysis.");
    }
    const rightComposite = composeNaturalTransformations(base, objectEquals, rightTensor, multiplication);
    const rho = monoidal.rho(functor);
    if (!rightComposite || !compareNaturalTransformations(base, objectEquals, rightComposite, rho)) {
      issues.push("Right unit law μ ∘ (id ⊗ η) = ρ_F fails.");
    }

    const muTensorId = tensorTransformations(multiplication, identity);
    const idTensorMu = tensorTransformations(identity, multiplication);
    const alpha = monoidal.alpha(functor, functor, functor);

    const leftAssoc = composeNaturalTransformations(base, objectEquals, muTensorId, multiplication);
    const alphaThenIdTensorMu = composeNaturalTransformations(
      base,
      objectEquals,
      alpha,
      idTensorMu,
    );
    const rightAssoc =
      alphaThenIdTensorMu &&
      composeNaturalTransformations(base, objectEquals, alphaThenIdTensorMu, multiplication);

    if (!leftAssoc || !rightAssoc || !compareNaturalTransformations(base, objectEquals, leftAssoc, rightAssoc)) {
      issues.push("Associativity law μ ∘ (μ ⊗ id) = μ ∘ (id ⊗ μ) ∘ α_F,F,F fails.");
    }
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Lax monoid witness satisfies Theorem 3’s unit and associativity checks."
      : `Lax monoid witness encountered ${issues.length} issue(s).`,
    base,
  };
};

const identityFunctor = <Obj, Arr>(): FiniteFunctor<Obj, Arr, Obj, Arr> => ({
  onObjects: (object) => object,
  onArrows: (arrow) => arrow,
});

const constantFunctor = (
  targetObject: TwoObject,
  targetIdentity: TwoArrow,
): FiniteFunctor<TwoObject, TwoArrow, TwoObject, TwoArrow> => ({
  onObjects: () => targetObject,
  onArrows: () => targetIdentity,
});

export const describeTwoObjectLaxMonoidalWitness = (): MnneLaxMonoidalWitness<TwoObject, TwoArrow> => {
  const id = identityFunctor<TwoObject, TwoArrow>();
  const constDot = constantFunctor("•", TwoObjectCategory.id("•"));
  const constStar = constantFunctor("★", TwoObjectCategory.id("★"));

  const functors = [id, constDot, constStar];

  return {
    base: TwoObjectCategory,
    inclusion: id,
    unit: id,
    functors,
    triples: [
      { left: id, middle: constDot, right: constStar },
      { left: constDot, middle: constStar, right: id },
    ],
    objectEquals: (left, right) => left === right,
    lan: (functor) => functor,
    tensor: (left, right) => composeFunctors(left, right),
    lambda: (functor) => {
      const domain = composeFunctors(id, functor);
      return identityTransformationBetween(TwoObjectCategory, domain, functor);
    },
    rho: (functor) => {
      const domain = composeFunctors(functor, id);
      return identityTransformationBetween(TwoObjectCategory, domain, functor);
    },
    alpha: (left, middle, right) => {
      const domain = composeFunctors(composeFunctors(left, middle), right);
      const target = composeFunctors(left, composeFunctors(middle, right));
      return identityTransformationBetween(TwoObjectCategory, domain, target);
    },
    tensorTransformations: (leftTrans, rightTrans) => {
      const domain = composeFunctors(leftTrans.source, rightTrans.source);
      const codomain = composeFunctors(leftTrans.target, rightTrans.target);
      return identityTransformationBetween(TwoObjectCategory, domain, codomain);
    },
  };
};

export const describeBrokenTwoObjectLaxMonoidalWitness = (): MnneLaxMonoidalWitness<TwoObject, TwoArrow> => {
  const witness = describeTwoObjectLaxMonoidalWitness();
  return {
    ...witness,
    lambda: (functor) => {
      const baseTransformation = witness.lambda(functor);
      const components = baseTransformation.components.map((entry) =>
        entry.object === "•"
          ? { object: entry.object, arrow: TwoNonIdentity }
          : entry,
      );
      return {
        ...baseTransformation,
        components,
      };
    },
  };
};

export const describeTwoObjectLaxMonoidWitness = (): MnneLaxMonoidWitness<TwoObject, TwoArrow> => {
  const monoidal = describeTwoObjectLaxMonoidalWitness();
  const functor = identityFunctor<TwoObject, TwoArrow>();
  const unit = identityTransformationBetween(TwoObjectCategory, monoidal.unit, functor);
  const multiplication = identityTransformationBetween(
    TwoObjectCategory,
    monoidal.tensor(functor, functor),
    functor,
  );
  return { monoidal, functor, unit, multiplication };
};

export const describeBrokenTwoObjectLaxMonoidWitness = (): MnneLaxMonoidWitness<TwoObject, TwoArrow> => {
  const witness = describeTwoObjectLaxMonoidWitness();
  const brokenMultiplication = {
    ...witness.multiplication,
    components: witness.multiplication.components.map((component) =>
      component.object === "•"
        ? { object: component.object, arrow: TwoNonIdentity }
        : component,
    ),
  };
  return { ...witness, multiplication: brokenMultiplication };
};
