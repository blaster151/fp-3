import {
  constructGlueingInteractionLaw,
  type GlueingInteractionLawSpanComponent,
  type GlueingInteractionLawSummary,
} from './functor-interaction-law';
import {
  bridgeGlueingSummaryToResidualRunner,
  type GlueingRunnerBridgeOptions,
  type GlueingRunnerBridgeResult,
} from './glueing-runner-bridge';
import {
  makeExample8MonadComonadInteractionLaw,
  type Example8InteractionValue,
  type Example8Left,
  type Example8Right,
} from './monad-comonad-interaction-law';
import type { ResidualInteractionLawFromRunnerOptions } from './residual-interaction-law';
import type { RunnerOracleOptions } from './runner-oracles';
import type { BuildRunnerOptions } from './stateful-runner';
import type { TwoArrow, TwoObject } from './two-object-cat';

export type Example8Interaction = ReturnType<typeof makeExample8MonadComonadInteractionLaw>;

export type Example8GlueingSummary = GlueingInteractionLawSummary<
  TwoObject,
  TwoArrow,
  Example8Left,
  Example8Right,
  Example8InteractionValue
>;

export type Example8GlueingBridge = GlueingRunnerBridgeResult<
  TwoObject,
  TwoArrow,
  Example8Left,
  Example8Right,
  Example8InteractionValue,
  TwoObject,
  TwoArrow,
  Example8Left,
  Example8Right,
  Example8InteractionValue
>;

export const EXAMPLE8_GLUEING_SPAN_VARIANTS = [
  'identity',
  'left-nontrivial',
  'right-nontrivial',
  'double-nontrivial',
] as const;

export type Example8GlueingSpanVariant = (typeof EXAMPLE8_GLUEING_SPAN_VARIANTS)[number];

export const DEFAULT_EXAMPLE8_GLUEING_SPAN_VARIANT: Example8GlueingSpanVariant = 'identity';

export const normalizeExample8GlueingSpanVariant = (
  raw?: string,
): Example8GlueingSpanVariant => {
  if (!raw) {
    return DEFAULT_EXAMPLE8_GLUEING_SPAN_VARIANT;
  }
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const match = EXAMPLE8_GLUEING_SPAN_VARIANTS.find((candidate) => candidate === normalized);
  if (!match) {
    throw new Error(
      `Unknown Example 8 glueing span variant '${raw}'. Expected one of ${EXAMPLE8_GLUEING_SPAN_VARIANTS.join(
        ', ',
      )}.`,
    );
  }
  return match;
};

export interface Example8GlueingSummaryOptions {
  readonly interaction?: Example8Interaction;
  readonly metadata?: ReadonlyArray<string>;
  readonly notes?: ReadonlyArray<string>;
  readonly spanVariant?: Example8GlueingSpanVariant;
}

export interface Example8GlueingSummaryResult {
  readonly interaction: Example8Interaction;
  readonly summary: Example8GlueingSummary;
}

export interface Example8GlueingBridgeOptions extends Example8GlueingSummaryOptions {
  readonly summary?: Example8GlueingSummary;
  readonly runnerOptions?: BuildRunnerOptions;
  readonly oracleOptions?: RunnerOracleOptions<TwoObject>;
  readonly residualOracleOptions?: RunnerOracleOptions<TwoObject>;
  readonly residualLawOptions?: ResidualInteractionLawFromRunnerOptions<
    TwoObject,
    Example8Left,
    Example8Right,
    Example8InteractionValue
  >;
}

export interface Example8GlueingBridgeResult {
  readonly interaction: Example8Interaction;
  readonly summary: Example8GlueingSummary;
  readonly bridge: Example8GlueingBridge;
}

const DEFAULT_METADATA = ['Example8 glueing summary'] as const;
const DEFAULT_NOTES = ['Example8 glueing summary'] as const;

const ensureInteraction = (interaction?: Example8Interaction): Example8Interaction =>
  interaction ?? makeExample8MonadComonadInteractionLaw();

const getArrowByName = (interaction: Example8Interaction, name: string): TwoArrow => {
  const arrow = interaction.law.kernel.base.arrows.find((candidate) => candidate.name === name);
  if (!arrow) {
    throw new Error(`Example 8 kernel arrow '${name}' not found.`);
  }
  return arrow as TwoArrow;
};

