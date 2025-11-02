import {
  buildFixedLeftInitialObject,
  buildFixedRightInitialObject,
  finalInteractionLaw,
  type FixedLeftInitialObject,
  type FixedRightInitialObject,
} from "./functor-interaction-law";
import { SetCat } from "./set-cat";
import type {
  Coproduct,
  CoproductData,
  SetHom,
  SetObj,
  SetTerminalObject,
} from "./set-cat";
import type {
  ComonadCooperation,
  FunctorInteractionLaw,
  FunctorInteractionLawOperations,
  LawvereOperationWitness,
  MonadOperation,
  NullaryOperationMetadata,
  OperationDayReference,
} from "./functor-interaction-law";

interface OperationEntry<Obj, Arr> {
  readonly kind: "monad" | "comonad";
  readonly operation: MonadOperation<Obj, Arr, unknown, unknown> | ComonadCooperation<Obj, Arr, unknown, unknown>;
}

type FinalLaw<Obj, Arr> = FunctorInteractionLaw<Obj, Arr, SetTerminalObject, never, boolean>;

export interface ZeroComparisonWitness<Obj, Right> {
  readonly object: Obj;
  readonly domain: SetObj<Right>;
  readonly zero: SetObj<never>;
  readonly toZero: SetHom<Right, never>;
  readonly fromZero: SetHom<never, Right>;
}

const buildZeroComparison = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  object: Obj,
): ZeroComparisonWitness<Obj, Right> => {
  const domain = law.right.functor.functor.F0(object);
  const zero = SetCat.initialObj;
  const toZero = SetCat.hom(domain, zero, (_value): never => {
    throw new Error(
      "Degeneracy zero map invoked; interacting functor should collapse to the initial object.",
    );
  });
  const fromZero = SetCat.initialArrow(domain);
  return { object, domain, zero, toZero, fromZero };
};

const enumerateOperations = <Obj, Arr>(
  operations: FunctorInteractionLawOperations<Obj, Arr> | undefined,
): ReadonlyArray<OperationEntry<Obj, Arr>> => {
  if (!operations) return [];
  const monad = (operations.monadOperations ?? []).map<OperationEntry<Obj, Arr>>((operation) => ({
    kind: "monad",
    operation: operation as MonadOperation<Obj, Arr, unknown, unknown>,
  }));
  const comonad = (operations.comonadCooperations ?? []).map<OperationEntry<Obj, Arr>>((operation) => ({
    kind: "comonad",
    operation: operation as ComonadCooperation<Obj, Arr, unknown, unknown>,
  }));
  return [...monad, ...comonad];
};

const listObjects = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): ReadonlyArray<Obj> => law.convolution.fibers.map((fiber) => fiber.output);

export interface DegeneracyProofStep<Obj, Arr> {
  readonly label: string;
  readonly description: string;
  readonly object?: Obj;
  readonly arrow?: Arr;
  readonly metadata?: ReadonlyArray<string>;
  readonly pairingComponent?: unknown;
  readonly gaps?: ReadonlyArray<string>;
}

