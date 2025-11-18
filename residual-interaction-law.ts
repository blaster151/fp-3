import type { FunctorInteractionLaw } from "./functor-interaction-law";
import type {
  MonadComonadInteractionLaw,
} from "./monad-comonad-interaction-law";
import { makeExample6MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { IndexedElement } from "./chu-space";
import type {
  ResidualFunctorSummary,
  ResidualDiagramObjectWitness,
  ResidualDiagramCounterexample,
  ResidualDiagramWitness,
  ResidualStatefulRunner,
  ResidualThetaEvaluationContext,
  ResidualWitnessComparison,
} from "./residual-stateful-runner";
import {
  compareResidualDiagramWitness,
  getResidualEtaWitness,
  getResidualMuWitness,
  getResidualThetaWitness,
  summarizeResidualDiagramWitness,
} from "./residual-stateful-runner";
import type { SetObj } from "./set-cat";
import { SetCat, getCarrierSemantics } from "./set-cat";
import type { StatefulRunner } from "./stateful-runner";

export interface ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> {
  readonly base: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly residualMonadName: string;
  readonly diagnostics: ReadonlyArray<string>;
  readonly residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly rho?: ResidualInteractionLawRho<Obj, Left, Right, Value>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
  readonly residualNotes?: ReadonlyArray<string>;
}

export interface ResidualInteractionLawRho<Obj, Left, Right, Value> {
  readonly description?: string;
  readonly evaluate: (
    object: Obj,
    sample: readonly [
      IndexedElement<Obj, Left>,
      IndexedElement<Obj, Right>,
    ],
  ) => unknown;
  readonly diagnostics?: ReadonlyArray<string>;
}

export interface ResidualInteractionLawOptions<
  Obj,
  Left,
  Right,
  Value
> {
  readonly residualMonadName?: string;
  readonly notes?: ReadonlyArray<string>;
  readonly residualFunctor?: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly rho?: ResidualInteractionLawRho<Obj, Left, Right, Value>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
}

export interface ResidualInteractionLawFromRunnerOptions<
  Obj,
  Left,
  Right,
  Value
> {
  readonly residualMonadName?: string;
  readonly notes?: ReadonlyArray<string>;
  readonly includeWitnesses?: boolean;
  readonly includeRunnerDiagnostics?: boolean;
  readonly rhoDescription?: string;
  readonly rhoDiagnostics?: ReadonlyArray<string>;
}

export interface ResidualInteractionLawRhoComponent<
  Obj,
  Left,
  Right,
  Value
> {
  readonly object: Obj;
  readonly evaluate: (
    sample: readonly [
      IndexedElement<Obj, Left>,
      IndexedElement<Obj, Right>,
    ],
  ) => unknown;
  readonly diagnostics?: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface ResidualInteractionLawConstruction<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly rhoComponents: ReadonlyArray<
    ResidualInteractionLawRhoComponent<Obj, Left, Right, Value>
  >;
  readonly residualMonadName?: string;
  readonly rhoDescription?: string;
  readonly notes?: ReadonlyArray<string>;
  readonly thetaWitness?: ResidualDiagramWitness<Obj>;
  readonly etaWitness?: ResidualDiagramWitness<Obj>;
  readonly muWitness?: ResidualDiagramWitness<Obj>;
}

export interface LiftInteractionLawToResidualOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly residualMonadName?: string;
  readonly residualFunctor?: ResidualFunctorSummary<Obj, Left, Right, Value>;
  readonly notes?: ReadonlyArray<string>;
  readonly rhoDescription?: string;
}

const componentLookup = <Obj, Left, Right, Value>(
  components: ReadonlyMap<Obj, ResidualInteractionLawRhoComponent<Obj, Left, Right, Value>>,
  object: Obj | undefined,
): ResidualInteractionLawRhoComponent<Obj, Left, Right, Value> | undefined => {
  if (object === undefined) return undefined;
  return components.get(object);
};

export const constructResidualInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  construction: ResidualInteractionLawConstruction<Obj, Arr, Left, Right, Value>,
): ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const componentMap = new Map<
    Obj,
    ResidualInteractionLawRhoComponent<Obj, Left, Right, Value>
  >();
  const rhoDiagnostics: string[] = [];
  const residualNotes: string[] = [];
  for (const component of construction.rhoComponents) {
    if (componentMap.has(component.object)) {
      rhoDiagnostics.push(
        `Duplicate ρ component supplied for object=${String(component.object)}; using the latest entry.`,
      );
    }
    componentMap.set(component.object, component);
    if (component.diagnostics) {
      rhoDiagnostics.push(
        ...component.diagnostics.map(
          (line) => `ρ[${String(component.object)}]: ${line}`,
        ),
      );
    }
    if (component.metadata) {
      residualNotes.push(
        ...component.metadata.map(
          (line) => `ρ component ${String(component.object)}: ${line}`,
        ),
      );
    }
  }
  if (componentMap.size === 0) {
    rhoDiagnostics.push(
      "Residual interaction law constructed without ρ components; evaluation will throw for every object.",
    );
  } else {
    rhoDiagnostics.unshift(
      `Residual ρ components registered=${componentMap.size}.`,
    );
  }
  const rho: ResidualInteractionLawRho<Obj, Left, Right, Value> = {
    description:
      construction.rhoDescription ??
      `Residual ρ assembled from ${componentMap.size} component${
        componentMap.size === 1 ? "" : "s"
      }`,
    diagnostics: rhoDiagnostics,
    evaluate: (
      object: Obj,
      sample: readonly [
        IndexedElement<Obj, Left>,
        IndexedElement<Obj, Right>,
      ],
    ) => {
      const component =
        componentLookup(componentMap, object) ??
        componentLookup(componentMap, sample[0]?.object) ??
        componentLookup(componentMap, sample[1]?.object);
      if (!component) {
        const leftObject = sample[0]?.object;
        const rightObject = sample[1]?.object;
        throw new Error(
          `Residual interaction law ρ missing component for object=${String(
            object,
          )} (sample objects: left=${String(leftObject)} right=${String(rightObject)}).`,
        );
      }
      return component.evaluate(sample);
    },
  };
  const notes: string[] = [
    `Residual interaction law constructed with ${componentMap.size} ρ component${
      componentMap.size === 1 ? "" : "s"
    }.`,
    ...(construction.notes ?? []),
    ...residualNotes,
  ];
  return makeResidualInteractionLaw(construction.law, {
    ...(construction.residualMonadName !== undefined
      ? { residualMonadName: construction.residualMonadName }
      : {}),
    residualFunctor: construction.residualFunctor,
    rho,
    ...(construction.thetaWitness
      ? { thetaWitness: construction.thetaWitness }
      : {}),
    ...(construction.etaWitness
      ? { etaWitness: construction.etaWitness }
      : {}),
    ...(construction.muWitness ? { muWitness: construction.muWitness } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  });
};

