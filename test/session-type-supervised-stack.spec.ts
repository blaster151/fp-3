import { describe, expect, it } from 'vitest';

import { makeExample8MonadComonadInteractionLaw } from '../monad-comonad-interaction-law';
import {
  analyzeSessionTypeSupervisedStackLambdaCoopAlignment,
  makeSessionTypeGlueingSupervisedStack,
  makeSessionTypeSupervisedStack,
} from '../session-type-supervised-stack';
import { makeExample8GlueingBridge } from '../session-type-glueing.examples';
import { parseSessionType } from '../session-type';
import {
  buildGlueingExampleKernelSpec,
  buildGlueingExampleUserSpec,
} from '../glueing-supervised-stack.examples';
import type { TwoArrow, TwoObject } from '../two-object-cat';

const interaction = makeExample8MonadComonadInteractionLaw();
const kernelObjects = interaction.law.kernel.base.objects as readonly TwoObject[];
const kernelSpec = buildGlueingExampleKernelSpec(kernelObjects);
const userSpec = buildGlueingExampleUserSpec<TwoObject>();

describe('session-type supervised stack helper', () => {
  it('constructs a supervised stack and records runner metadata', () => {
    const type = parseSessionType('Y');
    const assignments = new Map<string, TwoObject>([['Y', '•']]);
    const result = makeSessionTypeSupervisedStack(
      interaction,
      type,
      assignments,
      kernelSpec,
      userSpec,
      {
        stack: { sampleLimit: 3 },
        runnerEvaluation: { sampleLimit: 2 },
        stackRun: { operations: ['getenv'], stepLimit: 24 },
        runnerSpec: { notes: ['runnerSpec note'] },
        metadata: ['SessionType.stack.example=Example8'],
      },
    );
    expect(result.stack.kernel.spec.name).toBe(kernelSpec.name);
    expect(result.runnerEvaluation.holds).toBe(true);
    expect(result.metadata).toContain('SessionType.stack.example=Example8');
    expect(result.metadata.some((line) => line.startsWith('sessionType.runner.checked='))).toBe(true);
    expect(result.metadata.some((line) => line.startsWith('sessionType.runnerSpec.channels='))).toBe(true);
    expect(result.stackRun?.summary.operations).toContain('getenv');
    expect(result.notes.some((note) => note.includes('sessionType.runnerSpec.note=runnerSpec note'))).toBe(true);
  });

  it('records diagnostics when assignments are missing', () => {
    const type = parseSessionType('Y × Y');
    const assignments = new Map<string, TwoObject>();
    const result = makeSessionTypeSupervisedStack(
      interaction,
      type,
      assignments,
      kernelSpec,
      userSpec,
    );
    expect(result.runnerEvaluation.holds).toBe(false);
    expect(result.runnerEvaluation.entries[0]?.notes.some((note) => note.includes('no assigned'))).toBe(true);
    expect(result.metadata).toContain('sessionType.runner.holds=false');
  });

  it('threads session-type metadata into λ₍coop₎ alignment summaries', () => {
    const type = parseSessionType('Y');
    const assignments = new Map<string, TwoObject>([['Y', '•']]);
    const stackResult = makeSessionTypeSupervisedStack(
      interaction,
      type,
      assignments,
      kernelSpec,
      userSpec,
    );
    const report = analyzeSessionTypeSupervisedStackLambdaCoopAlignment(
      interaction,
      stackResult,
      { sampleLimit: 2 },
    );
    expect(
      report.alignmentSummary.metadata.some((line) =>
        line.startsWith('sessionType.stack.type='),
      ),
    ).toBe(true);
    expect(
      report.alignmentSummary.metadata.some((line) =>
        line.startsWith('sessionType.runner.checked='),
      ),
    ).toBe(true);
    expect(
      report.alignmentSummary.notes.some((note) => note.includes('sessionType.runner.note=')),
    ).toBe(true);
  });

  it('composes session-type stacks with glueing telemetry', () => {
    const type = parseSessionType('Y');
    const assignments = new Map<string, TwoObject>([['Y', '•']]);
    const glueingBridge = makeExample8GlueingBridge({
      interaction,
      runnerOptions: { sampleLimit: 3 },
    }).bridge;
    const result = makeSessionTypeGlueingSupervisedStack(
      glueingBridge,
      interaction,
      type,
      assignments,
      kernelSpec,
      userSpec,
      {
        session: { runnerEvaluation: { sampleLimit: 2 } },
        metadata: ['SessionTypeGlueing.example=Example8'],
        notes: ['SessionTypeGlueing note'],
      },
    );
    expect(result.metadata).toContain('SessionTypeGlueing.example=Example8');
    expect(
      result.metadata.some((line) => line.startsWith('Glueing.supervisedStack.kernel=')),
    ).toBe(true);
    expect(
      result.alignment.alignmentSummary.metadata.some((line) =>
        line.startsWith('Glueing.residualBridge.spanCount='),
      ),
    ).toBe(true);
    expect(
      result.alignment.alignmentSummary.metadata.some((line) =>
        line.startsWith('sessionType.stack.type='),
      ),
    ).toBe(true);
    expect(
      result.notes.some((note) => note.includes('Glueing.supervisedStack.runnerSummary')),
    ).toBe(true);
    expect(result.notes.some((note) => note.includes('SessionTypeGlueing note'))).toBe(true);
  });

  it('supports Example 8 glueing span variants', () => {
    const variantBridge = makeExample8GlueingBridge({
      interaction,
      spanVariant: 'right-nontrivial',
      metadata: ['SpanVariant.test'],
    });
    expect(variantBridge.summary.metadata).toContain('Example8.spanVariant=right-nontrivial');
    const [span] = variantBridge.summary.span;
    expect(span?.metadata).toContain('Example8.spanVariant=right-nontrivial');
    expect(span?.rightArrow.name).toBe('f');
  });
});
