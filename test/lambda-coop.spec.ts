import { describe, expect, it } from 'vitest';
import {
  checkKernelFinallyEquation,
  checkKernelGetEnvEquation,
  checkKernelOperationPropagationEquation,
  checkKernelSetEnvEquation,
  checkRunFinallyEquation,
  evaluateKernel,
  evaluateUser,
  instantiateKernelClause,
  substituteUserComputation,
  substituteUserFinaliserBundle,
  summarizeRunnerCalculusRewrites,
  summarizeFinaliserOutcomes,
  summarizeKernelComputationResources,
  summarizeKernelEvaluation,
  summarizeKernelEvaluations,
  summarizeUserComputationResources,
  summarizeUserEvaluation,
  summarizeUserEvaluations,
  summarizeValueResources,
  RUNNER_CALCULUS_EXPECTED_LAWS,
} from '../lambda-coop';
import {
  makeExample4RunnerCalculusScenario,
  makeRunnerCalculusRewriteHarnessFromExample4,
} from '../lambda-coop.examples';
import type {
  LambdaCoopKernelContinuation,
  LambdaCoopKernelFinaliserBundle,
  LambdaCoopKernelOperation,
  LambdaCoopKernelSignal,
  LambdaCoopRunnerClause,
  LambdaCoopRunnerLiteral,
  LambdaCoopUserComputation,
  LambdaCoopUserFinaliserBundle,
  LambdaCoopUserOperation,
  LambdaCoopUserRunFinally,
} from '../lambda-coop';

describe('λ_{coop} resource accounting', () => {
  const kernelWrite: LambdaCoopKernelOperation = {
    kind: 'kernelOperation',
    operation: 'write',
    argument: { kind: 'variable', name: 'payload' },
    continuation: {
      parameter: 'state',
      body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'state' } },
    },
    annotation: {
      signals: ['io-warning'],
    },
    stateEffect: 'FileState',
  };

  const kernelSignal: LambdaCoopKernelSignal = {
    kind: 'kernelSignal',
    signal: 'io-warning',
    payload: { kind: 'variable', name: 'warning' },
  };

  const kernelClauseContinuation: LambdaCoopKernelContinuation = {
    parameter: 'handle',
    body: {
      kind: 'kernelLet',
      binder: 'ignored',
      computation: kernelWrite,
      body: kernelSignal,
    },
  };

  const openClause: LambdaCoopRunnerClause = {
    operation: 'open',
    parameter: 'path',
    parameterType: { kind: 'base', name: 'String' },
    body: {
      kind: 'kernelLet',
      binder: 'tmp',
      computation: {
        kind: 'kernelOperation',
        operation: 'allocate',
        argument: { kind: 'variable', name: 'path' },
        continuation: kernelClauseContinuation,
        annotation: {
          exceptions: ['AllocFailure'],
        },
        stateEffect: 'FileState',
      },
      body: {
        kind: 'kernelReturn',
        value: { kind: 'variable', name: 'handle' },
      },
    },
  };

  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: 'runnerLiteral',
    stateCarrier: 'FileState',
    clauses: [openClause],
  };

  const userOperation: LambdaCoopUserOperation = {
    kind: 'userOperation',
    operation: 'open',
    argument: { kind: 'constant', label: '"hello.txt"' },
    continuation: {
      parameter: 'handle',
      body: {
        kind: 'userReturn',
        value: { kind: 'variable', name: 'handle' },
      },
    },
    annotation: {
      exceptions: ['OpenError'],
    },
  };

  const userProgram: LambdaCoopUserComputation = {
    kind: 'userRun',
    runner: runnerLiteral,
    computation: userOperation,
  };

  it('collects runner clause resources', () => {
    const runnerSummary = summarizeValueResources(runnerLiteral);
    expect(Array.from(runnerSummary.usage.signatures)).toEqual(['open', 'allocate', 'write']);
    expect(Array.from(runnerSummary.usage.states)).toEqual(['FileState']);
    expect(runnerSummary.trace.some((entry) => entry.termKind === 'runnerLiteral')).toBe(true);
  });

  it('collects kernel computation resources', () => {
    const kernelSummary = summarizeKernelComputationResources(kernelClauseContinuation.body);
    expect(Array.from(kernelSummary.usage.signatures)).toEqual(['write']);
    expect(Array.from(kernelSummary.usage.signals)).toEqual(['io-warning']);
    expect(kernelSummary.trace.some((entry) => entry.termKind === 'kernelSignal')).toBe(true);
  });

  it('collects user computation resources', () => {
    const summary = summarizeUserComputationResources(userProgram);
    expect(Array.from(summary.usage.signatures)).toEqual(['open', 'allocate', 'write']);
    expect(Array.from(summary.usage.exceptions)).toEqual(['AllocFailure', 'OpenError']);
    expect(Array.from(summary.usage.signals)).toEqual(['io-warning']);
    expect(Array.from(summary.usage.states)).toEqual(['FileState']);
    expect(summary.trace.some((entry) => entry.termKind === 'userRun')).toBe(true);
  });
});

