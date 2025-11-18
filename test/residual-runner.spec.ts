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
  summarizeResidualRunnerOracles,
  monadMapToResidualRunner,
  runnerToMonadMap,
  makeResidualRunnerFromInteractionLaw,
  residualFunctorFromInteractionLaw,
  makeResidualInteractionLaw,
} from "../allTS";
import {
  summarizeResidualInteractionLaw,
  makeResidualInteractionLawFromRunner,
  checkResidualInteractionLaw,
  makeResidualMonadComonadInteraction,
  makeResidualMonadComonadInteractionLaw,
  constructResidualInteractionLaw,
  liftInteractionLawToResidual,
  type ResidualInteractionLawRho,
  type ResidualInteractionLawRhoComponent,
  makeExample13ResidualInteractionLaw,
  residualLawCompatibilityWithF,
  residualLawCompatibilityWithG,
} from "../residual-interaction-law";
import { getCarrierSemantics, SetCat } from "../set-cat";
import type { SetObj } from "../set-cat";
import type { IndexedElement } from "../chu-space";
import type { StatefulRunner } from "../stateful-runner";
import type {
  ResidualFunctorSummary,
  ResidualThetaEvaluationContext,
  ResidualMorphismComponent,
  ResidualThetaComponent,
  ResidualDiagramWitness,
} from "../residual-stateful-runner";