const buildSpanComponents = (
  interaction: Example8Interaction,
  variant: Example8GlueingSpanVariant,
): ReadonlyArray<GlueingInteractionLawSpanComponent<TwoObject, TwoArrow>> => {
  const base = interaction.law.kernel.base;
  const spanMetadata = [`Example8.spanVariant=${variant}`];
  const defaultResidualObject = (base.objects[0] as TwoObject | undefined) ?? '•';
  const identity = (object: TwoObject) => base.id(object) as TwoArrow;
  const forward = getArrowByName(interaction, 'f');
  switch (variant) {
    case 'identity':
      return [
        {
          label: 'Example8Span.identity',
          residualObject: defaultResidualObject,
          leftArrow: identity(defaultResidualObject),
          rightArrow: identity(defaultResidualObject),
          metadata: spanMetadata,
        },
      ];
    case 'left-nontrivial':
      return [
        {
          label: 'Example8Span.leftNontrivial',
          residualObject: '•',
          leftArrow: forward,
          rightArrow: identity('•'),
          metadata: spanMetadata,
        },
      ];
    case 'right-nontrivial':
      return [
        {
          label: 'Example8Span.rightNontrivial',
          residualObject: '•',
          leftArrow: identity('•'),
          rightArrow: forward,
          metadata: spanMetadata,
        },
      ];
    case 'double-nontrivial':
      return [
        {
          label: 'Example8Span.doubleNontrivial',
          residualObject: '•',
          leftArrow: forward,
          rightArrow: forward,
          metadata: spanMetadata,
        },
      ];
    default: {
      const exhaustiveCheck: never = variant;
      throw new Error(`Unhandled Example 8 span variant ${exhaustiveCheck}`);
    }
  }
};

const buildSummary = (
  interaction: Example8Interaction,
  metadata: ReadonlyArray<string>,
  notes: ReadonlyArray<string>,
  variant: Example8GlueingSpanVariant,
): Example8GlueingSummary => {
  const base = interaction.law.kernel.base;
  const residualObject = base.objects[0];
  if (!residualObject) {
    throw new Error('Example 8 kernel requires at least one object.');
  }
  const spanComponents = buildSpanComponents(interaction, variant);
  const metadataWithVariant = [
    ...metadata,
    `Example8.spanVariant=${variant}`,
  ];
  return constructGlueingInteractionLaw<TwoObject, TwoArrow, Example8Left, Example8Right, Example8InteractionValue>({
    law: interaction.law,
    category: base,
    kernel: interaction.law.kernel,
    leftSubcategory: {
      label: 'Example8Left',
      objects: base.objects,
      arrows: base.arrows,
      pullbackStable: true,
    },
    rightSubcategory: {
      label: 'Example8Right',
      objects: base.objects,
      arrows: base.arrows,
      pullbackStable: true,
    },
    span: spanComponents,
    metadata: metadataWithVariant,
    notes,
  });
};

export const makeExample8GlueingSummary = (
  options: Example8GlueingSummaryOptions = {},
): Example8GlueingSummaryResult => {
  const interaction = ensureInteraction(options.interaction);
  const metadata = options.metadata ?? DEFAULT_METADATA;
  const notes = options.notes ?? DEFAULT_NOTES;
  const spanVariant = options.spanVariant ?? DEFAULT_EXAMPLE8_GLUEING_SPAN_VARIANT;
  return {
    interaction,
    summary: buildSummary(interaction, metadata, notes, spanVariant),
  };
};

export const makeExample8GlueingBridge = (
  options: Example8GlueingBridgeOptions = {},
): Example8GlueingBridgeResult => {
  const interaction = ensureInteraction(options.interaction);
  const spanVariant = options.spanVariant ?? DEFAULT_EXAMPLE8_GLUEING_SPAN_VARIANT;
  const summary =
    options.summary ??
    makeExample8GlueingSummary({
      interaction,
      spanVariant,
      ...(options.metadata ? { metadata: options.metadata } : {}),
      ...(options.notes ? { notes: options.notes } : {}),
    }).summary;
  const bridgeOptions: GlueingRunnerBridgeOptions<
    TwoObject,
    TwoArrow,
    Example8Left,
    Example8Right,
    Example8InteractionValue
  > = {
    interaction,
    ...(options.runnerOptions ? { runnerOptions: options.runnerOptions } : {}),
    ...(options.oracleOptions ? { oracleOptions: options.oracleOptions } : {}),
    ...(options.residualOracleOptions
      ? { residualOracleOptions: options.residualOracleOptions }
      : {}),
    ...(options.residualLawOptions
      ? { residualLawOptions: options.residualLawOptions }
      : {}),
  };
  return {
    interaction,
    summary,
    bridge: bridgeGlueingSummaryToResidualRunner(summary, bridgeOptions),
  };
};