describe('λ_{coop} interpreter runner propagation', () => {
  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: 'runnerLiteral',
    stateCarrier: 'State',
    clauses: [
      {
        operation: 'returning',
        parameter: 'arg',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelReturn', value: { kind: 'constant', label: 'ok' } },
      },
      {
        operation: 'explodes',
        parameter: 'arg',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelRaise', exception: 'Boom' },
      },
      {
        operation: 'signals',
        parameter: 'arg',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelSignal', signal: 'Stop' },
      },
    ],
  };

  const makeProgram = (operation: string): LambdaCoopUserComputation => ({
    kind: 'userRun',
    runner: runnerLiteral,
    computation: {
      kind: 'userOperation',
      operation,
      argument: { kind: 'unitValue' },
      continuation: {
        parameter: 'x',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'x' } },
      },
    },
  });

  it('delivers kernel return values to the continuation', () => {
    const result = evaluateUser(makeProgram('returning'));
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'ok' });
    expect(result.operations).toContain('returning');
  });

  it('propagates kernel exceptions', () => {
    const result = evaluateUser(makeProgram('explodes'));
    expect(result.status).toBe('exception');
    expect(result.exception).toBe('Boom');
  });

  it('propagates kernel signals', () => {
    const result = evaluateUser(makeProgram('signals'));
    expect(result.status).toBe('signal');
    expect(result.signal).toBe('Stop');
  });
});

