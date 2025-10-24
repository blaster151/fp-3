# Forgetful Functor Counterexamples

The helper module [`forgetful-counterexamples.ts`](../forgetful-counterexamples.ts)
packages the textbook warnings from Section 27.4 into executable witnesses.

- `forgetfulCoequalizerCounterexample()` constructs the parallel pair of
  homomorphisms from \(\mathbb{N}^2 \to \mathbb{N}\) whose coequalizer in
  `Mon` collapses every positive element. The exported failure evidence
  demonstrates that the underlying Set map cannot satisfy the coequalizer
  universal property after applying the forgetful functor.
- `forgetfulCoproductCounterexample()` stages the free-product coproduct of two
  unary-generated monoids. Its Set-level failure data records that multiple
  mediating functions extend the same pair of underlying maps, so the forgetful
  image is not a coproduct in `Set`.

Both helpers provide reusable factorisation builders for genuine monoid
mediators alongside the Set counterexamples, making it easy for tests and
future forgetful-functor utilities to replay the failures precisely.
