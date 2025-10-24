import type { SimpleCat } from "./simple-cat";
import { setSimpleCategory } from "./set-simple-category";
import { SetCat, type SetHom, type SetObj } from "./set-cat";
import {
  FinSetCat,
  type FinSetCategory,
  type FinSetName,
  type FuncArr,
} from "./models/finset-cat";
import { FinGrp, type FinGrpObj } from "./models/fingroup-cat";
import { kernelElements } from "./models/fingroup-kernel";
import type { FunctorWithWitness } from "./functor";
import {
  evaluateFunctorProperty,
  makeArrowPropertyOracle,
} from "./functor-property";
import type {
  AnyFunctorPropertyAnalysis,
  ArrowPropertySample,
  CategoryPropertyCheck,
  FunctorPropertyAnalysis,
  FunctorPropertyMode,
} from "./functor-property-types";

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
  if (equality) {
    return equality(left, right);
  }
  return Object.is(left, right);
};

export interface OrthogonalitySquare<Arr> {
  readonly top: Arr;
  readonly bottom: Arr;
}

export interface OrthogonalityFailure<Arr> {
  readonly reason: string;
  readonly square: OrthogonalitySquare<Arr>;
}

export interface OrthogonalityResult<Arr> {
  readonly holds: boolean;
  readonly filler?: Arr;
  readonly details: ReadonlyArray<string>;
  readonly failures: ReadonlyArray<OrthogonalityFailure<Arr>>;
}

export interface OrthogonalityWitness<Obj, Arr> {
  readonly category: SimpleCat<Obj, Arr>;
  readonly left: Arr;
  readonly right: Arr;
  readonly hasLifting: (square: OrthogonalitySquare<Arr>) => OrthogonalityResult<Arr>;
  readonly squareSamples?: ReadonlyArray<OrthogonalitySquare<Arr>> | undefined;
  readonly metadata?: ReadonlyArray<string> | undefined;
}

export interface Factorization<Obj, Arr> {
  readonly arrow: Arr;
  readonly middle: Obj;
  readonly left: Arr;
  readonly right: Arr;
}

export interface FactorizationCompositionSample<Arr> {
  readonly first: Arr;
  readonly second: Arr;
}

export interface FactorizationRetractSample<Obj, Arr> {
  readonly arrow: Arr;
  readonly retract: Arr;
  readonly domainSection: Arr;
  readonly domainRetraction: Arr;
  readonly codomainSection: Arr;
  readonly codomainRetraction: Arr;
  readonly object: Obj;
  readonly retractObject: Obj;
}

export interface FactorizationClass<Obj, Arr> {
  readonly name: string;
  readonly membership: (arrow: Arr) => boolean;
  readonly identitySamples?: ReadonlyArray<Obj> | undefined;
  readonly compositionSamples?: ReadonlyArray<FactorizationCompositionSample<Arr>> | undefined;
  readonly retractSamples?: ReadonlyArray<FactorizationRetractSample<Obj, Arr>> | undefined;
}

export interface FactorizationSystemSamples<Arr> {
  readonly arrows: ReadonlyArray<Arr>;
  readonly composites?: ReadonlyArray<FactorizationCompositionSample<Arr>> | undefined;
}

export interface FactorizationWitnessFailure<Arr> {
  readonly arrow: Arr;
  readonly reason: string;
}

export interface FactorizationWitnessReport<Arr> {
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
  readonly failures: ReadonlyArray<FactorizationWitnessFailure<Arr>>;
}

export interface FactorizationClosureFailure<Arr> {
  readonly reason: string;
  readonly arrow: Arr;
}

export interface FactorizationClosureReport<Arr> {
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
  readonly failures: ReadonlyArray<FactorizationClosureFailure<Arr>>;
}

export interface FactorizationSystemReport<Obj, Arr> {
  readonly holds: boolean;
  readonly factorization: FactorizationWitnessReport<Arr>;
  readonly leftClosure: FactorizationClosureReport<Arr>;
  readonly rightClosure: FactorizationClosureReport<Arr>;
  readonly orthogonality: ReadonlyArray<OrthogonalityResult<Arr>>;
  readonly details: ReadonlyArray<string>;
}

export interface FactorizationSystemInput<Obj, Arr> {
  readonly category: SimpleCat<Obj, Arr>;
  readonly leftClass: FactorizationClass<Obj, Arr>;
  readonly rightClass: FactorizationClass<Obj, Arr>;
  readonly orthogonality: ReadonlyArray<OrthogonalityWitness<Obj, Arr>>;
  readonly factorization: (arrow: Arr) => Factorization<Obj, Arr>;
  readonly samples: FactorizationSystemSamples<Arr>;
  readonly metadata?: ReadonlyArray<string> | undefined;
}

export interface FactorizationSystemWitness<Obj, Arr> {
  readonly category: SimpleCat<Obj, Arr>;
  readonly leftClass: FactorizationClass<Obj, Arr>;
  readonly rightClass: FactorizationClass<Obj, Arr>;
  readonly factor: (arrow: Arr) => Factorization<Obj, Arr>;
  readonly orthogonality: ReadonlyArray<OrthogonalityWitness<Obj, Arr>>;
  readonly report: FactorizationSystemReport<Obj, Arr>;
  readonly samples: FactorizationSystemSamples<Arr>;
  readonly metadata?: ReadonlyArray<string> | undefined;
}

