import {
  SetCat,
  type ExponentialArrow,
  type ProductData,
  type SetHom,
  type SetObj,
  type SetTerminalObject,
} from "./set-cat";

export interface AlgebraicOperation<Name extends string, Parameter, Result> {
  readonly name: Name;
  readonly parameterCarrier: SetObj<Parameter>;
  readonly resultCarrier: SetObj<Result>;
  readonly metadata?: ReadonlyArray<string>;
}

export const makeAlgebraicOperation = <Name extends string, Parameter, Result>(
  name: Name,
  parameterCarrier: SetObj<Parameter>,
  resultCarrier: SetObj<Result>,
  metadata: ReadonlyArray<string> = [],
): AlgebraicOperation<Name, Parameter, Result> => ({
  name,
  parameterCarrier,
  resultCarrier,
  ...(metadata.length > 0 ? { metadata } : {}),
});

type AnyAlgebraicOperation = AlgebraicOperation<string, unknown, unknown>;

type OperationMap<Ops> = {
  readonly [Name in keyof Ops]: Ops[Name] extends AnyAlgebraicOperation
    ? Ops[Name]
    : never;
};

export interface AlgebraicSignature<Ops extends OperationMap<Ops>> {
  readonly operations: Ops;
  readonly metadata?: ReadonlyArray<string>;
}

const ensureOperationNamesConsistent = (
  operations: Record<string, AnyAlgebraicOperation>,
): void => {
  for (const [key, operation] of Object.entries(operations)) {
    if (operation.name !== key) {
      throw new Error(
        `AlgebraicSignature: operation stored under key "${key}" must expose matching name but was "${operation.name}".`,
      );
    }
  }
};

export const makeAlgebraicSignature = <Ops extends OperationMap<Ops>>(
  operations: Ops,
  metadata: ReadonlyArray<string> = [],
): AlgebraicSignature<Ops> => {
  ensureOperationNamesConsistent(operations as Record<string, AnyAlgebraicOperation>);
  return {
    operations,
    ...(metadata.length > 0 ? { metadata } : {}),
  };
};

export type OperationParameter<Op> = Op extends AlgebraicOperation<
  string,
  infer Parameter,
  unknown
>
  ? Parameter
  : never;

export type OperationResult<Op> = Op extends AlgebraicOperation<
  string,
  unknown,
  infer Result
>
  ? Result
  : never;

export interface RunnerCooperation<Parameter, Result, State> {
  readonly operation: AlgebraicOperation<string, Parameter, Result>;
  readonly domain: ProductData<Parameter, State>;
  readonly codomain: ProductData<Result, State>;
  readonly cooperation: SetHom<readonly [Parameter, State], readonly [Result, State]>;
  readonly curried: SetHom<
    Parameter,
    ExponentialArrow<State, readonly [Result, State]>
  >;
  readonly metadata?: ReadonlyArray<string>;
}

export type RunnerImplementation<Parameter, Result, State> = (
  parameter: Parameter,
  state: State,
) => readonly [Result, State];

export const makeRunnerCooperation = <
  Parameter,
  Result,
  State,
>(
  operation: AlgebraicOperation<string, Parameter, Result>,
  stateCarrier: SetObj<State>,
  implementation: RunnerImplementation<Parameter, Result, State>,
  metadata: ReadonlyArray<string> = [],
): RunnerCooperation<Parameter, Result, State> => {
  const domain = SetCat.product(operation.parameterCarrier, stateCarrier);
  const codomain = SetCat.product(operation.resultCarrier, stateCarrier);
  const cooperation = SetCat.hom(
    domain.object,
    codomain.object,
    (pair) => {
      const [parameter, state] = pair;
      const [result, nextState] = implementation(parameter, state);
      if (codomain.lookup) {
        return codomain.lookup(result, nextState);
      }
      return [result, nextState] as const;
    },
  );

  const exponential = SetCat.exponential(stateCarrier, codomain.object);
  const curried = exponential.curry({
    domain: operation.parameterCarrier,
    product: domain,
    morphism: cooperation,
  });

  return {
    operation,
    domain,
    codomain,
    cooperation,
    curried,
    ...(metadata.length > 0 ? { metadata } : {}),
  };
};

