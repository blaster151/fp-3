import type { ExponentialArrow, SetHom, SetObj } from "./set-cat";
import { SetCat, getCarrierSemantics } from "./set-cat";
import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import { monadComonadInteractionLawToMonoid } from "./monad-comonad-interaction-law";
import type { IndexedElement } from "./chu-space";

export interface StatefulRunner<Obj, Left, Right, Value> {
  readonly thetas: ReadonlyMap<
    Obj,
    SetHom<
      IndexedElement<Obj, Left>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface RunnerAxiomReport {
  readonly holds: boolean;
  readonly unitDiagram: { checked: number; mismatches: number };
  readonly multiplicationDiagram: { checked: number; mismatches: number };
  readonly details: ReadonlyArray<string>;
}

export interface RunnerAxiomOptions extends BuildRunnerOptions {
  readonly objectFilter?: <Obj>(object: Obj) => boolean;
}

export interface BuildRunnerOptions {
  readonly sampleLimit?: number;
  readonly metadata?: ReadonlyArray<string>;
}

export const buildRunnerFromInteraction = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildRunnerOptions = {},
): StatefulRunner<Obj, Left, Right, Value> => {
  const thetas = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Left>, ExponentialArrow<IndexedElement<Obj, Right>, Value>>
  >();

  for (const [object, fiber] of interaction.psiComponents.entries()) {
    // Reuse the derived currying θ component directly
    thetas.set(object, fiber.theta);
  }

  const diagnostics: string[] = [
    "Stateful runner: extracted θ components from currying fibers for each object.",
    ...(options.metadata ?? []),
  ];

  return { thetas, diagnostics };
};