const checkFactorization = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  samples: FactorizationSystemSamples<Arr>,
  leftClass: FactorizationClass<Obj, Arr>,
  rightClass: FactorizationClass<Obj, Arr>,
  factorization: (arrow: Arr) => Factorization<Obj, Arr>,
): FactorizationWitnessReport<Arr> => {
  const failures: FactorizationWitnessFailure<Arr>[] = [];
  const details: string[] = [];

  for (const arrow of samples.arrows) {
    const witness = factorization(arrow);
    const leftOk = leftClass.membership(witness.left);
    const rightOk = rightClass.membership(witness.right);

    if (!leftOk) {
      failures.push({ arrow, reason: `${leftClass.name} membership failed for the left factor.` });
      continue;
    }

    if (!rightOk) {
      failures.push({ arrow, reason: `${rightClass.name} membership failed for the right factor.` });
      continue;
    }

    const composite = category.compose(witness.right, witness.left);
    if (!arrowsEqual(category, composite, arrow)) {
      failures.push({
        arrow,
        reason: "Composite of the factorization did not recover the original arrow.",
      });
      continue;
    }
  }

  const holds = failures.length === 0;
  if (holds) {
    details.push(
      `Verified ${samples.arrows.length} arrow(s) factor through ${leftClass.name} then ${rightClass.name}.`,
    );
  }

  return { holds, failures, details } satisfies FactorizationWitnessReport<Arr>;
};

const checkClosure = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  classInfo: FactorizationClass<Obj, Arr>,
): FactorizationClosureReport<Arr> => {
  const failures: FactorizationClosureFailure<Arr>[] = [];
  const details: string[] = [];

  if (classInfo.identitySamples) {
    for (const object of classInfo.identitySamples) {
      const id = category.id(object);
      if (!classInfo.membership(id)) {
        failures.push({ arrow: id, reason: `Identity on ${String(object)} left the class.` });
      }
    }
  }

  if (classInfo.compositionSamples) {
    for (const { first, second } of classInfo.compositionSamples) {
      const composite = category.compose(second, first);
      if (!classInfo.membership(composite)) {
        failures.push({ arrow: composite, reason: "Composition sample escaped the class." });
      }
    }
  }

  if (classInfo.retractSamples) {
    for (const sample of classInfo.retractSamples) {
      const composedDomain = category.compose(sample.domainRetraction, sample.domainSection);
      const identityDomain = category.id(sample.retractObject);
      if (!arrowsEqual(category, composedDomain, identityDomain)) {
        failures.push({
          arrow: sample.domainRetraction,
          reason: "Domain retract witness failed to compose to the identity.",
        });
        continue;
      }

      const composedCodomain = category.compose(sample.codomainSection, sample.codomainRetraction);
      const identityCodomain = category.id(sample.object);
      if (!arrowsEqual(category, composedCodomain, identityCodomain)) {
        failures.push({
          arrow: sample.codomainRetraction,
          reason: "Codomain retract witness failed to compose to the identity.",
        });
        continue;
      }

      if (!classInfo.membership(sample.arrow)) {
        failures.push({ arrow: sample.arrow, reason: "Declared class arrow was not a member." });
        continue;
      }

      if (!classInfo.membership(sample.retract)) {
        failures.push({ arrow: sample.retract, reason: "Retract sample left the class." });
      }
    }
  }

  const holds = failures.length === 0;
  if (holds) {
    details.push(`${classInfo.name} closure checks succeeded on supplied samples.`);
  }

  return { holds, failures, details } satisfies FactorizationClosureReport<Arr>;
};

const evaluateOrthogonality = <Obj, Arr>(
  witnesses: ReadonlyArray<OrthogonalityWitness<Obj, Arr>>,
): ReadonlyArray<OrthogonalityResult<Arr>> => {
  const results: OrthogonalityResult<Arr>[] = [];
  for (const witness of witnesses) {
    if (!witness.squareSamples) continue;
    for (const square of witness.squareSamples) {
      results.push(witness.hasLifting(square));
    }
  }
  return results;
};

export const buildFactorizationSystem = <Obj, Arr>(
  input: FactorizationSystemInput<Obj, Arr>,
): FactorizationSystemWitness<Obj, Arr> => {
  const factorizationReport = checkFactorization(
    input.category,
    input.samples,
    input.leftClass,
    input.rightClass,
    input.factorization,
  );

  const leftClosure = checkClosure(input.category, input.leftClass);
  const rightClosure = checkClosure(input.category, input.rightClass);
  const orthogonality = evaluateOrthogonality(input.orthogonality);

  const holds =
    factorizationReport.holds &&
    leftClosure.holds &&
    rightClosure.holds &&
    orthogonality.every((outcome) => outcome.holds);

  const details: string[] = [];
  if (holds) {
    details.push(
      `Factorization system (${input.leftClass.name}, ${input.rightClass.name}) verified on ${input.samples.arrows.length} arrow(s).`,
    );
  }

  const report: FactorizationSystemReport<Obj, Arr> = {
    holds,
    factorization: factorizationReport,
    leftClosure,
    rightClosure,
    orthogonality,
    details,
  };

  const base: FactorizationSystemWitness<Obj, Arr> = {
    category: input.category,
    leftClass: input.leftClass,
    rightClass: input.rightClass,
    factor: input.factorization,
    orthogonality: input.orthogonality,
    report,
    samples: input.samples,
  };

  return input.metadata ? { ...base, metadata: input.metadata } : base;
};

