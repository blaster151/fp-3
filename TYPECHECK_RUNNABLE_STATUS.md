# Runnable Typecheck Status

_Last updated: March 6, 2026 (post-quarantine audit)_

Running the new production-aligned check for the runnable catalogue surfaces the
remaining quarantined diagnostics that must be addressed before the examples can
be merged back into the primary build. Use this snapshot to prioritise the next
reduction passes.

## Command

```bash
npm run typecheck:prod:runnable
```

## Error Summary

- **0 errors — runnable catalogue (including the Store–lens walkthrough) now
  type-checks alongside production code via `npm run typecheck:prod:runnable`.**
- The runnable optics adapters (`src/optics/profunctor.ts`,
  `src/optics/optional-traversal.ts`, `src/optics/lens-prism.ts`) continue to
  satisfy the production configuration with witness bundles and profunctor
  helpers aligned with `exactOptionalPropertyTypes`.
- Runnable entries 029–030b cover the former `examples-store-lens.ts`
  walkthrough, ensuring the smoothing diagnostics stay in sync with the new
  probability bridge.

## Next Focus Areas

1. Audit the runnable scripts to ensure they continue leaning on the cleaned
   profunctor surface (`fromOptional`, `fromPrism`, `fromLens`, `toOptional`,
   etc.) rather than duplicating ad-hoc optics helpers.
2. Keep the runnable catalogue aligned with production builds—new examples
   should register in `examples/runnable/catalogue.ts` and pass
   `npm run typecheck:prod:runnable` before landing.

Re-run the command above after each pass to record the new totals and update
this file so the team can track progress over time.