export interface AlgebraicSignatureRunner<Ops extends OperationMap<Ops>, State> {
  readonly signature: AlgebraicSignature<Ops>;
  readonly stateCarrier: SetObj<State>;
  readonly cooperations: {
    readonly [Name in keyof Ops]: Ops[Name] extends AlgebraicOperation<
      string,
      infer Parameter,
      infer Result
    >
      ? RunnerCooperation<Parameter, Result, State>
      : never;
  };
  readonly metadata?: ReadonlyArray<string>;
}

export const buildSignatureRunner = <Ops extends OperationMap<Ops>, State>(
  signature: AlgebraicSignature<Ops>,
  stateCarrier: SetObj<State>,
  implementations: {
    readonly [Name in keyof Ops]: Ops[Name] extends AlgebraicOperation<
      string,
      infer Parameter,
      infer Result
    >
      ? RunnerImplementation<Parameter, Result, State>
      : never;
  },
  metadata: ReadonlyArray<string> = [],
): AlgebraicSignatureRunner<Ops, State> => {
  const cooperationsEntries = Object.entries(
    signature.operations as Record<string, AnyAlgebraicOperation>,
  ).map(
    ([name, operation]) => {
      const implementation = implementations[name as keyof Ops];
      const cooperation = makeRunnerCooperation(
        operation as AlgebraicOperation<string, unknown, unknown>,
        stateCarrier,
        implementation as RunnerImplementation<unknown, unknown, State>,
      );
      return [name, cooperation] as const;
    },
  );
  const cooperations = Object.fromEntries(cooperationsEntries) as AlgebraicSignatureRunner<
    Ops,
    State
  >["cooperations"];

  return {
    signature,
    stateCarrier,
    cooperations,
    ...(metadata.length > 0 ? { metadata } : {}),
  };
};

export const applyRunnerCooperation = <
  Parameter,
  Result,
  State,
>(
  cooperation: RunnerCooperation<Parameter, Result, State>,
  parameter: Parameter,
  state: State,
): readonly [Result, State] => {
  const curried = cooperation.curried.map(parameter);
  const result = curried(state);
  return result;
};

export interface StateSignatureOperations<State> {
  readonly getenv: AlgebraicOperation<"getenv", SetTerminalObject, State>;
  readonly setenv: AlgebraicOperation<"setenv", State, SetTerminalObject>;
}

export const makeStateSignature = <State>(
  stateCarrier: SetObj<State>,
  metadata: ReadonlyArray<string> = [],
): AlgebraicSignature<StateSignatureOperations<State>> => {
  const terminal = SetCat.terminal();
  const unitCarrier = terminal.object;
  const operations: StateSignatureOperations<State> = {
    getenv: makeAlgebraicOperation(
      "getenv",
      unitCarrier,
      stateCarrier,
      [
        "State signature operation getenv",
        "Example 1 from Phase IV: returns current state",
      ],
    ),
    setenv: makeAlgebraicOperation(
      "setenv",
      stateCarrier,
      unitCarrier,
      [
        "State signature operation setenv",
        "Example 1 from Phase IV: overwrite state",
      ],
    ),
  };

  return makeAlgebraicSignature(operations, [
    "State signature Σ_{state}",
    ...metadata,
  ]);
};

export interface StateRunnerOptions {
  readonly metadata?: ReadonlyArray<string>;
}

export const makeStateRunner = <State>(
  stateCarrier: SetObj<State>,
  options: StateRunnerOptions = {},
): AlgebraicSignatureRunner<StateSignatureOperations<State>, State> => {
  const signature = makeStateSignature(stateCarrier);
  const terminal = SetCat.terminal();
  const unitCarrier = terminal.object;
  const unitValue = Array.from(unitCarrier)[0]!;

  const runner = buildSignatureRunner(
    signature,
    stateCarrier,
    {
      getenv: (_input, state) => [state, state] as const,
      setenv: (nextState, _current) => [unitValue, nextState] as const,
    },
    [
      "State runner implements Example 1 operations",
      ...(options.metadata ?? []),
    ],
  );

  return runner;
};