const isSetSurjection = <A, B>(arrow: SetHom<A, B>): boolean => {
  const pending = new Set(arrow.cod);
  for (const element of arrow.dom) {
    pending.delete(arrow.map(element));
  }
  return pending.size === 0;
};

const isSetInjection = <A, B>(arrow: SetHom<A, B>): boolean => {
  const seen = new Map<B, A>();
  for (const element of arrow.dom) {
    const image = arrow.map(element);
    const previous = seen.get(image);
    if (previous !== undefined && !Object.is(previous, element)) {
      return false;
    }
    seen.set(image, element);
  }
  return true;
};

const makeSetOrthogonalityWitness = (
  left: SetHom<unknown, unknown>,
  right: SetHom<unknown, unknown>,
): OrthogonalityWitness<SetObj<unknown>, SetHom<unknown, unknown>> => {
  const category = setSimpleCategory;
  const context = `Set orthogonality ${String(left.dom)}⊥${String(right.cod)}`;

  const hasLifting = (
    square: OrthogonalitySquare<SetHom<unknown, unknown>>,
  ): OrthogonalityResult<SetHom<unknown, unknown>> => {
    const failures: OrthogonalityFailure<SetHom<unknown, unknown>>[] = [];

    const equality = arrowEquality(category);
    const commuteLeft = category.compose(square.bottom, left);
    const commuteRight = category.compose(right, square.top);
    if (equality && !equality(commuteLeft, commuteRight)) {
      failures.push({
        square,
        reason: `${context}: commuting square check failed.`,
      });
      return { holds: false, failures, details: [] };
    }

    const assignments = new Map<unknown, unknown>();
    for (const element of left.dom) {
      const image = left.map(element);
      const topImage = square.top.map(element);
      const bottomImage = square.bottom.map(image);
      const throughRight = right.map(topImage);
      if (!Object.is(bottomImage, throughRight)) {
        failures.push({
          square,
          reason: `${context}: square failed on ${String(element)}.`,
        });
        return { holds: false, failures, details: [] };
      }
      const existing = assignments.get(image);
      if (existing !== undefined || assignments.has(image)) {
        if (!Object.is(existing, topImage)) {
          failures.push({
            square,
            reason: `${context}: injection uniqueness violated; multiple lifts disagree.`,
          });
          return { holds: false, failures, details: [] };
        }
      } else {
        assignments.set(image, topImage);
      }
    }

    for (const element of left.cod) {
      if (!assignments.has(element)) {
        failures.push({
          square,
          reason: `${context}: surjectivity witness missing value ${String(element)}.`,
        });
        return { holds: false, failures, details: [] };
      }
    }

    const filler = SetCat.hom(left.cod, right.dom, (value) => {
      const assignment = assignments.get(value);
      if (assignment === undefined && !assignments.has(value)) {
        throw new Error(`${context}: filler evaluated outside the surjection image.`);
      }
      return assignment as unknown;
    }) as SetHom<unknown, unknown>;

    return {
      holds: true,
      filler,
      failures: [],
      details: [`${context}: constructed diagonal filler.`],
    };
  };

  return { category, left, right, hasLifting };
};

const buildSetSamples = (): FactorizationSystemSamples<SetHom<unknown, unknown>> => {
  const one = SetCat.obj(["⋆"]);
  const two = SetCat.obj(["0", "1"]);
  const three = SetCat.obj(["0", "1", "2"]);

  const constant = SetCat.hom(two, one, () => "⋆") as SetHom<unknown, unknown>;
  const mod2 = SetCat.hom(three, two, (value) => (value === "2" ? "0" : value)) as SetHom<unknown, unknown>;
  const inclusion = SetCat.hom(two, three, (value) => value) as SetHom<unknown, unknown>;

  return {
    arrows: [constant, mod2, inclusion],
    composites: [
      { first: constant, second: SetCat.hom(one, one, () => "⋆") as SetHom<unknown, unknown> },
      { first: mod2, second: inclusion },
    ],
  } satisfies FactorizationSystemSamples<SetHom<unknown, unknown>>;
};

export const buildSetSurjectionInjectionFactorization = (): FactorizationSystemWitness<
  SetObj<unknown>,
  SetHom<unknown, unknown>
