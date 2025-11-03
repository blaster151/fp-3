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

type OperationEntry<Obj, Arr> =
  | {
      readonly kind: "monad";
      readonly operation: MonadOperation<Obj, Arr, unknown, unknown>;
    }
  | {
      readonly kind: "comonad";
      readonly operation: ComonadCooperation<Obj, Arr, unknown, unknown>;
    };

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
  const domain = law.right.functor.F0(object) as SetObj<Right>;
  const initial = SetCat.initial();
  const zero = initial.object as SetObj<never>;
  const toZero = SetCat.hom(domain, zero, (_value): never => {
    throw new Error(
      "Degeneracy zero map invoked; interacting functor should collapse to the initial object.",
    );
  });
  const fromZero = initial.initialize(domain);
  return { object, domain, zero, toZero, fromZero };
};

const enumerateOperations = <Obj, Arr>(
  operations: FunctorInteractionLawOperations<Obj, Arr> | undefined,
): ReadonlyArray<OperationEntry<Obj, Arr>> => {
  if (!operations) return [];
  const monad = (operations.monadOperations ?? []).map<OperationEntry<Obj, Arr>>((operation) => ({
    kind: "monad",
    operation,
  }));
  const comonad = (operations.comonadCooperations ?? []).map<OperationEntry<Obj, Arr>>((operation) => ({
    kind: "comonad",
    operation,
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
): NullaryDegeneracyWitness<Obj, Arr> => {
  const components = objects.map((object) => {
    const metadata = nullary.metadata ?? operationMetadata;
    return metadata && metadata.length > 0
      ? {
          object,
          arrow: nullary.component(object),
          metadata,
        }
      : {
          object,
          arrow: nullary.component(object),
        };
  });

  const base: Omit<NullaryDegeneracyWitness<Obj, Arr>, "operationMetadata"> = {
    kind,
    label,
    arity,
    nullary,
    components,
  };

  return operationMetadata && operationMetadata.length > 0
    ? { ...base, operationMetadata }
    : base;
};

const describeNullaryStep = <Obj, Arr>(
  witness: NullaryDegeneracyWitness<Obj, Arr>,
): DegeneracyProofStep<Obj, Arr> => {
  const base: Omit<DegeneracyProofStep<Obj, Arr>, "metadata"> = {
    label: "nullary-collapse",
    description: `Nullary operation ${witness.label} forces constant-zero interaction partners via Theorem 1.`,
  };
  return witness.operationMetadata && witness.operationMetadata.length > 0
    ? { ...base, metadata: witness.operationMetadata }
    : base;
};

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
  readonly operationMetadata?: ReadonlyArray<string>;
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
  ...(metadata && metadata.length > 0 ? { operationMetadata: metadata } : {}),
  components: objects.map((object) =>
    metadata && metadata.length > 0
      ? { object, arrow: component(object), metadata }
      : { object, arrow: component(object) },
  ),
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
      ? "Missing duplication witness ?^2_Y; supply genericDuplication for the comonad component."
      : undefined;
  const substitutionGap =
    substitution === undefined && operationEntry.kind === "monad"
      ? "Missing Kleisli-on-generic arrow ?_Y needed to build f_Y in Theorem 2."
      : undefined;
  const transformationGap =
    transformation === undefined
      ? "Natural transformation component ?^2_Y unavailable; provide transformation metadata for the operation."
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

  const artifacts: CommutativeBinaryDegeneracyArtifacts<Obj, Arr, Right> = {
    object: component.object,
    operationComponent: component.arrow,
    lawvereMetadata,
    dayReferenceMetadata: dayMetadata,
  };

  if (operationMetadata.length > 0) {
    artifacts.operationMetadata = operationMetadata;
  }
  if (duplication !== undefined) {
    artifacts.duplication = duplication;
  }
  if (duplicationGap) {
    artifacts.duplicationGap = duplicationGap;
  }
  if (substitution !== undefined) {
    artifacts.substitution = substitution;
  }
  if (substitutionGap) {
    artifacts.substitutionGap = substitutionGap;
  }
  if (transformation !== undefined) {
    artifacts.transformation = transformation;
  }
  if (transformationGap) {
    artifacts.transformationGap = transformationGap;
  }
  if (zeroComparison !== undefined) {
    artifacts.zeroComparison = zeroComparison;
  }
  if (zeroComparisonGap) {
    artifacts.zeroComparisonGap = zeroComparisonGap;
  }
  if (toTerminal !== undefined) {
    artifacts.toTerminal = toTerminal;
  }
  if (toTerminalGap) {
    artifacts.toTerminalGap = toTerminalGap;
  }
  if (terminalCoproduct !== undefined) {
    artifacts.terminalCoproduct = terminalCoproduct;
  }
  if (terminalDiagonal !== undefined) {
    artifacts.terminalDiagonal = terminalDiagonal;
  }
  if (terminalDiagonalGap) {
    artifacts.terminalDiagonalGap = terminalDiagonalGap;
  }
  if (zeroCoproduct !== undefined) {
    artifacts.zeroCoproduct = zeroCoproduct;
  }
  if (kPrime !== undefined) {
    artifacts.kPrime = kPrime;
  }
  if (kPrimeGap) {
    artifacts.kPrimeGap = kPrimeGap;
  }

  return artifacts;
};

const buildBinarySteps = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  _witness: CommutativeBinaryDegeneracyWitness<Obj, Arr>,
  component: CommutativeBinaryComponentWitness<Obj, Arr>,
  artifacts: CommutativeBinaryDegeneracyArtifacts<Obj, Arr, Right>,
): ReadonlyArray<DegeneracyProofStep<Obj, Arr>> => {
  const steps: DegeneracyProofStep<Obj, Arr>[] = [];
  const pushStep = (
    base: Omit<DegeneracyProofStep<Obj, Arr>, "metadata">,
    metadata: ReadonlyArray<string> | undefined,
  ) => {
    steps.push(metadata && metadata.length > 0 ? { ...base, metadata } : base);
  };

  pushStep(
    {
      label: "diagonal-delta",
      description:
        "Construct diagonal ?_Y : Y ? Y ? Y to duplicate the generic element as in Theorem 2 part (1).",
      object: component.object,
      ...(artifacts.duplication ? { arrow: artifacts.duplication } : {}),
      ...(artifacts.duplicationGap ? { gaps: [artifacts.duplicationGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  pushStep(
    {
      label: "lift-through-functor",
      description:
        "Lift ?_Y through the functor/transformation to obtain ?^2_Y ? T?_Y for collapse analysis.",
      object: component.object,
      ...(artifacts.transformation ? { arrow: artifacts.transformation } : {}),
      ...(artifacts.transformationGap ? { gaps: [artifacts.transformationGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  pushStep(
    {
      label: "apply-commutative-operation",
      description:
        "Apply the commutative binary component, producing the candidate collapse map ?^2_Y.",
      object: component.object,
      arrow: artifacts.operationComponent,
    },
    artifacts.operationMetadata,
  );

  pushStep(
    {
      label: "construct-fY",
      description:
        "Assemble f_Y via substitution on the generic element, as required in Theorem 2 part (1).",
      object: component.object,
      ...(artifacts.substitution ? { arrow: artifacts.substitution } : {}),
      ...(artifacts.substitutionGap ? { gaps: [artifacts.substitutionGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  if (artifacts.lawvereMetadata.length > 0) {
    pushStep(
      {
        label: "lawvere-comparison",
        description:
          "Reference the Lawvere-theory morphism ?? witnessing substitution compatibility for the operation.",
        object: component.object,
      },
      artifacts.lawvereMetadata,
    );
  }

  if (artifacts.dayReferenceMetadata.length > 0) {
    pushStep(
      {
        label: "day-fiber-reference",
        description:
          "Track the Day fiber indices used when aggregating the interaction pairing for this operation.",
        object: component.object,
      },
      artifacts.dayReferenceMetadata,
    );
  }

  pushStep(
    {
      label: "construct-hY",
      description:
        "Terminate the right-hand carrier to obtain h_Y : GY ? 1 as used in the uniqueness argument.",
      object: component.object,
      ...(artifacts.toTerminalGap ? { gaps: [artifacts.toTerminalGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  pushStep(
    {
      label: "construct-deltaPrimeY",
      description:
        "Compose h_Y with the canonical injection into 1 + 1 to form ?'_Y for Theorem 2 part (2).",
      object: component.object,
      ...(artifacts.terminalDiagonalGap ? { gaps: [artifacts.terminalDiagonalGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  pushStep(
    {
      label: "construct-kPrimeY",
      description:
        "Factor through the zero coproduct to obtain k'_Y as in Theorem 2 part (2).",
      object: component.object,
      ...(artifacts.kPrimeGap ? { gaps: [artifacts.kPrimeGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  pushStep(
    {
      label: "construct-kY",
      description:
        "Use the uniqueness of maps into the zero object to build the final collapse morphism k_Y : GY ? 0.",
      object: component.object,
      ...(artifacts.zeroComparisonGap ? { gaps: [artifacts.zeroComparisonGap] } : {}),
    },
    artifacts.operationMetadata,
  );

  const pairing = law.getPairingComponent(component.object);
  if (pairing) {
    pushStep(
      {
        label: "compare-with-pairing",
        description: "Compare the constructed collapse map with the stored Day pairing component.",
        object: component.object,
        pairingComponent: pairing,
      },
      artifacts.operationMetadata,
    );
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
        ...objects.map<NullaryDropMapWitness<Obj, Arr>>((object) => {
          const metadata = operation.nullary?.metadata ?? operation.metadata;
          const base: Omit<NullaryDropMapWitness<Obj, Arr>, "metadata"> = {
            label: operation.label,
            kind: entry.kind,
            object,
            arrow: operation.nullary!.component(object),
          };
          return metadata && metadata.length > 0 ? { ...base, metadata } : base;
        }),
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
