# Future Enhancements

## Enriched Eilenberg–Moore Calculus
- **What could be implemented:** Once the virtual equipment exposes executable horizontal/vertical composition for enriched 2-cells, upgrade `analyzeRelativeEnrichedEilenbergMooreAlgebra` to *derive* the Definition 8.16 composites instead of comparing user-supplied placeholders.
- **Trigger factor:** Availability of full 2-cell composition/whiskering for enriched distributors so the analyzer can synthesise the red/green pastings internally.
- **Source:** Section 8 (Definition 8.16) of the Street-style relative monad paper (see image reference provided by the user).

## Virtual Equipment Dualisation for V-Cat^co
- **What could be implemented:** Proposition 8.22 identifies an isomorphism between the virtual double categories V-Cat^co and V^co-Cat. Once the virtual equipment API exposes a programmatic dualisation (on objects, tight morphisms, and loose cells), we can add witnesses/analyzers that replay this equivalence and compare the induced distributors.
- **Trigger factor:** Implemented support for forming the co equipment (reversing tight 1-cells and proarrows) together with automatic transport of enriched hom/tensor data.
- **Source:** User-supplied Section 8.5 excerpt detailing Proposition 8.22.

## Relative Comonad Partial Right Adjoints
- **What could be implemented:** Theorem 8.23 constructs partial right adjoints for V-functors with small domain by dualising the enriched relative monad machinery. We could expose a `RelativeComonadPartialRightAdjointWitness` that records the induced V-natural transformations and verifies the universal property against the Lemma 6.38 section data.
- **Trigger factor:** Availability of executable V-natural transformations for comonad-induced copresheaves plus a dual of the relative monad hom-isomorphism analyzer so we can form the comparison functor into V^co-Cat automatically.
- **Source:** User-provided Section 8 excerpt covering Theorem 8.23 and the surrounding discussion on V-copresheaves.

## Generalised MNNE Left Kan Extensions
- **What could be implemented:** Extend `analyzeFiniteVectorLeftKanExtension` to work with arbitrary finite semirings and to synthesise the required cocone data automatically from a recorded relative adjunction instead of brute-force enumeration.
- **Trigger factor:** Availability of executable relative adjunction -> Kan extension translators (or a reusable left Kan solver) so the analyzer can ingest large structured diagrams without combinatorial explosion.
- **Source:** Section 2 of *Monads Need Not Be Endofunctors* (user-supplied scans) discussing the FinSet → Set left Kan extension and its monoidal structure.

## Non-finitary MNNE relatives (Examples 8–10)
- **What could be implemented:** Bring the powerset, coordinatewise vector, and possibly infinite λ-term relative monads into the executable suite by supporting infinite (co)limits, finitary approximation heuristics, or symbolic enumeration of context growth.
- **Trigger factor:** Infrastructure for representing infinite sets/relations (e.g., lazy generators or algebraic data types with decidable equality) together with Kan-extension solvers that can certify the Example 8–10 κ\_T isomorphisms without exhaustive enumeration.
- **Source:** Examples 8–10 from *Monads Need Not Be Endofunctors* (user-provided excerpt highlighting the non-finitary behaviour of P, Vec, and Lam).

## Indexed Container Substitution Mechanics
- **What could be implemented:** Upgrade `analyzeIndexedContainerRelativeMonad` to accept arbitrary indexed container substitution data (shape composition, context reindexing, and variable binding) instead of the current focus-position simplification. This would allow Example 4’s reduction of strictly positive families to W-types to run with genuine κ/σ substitutions.
- **Trigger factor:** A structured witness for indexed container substitution (e.g., explicit composition operators or a programmable tree-building calculus) so the analyzer can synthesise the substituted shapes rather than projecting a single focused value.
- **Source:** Example 4 of *Monads Need Not Be Endofunctors* (user-supplied scan highlighting the indexed container construction).

## Typed λ-Calculus Relative Monad (Example 3)
- **What could be implemented:** Encode the typed λ-calculus Example 3 as an executable relative monad by representing contexts as finite lists of simple types, adding type-directed term constructors, and checking the substitution/prism diagrams highlighted in the paper.
- **Trigger factor:** Infrastructure for finite product categories of types (e.g., a small typed context equipment with automatic weakening/renaming) so the analyzer can generate well-scoped, well-typed terms and substitutions without hand-written enumerations.
- **Source:** Example 3 from *Monads Need Not Be Endofunctors* (user-provided excerpt covering the typed λ-calculus construction).

## General Splitting Morphisms for Theorem 3
- **What could be implemented:** Extend the new Kleisli diagnostics to a full category of splittings by recording the functorial action \(V : D → D'\) and comparing the induced mediating transformations against both Kleisli and Eilenberg–Moore presentations, making the initial/terminal claims of Theorem 3 executable.
- **Trigger factor:** Availability of executable transformation synthesis between relative Kleisli/Eilenberg–Moore witnesses (e.g., a reusable bridge that derives comparison functors from supplied adjunction data) so the analyzer can construct the morphism witnesses instead of accepting user-specified placeholders.
- **Source:** Theorem 3 from *Monads Need Not Be Endofunctors* (user-supplied scan outlining splitting morphisms).

## Lax Monoidal Functor Categories Beyond Identity Transformations
- **What could be implemented:** Generalise `analyzeMnneLaxMonoidalStructure` to accept non-trivial Lan\_j unitors/associators by synthesising the tensor of natural transformations rather than relying on identity comparisons, enabling future witnesses drawn from richer equipments.
- **Trigger factor:** Implemented support for whiskering Lan\_j across natural transformations (or a reusable constructor that evaluates `Lan_j` on arrow data) so the analyzer can build `ρ_F ⊙ id_G`, `id_F ⊙ λ_G`, and the pentagon composites instead of defaulting to identity arrows.
- **Source:** Section 3.2 of *Monads Need Not Be Endofunctors* (user-provided scan describing the lax monoidal structure on `[J,C]`).

## Well-Behaved Density and Lan Comparisons
- **What could be implemented:** Extend `analyzeMnneWellBehavedInclusion` with the remaining Definition 4.1 checks by replaying the Lan\_j comparison maps `L^F_{X,Y}` and the density factorisations so the oracle confirms the partial right adjoints demanded by Theorem 6. The analyzer should synthesise the Lan\_j colimits, compare them against the recorded functors, and certify that the canonical maps are isomorphisms.
- **Trigger factor:** Availability of a reusable finite Lan\_j solver (or adjunction-driven constructors) that can build the required colimit witnesses and comparison arrows automatically, allowing the analyzer to compute the red/green composites instead of relying solely on full-faithfulness checks.
- **Source:** Definition 4.1 and Theorem 6 from *Monads Need Not Be Endofunctors* (user-provided scans covering the well-behaved conditions).

## Reference Mining Candidates
- **Potential value:** Several references near the end of the paper (e.g., Altenkirch–Chapman–Uustalu on monads in computer science, Ahrens et al. on substitution systems, and Street’s enriched Yoneda work) likely contain reusable constructions for enriched (co)monads and partial adjoints.
- **Trigger factor:** Once the current Section 8 enrichments stabilise, revisit these citations to import additional examples (such as `Monads need not be endofunctors` or `Enriched Yoneda`s) into executable witnesses/oracles.
- **Source:** User-supplied reference list excerpt featuring entries like [ACU10], [AHR+21], [Str72], [DS97], [Kel05], alongside the lambda-calculus papers of Altenkirch–Reus and Altenkirch–Reus–Streicher cited in Examples 2–3.
