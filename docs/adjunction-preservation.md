# Adjunction Preservation Diagnostics

The adjunction construction now synthesises executable limit and colimit preservation
analyses from the unit/counit data that certify an adjunction.  When
`constructAdjunctionWithWitness` receives limit or colimit samples, it attaches
structured `FunctorPropertyOracle` results to the right and left adjoints,
respectively, and records the resulting analyses on the returned adjunction witness.

## Providing Limit Samples

Limit preservation samples mirror the discrete diagrams used to certify limits in the
target category of the right adjoint:

```ts
const sample: AdjunctionLimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr> = {
  label: "descriptive-name",
  indices: finiteIndex.carrier,
  diagram,          // diagram in the target category of the right adjoint
  limit,            // limiting cone for the diagram
  factor: checkLimit,  // reusable factorisation witness for the cone
  cones: [...],        // cones in the source category to test preservation
  sourceCones: [...],  // optional original cones to re-check the advertised limit
  details: [...],      // optional metadata lines surfaced in property analyses
};
```

For every supplied cone the adjunction derives the standard universal arrow: it first
transposes the cone through the counit into the diagram category, obtains the limiting
mediator with the provided `factor` helper, and then transports the mediator back via
the right adjoint and the unit.  Each index in `indices` is checked explicitly, so
failures point to the precise leg that breaks the universal property.

## Providing Colimit Samples

Colimit samples follow the dual pattern for the left adjoint:

```ts
const sample: AdjunctionColimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr> = {
  label: "colimit-example",
  indices: finiteIndex.carrier,
  diagram,            // diagram in the source category of the left adjoint
  colimit,            // colimiting cocone for the diagram
  factor: checkColimit,
  cocones: [...],      // cocones in the target category to test preservation
  sourceCocones: [...],// optional checks of the advertised colimit
  details: [...],
};
```

Each cocone is transposed along the unit into the source category, factored through the
advertised colimit, and pushed forward through the left adjoint before applying the
counit.  The resulting mediator is compared leg-by-leg with the supplied cocone.

## Consuming the Diagnostics

Analyses derived from the supplied samples are exposed in three places:

1.  The enriched functor witnesses (`adjunction.left` and `adjunction.right`) receive
    additional `FunctorPropertyAnalysis` entries that summarise the success or failure
    of each preservation sample.
2.  The adjunction witness itself carries a `preservation` block that records the
    original samples together with their analyses for downstream tooling.
3.  Optional failure details from the sample `factor` functions propagate directly into
    property analysis summaries, ensuring counterexamples remain visible.

This orchestration allows downstream modules to request limit or colimit preservation
evidence declaratively while reusing the triangle witnesses already present on the
adjunction.

