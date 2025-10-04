import { EquipmentLawRegistry, type EquipmentLawKey } from "./equipment-laws";

export interface OracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
}

const pendingOracle = (law: EquipmentLawKey): OracleResult => {
  const descriptor = EquipmentLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details: `${descriptor.name} oracle is not implemented yet. Summary: ${descriptor.summary}`,
  };
};

export const EquipmentOracles = {
  companion: {
    unit: () => pendingOracle("companionUnit"),
    counit: () => pendingOracle("companionCounit"),
  },
  conjoint: {
    unit: () => pendingOracle("conjointUnit"),
    counit: () => pendingOracle("conjointCounit"),
  },
  looseMonad: {
    unit: () => pendingOracle("looseMonadUnit"),
    multiplication: () => pendingOracle("looseMonadMultiplication"),
  },
  skew: {
    composition: () => pendingOracle("skewSubstitution"),
  },
  maps: {
    representableRight: () => pendingOracle("mapFromRepresentableRight"),
  },
  extensions: {
    rightExtension: () => pendingOracle("rightExtensionCounit"),
    rightLift: () => pendingOracle("rightLiftUnit"),
    compatibility: () => pendingOracle("rightExtensionLiftCompatibility"),
  },
  weighted: {
    cone: () => pendingOracle("weightedConeFraming"),
    cocone: () => pendingOracle("weightedCoconeFraming"),
    colimitRestriction: () => pendingOracle("weightedColimitRestriction"),
    limitRestriction: () => pendingOracle("weightedLimitRestriction"),
    leftExtension: () => pendingOracle("leftExtensionFromColimit"),
  },
  density: {
    identity: () => pendingOracle("densityIdentity"),
  },
  faithfulness: {
    restrictions: () => pendingOracle("fullyFaithfulRestrictions"),
    pointwise: () => pendingOracle("pointwiseLeftExtensionLift"),
    leftExtension: () => pendingOracle("fullyFaithfulLeftExtension"),
  },
  absolute: {
    colimit: () => pendingOracle("absoluteColimitComparison"),
    leftExtension: () => pendingOracle("absoluteLeftExtension"),
    pointwiseLeftLift: () => pendingOracle("pointwiseLeftLift"),
  },
} as const;

export const enumeratePendingEquipmentOracles = (): ReadonlyArray<OracleResult> => [
  EquipmentOracles.companion.unit(),
  EquipmentOracles.companion.counit(),
  EquipmentOracles.conjoint.unit(),
  EquipmentOracles.conjoint.counit(),
  EquipmentOracles.looseMonad.unit(),
  EquipmentOracles.looseMonad.multiplication(),
  EquipmentOracles.skew.composition(),
  EquipmentOracles.maps.representableRight(),
  EquipmentOracles.extensions.rightExtension(),
  EquipmentOracles.extensions.rightLift(),
  EquipmentOracles.extensions.compatibility(),
  EquipmentOracles.weighted.cone(),
  EquipmentOracles.weighted.cocone(),
  EquipmentOracles.weighted.colimitRestriction(),
  EquipmentOracles.weighted.limitRestriction(),
  EquipmentOracles.weighted.leftExtension(),
  EquipmentOracles.density.identity(),
  EquipmentOracles.faithfulness.restrictions(),
  EquipmentOracles.faithfulness.pointwise(),
  EquipmentOracles.faithfulness.leftExtension(),
  EquipmentOracles.absolute.colimit(),
  EquipmentOracles.absolute.leftExtension(),
  EquipmentOracles.absolute.pointwiseLeftLift(),
];

export interface EquipmentOracleSummary {
  readonly companion: {
    readonly unit: OracleResult;
    readonly counit: OracleResult;
  };
  readonly conjoint: {
    readonly unit: OracleResult;
    readonly counit: OracleResult;
  };
  readonly looseMonad: {
    readonly unit: OracleResult;
    readonly multiplication: OracleResult;
  };
  readonly skew: {
    readonly composition: OracleResult;
  };
  readonly maps: {
    readonly representableRight: OracleResult;
  };
  readonly extensions: {
    readonly rightExtension: OracleResult;
    readonly rightLift: OracleResult;
    readonly compatibility: OracleResult;
  };
  readonly weighted: {
    readonly cone: OracleResult;
    readonly cocone: OracleResult;
    readonly colimitRestriction: OracleResult;
    readonly limitRestriction: OracleResult;
    readonly leftExtension: OracleResult;
  };
  readonly density: {
    readonly identity: OracleResult;
  };
  readonly faithfulness: {
    readonly restrictions: OracleResult;
    readonly pointwise: OracleResult;
    readonly leftExtension: OracleResult;
  };
  readonly absolute: {
    readonly colimit: OracleResult;
    readonly leftExtension: OracleResult;
    readonly pointwiseLeftLift: OracleResult;
  };
  readonly overall: boolean;
}

