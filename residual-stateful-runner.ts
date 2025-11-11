import type { IndexedElement } from "./chu-space";
import {
  composeSet,
  getCarrierSemantics,
  SetCat,
} from "./set-cat";
import type { SetHom, SetObj } from "./set-cat";
import type {
  MonadComonadInteractionLaw,
  MonadStructure,
} from "./monad-comonad-interaction-law";
import type {
  RunnerMorphism,
  StatefulRunner,
  MonadMorphism,
  StatefulTheta,
} from "./stateful-runner";
import {
  checkRunnerMorphism,
  composeRunnerMorphisms,
  identityRunnerMorphism,
  runnerToMonadMap,
  monadMapToRunner,
} from "./stateful-runner";
import type {
  RunnerToMonadMapOptions,
  RunnerToMonadMapResult,
  MonadMapToRunnerOptions,
  MonadMapToRunnerResult,
} from "./stateful-runner";

/**
 * Residual functor summary describing how the residual endofunctor R acts on
 * objects.  Future passes will refine this with full functor witnesses; for
 * now it provides enough structure to track carrier assignments and metadata.
 */
export interface ResidualThetaEvaluationContext<
  Obj,
  Left,
  Right,
  Value
> {
  readonly object: Obj;
  readonly sample: readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>];
  readonly baseRunner: StatefulRunner<Obj, Left, Right, Value>;
  readonly baseTheta?: SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>;
  readonly stateTheta?: StatefulTheta<Obj, Left, Right, Value, unknown>;
  readonly baseValue?: Value;
  readonly residualCarrier: SetObj<unknown>;
  readonly stateCarrier?: SetObj<unknown>;
}

export interface ResidualFunctorSummary<
  Obj,
  Left,
  Right,
  Value
> {
  readonly name: string;
  readonly description?: string;
  readonly objectCarrier: (object: Obj) => SetObj<unknown>;
  readonly metadata?: ReadonlyArray<string>;
  readonly lift?: (
    context: ResidualThetaEvaluationContext<Obj, Left, Right, Value>,
  ) => unknown;
  readonly describeEvaluation?: (
    context: ResidualThetaEvaluationContext<Obj, Left, Right, Value> & {
      readonly residualValue: unknown;
    },
  ) => ReadonlyArray<string>;
}

/**
 * Residual θ-component specialising the ordinary runner θ to land in
 * R(X × Y).  The evaluator will be elaborated in later passes; this scaffold
 * keeps track of the carrier and diagnostics captured while assembling the
 * component.
 */
export interface ResidualThetaComponent<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly residualCarrier: SetObj<unknown>;
  readonly evaluate: (
    sample: readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
  ) => unknown;
  readonly diagnostics: ReadonlyArray<string>;
}

/**
 * Diagnostics recorded while sampling one of the residual diagrams (ηᴿ or μᴿ).
 * Each entry summarises the coverage for a single object.
 */
