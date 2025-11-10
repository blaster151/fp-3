import {
  EXAMPLE8_ACTIONS,
  EXAMPLE8_BASE_Y_VALUES,
  EXAMPLE8_STATES,
  actOnExample8Reader,
  actOnExample8State,
  applyExample8Function,
  applyExample8FunctionSquared,
  flattenExample8UpdateFunction,
  isExample8Reader,
  isExample8ReaderSquared,
  isExample8UpdateFunction,
  isExample8UpdateFunctionSquared,
  makeExample8MonadComonadInteractionLaw,
  type Example8Action,
  type Example8InteractionValue,
  type Example8Left,
  type Example8Reader,
  type Example8ReaderSquared,
  type Example8Right,
  type Example8State,
  type Example8UpdateFunction,
  type Example8UpdateFunctionSquared,
} from "./monad-comonad-interaction-law";
import {
  type MonadComonadInteractionLaw,
  type StatefulRunner,
  buildRunnerFromInteraction,
  compareRunnerThetas,
  runnerToCoalgebraComponents,
  runnerToCostTCoalgebraComponents,
  runnerToCostateComponents,
} from "./stateful-runner";
import { SetCat, type SetHom, type SetObj } from "./set-cat";
import type { IndexedElement } from "./chu-space";
import type { TwoArrow, TwoObject } from "./two-object-cat";

export interface Example12UpdateLens {
  readonly head: (reader: Example8Reader) => Example8State;
  readonly updateReader: (reader: Example8Reader, action: Example8Action) => Example8Reader;
  readonly updateReaderSquared: (
    reader: Example8ReaderSquared,
    action: Example8Action,
  ) => Example8ReaderSquared;
  readonly updateBaseY: (reader: Example8Reader, action: Example8Action) => Example8BaseY;
}

export interface Example12UpdateLensSpec {
  readonly readerCarrier: SetObj<Example8Reader>;
  readonly readerSquaredCarrier: SetObj<Example8ReaderSquared>;
  readonly stateCarrier: SetObj<Example8State>;
  readonly actionCarrier: SetObj<Example8Action>;
  readonly lens: Example12UpdateLens;
  readonly hp: SetHom<Example8Reader, Example8State>;
  readonly updReader: SetHom<readonly [Example8Reader, Example8Action], Example8Reader>;
}

type Example8BaseY = Example8Reader[1];

const buildReaderCarrier = (): SetObj<Example8Reader> =>
  SetCat.obj(
    EXAMPLE8_STATES.flatMap((state) =>
      EXAMPLE8_BASE_Y_VALUES.map(
        (value) => [state, value] as Example8Reader,
      ),
    ),
    { tag: "Example12Reader" },
  );

const buildReaderSquaredCarrier = (): SetObj<Example8ReaderSquared> =>
  SetCat.obj(
    EXAMPLE8_STATES.flatMap((state) =>
      EXAMPLE8_STATES.flatMap((innerState) =>
        EXAMPLE8_BASE_Y_VALUES.map(
          (innerValue) =>
            [state, [innerState, innerValue] as Example8Reader] as Example8ReaderSquared,
        ),
      ),
    ),
    { tag: "Example12ReaderSquared" },
  );

const buildStateCarrier = (): SetObj<Example8State> => SetCat.obj(EXAMPLE8_STATES, { tag: "Example12State" });
const buildActionCarrier = (): SetObj<Example8Action> => SetCat.obj(EXAMPLE8_ACTIONS, { tag: "Example12Action" });

export const makeExample12UpdateLensSpec = (): Example12UpdateLensSpec => {
  const readerCarrier = buildReaderCarrier();
  const readerSquaredCarrier = buildReaderSquaredCarrier();
  const stateCarrier = buildStateCarrier();
  const actionCarrier = buildActionCarrier();

  const lens: Example12UpdateLens = {
    head: (reader) => reader[0],
    updateReader: (reader, action) => actOnExample8Reader(action, reader),
    updateReaderSquared: (readerSquared, action) => [
      actOnExample8State(action, readerSquared[0]),
      actOnExample8Reader(action, readerSquared[1]),
    ],
    updateBaseY: (reader, action) => actOnExample8Reader(action, reader)[1],
  };

  const hp = SetCat.hom(readerCarrier, stateCarrier, (reader) => lens.head(reader));
  const updReader = SetCat.hom(
    SetCat.product(readerCarrier, actionCarrier).object,
    readerCarrier,
    ([reader, action]) => lens.updateReader(reader, action),
  );

  return { readerCarrier, readerSquaredCarrier, stateCarrier, actionCarrier, lens, hp, updReader };
};

const toUpdateFunction = (left: Example8Left): Example8UpdateFunction =>
  isExample8UpdateFunction(left) ? left : flattenExample8UpdateFunction(left as Example8UpdateFunctionSquared);

