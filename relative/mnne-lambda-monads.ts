import type { NonEmptyArray } from "../allTS";
import {
  createReplayableIterable,
  sliceLazyIterable,
  type LazyReplayableIterable,
  type LazySliceResult,
} from "./mnne-infinite-support";

export type LambdaTerm =
  | { readonly kind: "variable"; readonly index: number }
  | {
      readonly kind: "application";
      readonly func: LambdaTerm;
      readonly argument: LambdaTerm;
    }
  | { readonly kind: "abstraction"; readonly body: LambdaTerm };

export interface LambdaContextConfiguration {
  readonly size: number;
  readonly maxTermDepth: number;
}

export interface LambdaSubstitutionConfiguration {
  readonly source: number;
  readonly target: number;
  readonly maxTermDepth: number;
}

export interface LambdaSubstitution {
  readonly source: number;
  readonly target: number;
  readonly mapping: ReadonlyArray<LambdaTerm>;
}

export interface LambdaContextSummary {
  readonly size: number;
  readonly maxDepth: number;
  readonly termCount: number;
}

export interface LambdaSubstitutionSummary {
  readonly source: number;
  readonly target: number;
  readonly maxDepth: number;
  readonly substitutionCount: number;
}

export interface LambdaRelativeMonadWitness {
  readonly contexts: NonEmptyArray<LambdaContextConfiguration>;
  readonly substitutions: NonEmptyArray<LambdaSubstitutionConfiguration>;
  readonly customExtend?: (
    substitution: LambdaSubstitution,
    term: LambdaTerm,
  ) => LambdaTerm;
  readonly customCompose?: (
    tau: LambdaSubstitution,
    sigma: LambdaSubstitution,
  ) => LambdaSubstitution;
}

export interface LambdaRelativeMonadReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly contexts: ReadonlyArray<LambdaContextSummary>;
  readonly substitutions: ReadonlyArray<LambdaSubstitutionSummary>;
}

export type LambdaKleisliSplittingReport = LambdaRelativeMonadReport;

const variable = (index: number): LambdaTerm => ({
  kind: "variable",
  index,
});

const application = (func: LambdaTerm, argument: LambdaTerm): LambdaTerm => ({
  kind: "application",
  func,
  argument,
});

const abstraction = (body: LambdaTerm): LambdaTerm => ({
  kind: "abstraction",
  body,
});

