import type {
  RelativeAdjunctionColimitPreservationInput,
  RelativeAdjunctionData,
  RelativeAdjunctionFullyFaithfulPostcompositionInput,
  RelativeAdjunctionInducedMonadsInput,
  RelativeAdjunctionLeftLiftInput,
  RelativeAdjunctionLeftMorphismData,
  RelativeAdjunctionPrecompositionInput,
  RelativeAdjunctionPastingInput,
  RelativeAdjunctionResoluteInput,
  RelativeAdjunctionResoluteLeftMorphismInput,
  RelativeAdjunctionRightExtensionInput,
  RelativeAdjunctionRightMorphismData,
  RelativeAdjunctionStrictMorphismData,
  RelativeAdjunctionUnitCounitPresentation,
  RelativeAdjunctionRelativeMonadModuleInput,
  RelativeAdjunctionRelativeMonadPastingWitness,
  RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput,
  RelativeAdjunctionRelativeMonadPastingAdjunctionInput,
  RelativeAdjunctionRelativeMonadCompositeInput,
  RelativeAdjunctionRelativeMonadLiteratureWitness,
  RelativeAdjunctionRelativeMonadLeftOpalgebraInput,
  RelativeAdjunctionRelativeMonadRightAlgebraInput,
  RelativeAdjunctionRelativeMonadResolutionFunctorInput,
  RelativeAdjunctionRelativeMonadOpalgebraTransportInput,
  RelativeAdjunctionRelativeMonadAlgebraTransportInput,
  RelativeAdjunctionRelativeMonadTransportEquivalenceInput,
  RelativeAdjunctionSectionWitness,
} from "./relative-adjunctions";
import {
  analyzeRelativeAdjunctionFraming,
  analyzeRelativeAdjunctionHomIsomorphism,
  analyzeRelativeAdjunctionUnitCounit,
  analyzeRelativeAdjunctionPointwiseLeftLift,
  analyzeRelativeAdjunctionRightExtension,
  analyzeRelativeAdjunctionColimitPreservation,
  analyzeRelativeAdjunctionLeftMorphism,
  analyzeRelativeAdjunctionRightMorphism,
  analyzeRelativeAdjunctionStrictMorphism,
  analyzeRelativeAdjunctionPrecomposition,
  analyzeRelativeAdjunctionPasting,
  analyzeRelativeAdjunctionFullyFaithfulPostcomposition,
  analyzeRelativeAdjunctionInducedMonadsCoincide,
  analyzeRelativeAdjunctionResolutePair,
  analyzeRelativeAdjunctionResoluteLeftMorphism,
  analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition,
  analyzeRelativeAdjunctionRelativeMonadModule,
  analyzeRelativeAdjunctionRelativeMonadPasting,
  analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful,
  analyzeRelativeAdjunctionRelativeMonadPastingAdjunction,
  analyzeRelativeAdjunctionRelativeMonadComposite,
  analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries,
  analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra,
  analyzeRelativeAdjunctionRelativeMonadRightAlgebra,
  analyzeRelativeAdjunctionRelativeMonadResolutionFunctor,
  analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport,
  analyzeRelativeAdjunctionRelativeMonadAlgebraTransport,
  analyzeRelativeAdjunctionRelativeMonadTransportEquivalence,
  analyzeRelativeAdjunctionSection,
  describeRelativeAdjunctionSectionWitness,
} from "./relative-adjunctions";
import type { RelativeMonadData } from "./relative-monads";
import { analyzeRelativeMonadResolution, relativeMonadFromAdjunction } from "./relative-monads";
import {
  RelativeAdjunctionLawRegistry,
  type RelativeAdjunctionLawKey,
} from "./relative-laws";

export interface RelativeAdjunctionOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
  readonly witness?: unknown;
  readonly analysis?: unknown;
}

const pendingOracle = (
  law: RelativeAdjunctionLawKey,
  details?: string,
): RelativeAdjunctionOracleResult => {
  const descriptor = RelativeAdjunctionLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details: details ?? `${descriptor.name} oracle is pending. Summary: ${descriptor.summary}`,
  };
};

