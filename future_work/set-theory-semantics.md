# Set-theory semantics switch (future consideration)

We plan to surface a configurable semantics layer for `SetCat` so the foundational rules
that govern membership, equality, and iteration can be swapped without rewriting downstream
consumers.

## Motivation

* decouple membership/iteration logic from `SetCat` so non-ZFC interpretations can plug in.
* allow downstream modules (`set-small-limits`, `setmult-category`, etc.) to request the
  active semantics explicitly instead of relying on hard-coded `Set` behaviour.

## Proposed steps

1. Define a `SetSemantics` interface in `set-cat.ts` capturing:
   * membership checks used by `createSetHom`.
   * lazy iteration machinery for `LazySet`.
   * equality/lookup hooks for product and coproduct carriers.
2. Provide a default ZFC-aligned semantics implementation and expose a configuration API on
   `SetCat` (for example `SetCat.configure(semantics)`), keeping the current behaviour as the
   default.
3. Update callers (`set-small-limits.ts`, `setmult-category.ts`, witnesses, and related laws)
   to receive the configured semantics object so future alternates can slot in without
   breaking type signatures.
4. Expand the regression suite with witnesses covering both the default semantics and a mock
   alternate semantics to ensure `isSetHom`, product/coproduct builders, and existing oracles
   remain sound.

These notes should be revisited when we are ready to introduce non-ZFC foundations or
user-selectable set-theory modes.
