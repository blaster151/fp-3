import { describe, it, expect } from "vitest";
import {
  makeExample6MonadComonadInteractionLaw,
  buildRunnerFromInteraction,
  makeResidualStatefulRunner,
  residualRunnerToMonadMap,
  identityResidualRunnerMorphism,
  makeResidualRunnerMorphism,
  checkResidualRunnerMorphism,
  RunnerOracles,
  monadMapToResidualRunner,
  runnerToMonadMap,
  makeResidualRunnerFromInteractionLaw,
  residualFunctorFromInteractionLaw,
  makeResidualInteractionLaw,
} from "../allTS";
import { getCarrierSemantics, SetCat } from "../set-cat";
import type {
  ResidualFunctorSummary,
  ResidualThetaEvaluationContext,
  ResidualMorphismComponent,
  ResidualThetaComponent,
  ResidualDiagramWitness,
} from "../residual-stateful-runner";

describe("ResidualStatefulRunner semantics", () => {
  const law = makeExample6MonadComonadInteractionLaw();
  const baseRunner = buildRunnerFromInteraction(law);
  type Obj = (typeof law.law.kernel.base.objects)[number];

  const residualFunctor: ResidualFunctorSummary<any, any, any, any> = {
    name: "TrivialResidual",
    objectCarrier: () => new Set<unknown>(),
    lift: (context: ResidualThetaEvaluationContext<any, any, any, any>) => {
      const [left, right] = context.sample;
      return {
        kind: "residual.lifted",
        object: context.object,
        baseValue: context.baseValue,
        left: left.element,
        right: right.element,
      };
    },
  };

  it("evaluates residual θ using provided lift", () => {
    const residualRunner = makeResidualStatefulRunner(baseRunner, {
      residualFunctor,
    });
    const [object, residualTheta] =
      residualRunner.residualThetas.entries().next().value ??
      (() => {
        throw new Error("residual θ map is empty");
      })();
    const fiber = law.psiComponents.get(object);
    if (!fiber) throw new Error("missing ψ fiber");
    const leftSemantics = getCarrierSemantics(fiber.primalFiber);
    const rightSemantics = getCarrierSemantics(fiber.dualFiber);
    const left =
      leftSemantics?.iterate().next().value ??
      (() => {
        if (typeof (fiber.primalFiber as Iterable<unknown>)[Symbol.iterator] === "function") {
          for (const value of fiber.primalFiber as Iterable<unknown>) {
            return value;
          }
        }
        throw new Error("no left samples");
      })();
    const right =
      rightSemantics?.iterate().next().value ??
      (() => {
        if (typeof (fiber.dualFiber as Iterable<unknown>)[Symbol.iterator] === "function") {
          for (const value of fiber.dualFiber as Iterable<unknown>) {
            return value;
          }
        }
        throw new Error("no right samples");
      })();
    const residualValue = residualTheta.evaluate([left as any, right as any]);
    expect((residualValue as { kind: string }).kind).toBe("residual.lifted");
    expect(residualRunner.diagnostics.some((line) => line.includes("Residual functor engaged"))).toBe(true);
  });

  it("reports residual diagnostics during monad map translation", () => {
    const residualRunner = makeResidualStatefulRunner(baseRunner, {
      residualFunctor,
    });
    const result = residualRunnerToMonadMap(
      residualRunner,
      law.monad,
      law.monad,
      { includeThetaWitness: true },
    );
    expect(result.residualDiagnostics.length).toBeGreaterThan(0);
  });

  it("verifies residual morphism identity squares", () => {
    const residualRunner = makeResidualStatefulRunner(baseRunner, {
      residualFunctor,
    });
    const identity = identityResidualRunnerMorphism(residualRunner, law);
    const report = checkResidualRunnerMorphism(residualRunner, identity, law, {
      sampleLimit: 4,
    });
    expect(report.residualSquare.checked).toBeGreaterThan(0);
    expect(report.residualSquare.mismatches).toBe(0);
    const oracle = RunnerOracles.residualMorphism(identity, residualRunner, law, {
      sampleLimit: 4,
    });
    expect(oracle.registryPath).toBe("runner.residual.morphism");
    expect(oracle.holds).toBe(true);
    expect(oracle.details[0]).toContain("mismatches=0");
  });

  it("detects residual morphism mismatches", () => {
    const residualRunner = makeResidualStatefulRunner(baseRunner, {
      residualFunctor,
    });
    const identity = identityResidualRunnerMorphism(residualRunner, law);
    const iterator = residualRunner.residualThetas.entries().next();
    if (iterator.done) {
      throw new Error("residual runner lacks θ components");
    }
    const [object, thetaComponent] = iterator.value as [
      Obj,
      ResidualThetaComponent<Obj, unknown, unknown, unknown>
    ];
    const residualComponents = new Map<Obj, ResidualMorphismComponent<Obj>>();
    const badMap = SetCat.hom(
      thetaComponent.residualCarrier,
      thetaComponent.residualCarrier,
      () => ({ kind: "bad" }),
    ) as unknown as ResidualMorphismComponent<Obj>["map"];
    residualComponents.set(object, {
      object,
      map: badMap,
      diagnostics: ["forced residual mismatch"],
    });
    const badMorphism = makeResidualRunnerMorphism(
      identity.base,
      residualComponents,
      [...identity.diagnostics, "forced residual mismatch"],
    );
    const report = checkResidualRunnerMorphism(residualRunner, badMorphism, law, {
      sampleLimit: 1,
    });
    expect(report.residualSquare.mismatches).toBeGreaterThan(0);
    const oracle = RunnerOracles.residualMorphism(badMorphism, residualRunner, law, {
      sampleLimit: 1,
    });
    expect(oracle.holds).toBe(false);
    expect(oracle.details[0]).toContain("mismatches=");
  });

  it("attaches residual eta and mu witnesses via monad-map round trip", () => {
    const morphism = runnerToMonadMap(baseRunner, law.monad, law.monad);
    const residualRunner = monadMapToResidualRunner(morphism, law, residualFunctor, {
      sampleLimit: 4,
    });
    expect(residualRunner.thetaWitness).toBeDefined();
    expect(residualRunner.etaWitness).toBeDefined();
    expect(residualRunner.muWitness).toBeDefined();
  });

  it("bridges residual interaction laws into residual functors and runners", () => {
    const thetaWitness = { diagram: "theta", objects: [], diagnostics: [] } as const;
    const etaWitness = { diagram: "eta", objects: [], diagnostics: [] } as const;
    const muWitness = { diagram: "mu", objects: [], diagnostics: [] } as const;
    const customResidualFunctor: ResidualFunctorSummary<any, any, any, any> = {
      name: "ResidualExample",
      description: "custom residual functor",
      objectCarrier: () => new Set<unknown>(),
      metadata: ["custom functor"],
      lift: (context: ResidualThetaEvaluationContext<any, any, any, any>) => ({
        kind: "residual.custom",
        object: context.object,
        left: context.sample[0].element,
        right: context.sample[1].element,
      }),
    };
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualExample",
      notes: ["integration test"],
      residualFunctor: customResidualFunctor,
      thetaWitness,
      etaWitness,
      muWitness,
    });
    const functor = residualFunctorFromInteractionLaw(residualLaw);
    expect(functor).toBe(customResidualFunctor);
    const runnerFromLaw = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw);
    expect(runnerFromLaw.residualFunctor).toBe(customResidualFunctor);
    expect(
      runnerFromLaw.diagnostics.some((line) => line.includes("Residual interaction law applied")),
    ).toBe(true);
    expect(runnerFromLaw.thetaWitness).toBe(thetaWitness);
    expect(runnerFromLaw.etaWitness).toBe(etaWitness);
    expect(runnerFromLaw.muWitness).toBe(muWitness);
  });

  it("honors residual law witnesses via oracle", () => {
    const thetaWitness = { diagram: "theta", objects: [], diagnostics: ["law theta witness"] } as const;
    const etaWitness = { diagram: "eta", objects: [], diagnostics: ["law eta witness"] } as const;
    const muWitness = { diagram: "mu", objects: [], diagnostics: ["law mu witness"] } as const;
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualOracleCheck",
      residualFunctor,
      thetaWitness,
      etaWitness,
      muWitness,
    });
    const runnerFromLaw = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw, {
      diagnostics: ["oracle test runner"],
    });
    const oracle = RunnerOracles.residualInteraction(runnerFromLaw, law, residualLaw, {
      sampleLimit: 4,
    });
    expect(oracle.registryPath).toBe("runner.residual.interaction");
    expect(oracle.holds).toBe(true);
    expect(
      oracle.details.some((line) => line.includes("theta: mismatches=0") || line.includes("eta: mismatches=0")),
    ).toBe(true);
  });

  it("flags residual interaction mismatches when law witnesses report failures", () => {
    const badObject = law.law.kernel.base.objects[0] as Obj;
    const etaWitness: ResidualDiagramWitness<Obj> = {
      diagram: "eta",
      objects: [
        {
          object: badObject,
          checked: 1,
          mismatches: 1,
          diagnostics: ["forced eta mismatch"],
        },
      ],
      diagnostics: ["law-provided eta witness reports mismatch"],
    };
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualOracleMismatch",
      residualFunctor,
      etaWitness,
    });
    const runnerFromLaw = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw, {
      diagnostics: ["oracle mismatch runner"],
    });
    const oracle = RunnerOracles.residualInteraction(runnerFromLaw, law, residualLaw, {
      sampleLimit: 3,
    });
    expect(oracle.registryPath).toBe("runner.residual.interaction");
    expect(oracle.holds).toBe(false);
    expect(oracle.details.some((line) => line.includes("eta: mismatches="))).toBe(true);
  });
});