export interface NullaryComponentWitness<Obj, Arr> {
  readonly object: Obj;
  readonly arrow: Arr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface NullaryDegeneracyWitness<Obj, Arr> {
  readonly kind: "monad" | "comonad";
  readonly label: string;
  readonly arity: number;
  readonly operationMetadata?: ReadonlyArray<string>;
  readonly nullary: NullaryOperationMetadata<Obj, Arr>;
  readonly components: ReadonlyArray<NullaryComponentWitness<Obj, Arr>>;
}

export interface NullaryDegeneracyReport<Obj, Arr, Left, Right, Value> {
  readonly holds: boolean;
  readonly witnesses: ReadonlyArray<NullaryDegeneracyWitness<Obj, Arr>>;
  readonly steps: ReadonlyArray<DegeneracyProofStep<Obj, Arr>>;
  readonly details?: string;
  readonly finalLaw?: FinalLaw<Obj, Arr>;
  readonly zeroComparisons: ReadonlyArray<ZeroComparisonWitness<Obj, Right>>;
  readonly fixedLeftInitial?: FixedLeftInitialObject<Obj, Arr, Left, Value>;
  readonly fixedRightInitial?: FixedRightInitialObject<Obj, Arr, Right, Value>;
}

const buildNullaryWitness = <Obj, Arr>(
  kind: "monad" | "comonad",
  label: string,
  arity: number,
  nullary: NullaryOperationMetadata<Obj, Arr>,
  objects: ReadonlyArray<Obj>,
  operationMetadata?: ReadonlyArray<string>,
): NullaryDegeneracyWitness<Obj, Arr> => ({
  kind,
  label,
  arity,
  operationMetadata,
  nullary,
  components: objects.map((object) => ({
    object,
    arrow: nullary.component(object),
    metadata: nullary.metadata ?? operationMetadata,
  })),
});

const describeNullaryStep = <Obj, Arr>(
  witness: NullaryDegeneracyWitness<Obj, Arr>,
): DegeneracyProofStep<Obj, Arr> => ({
  label: "nullary-collapse",
  description: `Nullary operation ${witness.label} forces constant-zero interaction partners via Theorem 1.`,
  metadata: witness.operationMetadata,
});

export const checkNullaryDegeneracy = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): NullaryDegeneracyReport<Obj, Arr, Left, Right, Value> => {
  const objects = listObjects(law);
  const witnesses = enumerateOperations(law.operations)
    .map((entry) => {
      const { operation } = entry;
      if (!operation.nullary) return undefined;
      return buildNullaryWitness(
        entry.kind,
        operation.label,
        operation.arity,
        operation.nullary,
        objects,
        operation.metadata,
      );
    })
    .filter((value): value is NullaryDegeneracyWitness<Obj, Arr> => value !== undefined);

  const holds = witnesses.length > 0;
  const steps = witnesses.map(describeNullaryStep);
  const details = holds
    ? "Detected nullary operations; interaction partners collapse to the constant-zero functor per Theorem 1."
    : undefined;
  const finalLaw = holds ? finalInteractionLaw(law.kernel) : undefined;
  const fixedLeftInitial = holds ? buildFixedLeftInitialObject(law) : undefined;
  const fixedRightInitial = holds ? buildFixedRightInitialObject(law) : undefined;
  const zeroComparisons = holds ? objects.map((object) => buildZeroComparison(law, object)) : [];

  return {
    holds,
    witnesses,
    steps,
    ...(details ? { details } : {}),
    ...(finalLaw ? { finalLaw } : {}),
    zeroComparisons,
    ...(fixedLeftInitial ? { fixedLeftInitial } : {}),
    ...(fixedRightInitial ? { fixedRightInitial } : {}),
  };
};