const cloneTerm = (term: LambdaTerm): LambdaTerm => {
  switch (term.kind) {
    case "variable":
      return variable(term.index);
    case "application":
      return application(cloneTerm(term.func), cloneTerm(term.argument));
    case "abstraction":
      return abstraction(cloneTerm(term.body));
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
};

const termKey = (term: LambdaTerm): string => {
  switch (term.kind) {
    case "variable":
      return `v${term.index}`;
    case "application":
      return `a(${termKey(term.func)},${termKey(term.argument)})`;
    case "abstraction":
      return `l(${termKey(term.body)})`;
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
};

const termsEqual = (left: LambdaTerm, right: LambdaTerm): boolean => {
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case "variable":
      return left.index === (right as typeof left).index;
    case "application":
      return (
        termsEqual(left.func, (right as typeof left).func) &&
        termsEqual(left.argument, (right as typeof left).argument)
      );
    case "abstraction":
      return termsEqual(left.body, (right as typeof left).body);
    default: {
      const _exhaustive: never = left;
      return _exhaustive;
    }
  }
};

const isWellScoped = (term: LambdaTerm, contextSize: number): boolean => {
  switch (term.kind) {
    case "variable":
      return term.index >= 0 && term.index < contextSize;
    case "application":
      return (
        isWellScoped(term.func, contextSize) &&
        isWellScoped(term.argument, contextSize)
      );
    case "abstraction":
      return isWellScoped(term.body, contextSize + 1);
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
};

const shiftTerm = (term: LambdaTerm, amount: number, cutoff = 0): LambdaTerm => {
  switch (term.kind) {
    case "variable":
      return variable(term.index >= cutoff ? term.index + amount : term.index);
    case "application":
      return application(
        shiftTerm(term.func, amount, cutoff),
        shiftTerm(term.argument, amount, cutoff),
      );
    case "abstraction":
      return abstraction(shiftTerm(term.body, amount, cutoff + 1));
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
};

const defaultCompose = (
  extend: (substitution: LambdaSubstitution, term: LambdaTerm) => LambdaTerm,
) =>
  (tau: LambdaSubstitution, sigma: LambdaSubstitution): LambdaSubstitution => {
    if (sigma.target !== tau.source) {
      return {
        source: sigma.source,
        target: tau.target,
        mapping: sigma.mapping.map(cloneTerm),
      };
    }
    return {
      source: sigma.source,
      target: tau.target,
      mapping: sigma.mapping.map((component) => extend(tau, component)),
    };
  };

const defaultExtend = (
  substitution: LambdaSubstitution,
  term: LambdaTerm,
): LambdaTerm => {
  switch (term.kind) {
    case "variable": {
      const replacement = substitution.mapping[term.index];
      return replacement ? cloneTerm(replacement) : variable(term.index);
    }
    case "application":
      return application(
        defaultExtend(substitution, term.func),
        defaultExtend(substitution, term.argument),
      );
    case "abstraction": {
      const extendedMapping = [
        variable(0),
        ...substitution.mapping.map((component) =>
          shiftTerm(component, 1, 0),
        ),
      ];
      const extendedSubstitution: LambdaSubstitution = {
        source: substitution.source + 1,
        target: substitution.target + 1,
        mapping: extendedMapping,
      };
      return abstraction(defaultExtend(extendedSubstitution, term.body));
    }
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
};

const enumerateTerms = (() => {
  const cache = new Map<string, LambdaTerm[]>();

  const generate = (contextSize: number, depth: number): LambdaTerm[] => {
    const cacheKey = `${contextSize}|${depth}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached.map(cloneTerm);
    }

    const terms = new Map<string, LambdaTerm>();

    for (let index = 0; index < contextSize; index += 1) {
      const term = variable(index);
      terms.set(termKey(term), term);
    }

    if (depth > 0) {
      for (const body of generate(contextSize + 1, depth - 1)) {
        const term = abstraction(body);
        terms.set(termKey(term), term);
      }

      const subTerms = generate(contextSize, depth - 1);
      for (const left of subTerms) {
        for (const right of subTerms) {
          const term = application(left, right);
          terms.set(termKey(term), term);
        }
      }
    }

    const result = Array.from(terms.values(), cloneTerm);
    cache.set(cacheKey, result.map(cloneTerm));
    return result;
  };

  return generate;
})();

const enumerateSubstitutions = (
  config: LambdaSubstitutionConfiguration,
): LambdaSubstitution[] => {
  const { source, target, maxTermDepth } = config;
  const targetTerms = enumerateTerms(target, maxTermDepth);
  if (source === 0) {
    return [
      {
        source,
        target,
        mapping: [],
      },
    ];
  }
  const results: LambdaSubstitution[] = [];
  const current: LambdaTerm[] = Array.from({ length: source }, () => variable(0));

  const choose = (position: number) => {
    if (position === source) {
      results.push({
        source,
        target,
        mapping: current.map(cloneTerm),
      });
      return;
    }
    for (const candidate of targetTerms) {
      current[position] = candidate;
      choose(position + 1);
    }
  };

  choose(0);
  return results;
};

const identitySubstitution = (size: number): LambdaSubstitution => ({
  source: size,
  target: size,
  mapping: Array.from({ length: size }, (_, index) => variable(index)),
});

export const describeUntypedLambdaRelativeMonadWitness = (): LambdaRelativeMonadWitness => ({
  contexts: [
    { size: 0, maxTermDepth: 2 },
    { size: 1, maxTermDepth: 2 },
    { size: 2, maxTermDepth: 2 },
  ],
  substitutions: [
    { source: 0, target: 0, maxTermDepth: 1 },
    { source: 1, target: 1, maxTermDepth: 2 },
    { source: 1, target: 2, maxTermDepth: 2 },
    { source: 2, target: 1, maxTermDepth: 2 },
    { source: 2, target: 2, maxTermDepth: 2 },
  ],
});

export const analyzeUntypedLambdaRelativeMonad = (
  witness: LambdaRelativeMonadWitness,
): LambdaRelativeMonadReport => {
  const issues: string[] = [];

  const extend = witness.customExtend ?? defaultExtend;
  const compose = witness.customCompose ?? defaultCompose(extend);

  const contextDepths = new Map<number, number>();
  for (const context of witness.contexts) {
    if (context.size < 0) {
      issues.push(`Context size must be non-negative, received ${context.size}.`);
      continue;
    }
    if (context.maxTermDepth < 0) {
      issues.push(
        `Context depth for size ${context.size} must be non-negative, received ${context.maxTermDepth}.`,
      );
      continue;
    }
    const current = contextDepths.get(context.size) ?? 0;
    if (context.maxTermDepth > current) {
      contextDepths.set(context.size, context.maxTermDepth);
    }
  }

  const substitutionConfigs: LambdaSubstitutionSummary[] = [];
  const substitutionCatalog = witness.substitutions.map((config) => {
    if (!contextDepths.has(config.target)) {
      issues.push(
        `No context configuration provided for substitution target size ${config.target}.`,
      );
    }
    if (!contextDepths.has(config.source)) {
      issues.push(
        `No context configuration provided for substitution source size ${config.source}.`,
      );
    }
    if (config.maxTermDepth < 0) {
      issues.push(
        `Substitution (${config.source}→${config.target}) depth must be non-negative, received ${config.maxTermDepth}.`,
      );
    }
    const substitutions = enumerateSubstitutions(config);
    substitutionConfigs.push({
      source: config.source,
      target: config.target,
      maxDepth: config.maxTermDepth,
      substitutionCount: substitutions.length,
    });
    return { config, substitutions };
  });

  const contextSummaries: LambdaContextSummary[] = [];
  for (const [size, maxDepth] of contextDepths) {
    const terms = enumerateTerms(size, maxDepth);
    contextSummaries.push({
      size,
      maxDepth,
      termCount: terms.length,
    });
    for (const term of terms) {
      if (!isWellScoped(term, size)) {
        issues.push(`Term ${termKey(term)} is not well scoped for context ${size}.`);
      }
    }

    const identity = identitySubstitution(size);
    for (const term of terms) {
      const result = extend(identity, term);
      if (!termsEqual(result, term)) {
        issues.push(
          `Identity substitution failed for context ${size} on term ${termKey(term)}.`,
        );
      }
      if (!isWellScoped(result, size)) {
        issues.push(
          `Identity substitution produced ill-scoped term for context ${size}: ${termKey(result)}.`,
        );
      }
    }
  }

  for (const { config, substitutions } of substitutionCatalog) {
    const sourceDepth = contextDepths.get(config.source);
    if (sourceDepth === undefined) {
      continue;
    }
    const sourceTerms = enumerateTerms(config.source, sourceDepth);
    for (const substitution of substitutions) {
      if (substitution.mapping.length !== config.source) {
        issues.push(
          `Substitution (${config.source}→${config.target}) has incorrect arity ${substitution.mapping.length}.`,
        );
        continue;
      }
      for (const component of substitution.mapping) {
        if (!isWellScoped(component, config.target)) {
          issues.push(
            `Component ${termKey(component)} of substitution (${config.source}→${config.target}) is not well scoped for target ${config.target}.`,
          );
        }
      }

      for (const term of sourceTerms) {
        const extended = extend(substitution, term);
        if (!isWellScoped(extended, config.target)) {
          issues.push(
            `Extended term ${termKey(extended)} is not well scoped in context ${config.target}.`,
          );
        }
      }
    }
  }

  for (const { config: sigmaConfig, substitutions: sigmas } of substitutionCatalog) {
    for (const { config: tauConfig, substitutions: taus } of substitutionCatalog) {
      if (sigmaConfig.target !== tauConfig.source) {
        continue;
      }
      const sourceDepth = contextDepths.get(sigmaConfig.source);
      if (sourceDepth === undefined) {
        continue;
      }
      const sourceTerms = enumerateTerms(sigmaConfig.source, sourceDepth);
      for (const sigma of sigmas) {
        for (const tau of taus) {
          const composed = compose(tau, sigma);
          if (composed.mapping.length !== sigmaConfig.source) {
            issues.push(
              `Composite substitution expected length ${sigmaConfig.source}, received ${composed.mapping.length}.`,
            );
            continue;
          }
          for (const term of sourceTerms) {
            const viaSigma = extend(sigma, term);
            const viaTau = extend(tau, viaSigma);
            const viaComposite = extend(composed, term);
            if (!termsEqual(viaTau, viaComposite)) {
              issues.push(
                `Associativity failed for (${sigmaConfig.source}→${sigmaConfig.target}) and (${tauConfig.source}→${tauConfig.target}) on term ${termKey(term)}.`,
              );
              break;
            }
          }
        }
      }
    }
  }

  for (const { config, substitutions } of substitutionCatalog) {
    const leftIdentity = identitySubstitution(config.target);
    const rightIdentity = identitySubstitution(config.source);
    for (const substitution of substitutions) {
      const left = compose(leftIdentity, substitution);
      const right = compose(substitution, rightIdentity);
      if (left.mapping.length !== substitution.mapping.length) {
        issues.push(
          `Left identity changed the arity of substitution (${config.source}→${config.target}).`,
        );
      } else {
        for (let index = 0; index < left.mapping.length; index += 1) {
          if (!termsEqual(left.mapping[index]!, substitution.mapping[index]!)) {
            issues.push(
              `Left identity altered component ${index} of substitution (${config.source}→${config.target}).`,
            );
            break;
          }
        }
      }
      if (right.mapping.length !== substitution.mapping.length) {
        issues.push(
          `Right identity changed the arity of substitution (${config.source}→${config.target}).`,
        );
      } else {
        for (let index = 0; index < right.mapping.length; index += 1) {
          if (!termsEqual(right.mapping[index]!, substitution.mapping[index]!)) {
            issues.push(
              `Right identity altered component ${index} of substitution (${config.source}→${config.target}).`,
            );
            break;
          }
        }
      }
    }
  }

  contextSummaries.sort((a, b) => a.size - b.size);
  substitutionConfigs.sort((a, b) =>
    a.source === b.source ? a.target - b.target : a.source - b.source,
  );

  const details = `checked ${contextSummaries.length} contexts and ${substitutionConfigs.length} substitution families.`;

  return {
    holds: issues.length === 0,
    issues,
    details,
    contexts: contextSummaries,
    substitutions: substitutionConfigs,
  };
};

export const analyzeLambdaKleisliSplitting = (
  witness: LambdaRelativeMonadWitness,
): LambdaKleisliSplittingReport => {
  const report = analyzeUntypedLambdaRelativeMonad(witness);
  return {
    ...report,
    details: `${report.details} Verified Kleisli identities and composition for Example 6.`,
  };
};

export const describeBrokenUntypedLambdaRelativeMonadWitness = (): LambdaRelativeMonadWitness => ({
  ...describeUntypedLambdaRelativeMonadWitness(),
  customExtend(substitution, _term) {
    if (substitution.mapping.length === 0) {
      return variable(0);
    }
    return cloneTerm(substitution.mapping[0]!);
  },
});

const freezeArray = <T>(values: readonly T[]): ReadonlyArray<T> =>
  Object.freeze([...values]) as ReadonlyArray<T>;

const DEFAULT_LAZY_CONTEXT_LIMIT = 6;
const DEFAULT_LAZY_SUBSTITUTION_LIMIT = 8;

export interface LazyLambdaApproximationOptions {
  readonly contextLimit?: number;
  readonly substitutionLimit?: number;
}

export interface LazyLambdaRelativeMonadWitness
  extends Omit<LambdaRelativeMonadWitness, "contexts" | "substitutions"> {
  readonly contexts: LazyReplayableIterable<LambdaContextConfiguration>;
  readonly substitutions: LazyReplayableIterable<LambdaSubstitutionConfiguration>;
  readonly approximation?: LazyLambdaApproximationOptions;
}

interface MaterialisedLazyLambdaWitness {
  readonly witness?: LambdaRelativeMonadWitness;
  readonly contextSlice: LazySliceResult<LambdaContextConfiguration>;
  readonly substitutionSlice: LazySliceResult<LambdaSubstitutionConfiguration>;
  readonly issues: ReadonlyArray<string>;
}

const materialiseLazyLambdaWitness = (
  witness: LazyLambdaRelativeMonadWitness,
): MaterialisedLazyLambdaWitness => {
  const contextLimit = witness.approximation?.contextLimit ?? DEFAULT_LAZY_CONTEXT_LIMIT;
  const substitutionLimit =
    witness.approximation?.substitutionLimit ?? DEFAULT_LAZY_SUBSTITUTION_LIMIT;

  const contextSlice = sliceLazyIterable(witness.contexts, { limit: contextLimit });
  const substitutionSlice = sliceLazyIterable(witness.substitutions, {
    limit: substitutionLimit,
  });

  const issues: string[] = [];
  if (contextSlice.values.length === 0) {
    issues.push("No contexts enumerated within the configured limit.");
  }
  if (substitutionSlice.values.length === 0) {
    issues.push("No substitution configurations enumerated within the configured limit.");
  }

  if (issues.length > 0) {
    return {
      witness: undefined,
      contextSlice,
      substitutionSlice,
      issues: freezeArray(issues),
    };
  }

  const strictWitness: LambdaRelativeMonadWitness = {
    contexts: contextSlice.values as NonEmptyArray<LambdaContextConfiguration>,
    substitutions: substitutionSlice.values as NonEmptyArray<LambdaSubstitutionConfiguration>,
    ...(witness.customExtend ? { customExtend: witness.customExtend } : {}),
    ...(witness.customCompose ? { customCompose: witness.customCompose } : {}),
  };

  return {
    witness: strictWitness,
    contextSlice,
    substitutionSlice,
    issues: freezeArray([]),
  };
};

export interface LazyLambdaRelativeMonadReport extends LambdaRelativeMonadReport {
  readonly approximation: {
    readonly contextSlice: LazySliceResult<LambdaContextConfiguration>;
    readonly substitutionSlice: LazySliceResult<LambdaSubstitutionConfiguration>;
  };
}

export const analyzeLazyLambdaRelativeMonad = (
  witness: LazyLambdaRelativeMonadWitness,
): LazyLambdaRelativeMonadReport => {
  const materialised = materialiseLazyLambdaWitness(witness);
  if (!materialised.witness) {
    return {
      holds: false,
      issues: materialised.issues,
      details:
        "Lazy λ-term witness materialisation failed; increase the context or substitution limits.",
      contexts: [],
      substitutions: [],
      approximation: {
        contextSlice: materialised.contextSlice,
        substitutionSlice: materialised.substitutionSlice,
      },
    };
  }

  const baseReport = analyzeUntypedLambdaRelativeMonad(materialised.witness);
  const details = `${baseReport.details} Sampled ${materialised.contextSlice.consumed} contexts and ${materialised.substitutionSlice.consumed} substitution configurations.`;

  return {
    ...baseReport,
    holds: baseReport.holds && materialised.issues.length === 0,
    issues: freezeArray([...baseReport.issues, ...materialised.issues]),
    details,
    approximation: {
      contextSlice: materialised.contextSlice,
      substitutionSlice: materialised.substitutionSlice,
    },
  };
};

export interface LazyLambdaKleisliSplittingReport extends LambdaKleisliSplittingReport {
  readonly approximation: {
    readonly contextSlice: LazySliceResult<LambdaContextConfiguration>;
    readonly substitutionSlice: LazySliceResult<LambdaSubstitutionConfiguration>;
  };
}

export const analyzeLazyLambdaKleisliSplitting = (
  witness: LazyLambdaRelativeMonadWitness,
): LazyLambdaKleisliSplittingReport => {
  const materialised = materialiseLazyLambdaWitness(witness);
  if (!materialised.witness) {
    return {
      holds: false,
      issues: materialised.issues,
      details:
        "Lazy λ-term Kleisli materialisation failed; increase the context or substitution limits.",
      contexts: [],
      substitutions: [],
      approximation: {
        contextSlice: materialised.contextSlice,
        substitutionSlice: materialised.substitutionSlice,
      },
    };
  }

  const baseReport = analyzeLambdaKleisliSplitting(materialised.witness);
  const details = `${baseReport.details} Sampled ${materialised.contextSlice.consumed} contexts and ${materialised.substitutionSlice.consumed} substitution configurations.`;

  return {
    ...baseReport,
    holds: baseReport.holds && materialised.issues.length === 0,
    issues: freezeArray([...baseReport.issues, ...materialised.issues]),
    details,
    approximation: {
      contextSlice: materialised.contextSlice,
      substitutionSlice: materialised.substitutionSlice,
    },
  };
};

const countableContexts: LazyReplayableIterable<LambdaContextConfiguration> =
  createReplayableIterable(() => ({
    [Symbol.iterator]: function* () {
      let size = 0;
      while (true) {
        yield { size, maxTermDepth: Math.min(3, size + 2) };
        size += 1;
      }
    },
  }), { description: "Countable λ-contexts" });

const countableSubstitutions: LazyReplayableIterable<LambdaSubstitutionConfiguration> =
  createReplayableIterable(() => ({
    [Symbol.iterator]: function* () {
      let radius = 0;
      const emitted = new Set<string>();
      while (true) {
        for (let source = 0; source <= radius; source += 1) {
          for (let target = source; target <= radius + 1; target += 1) {
            const key = `${source}|${target}`;
            if (emitted.has(key)) {
              continue;
            }
            emitted.add(key);
            yield {
              source,
              target,
              maxTermDepth: Math.min(3, radius + 2),
            };
          }
        }
        radius += 1;
      }
    },
  }), { description: "Countable λ-substitutions" });

export const describeCountableLambdaRelativeMonadWitness = (): LazyLambdaRelativeMonadWitness => ({
  contexts: countableContexts,
  substitutions: countableSubstitutions,
  approximation: {
    contextLimit: DEFAULT_LAZY_CONTEXT_LIMIT,
    substitutionLimit: DEFAULT_LAZY_SUBSTITUTION_LIMIT,
  },
});