> => {
  const samples = buildSetSamples();
  const leftClass: FactorizationClass<SetObj<unknown>, SetHom<unknown, unknown>> = {
    name: "Surjection",
    membership: isSetSurjection,
    identitySamples: [SetCat.obj(["⋆"]), SetCat.obj(["0"])],
    compositionSamples: samples.composites,
    retractSamples: samples.arrows.map((arrow) => ({
      arrow,
      retract: arrow,
      domainSection: setSimpleCategory.id(setSimpleCategory.src(arrow)),
      domainRetraction: setSimpleCategory.id(setSimpleCategory.src(arrow)),
      codomainSection: setSimpleCategory.id(setSimpleCategory.dst(arrow)),
      codomainRetraction: setSimpleCategory.id(setSimpleCategory.dst(arrow)),
      object: setSimpleCategory.dst(arrow),
      retractObject: setSimpleCategory.src(arrow),
    })),
  };

  const rightClass: FactorizationClass<SetObj<unknown>, SetHom<unknown, unknown>> = {
    name: "Injection",
    membership: isSetInjection,
    identitySamples: [SetCat.obj(["⋆"]), SetCat.obj(["0"])],
    compositionSamples: samples.composites,
    retractSamples: samples.arrows.map((arrow) => ({
      arrow,
      retract: arrow,
      domainSection: setSimpleCategory.id(setSimpleCategory.src(arrow)),
      domainRetraction: setSimpleCategory.id(setSimpleCategory.src(arrow)),
      codomainSection: setSimpleCategory.id(setSimpleCategory.dst(arrow)),
      codomainRetraction: setSimpleCategory.id(setSimpleCategory.dst(arrow)),
      object: setSimpleCategory.dst(arrow),
      retractObject: setSimpleCategory.src(arrow),
    })),
  };

  const orthogonality = samples.arrows
    .filter((arrow) => isSetSurjection(arrow))
    .flatMap((surjection) =>
      samples.arrows
        .filter((candidate) => isSetInjection(candidate))
        .map((injection) => ({
          ...makeSetOrthogonalityWitness(surjection, injection),
          squareSamples: [
            {
              top: surjection,
              bottom: injection,
            },
          ],
        } satisfies OrthogonalityWitness<SetObj<unknown>, SetHom<unknown, unknown>>)),
    );

  const factorization = (
    arrow: SetHom<unknown, unknown>,
  ): Factorization<SetObj<unknown>, SetHom<unknown, unknown>> => {
    const domain = arrow.dom;
    const codomain = arrow.cod;
    const imageElements = Array.from(new Set(Array.from(domain).map((value) => arrow.map(value))));
    const image = SetCat.obj(imageElements);
    const left = SetCat.hom(domain, image, (value) => arrow.map(value)) as SetHom<unknown, unknown>;
    const right = SetCat.hom(image, codomain, (value) => value) as SetHom<unknown, unknown>;
    return { arrow, middle: image, left, right };
  };

  return buildFactorizationSystem({
    category: setSimpleCategory,
    leftClass,
    rightClass,
    orthogonality,
    factorization,
    samples,
    metadata: [
      "Set factorization system splitting functions into surjections followed by injections.",
    ],
  });
};

const ensureFinSetCategory = (): FinSetCategory => {
  const universe: Record<FinSetName, readonly string[]> = {
    A: ["a0", "a1", "a2"],
    B: ["b0", "b1"],
    C: ["c0", "c1", "c2", "c3"],
  };
  const category = FinSetCat(universe);

  const surjection: FuncArr = {
    name: "s",
    dom: "A",
    cod: "B",
    map: (value) => (value === "a2" ? "b1" : value.replace("a", "b")),
  };
  const injection: FuncArr = {
    name: "i",
    dom: "B",
    cod: "C",
    map: (value) => (value === "b0" ? "c0" : "c1"),
  };
  const alternateInjection: FuncArr = {
    name: "i'",
    dom: "B",
    cod: "C",
    map: (value) => (value === "b0" ? "c2" : "c3"),
  };
  const constant: FuncArr = {
    name: "const",
    dom: "A",
    cod: "B",
    map: () => "b0",
  };

  (category.arrows as FuncArr[]).push(surjection, injection, alternateInjection, constant);
  return category;
};

const isFinSetSurjection = (category: FinSetCategory, arrow: FuncArr): boolean =>
  category.isSurjective(arrow);

const isFinSetInjection = (category: FinSetCategory, arrow: FuncArr): boolean =>
  category.isInjective(arrow);

const makeFinSetOrthogonalityWitness = (
  category: FinSetCategory,
  left: FuncArr,
  right: FuncArr,
): OrthogonalityWitness<FinSetName, FuncArr> => {
  const hasLifting = (square: OrthogonalitySquare<FuncArr>): OrthogonalityResult<FuncArr> => {
    const failures: OrthogonalityFailure<FuncArr>[] = [];
    const equality = category.eq;
    const commuteLeft = category.compose(square.bottom, left);
    const commuteRight = category.compose(right, square.top);
    if (!equality(commuteLeft, commuteRight)) {
      failures.push({
        square,
        reason: `FinSet square with ${left.name} ⊥ ${right.name} failed to commute.`,
      });
      return { holds: false, failures, details: [] };
    }

    const assignments = new Map<string, string>();
    for (const element of category.carrier(left.dom)) {
      const image = left.map(element);
      const topImage = square.top.map(element);
      const bottomImage = square.bottom.map(image);
      const throughRight = right.map(topImage);
      if (bottomImage !== throughRight) {
        failures.push({
          square,
          reason: `Square failed to commute on ${element}; ${bottomImage} ≠ ${throughRight}.`,
        });
        return { holds: false, failures, details: [] };
      }
      const existing = assignments.get(image);
      if (existing && existing !== topImage) {
        failures.push({
          square,
          reason: `Injection uniqueness failed at ${image}; multiple lifts disagree.`,
        });
        return { holds: false, failures, details: [] };
      }
      assignments.set(image, topImage);
    }

    for (const element of category.carrier(left.cod)) {
      if (!assignments.has(element)) {
        failures.push({
          square,
          reason: `Surjectivity witness for ${left.name} missed element ${element}.`,
        });
        return { holds: false, failures, details: [] };
      }
    }

    const filler: FuncArr = {
      name: `${left.name}⊥${right.name}`,
      dom: left.cod,
      cod: right.dom,
      map: (value) => {
        const assigned = assignments.get(value);
        if (!assigned) {
          throw new Error(`FinSet filler evaluated outside surjection image at ${value}.`);
        }
        return assigned;
      },
    };

    return {
      holds: true,
      filler,
      failures: [],
      details: [`FinSet filler for ${left.name} ⊥ ${right.name} satisfied both composites.`],
    };
  };

  return { category, left, right, hasLifting };
};

