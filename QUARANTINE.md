# Type Error Quarantine

This file tracks files that have been temporarily excluded from production typechecking due to architectural debt or being non-production code.

## Usage

```bash
# Check ALL files (including quarantined)
npm run typecheck

# Check ONLY production-ready files (excludes quarantined)
npm run typecheck:prod

# Audit runnable example debt with production settings
npm run typecheck:prod:runnable
```

## Quarantined Files

🎉 **None!** Every TypeScript source now ships with production typechecking enabled.

The remaining store–lens walkthrough has been fully migrated into the runnable
catalogue (`examples/runnable/029–030b`) and the entire Markov family now relies
on the shared `Dist<R, X>` probability bridge. The legacy quarantine exclusions
have been deleted from `tsconfig.prod.json`, so `npm run typecheck:prod`
exercises the same surface as the full `npm run typecheck` audit.

### Recent Milestones
- ✅ Completed the staged Markov refactor, routing determinism, infinite, and
  CRing⊕ diagnostics through the canonical probability adapters.
- ✅ Added regression oracles and runnable coverage that continuously exercise
  the new distribution bridge.
- ✅ Ported the remaining example debt onto the runnable manifest and retired
  the `examples-store-lens.ts` entry point.
- ✅ Removed the final adapter shims and Map-based conversions so the probability
  monad surface exposes the only Map↔rigged bridge.

## Status

- **Before Quarantine:** 1,646 total errors
- **After Quarantine:** **0 prod errors** ✅
- **Quarantined:** **0 errors remaining** 🎯

## Strategy

1. ✅ Get prod code to 0 errors
2. ✅ Use `typecheck:prod` as your CI gate (now covers all files)
3. ✅ Tackle quarantined files systematically
4. ✅ Remove files from quarantine as they're fixed

## Removal Criteria

A file can be removed from quarantine when:
1. It has 0 type errors
2. Changes pass `npm run typecheck:prod` (introduce no new errors)
3. Tests pass (if applicable)

All criteria have now been satisfied for every previously quarantined file.

