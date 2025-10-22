# Set-theory semantics switch (future consideration)

`SetCat` now exposes explicit `SetCarrierSemantics` witnesses for every object, so
universal constructions and helper modules already consult the registered membership,
iteration, and equality behaviour. The remaining long-term question is whether we should
support swapping in alternate foundational semantics (e.g., constructive or probabilistic
interpretations) without rewriting downstream consumers.

## Motivation

* decouple membership/iteration logic from `SetCat` so non-ZFC interpretations can plug in.
* allow downstream modules (`set-small-limits`, `setmult-category`, etc.) to request the
  active semantics explicitly instead of relying on hard-coded `Set` behaviour.

## Proposed steps

1. Expose a configuration surface (e.g., `SetCat.configure(semantics)` or scoped builders)
   that lets callers replace the default semantics factory while preserving compatibility
   with existing helpers such as `SetSmallProducts` and the subobject classifier.
2. Audit downstream modules (`set-small-limits.ts`, `setmult-category.ts`, witnesses, and
   oracle suites) for places where they implicitly assume the default semantics rather than
   consulting the registered witnesses.
3. Develop regression coverage that exercises both the default semantics and at least one
   alternate interpretation to ensure `isSetHom`, product/coproduct builders, and existing
   oracles remain sound.

These notes should be revisited when we are ready to introduce non-ZFC foundations or
user-selectable set-theory modes on top of the current semantics infrastructure.