describe('λ_{coop} interpreter finaliser discipline', () => {
  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: 'runnerLiteral',
    stateCarrier: 'State',
    clauses: [
      {
        operation: 'returning',
        parameter: 'arg',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelReturn', value: { kind: 'constant', label: 'ok' } },
      },
      {
        operation: 'explodes',
        parameter: 'arg',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelRaise', exception: 'Boom' },
      },
      {
        operation: 'signals',
        parameter: 'arg',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelSignal', signal: 'Stop' },
      },
    ],
  };

  const finaliserWithSignals: LambdaCoopUserFinaliserBundle = {
    returnHandler: {
      parameter: 'result',
      body: {
        kind: 'userOperation',
        operation: 'final-op-return',
        argument: { kind: 'unitValue' },
        continuation: {
          parameter: 'ignored',
          body: { kind: 'userReturn', value: { kind: 'variable', name: 'result' } },
        },
      },
    },
    exceptionHandlers: [
      {
        exception: 'Boom',
        body: {
          kind: 'userOperation',
          operation: 'final-op-exception',
          argument: { kind: 'unitValue' },
          continuation: {
            parameter: 'ignored',
            body: { kind: 'userReturn', value: { kind: 'constant', label: 'recovered' } },
          },
        },
      },
    ],
    signalHandlers: [
      {
        signal: 'Stop',
        body: {
          kind: 'userOperation',
          operation: 'final-op-signal',
          argument: { kind: 'unitValue' },
          continuation: {
            parameter: 'ignored',
            body: { kind: 'userReturn', value: { kind: 'constant', label: 'stopped' } },
          },
        },
      },
    ],
  };

  const finaliserWithoutSignal: LambdaCoopUserFinaliserBundle = {
    ...finaliserWithSignals,
    signalHandlers: [],
  };

  const makeProgram = (
    operation: string,
    finaliser: LambdaCoopUserFinaliserBundle,
  ): LambdaCoopUserComputation => ({
    kind: 'userRunFinally',
    runner: runnerLiteral,
    computation: {
      kind: 'userOperation',
      operation,
      argument: { kind: 'unitValue' },
      continuation: {
        parameter: 'x',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'x' } },
      },
    },
    finaliser,
  });

  it('runs the return finaliser and preserves the value', () => {
    const result = evaluateUser(makeProgram('returning', finaliserWithSignals));
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'ok' });
    expect(result.operations).toContain('returning');
    expect(result.operations).toContain('final-op-return');
    expect(result.operations.filter((op) => op === 'final-op-return')).toHaveLength(1);
    expect(result.finaliserOutcomes).toEqual([
      {
        runId: 'user-run-finally#0',
        outcome: { kind: 'return', value: { kind: 'constant', label: 'ok' } },
        branch: 'return',
        status: 'handled',
        handler: 'return',
      },
    ]);
  });

  it('summarises finaliser outcomes per run', () => {
    const result = evaluateUser(makeProgram('returning', finaliserWithSignals));
    const summary = summarizeFinaliserOutcomes(result.finaliserOutcomes ?? []);
    expect(summary.totalRuns).toBe(1);
    expect(summary.totalOutcomes).toBe(1);
    expect(summary.branchCounts.return).toBe(1);
    expect(summary.statusCounts.handled).toBe(1);
    expect(summary.exactlyOnce).toBe(true);
    expect(summary.runs[0]).toEqual(
      expect.objectContaining({
        runId: 'user-run-finally#0',
        handled: 1,
        propagated: 0,
        errors: 0,
      }),
    );
  });

  it('invokes the exception finaliser when the runner raises', () => {
    const result = evaluateUser(makeProgram('explodes', finaliserWithSignals));
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'recovered' });
    expect(result.operations).toContain('explodes');
    expect(result.operations).toContain('final-op-exception');
    expect(result.operations.filter((op) => op === 'final-op-exception')).toHaveLength(1);
    expect(result.finaliserOutcomes).toEqual([
      {
        runId: 'user-run-finally#0',
        outcome: { kind: 'exception', exception: 'Boom' },
        branch: 'exception',
        status: 'handled',
        handler: 'exception:Boom',
      },
    ]);
  });

  it('dispatches to the signal finaliser when available', () => {
    const result = evaluateUser(makeProgram('signals', finaliserWithSignals));
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'stopped' });
    expect(result.operations).toContain('signals');
    expect(result.operations).toContain('final-op-signal');
    expect(result.operations.filter((op) => op === 'final-op-signal')).toHaveLength(1);
    expect(result.finaliserOutcomes).toEqual([
      {
        runId: 'user-run-finally#0',
        outcome: { kind: 'signal', signal: 'Stop' },
        branch: 'signal',
        status: 'handled',
        handler: 'signal:Stop',
      },
    ]);
  });

  it('propagates signals when the finaliser lacks a handler', () => {
    const result = evaluateUser(makeProgram('signals', finaliserWithoutSignal));
    expect(result.status).toBe('signal');
    expect(result.signal).toBe('Stop');
    expect(result.operations).toEqual(['signals']);
    expect(result.finaliserOutcomes).toEqual([
      {
        runId: 'user-run-finally#0',
        outcome: { kind: 'signal', signal: 'Stop' },
        branch: 'signal',
        status: 'propagated',
        handler: 'signal:Stop',
      },
    ]);
  });

  it('rejects re-entrant finaliser execution', () => {
    const reentrantFinaliser: LambdaCoopUserFinaliserBundle = {
      returnHandler: {
        parameter: 'result',
        body: makeProgram('returning', finaliserWithSignals),
      },
      exceptionHandlers: finaliserWithSignals.exceptionHandlers,
      signalHandlers: finaliserWithSignals.signalHandlers,
    };
    const result = evaluateUser(makeProgram('returning', reentrantFinaliser));
    expect(result.status).toBe('error');
    expect(result.error).toBe('finaliser-reentrancy');
    expect(result.operations).toEqual(['returning']);
    expect(result.finaliserOutcomes).toEqual([
      {
        runId: 'user-run-finally#0',
        outcome: { kind: 'return', value: { kind: 'constant', label: 'ok' } },
        branch: 'return',
        status: 'handled',
        handler: 'return',
      },
    ]);
  });
});

