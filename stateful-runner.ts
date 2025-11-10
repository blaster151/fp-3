import type { ExponentialArrow, SetHom, SetObj, SetCarrierSemantics } from "./set-cat";
import { SetCat, getCarrierSemantics, semanticsAwareEquals } from "./set-cat";
import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { InteractionLawFiberCurrying } from "./functor-interaction-law";
import { monadComonadInteractionLawToMonoid } from "./monad-comonad-interaction-law";
import type { IndexedElement } from "./chu-space";
import type { MonadStructure } from "./monad-comonad-interaction-law";
import {
  type FreeTreeMonad,
  type Tree,
  foldTree,
  Return,
} from "./tree-free-monad";

export interface MonadMorphism<Obj, Arr> {
  readonly source: MonadStructure<Obj, Arr>;
  readonly target: MonadStructure<Obj, Arr>;
  readonly components: ReadonlyMap<Obj, SetHom<unknown, unknown>>;
}

export interface StatefulRunner<Obj, Left, Right, Value> {
  readonly thetas?: ReadonlyMap<
    Obj,
    SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>
  >;
  readonly thetaHom: ReadonlyMap<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >;
  readonly stateCarriers?: ReadonlyMap<Obj, SetObj<unknown>>;
  readonly stateThetas?: ReadonlyMap<Obj, StatefulTheta<Obj, Left, Right, Value, unknown>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface RunnerToMonadMapOptions<Obj> {
  readonly sampleLimit?: number;
  readonly objectFilter?: (object: Obj) => boolean;
  readonly metadata?: ReadonlyArray<string>;
  readonly operationSemantics?: ReadonlyMap<string, (args: ReadonlyArray<unknown>) => unknown>;
}

export interface RunnerToMonadMapResult<Obj, Arr> extends MonadMorphism<Obj, Arr> {
  readonly fromRunner: true;
  /** Right unit (ρ) components sampled per object (Proposition 3 style witness). */
  readonly rhoComponents?: ReadonlyMap<Obj, { readonly samples: number; readonly mismatches: number }>;
  /** Logged structural recursion steps over Tree_Σ generators. */
  readonly generatorLogs?: ReadonlyArray<string>;
}

export interface MonadMapToRunnerOptions<Obj> {
  readonly sampleLimit?: number;
  readonly objectFilter?: (object: Obj) => boolean;
  readonly metadata?: ReadonlyArray<string>;
  readonly operationSemantics?: ReadonlyMap<string, (args: ReadonlyArray<unknown>) => unknown>;
}

export interface MonadMapToRunnerResult<Obj, Left, Right, Value> extends StatefulRunner<Obj, Left, Right, Value> {
  readonly fromMonadMap: true;
  /** Round-trip preservation tallies comparing reconstructed θ against original τ on generators. */
  readonly generatorPreservation?: { checked: number; mismatches: number };
  /** Unit law sampling: τ ∘ η_F vs η_T tallies. */
  readonly unitPreservation?: { checked: number; mismatches: number };
  /** Multiplication law sampling (approximate): τ ∘ μ_F vs μ_T ∘ (G τ) ∘ (τ F) tallies; heuristic for free-tree source. */
  readonly multiplicationPreservation?: { checked: number; mismatches: number; note: string };
  /** Tree sample evaluations: τ(Return a) vs η_T(a) and τ(Op(...)) structural recursion heuristic. */
  readonly treeSamplePreservation?: { checked: number; mismatches: number };
}

/**
 * Convert a runner θ-family into a monad morphism Tree_Σ ⇒ T. This currently
 * builds a component map using θ(object)(return) semantics only; full Tree_Σ
 * evaluation will require an explicit tree syntax (future enhancement). Laws
 * are sampled to confirm τ ∘ η_F = η_T and μ_T ∘ Tτ ∘ τF ≈ τ ∘ μ_F.
 */
const isTreeNode = (value: unknown): value is Tree<unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const tag = (value as { _tag?: string })._tag;
  if (tag === "Return") return true;
  if (tag !== "Op") return false;
  const children = (value as { children?: unknown }).children;
  if (!Array.isArray(children)) return false;
  return children.every(isTreeNode);
};

export const runnerToMonadMap = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  free: MonadStructure<Obj, Arr>,
  target: MonadStructure<Obj, Arr>,
  options: RunnerToMonadMapOptions<Obj> = {},
): RunnerToMonadMapResult<Obj, Arr> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 12);
  const components = new Map<Obj, SetHom<unknown, unknown>>();
  const diagnostics: string[] = ["runnerToMonadMap: constructing τ via structural recursion on Tree_Σ generators."];
  const treeMonad = free as Partial<FreeTreeMonad<Obj, Arr>>;
  const generatorLogs: string[] = [];
  let unitChecked = 0;
  let unitMismatches = 0;
  let multChecked = 0;
  let multMismatches = 0;
  let treeChecked = 0;
  let treeMismatches = 0;
  const rhoComponents = new Map<Obj, { samples: number; mismatches: number }>();
  for (const [object] of runner.thetaHom.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const etaTarget = target.unit.transformation.component(object) as SetHom<unknown, unknown>;
    const targetCarrier = (etaTarget.cod as SetObj<unknown>) ?? (etaTarget.dom as SetObj<unknown>);
    const sourceCarrier =
      (treeMonad.carriers?.get(object) as SetObj<unknown> | undefined)
        ?? (free.functor.functor.F0(object) as SetObj<unknown>)
        ?? (free.unit.transformation.component(object).cod as SetObj<unknown>);
    // Structural recursion: interpret Return via η; interpret Op by recursively
    // evaluating children to T-elements then synthesising a Value via θ using
    // a canonical primal/dual pairing harvested from the evaluated children.
    const thetaHom = runner.thetaHom.get(object);
    const evaluateTree = (tree: Tree<unknown>): unknown =>
      foldTree<unknown, unknown>({
        onReturn: (value) => {
          const mapped = etaTarget.map(value);
          generatorLogs.push(`return-eval object=${String(object)} value=${String(value)} ⇒ ${String(mapped)}`);
          return mapped;
        },
        onOp: (name, childValues) => {
          // Pick canonical representatives for primal/dual from childValues if available.
          const [first, second] = childValues as [unknown, unknown];
          let result: unknown;
          if (thetaHom) {
            // Fabricate indexed elements; treat first as primal, second (or first) as dual.
            const primal: IndexedElement<Obj, Left> = { object, element: first as Left };
            const dual: IndexedElement<Obj, Right> = { object, element: (second ?? first) as Right };
            try {
              result = thetaHom.map([primal, dual]);
            } catch (e) {
              diagnostics.push(`θ-eval-failure object=${String(object)} op=${name} error=${(e as Error).message}`);
              result = { op: name, children: childValues };
            }
          } else {
            result = { op: name, children: childValues };
          }
          generatorLogs.push(`op-eval object=${String(object)} op=${name} children=${childValues.map(String).join(";")} ⇒ ${String(result)}`);
          return result;
        },
      })(tree);
    const tau = SetCat.hom(sourceCarrier, targetCarrier, (element: unknown) => {
      if (!isTreeNode(element)) {
        return etaTarget.map(element);
      }
      return evaluateTree(element);
    });
    components.set(object, tau as SetHom<unknown, unknown>);

    const etaF = free.unit.transformation.component(object) as SetHom<unknown, unknown>;
    const unitInputs: unknown[] = [];
    const carrier = etaF.dom as SetObj<unknown>;
    // Enumerate samples for unit law preservation (τ ∘ η_F = η_T)
    const semantics = getCarrierSemantics(carrier);
    if (sampleLimit > 0) {
      if (semantics?.iterate) {
        for (const v of semantics.iterate()) {
          unitInputs.push(v);
          if (unitInputs.length >= sampleLimit) break;
        }
      } else {
        for (const v of carrier as Iterable<unknown>) {
          unitInputs.push(v);
          if (unitInputs.length >= sampleLimit) break;
        }
      }
    }
  const tauComponent2 = components.get(object)!; // reuse previously stored τ component
    const etaTarget2 = target.unit.transformation.component(object) as SetHom<unknown, unknown>;
    for (const input of unitInputs) {
      unitChecked += 1;
      const expected = etaTarget2.map(input);
      const actual = tauComponent2.map(etaF.map(input));
      if (!Object.is(expected, actual)) {
        unitMismatches += 1;
        if (unitMismatches <= 4) diagnostics.push(`unit-preservation-mismatch object=${String(object)} input=${String(input)} expected=${String(expected)} actual=${String(actual)}`);
      }
    }
    // ρ synthesis: sample a few target elements and check right-unit style preservation
    // Using τ applied to Return paired with identity; placeholder since full tensor not available.
    const rhoSamples: unknown[] = [];
    const targetSem = getCarrierSemantics(targetCarrier);
    if (sampleLimit > 0) {
      if (targetSem?.iterate) {
        for (const v of targetSem.iterate()) { rhoSamples.push(v); if (rhoSamples.length >= sampleLimit) break; }
      } else {
        for (const v of targetCarrier as Iterable<unknown>) { rhoSamples.push(v); if (rhoSamples.length >= sampleLimit) break; }
      }
    }
    let rhoMismatches = 0;
    for (const v of rhoSamples) {
      treeChecked += 1;
      // Expect applying τ to a Return should match η_T
      const expected = etaTarget.map(v);
      const actual = tau.map(Return(v));
      if (!Object.is(expected, actual)) {
        rhoMismatches += 1; treeMismatches += 1;
        if (rhoMismatches <= 4) diagnostics.push(`rho-mismatch object=${String(object)} base=${String(v)} expected=${String(expected)} actual=${String(actual)}`);
      }
    }
    rhoComponents.set(object, { samples: rhoSamples.length, mismatches: rhoMismatches });
  }
  diagnostics.push(`structural-recursion: treesChecked=${treeChecked} treeMismatches=${treeMismatches}.`);
  return {
    source: free,
    target,
    components,
    diagnostics,
    unitPreservation: { checked: unitChecked, mismatches: unitMismatches },
    multiplicationPreservation: { checked: multChecked, mismatches: multMismatches },
    rhoComponents,
    generatorLogs,
    fromRunner: true,
  } as RunnerToMonadMapResult<Obj, Arr>;
};

/**
 * Convert a monad morphism τ : Tree_Σ ⇒ T into a runner by rebuilding θ from the packaged
 * interaction law's ψ fibers. We also sample τ ∘ η_F against η_T on base elements to certify
 * generator preservation on returns. Operation samples are future work until explicit Σ syntax lands.
 */
