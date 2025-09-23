// \ud83d\udd2e BEGIN_MATH: CStarAlgebra
// \ud83d\udcdd Brief: Provide C*-algebra interfaces, complex-number instance, and executable oracles.
// \ud83c\udfd7\ufe0f Domain: Functional analysis / operator algebras
// \ud83d\udd17 Integration: Supplies reusable C*-algebra witnesses and morphism checks for the algebra registry
// \ud83d\udccb Plan:
//   1. Model complex numbers and general C*-algebra operations with tolerance-aware equality.
//   2. Implement oracle helpers validating the C*-axioms and *-homomorphism behaviour.
//   3. Package the canonical complex-number C*-algebra together with default diagnostics.

export interface ComplexNumber {
  readonly re: number;
  readonly im: number;
}

export const complex = (re: number, im = 0): ComplexNumber => ({ re, im });

const HALF = complex(0.5, 0);
const NEG_HALF_I = complex(0, -0.5);
const I = complex(0, 1);

export const addComplex = (a: ComplexNumber, b: ComplexNumber): ComplexNumber =>
  complex(a.re + b.re, a.im + b.im);

export const negComplex = (a: ComplexNumber): ComplexNumber => complex(-a.re, -a.im);

export const mulComplex = (a: ComplexNumber, b: ComplexNumber): ComplexNumber =>
  complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

export const conjComplex = (a: ComplexNumber): ComplexNumber => complex(a.re, -a.im);

export const absComplex = (a: ComplexNumber): number => Math.hypot(a.re, a.im);

export const eqComplex = (a: ComplexNumber, b: ComplexNumber, tolerance = 1e-9): boolean =>
  Math.abs(a.re - b.re) <= tolerance && Math.abs(a.im - b.im) <= tolerance;

export const realPartCStar = <A>(algebra: CStarAlgebra<A>, x: A): A =>
  algebra.scalar(HALF, algebra.add(x, algebra.star(x)));

export const imaginaryPartCStar = <A>(algebra: CStarAlgebra<A>, x: A): A =>
  algebra.scalar(NEG_HALF_I, algebra.add(x, algebra.neg(algebra.star(x))));

export const isSelfAdjoint = <A>(algebra: CStarAlgebra<A>, x: A, tolerance = 1e-9): boolean =>
  algebra.equal(x, algebra.star(x), tolerance);

export const isNormal = <A>(algebra: CStarAlgebra<A>, x: A, tolerance = 1e-9): boolean => {
  const star = algebra.star(x);
  return algebra.equal(algebra.mul(x, star), algebra.mul(star, x), tolerance);
};

export interface CStarAlgebra<A> {
  readonly add: (a: A, b: A) => A;
  readonly zero: A;
  readonly neg: (a: A) => A;
  readonly mul: (a: A, b: A) => A;
  readonly one: A;
  readonly scalar: (scalar: ComplexNumber, a: A) => A;
  readonly star: (a: A) => A;
  readonly norm: (a: A) => number;
  readonly equal: (a: A, b: A, tolerance?: number) => boolean;
  readonly positive: (a: A, tolerance?: number) => boolean;
  readonly describe?: (a: A) => string;
}

export interface CStarAxiomFailure<A> {
  readonly axiom:
    | "involution"
    | "additivity"
    | "multiplicativity"
    | "scalarCompatibility"
    | "norm"
    | "positivity";
  readonly elements: ReadonlyArray<A>;
  readonly scalar?: ComplexNumber;
  readonly discrepancy?: number;
  readonly message: string;
}

export interface CStarAxiomReport<A> {
  readonly holds: boolean;
  readonly tolerance: number;
  readonly failures: ReadonlyArray<CStarAxiomFailure<A>>;
}

const defaultDescribe = <A>(algebra: CStarAlgebra<A>, value: A): string =>
  algebra.describe ? algebra.describe(value) : `${value}`;

