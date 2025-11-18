import { describe, expect, it } from 'vitest';

import {
  checkSessionTypeDuality,
  dualSessionType,
  formatSessionType,
  interpretSessionTypeDual,
  interpretSessionTypePrimal,
  parseSessionType,
  SessionTypeParseError,
  type SessionTypeInterpreterContext,
  type SessionTypeSemanticEnvironment,
} from '../session-type';
import { checkSessionTypeRunnerEvaluationAgainstInteraction } from '../session-type-runner';
import { buildRunnerFromInteraction } from '../stateful-runner';
import { makeExample8MonadComonadInteractionLaw } from '../monad-comonad-interaction-law';
import { SetCat, getCarrierSemantics } from '../set-cat';
import type { TwoObject } from '../two-object-cat';

interface SymbolicValue {
  readonly tag: 'primal' | 'dual';
  readonly expr: string;
}

const makeSymbolicContext = (
  tag: SymbolicValue['tag'],
): SessionTypeInterpreterContext<SymbolicValue> => ({
  unit: () => ({ tag, expr: '1' }),
  zero: () => ({ tag, expr: '0' }),
  base: name => ({ tag, expr: name }),
  channel: name => ({ tag, expr: `ch(${name})` }),
  product: (left, right) => ({ tag, expr: `${left.expr}*${right.expr}` }),
  lollipop: (domain, codomain) => ({ tag, expr: `${domain.expr}->${codomain.expr}` }),
  g0: operand => ({ tag, expr: `G0(${operand.expr})` }),
  g0Dual: operand => ({ tag, expr: `G0o(${operand.expr})` }),
});

const symbolicEnvironment: SessionTypeSemanticEnvironment<SymbolicValue> = {
  primal: makeSymbolicContext('primal'),
  dual: makeSymbolicContext('dual'),
};

const symbolicEquals = (left: SymbolicValue, right: SymbolicValue): boolean =>
  left.tag === right.tag && left.expr === right.expr;

describe('session-type grammar', () => {
  it('parses the unicode grammar used in Section 8', () => {
    const parsed = parseSessionType('G₀^{∘}(A × (Y ⇒ G₀ B))');
    expect(parsed).toEqual({
      kind: 'functorAction',
      action: 'g0Dual',
      operand: {
        kind: 'product',
        left: { kind: 'base', name: 'A' },
        right: {
          kind: 'lollipop',
          domain: { kind: 'channel', name: 'Y' },
          codomain: {
            kind: 'functorAction',
            action: 'g0',
            operand: { kind: 'base', name: 'B' },
          },
        },
      },
    });
  });

  it('parses compact ascii presentations and round-trips formatting', () => {
    const parsed = parseSessionType('G0^oY * (A -> (B * C))');
    expect(parsed).toEqual({
      kind: 'product',
      left: {
        kind: 'functorAction',
        action: 'g0Dual',
        operand: { kind: 'channel', name: 'Y' },
      },
      right: {
        kind: 'lollipop',
        domain: { kind: 'base', name: 'A' },
        codomain: {
          kind: 'product',
          left: { kind: 'base', name: 'B' },
          right: { kind: 'base', name: 'C' },
        },
      },
    });

    expect(formatSessionType(parsed)).toBe('G₀^{∘} Y × (A ⇒ (B × C))');
    expect(formatSessionType(parsed, { ascii: true })).toBe('G0^o Y * (A -> (B * C))');
  });

  it('supports custom channel identifiers and formatters', () => {
    const parsed = parseSessionType('Client', { channelIdentifiers: ['Client', 'server'] });
    expect(parsed).toEqual({ kind: 'channel', name: 'Client' });
    expect(
      formatSessionType(parsed, {
        ascii: true,
        channelFormatter: name => `⟪${name}⟫`,
      }),
    ).toBe('⟪Client⟫');
  });

  it('throws descriptive errors when the notation is invalid', () => {
    expect(() => parseSessionType('G0^z A')).toThrow(SessionTypeParseError);
    expect(() => parseSessionType('(')).toThrow(SessionTypeParseError);
  });

  it('computes the syntactic dual and is an involution', () => {
    const parsed = parseSessionType('G₀^{∘}(A × (Y ⇒ G₀ B))');
    const dual = dualSessionType(parsed);
    expect(formatSessionType(dual)).toBe('G₀ ((G₀^{∘} B ⇒ Y) × A)');
    expect(dualSessionType(dual)).toEqual(parsed);
  });
});