describe('λ_{coop} user evaluation summaries', () => {
  it('summarises a simple user return with no finalisers', () => {
    const result = evaluateUser({ kind: 'userReturn', value: { kind: 'unitValue' } });
    const summary = summarizeUserEvaluation(result);
    expect(summary.status).toBe('value');
    expect(summary.valueKind).toBe('unitValue');
    expect(summary.finaliserSummary).toBeUndefined();
    expect(summary.traceLength).toBeGreaterThan(0);
    expect(summary.notes).toContain('finalisers:none');
  });

  it('captures exception payloads in user evaluation results', () => {
    const result = evaluateUser({
      kind: 'userRaise',
      exception: 'Boom',
      payload: { kind: 'constant', label: 'data' },
    });
    expect(result.status).toBe('exception');
    expect(result.exceptionPayload).toEqual({ kind: 'constant', label: 'data' });
    const summary = summarizeUserEvaluation(result);
    expect(summary.exception).toBe('Boom');
    expect(summary.exceptionPayloadKind).toBe('constant');
    expect(summary.notes).toContain('exceptionPayload:constant');
  });

  it('substitutes exception payloads into try handlers', () => {
    const program: LambdaCoopUserComputation = {
      kind: 'userTry',
      computation: {
        kind: 'userRaise',
        exception: 'Boom',
        payload: { kind: 'constant', label: 'payload' },
      },
      returnHandler: {
        parameter: 'unit',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'unit' } },
      },
      exceptionHandlers: [
        {
          exception: 'Boom',
          parameter: 'reason',
          body: { kind: 'userReturn', value: { kind: 'variable', name: 'reason' } },
        },
      ],
    };
    const result = evaluateUser(program);
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'payload' });
  });

  it('summarises finaliser propagation metadata', () => {
    const runnerLiteral: LambdaCoopRunnerLiteral = {
      kind: 'runnerLiteral',
      stateCarrier: 'State',
      clauses: [
        {
          operation: 'signals',
          parameter: 'arg',
          parameterType: { kind: 'unit' },
          body: { kind: 'kernelSignal', signal: 'Stop' },
        },
      ],
    };
    const finaliser: LambdaCoopUserFinaliserBundle = {
      returnHandler: {
        parameter: 'x',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'x' } },
      },
      exceptionHandlers: [],
      signalHandlers: [],
    };
    const program: LambdaCoopUserComputation = {
      kind: 'userRunFinally',
      runner: runnerLiteral,
      computation: {
        kind: 'userOperation',
        operation: 'signals',
        argument: { kind: 'unitValue' },
        continuation: {
          parameter: 'ignored',
          body: { kind: 'userReturn', value: { kind: 'unitValue' } },
        },
      },
      finaliser,
    };
    const result = evaluateUser(program);
    const summary = summarizeUserEvaluation(result);
    expect(summary.status).toBe('signal');
    expect(summary.signal).toBe('Stop');
    expect(summary.finaliserSummary?.statusCounts.propagated).toBe(1);
    expect(summary.notes.some((note) => note.startsWith('finalisers:runs='))).toBe(true);
    expect(summary.notes.some((note) => note.startsWith('finaliser-note:run='))).toBe(true);
  });

  it('propagates exception payloads through finaliser handlers', () => {
    const runner: LambdaCoopRunnerLiteral = {
      kind: 'runnerLiteral',
      stateCarrier: 'State',
      clauses: [
        {
          operation: 'boom',
          parameter: 'unit',
          parameterType: { kind: 'unit' },
          body: {
            kind: 'kernelRaise',
            exception: 'Boom',
            payload: { kind: 'constant', label: 'oops' },
          },
        },
      ],
    };
    const finaliser: LambdaCoopUserFinaliserBundle = {
      returnHandler: {
        parameter: 'x',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'x' } },
      },
      exceptionHandlers: [
        {
          exception: 'Boom',
          parameter: 'reason',
          body: { kind: 'userReturn', value: { kind: 'variable', name: 'reason' } },
        },
      ],
      signalHandlers: [],
    };
    const program: LambdaCoopUserComputation = {
      kind: 'userRunFinally',
      runner,
      computation: {
        kind: 'userOperation',
        operation: 'boom',
        argument: { kind: 'unitValue' },
        continuation: {
          parameter: 'ignored',
          body: { kind: 'userReturn', value: { kind: 'unitValue' } },
        },
      },
      finaliser,
    };
    const result = evaluateUser(program);
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'oops' });
    expect(result.finaliserOutcomes).toBeDefined();
    const [outcome] = result.finaliserOutcomes ?? [];
    expect(outcome?.outcome).toEqual({
      kind: 'exception',
      exception: 'Boom',
      payload: { kind: 'constant', label: 'oops' },
    });
    const summary = summarizeUserEvaluation(result);
    expect(summary.finaliserSummary?.branchCounts.exception).toBe(1);
    expect(summary.finaliserSummary?.notes.join(' ')).toContain('payload=constant');
  });
});