export function checkCStarAxioms<A>(
  algebra: CStarAlgebra<A>,
  elements: ReadonlyArray<A>,
  scalars: ReadonlyArray<ComplexNumber>,
  tolerance = 1e-9,
): CStarAxiomReport<A> {
  const failures: Array<CStarAxiomFailure<A>> = [];
  const eq = (x: A, y: A) => algebra.equal(x, y, tolerance);

  for (const x of elements) {
    const starStar = algebra.star(algebra.star(x));
    if (!eq(starStar, x)) {
      failures.push({
        axiom: "involution",
        elements: [x],
        message: `Star is not involutive on ${defaultDescribe(algebra, x)}.`,
      });
    }
  }

  for (const x of elements) {
    for (const y of elements) {
      const starSum = algebra.star(algebra.add(x, y));
      const sumStar = algebra.add(algebra.star(x), algebra.star(y));
      if (!eq(starSum, sumStar)) {
        failures.push({
          axiom: "additivity",
          elements: [x, y],
          message: `Star failed additivity on ${defaultDescribe(algebra, x)} and ${defaultDescribe(algebra, y)}.`,
        });
      }

      const starProduct = algebra.star(algebra.mul(x, y));
      const productStar = algebra.mul(algebra.star(y), algebra.star(x));
      if (!eq(starProduct, productStar)) {
        failures.push({
          axiom: "multiplicativity",
          elements: [x, y],
          message: `Star failed multiplicativity on ${defaultDescribe(algebra, x)} and ${defaultDescribe(algebra, y)}.`,
        });
      }
    }
  }

  for (const lambda of scalars) {
    for (const x of elements) {
      const mapped = algebra.star(algebra.scalar(lambda, x));
      const expected = algebra.scalar(conjComplex(lambda), algebra.star(x));
      if (!eq(mapped, expected)) {
        failures.push({
          axiom: "scalarCompatibility",
          elements: [x],
          scalar: lambda,
          message: `Star failed scalar compatibility on ${defaultDescribe(algebra, x)} with scalar (${lambda.re} + ${lambda.im}i).`,
        });
      }
    }
  }

  for (const x of elements) {
    const lhs = algebra.norm(algebra.mul(algebra.star(x), x));
    const rhs = Math.pow(algebra.norm(x), 2);
    if (Math.abs(lhs - rhs) > tolerance) {
      failures.push({
        axiom: "norm",
        elements: [x],
        discrepancy: Math.abs(lhs - rhs),
        message: `C*-identity failed on ${defaultDescribe(algebra, x)}: ||x* x|| = ${lhs}, ||x||^2 = ${rhs}.`,
      });
    }

    const positiveCandidate = algebra.mul(algebra.star(x), x);
    if (!algebra.positive(positiveCandidate, tolerance)) {
      failures.push({
        axiom: "positivity",
        elements: [x],
        message: `x* x was not positive for ${defaultDescribe(algebra, x)}.`,
      });
    }
  }

  return { holds: failures.length === 0, tolerance, failures };
}

export interface CStarHomomorphism<A, B> {
  readonly map: (value: A) => B;
  readonly label?: string;
}

export interface CStarHomomorphismFailure<A> {
  readonly law:
    | "additive"
    | "multiplicative"
    | "scalar"
    | "star"
    | "unit"
    | "zero"
    | "norm";
  readonly elements: ReadonlyArray<A>;
  readonly scalar?: ComplexNumber;
  readonly discrepancy?: number;
  readonly message: string;
}

export interface CStarHomomorphismReport<A> {
  readonly holds: boolean;
  readonly tolerance: number;
  readonly failures: ReadonlyArray<CStarHomomorphismFailure<A>>;
}

export interface CStarSpectralEntry<A> {
  readonly element: A;
  readonly selfAdjoint: boolean;
  readonly normal: boolean;
  readonly realPart: A;
  readonly imaginaryPart: A;
  readonly realSelfAdjoint: boolean;
  readonly imaginarySelfAdjoint: boolean;
  readonly decompositionValid: boolean;
  readonly discrepancy: number;
}

