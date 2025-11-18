import type { GlueingRunnerBridgeResult } from "./glueing-runner-bridge";
import { bridgeGlueingSummaryToResidualRunner } from "./glueing-runner-bridge";
import { makeGlueingInteractionLawExampleSuite } from "./functor-interaction-law";
import type { GlueingInteractionLawSummary } from "./functor-interaction-law";
import { makeExample6MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { KernelMonadSpec, UserMonadSpec } from "./supervised-stack";
import { makeGlueingSupervisedStack, type GlueingSupervisedStackResult } from "./glueing-supervised-stack";
import type { TwoArrow, TwoObject } from "./two-object-cat";

const UNIT_TYPE = { kind: "unit" } as const;
const ENV_TYPE = { kind: "base", name: "Env" } as const;
const ERROR_PAYLOAD_TYPE = { kind: "base", name: "ErrorPayload" } as const;
const ALARM_PAYLOAD_TYPE = { kind: "base", name: "AlarmPayload" } as const;

export const buildGlueingExampleKernelSpec = <Obj>(
  kernelObjects: readonly Obj[],
): KernelMonadSpec<Obj, unknown, unknown> => {
  const residualSpecs = new Map<Obj, { readonly description: string; readonly predicate: () => boolean }>();
  for (const object of kernelObjects) {
    residualSpecs.set(object, {
      description: "all handled",
      predicate: () => true,
    });
  }
  return {
    name: "ExampleKernel",
    description: "Glueing example kernel specification",
    initialState: { env: "init" },
    operations: [
      {
        name: "getenv",
        kind: "state",
        description: "read current state",
        parameterName: "_",
        parameterType: UNIT_TYPE,
        resultValueType: ENV_TYPE,
        handle: (state: unknown) => ({ state, output: state }),
      },
      {
        name: "raise",
        kind: "exception",
        description: "raise error",
        parameterName: "error",
        parameterType: ERROR_PAYLOAD_TYPE,
      },
      {
        name: "alarm",
        kind: "signal",
        description: "trigger alarm",
        parameterName: "payload",
        parameterType: ALARM_PAYLOAD_TYPE,
      },
    ],
    residualHandlers: residualSpecs,
  } satisfies KernelMonadSpec<Obj, unknown, unknown>;
};

export const buildGlueingExampleUserSpec = <Obj>(
  overrides: Partial<UserMonadSpec<Obj>> = {},
): UserMonadSpec<Obj> => ({
  name: "GlueingUser",
  description: "Glueing example user boundary",
  allowedKernelOperations: ["getenv"],
  ...overrides,
});

type Example6Interaction = ReturnType<typeof makeExample6MonadComonadInteractionLaw>;
type ExtractExample6<T extends number> = Example6Interaction extends MonadComonadInteractionLaw<
  infer Obj,
  infer Arr,
  infer Left,
  infer Right,
  infer Value,
  any,
  any
>
  ? T extends 0
    ? Obj
    : T extends 1
    ? Arr
    : T extends 2
    ? Left
    : T extends 3
    ? Right
    : Value
  : never;

type Example6Obj = ExtractExample6<0>;
type Example6Arr = ExtractExample6<1>;
type Example6Left = ExtractExample6<2>;
type Example6Right = ExtractExample6<3>;
type Example6Value = ExtractExample6<4>;

type Example6GlueingBridge = GlueingRunnerBridgeResult<
  TwoObject,
  TwoArrow,
  unknown,
  unknown,
  boolean,
  Example6Obj,
  Example6Arr,
  Example6Left,
  Example6Right,
  Example6Value
>;

type Example6GlueingResult = GlueingSupervisedStackResult<
  Example6Obj,
  Example6Arr,
  Example6Left,
  Example6Right,
  Example6Value,
  TwoObject,
  TwoArrow,
  unknown,
  unknown,
  boolean
>;

export interface GlueingSupervisedStackExampleEntry {
  readonly label: string;
  readonly bridge: Example6GlueingBridge;
  readonly result: Example6GlueingResult;
}

export interface GlueingSupervisedStackExampleSuite {
  readonly interaction: Example6Interaction;
  readonly kernelSpec: KernelMonadSpec<Example6Obj, unknown, unknown>;
  readonly userSpec: UserMonadSpec<Example6Obj>;
  readonly identity: GlueingSupervisedStackExampleEntry;
  readonly tensor: GlueingSupervisedStackExampleEntry;
  readonly pullbackFailure: GlueingSupervisedStackExampleEntry;
}

const buildExampleEntry = (
  label: string,
  summary: GlueingInteractionLawSummary<TwoObject, TwoArrow, unknown, unknown, boolean>,
  interaction: Example6Interaction,
  kernelSpec: KernelMonadSpec<Example6Obj, unknown, unknown>,
  userSpec: UserMonadSpec<Example6Obj>,
): GlueingSupervisedStackExampleEntry => {
  const bridge = bridgeGlueingSummaryToResidualRunner(summary, { interaction });
  const result = makeGlueingSupervisedStack(bridge, kernelSpec, userSpec, {
    stack: { sampleLimit: 4 },
    alignment: { sampleLimit: 4 },
    metadata: [`Glueing.supervisedStackExample=${label}`],
    notes: [`Glueing example ${label}`],
  });
  return { label, bridge, result };
};

export const makeGlueingSupervisedStackExampleSuite = (): GlueingSupervisedStackExampleSuite => {
  const interaction = makeExample6MonadComonadInteractionLaw();
  const { identitySummary, tensorSummary, pullbackFailureSummary } = makeGlueingInteractionLawExampleSuite();
  const kernelObjects = interaction.law.kernel.base.objects as readonly Example6Obj[];
  const kernelSpec = buildGlueingExampleKernelSpec(kernelObjects);
  const userSpec = buildGlueingExampleUserSpec<Example6Obj>();
  return {
    interaction,
    kernelSpec,
    userSpec,
    identity: buildExampleEntry("identity", identitySummary, interaction, kernelSpec, userSpec),
    tensor: buildExampleEntry("tensor", tensorSummary, interaction, kernelSpec, userSpec),
    pullbackFailure: buildExampleEntry(
      "pullbackFailure",
      pullbackFailureSummary,
      interaction,
      kernelSpec,
      userSpec,
    ),
  };
};
