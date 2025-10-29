# Runnable Typecheck Status

_Last updated: March 4, 2026 (verification run)_

Running the new production-aligned check for the runnable catalogue surfaces the
remaining quarantined diagnostics that must be addressed before the examples can
be merged back into the primary build. Use this snapshot to prioritise the next
reduction passes.

## Command

```bash
npm run typecheck:prod:runnable
```

## Error Summary

- **0 errors — runnable optics now type-check alongside production code (confirmed via `npm run typecheck:prod:runnable`).**
- The runnable optics adapters (`src/optics/profunctor.ts`,
  `src/optics/optional-traversal.ts`, `src/optics/lens-prism.ts`) now satisfy
  the production configuration, with witness bundles and profunctor helpers
  fully aligned with `exactOptionalPropertyTypes`.
- `models/fingroup-representation.ts` exports the action and representation
  category types so aggregated namespaces such as `src/all/triangulated.ts`
  can surface them without compiler complaints.

## Next Focus Areas

1. Audit the runnable scripts to ensure they lean on the cleaned profunctor
   surface (`fromOptional`, `fromPrism`, `fromLens`, `toOptional`, etc.) rather
   than duplicating ad-hoc optics helpers.
2. Begin migrating the remaining quarantined example entry points to the new
   typed helpers so they can be unexcluded from production builds.

Re-run the command above after each pass to record the new totals and update
this file so the team can track progress over time.