export const liftInteractionLawToResidual = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: LiftInteractionLawToResidualOptions<Obj, Arr, Left, Right, Value> = {},
): ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const rhoComponents = law.kernel.base.objects.map(
    (object): ResidualInteractionLawRhoComponent<Obj, Left, Right, Value> => ({
      object,
      evaluate: (sample) => law.evaluate(sample[0], sample[1]),
      diagnostics: [
        `ρ derived from interaction-law evaluation for object=${String(object)} (R = Id).`,
      ],
    }),
  );
  const dualizingCarrier = law.dualizing as unknown as SetObj<unknown>;
  const residualFunctor =
    options.residualFunctor ??
    ({
      name: options.residualMonadName ?? "IdentityResidual",
      description: "Identity residual functor derived from the interaction law (R = Id).",
      objectCarrier: () => dualizingCarrier,
      metadata: [
        "Residual functor reuses the interaction law's dualizing carrier.",
        "ρ evaluation coincides with the underlying ψ pairing when R = Id.",
      ],
      lift: (context) => context.baseValue ?? context.sample,
      describeEvaluation: (context) => [
        `Identity residual returned ψ-evaluation ${String(context.residualValue)}.`,
      ],
    } satisfies ResidualFunctorSummary<Obj, Left, Right, Value>);
  const notes: string[] = [
    "Residual interaction law lifted from ordinary interaction law with R = Id.",
    ...(options.notes ?? []),
  ];
  return constructResidualInteractionLaw({
    law,
    residualFunctor,
    rhoComponents,
    residualMonadName: options.residualMonadName ?? residualFunctor.name,
    rhoDescription:
      options.rhoDescription ??
      "ρ derived directly from ψ for the identity residual (R = Id).",
    notes,
  });
};

type Example13ResidualValue<Obj, Left, Right, Value> =
  | {
      readonly tag: "example13.return";
      readonly object: Obj;
      readonly weight: 0 | 1;
      readonly left: Left;
      readonly right: Right;
      readonly value: Value;
    }
  | {
      readonly tag: "example13.exception";
      readonly object: Obj;
      readonly weight: 0 | 1;
      readonly left: Left;
      readonly right: Right;
      readonly exception: {
        readonly kind: "example13.writer-weight";
        readonly description: string;
      };
    };

const isIterable = (candidate: unknown): candidate is Iterable<unknown> =>
  candidate != null &&
  typeof (candidate as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";

const collectIndexedElements = <Obj, Payload>(
  carrier: SetObj<IndexedElement<Obj, Payload>>,
): ReadonlyArray<IndexedElement<Obj, Payload>> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  if (isIterable(carrier)) {
    return Array.from(carrier as Iterable<IndexedElement<Obj, Payload>>);
  }
  throw new Error("Example13 residual law: unable to enumerate indexed elements.");
};

const groupIndexedByObject = <Obj, Payload>(
  elements: ReadonlyArray<IndexedElement<Obj, Payload>>,
): Map<Obj, IndexedElement<Obj, Payload>[]> => {
  const grouped = new Map<Obj, IndexedElement<Obj, Payload>[]>();
  for (const element of elements) {
    const bucket = grouped.get(element.object);
    if (bucket) {
      bucket.push(element);
    } else {
      grouped.set(element.object, [element]);
    }
  }
  return grouped;
};

const serializeForDiagnostics = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return `<<unserializable:${(error as Error).message ?? String(error)}>>`;
  }
};

const residualValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

type IndexedSamplePair<Obj, Left, Right> = readonly [
  IndexedElement<Obj, Left>,
  IndexedElement<Obj, Right>,
];

interface ResidualCompatibilitySamples<Obj, Left, Right> {
  readonly object: Obj;
  readonly pairs: ReadonlyArray<IndexedSamplePair<Obj, Left, Right>>;
}

const buildResidualCompatibilitySamples = <Obj, Left, Right>(
  objects: ReadonlyArray<Obj>,
  primalByObject: ReadonlyMap<Obj, ReadonlyArray<IndexedElement<Obj, Left>>>,
  dualByObject: ReadonlyMap<Obj, ReadonlyArray<IndexedElement<Obj, Right>>>,
  sampleLimit: number,
): ReadonlyArray<ResidualCompatibilitySamples<Obj, Left, Right>> => {
  const pairs: ResidualCompatibilitySamples<Obj, Left, Right>[] = [];
  for (const object of objects) {
    const primals = primalByObject.get(object) ?? [];
    const duals = dualByObject.get(object) ?? [];
    const samples: Array<IndexedSamplePair<Obj, Left, Right>> = [];
    outer: for (const primal of primals) {
      for (const dual of duals) {
        samples.push([primal, dual]);
        if (samples.length >= sampleLimit) {
          break outer;
        }
      }
    }
    pairs.push({ object, pairs: samples });
  }
  return pairs;
};

const formatResidualSample = <Obj, Left, Right>(
  sample: IndexedSamplePair<Obj, Left, Right>,
): string => {
  const [primal, dual] = sample;
  return `FX(${String(primal.object)})=${serializeForDiagnostics(primal.element)}; GY(${String(
    dual.object,
  )})=${serializeForDiagnostics(dual.element)}`;
};

const residualValueInCarrier = (
  carrier: SetObj<unknown>,
  value: unknown,
): boolean => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.has) {
    return semantics.has(value);
  }
  if (semantics?.iterate) {
    for (const entry of semantics.iterate()) {
      if (residualValuesEqual(entry, value)) {
        return true;
      }
    }
    return false;
  }
  if (typeof (carrier as Iterable<unknown>)[Symbol.iterator] === "function") {
    for (const entry of carrier as Iterable<unknown>) {
      if (residualValuesEqual(entry, value)) {
        return true;
      }
    }
  }
  try {
    return (carrier as ReadonlySet<unknown>).has(value);
  } catch {
    return false;
  }
};

const extractWriterWeight = (candidate: unknown): 0 | 1 => {
  if (Array.isArray(candidate) && candidate.length > 0) {
    const value = candidate[0];
    if (value === 0 || value === 1) {
      return value;
    }
  }
  throw new Error(
    `Example13 residual law: cannot extract writer weight from sample ${String(candidate)}.`,
  );
};

const serializeExample13Residual = <Obj, Left, Right, Value>(
  residual: Example13ResidualValue<Obj, Left, Right, Value>,
): string =>
  JSON.stringify(residual, (_key, value) =>
    typeof value === "function" || value === undefined ? null : value,
  );