export const buildFinSetRegularFactorization = (
  category: FinSetCategory = ensureFinSetCategory(),
): FactorizationSystemWitness<FinSetName, FuncArr> => {
  const arrows = category.arrows as FuncArr[];
  const samples: FactorizationSystemSamples<FuncArr> = {
    arrows,
    composites: arrows
      .flatMap((first) =>
        arrows
          .filter((second) => category.src(second) === category.dst(first))
          .map((second) => ({ first, second })),
      )
      .slice(0, 4),
  };

  const leftClass: FactorizationClass<FinSetName, FuncArr> = {
    name: "RegularEpi",
    membership: (arrow) => isFinSetSurjection(category, arrow),
    identitySamples: category.objects,
    compositionSamples: samples.composites,
    retractSamples: arrows.map((arrow) => ({
      arrow,
      retract: arrow,
      domainSection: category.id(category.src(arrow)),
      domainRetraction: category.id(category.src(arrow)),
      codomainSection: category.id(category.dst(arrow)),
      codomainRetraction: category.id(category.dst(arrow)),
      object: category.dst(arrow),
      retractObject: category.src(arrow),
    })),
  };

  const rightClass: FactorizationClass<FinSetName, FuncArr> = {
    name: "Mono",
    membership: (arrow) => isFinSetInjection(category, arrow),
    identitySamples: category.objects,
    compositionSamples: samples.composites,
    retractSamples: arrows.map((arrow) => ({
      arrow,
      retract: arrow,
      domainSection: category.id(category.src(arrow)),
      domainRetraction: category.id(category.src(arrow)),
      codomainSection: category.id(category.dst(arrow)),
      codomainRetraction: category.id(category.dst(arrow)),
      object: category.dst(arrow),
      retractObject: category.src(arrow),
    })),
  };

  const orthogonality = arrows
    .filter((arrow) => category.isSurjective(arrow))
    .flatMap((surjection) =>
      arrows
        .filter((candidate) => category.isInjective(candidate))
        .map((injection) => ({
          ...makeFinSetOrthogonalityWitness(category, surjection, injection),
          squareSamples: [
            {
              top: surjection,
              bottom: injection,
            },
          ],
        } satisfies OrthogonalityWitness<FinSetName, FuncArr>)),
    );

  const factorization = (arrow: FuncArr): Factorization<FinSetName, FuncArr> => {
    const factor = category.imageFactorisation(arrow);
    return {
      arrow,
      middle: factor.mid,
      left: factor.epi,
      right: factor.mono,
    };
  };

  return buildFactorizationSystem({
    category,
    leftClass,
    rightClass,
    orthogonality,
    factorization,
    samples,
    metadata: [
      "FinSet regular epi–mono factorization via image factorizations.",
    ],
  });
};

interface FinGrpHom {
  readonly name: string;
  readonly dom: FinGrpObj;
  readonly cod: FinGrpObj;
  readonly map: (value: string) => string;
}

const finGrpCategory: SimpleCat<FinGrpObj, FinGrpHom> & {
  readonly eq: (left: FinGrpHom, right: FinGrpHom) => boolean;
} = {
  id: (object) => ({
    name: `id_${object.name}`,
    dom: object,
    cod: object,
    map: (value) => value,
  }),
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error("FinGrp compose expects matching codomain/domain.");
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (value) => g.map(f.map(value)),
    };
  },
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => {
    if (left.dom !== right.dom || left.cod !== right.cod) {
      return false;
    }
    return left.dom.elems.every((value) => left.map(value) === right.map(value));
  },
};

const makeCyclicGroup = (order: number, name: string): FinGrpObj => ({
  name,
  elems: Array.from({ length: order }, (_, index) => `${index}`),
  e: "0",
  mul: (a, b) => `${(Number(a) + Number(b)) % order}`,
  inv: (value) => `${(order - Number(value)) % order}`,
});

const makeSubgroup = (superset: FinGrpObj, elements: readonly string[], name: string): FinGrpObj => ({
  name,
  elems: [...elements],
  e: superset.e,
  mul: (a, b) => {
    const product = superset.mul(a, b);
    if (!elements.includes(product)) {
      throw new Error(`${name}: not closed under multiplication at ${a}⋅${b}=${product}.`);
    }
    return product;
  },
  inv: (value) => {
    const inverse = superset.inv(value);
    if (!elements.includes(inverse)) {
      throw new Error(`${name}: not closed under inversion at ${value}⁻¹=${inverse}.`);
    }
    return inverse;
  },
});

const isFinGrpSurjection = (arrow: FinGrpHom): boolean => {
  const pending = new Set(arrow.cod.elems);
  for (const element of arrow.dom.elems) {
    pending.delete(arrow.map(element));
  }
  return pending.size === 0;
};

const isFinGrpInjection = (arrow: FinGrpHom): boolean => {
  const seen = new Map<string, string>();
  for (const element of arrow.dom.elems) {
    const image = arrow.map(element);
    const previous = seen.get(image);
    if (previous && previous !== element) {
      return false;
    }
    seen.set(image, element);
  }
  return true;
};

