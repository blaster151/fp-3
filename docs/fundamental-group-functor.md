# Fundamental Group Functor Toolkit

Milestone 27 introduces executable approximations of the pointed-topological constructions used to derive Brouwer's fixed-point theorem. The new modules model 1-dimensional pointed CW complexes as finite graphs with oriented edges and provide an elementary fundamental group functor
\[
  \pi_1 : \mathbf{CW}_*^{(1)} \longrightarrow \mathbf{Grp}
\]
that computes free groups on the non-tree edges of each complex.

## Pointed CW Complexes

`pointed-cw-complex.ts` defines:

- `PointedCWComplex` objects with explicit vertices, oriented edges, and a distinguished basepoint.
- `PointedCWMap` morphisms that map vertices to vertices and edges to edge paths while preserving basepoints and inverses.
- Validation helpers (`validatePointedCWComplex`, `validatePointedCWMap`) and composition utilities (`composePointedCWMaps`, `identityPointedCWMap`).
- Fixtures for the circle, disk, and annulus alongside canonical inclusions and retractions used throughout the milestone.

The helper ensures every undirected edge appears with two orientations, verifies path connectedness, and confirms that morphisms respect endpoints and inverse edges.

## Free-Group Calculus

`free-group.ts` packages reduced words in free groups with cancellation-aware multiplication, inversion, and equality checks. The builder `makeFreeGroup` emits both the group operations and a small set of sample words so the group category can compare homomorphisms executably.

## Fundamental Group Functor

`fundamental-group.ts` assembles the toolkit:

- `computeFundamentalGroup` builds a spanning tree for a pointed CW complex, extracts generator loops for each non-tree edge, and returns the associated free group with evaluation helpers for arbitrary edge paths.
- `makeGroupCategory` and `buildFundamentalGroupFunctor` manufacture the target category of groups and the functor witness from pointed CW complexes, ensuring the resulting functor satisfies the strengthened identity and composition diagnostics from Milestone 4.
- `retractionObstructionFromPi1` replays the textbook contradiction when a hypothetical retraction would force \(\pi_1\) to collapse nontrivial loops.
- `brouwerFixedPointFromNoRetraction` packages the Brouwer argument by combining the obstruction oracle with the boundary inclusion of the disk.

The exported `fundamentalGroupDemoCategory` gathers the circle, annulus, and disk with their canonical maps for quick experimentation.

## Regression Coverage

`test/fundamental-group.functor.spec.ts` covers the new infrastructure by:

- Verifying the fundamental group functor preserves identities and composition on the sample category.
- Confirming that inclusions send loop generators to the expected free-group elements and that true retractions (annulus \(\to\) circle) act as the identity on \(\pi_1\).
- Exhibiting the obstruction that prevents retracting the disk onto its boundary and recording the Brouwer fixed-point witness.
- Rejecting morphisms that fail the basepoint-preservation requirement to emphasise the role of pointed maps.

Together these additions fulfil Milestone 27 by making the fundamental group functor, retraction obstructions, and Brouwer fixed-point diagnostics executable within the fp-3 codebase.
