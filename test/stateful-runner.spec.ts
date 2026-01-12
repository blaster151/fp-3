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
  analyzeResidualHandlerCoverage,
  attachResidualHandlers,
  makeResidualInteractionLaw,
  summarizeResidualHandlers,
  makeSupervisedStack,
  stackToRunner,
  runnerToStack,
  replaySupervisedStackRoundTrip,
  getSupervisedStackLambdaCoopCoverageFromMetadata,
  compareSupervisedStackRoundTripCoverage,
  summarizeRunnerOracles,
  type ResidualHandlerSpec,
  type KernelMonadSpec,
  type UserMonadSpec,
  buildLambdaCoopComparisonArtifacts,
  analyzeSupervisedStackLambdaCoopAlignment,
  analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge,
  evaluateSupervisedStackWithLambdaCoop,
  collectLambdaCoopAlignmentCoverageIssues,
} from "../allTS";
import { makeGlueingInteractionLawExampleSuite } from "../functor-interaction-law";
import { bridgeGlueingSummaryToResidualRunner } from "../glueing-runner-bridge";
import {
  buildGlueingExampleKernelSpec as buildExampleKernelSpec,
  buildGlueingExampleUserSpec as buildExampleUserSpec,
  makeGlueingSupervisedStackExampleSuite,
} from "../glueing-supervised-stack.examples";
import { makeGlueingSupervisedStack } from "../glueing-supervised-stack";
import { SetCat, type SetObj } from "../set-cat";
import type { LambdaCoopClauseBundle } from "../supervised-stack-lambda-coop";

