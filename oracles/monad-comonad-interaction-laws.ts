import { getCarrierSemantics, type SetHom, type SetObj } from "../set-cat";
import {
  nonemptyListQuotient,
  sweedlerDualNonemptyList,
  type Example14CofreeDoubleElement,
  type Example14CofreeElement,
  type Example14FreeTerm,
  type Example14ListOfLists,
  type Example14NonemptyList,
  type Example14Symbol,
  type Example14Term,
  type FreeMonadComonadCoproductWitness,
  type FreeMonadComonadInteractionLawResult,
  type FreeMonadComonadUniversalComparison,
  type MonadComonadInteractionLaw,
} from "../monad-comonad-interaction-law";
import type { IndexedElement } from "../chu-space";

const DEFAULT_SAMPLE_LIMIT = 64;

const enumerateCarrier = <T>(carrier: SetObj<T>): ReadonlyArray<T> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier);
};

const structuralEquals = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => structuralEquals(value, right[index]));
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftKeys = Object.keys(left as Record<string, unknown>);
    const rightKeys = Object.keys(right as Record<string, unknown>);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) =>
      structuralEquals(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
};

export interface MonadComonadValueProjector<Value> {
  readonly project: (value: Value) => readonly [unknown, unknown];
  readonly build: (left: unknown, right: unknown) => Value;
  readonly equals?: (left: Value, right: Value) => boolean;
}

export interface MonadComonadInteractionLawCheckOptions<Value>
  extends Partial<MonadComonadValueProjector<Value>> {
  readonly sampleLimit?: number;
}

interface DiagramCounterexample<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly leftInput: Left;
  readonly rightInput: Right;
  readonly expected: Value;
  readonly actual: Value;
}

export interface MonadComonadDiagramReport<Obj, Left, Right, Value> {
  readonly holds: boolean;
  readonly checked: number;
  readonly counterexamples: ReadonlyArray<
    DiagramCounterexample<Obj, Left, Right, Value>
  >;
  readonly details: ReadonlyArray<string>;
}

export interface MonadComonadCoherenceReport<Obj, Left, Right, Value> {
  readonly unit: MonadComonadDiagramReport<Obj, unknown, unknown, Value>;
  readonly counit: MonadComonadDiagramReport<Obj, unknown, unknown, Value>;
  readonly multiplication: MonadComonadDiagramReport<Obj, unknown, unknown, Value>;
  readonly mixedAssociativity: MonadComonadDiagramReport<Obj, unknown, unknown, Value>;
  readonly holds: boolean;
}

export interface FreeInteractionLawReport<
  LawObj,
  InitialComparison,
  FinalComparison,
> {
  readonly holds: boolean;
  readonly coproductWitnesses: ReadonlyArray<FreeMonadComonadCoproductWitness<LawObj>>;
  readonly initialComparisons: ReadonlyArray<FreeMonadComonadUniversalComparison<InitialComparison>>;
  readonly finalComparisons: ReadonlyArray<FreeMonadComonadUniversalComparison<FinalComparison>>;
  readonly details: ReadonlyArray<string>;
}

const defaultProjector = <Value>(): MonadComonadValueProjector<Value> => ({
  project: (value) => value as unknown as readonly [unknown, unknown],
  build: (left, right) => [left, right] as unknown as Value,
});

const evaluatePsi = <Obj, Arr, Left, Right, Value>(
  law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  primal: IndexedElement<Obj, Left>,
  dual: IndexedElement<Obj, Right>,
): Value => law.law.evaluate(primal, dual);

const normalizeLimit = (limit: number | undefined): number =>
  limit === undefined || limit < 0 ? DEFAULT_SAMPLE_LIMIT : limit;