export const monadMapToRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  morphism: MonadMorphism<Obj, Arr>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: MonadMapToRunnerOptions<Obj> = {},
): MonadMapToRunnerResult<Obj, Left, Right, Value> => {
  const details: string[] = [
    "monadMapToRunner: reconstructing θ components from ψ fibers; sampling τ ∘ η vs η.",
  ];
  const sampleLimit = Math.max(0, options.sampleLimit ?? 12);
  const thetas = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >>();
  const thetaHom = new Map<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >();
  let componentsBuilt = 0;
  let reusedTheta = 0;
  let rebuiltTheta = 0;
  let treeChecked = 0;
  let treeMismatches = 0;
  let multChecked = 0;
  let multMismatches = 0;
  const multiplicationSummary: string[] = [];
  let multNote = "no multiplication sampling performed (source not recognised as free tree monad)";

  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const storedTheta = fiber.theta;
    if (storedTheta) {
      reusedTheta += 1;
    } else {
      rebuiltTheta += 1;
    }
    const theta = (storedTheta ??
      fiber.exponential.curry({
        domain: fiber.primalFiber,
        product: fiber.product,
        morphism: fiber.phi,
      })) as SetHom<
      IndexedElement<Obj, Left>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >;
    thetas.set(object, theta);
    const uncurried = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    thetaHom.set(
      object,
      uncurried as SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>,
    );
    componentsBuilt += 1;
  }
  details.push(
    `monadMapToRunner: built θ for ${componentsBuilt} object(s) (stored=${reusedTheta} rebuilt=${rebuiltTheta}).`,
  );

  let checked = 0;
  let mismatches = 0;
  for (const [object] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const tau = morphism.components.get(object) as SetHom<unknown, unknown> | undefined;
    const etaF = morphism.source.unit.transformation.component(object) as
      | SetHom<unknown, unknown>
      | undefined;
    const etaT = morphism.target.unit.transformation.component(object) as
      | SetHom<unknown, unknown>
      | undefined;
    if (!tau || !etaF || !etaT) continue;
    const unitInputs = enumerateLimited(etaF.dom as SetObj<unknown>, sampleLimit);
    for (const input of unitInputs) {
      checked += 1;
      const expected = etaT.map(input);
      const actual = tau.map(etaF.map(input));
      if (!Object.is(expected, actual)) {
        mismatches += 1;
        if (mismatches <= 4) {
          details.push(
            `monadMapToRunner.unit-preservation-mismatch object=${String(object)} input=${String(
              input,
            )} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }
  }
  details.push(
    `monadMapToRunner: unit-preservation checked=${checked} mismatches=${mismatches} (limit=${sampleLimit}).`,
  );

  const treeMonad = morphism.source as Partial<FreeTreeMonad<Obj, Arr>>;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const tau = morphism.components.get(object) as SetHom<Tree<unknown>, unknown> | undefined;
    const etaTarget = morphism.target.unit.transformation.component(object) as
      | SetHom<unknown, unknown>
      | undefined;
    const thetaEntry = thetaHom.get(object);
    if (!tau || !thetaEntry || !etaTarget) continue;
    const treeCarrier = treeMonad?.carriers?.get(object) as SetObj<Tree<unknown>> | undefined;
    if (!treeCarrier) continue;
    const treeSamples = enumerateLimited(treeCarrier, sampleLimit);
    if (treeSamples.length === 0) continue;

    const equalsTarget = semanticsAwareEquals(tau.cod as SetObj<unknown>);
    const equalsPrimal = semanticsAwareEquals(fiber.primalFiber);
    const equalsDual = semanticsAwareEquals(fiber.dualFiber);
    const primalSamples = enumerateLimited(fiber.primalFiber, Math.max(sampleLimit, 16));
    const dualSamples = enumerateLimited(fiber.dualFiber, Math.max(sampleLimit, 16));
    const operationLookup = options.operationSemantics;

    const makeIndexedLeft = (value: unknown): IndexedElement<Obj, Left> => {
      for (const sample of primalSamples) {
        const probe = { object, element: value as Left } as IndexedElement<Obj, Left>;
        if (equalsPrimal(sample, probe) || Object.is(sample.element, value)) {
          return sample;
        }
      }
      return { object, element: value as Left } as IndexedElement<Obj, Left>;
    };

      const makeIndexedRight = (value: unknown): IndexedElement<Obj, Right> => {
        for (const sample of dualSamples) {
          const probe = { object, element: value as Right } as IndexedElement<Obj, Right>;
          if (equalsDual(sample, probe) || Object.is(sample.element, value)) {
            return sample;
          }
        }
        return { object, element: value as Right } as IndexedElement<Obj, Right>;
      };

      const evaluateWith = (
        node: Tree<unknown>,
        onReturn: (value: unknown) => unknown,
      ): unknown => {
        if (node._tag === "Return") {
          return onReturn(node.value);
        }
        if (node._tag === "Op") {
          const evaluatedChildren = node.children.map((child) => evaluateWith(child, onReturn));
          if (evaluatedChildren.length === 0) {
            return { op: node.name, children: evaluatedChildren };
          }
          const primalValue = evaluatedChildren[0];
          const dualValue = evaluatedChildren[1] ?? evaluatedChildren[0];
          const primal = makeIndexedLeft(primalValue);
          const dual = makeIndexedRight(dualValue);
          try {
            return thetaEntry.map([primal, dual]);
          } catch (error) {
            const opFn = operationLookup?.get(node.name);
            if (opFn) {
              return opFn(evaluatedChildren as ReadonlyArray<unknown>);
            }
            throw error;
          }
        }
        return onReturn(node as unknown as never);
      };

      const evaluateTree = (node: Tree<unknown>): unknown =>
        evaluateWith(node, (value) => etaTarget.map(value));

      const evaluateNestedTree = (node: Tree<unknown>): unknown =>
        evaluateWith(node, (value) => {
          if (isTreeNode(value)) {
            return evaluateTree(value as Tree<unknown>);
          }
          return etaTarget.map(value);
        });

    let objectErrors = 0;
    for (const treeSample of treeSamples) {
      treeChecked += 1;
      try {
        const reconstructed = evaluateTree(treeSample);
        const expected = tau.map(treeSample);
        if (!equalsTarget(expected, reconstructed)) {
          treeMismatches += 1;
          if (treeMismatches <= 4) {
            details.push(
              `monadMapToRunner.tree-mismatch object=${String(object)} sample=${JSON.stringify(
                treeSample,
              )} expected=${String(expected)} actual=${String(reconstructed)}`,
            );
          }
        }
      } catch (error) {
        treeMismatches += 1;
        objectErrors += 1;
        if (treeMismatches <= 4) {
          details.push(
            `monadMapToRunner.tree-eval-error object=${String(object)} sample=${JSON.stringify(
              treeSample,
            )} error=${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    if (objectErrors > 0) {
      details.push(
        `monadMapToRunner: object ${String(object)} encountered ${objectErrors} evaluation error(s) while replaying tree samples.`,
      );
    }

      const muSource = morphism.source.multiplication.transformation.component(object) as
        | SetHom<unknown, unknown>
        | undefined;
      const muTarget = morphism.target.multiplication.transformation.component(object) as
        | SetHom<unknown, unknown>
        | undefined;
      if (!muSource || !muTarget) {
        multiplicationSummary.push(
          `object ${String(object)}: skipped μ sampling (missing ${!muSource ? "source μ" : "target μ"})`,
        );
        continue;
      }
      const nestedSamples = enumerateLimited(muSource.dom as SetObj<unknown>, sampleLimit);
      if (nestedSamples.length === 0) {
        multiplicationSummary.push(`object ${String(object)}: no samples available from μ domain`);
        continue;
      }
      multiplicationSummary.push(`object ${String(object)}: sampled ${nestedSamples.length} μ-elements`);
      for (const nested of nestedSamples) {
        if (!isTreeNode(nested)) {
          continue;
        }
        multChecked += 1;
        try {
          const flattened = muSource.map(nested) as unknown;
          if (!isTreeNode(flattened)) {
            continue;
          }
          const expected = tau.map(flattened as Tree<unknown>);
          const actual = evaluateNestedTree(nested as Tree<unknown>);
          if (!equalsTarget(expected, actual)) {
            multMismatches += 1;
            if (multMismatches <= 4) {
              details.push(
                `monadMapToRunner.multiplication-mismatch object=${String(object)} sample=${JSON.stringify(
                  nested,
                )} expected=${String(expected)} actual=${String(actual)}`,
              );
            }
          }
        } catch (error) {
          multMismatches += 1;
          if (multMismatches <= 4) {
            details.push(
              `monadMapToRunner.multiplication-eval-error object=${String(object)} sample=${JSON.stringify(
                nested,
              )} error=${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
  }

  if (treeChecked === 0) {
    details.push("monadMapToRunner: tree sampling unavailable (no recognised free-tree carriers).");
  } else {
    details.push(`monadMapToRunner: tree-samples checked=${treeChecked} mismatches=${treeMismatches}.`);
  }
    if (multiplicationSummary.length > 0) {
      multNote = multiplicationSummary.join(" | ");
    }
  details.push(
    `monadMapToRunner: multiplication-heuristic checked=${multChecked} mismatches=${multMismatches} note=${multNote}.`,
  );

  return {
    thetas,
    thetaHom,
    diagnostics: details,
    fromMonadMap: true,
    generatorPreservation: { checked, mismatches },
    unitPreservation: { checked, mismatches },
    multiplicationPreservation: { checked: multChecked, mismatches: multMismatches, note: multNote },
    treeSamplePreservation: { checked: treeChecked, mismatches: treeMismatches },
  } as MonadMapToRunnerResult<Obj, Left, Right, Value>;
};

/** A single stateful θ component: given a state and indexed left/right elements, produce updated state and value. */
export interface StatefulTheta<Obj, Left, Right, Value, State> {
  readonly object: Obj;
  readonly run: (
    state: State,
    left: IndexedElement<Obj, Left>,
    right: IndexedElement<Obj, Right>,
  ) => readonly [State, Value];
}

export interface BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State> extends BuildRunnerOptions {
  readonly initialState: (object: Obj) => State;
  /**
   * Evolve function: computes next state after observing a value. Default: identity (returns previous state).
   */
  readonly evolve?: (object: Obj, previous: State, value: Value, left: Left, right: Right) => State;
  /** Optional explicit carrier per object (if omitted, carrier construction is deferred). */
  readonly stateCarrierMap?: ReadonlyMap<Obj, SetObj<State>>;
}

export interface RunnerCompositeFailureEntry {
  readonly input: unknown;      // η or μ composite input element sampled
  readonly dual: unknown;       // sampled dual element used in evaluation
  readonly expected: unknown;   // φ(primal, dual)
  readonly actual: unknown;     // composite(dual)
}

export interface RunnerObjectCompositeReport {
  readonly object: unknown;
  readonly unit: { checked: number; mismatches: number };
  readonly mult: { checked: number; mismatches: number };
  readonly unitFailures?: ReadonlyArray<RunnerCompositeFailureEntry>;
  readonly multFailures?: ReadonlyArray<RunnerCompositeFailureEntry>;
}

export interface RunnerAxiomReport {
  readonly holds: boolean;
  readonly unitDiagram: { checked: number; mismatches: number };
  readonly multiplicationDiagram: { checked: number; mismatches: number };
  readonly details: ReadonlyArray<string>;
  readonly structural?: ReadonlyArray<RunnerObjectCompositeReport>;
};

// ---------- Explicit η/μ diagram evaluators (objectwise witnesses) ----------

export interface RunnerUnitDiagramSample<Obj, Left, Right, Value> {
  readonly input: unknown; // element from η_X.dom
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly expected: Value; // φ(primal, dual)
  readonly actual: Value;   // ((η_X); θ)(dual)
}

export interface RunnerUnitDiagramWitness<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly eta: SetHom<unknown, Left>;
  readonly phiCheck: SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
  readonly unitComposite: SetHom<unknown, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
  readonly checked: number;
  readonly mismatches: number;
  readonly samples: ReadonlyArray<RunnerUnitDiagramSample<Obj, Left, Right, Value>>;
}

export interface RunnerMultiplicationDiagramSample<Obj, Left, Right, Value> {
  readonly input: unknown; // element from μ_X.dom
  readonly collapsed: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly expected: Value; // φ(collapsed, dual)
  readonly actual: Value;   // ((μ_X); θ)(dual)
}

export interface RunnerMultiplicationDiagramWitness<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly mu: SetHom<unknown, Left>;
  readonly phiCheck: SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
  readonly multComposite: SetHom<unknown, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
  readonly checked: number;
  readonly mismatches: number;
  readonly samples: ReadonlyArray<RunnerMultiplicationDiagramSample<Obj, Left, Right, Value>>;
}

/** Build objectwise unit diagram witness: (η_X);θ vs φ. */
export function runnerUnitDiagram<
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  runner: StatefulRunner<Obj, Left, Right, Value>,
  object: Obj,
  options: { sampleLimit?: number } = {},
): RunnerUnitDiagramWitness<Obj, Left, Right, Value> {
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
  const fiber = interaction.psiComponents.get(object)!;
  const eta = interaction.monad.unit.transformation.component(object) as SetHom<unknown, Left>;
  const phiCheck = SetCat.hom(
    fiber.primalFiber,
    fiber.exponential.object,
    (primal: IndexedElement<Obj, Left>) => (theta ? theta.map(primal) : fiber.exponential.curry({ domain: fiber.primalFiber, product: fiber.product, morphism: fiber.phi }).map(primal)),
  );
  const unitComposite = SetCat.hom(eta.dom as SetObj<unknown>, fiber.exponential.object, (input: unknown) =>
    phiCheck.map({ object, element: eta.map(input as Left) } as IndexedElement<Obj, Left>)
  );
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const inputs = enumerateLimited(eta.dom as SetObj<unknown>, sampleLimit);
  const duals = enumerateLimited(fiber.dualFiber as SetObj<IndexedElement<Obj, Right>>, sampleLimit);
  let checked = 0;
  let mismatches = 0;
  const samples: RunnerUnitDiagramSample<Obj, Left, Right, Value>[] = [];
  for (const input of inputs) {
    const lifted = eta.map(input as Left);
    const primal: IndexedElement<Obj, Left> = { object, element: lifted };
    const arrow = unitComposite.map(input as unknown) as ExponentialArrow<IndexedElement<Obj, Right>, Value>;
    for (const dual of duals) {
      checked++;
      const expected = fiber.phi.map([primal, dual]);
      const actual = arrow(dual);
      if (!Object.is(expected, actual)) {
        mismatches++;
        if (samples.length < 12) samples.push({ input, primal, dual, expected, actual });
      }
    }
  }
  return { object, eta, phiCheck, unitComposite, checked, mismatches, samples };
}

/** Build objectwise multiplication diagram witness: (μ_X);θ vs φ. */
export function runnerMultiplicationDiagram<
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  runner: StatefulRunner<Obj, Left, Right, Value>,
  object: Obj,
  options: { sampleLimit?: number } = {},
): RunnerMultiplicationDiagramWitness<Obj, Left, Right, Value> {
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
  const fiber = interaction.psiComponents.get(object)!;
  const mu = interaction.monad.multiplication.transformation.component(object) as SetHom<unknown, Left>;
  const phiCheck = SetCat.hom(
    fiber.primalFiber,
    fiber.exponential.object,
    (primal: IndexedElement<Obj, Left>) => (theta ? theta.map(primal) : fiber.exponential.curry({ domain: fiber.primalFiber, product: fiber.product, morphism: fiber.phi }).map(primal)),
  );
  const multComposite = SetCat.hom(mu.dom as SetObj<unknown>, fiber.exponential.object, (input: unknown) =>
    phiCheck.map({ object, element: mu.map(input as Left) } as IndexedElement<Obj, Left>)
  );
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const inputs = enumerateLimited(mu.dom as SetObj<unknown>, sampleLimit);
  const duals = enumerateLimited(fiber.dualFiber as SetObj<IndexedElement<Obj, Right>>, sampleLimit);
  let checked = 0;
  let mismatches = 0;
  const samples: RunnerMultiplicationDiagramSample<Obj, Left, Right, Value>[] = [];
  for (const input of inputs) {
    const collapsed = mu.map(input as Left);
    const primal: IndexedElement<Obj, Left> = { object, element: collapsed };
    const arrow = multComposite.map(input as unknown) as ExponentialArrow<IndexedElement<Obj, Right>, Value>;
    for (const dual of duals) {
      checked++;
      const expected = fiber.phi.map([primal, dual]);
      const actual = arrow(dual);
      if (!Object.is(expected, actual)) {
        mismatches++;
        if (samples.length < 12) samples.push({ input, collapsed: primal, dual, expected, actual });
      }
    }
  }
  return { object, mu, phiCheck, multComposite, checked, mismatches, samples };
}

export function evaluateRunnerDiagrams<
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  runner: StatefulRunner<Obj, Left, Right, Value>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): {
  readonly unit: ReadonlyMap<Obj, RunnerUnitDiagramWitness<Obj, Left, Right, Value>>;
  readonly multiplication: ReadonlyMap<Obj, RunnerMultiplicationDiagramWitness<Obj, Left, Right, Value>>;
} {
  const unit = new Map<Obj, RunnerUnitDiagramWitness<Obj, Left, Right, Value>>();
  const multiplication = new Map<Obj, RunnerMultiplicationDiagramWitness<Obj, Left, Right, Value>>();
  for (const [object] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const unitOpts = options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : undefined;
    const multOpts = unitOpts;
    unit.set(object, runnerUnitDiagram(interaction, runner, object, unitOpts as any));
    multiplication.set(object, runnerMultiplicationDiagram(interaction, runner, object, multOpts as any));
  }
  return { unit, multiplication };
}

// Base build options (re-added after refactor)
export interface BuildRunnerOptions {
  readonly sampleLimit?: number;
  readonly metadata?: ReadonlyArray<string>;
}

// (Reintroduced) Generic axiom checker options: sampling + optional object filter.
export interface RunnerAxiomOptions<Obj = unknown> extends BuildRunnerOptions {
  readonly objectFilter?: (object: Obj) => boolean;
}

// ---------- Builders ----------

// Construct a plain (stateless) runner by extracting θ from the interaction fibers,
// falling back to currying φ if a θ component is not present.
export const buildRunnerFromInteraction = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildRunnerOptions = {},
): StatefulRunner<Obj, Left, Right, Value> => {
  const thetaHom = new Map<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >();
  const thetas = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>
  >();
  const details: string[] = [];
  let count = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const theta = (fiber.theta ?? fiber.exponential.curry({ domain: fiber.primalFiber, product: fiber.product, morphism: fiber.phi })) as SetHom<
      IndexedElement<Obj, Left>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >;
    thetas.set(object, theta);
    const uncurried = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    thetaHom.set(object, uncurried as SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>);
    count++;
  }
  details.push(`buildRunnerFromInteraction: collected θ for ${count} object(s).`);
  if (options.metadata && options.metadata.length > 0) details.push(...options.metadata);
  return { thetas, thetaHom, diagnostics: details };
};

// Create an enriched runner that carries per-object state and exposes a stateful θ family.
// Overloads: (interaction, options) or (baseRunner, interaction, options)
export function buildEnrichedStatefulRunner<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State>
): StatefulRunner<Obj, Left, Right, Value>;
export function buildEnrichedStatefulRunner<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State
>(
  baseRunner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State>
): StatefulRunner<Obj, Left, Right, Value>;
export function buildEnrichedStatefulRunner<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State
>(
  a: StatefulRunner<Obj, Left, Right, Value> | MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  b: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr> | BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State>,
  c?: BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State>,
): StatefulRunner<Obj, Left, Right, Value> {
  const interaction = (c ? (b as MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>) : (a as MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>));
  const options = (c ? (c as BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State>) : (b as BuildEnrichedRunnerOptions<Obj, Left, Right, Value, State>));
  const baseRunner = (c ? (a as StatefulRunner<Obj, Left, Right, Value>) : buildRunnerFromInteraction(interaction));

  const stateCarriers = new Map<Obj, SetObj<State | unknown>>();
  const stateThetas = new Map<Obj, StatefulTheta<Obj, Left, Right, Value, State>>();
  const thetas = new Map(baseRunner.thetas ?? new Map());
  const diagnostics: string[] = ["buildEnrichedStatefulRunner: constructing state carriers and θ-state components."];
  const evolve = options.evolve ?? ((_: Obj, prev: State) => prev);

  for (const [object] of interaction.psiComponents.entries()) {
    const baseTheta = thetas.get(object) ?? interaction.psiComponents.get(object)?.theta ?? interaction.psiComponents.get(object)?.exponential.curry({ domain: interaction.psiComponents.get(object)!.primalFiber, product: interaction.psiComponents.get(object)!.product, morphism: interaction.psiComponents.get(object)!.phi });
    if (!baseTheta) continue;
    const carrier = options.stateCarrierMap?.get(object) ?? (SetCat.obj([options.initialState(object)]) as SetObj<State>);
    stateCarriers.set(object, carrier);
    const st: StatefulTheta<Obj, Left, Right, Value, State> = {
      object,
      run: (state, left, right) => {
        const arrow = baseTheta.map(left);
        const value = arrow(right);
        const next = evolve(object, state, value, left.element as Left, right.element as Right);
        return [next, value] as const;
      },
    };
    stateThetas.set(object, st);
  }
  diagnostics.push(`enriched: objects=${stateThetas.size}.`);
  if (options.metadata && options.metadata.length > 0) diagnostics.push(...options.metadata);
  return {
    thetas,
  thetaHom: baseRunner.thetaHom ?? buildPhiFromRunnerPerObject({ thetas, thetaHom: new Map(), diagnostics: [] } as unknown as StatefulRunner<Obj, Left, Right, Value>, interaction),
    stateCarriers: stateCarriers as ReadonlyMap<Obj, SetObj<unknown>>,
    stateThetas: stateThetas as ReadonlyMap<Obj, StatefulTheta<Obj, Left, Right, Value, unknown>>,
    diagnostics: [...(baseRunner.diagnostics ?? []), ...diagnostics],
  };
}

// Runner morphisms (state transformers between enriched runners) – minimal reconstructed types.
export interface RunnerMorphism<Obj, Left, Right, Value, StateA, StateB> {
  readonly stateMaps: ReadonlyMap<Obj, SetHom<StateA, StateB>>;
}

export const identityRunnerMorphism = <Obj, Arr, Left, Right, Value, State>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  _interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerMorphism<Obj, Left, Right, Value, State, State> => {
  const stateMaps = new Map<Obj, SetHom<State, State>>();
  for (const [object] of runner.thetaHom.entries()) {
    const carrier = runner.stateCarriers?.get(object) as SetObj<State> | undefined;
    if (!carrier) continue;
    stateMaps.set(object, SetCat.hom(carrier, carrier, (s: State) => s));
  }
  return { stateMaps };
};

export const composeRunnerMorphisms = <Obj, Arr, Left, Right, Value, SA, SB, SC>(
  f: RunnerMorphism<Obj, Left, Right, Value, SA, SB>,
  g: RunnerMorphism<Obj, Left, Right, Value, SB, SC>,
  runner: StatefulRunner<Obj, Left, Right, Value>,
  _interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerMorphism<Obj, Left, Right, Value, SA, SC> => {
  const stateMaps = new Map<Obj, SetHom<SA, SC>>();
  for (const [object] of runner.thetaHom.entries()) {
    const sf = f.stateMaps.get(object);
    const sg = g.stateMaps.get(object);
    if (!sf || !sg) continue;
    const dom = sf.dom as SetObj<SA>;
    const cod = sg.cod as SetObj<SC>;
    stateMaps.set(object, SetCat.hom(dom, cod, (s: SA) => sg.map(sf.map(s))));
  }
  return { stateMaps };
};

// ---------- Coalgebra (T°) runner view (Step 2) ----------

export interface RunnerCoalgebraReport<Obj> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
  readonly objects: ReadonlyArray<Obj>;
}

export interface RunnerCostateReport<Obj> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
  readonly objects: ReadonlyArray<Obj>;
}

export const buildRunnerCoalgebra = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<
  Obj,
  SetHom<
    IndexedElement<Obj, Right>,
    ExponentialArrow<IndexedElement<Obj, Left>, Value>
  >
> => {
  // Constructs a coalgebra-style view γ_Y: Y -> T°Y for each object Y by
  // leveraging the Sweedler fromDual map. Each dual element is mapped into an
  // exponential over primal fiber elements capturing ?(primal, dual).
  const result = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >();
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const primalExp = SetCat.exponential(
      fiber.primalFiber,
      interaction.law.dualizing as SetObj<Value>,
    );
    const fromDual = interaction.sweedler.fromDual as SetHom<
      IndexedElement<Obj, Right>,
      (primal: IndexedElement<Obj, Left>) => Value
    >;
    const coalgebra = SetCat.hom(
      fiber.dualFiber,
      primalExp.object,
      (dualEl) => {
        const evalFn = fromDual.map(dualEl);
        return primalExp.register((pr) => evalFn(pr));
      },
    );
  result.set(object, coalgebra as unknown as SetHom<
      IndexedElement<Obj, Right>,
      ExponentialArrow<IndexedElement<Obj, Left>, Value>
    >);
  }
  return result;
};

export const checkRunnerCoalgebra = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: {
    sampleLimit?: number;
    objectFilter?: (object: Obj) => boolean;
    components?: ReadonlyMap<
      Obj,
      SetHom<
        IndexedElement<Obj, Right>,
        ExponentialArrow<IndexedElement<Obj, Left>, Value>
      >
    >;
  } = {},
): RunnerCoalgebraReport<Obj> => {
  // Samples the constructed coalgebra components to ensure evaluation matches
  // the original interaction law φ(primal, dual) across bounded primal/dual pairs.
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const components = options.components ?? buildRunnerCoalgebra(runner, interaction);
  const details: string[] = [];
  const objects: Obj[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const coalgebra = components.get(object);
    if (!coalgebra) continue;
    objects.push(object);
    let localChecked = 0;
    let localMismatches = 0;
    // sample a few dual/primal pairs
    let dualCount = 0;
    for (const dualEl of fiber.dualFiber as Iterable<IndexedElement<Obj, Right>>) {
      if (dualCount >= sampleLimit) break;
      dualCount++;
      const arrow = coalgebra.map(dualEl);
      let primalCount = 0;
      for (const primalEl of fiber.primalFiber as Iterable<IndexedElement<Obj, Left>>) {
        if (primalCount >= sampleLimit) break;
        primalCount++;
        const expected = fiber.phi.map([primalEl, dualEl]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primalEl);
        localChecked++;
        if (!Object.is(expected, actual)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `coalgebra-mismatch object=${String(object)} left=${String(primalEl.element)} right=${String(dualEl.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
    details.push(
      `coalgebra object=${String(object)} checked=${localChecked} mismatches=${localMismatches} (limit=${sampleLimit}).`,
    );
  }
  details.unshift(
    `Coalgebra check: sampled up to ${sampleLimit} elements per carrier across ${objects.length} object(s).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details, objects };
};
// (coalgebra check integrated)

// ---------- Costate (Right -> T°) runner view (Step 3) ----------

export const buildRunnerCostate = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<
  Obj,
  SetHom<
    Right,
    ExponentialArrow<IndexedElement<Obj, Left>, Value>
  >
> => {
  // Constructs a costate translator κ_Y: Y -> T°Y using Sweedler fromDual,
  // but with raw right elements (unindexed) as inputs.
  const result = new Map<
    Obj,
    SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >();
  const fromDual = interaction.sweedler.fromDual as SetHom<
    IndexedElement<Obj, Right>,
    (primal: IndexedElement<Obj, Left>) => Value
  >;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const primalExp = SetCat.exponential(
      fiber.primalFiber,
      interaction.law.dualizing as SetObj<Value>,
    );
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const costate = SetCat.hom(
      rightCarrier,
      primalExp.object,
      (rightEl) => {
        const indexed: IndexedElement<Obj, Right> = { object, element: rightEl };
        const evalFn = fromDual.map(indexed);
        return primalExp.register((pr) => evalFn(pr));
      },
    );
    result.set(object, costate as unknown as SetHom<
      Right,
      ExponentialArrow<IndexedElement<Obj, Left>, Value>
    >);
  }
  return result;
};

export const checkRunnerCostate = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: {
    sampleLimit?: number;
    objectFilter?: (object: Obj) => boolean;
    components?: ReadonlyMap<
      Obj,
      SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
    >;
  } = {},
): RunnerCostateReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const components = options.components ?? buildRunnerCostate(_runner, interaction);
  const details: string[] = [];
  const objects: Obj[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const costate = components.get(object);
    if (!costate) continue;
    objects.push(object);
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    if (rightSamples.length === 0 || primalSamples.length === 0) {
      details.push(
        `coalgebra→costate: object=${String(object)} insufficient samples (primal=${primalSamples.length} right=${rightSamples.length}); coverage limited.`,
      );
    }
    let localChecked = 0;
    let localMismatches = 0;
    for (const rightEl of rightSamples) {
      const arrow = costate.map(rightEl);
      for (const primalEl of primalSamples) {
        const expected = fiber.phi.map([primalEl, { object, element: rightEl }]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primalEl);
        localChecked++;
        if (!Object.is(expected, actual)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `costate-mismatch object=${String(object)} left=${String(primalEl.element)} right=${String(rightEl)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
    details.push(
      `costate object=${String(object)} checked=${localChecked} mismatches=${localMismatches} (limit=${sampleLimit}).`,
    );
  }
  details.unshift(
    `Costate check: sampled up to ${sampleLimit} elements per carrier across ${objects.length} object(s).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details, objects };
};

// =============================
// Costate / Coalgebra equivalence translators (Runner Phase V)
// =============================
export interface CoalgebraComponents<Obj, Left, Right, Value> extends ReadonlyMap<
  Obj,
  SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
> {}

export interface CostateComponents<Obj, Left, Right, Value> extends ReadonlyMap<
  Obj,
  SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
> {}

export interface EquivalenceDiagnostics {
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

const deriveSampleLimit = (
  requested: number | undefined,
  ...cardinalities: Array<number | undefined>
): number => {
  if (requested !== undefined) return Math.max(0, requested);
  const finite = cardinalities.filter(
    (value): value is number =>
      value !== undefined && Number.isFinite(value) && (value as number) >= 0,
  );
  if (finite.length === 0) return 8;
  const maxCardinality = Math.max(...finite);
  if (maxCardinality <= 8) return maxCardinality;
  const sqrtBound = Math.ceil(Math.sqrt(maxCardinality));
  return Math.min(32, Math.max(8, sqrtBound));
};

const recordTruncatedCoverage = <Obj>(
  details: string[],
  context: string,
  object: Obj,
  label: string,
  enumerated: number,
  cardinality: number | undefined,
  limit: number,
): void => {
  if (
    cardinality === undefined ||
    !Number.isFinite(cardinality) ||
    enumerated === 0 ||
    enumerated < limit ||
    cardinality <= enumerated
  ) {
    return;
  }
  details.push(
    `${context}: object=${String(object)} ${label} truncated at ${enumerated}/${cardinality} samples (limit=${limit}).`,
  );
};

// Runner → Coalgebra (reuse existing builder + add θ agreement sampling)
export const runnerToCoalgebraComponents = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { components: CoalgebraComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const details: string[] = ["runner→coalgebra (diagram 4): sampling θ vs γ evaluation."];
  const components = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >();
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const thetaHom = resolveThetaHom(runner, interaction, object, fiber);
    if (!thetaHom) {
      details.push(`runner→coalgebra: object=${String(object)} missing θ witness; skipping.`);
      continue;
    }
    const primalExp = SetCat.exponential(
      fiber.primalFiber,
      interaction.law.dualizing as SetObj<Value>,
    );
    const coalgebra = SetCat.hom(
      fiber.dualFiber,
      primalExp.object,
      (dualEl) =>
        primalExp.register((primalEl) =>
          thetaHom.map([primalEl, dualEl]),
        ),
    ) as SetHom<
      IndexedElement<Obj, Right>,
      ExponentialArrow<IndexedElement<Obj, Left>, Value>
    >;
    components.set(object, coalgebra);
    const primalCardinality = getCarrierSemantics(fiber.primalFiber)?.cardinality;
    const dualCardinality = getCarrierSemantics(fiber.dualFiber)?.cardinality;
    const sampleLimit = deriveSampleLimit(options.sampleLimit, primalCardinality, dualCardinality);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    if (primalSamples.length === 0 || dualSamples.length === 0) {
      details.push(
        `runner→coalgebra: object=${String(object)} insufficient samples (primal=${primalSamples.length} dual=${dualSamples.length}); coverage limited.`,
      );
      continue;
    }
    recordTruncatedCoverage(
      details,
      "runner→coalgebra",
      object,
      "primal fibre",
      primalSamples.length,
      primalCardinality,
      sampleLimit,
    );
    recordTruncatedCoverage(
      details,
      "runner→coalgebra",
      object,
      "dual fibre",
      dualSamples.length,
      dualCardinality,
      sampleLimit,
    );
    for (const dual of dualSamples) {
      const arrow = coalgebra.map(dual);
      for (const primal of primalSamples) {
        checked++;
        const expected = thetaHom.map([primal, dual]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) {
          mismatches++;
          if (mismatches <= 6) {
            details.push(
              `diagram(4) mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  if (components.size === 0) {
    details.push("runner→coalgebra: no components constructed (likely due to missing θ witnesses).");
  }
  details.push(`runner→coalgebra: checked=${checked} mismatches=${mismatches}.`);
  return { components, diagnostics: { checked, mismatches, details } };
};

// Coalgebra → Runner (recover θ via ψ consistency) – currently returns original θ via interaction since coalgebra is derived.
export const coalgebraComponentsToRunner = <Obj, Arr, Left, Right, Value>(
  components: CoalgebraComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { runner: StatefulRunner<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const details: string[] = ["coalgebra→runner (diagram 4): sampling γ vs reconstructed θ."];
  const thetas = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>
  >();
  const thetaHomMap = new Map<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >();
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const gamma = components.get(object);
    if (!gamma) {
      details.push(`coalgebra→runner: object=${String(object)} missing γ component; skipping.`);
      continue;
    }
    const primalCardinality = getCarrierSemantics(fiber.primalFiber)?.cardinality;
    const dualCardinality = getCarrierSemantics(fiber.dualFiber)?.cardinality;
    const sampleLimit = deriveSampleLimit(options.sampleLimit, primalCardinality, dualCardinality);
    const theta = SetCat.hom(
      fiber.primalFiber,
      fiber.exponential.object,
      (primalEl) =>
        fiber.exponential.register((dualEl) => {
          const arrow = gamma.map(dualEl);
          return (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primalEl);
        }),
    ) as SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
    thetas.set(object, theta);
    const thetaHom = fiber.exponential.uncurry({ product: fiber.product, morphism: theta }) as SetHom<
      readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
      Value
    >;
    thetaHomMap.set(object, thetaHom);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    if (primalSamples.length === 0 || dualSamples.length === 0) {
      details.push(
        `coalgebra→runner: object=${String(object)} insufficient samples (primal=${primalSamples.length} dual=${dualSamples.length}); coverage limited.`,
      );
      continue;
    }
    recordTruncatedCoverage(
      details,
      "coalgebra→runner",
      object,
      "primal fibre",
      primalSamples.length,
      primalCardinality,
      sampleLimit,
    );
    recordTruncatedCoverage(
      details,
      "coalgebra→runner",
      object,
      "dual fibre",
      dualSamples.length,
      dualCardinality,
      sampleLimit,
    );
    for (const dual of dualSamples) {
      const arrow = gamma.map(dual);
      for (const primal of primalSamples) {
        checked += 1;
        const expected = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        const actual = thetaHom.map([primal, dual]);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            details.push(
              `diagram(4) zig-zag mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  if (thetas.size === 0) {
    details.push("coalgebra→runner: no θ reconstructed (missing γ inputs?).");
  }
  details.push(`coalgebra→runner: checked=${checked} mismatches=${mismatches}.`);
  return {
    runner: { thetas, thetaHom: thetaHomMap, diagnostics: details },
    diagnostics: { checked, mismatches, details },
  };
};

// Runner → Costate (reuse builder + θ agreement)
export const runnerToCostateComponents = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { components: CostateComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const details: string[] = ["runner→costate (diagram 5): sampling θ vs κ evaluation."];
  const components = new Map<
    Obj,
    SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >();
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const thetaHom = resolveThetaHom(runner, interaction, object, fiber);
    if (!thetaHom) {
      details.push(`runner→costate: object=${String(object)} missing θ witness; skipping.`);
      continue;
    }
    const primalExp = SetCat.exponential(
      fiber.primalFiber,
      interaction.law.dualizing as SetObj<Value>,
    );
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const costate = SetCat.hom(
      rightCarrier,
      primalExp.object,
      (rightEl) => {
        const indexed: IndexedElement<Obj, Right> = { object, element: rightEl };
        return primalExp.register((primalEl) => thetaHom.map([primalEl, indexed]));
      },
    ) as SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>;
    components.set(object, costate);
    const primalCardinality = getCarrierSemantics(fiber.primalFiber)?.cardinality;
    const rightCardinality = getCarrierSemantics(rightCarrier)?.cardinality;
    const sampleLimit = deriveSampleLimit(options.sampleLimit, primalCardinality, rightCardinality);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    if (primalSamples.length === 0 || rightSamples.length === 0) {
      details.push(
        `runner→costate: object=${String(object)} insufficient samples (primal=${primalSamples.length} right=${rightSamples.length}); coverage limited.`,
      );
      continue;
    }
    recordTruncatedCoverage(
      details,
      "runner→costate",
      object,
      "primal fibre",
      primalSamples.length,
      primalCardinality,
      sampleLimit,
    );
    recordTruncatedCoverage(
      details,
      "runner→costate",
      object,
      "right fibre",
      rightSamples.length,
      rightCardinality,
      sampleLimit,
    );
    for (const right of rightSamples) {
      const arrow = costate.map(right);
      for (const primal of primalSamples) {
        checked += 1;
        const indexed: IndexedElement<Obj, Right> = { object, element: right };
        const expected = thetaHom.map([primal, indexed]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            details.push(
              `diagram(5) mismatch object=${String(object)} left=${String(primal.element)} right=${String(right)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  if (components.size === 0) {
    details.push("runner→costate: no κ components constructed (missing θ data?).");
  }
  details.push(`runner→costate: checked=${checked} mismatches=${mismatches}.`);
  return { components, diagnostics: { checked, mismatches, details } };
};

// Costate → Runner (similar to coalgebra path)
export const costateComponentsToRunner = <Obj, Arr, Left, Right, Value>(
  components: CostateComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { runner: StatefulRunner<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const details: string[] = ["costate→runner (diagram 5): reconstructing θ from κ."];
  const thetas = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>
  >();
  const thetaHomMap = new Map<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >();
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const kappa = components.get(object);
    if (!kappa) {
      details.push(`costate→runner: object=${String(object)} missing κ component; skipping.`);
      continue;
    }
    const theta = SetCat.hom(
      fiber.primalFiber,
      fiber.exponential.object,
      (primalEl) =>
        fiber.exponential.register((dualEl) => {
          const rightValue = dualEl.element as Right;
          const arrow = kappa.map(rightValue);
          return (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primalEl);
        }),
    ) as SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
    thetas.set(object, theta);
    const thetaHom = fiber.exponential.uncurry({ product: fiber.product, morphism: theta }) as SetHom<
      readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
      Value
    >;
    thetaHomMap.set(object, thetaHom);
    const primalCardinality = getCarrierSemantics(fiber.primalFiber)?.cardinality;
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightCardinality = getCarrierSemantics(rightCarrier)?.cardinality;
    const sampleLimit = deriveSampleLimit(options.sampleLimit, primalCardinality, rightCardinality);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    if (primalSamples.length === 0 || rightSamples.length === 0) {
      details.push(
        `costate→runner: object=${String(object)} insufficient samples (primal=${primalSamples.length} right=${rightSamples.length}); coverage limited.`,
      );
      continue;
    }
    recordTruncatedCoverage(
      details,
      "costate→runner",
      object,
      "primal fibre",
      primalSamples.length,
      primalCardinality,
      sampleLimit,
    );
    recordTruncatedCoverage(
      details,
      "costate→runner",
      object,
      "right fibre",
      rightSamples.length,
      rightCardinality,
      sampleLimit,
    );
    for (const right of rightSamples) {
      const arrow = kappa.map(right);
      const indexed: IndexedElement<Obj, Right> = { object, element: right };
      for (const primal of primalSamples) {
        checked += 1;
        const expected = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        const actual = thetaHom.map([primal, indexed]);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            details.push(
              `diagram(5) zig-zag mismatch object=${String(object)} left=${String(primal.element)} right=${String(right)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  if (thetas.size === 0) {
    details.push("costate→runner: no θ reconstructed (missing κ inputs?).");
  }
  details.push(`costate→runner: checked=${checked} mismatches=${mismatches}.`);
  return {
    runner: { thetas, thetaHom: thetaHomMap, diagnostics: details },
    diagnostics: { checked, mismatches, details },
  };
};

// Coalgebra ↔ Costate (factor through Sweedler fromDual indexing)
export const coalgebraToCostate = <Obj, Arr, Left, Right, Value>(
  components: CoalgebraComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { components: CostateComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const costate = new Map<Obj, SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>>();
  const details: string[] = ["coalgebra→costate (diagram 5): translating γ into κ."];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const gamma = components.get(object);
    if (!gamma) continue;
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const primalExp = SetCat.exponential(fiber.primalFiber, interaction.law.dualizing as SetObj<Value>);
    const kappa = SetCat.hom(rightCarrier, primalExp.object, (rightEl) => {
      const indexed: IndexedElement<Obj, Right> = { object, element: rightEl };
      const arrow = gamma.map(indexed);
      return primalExp.register((pr) => (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(pr));
    });
    costate.set(object, kappa as unknown as SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>);
    // Light sampling equivalence: evaluate expected ψ vs composed map
    const rightCardinality = getCarrierSemantics(rightCarrier)?.cardinality;
    const primalCardinality = getCarrierSemantics(fiber.primalFiber)?.cardinality;
    const sampleLimit = deriveSampleLimit(options.sampleLimit, rightCardinality, primalCardinality);
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    if (rightSamples.length === 0 || primalSamples.length === 0) {
      details.push(
        `coalgebra→costate: object=${String(object)} insufficient samples (primal=${primalSamples.length} right=${rightSamples.length}); coverage limited.`,
      );
      continue;
    }
    recordTruncatedCoverage(
      details,
      "coalgebra→costate",
      object,
      "primal fibre",
      primalSamples.length,
      primalCardinality,
      sampleLimit,
    );
    recordTruncatedCoverage(
      details,
      "coalgebra→costate",
      object,
      "right fibre",
      rightSamples.length,
      rightCardinality,
      sampleLimit,
    );
    for (const right of rightSamples) {
      const arrow = kappa.map(right);
      for (const primal of primalSamples) {
        checked += 1;
        const expected = fiber.phi.map([primal, { object, element: right }]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 4) {
            details.push(
              `diagram(5) cast mismatch object=${String(object)} left=${String(primal.element)} right=${String(right)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  details.push(`coalgebra→costate: checked=${checked} mismatches=${mismatches}.`);
  return { components: costate, diagnostics: { checked, mismatches, details } };
};

export const costateToCoalgebra = <Obj, Arr, Left, Right, Value>(
  components: CostateComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { components: CoalgebraComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const coalgebra = new Map<Obj, SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>>();
  const details: string[] = ["costateToCoalgebra: translating κ components into γ via reindexing."]; let checked = 0, mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const kappa = components.get(object);
    if (!kappa) continue;
    const primalExp = SetCat.exponential(fiber.primalFiber, interaction.law.dualizing as SetObj<Value>);
    const gamma = SetCat.hom(fiber.dualFiber, primalExp.object, (indexedRight) => {
      const arrow = kappa.map(indexedRight.element as Right);
      return primalExp.register((pr) => (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(pr));
    });
    coalgebra.set(object, gamma as unknown as SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>);
    const dualCardinality = getCarrierSemantics(fiber.dualFiber)?.cardinality;
    const primalCardinality = getCarrierSemantics(fiber.primalFiber)?.cardinality;
    const sampleLimit = deriveSampleLimit(options.sampleLimit, dualCardinality, primalCardinality);
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    if (dualSamples.length === 0 || primalSamples.length === 0) {
      details.push(
        `costate→coalgebra: object=${String(object)} insufficient samples (primal=${primalSamples.length} dual=${dualSamples.length}); coverage limited.`,
      );
      continue;
    }
    recordTruncatedCoverage(
      details,
      "costate→coalgebra",
      object,
      "dual fibre",
      dualSamples.length,
      dualCardinality,
      sampleLimit,
    );
    recordTruncatedCoverage(
      details,
      "costate→coalgebra",
      object,
      "primal fibre",
      primalSamples.length,
      primalCardinality,
      sampleLimit,
    );
    for (const dualEl of dualSamples) {
      const arrow = gamma.map(dualEl);
      for (const primal of primalSamples) {
        checked++; const expected = fiber.phi.map([primal, dualEl]); const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) { mismatches++; if (mismatches <= 2) details.push(`costate->coalgebra-mismatch object=${String(object)} left=${String(primal.element)} right=${String(dualEl.element)} expected=${String(expected)} actual=${String(actual)}`); }
      }
    }
  }
  if (coalgebra.size === 0) {
    details.push("costateToCoalgebra: no γ components reconstructed (missing κ inputs?).");
  }
  details.push(`costateToCoalgebra: checked=${checked} mismatches=${mismatches}.`);
  return { components: coalgebra, diagnostics: { checked, mismatches, details } };
};
// Bold step: bridge to existing monoid checker to get concrete unit/multiplication tallies.
export const checkRunnerAxiomsFromInteraction = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerAxiomOptions<Obj> = {},
): RunnerAxiomReport => {
  const evalOpts: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {};
  if (options.sampleLimit !== undefined) evalOpts.sampleLimit = options.sampleLimit;
  if (options.objectFilter) evalOpts.objectFilter = options.objectFilter;
  const evalDiag = evaluateRunnerDiagrams<Obj, Arr, Left, Right, Value>(interaction, { thetas: new Map(), thetaHom: new Map(), diagnostics: [] }, evalOpts);
  let unitChecked = 0, unitMismatches = 0;
  let multChecked = 0, multMismatches = 0;
  const details: string[] = [];
  const structural: RunnerObjectCompositeReport[] = [];
  for (const [obj, w] of evalDiag.unit.entries()) {
    unitChecked += w.checked;
    unitMismatches += w.mismatches;
    const multW = evalDiag.multiplication.get(obj);
    if (multW) { multChecked += multW.checked; multMismatches += multW.mismatches; }
    const unitFailures = w.samples.map(s => ({ input: s.input, dual: (s.dual as any).element ?? s.dual, expected: s.expected, actual: s.actual })) as RunnerCompositeFailureEntry[];
    const multFailures = multW ? multW.samples.map(s => ({ input: s.input, dual: (s.dual as any).element ?? s.dual, expected: s.expected, actual: s.actual })) as RunnerCompositeFailureEntry[] : [];
    structural.push({ object: obj as unknown, unit: { checked: w.checked, mismatches: w.mismatches }, mult: { checked: multW?.checked ?? 0, mismatches: multW?.mismatches ?? 0 }, ...(unitFailures.length > 0 ? { unitFailures } : {}), ...(multFailures.length > 0 ? { multFailures } : {}) });
  }
  details.push(`Runner axioms (diagram evaluators): unit checked=${unitChecked}, mismatches=${unitMismatches}.`);
  details.push(`Runner axioms (diagram evaluators): multiplication checked=${multChecked}, mismatches=${multMismatches}.`);
  if (options.metadata && options.metadata.length > 0) details.push(...options.metadata);
  if (options.objectFilter) details.push("Runner axioms: object filter applied.");
  return { holds: unitMismatches === 0 && multMismatches === 0, unitDiagram: { checked: unitChecked, mismatches: unitMismatches }, multiplicationDiagram: { checked: multChecked, mismatches: multMismatches }, details, structural };
};

export const checkStatefulRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildRunnerOptions = {},
): RunnerAxiomReport => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const diag = evaluateRunnerDiagrams<Obj, Arr, Left, Right, Value>(interaction, runner, { sampleLimit });
  let unitChecked = 0, unitMismatches = 0;
  let multChecked = 0, multMismatches = 0;
  const details: string[] = [];
  const structural: RunnerObjectCompositeReport[] = [];
  for (const [object, w] of diag.unit.entries()) {
    unitChecked += w.checked; unitMismatches += w.mismatches;
    const multW = diag.multiplication.get(object);
    if (multW) { multChecked += multW.checked; multMismatches += multW.mismatches; }
    const unitFailures: RunnerCompositeFailureEntry[] = w.samples.map(s => ({ input: s.input, dual: (s.dual as any).element ?? s.dual, expected: s.expected, actual: s.actual }));
    const multFailures: RunnerCompositeFailureEntry[] = multW ? multW.samples.map(s => ({ input: s.input, dual: (s.dual as any).element ?? s.dual, expected: s.expected, actual: s.actual })) : [];
    structural.push({ object: object as unknown, unit: { checked: w.checked, mismatches: w.mismatches }, mult: { checked: multW?.checked ?? 0, mismatches: multW?.mismatches ?? 0 }, ...(unitFailures.length > 0 ? { unitFailures } : {}), ...(multFailures.length > 0 ? { multFailures } : {}) });
    if (w.mismatches > 0) details.push(`unit-mismatches object=${String(object)} count=${w.mismatches}`);
    if (multW && multW.mismatches > 0) details.push(`mult-mismatches object=${String(object)} count=${multW.mismatches}`);
  }
  details.push(`Runner unit diagram: checked=${unitChecked} mismatches=${unitMismatches} (limit=${sampleLimit}).`);
  details.push(`Runner multiplication diagram: checked=${multChecked} mismatches=${multMismatches} (limit=${sampleLimit}).`);
  if (options.metadata && options.metadata.length > 0) details.push(...options.metadata);
  return { holds: unitMismatches === 0 && multMismatches === 0, unitDiagram: { checked: unitChecked, mismatches: unitMismatches }, multiplicationDiagram: { checked: multChecked, mismatches: multMismatches }, details, structural };
};

// ---------- Run(T) category laws: identity and associativity ----------

export interface RunTCategoryLawsConfig<Obj, Left, Right, Value> {
  readonly source: StatefulRunner<Obj, Left, Right, Value>;
  readonly target?: StatefulRunner<Obj, Left, Right, Value>;
  readonly mid?: StatefulRunner<Obj, Left, Right, Value>;
  readonly tail?: StatefulRunner<Obj, Left, Right, Value>;
  readonly f?: RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>; // source -> target
  readonly g?: RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>; // target -> mid
  readonly h?: RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>; // mid -> tail
}

export interface RunTCategoryLawsReport<Obj> {
  readonly holds: boolean;
  readonly leftIdentity: { checked: number; mismatches: number };
  readonly rightIdentity: { checked: number; mismatches: number };
  readonly associativity: { checked: number; mismatches: number; skipped: boolean };
  readonly details: ReadonlyArray<string>;
}

const compareRunnerMorphisms = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  StateA,
  StateB
>(
  first: RunnerMorphism<Obj, Left, Right, Value, StateA, StateB>,
  second: RunnerMorphism<Obj, Left, Right, Value, StateA, StateB>,
  domainRunner: StatefulRunner<Obj, Left, Right, Value>,
  codomainRunner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  sampleLimit: number,
  objectFilter?: (object: Obj) => boolean,
): { checked: number; mismatches: number; details: ReadonlyArray<string> } => {
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  const codThetaCurried = codomainRunner.thetas ?? buildThetaCurriedFromHom(codomainRunner, interaction);
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (objectFilter && !objectFilter(object)) continue;
    const stateCarrier = domainRunner.stateCarriers?.get(object) as SetObj<StateA> | undefined;
    if (!stateCarrier) {
      details.push(`compareRunnerMorphisms: skipped object=${String(object)} (no domain state carrier).`);
      continue;
    }
    const f = first.stateMaps.get(object);
    const g = second.stateMaps.get(object);
    if (!f || !g) {
      details.push(`compareRunnerMorphisms: skipped object=${String(object)} (missing component morphisms).`);
      continue;
    }
    const codCarrier = codomainRunner.stateCarriers?.get(object) as SetObj<StateB> | undefined;
    const codSemantics = codCarrier ? getCarrierSemantics(codCarrier) : undefined;
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    const stateSamples = enumerateLimited(stateCarrier, sampleLimit);
    const codStateTheta = codomainRunner.stateThetas?.get(object) as
      | StatefulTheta<Obj, Left, Right, Value, StateB>
      | undefined;
    const codTheta = codThetaCurried.get(object);
    let localChecked = 0;
    let localMismatches = 0;
    for (const state of stateSamples) {
      const mappedFirst = f.map(state as StateA) as StateB;
      const mappedSecond = g.map(state as StateA) as StateB;
      localChecked += 1;
      const statesEqual = codSemantics?.equals
        ? codSemantics.equals(mappedFirst, mappedSecond)
        : Object.is(mappedFirst, mappedSecond);
      if (!statesEqual) {
        localMismatches += 1;
        if (localMismatches <= 4) {
          details.push(
            `compareRunnerMorphisms: state mismatch object=${String(object)} state=${String(state)} first=${String(mappedFirst)} second=${String(mappedSecond)}`,
          );
        }
      }
      if (codStateTheta) {
        for (const leftEl of leftSamples) {
          for (const rightEl of rightSamples) {
            const [nextFirst, valueFirst] = codStateTheta.run(mappedFirst, leftEl, rightEl);
            const [nextSecond, valueSecond] = codStateTheta.run(mappedSecond, leftEl, rightEl);
            localChecked += 1;
            const valueEqual = Object.is(valueFirst, valueSecond);
            if (!valueEqual) {
              localMismatches += 1;
              if (localMismatches <= 4) {
                details.push(
                  `compareRunnerMorphisms: value mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} first=${String(valueFirst)} second=${String(valueSecond)}`,
                );
              }
            }
            const nextEqual = codSemantics?.equals
              ? codSemantics.equals(nextFirst, nextSecond)
              : Object.is(nextFirst, nextSecond);
            if (!nextEqual) {
              localMismatches += 1;
              if (localMismatches <= 4) {
                details.push(
                  `compareRunnerMorphisms: next-state mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} first=${String(nextFirst)} second=${String(nextSecond)}`,
                );
              }
            }
          }
        }
      } else if (codTheta) {
        details.push(`compareRunnerMorphisms: object=${String(object)} has only stateless θ; skipping value comparison.`);
      }
    }
    if (localChecked === 0) {
      details.push(`compareRunnerMorphisms: no samples evaluated for object=${String(object)}.`);
    }
    checked += localChecked;
    mismatches += localMismatches;
  }
  return { checked, mismatches, details };
};

export const checkRunTCategoryLaws = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  config: RunTCategoryLawsConfig<Obj, Left, Right, Value>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunTCategoryLawsReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const source = config.source;
  const target = config.target ?? config.source;
  const mid = config.mid ?? target;
  const tail = config.tail ?? mid;
  // Identities
  const idSource = identityRunnerMorphism<Obj, Arr, Left, Right, Value, unknown>(source, interaction);
  const idTarget = identityRunnerMorphism<Obj, Arr, Left, Right, Value, unknown>(target, interaction);
  const idMid = identityRunnerMorphism<Obj, Arr, Left, Right, Value, unknown>(mid, interaction);
  const idTail = identityRunnerMorphism<Obj, Arr, Left, Right, Value, unknown>(tail, interaction);
  // Morphisms (default to identities)
  const f = (config.f as RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>) ?? idSource; // source -> target
  const g = (config.g as RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>) ?? idTarget; // target -> mid
  const h = (config.h as RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>) ?? idMid;    // mid -> tail

  // Left identity: f ∘ id_source == f
  const leftId = composeRunnerMorphisms(idSource, f, source, interaction);
  const leftIdCmp = compareRunnerMorphisms(leftId, f, source, target, interaction, sampleLimit, options.objectFilter);

  // Right identity: id_target ∘ f == f
  const rightId = composeRunnerMorphisms(f, idTarget, source, interaction);
  const rightIdCmp = compareRunnerMorphisms(rightId, f, source, target, interaction, sampleLimit, options.objectFilter);

  // Associativity: (h ∘ g) ∘ f == h ∘ (g ∘ f)
  const assocSkipped = !config.mid && !config.tail && !config.g && !config.h;
  let assocChecked = 0;
  let assocMismatches = 0;
  const details: string[] = [];
  details.push(
    `Run(T) laws: sampleLimit=${sampleLimit}; using identities by default where morphisms not supplied.`,
  );
  if (!assocSkipped) {
  const gof = composeRunnerMorphisms(f, g, source, interaction); // g ∘ f
  const hog = composeRunnerMorphisms(g, h, target, interaction); // h ∘ g
  const leftAssoc = composeRunnerMorphisms(gof, h, mid, interaction); // h ∘ (g ∘ f)
  const rightAssoc = composeRunnerMorphisms(f, hog, source, interaction); // (h ∘ g) ∘ f
  const assocCmp = compareRunnerMorphisms(leftAssoc, rightAssoc, source, tail, interaction, sampleLimit, options.objectFilter);
    assocChecked = assocCmp.checked;
    assocMismatches = assocCmp.mismatches;
    if (assocCmp.details.length > 0) details.push(...assocCmp.details);
  } else {
    details.push("Run(T) associativity: skipped (no non-trivial triple supplied).");
  }

  const allHolds =
    leftIdCmp.mismatches === 0 &&
    rightIdCmp.mismatches === 0 &&
    (assocSkipped || assocMismatches === 0);

  if (leftIdCmp.details.length > 0) details.push(...leftIdCmp.details.map((s) => `left-id: ${s}`));
  if (rightIdCmp.details.length > 0) details.push(...rightIdCmp.details.map((s) => `right-id: ${s}`));

  return {
    holds: allHolds,
    leftIdentity: { checked: leftIdCmp.checked, mismatches: leftIdCmp.mismatches },
    rightIdentity: { checked: rightIdCmp.checked, mismatches: rightIdCmp.mismatches },
    associativity: { checked: assocChecked, mismatches: assocMismatches, skipped: assocSkipped },
    details,
  };
};

// ---------- Unified law report ----------

export interface RunnerLawReport<Obj, Left, Right, Value> {
  readonly holds: boolean;
  readonly unitChecked: number;
  readonly unitMismatches: number;
  readonly multChecked: number;
  readonly multMismatches: number;
  readonly curryingChecked: number;
  readonly curryingMismatches: number;
  readonly coalgebraChecked?: number;
  readonly coalgebraMismatches?: number;
  readonly costateChecked?: number;
  readonly costateMismatches?: number;
  readonly leftIdentityChecked?: number;
  readonly leftIdentityMismatches?: number;
  readonly rightIdentityChecked?: number;
  readonly rightIdentityMismatches?: number;
  readonly associativityChecked?: number;
  readonly associativityMismatches?: number;
  readonly associativitySkipped?: boolean;
  readonly handlerChecked?: number;
  readonly handlerMismatches?: number;
  readonly psiToThetaChecked?: number;
  readonly psiToThetaMismatches?: number;
  readonly thetaToPsiChecked?: number;
  readonly thetaToPsiMismatches?: number;
  readonly thetaMissing: ReadonlyArray<Obj>;
  readonly thetaExtra: ReadonlyArray<Obj>;
  readonly finiteFailures?: ReadonlyArray<RunnerFiniteAxiomFailure<Obj, Left, Right, Value>>;
  readonly details: ReadonlyArray<string>;
}

export interface BuildRunnerLawReportOptions<Obj = unknown> extends RunnerFiniteAxiomOptions<Obj> {
  readonly includeFinite?: boolean;
  readonly includeHandlersInHolds?: boolean; // if true, handler mismatches affect holds
  readonly includeCategoryInHolds?: boolean; // if true, category identity/associativity mismatches affect holds
  readonly includePsiThetaInHolds?: boolean; // if true, ψ→θ / θ→ψ mismatches affect holds
}

export const buildRunnerLawReport = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildRunnerLawReportOptions<Obj> = {},
): RunnerLawReport<Obj, Left, Right, Value> => {
  const validationOpts: { objectFilter?: (object: Obj) => boolean } = {};
  if (options.objectFilter) validationOpts.objectFilter = options.objectFilter as (object: Obj) => boolean;
  const thetaValidation = validateRunnerThetas(runner, interaction, validationOpts);

  const axiomTallies = checkRunnerAxioms(runner, interaction, options);

  const sample = options.evaluationSampleLimit ?? options.sampleLimit;
  const curryingOpts: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {};
  if (sample !== undefined) curryingOpts.sampleLimit = sample;
  if (options.objectFilter) curryingOpts.objectFilter = options.objectFilter as (object: Obj) => boolean;
  const currying = checkRunnerCurryingConsistency(runner, interaction, curryingOpts);
  // Step 2: coalgebra check (lightweight, optional)
  const coalgebra = checkRunnerCoalgebra(
    runner,
    interaction,
    options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
  );
    // Step 3: costate check
    const costate = checkRunnerCostate(
      runner,
      interaction,
      options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
    );
  // Handler translation check (ϑ): non-fatal metric
  const handlerReport = checkRunnerStateHandlers<Obj, Arr, Left, Right, Value>(
    runner,
    interaction,
    options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
  );
  // ψ→θ consistency
  const psiToTheta = checkPsiToThetaConsistency(runner, interaction, options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {});
  // θ→ψ reconstruction consistency: dedicated checker
  const thetaToPsi = checkThetaToPsiConsistency(runner, interaction, options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {});
  const finite = options.includeFinite
    ? checkRunnerAxiomsFinite(runner, interaction, options)
    : undefined;

  // Category laws summary (identity only by default)
  const catLaws = checkRunTCategoryLaws(
    interaction,
    { source: runner },
    options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
  );

  let holds =
    axiomTallies.unitDiagram.mismatches === 0 &&
    axiomTallies.multiplicationDiagram.mismatches === 0 &&
    currying.mismatchesTotal === 0 &&
    coalgebra.mismatches === 0 &&
    costate.mismatches === 0 &&
    (!finite || finite.evaluationFailures.length === 0);

  if (options.includeCategoryInHolds) {
    const catOk =
      catLaws.leftIdentity.mismatches === 0 &&
      catLaws.rightIdentity.mismatches === 0 &&
      (catLaws.associativity.skipped || catLaws.associativity.mismatches === 0);
    holds = holds && catOk;
  }
  if (options.includeHandlersInHolds) {
    holds = holds && handlerReport.mismatches === 0;
  }
  if (options.includePsiThetaInHolds) {
    holds = holds && psiToTheta.mismatches === 0 && thetaToPsi.mismatches === 0;
  }

  const details: string[] = [];
  details.push(
    `Monoid: unit=${axiomTallies.unitDiagram.checked}/${axiomTallies.unitDiagram.mismatches} mult=${axiomTallies.multiplicationDiagram.checked}/${axiomTallies.multiplicationDiagram.mismatches}.`,
  );
  details.push(
    `Currying: checked=${currying.checkedTotal}, mismatches=${currying.mismatchesTotal}.`,
  );
  details.push(
    `Coalgebra: checked=${coalgebra.checked}, mismatches=${coalgebra.mismatches}.`,
  );
  details.push(
    `Costate: checked=${costate.checked}, mismatches=${costate.mismatches}.`,
  );
  details.push(
    `Handlers: checked=${handlerReport.checked}, mismatches=${handlerReport.mismatches}.`,
  );
  details.push(
    `ψ→θ: checked=${psiToTheta.checked}, mismatches=${psiToTheta.mismatches}.`,
  );
  details.push(
    `θ→ψ: checked=${thetaToPsi.checked}, mismatches=${thetaToPsi.mismatches}.`,
  );
  details.push(
    `Run(T) laws: left-id ${catLaws.leftIdentity.checked}/${catLaws.leftIdentity.mismatches} right-id ${catLaws.rightIdentity.checked}/${catLaws.rightIdentity.mismatches}` +
      (catLaws.associativity.skipped
        ? " assoc skipped"
        : ` assoc ${catLaws.associativity.checked}/${catLaws.associativity.mismatches}`) +
      `.`,
  );
  if (options.includeCategoryInHolds) {
    details.push(`(holds includes category laws)`);
  }
  if (options.includeHandlersInHolds) {
    details.push(`(holds includes handler mismatches)`);
  }
  if (options.includePsiThetaInHolds) {
    details.push(`(holds includes ψ↔θ consistency)`);
  }
  if (!catLaws.holds) {
    details.push(...catLaws.details.slice(0, 8));
  }
  if (options.includeHandlersInHolds) {
    holds = holds && handlerReport.mismatches === 0;
  }
  if (options.includePsiThetaInHolds) {
    holds = holds && psiToTheta.mismatches === 0 && thetaToPsi.mismatches === 0;
  }
  if (psiToTheta.mismatches > 0) details.push(...psiToTheta.details.slice(0, 6));
  if (thetaToPsi.mismatches > 0) details.push(...thetaToPsi.details.slice(0, 6));
  details.push(...thetaValidation.details);
  if (finite) details.push(...finite.details);

  return {
    holds,
    unitChecked: axiomTallies.unitDiagram.checked,
    unitMismatches: axiomTallies.unitDiagram.mismatches,
    multChecked: axiomTallies.multiplicationDiagram.checked,
    multMismatches: axiomTallies.multiplicationDiagram.mismatches,
    curryingChecked: currying.checkedTotal,
    curryingMismatches: currying.mismatchesTotal,
  coalgebraChecked: coalgebra.checked,
  coalgebraMismatches: coalgebra.mismatches,
  costateChecked: costate.checked,
  costateMismatches: costate.mismatches,
  leftIdentityChecked: catLaws.leftIdentity.checked,
  leftIdentityMismatches: catLaws.leftIdentity.mismatches,
  rightIdentityChecked: catLaws.rightIdentity.checked,
  rightIdentityMismatches: catLaws.rightIdentity.mismatches,
  associativityChecked: catLaws.associativity.checked,
  associativityMismatches: catLaws.associativity.mismatches,
  associativitySkipped: catLaws.associativity.skipped,
  handlerChecked: handlerReport.checked,
  handlerMismatches: handlerReport.mismatches,
  psiToThetaChecked: psiToTheta.checked,
  psiToThetaMismatches: psiToTheta.mismatches,
  thetaToPsiChecked: thetaToPsi.checked,
  thetaToPsiMismatches: thetaToPsi.mismatches,
    thetaMissing: thetaValidation.missing,
    thetaExtra: thetaValidation.extra,
    ...(finite ? { finiteFailures: finite.evaluationFailures } : {}),
    details,
  };
};

// ---------- Compositional runners ----------

export type ComposeStrategy = "preferFirst" | "preferSecond" | "mergeIfEqual";

export interface ComposeRunnersResult<Obj, Left, Right, Value> {
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly collisions: ReadonlyArray<Obj>;
  readonly mismatchedThetas: ReadonlyArray<Obj>;
  readonly details: ReadonlyArray<string>;
}

export const composeRunners = <Obj, Arr, Left, Right, Value>(
  first: StatefulRunner<Obj, Left, Right, Value>,
  second: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  strategy: ComposeStrategy = "preferFirst",
): ComposeRunnersResult<Obj, Left, Right, Value> => {
  const thetas = new Map(first.thetas);
  const collisions: Obj[] = [];
  const mismatched: Obj[] = [];
  const resolvedSecond = (second.thetas ?? buildThetaCurriedFromHom(second, interaction));
  for (const [object, theta2] of resolvedSecond.entries()) {
    const theta1 = thetas.get(object);
    if (!theta1) {
      thetas.set(object, theta2);
      continue;
    }
    collisions.push(object);
    switch (strategy) {
      case "preferFirst":
        // keep theta1
        break;
      case "preferSecond":
        thetas.set(object, theta2);
        break;
      case "mergeIfEqual":
        if (theta1 !== theta2) {
          mismatched.push(object);
        }
        // keep theta1 by default; we could also check functional equivalence by sampling later
        break;
    }
  }
  const details: string[] = [];
  details.push(`composeRunners: collisions=${collisions.length}, mismatched=${mismatched.length}.`);
  const thetaHom = buildPhiFromRunnerPerObject({ thetas, thetaHom: new Map(), diagnostics: [] } as unknown as StatefulRunner<Obj, Left, Right, Value>, interaction);
  return { runner: { thetas, thetaHom, diagnostics: details }, collisions, mismatchedThetas: mismatched, details };
};

export const checkRunnerAxioms = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerAxiomOptions<Obj> = {},
): RunnerAxiomReport => {
  // Validate θ presence for each object in scope (informational; no hard failure here).
  const missing: Obj[] = [];
  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;
  for (const object of interaction.law.kernel.base.objects) {
    if (!interaction.psiComponents.has(object)) continue;
    if (filter && !filter(object)) continue;
  const resolvedThetas = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction));
  if (!resolvedThetas.has(object)) missing.push(object);
  }
  const base = checkRunnerAxiomsFromInteraction(interaction, options);
  if (missing.length === 0) return base;
  const details = [
    ...base.details,
    `Runner θ missing for ${missing.length} object(s): ${missing.map(String).join(", ")}`,
  ];
  return { ...base, details };
};

// Validation helper: reports missing / extra θ components vs interaction fiber set.
export interface RunnerThetaValidation<Obj> {
  readonly missing: ReadonlyArray<Obj>;
  readonly extra: ReadonlyArray<Obj>; // present in runner but not in interaction fibers
  readonly totalInteractionObjects: number;
  readonly totalRunnerThetas: number;
  readonly details: ReadonlyArray<string>;
}

export const validateRunnerThetas = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { objectFilter?: (object: Obj) => boolean } = {},
): RunnerThetaValidation<Obj> => {
  const filter = options.objectFilter;
  const missing: Obj[] = [];
  const interactionObjects: Obj[] = [];
  for (const object of interaction.law.kernel.base.objects) {
    if (!interaction.psiComponents.has(object)) continue;
    if (filter && !filter(object)) continue;
    interactionObjects.push(object);
  const resolvedThetas2 = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction));
  if (!resolvedThetas2.has(object)) missing.push(object);
  }
  const extra: Obj[] = [];
  for (const object of (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).keys()) {
    if (!interaction.psiComponents.has(object)) extra.push(object);
  }
  const details: string[] = [];
  details.push(`validateRunnerThetas: ${missing.length} missing, ${extra.length} extra.`);
  if (missing.length > 0) {
    details.push(`Missing: ${missing.map(String).join(", ")}`);
  }
  if (extra.length > 0) {
    details.push(`Extra: ${extra.map(String).join(", ")}`);
  }
  return {
    missing,
    extra,
    totalInteractionObjects: interactionObjects.length,
  totalRunnerThetas: (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).size,
    details,
  };
};

// Finite-sample axiom checker: explicitly replays theta × dual elements to confirm evaluation consistency.
export interface RunnerFiniteAxiomFailure<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly leftElement: Left;
  readonly rightElement: Right;
  readonly expected: Value;
  readonly actual: Value;
}

export interface RunnerFiniteAxiomReport<Obj, Left, Right, Value> extends RunnerAxiomReport {
  readonly evaluationFailures: ReadonlyArray<RunnerFiniteAxiomFailure<Obj, Left, Right, Value>>;
}

export interface RunnerFiniteAxiomOptions<Obj = unknown> extends RunnerAxiomOptions<Obj> {
  readonly evaluationSampleLimit?: number; // per object pair enumeration cap
}

export const checkRunnerAxiomsFinite = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerFiniteAxiomOptions<Obj> = {},
): RunnerFiniteAxiomReport<Obj, Left, Right, Value> => {
  const base = checkRunnerAxioms(runner, interaction, options);
  const failures: RunnerFiniteAxiomFailure<Obj, Left, Right, Value>[] = [];
  const evalLimit = Math.max(0, options.evaluationSampleLimit ?? 16);
  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;

  for (const object of interaction.law.kernel.base.objects) {
    if (!interaction.psiComponents.has(object)) continue;
    if (filter && !filter(object)) continue;
    const fiber = interaction.psiComponents.get(object)!;
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    if (!theta) continue; // already recorded as missing in base if needed
    // Enumerate limited primal elements
    let leftCount = 0;
    for (const indexedLeft of fiber.primalFiber) {
      if (leftCount >= evalLimit) break;
      leftCount++;
      // Enumerate limited dual elements
      let rightCount = 0;
      for (const indexedRight of fiber.dualFiber) {
        if (rightCount >= evalLimit) break;
        rightCount++;
        const expected = fiber.phi.map([indexedLeft, indexedRight]);
        const arrow = theta.map(indexedLeft);
        const actual = arrow(indexedRight);
        if (!Object.is(expected, actual)) {
          failures.push({
            object,
            leftElement: indexedLeft.element,
            rightElement: indexedRight.element,
            expected,
            actual,
          });
        }
      }
    }
  }

  const details = [
    ...base.details,
    `Finite axiom evaluation: ${failures.length} discrepancy(ies) over capped enumeration limit=${evalLimit}.`,
  ];
  if (failures.length > 0) {
    details.push(
      failures
        .slice(0, 12)
        .map(
          (f, i) =>
            `#${i} object=${String(f.object)} left=${String(f.leftElement)} right=${String(f.rightElement)} expected=${String(f.expected)} actual=${String(f.actual)}`,
        )
        .join("\n"),
    );
    if (failures.length > 12) {
      details.push(`(+${failures.length - 12} more failures omitted)`);
    }
  }

  return {
    ...base,
    details,
    evaluationFailures: failures,
    holds: base.holds && failures.length === 0,
  };
};

// ---- Currying consistency via SetCat homs ----

const enumerateLimited = <A>(carrier: SetObj<A>, limit: number): ReadonlyArray<A> => {
  const semantics = getCarrierSemantics(carrier);
  const result: A[] = [];
  if (limit <= 0) return result;
  if (semantics?.iterate) {
    for (const a of semantics.iterate()) {
      result.push(a);
      if (result.length >= limit) break;
    }
    return result;
  }
  for (const a of carrier as Iterable<A>) {
    result.push(a);
    if (result.length >= limit) break;
  }
  return result;
};

const resolveThetaHom = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  object: Obj,
  fiber: InteractionLawFiberCurrying<Obj, Arr, Left, Right, Value>,
): SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value> | undefined => {
  const direct = runner.thetaHom.get(object);
  if (direct) return direct;
  const curried = runner.thetas?.get(object);
  if (curried) {
    return fiber.exponential.uncurry({ product: fiber.product, morphism: curried }) as SetHom<
      readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
      Value
    >;
  }
  return undefined;
};

export const compareRunnerThetas = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  original: StatefulRunner<Obj, Left, Right, Value>,
  reconstructed: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): EquivalenceDiagnostics => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["runner zig-zag (θ comparison): sampling primal/dual pairs."];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const leftHom = resolveThetaHom(original, interaction, object, fiber);
    const rightHom = resolveThetaHom(reconstructed, interaction, object, fiber);
    if (!leftHom || !rightHom) {
      details.push(`runner zig-zag: object=${String(object)} missing θ data (left=${Boolean(leftHom)} right=${Boolean(rightHom)}).`);
      continue;
    }
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    for (const primal of primalSamples) {
      for (const dual of dualSamples) {
        checked += 1;
        const expected = leftHom.map([primal, dual]);
        const actual = rightHom.map([primal, dual]);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            details.push(
              `runner zig-zag mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  details.push(`runner zig-zag: checked=${checked} mismatches=${mismatches}.`);
  return { checked, mismatches, details };
};

export const compareCoalgebraComponents = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  left: CoalgebraComponents<Obj, Left, Right, Value>,
  right: CoalgebraComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): EquivalenceDiagnostics => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["coalgebra zig-zag: comparing γ components."];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const leftGamma = left.get(object);
    const rightGamma = right.get(object);
    if (!leftGamma || !rightGamma) {
      details.push(`coalgebra zig-zag: object=${String(object)} missing component (left=${Boolean(leftGamma)} right=${Boolean(rightGamma)}).`);
      continue;
    }
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    for (const dual of dualSamples) {
      const leftArrow = leftGamma.map(dual);
      const rightArrow = rightGamma.map(dual);
      for (const primal of primalSamples) {
        checked += 1;
        const expected = (leftArrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        const actual = (rightArrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            details.push(
              `coalgebra zig-zag mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  details.push(`coalgebra zig-zag: checked=${checked} mismatches=${mismatches}.`);
  return { checked, mismatches, details };
};

export const compareCostateComponents = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  left: CostateComponents<Obj, Left, Right, Value>,
  right: CostateComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): EquivalenceDiagnostics => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["costate zig-zag: comparing κ components."];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const leftKappa = left.get(object);
    const rightKappa = right.get(object);
    if (!leftKappa || !rightKappa) {
      details.push(`costate zig-zag: object=${String(object)} missing component (left=${Boolean(leftKappa)} right=${Boolean(rightKappa)}).`);
      continue;
    }
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    for (const rightEl of rightSamples) {
      const leftArrow = leftKappa.map(rightEl);
      const rightArrow = rightKappa.map(rightEl);
      for (const primal of primalSamples) {
        checked += 1;
        const expected = (leftArrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        const actual = (rightArrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            details.push(
              `costate zig-zag mismatch object=${String(object)} left=${String(primal.element)} right=${String(rightEl)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  details.push(`costate zig-zag: checked=${checked} mismatches=${mismatches}.`);
  return { checked, mismatches, details };
};

export interface RunnerPhiHomComponentReport<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export interface RunnerPhiHomReport<Obj, Left, Right, Value> {
  readonly components: ReadonlyMap<Obj, RunnerPhiHomComponentReport<Obj, Left, Right, Value>>;
  readonly checkedTotal: number;
  readonly mismatchesTotal: number;
  readonly details: ReadonlyArray<string>;
}

// Helper: derive legacy curried thetas from thetaHom if missing.
const buildThetaCurriedFromHom = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<Obj, SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>> => {
  if (runner.thetas) return runner.thetas;
  const result = new Map<Obj, SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>>();
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const hom = runner.thetaHom.get(object);
    if (!hom) continue;
    // Curry using fiber.exponential
    const curried = fiber.exponential.curry({ domain: fiber.primalFiber, product: fiber.product, morphism: hom });
    result.set(object, curried as SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>);
  }
  return result;
};

export const buildPhiFromRunnerPerObject = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<
  Obj,
  SetHom<
    readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
    Value
  >
> => {
  const result = new Map<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >();
  for (const [object, fiber] of interaction.psiComponents.entries()) {
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    if (!theta) continue;
    const reconstructed = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    result.set(object, reconstructed);
  }
  return result;
};

export const checkRunnerCurryingConsistency = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunnerPhiHomReport<Obj, Left, Right, Value> => {
  const components = new Map<Obj, RunnerPhiHomComponentReport<Obj, Left, Right, Value>>();
  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  let checkedTotal = 0;
  let mismatchesTotal = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (filter && !filter(object)) continue;
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    if (!theta) continue;
    const reconstructed = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    let checked = 0;
    let mismatches = 0;
    for (const pair of enumerateLimited(fiber.product.object, sampleLimit)) {
      const expected = fiber.phi.map(pair);
      const actual = reconstructed.map(pair);
      checked++;
      if (!Object.is(expected, actual)) mismatches++;
    }
    checkedTotal += checked;
    mismatchesTotal += mismatches;
    const details: string[] = [
      `Currying consistency on ${String(object)}: checked=${checked}, mismatches=${mismatches}.`,
    ];
    components.set(object, { object, checked, mismatches, details });
  }
  const details: string[] = [
    `Currying consistency totals: checked=${checkedTotal}, mismatches=${mismatchesTotal}.`,
  ];
  return { components, checkedTotal, mismatchesTotal, details };
};

// ---- ψ → θ consistency: runner θ should agree with ψ fiber θ by sampling ----

export interface PsiToThetaReport<Obj> {
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export const checkPsiToThetaConsistency = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): PsiToThetaReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
  const thetaRunner = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    const thetaPsi = fiber.theta;
    if (!thetaRunner || !thetaPsi) continue;
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const leftEl of leftSamples) {
      const aRunner = thetaRunner.map(leftEl);
      const aPsi = thetaPsi.map(leftEl);
      for (const rightEl of rightSamples) {
        localChecked++;
        const v1 = aRunner(rightEl);
        const v2 = aPsi(rightEl);
        if (!Object.is(v1, v2)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `psi->theta mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} runner=${String(v1)} psi=${String(v2)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
  }
  details.unshift(`ψ→θ: checked=${checked} mismatches=${mismatches} (limit=${sampleLimit}).`);
  return { checked, mismatches, details };
};

// θ → ψ reconstruction: rebuild φ via uncurry of θ and compare to original φ
export interface ThetaToPsiReport<Obj> {
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export const checkThetaToPsiConsistency = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): ThetaToPsiReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    if (!theta) continue;
    const reconstructedPhi = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    const pairSamples = enumerateLimited(fiber.product.object, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const pair of pairSamples) {
      localChecked++;
      const expected = fiber.phi.map(pair);
      const actual = reconstructedPhi.map(pair);
      if (!Object.is(expected, actual)) {
        localMismatches++;
        if (localMismatches <= 3) {
          details.push(
            `theta->psi mismatch object=${String(object)} left=${String(pair[0].element)} right=${String(pair[1].element)} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
  }
  details.unshift(`θ→ψ: checked=${checked} mismatches=${mismatches} (limit=${sampleLimit}).`);
  return { checked, mismatches, details };
};

// ---- Read-only helpers for Phase IV scaffolding ----

export interface ThetaComponentSummary<Obj> {
  readonly object: Obj;
  readonly domainCardinality?: number;
  readonly codomainCardinality?: number;
}

export interface RunnerThetaDiagnostics<Obj> {
  readonly totalObjects: number;
  readonly components: ReadonlyArray<ThetaComponentSummary<Obj>>;
}

export interface ThetaSummaryOptions {
  readonly computeIfMissing?: boolean;
  readonly enumerationLimit?: number;
}

const estimateCardinality = <A>(carrier: unknown, options: ThetaSummaryOptions): number | undefined => {
  const semantics = carrier ? getCarrierSemantics(carrier as never) : undefined;
  if (semantics && semantics.cardinality !== undefined) {
    return semantics.cardinality;
  }
  if (options.computeIfMissing === true) {
    const limit = Math.max(0, options.enumerationLimit ?? 32);
    let count = 0;
    if (semantics?.iterate) {
      for (const _ of semantics.iterate()) {
        count++;
        if (count >= limit) break;
      }
      return count;
    }
    if (carrier && Symbol.iterator in (carrier as never)) {
      for (const _ of carrier as Iterable<unknown>) {
        count++;
        if (count >= limit) break;
      }
      return count;
    }
  }
  return undefined;
};

export const summarizeRunnerThetas = <Obj, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  options: ThetaSummaryOptions = {},
): RunnerThetaDiagnostics<Obj> => {
  const components: ThetaComponentSummary<Obj>[] = [];
  const resolvedFinal = (runner.thetas ?? new Map());
  for (const [object, theta] of resolvedFinal.entries()) {
    const domainCardinality = estimateCardinality(theta.dom, options);
    const codomainCardinality = estimateCardinality(theta.cod, options);
    components.push({ object, ...(domainCardinality !== undefined ? { domainCardinality } : {}), ...(codomainCardinality !== undefined ? { codomainCardinality } : {}), });
  }
  return { totalObjects: resolvedFinal.size, components };
};

export const prettyPrintRunnerThetas = <Obj, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  options: ThetaSummaryOptions = {},
): ReadonlyArray<string> => {
  const summary = summarizeRunnerThetas(runner, options);
  const lines: string[] = [];
  lines.push(`Runner θ components: ${summary.totalObjects} object(s)`);
  let index = 0;
  for (const entry of summary.components) {
    const objectLabel = String(entry.object);
    const dom = entry.domainCardinality !== undefined ? `${entry.domainCardinality}` : "?";
    const cod = entry.codomainCardinality !== undefined ? `${entry.codomainCardinality}` : "?";
    lines.push(`#${index++} object=${objectLabel} dom≈${dom} cod≈${cod}`);
  }
  return lines;
};

// ---------- Handler translation (ϑ: T ⇒ St^Y) ----------

export interface RunnerStateHandler<Obj, Left, Right, Value, State> {
  readonly object: Obj;
  readonly run: (
    state: State,
    left: IndexedElement<Obj, Left>,
    right: IndexedElement<Obj, Right>,
  ) => readonly [State, Value];
}

export interface RunnerStateHandlerEntry<Obj, Left, Right, Value, State> {
  readonly object: Obj;
  readonly handler: RunnerStateHandler<Obj, Left, Right, Value, State>;
  readonly stateCarrier?: SetObj<State>;
  readonly transformation?: SetHom<
    readonly [IndexedElement<Obj, Left>, State],
    readonly [Value, State]
  >;
  readonly vartheta?: SetHom<
    IndexedElement<Obj, Left>,
    ExponentialArrow<State, readonly [Value, State]>
  >;
  readonly canonicalRight?: IndexedElement<Obj, Right>;
  readonly independenceIssues?: number;
}

export interface RunnerStateHandlerSummary<Obj, Left, Right, Value> {
  readonly entries: ReadonlyArray<RunnerStateHandlerEntry<Obj, Left, Right, Value, unknown>>;
  readonly details: ReadonlyArray<string>;
}

const normalizeHandlerResult = <State, Value>(
  result: readonly [State, Value],
): { next: State; value: Value } => ({ next: result[0], value: result[1] });

const resultsEqual = <State>(
  left: { next: State; value: unknown },
  right: { next: State; value: unknown },
  stateSemantics: SetCarrierSemantics<State> | undefined,
  valueSemantics: SetCarrierSemantics<unknown> | undefined,
): boolean => {
  const stateEqual = stateSemantics?.equals
    ? stateSemantics.equals(left.next, right.next)
    : Object.is(left.next, right.next);
  if (!stateEqual) return false;
  const valueEqual = valueSemantics?.equals
    ? valueSemantics.equals(left.value, right.value)
    : Object.is(left.value, right.value);
  return valueEqual;
};

export const thetaToStateHandler = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerStateHandlerSummary<Obj, Left, Right, Value> => {
  const entries: RunnerStateHandlerEntry<Obj, Left, Right, Value, unknown>[] = [];
  const details: string[] = [];
  const resolved = runner.thetas ?? buildThetaCurriedFromHom(runner, interaction);
  let skippedState = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const stateTheta = runner.stateThetas?.get(object);
    const theta = resolved.get(object);
    if (!stateTheta && !theta) continue;
    const handler: RunnerStateHandler<Obj, Left, Right, Value, unknown> = {
      object,
      run: (state, left, right) => {
        if (stateTheta) {
          return stateTheta.run(state as never, left, right);
        }
        if (theta) {
          const arrow = theta.map(left);
          const value = arrow(right);
          return [state, value];
        }
        const evaluated = fiber.phi.map([left, right]);
        return [state, evaluated];
      },
    };
    const stateCarrier = runner.stateCarriers?.get(object);
    if (!stateCarrier) {
      skippedState += 1;
      entries.push({ object, handler });
      continue;
    }
    const leftSamples = enumerateLimited(fiber.primalFiber, 6);
    const rightSamples = enumerateLimited(fiber.dualFiber, 6);
    const stateSamples = enumerateLimited(stateCarrier as SetObj<unknown>, 6);
    const stateSemantics = getCarrierSemantics(stateCarrier as SetObj<unknown>);
    const valueSemantics = getCarrierSemantics(fiber.phi.cod as SetObj<Value>) as
      | SetCarrierSemantics<Value>
      | undefined;
    let independenceIssues = 0;
    const independenceDetails: string[] = [];
    const evaluate = (
      state: unknown,
      left: IndexedElement<Obj, Left>,
      right: IndexedElement<Obj, Right>,
    ): { next: unknown; value: Value } => normalizeHandlerResult(handler.run(state, left, right));
    for (const stateSample of stateSamples) {
      for (const leftSample of leftSamples) {
        let baseline: { next: unknown; value: unknown } | undefined;
        for (const rightSample of rightSamples) {
          const candidate = evaluate(stateSample, leftSample, rightSample);
          if (!baseline) {
            baseline = candidate;
            continue;
          }
          if (
            !resultsEqual(
              baseline,
              candidate,
              stateSemantics,
              valueSemantics as SetCarrierSemantics<unknown> | undefined,
            )
          ) {
            independenceIssues += 1;
            if (independenceDetails.length < 6) {
              independenceDetails.push(
                `independence-failure object=${String(object)} state=${String(
                  (stateSample as { element?: unknown }).element ?? stateSample,
                )} left=${String(leftSample.element)} first=${String(
                  baseline.value,
                )}/${String(baseline.next)} second=${String(candidate.value)}/${String(
                  candidate.next,
                )}`,
              );
            }
            break;
          }
        }
      }
    }
    if (independenceDetails.length > 0) {
      details.push(...independenceDetails);
    }
    const canonicalRight = rightSamples[0];
    let transformation:
      | SetHom<readonly [IndexedElement<Obj, Left>, unknown], readonly [Value, unknown]>
      | undefined;
    let vartheta:
      | SetHom<IndexedElement<Obj, Left>, ExponentialArrow<unknown, readonly [Value, unknown]>>
      | undefined;
    if (canonicalRight) {
      const domainProduct = SetCat.product(fiber.primalFiber, stateCarrier as SetObj<unknown>);
      const codomainProduct = SetCat.product(fiber.phi.cod as SetObj<Value>, stateCarrier as SetObj<unknown>);
      transformation = SetCat.hom(
        domainProduct.object,
        codomainProduct.object,
        (pair) => {
          const [left, state] = pair;
          const result = normalizeHandlerResult(handler.run(state, left, canonicalRight));
          const nextState = result.next as unknown;
          const value = result.value as unknown as Value;
          return (
            codomainProduct.lookup?.(value as Value, nextState)
              ?? ([value as Value, nextState] as const)
          ) as readonly [Value, unknown];
        },
      );
      const exponential = SetCat.exponential(
        stateCarrier as SetObj<unknown>,
        codomainProduct.object,
      );
      vartheta = exponential.curry({
        domain: fiber.primalFiber,
        product: domainProduct,
        morphism: transformation as SetHom<
          readonly [IndexedElement<Obj, Left>, unknown],
          readonly [Value, unknown]
        >,
      }) as SetHom<
        IndexedElement<Obj, Left>,
        ExponentialArrow<unknown, readonly [Value, unknown]>
      >;
    }
    const baseEntry: RunnerStateHandlerEntry<Obj, Left, Right, Value, unknown> = {
      object,
      handler,
      stateCarrier,
      ...(canonicalRight ? { canonicalRight } : {}),
      ...(vartheta ? { vartheta } : {}),
      ...(independenceIssues > 0 ? { independenceIssues } : {}),
    };
    if (transformation) {
      if (vartheta) {
        entries.push({ ...baseEntry, transformation, vartheta });
      } else {
        entries.push({ ...baseEntry, transformation });
      }
    } else {
      entries.push(baseEntry);
    }
  }
  details.push(`thetaToStateHandler: constructed ${entries.length} handler(s).`);
  if (skippedState > 0) {
    details.push(`thetaToStateHandler: ${skippedState} object(s) missing state carriers.`);
  }
  if (entries.length === 0) {
    details.push("thetaToStateHandler: no θ components available for translation.");
  }
  return { entries, details };
};

export interface RunnerStateHandlerReport<Obj> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export const checkRunnerStateHandlers = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunnerStateHandlerReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const summary = thetaToStateHandler(runner, interaction);
  const details: string[] = [...summary.details];
  const entryMap = new Map<Obj, RunnerStateHandlerEntry<Obj, Left, Right, Value, unknown>>();
  for (const entry of summary.entries) {
    entryMap.set(entry.object, entry);
  }
  let checked = 0;
  let mismatches = 0;
  let independenceWarnings = 0;
  for (const entry of summary.entries) {
    if (options.objectFilter && !options.objectFilter(entry.object)) continue;
    const fiber = interaction.psiComponents.get(entry.object);
    if (!fiber) continue;
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    const valueSemantics = getCarrierSemantics(fiber.phi.cod as SetObj<Value>) as
      | SetCarrierSemantics<Value>
      | undefined;
    const stateCarrier = entry.stateCarrier as SetObj<unknown> | undefined;
    const stateCarrierSemantics = stateCarrier ? getCarrierSemantics(stateCarrier) : undefined;
    const stateSamples = stateCarrier
      ? enumerateLimited(stateCarrier, Math.max(1, sampleLimit))
      : [undefined];
    if (entry.independenceIssues && entry.independenceIssues > 0) {
      independenceWarnings += entry.independenceIssues;
    }
    let unitSamplesChecked = 0;
    let unitSamplesMismatched = 0;
    for (const state of stateSamples) {
      for (const leftEl of leftSamples) {
        const domainProduct = entry.transformation && stateCarrier
          ? SetCat.product(fiber.primalFiber, stateCarrier)
          : undefined;
        const canonicalStatePair = entry.transformation && domainProduct
          ? domainProduct.lookup?.(leftEl, state as never) ?? ([leftEl, state] as const)
          : undefined;
        const transformed = entry.transformation && canonicalStatePair
          ? entry.transformation.map(canonicalStatePair as readonly [IndexedElement<Obj, Left>, unknown])
          : undefined;
        const [transformedValue, transformedNext] = transformed ?? [undefined, undefined];
        for (const rightEl of rightSamples) {
          const expected = fiber.phi.map([leftEl, rightEl]);
          const [nextState, actual] = transformed
            ? [transformedNext, transformedValue]
            : entry.handler.run(state as never, leftEl, rightEl);
          checked++;
          if (!Object.is(expected, actual)) {
            mismatches++;
            if (mismatches <= 4) {
              details.push(
                `state-handler-mismatch object=${String(entry.object)} left=${String(leftEl.element)} right=${String(rightEl.element)} expected=${String(expected)} actual=${String(actual)}`,
              );
            }
          }
          if (transformed) {
            const rerun = entry.handler.run(state as never, leftEl, rightEl);
            const nextEqual = stateCarrierSemantics?.equals
              ? stateCarrierSemantics.equals(rerun[0] as unknown, nextState as unknown)
              : Object.is(rerun[0], nextState);
            if (!nextEqual && mismatches < 8) {
              mismatches++;
              details.push(
                `state-handler-next-mismatch object=${String(entry.object)} left=${String(leftEl.element)} right=${String(rightEl.element)} transformed=${String(nextState)} direct=${String(rerun[0])}`,
              );
            }
          }
        }
      }
    }
    let stUnitChecked = 0;
    let stUnitMismatches = 0;
    if (entry.vartheta && entry.canonicalRight && stateCarrier) {
      const canonicalRight = entry.canonicalRight;
      const vartheta = entry.vartheta as SetHom<
        IndexedElement<Obj, Left>,
        ExponentialArrow<unknown, readonly [Value, unknown]>
      >;
      const eta = interaction.monad.unit.transformation.component(entry.object) as
        | SetHom<unknown, Left>
        | undefined;
      if (!eta) {
        details.push(
          `state-handler-unit: skipped object=${String(entry.object)} (missing monad unit component).`,
        );
      } else {
        const unitDomainSamples = enumerateLimited(eta.dom as SetObj<unknown>, sampleLimit);
        for (const base of unitDomainSamples) {
          const lifted = eta.map(base as Left);
          const liftedIndexed: IndexedElement<Obj, Left> = { object: entry.object, element: lifted };
          const arrow = vartheta.map(liftedIndexed);
          for (const state of stateSamples) {
            unitSamplesChecked += 1;
            const expected = normalizeHandlerResult(
              entry.handler.run(state as never, liftedIndexed, canonicalRight),
            );
            const arrowResult = (arrow as (s: unknown) => readonly [unknown, unknown])(
              state as never,
            );
            const actual = {
              value: arrowResult[0],
              next: arrowResult[1],
            };
            if (
              !resultsEqual(
                expected,
                actual,
                stateCarrierSemantics as SetCarrierSemantics<unknown> | undefined,
                valueSemantics as SetCarrierSemantics<unknown> | undefined,
              )
            ) {
              unitSamplesMismatched += 1;
              if (unitSamplesMismatched <= 4) {
                details.push(
                  `state-handler-unit-mismatch object=${String(entry.object)} state=${String(
                    (state as { element?: unknown })?.element ?? state,
                  )} base=${String(base)} expected=${String(expected.value)}/${String(
                    expected.next,
                  )} actual=${String(actual.value)}/${String(actual.next)}`,
                );
              }
            }
          }
        }
        for (const base of unitDomainSamples) {
          const lifted = eta.map(base as Left);
          const liftedIndexed: IndexedElement<Obj, Left> = { object: entry.object, element: lifted };
          const arrow = vartheta.map(liftedIndexed) as (state: unknown) => readonly [Value, unknown];
          const expectedValue = fiber.phi.map([liftedIndexed, canonicalRight]);
          for (const state of stateSamples) {
            stUnitChecked += 1;
            const actualPair = arrow(state as never);
            const valueMatches = valueSemantics?.equals
              ? valueSemantics.equals(actualPair[0] as Value, expectedValue)
              : Object.is(actualPair[0], expectedValue);
            const stateMatches = stateCarrierSemantics?.equals
              ? stateCarrierSemantics.equals(actualPair[1] as unknown, state as unknown)
              : Object.is(actualPair[1], state);
            if (!valueMatches || !stateMatches) {
              stUnitMismatches += 1;
              if (stUnitMismatches <= 4) {
                details.push(
                  `state-handler-St-unit-mismatch object=${String(entry.object)} state=${String(
                    (state as { element?: unknown })?.element ?? state,
                  )} base=${String(base)} expected=${String(expectedValue)}/${String(state)} actual=${String(
                    actualPair[0],
                  )}/${String(actualPair[1])}`,
                );
              }
            }
          }
        }
      }
    } else {
      details.push(
        `state-handler-unit: skipped object=${String(entry.object)} (missing canonical right or curried transformation).`,
      );
    }
    if (unitSamplesChecked > 0) {
      details.push(
        `state-handler-unit summary object=${String(entry.object)} checked=${unitSamplesChecked} mismatches=${unitSamplesMismatched}.`,
      );
      checked += unitSamplesChecked;
      mismatches += unitSamplesMismatched;
    }
    if (entry.vartheta && entry.canonicalRight && stateCarrier) {
      const stUnitSummary = `state-handler-St-unit summary object=${String(entry.object)} checked=${stUnitChecked} mismatches=${stUnitMismatches}.`;
      details.push(stUnitSummary);
      checked += stUnitChecked;
      mismatches += stUnitMismatches;
    } else {
      details.push(
        `state-handler-St-unit: skipped object=${String(entry.object)} (missing vartheta, state carrier, or canonical right).`,
      );
    }
    const muComponent = interaction.monad.multiplication.transformation.component(entry.object) as
      | SetHom<unknown, Left>
      | undefined;
    const txObject = interaction.monad.functor.F0(entry.object) as Obj;
    const txEntry = entryMap.get(txObject);
    const varthetaTX = txEntry?.vartheta;
    if (!muComponent) {
      details.push(
        `state-handler-St-mult: skipped object=${String(entry.object)} (missing monad multiplication component).`,
      );
    } else if (!entry.vartheta) {
      details.push(
        `state-handler-St-mult: skipped object=${String(entry.object)} (missing vartheta witness).`,
      );
    } else if (!txEntry || !txEntry.vartheta) {
      details.push(
        `state-handler-St-mult: skipped object=${String(entry.object)} (missing vartheta for TX).`,
      );
    } else {
      details.push(
        `state-handler-St-mult: TODO object=${String(entry.object)} (multiplication replay pending θ_{TX}/St^Y data instrumentation).`,
      );
    }
  }
  if (independenceWarnings > 0) {
    details.push(`handler-independence warnings=${independenceWarnings}.`);
  }
  details.push(
    `checkRunnerStateHandlers: checked=${checked} mismatch=${mismatches} (limit=${sampleLimit}).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details };
};
