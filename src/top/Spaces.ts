import {
  discrete,
  forgetStructure,
  indiscrete,
  type Top,
  type TopStructure,
  structureFromTop,
  topStructure,
} from "./Topology";

type Eq<X> = (a: X, b: X) => boolean;

const eqNumber: Eq<number> = (a, b) => a === b;

function cloneStructure<X>(structure: TopStructure<X>): TopStructure<X> {
  const { carrier, opens, eq, show } = structure;
  const args = show === undefined ? { carrier, opens, eq } : { carrier, opens, eq, show };
  return topStructure(args);
}

function eqSubset<X>(eq: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
}

function normalizeSubset<X>(
  eq: Eq<X>,
  carrier: ReadonlyArray<X>,
  subset: ReadonlyArray<X>,
): X[] {
  const normalized: X[] = [];
  for (const candidate of subset) {
    if (carrier.some((element) => eq(element, candidate)) && !normalized.some((x) => eq(x, candidate))) {
      normalized.push(candidate);
    }
  }
  return normalized;
}

function pushOpen<X>(eq: Eq<X>, opens: X[][], candidate: ReadonlyArray<X>): void {
  if (!opens.some((existing) => eqSubset(eq, existing, candidate))) {
    opens.push([...candidate]);
  }
}

function enumerateSubsets<X>(items: ReadonlyArray<X>): X[][] {
  const subsets: X[][] = [[]];
  for (const item of items) {
    const additions = subsets.map((subset) => [...subset, item]);
    subsets.push(...additions);
  }
  return subsets;
}

export function discreteSpace<X>(
  carrier: ReadonlyArray<X>,
  eq: Eq<X>,
  options?: { readonly show?: (x: X) => string },
): TopStructure<X> {
  return structureFromTop(eq, discrete(carrier), options);
}

export function indiscreteSpace<X>(
  carrier: ReadonlyArray<X>,
  eq: Eq<X>,
  options?: { readonly show?: (x: X) => string },
): TopStructure<X> {
  return structureFromTop(eq, indiscrete(carrier), options);
}

export function excludedPointSpace<X>(
  carrier: ReadonlyArray<X>,
  excluded: X,
  eq: Eq<X>,
  options?: { readonly show?: (x: X) => string },
): TopStructure<X> {
  const normalizedCarrier = normalizeSubset(eq, carrier, carrier);
  if (!normalizedCarrier.some((x) => eq(x, excluded))) {
    throw new Error("excludedPointSpace: excluded point must belong to the carrier");
  }
  const opens: X[][] = [];
  for (const subset of enumerateSubsets(normalizedCarrier)) {
    if (!subset.some((value) => eq(value, excluded))) {
      const normalized = normalizeSubset(eq, normalizedCarrier, subset);
      pushOpen(eq, opens, normalized);
    }
  }
  pushOpen(eq, opens, normalizedCarrier);
  const args = options?.show === undefined
    ? { carrier: normalizedCarrier, opens, eq }
    : { carrier: normalizedCarrier, opens, eq, show: options.show };
  return topStructure(args);
}

const booleanCarrier: ReadonlyArray<number> = [0, 1];

const sierpinskiBase = topStructure({
  carrier: booleanCarrier,
  opens: [[], [1], [...booleanCarrier]],
  eq: eqNumber,
});

const cosierpinskiBase = topStructure({
  carrier: booleanCarrier,
  opens: [[], [0], [...booleanCarrier]],
  eq: eqNumber,
});

const discreteBoolean = discreteSpace(booleanCarrier, eqNumber);
const indiscreteBoolean = indiscreteSpace(booleanCarrier, eqNumber);
const excludedPointZero = excludedPointSpace(booleanCarrier, 0, eqNumber);
const excludedPointOne = excludedPointSpace(booleanCarrier, 1, eqNumber);

const NAMED_SPACES_LITERAL = {
  sierpinski: sierpinskiBase,
  cosierpinski: cosierpinskiBase,
  binaryDiscrete: discreteBoolean,
  binaryIndiscrete: indiscreteBoolean,
  excludedPointZero,
  excludedPointOne,
} as const;

export type NamedSpaceKey = keyof typeof NAMED_SPACES_LITERAL;

const NAMED_SPACES: Record<NamedSpaceKey, TopStructure<number>> = NAMED_SPACES_LITERAL;

export function getNamedSpace(key: NamedSpaceKey): TopStructure<number> {
  const space = NAMED_SPACES[key];
  if (!space) {
    throw new Error(`getNamedSpace: unknown space '${key}'`);
  }
  return cloneStructure(space);
}

export function listNamedSpaces(): ReadonlyArray<{
  readonly key: NamedSpaceKey;
  readonly space: TopStructure<number>;
}> {
  return (Object.entries(NAMED_SPACES) as Array<[NamedSpaceKey, TopStructure<number>]>).map(
    ([key, space]) => ({ key, space: cloneStructure(space) }),
  );
}

export const namedSpaceKeys: ReadonlyArray<NamedSpaceKey> = Object.keys(NAMED_SPACES) as ReadonlyArray<NamedSpaceKey>;

export function hasNamedSpace(key: string): key is NamedSpaceKey {
  return Object.prototype.hasOwnProperty.call(NAMED_SPACES, key);
}

export function sierpinskiStructure(): TopStructure<number> {
  return cloneStructure(sierpinskiBase);
}

export function coSierpinskiStructure(): TopStructure<number> {
  return cloneStructure(cosierpinskiBase);
}

/** Sierpiński space: carrier {0,1} with opens ∅, {1}, {0,1}. */
export function sierpinski(): Top<number> {
  return forgetStructure(sierpinskiStructure());
}

export function coSierpinski(): Top<number> {
  return forgetStructure(coSierpinskiStructure());
}
