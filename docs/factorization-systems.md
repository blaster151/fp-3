# Factorization systems and orthogonality tooling

The factorization-system framework generalizes the epi–mono calculus
already available in `FinSet` and the forgetful-functor counterexample
toolkit.  The helpers in `factorization-system.ts` expose three layers
of functionality:

1.  **Orthogonality witnesses.**  An `OrthogonalityWitness` bundles a
    left and right morphism together with a `hasLifting` oracle that
    synthesizes diagonal fillers for commuting squares and surfaces
    explicit counterexamples when the lifting property fails.  The
    oracles check endpoint compatibility, replay the commutative-square
    equations, and certify that the constructed diagonal remains inside
    the appropriate class (e.g. injective maps in `Set`, group
    homomorphisms in `FinGrp`).
2.  **Factorization-system builder.**  `buildFactorizationSystem`
    aggregates left/right class membership predicates, closure samples,
    and orthogonality witnesses.  It produces a reusable `factor`
    function that splits arrows through the specified classes and a
    structured report recording closure, orthogonality, and
    recomposition diagnostics.
3.  **Category-specific specializations.**  The module ships concrete
    factorization systems for textbook examples:

    - `buildSetSurjectionInjectionFactorization` recovers the familiar
      surjection–injection split in `Set`, including explicit diagonal
      fillers for surjection ⊥ injection squares.
    - `buildFinSetRegularFactorization` reuses the existing
      `FinSet.imageFactorisation` helper to certify regular epi–mono
      factorizations and confirm that the canonical witnesses satisfy
      the lifting diagnostics.
    - `buildFinGrpImageKernelFactorization` factors finite group
      homomorphisms through their images while recording the kernel data
      supplied by the lifting analysis.  The resulting report confirms
      the usual image–kernel comparison and makes the subgroup witnesses
      available for downstream tooling.

The accompanying tests (`test/factorization-system.spec.ts`) sabotage
commutative squares, closure samples, and class membership to demonstrate
that the diagnostics surface informative counterexamples.  This mirrors
Milestone 29’s requirement that the infrastructure remain executable and
reusable in later chapters (localizations, reflective subcategories,
and adjunction preservation metadata).

## Functor-property integration

The factorization metadata now plugs directly into the
functor-property framework.  Use
`attachFactorizationSystemProperties` to enrich a
`FunctorWithWitness` with preservation/reflection analyses for the
left and right classes of two compatible factorization systems.  The
helper delegates to `makeArrowPropertyOracle`, reuses the supplied
factorization samples, and records the resulting
`FunctorPropertyAnalysis` entries on the functor.  `analyzeFactorizationSystemFunctor`
performs the same evaluation without mutating the original witness and
returns a structured report capturing both the analyses and summary
details.  The integration ensures that adjunctions, localizations, and
other functorial constructions can thread factorization-system
metadata alongside existing preservation diagnostics.