describe('λ_{coop} kernel evaluation summaries', () => {
  it('summarises a kernel return clause instantiated from a runner clause', () => {
    const clause: LambdaCoopRunnerClause = {
      operation: 'ping',
      parameter: 'unitArg',
      parameterType: { kind: 'unit' },
      body: { kind: 'kernelReturn', value: { kind: 'unitValue' } },
    };
    const instantiated = instantiateKernelClause(clause, { kind: 'unitValue' });
    const result = evaluateKernel(instantiated);
    const summary = summarizeKernelEvaluation(result);
    expect(summary.status).toBe('value');
    expect(summary.valueKind).toBe('unitValue');
    expect(summary.traceLength).toBeGreaterThan(0);
    expect(summary.operations).toEqual([]);
    expect(summary.notes).toContain('status:value');
    expect(summary.notes).toContain('trace:1');
  });

  it('summarises kernel signal behaviour for clauses without witnesses', () => {
    const clause: LambdaCoopRunnerClause = {
      operation: 'halt',
      parameter: 'payload',
      parameterType: { kind: 'unit' },
      body: { kind: 'kernelSignal', signal: 'Stop', payload: { kind: 'constant', label: 'warn' } },
    };
    const instantiated = instantiateKernelClause(clause, { kind: 'unitValue' });
    const result = evaluateKernel(instantiated);
    const summary = summarizeKernelEvaluation(result);
    expect(summary.status).toBe('signal');
    expect(summary.signal).toBe('Stop');
    expect(result.signalPayload).toEqual({ kind: 'constant', label: 'warn' });
    expect(summary.signalPayloadKind).toBe('constant');
    expect(summary.notes).toContain('signalPayload:constant');
    expect(summary.operations).toEqual([]);
    expect(summary.notes).toContain('status:signal');
    expect(summary.notes).toContain('signal:Stop');
  });

  it('records kernel exception payloads in summaries', () => {
    const clause: LambdaCoopRunnerClause = {
      operation: 'fail',
      parameter: 'unit',
      parameterType: { kind: 'unit' },
      body: {
        kind: 'kernelRaise',
        exception: 'Boom',
        payload: { kind: 'constant', label: 'detail' },
      },
    };
    const instantiated = instantiateKernelClause(clause, { kind: 'unitValue' });
    const result = evaluateKernel(instantiated);
    expect(result.exceptionPayload).toEqual({ kind: 'constant', label: 'detail' });
    const summary = summarizeKernelEvaluation(result);
    expect(summary.exception).toBe('Boom');
    expect(summary.exceptionPayloadKind).toBe('constant');
    expect(summary.notes).toContain('exceptionPayload:constant');
  });
});

describe('λ_{coop} kernel evaluation aggregation', () => {
  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: 'runnerLiteral',
    stateCarrier: 'State',
    clauses: [
      {
        operation: 'returning',
        parameter: 'unit',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelReturn', value: { kind: 'constant', label: 'ok' } },
      },
      {
        operation: 'explodes',
        parameter: 'unit',
        parameterType: { kind: 'unit' },
        body: {
          kind: 'kernelRaise',
          exception: 'Boom',
          payload: { kind: 'constant', label: 'kaboom' },
        },
      },
      {
        operation: 'signals',
        parameter: 'unit',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelSignal', signal: 'Stop', payload: { kind: 'constant', label: 'warn' } },
      },
    ],
  };

  const instantiate = (operation: string) => {
    const clause = runnerLiteral.clauses.find((entry) => entry.operation === operation);
    if (!clause) throw new Error(`missing clause ${operation}`);
    return instantiateKernelClause(clause, { kind: 'unitValue' });
  };

  it('counts per-status results and unions operations', () => {
    const summaries = [
      summarizeKernelEvaluation(evaluateKernel(instantiate('returning'))),
      summarizeKernelEvaluation(evaluateKernel(instantiate('explodes'))),
      summarizeKernelEvaluation(evaluateKernel(instantiate('signals'))),
    ];
    const aggregate = summarizeKernelEvaluations(summaries);
    expect(aggregate.totalEvaluations).toBe(3);
    expect(aggregate.statusCounts).toEqual({ value: 1, exception: 1, signal: 1 });
    expect(new Set(aggregate.operations)).toEqual(
      new Set(['returning', 'explodes', 'signals']),
    );
    expect(aggregate.valueKinds).toEqual({ constant: 1 });
    expect(aggregate.exceptions).toEqual({ Boom: 1 });
    expect(aggregate.signals).toEqual({ Stop: 1 });
    expect(aggregate.exceptionPayloadKinds).toEqual({ constant: 1 });
    expect(aggregate.signalPayloadKinds).toEqual({ constant: 1 });
    expect(aggregate.trace.total).toBeGreaterThan(0);
    expect(aggregate.notes.some((note) => note.startsWith('status='))).toBe(true);
  });

  it('returns an empty summary when no evaluations run', () => {
    const aggregate = summarizeKernelEvaluations([]);
    expect(aggregate.totalEvaluations).toBe(0);
    expect(aggregate.statusCounts).toEqual({ value: 0, exception: 0, signal: 0 });
    expect(aggregate.operations).toEqual([]);
    expect(aggregate.notes).toEqual([]);
  });
});

