import { strict as assert } from 'node:assert';

export type SessionType =
  | SessionTypeUnit
  | SessionTypeZero
  | SessionTypeBase
  | SessionTypeChannel
  | SessionTypeProduct
  | SessionTypeLollipop
  | SessionTypeFunctorAction;

export interface SessionTypeUnit {
  readonly kind: 'unit';
}

export interface SessionTypeZero {
  readonly kind: 'zero';
}

export interface SessionTypeBase {
  readonly kind: 'base';
  readonly name: string;
}

export interface SessionTypeChannel {
  readonly kind: 'channel';
  readonly name: string;
}

export interface SessionTypeProduct {
  readonly kind: 'product';
  readonly left: SessionType;
  readonly right: SessionType;
}

export interface SessionTypeLollipop {
  readonly kind: 'lollipop';
  readonly domain: SessionType;
  readonly codomain: SessionType;
}

export type SessionTypeFunctorActionKind = 'g0' | 'g0Dual';

export interface SessionTypeFunctorAction {
  readonly kind: 'functorAction';
  readonly action: SessionTypeFunctorActionKind;
  readonly operand: SessionType;
}

export type SessionTypeInterpreterContext<Value> = {
  readonly unit: () => Value;
  readonly zero: () => Value;
  readonly base: (name: string) => Value;
  readonly channel: (name: string) => Value;
  readonly product: (left: Value, right: Value) => Value;
  readonly lollipop: (domain: Value, codomain: Value) => Value;
  readonly g0: (operand: Value) => Value;
  readonly g0Dual: (operand: Value) => Value;
};

export interface SessionTypeSemanticEnvironment<Value> {
  readonly primal: SessionTypeInterpreterContext<Value>;
  readonly dual: SessionTypeInterpreterContext<Value>;
}

export interface SessionTypeDualitySemanticInfo<Value> {
  readonly type: SessionType;
  readonly syntacticDual: SessionType;
  readonly environment: SessionTypeSemanticEnvironment<Value>;
}

export interface SessionTypeDualityCheckOptions<Value> {
  readonly environment: SessionTypeSemanticEnvironment<Value>;
  readonly semanticDual: (value: Value, info: SessionTypeDualitySemanticInfo<Value>) => Value;
  readonly equals?: (left: Value, right: Value) => boolean;
  readonly describe?: (value: Value) => string;
  readonly metadata?: readonly string[];
  readonly syntacticDual?: (type: SessionType) => SessionType;
}

export interface SessionTypeDualityReport<Value> {
  readonly type: SessionType;
  readonly syntacticDual: SessionType;
  readonly semanticPrimal: Value;
  readonly semanticFromInterpreter: Value;
  readonly semanticFromDualOperator: Value;
  readonly holds: boolean;
  readonly notes: readonly string[];
  readonly metadata?: readonly string[];
}

export interface SessionTypeParserOptions {
  readonly channelIdentifiers?: readonly string[];
}

export interface SessionTypeFormatOptions {
  readonly ascii?: boolean;
  readonly baseFormatter?: (name: string) => string;
  readonly channelFormatter?: (name: string) => string;
}

export class SessionTypeParseError extends Error {
  constructor(message: string, readonly position: number) {
    super(`SessionType parse error at index ${position}: ${message}`);
    this.name = 'SessionTypeParseError';
  }
}

const DEFAULT_CHANNEL_IDENTIFIERS = ['Y'];
const PRECISION = {
  lollipop: 1,
  product: 2,
  functor: 3,
  atom: 4,
} as const satisfies Record<string, number>;

const SUBSCRIPT_DIGIT_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const DOUBLE_STRUCK_DIGIT_MAP: Record<string, string> = {
  '𝟘': '0',
  '𝟙': '1',
};

const hasOwnRecord = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

interface BaseToken {
  readonly start: number;
  readonly end: number;
}