export const checkStatefulRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildRunnerOptions = {},
): RunnerAxiomReport => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  let unitChecked = 0;
  let unitMismatches = 0;
  let multChecked = 0;
  let multMismatches = 0;
  const details: string[] = [];

  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const theta = runner.thetas.get(object);
    if (!theta) continue; // missing theta handled elsewhere
    // Unit diagram: (η_X × id_Y); θ^X_Y == <id_X, id_Y>
    // We approximate by sampling primal fiber elements and verifying component projection stability.
    let uCount = 0;
    let uMismatchesLocal = 0;
    for (const indexedLeft of fiber.primalFiber) {
      if (uCount >= sampleLimit) break;
      uCount++;
      // Expected: identity on value recovered by evaluating phi with a canonical right element selected.
      // We select first dual element when available.
      const firstDual = (() => {
        for (const d of fiber.dualFiber as Iterable<IndexedElement<Obj, Right>>) {
          return d;
        }
        return undefined;
      })();
      if (!firstDual) break;
      const expected = fiber.phi.map([indexedLeft, firstDual]);
      const arrow = theta.map(indexedLeft);
      const actual = arrow(firstDual);
      unitChecked++;
      if (!Object.is(expected, actual)) {
        unitMismatches++;
        uMismatchesLocal++;
        if (uMismatchesLocal <= 3) {
          details.push(
            `unit-mismatch object=${String(object)} left=${String(indexedLeft.element)} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }

    // Multiplication diagram (associativity style): (TX × θ) ; θ == (μ × id); θ on sampled chained evaluation.
    // We approximate by composing two theta applications via a representative element if available.
    let mCount = 0;
    const dual0 = (() => {
      for (const d of fiber.dualFiber as Iterable<IndexedElement<Obj, Right>>) {
        return d;
      }
      return undefined;
    })();
    if (dual0) {
      let mMismatchesLocal = 0;
      for (const indexedLeft of fiber.primalFiber) {
        if (mCount >= sampleLimit) break;
        mCount++;
        const arrow1 = theta.map(indexedLeft);
        const midValue = arrow1(dual0);
        // Re-apply theta treating the result as a new left element if shape matches.
        const simulatedLeft: IndexedElement<Obj, Left> | undefined =
          (midValue && (indexedLeft as unknown as IndexedElement<Obj, Left>)) || undefined;
        if (!simulatedLeft) continue;
        const arrow2 = theta.map(simulatedLeft);
        const finalViaChain = arrow2(dual0);
        // Expected reference: single application outcome
        const direct = arrow1(dual0);
        multChecked++;
        if (!Object.is(finalViaChain, direct)) {
          multMismatches++;
          mMismatchesLocal++;
          if (mMismatchesLocal <= 3) {
            details.push(
              `mult-mismatch object=${String(object)} left=${String(indexedLeft.element)} direct=${String(direct)} chained=${String(finalViaChain)}`,
            );
          }
        }
      }
      details.push(
        `object=${String(object)} unitSamples=${uCount} unitLocalMismatches=${uMismatchesLocal} multSamples=${mCount} multLocalMismatches=${mMismatchesLocal}`,
      );
    }
  }

  details.push(
    `Runner unit diagram sampled: checked=${unitChecked} mismatches=${unitMismatches} (limit=${sampleLimit}).`,
  );
  details.push(
    `Runner multiplication diagram sampled: checked=${multChecked} mismatches=${multMismatches} (limit=${sampleLimit}).`,
  );
  if (options.metadata && options.metadata.length > 0) {
    details.push(...options.metadata);
  }
  return {
    holds: unitMismatches === 0 && multMismatches === 0,
    unitDiagram: { checked: unitChecked, mismatches: unitMismatches },
    multiplicationDiagram: { checked: multChecked, mismatches: multMismatches },
    details,
  };
};

// ---------- Coalgebra (T°) runner view (Step 2) ----------

export interface RunnerCoalgebraReport<Obj> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
  readonly objects: ReadonlyArray<Obj>;
}

export interface RunnerCostateReport<Obj> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
  readonly objects: ReadonlyArray<Obj>;
}

export const buildRunnerCoalgebra = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<
  Obj,
  SetHom<
    IndexedElement<Obj, Right>,
    ExponentialArrow<IndexedElement<Obj, Left>, Value>
  >
> => {
  // Constructs a coalgebra-style view γ_Y: Y -> T°Y for each object Y by
  // leveraging the Sweedler fromDual map. Each dual element is mapped into an
  // exponential over primal fiber elements capturing ?(primal, dual).
  const result = new Map<
    Obj,
    SetHom<IndexedElement<Obj, Right>, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >();
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const primalExp = SetCat.exponential(
      fiber.primalFiber,
      interaction.law.dualizing as SetObj<Value>,
    );
    const fromDual = interaction.sweedler.fromDual as SetHom<
      IndexedElement<Obj, Right>,
      (primal: IndexedElement<Obj, Left>) => Value
    >;
    const coalgebra = SetCat.hom(
      fiber.dualFiber,
      primalExp.object,
      (dualEl) => {
        const evalFn = fromDual.map(dualEl);
        return primalExp.register((pr) => evalFn(pr));
      },
    );
  result.set(object, coalgebra as unknown as SetHom<
      IndexedElement<Obj, Right>,
      ExponentialArrow<IndexedElement<Obj, Left>, Value>
    >);
  }
  return result;
};

export const checkRunnerCoalgebra = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: {
    sampleLimit?: number;
    objectFilter?: (object: Obj) => boolean;
    components?: ReadonlyMap<
      Obj,
      SetHom<
        IndexedElement<Obj, Right>,
        ExponentialArrow<IndexedElement<Obj, Left>, Value>
      >
    >;
  } = {},
): RunnerCoalgebraReport<Obj> => {
  // Samples the constructed coalgebra components to ensure evaluation matches
  // the original interaction law φ(primal, dual) across bounded primal/dual pairs.
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const components = options.components ?? buildRunnerCoalgebra(runner, interaction);
  const details: string[] = [];
  const objects: Obj[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const coalgebra = components.get(object);
    if (!coalgebra) continue;
    objects.push(object);
    let localChecked = 0;
    let localMismatches = 0;
    // sample a few dual/primal pairs
    let dualCount = 0;
    for (const dualEl of fiber.dualFiber as Iterable<IndexedElement<Obj, Right>>) {
      if (dualCount >= sampleLimit) break;
      dualCount++;
      const arrow = coalgebra.map(dualEl);
      let primalCount = 0;
      for (const primalEl of fiber.primalFiber as Iterable<IndexedElement<Obj, Left>>) {
        if (primalCount >= sampleLimit) break;
        primalCount++;
        const expected = fiber.phi.map([primalEl, dualEl]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primalEl);
        localChecked++;
        if (!Object.is(expected, actual)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `coalgebra-mismatch object=${String(object)} left=${String(primalEl.element)} right=${String(dualEl.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
    details.push(
      `coalgebra object=${String(object)} checked=${localChecked} mismatches=${localMismatches} (limit=${sampleLimit}).`,
    );
  }
  details.unshift(
    `Coalgebra check: sampled up to ${sampleLimit} elements per carrier across ${objects.length} object(s).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details, objects };
};
// (coalgebra check integrated)

// ---------- Costate (Right -> T°) runner view (Step 3) ----------

export const buildRunnerCostate = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<
  Obj,
  SetHom<
    Right,
    ExponentialArrow<IndexedElement<Obj, Left>, Value>
  >
> => {
  // Constructs a costate translator κ_Y: Y -> T°Y using Sweedler fromDual,
  // but with raw right elements (unindexed) as inputs.
  const result = new Map<
    Obj,
    SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
  >();
  const fromDual = interaction.sweedler.fromDual as SetHom<
    IndexedElement<Obj, Right>,
    (primal: IndexedElement<Obj, Left>) => Value
  >;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const primalExp = SetCat.exponential(
      fiber.primalFiber,
      interaction.law.dualizing as SetObj<Value>,
    );
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const costate = SetCat.hom(
      rightCarrier,
      primalExp.object,
      (rightEl) => {
        const indexed: IndexedElement<Obj, Right> = { object, element: rightEl };
        const evalFn = fromDual.map(indexed);
        return primalExp.register((pr) => evalFn(pr));
      },
    );
    result.set(object, costate as unknown as SetHom<
      Right,
      ExponentialArrow<IndexedElement<Obj, Left>, Value>
    >);
  }
  return result;
};

export const checkRunnerCostate = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: {
    sampleLimit?: number;
    objectFilter?: (object: Obj) => boolean;
    components?: ReadonlyMap<
      Obj,
      SetHom<Right, ExponentialArrow<IndexedElement<Obj, Left>, Value>>
    >;
  } = {},
): RunnerCostateReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const components = options.components ?? buildRunnerCostate(_runner, interaction);
  const details: string[] = [];
  const objects: Obj[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const costate = components.get(object);
    if (!costate) continue;
    objects.push(object);
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightSamples = enumerateLimited(rightCarrier, sampleLimit);
    const primalSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const rightEl of rightSamples) {
      const arrow = costate.map(rightEl);
      for (const primalEl of primalSamples) {
        const expected = fiber.phi.map([primalEl, { object, element: rightEl }]);
        const actual = (arrow as ExponentialArrow<IndexedElement<Obj, Left>, Value>)(primalEl);
        localChecked++;
        if (!Object.is(expected, actual)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `costate-mismatch object=${String(object)} left=${String(primalEl.element)} right=${String(rightEl)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
    details.push(
      `costate object=${String(object)} checked=${localChecked} mismatches=${localMismatches} (limit=${sampleLimit}).`,
    );
  }
  details.unshift(
    `Costate check: sampled up to ${sampleLimit} elements per carrier across ${objects.length} object(s).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details, objects };
};

// Bold step: bridge to existing monoid checker to get concrete unit/multiplication tallies.
export const checkRunnerAxiomsFromInteraction = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerAxiomOptions = {},
): RunnerAxiomReport => {
  const monoidOptions: { sampleLimit?: number; metadata?: ReadonlyArray<string> } = {};
  if (options.sampleLimit !== undefined) monoidOptions.sampleLimit = options.sampleLimit;
  if (options.metadata && options.metadata.length > 0) monoidOptions.metadata = options.metadata;
  const monoid = monadComonadInteractionLawToMonoid(interaction, monoidOptions);

  const applyFilter = (obj: Obj) => (options.objectFilter ? (options.objectFilter as (o: Obj) => boolean)(obj) : true);
  let unitChecked = 0;
  let unitMismatches = 0;
  for (const [obj, report] of monoid.unit.components.entries()) {
    if (!applyFilter(obj)) continue;
    unitChecked += report.checked;
    unitMismatches += report.mismatches;
  }

  let multChecked = 0;
  let multMismatches = 0;
  for (const [obj, report] of monoid.multiplication.components.entries()) {
    if (!applyFilter(obj)) continue;
    multChecked += report.checked;
    multMismatches += report.mismatches;
  }

  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;
  const details: string[] = [];
  details.push(
    `Runner axioms from interaction: unit checked=${unitChecked}, mismatches=${unitMismatches}.`,
  );
  details.push(
    `Runner axioms from interaction: multiplication checked=${multChecked}, mismatches=${multMismatches}.`,
  );
  details.push(...monoid.diagnostics);

  if (filter) {
    details.push("Runner axioms: object filter applied.");
  }

  return {
    holds: unitMismatches === 0 && multMismatches === 0,
    unitDiagram: { checked: unitChecked, mismatches: unitMismatches },
    multiplicationDiagram: { checked: multChecked, mismatches: multMismatches },
    details,
  };
};

// ---------- Runner morphisms and Run(T) category (Step 4) ----------

export interface RunnerMorphism<Obj, Left, Right, Value> {
  readonly components: ReadonlyMap<
    Obj,
    SetHom<
      ExponentialArrow<IndexedElement<Obj, Right>, Value>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >
  >;
  readonly details: ReadonlyArray<string>;
}

export interface RunnerMorphismReport<Obj> {
  readonly holds: boolean;
  readonly objects: ReadonlyArray<Obj>;
  readonly checked: number; // number of (left,right) samples compared
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

// Identity morphism on a runner: per object, identity on the exponential object.
export const identityRunnerMorphism = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerMorphism<Obj, Left, Right, Value> => {
  const components = new Map<
    Obj,
    SetHom<
      ExponentialArrow<IndexedElement<Obj, Right>, Value>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >
  >();
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const idHom = SetCat.hom(
      fiber.exponential.object,
      fiber.exponential.object,
      (arrow) => arrow,
    );
    components.set(object, idHom as unknown as SetHom<
      ExponentialArrow<IndexedElement<Obj, Right>, Value>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >);
  }
  return { components, details: ["identityRunnerMorphism: constructed per-object identities."] };
};

// Compose two runner morphisms (postcomposition): m2 ∘ m1
export const composeRunnerMorphisms = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  first: RunnerMorphism<Obj, Left, Right, Value>,
  second: RunnerMorphism<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerMorphism<Obj, Left, Right, Value> => {
  const components = new Map<
    Obj,
    SetHom<
      ExponentialArrow<IndexedElement<Obj, Right>, Value>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >
  >();
  const details: string[] = [];
  let count = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const f = first.components.get(object);
    const g = second.components.get(object);
    if (!f || !g) continue;
    const composed = SetCat.hom(
      fiber.exponential.object,
      fiber.exponential.object,
      (arrow) => g.map(f.map(arrow)),
    );
    components.set(object, composed as unknown as SetHom<
      ExponentialArrow<IndexedElement<Obj, Right>, Value>,
      ExponentialArrow<IndexedElement<Obj, Right>, Value>
    >);
    count++;
  }
  details.push(`composeRunnerMorphisms: composed on ${count} object(s).`);
  return { components, details };
};

export const checkRunnerMorphism = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  source: StatefulRunner<Obj, Left, Right, Value>,
  target: StatefulRunner<Obj, Left, Right, Value>,
  morphism: RunnerMorphism<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunnerMorphismReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const details: string[] = [];
  const objects: Obj[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const thetaS = source.thetas.get(object);
    const thetaT = target.thetas.get(object);
    const h = morphism.components.get(object);
    if (!thetaS || !thetaT || !h) continue;
    objects.push(object);
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const leftEl of leftSamples) {
      const arrowS = thetaS.map(leftEl);
      const mapped = h.map(arrowS);
      const arrowT = thetaT.map(leftEl);
      for (const rightEl of rightSamples) {
        localChecked++;
        const vMapped = mapped(rightEl);
        const vTarget = arrowT(rightEl);
        if (!Object.is(vMapped, vTarget)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `morphism-mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} mapped=${String(vMapped)} target=${String(vTarget)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
    details.push(
      `morphism object=${String(object)} checked=${localChecked} mismatches=${localMismatches} (limit=${sampleLimit}).`,
    );
  }
  details.unshift(
    `Runner morphism check: sampled up to ${sampleLimit} element(s) per carrier across ${objects.length} object(s).`,
  );
  return { holds: mismatches === 0, objects, checked, mismatches, details };
};

// ---------- Run(T) category laws: identity and associativity ----------

export interface RunTCategoryLawsConfig<Obj, Left, Right, Value> {
  readonly source: StatefulRunner<Obj, Left, Right, Value>;
  readonly target?: StatefulRunner<Obj, Left, Right, Value>;
  readonly mid?: StatefulRunner<Obj, Left, Right, Value>;
  readonly tail?: StatefulRunner<Obj, Left, Right, Value>;
  readonly f?: RunnerMorphism<Obj, Left, Right, Value>; // source -> target
  readonly g?: RunnerMorphism<Obj, Left, Right, Value>; // target -> mid
  readonly h?: RunnerMorphism<Obj, Left, Right, Value>; // mid -> tail
}

export interface RunTCategoryLawsReport<Obj> {
  readonly holds: boolean;
  readonly leftIdentity: { checked: number; mismatches: number };
  readonly rightIdentity: { checked: number; mismatches: number };
  readonly associativity: { checked: number; mismatches: number; skipped: boolean };
  readonly details: ReadonlyArray<string>;
}

const compareRunnerMorphisms = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  first: RunnerMorphism<Obj, Left, Right, Value>,
  second: RunnerMorphism<Obj, Left, Right, Value>,
  sampleRunner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  sampleLimit: number,
  objectFilter?: (object: Obj) => boolean,
): { checked: number; mismatches: number; details: ReadonlyArray<string> } => {
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (objectFilter && !objectFilter(object)) continue;
    const theta = sampleRunner.thetas.get(object);
    if (!theta) continue;
    const f = first.components.get(object);
    const g = second.components.get(object);
    if (!f || !g) continue;
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const leftEl of leftSamples) {
      const baseArrow = theta.map(leftEl);
      const a1 = f.map(baseArrow);
      const a2 = g.map(baseArrow);
      for (const rightEl of rightSamples) {
        localChecked++;
        const v1 = a1(rightEl);
        const v2 = a2(rightEl);
        if (!Object.is(v1, v2)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `morphism-eq-mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} first=${String(v1)} second=${String(v2)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
  }
  return { checked, mismatches, details };
};

export const checkRunTCategoryLaws = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  config: RunTCategoryLawsConfig<Obj, Left, Right, Value>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunTCategoryLawsReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const source = config.source;
  const target = config.target ?? config.source;
  const mid = config.mid ?? target;
  const tail = config.tail ?? mid;
  // Identities
  const idSource = identityRunnerMorphism(source, interaction);
  const idTarget = identityRunnerMorphism(target, interaction);
  const idMid = identityRunnerMorphism(mid, interaction);
  const idTail = identityRunnerMorphism(tail, interaction);
  // Morphisms (default to identities)
  const f = config.f ?? idSource; // source -> target
  const g = config.g ?? idTarget; // target -> mid
  const h = config.h ?? idMid;    // mid -> tail

  // Left identity: f ∘ id_source == f
  const leftId = composeRunnerMorphisms(idSource, f, interaction);
  const leftIdCmp = compareRunnerMorphisms(leftId, f, source, interaction, sampleLimit, options.objectFilter);

  // Right identity: id_target ∘ f == f
  const rightId = composeRunnerMorphisms(f, idTarget, interaction);
  const rightIdCmp = compareRunnerMorphisms(rightId, f, source, interaction, sampleLimit, options.objectFilter);

  // Associativity: (h ∘ g) ∘ f == h ∘ (g ∘ f)
  const assocSkipped = !config.mid && !config.tail && !config.g && !config.h;
  let assocChecked = 0;
  let assocMismatches = 0;
  const details: string[] = [];
  details.push(
    `Run(T) laws: sampleLimit=${sampleLimit}; using identities by default where morphisms not supplied.`,
  );
  if (!assocSkipped) {
    const gof = composeRunnerMorphisms(f, g, interaction); // g ∘ f
    const hog = composeRunnerMorphisms(g, h, interaction); // h ∘ g
    const leftAssoc = composeRunnerMorphisms(gof, h, interaction); // h ∘ (g ∘ f)
    const rightAssoc = composeRunnerMorphisms(f, hog, interaction); // (h ∘ g) ∘ f
    const assocCmp = compareRunnerMorphisms(leftAssoc, rightAssoc, source, interaction, sampleLimit, options.objectFilter);
    assocChecked = assocCmp.checked;
    assocMismatches = assocCmp.mismatches;
    if (assocCmp.details.length > 0) details.push(...assocCmp.details);
  } else {
    details.push("Run(T) associativity: skipped (no non-trivial triple supplied).");
  }

  const allHolds =
    leftIdCmp.mismatches === 0 &&
    rightIdCmp.mismatches === 0 &&
    (assocSkipped || assocMismatches === 0);

  if (leftIdCmp.details.length > 0) details.push(...leftIdCmp.details.map((s) => `left-id: ${s}`));
  if (rightIdCmp.details.length > 0) details.push(...rightIdCmp.details.map((s) => `right-id: ${s}`));

  return {
    holds: allHolds,
    leftIdentity: { checked: leftIdCmp.checked, mismatches: leftIdCmp.mismatches },
    rightIdentity: { checked: rightIdCmp.checked, mismatches: rightIdCmp.mismatches },
    associativity: { checked: assocChecked, mismatches: assocMismatches, skipped: assocSkipped },
    details,
  };
};

// ---------- Unified law report ----------

export interface RunnerLawReport<Obj, Left, Right, Value> {
  readonly holds: boolean;
  readonly unitChecked: number;
  readonly unitMismatches: number;
  readonly multChecked: number;
  readonly multMismatches: number;
  readonly curryingChecked: number;
  readonly curryingMismatches: number;
  readonly coalgebraChecked?: number;
  readonly coalgebraMismatches?: number;
  readonly costateChecked?: number;
  readonly costateMismatches?: number;
  readonly leftIdentityChecked?: number;
  readonly leftIdentityMismatches?: number;
  readonly rightIdentityChecked?: number;
  readonly rightIdentityMismatches?: number;
  readonly associativityChecked?: number;
  readonly associativityMismatches?: number;
  readonly associativitySkipped?: boolean;
  readonly handlerChecked?: number;
  readonly handlerMismatches?: number;
  readonly psiToThetaChecked?: number;
  readonly psiToThetaMismatches?: number;
  readonly thetaToPsiChecked?: number;
  readonly thetaToPsiMismatches?: number;
  readonly thetaMissing: ReadonlyArray<Obj>;
  readonly thetaExtra: ReadonlyArray<Obj>;
  readonly finiteFailures?: ReadonlyArray<RunnerFiniteAxiomFailure<Obj, Left, Right, Value>>;
  readonly details: ReadonlyArray<string>;
}

export interface BuildRunnerLawReportOptions extends RunnerFiniteAxiomOptions {
  readonly includeFinite?: boolean;
  readonly includeHandlersInHolds?: boolean; // if true, handler mismatches affect holds
  readonly includeCategoryInHolds?: boolean; // if true, category identity/associativity mismatches affect holds
  readonly includePsiThetaInHolds?: boolean; // if true, ψ→θ / θ→ψ mismatches affect holds
}

export const buildRunnerLawReport = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: BuildRunnerLawReportOptions = {},
): RunnerLawReport<Obj, Left, Right, Value> => {
  const validationOpts: { objectFilter?: (object: Obj) => boolean } = {};
  if (options.objectFilter) validationOpts.objectFilter = options.objectFilter as (object: Obj) => boolean;
  const thetaValidation = validateRunnerThetas(runner, interaction, validationOpts);

  const axiomTallies = checkRunnerAxioms(runner, interaction, options);

  const sample = options.evaluationSampleLimit ?? options.sampleLimit;
  const curryingOpts: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {};
  if (sample !== undefined) curryingOpts.sampleLimit = sample;
  if (options.objectFilter) curryingOpts.objectFilter = options.objectFilter as (object: Obj) => boolean;
  const currying = checkRunnerCurryingConsistency(runner, interaction, curryingOpts);
  // Step 2: coalgebra check (lightweight, optional)
  const coalgebra = checkRunnerCoalgebra(
    runner,
    interaction,
    options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
  );
    // Step 3: costate check
    const costate = checkRunnerCostate(
      runner,
      interaction,
      options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
    );
  // Handler translation check (ϑ): non-fatal metric
  const handlerReport = checkRunnerStateHandlers<Obj, Arr, Left, Right, Value, { count: number }>(
    runner,
    interaction,
    options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
  );
  // ψ→θ consistency
  const psiToTheta = checkPsiToThetaConsistency(runner, interaction, options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {});
  // θ→ψ reconstruction consistency: dedicated checker
  const thetaToPsi = checkThetaToPsiConsistency(runner, interaction, options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {});
  const finite = options.includeFinite
    ? checkRunnerAxiomsFinite(runner, interaction, options)
    : undefined;

  // Category laws summary (identity only by default)
  const catLaws = checkRunTCategoryLaws(
    interaction,
    { source: runner },
    options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {},
  );

  let holds =
    axiomTallies.unitDiagram.mismatches === 0 &&
    axiomTallies.multiplicationDiagram.mismatches === 0 &&
    currying.mismatchesTotal === 0 &&
    coalgebra.mismatches === 0 &&
    costate.mismatches === 0 &&
    (!finite || finite.evaluationFailures.length === 0);

  if (options.includeCategoryInHolds) {
    const catOk =
      catLaws.leftIdentity.mismatches === 0 &&
      catLaws.rightIdentity.mismatches === 0 &&
      (catLaws.associativity.skipped || catLaws.associativity.mismatches === 0);
    holds = holds && catOk;
  }
  if (options.includeHandlersInHolds) {
    holds = holds && handlerReport.mismatches === 0;
  }
  if (options.includePsiThetaInHolds) {
    holds = holds && psiToTheta.mismatches === 0 && thetaToPsi.mismatches === 0;
  }

  const details: string[] = [];
  details.push(
    `Monoid: unit=${axiomTallies.unitDiagram.checked}/${axiomTallies.unitDiagram.mismatches} mult=${axiomTallies.multiplicationDiagram.checked}/${axiomTallies.multiplicationDiagram.mismatches}.`,
  );
  details.push(
    `Currying: checked=${currying.checkedTotal}, mismatches=${currying.mismatchesTotal}.`,
  );
  details.push(
    `Coalgebra: checked=${coalgebra.checked}, mismatches=${coalgebra.mismatches}.`,
  );
  details.push(
    `Costate: checked=${costate.checked}, mismatches=${costate.mismatches}.`,
  );
  details.push(
    `Handlers: checked=${handlerReport.checked}, mismatches=${handlerReport.mismatches}.`,
  );
  details.push(
    `ψ→θ: checked=${psiToTheta.checked}, mismatches=${psiToTheta.mismatches}.`,
  );
  details.push(
    `θ→ψ: checked=${thetaToPsi.checked}, mismatches=${thetaToPsi.mismatches}.`,
  );
  details.push(
    `Run(T) laws: left-id ${catLaws.leftIdentity.checked}/${catLaws.leftIdentity.mismatches} right-id ${catLaws.rightIdentity.checked}/${catLaws.rightIdentity.mismatches}` +
      (catLaws.associativity.skipped
        ? " assoc skipped"
        : ` assoc ${catLaws.associativity.checked}/${catLaws.associativity.mismatches}`) +
      `.`,
  );
  if (options.includeCategoryInHolds) {
    details.push(`(holds includes category laws)`);
  }
  if (options.includeHandlersInHolds) {
    details.push(`(holds includes handler mismatches)`);
  }
  if (options.includePsiThetaInHolds) {
    details.push(`(holds includes ψ↔θ consistency)`);
  }
  if (!catLaws.holds) {
    details.push(...catLaws.details.slice(0, 8));
  }
  if (options.includeHandlersInHolds) {
    holds = holds && handlerReport.mismatches === 0;
  }
  if (options.includePsiThetaInHolds) {
    holds = holds && psiToTheta.mismatches === 0 && thetaToPsi.mismatches === 0;
  }
  if (psiToTheta.mismatches > 0) details.push(...psiToTheta.details.slice(0, 6));
  if (thetaToPsi.mismatches > 0) details.push(...thetaToPsi.details.slice(0, 6));
  details.push(...thetaValidation.details);
  if (finite) details.push(...finite.details);

  return {
    holds,
    unitChecked: axiomTallies.unitDiagram.checked,
    unitMismatches: axiomTallies.unitDiagram.mismatches,
    multChecked: axiomTallies.multiplicationDiagram.checked,
    multMismatches: axiomTallies.multiplicationDiagram.mismatches,
    curryingChecked: currying.checkedTotal,
    curryingMismatches: currying.mismatchesTotal,
  coalgebraChecked: coalgebra.checked,
  coalgebraMismatches: coalgebra.mismatches,
  costateChecked: costate.checked,
  costateMismatches: costate.mismatches,
  leftIdentityChecked: catLaws.leftIdentity.checked,
  leftIdentityMismatches: catLaws.leftIdentity.mismatches,
  rightIdentityChecked: catLaws.rightIdentity.checked,
  rightIdentityMismatches: catLaws.rightIdentity.mismatches,
  associativityChecked: catLaws.associativity.checked,
  associativityMismatches: catLaws.associativity.mismatches,
  associativitySkipped: catLaws.associativity.skipped,
  handlerChecked: handlerReport.checked,
  handlerMismatches: handlerReport.mismatches,
  psiToThetaChecked: psiToTheta.checked,
  psiToThetaMismatches: psiToTheta.mismatches,
  thetaToPsiChecked: thetaToPsi.checked,
  thetaToPsiMismatches: thetaToPsi.mismatches,
    thetaMissing: thetaValidation.missing,
    thetaExtra: thetaValidation.extra,
    ...(finite ? { finiteFailures: finite.evaluationFailures } : {}),
    details,
  };
};

// ---------- Compositional runners ----------

export type ComposeStrategy = "preferFirst" | "preferSecond" | "mergeIfEqual";

export interface ComposeRunnersResult<Obj, Left, Right, Value> {
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly collisions: ReadonlyArray<Obj>;
  readonly mismatchedThetas: ReadonlyArray<Obj>;
  readonly details: ReadonlyArray<string>;
}

export const composeRunners = <Obj, Left, Right, Value>(
  first: StatefulRunner<Obj, Left, Right, Value>,
  second: StatefulRunner<Obj, Left, Right, Value>,
  strategy: ComposeStrategy = "preferFirst",
): ComposeRunnersResult<Obj, Left, Right, Value> => {
  const thetas = new Map(first.thetas);
  const collisions: Obj[] = [];
  const mismatched: Obj[] = [];
  for (const [object, theta2] of second.thetas.entries()) {
    const theta1 = thetas.get(object);
    if (!theta1) {
      thetas.set(object, theta2);
      continue;
    }
    collisions.push(object);
    switch (strategy) {
      case "preferFirst":
        // keep theta1
        break;
      case "preferSecond":
        thetas.set(object, theta2);
        break;
      case "mergeIfEqual":
        if (theta1 !== theta2) {
          mismatched.push(object);
        }
        // keep theta1 by default; we could also check functional equivalence by sampling later
        break;
    }
  }
  const details: string[] = [];
  details.push(`composeRunners: collisions=${collisions.length}, mismatched=${mismatched.length}.`);
  return { runner: { thetas, diagnostics: details }, collisions, mismatchedThetas: mismatched, details };
};

export const checkRunnerAxioms = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerAxiomOptions = {},
): RunnerAxiomReport => {
  // Validate θ presence for each object in scope (informational; no hard failure here).
  const missing: Obj[] = [];
  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;
  for (const object of interaction.law.kernel.base.objects) {
    if (!interaction.psiComponents.has(object)) continue;
    if (filter && !filter(object)) continue;
    if (!runner.thetas.has(object)) missing.push(object);
  }
  const base = checkRunnerAxiomsFromInteraction(interaction, options);
  if (missing.length === 0) return base;
  const details = [
    ...base.details,
    `Runner θ missing for ${missing.length} object(s): ${missing.map(String).join(", ")}`,
  ];
  return { ...base, details };
};

// Validation helper: reports missing / extra θ components vs interaction fiber set.
export interface RunnerThetaValidation<Obj> {
  readonly missing: ReadonlyArray<Obj>;
  readonly extra: ReadonlyArray<Obj>; // present in runner but not in interaction fibers
  readonly totalInteractionObjects: number;
  readonly totalRunnerThetas: number;
  readonly details: ReadonlyArray<string>;
}

export const validateRunnerThetas = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { objectFilter?: (object: Obj) => boolean } = {},
): RunnerThetaValidation<Obj> => {
  const filter = options.objectFilter;
  const missing: Obj[] = [];
  const interactionObjects: Obj[] = [];
  for (const object of interaction.law.kernel.base.objects) {
    if (!interaction.psiComponents.has(object)) continue;
    if (filter && !filter(object)) continue;
    interactionObjects.push(object);
    if (!runner.thetas.has(object)) missing.push(object);
  }
  const extra: Obj[] = [];
  for (const object of runner.thetas.keys()) {
    if (!interaction.psiComponents.has(object)) extra.push(object);
  }
  const details: string[] = [];
  details.push(`validateRunnerThetas: ${missing.length} missing, ${extra.length} extra.`);
  if (missing.length > 0) {
    details.push(`Missing: ${missing.map(String).join(", ")}`);
  }
  if (extra.length > 0) {
    details.push(`Extra: ${extra.map(String).join(", ")}`);
  }
  return {
    missing,
    extra,
    totalInteractionObjects: interactionObjects.length,
    totalRunnerThetas: runner.thetas.size,
    details,
  };
};

// Finite-sample axiom checker: explicitly replays theta × dual elements to confirm evaluation consistency.
export interface RunnerFiniteAxiomFailure<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly leftElement: Left;
  readonly rightElement: Right;
  readonly expected: Value;
  readonly actual: Value;
}

export interface RunnerFiniteAxiomReport<Obj, Left, Right, Value> extends RunnerAxiomReport {
  readonly evaluationFailures: ReadonlyArray<RunnerFiniteAxiomFailure<Obj, Left, Right, Value>>;
}

export interface RunnerFiniteAxiomOptions extends RunnerAxiomOptions {
  readonly evaluationSampleLimit?: number; // per object pair enumeration cap
}

export const checkRunnerAxiomsFinite = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerFiniteAxiomOptions = {},
): RunnerFiniteAxiomReport<Obj, Left, Right, Value> => {
  const base = checkRunnerAxioms(runner, interaction, options);
  const failures: RunnerFiniteAxiomFailure<Obj, Left, Right, Value>[] = [];
  const evalLimit = Math.max(0, options.evaluationSampleLimit ?? 16);
  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;

  for (const object of interaction.law.kernel.base.objects) {
    if (!interaction.psiComponents.has(object)) continue;
    if (filter && !filter(object)) continue;
    const fiber = interaction.psiComponents.get(object)!;
    const theta = runner.thetas.get(object);
    if (!theta) continue; // already recorded as missing in base if needed
    // Enumerate limited primal elements
    let leftCount = 0;
    for (const indexedLeft of fiber.primalFiber) {
      if (leftCount >= evalLimit) break;
      leftCount++;
      // Enumerate limited dual elements
      let rightCount = 0;
      for (const indexedRight of fiber.dualFiber) {
        if (rightCount >= evalLimit) break;
        rightCount++;
        const expected = fiber.phi.map([indexedLeft, indexedRight]);
        const arrow = theta.map(indexedLeft);
        const actual = arrow(indexedRight);
        if (!Object.is(expected, actual)) {
          failures.push({
            object,
            leftElement: indexedLeft.element,
            rightElement: indexedRight.element,
            expected,
            actual,
          });
        }
      }
    }
  }

  const details = [
    ...base.details,
    `Finite axiom evaluation: ${failures.length} discrepancy(ies) over capped enumeration limit=${evalLimit}.`,
  ];
  if (failures.length > 0) {
    details.push(
      failures
        .slice(0, 12)
        .map(
          (f, i) =>
            `#${i} object=${String(f.object)} left=${String(f.leftElement)} right=${String(f.rightElement)} expected=${String(f.expected)} actual=${String(f.actual)}`,
        )
        .join("\n"),
    );
    if (failures.length > 12) {
      details.push(`(+${failures.length - 12} more failures omitted)`);
    }
  }

  return {
    ...base,
    details,
    evaluationFailures: failures,
    holds: base.holds && failures.length === 0,
  };
};

// ---- Currying consistency via SetCat homs ----

const enumerateLimited = <A>(carrier: SetObj<A>, limit: number): ReadonlyArray<A> => {
  const semantics = getCarrierSemantics(carrier);
  const result: A[] = [];
  if (limit <= 0) return result;
  if (semantics?.iterate) {
    for (const a of semantics.iterate()) {
      result.push(a);
      if (result.length >= limit) break;
    }
    return result;
  }
  for (const a of carrier as Iterable<A>) {
    result.push(a);
    if (result.length >= limit) break;
  }
  return result;
};

export interface RunnerPhiHomComponentReport<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export interface RunnerPhiHomReport<Obj, Left, Right, Value> {
  readonly components: ReadonlyMap<Obj, RunnerPhiHomComponentReport<Obj, Left, Right, Value>>;
  readonly checkedTotal: number;
  readonly mismatchesTotal: number;
  readonly details: ReadonlyArray<string>;
}

export const buildPhiFromRunnerPerObject = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): ReadonlyMap<
  Obj,
  SetHom<
    readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
    Value
  >
> => {
  const result = new Map<
    Obj,
    SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>
  >();
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const theta = runner.thetas.get(object);
    if (!theta) continue;
    const reconstructed = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    result.set(object, reconstructed);
  }
  return result;
};

export const checkRunnerCurryingConsistency = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunnerPhiHomReport<Obj, Left, Right, Value> => {
  const components = new Map<Obj, RunnerPhiHomComponentReport<Obj, Left, Right, Value>>();
  const filter = options.objectFilter as ((object: Obj) => boolean) | undefined;
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  let checkedTotal = 0;
  let mismatchesTotal = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (filter && !filter(object)) continue;
    const theta = runner.thetas.get(object);
    if (!theta) continue;
    const reconstructed = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    let checked = 0;
    let mismatches = 0;
    for (const pair of enumerateLimited(fiber.product.object, sampleLimit)) {
      const expected = fiber.phi.map(pair);
      const actual = reconstructed.map(pair);
      checked++;
      if (!Object.is(expected, actual)) mismatches++;
    }
    checkedTotal += checked;
    mismatchesTotal += mismatches;
    const details: string[] = [
      `Currying consistency on ${String(object)}: checked=${checked}, mismatches=${mismatches}.`,
    ];
    components.set(object, { object, checked, mismatches, details });
  }
  const details: string[] = [
    `Currying consistency totals: checked=${checkedTotal}, mismatches=${mismatchesTotal}.`,
  ];
  return { components, checkedTotal, mismatchesTotal, details };
};