export const makeExample13ResidualInteractionLaw = () => {
  const interaction = makeExample6MonadComonadInteractionLaw();
  const law = interaction.law;
  const evaluate = law.evaluate;
  type PrimalIndexed = Parameters<typeof evaluate>[0];
  type DualIndexed = Parameters<typeof evaluate>[1];
  type Obj = PrimalIndexed["object"];
  type Left = PrimalIndexed["element"];
  type Right = DualIndexed["element"];
  type Value = ReturnType<typeof evaluate>;

  const primalElements = collectIndexedElements<Obj, Left>(law.primalCarrier as SetObj<IndexedElement<Obj, Left>>);
  const dualElements = collectIndexedElements<Obj, Right>(law.dualCarrier as SetObj<IndexedElement<Obj, Right>>);
  const primalByObject = groupIndexedByObject(primalElements);
  const dualByObject = groupIndexedByObject(dualElements);

  const evaluateResidual = (
    sample: readonly [PrimalIndexed, DualIndexed],
  ): Example13ResidualValue<Obj, Left, Right, Value> => {
    const [primal, dual] = sample;
    const weight = extractWriterWeight(primal.element);
    if (weight === 0) {
      const value = law.evaluate(primal, dual);
      return {
        tag: "example13.return",
        object: primal.object,
        weight,
        left: primal.element,
        right: dual.element,
        value,
      };
    }
    return {
      tag: "example13.exception",
      object: primal.object,
      weight,
      left: primal.element,
      right: dual.element,
      exception: {
        kind: "example13.writer-weight",
        description: `Writer weight ${weight} triggers the Example13 exception branch.`,
      },
    };
  };

  const residualValuesByObject = new Map<Obj, Map<string, Example13ResidualValue<Obj, Left, Right, Value>>>();
  for (const object of law.kernel.base.objects) {
    const primals = primalByObject.get(object) ?? [];
    const duals = dualByObject.get(object) ?? [];
    const values = new Map<string, Example13ResidualValue<Obj, Left, Right, Value>>();
    for (const primal of primals) {
      for (const dual of duals) {
        const residual = evaluateResidual([primal, dual]);
        values.set(serializeExample13Residual(residual), residual);
      }
    }
    residualValuesByObject.set(object, values);
  }

  const residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value> = {
    name: "Example13Residual",
    description:
      "Example 13 residual functor with RX = X + E (writer weight determines exception).",
    objectCarrier: (object) => {
      const entries = Array.from(residualValuesByObject.get(object)?.values() ?? []);
      return SetCat.obj(entries, {
        tag: `Example13Residual(${String(object)})`,
      });
    },
    metadata: [
      "Residual functor treats writer weight 1 as the exception channel while weight 0 preserves ψ-evaluations.",
      "Carriers enumerate both successful and exceptional branches for each object in the Example 6 interaction law.",
    ],
    lift: (context) => evaluateResidual(context.sample),
    describeEvaluation: (context) => {
      const residualValue = context.residualValue as Example13ResidualValue<
        Obj,
        Left,
        Right,
        Value
      >;
      if (residualValue.tag === "example13.return") {
        return [
          `Example13 residual returned a value for object=${String(residualValue.object)} weight=${residualValue.weight}.`,
        ];
      }
      return [
        `Example13 residual raised an exception for object=${String(residualValue.object)} weight=${residualValue.weight}.`,
      ];
    },
  };

  const rhoComponents = law.kernel.base.objects.map(
    (object): ResidualInteractionLawRhoComponent<Obj, Left, Right, Value> => {
      const values = residualValuesByObject.get(object);
      const metadata =
        values && values.size > 0
          ? (Array.from(values.values()).map((entry) =>
              entry.tag === "example13.return"
                ? `return(weight=${entry.weight})`
                : `exception(weight=${entry.weight})`,
            ) as ReadonlyArray<string>)
          : undefined;
      return {
        object,
        evaluate: (sample) => evaluateResidual(sample),
        diagnostics: [
          `Example13 residual ρ routes writer weight into RX = X + E for object=${String(object)}.`,
          `Residual outcomes enumerated=${values?.size ?? 0}.`,
        ],
        ...(metadata ? { metadata } : {}),
      };
    },
  );

  return constructResidualInteractionLaw({
    law,
    residualFunctor,
    rhoComponents,
    residualMonadName: "ExceptionsResidual",
    rhoDescription:
      "Example 13 residual law: writer weight 0 yields ψ while weight 1 propagates an exception in X + E.",
    notes: [
      "Example 13 residual law derived from the Example 6 interaction showcases RX = X + E with Δ × Y comonad context.",
      "Exceptions arise precisely when the leading writer weight is 1, mirroring the paper's exception branch.",
    ],
  });
};

export interface ResidualLawCompatibilityOptions {
  readonly sampleLimit?: number;
  readonly pureMapRelaxation?: boolean;
}

const defaultCompatibilitySampleLimit = 12;