const makeFinGrpOrthogonalityWitness = (
  left: FinGrpHom,
  right: FinGrpHom,
): OrthogonalityWitness<FinGrpObj, FinGrpHom> => {
  const hasLifting = (square: OrthogonalitySquare<FinGrpHom>): OrthogonalityResult<FinGrpHom> => {
    const failures: OrthogonalityFailure<FinGrpHom>[] = [];
    const equality = finGrpCategory.eq;
    const commuteLeft = finGrpCategory.compose(square.bottom, left);
    const commuteRight = finGrpCategory.compose(right, square.top);
    if (!equality(commuteLeft, commuteRight)) {
      failures.push({
        square,
        reason: `FinGrp square with ${left.name} ⊥ ${right.name} failed to commute.`,
      });
      return { holds: false, failures, details: [] };
    }

    const assignments = new Map<string, string>();
    for (const element of left.dom.elems) {
      const image = left.map(element);
      const topImage = square.top.map(element);
      const bottomImage = square.bottom.map(image);
      const throughRight = right.map(topImage);
      if (bottomImage !== throughRight) {
        failures.push({
          square,
          reason: `Square failed to commute on ${element}; ${bottomImage} ≠ ${throughRight}.`,
        });
        return { holds: false, failures, details: [] };
      }
      const existing = assignments.get(image);
      if (existing && existing !== topImage) {
        failures.push({
          square,
          reason: `Injection uniqueness failed at ${image}; multiple lifts disagree.`,
        });
        return { holds: false, failures, details: [] };
      }
      assignments.set(image, topImage);
    }

    for (const element of left.cod.elems) {
      if (!assignments.has(element)) {
        failures.push({
          square,
          reason: `Surjectivity witness for ${left.name} missed element ${element}.`,
        });
        return { holds: false, failures, details: [] };
      }
    }

    const filler: FinGrpHom = {
      name: `${left.name}⊥${right.name}`,
      dom: left.cod,
      cod: right.dom,
      map: (value) => {
        const assigned = assignments.get(value);
        if (!assigned) {
          throw new Error(`FinGrp filler evaluated outside surjection image at ${value}.`);
        }
        return assigned;
      },
    };

    if (!FinGrp.isHom(filler.dom, filler.cod, {
      name: filler.name,
      dom: filler.dom.name,
      cod: filler.cod.name,
      map: filler.map,
    })) {
      failures.push({
        square,
        reason: `Constructed filler ${filler.name} is not a FinGrp homomorphism.`,
      });
      return { holds: false, failures, details: [] };
    }

    return {
      holds: true,
      filler,
      failures: [],
      details: [`FinGrp filler for ${left.name} ⊥ ${right.name} satisfied both composites.`],
    };
  };

  return { category: finGrpCategory, left, right, hasLifting };
};

const buildFinGrpSamples = () => {
  const Z4 = makeCyclicGroup(4, "Z₄");
  const Z2 = makeCyclicGroup(2, "Z₂");
  const kernel = makeSubgroup(Z4, ["0", "2"], "Ker(mod₂)");

  const mod2: FinGrpHom = {
    name: "mod₂",
    dom: Z4,
    cod: Z2,
    map: (value) => `${Number(value) % 2}`,
  };

  const inclusion: FinGrpHom = {
    name: "ι",
    dom: kernel,
    cod: Z4,
    map: (value) => value,
  };

  const kernelCollapse: FinGrpHom = {
    name: "κ",
    dom: kernel,
    cod: kernel,
    map: () => "0",
  };

  const identity: FinGrpHom = finGrpCategory.id(Z4);
  const imageInclusion: FinGrpHom = {
    name: "Im(mod₂)→Z₂",
    dom: Z2,
    cod: Z2,
    map: (value) => value,
  };

  return {
    groups: { Z4, Z2, kernel },
    arrows: { mod2, inclusion, kernelCollapse, identity, imageInclusion },
  };
};

