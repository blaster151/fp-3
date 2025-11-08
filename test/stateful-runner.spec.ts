import { describe, it, expect } from "vitest";
import { makeExample6MonadComonadInteractionLaw, buildRunnerFromInteraction, checkStatefulRunner, checkRunnerCoalgebra, buildRunnerCoalgebra } from "../allTS";
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
    for (const [obj, theta] of runner.thetas.entries()) {
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
      const thetas = new Map(runner.thetas);
      thetas.set(obj, bad);
      perturbedRunner = { thetas, diagnostics: runner.diagnostics } as typeof runner;
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
});