export const residualLawCompatibilityWithF = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  residualLaw: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: ResidualLawCompatibilityOptions = {},
): ResidualDiagramWitness<Obj> => {
  const sampleLimit = Math.max(1, options.sampleLimit ?? defaultCompatibilitySampleLimit);
  const diagnostics: string[] = [
    `Residual compatibility diagram (F-path): sampleLimit=${sampleLimit}.`,
  ];
  const counterexamples: ResidualDiagramCounterexample<Obj>[] = [];
  const objects: Obj[] = [...residualLaw.base.kernel.base.objects];
  const lift = residualLaw.residualFunctor.lift;
  if (!residualLaw.rho) {
    diagnostics.push("ρ evaluator unavailable; skipping direct comparisons.");
  }
  if (!lift) {
    diagnostics.push("Residual functor lift missing; canonical F-path cannot be reconstructed.");
  }

  const evaluate = residualLaw.base.evaluate;
  type PrimalIndexed = Parameters<typeof evaluate>[0];
  type DualIndexed = Parameters<typeof evaluate>[1];

  const primalElements = collectIndexedElements<Obj, Left>(
    residualLaw.base.primalCarrier as SetObj<IndexedElement<Obj, Left>>,
  );
  const dualElements = collectIndexedElements<Obj, Right>(
    residualLaw.base.dualCarrier as SetObj<IndexedElement<Obj, Right>>,
  );
  const primalByObject = groupIndexedByObject(primalElements);
  const dualByObject = groupIndexedByObject(dualElements);
  const samplesByObject = buildResidualCompatibilitySamples<Obj, Left, Right>(
    objects,
    primalByObject,
    dualByObject,
    sampleLimit,
  );

  const stubRunner: StatefulRunner<Obj, Left, Right, Value> = {
    thetaHom: new Map(),
    diagnostics: [
      "Residual compatibility with F: evaluating canonical composite via stub runner.",
    ],
  };

  const objectWitnesses: ResidualDiagramObjectWitness<Obj>[] = [];
  for (const { object, pairs } of samplesByObject) {
    const objectDiagnostics: string[] = [];
    let checked = 0;
    let mismatches = 0;
    if (!residualLaw.rho || !lift) {
      if (!pairs.length) {
        objectDiagnostics.push(
          `No FX×GY samples enumerated for object=${String(object)} when evaluating the F-path diagram.`,
        );
      }
      objectWitnesses.push({ object, checked, mismatches, diagnostics: objectDiagnostics });
      continue;
    }
    const residualCarrier = residualLaw.residualFunctor.objectCarrier(object);
    for (const pair of pairs) {
      const [primal, dual] = pair;
      const sampleDescription = formatResidualSample(pair);
      const hY = residualLaw.base.evaluate(primal as PrimalIndexed, dual as DualIndexed);
      const context: ResidualThetaEvaluationContext<Obj, Left, Right, Value> = {
        object,
        sample: pair,
        baseRunner: stubRunner,
        residualCarrier,
        baseValue: hY,
      };
      let canonical: unknown;
      try {
        canonical = lift(context);
      } catch (error) {
        mismatches += 1;
        checked += 1;
        const detail =
          `F-diagram sample failure (${sampleDescription}): unable to evaluate Rm^F_{X,Y} — ${
            (error as Error).message ?? String(error)
          }`;
        objectDiagnostics.push(detail);
        counterexamples.push({
          diagram: "residual.F",
          object,
          description: "Rm^F evaluation failed",
          sample: sampleDescription,
          error: (error as Error).message ?? String(error),
          diagnostics: [detail],
        });
        continue;
      }
      let rhoValue: unknown;
      try {
        rhoValue = residualLaw.rho.evaluate(object, pair);
      } catch (error) {
        mismatches += 1;
        checked += 1;
        const detail =
          `F-diagram sample failure (${sampleDescription}): ρ evaluation failed — ${
            (error as Error).message ?? String(error)
          }`;
        objectDiagnostics.push(detail);
        counterexamples.push({
          diagram: "residual.F",
          object,
          description: "ρ evaluation failed",
          sample: sampleDescription,
          error: (error as Error).message ?? String(error),
          diagnostics: [detail],
        });
        continue;
      }
      const matches = residualValuesEqual(rhoValue, canonical);
      checked += 1;
      const detail =
        `h_Y=${serializeForDiagnostics(hY)} Rm^F_{X,Y}=${serializeForDiagnostics(
          canonical,
        )} k_Y=${serializeForDiagnostics(rhoValue)} sample=${sampleDescription} result=${
          matches ? "compatible" : "mismatch"
        }`;
      objectDiagnostics.push(detail);
      if (!matches) {
        mismatches += 1;
        counterexamples.push({
          diagram: "residual.F",
          object,
          description: "ρ does not match Rm^F_{X,Y} ∘ h_Y",
          sample: sampleDescription,
          diagnostics: [detail],
        });
      }
    }
    objectWitnesses.push({ object, checked, mismatches, diagnostics: objectDiagnostics });
  }

  return {
    diagram: "residual.F",
    objects: objectWitnesses,
    diagnostics,
    counterexamples,
  };
};

export const residualLawCompatibilityWithG = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  residualLaw: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: ResidualLawCompatibilityOptions = {},
): ResidualDiagramWitness<Obj> => {
  const sampleLimit = Math.max(1, options.sampleLimit ?? defaultCompatibilitySampleLimit);
  const diagnostics: string[] = [
    `Residual compatibility diagram (G-path): sampleLimit=${sampleLimit}.`,
  ];
  if (options.pureMapRelaxation) {
    diagnostics.push(
      "Kleisli-pure relaxation enabled: verifying RX × GY membership for the residual diagram.",
    );
  }
  const counterexamples: ResidualDiagramCounterexample<Obj>[] = [];
  const objects: Obj[] = [...residualLaw.base.kernel.base.objects];
  if (!residualLaw.rho) {
    diagnostics.push("ρ evaluator unavailable; skipping RX × GY compatibility checks.");
  }

  const evaluate = residualLaw.base.evaluate;
  type PrimalIndexed = Parameters<typeof evaluate>[0];
  type DualIndexed = Parameters<typeof evaluate>[1];

  const primalElements = collectIndexedElements<Obj, Left>(
    residualLaw.base.primalCarrier as SetObj<IndexedElement<Obj, Left>>,
  );
  const dualElements = collectIndexedElements<Obj, Right>(
    residualLaw.base.dualCarrier as SetObj<IndexedElement<Obj, Right>>,
  );
  const primalByObject = groupIndexedByObject(primalElements);
  const dualByObject = groupIndexedByObject(dualElements);
  const samplesByObject = buildResidualCompatibilitySamples<Obj, Left, Right>(
    objects,
    primalByObject,
    dualByObject,
    sampleLimit,
  );

  const objectWitnesses: ResidualDiagramObjectWitness<Obj>[] = [];
  for (const { object, pairs } of samplesByObject) {
    const objectDiagnostics: string[] = [];
    let checked = 0;
    let mismatches = 0;
    if (!residualLaw.rho) {
      if (!pairs.length) {
        objectDiagnostics.push(
          `No FX×GY samples enumerated for object=${String(object)} when evaluating the G-path diagram.`,
        );
      }
      objectWitnesses.push({ object, checked, mismatches, diagnostics: objectDiagnostics });
      continue;
    }
    const residualCarrier = residualLaw.residualFunctor.objectCarrier(object);
    const contains = (value: unknown) => residualValueInCarrier(residualCarrier, value);
    for (const pair of pairs) {
      const [primal, dual] = pair;
      checked += 1;
      let rhoValue: unknown;
      try {
        rhoValue = residualLaw.rho.evaluate(object, pair);
      } catch (error) {
        mismatches += 1;
        const detail =
          `G-diagram sample failure (${formatResidualSample(pair)}): ρ evaluation failed — ${
            (error as Error).message ?? String(error)
          }`;
        objectDiagnostics.push(detail);
        counterexamples.push({
          diagram: "residual.G",
          object,
          description: "ρ evaluation failed",
          sample: formatResidualSample(pair),
          error: (error as Error).message ?? String(error),
          diagnostics: [detail],
        });
        continue;
      }
      const membership = contains(rhoValue);
      const detail =
        `Rm^G_{X,Y} factor (${formatResidualSample(pair)}): residual=${serializeForDiagnostics(
          rhoValue,
        )} inCarrier=${membership}`;
      objectDiagnostics.push(detail);
      if (!membership) {
        mismatches += 1;
        counterexamples.push({
          diagram: "residual.G",
          object,
          description: "ρ output not contained in RX",
          sample: formatResidualSample(pair),
          diagnostics: [detail],
        });
      }
    }
    objectWitnesses.push({ object, checked, mismatches, diagnostics: objectDiagnostics });
  }

  return {
    diagram: "residual.G",
    objects: objectWitnesses,
    diagnostics,
    counterexamples,
  };
};