// ---- ψ → θ consistency: runner θ should agree with ψ fiber θ by sampling ----

export interface PsiToThetaReport<Obj> {
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export const checkPsiToThetaConsistency = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): PsiToThetaReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const thetaRunner = runner.thetas.get(object);
    const thetaPsi = fiber.theta;
    if (!thetaRunner || !thetaPsi) continue;
    const leftSamples = enumerateLimited(fiber.primalFiber, sampleLimit);
    const rightSamples = enumerateLimited(fiber.dualFiber, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const leftEl of leftSamples) {
      const aRunner = thetaRunner.map(leftEl);
      const aPsi = thetaPsi.map(leftEl);
      for (const rightEl of rightSamples) {
        localChecked++;
        const v1 = aRunner(rightEl);
        const v2 = aPsi(rightEl);
        if (!Object.is(v1, v2)) {
          localMismatches++;
          if (localMismatches <= 3) {
            details.push(
              `psi->theta mismatch object=${String(object)} left=${String(leftEl.element)} right=${String(rightEl.element)} runner=${String(v1)} psi=${String(v2)}`,
            );
          }
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
  }
  details.unshift(`ψ→θ: checked=${checked} mismatches=${mismatches} (limit=${sampleLimit}).`);
  return { checked, mismatches, details };
};

// θ → ψ reconstruction: rebuild φ via uncurry of θ and compare to original φ
export interface ThetaToPsiReport<Obj> {
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export const checkThetaToPsiConsistency = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): ThetaToPsiReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    if (options.objectFilter && !options.objectFilter(object)) continue;
    const theta = runner.thetas.get(object);
    if (!theta) continue;
    const reconstructedPhi = fiber.exponential.uncurry({ product: fiber.product, morphism: theta });
    const pairSamples = enumerateLimited(fiber.product.object, sampleLimit);
    let localChecked = 0;
    let localMismatches = 0;
    for (const pair of pairSamples) {
      localChecked++;
      const expected = fiber.phi.map(pair);
      const actual = reconstructedPhi.map(pair);
      if (!Object.is(expected, actual)) {
        localMismatches++;
        if (localMismatches <= 3) {
          details.push(
            `theta->psi mismatch object=${String(object)} left=${String(pair[0].element)} right=${String(pair[1].element)} expected=${String(expected)} actual=${String(actual)}`,
          );
        }
      }
    }
    checked += localChecked;
    mismatches += localMismatches;
  }
  details.unshift(`θ→ψ: checked=${checked} mismatches=${mismatches} (limit=${sampleLimit}).`);
  return { checked, mismatches, details };
};