describe('λ_{coop} user evaluation aggregation', () => {
  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: 'runnerLiteral',
    stateCarrier: 'State',
    clauses: [
      {
        operation: 'returning',
        parameter: 'unit',
        parameterType: { kind: 'unit' },
        body: { kind: 'kernelReturn', value: { kind: 'unitValue' } },
      },
      {
        operation: 'failing',
        parameter: 'unit',
        parameterType: { kind: 'unit' },
        body: {
          kind: 'kernelRaise',
          exception: 'Boom',
          payload: { kind: 'constant', label: 'oops' },
        },
      },
    ],
  };

  const valueProgram: LambdaCoopUserComputation = {
    kind: 'userRun',
    runner: runnerLiteral,
    computation: {
      kind: 'userOperation',
      operation: 'returning',
      argument: { kind: 'unitValue' },
      continuation: {
        parameter: 'x',
        body: { kind: 'userReturn', value: { kind: 'variable', name: 'x' } },
      },
    },
  };

  const handledFinaliser: LambdaCoopUserFinaliserBundle = {
    returnHandler: {
      parameter: 'x',
      body: { kind: 'userReturn', value: { kind: 'variable', name: 'x' } },
    },
    exceptionHandlers: [
      {
        exception: 'Boom',
        parameter: 'reason',
        body: { kind: 'userReturn', value: { kind: 'constant', label: 'recovered' } },
      },
    ],
    signalHandlers: [],
  };

  const recoveredProgram: LambdaCoopUserComputation = {
    kind: 'userRunFinally',
    runner: runnerLiteral,
    computation: {
      kind: 'userOperation',
      operation: 'failing',
      argument: { kind: 'unitValue' },
      continuation: {
        parameter: 'ignored',
        body: { kind: 'userReturn', value: { kind: 'unitValue' } },
      },
    },
    finaliser: handledFinaliser,
  };

  const exceptionProgram: LambdaCoopUserComputation = {
    kind: 'userRun',
    runner: runnerLiteral,
    computation: {
      kind: 'userOperation',
      operation: 'failing',
      argument: { kind: 'unitValue' },
      continuation: {
        parameter: 'ignored',
        body: { kind: 'userReturn', value: { kind: 'unitValue' } },
      },
    },
  };

  it('aggregates user evaluation summaries with finaliser details', () => {
    const summaries = [
      summarizeUserEvaluation(evaluateUser(valueProgram)),
      summarizeUserEvaluation(evaluateUser(recoveredProgram)),
      summarizeUserEvaluation(evaluateUser(exceptionProgram)),
    ];
    const aggregate = summarizeUserEvaluations(summaries);
    expect(aggregate.totalEvaluations).toBe(3);
    expect(aggregate.statusCounts).toEqual({ value: 2, exception: 1, signal: 0, error: 0 });
    expect(new Set(aggregate.operations)).toEqual(new Set(['returning', 'failing']));
    expect(aggregate.exceptions).toEqual({ Boom: 1 });
    expect(aggregate.exceptionPayloadKinds).toEqual({ constant: 1 });
    expect(aggregate.signalPayloadKinds).toEqual({});
    expect(aggregate.finalisers.totalRuns).toBe(1);
    expect(aggregate.finalisers.statusCounts.handled).toBe(1);
    expect(aggregate.finaliserNotes.some((note) => note.includes('evaluation[1]'))).toBe(true);
    expect(aggregate.finaliserGuardErrors).toEqual([]);
    expect(aggregate.notes.some((note) => note.startsWith('status='))).toBe(true);
  });

  it('returns an empty summary when no user evaluations run', () => {
    const aggregate = summarizeUserEvaluations([]);
    expect(aggregate.totalEvaluations).toBe(0);
    expect(aggregate.statusCounts).toEqual({ value: 0, exception: 0, signal: 0, error: 0 });
    expect(aggregate.operations).toEqual([]);
    expect(aggregate.notes).toEqual([]);
    expect(aggregate.finalisers).toEqual({
      totalRuns: 0,
      totalOutcomes: 0,
      statusCounts: { handled: 0, propagated: 0, error: 0 },
      exactlyOnce: true,
    });
  });
});