export const makeResidualInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: ResidualInteractionLawOptions<Obj, Left, Right, Value> = {},
): ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const residualMonadName = options.residualMonadName ?? "R";
  const residualFunctor: ResidualFunctorSummary<Obj, Left, Right, Value> =
    options.residualFunctor ?? {
      name: residualMonadName,
      description: `Residual functor for ${residualMonadName}`,
      objectCarrier: () => new Set<unknown>(),
      metadata: [`Residual interaction law ${residualMonadName}: default residual functor.`],
    };
  const diagnostics: string[] = [
    `Residual interaction law ${residualMonadName}: ${
      options.residualFunctor ? "custom residual functor supplied." : "using default residual functor (Set carrier)."
    }`,
  ];
  if (options.notes && options.notes.length > 0) {
    diagnostics.push(
      `Notes: ${options.notes
        .map((note) => note.trim())
        .filter(Boolean)
        .join("; ")}`,
    );
  }
  if (options.rho) {
    diagnostics.push(
      `Residual interaction law ρ evaluator supplied${
        options.rho.description ? `: ${options.rho.description}` : ""
      }.`,
    );
    if (options.rho.diagnostics && options.rho.diagnostics.length > 0) {
      diagnostics.push(...options.rho.diagnostics);
    }
  } else {
    diagnostics.push(
      "Residual interaction law ρ evaluator not provided; downstream passes will synthesise samples from residual runners.",
    );
  }
  if (!options.thetaWitness || !options.etaWitness || !options.muWitness) {
    diagnostics.push(
      "Residual witnesses (theta/eta/mu) not provided; downstream builders may synthesise defaults from runners.",
    );
  }
  return {
    base: law,
    residualMonadName,
    diagnostics,
    residualFunctor,
    ...(options.rho ? { rho: options.rho } : {}),
    ...(options.thetaWitness ? { thetaWitness: options.thetaWitness } : {}),
    ...(options.etaWitness ? { etaWitness: options.etaWitness } : {}),
    ...(options.muWitness ? { muWitness: options.muWitness } : {}),
    ...(options.notes ? { residualNotes: options.notes } : {}),
  };
};

export const makeResidualInteractionLawFromRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  residualRunner: ResidualStatefulRunner<Obj, Left, Right, Value>,
  options: ResidualInteractionLawFromRunnerOptions<Obj, Left, Right, Value> = {},
): ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const includeWitnesses = options.includeWitnesses ?? true;
  const rhoDiagnostics: string[] = [
    `Residual ρ derived from runner functor ${residualRunner.residualFunctor.name}.`,
    ...(options.rhoDiagnostics ?? []),
  ];
  const rho: ResidualInteractionLawRho<Obj, Left, Right, Value> = {
    description:
      options.rhoDescription ??
      `Runner-derived ρ for ${residualRunner.residualFunctor.name}.`,
    evaluate: (
      object: Obj,
      sample: readonly [
        IndexedElement<Obj, Left>,
        IndexedElement<Obj, Right>,
      ],
    ) => {
      const component = residualRunner.residualThetas.get(object);
      if (!component) {
        throw new Error(
          `Residual runner lacks θ component for object=${String(object)} when evaluating ρ.`,
        );
      }
      return component.evaluate(sample);
    },
    diagnostics: rhoDiagnostics,
  };
  const notes: string[] = [
    `Residual interaction law derived from residual runner functor ${residualRunner.residualFunctor.name}.`,
    ...(options.notes ?? []),
  ];
  if ((options.includeRunnerDiagnostics ?? false) && residualRunner.diagnostics.length > 0) {
    notes.push(
      ...residualRunner.diagnostics.map(
        (line) => `Residual runner diagnostic: ${line}`,
      ),
    );
  }
  if (residualRunner.metadata.length > 0) {
    notes.push(
      `Residual runner metadata: ${residualRunner.metadata.join("; ")}`,
    );
  }
  return makeResidualInteractionLaw(law, {
    ...(options.residualMonadName
      ? { residualMonadName: options.residualMonadName }
      : {}),
    residualFunctor: residualRunner.residualFunctor,
    rho,
    ...(includeWitnesses && residualRunner.thetaWitness
      ? { thetaWitness: residualRunner.thetaWitness }
      : {}),
    ...(includeWitnesses && residualRunner.etaWitness
      ? { etaWitness: residualRunner.etaWitness }
      : {}),
    ...(includeWitnesses && residualRunner.muWitness
      ? { muWitness: residualRunner.muWitness }
      : {}),
    notes,
  });
};

export interface ResidualInteractionLawDiagramTotals {
  readonly diagram: string;
  readonly objects: number;
  readonly checked: number;
  readonly mismatches: number;
}

export interface ResidualInteractionLawMismatchDetail {
  readonly diagram: string;
  readonly object: string;
  readonly checked: number;
  readonly mismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface ResidualInteractionLawCounterexample {
  readonly origin: "law" | "runner";
  readonly diagram: string;
  readonly object: string;
  readonly description: string;
  readonly sample?: string;
  readonly error?: string;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface ResidualInteractionLawCounterexampleSummary {
  readonly total: number;
  readonly byOrigin: {
    readonly law: number;
    readonly runner: number;
  };
  readonly byDiagram: Readonly<Record<string, number>>;
  readonly notes: ReadonlyArray<string>;
}

export interface ResidualInteractionLawCompatibilitySummaryEntry {
  readonly checked: number;
  readonly mismatches: number;
}

export interface ResidualInteractionLawCompatibilitySummary {
  readonly total: number;
  readonly mismatched: number;
  readonly matching: number;
  readonly byLabel: Readonly<Record<string, ResidualInteractionLawCompatibilitySummaryEntry>>;
  readonly notes: ReadonlyArray<string>;
}

export interface ResidualInteractionLawAggregate {
  readonly residualMonadName: string;
  readonly residualFunctorName: string;
  readonly functorMetadata: ReadonlyArray<string>;
  readonly hasRho: boolean;
  readonly rhoDescription?: string;
  readonly rhoDiagnostics?: ReadonlyArray<string>;
  readonly witnessTotals: ReadonlyArray<ResidualInteractionLawDiagramTotals>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly mismatches: ReadonlyArray<ResidualInteractionLawMismatchDetail>;
  readonly counterexamples: ReadonlyArray<ResidualInteractionLawCounterexample>;
  readonly counterexampleSummary: ResidualInteractionLawCounterexampleSummary;
  readonly compatibility?: ReadonlyArray<ResidualWitnessComparison>;
  readonly compatibilitySummary?: ResidualInteractionLawCompatibilitySummary;
  readonly pureMapRelaxation?: boolean;
}

const summarizeWitnessTotals = <Obj>(
  witness?: ResidualDiagramWitness<Obj>,
): ResidualInteractionLawDiagramTotals | undefined => {
  if (!witness) return undefined;
  const objects = witness.objects.length;
  const checked = witness.objects.reduce((acc, entry) => acc + entry.checked, 0);
  const mismatches = witness.objects.reduce((acc, entry) => acc + entry.mismatches, 0);
  return {
    diagram: witness.diagram,
    objects,
    checked,
    mismatches,
  };
};

export interface ResidualInteractionLawSummarizeOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly runner?: ResidualStatefulRunner<Obj, Left, Right, Value>;
  readonly interaction?: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    Obj,
    Arr
  >;
  readonly sampleLimit?: number;
  readonly pureMapRelaxation?: boolean;
}

export interface ResidualInteractionLawCheckOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value
> extends ResidualInteractionLawSummarizeOptions<Obj, Arr, Left, Right, Value> {
  readonly inspectObjects?: Iterable<Obj>;
}

export interface ResidualInteractionLawCheckResult<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly residualMonadName: string;
  readonly residualFunctorName: string;
  readonly holds: boolean;
  readonly zeroResidual?: boolean;
  readonly aggregate: ResidualInteractionLawAggregate;
  readonly diagnostics: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export interface ResidualMonadComonadInteractionLawOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly metadata?: ReadonlyArray<string>;
  readonly summarize?: ResidualInteractionLawSummarizeOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly check?:
    | boolean
    | ResidualInteractionLawCheckOptions<Obj, Arr, Left, Right, Value>;
}

