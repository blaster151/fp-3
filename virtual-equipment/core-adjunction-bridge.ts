import type {
  CoreAdjunction,
  CoreFunctor,
} from "../stdlib/category";
import { verifyTriangleIdentities } from "../stdlib/category";
import type {
  RelativeAdjunctionData,
  RelativeAdjunctionSectionWitness,
} from "../relative/relative-adjunctions";
import {
  analyzeRelativeAdjunctionFraming,
  analyzeRelativeAdjunctionHomIsomorphism,
  analyzeRelativeAdjunctionSection,
  describeRelativeAdjunctionSectionWitness,
} from "../relative/relative-adjunctions";

export interface CoreAdjunctionBridge<
  Obj,
  Arr,
  Payload,
  Evidence,
  CObj,
  DObj,
  F extends CoreFunctor<CObj, DObj>,
  U extends CoreFunctor<DObj, CObj>,
> {
  readonly core: CoreAdjunction<CObj, DObj, F, U>;
  readonly relative: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly section: RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

export interface BuildCoreAdjunctionBridgeOptions<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly section?: RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence>;
  readonly allowPendingSection?: boolean;
}

export const buildCoreAdjunctionBridge = <
  Obj,
  Arr,
  Payload,
  Evidence,
  CObj,
  DObj,
  F extends CoreFunctor<CObj, DObj>,
  U extends CoreFunctor<DObj, CObj>,
>(
  core: CoreAdjunction<CObj, DObj, F, U>,
  relative: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  options: BuildCoreAdjunctionBridgeOptions<Obj, Arr, Payload, Evidence> = {},
): CoreAdjunctionBridge<Obj, Arr, Payload, Evidence, CObj, DObj, F, U> => {
  const framing = analyzeRelativeAdjunctionFraming(relative);
  if (!framing.holds) {
    throw new Error(
      `Relative adjunction framing must hold before bridging with a CoreAdjunction: ${framing.issues.join("; ")}`,
    );
  }

  const homIsomorphism = analyzeRelativeAdjunctionHomIsomorphism(relative);
  if (!homIsomorphism.holds) {
    throw new Error(
      `Relative adjunction hom-set witnesses must hold before bridging: ${homIsomorphism.issues.join("; ")}`,
    );
  }

  const section = options.section ?? describeRelativeAdjunctionSectionWitness(relative);
  const sectionReport = analyzeRelativeAdjunctionSection(section);
  if (!sectionReport.holds && !(options.allowPendingSection && sectionReport.pending)) {
    throw new Error(
      `Relative adjunction section witness must hold before bridging: ${sectionReport.issues.join("; ")}`,
    );
  }

  const summary = [
    "Core adjunction bridged with relative adjunction data.",
    framing.details,
    homIsomorphism.details,
    sectionReport.details,
  ]
    .filter((part) => part !== "")
    .join(" ");

  return {
    core,
    relative,
    section,
    details: summary,
  };
};

export interface VerifyCoreAdjunctionBridgeOptions<CObj, DObj> {
  readonly sampleCObjects?: ReadonlyArray<CObj>;
  readonly sampleDObjects?: ReadonlyArray<DObj>;
}

export const verifyCoreAdjunctionBridgeTriangles = <
  Obj,
  Arr,
  Payload,
  Evidence,
  CObj,
  DObj,
  F extends CoreFunctor<CObj, DObj>,
  U extends CoreFunctor<DObj, CObj>,
>(
  bridge: CoreAdjunctionBridge<Obj, Arr, Payload, Evidence, CObj, DObj, F, U>,
  options: VerifyCoreAdjunctionBridgeOptions<CObj, DObj> = {},
) =>
  verifyTriangleIdentities(
    bridge.core,
    options.sampleDObjects ?? [],
    options.sampleCObjects ?? [],
  );

export const coreAdjunctionFromBridge = <
  Obj,
  Arr,
  Payload,
  Evidence,
  CObj,
  DObj,
  F extends CoreFunctor<CObj, DObj>,
  U extends CoreFunctor<DObj, CObj>,
>(bridge: CoreAdjunctionBridge<Obj, Arr, Payload, Evidence, CObj, DObj, F, U>) => bridge.core;
