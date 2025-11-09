import {
  type LambdaCoopUserComputation,
  type LambdaCoopValue,
  type LambdaCoopUserComputationTyping,
  deriveUserOp,
  deriveUserRun,
  deriveUserTry,
  makeContext,
  summarizeUserComputationResources,
  describeTyping,
  evaluateUser,
  describeUserEval,
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

  // Evaluate (user evaluator steps through continuation; run is a no-op wrapper)
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

export function allExamples(): readonly LambdaCoopExample[] {
  return [exampleSupervisedRunner(), exampleTryRaise()];
}