export interface ResidualMonadComonadInteractionLaw<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    Obj,
    Arr
  >;
  readonly residual: ResidualInteractionLawSummary<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly aggregate: ResidualInteractionLawAggregate;
  readonly compatibility?: ReadonlyArray<ResidualWitnessComparison>;
  readonly compatibilitySummary?: ResidualInteractionLawCompatibilitySummary;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
  readonly residualCheck?: ResidualInteractionLawCheckResult<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
}

export interface ResidualMonadComonadInteraction<
  Obj,
  Arr,
  Left,
  Right,
  Value
> extends ResidualMonadComonadInteractionLaw<Obj, Arr, Left, Right, Value> {
  readonly reducesToOrdinary: boolean;
  readonly ordinaryInteraction?: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    Obj,
    Arr
  >;
}

export interface ResidualMonadComonadInteractionOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value
> extends ResidualMonadComonadInteractionLawOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly identityResidualNames?: ReadonlyArray<string>;
}

export const summarizeResidualInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  residualLaw: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: ResidualInteractionLawSummarizeOptions<Obj, Arr, Left, Right, Value> = {},
): ResidualInteractionLawAggregate => {
  const witnessTotals: ResidualInteractionLawDiagramTotals[] = [];
  const diagnostics: string[] = [...residualLaw.diagnostics];
  const mismatchDetails: ResidualInteractionLawMismatchDetail[] = [];
  const counterexamples: ResidualInteractionLawCounterexample[] = [];
  const pureMapRelaxation = options.pureMapRelaxation ?? false;
  if (residualLaw.residualNotes) {
    diagnostics.push(...residualLaw.residualNotes);
  }
  if (residualLaw.residualFunctor.description) {
    diagnostics.push(
      `Residual functor description: ${residualLaw.residualFunctor.description}`,
    );
  }
  if (residualLaw.rho?.description) {
    diagnostics.push(
      `Residual ρ description: ${residualLaw.rho.description}`,
    );
  }
  if (residualLaw.rho?.diagnostics) {
    diagnostics.push(...residualLaw.rho.diagnostics);
  }
  const describeValue = (value: unknown): string => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const collectCounterexamples = (
    origin: "law" | "runner",
    witness: ResidualDiagramWitness<Obj>,
  ) => {
    if (witness.counterexamples.length === 0) return;
    for (const entry of witness.counterexamples) {
      const sample = entry.sample !== undefined ? describeValue(entry.sample) : undefined;
      const detail = `Residual law counterexample origin=${origin} diagram=${witness.diagram} object=${String(
        entry.object,
      )}${sample ? ` sample=${sample}` : ""}${entry.error ? ` error=${entry.error}` : ""}`;
      diagnostics.push(detail);
      diagnostics.push(...entry.diagnostics);
      counterexamples.push({
        origin,
        diagram: witness.diagram,
        object: String(entry.object),
        description: entry.description,
        ...(sample ? { sample } : {}),
        ...(entry.error ? { error: entry.error } : {}),
        diagnostics: entry.diagnostics,
      });
    }
  };
  const collectWitness = (witness?: ResidualDiagramWitness<Obj>) => {
    if (!witness) return;
    const totals = summarizeWitnessTotals(witness);
    if (totals) {
      witnessTotals.push(totals);
    }
    diagnostics.push(summarizeResidualDiagramWitness(witness));
    diagnostics.push(...witness.diagnostics);
    collectCounterexamples("law", witness);
    for (const entry of witness.objects) {
      if (entry.mismatches > 0) {
        const mismatchNote = `Residual law mismatch diagram=${witness.diagram} object=${String(
          entry.object,
        )} checked=${entry.checked} mismatches=${entry.mismatches}`;
        diagnostics.push(mismatchNote);
        mismatchDetails.push({
          diagram: witness.diagram,
          object: String(entry.object),
          checked: entry.checked,
          mismatches: entry.mismatches,
          diagnostics: entry.diagnostics,
        });
      }
    }
  };
  collectWitness(residualLaw.thetaWitness);
  collectWitness(residualLaw.etaWitness);
  collectWitness(residualLaw.muWitness);
  if (pureMapRelaxation) {
    diagnostics.push(
      "Residual interaction law summary: Kleisli-pure relaxation requested for the RX × GY compatibility diagram.",
    );
  }
  const lawCompatibilityOptions: ResidualLawCompatibilityOptions = {
    ...(options.sampleLimit ? { sampleLimit: options.sampleLimit } : {}),
    ...(pureMapRelaxation ? { pureMapRelaxation: true } : {}),
  };
  const fCompatibility = residualLawCompatibilityWithF(
    residualLaw,
    lawCompatibilityOptions,
  );
  collectWitness(fCompatibility);
  const gCompatibility = residualLawCompatibilityWithG(
    residualLaw,
    lawCompatibilityOptions,
  );
  collectWitness(gCompatibility);
  const compatibility: ResidualWitnessComparison[] = [];
  if (options.runner) {
    const sampleLimit = Math.max(1, options.sampleLimit ?? 12);
    const thetaWitness = getResidualThetaWitness(options.runner, sampleLimit);
    const thetaComparison = compareResidualDiagramWitness(
      "theta",
      thetaWitness,
      residualLaw.thetaWitness,
    );
    collectCounterexamples("runner", thetaWitness);
    compatibility.push(thetaComparison);
    diagnostics.push(
      `Residual law compatibility theta mismatches=${thetaComparison.mismatches} checked=${thetaComparison.checked}.`,
    );
    diagnostics.push(...thetaComparison.details);
    if (options.interaction) {
      const etaWitness = getResidualEtaWitness(
        options.runner,
        options.interaction,
        sampleLimit,
      );
      collectCounterexamples("runner", etaWitness);
      const etaComparison = compareResidualDiagramWitness(
        "eta",
        etaWitness,
        residualLaw.etaWitness,
      );
      compatibility.push(etaComparison);
      diagnostics.push(
        `Residual law compatibility eta mismatches=${etaComparison.mismatches} checked=${etaComparison.checked}.`,
      );
      diagnostics.push(...etaComparison.details);
      const muWitness = getResidualMuWitness(
        options.runner,
        options.interaction,
        sampleLimit,
      );
      collectCounterexamples("runner", muWitness);
      const muComparison = compareResidualDiagramWitness(
        "mu",
        muWitness,
        residualLaw.muWitness,
      );
      compatibility.push(muComparison);
      diagnostics.push(
        `Residual law compatibility mu mismatches=${muComparison.mismatches} checked=${muComparison.checked}.`,
      );
      diagnostics.push(...muComparison.details);
    }
  }
  const counterexampleSummary = summarizeResidualCounterexamples(counterexamples);
  let compatibilitySummary: ResidualInteractionLawCompatibilitySummary | undefined;
  if (compatibility.length > 0) {
    compatibilitySummary = summarizeResidualCompatibility(compatibility);
    diagnostics.push(...compatibilitySummary.notes);
  }
  diagnostics.push(...counterexampleSummary.notes);
  return {
    residualMonadName: residualLaw.residualMonadName,
    residualFunctorName: residualLaw.residualFunctor.name,
    functorMetadata: residualLaw.residualFunctor.metadata ?? [],
    hasRho: Boolean(residualLaw.rho),
    ...(residualLaw.rho?.description
      ? { rhoDescription: residualLaw.rho.description }
      : {}),
    ...(residualLaw.rho?.diagnostics && residualLaw.rho.diagnostics.length > 0
      ? { rhoDiagnostics: residualLaw.rho.diagnostics }
      : {}),
    witnessTotals,
    diagnostics,
    mismatches: mismatchDetails,
    counterexamples,
    counterexampleSummary,
    ...(compatibility.length > 0 ? { compatibility } : {}),
    ...(compatibilitySummary ? { compatibilitySummary } : {}),
    ...(pureMapRelaxation ? { pureMapRelaxation: true } : {}),
  };
};

