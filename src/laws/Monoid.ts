import type { Law, Lawful } from "./Witness";

type Monoid<A> = {
  readonly empty: A;
  readonly concat: (x: A, y: A) => A;
};

export function lawfulMonoid<A>(
  tag: string,
  eq: (a: A, b: A) => boolean,
  monoid: Monoid<A>,
  samples: ReadonlyArray<A>
): Lawful<A, Monoid<A>> {
  const { empty, concat } = monoid;
  const law = (name: string, check: () => boolean): Law<A> => ({ name, check });

  const laws: Law<A>[] = [
    law("left identity", () => samples.every(a => eq(concat(empty, a), a))),
    law("right identity", () => samples.every(a => eq(concat(a, empty), a))),
    law("associativity", () =>
      samples.every(a =>
        samples.every(b =>
          samples.every(c => eq(concat(concat(a, b), c), concat(a, concat(b, c))))
        )
      )
    )
  ];

  return { tag, eq, struct: monoid, laws };
}
