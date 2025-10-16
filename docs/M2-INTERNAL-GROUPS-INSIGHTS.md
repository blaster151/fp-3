# Internal Group Objects: Implementation Notes from Section 14

## Context Recap
- Section 14 reframes classical group axioms in purely categorical terms by isolating an object \(G\) equipped with morphisms `m: G × G → G`, `e: 1 → G`, and `i: G → G` that jointly satisfy diagrams (G1)–(G2).
- These diagrams enforce associativity (the top square of (G1)), left/right unit laws (the bottom square of (G1)), and the two-sided identity behaviour of `e` with respect to the inversion arrow (diagram (G2)).
- The narrative emphasises that internal groups only require finite products—no native binary-operation primitives—so our existing product constructors and diagonals are the raw ingredients for translating the theory into code.

## Implementation Opportunities
1. **Factor out an `InternalGroupWitness` helper.**
   - Model the triple `(m, e, i)` together with its ambient `ProductWitness` for `G × G` and `TerminalWitness` for `1`.
   - Provide dedicated oracles `checkInternalGroupAssociativity`, `checkInternalGroupUnit`, and `checkInternalGroupInversion` that specialise the freshly added binary-product helpers (diagonal–pairing, interchange, and unit compatibility) to the (G1)–(G2) diagrams.
   - Ensure oracle results return structured diagnostics (e.g., which leg or composite failed) so law tests can surface precise counterexamples.

2. **Bridge Set-level groups into `InternalGroupWitness`.**
   - Reuse `FinGrp` (and eventually `Grp`) data to build `m`, `e`, `i`, then wrap them in the witness helper with the Set-category product/unit constructors.
   - Add adapters for `Top` and `Man` objects that validate continuity/smoothness before instantiating the witness, matching the "Set, Top and Man" emphasis in the excerpt.
   - Register these constructors in `allTS.ts` for downstream consumers.

3. **Executable law suites.**
   - Extend `test/laws/law.FinGrpProduct.spec.ts` (and forthcoming Top/Man suites) to invoke the new oracles on nontrivial examples, confirming that associativity, unit, and inversion diagrams commute.
   - Mutate each structural arrow in isolation to guarantee the diagnostic messages identify the exact broken axiom.
   - Document the law usage patterns in `LAWS.md`, linking to both the oracle helpers and any sample fixtures.

4. **`M2`-specific integration.**
   - Investigate how an internal group in `\mathbf{M}_2` manifests: the idempotent endomorphism must commute with `m`, `e`, and `i`. Capture this as an additional oracle that composes the `M2` idempotence checks with the internal-group ones.
   - Provide constructors for objects `(X, f)` where `f` preserves the chosen subgroup in the Set-level realisation, ensuring the mediating equaliser from the product proof remains stable under group operations.
   - Add regression tests that contrast compliant vs noncompliant idempotents to highlight the categorical constraints.

## Follow-Up Questions
- Should inversion be optional when targeting monoid objects, or do we maintain a separate witness type (`InternalMonoidWitness`) to maximise code reuse?
- How can we reuse the newly minted interchange oracle to streamline proofs of associativity within enriched categories (e.g., `Top`)?
- Does the `M2` integration demand a refined notion of "group-compatible idempotent" that deserves its own constructor or search oracle?