const findIndexedElement = <Obj, Payload>(
  carrier: SetObj<IndexedElement<Obj, Payload>>,
  object: Obj,
  predicate: (element: IndexedElement<Obj, Payload>) => boolean = () => true,
): IndexedElement<Obj, Payload> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    for (const candidate of semantics.iterate()) {
      if (Object.is(candidate.object, object) && predicate(candidate)) {
        return candidate;
      }
    }
  }
  if (typeof (carrier as Iterable<IndexedElement<Obj, Payload>>)[Symbol.iterator] === "function") {
    for (const candidate of carrier as Iterable<IndexedElement<Obj, Payload>>) {
      if (Object.is(candidate.object, object) && predicate(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error(`No indexed element found for object=${String(object)}`);
};

const extractWriterWeight = (candidate: unknown): 0 | 1 => {
  if (Array.isArray(candidate) && candidate.length > 0) {
    const weight = candidate[0];
    if (weight === 0 || weight === 1) {
      return weight;
    }
  }
  throw new Error(`Unsupported writer sample ${String(candidate)}`);
};

describe("Example13 residual interaction law", () => {
  it("wraps writer weight 0 evaluations as return values", () => {
    const residual = makeExample13ResidualInteractionLaw();
    const baseLaw = residual.base;
    const object = baseLaw.kernel.base.objects[0];
    if (object === undefined) {
      throw new Error("Example13 residual law lacks a kernel object");
    }
    const left = findIndexedElement(baseLaw.primalCarrier as SetObj<IndexedElement<typeof object, unknown>>, object, (candidate) =>
      extractWriterWeight(candidate.element) === 0,
    );
    const right = findIndexedElement(baseLaw.dualCarrier as SetObj<IndexedElement<typeof object, unknown>>, object);
    if (!residual.rho) {
      throw new Error("Example13 residual law missing ρ evaluator");
    }
    const outcome = residual.rho.evaluate(object as any, [left as any, right as any]);
    expect((outcome as { tag: string }).tag).toBe("example13.return");
    expect((outcome as { value?: unknown }).value).not.toBeUndefined();
  });

  it("routes writer weight 1 into the exception branch", () => {
    const residual = makeExample13ResidualInteractionLaw();
    const baseLaw = residual.base;
    const object = baseLaw.kernel.base.objects[0];
    if (object === undefined) {
      throw new Error("Example13 residual law lacks a kernel object");
    }
    const left = findIndexedElement(baseLaw.primalCarrier as SetObj<IndexedElement<typeof object, unknown>>, object, (candidate) =>
      extractWriterWeight(candidate.element) === 1,
    );
    const right = findIndexedElement(baseLaw.dualCarrier as SetObj<IndexedElement<typeof object, unknown>>, object);
    if (!residual.rho) {
      throw new Error("Example13 residual law missing ρ evaluator");
    }
    const outcome = residual.rho.evaluate(object as any, [left as any, right as any]);
    expect((outcome as { tag: string }).tag).toBe("example13.exception");
    expect((outcome as { exception: { description: string } }).exception.description).toContain(
      "Writer weight 1",
    );
  });

  it("enumerates both return and exception carriers", () => {
    const residual = makeExample13ResidualInteractionLaw();
    const object = residual.base.kernel.base.objects[0];
    if (object === undefined) {
      throw new Error("Example13 residual law lacks a kernel object");
    }
    const carrier = residual.residualFunctor.objectCarrier(object);
    const elements: Array<{ tag: string }> = (() => {
      const semantics = getCarrierSemantics(carrier);
      if (semantics?.iterate) {
        return Array.from(semantics.iterate()) as Array<{ tag: string }>;
      }
      if (typeof (carrier as Iterable<unknown>)[Symbol.iterator] === "function") {
        return Array.from(carrier as Iterable<{ tag: string }>);
      }
      return [];
    })();
    expect(elements.some((entry) => entry.tag === "example13.return")).toBe(true);
    expect(elements.some((entry) => entry.tag === "example13.exception")).toBe(true);
  });

  it("satisfies the residual F-diagram compatibility checks", () => {
    const residual = makeExample13ResidualInteractionLaw();
    const witness = residualLawCompatibilityWithF(residual, { sampleLimit: 6 });
    const checkedObjects = witness.objects.filter((entry) => entry.checked > 0);
    expect(checkedObjects.length).toBeGreaterThan(0);
    expect(checkedObjects.every((entry) => entry.mismatches === 0)).toBe(true);
    expect(
      witness.diagnostics.some((line) => line.includes("Residual compatibility diagram (F-path)")),
    ).toBe(true);
  });

  it("satisfies the residual G-diagram compatibility checks", () => {
    const residual = makeExample13ResidualInteractionLaw();
    const witness = residualLawCompatibilityWithG(residual, { sampleLimit: 6 });
    const checkedObjects = witness.objects.filter((entry) => entry.checked > 0);
    expect(checkedObjects.length).toBeGreaterThan(0);
    expect(checkedObjects.every((entry) => entry.mismatches === 0)).toBe(true);
    expect(
      witness.diagnostics.some((line) => line.includes("Residual compatibility diagram (G-path)")),
    ).toBe(true);
  });
});

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

  it("summarizes residual oracle results", () => {
    const summary = summarizeResidualRunnerOracles([
      {
        registryPath: "runner.residual.morphism",
        holds: true,
        details: [],
        diagnostics: { residualSquare: { checked: 2, mismatches: 0 } },
      },
      {
        registryPath: "runner.residual.interaction",
        holds: false,
        details: [],
        diagnostics: {
          theta: { label: "θ", checked: 3, mismatches: 1, details: [] },
          eta: { label: "η", checked: 2, mismatches: 0, details: [] },
          mu: { label: "μ", checked: 1, mismatches: 0, details: [] },
        },
      },
      { registryPath: "runner.costate", holds: true, details: [] },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.uniqueRegistryPaths).toEqual([
      "runner.residual.interaction",
      "runner.residual.morphism",
    ]);
    expect(summary.residualSquareTotals).toEqual({ checked: 2, mismatches: 0 });
    expect(summary.diagramTotals?.theta.mismatches).toBe(1);
    expect(summary.diagramTotals?.eta.checked).toBe(2);
    expect(summary.notes.some((note) => note.includes("residual oracle"))).toBe(true);
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
    const thetaWitness = { diagram: "theta", objects: [], diagnostics: [], counterexamples: [] } as const;
    const etaWitness = { diagram: "eta", objects: [], diagnostics: [], counterexamples: [] } as const;
    const muWitness = { diagram: "mu", objects: [], diagnostics: [], counterexamples: [] } as const;
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
    const thetaWitness = { diagram: "theta", objects: [], diagnostics: ["law theta witness"], counterexamples: [] } as const;
    const etaWitness = { diagram: "eta", objects: [], diagnostics: ["law eta witness"], counterexamples: [] } as const;
    const muWitness = { diagram: "mu", objects: [], diagnostics: ["law mu witness"], counterexamples: [] } as const;
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
      counterexamples: [],
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
    const aggregate = summarizeResidualInteractionLaw(residualLaw);
    expect(aggregate.mismatches).toHaveLength(1);
    expect(Array.isArray(aggregate.counterexamples)).toBe(true);
    expect(aggregate.counterexamples.length).toBe(0);
    expect(aggregate.counterexampleSummary.total).toBe(0);
    expect(aggregate.counterexampleSummary.byOrigin.law).toBe(0);
    expect(aggregate.counterexampleSummary.byOrigin.runner).toBe(0);
    expect(aggregate.mismatches[0]).toEqual(
      expect.objectContaining({
        diagram: "eta",
        object: String(badObject),
        mismatches: 1,
      }),
    );
    expect(
      aggregate.diagnostics.some((line) =>
        line.includes("Residual law mismatch diagram=eta"),
      ),
    ).toBe(true);
    expect(aggregate.hasRho).toBe(false);
  });

  it("checks residual interaction laws and surfaces mismatch failures", () => {
    const badObject = law.law.kernel.base.objects[0] as Obj;
    const etaWitness: ResidualDiagramWitness<Obj> = {
      diagram: "eta",
      objects: [
        {
          object: badObject,
          checked: 1,
          mismatches: 2,
          diagnostics: ["η comparison mismatch"],
        },
      ],
      diagnostics: ["law eta witness mismatch"],
      counterexamples: [],
    };
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualCheckMismatch",
      residualFunctor,
      etaWitness,
    });
    const runnerFromLaw = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw);
    const result = checkResidualInteractionLaw(residualLaw, {
      runner: runnerFromLaw,
      interaction: law,
    });
    expect(result.holds).toBe(false);
    expect(result.aggregate.mismatches).toHaveLength(1);
    const firstMismatch = result.aggregate.mismatches[0]!;
    expect(firstMismatch.object).toBe(String(badObject));
    expect(result.notes.some((note) => note.includes("holds=false"))).toBe(true);
    expect(result.zeroResidual).toBeUndefined();
  });

  it("summarises residual law compatibility diagnostics", () => {
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualCompatibility",
      residualFunctor,
    });
    const runnerFromLaw = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw);
    const aggregate = summarizeResidualInteractionLaw(residualLaw, {
      runner: runnerFromLaw,
      interaction: law,
      sampleLimit: 4,
    });
    expect(aggregate.compatibility).toBeDefined();
    expect((aggregate.compatibility?.length ?? 0) > 0).toBe(true);
    expect(aggregate.compatibilitySummary).toBeDefined();
    expect(aggregate.compatibilitySummary?.total).toBeGreaterThan(0);
    expect(
      Object.keys(aggregate.compatibilitySummary?.byLabel ?? {}).length,
    ).toBeGreaterThan(0);
    expect(Array.isArray(aggregate.mismatches)).toBe(true);
    expect(Array.isArray(aggregate.counterexamples)).toBe(true);
    expect(aggregate.mismatches.length).toBe(0);
    expect(aggregate.counterexampleSummary.total).toBe(0);
    expect(
      aggregate.diagnostics.some((line) =>
        line.includes("Residual law compatibility theta mismatches"),
      ),
    ).toBe(true);
    expect(
      aggregate.diagnostics.some((line) =>
        line.includes("Residual law compatibility summary total="),
      ),
    ).toBe(true);
    expect(aggregate.hasRho).toBe(false);
  });

  it("packages residual monad–comonad interaction metadata", () => {
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualPackaged",
      residualFunctor,
      rho: {
        description: "Test ρ matches residual lift",
        evaluate: (
          object: Obj,
          sample: readonly [
            IndexedElement<Obj, any>,
            IndexedElement<Obj, any>,
          ],
        ) => ({
          kind: "residual.lifted",
          object,
          baseValue: law.law.evaluate(sample[0] as never, sample[1] as never),
          left: sample[0].element,
          right: sample[1].element,
        }),
      },
    });
    const packaged = makeResidualMonadComonadInteractionLaw(law, residualLaw, {
      metadata: ["ResidualMonadComonad"],
      check: true,
    });
    expect(packaged.interaction).toBe(law);
    expect(packaged.residual).toBe(residualLaw);
    expect(packaged.aggregate.residualMonadName).toBe("ResidualPackaged");
    expect(packaged.metadata).toBeDefined();
    expect(packaged.metadata).toContain("ResidualMonadComonad");
    expect(packaged.diagnostics.some((line) => line.includes("residual law check holds"))).toBe(
      true,
    );
    expect(packaged.residualCheck?.holds).toBe(true);
    expect(packaged.compatibilitySummary).toBeDefined();
    expect(packaged.compatibilitySummary?.total).toBeGreaterThan(0);
    expect(packaged.compatibility?.length ?? 0).toBeGreaterThan(0);
  });

  it("derives residual ρ from runner samples", () => {
    const residualRunner = makeResidualStatefulRunner(baseRunner, {
      residualFunctor,
    });
    const derivedLaw = makeResidualInteractionLawFromRunner(
      law.law,
      residualRunner,
      {
        residualMonadName: "ResidualDerived",
        includeRunnerDiagnostics: true,
        rhoDescription: "derived from runner for regression",
      },
    );
    expect(derivedLaw.rho).toBeDefined();
    const iterator = residualRunner.residualThetas.entries().next();
    if (iterator.done) throw new Error("residual θ components missing");
    const [object, thetaComponent] = iterator.value as [
      Obj,
      ResidualThetaComponent<Obj, any, any, any>,
    ];
    const fiber = law.psiComponents.get(object);
    if (!fiber) throw new Error("missing ψ fiber for residual law test");
    const leftSemantics = getCarrierSemantics(fiber.primalFiber);
    const rightSemantics = getCarrierSemantics(fiber.dualFiber);
    const leftSample =
      leftSemantics?.iterate().next().value ??
      (() => {
        if (typeof (fiber.primalFiber as Iterable<unknown>)[Symbol.iterator] === "function") {
          for (const value of fiber.primalFiber as Iterable<unknown>) {
            return value;
          }
        }
        throw new Error("no left residual samples available");
      })();
    const rightSample =
      rightSemantics?.iterate().next().value ??
      (() => {
        if (typeof (fiber.dualFiber as Iterable<unknown>)[Symbol.iterator] === "function") {
          for (const value of fiber.dualFiber as Iterable<unknown>) {
            return value;
          }
        }
        throw new Error("no right residual samples available");
      })();
    const sample: readonly [
      IndexedElement<Obj, any>,
      IndexedElement<Obj, any>
    ] = [
      leftSample as IndexedElement<Obj, any>,
      rightSample as IndexedElement<Obj, any>,
    ];
    const rhoValue = derivedLaw.rho?.evaluate(object, sample);
    const thetaValue = thetaComponent.evaluate(sample);
    expect(rhoValue).toEqual(thetaValue);
    const aggregate = summarizeResidualInteractionLaw(derivedLaw, {
      runner: residualRunner,
      interaction: law,
      sampleLimit: 4,
    });
    expect(aggregate.hasRho).toBe(true);
    expect(aggregate.rhoDescription).toContain("derived from runner");
    expect(
      aggregate.diagnostics.some((line) =>
        line.includes("Residual runner diagnostic") ||
        line.includes("Residual law compatibility"),
      ),
    ).toBe(true);
  });

  it("records residual law counterexamples when runner evaluation fails", () => {
    const failingFunctor: ResidualFunctorSummary<any, any, any, any> = {
      ...residualFunctor,
      name: "FailingResidual",
      lift: () => {
        throw new Error("forced residual evaluation failure");
      },
    };
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualCounterexample",
      residualFunctor: failingFunctor,
    });
    const residualRunner = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw, {
      diagnostics: ["counterexample residual runner"],
    });
    const aggregate = summarizeResidualInteractionLaw(residualLaw, {
      runner: residualRunner,
      interaction: law,
      sampleLimit: 2,
    });
    expect(aggregate.counterexamples.length).toBeGreaterThan(0);
    expect(
      aggregate.counterexamples.some((entry) => entry.origin === "runner"),
    ).toBe(true);
    expect(
      aggregate.counterexamples.some((entry) =>
        entry.description.includes("evaluation error"),
      ),
    ).toBe(true);
    expect(aggregate.counterexampleSummary.total).toBe(
      aggregate.counterexamples.length,
    );
    expect(aggregate.counterexampleSummary.byOrigin.runner).toBe(
      aggregate.counterexamples.filter((entry) => entry.origin === "runner").length,
    );
    expect(aggregate.counterexampleSummary.notes.some((note) =>
      note.includes("total="),
    )).toBe(true);
    expect(aggregate.hasRho).toBe(false);
  });

  it("records residual ρ evaluator metadata when provided", () => {
    const rho: ResidualInteractionLawRho<any, any, any, any> = {
      description: "sample ρ evaluator",
      evaluate: (object, sample) => ({
        object,
        left: sample[0].element,
        right: sample[1].element,
      }),
      diagnostics: ["ρ evaluator registered"],
    };
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualRho",
      residualFunctor,
      rho,
    });
    const aggregate = summarizeResidualInteractionLaw(residualLaw);
    expect(aggregate.hasRho).toBe(true);
    expect(aggregate.rhoDescription).toBe("sample ρ evaluator");
    expect(aggregate.rhoDiagnostics).toEqual(
      expect.arrayContaining(["ρ evaluator registered"]),
    );
    expect(
      aggregate.diagnostics.some((line) =>
        line.includes("Residual ρ description: sample ρ evaluator"),
      ),
    ).toBe(true);
  });

  it("tracks Kleisli-pure relaxation requests in residual aggregates", () => {
    const residualLaw = makeResidualInteractionLaw(law.law, {
      residualMonadName: "ResidualRelaxed",
      residualFunctor,
    });
    const aggregate = summarizeResidualInteractionLaw(residualLaw, {
      pureMapRelaxation: true,
    });
    expect(aggregate.pureMapRelaxation).toBe(true);
    expect(
      aggregate.diagnostics.some((line) =>
        line.includes("Kleisli-pure relaxation"),
      ),
    ).toBe(true);
  });

  describe("Example 6 residual maybe functor (R X = X + E)", () => {
    type Example6ResidualMaybe =
      | { readonly kind: "ok"; readonly value: unknown }
      | { readonly kind: "error"; readonly reason: string; readonly sampleKey: string };

    type Example6Left = typeof baseRunner extends StatefulRunner<Obj, infer L, any, any> ? L : never;
    type Example6Right = typeof baseRunner extends StatefulRunner<Obj, any, infer R, any> ? R : never;
    type Example6Value = typeof baseRunner extends StatefulRunner<Obj, any, any, infer V> ? V : never;

    const encodeSample = (
      sample: readonly [IndexedElement<Obj, Example6Left>, IndexedElement<Obj, Example6Right>],
    ): string =>
      JSON.stringify({
        left: { object: String(sample[0].object), element: sample[0].element },
        right: { object: String(sample[1].object), element: sample[1].element },
      });

    const isExample6ResidualMaybe = (candidate: unknown): candidate is Example6ResidualMaybe => {
      if (typeof candidate !== "object" || candidate === null || !("kind" in candidate)) {
        return false;
      }
      const kind = (candidate as { kind?: unknown }).kind;
      if (kind === "ok") {
        return "value" in (candidate as { value?: unknown });
      }
      if (kind === "error") {
        const reason = (candidate as { reason?: unknown }).reason;
        const sampleKey = (candidate as { sampleKey?: unknown }).sampleKey;
        return typeof reason === "string" && typeof sampleKey === "string";
      }
      return false;
    };

    const makeExample6ResidualMaybeFunctor = (): ResidualFunctorSummary<
      Obj,
      Example6Left,
      Example6Right,
      Example6Value
      > => ({
        name: "Example6ResidualMaybe",
        description: "R X = X + E with parity-triggered residual errors.",
        metadata: ["example6 residual maybe (X + E)"],
        objectCarrier: (object) =>
          SetCat.lazyObj<Example6ResidualMaybe>({
            semantics: {
              iterate: function* iterate() {
                yield { kind: "error", reason: "placeholder", sampleKey: "[]" } as const;
              },
              has: isExample6ResidualMaybe,
              equals: (left, right) => JSON.stringify(left) === JSON.stringify(right),
              tag: `Example6ResidualMaybe(${String(object)})`,
            },
          }),
        lift: (context) => {
          const sampleKey = encodeSample(context.sample);
          const baseValue = context.baseValue ?? context.baseTheta?.map(context.sample);
          if (baseValue === undefined) {
            return {
              kind: "error",
              reason: "base θ evaluation unavailable",
              sampleKey,
            };
          }
          const leftElement = context.sample[0].element;
          if (
            Array.isArray(leftElement) &&
            typeof leftElement[0] === "number" &&
            leftElement[0] === 1
          ) {
            return {
              kind: "error",
              reason: "writer parity triggered residual branch",
              sampleKey,
            };
          }
          return { kind: "ok", value: baseValue };
        },
        describeEvaluation: (
          context: ResidualThetaEvaluationContext<Obj, Example6Left, Example6Right, Example6Value> & {
            readonly residualValue: unknown;
          },
        ) => {
          const residualValue = context.residualValue as Example6ResidualMaybe;
          return [
            `example6 residual maybe: sample=${encodeSample(
              context.sample,
            )} outcome=${residualValue.kind}`,
          ];
        },
    });

    it("produces both ok and error branches while sampling residual θ", () => {
      const maybeResidualFunctor = makeExample6ResidualMaybeFunctor();
      const residualRunner = makeResidualStatefulRunner(baseRunner, {
        residualFunctor: maybeResidualFunctor,
        diagnostics: ["example6 residual maybe"],
      });
      const seenKinds = new Set<string>();
      for (const [object, residualTheta] of residualRunner.residualThetas.entries()) {
        const thetaHom = baseRunner.thetaHom.get(object);
        if (!thetaHom) continue;
        for (const sample of thetaHom.dom as SetObj<
          readonly [IndexedElement<Obj, Example6Left>, IndexedElement<Obj, Example6Right>]
        >) {
          const residualValue = residualTheta.evaluate(sample);
          if (
            typeof residualValue === "object" &&
            residualValue !== null &&
            "kind" in residualValue
          ) {
            seenKinds.add(String((residualValue as { kind: unknown }).kind));
          }
        }
      }
      expect(seenKinds.has("ok")).toBe(true);
      expect(seenKinds.has("error")).toBe(true);
    });

    it("registers residual interaction oracle success for R X = X + E", () => {
      const maybeResidualFunctor = makeExample6ResidualMaybeFunctor();
      const residualLaw = makeResidualInteractionLaw(law.law, {
        residualMonadName: "Example6 Maybe Residual",
        notes: ["Example6 residual maybe (X + E)"],
        residualFunctor: maybeResidualFunctor,
      });
      const residualRunner = makeResidualRunnerFromInteractionLaw(baseRunner, law, residualLaw, {
        diagnostics: ["example6 residual maybe via law"],
      });
      const oracle = RunnerOracles.residualInteraction(residualRunner, law, residualLaw, {
        sampleLimit: 6,
      });
      expect(oracle.registryPath).toBe("runner.residual.interaction");
      expect(oracle.holds).toBe(true);
      expect(
        (oracle.diagnostics as {
          theta: { mismatches: number };
          eta: { mismatches: number };
          mu: { mismatches: number };
        }).theta.mismatches,
      ).toBe(0);
    });

    it("detects zero residual carriers during residual law checks", () => {
      const zeroResidualFunctor: ResidualFunctorSummary<any, any, any, any> = {
        name: "ZeroResidual",
        description: "residual functor collapsing to the initial object",
        objectCarrier: () => SetCat.initial().object,
      };
      const zeroRunner = makeResidualStatefulRunner(baseRunner, {
        residualFunctor: zeroResidualFunctor,
      });
      const zeroLaw = makeResidualInteractionLawFromRunner(law.law, zeroRunner, {
        residualMonadName: "ZeroResidual",
      });
      const result = checkResidualInteractionLaw(zeroLaw, {
        runner: zeroRunner,
        interaction: law,
        inspectObjects: zeroRunner.residualThetas.keys(),
      });
      expect(result.holds).toBe(true);
      expect(result.zeroResidual).toBe(true);
      expect(result.aggregate.residualFunctorName).toBe("ZeroResidual");
      expect(result.notes.some((note) => note.includes("zero"))).toBe(true);
    });
  });
});