export const checkMonadComonadInteractionLaw = <Obj, Arr, Left, Right, Value>(
  input: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: MonadComonadInteractionLawCheckOptions<Value> = {},
): MonadComonadCoherenceReport<Obj, Left, Right, Value> => {
  const projector = {
    ...defaultProjector<Value>(),
    ...("project" in options || "build" in options || "equals" in options
      ? options
      : {}),
  } as MonadComonadValueProjector<Value>;
  const equals = projector.equals ?? structuralEquals;
  const sampleLimit = normalizeLimit(options.sampleLimit);

  const objects = new Set<Obj>();
  for (const object of input.monad.functor.witness.objectGenerators) {
    objects.add(object);
  }
  for (const object of input.comonad.functor.witness.objectGenerators) {
    objects.add(object);
  }
  for (const object of input.law.kernel.base.objects) {
    objects.add(object);
  }

  const unitCounterexamples: Array<DiagramCounterexample<Obj, unknown, unknown, Value>> = [];
  const counitCounterexamples: Array<DiagramCounterexample<Obj, unknown, unknown, Value>> = [];
  const multiplicationCounterexamples: Array<DiagramCounterexample<Obj, unknown, unknown, Value>> = [];
  const mixedCounterexamples: Array<DiagramCounterexample<Obj, unknown, unknown, Value>> = [];

  let unitChecks = 0;
  let counitChecks = 0;
  let multiplicationChecks = 0;
  let mixedChecks = 0;

  for (const object of objects) {
    const eta = input.monad.unit.transformation.component(object) as SetHom<unknown, unknown>;
    const mu = input.monad.multiplication.transformation.component(object) as SetHom<unknown, unknown>;
    const epsilon = input.comonad.counit.transformation.component(object) as SetHom<unknown, unknown>;
    const delta = input.comonad.comultiplication.transformation.component(object) as SetHom<unknown, unknown>;

    const domainX = eta.dom as SetObj<unknown>;
    const codomainTX = eta.cod as SetObj<unknown>;
    const domainTTX = mu.dom as SetObj<unknown>;
    const domainDY = epsilon.dom as SetObj<unknown>;
    const codomainDDY = delta.cod as SetObj<unknown>;

    const enumeratedX = enumerateCarrier(domainX).slice(0, sampleLimit);
    const enumeratedTX = enumerateCarrier(codomainTX).slice(0, sampleLimit);
    const enumeratedTTX = enumerateCarrier(domainTTX).slice(0, sampleLimit);
    const enumeratedDY = enumerateCarrier(domainDY).slice(0, sampleLimit);

    const tObject = input.monad.functor.functor.F0(object);
    const dObject = input.comonad.functor.functor.F0(object);

    const epsilonAtDual = input.comonad.counit.transformation.component(dObject) as SetHom<unknown, unknown>;

    // Unit diagram: ψ ∘ (η × id) = ⟨id, ε⟩
    for (const x of enumeratedX) {
      for (const dy of enumeratedDY) {
        unitChecks += 1;
        const tx = eta.map(x);
        const lhs = evaluatePsi(input, { object, element: tx as Left }, {
          object,
          element: dy as Right,
        });
        const rhs = projector.build(x, epsilon.map(dy));
        if (!equals(lhs, rhs)) {
          unitCounterexamples.push({
            object,
            leftInput: x,
            rightInput: dy,
            expected: rhs,
            actual: lhs,
          });
        }
      }
    }

    // Counit/comultiplication diagram: ψ = (id × ε) ∘ ψ_{X,DY} ∘ (id × δ)
    for (const tx of enumeratedTX) {
      for (const dy of enumeratedDY) {
        counitChecks += 1;
        const lhs = evaluatePsi(input, { object, element: tx as Left }, {
          object,
          element: dy as Right,
        });

        const lifted = delta.map(dy);
        const intermediate = evaluatePsi(input, { object, element: tx as Left }, {
          object: dObject,
          element: lifted as Right,
        });
        const [interLeft, interRight] = projector.project(intermediate);
        const projected = epsilonAtDual.map(interRight);
        const rhs = projector.build(interLeft, projected);
        if (!equals(lhs, rhs)) {
          counitCounterexamples.push({
            object,
            leftInput: tx,
            rightInput: dy,
            expected: rhs,
            actual: lhs,
          });
        }
      }
    }

    // Multiplication/comultiplication compatibility:
    // ψ ∘ (μ × id) = ψ ∘ ψ_{TX,DY} ∘ (id × δ)
    for (const ttx of enumeratedTTX) {
      for (const dy of enumeratedDY) {
        multiplicationChecks += 1;
        const collapsedTx = mu.map(ttx);
        const lhs = evaluatePsi(input, { object, element: collapsedTx as Left }, {
          object,
          element: dy as Right,
        });

        const liftedDy = delta.map(dy);
        const intermediate = evaluatePsi(input, { object: tObject, element: ttx as Left }, {
          object: dObject,
          element: liftedDy as Right,
        });
        const [interTx, interDy] = projector.project(intermediate);
        const rhs = evaluatePsi(input, { object, element: interTx as Left }, {
          object,
          element: interDy as Right,
        });
        if (!equals(lhs, rhs)) {
          multiplicationCounterexamples.push({
            object,
            leftInput: ttx,
            rightInput: dy,
            expected: rhs,
            actual: lhs,
          });
        }
      }
    }

    // Mixed associativity: ψ ∘ (μ × id) = (id × ε) ∘ ψ_{X,DY} ∘ (μ × δ)
    for (const ttx of enumeratedTTX) {
      for (const dy of enumeratedDY) {
        mixedChecks += 1;
        const collapsedTx = mu.map(ttx);
        const lhs = evaluatePsi(input, { object, element: collapsedTx as Left }, {
          object,
          element: dy as Right,
        });

        const liftedDy = delta.map(dy);
        const intermediate = evaluatePsi(input, { object, element: collapsedTx as Left }, {
          object: dObject,
          element: liftedDy as Right,
        });
        const [interLeft, interRight] = projector.project(intermediate);
        const projected = epsilonAtDual.map(interRight);
        const rhs = projector.build(interLeft, projected);
        if (!equals(lhs, rhs)) {
          mixedCounterexamples.push({
            object,
            leftInput: ttx,
            rightInput: dy,
            expected: rhs,
            actual: lhs,
          });
        }
      }
    }
  }

  const unitReport: MonadComonadDiagramReport<Obj, unknown, unknown, Value> = {
    holds: unitCounterexamples.length === 0,
    checked: unitChecks,
    counterexamples: unitCounterexamples,
    details: [
      `Checked ${unitChecks} unit samples across ${objects.size} object(s).`,
      unitCounterexamples.length === 0
        ? "All unit equations satisfied."
        : `${unitCounterexamples.length} unit counterexample(s) recorded.`,
    ],
  };

  const counitReport: MonadComonadDiagramReport<Obj, unknown, unknown, Value> = {
    holds: counitCounterexamples.length === 0,
    checked: counitChecks,
    counterexamples: counitCounterexamples,
    details: [
      `Checked ${counitChecks} counit/comultiplication samples.`,
      counitCounterexamples.length === 0
        ? "All counit/comultiplication equations satisfied."
        : `${counitCounterexamples.length} counit/comultiplication counterexample(s) recorded.`,
    ],
  };

  const multiplicationReport: MonadComonadDiagramReport<Obj, unknown, unknown, Value> = {
    holds: multiplicationCounterexamples.length === 0,
    checked: multiplicationChecks,
    counterexamples: multiplicationCounterexamples,
    details: [
      `Checked ${multiplicationChecks} multiplication/comultiplication samples.`,
      multiplicationCounterexamples.length === 0
        ? "All multiplication/comultiplication equations satisfied."
        : `${multiplicationCounterexamples.length} multiplication/comultiplication counterexample(s) recorded.`,
    ],
  };

  const mixedReport: MonadComonadDiagramReport<Obj, unknown, unknown, Value> = {
    holds: mixedCounterexamples.length === 0,
    checked: mixedChecks,
    counterexamples: mixedCounterexamples,
    details: [
      `Checked ${mixedChecks} mixed associativity samples.`,
      mixedCounterexamples.length === 0
        ? "All mixed associativity equations satisfied."
        : `${mixedCounterexamples.length} mixed associativity counterexample(s) recorded.`,
    ],
  };

  return {
    unit: unitReport,
    counit: counitReport,
    multiplication: multiplicationReport,
    mixedAssociativity: mixedReport,
    holds:
      unitReport.holds &&
      counitReport.holds &&
      multiplicationReport.holds &&
      mixedReport.holds,
  };
};