describe('session-type interpreters', () => {
  it('interprets session types using the supplied semantic environment', () => {
    const type = parseSessionType('G0(Y -> (A * B))');
    const primal = interpretSessionTypePrimal(type, symbolicEnvironment);
    expect(primal).toEqual({ tag: 'primal', expr: 'G0(ch(Y)->A*B)' });
    const syntacticDual = dualSessionType(type);
    const semanticDual = interpretSessionTypeDual(syntacticDual, symbolicEnvironment);
    expect(semanticDual).toEqual({ tag: 'dual', expr: 'G0(ch(Y)->A*B)' });
  });
});

describe('session-type duality oracle', () => {
  const semanticDual = (value: SymbolicValue): SymbolicValue => ({ tag: 'dual', expr: value.expr });

  it('reports success when syntactic and semantic duals match', () => {
    const type = parseSessionType('G0(Y -> A)');
    const report = checkSessionTypeDuality(type, {
      environment: symbolicEnvironment,
      semanticDual: value => semanticDual(value),
      equals: symbolicEquals,
      describe: value => `${value.tag}:${value.expr}`,
    });
    expect(report.holds).toBe(true);
    expect(report.notes).toContain('syntactic dual and semantic dual agree');
  });

  const twistSemanticDual = (value: SymbolicValue): SymbolicValue => ({
    tag: 'dual',
    expr: `twist(${value.expr})`,
  });

  it('records descriptive notes when the semantic dual mismatches', () => {
    const type = parseSessionType('G0(Y -> A)');
    const report = checkSessionTypeDuality(type, {
      environment: symbolicEnvironment,
      semanticDual: twistSemanticDual,
      equals: symbolicEquals,
      describe: value => `${value.tag}:${value.expr}`,
    });
    expect(report.holds).toBe(false);
    expect(report.notes[0]).toContain('dual mismatch');
  });
});

describe('session-type runner helpers', () => {
  const interaction = makeExample8MonadComonadInteractionLaw();
  const canonicalRunner = buildRunnerFromInteraction(interaction);
  const assignments = new Map<string, TwoObject>([['Y', '•']]);

  it('compares θ samples against ev_Y for referenced channels', () => {
    const report = checkSessionTypeRunnerEvaluationAgainstInteraction(
      parseSessionType('Y'),
      canonicalRunner,
      interaction,
      { assignments, sampleLimit: 3, metadata: ['Example 8 session-type runner check'] },
    );
    expect(report.holds).toBe(true);
    expect(report.entries[0]?.notes.some((note) => note.includes('ev_Y'))).toBe(true);
    expect(report.metadata).toContain('Example 8 session-type runner check');
  });

  it('reports mismatches when a channel θ deviates from ev_Y', () => {
    const object: TwoObject = '•';
    const fiber = interaction.psiComponents.get(object);
    if (!fiber) {
      throw new Error('Example 8 interaction missing fibre for object •');
    }
    const thetaHom = canonicalRunner.thetaHom.get(object);
    if (!thetaHom) {
      throw new Error('Example 8 runner missing θ witness for object •');
    }
    const productSemantics = getCarrierSemantics(fiber.product.object);
    const iterator = productSemantics?.iterate();
    const first = iterator?.next().value;
    if (!first) {
      throw new Error('Example 8 fibre lacks product samples');
    }
    const constantValue = thetaHom.map(first);
    const constantTheta = SetCat.hom(
      fiber.product.object,
      thetaHom.cod,
      () => constantValue,
    );
    const badThetaHom = new Map(canonicalRunner.thetaHom);
    badThetaHom.set(object, constantTheta);
    const badRunner = { ...canonicalRunner, thetaHom: badThetaHom };
    const report = checkSessionTypeRunnerEvaluationAgainstInteraction(
      parseSessionType('Y'),
      badRunner,
      interaction,
      { assignments, sampleLimit: 2 },
    );
    expect(report.holds).toBe(false);
    expect(report.entries[0]?.mismatches ?? 0).toBeGreaterThan(0);
  });
});
