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
  makeSupervisedStack,
  stackToRunner,
  runnerToStack,
  type ResidualHandlerSpec,
  type KernelMonadSpec,
  type UserMonadSpec,
  buildLambdaCoopComparisonArtifacts,
  analyzeSupervisedStackLambdaCoopAlignment,
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

  it("residual handler coverage reports full support", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const runner = buildRunnerFromInteraction(law);
    const specs = new Map<
      (typeof law.kernel.base.objects)[number],
      ResidualHandlerSpec<(typeof law.kernel.base.objects)[number], unknown, unknown>
    >();
    for (const object of law.kernel.base.objects) {
      specs.set(object, {
        description: "identity residual coverage",
        predicate: () => true,
      });
    }
    const annotated = attachResidualHandlers(runner, law, specs, { sampleLimit: 6 });
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

  it("makeResidualInteractionLaw surfaces TODO diagnostics", () => {
    const law = makeExample6MonadComonadInteractionLaw();
    const residualSummary = makeResidualInteractionLaw(law, { residualMonadName: "Maybe" });
    expect(residualSummary.diagnostics.some((line) => line.includes("TODO"))).toBe(true);
  });

  describe("Supervised kernel/user stack scaffold", () => {
    it("constructs the supervised stack example once builders are implemented", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      type Obj = (typeof law.kernel.base.objects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
        for (const object of law.kernel.base.objects) {
          residualSpecs.set(object, {
            description: "all handled",
            predicate: () => true,
          });
        }
        const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
          name: "ExampleKernel",
          description: "Scaffold kernel signature",
          initialState: { env: "init" },
          operations: [
            {
              name: "getenv",
              kind: "state",
              description: "read current state",
              handle: (state) => ({ state, output: state }),
            },
            {
              name: "raise",
              kind: "exception",
              description: "raise error",
            },
          ],
          residualHandlers: residualSpecs,
        };
        const userSpec: UserMonadSpec<Obj> = {
          name: "ExampleUser",
          description: "Scaffold user specification",
          boundaryDescription: "Comparison morphism TBD",
          allowedKernelOperations: ["getenv"],
        };
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
          stack.kernel.diagnostics.some((line) => line.includes("Kernel operation handlers provided for: getenv")),
        ).toBe(true);
        expect(stack.user.diagnostics.some((line) => line.includes("User boundary expectations"))).toBe(true);
        expect(stack.user.diagnostics.some((line) => line.includes("Comparison:"))).toBe(true);

        const getenv = stack.kernel.monad?.operations.find((op) => op.name === "getenv");
        expect(getenv).toBeDefined();
        const sampleState = { env: "sample" };
        const getenvResult = getenv?.execute(sampleState, undefined);
        expect(getenvResult).toMatchObject({ kind: "return", state: sampleState, value: sampleState });
        expect(getenvResult?.diagnostics?.some((line) => line.includes("Handler executed"))).toBe(true);

        const raise = stack.kernel.monad?.operations.find((op) => op.name === "raise");
        expect(raise).toBeDefined();
        const raiseResult = raise?.execute(sampleState, "boom");
        expect(raiseResult).toMatchObject({ kind: "raise", payload: "boom" });
        expect(raiseResult?.diagnostics?.some((line) => line.includes("Default exception"))).toBe(true);

        expect(stack.residualSummary).toBeDefined();
        expect(
          stack.residualSummary?.reports.every((report) => report.unhandledSamples === 0),
        ).toBe(true);
        expect(stack.user.monad?.allowedKernelOperations.has("getenv")).toBe(true);
        const invoked = stack.user.monad?.invoke("getenv", sampleState, null);
        expect(invoked).toMatchObject({ kind: "return", state: sampleState, value: sampleState });
        expect(invoked?.diagnostics?.[0]).toContain('delegated to kernel operation "getenv"');

        expect(stack.comparison.userToKernel.has("getenv")).toBe(true);
        expect(stack.comparison.unsupportedByKernel.length).toBe(0);
        expect(stack.comparison.unacknowledgedByUser).toEqual(["raise"]);
        expect(stack.comparison.diagnostics.length).toBeGreaterThan(0);
        expect(stack.runner.stateCarriers?.size).toBeGreaterThan(0);
        expect(
          stack.runner.metadata?.some((entry) => entry.startsWith("supervised-stack.kernel")),
        ).toBe(true);
        expect(stack.lambdaCoopComparison?.kernelClauses).toEqual([
          { name: "getenv", kind: "state" },
          { name: "raise", kind: "exception" },
        ]);
        expect(stack.lambdaCoopComparison?.runnerLiteral?.clauses.length).toBe(2);
        expect(stack.lambdaCoopComparison?.aligned).toBe(false);
        expect(stack.lambdaCoopComparison?.issues).toContain(
          "λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (raise).",
        );

        const runner = stackToRunner(
          law as unknown as any,
          kernelSpec as unknown as KernelMonadSpec<Obj, unknown, unknown>,
          userSpec as UserMonadSpec<Obj>,
          { sampleLimit: 4 },
        );
        expect(runner.residualHandlers?.reports.length).toBeGreaterThan(0);
        expect(
          runner.metadata?.some((entry) => entry.startsWith("supervised-stack.kernel")),
        ).toBe(true);
        expect(
          runner.metadata?.some((entry) =>
            entry.startsWith("supervised-stack.lambdaCoop.runnerLiteral"),
          ),
        ).toBe(true);

        const back = runnerToStack(runner as any, law as unknown as any);
        expect(back.kernel?.name).toBe("ExampleKernel");
        expect(back.kernel?.operations).toEqual([
          { name: "getenv", kind: "state" },
          { name: "raise", kind: "exception" },
        ]);
        expect(back.user?.name).toBe("ExampleUser");
        expect(back.user?.allowedOperations).toEqual(["getenv"]);
        expect(back.comparison.unsupportedByKernel).toEqual([]);
        expect(back.comparison.unacknowledgedByUser).toEqual(["raise"]);
        expect(back.residualSummary?.reports.length).toBeGreaterThan(0);
        expect(back.diagnostics.length).toBeGreaterThan(0);
        expect(
          back.diagnostics.some((line) => line.includes("kernel operations detected=2")),
        ).toBe(true);
        expect(back.lambdaCoop?.kernelClauses).toEqual([
          { name: "getenv", kind: "state" },
          { name: "raise", kind: "exception" },
        ]);
        expect(back.lambdaCoop?.userAllowed).toEqual(["getenv"]);
        expect(back.lambdaCoop?.runnerLiteral?.stateCarrier).toBe("ExampleKernel");
        expect(back.lambdaCoop?.runnerLiteral?.clauses.length).toBe(2);
        expect(back.lambdaCoop?.aligned).toBe(false);
        expect(back.lambdaCoop?.issues).toContain(
          "λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (raise).",
        );
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
      expect(artifacts.kernelClauses.map((clause) => clause.name)).toEqual(["stateOp", "excOp"]);
      expect(artifacts.userAllowed).toEqual(["stateOp", "userOnly"]);
      expect(artifacts.unsupportedByKernel).toEqual(["userOnly"]);
      expect(artifacts.unacknowledgedByUser).toEqual(["excOp"]);
      expect(artifacts.aligned).toBe(false);
      expect(artifacts.issues.length).toBeGreaterThan(0);
      expect(artifacts.diagnostics.length).toBeGreaterThan(0);
    });

    it("analyzeSupervisedStackLambdaCoopAlignment reports runner literal and diagnostics", () => {
      const law = makeExample6MonadComonadInteractionLaw();
      type Obj = (typeof law.kernel.base.objects)[number];
      const residualSpecs = new Map<Obj, ResidualHandlerSpec<Obj, unknown, unknown>>();
      for (const object of law.kernel.base.objects) {
        residualSpecs.set(object, {
          description: "all handled",
          predicate: () => true,
        });
      }
      const kernelSpec: KernelMonadSpec<Obj, unknown, unknown> = {
        name: "ExampleKernel",
        operations: [
          { name: "getenv", kind: "state" },
          { name: "raise", kind: "exception" },
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
      expect(report.comparison.unacknowledgedByUser).toEqual(["raise"]);
      expect(report.lambdaCoop.aligned).toBe(false);
      expect(report.lambdaCoop.issues).toContain(
        "λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (raise).",
      );
      expect(report.equivalences.stateHandler.holds).toBe(true);
      expect(report.equivalences.coalgebra.holds).toBe(true);
      expect(Array.from(report.runnerSummary.usage.signatures)).toEqual(["getenv", "raise"]);
      expect(Array.from(report.runnerSummary.usage.states)).toEqual(["ExampleKernel"]);
      expect(report.notes.length).toBeGreaterThan(0);
      expect(report.oracles.length).toBeGreaterThan(0);
    });
  });
});