export const summarizeEquipmentOracles = (): EquipmentOracleSummary => {
  const companionUnit = EquipmentOracles.companion.unit();
  const companionCounit = EquipmentOracles.companion.counit();
  const conjointUnit = EquipmentOracles.conjoint.unit();
  const conjointCounit = EquipmentOracles.conjoint.counit();
  const looseMonadUnit = EquipmentOracles.looseMonad.unit();
  const looseMonadMultiplication = EquipmentOracles.looseMonad.multiplication();
  const skewComposition = EquipmentOracles.skew.composition();
  const representableRight = EquipmentOracles.maps.representableRight();
  const rightExtension = EquipmentOracles.extensions.rightExtension();
  const rightLift = EquipmentOracles.extensions.rightLift();
  const compatibility = EquipmentOracles.extensions.compatibility();
  const weightedCone = EquipmentOracles.weighted.cone();
  const weightedCocone = EquipmentOracles.weighted.cocone();
  const weightedColimitRestriction = EquipmentOracles.weighted.colimitRestriction();
  const weightedLimitRestriction = EquipmentOracles.weighted.limitRestriction();
  const weightedLeftExtension = EquipmentOracles.weighted.leftExtension();
  const densityIdentity = EquipmentOracles.density.identity();
  const faithfulnessRestrictions = EquipmentOracles.faithfulness.restrictions();
  const faithfulnessPointwise = EquipmentOracles.faithfulness.pointwise();
  const faithfulnessLeftExtension = EquipmentOracles.faithfulness.leftExtension();
  const absoluteColimit = EquipmentOracles.absolute.colimit();
  const absoluteLeftExtension = EquipmentOracles.absolute.leftExtension();
  const absolutePointwiseLeftLift = EquipmentOracles.absolute.pointwiseLeftLift();

  const all = [
    companionUnit,
    companionCounit,
    conjointUnit,
    conjointCounit,
    looseMonadUnit,
    looseMonadMultiplication,
    skewComposition,
    representableRight,
    rightExtension,
    rightLift,
    compatibility,
    weightedCone,
    weightedCocone,
    weightedColimitRestriction,
    weightedLimitRestriction,
    weightedLeftExtension,
    densityIdentity,
    faithfulnessRestrictions,
    faithfulnessPointwise,
    faithfulnessLeftExtension,
    absoluteColimit,
    absoluteLeftExtension,
    absolutePointwiseLeftLift,
  ];

  return {
    companion: {
      unit: companionUnit,
      counit: companionCounit,
    },
    conjoint: {
      unit: conjointUnit,
      counit: conjointCounit,
    },
    looseMonad: {
      unit: looseMonadUnit,
      multiplication: looseMonadMultiplication,
    },
    skew: {
      composition: skewComposition,
    },
    maps: {
      representableRight,
    },
    extensions: {
      rightExtension,
      rightLift,
      compatibility,
    },
    weighted: {
      cone: weightedCone,
      cocone: weightedCocone,
      colimitRestriction: weightedColimitRestriction,
      limitRestriction: weightedLimitRestriction,
      leftExtension: weightedLeftExtension,
    },
    density: {
      identity: densityIdentity,
    },
    faithfulness: {
      restrictions: faithfulnessRestrictions,
      pointwise: faithfulnessPointwise,
      leftExtension: faithfulnessLeftExtension,
    },
    absolute: {
      colimit: absoluteColimit,
      leftExtension: absoluteLeftExtension,
      pointwiseLeftLift: absolutePointwiseLeftLift,
    },
    overall: all.every((entry) => entry.holds && !entry.pending),
  };
};
