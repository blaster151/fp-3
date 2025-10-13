# Runnable Example Rebuild Plan

This directory tracks the concrete rebuild of the seventy-six runnable suites
captured in `../runnable-examples-outline.md`. The goals are:

- **Visibility** – keep the simple-to-advanced progression obvious to new
  contributors.
- **Stability** – leave numeric gaps so new runnable demos can be inserted
  without mass renumbering.
- **Reusability** – keep every runnable suite self-contained so the future
  documentation or notebooks can import them independently.

## Directory layout

Each runnable suite lives in a numerically prefixed module whose identifier is a
three-digit ordinal that matches the catalogue position. For example:

```
examples/runnable/
  001-option-result-basics.ts
  002-result-do-notation.ts
  003-effect-composition.ts
  ...
```

The prefix keeps the curated order visible. When we need to slide a new suite
between existing ones we can either renumber a small contiguous block or append
an explicit suffix (for example `042b`) without disturbing unrelated modules.

While the rebuild is in progress we use lightweight **narrative placeholders**
for stages that have not yet regained executable coverage. These modules are
generated from `runnable-examples-outline.md` via
`scripts/generate-runnable-narratives.js` and surface the learning goals,
source references, and TODO markers when invoked. Replacing a placeholder with
an executable demo is as simple as swapping the implementation while keeping
the `RunnableExample` metadata intact.

`manifest.ts` aggregates metadata about every runnable suite so orchestration,
CLI runners, or documentation tooling can query the catalogue without hard
coding paths.

## Adding a new runnable suite

1. Pick an identifier that preserves the progression and, if possible, matches
   the outline position. If an intermediate slot is required, append a
   lowercase suffix (e.g. `"042b"`) and document the ordering in the manifest
   comment.
2. Create a module that exports a `RunnableExample` with:
   - `id`: the identifier as a string (e.g. `"001"`).
   - `title`: a short label that mirrors the outline entry.
   - `outlineReference`: the one-based index from
     `runnable-examples-outline.md`.
   - `summary`: a short description of the runnable goal.
   - `run`: an async function returning a log transcript that can be printed or
     inspected by tests.
3. Register the example in `manifest.ts` so it becomes discoverable.
4. (Optional) Update scripts that consume the manifest if a new grouping or tier
   is introduced.

This plan keeps the rebuild incremental: we can land a few suites at a time
while preserving the global catalogue in `runnable-examples-outline.md`.

## Recommended implementation cadence

To keep reviews focused and the catalogue steadily improving, target batches of
**three to five runnable suites per pass** when converting placeholders into
executable examples:

- The lower-numbered stages (IDs `001`–`020`) are tightly related and can often
  be implemented three or four at a time because they share algebraic helpers
  and simple effect stacks.
- Mid-tier entries (`021`–`050`) introduce more categorical structure; plan on
  three items per pass so supporting types and oracles stay digestible.
- Advanced suites (`051` onward) frequently depend on shared Markov or
  semicartesian infrastructure. Two or three substantial rebuilds per pass keep
  proofs and witnesses reviewable while leaving room to slot in additional
  demonstrations later.

Sticking to this cadence makes it easy to pause after any pass, rerun the
catalogue in order, and still have a coherent teaching arc.
