# Internal Group Completeness Checklist

## Key Insights from Definition 61 and Theorems 58–59

- **Binary products + terminal object suffice**: Any category `C` with these limits can host internal groups once we supply arrows `m: G × G → G`, `e: 1 → G`, and `i: G → G` satisfying the three group diagrams `(G1)`, `(G2)`, `(G3)`.
- **Set as ground truth**: In `Set`, the categorical internal-group definition is equivalent to the usual group axioms. This lets us build fixture witnesses and regression tests by falling back to classical groups.
- **Top and Man inherit the pattern**: When we restrict to continuous (Top) or smooth (Man) arrows, an internal group witness enforces the ordinary topological or Lie group structure. These categories already expose binary products and a terminal object via existing adapters.

## Engineering Follow-ups

1. **Witness schema**
   - Extend the planned internal group witness type to require explicit component arrows `(m, e, i)` together with the three commutative diagrams.
   - Reuse product oracles (diagonal–pairing, interchange, unit) to certify the square/triangle equalities in `(G1)`–`(G3)`.
2. **Set integration**
   - Add constructors that lift plain finite-group data into the internal-group witness, verifying `(G1)`–`(G3)` through the oracles.
   - Generate sample witnesses for law suites from `FinGrp` objects already exercised in `law.FinGrpProduct.spec.ts`.
3. **Topological and smooth adapters**
   - Layer adapters translating topological groups and Lie groups into the internal witness format, making sure continuity/smoothness predicates wrap the homomorphisms `m`, `e`, `i`.
   - Hook the adapters into existing `Top` and `Man` product utilities so the oracles share limit witnesses.
4. **Executable laws**
   - Create law files `law.SetInternalGroup.spec.ts`, `law.TopInternalGroup.spec.ts`, and `law.ManInternalGroup.spec.ts` that:
     - instantiate witness builders for canonical examples (e.g., `(ℝ, +)` with standard topology, matrix Lie groups),
     - perturb each arrow to confirm violations of `(G1)`–`(G3)` are detected,
     - cross-check with the interchange oracle to ensure associativity carries through categorical composition.
5. **M₂ alignment**
   - Verify that the `M₂` category reuses the same witness type and limit oracles, enabling the new products/unit lemmas to support internal-group construction once morphism smoothness/continuity constraints are specified.

## Documentation Updates

- Expand `LAWS.md` with an "Internal Groups" section summarizing `(G1)`–`(G3)` and listing the new law suites.
- Cross-link product-related documentation so the new group witnesses cite the required oracles.
- Capture Top/Man adapter requirements in category-specific docs to avoid duplication.