describe('λ_{coop} runner calculus Example 4', () => {
  const scenario = makeExample4RunnerCalculusScenario();
  const countOps = (ops: readonly string[], name: string): number =>
    ops.filter((candidate) => candidate === name).length;

  it('closes the handle exactly once on a successful run', () => {
    const result = evaluateUser(scenario.makeProgram('return'));
    expect(result.status).toBe('value');
    expect(countOps(result.operations, 'write')).toBe(2);
    expect(countOps(result.operations, 'close')).toBe(1);
    expect(result.operations.lastIndexOf('write')).toBeLessThan(
      result.operations.indexOf('close'),
    );
  });

  it('still closes the handle when the user raises', () => {
    const result = evaluateUser(scenario.makeProgram('exception'));
    expect(result.status).toBe('exception');
    expect(result.exception).toBe('WriteFailed');
    expect(countOps(result.operations, 'close')).toBe(1);
    expect(result.operations).toContain('write');
  });

  it('runs the signal finaliser and records the outcome summary', () => {
    const result = evaluateUser(scenario.makeProgram('signal'));
    expect(result.status).toBe('value');
    expect(result.value).toEqual({ kind: 'constant', label: 'closed-after-signal' });
    expect(result.operations).toContain('warn');
    expect(countOps(result.operations, 'close')).toBe(1);
    const summary = summarizeUserEvaluation(result);
    expect(summary.finaliserSummary?.branchCounts.signal).toBe(1);
    expect(summary.finaliserSummary?.statusCounts.handled).toBeGreaterThanOrEqual(1);
  });
});

describe('λ_{coop} runner calculus rewrite equations', () => {
  const scenario = makeExample4RunnerCalculusScenario();
  const substitutedHandle = { kind: 'constant', label: 'rewrite#handle' } as const;

  const makeRunFinallyTerm = (mode: 'return' | 'exception' | 'signal'): LambdaCoopUserRunFinally => {
    const program = scenario.makeProgram(mode);
    if (program.kind !== 'userLet' || program.body.kind !== 'userRunFinally') {
      throw new Error('unexpected Example 4 structure');
    }
    const runTerm = program.body;
    return {
      kind: 'userRunFinally',
      runner: runTerm.runner,
      computation: substituteUserComputation(runTerm.computation, program.binder, substitutedHandle),
      finaliser: substituteUserFinaliserBundle(runTerm.finaliser, program.binder, substitutedHandle),
    };
  };

  it('verifies the run-return rewrite', () => {
    const report = checkRunFinallyEquation(makeRunFinallyTerm('return'));
    expect(report.equivalent).toBe(true);
    expect(report.law).toBe('run-return');
    expect(report.notes.some((note) => note.includes('finaliserBranch=handled'))).toBe(true);
  });

  it('verifies the run-exception rewrite', () => {
    const report = checkRunFinallyEquation(makeRunFinallyTerm('exception'));
    expect(report.equivalent).toBe(true);
    expect(report.law).toBe('run-exception');
    expect(report.innerResult.status).toBe('exception');
  });

  it('verifies the run-signal rewrite when a handler exists', () => {
    const report = checkRunFinallyEquation(makeRunFinallyTerm('signal'));
    expect(report.equivalent).toBe(true);
    expect(report.law).toBe('run-signal');
    expect(report.finaliserResult?.status).toBe('value');
  });
});