export interface CommutativeBinaryComponentWitness<Obj, Arr> {
  readonly object: Obj;
  readonly arrow: Arr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface CommutativeBinaryDegeneracyWitness<Obj, Arr> {
  readonly kind: "monad" | "comonad";
  readonly label: string;
  readonly arity: number;
  readonly operationMetadata?: ReadonlyArray<string>;
  readonly components: ReadonlyArray<CommutativeBinaryComponentWitness<Obj, Arr>>;
  readonly swapWitness?: Arr;
  readonly operationEntry: OperationEntry<Obj, Arr>;
}

export interface CommutativeBinaryDegeneracyTrace<Obj, Arr, Right> {
  readonly label: string;
  readonly object: Obj;
  readonly steps: ReadonlyArray<DegeneracyProofStep<Obj, Arr>>;
  readonly zeroComparison?: ZeroComparisonWitness<Obj, Right>;
  readonly artifacts: CommutativeBinaryDegeneracyArtifacts<Obj, Arr, Right>;
}

export interface CommutativeBinaryDegeneracyReport<Obj, Arr, Left, Right, Value> {
  readonly holds: boolean;
  readonly witnesses: ReadonlyArray<CommutativeBinaryDegeneracyWitness<Obj, Arr>>;
  readonly traces: ReadonlyArray<CommutativeBinaryDegeneracyTrace<Obj, Arr, Right>>;
  readonly symmetric: boolean;
  readonly details?: string;
  readonly finalLaw?: FinalLaw<Obj, Arr>;
  readonly zeroComparisons: ReadonlyArray<ZeroComparisonWitness<Obj, Right>>;
  readonly fixedLeftInitial?: FixedLeftInitialObject<Obj, Arr, Left, Value>;
  readonly fixedRightInitial?: FixedRightInitialObject<Obj, Arr, Right, Value>;
}

export interface CommutativeBinaryDegeneracyArtifacts<Obj, Arr, Right> {
  readonly object: Obj;
  readonly duplication?: Arr;
  readonly duplicationGap?: string;
  readonly substitution?: Arr;
  readonly substitutionGap?: string;
  readonly transformation?: Arr;
  readonly transformationGap?: string;
  readonly operationComponent: Arr;
  readonly operationMetadata: ReadonlyArray<string>;
  readonly lawvereMetadata: ReadonlyArray<string>;
  readonly dayReferenceMetadata: ReadonlyArray<string>;
  readonly zeroComparison?: ZeroComparisonWitness<Obj, Right>;
  readonly zeroComparisonGap?: string;
  readonly toTerminal?: SetHom<Right, SetTerminalObject>;
  readonly toTerminalGap?: string;
  readonly terminalCoproduct?: CoproductData<SetTerminalObject, SetTerminalObject>;
  readonly terminalDiagonal?: SetHom<
    Right,
    Coproduct<SetTerminalObject, SetTerminalObject>
  >;
  readonly terminalDiagonalGap?: string;
  readonly zeroCoproduct?: CoproductData<never, never>;
  readonly kPrime?: SetHom<Right, Coproduct<never, never>>;
  readonly kPrimeGap?: string;
}

const combineMetadata = (
  ...sources: ReadonlyArray<ReadonlyArray<string> | undefined>
): ReadonlyArray<string> => {
  const aggregate = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const value of source) {
      aggregate.add(value);
    }
  }
  return Array.from(aggregate);
};

const buildBinaryWitness = <Obj, Arr>(
  entry: OperationEntry<Obj, Arr>,
  objects: ReadonlyArray<Obj>,
  component: (object: Obj) => Arr,
  metadata?: ReadonlyArray<string>,
  swapWitness?: Arr,
): CommutativeBinaryDegeneracyWitness<Obj, Arr> => ({
  kind: entry.kind,
  label: entry.operation.label,
  arity: entry.operation.arity,
  operationMetadata: metadata,
  components: objects.map((object) => ({
    object,
    arrow: component(object),
    metadata,
  })),
  ...(swapWitness ? { swapWitness } : {}),
  operationEntry: entry,
});

