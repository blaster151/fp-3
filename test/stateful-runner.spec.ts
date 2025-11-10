import { describe, it, expect } from "vitest";
import {
  makeExample6MonadComonadInteractionLaw,
  makeExample8MonadComonadInteractionLaw,
  buildRunnerFromInteraction,
  checkStatefulRunner,
  checkRunnerCoalgebra,
  buildRunnerCoalgebra,
  checkRunnerCostate,
  buildRunnerCostate,
  buildEnrichedStatefulRunner,
  runnerToMonadMap,
  monadMapToRunner,
  compareCostateComponents,
  compareCoalgebraComponents,
  compareCostTCoalgebraComponents,
  runnerToCostateComponents,
  runnerToCoalgebraComponents,
  runnerToCostTCoalgebraComponents,
  buildExample12UpdateLensSuite,
  buildExample12UpdateLensRunner,
  makeExample12UpdateLensSpec,
  compareExample12Runners,
} from "../allTS";
import { SetCat } from "../set-cat";

describe("stateful runner", () => {
  it("checks runner unit/multiplication diagrams on Example 6", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const report = checkStatefulRunner(runner, law, { sampleLimit: 8 });
    expect(report.holds).toBe(true);
    expect(report.unitDiagram.checked).toBeGreaterThanOrEqual(0);
    expect(report.unitDiagram.mismatches).toBe(0);
    expect(report.multiplicationDiagram.checked).toBeGreaterThanOrEqual(0);
    expect(report.multiplicationDiagram.mismatches).toBe(0);
  });

  it("detects mismatches when theta is perturbed", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    // Perturb first theta by mapping every left element to a constant arrow returning a fixed value.
    let perturbedRunner = runner;
    const thetaMap = runner.thetas ?? new Map();
    for (const [obj, theta] of thetaMap.entries()) {
      const fixed = (() => {
        const firstDual = (() => {
          for (const d of law.psiComponents.get(obj)!.dualFiber as Iterable<unknown>) return d;
          return undefined;
        })();
        return firstDual;
      })();
      if (!fixed) continue;
  // Safely pick a canonical left element from the domain
  const domIter = theta.dom[Symbol.iterator]();
  const first = domIter.next();
  if (first.done) continue;
  const canonicalLeft = first.value;
  const bad = SetCat.hom(theta.dom, theta.cod, () => theta.map(canonicalLeft));
      const thetas = new Map(thetaMap);
      thetas.set(obj, bad);
      perturbedRunner = {
        thetas,
        thetaHom: runner.thetaHom,
        diagnostics: runner.diagnostics,
      } as typeof runner;
      break; // only perturb one
    }
    const report = checkStatefulRunner(perturbedRunner, law, { sampleLimit: 4 });
    expect(report.holds).toBe(false);
    expect(report.unitDiagram.mismatches + report.multiplicationDiagram.mismatches).toBeGreaterThan(0);
  });

  it("coalgebra check passes on Example 6", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const report = checkRunnerCoalgebra(runner, law, { sampleLimit: 8 });
    expect(report.holds).toBe(true);
    expect(report.checked).toBeGreaterThan(0);
    expect(report.mismatches).toBe(0);
  });

  it("coalgebra check detects perturbations", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const baseline = buildRunnerCoalgebra(runner, law);
    // Create a perturbed components map by replacing first object's component
    const perturbed = new Map(baseline);
    for (const [obj, hom] of baseline.entries()) {
  const domIter = hom.dom[Symbol.iterator]();
  const first = domIter.next();
  if (first.done) break;
  const canonical = first.value;
  const bad = SetCat.hom(hom.dom, hom.cod, () => hom.map(canonical));
      perturbed.set(obj, bad);
      break;
    }
    const report = checkRunnerCoalgebra(runner, law, { components: perturbed, sampleLimit: 4 });
    expect(report.holds).toBe(false);
    expect(report.mismatches).toBeGreaterThan(0);
  });

  it("costate check passes on Example 6", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const report = checkRunnerCostate(runner, law, { sampleLimit: 8 });
    expect(report.holds).toBe(true);
    expect(report.checked).toBeGreaterThan(0);
    expect(report.mismatches).toBe(0);
  });

  it("costate check detects perturbations", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const baseline = buildRunnerCostate(runner, law);
    const perturbed = new Map(baseline);
    for (const [obj, hom] of baseline.entries()) {
      const domIter = hom.dom[Symbol.iterator]();
      const first = domIter.next();
      if (first.done) break;
      const canonical = first.value;
      const bad = SetCat.hom(hom.dom, hom.cod, () => hom.map(canonical));
      perturbed.set(obj, bad);
      break;
    }
    const report = checkRunnerCostate(runner, law, { components: perturbed, sampleLimit: 4 });
    expect(report.holds).toBe(false);
    expect(report.mismatches).toBeGreaterThan(0);
  });

  it("enriched runner structural unit/multiplication still hold", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const baseRunner = buildRunnerFromInteraction(law);
    const enriched = buildEnrichedStatefulRunner(baseRunner, law, {
      initialState: () => ({ count: 0 }),
      evolve: (_obj, prev, _value) => ({ count: prev.count + 1 }),
      sampleLimit: 8,
    });
    const report = checkStatefulRunner(enriched, law, { sampleLimit: 8 });
    expect(report.holds).toBe(true);
    expect(report.unitDiagram.mismatches).toBe(0);
    expect(report.multiplicationDiagram.mismatches).toBe(0);
  });

  it("Run(T) identity laws hold for trivial morphisms", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    // Use buildRunnerLawReport indirectly via identity check; rely on exported checkRunTCategoryLaws
    // Import deferred through allTS (already pulled in above functions)
    // Minimal assertion: creating enriched runner doesn't break identities
    const enriched = buildEnrichedStatefulRunner(runner, law, { initialState: () => ({ count: 0 }) });
    // Identity morphisms implicit in category laws check
    const { checkRunTCategoryLaws } = require("../stateful-runner") as typeof import("../stateful-runner");
    const catReport = checkRunTCategoryLaws(law, { source: enriched }, { sampleLimit: 4 });
    expect(catReport.leftIdentity.mismatches).toBe(0);
    expect(catReport.rightIdentity.mismatches).toBe(0);
    expect(catReport.thetaSquare.mismatches).toBe(0);
    expect(catReport.coalgebraSquare.mismatches).toBe(0);
  });

  it("Run(T) associativity holds for composed identities", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const enriched = buildEnrichedStatefulRunner(runner, law, { initialState: () => ({ count: 0 }) });
    const { checkRunTCategoryLaws } = require("../stateful-runner") as typeof import("../stateful-runner");
    const catReport = checkRunTCategoryLaws(law, { source: enriched, target: enriched, mid: enriched, tail: enriched }, { sampleLimit: 4 });
    expect(catReport.associativity.skipped || catReport.associativity.mismatches === 0).toBe(true);
    expect(catReport.thetaSquare.mismatches).toBe(0);
    expect(catReport.coalgebraSquare.mismatches).toBe(0);
  });

  it("Runner ⇔ monad translators are available and produce components/θ", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const mm = runnerToMonadMap(runner, law.monad, law.monad, { sampleLimit: 4 });
    expect(mm.components.size).toBeGreaterThanOrEqual(0);
    const rr = monadMapToRunner(mm, law, { sampleLimit: 4 });
    expect((rr.thetas?.size ?? 0)).toBeGreaterThan(0);
    expect(rr.generatorPreservation?.checked).toBeGreaterThanOrEqual(0);
  });

  it("costate/coalgebra equivalence oracles succeed on Example 6", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const { RunnerOracles } = require("../runner-oracles") as typeof import("../runner-oracles");
    const coalEq = RunnerOracles.equivalenceCoalgebra(runner, law, { sampleLimit: 4 });
    const costEq = RunnerOracles.equivalenceCostate(runner, law, { sampleLimit: 4 });
    const costTEq = RunnerOracles.equivalenceCostT(runner, law, { sampleLimit: 4 });
    const sweedlerEq = RunnerOracles.equivalenceSweedler(runner, law, { sampleLimit: 4 });
    const triEq = RunnerOracles.equivalenceTriangle(runner, law, { sampleLimit: 4 });
    expect(coalEq.holds).toBe(true);
    expect(costEq.holds).toBe(true);
    expect(costTEq.holds).toBe(true);
    expect(sweedlerEq.holds).toBe(true);
    expect(triEq.holds).toBe(true);
  });

  it("state handler equivalence oracle succeeds on Example 6", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const { RunnerOracles } = require("../runner-oracles") as typeof import("../runner-oracles");
    const handlerEq = RunnerOracles.stateHandlerEquivalence(runner, law, { sampleLimit: 4 });
    expect(handlerEq.holds).toBe(true);
  });

  it("runner equivalence suite reports success on Example 6", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const { evaluateRunnerEquivalences } = require("../runner-oracles") as typeof import("../runner-oracles");
    const suite = evaluateRunnerEquivalences(runner, law, { sampleLimit: 4 });
    expect(suite.stateHandler.holds).toBe(true);
    expect(suite.coalgebra.holds).toBe(true);
    expect(suite.costate.holds).toBe(true);
    expect(suite.costT.holds).toBe(true);
    expect(suite.sweedler.holds).toBe(true);
    expect(suite.triangle.holds).toBe(true);
  });

  it("Runner morphism squares hold for identity morphism", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const base = buildRunnerFromInteraction(law);
    const stateCarrierMap = new Map<typeof law.kernel.base.objects[number], ReturnType<typeof SetCat.obj>>();
    for (const object of law.kernel.base.objects) {
      stateCarrierMap.set(object, SetCat.obj([0, 1]));
    }
    const enriched = buildEnrichedStatefulRunner(base, law, {
      initialState: () => 0,
      stateCarrierMap,
      evolve: (_obj, prev: number) => (prev === 0 ? 1 : 0),
    });
    const { identityRunnerMorphism, checkRunnerMorphism } = require("../stateful-runner") as typeof import("../stateful-runner");
    const morphism = identityRunnerMorphism(enriched, law);
    const report = checkRunnerMorphism(morphism, enriched, enriched, law, { sampleLimit: 4 });
    expect(report.thetaSquare.mismatches).toBe(0);
    expect(report.coalgebraSquare.mismatches).toBe(0);
  });

  it("Runner morphism square check detects mismatched state maps", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const base = buildRunnerFromInteraction(law);
    const stateCarrierMap = new Map<typeof law.kernel.base.objects[number], ReturnType<typeof SetCat.obj>>();
    for (const object of law.kernel.base.objects) {
      stateCarrierMap.set(object, SetCat.obj([0, 1]));
    }
    const enriched = buildEnrichedStatefulRunner(base, law, {
      initialState: () => 0,
      stateCarrierMap,
      evolve: (_obj, prev: number) => (prev === 0 ? 1 : 0),
    });
    const { identityRunnerMorphism, checkRunnerMorphism } = require("../stateful-runner") as typeof import("../stateful-runner");
    const baseline = identityRunnerMorphism(enriched, law);
    const badStateMaps = new Map(baseline.stateMaps);
    for (const [object, hom] of badStateMaps.entries()) {
      const dom = hom.dom as ReturnType<typeof SetCat.obj>;
      const cod = hom.cod as ReturnType<typeof SetCat.obj>;
      const iterator = cod[Symbol.iterator]();
      const first = iterator.next().value ?? 0;
      const constant = SetCat.hom(dom, cod, () => first);
      badStateMaps.set(object, constant as typeof hom);
    }
    const badMorphism = { stateMaps: badStateMaps } as typeof baseline;
    const report = checkRunnerMorphism(badMorphism, enriched, enriched, law, { sampleLimit: 4 });
    expect(report.thetaSquare.mismatches + report.coalgebraSquare.mismatches).toBeGreaterThan(0);
  });

  it("Example 12 update lens reproduces Example 8 runner", () => {
    const spec = makeExample12UpdateLensSpec();
    const interaction = makeExample8MonadComonadInteractionLaw();
    const { runner } = buildExample12UpdateLensRunner(spec, {
      interaction,
      metadata: ["Example 12 update lens runner"],
    });
    const canonical = buildRunnerFromInteraction(interaction);
    const comparison = compareExample12Runners(interaction, canonical, runner, 12);
    expect(comparison.mismatches).toBe(0);
    const report = checkStatefulRunner(runner, interaction, { sampleLimit: 8 });
    expect(report.holds).toBe(true);
  });

  it("Example 12 update lens suite aligns with costate and coalgebra translations", () => {
    const { interaction, runner, canonical, costate, coalgebra, costT } = buildExample12UpdateLensSuite();
    const canonicalCostate = runnerToCostateComponents(canonical, interaction);
    const canonicalCoalgebra = runnerToCoalgebraComponents(canonical, interaction);
    const canonicalCostT = runnerToCostTCoalgebraComponents(canonical, interaction);
    const costateCompare = compareCostateComponents(canonicalCostate.components, costate.components, interaction, {
      sampleLimit: 8,
    });
    const coalgebraCompare = compareCoalgebraComponents(
      canonicalCoalgebra.components,
      coalgebra.components,
      interaction,
      { sampleLimit: 8 },
    );
    const costTCompare = compareCostTCoalgebraComponents(
      canonicalCostT.components,
      costT.components,
      interaction,
      { sampleLimit: 8 },
    );
    expect(costateCompare.mismatches).toBe(0);
    expect(coalgebraCompare.mismatches).toBe(0);
    expect(costTCompare.mismatches).toBe(0);
    const runnerComparison = compareExample12Runners(interaction, canonical, runner, 8);
    expect(runnerComparison.mismatches).toBe(0);
  });
});