export const checkFreeInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison,
  FinalComparison,
>(
  result: FreeMonadComonadInteractionLawResult<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr,
    InitialComparison,
    FinalComparison
  >,
): FreeInteractionLawReport<
  FreeMonadComonadCoproductWitness<LawObj>,
  FreeMonadComonadUniversalComparison<InitialComparison>,
  FreeMonadComonadUniversalComparison<FinalComparison>
> => {
  const details: string[] = [];
  let holds = true;

  if (result.coproductWitnesses.length === 0) {
    holds = false;
    details.push("checkFreeInteractionLaw: no coproduct witnesses recorded for ψ'.");
  }

  for (const witness of result.coproductWitnesses) {
    if (witness.summands.length === 0) {
      holds = false;
      details.push(
        `checkFreeInteractionLaw: coproduct witness for fiber ${String(witness.fiber)} is missing inclusions.`,
      );
    }
  }

  const initialComparisons = result.universalComparisons.initial;
  const finalComparisons = result.universalComparisons.final;

  details.push(
    `checkFreeInteractionLaw: recorded ${initialComparisons.length} initial comparison${
      initialComparisons.length === 1 ? "" : "s"
    }.`,
  );
  details.push(
    `checkFreeInteractionLaw: recorded ${finalComparisons.length} final comparison${
      finalComparisons.length === 1 ? "" : "s"
    }.`,
  );

  if (initialComparisons.length === 0) {
    holds = false;
    details.push(
      "checkFreeInteractionLaw: expected at least one universal arrow into the free law for the initial slice.",
    );
  }

  if (finalComparisons.length === 0) {
    holds = false;
    details.push(
      "checkFreeInteractionLaw: expected at least one universal arrow out of the free law for the final slice.",
    );
  }

  return {
    holds,
    coproductWitnesses: result.coproductWitnesses,
    initialComparisons,
    finalComparisons,
    details,
  };
};

