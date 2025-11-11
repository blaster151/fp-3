# Residual Runner Scaffold Plan

## Overview

Phase IV b extends the runner toolkit with support for residual endofunctors
`R`.  Pass 1 landed the core `ResidualStatefulRunner` type and metadata bridge,
while Pass 2 layered in morphism helpers plus θ-alignment diagnostics.  This
document captures the remaining roadmap, diagnostic expectations, and test
coverage for the residual runner feature set.

## Current State (after Pass 2)

- `ResidualStatefulRunner` wraps a `StatefulRunner`, retains residual θ
  components, and stores structured diagram witnesses (`theta`, `eta`, `mu`).
- Morphism utilities (`make/identity/compose`) reuse existing Run(T) morphism
  semantics, with `checkResidualRunnerMorphism` delegating to
  `checkRunnerMorphism`.
- `checkResidualThetaAlignment` samples residual θ evaluations against the base
  runner’s θ, producing a reusable `ResidualDiagramWitness`.
- `withResidualDiagramWitnesses` merges freshly computed alignment witnesses
  back into a residual runner instance while appending diagnostics.

## Roadmap

1. **Translate residual runners ⇔ monad maps**
   - Adapter stubs will thread `ResidualStatefulRunner` through
     `residualRunnerToMonadMap` and `monadMapToResidualRunner`, reusing the new
     alignment/diagram helpers.
2. **Residual category/diagram oracles**
   - Package residual morphism checks into dedicated oracles with registry
     entries mirroring the Run(T) suite.
3. **Examples and regression coverage**
   - Build focused examples (e.g. exception monad residual) exercising the
     alignment diagnostics and morphism checks.

## Diagnostics Checklist

- θ-alignment witness summarises total samples and mismatches per object.
- Morphism reports include θ-square and coalgebra-square tallies, matching the
  Run(T) diagnostics.
- Diagram updates append summarised metadata entries of the form
  `Residual diagram {diagram}: checked=M mismatches=N`.

## Planned Tests

1. **`ResidualRunner Morphism` suite**
   - Smoke-test `identityResidualRunnerMorphism` → `checkResidualRunnerMorphism`
     should hold.
   - Compose two artificial residual morphisms and confirm diagnostic entries
     mention the composition note.
2. **`Residual θ Alignment` suite**
   - Construct a residual runner with synthetic θ outputs and ensure
     `checkResidualThetaAlignment` records mismatches when the residual functor
     perturbs the value.
   - Verify `withResidualDiagramWitnesses` attaches the computed witness and
     that metadata/diagnostics include the summarised line.
3. **Round-trip outline**
   - Once monad-map translators exist, confirm the adapters respect the stored
     witnesses (placeholder for future pass).

## Implementation Notes

- Sampling defaults align with previous runner diagnostics (`sampleLimit=12`)
  to keep cross-module behaviour consistent.
- Diagram witness helpers deliberately avoid throwing; they log missing data as
  per-object diagnostics and return zero coverage.
- All exported helpers are re-exported through `allTS.ts` to keep downstream
  modules type-complete during the transition phase.