export const buildFinGrpImageKernelFactorization = () => {
  const { groups, arrows } = buildFinGrpSamples();
  const allArrows: FinGrpHom[] = [
    arrows.mod2,
    arrows.inclusion,
    arrows.kernelCollapse,
    arrows.identity,
    arrows.imageInclusion,
  ];

  const samples: FactorizationSystemSamples<FinGrpHom> = {
    arrows: allArrows,
    composites: [
      { first: arrows.mod2, second: arrows.imageInclusion },
      { first: arrows.inclusion, second: arrows.mod2 },
    ],
  };

  const leftClass: FactorizationClass<FinGrpObj, FinGrpHom> = {
    name: "FiniteGroupRegularEpi",
    membership: isFinGrpSurjection,
    identitySamples: [groups.Z4, groups.Z2, groups.kernel],
    compositionSamples: samples.composites,
    retractSamples: allArrows.map((arrow) => ({
      arrow,
      retract: arrow,
      domainSection: finGrpCategory.id(arrow.dom),
      domainRetraction: finGrpCategory.id(arrow.dom),
      codomainSection: finGrpCategory.id(arrow.cod),
      codomainRetraction: finGrpCategory.id(arrow.cod),
      object: arrow.cod,
      retractObject: arrow.dom,
    })),
  };

  const rightClass: FactorizationClass<FinGrpObj, FinGrpHom> = {
    name: "FiniteGroupMono",
    membership: isFinGrpInjection,
    identitySamples: [groups.Z4, groups.Z2, groups.kernel],
    compositionSamples: samples.composites,
    retractSamples: allArrows.map((arrow) => ({
      arrow,
      retract: arrow,
      domainSection: finGrpCategory.id(arrow.dom),
      domainRetraction: finGrpCategory.id(arrow.dom),
      codomainSection: finGrpCategory.id(arrow.cod),
      codomainRetraction: finGrpCategory.id(arrow.cod),
      object: arrow.cod,
      retractObject: arrow.dom,
    })),
  };

  const orthogonality = [
    {
      ...makeFinGrpOrthogonalityWitness(arrows.mod2, arrows.imageInclusion),
      squareSamples: [
        {
          top: arrows.mod2,
          bottom: arrows.imageInclusion,
        },
      ],
    },
  ];

  const factorization = (arrow: FinGrpHom): Factorization<FinGrpObj, FinGrpHom> => {
    const imageElements = Array.from(new Set(arrow.dom.elems.map((value) => arrow.map(value))));
    const image = makeSubgroup(arrow.cod, imageElements, `Im(${arrow.name})`);
    const left: FinGrpHom = {
      name: `${arrow.name}_epi`,
      dom: arrow.dom,
      cod: image,
      map: (value) => arrow.map(value),
    };
    const right: FinGrpHom = {
      name: `${arrow.name}_mono`,
      dom: image,
      cod: arrow.cod,
      map: (value) => value,
    };
    return { arrow, middle: image, left, right };
  };

  return buildFactorizationSystem({
    category: finGrpCategory,
    leftClass,
    rightClass,
    orthogonality,
    factorization,
    samples,
    metadata: [
      "Finite group homomorphisms factor through their image with kernel diagnostics.",
    ],
  });
};

const factorizationMembershipCheck = <Obj, Arr>(
  classInfo: FactorizationClass<Obj, Arr>,
): ((category: SimpleCat<Obj, Arr>, arrow: Arr) => CategoryPropertyCheck<undefined>) =>
  (_category, arrow) => {
    const holds = classInfo.membership(arrow);
    return holds
      ? { holds }
      : { holds, details: `${classInfo.name} membership failed.` };
  };

const factorizationArrowSamples = <Arr>(
  arrows: ReadonlyArray<Arr>,
): ReadonlyArray<ArrowPropertySample<Arr>> =>
  arrows.map((arrow) => ({ kind: "arrow" as const, arrow }));

interface NormalizedFactorizationClassFunctorSettings<Arr> {
  readonly mode: FunctorPropertyMode;
  readonly property: string;
  readonly samples?: ReadonlyArray<ArrowPropertySample<Arr>>;
  readonly details?: ReadonlyArray<string>;
}

export interface FactorizationClassFunctorSettings<Arr> {
  readonly mode?: FunctorPropertyMode;
  readonly property?: string;
  readonly samples?: ReadonlyArray<ArrowPropertySample<Arr>>;
  readonly details?: ReadonlyArray<string>;
}

type FactorizationClassFunctorConfig<Arr> =
  | FactorizationClassFunctorSettings<Arr>
  | false
  | undefined;

const normalizeFactorizationClassConfig = <Obj, Arr>(
  side: "left" | "right",
  classInfo: FactorizationClass<Obj, Arr>,
  config: FactorizationClassFunctorConfig<Arr>,
): NormalizedFactorizationClassFunctorSettings<Arr> | undefined => {
  if (config === false) {
    return undefined;
  }
  const settings = config ?? {};
  const mode = settings.mode ?? "both";
  const property =
    settings.property ?? `factorization:${side}:${String(classInfo.name)}`;
  return {
    mode,
    property,
    ...(settings.samples ? { samples: settings.samples } : {}),
    ...(settings.details ? { details: settings.details } : {}),
  } satisfies NormalizedFactorizationClassFunctorSettings<Arr>;
};

const factorizationOracleDetails = <SrcObj, SrcArr, TgtObj, TgtArr>(
  side: "left" | "right",
  sourceClass: FactorizationClass<SrcObj, SrcArr>,
  targetClass: FactorizationClass<TgtObj, TgtArr>,
  mode: FunctorPropertyMode,
  sourceMetadata?: ReadonlyArray<string>,
  targetMetadata?: ReadonlyArray<string>,
  extras?: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const prefix = side === "left" ? "Left" : "Right";
  const details: string[] = [
    `${prefix} class ${sourceClass.name} → ${targetClass.name} (${mode}).`,
  ];
  if (sourceMetadata) {
    details.push(...sourceMetadata.map((line) => `Source system: ${line}`));
  }
  if (targetMetadata) {
    details.push(...targetMetadata.map((line) => `Target system: ${line}`));
  }
  if (extras) {
    details.push(...extras);
  }
  return details;
};

export interface FactorizationClassFunctorReport<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly sourceClass: FactorizationClass<SrcObj, SrcArr>;
  readonly targetClass: FactorizationClass<TgtObj, TgtArr>;
  readonly mode: FunctorPropertyMode;
  readonly property: string;
  readonly analysis: FunctorPropertyAnalysis<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    "arrow",
    unknown,
    unknown
  >;
}

