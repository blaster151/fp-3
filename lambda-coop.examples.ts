import {
  type LambdaCoopUserComputation,
  type LambdaCoopValue,
  type LambdaCoopUserComputationTyping,
  type LambdaCoopRunnerLiteral,
  type LambdaCoopUserFinaliserBundle,
  type LambdaCoopKernelFinaliserBundle,
  type LambdaCoopKernelContinuation,
  type RunnerCalculusRewriteHarness,
  deriveUserOp,
  deriveUserRun,
  deriveUserTry,
  makeContext,
  summarizeUserComputationResources,
  describeTyping,
  evaluateUser,
  describeUserEval,
  substituteUserComputation,
  substituteUserFinaliserBundle,
} from './lambda-coop';

// Example programs and harness for λ_{coop}
// - Example A: Supervised file-runner style (run finally ... equations)
// - Example B: Try/raise propagation and let_{X,E} abbreviation

export interface LambdaCoopExample {
  readonly name: string;
  readonly term: LambdaCoopUserComputation;
  readonly typing: LambdaCoopUserComputationTyping;
  readonly evalLines: readonly string[];
  readonly typingLines: readonly string[];
}

// Example A: supervised runner with one op
export function exampleSupervisedRunner(): LambdaCoopExample {
  const runner: LambdaCoopValue = {
    kind: 'runnerLiteral',
    stateCarrier: 'store',
    clauses: [
      { operation: 'read', parameter: 'p', parameterType: { kind: 'base', name: 'Path' }, body: { kind: 'kernelReturn', value: { kind: 'unitValue' } } },
    ],
  };
  const comp: LambdaCoopUserComputation = {
    kind: 'userRun',
    runner,
    computation: {
      kind: 'userOperation',
      operation: 'read',
      argument: { kind: 'unitValue' },
      continuation: { parameter: 'u', body: { kind: 'userReturn', value: { kind: 'unitValue' } } },
      annotation: { operations: ['read'], states: ['store'] },
    },
  };

  // Typing via helpers
  const ctx = makeContext([]);
  const opTyping = deriveUserOp(ctx, 'read', { kind: 'unitValue' }, { parameter: 'u', body: { kind: 'userReturn', value: { kind: 'unitValue' } } }, { kind: 'unit' }, ['read'], [], [], 'store', { operations: ['read'], states: ['store'] });
  const typing = deriveUserRun(ctx, runner, opTyping, ['read']);

  // Evaluate (user evaluator dispatches the run to the kernel clause and
  // records the propagated status)
  const evalRes = evaluateUser(comp);
  const evalLines = describeUserEval(evalRes);
  const typingLines = describeTyping(typing);
  return { name: 'Example A: supervised runner', term: comp, typing, evalLines, typingLines };
}

// Example B: exception propagation with try and handler
export function exampleTryRaise(): LambdaCoopExample {
  const comp: LambdaCoopUserComputation = {
    kind: 'userTry',
    computation: { kind: 'userRaise', exception: 'E' },
    returnHandler: { parameter: 'x', body: { kind: 'userReturn', value: { kind: 'unitValue' } } },
    exceptionHandlers: [ { exception: 'E', body: { kind: 'userReturn', value: { kind: 'unitValue' } } } ],
  };
  const ctx = makeContext([]);
  const typing: LambdaCoopUserComputationTyping = {
    kind: 'userTyping',
    context: ctx,
    term: comp,
    type: { kind: 'userComputationType', result: { kind: 'unit' }, resources: { exceptions: ['E'] } },
    resources: summarizeUserComputationResources(comp),
    provenance: [ { note: 'example-try-raise', rule: 'TyUser-Try' } ],
  };
  const evalRes = evaluateUser(comp);
  return {
    name: 'Example B: try/raise',
    term: comp,
    typing,
    evalLines: describeUserEval(evalRes),
    typingLines: describeTyping(typing),
  };
}

export type RunnerCalculusExample4Mode = 'return' | 'exception' | 'signal';