export interface CStarSpectralReport<A> {
  readonly holds: boolean;
  readonly tolerance: number;
  readonly entries: ReadonlyArray<CStarSpectralEntry<A>>;
}

export function checkCStarHomomorphism<A, B>(
  source: CStarAlgebra<A>,
  target: CStarAlgebra<B>,
  hom: CStarHomomorphism<A, B>,
  elements: ReadonlyArray<A>,
  scalars: ReadonlyArray<ComplexNumber>,
  tolerance = 1e-9,
): CStarHomomorphismReport<A> {
  const failures: Array<CStarHomomorphismFailure<A>> = [];
  const label = hom.label ?? "homomorphism";
  const eqTarget = (x: B, y: B) => target.equal(x, y, tolerance);

  if (!eqTarget(hom.map(source.zero), target.zero)) {
    failures.push({
      law: "zero",
      elements: [],
      message: `${label} failed to preserve zero.`,
    });
  }

  if (!eqTarget(hom.map(source.one), target.one)) {
    failures.push({
      law: "unit",
      elements: [],
      message: `${label} failed to preserve the unit.`,
    });
  }

  for (const x of elements) {
    if (!eqTarget(hom.map(source.star(x)), target.star(hom.map(x)))) {
      failures.push({
        law: "star",
        elements: [x],
        message: `${label} does not preserve star on ${defaultDescribe(source, x)}.`,
      });
    }
  }

  for (const x of elements) {
    for (const y of elements) {
      const mapped = hom.map(source.add(x, y));
      const expected = target.add(hom.map(x), hom.map(y));
      if (!eqTarget(mapped, expected)) {
        failures.push({
          law: "additive",
          elements: [x, y],
          message: `${label} failed additivity on ${defaultDescribe(source, x)} and ${defaultDescribe(source, y)}.`,
        });
      }

      const mappedProduct = hom.map(source.mul(x, y));
      const expectedProduct = target.mul(hom.map(x), hom.map(y));
      if (!eqTarget(mappedProduct, expectedProduct)) {
        failures.push({
          law: "multiplicative",
          elements: [x, y],
          message: `${label} failed multiplicativity on ${defaultDescribe(source, x)} and ${defaultDescribe(source, y)}.`,
        });
      }
    }
  }

  for (const lambda of scalars) {
    for (const x of elements) {
      const mapped = hom.map(source.scalar(lambda, x));
      const expected = target.scalar(lambda, hom.map(x));
      if (!eqTarget(mapped, expected)) {
        failures.push({
          law: "scalar",
          elements: [x],
          scalar: lambda,
          message: `${label} failed scalar compatibility on ${defaultDescribe(source, x)} with scalar (${lambda.re} + ${lambda.im}i).`,
        });
      }
    }
  }

  for (const x of elements) {
    const mappedNorm = target.norm(hom.map(x));
    const sourceNorm = source.norm(x);
    if (mappedNorm - sourceNorm > tolerance) {
      failures.push({
        law: "norm",
        elements: [x],
        discrepancy: mappedNorm - sourceNorm,
        message: `${label} was not contractive on ${defaultDescribe(source, x)}.`,
      });
    }
  }

  return { holds: failures.length === 0, tolerance, failures };
}