export interface FactorizationSystemFunctorAnalysis<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly sourceSystem: FactorizationSystemWitness<SrcObj, SrcArr>;
  readonly targetSystem: FactorizationSystemWitness<TgtObj, TgtArr>;
  readonly left?: FactorizationClassFunctorReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly right?: FactorizationClassFunctorReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly analyses: ReadonlyArray<
    AnyFunctorPropertyAnalysis<SrcObj, SrcArr, TgtObj, TgtArr>
  >;
  readonly details: ReadonlyArray<string>;
}

export interface FactorizationSystemFunctorOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly sourceSystem: FactorizationSystemWitness<SrcObj, SrcArr>;
  readonly targetSystem: FactorizationSystemWitness<TgtObj, TgtArr>;
  readonly left?: FactorizationClassFunctorSettings<SrcArr> | false;
  readonly right?: FactorizationClassFunctorSettings<SrcArr> | false;
}

export interface FactorizationSystemFunctorResult<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly analysis: FactorizationSystemFunctorAnalysis<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  >;
}

export const analyzeFactorizationSystemFunctor = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>({
  functor,
  sourceSystem,
  targetSystem,
  left,
  right,
}: FactorizationSystemFunctorOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr
>): FactorizationSystemFunctorAnalysis<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const analyses: AnyFunctorPropertyAnalysis<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  >[] = [];
  let leftReport: FactorizationClassFunctorReport<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  > | undefined;
  let rightReport: FactorizationClassFunctorReport<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  > | undefined;

  const defaultSamples = factorizationArrowSamples(sourceSystem.samples.arrows);

  const normalizedLeft = normalizeFactorizationClassConfig(
    "left",
    sourceSystem.leftClass,
    left,
  );
  if (normalizedLeft) {
    const oracle = makeArrowPropertyOracle<
      SrcObj,
      SrcArr,
      TgtObj,
      TgtArr,
      unknown,
      unknown
    >({
      property: normalizedLeft.property,
      mode: normalizedLeft.mode,
      sourceEvaluate: factorizationMembershipCheck(sourceSystem.leftClass),
      targetEvaluate: factorizationMembershipCheck(targetSystem.leftClass),
      samples: normalizedLeft.samples ?? defaultSamples,
      details: factorizationOracleDetails(
        "left",
        sourceSystem.leftClass,
        targetSystem.leftClass,
        normalizedLeft.mode,
        sourceSystem.metadata,
        targetSystem.metadata,
        normalizedLeft.details,
      ),
    });
    const analysis = evaluateFunctorProperty(functor, oracle);
    analyses.push(analysis);
    leftReport = {
      sourceClass: sourceSystem.leftClass,
      targetClass: targetSystem.leftClass,
      mode: normalizedLeft.mode,
      property: normalizedLeft.property,
      analysis,
    };
  }

  const normalizedRight = normalizeFactorizationClassConfig(
    "right",
    sourceSystem.rightClass,
    right,
  );
  if (normalizedRight) {
    const oracle = makeArrowPropertyOracle<
      SrcObj,
      SrcArr,
      TgtObj,
      TgtArr,
      unknown,
      unknown
    >({
      property: normalizedRight.property,
      mode: normalizedRight.mode,
      sourceEvaluate: factorizationMembershipCheck(sourceSystem.rightClass),
      targetEvaluate: factorizationMembershipCheck(targetSystem.rightClass),
      samples: normalizedRight.samples ?? defaultSamples,
      details: factorizationOracleDetails(
        "right",
        sourceSystem.rightClass,
        targetSystem.rightClass,
        normalizedRight.mode,
        sourceSystem.metadata,
        targetSystem.metadata,
        normalizedRight.details,
      ),
    });
    const analysis = evaluateFunctorProperty(functor, oracle);
    analyses.push(analysis);
    rightReport = {
      sourceClass: sourceSystem.rightClass,
      targetClass: targetSystem.rightClass,
      mode: normalizedRight.mode,
      property: normalizedRight.property,
      analysis,
    };
  }

  const detailLines: string[] = [];
  if (leftReport) {
    detailLines.push(
      `Left class ${leftReport.sourceClass.name} (${leftReport.mode}) analysis ${
        leftReport.analysis.holds ? "succeeded" : "reported failures"
      }.`,
    );
  }
  if (rightReport) {
    detailLines.push(
      `Right class ${rightReport.sourceClass.name} (${rightReport.mode}) analysis ${
        rightReport.analysis.holds ? "succeeded" : "reported failures"
      }.`,
    );
  }
  if (detailLines.length === 0) {
    detailLines.push("No factorization system functor analyses were evaluated.");
  }

  return {
    sourceSystem,
    targetSystem,
    ...(leftReport ? { left: leftReport } : {}),
    ...(rightReport ? { right: rightReport } : {}),
    analyses,
    details: detailLines,
  } satisfies FactorizationSystemFunctorAnalysis<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  >;
};

export const attachFactorizationSystemProperties = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  options: FactorizationSystemFunctorOptions<SrcObj, SrcArr, TgtObj, TgtArr>,
): FactorizationSystemFunctorResult<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const analysis = analyzeFactorizationSystemFunctor(options);
  const functor = options.functor;
  const analyses = analysis.analyses;
  if (analyses.length === 0) {
    return { functor, analysis };
  }
  const enriched: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> = {
    ...functor,
    properties: [...(functor.properties ?? []), ...analyses],
  };
  return { functor: enriched, analysis };
};
