// 🔮 BEGIN_MATH: MarkovComonoidWitness
// 📝 Brief: Package copy/discard data and expose executable comonoid oracles.
// 🏗️ Domain: Markov categories / commutative comonoids in symmetric monoidal categories.
// 🔗 Integration: Builds on markov-category.ts primitives and registers oracle-ready reports.
// 📋 Plan:
//   1. Capture canonical copy/discard morphisms as reusable witnesses.
//   2. Provide oracle reports checking coassociativity, commutativity, and counit laws with diagnostics.
//   3. Extend to homomorphism checks showing when kernels respect the comonoid structure.

import type { Fin, Pair, Kernel, I, CopyDiscardLaws, ComonoidHomReport } from "./markov-category";
import { copyK, discardK, checkComonoidLaws, checkComonoidHom, FinMarkov } from "./markov-category";

export interface MarkovComonoidWitnessOptions<X> {
  readonly label?: string;
  readonly copy?: FinMarkov<X, Pair<X, X>>;
  readonly discard?: FinMarkov<X, I>;
}

export interface MarkovComonoidWitness<X> {
  readonly object: Fin<X>;
  readonly copy: FinMarkov<X, Pair<X, X>>;
  readonly discard: FinMarkov<X, I>;
  readonly label?: string;
}

export interface ComonoidLawFailure {
  readonly law: "coassociativity" | "commutativity" | "leftCounit" | "rightCounit";
  readonly message: string;
}

export interface ComonoidHomFailure {
  readonly law: "copy" | "discard";
  readonly message: string;
}

export interface MarkovComonoidReport<X> extends CopyDiscardLaws {
  readonly holds: boolean;
  readonly witness: MarkovComonoidWitness<X>;
  readonly details: string;
  readonly failures: ReadonlyArray<ComonoidLawFailure>;
}

export interface MarkovComonoidHomReport<X, Y> extends ComonoidHomReport {
  readonly holds: boolean;
  readonly domain: MarkovComonoidWitness<X>;
  readonly codomain: MarkovComonoidWitness<Y>;
  readonly details: string;
  readonly failures: ReadonlyArray<ComonoidHomFailure>;
}

function describeWitness<X>(witness: MarkovComonoidWitness<X>): string {
  const size = witness.object.elems.length;
  return witness.label ?? (size === 1 ? "terminal object" : `${size}-element object`);
}

export function buildMarkovComonoidWitness<X>(
  object: Fin<X>,
  options: MarkovComonoidWitnessOptions<X> = {},
): MarkovComonoidWitness<X> {
  const copy = options.copy ?? copyK(object);
  const discard = options.discard ?? discardK(object);

  if (copy.X !== object) {
    throw new Error("Copy morphism domain does not match the provided object.");
  }
  if (discard.X !== object) {
    throw new Error("Discard morphism domain does not match the provided object.");
  }

  return { object, copy, discard, label: options.label };
}

export function checkMarkovComonoid<X>(witness: MarkovComonoidWitness<X>): MarkovComonoidReport<X> {
  const base = checkComonoidLaws(witness.object, {
    copy: witness.copy.k as Kernel<X, Pair<X, X>>,
    discard: witness.discard.k as Kernel<X, I>,
  });

  const failures: ComonoidLawFailure[] = [];
  const descriptor = describeWitness(witness);

  if (!base.copyCoassoc) {
    failures.push({ law: "coassociativity", message: `Δ failed coassociativity on ${descriptor}.` });
  }
  if (!base.copyCommut) {
    failures.push({ law: "commutativity", message: `Δ failed commutativity on ${descriptor}.` });
  }
  if (!base.copyCounitL) {
    failures.push({ law: "leftCounit", message: `Left counit (! ⊗ id) ∘ Δ ≠ id on ${descriptor}.` });
  }
  if (!base.copyCounitR) {
    failures.push({ law: "rightCounit", message: `Right counit (id ⊗ !) ∘ Δ ≠ id on ${descriptor}.` });
  }

  const holds = failures.length === 0;
  const details = holds
    ? `Copy Δ and discard ! witness a commutative comonoid on ${descriptor}.`
    : `${failures.length} comonoid law${failures.length === 1 ? "" : "s"} failed on ${descriptor}.`;

  return { ...base, holds, witness, details, failures };
}

export function checkMarkovComonoidHom<X, Y>(
  domain: MarkovComonoidWitness<X>,
  codomain: MarkovComonoidWitness<Y>,
  morphism: Kernel<X, Y>,
): MarkovComonoidHomReport<X, Y> {
  const base = checkComonoidHom(domain.object, codomain.object, morphism);

  const failures: ComonoidHomFailure[] = [];
  const src = describeWitness(domain);
  const tgt = describeWitness(codomain);

  if (!base.preservesCopy) {
    failures.push({ law: "copy", message: `Δ was not preserved by the morphism from ${src} to ${tgt}.` });
  }
  if (!base.preservesDiscard) {
    failures.push({ law: "discard", message: `! was not preserved by the morphism from ${src} to ${tgt}.` });
  }

  const holds = failures.length === 0;
  const details = holds
    ? `Morphism preserves copy and discard between ${src} and ${tgt}.`
    : `${failures.length} comonoid homomorphism condition${failures.length === 1 ? "" : "s"} failed from ${src} to ${tgt}.`;

  return { ...base, holds, domain, codomain, details, failures };
}

// ✅ END_MATH: MarkovComonoidWitness
// 🔮 Oracles: checkMarkovComonoid, checkMarkovComonoidHom
// 🧪 Tests: Exercised via law.MarkovCategory.spec.ts property suites
// 📊 Coverage: Finite Markov kernels, extendable to infinite objects via inverse-limit carriers