const flattenExample14FreeTerm = (
  term: Example14Term<Example14Symbol>,
): Example14NonemptyList => {
  if (term.tag === "var") {
    return [term.value] as Example14NonemptyList;
  }
  const left = flattenExample14FreeTerm(term.left as Example14Term<Example14Symbol>);
  const right = flattenExample14FreeTerm(term.right as Example14Term<Example14Symbol>);
  return [...left, ...right] as Example14NonemptyList;
};

const flattenExample14ListOfListsManual = (
  lists: Example14ListOfLists,
): Example14NonemptyList => {
  const collected: Example14Symbol[] = [];
  for (const list of lists) {
    collected.push(...list);
  }
  return collected as Example14NonemptyList;
};

export interface NonemptyListQuotientCheckResult {
  readonly holds: boolean;
  readonly termCounterexamples: ReadonlyArray<{
    readonly term: Example14FreeTerm;
    readonly expected: Example14NonemptyList;
    readonly actual: Example14NonemptyList;
  }>;
  readonly multiplicationCounterexamples: ReadonlyArray<{
    readonly lists: Example14ListOfLists;
    readonly expected: Example14NonemptyList;
    readonly actual: Example14NonemptyList;
  }>;
  readonly details: ReadonlyArray<string>;
}

export const checkNonemptyListQuotient = (
  sampleLimit = 8,
): NonemptyListQuotientCheckResult => {
  const data = nonemptyListQuotient();
  const flattenHom = data.quotient.transformation.component("•") as SetHom<
    Example14FreeTerm,
    Example14NonemptyList
  >;
  const multiplicationHom = data.monad.multiplication.transformation.component("•") as SetHom<
    Example14ListOfLists,
    Example14NonemptyList
  >;

  const termSamples = enumerateCarrier(data.free.freeCarrier).slice(0, sampleLimit);
  const termCounterexamples: Array<{
    readonly term: Example14FreeTerm;
    readonly expected: Example14NonemptyList;
    readonly actual: Example14NonemptyList;
  }> = [];
  for (const term of termSamples) {
    const expected = flattenExample14FreeTerm(term);
    const actual = flattenHom.map(term);
    if (!structuralEquals(expected, actual)) {
      termCounterexamples.push({ term, expected, actual });
    }
  }

  const listSamples = enumerateCarrier(data.listOfListsCarrier).slice(0, sampleLimit);
  const multiplicationCounterexamples: Array<{
    readonly lists: Example14ListOfLists;
    readonly expected: Example14NonemptyList;
    readonly actual: Example14NonemptyList;
  }> = [];
  for (const lists of listSamples) {
    const expected = flattenExample14ListOfListsManual(lists);
    const actual = multiplicationHom.map(lists);
    if (!structuralEquals(expected, actual)) {
      multiplicationCounterexamples.push({ lists, expected, actual });
    }
  }

  const holds =
    termCounterexamples.length === 0 && multiplicationCounterexamples.length === 0;
  const details: string[] = [];
  details.push(
    termCounterexamples.length === 0
      ? "Example 14 quotient: all sampled free terms flattened as expected."
      : `${termCounterexamples.length} free-term counterexample(s) found in Example 14 quotient flattening.`,
  );
  details.push(
    multiplicationCounterexamples.length === 0
      ? "Example 14 quotient: monad multiplication concatenated list-of-lists correctly."
      : `${multiplicationCounterexamples.length} list-of-lists counterexample(s) found in Example 14 multiplication.`,
  );

  return { holds, termCounterexamples, multiplicationCounterexamples, details };
};

