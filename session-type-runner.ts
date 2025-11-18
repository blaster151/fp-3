import { getCarrierSemantics } from './set-cat';
import type { SetObj } from './set-cat';
import type { SessionType } from './session-type';
import type { StatefulRunner } from './stateful-runner';
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

export function collectSessionTypeChannelNames(type: SessionType): ReadonlySet<string> {
  const aggregate = new Set<string>();
  collectChannels(type, aggregate);
  return aggregate;
}

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
