import { getCarrierSemantics } from './set-cat';
import type { SetObj } from './set-cat';
import type {
  SessionType,
  SessionTypeFunctorActionKind,
  SessionTypeSemanticEnvironment,
} from './session-type';
import {
  formatSessionType,
  interpretSessionTypeDual,
  interpretSessionTypePrimal,
} from './session-type';
import { buildRunnerFromInteraction } from './stateful-runner';
import type { BuildRunnerOptions, StatefulRunner } from './stateful-runner';
import type { MonadComonadInteractionLaw } from './monad-comonad-interaction-law';

export interface SessionTypeRunnerEvaluationOptions<Obj> {
  readonly assignments: ReadonlyMap<string, Obj>;
  readonly sampleLimit?: number;
  readonly metadata?: readonly string[];
}

export interface SessionTypeRunnerEvaluationEntry<Obj> {
  readonly channel: string;
  readonly object?: Obj;
  readonly checked: number;
  readonly mismatches: number;
  readonly notes: readonly string[];
}

export interface SessionTypeRunnerEvaluationReport<Obj> {
  readonly holds: boolean;
  readonly entries: readonly SessionTypeRunnerEvaluationEntry<Obj>[];
  readonly notes: readonly string[];
  readonly metadata?: readonly string[];
}

export interface SessionTypeRunnerOptions<Obj> {
  readonly assignments: ReadonlyMap<string, Obj>;
  readonly runnerOptions?: BuildRunnerOptions;
  readonly evaluation?: Omit<SessionTypeRunnerEvaluationOptions<Obj>, 'assignments'>;
  readonly metadata?: readonly string[];
  readonly notes?: readonly string[];
}

export interface SessionTypeRunnerResult<Obj, Left, Right, Value> {
  readonly type: SessionType;
  readonly assignments: ReadonlyMap<string, Obj>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly evaluation: SessionTypeRunnerEvaluationReport<Obj>;
  readonly metadata: readonly string[];
  readonly notes: readonly string[];
}

export type SessionTypeRunnerSpecNode =
  | {
      readonly kind: 'unit' | 'zero';
      readonly channels: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: 'base';
      readonly name: string;
      readonly channels: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: 'channel';
      readonly name: string;
      readonly channels: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: 'product';
      readonly left: SessionTypeRunnerSpecNode;
      readonly right: SessionTypeRunnerSpecNode;
      readonly channels: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: 'lollipop';
      readonly domain: SessionTypeRunnerSpecNode;
      readonly codomain: SessionTypeRunnerSpecNode;
      readonly channels: readonly string[];
      readonly description: string;
    }
  | {
      readonly kind: 'functorAction';
      readonly action: SessionTypeFunctorActionKind;
      readonly operand: SessionTypeRunnerSpecNode;
      readonly channels: readonly string[];
      readonly description: string;
    };

export interface SessionTypeRunnerSpec<Obj> {
  readonly type: SessionType;
  readonly assignments: ReadonlyMap<string, Obj>;
  readonly channels: readonly string[];
  readonly primal: SessionTypeRunnerSpecNode;
  readonly dual: SessionTypeRunnerSpecNode;
  readonly metadata: readonly string[];
  readonly notes: readonly string[];
}

export function collectSessionTypeChannelNames(type: SessionType): ReadonlySet<string> {
  const aggregate = new Set<string>();
  collectChannels(type, aggregate);
  return aggregate;
}

const summarizeRunnerEvaluation = <Obj>(
  report: SessionTypeRunnerEvaluationReport<Obj>,
): { checked: number; mismatches: number } => {
  let checked = 0;
  let mismatches = 0;
  for (const entry of report.entries) {
    checked += entry.checked;
    mismatches += entry.mismatches;
  }
  return { checked, mismatches };
};