const gatherBinaryArtifacts = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  witness: CommutativeBinaryDegeneracyWitness<Obj, Arr>,
  component: CommutativeBinaryComponentWitness<Obj, Arr>,
  zeroComparison: ZeroComparisonWitness<Obj, Right> | undefined,
): CommutativeBinaryDegeneracyArtifacts<Obj, Arr, Right> => {
  const { operationEntry } = witness;
  const dayMetadata = combineMetadata(
    ...(operationEntry.operation.dayReferences ?? []).map((reference) => reference.metadata),
  );
  const lawvereMetadata = combineMetadata(operationEntry.operation.lawvereWitness?.metadata);
  const operationMetadata = combineMetadata(
    witness.operationMetadata,
    component.metadata,
    operationEntry.operation.metadata,
    operationEntry.operation.commutativeBinary?.metadata,
  );

  const duplication =
    operationEntry.kind === "comonad"
      ? operationEntry.operation.genericDuplication?.(component.object)
      : undefined;
  const substitution =
    operationEntry.kind === "monad"
      ? operationEntry.operation.kleisliOnGeneric?.(component.object)
      : undefined;
  const transformation = operationEntry.operation.transformation?.transformation.component(
    component.object,
  );

  const duplicationGap =
    duplication === undefined
      ? "Missing duplication witness β^2_Y; supply genericDuplication for the comonad component."
      : undefined;
  const substitutionGap =
    substitution === undefined && operationEntry.kind === "monad"
      ? "Missing Kleisli-on-generic arrow κ_Y needed to build f_Y in Theorem 2."
      : undefined;
  const transformationGap =
    transformation === undefined
      ? "Natural transformation component α^2_Y unavailable; provide transformation metadata for the operation."
      : undefined;
  const zeroComparisonGap =
    zeroComparison === undefined
      ? "Zero-comparison witness absent; run nullary degeneracy to obtain maps into the initial object."
      : undefined;

  const rightCarrier = zeroComparison?.domain ?? law.right.functor.F0(component.object);

  const terminalData = SetCat.terminal();
  const terminal = terminalData.object;
  const terminalCoproduct = SetCat.coproduct(terminal, terminal);
  const toTerminal = rightCarrier
    ? terminalData.terminate(rightCarrier)
    : undefined;
  const toTerminalGap =
    toTerminal === undefined
      ? "Unable to terminate the right carrier at the terminal object." 
      : undefined;
  const terminalDiagonal =
    toTerminal === undefined
      ? undefined
      : SetCat.compose(terminalCoproduct.injections.inl, toTerminal);
  const terminalDiagonalGap =
    terminalDiagonal === undefined
      ? "Missing diagonal into 1 + 1; ensure the right carrier terminates." 
      : undefined;

  const initialData = SetCat.initial();
  const zeroCoproduct = SetCat.coproduct(initialData.object, initialData.object);
  const kPrime =
    zeroComparison === undefined
      ? undefined
      : SetCat.compose(zeroCoproduct.injections.inl, zeroComparison.toZero);
  const kPrimeGap =
    kPrime === undefined
      ? "Unable to assemble k'_Y without a zero-comparison witness."
      : undefined;

  return {
    object: component.object,
    duplication,
    duplicationGap,
    substitution,
    substitutionGap,
    transformation,
    transformationGap,
    operationComponent: component.arrow,
    operationMetadata,
    lawvereMetadata,
    dayReferenceMetadata: dayMetadata,
    zeroComparison,
    zeroComparisonGap,
    toTerminal,
    toTerminalGap,
    terminalCoproduct,
    terminalDiagonal,
    terminalDiagonalGap,
    zeroCoproduct,
    kPrime,
    kPrimeGap,
  };
};

