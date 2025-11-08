import type { RunnableExample, RunnableOutcome } from "./types";
import { makeMonadComonadInteractionLaw } from "../../monad-comonad-interaction-law";
import { buildRunnerFromInteraction, buildRunnerLawReport, prettyPrintRunnerThetas } from "../../stateful-runner";
import { makeFunctorInteractionLaw, makeFunctorInteractionLawOperations } from "../../functor-interaction-law";
import { promonoidalKernelFromStrictMonoidal, type PromonoidalKernel } from "../../promonoidal-structure";
import { dayTensor } from "../../day-convolution";
import { SetCat, type SetObj, type SetHom } from "../../set-cat";
import { constructFunctorWithWitness } from "../../functor";
import { constructContravariantFunctorWithWitness } from "../../contravariant";
import { constructNaturalTransformationWithWitness } from "../../natural-transformation";
import { setSimpleCategory } from "../../set-simple-category";
import type { SimpleCat } from "../../simple-cat";

// Minimal synthetic interaction law ingredients for demonstration purposes.
// We build a tiny strict monoidal single-object category with object "•".

// Objects: single object category
type Obj = "•";
interface Arr { readonly dom: Obj; readonly cod: Obj }
const ID: Arr = { dom: "•", cod: "•" };
const simpleCategory: SimpleCat<Obj, Arr> = {
  id: () => ID,
  compose: () => ID,
  src: (a) => a.dom,
  dst: (a) => a.cod,
};
const objects: ReadonlyArray<Obj> = ["•"];
const arrows: ReadonlyArray<Arr> = [ID];

// Carriers with numeric payload widened at law level to unknown for structural alignment.
const leftCarrier: SetObj<unknown> = SetCat.obj([1, 2] as const);
const rightCarrier: SetObj<unknown> = SetCat.obj([10, 20] as const);
const valueCarrier: SetObj<boolean> = SetCat.obj([false, true] as const);

const setCatUnknown = setSimpleCategory; // Unified Set objects category (unknown payload)

const buildConstantFunctorUnknown = (carrier: SetObj<unknown>) =>
  constructFunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>(
    simpleCategory,
    setCatUnknown,
    {
      F0: () => carrier,
      F1: () => SetCat.id(carrier),
    },
    { objects, arrows },
    ["ConstantFunctorUnknown"],
  );

const leftCovariant = buildConstantFunctorUnknown(leftCarrier);
// For the interaction law we need a contravariant left functor over numbers.
const leftFunctor = constructContravariantFunctorWithWitness(
  simpleCategory,
  setCatUnknown,
  leftCovariant.functor,
  { objects, arrows },
  ["LeftContravariant"],
);
const rightFunctor = buildConstantFunctorUnknown(rightCarrier);

// Build a strict monoidal structure (tensor/unit both identity on the single object)
const strictMonoidalKernel: PromonoidalKernel<Obj, Arr> = promonoidalKernelFromStrictMonoidal<Obj, Arr>({
  category: {
    ...simpleCategory,
    objects,
    arrows,
    eq: (x, y) => Object.is(x.dom, y.dom) && Object.is(x.cod, y.cod),
  },
  tensorObject: () => "•",
  tensorArrow: () => ID,
  unitObject: "•",
});

// Operations: tag metadata only (no actual monad/comonad ops supplied for the law)
const lawOperations = makeFunctorInteractionLawOperations<Obj, Arr>({ metadata: ["SyntheticEvaluateAddition"] });

// Build convolution and trivial pairing/aggregate over booleans
const convolution = dayTensor(strictMonoidalKernel, leftFunctor, rightFunctor);
const law = makeFunctorInteractionLaw<Obj, Arr, unknown, unknown, boolean>({
  kernel: strictMonoidalKernel,
  left: leftFunctor,
  right: rightFunctor,
  convolution,
  dualizing: valueCarrier,
  pairing: (_object: Obj, carrier: ReturnType<typeof convolution.functor.functor.F0>) =>
    SetCat.hom(carrier, valueCarrier, () => true),
  aggregate: (contributions) => contributions.some((c) => c.evaluation),
  operations: lawOperations,
});

// Trivial monad/comonad: reuse left/right functors; unit/multiplication are identity-like.
// Monad/comonad expect SetObj<unknown>; widen carriers via SetObj<unknown> upcast.
const monadUnit = constructNaturalTransformationWithWitness(leftCovariant, leftCovariant, () => SetCat.id(leftCarrier));
const monadMult = constructNaturalTransformationWithWitness(leftCovariant, leftCovariant, () => SetCat.id(leftCarrier));
const monad = { functor: leftCovariant, unit: monadUnit, multiplication: monadMult };

const comonadCounit = constructNaturalTransformationWithWitness(rightFunctor, rightFunctor, () => SetCat.id(rightCarrier));
const comonadComult = constructNaturalTransformationWithWitness(rightFunctor, rightFunctor, () => SetCat.id(rightCarrier));
const comonad = { functor: rightFunctor, counit: comonadCounit, comultiplication: comonadComult } as const;

const interaction = makeMonadComonadInteractionLaw({ monad, comonad, law });

export const statefulRunnerLawReport: RunnableExample = {
  id: "103",
  outlineReference: 103,
  title: "Phase IV Stateful Runner Law Report",
  summary: "Build a minimal interaction law, derive a stateful runner, and aggregate unified law diagnostics.",
  tags: ["phase-iv", "runner", "law-report"],
  async run(): Promise<RunnableOutcome> {
    const runner = buildRunnerFromInteraction(interaction);
    const thetaLines = prettyPrintRunnerThetas(runner, { computeIfMissing: true });
    const report = buildRunnerLawReport(runner, interaction, { includeFinite: true, sampleLimit: 8, evaluationSampleLimit: 8 });
    const logs: string[] = [];
    logs.push("θ summary:");
    logs.push(...thetaLines.map((l) => `  ${l}`));
    logs.push("Unified law report:");
    logs.push(`  holds=${report.holds}`);
    logs.push(`  unit: checked=${report.unitChecked} mismatches=${report.unitMismatches}`);
    logs.push(`  mult: checked=${report.multChecked} mismatches=${report.multMismatches}`);
    logs.push(`  currying: checked=${report.curryingChecked} mismatches=${report.curryingMismatches}`);
    if (report.finiteFailures && report.finiteFailures.length > 0) {
      logs.push(`  finite failures=${report.finiteFailures.length}`);
    }
    if (report.thetaMissing.length > 0 || report.thetaExtra.length > 0) {
      logs.push(`  θ missing=${report.thetaMissing.length} extra=${report.thetaExtra.length}`);
    }
    for (const line of report.details.slice(0, 10)) {
      logs.push(`  detail: ${line}`);
    }
    return { logs };
  },
};
