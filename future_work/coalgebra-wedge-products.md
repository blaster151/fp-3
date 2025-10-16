# Wedge Products and Cotensor Coalgebras in Monoidal Categories

## Motivation and Source
- **Reference:** *Wedge Products and Cotensor Coalgebras in Monoidal Categories* (Ardizzoni–Menini–Ştefan).
- **Goal:** Extend the executable toolkit beyond cartesian wedge categories to the coalgebraic wedge products needed to characterise hereditary coalgebras inside abelian monoidal categories.
- **Trigger:** Once we can represent coalgebras/comodules in an "abelian monoidal" category and execute cotensor constructions, we can replay the paper's equivalences (hereditary ⇔ formally smooth ⇔ cotensor coalgebra presentations).

## Workstream Overview
1. **Foundational Infrastructure for Coalgebras in Monoidal Categories**
   1.1 Implement core type classes for monoidal categories that are cocomplete, complete, and satisfy AB5-style exactness flags.
   1.2 Define executable coalgebra and comodule interfaces (structure maps, counit, coassociativity witnesses) mirroring the existing algebra/oracle patterns.
   1.3 Build diagnostic oracles to check comonoid axioms, exactness conditions, and coseparability in the ambient monoidal category.

2. **Subcoalgebra Management and Wedge Product Construction**
   2.1 Represent subcoalgebras via monomorphism witnesses, including inclusion maps and induced comodule structures.
   2.2 Implement a `computeWedgeProduct(D1, D2, C)` helper that constructs intersections inside a fixed coalgebra \(C\) using equaliser/pullback machinery, returning structural witnesses and failure diagnostics.
   2.3 Add verification oracles confirming that wedge products satisfy the universal property and interact well with direct limits.

3. **Cotensor Coalgebra Builder**
   3.1 Encode cotensor powers \(D \Box^n_D M\) using the newly added wedge constructions and iterated cotensors.
   3.2 Provide a `buildCotensorCoalgebra(D, M)` routine that assembles the direct limit described in the paper, carrying explicit structure maps and inclusion witnesses.
   3.3 Develop oracles checking the universal property of the cotensor coalgebra against coalgebra morphisms from wedge-filtered towers.

4. **Hereditary vs. Formally Smooth Classification Toolkit**
   4.1 Express hereditary coalgebras via splitting conditions on short exact sequences and implement a `checkHereditaryCoalgebra` oracle.
   4.2 Implement `checkFormallySmoothCoalgebra` using liftings against square-zero extensions, sharing witnesses with the hereditary checker.
   4.3 Prove the equivalences claimed in the paper by building an analyzer that reports `{ isHereditary, isFormallySmooth, isCotensor, witnesses }` with constructive implications between each predicate.

5. **Executable Case Studies**
   5.1 Instantiate the framework for coalgebras in \(\mathrm{Vect}_k\) to reproduce the paper's “new results” inside vector spaces, including coseparable base cases.
   5.2 Provide finite-dimensional test fixtures and property-based sampling to ensure the wedge and cotensor builders behave in concrete settings.
   5.3 Document the findings in `LAWS.md` and register new law specs in the global registry.

6. **Integration and Documentation**
   6.1 Export the new helpers via `allTS.ts` and ensure compatibility with existing oracle registries.
   6.2 Add narrative context to `KNOWLEDGE_BASE.md` explaining how coalgebraic wedges generalise the terminal-wedge products we already exercise.
   6.3 Update `FUTURE_ENHANCEMENTS.md` or related planning docs once milestones (e.g., basic coalgebra support) land, keeping this workstream in sync with broader roadmap items.

## Open Questions for Later Iterations
- How much of the AB5/cocomplete machinery should be executable versus assumed via flags?
- Can the wedge-product oracle reuse existing pullback/equaliser infrastructure, or do we need dedicated coalgebraic solvers?
- What minimal examples (beyond \(\mathrm{Vect}_k\)) best demonstrate the hereditary/formally smooth equivalence once the infrastructure is live?
