import { describe, expect, it } from 'vitest';
import {
  LambdaCoopKernelContinuation,
  LambdaCoopKernelOperation,
  LambdaCoopKernelSignal,
  LambdaCoopRunnerClause,
  LambdaCoopRunnerLiteral,
  LambdaCoopUserComputation,
  LambdaCoopUserOperation,
  summarizeKernelComputationResources,
  summarizeUserComputationResources,
  summarizeValueResources,
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

