import { RunnableExample } from "./types";

type Complex = { readonly re: number; readonly im: number };

type Check = { readonly label: string; readonly holds: boolean; readonly details: readonly string[] };

type HomomorphismResult = {
  readonly pair: readonly [Complex, Complex];
  readonly multiplicative: boolean;
  readonly starPreserving: boolean;
};

type SpectrumPoint = { readonly element: Complex; readonly spectrum: readonly Complex[] };

const tolerance = 1e-9;

const complex = (re: number, im: number = 0): Complex => ({ re, im });

function add(left: Complex, right: Complex): Complex {
  return complex(left.re + right.re, left.im + right.im);
}

function multiply(left: Complex, right: Complex): Complex {
  return complex(left.re * right.re - left.im * right.im, left.re * right.im + left.im * right.re);
}

function conjugate(value: Complex): Complex {
  return complex(value.re, -value.im);
}

function norm(value: Complex): number {
  return Math.hypot(value.re, value.im);
}

function approxEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= tolerance;
}

function approxEqualComplex(left: Complex, right: Complex): boolean {
  return approxEqual(left.re, right.re) && approxEqual(left.im, right.im);
}

function formatComplex(value: Complex): string {
  const sign = value.im < 0 ? "-" : "+";
  const imaginary = Math.abs(value.im).toFixed(3);
  return `${value.re.toFixed(3)} ${sign} ${imaginary}i`;
}

function checkStarInvolution(elements: readonly Complex[]): Check {
  const failures = elements
    .filter((element) => !approxEqualComplex(conjugate(conjugate(element)), element))
    .map((element) => `  • star(star(${formatComplex(element)})) ≠ ${formatComplex(element)}`);
  const holds = failures.length === 0;
  return {
    label: "Star is an involution",
    holds,
    details: holds ? [] : failures,
  };
}

function checkAdditivity(elements: readonly Complex[]): Check {
  const failures: string[] = [];
  elements.forEach((left) => {
    elements.forEach((right) => {
      const lhs = conjugate(add(left, right));
      const rhs = add(conjugate(left), conjugate(right));
      if (!approxEqualComplex(lhs, rhs)) {
        failures.push(
          `  • star(${formatComplex(left)} + ${formatComplex(right)}) mismatched conjugate sum`,
        );
      }
    });
  });
  return {
    label: "Star distributes over addition",
    holds: failures.length === 0,
    details: failures,
  };
}

function checkMultiplicativity(elements: readonly Complex[]): Check {
  const failures: string[] = [];
  elements.forEach((left) => {
    elements.forEach((right) => {
      const lhs = conjugate(multiply(left, right));
      const rhs = multiply(conjugate(right), conjugate(left));
      if (!approxEqualComplex(lhs, rhs)) {
        failures.push(
          `  • star(${formatComplex(left)}·${formatComplex(right)}) mismatched reversed conjugates`,
        );
      }
    });
  });
  return {
    label: "Star reverses multiplication",
    holds: failures.length === 0,
    details: failures,
  };
}

function checkCStarIdentity(elements: readonly Complex[]): Check {
  const failures = elements
    .filter((element) => !approxEqual(norm(multiply(element, conjugate(element))), norm(element) ** 2))
    .map(
      (element) =>
        `  • ‖${formatComplex(element)}·${formatComplex(conjugate(element))}‖ ≠ ‖${formatComplex(element)}‖²`,
    );
  return {
    label: "C*-identity holds",
    holds: failures.length === 0,
    details: failures,
  };
}

function phi(value: Complex): Complex {
  // Conjugation is a *-automorphism of ℂ considered as a C*-algebra.
  return conjugate(value);
}

function checkHomomorphism(elements: readonly Complex[]): readonly HomomorphismResult[] {
  const pairs: HomomorphismResult[] = [];
  elements.forEach((left) => {
    elements.forEach((right) => {
      const multiplicative = approxEqualComplex(phi(multiply(left, right)), multiply(phi(left), phi(right)));
      const starPreserving = approxEqualComplex(phi(conjugate(left)), conjugate(phi(left)));
      pairs.push({ pair: [left, right], multiplicative, starPreserving });
    });
  });
  return pairs;
}

function spectrum(value: Complex): SpectrumPoint {
  // For ℂ, the spectrum of an element is the singleton {value}.
  return { element: value, spectrum: [value] };
}

function runCAlgebraWitnessAndSpectralDiagnostics() {
  const sampleElements: ReadonlyArray<Complex> = [complex(2), complex(-1, 1), complex(0, -2), complex(3, 0.5)];

  const checks: ReadonlyArray<Check> = [
    checkStarInvolution(sampleElements),
    checkAdditivity(sampleElements),
    checkMultiplicativity(sampleElements),
    checkCStarIdentity(sampleElements),
  ];

  const homomorphismPairs = checkHomomorphism(sampleElements);
  const failingHomomorphisms = homomorphismPairs.filter((result) => !result.multiplicative || !result.starPreserving);

  const spectralData = sampleElements.map(spectrum);

  const checkSection = checks.flatMap((check) => {
    const header = `${check.holds ? "✔" : "✘"} ${check.label}`;
    return check.details.length === 0 ? [header] : [header, ...check.details];
  });

  const homomorphismSection = failingHomomorphisms.length === 0
    ? ["✔ Conjugation preserves multiplication and the star operation across sampled pairs."]
    : failingHomomorphisms.map((result) => {
        const [left, right] = result.pair;
        const reasons: string[] = [];
        if (!result.multiplicative) {
          reasons.push("multiplicativity");
        }
        if (!result.starPreserving) {
          reasons.push("*-compatibility");
        }
        return `✘ φ(${formatComplex(left)}, ${formatComplex(right)}) failed ${reasons.join(" and ")}`;
      });

  const spectralSection = spectralData.map((entry) => {
    const values = entry.spectrum.map((point) => formatComplex(point)).join(", ");
    return `σ(${formatComplex(entry.element)}) = { ${values} }`;
  });

  const logs = [
    "== C*-algebra axioms for ℂ ==",
    ...checkSection,
    "",
    "== Conjugation as a *-homomorphism ==",
    ...homomorphismSection,
    "",
    "== Spectral diagnostics ==",
    ...spectralSection,
  ];

  return { logs };
}

export const stage038CAlgebraWitnessAndSpectralDiagnostics: RunnableExample = {
  id: "038",
  title: "C*-algebra witness and spectral diagnostics",
  outlineReference: 38,
  summary:
    "Checks the C*-algebra axioms for complex numbers, verifies complex conjugation as a *-homomorphism, and reports singleton spectra.",
  async run() {
    return runCAlgebraWitnessAndSpectralDiagnostics();
  },
};