export interface RunnerCalculusExample4Scenario {
  readonly runner: LambdaCoopRunnerLiteral;
  readonly finaliser: LambdaCoopUserFinaliserBundle;
  readonly makeProgram: (mode: RunnerCalculusExample4Mode) => LambdaCoopUserComputation;
}

export function makeExample4RunnerCalculusScenario(): RunnerCalculusExample4Scenario {
  const runner: LambdaCoopRunnerLiteral = {
    kind: 'runnerLiteral',
    stateCarrier: 'FileState',
    clauses: [
      {
        operation: 'open',
        parameter: 'path',
        parameterType: { kind: 'base', name: 'String' },
        body: {
          kind: 'kernelReturn',
          value: { kind: 'constant', label: 'handle#1' },
        },
      },
      {
        operation: 'write',
        parameter: 'payload',
        parameterType: { kind: 'product', left: { kind: 'base', name: 'Handle' }, right: { kind: 'base', name: 'String' } },
        body: { kind: 'kernelReturn', value: { kind: 'unitValue' } },
      },
      {
        operation: 'close',
        parameter: 'handle',
        parameterType: { kind: 'base', name: 'Handle' },
        body: { kind: 'kernelReturn', value: { kind: 'constant', label: 'closed' } },
      },
      {
        operation: 'warn',
        parameter: 'handle',
        parameterType: { kind: 'base', name: 'Handle' },
        body: {
          kind: 'kernelSignal',
          signal: 'DiskFull',
          payload: { kind: 'constant', label: 'disk-full' },
        },
      },
    ],
  };

  const makeCloseThen = (next: LambdaCoopUserComputation): LambdaCoopUserComputation => ({
    kind: 'userRun',
    runner,
    computation: {
      kind: 'userOperation',
      operation: 'close',
      argument: { kind: 'variable', name: 'handle' },
      continuation: {
        parameter: 'ignored',
        body: next,
      },
    },
  });

  const finaliser: LambdaCoopUserFinaliserBundle = {
    returnHandler: {
      parameter: 'result',
      body: makeCloseThen({ kind: 'userReturn', value: { kind: 'variable', name: 'result' } }),
    },
    exceptionHandlers: [
      {
        exception: 'WriteFailed',
        body: makeCloseThen({ kind: 'userRaise', exception: 'WriteFailed' }),
      },
    ],
    signalHandlers: [
      {
        signal: 'DiskFull',
        body: makeCloseThen({ kind: 'userReturn', value: { kind: 'constant', label: 'closed-after-signal' } }),
      },
    ],
  };

  const makeOpenHandle = (): LambdaCoopUserComputation => ({
    kind: 'userRun',
    runner,
    computation: {
      kind: 'userOperation',
      operation: 'open',
      argument: { kind: 'constant', label: '"example.txt"' },
      continuation: {
        parameter: 'handle',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'handle' } },
      },
    },
  });

  const writeChunk = (label: string, next: LambdaCoopUserComputation): LambdaCoopUserComputation => ({
    kind: 'userOperation',
    operation: 'write',
    argument: {
      kind: 'pair',
      left: { kind: 'variable', name: 'handle' },
      right: { kind: 'constant', label },
    },
    continuation: { parameter: 'ignored', body: next },
  });

  const makeWork = (mode: RunnerCalculusExample4Mode): LambdaCoopUserComputation => {
    const baseReturn: LambdaCoopUserComputation = { kind: 'userReturn', value: { kind: 'constant', label: 'ok' } };
    if (mode === 'return') {
      return writeChunk('payload-2', writeChunk('payload-1', baseReturn));
    }
    if (mode === 'exception') {
      return writeChunk('payload-error', { kind: 'userRaise', exception: 'WriteFailed' });
    }
    const warnOp: LambdaCoopUserComputation = {
      kind: 'userOperation',
      operation: 'warn',
      argument: { kind: 'variable', name: 'handle' },
      continuation: {
        parameter: 'ignored',
        body: { kind: 'userReturn', value: { kind: 'constant', label: 'warned' } },
      },
    };
    return writeChunk('payload-signal', warnOp);
  };

  const makeProgram = (mode: RunnerCalculusExample4Mode): LambdaCoopUserComputation => ({
    kind: 'userLet',
    binder: 'handle',
    computation: makeOpenHandle(),
    body: {
      kind: 'userRunFinally',
      runner,
      computation: makeWork(mode),
      finaliser,
    },
  });

  return { runner, finaliser, makeProgram };
}

