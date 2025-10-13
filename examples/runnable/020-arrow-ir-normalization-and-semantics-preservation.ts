import type { RunnableExample } from "./types";
import type { ArrowPlan } from "./arrow-ir";
import { arr, compose, describeNode, denote, fanout, first, idArrow, parallel, second } from "./arrow-ir";

/**
 * Stage 020 rebuilds the Arrow IR normalisation story.  The module flattens
 * nested compositions, removes identity artefacts, and ensures that the
 * denotation of the normalised plan matches the original plan on representative
 * inputs.  A secondary example shows that functorial rewrites remain stable
 * under the same normaliser.
 */

type NormalisationReport<A, B> = {
  readonly plan: ArrowPlan<A, B>;
  readonly steps: ReadonlyArray<string>;
};

function flatten(plan: ArrowPlan<unknown, unknown>): ReadonlyArray<ArrowPlan<unknown, unknown>> {
  if (plan.kind === "compose") {
    return [
      ...flatten(plan.first as ArrowPlan<unknown, unknown>),
      ...flatten(plan.second as ArrowPlan<unknown, unknown>),
    ];
  }
  return [plan];
}

function rebuild<A, B>(nodes: ReadonlyArray<ArrowPlan<unknown, unknown>>): ArrowPlan<A, B> {
  if (nodes.length === 0) {
    return idArrow("collapsed") as ArrowPlan<A, B>;
  }

  const rebuilt = nodes.reduceRight<ArrowPlan<unknown, unknown> | undefined>((acc, node) => {
    if (!acc) {
      return node;
    }
    return compose(acc, node);
  }, undefined);

  return (rebuilt ?? idArrow("collapsed")) as ArrowPlan<A, B>;
}

function normalise<A, B>(plan: ArrowPlan<A, B>): NormalisationReport<A, B> {
  switch (plan.kind) {
    case "compose": {
      const left = normalise(plan.first as ArrowPlan<A, unknown>);
      const right = normalise(plan.second as ArrowPlan<unknown, B>);
      const flattened = [...flatten(left.plan as ArrowPlan<unknown, unknown>), ...flatten(right.plan as ArrowPlan<unknown, unknown>)];
      const filtered = flattened.filter((node) => node.kind !== "id");
      const rebuilt = rebuild<A, B>(filtered);
      const stepSummary = filtered.length === flattened.length
        ? `Collapsed composition of ${flattened.length} nodes.`
        : `Removed ${flattened.length - filtered.length} identity node(s) before collapsing.`;
      return {
        plan: rebuilt,
        steps: [...left.steps, ...right.steps, stepSummary],
      };
    }
    case "first": {
      const inner = normalise(plan.inner as ArrowPlan<unknown, unknown>);
      return {
        plan: first(inner.plan as ArrowPlan<unknown, unknown>, plan.label) as ArrowPlan<A, B>,
        steps: [...inner.steps, `Normalised inner plan for ${plan.label}.`],
      };
    }
    case "second": {
      const inner = normalise(plan.inner as ArrowPlan<unknown, unknown>);
      return {
        plan: second(inner.plan as ArrowPlan<unknown, unknown>, plan.label) as ArrowPlan<A, B>,
        steps: [...inner.steps, `Normalised inner plan for ${plan.label}.`],
      };
    }
    case "parallel": {
      const left = normalise(plan.left as ArrowPlan<unknown, unknown>);
      const right = normalise(plan.right as ArrowPlan<unknown, unknown>);
      return {
        plan: parallel(left.plan as ArrowPlan<unknown, unknown>, right.plan as ArrowPlan<unknown, unknown>, plan.label) as ArrowPlan<
          A,
          B
        >,
        steps: [...left.steps, ...right.steps, `Normalised parallel components for ${plan.label}.`],
      };
    }
    case "fanout": {
      const left = normalise(plan.left as ArrowPlan<unknown, unknown>);
      const right = normalise(plan.right as ArrowPlan<unknown, unknown>);
      return {
        plan: fanout(left.plan as ArrowPlan<unknown, unknown>, right.plan as ArrowPlan<unknown, unknown>, plan.label) as ArrowPlan<A, B>,
        steps: [...left.steps, ...right.steps, `Normalised fanout branches for ${plan.label}.`],
      };
    }
    default:
      return { plan, steps: [] };
  }
}