const toReader = (right: Example8Right): Example8Reader =>
  isExample8Reader(right) ? right : (right as Example8ReaderSquared)[1];

const computeThetaValue = (
  lens: Example12UpdateLens,
  left: Example8Left,
  right: Example8Right,
): Example8InteractionValue => {
  if (isExample8UpdateFunctionSquared(left)) {
    const state = isExample8Reader(right) ? right[0] : (right as Example8ReaderSquared)[0];
    const [action, inner] = applyExample8FunctionSquared(left, state);
    if (isExample8Reader(right)) {
      return [inner, lens.updateBaseY(right, action)] as Example8InteractionValue;
    }
    const updated = lens.updateReader((right as Example8ReaderSquared)[1], action);
    return [inner, updated] as Example8InteractionValue;
  }

  const reader = toReader(right);
  const state = lens.head(reader);
  const [action, baseX] = applyExample8Function(toUpdateFunction(left), state);

  if (isExample8Reader(right)) {
    return [baseX, lens.updateBaseY(right, action)] as Example8InteractionValue;
  }

  const updated = lens.updateReader((right as Example8ReaderSquared)[1], action);
  return [baseX, updated] as Example8InteractionValue;
};

export interface BuildExample12RunnerOptions {
  readonly interaction?: MonadComonadInteractionLaw<TwoObject, TwoArrow, Example8Left, Example8Right, Example8InteractionValue, TwoObject, TwoArrow>;
  readonly metadata?: ReadonlyArray<string>;
}

export const buildExample12UpdateLensRunner = (
  spec: Example12UpdateLensSpec,
  options: BuildExample12RunnerOptions = {},
): {
  readonly runner: StatefulRunner<TwoObject, Example8Left, Example8Right, Example8InteractionValue>;
  readonly interaction: MonadComonadInteractionLaw<TwoObject, TwoArrow, Example8Left, Example8Right, Example8InteractionValue, TwoObject, TwoArrow>;
} => {
  const interaction = options.interaction ?? makeExample8MonadComonadInteractionLaw();
  const thetaHom = new Map<
    TwoObject,
    SetHom<
      readonly [IndexedElement<TwoObject, Example8Left>, IndexedElement<TwoObject, Example8Right>],
      Example8InteractionValue
    >
  >();
  const thetas = new Map<
    TwoObject,
    SetHom<
      IndexedElement<TwoObject, Example8Left>,
      (right: IndexedElement<TwoObject, Example8Right>) => Example8InteractionValue
    >
  >();
  const diagnostics: string[] = ["update-lens: synthesised θ via Example 12 formula."];
  if (options.metadata && options.metadata.length > 0) diagnostics.push(...options.metadata);

  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const phi = SetCat.hom(
      fiber.product.object,
      fiber.phi.cod as SetObj<Example8InteractionValue>,
      ([primal, dual]) => computeThetaValue(spec.lens, primal.element as Example8Left, dual.element as Example8Right),
    );
    thetaHom.set(
      object,
      phi as SetHom<
        readonly [IndexedElement<TwoObject, Example8Left>, IndexedElement<TwoObject, Example8Right>],
        Example8InteractionValue
      >,
    );
    const theta = fiber.exponential.curry({
      domain: fiber.primalFiber,
      product: fiber.product,
      morphism: phi,
    });
    thetas.set(
      object,
      theta as SetHom<
        IndexedElement<TwoObject, Example8Left>,
        (right: IndexedElement<TwoObject, Example8Right>) => Example8InteractionValue
      >,
    );
  }

  diagnostics.push(`update-lens: constructed θ for ${thetaHom.size} object(s).`);

  const runner: StatefulRunner<TwoObject, Example8Left, Example8Right, Example8InteractionValue> = {
    thetas,
    thetaHom,
    diagnostics,
  };

  return { runner, interaction };
};

export const compareExample12Runners = (
  interaction: MonadComonadInteractionLaw<TwoObject, TwoArrow, Example8Left, Example8Right, Example8InteractionValue, TwoObject, TwoArrow>,
  baseline: StatefulRunner<TwoObject, Example8Left, Example8Right, Example8InteractionValue>,
  candidate: StatefulRunner<TwoObject, Example8Left, Example8Right, Example8InteractionValue>,
  sampleLimit = 8,
) => compareRunnerThetas(baseline, candidate, interaction, { sampleLimit });

export const buildExample12UpdateLensSuite = () => {
  const spec = makeExample12UpdateLensSpec();
  const { interaction, runner } = buildExample12UpdateLensRunner(spec);
  const canonical = buildRunnerFromInteraction(interaction);
  const costate = runnerToCostateComponents(runner, interaction);
  const coalgebra = runnerToCoalgebraComponents(runner, interaction);
  const costT = runnerToCostTCoalgebraComponents(runner, interaction);
  return { spec, interaction, runner, canonical, costate, coalgebra, costT };
};
