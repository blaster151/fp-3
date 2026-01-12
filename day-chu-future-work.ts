export type DayChuFutureWorkStatus = 'open' | 'in-progress' | 'closed';

export interface DayChuFutureWorkEntry {
  readonly label: string;
  readonly question: string;
  readonly signals: ReadonlyArray<string>;
  readonly experiments: ReadonlyArray<string>;
  readonly reviewTrigger: string;
  readonly status: DayChuFutureWorkStatus;
  readonly notes?: ReadonlyArray<string>;
}

export const DAY_CHU_FUTURE_WORK_REGISTRY: ReadonlyArray<DayChuFutureWorkEntry> = [
  {
    label: 'FW-1',
    question: 'General Sweedler dual computation.',
    signals: [
      'interactionLawMonoidToSweedlerDual',
      'sweedlerDualOfFreeMonoid',
      'sweedlerDualOfMonoidQuotient',
      'Example 6/14 regressions',
    ],
    experiments: [
      'Sweep new interaction laws through interactionLawMonoidToSweedlerDual and record failures.',
      'Extend glueing suites to route Sweedler coalgebras into λ₍coop₎ supervised stacks.',
    ],
    reviewTrigger: 'After each new monad–comonad law packaging (Phase VI glueing, Phase VII runners).',
    status: 'open',
    notes: ['Aggregations exist; no automated glueing sweep yet.'],
  },
  {
    label: 'FW-2',
    question: 'Cooperation/coevaluation semantics.',
    signals: [
      'checkSessionTypeRunnerEvaluationAgainstInteraction',
      'lambda-coop.runner-alignment metadata',
      'Example 8 regressions',
    ],
    experiments: [
      'Annotate λ₍coop₎ alignment reports with sessionType.runner metadata from runner checks.',
      'Track ev_Y mismatches to identify cooperation law failures.',
    ],
    reviewTrigger: 'After Phase IV supervised-stack milestones and new session-type runners.',
    status: 'in-progress',
  },
  {
    label: 'FW-3',
    question: 'Linear vs. intuitionistic duality.',
    signals: [
      'dualSessionType',
      'checkSessionTypeDuality',
      'Example 8 interpreter fixtures',
    ],
    experiments: [
      'Run checkSessionTypeDuality on Example 8 session types and store counterexamples.',
      'Record channel/sample provenance for semantic dual mismatches.',
    ],
    reviewTrigger: 'After the Phase VII runner synthesis pass and new interpreters.',
    status: 'open',
    notes: ['No counterexamples recorded yet.'],
  },
  {
    label: 'FW-4',
    question: 'Session-type calculus for λ₍coop₎.',
    signals: [
      'session-type-runner.ts',
      'buildSessionTypeRunnerSpecFromInterpreter',
      'lambda-coop-supervised-stack.ts',
      'session-type-glueing.examples.ts',
      'examples/runnable/104-session-type-glueing-stack.ts',
    ],
    experiments: [
      'Compose session-type runner evaluation with glueing supervised stacks.',
      'Use runnable Example 104 to capture mismatches outside the test suite.',
    ],
    reviewTrigger: 'At Phase VII start/end and whenever supervised-stack runners land.',
    status: 'in-progress',
  },
] as const;

export const getDayChuFutureWorkEntry = (
  label: string,
): DayChuFutureWorkEntry | undefined =>
  DAY_CHU_FUTURE_WORK_REGISTRY.find((entry) => entry.label === label);

export interface DayChuFutureWorkSummary {
  readonly total: number;
  readonly open: number;
  readonly inProgress: number;
  readonly closed: number;
}

export const summarizeDayChuFutureWorkRegistry = (): DayChuFutureWorkSummary => {
  let open = 0;
  let inProgress = 0;
  let closed = 0;
  for (const entry of DAY_CHU_FUTURE_WORK_REGISTRY) {
    switch (entry.status) {
      case 'open':
        open += 1;
        break;
      case 'in-progress':
        inProgress += 1;
        break;
      case 'closed':
        closed += 1;
        break;
      default: {
        const exhaustive: never = entry.status;
        throw new Error(`Unhandled Day–Chu future-work status ${exhaustive}`);
      }
    }
  }
  return {
    total: DAY_CHU_FUTURE_WORK_REGISTRY.length,
    open,
    inProgress,
    closed,
  };
};
