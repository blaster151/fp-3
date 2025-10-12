// 🔮 BEGIN_MATH: MarkovConditionalIndependence
// 📝 Brief: Package conditional-independence witnesses and factorization oracles.
// 🏗️ Domain: Finite Markov categories with explicit copy/discard structure.
// 🔗 Integration: Builds on comonoid witnesses and Markov kernels to expose executable conditional-independence checks.
// 📋 Plan:
//   1. Package conditional-independence witnesses that record domain/output comonoids, codomain projections, and the kernel p.
//   2. Provide helpers extracting conditional marginals, reconstructing the factorized kernel, and permuting tensor factors.
//   3. Implement an oracle report that certifies conditional independence and optional permutation invariants with diagnostic failures.

import type { Fin, Kernel } from "./markov-category";
import { FinMarkov, tensorObj, pair, deterministic, approxEqualMatrix } from "./markov-category";
import type { MarkovComonoidWitness } from "./markov-comonoid-structure";

export interface MarkovConditionalWitnessOptions {
  readonly label?: string;
  readonly projections?: ReadonlyArray<FinMarkov<unknown, unknown>>;
}

export interface MarkovConditionalWitness<A> {
  readonly domain: MarkovComonoidWitness<A>;
  readonly outputs: ReadonlyArray<MarkovComonoidWitness<unknown>>;
  readonly arrow: FinMarkov<A, unknown>;
  readonly projections: ReadonlyArray<FinMarkov<unknown, unknown>>;
  readonly label?: string;
  readonly arity: number;
}

export interface ConditionalPermutationReport {
  readonly permutation: ReadonlyArray<number>;
  readonly holds: boolean;
  readonly details: string;
}

export type ConditionalFailureLaw =
  | "arity"
  | "projection"
  | "factorization"
  | "permutation"
  | "cardinality";

export interface ConditionalFailure {
  readonly law: ConditionalFailureLaw;
  readonly message: string;
  readonly permutation?: ReadonlyArray<number>;
}

export interface MarkovConditionalReport<A> {
  readonly witness: MarkovConditionalWitness<A>;
  readonly components: ReadonlyArray<FinMarkov<A, unknown>>;
  readonly factorized: FinMarkov<A, unknown>;
  readonly holds: boolean;
  readonly equality: boolean;
  readonly permutations: ReadonlyArray<ConditionalPermutationReport>;
  readonly failures: ReadonlyArray<ConditionalFailure>;
  readonly details: string;
}

function productCardinality(outputs: ReadonlyArray<MarkovComonoidWitness<unknown>>): number {
  return outputs.reduce((acc, witness) => acc * witness.object.elems.length, 1);
}

function flattenProduct(value: unknown, arity: number): unknown[] {
  if (arity <= 0) return [];
  if (arity === 1) return [value];
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("Expected a left-associated tensor Pair during flattening.");
  }
  const [prefix, last] = value as readonly [unknown, unknown];
  const head = flattenProduct(prefix, arity - 1);
  head.push(last);
  return head;
}

function rebuildProduct(values: ReadonlyArray<unknown>): unknown {
  if (values.length === 0) {
    throw new Error("Cannot rebuild a tensor product with zero factors.");
  }
  let acc: unknown = values[0];
  for (let i = 1; i < values.length; i++) {
    acc = [acc, values[i]] as const;
  }
  return acc;
}

function extractCoordinate(value: unknown, index: number, arity: number): unknown {
  const flat = flattenProduct(value, arity);
  if (index < 0 || index >= flat.length) {
    throw new Error(`Coordinate index ${index} is outside the tensor arity ${arity}.`);
  }
  return flat[index];
}

function validatePermutation(permutation: ReadonlyArray<number>, arity: number): void {
  if (permutation.length !== arity) {
    throw new Error(`Permutation length ${permutation.length} does not match arity ${arity}.`);
  }
  const seen = new Set<number>();
  for (const idx of permutation) {
    if (!Number.isInteger(idx)) throw new Error("Permutation entries must be integers.");
    if (idx < 0 || idx >= arity) throw new Error(`Permutation index ${idx} is outside [0, ${arity}).`);
    if (seen.has(idx)) throw new Error("Permutation repeats an index, violating bijectivity.");
    seen.add(idx);
  }
}

function buildProjection(
  codomain: Fin<unknown>,
  target: Fin<unknown>,
  arity: number,
  index: number,
): FinMarkov<unknown, unknown> {
  const proj = deterministic((value: unknown) => extractCoordinate(value, index, arity));
  return new FinMarkov(codomain, target, proj);
}

function inferDefaultProjections(
  codomain: Fin<unknown>,
  outputs: ReadonlyArray<MarkovComonoidWitness<unknown>>,
): ReadonlyArray<FinMarkov<unknown, unknown>> {
  if (outputs.length === 0) {
    throw new Error("Cannot infer projections without at least one output object.");
  }
  // Attempt to flatten each element to ensure the representation matches nested Pairs.
  const arity = outputs.length;
  if (codomain.elems.length > 0) {
    for (const elem of codomain.elems) {
      flattenProduct(elem, arity);
    }
  }
  return outputs.map((output, index) => buildProjection(codomain, output.object, arity, index));
}

