import { describe, expect, it } from "vitest";

import {
  finalInteractionLaw,
  makeFunctorInteractionLaw,
  selfDualInteractionLaw,
  stretchInteractionLaw,
  productInteractionLaw,
  coproductInteractionLaw,
  makeNullaryMonadOperation,
  makeCommutativeBinaryMonadOperation,
  deriveInteractionLawCurrying,
  deriveInteractionLawCCCPresentation,
  deriveInteractionLawLeftCommaPresentation,
  deriveInteractionLawLeftCommaEquivalence,
  makeFixedLeftInteractionMorphism,
  makeFixedRightInteractionMorphism,
  buildFixedLeftInitialObject,
  buildFixedRightInitialObject,
  type FunctorInteractionLawContribution,
} from "../functor-interaction-law";
import { identityNaturalTransformation } from "../natural-transformation";
import { contravariantToOppositeFunctor } from "../contravariant";
import {
  analyzeFunctorOperationDegeneracy,
  checkCommutativeBinaryDegeneracy,
  checkNullaryDegeneracy,
} from "../functor-interaction-law-degeneracy";
import { dayTensor } from "../day-convolution";
import { SetCat } from "../set-cat";
import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
} from "../functor-representable";
import { makeTwoObjectPromonoidalKernel } from "../promonoidal-structure";
import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../two-object-cat";

const buildBoolean = () => SetCat.obj([false, true], { tag: "Ω" });

const makeBooleanInteractionInput = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const convolution = dayTensor(kernel, left.functor, right.functor);
  const dualizing = buildBoolean();
  const operations = {
    metadata: ["SpecOperations"],
    monadOperations: [
      makeNullaryMonadOperation({
        label: "TestNullary",
        component: (object: TwoObject) => TwoObjectCategory.id(object),
        kleisliOnGeneric: (object: TwoObject) => TwoObjectCategory.id(object),
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
      makeCommutativeBinaryMonadOperation({
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
  } as const;

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
    const operation = law.operations?.monadOperations?.[0];
    expect(operation?.arity).toBe(0);
    expect(operation?.metadata).toContain("SampleMonadOperation");
    const nullaryComponent = operation?.nullary?.component("★");
    expect(nullaryComponent?.dst).toBe("★");
    expect(operation?.dayReferences?.[0]?.fiber).toBe("★");
    expect(operation?.dayReferences?.[0]?.index).toBe(0);

    const nullaryReport = checkNullaryDegeneracy(law);
    expect(nullaryReport.holds).toBe(true);
    expect(nullaryReport.witnesses[0]?.components.length).toBeGreaterThan(0);
    expect(nullaryReport.steps.some((step) => step.label === "nullary-collapse")).toBe(true);
    expect(nullaryReport.zeroComparisons.length).toBeGreaterThan(0);
    const nullaryZero = nullaryReport.zeroComparisons[0]!;
    expect(nullaryZero.zero).toBe(SetCat.initialObj);
    expect(nullaryZero.toZero.cod).toBe(SetCat.initialObj);
    expect(nullaryZero.fromZero.dom).toBe(SetCat.initialObj);
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
    expect(binaryTrace.zeroComparison?.zero).toBe(SetCat.initialObj);
    expect(binaryTrace.artifacts.operationMetadata).toContain("SampleBinaryOperation");
    expect(binaryTrace.artifacts.lawvereMetadata).toContain("BinaryLawvere");
    expect(binaryTrace.artifacts.dayReferenceMetadata).toContain("BinaryFiber");
    expect(binaryTrace.artifacts.zeroComparison?.toZero).toBe(
      binaryTrace.zeroComparison?.toZero,
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
      SetCat.terminalObj,
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
    expect(fiber!.finalTransformationDiagnostics[0]).toMatch(/δ\^X_Y/);

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
    expect(leftInitial.collapse.component("★").cod).toBe(SetCat.terminalObj);

    const rightInitial = buildFixedRightInitialObject(law);
    expect(rightInitial.collapse.finalLaw.dualizing).toBe(law.dualizing);
    expect(rightInitial.collapse.details).toMatch(/non-empty/);

    const cccPresentation = deriveInteractionLawCCCPresentation(law);
    expect(cccPresentation.consistent).toBe(currying.consistent);
    expect(cccPresentation.hatEvaluationDiscrepancies).toHaveLength(0);
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