const buildBinarySteps = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  _witness: CommutativeBinaryDegeneracyWitness<Obj, Arr>,
  component: CommutativeBinaryComponentWitness<Obj, Arr>,
  artifacts: CommutativeBinaryDegeneracyArtifacts<Obj, Arr, Right>,
): ReadonlyArray<DegeneracyProofStep<Obj, Arr>> => {
  const steps: DegeneracyProofStep<Obj, Arr>[] = [
    {
      label: "diagonal-delta",
      description:
        "Construct diagonal δ_Y : Y → Y × Y to duplicate the generic element as in Theorem 2 part (1).",
      object: component.object,
      ...(artifacts.duplication ? { arrow: artifacts.duplication } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.duplicationGap ? { gaps: [artifacts.duplicationGap] } : {}),
    },
    {
      label: "lift-through-functor",
      description:
        "Lift δ_Y through the functor/transformation to obtain α^2_Y ∘ Tδ_Y for collapse analysis.",
      object: component.object,
      ...(artifacts.transformation ? { arrow: artifacts.transformation } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.transformationGap ? { gaps: [artifacts.transformationGap] } : {}),
    },
    {
      label: "apply-commutative-operation",
      description:
        "Apply the commutative binary component, producing the candidate collapse map α^2_Y.",
      object: component.object,
      arrow: artifacts.operationComponent,
      metadata: artifacts.operationMetadata,
    },
    {
      label: "construct-fY",
      description:
        "Assemble f_Y via substitution on the generic element, as required in Theorem 2 part (1).",
      object: component.object,
      ...(artifacts.substitution ? { arrow: artifacts.substitution } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.substitutionGap ? { gaps: [artifacts.substitutionGap] } : {}),
    },
  ];

  if (artifacts.lawvereMetadata.length > 0) {
    steps.push({
      label: "lawvere-comparison",
      description:
        "Reference the Lawvere-theory morphism μ₂ witnessing substitution compatibility for the operation.",
      object: component.object,
      metadata: artifacts.lawvereMetadata,
    });
  }

  if (artifacts.dayReferenceMetadata.length > 0) {
    steps.push({
      label: "day-fiber-reference",
      description:
        "Track the Day fiber indices used when aggregating the interaction pairing for this operation.",
      object: component.object,
      metadata: artifacts.dayReferenceMetadata,
    });
  }

  steps.push(
    {
      label: "construct-hY",
      description:
        "Terminate the right-hand carrier to obtain h_Y : GY → 1 as used in the uniqueness argument.",
      object: component.object,
      ...(artifacts.toTerminal ? { arrow: artifacts.toTerminal } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.toTerminalGap ? { gaps: [artifacts.toTerminalGap] } : {}),
    },
    {
      label: "construct-deltaPrimeY",
      description:
        "Compose h_Y with the canonical injection into 1 + 1 to form δ'_Y for Theorem 2 part (2).",
      object: component.object,
      ...(artifacts.terminalDiagonal ? { arrow: artifacts.terminalDiagonal } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.terminalDiagonalGap ? { gaps: [artifacts.terminalDiagonalGap] } : {}),
    },
    {
      label: "construct-kPrimeY",
      description:
        "Factor through the zero coproduct to obtain k'_Y as in Theorem 2 part (2).",
      object: component.object,
      ...(artifacts.kPrime ? { arrow: artifacts.kPrime } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.kPrimeGap ? { gaps: [artifacts.kPrimeGap] } : {}),
    },
    {
      label: "construct-kY",
      description:
        "Use the uniqueness of maps into the zero object to build the final collapse morphism k_Y : GY → 0.",
      object: component.object,
      ...(artifacts.zeroComparison ? { arrow: artifacts.zeroComparison.toZero } : {}),
      metadata: artifacts.operationMetadata,
      ...(artifacts.zeroComparisonGap ? { gaps: [artifacts.zeroComparisonGap] } : {}),
    },
  );

  const pairing = law.getPairingComponent(component.object);
  if (pairing) {
    steps.push({
      label: "compare-with-pairing",
      description: "Compare the constructed collapse map with the stored Day pairing component.",
      object: component.object,
      pairingComponent: pairing,
      metadata: artifacts.operationMetadata,
    });
  }

  return steps;
};

export const checkCommutativeBinaryDegeneracy = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): CommutativeBinaryDegeneracyReport<Obj, Arr, Left, Right, Value> => {
  const objects = listObjects(law);
  const witnesses = enumerateOperations(law.operations)
    .map((entry) => {
      const { operation } = entry;
      if (!operation.commutativeBinary) return undefined;
      return buildBinaryWitness(
        entry,
        objects,
        operation.commutativeBinary.component,
        operation.commutativeBinary.metadata ?? operation.metadata,
        operation.commutativeBinary.swapWitness,
      );
    })
    .filter((value): value is CommutativeBinaryDegeneracyWitness<Obj, Arr> => value !== undefined);

  const holds = witnesses.length > 0;
  const zeroComparisons = holds ? objects.map((object) => buildZeroComparison(law, object)) : [];
  const zeroMap = new Map(zeroComparisons.map((entry) => [entry.object, entry]));

  const traces = holds
    ? witnesses.flatMap((witness) =>
        witness.components.map<CommutativeBinaryDegeneracyTrace<Obj, Arr, Right>>((component) => {
          const zeroComparison = zeroMap.get(component.object);
          const artifacts = gatherBinaryArtifacts(law, witness, component, zeroComparison);
          return {
            label: `${witness.label}(${String(component.object)})`,
            object: component.object,
            steps: buildBinarySteps(law, witness, component, artifacts),
            zeroComparison,
            artifacts,
          };
        }),
      )
    : [];

  const symmetric = witnesses.length === 0 || witnesses.every((witness) => witness.swapWitness !== undefined);
  const details = holds
    ? "Detected commutative binary operations; Theorem 2 collapse applies with recorded proof traces."
    : undefined;
  const finalLaw = holds ? finalInteractionLaw(law.kernel) : undefined;
  const fixedLeftInitial = holds ? buildFixedLeftInitialObject(law) : undefined;
  const fixedRightInitial = holds ? buildFixedRightInitialObject(law) : undefined;

  return {
    holds,
    witnesses,
    traces,
    symmetric,
    ...(details ? { details } : {}),
    ...(finalLaw ? { finalLaw } : {}),
    zeroComparisons,
    ...(fixedLeftInitial ? { fixedLeftInitial } : {}),
    ...(fixedRightInitial ? { fixedRightInitial } : {}),
  };
};

