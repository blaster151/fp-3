# Algebraic Geometry Roadmap

## Stage 1 – Consolidate categorical and algebraic prerequisites
- [ ] Formalize links between existing category-theoretic modules (limits, monoidal structures) and the algebraic notions they approximate (rings, modules, sheaves).
- [ ] Identify missing abstractions underpinning schemes (commutative algebra utilities, locally ringed spaces) across the current codebase.
- [ ] Add missing primitives such as finitely generated modules and tensor products, ensuring they align with existing categorical interfaces.
  - [x] Provide finitely generated module oracles with executable witness search.
  - [x] Introduce tensor product primitives compatible with module infrastructure.

## Stage 2 – Introduce sheaf-theoretic machinery
- [x] Develop presheaf and sheaf abstractions on topological and categorical sites.
- [x] Implement Grothendieck topologies relevant for schemes (Zariski, étale).
- [x] Provide executable sheaf condition checks leveraging existing limit and colimit utilities.

## Stage 3 – Model affine schemes and their morphisms
- [x] Represent the spectrum of a commutative ring, including prime spectra and localization-based stalk computations.
- [x] Implement the structure sheaf as a sheaf of rings built on the Stage 2 framework.
- [x] Provide utilities for morphisms of affine schemes derived from ring maps, verifying pullbacks and pushouts.

## Stage 4 – Assemble global schemes and workflows
- [ ] Glue affine schemes along overlaps using categorical pushouts/pullbacks.
- [ ] Formalize fiber products, base change, and scheme-level properties (separated, quasi-compact).
- [ ] Develop example workflows and tests demonstrating affine/projective schemes and morphism compositions.

## Stage 5 – Extend toward advanced topics and tooling
- [ ] Explore derived functors (cohomology) and relate chain complexes to sheaf cohomology computations.
- [ ] Draft moduli/stack scaffolding with fibered categories and descent data.
- [ ] Enhance documentation, visualization, and automated tests for algebraic-geometry workflows.