type SessionTypeToken =
  | ({ readonly type: 'lparen' | 'rparen' | 'times' | 'arrow' } & BaseToken)
  | ({ readonly type: 'identifier'; readonly value: string; readonly comparisonKey: string } & BaseToken)
  | ({ readonly type: 'action'; readonly action: SessionTypeFunctorActionKind } & BaseToken);

export function parseSessionType(
  input: string,
  options: SessionTypeParserOptions = {},
): SessionType {
  const tokens = tokenizeSessionType(input);
  const parser = new SessionTypeParser(tokens, input, options);
  const expression = parser.parseExpression();
  parser.expectEnd();
  return expression;
}

class SessionTypeParser {
  private readonly channelKeys: ReadonlySet<string>;
  private index = 0;

  constructor(
    private readonly tokens: readonly SessionTypeToken[],
    private readonly source: string,
    options: SessionTypeParserOptions,
  ) {
    const identifiers = options.channelIdentifiers ?? DEFAULT_CHANNEL_IDENTIFIERS;
    this.channelKeys = new Set(identifiers.map(normalizeComparisonKey));
  }

  parseExpression(): SessionType {
    return this.parseLollipop();
  }

  expectEnd(): void {
    if (!this.isAtEnd()) {
      const token = this.tokens[this.index];
      const position = token?.start ?? this.source.length;
      throw new SessionTypeParseError('unexpected token', position);
    }
  }

  private parseLollipop(): SessionType {
    let node = this.parseProduct();
    while (this.match('arrow')) {
      const codomain = this.parseLollipop();
      node = { kind: 'lollipop', domain: node, codomain } satisfies SessionTypeLollipop;
    }
    return node;
  }

  private parseProduct(): SessionType {
    let node = this.parsePrefix();
    while (this.match('times')) {
      const right = this.parsePrefix();
      node = { kind: 'product', left: node, right } satisfies SessionTypeProduct;
    }
    return node;
  }