export function checkCStarSpectralTheory<A>(
  algebra: CStarAlgebra<A>,
  elements: ReadonlyArray<A>,
  tolerance = 1e-9,
): CStarSpectralReport<A> {
  const entries = elements.map((element) => {
    const selfAdjoint = isSelfAdjoint(algebra, element, tolerance);
    const normal = isNormal(algebra, element, tolerance);
    const realPart = realPartCStar(algebra, element);
    const imaginaryPart = imaginaryPartCStar(algebra, element);
    const realSelfAdjoint = isSelfAdjoint(algebra, realPart, tolerance);
    const imaginarySelfAdjoint = isSelfAdjoint(algebra, imaginaryPart, tolerance);
    const recomposed = algebra.add(realPart, algebra.scalar(I, imaginaryPart));
    const discrepancyElement = algebra.add(recomposed, algebra.neg(element));
    const discrepancy = algebra.norm(discrepancyElement);
    const decompositionValid = discrepancy <= tolerance;
    const entry: CStarSpectralEntry<A> = {
      element,
      selfAdjoint,
      normal,
      realPart,
      imaginaryPart,
      realSelfAdjoint,
      imaginarySelfAdjoint,
      decompositionValid,
      discrepancy,
    };
    return entry;
  });

  const holds = entries.every(
    (entry) => entry.realSelfAdjoint && entry.imaginarySelfAdjoint && entry.decompositionValid,
  );

  return { holds, tolerance, entries };
}

const describeComplex = (value: ComplexNumber): string =>
  `${value.re}${value.im >= 0 ? "+" : ""}${value.im}i`;

export const ComplexCStarAlgebra: CStarAlgebra<ComplexNumber> = {
  add: addComplex,
  zero: complex(0, 0),
  neg: negComplex,
  mul: mulComplex,
  one: complex(1, 0),
  scalar: mulComplex,
  star: conjComplex,
  norm: absComplex,
  equal: (a, b, tolerance = 1e-9) => eqComplex(a, b, tolerance),
  positive: (a, tolerance = 1e-9) => Math.abs(a.im) <= tolerance && a.re >= -tolerance,
  describe: describeComplex,
};

const defaultComplexSamples: ReadonlyArray<ComplexNumber> = [
  complex(0, 0),
  complex(1, 0),
  complex(0, 1),
  complex(-2, 3),
];

const defaultScalars: ReadonlyArray<ComplexNumber> = [
  complex(1, 0),
  complex(0, 1),
  complex(2, -1),
];

export const identityComplexHom: CStarHomomorphism<ComplexNumber, ComplexNumber> = {
  map: (value) => value,
  label: "id_ℂ",
};

export const checkComplexCStarAxioms = (
  samples: ReadonlyArray<ComplexNumber> = defaultComplexSamples,
  scalars: ReadonlyArray<ComplexNumber> = defaultScalars,
  tolerance = 1e-9,
): CStarAxiomReport<ComplexNumber> =>
  checkCStarAxioms(ComplexCStarAlgebra, samples, scalars, tolerance);

export const checkComplexIdentityHomomorphism = (
  samples: ReadonlyArray<ComplexNumber> = defaultComplexSamples,
  scalars: ReadonlyArray<ComplexNumber> = defaultScalars,
  tolerance = 1e-9,
): CStarHomomorphismReport<ComplexNumber> =>
  checkCStarHomomorphism(
    ComplexCStarAlgebra,
    ComplexCStarAlgebra,
    identityComplexHom,
    samples,
    scalars,
    tolerance,
  );

export const checkComplexSpectralTheory = (
  samples: ReadonlyArray<ComplexNumber> = defaultComplexSamples,
  tolerance = 1e-9,
): CStarSpectralReport<ComplexNumber> => checkCStarSpectralTheory(ComplexCStarAlgebra, samples, tolerance);

// \u2705 END_MATH: CStarAlgebra
// \ud83d\udd2e Oracles: checkCStarAxioms, checkCStarHomomorphism, checkComplexCStarAxioms, checkComplexIdentityHomomorphism, checkCStarSpectralTheory, checkComplexSpectralTheory
// \ud83d\udcdc Laws: C*-algebra axioms for complex numbers, *-homomorphism contractivity, and spectral-theory decomposition
// \ud83d\udcc8 Tests: law.CStarAlgebra.spec.ts exercising axioms, homomorphism diagnostics, and spectral decomposition
