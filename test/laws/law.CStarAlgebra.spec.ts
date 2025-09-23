import { describe, it, expect } from "vitest";
import {
  ComplexCStarAlgebra,
  checkCStarAxioms,
  checkCStarHomomorphism,
  checkCStarSpectralTheory,
  complex,
  checkComplexCStarAxioms,
  checkComplexIdentityHomomorphism,
  checkComplexSpectralTheory,
  imaginaryPartCStar,
  isNormal,
  isSelfAdjoint,
  realPartCStar,
  type ComplexNumber,
  type CStarAlgebra,
  type CStarHomomorphism,
} from "../../cstar-algebra";

const samples: ReadonlyArray<ComplexNumber> = [
  complex(0, 0),
  complex(1, 0),
  complex(0, 1),
  complex(-2, 3),
];

const scalars: ReadonlyArray<ComplexNumber> = [
  complex(1, 0),
  complex(0, 1),
  complex(2, -1),
];

describe("C*-algebra diagnostics", () => {
  it("verifies the complex numbers satisfy the C*-axioms", () => {
    const report = checkCStarAxioms(ComplexCStarAlgebra, samples, scalars);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
  });

  it("flags violations when the star operation is replaced by the identity", () => {
    const degenerate: CStarAlgebra<ComplexNumber> = {
      ...ComplexCStarAlgebra,
      star: (z) => z,
      positive: ComplexCStarAlgebra.positive,
    };
    const report = checkCStarAxioms(degenerate, samples, scalars);
    expect(report.holds).toBe(false);
    expect(report.failures.some((failure) => failure.axiom === "positivity")).toBe(true);
  });

  it("accepts the identity *-homomorphism on complex numbers", () => {
    const homReport = checkCStarHomomorphism(
      ComplexCStarAlgebra,
      ComplexCStarAlgebra,
      { map: (value) => value, label: "id" },
      samples,
      scalars,
    );
    expect(homReport.holds).toBe(true);
    expect(homReport.failures).toHaveLength(0);
  });

  it("detects a non *-preserving morphism", () => {
    const forgetImaginary: CStarHomomorphism<ComplexNumber, ComplexNumber> = {
      map: (value) => complex(value.re, 0),
      label: "forgetImaginary",
    };
    const report = checkCStarHomomorphism(
      ComplexCStarAlgebra,
      ComplexCStarAlgebra,
      forgetImaginary,
      samples,
      scalars,
    );
    expect(report.holds).toBe(false);
    expect(report.failures.some((failure) => failure.law === "scalar")).toBe(true);
  });

  it("analyzes spectral decomposition and self-adjoint parts", () => {
    const z = complex(2, -3);
    const real = realPartCStar(ComplexCStarAlgebra, z);
    const imag = imaginaryPartCStar(ComplexCStarAlgebra, z);
    expect(isSelfAdjoint(ComplexCStarAlgebra, real)).toBe(true);
    expect(isSelfAdjoint(ComplexCStarAlgebra, imag)).toBe(true);
    expect(isSelfAdjoint(ComplexCStarAlgebra, z)).toBe(false);
    expect(isNormal(ComplexCStarAlgebra, z)).toBe(true);
    const recomposed = ComplexCStarAlgebra.add(
      real,
      ComplexCStarAlgebra.scalar(complex(0, 1), imag),
    );
    expect(ComplexCStarAlgebra.equal(recomposed, z, 1e-9)).toBe(true);

    const spectral = checkCStarSpectralTheory(ComplexCStarAlgebra, samples);
    expect(spectral.holds).toBe(true);
    spectral.entries.forEach((entry) => {
      expect(entry.realSelfAdjoint).toBe(true);
      expect(entry.imaginarySelfAdjoint).toBe(true);
      expect(entry.decompositionValid).toBe(true);
    });
  });

  it("exposes the canned registry helpers", () => {
    const axioms = checkComplexCStarAxioms();
    const hom = checkComplexIdentityHomomorphism();
    const spectral = checkComplexSpectralTheory();
    expect(axioms.holds).toBe(true);
    expect(hom.holds).toBe(true);
    expect(spectral.holds).toBe(true);
  });
});
