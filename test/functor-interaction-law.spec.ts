import { describe, expect, it } from "vitest";

import {
  finalInteractionLaw,
  makeFunctorInteractionLaw,
  selfDualInteractionLaw,
  stretchInteractionLaw,
  productInteractionLaw,
  coproductInteractionLaw,
  dualInteractionLaw,
  dualOfIdentity,
  dualOfTerminal,
  dualOfProduct,
  dualOfInitial,
  dualOfCoproduct,
  dualOfWeightedSum,
  dualOfExponentialIdentity,
  dualOfPositiveList,
  dualLowerBound,
  laxMonoidalDualComparison,
  makeNullaryMonadOperation,
  makeCommutativeBinaryMonadOperation,
  makeFunctorInteractionLawOperations,
  greatestInteractingFunctor,
  greatestInteractingComonad,
  deriveInteractionLawCurrying,
  deriveInteractionLawCCCPresentation,
  deriveInteractionLawLeftCommaPresentation,
  deriveInteractionLawLeftCommaEquivalence,
  deriveInteractionLawSweedlerSummary,
  makeFixedLeftInteractionMorphism,
  makeFixedRightInteractionMorphism,
  buildFixedLeftInitialObject,
  buildFixedRightInitialObject,
  buildFixedRightFinalObject,
  type FunctorInteractionLawContribution,
    type FunctorInteractionLaw,
    type FunctorInteractionLawElement,
} from "../functor-interaction-law";
import { identityNaturalTransformation } from "../natural-transformation";
import { contravariantToOppositeFunctor, constructContravariantFunctorWithWitness } from "../contravariant";
import { constructFunctorWithWitness, identityFunctorWithWitness } from "../functor";
import {
  analyzeFunctorOperationDegeneracy,
  checkCommutativeBinaryDegeneracy,
  checkNullaryDegeneracy,
} from "../functor-interaction-law-degeneracy";
import {
  checkInteractionLawProductUniversalProperty,
  checkInteractionLawCoproductUniversalProperty,
  checkInteractionLawCCCPresentation,
  checkInteractionLawStretching,
  checkLaxMonoidalDualComparison,
} from "../oracles/functor-interaction-laws";
import { dayTensor } from "../day-convolution";
import { SetCat, type Coproduct, type SetHom } from "../set-cat";
import { setSimpleCategory } from "../set-simple-category";
import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
} from "../functor-representable";
import { makeTwoObjectPromonoidalKernel } from "../promonoidal-structure";
import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../two-object-cat";

const buildBoolean = () => SetCat.obj([false, true], { tag: "Ω" });

const toUnknownSetHom = <Dom, Cod>(hom: SetHom<Dom, Cod>): SetHom<unknown, unknown> =>
  hom as unknown as SetHom<unknown, unknown>;

const makeBooleanInteractionInput = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const convolution = dayTensor(kernel, left.functor, right.functor);
  const dualizing = buildBoolean();
  const identity = identityFunctorWithWitness(TwoObjectCategory);
  const operations = makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({
      metadata: ["SpecOperations"],
    monadOperations: [
      makeNullaryMonadOperation<TwoObject, TwoArrow>({
        label: "TestNullary",
        component: (object: TwoObject) => TwoObjectCategory.id(object),
        dayReferences: [
          {
            fiber: "★" as const,
            index: 0,
            metadata: ["SampleFiber"],
          },
        ],
        lawvereWitness: {
          domain: "★" as const,
          codomain: "★" as const,
          morphism: TwoObjectCategory.id("★"),
          metadata: ["NullaryLawvere"],
        },
        metadata: ["SampleMonadOperation"],
        nullaryMetadata: ["IdentityNullary"],
      }),
      makeCommutativeBinaryMonadOperation<TwoObject, TwoArrow>({
        label: "TestBinary",
        component: (object: TwoObject) => TwoObjectCategory.id(object),
        swapWitness: TwoObjectCategory.id("★"),
        dayReferences: [
          {
            fiber: "★" as const,
            index: 1,
            metadata: ["BinaryFiber"],
          },
        ],
        lawvereWitness: {
          domain: "★" as const,
          codomain: "★" as const,
          morphism: TwoObjectCategory.id("★"),
          metadata: ["BinaryLawvere"],
        },
        metadata: ["SampleBinaryOperation"],
        commutativeMetadata: ["BinaryMetadata"],
      }),
    ],
    monadStructure: {
      unit: identityNaturalTransformation(identity),
      metadata: ["IdentityMonadStructure"],
    },
  });

  return {
    kernel,
    left: left.functor,
    right: right.functor,
    convolution,
    dualizing,
    pairing: (
      _object: TwoObject,
      carrier: ReturnType<typeof convolution.functor.functor.F0>,
    ) => SetCat.hom(carrier, dualizing, (cls) => cls.witness.kernelLeft === cls.witness.kernelRight),
    aggregate: (
      contributions: ReadonlyArray<
        FunctorInteractionLawContribution<TwoObject, TwoArrow, unknown, unknown, boolean>
      >,
    ) => contributions.some((entry) => entry.evaluation),
    tags: { primal: "LawPrimal", dual: "LawDual" },
      operations,
  } as const;
};