describe("Residual interaction law constructors", () => {
  const interaction = makeExample6MonadComonadInteractionLaw();
  const baseLaw = interaction.law;
  type Obj = (typeof baseLaw.kernel.base.objects)[number];

  const residualFunctor: ResidualFunctorSummary<any, any, any, any> = {
    name: "ComponentResidual",
    description: "Component-based residual functor",
    objectCarrier: () => SetCat.obj([]),
  };

  it("constructs residual laws from explicit ρ components", () => {
    const rhoComponents: ResidualInteractionLawRhoComponent<Obj, any, any, any>[] =
      baseLaw.kernel.base.objects.map((object) => ({
        object,
        evaluate: (sample) => ({
          tag: "constructed-rho",
          object,
          left: sample[0].object,
          right: sample[1].object,
        }),
        diagnostics: [`ρ component registered for ${String(object)}`],
        metadata: ["explicit component"],
      }));
    const residual = constructResidualInteractionLaw({
      law: baseLaw,
      residualFunctor,
      rhoComponents,
      residualMonadName: "R_constructed",
      notes: ["manual residual ρ components"],
    });
    expect(residual.residualMonadName).toBe("R_constructed");
    if (!residual.rho) throw new Error("constructed residual law lacks ρ evaluator");
    const [object] = baseLaw.kernel.base.objects;
    if (!object) throw new Error("Example 6 kernel has no objects");
    const left = findIndexedElement(baseLaw.primalCarrier, object);
    const right = findIndexedElement(baseLaw.dualCarrier, object);
    const value = residual.rho.evaluate(object, [left, right]) as Record<string, unknown>;
    expect(value).toEqual(expect.objectContaining({ tag: "constructed-rho", object }));
    expect(
      residual.diagnostics.some((line) =>
        line.includes("manual residual ρ components"),
      ),
    ).toBe(true);
  });

  it("lifts ordinary interaction laws to identity residuals", () => {
    const lifted = liftInteractionLawToResidual(baseLaw, {
      residualMonadName: "IdResidual",
      notes: ["lifted from ψ"],
    });
    expect(lifted.residualFunctor.name).toBe("IdResidual");
    const [object] = baseLaw.kernel.base.objects;
    if (!object) throw new Error("Example 6 kernel has no objects");
    const left = findIndexedElement(baseLaw.primalCarrier, object);
    const right = findIndexedElement(baseLaw.dualCarrier, object);
    if (!lifted.rho) throw new Error("lifted residual law lacks ρ evaluator");
    const rhoValue = lifted.rho.evaluate(object, [left, right]);
    const psiValue = baseLaw.evaluate(left, right);
    expect(rhoValue).toEqual(psiValue);
    expect(
      lifted.diagnostics.some((line) =>
        line.includes("Residual interaction law lifted from ordinary interaction law"),
      ),
    ).toBe(true);
  });
});

describe("Residual monad–comonad interactions", () => {
  const interaction = makeExample6MonadComonadInteractionLaw();

  it("detects identity residuals as ordinary interactions", () => {
    const residual = liftInteractionLawToResidual(interaction.law, {
      residualMonadName: "IdentityResidual",
    });
    const packaged = makeResidualMonadComonadInteraction(interaction, residual);
    expect(packaged.reducesToOrdinary).toBe(true);
    expect(packaged.ordinaryInteraction).toBe(interaction);
    expect(
      packaged.diagnostics.some((line) =>
        line.includes("residual functor identified as identity"),
      ),
    ).toBe(true);
  });

  it("retains non-identity residual diagnostics", () => {
    const residual = makeExample13ResidualInteractionLaw();
    const packaged = makeResidualMonadComonadInteraction(interaction, residual);
    expect(packaged.reducesToOrdinary).toBe(false);
    expect(packaged.ordinaryInteraction).toBeUndefined();
    expect(packaged.aggregate.residualFunctorName).not.toContain("Identity");
  });
});