  private parsePrefix(): SessionType {
    if (this.match('action')) {
      const token = this.previous<'action'>();
      const operand = this.parsePrefix();
      return {
        kind: 'functorAction',
        action: token.action,
        operand,
      } satisfies SessionTypeFunctorAction;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): SessionType {
    if (this.match('lparen')) {
      const expr = this.parseExpression();
      this.consume('rparen', 'missing closing parenthesis');
      return expr;
    }
    const identifier = this.consume('identifier', 'expected session type identifier');
    const key = identifier.comparisonKey;
    if (key === '1') {
      return { kind: 'unit' } satisfies SessionTypeUnit;
    }
    if (key === '0') {
      return { kind: 'zero' } satisfies SessionTypeZero;
    }
    if (this.channelKeys.has(key)) {
      return { kind: 'channel', name: identifier.value } satisfies SessionTypeChannel;
    }
    return { kind: 'base', name: identifier.value } satisfies SessionTypeBase;
  }

  private match(type: SessionTypeToken['type']): boolean {
    if (this.isAtEnd()) {
      return false;
    }
    if (this.tokens[this.index]?.type !== type) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private consume<TType extends SessionTypeToken['type']>(
    type: TType,
    message: string,
  ): Extract<SessionTypeToken, { readonly type: TType }> {
    if (this.match(type)) {
      return this.previous<TType>();
    }
    const token = this.peek();
    const position = token?.start ?? this.source.length;
    throw new SessionTypeParseError(message, position);
  }

  private peek(): SessionTypeToken | undefined {
    return this.tokens[this.index];
  }

  private previous<TType extends SessionTypeToken['type']>(): Extract<SessionTypeToken, { readonly type: TType }> {
    assert(this.index > 0, 'cannot read previous token before consumption');
    return this.tokens[this.index - 1] as Extract<SessionTypeToken, { readonly type: TType }>;
  }

  private isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }
}

export function dualSessionType(type: SessionType): SessionType {
  switch (type.kind) {
    case 'unit':
      return { kind: 'zero' } satisfies SessionTypeZero;
    case 'zero':
      return { kind: 'unit' } satisfies SessionTypeUnit;
    case 'base':
      return { kind: 'base', name: type.name } satisfies SessionTypeBase;
    case 'channel':
      return { kind: 'channel', name: type.name } satisfies SessionTypeChannel;
    case 'product':
      return {
        kind: 'product',
        left: dualSessionType(type.right),
        right: dualSessionType(type.left),
      } satisfies SessionTypeProduct;
    case 'lollipop':
      return {
        kind: 'lollipop',
        domain: dualSessionType(type.codomain),
        codomain: dualSessionType(type.domain),
      } satisfies SessionTypeLollipop;
    case 'functorAction':
      return {
        kind: 'functorAction',
        action: type.action === 'g0' ? 'g0Dual' : 'g0',
        operand: dualSessionType(type.operand),
      } satisfies SessionTypeFunctorAction;
  }
}

export function interpretSessionTypePrimal<Value>(
  type: SessionType,
  environment: SessionTypeSemanticEnvironment<Value>,
): Value {
  return interpretSessionTypeWithContext(type, environment.primal);
}

export function interpretSessionTypeDual<Value>(
  type: SessionType,
  environment: SessionTypeSemanticEnvironment<Value>,
): Value {
  return interpretSessionTypeWithContext(type, environment.dual);
}

export function checkSessionTypeDuality<Value>(
  type: SessionType,
  options: SessionTypeDualityCheckOptions<Value>,
): SessionTypeDualityReport<Value> {
  const syntacticDual = (options.syntacticDual ?? dualSessionType)(type);
  const semanticPrimal = interpretSessionTypePrimal(type, options.environment);
  const semanticFromInterpreter = interpretSessionTypeDual(syntacticDual, options.environment);
  const semanticFromDualOperator = options.semanticDual(semanticPrimal, {
    type,
    syntacticDual,
    environment: options.environment,
  });
  const equals = options.equals ?? ((left: Value, right: Value) => Object.is(left, right));
  const describe = options.describe ?? defaultDescribe;
  const holds = equals(semanticFromDualOperator, semanticFromInterpreter);
  const notes: string[] = [];
  if (holds) {
    notes.push('syntactic dual and semantic dual agree');
  } else {
    notes.push(
      `dual mismatch: semantic dual ${describe(semanticFromDualOperator)} differs from interpreter ${describe(
        semanticFromInterpreter,
      )}`,
    );
  }
  const baseReport = {
    type,
    syntacticDual,
    semanticPrimal,
    semanticFromInterpreter,
    semanticFromDualOperator,
    holds,
    notes,
  } satisfies SessionTypeDualityReport<Value>;
  if (options.metadata) {
    return { ...baseReport, metadata: options.metadata };
  }
  return baseReport;
}

export function formatSessionType(type: SessionType, options: SessionTypeFormatOptions = {}): string {
  const ascii = options.ascii ?? false;
  const baseFormatter = options.baseFormatter ?? ((name: string) => name);
  const channelFormatter = options.channelFormatter ?? ((name: string) => name);
  const productOp = ascii ? ' * ' : ' × ';
  const arrowOp = ascii ? ' -> ' : ' ⇒ ';
  const g0Symbol = ascii ? 'G0' : 'G₀';
  const g0DualSymbol = ascii ? 'G0^o' : 'G₀^{∘}';

  const render = (node: SessionType, parentPrec = 0, position: 'left' | 'right' | 'none' = 'none'): string => {
    const [text, prec] = (() => {
      switch (node.kind) {
        case 'unit':
          return ['1', PRECISION.atom] as const;
        case 'zero':
          return ['0', PRECISION.atom] as const;
        case 'base':
          return [baseFormatter(node.name), PRECISION.atom] as const;
        case 'channel':
          return [channelFormatter(node.name), PRECISION.atom] as const;
        case 'product': {
          const left = render(node.left, PRECISION.product, 'left');
          const right = render(node.right, PRECISION.product, 'right');
          return [left + productOp + right, PRECISION.product] as const;
        }
        case 'lollipop': {
          const domain = render(node.domain, PRECISION.lollipop, 'left');
          const codomain = render(node.codomain, PRECISION.lollipop, 'right');
          return [domain + arrowOp + codomain, PRECISION.lollipop] as const;
        }
        case 'functorAction': {
          const operand = render(node.operand, PRECISION.functor, 'none');
          const symbol = node.action === 'g0Dual' ? g0DualSymbol : g0Symbol;
          return [`${symbol} ${operand}`, PRECISION.functor] as const;
        }
      }
    })();

    const needsParens =
      prec < parentPrec ||
      (prec === parentPrec &&
        ((node.kind === 'product' && position === 'right') ||
          (node.kind === 'lollipop' && position === 'left')));

    return needsParens ? `(${text})` : text;
  };

  return render(type);
}

function interpretSessionTypeWithContext<Value>(
  type: SessionType,
  context: SessionTypeInterpreterContext<Value>,
): Value {
  switch (type.kind) {
    case 'unit':
      return context.unit();
    case 'zero':
      return context.zero();
    case 'base':
      return context.base(type.name);
    case 'channel':
      return context.channel(type.name);
    case 'product': {
      const left = interpretSessionTypeWithContext(type.left, context);
      const right = interpretSessionTypeWithContext(type.right, context);
      return context.product(left, right);
    }
    case 'lollipop': {
      const domain = interpretSessionTypeWithContext(type.domain, context);
      const codomain = interpretSessionTypeWithContext(type.codomain, context);
      return context.lollipop(domain, codomain);
    }
    case 'functorAction': {
      const operand = interpretSessionTypeWithContext(type.operand, context);
      return type.action === 'g0' ? context.g0(operand) : context.g0Dual(operand);
    }
  }
}

const defaultDescribe = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[object]';
  }
};