const makeTerminalFunctorInteractionLaw = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const terminal = SetCat.terminal().object;
  const left = constructContravariantFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: () => terminal,
      F1: () => toUnknownSetHom(SetCat.id(terminal)),
    },
  );
  const right = constructFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: () => terminal,
      F1: () => toUnknownSetHom(SetCat.id(terminal)),
    },
  );
  const convolution = dayTensor(kernel, left, right);
  const dualizing = SetCat.obj([true] as const, { tag: "TerminalDualizing" });

  return makeFunctorInteractionLaw({
    kernel,
    left,
    right,
    convolution,
    dualizing,
    pairing: (
      _object: TwoObject,
      carrier: ReturnType<typeof convolution.functor.functor.F0>,
    ) => SetCat.hom(carrier, dualizing, () => true),
    aggregate: () => true,
    tags: { primal: "TerminalPrimal", dual: "TerminalDual" },
  });
};

const makeInitialFunctorInteractionLaw = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const initial = SetCat.initial().object;
  const terminal = SetCat.terminal().object;
  const left = constructContravariantFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: () => initial,
      F1: () => toUnknownSetHom(SetCat.id(initial)),
    },
  );
  const right = constructFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: () => terminal,
      F1: () => toUnknownSetHom(SetCat.id(terminal)),
    },
  );
  const convolution = dayTensor(kernel, left, right);
  const dualizing = buildBoolean();

    return makeFunctorInteractionLaw({
      kernel,
      left,
      right,
    convolution,
    dualizing,
    pairing: (
      _object: TwoObject,
      carrier: ReturnType<typeof convolution.functor.functor.F0>,
    ) => SetCat.hom(carrier, dualizing, () => false),
    aggregate: () => false,
      operations: makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({ metadata: ["InitialFunctor"] }),
  });
};

const makePositiveListInteractionLaw = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");

  const listEquals = (
    leftList: ReadonlyArray<string>,
    rightList: ReadonlyArray<string>,
  ): boolean =>
    leftList.length === rightList.length &&
    leftList.every((value, index) => value === rightList[index]);

  const starLists = SetCat.obj<ReadonlyArray<string>>(
    [
      ["a"],
      ["b"],
      ["a", "a"],
      ["a", "b"],
      ["b", "a"],
    ].map((list) => [...list]),
    { tag: "StarPositiveLists", equals: listEquals },
  );
  const dotLists = SetCat.obj<ReadonlyArray<string>>(
    [["dot"], ["dot", "dot"]].map((list) => [...list]),
    { tag: "DotPositiveLists", equals: listEquals },
  );

  const right = constructFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: (object) => (object === "★" ? starLists : dotLists),
      F1: (arrow) => {
        if (arrow.name === "f") {
          return toUnknownSetHom(SetCat.hom(dotLists, starLists, (list) => list.map(() => "a")));
        }
        const carrier = arrow.src === "★" ? starLists : dotLists;
        return toUnknownSetHom(SetCat.id(carrier));
      },
    },
  );

  const convolution = dayTensor(kernel, left, right);
  const dualizing = buildBoolean();

  return makeFunctorInteractionLaw({
    kernel,
    left,
    right,
    convolution,
    dualizing,
    pairing: (
      _object: TwoObject,
      carrier: ReturnType<typeof convolution.functor.functor.F0>,
    ) => SetCat.hom(carrier, dualizing, () => true),
    aggregate: () => true,
    operations: makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({
      metadata: ["PositiveListLaw"],
    }),
  });
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => valuesEqual(value, right[index]));
  }
  if (typeof left === "object" && typeof right === "object" && left !== null && right !== null) {
    const leftKeys = Object.keys(left as Record<string, unknown>);
    const rightKeys = Object.keys(right as Record<string, unknown>);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) => valuesEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
  }
  return false;
};

const expectInteractionLawsEquivalent = <Obj, Arr, Left, Right, Value>(
  reference: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  candidate: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
) => {
  expect(candidate.kernel).toBe(reference.kernel);
  expect(candidate.dualizing).toBe(reference.dualizing);

  const referencePrimals = Array.from(reference.primalCarrier) as Array<
    FunctorInteractionLawElement<Obj, Left>
  >;
  const candidatePrimals = Array.from(candidate.primalCarrier) as Array<
    FunctorInteractionLawElement<Obj, Left>
  >;
  const referenceDuals = Array.from(reference.dualCarrier) as Array<
    FunctorInteractionLawElement<Obj, Right>
  >;
  const candidateDuals = Array.from(candidate.dualCarrier) as Array<
    FunctorInteractionLawElement<Obj, Right>
  >;

  expect(candidatePrimals.length).toBe(referencePrimals.length);
  expect(candidateDuals.length).toBe(referenceDuals.length);

  const findMatching = <Element>(
    elements: ReadonlyArray<Element>,
    predicate: (element: Element) => boolean,
  ): Element => {
    const match = elements.find(predicate);
    if (!match) {
      throw new Error("expectInteractionLawsEquivalent: matching element not found");
    }
    return match;
  };

  for (const primal of referencePrimals) {
    findMatching(candidatePrimals, (entry) =>
      Object.is(entry.object, primal.object) && valuesEqual(entry.element, primal.element),
    );
  }

  for (const dual of referenceDuals) {
    findMatching(candidateDuals, (entry) =>
      Object.is(entry.object, dual.object) && valuesEqual(entry.element, dual.element),
    );
  }

  for (const primal of referencePrimals) {
    const candidatePrimal = findMatching(candidatePrimals, (entry) =>
      Object.is(entry.object, primal.object) && valuesEqual(entry.element, primal.element),
    );

    for (const dual of referenceDuals) {
      const candidateDual = findMatching(candidateDuals, (entry) =>
        Object.is(entry.object, dual.object) && valuesEqual(entry.element, dual.element),
      );

      const referenceValue = reference.evaluate(primal, dual);
      const candidateValue = candidate.evaluate(candidatePrimal, candidateDual);
      expect(candidateValue).toEqual(referenceValue);
    }
  }
};

