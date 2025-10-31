import { describe, expect, it } from "vitest";

import {
  dayConvolutionAssociator,
  dayConvolutionLeftUnitor,
  dayConvolutionRightUnitor,
  dayTensor,
  dayUnit,
  dayUnitContravariant,
  mapDayConvolutionFiber,
} from "../day-convolution";
import { getCarrierSemantics } from "../set-cat";
import { contravariantRepresentableFunctorWithWitness, covariantRepresentableFunctorWithWitness } from "../functor-representable";
import { oppositeFunctorToContravariant } from "../contravariant";
import { makeTwoObjectPromonoidalKernel } from "../promonoidal-structure";
import { TwoObjectCategory, nonIdentity, type TwoObject } from "../two-object-cat";

const enumerate = <T>(carrier: Set<T>): ReadonlyArray<T> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier);
};

describe("Day convolution builders", () => {
  it("computes the Day tensor for representable functors on the two-object kernel", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "•");

    const convolution = dayTensor(kernel, left.functor, right.functor);

    expect(convolution.functor.report.holds).toBe(true);
    for (const fiber of convolution.fibers) {
      expect(fiber.coend.diagnostics.holds).toBe(true);
    }

    const dotCarrier = convolution.functor.functor.F0("•");
    const dotElements = enumerate(dotCarrier);
    expect(dotElements).toHaveLength(1);

    const starCarrier = convolution.functor.functor.F0("★");
    const starElements = enumerate(starCarrier);
    expect(starElements.length).toBeGreaterThan(0);

    const arrow = convolution.functor.functor.F1(nonIdentity);
    const image = arrow.map(dotElements[0]!);
    const starSemantics = getCarrierSemantics(starCarrier);
    expect(starSemantics?.has(image) ?? false).toBe(true);
  });

  it("builds the Day unit functor with reusable carriers", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const unit = dayUnit(kernel);

    expect(unit.functor.report.holds).toBe(true);

    const dotCarrier = unit.functor.functor.F0("•");
    const dotElements = enumerate(dotCarrier);
    expect(dotElements.length).toBeGreaterThan(0);

    const starCarrier = unit.functor.functor.F0("★");
    const starElements = enumerate(starCarrier);
    expect(starElements.length).toBeGreaterThan(0);

    const arrow = unit.functor.functor.F1(nonIdentity);
    const image = arrow.map(dotElements[0]!);
    const starSemantics = getCarrierSemantics(starCarrier);
    expect(starSemantics?.has(image) ?? false).toBe(true);
  });

  it("maps Day convolution fibers via reclassification", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "•");

    const convolution = dayTensor(kernel, left.functor, right.functor);

    const transformed = mapDayConvolutionFiber(
      convolution,
      convolution,
      "★",
      (witness) => {
        const rightArrow = right.functor.functor.F1(nonIdentity);
        return {
          leftElement: witness.leftElement,
          rightElement: rightArrow.map(witness.rightElement),
        };
      },
    );

    const starCarrier = convolution.functor.functor.F0("★");
    const comparison = convolution.functor.functor.F1(nonIdentity);

    for (const element of enumerate(starCarrier)) {
      const viaTransform = transformed.map(element);
      const viaArrow = comparison.map(element);
      expect(viaTransform.key).toBe(viaArrow.key);
    }
  });

  it("builds Day unitors for representable functors", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const functor = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");

    const leftUnitor = dayConvolutionLeftUnitor(kernel, functor.functor);
    expect(leftUnitor.report.holds).toBe(true);

    const rightUnitor = dayConvolutionRightUnitor(kernel, functor.functor);
    expect(rightUnitor.report.holds).toBe(true);

    const unitContravariant = dayUnitContravariant(kernel);
    const leftConvolution = dayTensor(kernel, unitContravariant, functor.functor);
    const leftComponent = leftUnitor.transformation.component("★");
    const leftCarrier = enumerate(leftConvolution.functor.functor.F0("★"));

    const leftUnitorBackward = (object: TwoObject) => {
      const { leftUnitor } = kernel.unit;
      if (!leftUnitor) {
        throw new Error("missing left unitor component");
      }
      return leftUnitor.backward(object);
    };

    const manualLeft = (value: any): unknown => {
      const rightObject = value.witness.kernelRight;
      const idRight = TwoObjectCategory.id(rightObject);
      const transported = kernel.tensor.functor.onArrows({
        src: [TwoObjectCategory.src(value.witness.leftElement.arrow), TwoObjectCategory.src(idRight)] as const,
        dst: [TwoObjectCategory.dst(value.witness.leftElement.arrow), TwoObjectCategory.dst(idRight)] as const,
        cf: value.witness.leftElement.arrow,
        dg: idRight,
      });
      const throughTensor = TwoObjectCategory.compose(value.witness.kernelValue.arrow, transported);
      const composite = TwoObjectCategory.compose(throughTensor, leftUnitorBackward(rightObject));
      return functor.functor.functor.F1(composite).map(value.witness.rightElement);
    };

    leftCarrier.forEach((element) => {
      const viaTransformation = leftComponent.map(element);
      expect(viaTransformation).toBe(manualLeft(element));
    });

    const functorContravariant = oppositeFunctorToContravariant(TwoObjectCategory, functor.functor);
    const unit = dayUnit(kernel);
    const rightConvolution = dayTensor(kernel, functorContravariant, unit.functor);
    const rightComponent = rightUnitor.transformation.component("★");
    const rightCarrier = enumerate(rightConvolution.functor.functor.F0("★"));

    const rightUnitorBackward = (object: TwoObject) => {
      const { rightUnitor } = kernel.unit;
      if (!rightUnitor) {
        throw new Error("missing right unitor component");
      }
      return rightUnitor.backward(object);
    };

    const manualRight = (value: any): unknown => {
      const leftObject = value.witness.kernelLeft;
      const idLeft = TwoObjectCategory.id(leftObject);
      const transported = kernel.tensor.functor.onArrows({
        src: [TwoObjectCategory.src(idLeft), TwoObjectCategory.src(value.witness.rightElement.arrow)] as const,
        dst: [TwoObjectCategory.dst(idLeft), TwoObjectCategory.dst(value.witness.rightElement.arrow)] as const,
        cf: idLeft,
        dg: value.witness.rightElement.arrow,
      });
      const throughTensor = TwoObjectCategory.compose(value.witness.kernelValue.arrow, transported);
      const composite = TwoObjectCategory.compose(throughTensor, rightUnitorBackward(leftObject));
      return functor.functor.functor.F1(composite).map(value.witness.leftElement);
    };

    rightCarrier.forEach((element) => {
      const viaTransformation = rightComponent.map(element);
      expect(viaTransformation).toBe(manualRight(element));
    });
  });

  it("satisfies the triangle identity on representable functors", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const f = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const g = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "•");

    const contravF = oppositeFunctorToContravariant(TwoObjectCategory, f.functor);
    const unit = dayUnit(kernel);
    const unitContravariant = dayUnitContravariant(kernel);

    const fj = dayTensor(kernel, contravF, unit.functor);
    const fjContravariant = oppositeFunctorToContravariant(TwoObjectCategory, fj.functor);
    const source = dayTensor(kernel, fjContravariant, g.functor);

    const associator = dayConvolutionAssociator(kernel, f.functor, unit.functor, g.functor);
    const lambda = dayConvolutionLeftUnitor(kernel, g.functor);
    const rho = dayConvolutionRightUnitor(kernel, f.functor);

    const jg = dayTensor(kernel, unitContravariant, g.functor);
    const fJG = dayTensor(kernel, contravF, jg.functor);
    const fg = dayTensor(kernel, contravF, g.functor);

    const checkComponent = (object: TwoObject) => {
      const associatorComponent = associator.transformation.component(object);
      const idTensorLambda = mapDayConvolutionFiber(
        fJG,
        fg,
        object,
        (witness) => {
          const lambdaComponent = lambda.transformation.component(witness.kernelRight);
          return {
            leftElement: witness.leftElement,
            rightElement: lambdaComponent.map(witness.rightElement),
          };
        },
      );
      const rhoTensorId = mapDayConvolutionFiber(
        source,
        fg,
        object,
        (witness) => {
          const rhoComponent = rho.transformation.component(witness.kernelLeft);
          return {
            leftElement: rhoComponent.map(witness.leftElement),
            rightElement: witness.rightElement,
          };
        },
      );

      const domain = source.functor.functor.F0(object);
      const elements = enumerate(domain);
      elements.forEach((value) => {
        const viaAssociator = associatorComponent.map(value);
        const viaLeft = idTensorLambda.map(viaAssociator);
        const viaRight = rhoTensorId.map(value);
        expect(viaLeft.key).toBe(viaRight.key);
      });
    };

    TwoObjectCategory.objects.forEach(checkComponent);
  });

  it("builds the Day associator for representable functors", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const left = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const middle = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "•");
    const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "•");

    const associator = dayConvolutionAssociator(kernel, left.functor, middle.functor, right.functor);
    expect(associator.report.holds).toBe(true);

    const leftContravariant = oppositeFunctorToContravariant(TwoObjectCategory, left.functor);
    const middleContravariant = oppositeFunctorToContravariant(TwoObjectCategory, middle.functor);

    const fg = dayTensor(kernel, leftContravariant, middle.functor);
    const fgContravariant = oppositeFunctorToContravariant(TwoObjectCategory, fg.functor);
    const gh = dayTensor(kernel, middleContravariant, right.functor);
    const leftSide = dayTensor(kernel, fgContravariant, right.functor);
    const rightSide = dayTensor(kernel, leftContravariant, gh.functor);

    const component = associator.transformation.component("★");
    const domain = enumerate(leftSide.functor.functor.F0("★"));

    const associatorBackward = (a: TwoObject, b: TwoObject, c: TwoObject) => {
      const { associator } = kernel.tensor;
      if (!associator) {
        throw new Error("missing associator component");
      }
      return associator.backward([a, b, c]);
    };

    const classify = (fiber: (typeof rightSide.fibers)[number], witness: unknown) => {
      for (const candidate of fiber.classes) {
        const classified = fiber.classify(candidate.diagonalObject, witness as never);
        if (classified) {
          return classified;
        }
      }
      throw new Error("unable to classify witness");
    };

    domain.forEach((element) => {
      const image = component.map(element);
      const outer = element.witness.leftElement;
      const inner = outer.witness;
      const leftObject = inner.kernelLeft;
      const middleObject = inner.kernelRight;
      const rightObject = element.witness.kernelRight;
      const wObject = kernel.tensor.functor.onObjects([middleObject, rightObject]);

      const ghFiber = gh.fibers.find((entry) => Object.is(entry.output, wObject));
      if (!ghFiber) {
        throw new Error("missing (G ⋆ H) fiber");
      }

      const ghWitness = {
        kernelLeft: middleObject,
        kernelRight: rightObject,
        output: wObject,
        kernelValue: {
          arrow: TwoObjectCategory.id(wObject),
          domain: kernel.tensor.functor.onObjects([middleObject, rightObject]),
          codomain: wObject,
        },
        leftElement: inner.rightElement,
        rightElement: element.witness.rightElement,
      } as const;

      const ghClass = classify(ghFiber as (typeof rightSide.fibers)[number], ghWitness);

      const lifted = kernel.tensor.functor.onArrows({
        src: [
          TwoObjectCategory.src(inner.kernelValue.arrow),
          TwoObjectCategory.src(TwoObjectCategory.id(rightObject)),
        ] as const,
        dst: [
          TwoObjectCategory.dst(inner.kernelValue.arrow),
          TwoObjectCategory.dst(TwoObjectCategory.id(rightObject)),
        ] as const,
        cf: inner.kernelValue.arrow,
        dg: TwoObjectCategory.id(rightObject),
      });
      const throughTensor = TwoObjectCategory.compose(element.witness.kernelValue.arrow, lifted);
      const assocArrow = associatorBackward(leftObject, middleObject, rightObject);
      const finalArrow = TwoObjectCategory.compose(throughTensor, assocArrow);

      const targetFiber = rightSide.fibers.find((entry) => Object.is(entry.output, element.output));
      if (!targetFiber) {
        throw new Error("missing target fiber");
      }

      const expectedWitness = {
        kernelLeft: leftObject,
        kernelRight: wObject,
        output: element.output,
        kernelValue: {
          arrow: finalArrow,
          domain: kernel.tensor.functor.onObjects([leftObject, wObject]),
          codomain: element.output,
        },
        leftElement: inner.leftElement,
        rightElement: ghClass,
      } as const;

      const expectedClass = classify(targetFiber, expectedWitness);
      expect(image.key).toBe(expectedClass.key);
    });
  });
});
