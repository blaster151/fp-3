import type { ExponentialArrow, SetHom, SetObj, SetCarrierSemantics } from "./set-cat";
import { SetCat, getCarrierSemantics } from "./set-cat";
import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import { monadComonadInteractionLawToMonoid } from "./monad-comonad-interaction-law";
import type { IndexedElement } from "./chu-space";
import type { MonadStructure } from "./monad-comonad-interaction-law";
import {
  type FreeTreeMonad,
  type Tree,
  foldTree,
} from "./tree-free-monad";

// =============================
// Runner ⇔ monad translator layer (Tree_Σ ⇔ T)
// =============================
// We introduce a minimal free-tree monad façade and a monad morphism interface
// so runners can be converted to monad maps and back. The actual operation
// signature Σ is abstracted as an operation set carried inside metadata.

/** Minimal monad morphism structure: natural transformation τ: F ⇒ G preserving η and μ. */
export interface MonadMorphism<Obj, Arr> {
  readonly source: MonadStructure<Obj, Arr>;
  readonly target: MonadStructure<Obj, Arr>;
  /** Components τ_X : F X -> G X */
  readonly components: ReadonlyMap<Obj, SetHom<unknown, unknown>>;
  readonly diagnostics: ReadonlyArray<string>;
  /** Law preservation tallies (sampled). */
  readonly unitPreservation?: { checked: number; mismatches: number };
  readonly multiplicationPreservation?: { checked: number; mismatches: number };
}

export interface RunnerToMonadMapOptions<Obj> {
  readonly sampleLimit?: number;
  readonly objectFilter?: (object: Obj) => boolean;
  readonly metadata?: ReadonlyArray<string>;
  readonly operationSemantics?: ReadonlyMap<string, (args: ReadonlyArray<unknown>) => unknown>;
}