export function buildMarkovConditionalWitness<A>(
  domain: MarkovComonoidWitness<A>,
  outputs: ReadonlyArray<MarkovComonoidWitness<unknown>>,
  arrow: FinMarkov<A, unknown>,
  options: MarkovConditionalWitnessOptions = {},
): MarkovConditionalWitness<A> {
  if (arrow.X !== domain.object) {
    throw new Error("Conditional witness domain mismatch between comonoid and arrow.");
  }
  if (outputs.length === 0) {
    throw new Error("Conditional independence requires at least one output object.");
  }
  const projections = options.projections ?? inferDefaultProjections(arrow.Y, outputs);
  if (projections.length !== outputs.length) {
    throw new Error("Number of projections must match number of outputs.");
  }
  projections.forEach((projection, index) => {
    const witness = outputs[index];
    if (projection.X !== arrow.Y) {
      throw new Error(`Projection ${index} does not consume the conditional kernel codomain.`);
    }
    if (projection.Y !== witness.object) {
      throw new Error(`Projection ${index} does not target the expected output object.`);
    }
  });

  return {
    domain,
    outputs,
    arrow,
    projections,
    ...(options.label !== undefined ? { label: options.label } : {}),
    arity: outputs.length,
  };
}

export function conditionalMarginals<A>(
  witness: MarkovConditionalWitness<A>,
): ReadonlyArray<FinMarkov<A, unknown>> {
  return witness.projections.map((projection) => witness.arrow.then(projection));
}

export function factorizeConditional<A>(witness: MarkovConditionalWitness<A>): FinMarkov<A, unknown> {
  const components = conditionalMarginals(witness);
  if (components.length === 0) {
    throw new Error("Cannot factorize a conditional witness without components.");
  }
  let kernel: Kernel<A, unknown> = components[0].k;
  let codomain: Fin<unknown> = components[0].Y;
  for (let i = 1; i < components.length; i++) {
    kernel = pair(kernel, components[i].k);
    codomain = tensorObj(codomain, components[i].Y);
  }
  if (codomain.elems.length !== witness.arrow.Y.elems.length) {
    throw new Error(
      `Factorized codomain cardinality ${codomain.elems.length} differs from kernel codomain ${witness.arrow.Y.elems.length}.`,
    );
  }
  return new FinMarkov(witness.domain.object, witness.arrow.Y, kernel);
}

function permutationKernel(
  codomain: Fin<unknown>,
  arity: number,
  permutation: ReadonlyArray<number>,
): FinMarkov<unknown, unknown> {
  validatePermutation(permutation, arity);
  const action = deterministic((value: unknown) => {
    const flat = flattenProduct(value, arity);
    const permuted = permutation.map((idx) => flat[idx]);
    return rebuildProduct(permuted);
  });
  return new FinMarkov(codomain, codomain, action);
}

export interface ConditionalIndependenceOptions {
  readonly permutations?: ReadonlyArray<ReadonlyArray<number>>;
}

export function checkConditionalIndependence<A>(
  witness: MarkovConditionalWitness<A>,
  options: ConditionalIndependenceOptions = {},
): MarkovConditionalReport<A> {
  const failures: ConditionalFailure[] = [];
  const cardinality = productCardinality(witness.outputs);
  if (cardinality !== witness.arrow.Y.elems.length) {
    failures.push({
      law: "cardinality",
      message: `Codomain cardinality ${witness.arrow.Y.elems.length} mismatches product size ${cardinality}.`,
    });
  }

  let factorized: FinMarkov<A, unknown>;
  const components = conditionalMarginals(witness);
  try {
    factorized = factorizeConditional(witness);
  } catch (error) {
    failures.push({ law: "factorization", message: (error as Error).message });
    // Fall back to an identity arrow to keep the report structurally consistent.
    factorized = witness.arrow;
  }

  const equality = approxEqualMatrix(witness.arrow.matrix(), factorized.matrix());
  if (!equality) {
    failures.push({ law: "factorization", message: "Conditional kernel failed to equal its factorized reconstruction." });
  }

  const permutationReports: ConditionalPermutationReport[] = [];
  for (const permutation of options.permutations ?? []) {
    let holds = false;
    let details: string;
    try {
      const perm = permutationKernel(witness.arrow.Y, witness.arity, permutation);
      const permutedArrow = witness.arrow.then(perm);
      const permutedFactor = factorized.then(perm);
      holds = approxEqualMatrix(permutedArrow.matrix(), permutedFactor.matrix());
      details = holds
        ? "Permutation preserved conditional independence."
        : "Permutation broke equality between arrow and factorization.";
      if (!holds) {
        failures.push({
          law: "permutation",
          message: `Permutation [${permutation.join(", ")}] violated conditional independence.`,
          permutation,
        });
      }
    } catch (error) {
      details = (error as Error).message;
      failures.push({
        law: "permutation",
        message: `Invalid permutation [${permutation.join(", ")}] — ${(error as Error).message}`,
        permutation,
      });
    }
    permutationReports.push({ permutation, holds, details });
  }

  const holds = failures.length === 0;
  const descriptor = witness.label ?? `${witness.arity}-ary conditional kernel`;
  const details = holds
    ? `${descriptor} satisfies conditional independence.`
    : `${descriptor} violated ${failures.length} condition${failures.length === 1 ? "" : "s"}.`;

  return {
    witness,
    components,
    factorized,
    holds,
    equality,
    permutations: permutationReports,
    failures,
    details,
  };
}

// ✅ END_MATH: MarkovConditionalIndependence
// 🔮 Oracles: buildMarkovConditionalWitness, checkConditionalIndependence
// 🧪 Tests: Covered in law.MarkovConditionalIndependence.spec.ts
// 📊 Coverage: Finite Markov kernels with nested tensor products; extensible via custom projections for exotic codomains
