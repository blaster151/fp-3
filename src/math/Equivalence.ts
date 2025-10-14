export interface EquivalenceWitness<A> {
  readonly reflexive: (a: A) => boolean;
  readonly symmetric: (a: A, b: A) => boolean;
  readonly transitive: (a: A, b: A, c: A) => boolean;
}

export function makeEquivalence<A>(rel: (a: A, b: A) => boolean): EquivalenceWitness<A> {
  return {
    reflexive: (a) => rel(a, a),
    symmetric: (a, b) => rel(a, b) === rel(b, a),
    transitive: (a, b, c) => !rel(a, b) || !rel(b, c) || rel(a, c),
  };
}
