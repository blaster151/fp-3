import { describe, expect, it } from "vitest";
import {
  attachFactorizationSystemProperties,
  buildFinGrpImageKernelFactorization,
  buildFinSetRegularFactorization,
  buildSetSurjectionInjectionFactorization,
  type FactorizationSystemWitness,
  type OrthogonalityWitness,
} from "../factorization-system";
import { setSimpleCategory } from "../set-simple-category";
import { SetCat } from "../set-cat";
import type { SetHom, SetObj } from "../set-cat";
import { constructFunctorWithWitness } from "../functor";

const evaluateSetArrow = <A, B>(arrow: SetHom<A, B>, value: A): B => arrow.map(value);

describe("Set surjection/injection factorization", () => {
  const witness = buildSetSurjectionInjectionFactorization();

  it("confirms the factorization system report succeeds", () => {
    expect(witness.report.holds).toBe(true);
    expect(witness.report.factorization.holds).toBe(true);
    expect(witness.report.leftClosure.holds).toBe(true);
    expect(witness.report.rightClosure.holds).toBe(true);
    expect(witness.report.orthogonality.every((outcome) => outcome.holds)).toBe(true);
  });

  it("factors the sample constant map through image inclusion", () => {
    const constant = witness.samples.arrows.find((arrow) =>
      Array.from(arrow.dom).length === 2 && Array.from(arrow.cod).length === 1,
    );
    if (!constant) throw new Error("missing constant arrow sample");
    const factor = witness.factor(constant);
    expect(factor.left.cod.size).toBe(1);
    const [domainElement] = Array.from(constant.dom);
    expect(evaluateSetArrow(factor.left, domainElement)).toBe(evaluateSetArrow(constant, domainElement));
    const composite = setSimpleCategory.compose(factor.right, factor.left);
    expect(setSimpleCategory.eq(composite, constant)).toBe(true);
  });

  it("rejects non-commuting squares in orthogonality checks", () => {
    const [firstWitness] = witness.orthogonality;
    if (!firstWitness) throw new Error("expected at least one orthogonality witness");
    const square = firstWitness.squareSamples?.[0];
    if (!square) throw new Error("expected square sample");
    const [firstValue, secondValue = firstValue] = Array.from(square.bottom.dom);
    const sabotagedBottom = SetCat.hom(square.bottom.dom, square.bottom.cod, (value) =>
      value === firstValue
        ? square.bottom.map(value)
        : square.bottom.map(firstValue === value ? secondValue : firstValue),
    );
    const result = firstWitness.hasLifting({ top: square.top, bottom: sabotagedBottom });
    expect(result.holds).toBe(false);
  });
});

describe("FinSet regular epi–mono factorization", () => {
  const witness = buildFinSetRegularFactorization();

  it("reports success", () => {
    expect(witness.report.holds).toBe(true);
    expect(witness.report.factorization.holds).toBe(true);
  });

  it("recovers the original arrow from the factorization", () => {
    const [arrow] = witness.samples.arrows;
    if (!arrow) throw new Error("expected at least one FinSet arrow sample");
    const factor = witness.factor(arrow);
    const recomposed = witness.category.compose(factor.right, factor.left);
    const equality = (witness.category as {
      eq?: (left: typeof recomposed, right: typeof recomposed) => boolean;
    }).eq;
    if (!equality) {
      throw new Error("expected equality comparison for FinSet arrows");
    }
    expect(equality(recomposed, arrow)).toBe(true);
  });

  it("flags arrows outside the surjection class", () => {
    const nonsurjection = witness.samples.arrows.find(
      (candidate) => !witness.leftClass.membership(candidate),
    );
    if (!nonsurjection) throw new Error("expected a non-surjection sample");
    expect(witness.leftClass.membership(nonsurjection)).toBe(false);
  });
});

describe("Finite group image–kernel factorization", () => {
  const witness = buildFinGrpImageKernelFactorization();

  it("verifies the factorization system report", () => {
    expect(witness.report.holds).toBe(true);
    expect(witness.report.factorization.holds).toBe(true);
  });

  it("factors the mod2 homomorphism through its image", () => {
    const mod2 = witness.samples.arrows.find((arrow) => arrow.name === "mod₂");
    if (!mod2) throw new Error("missing mod₂ arrow");
    const factor = witness.factor(mod2);
    expect(factor.middle.name).toContain("Im(mod₂)");
    const zeroImage = factor.left.map("0");
    const oneImage = factor.left.map("1");
    expect(zeroImage).toBe("0");
    expect(oneImage).toBe("1");
    const recomposed = witness.category.compose(factor.right, factor.left);
    const equality = (witness.category as {
      eq?: (left: typeof recomposed, right: typeof recomposed) => boolean;
    }).eq;
    if (!equality) {
      throw new Error("expected equality comparison for finite group arrows");
    }
    expect(equality(recomposed, mod2)).toBe(true);
  });

  it("detects orthogonality failures when the square is sabotaged", () => {
    const [firstWitness] = witness.orthogonality as readonly OrthogonalityWitness<unknown, any>[];
    if (!firstWitness) throw new Error("expected orthogonality witness");
    const square = firstWitness.squareSamples?.[0];
    if (!square) throw new Error("expected square sample");
    const sabotagedTop = {
      ...square.top,
      map: (value: string) => square.top.map(value === "0" ? "1" : value),
    };
    const result = firstWitness.hasLifting({ top: sabotagedTop, bottom: square.bottom });
    expect(result.holds).toBe(false);
  });
});

describe("Factorization functor integration", () => {
  const system = buildSetSurjectionInjectionFactorization();

  const buildIdentityFunctor = () =>
    constructFunctorWithWitness(
      setSimpleCategory,
      setSimpleCategory,
      {
        F0: (object: SetObj<unknown>) => object,
        F1: (arrow: SetHom<unknown, unknown>) => arrow,
      },
      { arrows: system.samples.arrows },
    );

  it("attaches left/right class analyses", () => {
    const base = buildIdentityFunctor();
    const { functor: enriched, analysis } = attachFactorizationSystemProperties({
      functor: base,
      sourceSystem: system,
      targetSystem: system,
    });

    expect(analysis.left?.analysis.holds).toBe(true);
    expect(analysis.right?.analysis.holds).toBe(true);
    const baseCount = base.properties?.length ?? 0;
    const enrichedCount = enriched.properties?.length ?? 0;
    expect(enrichedCount).toBeGreaterThan(baseCount);
    expect(analysis.details.some((line) => line.includes("Left class"))).toBe(true);
  });

  it("detects reflection failures when the target class is too large", () => {
    const sloppy: FactorizationSystemWitness<SetObj<unknown>, SetHom<unknown, unknown>> = {
      ...system,
      leftClass: {
        ...system.leftClass,
        membership: () => true,
      },
    };

    const base = buildIdentityFunctor();
    const { functor: enriched, analysis } = attachFactorizationSystemProperties({
      functor: base,
      sourceSystem: system,
      targetSystem: sloppy,
      left: { mode: "reflects", property: "factorization:left:surjection-reflection" },
      right: false,
    });

    expect(analysis.left?.analysis.holds).toBe(false);
    expect(analysis.left?.analysis.reflectionFailures.length).toBeGreaterThan(0);
    const failure = enriched.properties?.find(
      (property) => property.property === "factorization:left:surjection-reflection",
    );
    expect(failure?.holds).toBe(false);
  });
});