describe('λ_{coop} kernel calculus rewrite equations', () => {
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

  it('verifies the kernel-return rewrite', () => {
    const kernelReturn = { kind: 'kernelReturn', value: { kind: 'constant', label: 'ok' } } as const;
    const report = checkKernelFinallyEquation(kernelReturn, kernelFinaliser);
    expect(report.law).toBe('kernel-return');
    expect(report.equivalent).toBe(true);
    expect(report.finaliserResult?.value).toEqual(kernelReturn.value);
  });

  it('verifies the kernel-exception rewrite', () => {
    const payload = { kind: 'constant', label: 'write-error' } as const;
    const report = checkKernelFinallyEquation({ kind: 'kernelRaise', exception: 'WriteFailed', payload }, kernelFinaliser);
    expect(report.law).toBe('kernel-exception');
    expect(report.equivalent).toBe(true);
    expect(report.finaliserResult?.value).toEqual(payload);
  });

  it('verifies the kernel-signal rewrite when a handler exists', () => {
    const report = checkKernelFinallyEquation({ kind: 'kernelSignal', signal: 'DiskFull' }, kernelFinaliser);
    expect(report.law).toBe('kernel-signal');
    expect(report.equivalent).toBe(true);
    expect(report.finaliserResult?.value).toEqual({ kind: 'constant', label: 'closed-after-signal' });
  });

  it('reports propagation when no signal handler exists', () => {
    const report = checkKernelFinallyEquation({ kind: 'kernelSignal', signal: 'Unexpected' }, kernelFinaliser);
    expect(report.law).toBe('kernel-signal');
    expect(report.equivalent).toBe(false);
    expect(report.finaliserResult).toBeUndefined();
    expect(report.notes).toContain('finaliserBranch=propagated');
  });

  it('verifies the kernel-getenv rewrite', () => {
    const continuation: LambdaCoopKernelContinuation = {
      parameter: 'env',
      body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'env' } },
    };
    const environment = { kind: 'constant', label: 'env#1' } as const;
    const report = checkKernelGetEnvEquation({ continuation, environment });
    expect(report.law).toBe('kernel-getenv');
    expect(report.equivalent).toBe(true);
    expect(report.leftResult.value).toEqual(environment);
    expect(report.rightResult.value).toEqual(environment);
  });

  it('verifies the kernel-setenv rewrite updates the environment', () => {
    const continuation: LambdaCoopKernelContinuation = {
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
    const initialEnv = { kind: 'constant', label: 'env#before' } as const;
    const nextEnv = { kind: 'constant', label: 'env#after' } as const;
    const report = checkKernelSetEnvEquation({
      continuation,
      nextEnvironment: nextEnv,
      initialEnvironment: initialEnv,
    });
    expect(report.law).toBe('kernel-setenv');
    expect(report.equivalent).toBe(true);
    expect(report.leftResult.value).toEqual(nextEnv);
    expect(report.rightResult.value).toEqual(nextEnv);
  });

  it('verifies kernel operations propagate to continuations', () => {
    const continuation: LambdaCoopKernelContinuation = {
      parameter: 'payload',
      body: { kind: 'kernelReturn', value: { kind: 'variable', name: 'payload' } },
    };
    const argument = { kind: 'constant', label: 'chunk#1' } as const;
    const report = checkKernelOperationPropagationEquation({
      operation: 'write',
      argument,
      continuation,
    });
    expect(report.law).toBe('kernel-operation');
    expect(report.equivalent).toBe(true);
    expect(report.leftResult.value).toEqual(argument);
    expect(report.rightResult.value).toEqual(argument);
  });
});

describe('λ_{coop} runner calculus coverage summary', () => {
  it('summarises the Example 4 harness', () => {
    const summary = summarizeRunnerCalculusRewrites(
      makeRunnerCalculusRewriteHarnessFromExample4(),
    );
    expect(summary.totals.expectedLaws).toBe(RUNNER_CALCULUS_EXPECTED_LAWS.length);
    expect(summary.totals.coveredLaws).toBe(summary.totals.expectedLaws);
    expect(summary.missingLaws).toHaveLength(0);
    expect(summary.failingLaws).toHaveLength(0);
    expect(summary.kernelRewriteReports.map((entry) => entry.report.law)).toContain(
      'kernel-setenv',
    );
  });
});