export interface LawvereComparisonWitness<LawObj, LawArr> {
  readonly label: string;
  readonly witness: LawvereOperationWitness<LawObj, LawArr>;
}

export interface NullaryDropMapWitness<Obj, Arr> {
  readonly label: string;
  readonly kind: "monad" | "comonad";
  readonly object: Obj;
  readonly arrow: Arr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FunctorOperationDegeneracyReport<Obj, Arr, Left, Right, Value, LawObj, LawArr> {
  readonly nullary: NullaryDegeneracyReport<Obj, Arr, Left, Right, Value>;
  readonly commutativeBinary: CommutativeBinaryDegeneracyReport<Obj, Arr, Left, Right, Value>;
  readonly lawvereWitnesses: ReadonlyArray<LawvereComparisonWitness<LawObj, LawArr>>;
  readonly substitutionReferences: ReadonlyArray<OperationDayReference<Obj>>;
  readonly dropMaps: ReadonlyArray<NullaryDropMapWitness<Obj, Arr>>;
  readonly metadata?: ReadonlyArray<string>;
  readonly finalLaw?: FinalLaw<Obj, Arr>;
  readonly zeroComparisons: ReadonlyArray<ZeroComparisonWitness<Obj, Right>>;
}

export const analyzeFunctorOperationDegeneracy = <Obj, Arr, Left, Right, Value, LawObj, LawArr>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): FunctorOperationDegeneracyReport<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const operations = enumerateOperations(law.operations);
  const nullary = checkNullaryDegeneracy(law);
  const commutativeBinary = checkCommutativeBinaryDegeneracy(law);

  const lawvereWitnesses: Array<LawvereComparisonWitness<LawObj, LawArr>> = [];
  const substitutionReferences: Array<OperationDayReference<Obj>> = [];
  const dropMaps: Array<NullaryDropMapWitness<Obj, Arr>> = [];

  const objects = listObjects(law);

  operations.forEach((entry) => {
    const { operation } = entry;
    if (operation.lawvereWitness) {
      lawvereWitnesses.push({
        label: operation.label,
        witness: operation.lawvereWitness as LawvereOperationWitness<LawObj, LawArr>,
      });
    }
    if (operation.dayReferences) {
      substitutionReferences.push(...operation.dayReferences);
    }
    if (operation.nullary) {
      dropMaps.push(
        ...objects.map<NullaryDropMapWitness<Obj, Arr>>((object) => ({
          label: operation.label,
          kind: entry.kind,
          object,
          arrow: operation.nullary!.component(object),
          metadata: operation.nullary?.metadata ?? operation.metadata,
        })),
      );
    }
  });

  const finalLaw = nullary.finalLaw ?? commutativeBinary.finalLaw;
  const zeroComparisons =
    nullary.zeroComparisons.length > 0
      ? nullary.zeroComparisons
      : commutativeBinary.zeroComparisons;

  return {
    nullary,
    commutativeBinary,
    lawvereWitnesses,
    substitutionReferences,
    dropMaps,
    ...(law.operations?.metadata ? { metadata: law.operations.metadata } : {}),
    ...(finalLaw ? { finalLaw } : {}),
    zeroComparisons,
  };
};