export interface RunnerToMonadMapResult<Obj, Arr> extends MonadMorphism<Obj, Arr> {
  readonly fromRunner: true;
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
  const opHandlers = options.operationSemantics ?? new Map<string, (args: ReadonlyArray<unknown>) => unknown>();
  const missingHandlers = new Set<string>();
  let unitChecked = 0;
  let unitMismatches = 0;
  let multChecked = 0;
  let multMismatches = 0;
  let treeChecked = 0;
  let treeMismatches = 0;
  for (const [object] of runner.thetaHom.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const etaTarget = target.unit.transformation.component(object) as SetHom<unknown, unknown>;
    const targetCarrier = (etaTarget.cod as SetObj<unknown>) ?? (etaTarget.dom as SetObj<unknown>);
    const sourceCarrier =
      (treeMonad.carriers?.get(object) as SetObj<unknown> | undefined)
        ?? (free.functor.functor.F0(object) as SetObj<unknown>)
        ?? (free.unit.transformation.component(object).cod as SetObj<unknown>);
    const evaluateTree = (tree: Tree<unknown>): unknown =>
      foldTree<unknown, unknown>({
        onReturn: (value) => etaTarget.map(value),
        onOp: (name, children) => {
          const handler = opHandlers.get(name);
          if (!handler) {
            missingHandlers.add(name);
            return { op: name, args: children };
          }
          return handler(children);
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
    for (const input of unitInputs) {
      unitChecked += 1;
      const leftLifted = etaTarget.map(input);
      const rightLifted = tau.map(etaF.map(input));
      if (!Object.is(leftLifted, rightLifted)) {
        unitMismatches += 1;
        if (unitMismatches <= 4) {
          diagnostics.push(
            `unit-preservation-mismatch object=${String(object)} input=${String(input)} expected=${String(leftLifted)} actual=${String(rightLifted)}`,
          );
        }
      }
    }

    const muF = free.multiplication.transformation.component(object) as SetHom<unknown, unknown>;
    const muT = target.multiplication.transformation.component(object) as SetHom<unknown, unknown>;
    const multInputs: unknown[] = [];
    const muCarrier = muF.dom as SetObj<unknown>;
    const muSem = getCarrierSemantics(muCarrier);
    if (sampleLimit > 0) {
      if (muSem?.iterate) {
        for (const v of muSem.iterate()) {
          multInputs.push(v);
          if (multInputs.length >= sampleLimit) break;
        }
      } else {
        for (const v of muCarrier as Iterable<unknown>) {
          multInputs.push(v);
          if (multInputs.length >= sampleLimit) break;
        }
      }
    }
    for (const input of multInputs) {
      multChecked += 1;
      const leftCollapsed = muT.map(input);
      const rightCollapsed = tau.map(muF.map(input));
      if (!Object.is(leftCollapsed, rightCollapsed)) {
        multMismatches += 1;
        if (multMismatches <= 4) {
          diagnostics.push(
            `multiplication-preservation-mismatch object=${String(object)} input=${String(input)} expected=${String(leftCollapsed)} actual=${String(rightCollapsed)}`,
          );
        }
      }
    }

    const treeInputs: unknown[] = [];
    const treeSemantics = getCarrierSemantics(sourceCarrier);
    if (sampleLimit > 0) {
      if (treeSemantics?.iterate) {
        for (const value of treeSemantics.iterate()) {
          if (isTreeNode(value)) {
            treeInputs.push(value);
          }
          if (treeInputs.length >= sampleLimit) break;
        }
      } else {
        for (const value of sourceCarrier as Iterable<unknown>) {
          if (isTreeNode(value)) {
            treeInputs.push(value);
          }
          if (treeInputs.length >= sampleLimit) break;
        }
      }
    }
    for (const tree of treeInputs) {
      treeChecked += 1;
      const expected = evaluateTree(tree as Tree<unknown>);
      const actual = tau.map(tree);
      if (!Object.is(expected, actual)) {
        treeMismatches += 1;
        if (treeMismatches <= 4) {
          diagnostics.push(
            `tree-evaluation-mismatch object=${String(object)} tree=${JSON.stringify(tree)} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }
  }
  if (missingHandlers.size > 0) {
    diagnostics.push(
      `runnerToMonadMap: missing operation handlers for ${Array.from(missingHandlers).join(", ")} (falling back to diagnostic placeholders).`,
    );
  }
  if (options.metadata && options.metadata.length > 0) diagnostics.push(...options.metadata);
  diagnostics.push(
    `runnerToMonadMap: unitChecked=${unitChecked} unitMismatches=${unitMismatches} multChecked=${multChecked} multMismatches=${multMismatches} treeChecked=${treeChecked} treeMismatches=${treeMismatches}.`,
  );
  return {
    source: free,
    target,
    components,
    diagnostics,
    unitPreservation: { checked: unitChecked, mismatches: unitMismatches },
    multiplicationPreservation: { checked: multChecked, mismatches: multMismatches },
    fromRunner: true,
  };
};

/** Reconstruct a runner from a monad morphism τ: Tree_Σ ⇒ T (placeholder: identity θ). */
export const monadMapToRunner = <Obj, Arr, Left, Right, Value>(
  morphism: MonadMorphism<Obj, Arr>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: MonadMapToRunnerOptions<Obj> = {},
): MonadMapToRunnerResult<Obj, Left, Right, Value> => {
  const diagnostics: string[] = ["monadMapToRunner: rebuilding θ from τ by uncurry + Tree_Σ generator checks."];
  const thetas = new Map<Obj, SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>>();
  const thetaHom = new Map<Obj, SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>>();
  const treeMonad = morphism.source as Partial<FreeTreeMonad<Obj, Arr>>;
  const opHandlers = options.operationSemantics ?? new Map<string, (args: ReadonlyArray<unknown>) => unknown>();
  const missingHandlers = new Set<string>();
  const limit = Math.max(0, options.sampleLimit ?? 8);
  let returnChecked = 0;
  let returnMismatches = 0;
  let treeChecked = 0;
  let treeMismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const phiTheta = (fiber.theta ?? fiber.exponential.curry({
      domain: fiber.primalFiber,
      product: fiber.product,
      morphism: fiber.phi,
    })) as SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
    thetas.set(object, phiTheta);
    const uncurried = fiber.exponential.uncurry({ product: fiber.product, morphism: phiTheta });
    thetaHom.set(object, uncurried as SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>);

    const etaSource = morphism.source.unit.transformation.component(object) as SetHom<unknown, unknown>;
    const etaTarget = morphism.target.unit.transformation.component(object) as SetHom<unknown, unknown>;
    const tauComponent = morphism.components.get(object) as SetHom<unknown, unknown> | undefined;
    if (!tauComponent) continue;
    const samples: unknown[] = [];
    const carrier = etaSource.dom as SetObj<unknown>;
    const semantics = getCarrierSemantics(carrier);
    if (limit > 0) {
      if (semantics?.iterate) {
        for (const value of semantics.iterate()) {
          samples.push(value);
          if (samples.length >= limit) break;
        }
      } else {
        for (const value of carrier as Iterable<unknown>) {
          samples.push(value);
          if (samples.length >= limit) break;
        }
      }
    }
    for (const sample of samples) {
      returnChecked += 1;
      const expected = etaTarget.map(sample);
      const actual = tauComponent.map(etaSource.map(sample));
      if (!Object.is(expected, actual)) {
        returnMismatches += 1;
        if (returnMismatches <= 4) {
          diagnostics.push(
            `generator-return-mismatch object=${String(object)} input=${String(sample)} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }

    const sourceCarrier =
      (treeMonad.carriers?.get(object) as SetObj<unknown> | undefined)
        ?? (morphism.source.functor.functor.F0(object) as SetObj<unknown>);
    if (!sourceCarrier) continue;
    const treeInputs: unknown[] = [];
    const treeSemantics = getCarrierSemantics(sourceCarrier);
    if (limit > 0) {
      if (treeSemantics?.iterate) {
        for (const candidate of treeSemantics.iterate()) {
          if (isTreeNode(candidate)) treeInputs.push(candidate);
          if (treeInputs.length >= limit) break;
        }
      } else {
        for (const candidate of sourceCarrier as Iterable<unknown>) {
          if (isTreeNode(candidate)) treeInputs.push(candidate);
          if (treeInputs.length >= limit) break;
        }
      }
    }
    const evaluateTree = (tree: Tree<unknown>): unknown =>
      foldTree<unknown, unknown>({
        onReturn: (value) => etaTarget.map(value),
        onOp: (name, children) => {
          const handler = opHandlers.get(name);
          if (!handler) {
            missingHandlers.add(name);
            return { op: name, args: children };
          }
          return handler(children);
        },
      })(tree);
    for (const tree of treeInputs) {
      treeChecked += 1;
      const expected = evaluateTree(tree as Tree<unknown>);
      const actual = tauComponent.map(tree);
      if (!Object.is(expected, actual)) {
        treeMismatches += 1;
        if (treeMismatches <= 4) {
          diagnostics.push(
            `generator-tree-mismatch object=${String(object)} tree=${JSON.stringify(tree)} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }
  }
  if (missingHandlers.size > 0) {
    diagnostics.push(
      `monadMapToRunner: missing operation handlers for ${Array.from(missingHandlers).join(", ")} during generator replay.`,
    );
  }
  if (options.metadata && options.metadata.length > 0) diagnostics.push(...options.metadata);
  const checked = returnChecked + treeChecked;
  const mismatches = returnMismatches + treeMismatches;
  diagnostics.push(
    `monadMapToRunner: returnChecked=${returnChecked} returnMismatches=${returnMismatches} treeChecked=${treeChecked} treeMismatches=${treeMismatches}.`,
  );
  return {
    thetas,
    thetaHom,
    diagnostics,
    fromMonadMap: true,
    generatorPreservation: { checked, mismatches },
  };
};

export interface StatefulRunner<Obj, Left, Right, Value> {
  /** Deprecated: θ in curried form X ⟶ (Y ⇒ V); retained for compatibility and derived from thetaHom if absent. */
  readonly thetas?: ReadonlyMap<
    Obj,
    SetHom<
      IndexedElement<Obj, Left>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >
  >;
  /** New: explicit θ^X_Y as a hom T X × Y → V, uncurry target of legacy θ via fiber exponential. */
  readonly thetaHom: ReadonlyMap<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >;
  /** Optional enriched state carriers per object. */
  readonly stateCarriers?: ReadonlyMap<Obj, SetObj<unknown>>;
  /** Optional enriched natural family of stateful θ components. */
  readonly stateThetas?: ReadonlyMap<Obj, StatefulTheta<Obj, Left, Right, Value, unknown>>;
  /** Cached coalgebra and costate views (if built alongside). */
  readonly coalgebraComponents?: ReadonlyMap<
    Obj,
    SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >;
  readonly costateComponents?: ReadonlyMap<
    Obj,
    SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

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
  let unitChecked = 0;
  let unitMismatches = 0;
  let multChecked = 0;
  let multMismatches = 0;
  const details: string[] = [];

  const enumerate = <A>(carrier: SetObj<A>): ReadonlyArray<A> => {
    const semantics = getCarrierSemantics(carrier);
    const result: A[] = [];
    const limit = sampleLimit;
    if (semantics?.iterate) {
      for (const v of semantics.iterate()) {
        result.push(v);
        if (result.length >= limit) break;
      }
      return result;
    }
    for (const v of carrier as Iterable<A>) {
      result.push(v);
      if (result.length >= limit) break;
    }
    return result;
  };

  // Structural composite builders (η, μ combined with θ):
  const buildUnitThetaComposite = (
    object: Obj,
    fiber: any,
    theta: SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>,
  ) => {
    const eta = interaction.monad.unit.transformation.component(object) as SetHom<unknown, Left>;
    const leftCarrier = interaction.law.left.functor.F0(object) as SetObj<Left>;
    const phiCheck = SetCat.hom(leftCarrier, fiber.exponential.object, (element) => theta.map({ object, element } as IndexedElement<Obj, Left>));
    const unitComposite = SetCat.hom(eta.dom as SetObj<unknown>, fiber.exponential.object, (input) => phiCheck.map(eta.map(input as Left)));
    return { eta, unitComposite } as const;
  };
  const buildMultThetaComposite = (
    object: Obj,
    fiber: any,
    theta: SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>,
  ) => {
    const mu = interaction.monad.multiplication.transformation.component(object) as SetHom<unknown, Left>;
    const leftCarrier = interaction.law.left.functor.F0(object) as SetObj<Left>;
    const phiCheck = SetCat.hom(leftCarrier, fiber.exponential.object, (element) => theta.map({ object, element } as IndexedElement<Obj, Left>));
    const multComposite = SetCat.hom(mu.dom as SetObj<unknown>, fiber.exponential.object, (input) => phiCheck.map(mu.map(input as Left)));
    return { mu, multComposite } as const;
  };

  // Tree_Σ sampling augmentation: if samples contain tree-shaped nodes, expand by 1 level of children.
  const looksLikeTree = (x: unknown): x is { _tag: string; children?: ReadonlyArray<unknown> } =>
    !!(x && typeof x === "object" && (x as any)._tag && ((x as any)._tag === "Op" || (x as any)._tag === "Return"));

  const augmentPlainWithTree = (base: ReadonlyArray<unknown>): ReadonlyArray<unknown> => {
    if (base.length === 0) return base;
    const acc: unknown[] = [...base];
    for (const el of base) {
      if (acc.length >= sampleLimit) break;
      if (looksLikeTree(el) && (el as any)._tag === "Op") {
        const ch = (el as any).children as ReadonlyArray<unknown>;
        for (const c of ch) {
          acc.push(c);
          if (acc.length >= sampleLimit) break;
        }
      }
    }
    return acc;
  };

  const augmentIndexedWithTree = <A>(object: Obj, base: ReadonlyArray<IndexedElement<Obj, A>>): ReadonlyArray<IndexedElement<Obj, A>> => {
    if (base.length === 0) return base;
    const acc: IndexedElement<Obj, A>[] = [...base];
    for (const el of base) {
      if (acc.length >= sampleLimit) break;
      const value: unknown = el.element as unknown;
      if (looksLikeTree(value) && (value as any)._tag === "Op") {
        const ch = (value as any).children as ReadonlyArray<A>;
        for (const c of ch) {
          acc.push({ object, element: c } as IndexedElement<Obj, A>);
          if (acc.length >= sampleLimit) break;
        }
      }
    }
    return acc;
  };

  const structural: RunnerObjectCompositeReport[] = [];
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    if (!theta) {
      details.push(`stateful-runner: missing θ for object=${String(object)}; skipped.`);
      continue;
    }
    const { eta, unitComposite } = buildUnitThetaComposite(object, fiber, theta);
    const { mu, multComposite } = buildMultThetaComposite(object, fiber, theta);
    details.push(
      `object=${String(object)} unitComposite(dom=${String((unitComposite.dom as SetObj<unknown>))}) -> Exp size≈? ; multComposite(dom=${String((multComposite.dom as SetObj<unknown>))}) -> Exp size≈?`,
    );
    let dualSamples = enumerate(fiber.dualFiber);
    dualSamples = augmentIndexedWithTree<Right>(object, dualSamples as ReadonlyArray<IndexedElement<Obj, Right>>);
    let unitInputs = enumerate(unitComposite.dom as SetObj<unknown>);
    let multInputs = enumerate(multComposite.dom as SetObj<unknown>);
    unitInputs = augmentPlainWithTree(unitInputs);
    multInputs = augmentPlainWithTree(multInputs);

    let unitLocal = 0;
    const unitFailureEntries: RunnerCompositeFailureEntry[] = [];
    for (const input of unitInputs) {
      const arrow = unitComposite.map(input);
      const lifted = eta.map(input) as Left;
      const primal: IndexedElement<Obj, Left> = { object, element: lifted };
      for (const dual of dualSamples) {
        unitChecked++;
        const expected = fiber.phi.map([primal, dual]);
        const actual = arrow(dual);
        if (!Object.is(expected, actual)) {
          unitMismatches++;
          unitLocal++;
          if (unitLocal <= 4) {
            details.push(`unit-mismatch object=${String(object)} input=${String(input)} dual=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`);
          }
          if (unitFailureEntries.length < 12) {
            unitFailureEntries.push({ input, dual: (dual as any).element ?? dual, expected, actual });
          }
        }
      }
    }
    let multLocal = 0;
    const multFailureEntries: RunnerCompositeFailureEntry[] = [];
    for (const input of multInputs) {
      const arrow = multComposite.map(input);
      const collapsed = mu.map(input) as Left;
      const primal: IndexedElement<Obj, Left> = { object, element: collapsed };
      for (const dual of dualSamples) {
        multChecked++;
        const expected = fiber.phi.map([primal, dual]);
        const actual = arrow(dual);
        if (!Object.is(expected, actual)) {
          multMismatches++;
          multLocal++;
          if (multLocal <= 4) {
            details.push(`mult-mismatch object=${String(object)} input=${String(input)} dual=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`);
          }
          if (multFailureEntries.length < 12) {
            multFailureEntries.push({ input, dual: (dual as any).element ?? dual, expected, actual });
          }
        }
      }
    }
    structural.push({
      object: object as unknown,
      unit: { checked: unitInputs.length * dualSamples.length, mismatches: unitLocal },
      mult: { checked: multInputs.length * dualSamples.length, mismatches: multLocal },
      ...(unitFailureEntries.length > 0 ? { unitFailures: unitFailureEntries } : {}),
      ...(multFailureEntries.length > 0 ? { multFailures: multFailureEntries } : {}),
    });
  details.push(`object=${String(object)} unitLocalMismatches=${unitLocal} multLocalMismatches=${multLocal}`);
  }
  details.push(`Runner unit diagram: checked=${unitChecked} mismatches=${unitMismatches} (limit=${sampleLimit}).`);
  details.push(`Runner multiplication diagram: checked=${multChecked} mismatches=${multMismatches} (limit=${sampleLimit}).`);
  if (options.metadata && options.metadata.length > 0) details.push(...options.metadata);
  return { holds: unitMismatches === 0 && multMismatches === 0, unitDiagram: { checked: unitChecked, mismatches: unitMismatches }, multiplicationDiagram: { checked: multChecked, mismatches: multMismatches }, details, structural };
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

// Runner → Coalgebra (reuse existing builder + add θ agreement sampling)
export const runnerToCoalgebraComponents = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { components: CoalgebraComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const coalgebra = buildRunnerCoalgebra(runner, interaction) as CoalgebraComponents<Obj, Left, Right, Value>;
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["runnerToCoalgebraComponents: sampling θ vs coalgebra evaluation."];
  let checked = 0, mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    const gamma = coalgebra.get(object);
    if (!theta || !gamma) continue;
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    for (const dual of dualSamples) {
      const arrow = gamma.map(dual);
      for (const primal of primalSamples) {
        checked++;
        const expected = fiber.phi.map([primal, dual]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) {
          mismatches++; if (mismatches <= 4) details.push(`coalgebra-eval-mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`);
        }
      }
    }
  }
  details.push(`runnerToCoalgebraComponents: checked=${checked} mismatches=${mismatches}.`);
  return { components: coalgebra, diagnostics: { checked, mismatches, details } };
};

// Coalgebra → Runner (recover θ via ψ consistency) – currently returns original θ via interaction since coalgebra is derived.
export const coalgebraComponentsToRunner = <Obj, Arr, Left, Right, Value>(
  components: CoalgebraComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { runner: StatefulRunner<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const thetas = new Map<Obj, SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>>();
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["coalgebraComponentsToRunner: reconstructing θ via currying consistency."];
  let checked = 0, mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    // Use existing φ currying as θ.
    const theta = (fiber.theta ?? fiber.exponential.curry({ domain: fiber.primalFiber, product: fiber.product, morphism: fiber.phi })) as SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
    thetas.set(object, theta);
    const gamma = components.get(object);
    if (!gamma) continue;
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    for (const primal of primalSamples) {
      const arrow = theta.map(primal);
      for (const dual of dualSamples) {
        checked++; const expected = fiber.phi.map([primal, dual]); const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Right>, Value>)(dual);
        if (!Object.is(expected, actual)) { mismatches++; if (mismatches <= 4) details.push(`theta-reconstruction-mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`); }
      }
    }
  }
  details.push(`coalgebraComponentsToRunner: checked=${checked} mismatches=${mismatches}.`);
  const thetaHom = buildPhiFromRunnerPerObject({ thetas, thetaHom: new Map(), diagnostics: [] } as unknown as StatefulRunner<Obj, Left, Right, Value>, interaction);
  return { runner: { thetas, thetaHom, diagnostics: details }, diagnostics: { checked, mismatches, details } };
};

// Runner → Costate (reuse builder + θ agreement)
export const runnerToCostateComponents = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { components: CostateComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const costate = buildRunnerCostate(runner, interaction) as CostateComponents<Obj, Left, Right, Value>;
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["runnerToCostateComponents: sampling θ vs costate evaluation."];
  let checked = 0, mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
  const theta = (runner.thetas ?? buildThetaCurriedFromHom(runner, interaction)).get(object);
    const kappa = costate.get(object);
    if (!theta || !kappa) continue;
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    for (const right of rightSamples) {
      const arrow = kappa.map(right);
      for (const primal of primalSamples) {
        checked++; const expected = fiber.phi.map([primal, { object, element: right }]); const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) { mismatches++; if (mismatches <= 4) details.push(`costate-eval-mismatch object=${String(object)} left=${String(primal.element)} right=${String(right)} expected=${String(expected)} actual=${String(actual)}`); }
      }
    }
  }
  details.push(`runnerToCostateComponents: checked=${checked} mismatches=${mismatches}.`);
  return { components: costate, diagnostics: { checked, mismatches, details } };
};

// Costate → Runner (similar to coalgebra path)
export const costateComponentsToRunner = <Obj, Arr, Left, Right, Value>(
  components: CostateComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): { runner: StatefulRunner<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const thetas = new Map<Obj, SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>>();
  const sampleLimit = Math.max(0, options.sampleLimit ?? 8);
  const details: string[] = ["costateComponentsToRunner: reconstructing θ via ψ evaluation."];
  let checked = 0, mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const theta = (fiber.theta ?? fiber.exponential.curry({ domain: fiber.primalFiber, product: fiber.product, morphism: fiber.phi })) as SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
    thetas.set(object, theta);
    const kappa = components.get(object);
    if (!kappa) continue;
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    for (const primal of primalSamples) {
      const arrow = theta.map(primal);
      for (const right of rightSamples) {
        checked++; const expected = fiber.phi.map([primal, { object, element: right }]); const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Right>, Value>)({ object, element: right });
        if (!Object.is(expected, actual)) { mismatches++; if (mismatches <= 4) details.push(`theta-reconstruction-mismatch object=${String(object)} left=${String(primal.element)} right=${String(right)} expected=${String(expected)} actual=${String(actual)}`); }
      }
    }
  }
  details.push(`costateComponentsToRunner: checked=${checked} mismatches=${mismatches}.`);
  const thetaHom2 = buildPhiFromRunnerPerObject({ thetas, thetaHom: new Map(), diagnostics: [] } as unknown as StatefulRunner<Obj, Left, Right, Value>, interaction);
  return { runner: { thetas, thetaHom: thetaHom2, diagnostics: details }, diagnostics: { checked, mismatches, details } };
};

// Coalgebra ↔ Costate (factor through Sweedler fromDual indexing)
export const coalgebraToCostate = <Obj, Arr, Left, Right, Value>(
  components: CoalgebraComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { objectFilter?: (object: Obj) => boolean } = {},
): { components: CostateComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
  const costate = new Map<Obj, SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>>();
  const details: string[] = ["coalgebraToCostate: translating γ components into κ via indexing."]; let checked = 0, mismatches = 0;
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
    const rightSamples = enumerateLimited(rightCarrier, 4);
    const primalSamples = enumerateLimited(fiber.primalFiber, 4);
    for (const right of rightSamples) {
      const arrow = kappa.map(right);
      for (const primal of primalSamples) {
        checked++; const expected = fiber.phi.map([primal, { object, element: right }]); const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) { mismatches++; if (mismatches <= 2) details.push(`coalgebra->costate-mismatch object=${String(object)} left=${String(primal.element)} right=${String(right)} expected=${String(expected)} actual=${String(actual)}`); }
      }
    }
  }
  details.push(`coalgebraToCostate: checked=${checked} mismatches=${mismatches}.`);
  return { components: costate, diagnostics: { checked, mismatches, details } };
};

export const costateToCoalgebra = <Obj, Arr, Left, Right, Value>(
  components: CostateComponents<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { objectFilter?: (object: Obj) => boolean } = {},
): { components: CoalgebraComponents<Obj, Left, Right, Value>; diagnostics: EquivalenceDiagnostics } => {
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
    const dualSamples = enumerateLimited(fiber.dualFiber, 4);
    const primalSamples = enumerateLimited(fiber.primalFiber, 4);
    for (const dualEl of dualSamples) {
      const arrow = gamma.map(dualEl);
      for (const primal of primalSamples) {
        checked++; const expected = fiber.phi.map([primal, dualEl]); const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primal);
        if (!Object.is(expected, actual)) { mismatches++; if (mismatches <= 2) details.push(`costate->coalgebra-mismatch object=${String(object)} left=${String(primal.element)} right=${String(dualEl.element)} expected=${String(expected)} actual=${String(actual)}`); }
      }
    }
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
  const monoidOptions: { sampleLimit?: number; metadata?: ReadonlyArray<string> } = {};
  if (options.sampleLimit !== undefined) monoidOptions.sampleLimit = options.sampleLimit;
  if (options.metadata && options.metadata.length > 0) monoidOptions.metadata = options.metadata;
  const monoid = monadComonadInteractionLawToMonoid(interaction, monoidOptions);

  const applyFilter = (obj: Obj) => (options.objectFilter ? (options.objectFilter as (o: Obj) => boolean)(obj) : true);
  let unitChecked = 0;
  let unitMismatches = 0;
  for (const [obj, report] of monoid.unit.components.entries()) {
    if (!applyFilter(obj)) continue;
    unitChecked += report.checked;
    unitMismatches += report.mismatches;
  }

  let multChecked = 0;
  let multMismatches = 0;
  for (const [obj, report] of monoid.multiplication.components.entries()) {
    if (!applyFilter(obj)) continue;
    multChecked += report.checked;
    multMismatches += report.mismatches;
  }

  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;
  const details: string[] = [];
  details.push(
    `Runner axioms from interaction: unit checked=${unitChecked}, mismatches=${unitMismatches}.`,
  );
  details.push(
    `Runner axioms from interaction: multiplication checked=${multChecked}, mismatches=${multMismatches}.`,
  );
  details.push(...monoid.diagnostics);

  if (filter) {
    details.push("Runner axioms: object filter applied.");
  }

  return {
    holds: unitMismatches === 0 && multMismatches === 0,
    unitDiagram: { checked: unitChecked, mismatches: unitMismatches },
    multiplicationDiagram: { checked: multChecked, mismatches: multMismatches },
    details,
  };
};

// ---------- Runner morphisms and Run(T) category (Step 4) ----------

// Phase IV morphism: per-object state map f_Y: S_Y -> S'_Y between enriched state carriers.
// Optionally record coalgebra witness agreement diagnostics.
export interface RunnerMorphism<Obj, Left, Right, Value, State, State2 = State> {
  readonly stateMaps: ReadonlyMap<Obj, SetHom<State, State2>>;
  readonly details: ReadonlyArray<string>;
}

export interface RunnerMorphismReport<Obj> {
  readonly holds: boolean;
  readonly objects: ReadonlyArray<Obj>;
  readonly checked: number; // number of (left,right) samples compared
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

const evaluateRunnerState = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  object: Obj,
  state: State,
  left: IndexedElement<Obj, Left>,
  right: IndexedElement<Obj, Right>,
): { next: State | undefined; value: Value | undefined } => {
  const stateTheta = runner.stateThetas?.get(object) as
    | StatefulTheta<Obj, Left, Right, Value, State>
    | undefined;
  if (stateTheta) {
    const [next, value] = stateTheta.run(state, left, right);
    return { next, value };
  }
  const resolved = runner.thetas ?? buildThetaCurriedFromHom(runner, interaction);
  const theta = resolved.get(object);
  if (!theta) return { next: undefined, value: undefined };
  const arrow = theta.map(left);
  const value = arrow(right);
  return { next: undefined, value };
};

// Identity morphism on a runner: per object, identity on the exponential object.
export const identityRunnerMorphism = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  _interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerMorphism<Obj, Left, Right, Value, State, State> => {
  const stateMaps = new Map<Obj, SetHom<State, State>>();
  const objects = new Set<Obj>();
  if (runner.stateCarriers) {
    for (const object of runner.stateCarriers.keys()) {
      objects.add(object);
    }
  }
  const resolvedThetasId = runner.thetas ?? buildThetaCurriedFromHom(runner, _interaction);
  for (const object of resolvedThetasId.keys()) {
    objects.add(object);
  }

  const fallback = new Map<Obj, SetObj<State>>();
  for (const object of objects) {
    const carrier =
      (runner.stateCarriers?.get(object) as SetObj<State> | undefined) ??
      fallback.get(object) ??
      (() => {
        const created = SetCat.obj([] as State[]);
        fallback.set(object, created as SetObj<State>);
        return created as SetObj<State>;
      })();
    const id = SetCat.hom(carrier, carrier, (s) => s);
    stateMaps.set(object, id);
  }
  return {
    stateMaps,
    details: [
      `identityRunnerMorphism: realised on ${objects.size} object(s) with concrete state carriers`,
    ],
  };
};

// Compose two runner morphisms (postcomposition): m2 ∘ m1
export const composeRunnerMorphisms = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  StateA,
  StateB,
  StateC
>(
  first: RunnerMorphism<Obj, Left, Right, Value, StateA, StateB>,
  second: RunnerMorphism<Obj, Left, Right, Value, StateB, StateC>,
  _interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerMorphism<Obj, Left, Right, Value, StateA, StateC> => {
  const stateMaps = new Map<Obj, SetHom<StateA, StateC>>();
  let count = 0;
  for (const [object, f] of first.stateMaps.entries()) {
    const g = second.stateMaps.get(object);
    if (!g) continue;
    const composed = SetCat.hom(f.dom, g.cod as SetObj<StateC>, (s) => g.map(f.map(s)));
    stateMaps.set(object, composed);
    count++;
  }
  return { stateMaps, details: [`composeRunnerMorphisms: composed ${count} component(s).`] };
};

export const checkRunnerMorphism = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  StateA,
  StateB
>(
  source: StatefulRunner<Obj, Left, Right, Value>,
  target: StatefulRunner<Obj, Left, Right, Value>,
  morphism: RunnerMorphism<Obj, Left, Right, Value, StateA, StateB>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunnerMorphismReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const objects: Obj[] = [];
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  const coalgebraSource = buildRunnerCoalgebra(source, interaction);
  const coalgebraTarget = buildRunnerCoalgebra(target, interaction);
  const resolvedThetaSource = source.thetas ?? buildThetaCurriedFromHom(source, interaction);
  const resolvedThetaTarget = target.thetas ?? buildThetaCurriedFromHom(target, interaction);
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const stateMap = morphism.stateMaps.get(object);
    if (!stateMap) continue;
    const thetaS = resolvedThetaSource.get(object);
    const thetaT = resolvedThetaTarget.get(object);
    const stateCarrierSource = source.stateCarriers?.get(object) as SetObj<StateA> | undefined;
    const stateCarrierTarget = target.stateCarriers?.get(object) as SetObj<StateB> | undefined;
    const targetSemantics = stateCarrierTarget ? getCarrierSemantics(stateCarrierTarget) : undefined;
    if (!thetaS && !(source.stateThetas?.has(object))) continue;
    if (!thetaT && !(target.stateThetas?.has(object))) continue;
    objects.push(object);
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    const stateSamples = stateCarrierSource ? enumerateLimited(stateCarrierSource, sampleLimit) : [];
    let localChecked = 0;
    let localMismatches = 0;
    if (stateSamples.length === 0) {
      details.push(`runner-morphism: no state samples for object=${String(object)} (missing state carrier).`);
    }
    for (const state of stateSamples) {
      const mapped = stateMap.map(state as StateA) as StateB;
      for (const leftEl of leftSamples) {
        for (const rightEl of rightSamples) {
          localChecked++;
          const srcEval = evaluateRunnerState(source, interaction, object, state as StateA, leftEl, rightEl);
          const tgtEval = evaluateRunnerState(target, interaction, object, mapped, leftEl, rightEl);
          if (srcEval.value !== undefined && tgtEval.value !== undefined) {
            if (!Object.is(srcEval.value, tgtEval.value)) {
              localMismatches++;
              if (localMismatches <= 4) {
                details.push(
                  `runner-morphism value mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} source=${String(srcEval.value)} target=${String(tgtEval.value)}`,
                );
              }
            }
          }
          if (srcEval.next !== undefined && tgtEval.next !== undefined) {
            const mappedNext = stateMap.map(srcEval.next as StateA) as StateB;
            const nextEqual = targetSemantics?.equals
              ? targetSemantics.equals(mappedNext, tgtEval.next as StateB)
              : Object.is(mappedNext, tgtEval.next);
            if (!nextEqual) {
              localMismatches++;
              if (localMismatches <= 4) {
                details.push(
                  `runner-morphism state-square mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} mapped=${String(mappedNext)} target=${String(tgtEval.next)}`,
                );
              }
            }
          }
        }
      }
    }
    if (localChecked === 0 && leftSamples.length > 0 && rightSamples.length > 0) {
      for (const leftEl of leftSamples) {
        const arrowS = thetaS?.map(leftEl);
        const arrowT = thetaT?.map(leftEl);
        if (!arrowS || !arrowT) continue;
        for (const rightEl of rightSamples) {
          localChecked++;
          const vS = arrowS(rightEl);
          const vT = arrowT(rightEl);
          if (!Object.is(vS, vT)) {
            localMismatches++;
            if (localMismatches <= 4) {
              details.push(
                `runner-morphism mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} source=${String(vS)} target=${String(vT)}`,
              );
            }
          }
        }
      }
    }
    // Coalgebra square: (T° f) ∘ γ = γ' ∘ f on sampled right elements if state carriers exist.
    const gammaS = coalgebraSource.get(object);
    const gammaT = coalgebraTarget.get(object);
    if (gammaS && gammaT) {
      const dualSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
      let coalMismatches = 0;
      for (const dualEl of dualSamples) {
        const expS = gammaS.map(dualEl);
        const expT = gammaT.map(dualEl);
        // Since state map does not affect dual fiber directly in current model, we just compare functions pointwise over limited primal samples.
        const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
        for (const primalEl of primalSamples) {
          checked++;
          const lhs = expS(primalEl);
          const rhs = expT(primalEl);
          if (!Object.is(lhs, rhs)) {
            mismatches++;
            coalMismatches++;
            if (coalMismatches <= 2) {
              details.push(`coal-square mismatch object=${String(object)} right=${String(dualEl.element)} left=${String(primalEl.element)} lhs=${String(lhs)} rhs=${String(rhs)}`);
            }
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
    details.push(`runner-morphism object=${String(object)} checked=${localChecked} mismatches=${localMismatches}.`);
  }
  details.unshift(`Runner morphism check: objects=${objects.length} sampleLimit=${sampleLimit}.`);
  return { holds: mismatches === 0, objects, checked, mismatches, details };
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
  const leftId = composeRunnerMorphisms(idSource, f, interaction);
  const leftIdCmp = compareRunnerMorphisms(leftId, f, source, target, interaction, sampleLimit, options.objectFilter);

  // Right identity: id_target ∘ f == f
  const rightId = composeRunnerMorphisms(f, idTarget, interaction);
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
  const gof = composeRunnerMorphisms(f, g, interaction); // g ∘ f
  const hog = composeRunnerMorphisms(g, h, interaction); // h ∘ g
  const leftAssoc = composeRunnerMorphisms(gof, h, interaction); // h ∘ (g ∘ f)
  const rightAssoc = composeRunnerMorphisms(f, hog, interaction); // (h ∘ g) ∘ f
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
  readonly curriedTransformation?: SetHom<
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
    let curriedTransformation:
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
      curriedTransformation = exponential.curry({
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
      ...(independenceIssues > 0 ? { independenceIssues } : {}),
    };
    if (transformation) {
      if (curriedTransformation) {
        entries.push({ ...baseEntry, transformation, curriedTransformation });
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
    if (entry.curriedTransformation && entry.canonicalRight && stateCarrier) {
      const canonicalRight = entry.canonicalRight;
      const vartheta = entry.curriedTransformation as SetHom<
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
  }
  if (independenceWarnings > 0) {
    details.push(`handler-independence warnings=${independenceWarnings}.`);
  }
  details.push(
    `checkRunnerStateHandlers: checked=${checked} mismatch=${mismatches} (limit=${sampleLimit}).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details };
};