export interface NonemptyListSweedlerCheckResult {
  readonly holds: boolean;
  readonly counitCounterexamples: ReadonlyArray<{
    readonly element: Example14CofreeElement;
    readonly sweedler: unknown;
    readonly cofree: unknown;
  }>;
  readonly comultiplicationCounterexamples: ReadonlyArray<{
    readonly element: Example14CofreeElement;
    readonly sweedler: Example14CofreeDoubleElement;
    readonly cofree: Example14CofreeDoubleElement;
  }>;
  readonly details: ReadonlyArray<string>;
}

export const checkNonemptyListSweedler = (
  sampleLimit = 8,
): NonemptyListSweedlerCheckResult => {
  const data = sweedlerDualNonemptyList();
  const inclusion = data.sweedler.inclusion.transformation.component("•") as SetHom<
    Example14CofreeElement,
    Example14CofreeElement
  >;
  const sweedlerCounit = data.sweedler.comonad.counit.transformation.component("•") as SetHom<
    Example14CofreeElement,
    Example14NonemptyList
  >;
  const cofreeCounit = data.cofree.comonad.counit.transformation.component("•") as SetHom<
    Example14CofreeElement,
    Example14NonemptyList
  >;
  const sweedlerComultiplication =
    data.sweedler.comonad.comultiplication.transformation.component("•") as SetHom<
      Example14CofreeElement,
      Example14CofreeDoubleElement
    >;
  const cofreeComultiplication =
    data.cofree.comonad.comultiplication.transformation.component("•") as SetHom<
      Example14CofreeElement,
      Example14CofreeDoubleElement
    >;
  const doubleInclusion = data.sweedler.doubleInclusion;

  const samples = enumerateCarrier(data.sweedler.carrier).slice(0, sampleLimit);

  const counitCounterexamples: Array<{
    readonly element: Example14CofreeElement;
    readonly sweedler: unknown;
    readonly cofree: unknown;
  }> = [];
  const comultiplicationCounterexamples: Array<{
    readonly element: Example14CofreeElement;
    readonly sweedler: Example14CofreeDoubleElement;
    readonly cofree: Example14CofreeDoubleElement;
  }> = [];

  for (const element of samples) {
    const sweedlerValue = sweedlerCounit.map(element);
    const cofreeValue = cofreeCounit.map(inclusion.map(element));
    if (!structuralEquals(sweedlerValue, cofreeValue)) {
      counitCounterexamples.push({ element, sweedler: sweedlerValue, cofree: cofreeValue });
    }

    const sweedlerDelta = sweedlerComultiplication.map(element);
    const cofreeDelta = doubleInclusion.map(
      cofreeComultiplication.map(inclusion.map(element)),
    );
    if (!structuralEquals(sweedlerDelta, cofreeDelta)) {
      comultiplicationCounterexamples.push({
        element,
        sweedler: sweedlerDelta,
        cofree: cofreeDelta,
      });
    }
  }

  const holds =
    counitCounterexamples.length === 0 && comultiplicationCounterexamples.length === 0;
  const details: string[] = [];
  details.push(
    counitCounterexamples.length === 0
      ? "Example 14 Sweedler: counit agrees with cofree counit on sampled elements."
      : `${counitCounterexamples.length} counit discrepancy/discrepancies detected in Example 14 Sweedler data.`,
  );
  details.push(
    comultiplicationCounterexamples.length === 0
      ? "Example 14 Sweedler: comultiplication matches cofree inclusion on samples."
      : `${comultiplicationCounterexamples.length} comultiplication discrepancy/discrepancies detected in Example 14 Sweedler data.`,
  );

  return { holds, counitCounterexamples, comultiplicationCounterexamples, details };
};