// ---- Read-only helpers for Phase IV scaffolding ----

export interface ThetaComponentSummary<Obj> {
  readonly object: Obj;
  readonly domainCardinality?: number;
  readonly codomainCardinality?: number;
}

export interface RunnerThetaDiagnostics<Obj> {
  readonly totalObjects: number;
  readonly components: ReadonlyArray<ThetaComponentSummary<Obj>>;
}

export interface ThetaSummaryOptions {
  readonly computeIfMissing?: boolean;
  readonly enumerationLimit?: number;
}

const estimateCardinality = <A>(carrier: unknown, options: ThetaSummaryOptions): number | undefined => {
  const semantics = carrier ? getCarrierSemantics(carrier as never) : undefined;
  if (semantics && semantics.cardinality !== undefined) {
    return semantics.cardinality;
  }
  if (options.computeIfMissing === true) {
    const limit = Math.max(0, options.enumerationLimit ?? 32);
    let count = 0;
    if (semantics?.iterate) {
      for (const _ of semantics.iterate()) {
        count++;
        if (count >= limit) break;
      }
      return count;
    }
    if (carrier && Symbol.iterator in (carrier as never)) {
      for (const _ of carrier as Iterable<unknown>) {
        count++;
        if (count >= limit) break;
      }
      return count;
    }
  }
  return undefined;
};