export function allExamples(): readonly LambdaCoopExample[] {
  return [exampleSupervisedRunner(), exampleTryRaise()];
}

export function makeRunnerCalculusRewriteHarnessFromExample4(): RunnerCalculusRewriteHarness {
  const scenario = makeExample4RunnerCalculusScenario();
  const substitutedHandle: LambdaCoopValue = { kind: 'constant', label: 'rewrite#handle' };
  const makeRunTerm = (mode: RunnerCalculusExample4Mode) => {
    const program = scenario.makeProgram(mode);
    if (program.kind !== 'userLet' || program.body.kind !== 'userRunFinally') {
      throw new Error('unexpected Example 4 structure');
    }
    return {
      kind: 'userRunFinally',
      runner: program.body.runner,
      computation: substituteUserComputation(program.body.computation, program.binder, substitutedHandle),
      finaliser: substituteUserFinaliserBundle(program.body.finaliser, program.binder, substitutedHandle),
    } as const;
  };

  const kernelFinaliser: LambdaCoopKernelFinaliserBundle = {
    returnHandler: {
      parameter: 'value',
      body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'value' } },
    },
    exceptionHandlers: [
      {
        exception: 'WriteFailed',
        parameter: 'err',
        body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'err' } },
      },
    ],
    signalHandlers: [
      {
        signal: 'DiskFull',
        body: { kind: 'kernelReturn', value: { kind: 'constant', label: 'closed-after-signal' } },
      },
    ],
  };

  const kernelGetEnvContinuation: LambdaCoopKernelContinuation = {
    parameter: 'env',
    body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'env' } },
  };

  const kernelSetEnvContinuation: LambdaCoopKernelContinuation = {
    parameter: '_',
    body: {
      kind: 'kernelOperation',
      operation: 'getenv',
      argument: { kind: 'unitValue' },
      continuation: {
        parameter: 'observed',
        body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'observed' } },
      },
    },
  };

  const kernelOperationContinuation: LambdaCoopKernelContinuation = {
    parameter: 'payload',
    body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'payload' } },
  };

  return {
    runFinally: (
      ['return', 'exception', 'signal'] satisfies readonly RunnerCalculusExample4Mode[]
    ).map((mode) => ({ description: `run-${mode}`, term: makeRunTerm(mode) })),
    kernelFinally: {
      finaliser: kernelFinaliser,
      branches: [
        {
          description: 'kernel-return',
          computation: { kind: 'kernelReturn', value: { kind: 'constant', label: 'ok' } },
        },
        {
          description: 'kernel-exception',
          computation: {
            kind: 'kernelRaise',
            exception: 'WriteFailed',
            payload: { kind: 'constant', label: 'write-error' },
          },
        },
        {
          description: 'kernel-signal',
          computation: { kind: 'kernelSignal', signal: 'DiskFull' },
        },
      ],
    },
    kernelGetEnv: [
      {
        description: 'kernel-getenv',
        continuation: kernelGetEnvContinuation,
        environment: { kind: 'constant', label: 'env#get' },
      },
    ],
    kernelSetEnv: [
      {
        description: 'kernel-setenv',
        continuation: kernelSetEnvContinuation,
        initialEnvironment: { kind: 'constant', label: 'env#before' },
        nextEnvironment: { kind: 'constant', label: 'env#after' },
      },
    ],
    kernelOperation: [
      {
        description: 'kernel-operation-write',
        operation: 'write',
        argument: { kind: 'constant', label: 'chunk#1' },
        continuation: kernelOperationContinuation,
      },
    ],
  };
}