export interface ResidualDiagramObjectWitness<Obj> {
  readonly object: Obj;
  readonly checked: number;
  readonly mismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface ResidualDiagramWitness<Obj> {
  readonly diagram: string;
  readonly objects: ReadonlyArray<ResidualDiagramObjectWitness<Obj>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const summarizeResidualDiagramWitness = <Obj>(
  witness: ResidualDiagramWitness<Obj>,
): string => {
  const checked = witness.objects.reduce((acc, entry) => acc + entry.checked, 0);
  const mismatches = witness.objects.reduce((acc, entry) => acc + entry.mismatches, 0);
  return `Residual diagram ${witness.diagram}: checked=${checked} mismatches=${mismatches}`;
};

const selectRepresentativeState = (carrier?: SetObj<unknown>): unknown | undefined => {
  if (!carrier) return undefined;
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    const iterator = semantics.iterate();
    const first = iterator.next();
    if (!first.done) return first.value;
  }
  if (isIterable(carrier)) {
    for (const value of carrier as Iterable<unknown>) {
      return value;
    }
  }
  return undefined;
};

const isIterable = (value: unknown): value is Iterable<unknown> =>
  typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";

const residualValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const defaultResidualValue = <
  Obj,
  Left,
  Right,
  Value
>(
  context: ResidualThetaEvaluationContext<Obj, Left, Right, Value>,
): unknown => {
  const [leftSample, rightSample] = context.sample;
  const notes: string[] = [`residual θ default lift: object=${String(context.object)}.`];
  if (!context.baseTheta) {
    notes.push(
      "base θ missing; residual value wraps raw sample.",
    );
  }
  if (context.stateTheta) {
    const initialState = selectRepresentativeState(context.stateCarrier);
    if (initialState !== undefined) {
      try {
        const [nextState, value] = context.stateTheta.run(
          initialState,
          leftSample,
          rightSample,
        );
        return {
          kind: "residual.stateful",
          object: context.object,
          initialState,
          nextState,
          value,
          baseValue: context.baseValue ?? value,
          left: leftSample.element,
          right: rightSample.element,
          diagnostics: notes,
        };
      } catch (error) {
        notes.push(
          `stateful lift failed: ${(error as Error).message ?? String(error)}.`,
        );
      }
    } else {
      notes.push("stateful lift: no representative state available; falling back to sample wrapper.");
    }
  }
  return {
    kind: "residual.defaultValue",
    object: context.object,
    baseValue: context.baseValue,
    left: leftSample.element,
    right: rightSample.element,
    diagnostics: notes,
  };
};

const buildResidualThetaComponent = <
  Obj,
  Left,
  Right,
  Value
>(
  object: Obj,
  baseRunner: StatefulRunner<Obj, Left, Right, Value>,
  residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>,
): ResidualThetaComponent<Obj, Left, Right, Value> => {
  const residualCarrier = residualFunctor.objectCarrier(object);
  const baseTheta = baseRunner.thetaHom.get(object);
  const stateTheta = baseRunner.stateThetas?.get(object) as
    | StatefulTheta<Obj, Left, Right, Value, unknown>
    | undefined;
  const stateCarrier = baseRunner.stateCarriers?.get(object);
  const componentDiagnostics: string[] = [
    `residual θ component initialised for object=${String(object)} using functor ${residualFunctor.name}.`,
  ];
  if (!baseTheta) {
    componentDiagnostics.push(
      "residual θ component: base runner lacks θ witness; evaluations wrap samples directly.",
    );
  }
  if (stateTheta) {
    componentDiagnostics.push(
      "residual θ component: stateful θ witness available; residual lift may leverage next-state semantics.",
    );
  }
  const evaluate = (
    sample: readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
  ): unknown => {
    const baseValue = baseTheta?.map(sample);
    const context: ResidualThetaEvaluationContext<Obj, Left, Right, Value> = {
      object,
      sample,
      baseRunner,
      residualCarrier,
      ...(stateCarrier ? { stateCarrier } : {}),
      ...(baseTheta ? { baseTheta } : {}),
      ...(stateTheta ? { stateTheta } : {}),
      ...(baseValue !== undefined ? { baseValue } : {}),
    };
    const residualValue =
      residualFunctor.lift?.(context) ?? defaultResidualValue(context);
    if (residualFunctor.describeEvaluation) {
      const notes = residualFunctor.describeEvaluation({
        ...context,
        residualValue,
      });
      if (notes && notes.length > 0) {
        for (const note of notes) {
          if (!componentDiagnostics.includes(note)) {
            componentDiagnostics.push(note);
          }
        }
      }
    }
    if (residualCarrier instanceof Set) {
      residualCarrier.add(residualValue);
    }
    return residualValue;
  };
  return {
    object,
    residualCarrier,
    evaluate,
    diagnostics: componentDiagnostics,
  };
};

const deriveResidualThetaComponents = <
  Obj,
  Left,
  Right,
  Value
>(
  baseRunner: StatefulRunner<Obj, Left, Right, Value>,
  residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>,
): ReadonlyMap<Obj, ResidualThetaComponent<Obj, Left, Right, Value>> => {
  const objects = new Set<Obj>();
  for (const object of baseRunner.thetaHom.keys()) {
    objects.add(object);
  }
  if (baseRunner.stateThetas) {
    for (const object of baseRunner.stateThetas.keys()) {
      objects.add(object as Obj);
    }
  }
  const map = new Map<Obj, ResidualThetaComponent<Obj, Left, Right, Value>>();
  for (const object of objects) {
    map.set(object, buildResidualThetaComponent(object, baseRunner, residualFunctor));
  }
  return map;
};

export interface ResidualStatefulRunner<
  Obj,
  Left,
  Right,
  Value
> {
  readonly baseRunner: StatefulRunner<Obj, Left, Right, Value>;
  readonly residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly residualThetas: ReadonlyMap<Obj, ResidualThetaComponent<Obj, Left, Right, Value>>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata: ReadonlyArray<string>;
}

export interface ResidualStatefulRunnerOptions<
  Obj,
  Left,
  Right,
  Value
> {
  readonly residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly residualThetas?: ReadonlyMap<Obj, ResidualThetaComponent<Obj, Left, Right, Value>>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
  readonly diagnostics?: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

/**
 * Assemble a residual runner scaffold from an existing `StatefulRunner`.
 *
 * Pass 1 stores metadata and diagnostics alongside the underlying runner so
 * later passes can focus on implementing the actual residual semantics.
 */
export const makeResidualStatefulRunner = <
  Obj,
  Left,
  Right,
  Value
>(
  baseRunner: StatefulRunner<Obj, Left, Right, Value>,
  options: ResidualStatefulRunnerOptions<Obj, Left, Right, Value>,
): ResidualStatefulRunner<Obj, Left, Right, Value> => {
  const residualThetas =
    options.residualThetas ??
    deriveResidualThetaComponents(baseRunner, options.residualFunctor);
  const diagnostics: ReadonlyArray<string> = [
    `Residual functor engaged: ${options.residualFunctor.name}.`,
    ...baseRunner.diagnostics,
    ...(options.diagnostics ?? []),
    ...(options.thetaWitness ? [summarizeResidualDiagramWitness(options.thetaWitness)] : []),
    ...(options.etaWitness ? [summarizeResidualDiagramWitness(options.etaWitness)] : []),
    ...(options.muWitness ? [summarizeResidualDiagramWitness(options.muWitness)] : []),
    ...(options.residualFunctor.metadata ?? []),
  ];
  const metadata: ReadonlyArray<string> = [
    ...(baseRunner.metadata ?? []),
    ...(options.metadata ?? []),
    ...(options.residualFunctor.metadata ?? []),
  ];
  return {
    baseRunner,
    residualFunctor: options.residualFunctor,
    residualThetas,
    ...(options.thetaWitness ? { thetaWitness: options.thetaWitness } : {}),
    ...(options.etaWitness ? { etaWitness: options.etaWitness } : {}),
    ...(options.muWitness ? { muWitness: options.muWitness } : {}),
    diagnostics,
    metadata,
  };
};

/**
 * Forget the residual data and recover the underlying `StatefulRunner`.
 */
export const residualRunnerToStatefulRunner = <
  Obj,
  Left,
  Right,
  Value
>(
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
): StatefulRunner<Obj, Left, Right, Value> => residualRunner.baseRunner;

export interface ResidualMorphismComponent<Obj> {
  readonly object: Obj;
  readonly map: SetHom<unknown, unknown>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface ResidualRunnerMorphism<
  Obj,
  Left,
  Right,
  Value,
  StateA,
  StateB
> {
  readonly base: RunnerMorphism<Obj, Left, Right, Value, StateA, StateB>;
  readonly residualComponents: ReadonlyMap<Obj, ResidualMorphismComponent<Obj>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const makeResidualRunnerMorphism = <
  Obj,
  Left,
  Right,
  Value,
  StateA,
  StateB
>(
  base: RunnerMorphism<Obj, Left, Right, Value, StateA, StateB>,
  residualComponents: ReadonlyMap<Obj, ResidualMorphismComponent<Obj>> = new Map(),
  diagnostics: ReadonlyArray<string> = [],
): ResidualRunnerMorphism<Obj, Left, Right, Value, StateA, StateB> => ({
  base,
  residualComponents,
  diagnostics,
});

export const identityResidualRunnerMorphism = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State
>(
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ResidualRunnerMorphism<Obj, Left, Right, Value, State, State> =>
  makeResidualRunnerMorphism(
    identityRunnerMorphism<Obj, Arr, Left, Right, Value, State>(
      residualRunner.baseRunner,
      interaction,
    ),
  );

export const composeResidualRunnerMorphisms = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  SA,
  SB,
  SC
>(
  first: ResidualRunnerMorphism<Obj, Left, Right, Value, SA, SB>,
  second: ResidualRunnerMorphism<Obj, Left, Right, Value, SB, SC>,
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ResidualRunnerMorphism<Obj, Left, Right, Value, SA, SC> => {
  const composedResidual = new Map<Obj, ResidualMorphismComponent<Obj>>();
  for (const [object, component] of first.residualComponents) {
    const next = second.residualComponents.get(object);
    if (next) {
      composedResidual.set(object, {
        object,
        map: composeSet(next.map, component.map),
        diagnostics: [
          ...component.diagnostics,
          ...next.diagnostics,
          `Residual morphism composed for object=${String(object)}.`,
        ],
      });
    } else {
      composedResidual.set(object, component);
    }
  }
  for (const [object, component] of second.residualComponents) {
    if (!composedResidual.has(object)) {
      composedResidual.set(object, component);
    }
  }
  return makeResidualRunnerMorphism(
    composeRunnerMorphisms(
      first.base,
      second.base,
      residualRunner.baseRunner,
      interaction,
    ),
    composedResidual,
    [
      ...first.diagnostics,
      ...second.diagnostics,
      "Residual morphism composition executed.",
    ],
  );
};

export interface ResidualRunnerMorphismCheckOptions<
  Obj
> {
  readonly sampleLimit?: number;
  readonly objectFilter?: (object: Obj) => boolean;
}

export interface ResidualRunnerMorphismReport {
  readonly holds: boolean;
  readonly thetaSquare: { readonly checked: number; readonly mismatches: number };
  readonly coalgebraSquare: { readonly checked: number; readonly mismatches: number };
  readonly residualSquare: { readonly checked: number; readonly mismatches: number };
  readonly diagnostics: ReadonlyArray<string>;
}

export const checkResidualRunnerMorphism = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  StateA,
  StateB
>(
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  morphism: ResidualRunnerMorphism<Obj, Left, Right, Value, StateA, StateB>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: ResidualRunnerMorphismCheckOptions<Obj> = {},
): ResidualRunnerMorphismReport => {
  const baseReport = checkRunnerMorphism(
    morphism.base,
    residualRunner.baseRunner,
    residualRunner.baseRunner,
    interaction,
    {
      ...(options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {}),
      ...(options.objectFilter ? { objectFilter: options.objectFilter } : {}),
    },
  );
  const residualSquare = { checked: 0, mismatches: 0 };
  const residualDetails: string[] = [];
  const sampleLimit = Math.max(1, options.sampleLimit ?? 12);
  for (const [object, residualTheta] of residualRunner.residualThetas.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const baseTheta = residualRunner.baseRunner.thetaHom.get(object);
    if (!baseTheta) {
      residualDetails.push(
        `residual-square: skipped object=${String(object)} (base θ missing).`,
      );
      continue;
    }
    const semantics = getCarrierSemantics(baseTheta.dom);
    if (!semantics) {
      residualDetails.push(
        `residual-square: skipped object=${String(object)} (carrier semantics unavailable).`,
      );
      continue;
    }
    const residualMap = morphism.residualComponents.get(object)?.map;
    const iterator = semantics.iterate();
    let localChecked = 0;
    let localMismatches = 0;
    while (localChecked < sampleLimit) {
      const next = iterator.next();
      if (next.done) break;
      const sample = next.value as readonly [
        IndexedElement<Obj, Left>,
        IndexedElement<Obj, Right>
      ];
      localChecked += 1;
      residualSquare.checked += 1;
      let domainValue: unknown;
      try {
        domainValue = residualTheta.evaluate(sample);
      } catch (error) {
        localMismatches += 1;
        residualSquare.mismatches += 1;
        residualDetails.push(
          `residual-square: evaluation error (domain) object=${String(object)} sample=${JSON.stringify(sample)} error=${String(error)}`,
        );
        continue;
      }
      const mappedValue = residualMap ? residualMap.map(domainValue) : domainValue;
      let codomainValue: unknown;
      try {
        codomainValue = residualTheta.evaluate(sample);
      } catch (error) {
        localMismatches += 1;
        residualSquare.mismatches += 1;
        residualDetails.push(
          `residual-square: evaluation error (codomain) object=${String(object)} sample=${JSON.stringify(sample)} error=${String(error)}`,
        );
        continue;
      }
      if (!residualValuesEqual(mappedValue, codomainValue)) {
        localMismatches += 1;
        residualSquare.mismatches += 1;
        residualDetails.push(
          `residual-square: mismatch object=${String(object)} sample=${JSON.stringify(sample)} mapped=${JSON.stringify(mappedValue)} expected=${JSON.stringify(codomainValue)}`,
        );
      }
    }
    residualDetails.push(
      `residual-square summary object=${String(object)} checked=${localChecked} mismatches=${localMismatches}.`,
    );
  }
  const diagnostics = [
    ...morphism.diagnostics,
    ...baseReport.details,
    ...residualDetails,
  ];
  return {
    holds: baseReport.holds && residualSquare.mismatches === 0,
    thetaSquare: baseReport.thetaSquare,
    coalgebraSquare: baseReport.coalgebraSquare,
    residualSquare,
    diagnostics,
  };
};

export type ResidualThetaComparisonResult =
  | boolean
  | { holds: boolean; message?: string };

export interface ResidualThetaComparisonContext<
  Obj,
  Left,
  Right,
  Value
> {
  readonly object: Obj;
  readonly sample: readonly [
    IndexedElement<Obj, Left>,
    IndexedElement<Obj, Right>
  ];
  readonly baseResult: Value;
  readonly residualResult: unknown;
}

export interface ResidualThetaAlignmentOptions<
  Obj,
  Left,
  Right,
  Value
> {
  readonly sampleLimit?: number;
  readonly compare?: (
    context: ResidualThetaComparisonContext<Obj, Left, Right, Value>,
  ) => ResidualThetaComparisonResult;
}

export const checkResidualThetaAlignment = <
  Obj,
  Left,
  Right,
  Value
>(
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  options: ResidualThetaAlignmentOptions<Obj, Left, Right, Value> = {},
): ResidualDiagramWitness<Obj> => {
  const sampleLimit = Math.max(1, options.sampleLimit ?? 12);
  const objectSet = new Set<Obj>();
  for (const object of residualRunner.baseRunner.thetaHom.keys()) {
    objectSet.add(object);
  }
  for (const object of residualRunner.residualThetas.keys()) {
    objectSet.add(object);
  }
  const objects: ResidualDiagramObjectWitness<Obj>[] = [];
  const diagnostics: string[] = [];
  for (const object of objectSet) {
    const objectDiagnostics: string[] = [];
    const residualTheta = residualRunner.residualThetas.get(object);
    const baseTheta = residualRunner.baseRunner.thetaHom.get(object);
    if (!residualTheta) {
      objectDiagnostics.push(
        `Residual θ alignment: missing residual component for object=${String(object)}.`,
      );
      objects.push({
        object,
        checked: 0,
        mismatches: 0,
        diagnostics: objectDiagnostics,
      });
      continue;
    }
    if (!baseTheta) {
      objectDiagnostics.push(
        `Residual θ alignment: base runner missing θ component for object=${String(object)}.`,
      );
      objects.push({
        object,
        checked: 0,
        mismatches: 0,
        diagnostics: objectDiagnostics,
      });
      continue;
    }
    const semantics = getCarrierSemantics(baseTheta.dom);
    if (!semantics) {
      objectDiagnostics.push(
        `Residual θ alignment: no carrier semantics for object=${String(object)}.`,
      );
      objects.push({
        object,
        checked: 0,
        mismatches: 0,
        diagnostics: objectDiagnostics,
      });
      continue;
    }
    const iterator = semantics.iterate();
    let checked = 0;
    let mismatches = 0;
    while (checked < sampleLimit) {
      const next = iterator.next();
      if (next.done) break;
      const sample = next.value as readonly [
        IndexedElement<Obj, Left>,
        IndexedElement<Obj, Right>
      ];
      checked += 1;
      let residualResult: unknown;
      try {
        residualResult = residualTheta.evaluate(sample);
      } catch (error) {
        mismatches += 1;
        objectDiagnostics.push(
          `Residual θ alignment: evaluation error object=${String(object)} sample=${JSON.stringify(sample)} error=${String(error)}`,
        );
        continue;
      }
      let baseResult: Value;
      try {
        baseResult = baseTheta.map(sample);
      } catch (error) {
        mismatches += 1;
        objectDiagnostics.push(
          `Residual θ alignment: base θ evaluation error object=${String(object)} sample=${JSON.stringify(sample)} error=${String(error)}`,
        );
        continue;
      }
      const comparison = options.compare?.({
        object,
        sample,
        baseResult,
        residualResult,
      });
      const holds = typeof comparison === "boolean"
        ? comparison
        : comparison?.holds ?? Object.is(residualResult, baseResult);
      if (!holds) {
        mismatches += 1;
        const message =
          typeof comparison === "boolean"
            ? undefined
            : comparison?.message;
        objectDiagnostics.push(
          message ??
            `Residual θ alignment: mismatch object=${String(object)} sample=${JSON.stringify(sample)} base=${String(
              baseResult,
            )} residual=${String(residualResult)}`,
        );
      }
    }
    if (checked === 0) {
      objectDiagnostics.push(
        `Residual θ alignment: no samples evaluated for object=${String(object)}.`,
      );
    }
    objects.push({
      object,
      checked,
      mismatches,
      diagnostics: objectDiagnostics,
    });
  }
  diagnostics.push(summarizeResidualDiagramWitness({ diagram: "theta-alignment", objects, diagnostics: [] }));
  return {
    diagram: "theta-alignment",
    objects,
    diagnostics,
  };
};

export interface ResidualDiagramUpdates<
  Obj
> {
  readonly theta?: ResidualDiagramWitness<Obj>;
  readonly eta?: ResidualDiagramWitness<Obj>;
  readonly mu?: ResidualDiagramWitness<Obj>;
  readonly diagnostics?: ReadonlyArray<string>;
}

export const withResidualDiagramWitnesses = <
  Obj,
  Left,
  Right,
  Value
>(
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  updates: ResidualDiagramUpdates<Obj>,
): ResidualStatefulRunner<Obj, Left, Right, Value> => {
  const diagnostics: ReadonlyArray<string> = [
    ...residualRunner.diagnostics,
    ...(updates.theta ? [summarizeResidualDiagramWitness(updates.theta)] : []),
    ...(updates.eta ? [summarizeResidualDiagramWitness(updates.eta)] : []),
    ...(updates.mu ? [summarizeResidualDiagramWitness(updates.mu)] : []),
    ...(updates.diagnostics ?? []),
  ];
  const metadata: ReadonlyArray<string> = [...residualRunner.metadata];
  return {
    ...residualRunner,
    ...(updates.theta ? { thetaWitness: updates.theta } : {}),
    ...(updates.eta ? { etaWitness: updates.eta } : {}),
    ...(updates.mu ? { muWitness: updates.mu } : {}),
    diagnostics,
    metadata,
  };
};

export interface ResidualRunnerToMonadMapOptions<Obj>
  extends RunnerToMonadMapOptions<Obj> {
  readonly includeThetaWitness?: boolean;
}

export interface ResidualRunnerToMonadMapResult<Obj, Arr>
  extends RunnerToMonadMapResult<Obj, Arr> {
  readonly residualDiagnostics: ReadonlyArray<string>;
}

export const residualRunnerToMonadMap = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  free: MonadStructure<Obj, Arr>,
  target: MonadStructure<Obj, Arr>,
  options: ResidualRunnerToMonadMapOptions<Obj> = {},
): ResidualRunnerToMonadMapResult<Obj, Arr> => {
  const base = runnerToMonadMap(
    residualRunner.baseRunner,
    free,
    target,
    options,
  );
  const residualDiagnostics: string[] = [
    "residualRunnerToMonadMap: delegated to base runner.",
  ];
  if (residualRunner.thetaWitness) {
    residualDiagnostics.push(
      summarizeResidualDiagramWitness(residualRunner.thetaWitness),
    );
  } else if (options.includeThetaWitness) {
    const witness = checkResidualThetaAlignment(
      residualRunner,
      options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
    );
    residualDiagnostics.push(summarizeResidualDiagramWitness(witness));
  }
  if (residualRunner.etaWitness) {
    residualDiagnostics.push(
      summarizeResidualDiagramWitness(residualRunner.etaWitness),
    );
  }
  if (residualRunner.muWitness) {
    residualDiagnostics.push(
      summarizeResidualDiagramWitness(residualRunner.muWitness),
    );
  }
  return {
    ...base,
    residualDiagnostics,
  } as ResidualRunnerToMonadMapResult<Obj, Arr>;
};

export interface MonadMapToResidualRunnerOptions<Obj>
  extends MonadMapToRunnerOptions<Obj> {
  readonly residualMetadata?: ReadonlyArray<string>;
  readonly residualDiagnostics?: ReadonlyArray<string>;
  readonly sampleLimit?: number;
}

export const monadMapToResidualRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  morphism: MonadMorphism<Obj, Arr>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>,
  options: MonadMapToResidualRunnerOptions<Obj> = {},
): ResidualStatefulRunner<Obj, Left, Right, Value> => {
  const {
    residualMetadata,
    residualDiagnostics,
    ...runnerOptions
  } = options;
  const baseRunner = monadMapToRunner(
    morphism,
    interaction,
    runnerOptions,
  );
  const residualRunner = makeResidualStatefulRunner(baseRunner, {
    residualFunctor,
    diagnostics: [
      "monadMapToResidualRunner: wrapped monad-map runner with residual scaffold.",
      ...(residualDiagnostics ?? []),
    ],
    ...(residualMetadata ? { metadata: residualMetadata } : {}),
  });
  const sampleLimit = options.sampleLimit;
  if (sampleLimit !== undefined && sampleLimit < 0) {
    return residualRunner;
  }
  const thetaWitness = checkResidualThetaAlignment(
    residualRunner,
    sampleLimit !== undefined ? { sampleLimit } : {},
  );
  return withResidualDiagramWitnesses(residualRunner, { theta: thetaWitness });
};
