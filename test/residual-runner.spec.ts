import { describe, it, expect } from "vitest";
import {
  makeExample6MonadComonadInteractionLaw,
  buildRunnerFromInteraction,
  makeResidualStatefulRunner,
  residualRunnerToMonadMap,
} from "../allTS";
import { getCarrierSemantics } from "../set-cat";
import type {
  ResidualFunctorSummary,
  ResidualThetaEvaluationContext,
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
});