export const checkResidualInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  residualLaw: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: ResidualInteractionLawCheckOptions<Obj, Arr, Left, Right, Value> = {},
): ResidualInteractionLawCheckResult<Obj, Arr, Left, Right, Value> => {
  const aggregate = summarizeResidualInteractionLaw(residualLaw, options);
  const mismatchTotal = aggregate.mismatches.reduce(
    (acc, entry) => acc + entry.mismatches,
    0,
  );
  const counterexampleTotal = aggregate.counterexamples.length;
  const compatibilityMismatched =
    aggregate.compatibilitySummary?.mismatched ?? 0;
  const holds =
    mismatchTotal === 0 &&
    counterexampleTotal === 0 &&
    compatibilityMismatched === 0;

  const zeroDiagnostics: string[] = [];
  const inspectedObjects = new Set<Obj>();
  const registerObject = (object: Obj | undefined) => {
    if (object !== undefined) {
      inspectedObjects.add(object);
    }
  };

  if (options.inspectObjects) {
    for (const object of options.inspectObjects) {
      registerObject(object);
    }
  }
  if (options.runner) {
    for (const object of options.runner.residualThetas.keys()) {
      registerObject(object);
    }
  }
  const recordWitnessObjects = (witness?: ResidualDiagramWitness<Obj>) => {
    if (!witness) return;
    for (const entry of witness.objects) {
      registerObject(entry.object);
    }
  };
  recordWitnessObjects(residualLaw.thetaWitness);
  recordWitnessObjects(residualLaw.etaWitness);
  recordWitnessObjects(residualLaw.muWitness);

  let zeroResidual: boolean | undefined;
  if (inspectedObjects.size > 0) {
    let hasPositiveCarrier = false;
    let hasKnownZeroCarrier = false;
    let hasUnknownCarrier = false;
    for (const object of inspectedObjects) {
      try {
        const carrier = residualLaw.residualFunctor.objectCarrier(object);
        const cardinality = SetCat.knownFiniteCardinality(carrier);
        if (cardinality === undefined) {
          hasUnknownCarrier = true;
          zeroDiagnostics.push(
            `Residual law zero-check: object=${String(object)} cardinality=unknown`,
          );
        } else if (cardinality === 0) {
          hasKnownZeroCarrier = true;
          zeroDiagnostics.push(
            `Residual law zero-check: object=${String(object)} cardinality=0`,
          );
        } else {
          hasPositiveCarrier = true;
          zeroDiagnostics.push(
            `Residual law zero-check: object=${String(object)} cardinality=${cardinality}`,
          );
        }
      } catch (error) {
        hasUnknownCarrier = true;
        zeroDiagnostics.push(
          `Residual law zero-check error: object=${String(object)} error=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    if (hasPositiveCarrier) {
      zeroResidual = false;
    } else if (hasUnknownCarrier) {
      zeroResidual = undefined;
    } else if (hasKnownZeroCarrier) {
      zeroResidual = true;
    } else {
      zeroResidual = undefined;
    }
  }

  const notes: string[] = [
    `Residual interaction law check: holds=${holds} mismatches=${mismatchTotal} counterexamples=${counterexampleTotal} compatibilityMismatched=${compatibilityMismatched}`,
  ];
  if (aggregate.pureMapRelaxation) {
    notes.push(
      "Residual interaction law check: Kleisli-pure relaxation enabled for the RX × GY compatibility diagram.",
    );
  }
  if (inspectedObjects.size > 0) {
    notes.push(
      `Residual interaction law check inspectedObjects=${Array.from(inspectedObjects)
        .map((object) => String(object))
        .join(",") || "∅"}`,
    );
    if (zeroResidual === true) {
      notes.push("Residual interaction law check: residual functor collapses to zero on inspected objects.");
    } else if (zeroResidual === false) {
      notes.push("Residual interaction law check: residual functor exhibits non-zero carriers on inspected objects.");
    } else {
      notes.push(
        "Residual interaction law check: residual functor zero-collapse undetermined for inspected objects.",
      );
    }
  }

  const diagnostics: string[] = [...zeroDiagnostics];

  return {
    residualMonadName: aggregate.residualMonadName,
    residualFunctorName: aggregate.residualFunctorName,
    holds,
    ...(zeroResidual !== undefined ? { zeroResidual } : {}),
    aggregate,
    diagnostics,
    notes,
  };
};

const mergeMetadata = (
  ...sources: Array<ReadonlyArray<string> | undefined>
): ReadonlyArray<string> | undefined => {
  const merged: string[] = [];
  for (const source of sources) {
    if (!source) continue;
    for (const entry of source) {
      const trimmed = entry.trim();
      if (trimmed.length === 0) continue;
      if (!merged.includes(trimmed)) {
        merged.push(trimmed);
      }
    }
  }
  return merged.length > 0 ? merged : undefined;
};

export const makeResidualMonadComonadInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  residual: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: ResidualMonadComonadInteractionLawOptions<Obj, Arr, Left, Right, Value> = {},
): ResidualMonadComonadInteractionLaw<Obj, Arr, Left, Right, Value> => {
  const diagnostics: string[] = [];

  if (residual.base === interaction.law) {
    diagnostics.push(
      "Residual monad/comonad interaction: residual law base matches packaged interaction law.",
    );
  } else {
    diagnostics.push(
      "Residual monad/comonad interaction: residual law base differs from packaged interaction law; proceeding with provided data.",
    );
  }

  const summarizeOptions: ResidualInteractionLawSummarizeOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > = {
    ...(options.summarize ?? {}),
    interaction:
      options.summarize?.interaction ?? interaction,
  };
  const aggregate = summarizeResidualInteractionLaw(residual, summarizeOptions);
  diagnostics.push(
    `Residual monad/comonad interaction: summarised residual functor ${aggregate.residualFunctorName} with ${aggregate.witnessTotals.length} witness total${
      aggregate.witnessTotals.length === 1 ? "" : "s"
    }.`,
  );
  diagnostics.push(
    `Residual monad/comonad interaction: residual counterexamples=${aggregate.counterexamples.length} compatibilityEntries=${aggregate.compatibility?.length ?? 0}.`,
  );

  let residualCheck:
    | ResidualInteractionLawCheckResult<Obj, Arr, Left, Right, Value>
    | undefined;
  if (options.check) {
    const checkOptions: ResidualInteractionLawCheckOptions<
      Obj,
      Arr,
      Left,
      Right,
      Value
    > = options.check === true ? {} : options.check;
    const normalizedCheck: ResidualInteractionLawCheckOptions<
      Obj,
      Arr,
      Left,
      Right,
      Value
    > = {
      ...checkOptions,
      interaction: checkOptions.interaction ?? interaction,
    };
    residualCheck = checkResidualInteractionLaw(residual, normalizedCheck);
    diagnostics.push(
      `Residual monad/comonad interaction: residual law check holds=${residualCheck.holds}.`,
    );
    if (residualCheck.zeroResidual !== undefined) {
      diagnostics.push(
        `Residual monad/comonad interaction: residual zeroCollapse=${residualCheck.zeroResidual}.`,
      );
    }
  }

  const metadata = mergeMetadata(
    interaction.metadata,
    interaction.monad.metadata,
    interaction.comonad.metadata,
    residual.residualNotes,
    options.metadata,
  );

  return {
    interaction,
    residual,
    aggregate,
    ...(aggregate.compatibility ? { compatibility: aggregate.compatibility } : {}),
    ...(aggregate.compatibilitySummary
      ? { compatibilitySummary: aggregate.compatibilitySummary }
      : {}),
    diagnostics,
    ...(metadata ? { metadata } : {}),
    ...(residualCheck ? { residualCheck } : {}),
  };
};

const DEFAULT_IDENTITY_RESIDUAL_NAMES = [
  "id",
  "identity",
  "identity residual",
  "identityresidual",
];

const normaliseIdentityNames = (
  names: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const normalised: string[] = [];
  for (const candidate of names) {
    const trimmed = candidate.trim().toLowerCase();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalised.push(trimmed);
  }
  return normalised;
};

const matchesIdentityName = (
  value: string | undefined,
  identityNames: ReadonlyArray<string>,
): boolean => {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  if (normalised.length === 0) {
    return false;
  }
  return identityNames.includes(normalised);
};

export const makeResidualMonadComonadInteraction = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  residual: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: ResidualMonadComonadInteractionOptions<Obj, Arr, Left, Right, Value> = {},
): ResidualMonadComonadInteraction<Obj, Arr, Left, Right, Value> => {
  const packaged = makeResidualMonadComonadInteractionLaw(interaction, residual, options);
  const identityNames = normaliseIdentityNames(
    options.identityResidualNames ?? DEFAULT_IDENTITY_RESIDUAL_NAMES,
  );
  const reducesToOrdinary = [
    residual.residualMonadName,
    residual.residualFunctor.name,
    packaged.aggregate.residualFunctorName,
  ].some((name) => matchesIdentityName(name, identityNames));
  const diagnostics = [...packaged.diagnostics];
  if (reducesToOrdinary) {
    diagnostics.push(
      "Residual monad/comonad interaction: residual functor identified as identity; ordinary interaction law recovered.",
    );
  }
  return {
    ...packaged,
    diagnostics,
    reducesToOrdinary,
    ...(reducesToOrdinary
      ? { ordinaryInteraction: interaction }
      : {}),
  };
};

function summarizeResidualCounterexamples(
  counterexamples: ReadonlyArray<ResidualInteractionLawCounterexample>,
): ResidualInteractionLawCounterexampleSummary {
  const mutableOrigins: { law: number; runner: number } = { law: 0, runner: 0 };
  const diagramCounts = new Map<string, number>();
  for (const entry of counterexamples) {
    if (entry.origin === "law") {
      mutableOrigins.law += 1;
    } else {
      mutableOrigins.runner += 1;
    }
    diagramCounts.set(entry.diagram, (diagramCounts.get(entry.diagram) ?? 0) + 1);
  }
  const total = counterexamples.length;
  const diagramSummary: Record<string, number> = {};
  for (const [diagram, count] of diagramCounts.entries()) {
    diagramSummary[diagram] = count;
  }
  const notes: string[] = [
    `Residual law counterexamples total=${total} law=${mutableOrigins.law} runner=${mutableOrigins.runner}`,
  ];
  for (const [diagram, count] of diagramCounts.entries()) {
    notes.push(`Residual law counterexample diagram=${diagram} count=${count}`);
  }
  return {
    total,
    byOrigin: { law: mutableOrigins.law, runner: mutableOrigins.runner },
    byDiagram: diagramSummary,
    notes,
  };
}

function summarizeResidualCompatibility(
  comparisons: ReadonlyArray<ResidualWitnessComparison>,
): ResidualInteractionLawCompatibilitySummary {
  const byLabel: Record<string, ResidualInteractionLawCompatibilitySummaryEntry> = {};
  let mismatched = 0;
  for (const comparison of comparisons) {
    byLabel[comparison.label] = {
      checked: comparison.checked,
      mismatches: comparison.mismatches,
    };
    if (comparison.mismatches > 0) {
      mismatched += 1;
    }
  }
  const total = comparisons.length;
  const matching = total - mismatched;
  const notes: string[] = [
    `Residual law compatibility summary total=${total} mismatched=${mismatched} matching=${matching}`,
  ];
  for (const comparison of comparisons) {
    notes.push(
      `Residual law compatibility summary label=${comparison.label} mismatches=${comparison.mismatches} checked=${comparison.checked}`,
    );
  }
  return {
    total,
    mismatched,
    matching,
    byLabel,
    notes,
  };
}