function skipWhitespace(input: string, start: number): number {
  let position = start;
  while (position < input.length) {
    const current = input[position] ?? '';
    if (current === '' || !isWhitespace(current)) {
      break;
    }
    position += 1;
  }
  return position;
}

function tokenizeSessionType(input: string): SessionTypeToken[] {
  const tokens: SessionTypeToken[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index] ?? '';
    if (char === '') {
      break;
    }
    if (isWhitespace(char)) {
      index += 1;
      continue;
    }
    const action = tryScanFunctorAction(input, index);
    if (action) {
      tokens.push(action.token);
      index = action.nextIndex;
      continue;
    }
    if (char === '(') {
      tokens.push({ type: 'lparen', start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen', start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (char === '×' || char === '*') {
      tokens.push({ type: 'times', start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (char === '⇒' || char === '⊸' || char === '→') {
      tokens.push({ type: 'arrow', start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (char === '=' && input[index + 1] === '>') {
      tokens.push({ type: 'arrow', start: index, end: index + 2 });
      index += 2;
      continue;
    }
    if (char === '-' && input[index + 1] === '>') {
      tokens.push({ type: 'arrow', start: index, end: index + 2 });
      index += 2;
      continue;
    }
    if (isIdentifierStart(char)) {
      const start = index;
      let value = '';
      while (index < input.length) {
        const current = input[index] ?? '';
        if (!isIdentifierChar(current)) {
          break;
        }
        value += current;
        index += 1;
      }
      const cleaned = cleanIdentifierValue(value);
      if (!cleaned) {
        throw new SessionTypeParseError('invalid identifier', start);
      }
      const normalized = normalizeComparisonKey(cleaned);
      tokens.push({ type: 'identifier', value: cleaned, comparisonKey: normalized, start, end: index });
      continue;
    }
    throw new SessionTypeParseError(`unexpected character “${char}”`, index);
  }
  return tokens;
}

function tryScanFunctorAction(
  input: string,
  start: number,
): { readonly token: SessionTypeToken; readonly nextIndex: number } | undefined {
  if (input[start] !== 'G') {
    return undefined;
  }
  let index = start + 1;
  if (input[index] === '_') {
    index += 1;
  }
  if (!isZeroIndicator(input[index])) {
    return undefined;
  }
  index += 1;
  index = skipWhitespace(input, index);
  let action: SessionTypeFunctorActionKind = 'g0';
  if (index < input.length && (input[index] === '^' || isDualMarker(input[index]))) {
    if (input[index] === '^') {
      index += 1;
      index = skipWhitespace(input, index);
      let hasBrace = false;
      if (input[index] === '{') {
        hasBrace = true;
        index += 1;
        index = skipWhitespace(input, index);
      }
      if (index >= input.length) {
        throw new SessionTypeParseError('incomplete G₀ exponent', start);
      }
      if (input[index] === '\\') {
        index += 1;
        const keyword = readKeyword(input, index);
        if (keyword.word.toLowerCase() !== 'circ') {
          throw new SessionTypeParseError('expected “\\circ” after ^', start);
        }
        index = keyword.nextIndex;
        action = 'g0Dual';
      } else if (isDualMarker(input[index])) {
        index += 1;
        action = 'g0Dual';
      } else {
        const indicator = input[index] ?? '';
        if (indicator.toLowerCase() !== 'o') {
          throw new SessionTypeParseError('expected dual marker after ^', start);
        }
        index += 1;
        action = 'g0Dual';
      }
      index = skipWhitespace(input, index);
      if (hasBrace) {
        if (input[index] !== '}') {
          throw new SessionTypeParseError('missing closing brace after exponent', start);
        }
        index += 1;
      }
    } else {
      index += 1;
      action = 'g0Dual';
    }
    index = skipWhitespace(input, index);
  }
  return {
    token: { type: 'action', action, start, end: index },
    nextIndex: index,
  };
}

function isWhitespace(char: string): boolean {
  return /\s/u.test(char);
}

function isZeroIndicator(char: string | undefined): char is string {
  if (char === '0') {
    return true;
  }
  if (typeof char === 'string' && hasOwnRecord(SUBSCRIPT_DIGIT_MAP, char)) {
    return SUBSCRIPT_DIGIT_MAP[char] === '0';
  }
  return false;
}

function isDualMarker(char: string | undefined): char is string {
  return char === '°' || char === '∘';
}

function readKeyword(input: string, start: number): { readonly word: string; readonly nextIndex: number } {
  let index = start;
  let word = '';
  while (index < input.length) {
    const current = input[index] ?? '';
    if (!/[A-Za-z]/u.test(current)) {
      break;
    }
    word += current;
    index += 1;
  }
  return { word, nextIndex: index };
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z0-9_]/u.test(char) || isSubscriptDigit(char) || char === '\'';
}

function isIdentifierChar(char: string): boolean {
  return isIdentifierStart(char);
}

function isSubscriptDigit(char: string | undefined): char is string {
  return typeof char === 'string' && hasOwnRecord(SUBSCRIPT_DIGIT_MAP, char);
}

function cleanIdentifierValue(value: string): string {
  let result = '';
  for (const char of value.trim()) {
    if (char === '{' || char === '}') {
      continue;
    }
    if (isWhitespace(char)) {
      continue;
    }
    if (hasOwnRecord(SUBSCRIPT_DIGIT_MAP, char)) {
      result += SUBSCRIPT_DIGIT_MAP[char];
      continue;
    }
    if (hasOwnRecord(DOUBLE_STRUCK_DIGIT_MAP, char)) {
      result += DOUBLE_STRUCK_DIGIT_MAP[char];
      continue;
    }
    result += char;
  }
  return result;
}

function normalizeComparisonKey(value: string): string {
  return value.replace(/\s+/gu, '').toLowerCase();
}
