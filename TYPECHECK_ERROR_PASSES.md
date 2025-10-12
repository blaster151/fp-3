# Type Error Reduction Passes

## Pass 1 – Condition optional metadata in Markov witness builders
- **Status:** ✅ Completed
- **Outcome:** Builders now omit optional `label`/`base` metadata when not provided, aligning with `exactOptionalPropertyTypes`.
- **Notes:** Changes cover all Markov witness constructors (`comonoid`, `deterministic`, `positivity`, `almost-sure`, zero–one families) and related SetMult wrappers.

## Pass 2 – Drop undefined fields when delegating to downstream builders
- **Status:** ✅ Completed
- **Outcome:** Delegation sites now gate optional metadata before forwarding so downstream builders with `exactOptionalPropertyTypes` stay satisfied.
- **Notes:** Audited Markov determinism/positivity/zero–one helpers, Borel adapters, and SetMult bridges; no remaining direct `label: options.label` style forwarding.

## Pass 3 – Normalize optional properties in SetMult object constructors
- **Status:** ✅ Completed
- **Outcome:** `createSetMultObj` centralizes the conditional metadata logic and `setMultObjFromFin` now reuses it so `label`/`samples` are only attached when present.
- **Notes:** Remaining SetMult factories inherit the guarded behaviour via the shared constructor; future additions should route through `createSetMultObj` to maintain consistency.
