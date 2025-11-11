import type { IndexedElement } from "./chu-space";
import type { StatefulRunner } from "./stateful-runner";
import type { SetObj } from "./set-cat";

/**
 * Residual functor summary describing how the residual endofunctor R acts on
 * objects.  Future passes will refine this with full functor witnesses; for
 * now it provides enough structure to track carrier assignments and metadata.
 */
export interface ResidualFunctorSummary<Obj> {
  readonly name: string;
  readonly description?: string;
  readonly objectCarrier: (object: Obj) => SetObj<unknown>;
  readonly metadata?: ReadonlyArray<string>;
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

export interface ResidualStatefulRunner<
  Obj,
  Left,
  Right,
  Value
> {
  readonly baseRunner: StatefulRunner<Obj, Left, Right, Value>;
  readonly residualFunctor: ResidualFunctorSummary<Obj>;
  readonly residualThetas: ReadonlyMap<Obj, ResidualThetaComponent<Obj, Left, Right, Value>>;
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
  readonly residualFunctor: ResidualFunctorSummary<Obj>;
  readonly residualThetas?: ReadonlyMap<Obj, ResidualThetaComponent<Obj, Left, Right, Value>>;
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
    options.residualThetas ?? new Map<Obj, ResidualThetaComponent<Obj, Left, Right, Value>>();
  const diagnostics: ReadonlyArray<string> = [
    ...baseRunner.diagnostics,
    ...(options.diagnostics ?? []),
  ];
  const metadata: ReadonlyArray<string> = [
    ...(baseRunner.metadata ?? []),
    ...(options.metadata ?? []),
  ];
  return {
    baseRunner,
    residualFunctor: options.residualFunctor,
    residualThetas,
    diagnostics,
    metadata,
    ...(options.etaWitness ? { etaWitness: options.etaWitness } : {}),
    ...(options.muWitness ? { muWitness: options.muWitness } : {}),
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
