# Finite-group representation tooling

The representation helpers consolidate the core linear-algebraic workflows
needed to analyse finite-group actions inside the existing categorical
infrastructure. They combine the familiar `VectView` machinery with
`FinGrp` witnesses so permutation actions, intertwiners, invariants, and
subrepresentations can be packaged, inspected, and exported to downstream
modules without writing bespoke matrix code.

## Helper summary

- `packagePermutationRepresentation` lifts a finite-group action on a
  finite set into a faithful permutation representation, exposing the
  dimension, basis labels, cached matrices, and a reusable
  `Representation<string, R>` witness.【F:stdlib/representation-toolkit.ts†L23-L109】
- `enumerateIntertwiners` builds the linear system
  \(\sigma(g)T = T\rho(g)\) across a list of group elements and returns a
  basis of intertwiners as explicit matrices, together with the raw
  coefficient system for diagnostics.【F:stdlib/representation-toolkit.ts†L118-L170】
- `representationInvariants` stacks the kernels of \(\rho(g)-I\) to
  recover a basis for the invariant subspace, mirroring the equaliser
  intuition behind fixed points.【F:stdlib/representation-toolkit.ts†L172-L205】
- `analyzeSubrepresentation` checks whether a supplied basis is stable
  under the action, records any failures, and produces the induced action
  matrices on the quotient when the test passes.【F:stdlib/representation-toolkit.ts†L207-L293】

## Equaliser-driven workflow

Finite-group invariants arise as equalisers of the action against the
identity map. The new helpers slot directly into the existing
`finGrpKernelEqualizer` machinery so a single pipeline produces both the
categorical witnesses and the linear diagnostics:

1. Start with a concrete `FinGrpObj` and action data. Use
   `packagePermutationRepresentation` to obtain the representation and
   cached permutation matrices.
2. For any arrow \(f\) you wish to analyse, call
   `finGrpKernelEqualizer(domain, codomain, f)` to produce the kernel
   object and inclusion arrow. The helper already enforces closure under
   multiplication, inversion, and identity.【F:models/fingroup-equalizer.ts†L40-L118】
3. Feed the same set of group elements into `representationInvariants`
   to obtain a basis for the fixed subspace. Each invariant vector
   witnesses an element of the kernel equaliser, so you can compare the
   span reported here with the categorical inclusion computed in step 2.
4. Use `enumerateIntertwiners` to check whether two representations share
   common structure. Any non-trivial intertwiner can be factored through
   the equaliser by invoking `finGrpFactorThroughKernelEqualizer`, which
   certifies the mediator against the kernel inclusion.【F:models/fingroup-equalizer.ts†L120-L190】
5. When proposing a decomposition, hand the candidate basis to
   `analyzeSubrepresentation`. Successful analyses return the induced
   action matrices, which can be fed back into equaliser comparisons or
   downstream category constructions.

This synthesis keeps the categorical and linear viewpoints aligned: the
kernel helpers certify the universal property on the group side, while
the representation toolkit provides explicit matrices and diagnostics for
numerical experimentation.

## Diagnostic playbook

A typical smoke-test workflow for new actions combines the helpers as
follows:

1. Package the permutation action and inspect `matrices[element]` to
   verify the cached data matches the intended combinatorics.
2. Run `representationInvariants` to confirm the expected dimension of
   fixed vectors (e.g. the one-dimensional span of \(1,1,\ldots,1\) for a
   regular representation).
3. Compute `enumerateIntertwiners` against another representation to
   detect shared blocks or multiplicities—non-zero dimension indicates a
   non-trivial commuting algebra.
4. Assemble prospective decompositions, then call
   `analyzeSubrepresentation` to check stability and recover the induced
   action matrices. Failures include the offending image and residual so
   you can patch the basis quickly.

The resulting diagnostics dovetail with `FinGrp` kernels/equalisers to
surface both abstract witnesses and concrete linear data in a single
workflow.