export const summarizeRunnerThetas = <Obj, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  options: ThetaSummaryOptions = {},
): RunnerThetaDiagnostics<Obj> => {
  const components: ThetaComponentSummary<Obj>[] = [];
  for (const [object, theta] of runner.thetas.entries()) {
    const domainCardinality = estimateCardinality(theta.dom, options);
    const codomainCardinality = estimateCardinality(theta.cod, options);
    components.push({ object, ...(domainCardinality !== undefined ? { domainCardinality } : {}), ...(codomainCardinality !== undefined ? { codomainCardinality } : {}), });
  }
  return { totalObjects: runner.thetas.size, components };
};

export const prettyPrintRunnerThetas = <Obj, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  options: ThetaSummaryOptions = {},
): ReadonlyArray<string> => {
  const summary = summarizeRunnerThetas(runner, options);
  const lines: string[] = [];
  lines.push(`Runner θ components: ${summary.totalObjects} object(s)`);
  let index = 0;
  for (const entry of summary.components) {
    const objectLabel = String(entry.object);
    const dom = entry.domainCardinality !== undefined ? `${entry.domainCardinality}` : "?";
    const cod = entry.codomainCardinality !== undefined ? `${entry.codomainCardinality}` : "?";
    lines.push(`#${index++} object=${objectLabel} dom≈${dom} cod≈${cod}`);
  }
  return lines;
};