export function makeSessionTypeRunner<Obj, Arr, Left, Right, Value>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  type: SessionType,
  options: SessionTypeRunnerOptions<Obj>,
): SessionTypeRunnerResult<Obj, Left, Right, Value> {
  const runner = buildRunnerFromInteraction(interaction, options.runnerOptions ?? {});
  const evaluation = checkSessionTypeRunnerEvaluationAgainstInteraction(
    type,
    runner,
    interaction,
    {
      assignments: options.assignments,
      ...(options.evaluation?.sampleLimit !== undefined
        ? { sampleLimit: options.evaluation.sampleLimit }
        : {}),
      ...(options.evaluation?.metadata ? { metadata: options.evaluation.metadata } : {}),
    },
  );
  const summary = summarizeRunnerEvaluation(evaluation);
  const channels = Array.from(collectSessionTypeChannelNames(type)).sort();
  const assignments = Array.from(options.assignments.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const metadata: string[] = [
    `sessionType.runner.type=${formatSessionType(type)}`,
    `sessionType.runner.channels=${JSON.stringify(channels)}`,
    `sessionType.runner.assignments=${JSON.stringify(assignments)}`,
    `sessionType.runner.checked=${summary.checked}`,
    `sessionType.runner.mismatches=${summary.mismatches}`,
    `sessionType.runner.entries=${evaluation.entries.length}`,
    `sessionType.runner.holds=${evaluation.holds}`,
  ];
  if (evaluation.metadata) {
    metadata.push(...evaluation.metadata);
  }
  if (options.metadata) {
    metadata.push(...options.metadata);
  }

  const notes: string[] = evaluation.notes.map((note) => `sessionType.runner.note=${note}`);
  if (options.notes) {
    notes.push(...options.notes);
  }

  return {
    type,
    assignments: options.assignments,
    runner,
    evaluation,
    metadata,
    notes,
  };
}

const mergeChannels = (...groups: ReadonlyArray<readonly string[]>): string[] => {
  const aggregate = new Set<string>();
  for (const group of groups) {
    for (const channel of group) aggregate.add(channel);
  }
  return Array.from(aggregate.values());
};

const makeRunnerSpecContext = (label: 'primal' | 'dual') => ({
  unit: (): SessionTypeRunnerSpecNode => ({
    kind: 'unit',
    description: `${label}: unit`,
    channels: [],
  }),
  zero: (): SessionTypeRunnerSpecNode => ({
    kind: 'zero',
    description: `${label}: zero`,
    channels: [],
  }),
  base: (name: string) =>
    ({
      kind: 'base',
      name,
      description: `${label}: base ${name}`,
      channels: [],
    }) satisfies SessionTypeRunnerSpecNode,
  channel: (name: string) =>
    ({
      kind: 'channel',
      name,
      description: `${label}: channel ${name}`,
      channels: [name],
    }) satisfies SessionTypeRunnerSpecNode,
  product: (left: SessionTypeRunnerSpecNode, right: SessionTypeRunnerSpecNode) =>
    ({
      kind: 'product',
      left,
      right,
      description: `${label}: product`,
      channels: mergeChannels(left.channels, right.channels),
    }) satisfies SessionTypeRunnerSpecNode,
  lollipop: (domain: SessionTypeRunnerSpecNode, codomain: SessionTypeRunnerSpecNode) =>
    ({
      kind: 'lollipop',
      domain,
      codomain,
      description: `${label}: lollipop`,
      channels: mergeChannels(domain.channels, codomain.channels),
    }) satisfies SessionTypeRunnerSpecNode,
  g0: (operand: SessionTypeRunnerSpecNode) =>
    ({
      kind: 'functorAction',
      action: 'g0',
      operand,
      description: `${label}: G0`,
      channels: operand.channels,
    }) satisfies SessionTypeRunnerSpecNode,
  g0Dual: (operand: SessionTypeRunnerSpecNode) =>
    ({
      kind: 'functorAction',
      action: 'g0Dual',
      operand,
      description: `${label}: G0^o`,
      channels: operand.channels,
    }) satisfies SessionTypeRunnerSpecNode,
});

export const buildSessionTypeRunnerSpecFromInterpreter = <Obj>(
  type: SessionType,
  assignments: ReadonlyMap<string, Obj>,
  options?: { readonly metadata?: readonly string[]; readonly notes?: readonly string[] },
): SessionTypeRunnerSpec<Obj> => {
  const channelNames = Array.from(collectSessionTypeChannelNames(type)).sort();
  const environment: SessionTypeSemanticEnvironment<SessionTypeRunnerSpecNode> = {
    primal: makeRunnerSpecContext('primal'),
    dual: makeRunnerSpecContext('dual'),
  };
  const primal = interpretSessionTypePrimal<SessionTypeRunnerSpecNode>(type, environment);
  const dual = interpretSessionTypeDual<SessionTypeRunnerSpecNode>(type, environment);
  const metadata: string[] = [
    `sessionType.runnerSpec.type=${formatSessionType(type)}`,
    `sessionType.runnerSpec.channels=${JSON.stringify(channelNames)}`,
    `sessionType.runnerSpec.assignments=${JSON.stringify(
      Array.from(assignments.entries()).sort(([a], [b]) => a.localeCompare(b)),
    )}`,
  ];
  if (options?.metadata) {
    metadata.push(...options.metadata);
  }
  const notes: string[] = [];
  for (const channel of channelNames) {
    if (!assignments.has(channel)) {
      notes.push(`sessionType.runnerSpec.missingAssignment=${channel}`);
    }
  }
  if (options?.notes) {
    notes.push(...options.notes);
  }
  return {
    type,
    assignments,
    channels: channelNames,
    primal,
    dual,
    metadata,
    notes,
  };
};

export function checkSessionTypeRunnerEvaluationAgainstInteraction<
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  type: SessionType,
  runner: StatefulRunner<Obj, Left, Right, Value>,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: SessionTypeRunnerEvaluationOptions<Obj>,
): SessionTypeRunnerEvaluationReport<Obj> {
  const channels = collectSessionTypeChannelNames(type);
  const sampleLimit = Math.max(1, options.sampleLimit ?? 12);
  const entries: SessionTypeRunnerEvaluationEntry<Obj>[] = [];

  for (const channel of channels) {
    const object = options.assignments.get(channel);
    if (object === undefined) {
      entries.push({
        channel,
        checked: 0,
        mismatches: 0,
        notes: [`session-type runner: channel ${channel} has no assigned interaction-law object.`],
      });
      continue;
    }

    const fiber = interaction.psiComponents.get(object);
    if (!fiber) {
      entries.push({
        channel,
        object,
        checked: 0,
        mismatches: 0,
        notes: [`session-type runner: interaction law has no ψ fibre for object ${String(object)}.`],
      });
      continue;
    }

    const thetaHom = runner.thetaHom.get(object);
    if (!thetaHom) {
      entries.push({
        channel,
        object,
        checked: 0,
        mismatches: 0,
        notes: [`session-type runner: runner lacks θ witness for object ${String(object)}.`],
      });
      continue;
    }

    const primalSamples = enumerateSamples(fiber.primalFiber, sampleLimit);
    const dualSamples = enumerateSamples(fiber.dualFiber, sampleLimit);
    if (primalSamples.length === 0 || dualSamples.length === 0) {
      entries.push({
        channel,
        object,
        checked: 0,
        mismatches: 0,
        notes: [
          `session-type runner: insufficient ψ samples for object ${String(object)} (primal=${primalSamples.length} dual=${dualSamples.length}).`,
        ],
      });
      continue;
    }

    let checked = 0;
    let mismatches = 0;
    const localNotes: string[] = [];
    for (const primal of primalSamples) {
      for (const dual of dualSamples) {
        checked += 1;
        const expected = fiber.reconstructed.map([primal, dual]);
        const actual = thetaHom.map([primal, dual]);
        if (!Object.is(expected, actual)) {
          mismatches += 1;
          if (mismatches <= 6) {
            localNotes.push(
              `ev_Y mismatch object=${String(object)} left=${String(primal.element)} right=${String(dual.element)} expected=${String(expected)} actual=${String(actual)}`,
            );
          }
        }
      }
    }
    localNotes.push(
      `session-type runner: channel ${channel} checked ${checked} ev_Y sample(s) with ${mismatches} mismatch(es).`,
    );
    entries.push({ channel, object, checked, mismatches, notes: localNotes });
  }

  if (channels.size === 0) {
    entries.push({
      channel: '(none)',
      checked: 0,
      mismatches: 0,
      notes: ['session-type runner: type references no channel names; nothing to verify.'],
    });
  }

  const holds = entries.every((entry) => entry.object !== undefined && entry.mismatches === 0 && entry.checked > 0);
  const totalSamples = entries.reduce((sum, entry) => sum + entry.checked, 0);
  const notes: string[] = [
    `session-type runner evaluation: compared ${totalSamples} sample(s) against the canonical ev_Y maps recorded in the ψ fibres.`,
  ];
  if (holds) {
    notes.push('session-type runner evaluation: all referenced channels factor through ev_Y.');
  }

  const report: SessionTypeRunnerEvaluationReport<Obj> = { holds, entries, notes };
  if (options.metadata && options.metadata.length > 0) {
    return { ...report, metadata: options.metadata };
  }
  return report;
}

function collectChannels(type: SessionType, into: Set<string>): void {
  switch (type.kind) {
    case 'channel':
      into.add(type.name);
      break;
    case 'product':
      collectChannels(type.left, into);
      collectChannels(type.right, into);
      break;
    case 'lollipop':
      collectChannels(type.domain, into);
      collectChannels(type.codomain, into);
      break;
    case 'functorAction':
      collectChannels(type.operand, into);
      break;
    default:
      break;
  }
}

function enumerateSamples<A>(carrier: SetObj<A>, limit: number): A[] {
  const semantics = getCarrierSemantics(carrier);
  if (!semantics) {
    return [];
  }
  const result: A[] = [];
  const iterator = semantics.iterate();
  while (result.length < limit) {
    const next = iterator.next();
    if (next.done) break;
    result.push(next.value);
  }
  return result;
}