function describeSequence(plan: ArrowPlan<unknown, unknown>): string {
  const nodes = flatten(plan);
  if (nodes.length === 0) {
    return "<empty>";
  }
  return nodes.map((node) => describeNode(node)).join(" ∘ ");
}

export const arrowIrNormalizationAndSemanticsPreservation: RunnableExample = {
  id: "020",
  title: "Arrow IR normalization and semantics preservation",
  outlineReference: 20,
  summary:
    "Flattens Arrow IR compositions, removes identity artefacts, and verifies that denotations are preserved for complex and functorial pipelines.",
  async run() {
    const lift = arr((value: number) => value + 1, "inc");
    const scale = arr((value: number) => value * 3, "triple");
    const negate = arr((value: number) => -value, "neg");
    const describe = arr((value: number) => `total=${value}`, "show");
    const pairUp = fanout(lift, scale, "fanout(inc,triple)");
    const sum = arr((pair: readonly [number, number]) => pair[0] + pair[1], "sum");
    const negateThenDescribe = compose(describe, negate, "show ∘ neg");

    const numberIdentity = idArrow<number>("identity");
    const pairWithIdentity = compose<number, number, readonly [number, number]>(pairUp, numberIdentity);
    const sumAfterPair = compose(sum, pairWithIdentity);
    const complexPlan = compose(negateThenDescribe, sumAfterPair);

    const normalised = normalise(complexPlan);

    const originalOutput = denote(complexPlan)(5);
    const normalisedOutput = denote(normalised.plan)(5);

    const complexLogs = [
      "== Arrow IR normalisation (complex pipeline) ==",
      `Original sequence: ${describeSequence(complexPlan as ArrowPlan<unknown, unknown>)}`,
      `Normalised sequence: ${describeSequence(normalised.plan as ArrowPlan<unknown, unknown>)}`,
      `Original output @5: ${originalOutput}`,
      `Normalised output @5: ${normalisedOutput}`,
      `Outputs identical: ${originalOutput === normalisedOutput}`,
      ...normalised.steps.map((step, index) => `Step ${index + 1}: ${step}`),
    ];

    const functorialBase = arr((value: number) => value * 2, "double");
    const functorialInner = first<number, number, string>(functorialBase, "first double");
    const tupleIdentity = idArrow<readonly [number, string]>("identity");
    const functorialPrep = compose<
      readonly [number, string],
      readonly [number, string],
      readonly [number, string]
    >(functorialInner, tupleIdentity);
    const functorialComposite = compose(
      parallel(functorialBase, arr<string, string>((text) => text.toUpperCase(), "upper")),
      functorialPrep,
    );

    const functorialNormalised = normalise(functorialComposite);

    const functorialInput: readonly [number, string] = [4, "ok"];
    const functorialOriginal = denote(functorialComposite)(functorialInput);
    const functorialNormalisedOutput = denote(functorialNormalised.plan)(functorialInput);

    const functorialLogs = [
      "== Arrow IR normalisation (functorial pipeline) ==",
      `Original sequence: ${describeSequence(functorialComposite as ArrowPlan<unknown, unknown>)}`,
      `Normalised sequence: ${describeSequence(functorialNormalised.plan as ArrowPlan<unknown, unknown>)}`,
      `Original output @[${functorialInput.join(", ")}] = ${JSON.stringify(functorialOriginal)}`,
      `Normalised output @[${functorialInput.join(", ")}] = ${JSON.stringify(functorialNormalisedOutput)}`,
      `Outputs identical: ${JSON.stringify(functorialOriginal) === JSON.stringify(functorialNormalisedOutput)}`,
      ...functorialNormalised.steps.map((step, index) => `Step ${index + 1}: ${step}`),
    ];

    return { logs: [...complexLogs, ...functorialLogs] };
  },
};