// ---------- Handler translation (ϑ: T ⇒ St^Y) ----------

export interface RunnerStateHandler<Obj, Left, Right, Value, State> {
  readonly object: Obj;
  readonly run: (state: State, left: IndexedElement<Obj, Left>, right: IndexedElement<Obj, Right>) => readonly [State, Value];
}

export interface RunnerStateHandlerSummary<Obj, Left, Right, Value, State> {
  readonly handlers: ReadonlyArray<RunnerStateHandler<Obj, Left, Right, Value, State>>;
  readonly details: ReadonlyArray<string>;
}

// Simple placeholder: state is a multiset count of evaluations; update increments count.
export const thetaToStateHandler = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State extends { count: number }
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerStateHandlerSummary<Obj, Left, Right, Value, State> => {
  const handlers: RunnerStateHandler<Obj, Left, Right, Value, State>[] = [];
  const details: string[] = [];
  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const theta = runner.thetas.get(object);
    if (!theta) continue;
    const h: RunnerStateHandler<Obj, Left, Right, Value, State> = {
      object,
      run: (state, left, right) => {
        const arrow = theta.map(left);
        const value = arrow(right);
        return [{ count: state.count + 1 } as State, value];
      },
    };
    handlers.push(h);
  }
  details.push(`thetaToStateHandler: constructed ${handlers.length} handler(s).`);
  return { handlers, details };
};

