# Diagram Reindexing and Comparison Diagnostics

Milestone 33 promotes change-of-shape functors to first-class citizens inside the
`CategoryLimits` toolkit. Given a functor \(u : I \to J\) and a diagram
\(D : J \to \mathcal{C}\), we can now:

- Build the composite diagram \(D \circ u\) together with restricted cone and
  cocone witnesses via `CategoryLimits.reindexDiagram`.
- Analyse how limit cones and colimit cocones transport along the inclusion by
  re-running the naturality oracle on the restricted witnesses.
- Produce the canonical comparison morphisms
  `limitComparisonAlong` and `colimitComparisonAlong` and automatically report
  whether the induced maps are isomorphisms.
- Surface finality and cofinality diagnostics so callers can explain when the
  comparison morphisms fail to be invertible.

The reindexing helper materialises the source indexing category, rewrites the
object and arrow assignments of the diagram, and exposes `restrictCone`/
`restrictCocone` adapters that replay the upgraded naturality check. Those
restricted witnesses power the comparison constructors, which in turn:

1. Ask the limit (respectively colimit) factorisation oracle for the unique
   mediator.
2. Detect whether the mediator is an isomorphism using the finite base category.
3. Attach explanatory metadata whenever no finality/cofinality witness has been
   provided.

## Worked Example

```ts
const reindexing = CategoryLimits.reindexDiagram({
  base: finiteBase,
  changeOfShape: inclusion, // inclusion I ↪ J
  diagram: constantDiagram,
  eq: finiteBase.eq,
})

const limit = CategoryLimits.limitComparisonAlong({
  base: finiteBase,
  changeOfShape: inclusion,
  diagram: constantDiagram,
  originalLimit,
  reindexedLimit,
  eq: finiteBase.eq,
})

const colimit = CategoryLimits.colimitComparisonAlong({
  base: finiteBase,
  changeOfShape: inclusion,
  diagram: constantDiagram,
  originalColimit,
  reindexedColimit,
  eq: finiteBase.eq,
})
```

The regression suite in `test/diagram.reindexing.spec.ts` demonstrates both the
successful comparisons (mediators are identities) and the failure mode where the
mediator collapses structure. In the latter case the helpers flag the missing
finality/cofinality witness so downstream tooling can point back to the
textbook’s hypotheses.
