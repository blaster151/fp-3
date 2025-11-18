import type { GlueingRunnerBridgeResult } from "./glueing-runner-bridge";
import type {
  KernelMonadSpec,
  SupervisedStack,
  SupervisedStackOptions,
  UserMonadSpec,
} from "./supervised-stack";
import { makeSupervisedStack } from "./supervised-stack";
import type { LambdaCoopRunnerAlignmentOptions } from "./lambda-coop.runner-alignment";
import {
  analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge,
  type SupervisedStackLambdaCoopGlueingAlignmentReport,
} from "./lambda-coop.runner-alignment";

export interface MakeGlueingSupervisedStackOptions<Obj> {
  readonly stack?: SupervisedStackOptions<Obj>;
  readonly alignment?: LambdaCoopRunnerAlignmentOptions<Obj>;
  readonly metadata?: ReadonlyArray<string>;
  readonly notes?: ReadonlyArray<string>;
}

export interface GlueingSupervisedStackResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue,
> {
  readonly stack: SupervisedStack<Obj, Arr, Left, Right, Value>;
  readonly glueingBridge: GlueingRunnerBridgeResult<
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue,
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly alignment: SupervisedStackLambdaCoopGlueingAlignmentReport<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue
  >;
  readonly metadata: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export const makeGlueingSupervisedStack = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue,
>(
  glueingBridge: GlueingRunnerBridgeResult<
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue,
    Obj,
    Arr,
    Left,
    Right,
    Value
  >,
  kernelSpec: KernelMonadSpec<Obj, Left, Right>,
  userSpec: UserMonadSpec<Obj>,
  options: MakeGlueingSupervisedStackOptions<Obj> = {},
): GlueingSupervisedStackResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue
> => {
  const stack = makeSupervisedStack(
    glueingBridge.interaction,
    kernelSpec,
    userSpec,
    options.stack,
  );
  const alignment = analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge(
    glueingBridge.interaction,
    stack,
    glueingBridge,
    options.alignment,
  );
  const metadata = [
    `Glueing.supervisedStack.kernel=${stack.kernel.spec.name}`,
    `Glueing.supervisedStack.user=${stack.user.spec.name}`,
    `Glueing.supervisedStack.runnerMetadata=${stack.runner.metadata?.length ?? 0}`,
    ...glueingBridge.metadata,
    ...(options.metadata ?? []),
  ];
  const notes = [
    `Glueing.supervisedStack.runnerSummary total=${glueingBridge.runnerSummary.total} failed=${glueingBridge.runnerSummary.failed}`,
    `Glueing.supervisedStack.residualSummary total=${glueingBridge.residualSummary.total} failed=${glueingBridge.residualSummary.failed}`,
    `Glueing.supervisedStack.residualLawDiagnostics=${glueingBridge.residualLaw.diagnostics.length}`,
    ...glueingBridge.notes,
    ...(options.notes ?? []),
  ];
  return { stack, glueingBridge, alignment, metadata, notes };
};