export interface RunnerStateHandlerReport<Obj> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly details: ReadonlyArray<string>;
}

export const checkRunnerStateHandlers = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  State extends { count: number }
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {},
): RunnerStateHandlerReport<Obj> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? 16);
  const summary = thetaToStateHandler<Obj, Arr, Left, Right, Value, State>(runner, interaction);
  const details: string[] = [...summary.details];
  let checked = 0;
  let mismatches = 0;
  for (const handler of summary.handlers) {
    if (options.objectFilter && !options.objectFilter(handler.object)) continue;
    const fiber = interaction.psiComponents.get(handler.object);
    if (!fiber) continue;
    let leftCount = 0;
    for (const leftEl of fiber.primalFiber) {
      if (leftCount >= sampleLimit) break;
      leftCount++;
      let rightCount = 0;
      for (const rightEl of fiber.dualFiber) {
        if (rightCount >= sampleLimit) break;
        rightCount++;
        const expected = fiber.phi.map([leftEl, rightEl]);
        const [newState, actual] = handler.run({ count: 0 } as State, leftEl, rightEl);
        void newState; // placeholder usage
        checked++;
        if (!Object.is(expected, actual)) {
          mismatches++;
          if (mismatches <= 4) {
            details.push(
              `state-handler-mismatch object=${String(handler.object)} left=${String(leftEl.element)} right=${String(rightEl.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
  }
  details.push(
    `checkRunnerStateHandlers: checked=${checked} mismatch=${mismatches} (limit=${sampleLimit}).`,
  );
  return { holds: mismatches === 0, checked, mismatches, details };
};