export const RelativeAdjunctionOracles = {
  framing: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.framing;
    const report = analyzeRelativeAdjunctionFraming(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  homIsomorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.homIsomorphism;
    const report = analyzeRelativeAdjunctionHomIsomorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  section: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.section;
    const effectiveWitness =
      witness ?? describeRelativeAdjunctionSectionWitness(data);
    const report = analyzeRelativeAdjunctionSection(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
      analysis: report,
    };
  },
  pasting: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.pasting;
    if (!input) {
      return pendingOracle(
        "pasting",
  `${descriptor.name} oracle requires nested relative adjunction data and the comparison 2-cell for the pasted unit/extension; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionPasting(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  fullyFaithfulPostcomposition: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionFullyFaithfulPostcompositionInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.fullyFaithfulPostcomposition;
    if (!input) {
      return pendingOracle(
        "fullyFaithfulPostcomposition",
        `${descriptor.name} oracle requires base/result adjunctions together with the fully faithful postcomposition tight 1-cell. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionFullyFaithfulPostcomposition(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  precomposition: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence>["precomposition"],
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.precomposition;
    if (!input) {
      return pendingOracle(
        "precomposition",
        `${descriptor.name} oracle requires a tight cell u : A' → A to precompose; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionPrecomposition({ adjunction: data, precomposition: input });
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  inducedMonadsCoincide: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionInducedMonadsInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.inducedMonadsCoincide;
    if (!input) {
      return pendingOracle(
        "inducedMonadsCoincide",
        `${descriptor.name} oracle requires the pair of relative monads obtained from the adjunction to compare their data. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionInducedMonadsCoincide(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  resolutePair: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionResoluteInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.resolutePair;
    if (!input) {
      return pendingOracle(
        "resolutePair",
        `${descriptor.name} oracle requires fully faithful postcomposition and coincident monad data; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionResolutePair(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  resoluteLeftMorphism: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionResoluteLeftMorphismInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.resoluteLeftMorphism;
    if (!input) {
      return pendingOracle(
        "resoluteLeftMorphism",
  `${descriptor.name} oracle requires resolute data together with precomposition and pasting witnesses; none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionResoluteLeftMorphism(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  ordinaryLeftAdjointComposition: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionResoluteLeftMorphismInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.ordinaryLeftAdjointComposition;
    if (!input) {
      return pendingOracle(
        "ordinaryLeftAdjointComposition",
        `${descriptor.name} oracle requires resolute left morphism data specialised to the identity root; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadModule: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionRelativeMonadModuleInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadModule;
    if (!input) {
      return pendingOracle(
        "relativeMonadModule",
  `${descriptor.name} oracle requires left-morphism data together with the induced module action; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadModule(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadPasting: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadPasting;
    if (!input) {
      return pendingOracle(
        "relativeMonadPasting",
        `${descriptor.name} oracle requires a source j-relative monad, a left j'-relative adjunction, and the pasted unit/extension witnesses; none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadPasting(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadLeftOpalgebra: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRelativeMonadLeftOpalgebraInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadLeftOpalgebra;
    if (!input) {
      return pendingOracle(
        "relativeMonadLeftOpalgebra",
        `${descriptor.name} oracle requires a T-opalgebra presentation on the left leg; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra(data, input);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadRightAlgebra: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRelativeMonadRightAlgebraInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadRightAlgebra;
    if (!input) {
      return pendingOracle(
        "relativeMonadRightAlgebra",
        `${descriptor.name} oracle requires a T-algebra presentation on the right leg; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadRightAlgebra(data, input);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadResolutionFunctor: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRelativeMonadResolutionFunctorInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadResolutionFunctor;
    if (!input) {
      return pendingOracle(
        "relativeMonadResolutionFunctor",
        `${descriptor.name} oracle requires canonical (op)algebra functor witnesses into Res(T)_C; none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadResolutionFunctor(data, input);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadAdjunctionOpalgebraTransport: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAdjunctionOracleResult => {
    const descriptor =
      RelativeAdjunctionLawRegistry.relativeMonadAdjunctionOpalgebraTransport;
    if (!input) {
      return pendingOracle(
        "relativeMonadAdjunctionOpalgebraTransport",
  `${descriptor.name} oracle requires transport data: pasting witness, source opalgebra, transported algebra, and naturality comparisons. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport(
      data,
      input,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadAdjunctionAlgebraTransport: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRelativeMonadAlgebraTransportInput<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAdjunctionOracleResult => {
    const descriptor =
      RelativeAdjunctionLawRegistry.relativeMonadAdjunctionAlgebraTransport;
    if (!input) {
      return pendingOracle(
        "relativeMonadAdjunctionAlgebraTransport",
  `${descriptor.name} oracle requires the dual transport data from algebras to opalgebras, including naturality witnesses. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadAlgebraTransport(
      data,
      input,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadAdjunctionTransportEquivalence: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAdjunctionOracleResult => {
    const descriptor =
      RelativeAdjunctionLawRegistry.relativeMonadAdjunctionTransportEquivalence;
    if (!input) {
      return pendingOracle(
        "relativeMonadAdjunctionTransportEquivalence",
  `${descriptor.name} oracle requires both transports and the accompanying unit/counit comparison witnesses. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadTransportEquivalence(
      data,
      input,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadPastingFullyFaithful: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadPastingFullyFaithful;
    if (!input) {
      return pendingOracle(
        "relativeMonadPastingFullyFaithful",
  `${descriptor.name} oracle needs pasting data together with a fully faithful right adjoint witness; none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadPastingAdjunction: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionRelativeMonadPastingAdjunctionInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadPastingAdjunction;
    if (!input) {
      return pendingOracle(
        "relativeMonadPastingAdjunction",
  `${descriptor.name} oracle aggregates two pasting witnesses; none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadPastingAdjunction(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadCompositeThroughRoot: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionRelativeMonadCompositeInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadCompositeThroughRoot;
    if (!input) {
      return pendingOracle(
        "relativeMonadCompositeThroughRoot",
  `${descriptor.name} oracle requires both the module action and pasting witnesses for the composite through the root; none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadComposite(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  relativeMonadLiteratureRecoveries: <Obj, Arr, Payload, Evidence>(
    input?: RelativeAdjunctionRelativeMonadLiteratureWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.relativeMonadLiteratureRecoveries;
    if (!input) {
      return pendingOracle(
        "relativeMonadLiteratureRecoveries",
  `${descriptor.name} oracle must compare the composite-through-root output against witnesses from the literature (e.g., Hutson; Altenkirch–Chapman–Uustalu); none were supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  unitCounitPresentation: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    presentation?: RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.unitCounit;
    if (!presentation) {
      return pendingOracle(
        "unitCounit",
        `${descriptor.name} oracle requires a unit/counit presentation; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionUnitCounit(data, presentation);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  pointwiseLeftLift: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.pointwiseLeftLift;
    if (!input) {
      return pendingOracle(
        "pointwiseLeftLift",
        `${descriptor.name} oracle requires pointwise left lift data; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionPointwiseLeftLift(data, input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  rightExtension: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.rightExtension;
    if (!input) {
      return pendingOracle(
        "rightExtension",
        `${descriptor.name} oracle requires left-extension data and (optionally) fully faithful witnesses. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRightExtension(data, input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  colimitPreservation: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.colimitPreservation;
    if (!input) {
      return pendingOracle(
        "colimitPreservation",
        `${descriptor.name} oracle requires paired j/ℓ preservation data. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionColimitPreservation(data, input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  leftMorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.leftMorphism;
    const report = analyzeRelativeAdjunctionLeftMorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  rightMorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.rightMorphism;
    const report = analyzeRelativeAdjunctionRightMorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  strictMorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.strictMorphism;
    const report = analyzeRelativeAdjunctionStrictMorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  resolution: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    monad?: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.resolution;
    const derived = monad ? undefined : relativeMonadFromAdjunction(data);
    const candidate = monad ?? derived?.monad;

    if (!candidate) {
      const derivedIssues = derived ? derived.issues : [
        "No relative monad supplied and the adjunction-derived construction failed to produce one.",
      ];
      const details = derived
        ? derived.details
        : `${descriptor.name} oracle requires either a supplied monad or a successful adjunction-derived construction.`;
      return {
        holds: false,
        pending: false,
        registryPath: descriptor.registryPath,
        details,
        issues: derivedIssues,
        analysis: derived,
      };
    }

    const report = analyzeRelativeMonadResolution({ monad: candidate, adjunction: data });

    const derivedIssues = derived && !derived.holds ? derived.issues : [];
    const combinedIssues = [
      ...derivedIssues,
      ...(report.holds ? [] : report.issues),
    ];

    const holds = report.holds && (derived ? derived.holds : true);

    const detailFragments = [
      derived && derived.details,
      report.details,
    ].filter((fragment): fragment is string => fragment !== undefined);
    const details = holds
      ? detailFragments.join(" ")
      : (combinedIssues.length > 0
          ? `Relative adjunction resolution issues: ${combinedIssues.join("; ")}`
          : detailFragments.join(" "));

    return {
      holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details,
      issues: holds ? [] : combinedIssues,
      witness: candidate,
      analysis: {
        resolution: report,
        ...(derived ? { derived } : {}),
      },
    };
  },
} as const;

export interface RelativeAdjunctionOracleInputs<Obj, Arr, Payload, Evidence> {
  readonly unitCounit?: RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence>;
  readonly leftLift?: RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence>;
  readonly rightExtension?: RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence>;
  readonly colimitPreservation?: RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence>;
  readonly leftMorphism?: RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence>;
  readonly rightMorphism?: RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence>;
  readonly strictMorphism?: RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence>;
  readonly resolution?: { readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence> };
  readonly section?: RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence>;
  readonly precomposition?: RelativeAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence>["precomposition"];
  readonly pasting?: RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence>;
  readonly fullyFaithfulPostcomposition?: RelativeAdjunctionFullyFaithfulPostcompositionInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly inducedMonads?: RelativeAdjunctionInducedMonadsInput<Obj, Arr, Payload, Evidence>;
  readonly resolutePair?: RelativeAdjunctionResoluteInput<Obj, Arr, Payload, Evidence>;
  readonly resoluteLeftMorphism?: RelativeAdjunctionResoluteLeftMorphismInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly ordinaryLeftAdjointComposition?: RelativeAdjunctionResoluteLeftMorphismInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadModule?: RelativeAdjunctionRelativeMonadModuleInput<Obj, Arr, Payload, Evidence>;
  readonly relativeMonadLeftOpalgebra?: RelativeAdjunctionRelativeMonadLeftOpalgebraInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadRightAlgebra?: RelativeAdjunctionRelativeMonadRightAlgebraInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadResolutionFunctor?: RelativeAdjunctionRelativeMonadResolutionFunctorInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadPasting?: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>;
  readonly relativeMonadAdjunctionOpalgebraTransport?: RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadAdjunctionAlgebraTransport?: RelativeAdjunctionRelativeMonadAlgebraTransportInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadAdjunctionTransportEquivalence?: RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadPastingFullyFaithful?: RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadPastingAdjunction?: RelativeAdjunctionRelativeMonadPastingAdjunctionInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadCompositeThroughRoot?: RelativeAdjunctionRelativeMonadCompositeInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly relativeMonadLiteratureRecoveries?: RelativeAdjunctionRelativeMonadLiteratureWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const enumerateRelativeAdjunctionOracles = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  inputs?: RelativeAdjunctionOracleInputs<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<RelativeAdjunctionOracleResult> => {
  const base: RelativeAdjunctionOracleResult[] = [
    RelativeAdjunctionOracles.framing(data),
    RelativeAdjunctionOracles.homIsomorphism(data),
    RelativeAdjunctionOracles.section(data, inputs?.section),
    RelativeAdjunctionOracles.precomposition(data, inputs?.precomposition),
    RelativeAdjunctionOracles.pasting(inputs?.pasting),
    RelativeAdjunctionOracles.fullyFaithfulPostcomposition(inputs?.fullyFaithfulPostcomposition),
    RelativeAdjunctionOracles.unitCounitPresentation(data, inputs?.unitCounit),
    RelativeAdjunctionOracles.pointwiseLeftLift(data, inputs?.leftLift),
    RelativeAdjunctionOracles.rightExtension(data, inputs?.rightExtension),
    RelativeAdjunctionOracles.colimitPreservation(data, inputs?.colimitPreservation),
    RelativeAdjunctionOracles.resolution(data, inputs?.resolution?.monad),
    RelativeAdjunctionOracles.inducedMonadsCoincide(inputs?.inducedMonads),
    RelativeAdjunctionOracles.resolutePair(
      inputs?.resolutePair ?? inputs?.resoluteLeftMorphism?.resolute,
    ),
    RelativeAdjunctionOracles.resoluteLeftMorphism(inputs?.resoluteLeftMorphism),
    RelativeAdjunctionOracles.ordinaryLeftAdjointComposition(
      inputs?.ordinaryLeftAdjointComposition ?? inputs?.resoluteLeftMorphism,
    ),
    RelativeAdjunctionOracles.relativeMonadModule(inputs?.relativeMonadModule),
    RelativeAdjunctionOracles.relativeMonadLeftOpalgebra(
      data,
      inputs?.relativeMonadLeftOpalgebra,
    ),
    RelativeAdjunctionOracles.relativeMonadRightAlgebra(
      data,
      inputs?.relativeMonadRightAlgebra,
    ),
    RelativeAdjunctionOracles.relativeMonadResolutionFunctor(
      data,
      inputs?.relativeMonadResolutionFunctor,
    ),
    RelativeAdjunctionOracles.relativeMonadPasting(inputs?.relativeMonadPasting),
    RelativeAdjunctionOracles.relativeMonadAdjunctionOpalgebraTransport(
      data,
      inputs?.relativeMonadAdjunctionOpalgebraTransport,
    ),
    RelativeAdjunctionOracles.relativeMonadAdjunctionAlgebraTransport(
      data,
      inputs?.relativeMonadAdjunctionAlgebraTransport,
    ),
    RelativeAdjunctionOracles.relativeMonadAdjunctionTransportEquivalence(
      data,
      inputs?.relativeMonadAdjunctionTransportEquivalence,
    ),
    RelativeAdjunctionOracles.relativeMonadPastingFullyFaithful(
      inputs?.relativeMonadPastingFullyFaithful ??
        (inputs?.relativeMonadPasting
          ? { pasting: inputs.relativeMonadPasting }
          : undefined),
    ),
    RelativeAdjunctionOracles.relativeMonadPastingAdjunction(
      inputs?.relativeMonadPastingAdjunction,
    ),
    RelativeAdjunctionOracles.relativeMonadCompositeThroughRoot(
      inputs?.relativeMonadCompositeThroughRoot,
    ),
    RelativeAdjunctionOracles.relativeMonadLiteratureRecoveries(
      inputs?.relativeMonadLiteratureRecoveries,
    ),
  ];

  if (inputs?.leftMorphism) {
    base.push(RelativeAdjunctionOracles.leftMorphism(inputs.leftMorphism));
  }
  if (inputs?.rightMorphism) {
    base.push(RelativeAdjunctionOracles.rightMorphism(inputs.rightMorphism));
  }
  if (inputs?.strictMorphism) {
    base.push(RelativeAdjunctionOracles.strictMorphism(inputs.strictMorphism));
  }

  return base;
};