describe("Functor interaction laws", () => {
  it("packages Day pairing data into a reusable law", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const primalElements = Array.from(law.primalCarrier);
    const dualElements = Array.from(law.dualCarrier);

    expect(primalElements.length).toBeGreaterThan(0);
    expect(dualElements.length).toBeGreaterThan(0);

    const samplePrimal = primalElements[0]!;
    const sampleDual = dualElements[0]!;

    const contributions = law.collect(samplePrimal, sampleDual);
    const aggregated = law.aggregate(contributions);

    expect(law.evaluate(samplePrimal, sampleDual)).toBe(aggregated);
    expect(law.space.evaluate(samplePrimal, sampleDual)).toBe(aggregated);
    expect(law.toChuSpace()).toBe(law.space);

    const fiber = law.convolution.fibers[0]!;
    const component = law.getPairingComponent(fiber.output);

    expect(component?.dom).toEqual(law.convolution.functor.functor.F0(fiber.output));
    expect(component?.cod).toBe(law.dualizing);

    expect(law.operations?.metadata).toContain("SpecOperations");
    expect(law.operations?.metadata).toEqual(
      expect.arrayContaining([
        "Generic element witnesses derived from the monad unit η.",
        "IdentityMonadStructure",
      ]),
    );
    const operation = law.operations?.monadOperations?.[0];
    expect(operation?.arity).toBe(0);
    expect(operation?.metadata).toContain("SampleMonadOperation");
    expect(operation?.metadata).toEqual(
      expect.arrayContaining([
        "Generic element witnesses derived from the monad unit η.",
        "IdentityMonadStructure",
      ]),
    );
    const nullaryComponent = operation?.nullary?.component("★");
    expect(nullaryComponent?.dst).toBe("★");
    expect(operation?.dayReferences?.[0]?.fiber).toBe("★");
    expect(operation?.dayReferences?.[0]?.index).toBe(0);
    expect(operation?.kleisliOnGeneric?.("★")).toEqual(
      TwoObjectCategory.id("★"),
    );

    const nullaryReport = checkNullaryDegeneracy(law);
    expect(nullaryReport.holds).toBe(true);
    expect(nullaryReport.witnesses[0]?.components.length).toBeGreaterThan(0);
    expect(nullaryReport.steps.some((step) => step.label === "nullary-collapse")).toBe(true);
    expect(nullaryReport.zeroComparisons.length).toBeGreaterThan(0);
    const nullaryZero = nullaryReport.zeroComparisons[0]!;
    expect(nullaryZero.zero).toBe(SetCat.initial().object);
    expect(nullaryZero.toZero.cod).toBe(SetCat.initial().object);
    expect(nullaryZero.fromZero.dom).toBe(SetCat.initial().object);
    expect(nullaryReport.fixedLeftInitial?.law.left.functor).toBeDefined();
    expect(
      nullaryReport.fixedRightInitial?.collapse.details,
    ).toMatch(/non-empty right carrier/i);

    const binaryReport = checkCommutativeBinaryDegeneracy(law);
    expect(binaryReport.holds).toBe(true);
    expect(binaryReport.symmetric).toBe(true);
    expect(
      binaryReport.traces.some((trace) =>
        trace.steps.some((step) => step.label === "construct-kY"),
      ),
    ).toBe(true);
    expect(
      binaryReport.traces.some((trace) =>
        trace.steps.some((step) => step.label === "lift-through-functor"),
      ),
    ).toBe(true);
    expect(
      binaryReport.traces.some((trace) =>
        trace.steps.some((step) => step.label === "lawvere-comparison"),
      ),
    ).toBe(true);
    expect(
      binaryReport.traces.some((trace) =>
        trace.steps.some((step) => step.label === "day-fiber-reference"),
      ),
    ).toBe(true);
    expect(binaryReport.zeroComparisons.length).toBeGreaterThan(0);
    const binaryTrace = binaryReport.traces[0]!;
    expect(binaryTrace.zeroComparison?.zero).toBe(SetCat.initial().object);
    expect(binaryTrace.artifacts.operationMetadata).toContain("SampleBinaryOperation");
    expect(binaryTrace.artifacts.lawvereMetadata).toContain("BinaryLawvere");
    expect(binaryTrace.artifacts.dayReferenceMetadata).toContain("BinaryFiber");
    expect(binaryTrace.artifacts.zeroComparison?.toZero).toBe(
      binaryTrace.zeroComparison?.toZero,
    );
    expect(binaryTrace.artifacts.substitution).toBeDefined();
    expect(binaryTrace.artifacts.substitutionGap).toBeUndefined();
    expect(binaryTrace.steps.some((step) => step.label === "construct-hY")).toBe(true);
    expect(binaryTrace.steps.some((step) => step.label === "construct-deltaPrimeY")).toBe(true);
    expect(binaryTrace.steps.some((step) => step.label === "construct-kPrimeY")).toBe(true);
    expect(binaryTrace.artifacts.toTerminal).toBeDefined();
    expect(binaryTrace.artifacts.toTerminalGap).toBeUndefined();
    expect(binaryTrace.artifacts.terminalDiagonal).toBeDefined();
    expect(binaryTrace.artifacts.terminalDiagonalGap).toBeUndefined();
    expect(binaryTrace.artifacts.terminalCoproduct?.object).toBeDefined();
    expect(binaryTrace.artifacts.terminalDiagonal?.cod).toBe(
      binaryTrace.artifacts.terminalCoproduct?.object,
    );
    expect(binaryTrace.artifacts.kPrime).toBeDefined();
    expect(binaryTrace.artifacts.kPrimeGap).toBeUndefined();
    expect(binaryTrace.artifacts.zeroCoproduct?.object).toBeDefined();
    expect(binaryTrace.artifacts.kPrime?.cod).toBe(
      binaryTrace.artifacts.zeroCoproduct?.object,
    );
    expect(binaryReport.fixedLeftInitial?.collapse.finalLaw.dualizing).toBeDefined();

    const analysis = analyzeFunctorOperationDegeneracy(law);
    expect(analysis.nullary.holds).toBe(true);
    expect(analysis.commutativeBinary.holds).toBe(true);
    expect(analysis.lawvereWitnesses.length).toBeGreaterThan(0);
    expect(analysis.substitutionReferences.length).toBeGreaterThan(1);
    expect(analysis.dropMaps.length).toBeGreaterThan(0);
    expect(analysis.nullary.finalLaw).toBeDefined();
    expect(analysis.commutativeBinary.finalLaw).toBeDefined();
    expect(analysis.finalLaw).toBeDefined();
    expect(analysis.zeroComparisons.length).toBeGreaterThan(0);
    expect(analysis.nullary.fixedLeftInitial?.collapse.component("★").cod).toBe(
      SetCat.terminal().object,
    );
  });

  it("stretches interaction laws via natural transformations", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const stretched = stretchInteractionLaw(law, {
      left: law.left,
      right: law.right,
      mapLeft: (_object, element) => element,
      mapRight: (_object, element) => element,
      tags: { primal: "StretchedPrimal", dual: "StretchedDual" },
    });

    const primal = Array.from(stretched.primalCarrier)[0]!;
    const dual = Array.from(stretched.dualCarrier)[0]!;

    expect(stretched.evaluate(primal, dual)).toEqual(law.evaluate(primal, dual));
    expect(stretched.operations?.monadOperations?.length).toBe(law.operations?.monadOperations?.length ?? 0);
    expect(stretched.convolution.fibers.length).toBe(law.convolution.fibers.length);

    const stretchingOracle = checkInteractionLawStretching(
      law,
      stretched,
      {
        mapLeft: (_object, element) => element,
        mapRight: (_object, element) => element,
      },
    );

    expect(stretchingOracle.holds).toBe(true);
    expect(stretchingOracle.mismatches).toHaveLength(0);
    expect(stretchingOracle.samples.length).toBeGreaterThan(0);
  });

  it("self-dualises interaction laws and matches the dual Chu space", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const { law: dualLaw, dualSpace } = selfDualInteractionLaw(law);

    const primal = Array.from(dualLaw.primalCarrier)[0]!;
    const dual = Array.from(dualLaw.dualCarrier)[0]!;

    expect(dualLaw.evaluate(primal, dual)).toEqual(dualSpace.evaluate(primal, dual));
    expect(dualLaw.operations?.metadata).toEqual(law.operations?.metadata);
  });

  it("derives Sweedler dual data with cached witnesses", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const summary = deriveInteractionLawSweedlerSummary(law);

    expect(summary.law).toBe(law);
    expect(summary.currying.law).toBe(law);
    expect(summary.comma.presentation.law).toBe(law);
    expect(summary.diagnostics.length).toBeGreaterThan(0);

    const primals = Array.from(law.primalCarrier);
    const duals = Array.from(law.dualCarrier);

    for (const primal of primals) {
      const assignment = summary.fromPrimal.map(primal);
      for (const dual of duals) {
        expect(assignment(dual)).toEqual(law.evaluate(primal, dual));
      }
    }

    for (const dual of duals) {
      const assignment = summary.fromDual.map(dual);
      for (const primal of primals) {
        expect(assignment(primal)).toEqual(law.evaluate(primal, dual));
      }
    }
  });

  it("constructs dual interaction laws while reusing Sweedler diagnostics", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const sweedler = deriveInteractionLawSweedlerSummary(law);
    const dual = dualInteractionLaw(law, {
      space: sweedler.space,
      currying: sweedler.currying,
      comma: sweedler.comma,
    });

    const { law: referenceDual } = selfDualInteractionLaw(law, { space: sweedler.space });
    expectInteractionLawsEquivalent(referenceDual, dual.law);
    expect(dual.sweedler.space).toBe(sweedler.space);
    expect(dual.sweedler.currying).toBe(sweedler.currying);
    expect(dual.sweedler.comma).toBe(sweedler.comma);
    expect(dual.sweedler.diagnostics.length).toBeGreaterThan(0);
    expect(
      dual.diagnostics.some((entry) => entry.includes("dualInteractionLaw: constructed dual interaction law")),
    ).toBe(true);
    expect(
      dual.diagnostics.some((entry) => entry.includes("Chu space reused")),
    ).toBe(true);
  });

  it("packages the greatest interacting functor with Sweedler evaluation witnesses", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const result = greatestInteractingFunctor(law);
    const object = "★" as const;

    const expectedExponential = SetCat.exponential(
      law.right.functor.F0(object),
      law.dualizing,
    );
    expect(result.functorOpposite.functor.F0(object)).toBe(expectedExponential.object);

    const component = result.transformation.transformation.component(object) as SetHom<
      unknown,
      (value: unknown) => boolean
    >;
    const leftCarrier = law.left.functor.F0(object);
    const rightCarrier = law.right.functor.F0(object);

    for (const leftElement of Array.from(leftCarrier) as unknown[]) {
      const assignment = component.map(leftElement);
      for (const rightElement of Array.from(rightCarrier) as unknown[]) {
        const expected = law.evaluate(
          { object, element: leftElement } as Parameters<typeof law.evaluate>[0],
          { object, element: rightElement } as Parameters<typeof law.evaluate>[1],
        );
        expect(assignment(rightElement)).toEqual(expected);
      }
    }

    expect(result.diagnostics.some((entry) => entry.includes("Greatest functor"))).toBe(true);
  });

  it("packages the greatest interacting comonad with Sweedler evaluation witnesses", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const result = greatestInteractingComonad(law);
    const object = "★" as const;

    const expectedExponential = SetCat.exponential(
      law.left.functor.F0(object),
      law.dualizing,
    );
    expect(result.functorOpposite.functor.F0(object)).toBe(expectedExponential.object);

    const component = result.transformation.transformation.component(object) as SetHom<
      unknown,
      (value: unknown) => boolean
    >;
    const rightCarrier = law.right.functor.F0(object);
    const leftCarrier = law.left.functor.F0(object);

    for (const rightElement of Array.from(rightCarrier) as unknown[]) {
      const assignment = component.map(rightElement);
      for (const leftElement of Array.from(leftCarrier) as unknown[]) {
        const expected = law.evaluate(
          { object, element: leftElement } as Parameters<typeof law.evaluate>[0],
          { object, element: rightElement } as Parameters<typeof law.evaluate>[1],
        );
        expect(assignment(leftElement)).toEqual(expected);
      }
    }

    expect(result.diagnostics.some((entry) => entry.includes("Greatest comonad"))).toBe(true);
  });

  it("builds the identity dual with swap agreement diagnostics", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const result = dualOfIdentity(law);
    const reference = dualInteractionLaw(law);

    expectInteractionLawsEquivalent(reference.law, result.law);
    expect(result.swapAgreement.matches).toBe(true);
    expect(result.swapAgreement.checkedPairs).toBeGreaterThan(0);
    expect(result.diagnostics.some((entry) => entry.includes("dualOfIdentity"))).toBe(true);
  });

  it("constructs the dual of the terminal functor via the final law", () => {
    const terminalLaw = makeTerminalFunctorInteractionLaw();

    const result = dualOfTerminal(terminalLaw);

    expect(result.matchesReference).toBe(true);
    expect(Array.from(result.law.primalCarrier)).toHaveLength(0);
    expect(Array.from(result.law.dualCarrier)).toHaveLength(0);
    expect(result.diagnostics.some((entry) => entry.includes("constant-zero"))).toBe(true);
  });

  it("assembles product duals from component duals", () => {
    const leftLaw = makeFunctorInteractionLaw(makeBooleanInteractionInput());
    const rightLaw = makeFunctorInteractionLaw(makeBooleanInteractionInput());

    const combined = productInteractionLaw(leftLaw, rightLaw);
    const reference = dualInteractionLaw(combined.law);
    const productDual = dualOfProduct(leftLaw, rightLaw);

    expectInteractionLawsEquivalent(reference.law, productDual.reference.law);
    expect(productDual.agreement.matches).toBe(true);
    expect(productDual.agreement.checkedPairs).toBeGreaterThan(0);
    expect(productDual.diagnostics.some((entry) => entry.includes("dualOfProduct"))).toBe(true);
  });

  it("packages the dual of the initial functor with witness metadata", () => {
    const initialLaw = makeInitialFunctorInteractionLaw();

    const result = dualOfInitial(initialLaw);

    expectInteractionLawsEquivalent(result.reference.law, result.law);
    expect(result.initialWitness.collapse.finalLaw.dualizing).toBe(initialLaw.dualizing);
    expect(result.diagnostics.some((entry) => entry.includes("dualOfInitial"))).toBe(true);
  });

  it("assembles coproduct duals from component duals", () => {
    const leftLaw = makeFunctorInteractionLaw(makeBooleanInteractionInput());
    const rightLaw = makeFunctorInteractionLaw(makeBooleanInteractionInput());

    const combined = coproductInteractionLaw(leftLaw, rightLaw);
    const reference = dualInteractionLaw(combined.law);
    const coproductDual = dualOfCoproduct(leftLaw, rightLaw);

    expectInteractionLawsEquivalent(reference.law, coproductDual.reference.law);
    expect(coproductDual.agreement.matches).toBe(true);
    expect(coproductDual.diagnostics.some((entry) => entry.includes("dualOfCoproduct"))).toBe(true);
  });

  it("records degeneracy metadata for weighted-sum duals", () => {
    const law = makeFunctorInteractionLaw(makeBooleanInteractionInput());
    const weights = SetCat.obj([0, 1] as const, { tag: "Weights" });

    const result = dualOfWeightedSum(law, { weights, weightMetadata: ["Weighted"] });

    expect(result.reference.law).toBe(result.law);
    expect(result.weights).toBe(weights);
    expect(result.diagnostics.some((entry) => entry.includes("dualOfWeightedSum"))).toBe(true);
  });

  it("constructs the canonical lower bound and recognises isomorphisms", () => {
    const law = makeFunctorInteractionLaw(makeBooleanInteractionInput());

    const result = dualLowerBound(law, { metadata: ["LowerBound"] });

    expect(result.reference.law).toBeDefined();
    expect(result.components.length).toBeGreaterThan(0);
    expect(
      result.components.every((component) => component.coverage.isIsomorphism),
    ).toBe(true);
    expect(
      result.diagnostics.some((entry) => entry.includes("dualLowerBound")),
    ).toBe(true);
  });

  it("summarises exponential-identity dual cardinalities", () => {
    const law = makeFunctorInteractionLaw(makeBooleanInteractionInput());
    const parameter = SetCat.obj(["p0", "p1"] as const, { tag: "Parameters" });

    const result = dualOfExponentialIdentity(law, {
      parameter,
      metadata: ["ExponentialIdentity"],
    });

    expect(result.parameter).toBe(parameter);
    expect(result.cardinalities.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((entry) => entry.includes("dualOfExponentialIdentity"))).toBe(true);
  });

  it("records θ summaries for positive-list duals", () => {
    const law = makePositiveListInteractionLaw();

    const result = dualOfPositiveList(law, {
      metadata: ["PositiveListTest"],
      decodeList: ({ element }) => element,
    });

    expect(result.thetaSummaries.length).toBeGreaterThan(0);
    expect(result.lengthSummaries.some((entry) => entry.length >= 1)).toBe(true);
    expect(result.diagnostics.some((entry) => entry.includes("dualOfPositiveList"))).toBe(true);
    expect(result.degeneracyMetadata).toEqual(
      expect.arrayContaining(["PositiveListLaw", "PositiveListTest"]),
    );
  });

  it("constructs lax-monoidal dual comparison witnesses", () => {
    const leftLaw = makeFunctorInteractionLaw(makeBooleanInteractionInput());
    const rightLaw = makeFunctorInteractionLaw(makeBooleanInteractionInput());

    const comparison = laxMonoidalDualComparison(leftLaw, rightLaw);

    expect(comparison.comparison.matches).toBe(true);
    expect(comparison.valueMap.bijective).toBe(true);
    expect(comparison.components.every((component) => component.consistent)).toBe(true);
    expect(
      comparison.diagnostics.some((entry) => entry.includes("laxMonoidalDualComparison")),
    ).toBe(true);

    const oracle = checkLaxMonoidalDualComparison(leftLaw, rightLaw);
    expect(oracle.holds).toBe(true);
    expect(oracle.samples.length).toBeGreaterThan(0);
    expect(
      oracle.details.some((entry) => entry.includes("laxMonoidalDualComparison")),
    ).toBe(true);
  });

  it("forms categorical products of interaction laws", () => {
    const baseInput = makeBooleanInteractionInput();
    const law0 = makeFunctorInteractionLaw(baseInput);

    const alternateInput = makeBooleanInteractionInput();
    const law1 = makeFunctorInteractionLaw({
      ...alternateInput,
      aggregate: (contributions: ReadonlyArray<
        FunctorInteractionLawContribution<TwoObject, TwoArrow, unknown, unknown, boolean>
      >) => contributions.every((entry) => entry.evaluation),
    });

    const product = productInteractionLaw(law0, law1);
    const productLaw = product.law;

    const samplePrimal = Array.from(productLaw.primalCarrier)[0]!;
    const sampleDual = Array.from(productLaw.dualCarrier)[0]!;

    const value = productLaw.evaluate(samplePrimal, sampleDual);

    const law0Value = law0.evaluate(
      { object: samplePrimal.object, element: samplePrimal.element[0] },
      { object: sampleDual.object, element: sampleDual.element[0] },
    );
    const law1Value = law1.evaluate(
      { object: samplePrimal.object, element: samplePrimal.element[1] },
      { object: sampleDual.object, element: sampleDual.element[1] },
    );

    expect(value).toEqual([law0Value, law1Value]);

    const contributions = productLaw.collect(samplePrimal, sampleDual);
    expect(productLaw.aggregate(contributions)).toEqual(value);

    const leftProduct = product.projections.left(samplePrimal.object);
    expect(leftProduct.projections.fst.map(samplePrimal.element)).toBe(samplePrimal.element[0]);
    expect(leftProduct.projections.snd.map(samplePrimal.element)).toBe(samplePrimal.element[1]);

    const rightProduct = product.projections.right(sampleDual.object);
    expect(rightProduct.projections.fst.map(sampleDual.element)).toBe(sampleDual.element[0]);
    expect(rightProduct.projections.snd.map(sampleDual.element)).toBe(sampleDual.element[1]);

    expect(product.projections.value.lookup(law0Value, law1Value)).toEqual(value);

    const productOracle = checkInteractionLawProductUniversalProperty(product, law0, law1);
    expect(productOracle.holds).toBe(true);
    expect(productOracle.first.samples.length).toBeGreaterThan(0);
    expect(productOracle.second.samples.length).toBeGreaterThan(0);
    expect(productOracle.details).toHaveLength(0);
  });

  it("forms categorical coproducts of interaction laws", () => {
    const baseInput = makeBooleanInteractionInput();
    const law0 = makeFunctorInteractionLaw(baseInput);

    const alternateInput = makeBooleanInteractionInput();
    const law1 = makeFunctorInteractionLaw({
      ...alternateInput,
      aggregate: (contributions: ReadonlyArray<
        FunctorInteractionLawContribution<TwoObject, TwoArrow, unknown, unknown, boolean>
      >) => contributions.every((entry) => entry.evaluation),
    });

    const coproduct = coproductInteractionLaw(law0, law1);
    const coproductLaw = coproduct.law;
    const sampleObject: TwoObject = "★";

    const valueInjections = coproduct.injections.value;

    const law0Primal = Array.from(law0.primalCarrier).find(
      (element) => element.object === sampleObject,
    )!;
    const law0Dual = Array.from(law0.dualCarrier).find(
      (element) => element.object === sampleObject,
    )!;

    const leftCoproduct = coproduct.injections.left(sampleObject);
    const rightCoproduct = coproduct.injections.right(sampleObject);

    const primalLeft = {
      object: sampleObject,
      element: leftCoproduct.injections.inl.map(law0Primal.element),
    } as const;
    const dualLeft = {
      object: sampleObject,
      element: rightCoproduct.injections.inl.map(law0Dual.element),
    } as const;

    const valueLeft = coproductLaw.evaluate(primalLeft, dualLeft);
    const expectedLeft = valueInjections.injections.inl.map(
      law0.evaluate(law0Primal, law0Dual),
    );
    expect(valueLeft).toEqual(expectedLeft);

    const contributionsLeft = coproductLaw.collect(primalLeft, dualLeft);
    expect(contributionsLeft.length).toBeGreaterThan(0);
    expect(coproductLaw.aggregate(contributionsLeft)).toEqual(valueLeft);

    const law1Primal = Array.from(law1.primalCarrier).find(
      (element) => element.object === sampleObject,
    )!;
    const law1Dual = Array.from(law1.dualCarrier).find(
      (element) => element.object === sampleObject,
    )!;

    const primalRight = {
      object: sampleObject,
      element: leftCoproduct.injections.inr.map(law1Primal.element),
    } as const;
    const dualRight = {
      object: sampleObject,
      element: rightCoproduct.injections.inr.map(law1Dual.element),
    } as const;

    const valueRight = coproductLaw.evaluate(primalRight, dualRight);
    const expectedRight = valueInjections.injections.inr.map(
      law1.evaluate(law1Primal, law1Dual),
    );
    expect(valueRight).toEqual(expectedRight);

    const contributionsRight = coproductLaw.collect(primalRight, dualRight);
    expect(contributionsRight.length).toBeGreaterThan(0);
    expect(coproductLaw.aggregate(contributionsRight)).toEqual(valueRight);

    const coproductOracle = checkInteractionLawCoproductUniversalProperty(
      coproduct,
      law0,
      law1,
    );
    expect(coproductOracle.holds).toBe(true);
    expect(coproductOracle.left.samples.length).toBeGreaterThan(0);
    expect(coproductOracle.right.samples.length).toBeGreaterThan(0);
    expect(coproductOracle.details).toHaveLength(0);
  });

  it("commutes with stretching across products and coproducts", () => {
    const baseInput = makeBooleanInteractionInput();
    const law0 = makeFunctorInteractionLaw(baseInput);
    const law1 = makeFunctorInteractionLaw(baseInput);

    const stretched0 = stretchInteractionLaw(law0, {
      left: law0.left,
      right: law0.right,
      mapLeft: (_object, element: unknown) => element,
      mapRight: (_object, element: unknown) => element,
    });

    const stretched1 = stretchInteractionLaw(law1, {
      left: law1.left,
      right: law1.right,
      mapLeft: (_object, element: unknown) => element,
      mapRight: (_object, element: unknown) => element,
    });

    const productFirst = productInteractionLaw(law0, law1).law;
    const stretchedProduct = stretchInteractionLaw(productFirst, {
      left: productFirst.left,
      right: productFirst.right,
      mapLeft: (_object, element: readonly [unknown, unknown]) => element,
      mapRight: (_object, element: readonly [unknown, unknown]) => element,
    });
    const productSecond = productInteractionLaw(stretched0, stretched1).law;
    expectInteractionLawsEquivalent(stretchedProduct, productSecond);

    const coproductFirst = coproductInteractionLaw(law0, law1).law;
    const stretchedCoproduct = stretchInteractionLaw(coproductFirst, {
      left: coproductFirst.left,
      right: coproductFirst.right,
      mapLeft: (_object, element: Coproduct<unknown, unknown>) => element,
      mapRight: (_object, element: Coproduct<unknown, unknown>) => element,
    });
    const coproductSecond = coproductInteractionLaw(stretched0, stretched1).law;
    expectInteractionLawsEquivalent(stretchedCoproduct, coproductSecond);
  });

  it("derives currying data and fixed-side morphisms", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const currying = deriveInteractionLawCurrying(law);
    expect(currying.consistent).toBe(true);
    expect(currying.doubleTransposeConsistent).toBe(true);
    expect(currying.hatEvaluationConsistent).toBe(true);
    const fiber = currying.fibers.get("★");
    expect(fiber).toBeDefined();
    const samplePair = Array.from(fiber!.product.object)[0]!;
    const original = fiber!.phi.map(samplePair);
    const reconstructed = fiber!.reconstructed.map(samplePair);
    expect(reconstructed).toBe(original);
    expect(fiber!.theta).toBe(fiber!.phiHat);
    const sampleObject: TwoObject = "★";
    expect(fiber!.phiCheck.dom).toBe(law.left.functor.F0(sampleObject));
    expect(fiber!.evaluation).toBe(fiber!.exponential.evaluation);
    expect(fiber!.hatEvaluationConsistent).toBe(true);
    expect(fiber!.hatEvaluationDiscrepancies).toHaveLength(0);
    expect(fiber!.finalTransformation.implemented).toBe(true);
    expect(fiber!.finalTransformation.components.length).toBeGreaterThan(0);
    const firstComponent = fiber!.finalTransformation.components[0]!;
    expect(firstComponent.evaluationTable.length).toBeGreaterThanOrEqual(0);
    expect(firstComponent.diagnostics[0]).toMatch(/δ\^/);

    const rightIdentity = identityNaturalTransformation(law.right);
    const leftMorphism = makeFixedLeftInteractionMorphism({
      domain: law,
      codomain: law,
      transformation: rightIdentity,
    });
    expect(leftMorphism.holds).toBe(true);

    const leftOpposite = contravariantToOppositeFunctor(law.left);
    const leftIdentity = identityNaturalTransformation(leftOpposite);
    const rightMorphism = makeFixedRightInteractionMorphism({
      domain: law,
      codomain: law,
      transformation: leftIdentity,
    });
    expect(rightMorphism.holds).toBe(true);

    const leftInitial = buildFixedLeftInitialObject(law);
    expect(leftInitial.collapse.component("★").cod).toBe(SetCat.terminal().object);

    const rightInitial = buildFixedRightInitialObject(law);
    expect(rightInitial.collapse.finalLaw.dualizing).toBe(law.dualizing);
    expect(rightInitial.collapse.details).toMatch(/non-empty/);

    const rightFinal = buildFixedRightFinalObject(law);
    expect(rightFinal.presentation.law).toBe(law);
    expect(rightFinal.mediator.holds).toBe(true);
    const sigmaComponent = rightFinal.presentation.sigma.get(object);
    expect(sigmaComponent).toBeDefined();
    expect(rightFinal.sigma.transformation.component(object)).toBe(sigmaComponent);
    const finalLeftCarrier = rightFinal.law.left.functor.F0(object);
    const finalRightCarrier = rightFinal.law.right.functor.F0(object);
    const assignment = Array.from(finalLeftCarrier)[0]!;
    const argument = Array.from(finalRightCarrier)[0]!;
    const evaluation = assignment.map(argument);
    const primal = { object, element: assignment } as const;
    const dual = { object, element: argument } as const;
    expect(rightFinal.law.evaluate(primal, dual)).toBe(evaluation);

    const cccPresentation = deriveInteractionLawCCCPresentation(law);
    expect(cccPresentation.consistent).toBe(currying.consistent);
    expect(cccPresentation.hatEvaluationDiscrepancies).toHaveLength(0);

    const cccOracle = checkInteractionLawCCCPresentation(law);
    expect(cccOracle.holds).toBe(true);
    expect(cccOracle.doubleTranspose.discrepancies).toHaveLength(0);
    expect(cccOracle.hatEvaluation.discrepancies).toHaveLength(0);
    expect(cccOracle.finalTransformation.implemented).toBe(true);
    expect(cccOracle.finalTransformation.fibers[0]?.diagnostics[0]).toMatch(/δ\^/);
  });

  it("presents interaction laws in the left comma form", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const presentation = deriveInteractionLawLeftCommaPresentation(law);
    expect(presentation.law).toBe(law);
    expect(presentation.evaluationConsistent).toBe(true);
    expect(presentation.naturalityConsistent).toBe(true);
    expect(presentation.sigma.size).toBeGreaterThan(0);
    expect(presentation.internalHom.metadata?.[0]).toMatch(/Internal hom functor/);
    expect(presentation.internalHomOpposite.report.holds).toBe(true);

    const object: TwoObject = "★";
    const sigmaComponent = presentation.sigma.get(object);
    expect(sigmaComponent).toBeDefined();
    const leftCarrier = law.left.functor.F0(object);
    const rightCarrier = law.right.functor.F0(object);
    const leftElement = Array.from(leftCarrier)[0]!;
    const rightElement = Array.from(rightCarrier)[0]!;
    const evaluation = law.evaluate({ object, element: leftElement }, { object, element: rightElement });
    const reconstructed = sigmaComponent!.map(leftElement)(rightElement);
    expect(reconstructed).toBe(evaluation);
    expect(presentation.evaluationFailures).toHaveLength(0);
    expect(presentation.naturalityFailures).toHaveLength(0);
  });

  it("reconstructs the interaction law from its left comma presentation", () => {
    const input = makeBooleanInteractionInput();
    const law = makeFunctorInteractionLaw(input);

    const equivalence = deriveInteractionLawLeftCommaEquivalence(law);
    expect(equivalence.presentation.law).toBe(law);
    expect(equivalence.reconstructionConsistent).toBe(true);
    expect(equivalence.naturalityConsistent).toBe(true);
    expect(equivalence.reconstructionFailures).toHaveLength(0);
    expect(equivalence.naturalityFailures).toHaveLength(0);

    const object: TwoObject = "★";
    const component = equivalence.components.get(object);
    expect(component).toBeDefined();
    const leftCarrier = law.left.functor.F0(object);
    const rightCarrier = law.right.functor.F0(object);
    const pair = [Array.from(leftCarrier)[0]!, Array.from(rightCarrier)[0]!] as const;
    const reconstructed = component!.morphism.map(pair);
    const evaluation = law.evaluate(
      { object, element: pair[0] },
      { object, element: pair[1] },
    );
    expect(reconstructed).toBe(evaluation);
  });

  it("constructs the final interaction law with constant-zero evaluation", () => {
    const input = makeBooleanInteractionInput();
    const finalLaw = finalInteractionLaw(input.kernel);

    expect(Array.from(finalLaw.dualCarrier).length).toBe(0);
    expect(finalLaw.aggregate([])).toBe(false);
  });
});