const UNIT_TYPE = { kind: "unit" } as const;
const ENV_TYPE = { kind: "base", name: "Env" } as const;
const ERROR_PAYLOAD_TYPE = { kind: "base", name: "ErrorPayload" } as const;
const ALARM_PAYLOAD_TYPE = { kind: "base", name: "AlarmPayload" } as const;
const UNIT_VALUE_WITNESS = { kind: "unitValue" } as const;
const ENV_WITNESS = { kind: "constant", label: "Env#0" } as const;
const ERROR_PAYLOAD_WITNESS = { kind: "constant", label: "ErrorPayload#0" } as const;

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

  it("summarizes runner oracle results", () => {
    const summary = summarizeRunnerOracles([
      { registryPath: "runner.axioms", holds: true, details: [] },
      { registryPath: "runner.costate", holds: false, details: ["failure"] },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.uniqueRegistryPaths).toEqual(["runner.axioms", "runner.costate"]);
    expect(summary.failing).toEqual([
      { registryPath: "runner.costate", details: ["failure"] },
    ]);
    expect(summary.notes.some((note) => note.includes("1/2 failing"))).toBe(true);
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
    const kernelObjects = law.law.kernel.base.objects;
    const stateCarrierMap = new Map<(typeof kernelObjects)[number], SetObj<number>>();
    for (const object of kernelObjects) {
      stateCarrierMap.set(object, SetCat.obj([0, 1]));
    }
    const enriched = buildEnrichedStatefulRunner(base, law, {
      initialState: () => 0,
      stateCarrierMap: stateCarrierMap as ReadonlyMap<(typeof kernelObjects)[number], SetObj<number>>,
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
    const kernelObjects = law.law.kernel.base.objects;
    const stateCarrierMap = new Map<(typeof kernelObjects)[number], SetObj<number>>();
    for (const object of kernelObjects) {
      stateCarrierMap.set(object, SetCat.obj([0, 1]));
    }
    const enriched = buildEnrichedStatefulRunner(base, law, {
      initialState: () => 0,
      stateCarrierMap: stateCarrierMap as ReadonlyMap<(typeof kernelObjects)[number], SetObj<number>>,
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

  it("residual handler coverage reports full support", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const kernelObjects = law.law.kernel.base.objects;
    const specs = new Map<
      (typeof kernelObjects)[number],
      ResidualHandlerSpec<(typeof kernelObjects)[number], unknown, unknown>
    >();
    for (const object of kernelObjects) {
      specs.set(object, {
        description: "identity residual coverage",
        predicate: () => true,
      });
    }
    const annotated = attachResidualHandlers(
      runner as unknown as Parameters<typeof attachResidualHandlers>[0],
      law as unknown as Parameters<typeof attachResidualHandlers>[1],
      specs as unknown as Parameters<typeof attachResidualHandlers>[2],
      { sampleLimit: 6 },
    );
    const summary = annotated.residualHandlers;
    expect(summary).toBeDefined();
    const totalUnhandled =
      summary?.reports.reduce((acc, report) => acc + report.unhandledSamples, 0) ?? 0;
    expect(totalUnhandled).toBe(0);
    expect(annotated.diagnostics.some((line: string) => line.includes("unhandled=0"))).toBe(true);
  });

  it("residual handler coverage highlights missing support when unspecified", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const summary = analyzeResidualHandlerCoverage(runner, law, new Map(), {
      sampleLimit: 6,
    });
    expect(summary.reports.length).toBeGreaterThan(0);
    expect(summary.reports.some((report) => report.unhandledSamples > 0)).toBe(true);
    expect(summary.diagnostics.some((line) => line.includes("note=no specification"))).toBe(true);
  });

  it("summarizes residual handler aggregates for metadata", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const summary = analyzeResidualHandlerCoverage(runner, law, new Map(), {
      sampleLimit: 5,
    });
    const aggregate = summarizeResidualHandlers(summary);
    expect(aggregate.reports).toBe(summary.reports.length);
    expect(aggregate.handledSamples + aggregate.unhandledSamples).toBeGreaterThanOrEqual(0);
    expect(aggregate.configuredSampleLimit).toBe(summary.sampleLimit);
    expect(aggregate.notes.length).toBeGreaterThan(0);
  });

  it("makeResidualInteractionLaw surfaces TODO diagnostics", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const residualSummary = makeResidualInteractionLaw(
      law as unknown as Parameters<typeof makeResidualInteractionLaw>[0],
      { residualMonadName: "Maybe" },
    );
    expect(residualSummary.diagnostics.some((line) => line.includes("TODO"))).toBe(true);
  });

  describe("Supervised kernel/user stack scaffold", () => {
    it("constructs the supervised stack example once builders are implemented", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec = buildExampleUserSpec<Obj>({
        boundaryDescription: "Comparison morphism TBD",
      });
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4, includeResidualAnalysis: true },
      );
      expect(stack.kernel.monad?.operations.map((op) => op.name)).toContain("getenv");
      expect(stack.kernel.monad?.initialState).toEqual({ env: "init" });
      expect(
        stack.kernel.diagnostics.some((line) => line.includes("assembling operation semantics")),
      ).toBe(true);
      expect(
        stack.kernel.diagnostics.some((line) =>
          line.includes("Kernel operation handlers provided for: getenv"),
        ),
      ).toBe(true);
      expect(stack.user.diagnostics.some((line) => line.includes("User boundary expectations"))).toBe(true);
      expect(stack.user.diagnostics.some((line) => line.includes("Comparison:"))).toBe(true);

      const getenv = stack.kernel.monad?.operations.find((op) => op.name === "getenv");
      expect(getenv).toBeDefined();
      const sampleState = { env: "sample" };
      const getenvResult = getenv?.execute(sampleState, undefined);
      expect(getenvResult).toBeDefined();
      if (!getenvResult || getenvResult.kind !== "return") {
        throw new Error("expected return result");
      }
      expect(getenvResult.state).toEqual(sampleState);
      expect(getenvResult.value).toEqual(sampleState);
      expect(getenvResult.diagnostics?.some((line) => line.includes("Handler executed"))).toBe(true);

      const raise = stack.kernel.monad?.operations.find((op) => op.name === "raise");
      expect(raise).toBeDefined();
      const raiseResult = raise?.execute(sampleState, "boom");
      expect(raiseResult).toBeDefined();
      if (!raiseResult || raiseResult.kind !== "raise") {
        throw new Error("expected raise result");
      }
      expect(raiseResult.payload).toBe("boom");
      expect(raiseResult.diagnostics?.some((line) => line.includes("Default exception"))).toBe(true);

      expect(stack.residualSummary).toBeDefined();
      expect(stack.residualSummary?.reports.every((report) => report.unhandledSamples === 0)).toBe(
        true,
      );
      expect(stack.user.monad?.allowedKernelOperations.has("getenv")).toBe(true);
      const invoked = stack.user.monad?.invoke("getenv", sampleState, null);
      expect(invoked).toBeDefined();
      if (!invoked || invoked.kind !== "return") {
        throw new Error("expected delegated return result");
      }
      expect(invoked.state).toEqual(sampleState);
      expect(invoked.value).toEqual(sampleState);
      expect(invoked.diagnostics?.[0]).toContain('delegated to kernel operation "getenv"');

      expect(stack.comparison.userToKernel.has("getenv")).toBe(true);
      expect(stack.comparison.unsupportedByKernel.length).toBe(0);
      expect(stack.comparison.unacknowledgedByUser).toEqual(["raise"]);
      expect(stack.comparison.diagnostics.length).toBeGreaterThan(0);
      expect(stack.runner.stateCarriers?.size).toBeGreaterThan(0);
      expect(stack.runner.metadata?.some((entry) => entry.startsWith("supervised-stack.kernel"))).toBe(
        true,
      );
      expect(stack.lambdaCoopComparison?.kernelClauses).toEqual([
        { name: "getenv", kind: "state" },
        { name: "raise", kind: "exception" },
      ]);
      expect(stack.lambdaCoopComparison?.clauseBundles?.map((bundle) => bundle.operation)).toEqual([
        "getenv",
        "raise",
      ]);
      expect(
        stack.lambdaCoopComparison?.clauseBundles?.every(
          (bundle) => bundle.stateCarrier === "ExampleKernel",
        ),
      ).toBe(true);
      expect(stack.lambdaCoopComparison?.runnerLiteral?.clauses.length).toBe(2);
      expect(stack.lambdaCoopComparison?.stateCarrier).toBe("ExampleKernel");
      expect(stack.lambdaCoopComparison?.residualCoverage?.sampleLimit).toBeGreaterThan(0);
      expect(stack.lambdaCoopComparison?.aligned).toBe(false);
      expect(stack.lambdaCoopComparison?.issues).toContain(
        "λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (raise).",
      );
      expect(
        stack.lambdaCoopComparison?.metadata.some((entry) =>
          entry.startsWith("λ₍coop₎.stateCarrier=ExampleKernel"),
        ),
      ).toBe(true);
      expect(stack.lambdaCoopComparison?.metadata).toContain(
        'λ₍coop₎.interpreter.expectedOperations=["getenv"]',
      );
      expect(
        stack.lambdaCoopComparison?.metadata.some((entry) =>
          entry.startsWith("λ₍coop₎.boundary={"),
        ),
      ).toBe(true);
      expect(
        stack.lambdaCoopComparison?.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.interpreter.note[0]=status:'),
        ),
      ).toBe(true);
      expect(
        stack.lambdaCoopComparison?.metadata.some((entry) =>
          entry.startsWith("λ₍coop₎ boundary supported="),
        ),
      ).toBe(true);
      expect(
        stack.lambdaCoopComparison?.metadata.some((entry) =>
          entry.includes('λ₍coop₎.clause[0].parameterType={"kind":"unit"}'),
        ),
      ).toBe(true);
      expect(
        stack.lambdaCoopComparison?.metadata,
      ).toContain('λ₍coop₎.clause[0].resultType={"kind":"base","name":"Env"}');
      expect(
        stack.lambdaCoopComparison?.metadata,
      ).toContain('λ₍coop₎.clause[0].argumentWitness={"kind":"unitValue"}');
      expect(
        stack.lambdaCoopComparison?.metadata,
      ).toContain('λ₍coop₎.clause[0].resultWitness={"kind":"constant","label":"Env#0"}');
      expect(
        stack.lambdaCoopComparison?.metadata,
      ).toContain('λ₍coop₎.clause[1].parameterType={"kind":"base","name":"ErrorPayload"}');
      expect(
        stack.lambdaCoopComparison?.metadata,
      ).toContain('λ₍coop₎.clause[1].argumentWitness={"kind":"constant","label":"ErrorPayload#0"}');
      expect(stack.lambdaCoopComparison?.boundaryWitnesses).toEqual({
        kernel: ["getenv", "raise"],
        user: ["getenv"],
        supported: ["getenv"],
        unsupported: [],
        unacknowledged: ["raise"],
      });
      const getenvClause = stack.lambdaCoopComparison?.clauseBundles?.find(
        (bundle) => bundle.operation === "getenv",
      );
      expect(getenvClause?.resultKind).toBe("return");
      expect(getenvClause?.argumentType).toEqual(UNIT_TYPE);
      expect(getenvClause?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(getenvClause?.resultValueType).toEqual(ENV_TYPE);
      expect(getenvClause?.resultWitness).toEqual(ENV_WITNESS);
      expect(getenvClause?.clause.parameter).toBe("_");
      expect(getenvClause?.residual?.notes.length).toBeGreaterThan(0);
      const raiseClause = stack.lambdaCoopComparison?.clauseBundles?.find(
        (bundle) => bundle.operation === "raise",
      );
      expect(raiseClause?.argumentType).toEqual(ERROR_PAYLOAD_TYPE);
      expect(raiseClause?.argumentWitness).toEqual(ERROR_PAYLOAD_WITNESS);
      expect(raiseClause?.resultValueType).toBeUndefined();
      expect(raiseClause?.resultWitness).toBeUndefined();
      expect(raiseClause?.residual).toBeUndefined();

      const runner = stackToRunner(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      expect(runner.residualHandlers?.reports.length).toBeGreaterThan(0);
      expect(runner.metadata?.some((entry) => entry.startsWith("supervised-stack.kernel"))).toBe(true);
      expect(
        runner.metadata?.some((entry) =>
          entry.startsWith("supervised-stack.lambdaCoop.runnerLiteral"),
        ),
      ).toBe(true);
      expect(
        runner.metadata?.some((entry) =>
          entry.startsWith("supervised-stack.lambdaCoop.clauseBundles"),
        ),
      ).toBe(true);
      expect(
        runner.metadata?.some((entry) =>
          entry.startsWith("supervised-stack.lambdaCoop.residualCoverage"),
        ),
      ).toBe(true);
      expect(
        runner.metadata?.some((entry) =>
          entry.startsWith("supervised-stack.lambdaCoop.boundary"),
        ),
      ).toBe(true);
      expect(
        runner.metadata?.some((entry) =>
          entry.startsWith("supervised-stack.lambdaCoop.expectedOperations"),
        ),
      ).toBe(true);
      expect(
        runner.metadata?.some((entry) =>
          entry.startsWith("supervised-stack.lambdaCoop.coverage"),
        ),
      ).toBe(true);
      const coverageFromMetadata = getSupervisedStackLambdaCoopCoverageFromMetadata(
        runner.metadata,
      );
      expect(coverageFromMetadata).toBeDefined();
      expect(coverageFromMetadata?.operationSummary.total).toBeGreaterThan(0);
      expect(coverageFromMetadata?.operations.map((link) => link.operation)).toContain(
        "getenv",
      );

      const back = runnerToStack(runner as any, law as unknown as any);
      expect(back.kernel?.name).toBe("ExampleKernel");
      const roundTripOperations = back.kernel?.operations ?? [];
      expect(roundTripOperations.map(({ name, kind }) => ({ name, kind }))).toEqual([
        { name: "getenv", kind: "state" },
        { name: "raise", kind: "exception" },
      ]);
      expect(back.user?.name).toBe("ExampleUser");
      expect(back.user?.allowedOperations).toEqual(["getenv"]);
      expect(back.comparison.unsupportedByKernel).toEqual([]);
      expect(back.comparison.unacknowledgedByUser).toEqual(["raise"]);
      expect(
        back.comparison.notes.some((note) => note.includes("recovered 2 clause bundles")),
      ).toBe(true);
      expect(back.residualSummary?.reports.length).toBeGreaterThan(0);
      expect(back.diagnostics.length).toBeGreaterThan(0);
      expect(back.diagnostics.some((line) => line.includes("kernel operations detected=2"))).toBe(true);
      expect(back.kernel?.stateCarrier).toBe("ExampleKernel");
      expect(back.lambdaCoop?.kernelClauses).toEqual([
        { name: "getenv", kind: "state" },
        { name: "raise", kind: "exception" },
      ]);
      expect(back.lambdaCoop?.clauseBundles?.map((bundle) => bundle.operation)).toEqual([
        "getenv",
        "raise",
      ]);
      const backGetenv = back.lambdaCoop?.clauseBundles?.find(
        (bundle) => bundle.operation === "getenv",
      );
      expect(backGetenv?.argumentType).toEqual(UNIT_TYPE);
      expect(backGetenv?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(backGetenv?.resultValueType).toEqual(ENV_TYPE);
      expect(backGetenv?.resultWitness).toEqual(ENV_WITNESS);
      const backRaise = back.lambdaCoop?.clauseBundles?.find(
        (bundle) => bundle.operation === "raise",
      );
      expect(backRaise?.argumentType).toEqual(ERROR_PAYLOAD_TYPE);
      expect(backRaise?.argumentWitness).toEqual(ERROR_PAYLOAD_WITNESS);
      expect(backRaise?.resultValueType).toBeUndefined();
      expect(backRaise?.resultWitness).toBeUndefined();
      expect(back.lambdaCoop?.userAllowed).toEqual(["getenv"]);
      expect(back.lambdaCoop?.stateCarrier).toBe("ExampleKernel");
      expect(back.lambdaCoop?.runnerLiteral?.stateCarrier).toBe("ExampleKernel");
      expect(back.lambdaCoop?.runnerLiteral?.clauses.length).toBe(2);
      expect(back.lambdaCoop?.residualCoverage?.sampleLimit).toBeGreaterThan(0);
      expect(back.lambdaCoop?.expectedOperations).toEqual(["getenv"]);
      expect(back.lambdaCoop?.coverage?.operations.map((link) => link.operation)).toEqual([
        "getenv",
      ]);
      expect(back.lambdaCoop?.coverage?.operationSummary.total).toBe(1);
      expect(back.lambdaCoop?.aligned).toBe(false);
      expect(back.lambdaCoop?.issues).toContain(
        "λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (raise).",
      );
      expect(back.lambdaCoop?.boundaryWitnesses).toEqual({
        kernel: ["getenv", "raise"],
        user: ["getenv"],
        supported: ["getenv"],
        unsupported: [],
        unacknowledged: ["raise"],
      });
      const reconstructedGetenv = roundTripOperations.find((op) => op.name === "getenv");
      expect(reconstructedGetenv?.parameterName).toBe("_");
      expect(reconstructedGetenv?.parameterType).toEqual(UNIT_TYPE);
      expect(reconstructedGetenv?.resultValueType).toEqual(ENV_TYPE);
      expect(reconstructedGetenv?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(reconstructedGetenv?.resultWitness).toEqual(ENV_WITNESS);
      const reconstructedRaise = roundTripOperations.find((op) => op.name === "raise");
      expect(reconstructedRaise?.parameterName).toBe("error");
      expect(reconstructedRaise?.parameterType).toEqual(ERROR_PAYLOAD_TYPE);
      expect(reconstructedRaise?.resultKind).toBe("raise");
      expect(reconstructedRaise?.argumentWitness).toEqual(ERROR_PAYLOAD_WITNESS);
      expect(reconstructedRaise?.resultWitness).toBeUndefined();
      expect(reconstructedRaise?.residual).toBeUndefined();
    });

    it("synthesises a user boundary description when one is not provided", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec = buildExampleUserSpec<Obj>();
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 2 },
      );
      const boundaryLine = stack.user.diagnostics.find((line) => line.startsWith("Boundary:"));
      expect(boundaryLine).toBeDefined();
      expect(boundaryLine).toContain("User boundary expects 1 operation(s): getenv");
      expect(boundaryLine).toContain("all expected operations present in kernel");
      expect(boundaryLine).toContain("kernel-only operations: raise");
    });

    it("buildLambdaCoopComparisonArtifacts summarises kernel/user operations", () => {
      const artifacts = buildLambdaCoopComparisonArtifacts(
        [
          { name: "stateOp", kind: "state" },
          { name: "excOp", kind: "exception" },
        ],
        new Set(["stateOp", "userOnly"]),
        { stateCarrierName: "ExampleState" },
      );
      expect(artifacts.runnerLiteral.stateCarrier).toBe("ExampleState");
      expect(artifacts.runnerLiteral.clauses).toHaveLength(2);
      expect(artifacts.stateCarrier).toBe("ExampleState");
      expect(artifacts.kernelClauses.map((clause) => clause.name)).toEqual(["stateOp", "excOp"]);
      expect(artifacts.clauseBundles.map((bundle) => bundle.operation)).toEqual([
        "stateOp",
        "excOp",
      ]);
      expect(
        artifacts.clauseBundles.every((bundle) => bundle.stateCarrier === "ExampleState"),
      ).toBe(true);
      expect(artifacts.clauseBundles.every((bundle) => bundle.residual === undefined)).toBe(true);
      expect(artifacts.userAllowed).toEqual(["stateOp", "userOnly"]);
      expect(artifacts.unsupportedByKernel).toEqual(["userOnly"]);
      expect(artifacts.unacknowledgedByUser).toEqual(["excOp"]);
      expect(artifacts.residualCoverage).toBeUndefined();
      expect(artifacts.aligned).toBe(false);
      expect(artifacts.issues.length).toBeGreaterThan(0);
      expect(artifacts.diagnostics.length).toBeGreaterThan(0);
      expect(artifacts.metadata).toContain("λ₍coop₎.stateCarrier=ExampleState");
      expect(artifacts.metadata).toContain('λ₍coop₎.kernelClauses=["stateOp","excOp"]');
      expect(artifacts.metadata).toContain('λ₍coop₎.userAllowed=["stateOp","userOnly"]');
      expect(
        artifacts.metadata.some((entry) => entry.startsWith("λ₍coop₎.clause[0].operation")),
      ).toBe(true);
      expect(
        artifacts.metadata.some((entry) => entry.startsWith("λ₍coop₎.boundary={")),
      ).toBe(true);
      expect(
        artifacts.metadata.some((entry) => entry.startsWith("λ₍coop₎ boundary supported")),
      ).toBe(true);
      expect(
        artifacts.metadata.some((entry) =>
          entry.includes('λ₍coop₎.clause[0].parameterType={"kind":"unit"}'),
        ),
      ).toBe(true);
      expect(
        artifacts.metadata.some((entry) =>
          entry.includes('λ₍coop₎.clause[0].argumentWitness={"kind":"unitValue"}'),
        ),
      ).toBe(true);
      expect(artifacts.boundaryWitnesses).toEqual({
        kernel: ["stateOp", "excOp"],
        user: ["stateOp", "userOnly"],
        supported: ["stateOp"],
        unsupported: ["userOnly"],
        unacknowledged: ["excOp"],
      });
      const stateBundle = artifacts.clauseBundles.find((bundle) => bundle.operation === "stateOp");
      expect(stateBundle?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(stateBundle?.resultWitness).toEqual(UNIT_VALUE_WITNESS);
      const excBundle = artifacts.clauseBundles.find((bundle) => bundle.operation === "excOp");
      expect(excBundle?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(excBundle?.resultWitness).toBeUndefined();
    });

    it("evaluates the Example 6 supervised stack with the λ₍coop₎ runner helper", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec = buildExampleUserSpec<Obj>();
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const run = evaluateSupervisedStackWithLambdaCoop(stack, { operations: ["getenv"] });
      expect(run.evaluation.status).toBe("value");
      expect(run.evaluation.operations).toEqual(["getenv"]);
      expect(run.summary.operations).toEqual(["getenv"]);
      expect(run.metadata).toContain("λ₍coop₎.stackRun.status=value");
      expect(run.metadata).toContain('λ₍coop₎.stackRun.operations=["getenv"]');
    });

    it("reports interpreter errors when the stack run references missing operations", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec = buildExampleUserSpec<Obj>();
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const missingOperation = "missing";
      const run = evaluateSupervisedStackWithLambdaCoop(stack, { operations: [missingOperation] });
      expect(run.evaluation.status).toBe("error");
      expect(run.evaluation.error).toBe(`missing-clause:${missingOperation}`);
      expect(run.summary.error).toBe(`missing-clause:${missingOperation}`);
      expect(run.metadata).toContain(`λ₍coop₎.stackRun.error=missing-clause:${missingOperation}`);
    });

    it("round-trips supervised stack specs through the λ₍coop₎ literal", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of kernelObjects) {
        residualSpecs.set(object, {
          description: "round-trip residual",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "RoundTripKernel",
        initialState: { env: "seed" },
        operations: [
          {
            name: "getenv",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
          },
          {
            name: "raise",
            kind: "exception",
            parameterName: "error",
            parameterType: ERROR_PAYLOAD_TYPE,
            defaultResidual: true,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "RoundTripUser",
        allowedKernelOperations: ["getenv"],
      };
      const result = replaySupervisedStackRoundTrip(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      expect(result.mismatches).toEqual([]);
      expect(result.reconstructed.kernel?.operations.map(({ name, kind }) => ({ name, kind }))).toEqual([
        { name: "getenv", kind: "state" },
        { name: "raise", kind: "exception" },
      ]);
      expect(result.coverageComparison?.issues).toEqual([]);
      expect(result.diagnostics?.some((note) => note === "roundTrip: mismatches=0")).toBe(true);
      const raiseSummary = result.reconstructed.kernel?.operations.find((op) => op.name === "raise");
      expect(raiseSummary?.residual?.defaulted).toBe(true);
      expect(result.reconstructed.user?.allowedOperations).toEqual(["getenv"]);
      expect(result.reconstructed.kernel?.stateCarrier).toBe("RoundTripKernel");
    });

    it("round-trips kernel-only stacks with mixed residual defaults", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const primaryObject = kernelObjects[0];
      if (!primaryObject) {
        throw new Error("Expected at least one kernel object for the round-trip fixture.");
      }
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>(
        kernelObjects.map((object) => [
          object,
          {
            description: "kernel-only residual",
            predicate: () => true,
          },
        ]),
      );
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "KernelOnlySpec",
        initialState: { env: "kernel" },
        operations: [
          {
            name: "stateOp",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
            residualHandler: residualSpecs.get(primaryObject)!,
          },
          {
            name: "alarm",
            kind: "signal",
            parameterName: "alarm",
            parameterType: ALARM_PAYLOAD_TYPE,
            defaultResidual: true,
          },
          {
            name: "raise",
            kind: "exception",
            parameterName: "error",
            parameterType: ERROR_PAYLOAD_TYPE,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "KernelOnlyUser",
      };
      const result = replaySupervisedStackRoundTrip(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      expect(result.mismatches).toEqual([]);
      const reconstructed = result.reconstructed.kernel?.operations ?? [];
      const reconstructedByName = new Map(reconstructed.map((entry) => [entry.name, entry]));
      expect(reconstructedByName.get("stateOp")?.kind).toBe("state");
      expect(reconstructedByName.get("alarm")?.resultKind).toBe("signal");
      expect(reconstructedByName.get("alarm")?.residual?.defaulted).toBe(true);
      expect(reconstructedByName.get("raise")?.resultKind).toBe("raise");
      expect(result.reconstructed.user?.allowedOperations).toEqual([]);
      expect(result.reconstructed.kernel?.stateCarrier).toBe("KernelOnlySpec");
    });

    it("surfaces λ₍coop₎ coverage for round-trip dashboards", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec = buildExampleUserSpec<Obj>();
      const roundTrip = replaySupervisedStackRoundTrip(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const recordedCoverage = getSupervisedStackLambdaCoopCoverageFromMetadata(
        roundTrip.stack.runner.metadata,
      );
      expect(recordedCoverage).toBeDefined();
      expect(recordedCoverage?.operations.map((link) => link.operation)).toContain("getenv");
      const comparison = compareSupervisedStackRoundTripCoverage(roundTrip);
      expect(comparison.issues).toEqual([]);
      expect(comparison.recorded?.operationSummary.total).toBeGreaterThan(0);
      expect(comparison.reconstructed?.operationSummary.total).toBeGreaterThan(0);

      const missingMetadataResult: typeof roundTrip = {
        ...roundTrip,
        stack: {
          ...roundTrip.stack,
          runner: { ...roundTrip.stack.runner, metadata: [] },
        },
      };
      const missingCoverage = compareSupervisedStackRoundTripCoverage(missingMetadataResult);
      expect(missingCoverage.issues).toContain(
        "Recorded runner metadata is missing λ₍coop₎ coverage information.",
      );

      const lambdaCoopSummary = roundTrip.reconstructed.lambdaCoop;
      expect(lambdaCoopSummary?.coverage).toBeDefined();
      const driftRoundTrip: typeof roundTrip = lambdaCoopSummary?.coverage
        ? {
            ...roundTrip,
            reconstructed: {
              ...roundTrip.reconstructed,
              lambdaCoop: {
                ...lambdaCoopSummary,
                coverage: {
                  ...lambdaCoopSummary.coverage,
                  interpreterCoveredOperations:
                    lambdaCoopSummary.coverage.interpreterCoveredOperations === 0
                      ? 1
                      : lambdaCoopSummary.coverage.interpreterCoveredOperations - 1,
                },
              },
            },
          }
        : roundTrip;
      const driftComparison = compareSupervisedStackRoundTripCoverage(driftRoundTrip);
      expect(
        driftComparison.issues.some((issue) =>
          issue.startsWith("Interpreter covered operations mismatch"),
        ),
      ).toBe(true);
      const driftResult = {
        ...roundTrip,
        reconstructed: driftRoundTrip.reconstructed,
        coverageComparison: driftComparison,
      };
      const driftDiagnostics = driftResult.coverageComparison
        ? driftResult.coverageComparison.issues.map(
            (issue) => `roundTrip: coverage issue=${issue}`,
          )
        : [];
      expect(
        driftDiagnostics.some((note) =>
          note.includes("Interpreter covered operations mismatch"),
        ),
      ).toBe(true);
    });

    it("recovers λ₍coop₎ metadata from runner literal when clause bundles are missing", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of kernelObjects) {
        residualSpecs.set(object, {
          description: "round-trip residual",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "LiteralFallbackKernel",
        initialState: { env: "seed" },
        operations: [
          {
            name: "getenv",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
          },
          {
            name: "raise",
            kind: "exception",
            parameterName: "error",
            parameterType: ERROR_PAYLOAD_TYPE,
            defaultResidual: true,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "LiteralFallbackUser",
        allowedKernelOperations: ["getenv"],
      };
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const runnerWithoutBundles = {
        ...stack.runner,
        metadata: stack.runner.metadata?.filter(
          (entry) => !entry.startsWith("supervised-stack.lambdaCoop.clauseBundles="),
        ),
      } as typeof stack.runner;
      const reconstructed = runnerToStack(runnerWithoutBundles, law as unknown as any);
      const getenvSummary = reconstructed.kernel?.operations.find((op) => op.name === "getenv");
      expect(getenvSummary?.parameterName).toBe("_");
      expect(getenvSummary?.parameterType).toEqual(UNIT_TYPE);
      expect(getenvSummary?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(getenvSummary?.resultWitness).toEqual(ENV_WITNESS);
      const raiseSummary = reconstructed.kernel?.operations.find((op) => op.name === "raise");
      expect(raiseSummary?.resultKind).toBe("raise");
      expect(raiseSummary?.argumentWitness).toEqual(ERROR_PAYLOAD_WITNESS);
      expect(raiseSummary?.resultWitness).toBeUndefined();
    });

    it("preserves kernel metadata when λ₍coop₎ literal metadata is fully stripped", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of kernelObjects) {
        residualSpecs.set(object, {
          description: "metadata preservation residual",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "MetadataOnlyKernel",
        initialState: { env: "seed" },
        operations: [
          {
            name: "getenv",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
          },
          {
            name: "raise",
            kind: "exception",
            parameterName: "error",
            parameterType: ERROR_PAYLOAD_TYPE,
            defaultResidual: true,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "MetadataOnlyUser",
        allowedKernelOperations: ["getenv"],
      };
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const runnerMetadataOnly = {
        ...stack.runner,
        metadata: stack.runner.metadata?.filter(
          (entry) => !entry.startsWith("supervised-stack.lambdaCoop."),
        ),
      } as typeof stack.runner;
      const reconstructed = runnerToStack(runnerMetadataOnly, law as unknown as any);
      const getenvSummary = reconstructed.kernel?.operations.find((op) => op.name === "getenv");
      expect(getenvSummary?.parameterName).toBe("_");
      expect(getenvSummary?.parameterType).toEqual(UNIT_TYPE);
      expect(getenvSummary?.resultKind).toBe("return");
      expect(getenvSummary?.argumentWitness).toBeUndefined();
      expect(getenvSummary?.resultWitness).toBeUndefined();
      const raiseSummary = reconstructed.kernel?.operations.find((op) => op.name === "raise");
      expect(raiseSummary?.parameterType).toEqual(ERROR_PAYLOAD_TYPE);
      expect(raiseSummary?.resultKind).toBe("raise");
      expect(raiseSummary?.argumentWitness).toBeUndefined();
      expect(raiseSummary?.resultWitness).toBeUndefined();
      expect(raiseSummary?.residual?.defaulted).toBe(true);
      expect(raiseSummary?.residual?.notes).toContain(
        "runnerToStack: metadata marks operation as default residual fallback.",
      );
    });

    it("synthesises λ₍coop₎ runner literal and clause metadata from clause bundles when literal metadata is absent", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of kernelObjects) {
        residualSpecs.set(object, {
          description: "synthesise literal residual",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "LiteralFallbackKernel",
        initialState: { env: "seed" },
        operations: [
          {
            name: "getenv",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
          },
          {
            name: "raise",
            kind: "exception",
            parameterName: "error",
            parameterType: ERROR_PAYLOAD_TYPE,
            defaultResidual: true,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "LiteralFallbackUser",
        allowedKernelOperations: ["getenv"],
      };
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const runnerWithoutLiteralMetadata = {
        ...stack.runner,
        metadata: stack.runner.metadata?.filter(
          (entry) =>
            !entry.startsWith("supervised-stack.lambdaCoop.runnerLiteral=") &&
            !entry.startsWith("supervised-stack.lambdaCoop.stateCarrier=") &&
            !entry.startsWith("supervised-stack.lambdaCoop.kernelClauses="),
        ),
      } as typeof stack.runner;
      const reconstructed = runnerToStack(runnerWithoutLiteralMetadata, law as unknown as any);
      expect(reconstructed.lambdaCoop?.runnerLiteral?.clauses.length).toBe(
        stack.lambdaCoopComparison?.runnerLiteral.clauses.length ?? 0,
      );
      expect(reconstructed.lambdaCoop?.kernelClauses?.length).toBeGreaterThan(0);
      expect(reconstructed.lambdaCoop?.stateCarrier).toBe(kernelSpec.name);
      const synthesizedGetenv = reconstructed.kernel?.operations.find((op) => op.name === "getenv");
      expect(synthesizedGetenv?.argumentWitness).toEqual(UNIT_VALUE_WITNESS);
      expect(synthesizedGetenv?.resultWitness).toEqual(ENV_WITNESS);
      const synthesizedRaise = reconstructed.kernel?.operations.find((op) => op.name === "raise");
      expect(synthesizedRaise?.argumentWitness).toEqual(ERROR_PAYLOAD_WITNESS);
      expect(
        reconstructed.diagnostics.some((line) =>
          line.includes("λ₍coop₎ runner literal synthesised from clause bundles"),
        ),
      ).toBe(true);
    });

    it("reports mismatches when reconstructed allowances diverge", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "DivergentKernel",
        operations: [
          {
            name: "getenv",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
          },
        ],
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "DivergentUser",
        allowedKernelOperations: ["getenv", "extra"],
      };
      const result = replaySupervisedStackRoundTrip(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
      );
      expect(result.mismatches.some((note) => note.includes("Unexpected reconstructed user allowance"))).toBe(
        true,
      );
    });

    it("alignment surfaces boundary diagnostics for unsupported, exception, and signal clauses", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of kernelObjects) {
        residualSpecs.set(object, {
          description: "total residual coverage",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "BoundaryKernel",
        description: "Kernel with exception and signal operations",
        initialState: { env: "init" },
        operations: [
          {
            name: "getenv",
            kind: "state",
            description: "read current state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
            handle: (state) => ({ state, output: state }),
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
            description: "emit termination signal",
            parameterName: "payload",
            parameterType: ALARM_PAYLOAD_TYPE,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "BoundaryUser",
        description: "User requesting unsupported operation",
        allowedKernelOperations: ["getenv", "alarm", "mystery"],
      };
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const report = analyzeSupervisedStackLambdaCoopAlignment(law as any, stack as any, {
        traceLimit: 8,
      });
      expect(report.lambdaCoop.unsupportedByKernel).toContain("mystery");
      expect(report.lambdaCoop.boundaryWitnesses.unsupported).toContain("mystery");
      expect(report.lambdaCoop.boundaryWitnesses.unacknowledged).toEqual(["raise"]);
      expect(report.lambdaCoop.clauseBundles.find((bundle) => bundle.operation === "raise")?.resultKind).toBe("raise");
      expect(
        report.lambdaCoop.clauseBundles.find((bundle) => bundle.operation === "raise")?.argumentType,
      ).toEqual(ERROR_PAYLOAD_TYPE);
      expect(report.lambdaCoop.clauseBundles.find((bundle) => bundle.operation === "alarm")?.resultKind).toBe("signal");
      expect(
        report.lambdaCoop.clauseBundles.find((bundle) => bundle.operation === "alarm")?.argumentType,
      ).toEqual(ALARM_PAYLOAD_TYPE);
      expect(
        report.interpreterResult.operations.includes("mystery") ||
          report.lambdaCoop.userAllowed.includes("mystery"),
      ).toBe(true);
      expect(
        report.notes.some((note) =>
          note.includes("comparison warning: user references operations missing"),
        ),
      ).toBe(true);
      expect(
        report.notes.some((note) => note.includes("λ₍coop₎ boundary supported")),
      ).toBe(true);
      expect(report.comparison.boundaryWitnesses.unsupported).toContain("mystery");
      expect(report.comparison.boundaryWitnesses.unacknowledged).toEqual(["raise"]);
      expect(report.oracleSummary.total).toBeGreaterThan(0);
      expect(report.oracleSummary.uniqueRegistryPaths.length).toBeGreaterThan(0);
      expect(report.oracleSummary.notes.length).toBeGreaterThan(0);
    });

    it("analyzeSupervisedStackLambdaCoopAlignment reports runner literal and diagnostics", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of kernelObjects) {
        residualSpecs.set(object, {
          description: "all handled",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "ExampleKernel",
        operations: [
          {
            name: "getenv",
            kind: "state",
            parameterName: "_",
            parameterType: UNIT_TYPE,
            resultValueType: ENV_TYPE,
          },
          {
            name: "raise",
            kind: "exception",
            parameterName: "error",
            parameterType: ERROR_PAYLOAD_TYPE,
          },
        ],
        residualHandlers: residualSpecs,
      };
      const userSpec: UserMonadSpec<Obj> = {
        name: "ExampleUser",
        allowedKernelOperations: ["getenv"],
      };
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        { sampleLimit: 4 },
      );
      const report = analyzeSupervisedStackLambdaCoopAlignment(
        law as unknown as any,
        stack as any,
        { sampleLimit: 4 },
      );
      expect(report.lambdaCoop.runnerLiteral.stateCarrier).toBe("ExampleKernel");
      expect(report.lambdaCoop.kernelClauses.map((clause) => clause.name)).toEqual([
        "getenv",
        "raise",
      ]);
      expect(report.lambdaCoop.clauseBundles?.map((bundle) => bundle.operation)).toEqual([
        "getenv",
        "raise",
      ]);
      expect(report.lambdaCoop.stateCarrier).toBe("ExampleKernel");
      expect(report.lambdaCoop.residualCoverage?.handled).toBeGreaterThanOrEqual(0);
      expect(report.comparison.unacknowledgedByUser).toEqual(["raise"]);
      expect(report.lambdaCoop.aligned).toBe(false);
      expect(report.lambdaCoop.issues).toContain(
        "λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (raise).",
      );
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith("λ₍coop₎.interpreter.status=value"),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith("λ₍coop₎.interpreter.exceptionPayloadKind="),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith("λ₍coop₎.interpreter.signalPayloadKind="),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.status='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.oracle='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualOracles='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.holds='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.mismatches='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.counterexamples='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.counterexampleSummary='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.compatibilitySummary='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.compatibility.'),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualHandlers='),
        ),
      ).toBe(true);
      expect(report.alignmentSummary.oracle.total).toBe(report.oracleSummary.total);
      expect(report.alignmentSummary.residualOracles.total).toBe(
        report.residualOracleSummary.total,
      );
      expect(report.alignmentSummary.residualHandlers?.reports).toBeGreaterThan(0);
      expect(report.residualOracleSummary.notes.length).toBeGreaterThan(0);
      expect(report.residualOracleSummary.total).toBeGreaterThan(0);
      expect(report.alignmentSummary.residualLaw).toBeDefined();
      expect(report.alignmentSummary.residualLawCheck).toBeDefined();
      expect(typeof report.alignmentSummary.residualLawCheck?.holds).toBe("boolean");
      expect(Array.isArray(report.alignmentSummary.residualLaw?.mismatches)).toBe(true);
      expect(Array.isArray(report.alignmentSummary.residualLaw?.counterexamples)).toBe(true);
      expect(
        report.alignmentSummary.residualLaw?.counterexampleSummary.total,
      ).toBeGreaterThanOrEqual(0);
      expect(
        (report.alignmentSummary.residualLaw?.diagnostics.length ?? 0) > 0,
      ).toBe(true);
      expect(
        (report.alignmentSummary.residualLaw?.compatibility?.length ?? 0) > 0,
      ).toBe(true);
      expect(report.alignmentSummary.coverage?.interpreterExpectedOperations).toBeGreaterThan(0);
      expect(report.alignmentSummary.coverage?.interpreterCoveredOperations).toBeGreaterThan(0);
      expect(report.alignmentSummary.coverage?.interpreterMissingOperations).toEqual([]);
      expect(report.alignmentSummary.coverage?.kernelTotalClauses).toBeGreaterThan(0);
      expect(report.alignmentSummary.coverage?.kernelEvaluatedClauses).toBeGreaterThan(0);
      expect(report.alignmentSummary.coverage?.kernelSkippedClauses).toEqual([]);
      expect(report.alignmentSummary.boundary.unsupported).toContain("mystery");
      expect(report.alignmentSummary.aligned).toBe(report.lambdaCoop.aligned);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.interpreter.note[0]=status:'),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.interpreter.summary.total='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.interpreter.summary.exceptionPayloadKinds='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.coverage.interpreter.expected='),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.coverage.kernel.total='),
        ),
      ).toBe(true);
      expect(
        report.notes.some((note) =>
          note.includes('λ₍coop₎ alignment residual law'),
        ),
      ).toBe(true);
      expect(
        report.notes.some((note) =>
          note.includes('λ₍coop₎ residual law counterexample summary='),
        ),
      ).toBe(true);
      expect(
        report.notes.some((note) =>
          note.includes('λ₍coop₎ residual law ρ provided='),
        ),
      ).toBe(true);
      expect(
        report.notes.some((note) =>
          note.includes('λ₍coop₎ alignment residual law compatibility'),
        ),
      ).toBe(true);
      expect(
        report.notes.some((note) =>
          note.includes('λ₍coop₎ residual law compatibility summary'),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.notes.some((note) =>
          note.includes('λ₍coop₎ alignment residual law compatibility summary'),
        ),
      ).toBe(true);
      expect(
        report.alignmentSummary.notes.some((note) =>
          note.includes('λ₍coop₎ alignment residual law ρ provided='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.interpreter.summary.signalPayloadKinds='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualLaw.hasRho='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.kernel[getenv].status='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.kernel.summary.total='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.kernel.summary.exceptionPayloadKinds='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.kernel.summary.signalPayloadKinds='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualOracles='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.startsWith('λ₍coop₎.alignment.residualHandlers='),
        ),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) => entry.includes('"rule":"User-Run"')),
      ).toBe(true);
      expect(
        report.lambdaCoop.metadata.some((entry) =>
          entry.includes('λ₍coop₎.clause[0].parameterType={"kind":"unit"}'),
        ),
      ).toBe(true);
      expect(report.equivalences.stateHandler.holds).toBe(true);
      expect(report.equivalences.coalgebra.holds).toBe(true);
      expect(Array.from(report.runnerSummary.usage.signatures)).toEqual(["getenv", "raise"]);
      expect(Array.from(report.runnerSummary.usage.states)).toEqual(["ExampleKernel"]);
      expect(report.interpreterResult.status).toBe("value");
      expect(report.interpreterResult.operations).toEqual(["getenv"]);
      expect(report.notes.length).toBeGreaterThan(0);
      expect(
        report.notes.some((note) => note.includes('λ₍coop₎ alignment residual oracles=')),
      ).toBe(true);
      expect(
        report.notes.some((note) => note.includes('λ₍coop₎ alignment residual handlers')),
      ).toBe(true);
      expect(report.oracles.length).toBeGreaterThan(0);
      expect(report.oracleSummary.total).toBeGreaterThan(0);
      expect(report.oracleSummary.passed + report.oracleSummary.failed).toBe(
        report.oracleSummary.total,
      );
    });

    it("threads glueing bridge metadata and notes via the helper", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec: UserMonadSpec<Obj> = {
        name: "GlueingUser",
        allowedKernelOperations: ["getenv"],
      };
      const stack = makeSupervisedStack(
        law as unknown as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec,
        { sampleLimit: 4 },
      );
      const { identitySummary } = makeGlueingInteractionLawExampleSuite();
      const glueingBridge = bridgeGlueingSummaryToResidualRunner(identitySummary, {
        interaction: law as any,
      });
      const report =
        analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge(
          law as any,
          stack as any,
          glueingBridge,
          { sampleLimit: 4 },
        );
      expect(report.glueingBridge.metadata).toEqual(glueingBridge.metadata);
      glueingBridge.metadata.forEach((entry) => {
        expect(report.alignmentSummary.metadata).toContain(entry);
      });
      glueingBridge.notes.forEach((note) => {
        expect(report.alignmentSummary.notes).toContain(note);
      });
    });

    it("builds the supervised stack via the glueing adapter", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      const kernelObjects = law.law.kernel.base.objects;
      type Obj = (typeof kernelObjects)[number];
      const kernelSpec = buildExampleKernelSpec(kernelObjects);
      const userSpec = buildExampleUserSpec<Obj>({
        name: "GlueingStackUser",
        allowedKernelOperations: ["getenv"],
      });
      const { identitySummary } = makeGlueingInteractionLawExampleSuite();
      const glueingBridge = bridgeGlueingSummaryToResidualRunner(identitySummary, {
        interaction: law as any,
      });
      const glued = makeGlueingSupervisedStack(
        glueingBridge as any,
        kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
        userSpec as UserMonadSpec<Obj>,
        {
          stack: { sampleLimit: 3 },
          alignment: { sampleLimit: 2 },
          metadata: ["Glueing.extra=stack"],
          notes: ["Glueing note"],
        },
      );
      expect(glued.stack.kernel.spec.name).toBe("ExampleKernel");
      expect(glued.stack.user.spec.name).toBe("GlueingStackUser");
      expect(glued.alignment.glueingBridge).toBe(glueingBridge);
      expect(glued.metadata).toContain("Glueing.supervisedStack.kernel=ExampleKernel");
      expect(glued.metadata).toContain("Glueing.extra=stack");
      glueingBridge.metadata.forEach((entry) => {
        expect(glued.metadata).toContain(entry);
      });
      expect(
        glued.notes.some((note) => note.startsWith("Glueing.supervisedStack.runnerSummary")),
      ).toBe(true);
      expect(glued.notes).toContain("Glueing note");
    });

    it("exposes the canonical glueing supervised-stack example suite", () => {
      const suite = makeGlueingSupervisedStackExampleSuite();
      expect(suite.identity.result.metadata).toContain(
        "Glueing.supervisedStackExample=identity",
      );
      expect(suite.tensor.bridge.summary.span.length).toBeGreaterThan(1);
      expect(suite.pullbackFailure.bridge.summary.leftSubcategory.pullbackStable).toBe(false);
      expect(suite.pullbackFailure.result.alignment.glueingBridge).toBe(
        suite.pullbackFailure.bridge,
      );
      expect(
        suite.tensor.result.alignment.alignmentSummary.metadata.some((entry) =>
          entry.startsWith("Glueing.residualBridge.spanCount="),
        ),
      ).toBe(true);
    });

    describe("λ₍coop₎ coverage helper", () => {
      it("highlights missing interpreter operations and skipped kernel clauses", () => {
        const clauseBundles: LambdaCoopClauseBundle[] = [
          {
            operation: "getenv",
            kind: "state",
            clause: {
              operation: "getenv",
              parameter: "arg",
              parameterType: UNIT_TYPE,
              body: { kind: "kernelReturn", value: UNIT_VALUE_WITNESS },
            },
            stateCarrier: "EnvState",
            argumentType: UNIT_TYPE,
            argumentWitness: UNIT_VALUE_WITNESS,
            resultKind: "return",
            resultValueType: UNIT_TYPE,
            resultWitness: UNIT_VALUE_WITNESS,
            description: "Read environment",
            residual: {
              defaulted: true,
              handlerDescription: "default env residual",
              coverage: { handled: 0, unhandled: 1, sampleLimit: 1 },
              notes: ["residual note"],
            },
            diagnostics: [],
          },
        ];
        const coverage = collectLambdaCoopAlignmentCoverageIssues({
          expectedInterpreterOperations: ["getenv", "setenv"],
          interpreterOperations: ["getenv"],
          kernelTotalClauses: 2,
          kernelEvaluatedClauses: 1,
          skippedKernelClauses: [
            { operation: "setenv", reason: "missing-argument-witness" },
          ],
          clauseBundles,
        });
        expect(coverage.interpreterExpectedOperations).toBe(2);
        expect(coverage.interpreterCoveredOperations).toBe(1);
        expect(coverage.interpreterMissingOperations).toEqual(["setenv"]);
        expect(coverage.kernelTotalClauses).toBe(2);
        expect(coverage.kernelEvaluatedClauses).toBe(1);
        expect(coverage.kernelSkippedClauses).toEqual([
          { operation: "setenv", reason: "missing-argument-witness" },
        ]);
        expect(coverage.operationSummary.missingInterpreter).toBe(1);
        expect(coverage.operationSummary.missingKernelClause).toBe(1);
        expect(coverage.operations.map((link) => link.operation)).toEqual(["getenv", "setenv"]);
        const getenvLink = coverage.operations.find((link) => link.operation === "getenv");
        expect(getenvLink?.interpreterCovered).toBe(true);
        expect(getenvLink?.kernelClause?.kind).toBe("state");
        expect(getenvLink?.residual?.defaulted).toBe(true);
        const setenvLink = coverage.operations.find((link) => link.operation === "setenv");
        expect(setenvLink?.interpreterCovered).toBe(false);
        expect(setenvLink?.kernelClause).toBeUndefined();
        expect(setenvLink?.kernelClauseSkipped).toEqual({
          operation: "setenv",
          reason: "missing-argument-witness",
        });
      });
    });
  });
});
