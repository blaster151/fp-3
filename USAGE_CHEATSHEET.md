# Usage Cheat Sheet: When to Reach for What

This document provides a quick reference for finding the right tool for your problem. Organized by **use case** rather than implementation details.

---

## 🎯 **If You Need To...**

### **Work with core typeclasses**
| **Goal** | **Use This** | **Notes** |
|----------|--------------|-----------|
| Fold over arrays | `getFoldableArray().foldMap(Monoid)(f)(values)` | Mirrors `Array.prototype.reduce` while reusing monoids from `stdlib/monoid` |
| Traverse arrays with effects | `getTraversableArray().traverse(Applicative)(f)(values)` | Works with `OptionI`, `ResultI`, or any exported `Applicative` |
| Filter/partition arrays | `getFilterableArray().partition(predicate)(values)` | Indexed helpers (`filterWithIndex`, `partitionMapWithIndex`) expose element positions |
| Filter an Option | `OptionFilterable.filter(predicate)(option)` | Returns `None` when the predicate fails |
| Wither a Result | `getResultWitherable({ onNone, onFalse }).wither(Applicative)(f)(result)` | Supply fallback errors via the config; use `getResultFilterable`/`getResultTraversable` for the other operations |

### **Manipulate finite sets**
*Module:* `src/collections/set`
| **Goal** | **Use This** | **Notes** |
|----------|--------------|-----------|
| Build sets from iterables/foldables | `fromIterable(items)` or `fromFoldable(F)(Eq)(structure)` | `Eq` eliminates duplicates and `Ord` sorts traversal when supplied |
| Show or compare sets | `getShow(showElem, ord)` / `getEq(eqElem)` | Optional `Ord` sorts the presentation before rendering |
| Map/filter/partition with dedup | `map(EqB)(f)(set)`, `filter(pred)(set)`, `partitionMap(eqLeft, eqRight)(f)(set)` | All element-changing operations require an `Eq` for the result type |
| Option/Result pipelines | `filterMap(EqB)(f)(set)`, `compact(EqA)(setOfOptions)`, `separate(eqLeft, eqRight)(setOfResults)` | Mirrors the Array helpers, enabling Option/Result pipelines without losing dedup |
| Traverse/sequence with effects | `ReadonlySetTraversableWithIndex.traverse(Applicative)({ ord, eq })(f)(set)` | Supply an `Ord` to guarantee deterministic effect order |
| Wither/wilt sets | `wither(Applicative)({ ord, eq })(f)(set)`, `wilt(Applicative)({ ord, left, right })(f)(set)` | Generalises filterMap/partitionMap into effectful settings |
| Combine sets algebraically | `union(Eq)(other)(base)`, `intersection(Eq)(other)(base)`, `difference(Eq)(other)(base)`, `symmetricDifference(Eq)(other)(base)` | `getUnionMonoid`, `getIntersectionSemigroup`, `getDifferenceMagma`, `getSymmetricDifferenceMagma` expose ready-made instances |
| Cartesian product | `cartesianProduct(eqA, eqB)(bs)(as)` | Produces a deduplicated set of tuples respecting both equalities |

> **Migration tip:** legacy call sites importing from `stdlib/collections` still work, but the richer helpers now live in `src/collections/set`. Prefer importing from the new module so the Eq/Ord-aware APIs are available in one place.

### **Validate module actions**
| **Goal** | **Use This** | **Notes** |
|----------|--------------|-----------|
| Certify that a ring action forms a module | `checkModule(module, { scalarSamples, vectorSamples })` | Confirms zero/negation, scalar laws, **and** now rejects non-associative or non-commutative additions by surfacing explicit witnesses |

### **Solve Graph Problems**
| **Problem** | **Use This** | **Semiring** |
|-------------|--------------|--------------|
| Find shortest paths | `shortestPathsUpTo(graphAdjWeights(n, edges))` | `SemiringMinPlus` |
| Count paths of exact length k | `countPathsOfLength(graphAdjNat(n, edges), k)` | `SemiringNat` |
| Check reachability within L steps | `reachableWithin(graphAdjBool(n, edges), L)` | `SemiringBoolOrAnd` |
| Find longest paths in DAG | `powMat(SemiringMaxPlus)(adj, k)` | `SemiringMaxPlus` |
| Transitive closure | `closureUpTo(SemiringBoolOrAnd)(adj, n-1)` | `SemiringBoolOrAnd` |

### **Build Automata & Language Recognition**
| **Problem** | **Use This** | **Notes** |
|-------------|--------------|-----------|
| Compile regex to automaton | `compileRegexToWA(pattern)` | Supports `()`, `|`, `*`, `+`, `?`, `[a-z]`, `[^abc]`, `.` |
| Compile regex with explicit alphabet | `compileRegexToWAWithAlphabet(pattern, alphabet)` | Full control over symbol set |
| Count how many ways to parse a word | `waRun(automaton)(word)` | Use `SemiringNat` |
| Check if word is accepted | `waAcceptsBool(automaton)(word)` | Use `SemiringBoolOrAnd` |
| Intersect two automata | `waProduct(S)(A, B)(alphabet)` | Synchronous product |
| Score word with weights | `waRun(automaton)(word)` | Custom semiring |

### **Process Sequential Data**
| **Problem** | **Use This** | **Semiring** |
|-------------|--------------|--------------|
| Compute sequence probability | `hmmForward(hmm)(observations)` | `SemiringProb` |
| Find most likely path (Viterbi) | `hmmForward(hmm)(observations)` | `SemiringMaxPlus` |
| Forward message passing | `vecMat(S)(state, transition)` | Any |
| Backward aggregation | `matVec(S)(weights, values)` | Any |

### **Dynamic Programming**
| **Problem** | **Use This** | **Semiring** |
|-------------|--------------|--------------|
| Edit distance / alignment | Matrix DP with custom semiring | `SemiringMinPlus` |
| Count DP solutions | Matrix DP with counting | `SemiringNat` |
| Optimal substructure | Matrix DP with optimization | `SemiringMinPlus`/`MaxPlus` |
| Reachability DP | Matrix DP with Boolean | `SemiringBoolOrAnd` |

### **Handle Probabilities**
| **Problem** | **Use This** | **Notes** |
|-------------|--------------|-----------|
| Normalize probability vectors | `normalizeRow(probVector)` | Defensive normalization |
| Create emission matrices | `diagFromVec(SemiringProb)(weights)` | Diagonal from vector |
| Probability computations | Use `SemiringProb` with any matrix op | Standard +, × |

### **Work with Relative Monads**
| **Task** | **Use This** | **Notes** |
|----------|--------------|-----------|
| Embed a classical monad as identity-root | `fromMonad(monad, { rootObject })` | Reuses the monad’s endofunctor as carrier |
| Inspect structural law coverage | `enumerateRelativeMonadOracles(relative)` | Returns framing/identity reports and pending associativity |
| Surface Street action scaffolding | `enumerateRelativeAlgebraOracles(relative)` | Emits Definition 6.1/6.9 diagnostics with witness payloads |
| Check Example 5 Kleisli matrices | `RelativeMonadOracles.vectorKleisliSplitting(witness)` | Confirms Boolean matrix identities & associativity |
| Compare Example 1 arrows with the relative monad | `RelativeMonadOracles.vectorArrowCorrespondence()` | Ensures `arr`/composition agree with the canonical Boolean action |
| Check Example 6 Kleisli substitutions | `RelativeMonadOracles.lambdaKleisliSplitting(witness)` | Reuses λ-witness to verify identity/composition |

```typescript
import {
  fromMonad,
  enumerateRelativeMonadOracles,
  enumerateRelativeAlgebraOracles,
  RelativeAlgebraOracles,
  describeTrivialRelativeKleisli,
  describeTrivialRelativeEilenbergMoore,
  idFun,
  composeFun,
} from './allTS'
import { TwoObjectCategory } from './two-object-cat'
import { describeBooleanVectorRelativeMonadWitness } from './relative/mnne-vector-monads'
import { describeUntypedLambdaRelativeMonadWitness } from './relative/mnne-lambda-monads'

const identityMonad = {
  category: TwoObjectCategory,
  endofunctor: idFun(TwoObjectCategory),
  unit: {
    source: idFun(TwoObjectCategory),
    target: idFun(TwoObjectCategory),
    component: (obj: '•' | '★') => TwoObjectCategory.id(obj),
  },
  mult: {
    source: composeFun(idFun(TwoObjectCategory), idFun(TwoObjectCategory)),
    target: idFun(TwoObjectCategory),
    component: (obj: '•' | '★') => TwoObjectCategory.id(obj),
  },
} as const

const relative = fromMonad(identityMonad, { rootObject: '•' })
const monadReports = enumerateRelativeMonadOracles(relative)
const kleisli = describeTrivialRelativeKleisli(relative)
const eilenbergMoore = describeTrivialRelativeEilenbergMoore(relative)
const algebraReports = enumerateRelativeAlgebraOracles(kleisli, eilenbergMoore)
const emReport = RelativeAlgebraOracles.eilenbergMooreUniversalProperty(eilenbergMoore)
const partialRightAdjoint = RelativeAlgebraOracles.partialRightAdjointFunctor({
  presentation: eilenbergMoore,
  section: eilenbergMoore.universalWitness!.section,
  comparison: {
    tight: relative.root.tight,
    domain: relative.root.from,
    codomain: relative.carrier.to,
  },
  fixedObjects: [relative.root],
})
const enrichedReport = RelativeMonadOracles.enrichedCompatibility(relative)
const setEnrichedReport = RelativeMonadOracles.setEnrichedCompatibility(relative)
const enrichedEmReport = RelativeMonadOracles.enrichedEilenbergMooreAlgebra(relative)
const kleisliInclusion = RelativeMonadOracles.enrichedKleisliInclusion(relative)
const yonedaReport = RelativeMonadOracles.enrichedYoneda(relative)
const yonedaDistributor = RelativeMonadOracles.enrichedYonedaDistributor(relative)
const vcatReport = RelativeMonadOracles.enrichedVCatSpecification(relative)
const opalgebraResolution = RelativeAlgebraOracles.opalgebraResolution(kleisli)
const partialLeftAdjoint = RelativeAlgebraOracles.partialLeftAdjointSection(kleisli)
const vectorWitness = describeBooleanVectorRelativeMonadWitness([0, 1, 2])
const lambdaWitness = describeUntypedLambdaRelativeMonadWitness()
const vectorKleisli = RelativeMonadOracles.vectorKleisliSplitting(vectorWitness)
const vectorArrow = RelativeMonadOracles.vectorArrowCorrespondence()
const lambdaKleisli = RelativeMonadOracles.lambdaKleisliSplitting(lambdaWitness)

console.log(monadReports.map((report) => `${report.registryPath}: ${report.holds}`))
console.log(algebraReports.map((report) => report.registryPath))
console.log(emReport.mediatingTightCellReport?.issues)
console.log(emReport.sectionReport?.issues)
console.log(partialRightAdjoint.sectionReport?.issues)
console.log(enrichedReport.issues)
console.log(setEnrichedReport.issues)
console.log(enrichedEmReport.issues)
console.log(kleisliInclusion.issues)
console.log(vectorKleisli.issues)
console.log(vectorArrow.issues)
console.log(lambdaKleisli.issues)
console.log(yonedaReport.issues)
console.log(yonedaDistributor.issues)
console.log(vcatReport.issues)
console.log(opalgebraResolution.resolutionReport?.issues)
console.log(partialLeftAdjoint.resolutionReport?.issues)
```

The enriched Yoneda distributor analyzer also exposes the `rightLift` report
returned by `analyzeRelativeEnrichedYonedaDistributor`, letting you confirm that
the Lemma 8.7 right lift `q ▷ p` reuses the representable loose arrow and the
relative monad’s loose cell.

`RelativeMonadOracles.enrichedKleisliInclusion` replays Lemma 8.7’s
identity-on-objects functor k_T : A → Kl(T) by checking the inclusion shares
the loose arrow, unit, and extension witnesses and reporting the κ_T opalgebra
comparison triangles.

`RelativeMonadOracles.setEnrichedCompatibility` specialises Example 8.14 to
Set-enriched roots, replaying the Lemma 6.38 fully faithful section and
ensuring each recorded correspondence shares the loose arrow, unit, and
extension with the underlying relative monad.

`RelativeMonadOracles.enrichedVCatSpecification` mirrors Theorem 8.12 by
replaying the enriched unit and multiplication triangles, enforcing the
functorial identity/composition diagrams, and confirming the τ witnesses all
agree with the recorded comparisons.

To mirror Example 1 from *Monads Need Not Be Endofunctors*, build the Boolean
vector-space witness with `describeBooleanVectorRelativeMonadWitness()` and feed
it to `analyzeFiniteVectorRelativeMonad`. The helper enumerates every basis map
between the listed finite dimensions, validates the unit/extension laws, and is
hooked into `examples.ts` as `RelativeMonadExamples.booleanVectorRelativeMonadDemo()`
for quick inspection.

To replay Example 2’s λ-calculus relative monad, call
`describeUntypedLambdaRelativeMonadWitness()` and analyse it with
`analyzeUntypedLambdaRelativeMonad`. The analyzer synthesises all well-scoped
terms up to the configured depth for each finite context, replays the
capture-avoiding substitution operator, and checks the unit, associativity, and
identity-on-context requirements. `RelativeMonadExamples.untypedLambdaRelativeMonadDemo()`
prints the resulting report in `examples.ts`.

To emulate Example 4’s indexed container construction, use
`describeIndexedContainerExample4Witness()` with
`analyzeIndexedContainerRelativeMonad`. The helper enumerates the finite
families over the Nat/Stream indices, applies the Example 4 unit/extraction
data, and verifies the relative monad laws via the induced substitution
operator. `RelativeMonadExamples.indexedContainerRelativeMonadDemo()` prints the
summary alongside the other MNNE diagnostics in `examples.ts`.

To explore Example 8’s powerset relative monad, call
`describeCofinitePowersetWitness()` and feed it to
`analyzePowersetRelativeMonad`. The analyzer replays subset closure on lazy
cofinite/arithmetical families, checks the unit/right-unit/associativity
comparisons, and records truncation metadata when enumeration limits are
reached. `RelativeMonadOracles.powersetRelativeMonad()` surfaces the same
diagnostics through the registry interface.

To witness the associated left Kan extension along the inclusion FinSet → Set,
call `describeBooleanVectorLeftKanExtensionWitness(targetSizes, dimensionLimit)`
and pass it to `analyzeFiniteVectorLeftKanExtension`. The analyzer assembles the
finite cocone presentations, quotients by the generated relations, and verifies
the resulting classes exhaust the Boolean vector functor on each requested
target set. If the chosen `dimensionLimit` is too small, the report highlights
which vectors are missing so you can raise the bound.

To exercise Section 3.2’s lax monoidal structure on `[J,C]`, use
`describeTwoObjectLaxMonoidalWitness()` with
`analyzeMnneLaxMonoidalStructure`. The helper records a two-object Lan\_j
witness, identity/constant endofunctors, and compares the recorded tensor,
unitors, and associator against composing Lan\_j. It also confirms the triangle
identity for the supplied triples. `RelativeMonadExamples.functorCategoryLaxMonoidalDemo()`
logs the resulting report in `examples.ts`, and
`RelativeMonadOracles.functorCategoryLaxMonoidal()` surfaces the same
diagnostics through the oracle registry.

To certify Theorem 3’s lax monoid inside `[J,C]`, combine
`describeTwoObjectLaxMonoidWitness()` with `analyzeMnneLaxMonoid`. The helper
reuses the Lan\_j tensor from the lax-monoidal witness and checks that the
recorded unit/multiplication witnesses satisfy the left/right unit laws and the
associativity composite. `RelativeMonadOracles.functorCategoryLaxMonoid()`
exposes the same report when you prefer the registry surface.

To check the Definition 4.1 well-behaved hypothesis, call
`describeIdentityWellBehavedWitness()` with
`analyzeMnneWellBehavedInclusion`. The analyzer enumerates the finite hom-sets
for the provided sample and confirms the inclusion functor is fully faithful by
establishing bijections `C(JX, JY) ≅ J(X, Y)`. Density and Lan-based comparison
data are logged in `FUTURE_ENHANCEMENTS.md` for follow-up once the necessary
Kan-extension synthesiser lands. `RelativeMonadOracles.wellBehavedInclusion()`
publishes the same check through the oracle registry.

To certify Section 4.3’s Lan\_J T extension, call
`describeIdentityLanExtensionWitness()` with
`analyzeMnneRelativeMonadLanExtension`. The analyzer checks the Lan-derived
endofunctor preserves identities/composition, verifies the monad unit and
multiplication laws on C, compares κ\_T against the original relative monad, and
confirms the Lan-based Kleisli extension matches the recorded relative
extension. `RelativeMonadOracles.lanExtension()` publishes the aggregated
oracle report.

### **Work with Relative Comonads**
| **Task** | **Use This** | **Notes** |
|----------|--------------|-----------|
| Construct the identity-root comonad | `describeTrivialRelativeComonad(equipment, object)` | Uses the identity tight 1-cell for root and carrier |
| Inspect enriched Proposition 8.22 data | `RelativeComonadOracles.enrichment(witness)` | Witness from `describeRelativeEnrichedComonadWitness(comonad)` |
| Verify Theorem 8.24 coopalgebra | `RelativeComonadOracles.coopAlgebra(witness)` | Witness from `describeRelativeComonadCoopAlgebraWitness(enriched)` |

```typescript
import { virtualizeFiniteCategory } from './virtual-equipment'
import { TwoObjectCategory } from './two-object-cat'
import {
  describeTrivialRelativeComonad,
  describeRelativeEnrichedComonadWitness,
  describeRelativeComonadCoopAlgebraWitness,
  analyzeRelativeEnrichedComonad,
  analyzeRelativeComonadCoopAlgebra,
} from './relative/relative-comonads'
import { RelativeComonadOracles } from './relative/relative-comonad-oracles'

const equipment = virtualizeFiniteCategory(TwoObjectCategory)
const comonad = describeTrivialRelativeComonad(equipment, '•')
const enrichedWitness = describeRelativeEnrichedComonadWitness(comonad)
const coopWitness = describeRelativeComonadCoopAlgebraWitness(enrichedWitness)

console.log(RelativeComonadOracles.counitFraming(comonad))
console.log(analyzeRelativeEnrichedComonad(enrichedWitness).issues)
console.log(analyzeRelativeComonadCoopAlgebra(coopWitness).issues)
```

`RelativeComonadOracles.enrichment` compares the enriched cohom object and
cotensor comparison against the comonad’s counit and coextension witnesses, while
`RelativeComonadOracles.coopAlgebra` ensures the supplied coassociativity and
counit diagrams commute and reuse the enriched comparisons.

### **Optimize Performance**
| **Problem** | **Use This** | **Why** |
|-------------|--------------|---------|
| Fast matrix exponentiation | `powMat(S)(matrix, k)` | O(log k) instead of O(k) |
| Unchecked composition | `composeEntwinedHomsUnchecked(S)(g, f)` | Skip law verification |
| Batch operations | Use matrix ops instead of loops | Vectorized computation |

---

## 🔧 **Tool Reference by Category**

### **Semirings**
```typescript
// Choose your algebra:
SemiringMinPlus     // shortest paths, edit distance, DP minimization
SemiringMaxPlus     // Viterbi, longest path, DP maximization  
SemiringBoolOrAnd   // reachability, DFA acceptance, Boolean DP
SemiringProb        // probabilities, HMMs, stochastic models
SemiringNat         // counting, path enumeration, multiplicity
```

### **Vector Operations**
```typescript
vecMat(S)(vector, matrix)    // state updates, forward pass
matVec(S)(matrix, vector)    // backward pass, aggregation
```

### **Matrix Powers & Closure**
```typescript
powMat(S)(A, k)              // k-step transitions, fast exponentiation
closureUpTo(S)(A, L)         // bounded Kleene star, ≤L reachability
```

### **Automata**
```typescript
waRun(automaton)(word)       // run weighted automaton on word
waAcceptsBool(dfa)(word)     // Boolean acceptance check
waProduct(S)(A, B)(alphabet) // automata intersection
```

### **Hidden Markov Models**
```typescript
hmmForward(hmm)(observations) // forward algorithm
diagFromVec(S)(weights)       // emission matrix from weights
normalizeRow(probVector)      // probability normalization
```

### **Graph Construction**
```typescript
graphAdjNat(n, edges)        // counting adjacency matrix
graphAdjBool(n, edges)       // Boolean adjacency matrix  
graphAdjWeights(n, edges)    // weighted adjacency matrix
```

### **Graph Algorithms**
```typescript
countPathsOfLength(adj, L)    // exact L-length path counts
reachableWithin(adj, L)       // ≤L reachability
shortestPathsUpTo(adj, L?)    // ≤L shortest paths
transitiveClosureBool(adj)    // Warshall transitive closure
```

### **Regex & Language Processing**
```typescript
compileRegexToWA(pattern)     // regex → weighted automaton
waRun(automaton)(word)        // run automaton on word
waAcceptsBool(dfa)(word)      // Boolean acceptance
waProduct(S)(A, B)(alphabet)  // automata intersection
```

---

## 🎮 **Quick Examples**

### **Shortest Path in 3 Lines**
```typescript
const edges: Edge<number>[] = [[0,1,5], [1,2,3], [0,2,10]]
const adj = graphAdjWeights(3, edges)
const distances = shortestPathsUpTo(adj) // All-pairs shortest paths
console.log('0→2 distance:', distances[0]?.[2]) // 8 (via 1)
```

### **Word Acceptance in 4 Lines**  
```typescript
const dfa: WeightedAutomaton<boolean, 'a'|'b'> = {
  S: SemiringBoolOrAnd, n: 2, init: [true, false], final: [false, true],
  delta: { a: [[false,true],[false,false]], b: [[false,false],[false,true]] }
}
console.log('accepts "ab":', waAcceptsBool(dfa)(['a','b'])) // true
```

### **HMM Forward Pass in 5 Lines**
```typescript
const hmm: HMM<number, 'x'|'y'> = {
  S: SemiringProb, n: 2, pi: [0.5, 0.5],
  T: [[0.9,0.1], [0.2,0.8]],
  E: { x: diagFromVec(SemiringProb)([0.7,0.1]), y: diagFromVec(SemiringProb)([0.3,0.9]) }
}
console.log('P(xyy):', hmmForward(hmm)(['x','y','y']))
```

### **Regex to Automaton in 2 Lines**
```typescript
const regex = compileRegexToWA('[a-z]+@[a-z]+\\.[a-z]+') // email-like pattern
console.log('accepts email:', waAcceptsBool(regex)(['j','o','e','@','c','o','m','.','o','r','g']))
```

### **Advanced Regex with Explicit Alphabet**
```typescript
const alphabet = ['a','b','c','d','x','y','z']
const regex = compileRegexToWAWithAlphabet('.*[^xyz]', alphabet) // any chars ending with non-xyz
console.log('accepts "abcd":', waAcceptsBool(regex)(['a','b','c','d'])) // true
```

### **Markov Zero–One Oracles at a Glance**
```typescript
import { createMarkovOracleRegistry } from "./markov-oracles";

const { MarkovOracles } = createMarkovOracleRegistry();

// p-almost-sure equality with deterministic left leg
const asWit = MarkovOracles.almostSure.witness(p, f, g, { label: "AlmostSureEquality" });
const asRep = MarkovOracles.almostSure.check(asWit, { tolerance: 1e-10 });
console.log("p-a.s. equality?", asRep.holds);

// Deterministic pushforward under conditional independence
const dWit = MarkovOracles.determinism.lemmaWitness(p, s, { label: "DeterminismWitness" });
const dRep = MarkovOracles.determinism.lemma(dWit);
console.log("determinism lemma?", dRep.holds && dRep.deterministic && dRep.ciVerified);

// Kolmogorov zero–one law
const kzWit = MarkovOracles.zeroOne.kolmogorov.witness(p, s, finiteMarginals);
console.log("Kolmogorov zero-one?", MarkovOracles.zeroOne.kolmogorov.check(kzWit).holds);

// Hewitt–Savage zero–one (finite permutations/injections)
const hsWit = MarkovOracles.zeroOne.hewittSavage.witness(p, s, finiteMarginals, finiteSymmetries);
console.log("Hewitt–Savage zero-one?", MarkovOracles.zeroOne.hewittSavage.check(hsWit).holds);

// BorelStoch Kolmogorov adapter (enumerated support + tail indicator)
const borelKolmogorov = buildBorelKolmogorovWitness(
  omegaSampler,
  coordinates,
  assembleProduct,
  finiteMarginals,
  tailIndicator,
  { omegaSupport, productSpace },
);
console.log("Borel tail event deterministic?", MarkovOracles.zeroOne.borel.check(borelKolmogorov).deterministic);

// BorelStoch Hewitt–Savage adapter (adds permutation invariance data)
const borelHS = buildBorelHewittSavageWitness(
  omegaSampler,
  coordinates,
  assembleProduct,
  finiteMarginals,
  finitePermutations,
  permutationInvariantIndicator,
  { omegaSupport, productSpace },
);
console.log(
  "Borel permutation-invariant event deterministic?",
  MarkovOracles.zeroOne.borelHewittSavage.check(borelHS).permutationInvariant,
);
```

### **Category of Sets in Practice**
```typescript
import { SetCat } from "./set-cat";

const A = SetCat.obj([1, 2, 3]);
const B = SetCat.obj(["even", "odd"]);

const parity = SetCat.hom(A, B, (n) => (n % 2 === 0 ? "even" : "odd"));
const indicator = SetCat.hom(B, SetCat.obj([true, false]), (tag) => tag === "even");

const parityIsEven = SetCat.compose(indicator, parity);
console.log(parityIsEven.map(2)); // true

const { object: product, projections, pair } = SetCat.product(A, B);
const diagonal = pair(SetCat.id(A), parity);

console.log(product.size); // 6 ordered pairs with canonical witnesses
console.log(SetCat.compose(projections.fst, diagonal).map(1)); // 1 → 1 in A
console.log(SetCat.compose(projections.snd, diagonal).map(2)); // 2 → "even" in B

const { object: sum, injections, copair } = SetCat.coproduct(A, B);
const tags = SetCat.obj(['from A', 'from B'] as const);
const folded = copair(
  SetCat.hom(A, tags, () => 'from A'),
  SetCat.hom(B, tags, () => 'from B'),
);

console.log(sum.size); // 5 tagged values (three from A, two from B)
console.log(SetCat.compose(folded, injections.inl).map(1)); // 'from A'
console.log(SetCat.compose(folded, injections.inr).map('even')); // 'from B'

const { object: terminal, terminate } = SetCat.terminal();
console.log(terminate(A).map(1) === [...terminal][0]); // unique map into 1

const { object: initial, initialize } = SetCat.initial();
console.log(initialize(B).dom === initial); // unique map out of 0
```

### **Custom carrier semantics**

```typescript
import { SetCat } from "./set-cat";

const lowercase = SetCat.createMaterializedSemantics(
  ["a", "b", "c"],
  {
    equals: (left, right) => left.toLowerCase() === right.toLowerCase(),
    tag: "lowercase-set",
  },
);

const Letters = SetCat.obj(["A", "b", "C"], { semantics: lowercase });

console.log(SetCat.semantics(Letters)?.has("a")); // true – semantics drive membership
console.log(SetCat.semantics(Letters)?.equals("A", "a")); // true – equality ignores case

const classifier = SetCat.subobjectClassifier();
const { subset } = classifier.subobjectFromCharacteristic(
  SetCat.hom(Letters, classifier.truthValues, (value) => value.toLowerCase() !== "b"),
);

console.log([...subset]); // ['A', 'C'] with semantics inherited from Letters
```

### **Quick Set Law Checks**
```typescript
import { SetOracles } from "./oracles/set-oracles";

const Empty = new Set<never>();
const One = new Set([null]);
const Two = new Set([0, 1]);

console.log(SetOracles.uniqueFromEmpty.check(SetOracles.uniqueFromEmpty.witness(Two)).holds); // true
console.log(SetOracles.emptyByHoms.check(SetOracles.emptyByHoms.witness(Empty, [One, Two])).holds); // true
console.log(SetOracles.singletonByHoms.check(SetOracles.singletonByHoms.witness(One, [Empty, Two])).holds); // true
```

### **Diagram sanity checks**
```typescript
import { allCommute, allCommuteTweaked, commutes, commutesTweaked, composePath, id, paste } from "./diagram";

const path1 = [(x: number) => x + 1, (x: number) => x * 2];
const path2 = [(x: number) => x * 2, (x: number) => x + 2];

console.log("triangle commutes?", commutes(path1, path2, [0, 1, 2]));

const loop = [id<number>()];
const pasted = composePath(paste(path1, loop));
console.log("pasted composite at 3", pasted(3));
console.log("all commute?", allCommute([loop, loop], [5]));

const e = (_: number) => 0;
const f = (a: number) => a + 1;
const g = (_: number) => 1;
console.log("parallel arrows allowed", commutesTweaked([f], [g], [3, 4]));
console.log("fork commutes", allCommuteTweaked([[f, e], [g, e]], [0, 1, 2]));
```

### **Product universal property on samples**
```typescript
import { Pairing } from "./product-cat";
import { checkProductUP } from "./product-up";

const F = /* Functor X → C */;
const G = /* Functor X → D */;
const H = Pairing(F, G, C, D);

console.log(
  "mediator satisfies product UP?",
  checkProductUP(C, D, F, G, H, objectSamples, arrowSamples),
);
```

### **Dualizing property checkers**
```typescript
import type { SimpleCat } from "./simple-cat";
import { dualizeProperty } from "./dual-check";
import { Dual } from "./dual-cat";

const leftIdentity = (category: SimpleCat<Obj, Arr>) =>
  sampleArrows.every((arrow) => Object.is(category.compose(category.id(category.src(arrow)), arrow), arrow));

console.log("right identities hold?", dualizeProperty(leftIdentity)(category));
console.log("double dual equals original?", leftIdentity(Dual(Dual(category))));
```

### **Textbook toolkit (products, slices, duals) in one call**
```typescript
import { makeTextbookToolkit } from "./textbook-toolkit";
import { makeFinitePullbackCalculator } from "./pullback";

const toolkit = makeTextbookToolkit(baseFiniteCategory, {
  pullbacks: makeFinitePullbackCalculator(baseFiniteCategory),
});

const slice = toolkit.sliceAt(anchorObject);
console.log("slice domains", slice.category.objects.map((o) => o.domain));

const product = toolkit.productWith(baseFiniteCategory);
const paired = product.pairing(product.pi1, product.pi2);
console.log("pairing preserves components", paired.F1(product.category.id([x, y])));

const dual = toolkit.dual();
console.log("dual flips src/dst", dual.src(someArrow), dual.dst(someArrow));
```

### **Slice / coslice walkthrough demo**
```typescript
import { runSliceCosliceDemo } from "./examples/slice-coslice-demo";

runSliceCosliceDemo();
// Console output lists objects/arrows of C/Project and Project\C
```

### **Concrete category backends at a glance**
```typescript
import { SetCat } from "./set-cat";
import { RelCat } from "./rel";
import { MatCat } from "./mat";
import { DynCat } from "./dynsys";

const setHom = SetCat.hom(SetCat.obj([0, 1, 2]), SetCat.obj(['even', 'odd']),
  (n) => (n % 2 === 0 ? 'even' : 'odd'));
const parityRel = RelCat.hom([0,1,2], ['even','odd'], [[0,'even'], [1,'odd'], [2,'even']]);
const flip = MatCat.hom(2, 2, [[0,1],[1,0]]);
const dynMorph = DynCat.hom(
  DynCat.obj(['todo','done'], state => state === 'todo' ? 'done' : 'done'),
  DynCat.obj([0,1], x => (x === 0 ? 1 : 1)),
  state => state === 'todo' ? 0 : 1,
);

console.log('SetCat parity(2) =', setHom.map(2));
console.log('RelCat pairs', Array.from(RelCat.compose(parityRel, RelCat.id(['even','odd']))));
console.log('MatCat flip^2 =', MatCat.compose(flip, flip));
console.log('DynCat morphism valid?', DynCat.isHom(dynMorph));
```

### **Compose Kolmogorov + symmetry checks into new zero–one oracles**
```typescript
import { makeZeroOneOracle } from "./markov-zero-one-factory";

const oracle = makeZeroOneOracle({
  prior,                   // FinMarkov<A, X_J>
  statistic,               // deterministic FinMarkov<X_J, T>
  finiteMarginals,         // projections π_F
  symmetries: [swap, inj], // permutations/injections
});

const report = oracle.check();
console.log('zero–one synthesis holds?', report.holds);
```

### **Transitive Closure in 1 Line**
```typescript
const closure = transitiveClosureBool(adjacencyMatrix, true)
console.log('0 can reach 2:', closure[0]?.[2]) // true if path exists
```

### **Path Counting vs Reachability (Same Algorithm)**
```typescript
const adj_nat = graphAdjNat(3, [[0,1], [1,2]])
const adj_bool = graphAdjBool(3, [[0,1], [1,2]])

console.log('Path count:', countPathsOfLength(adj_nat, 2)[0]?.[2])  // 1
console.log('Reachable:', reachableWithin(adj_bool, 2)[0]?.[2])     // true
```

---

## 🔍 **Problem → Solution Lookup**

### **I need to...**

**Find optimal paths:**
→ `shortestPathsUpTo` + `SemiringMinPlus` (shortest) or `SemiringMaxPlus` (longest)

**Count solutions:**  
→ Any algorithm + `SemiringNat`

**Check possibility:**
→ Any algorithm + `SemiringBoolOrAnd`

**Handle probabilities:**
→ Any algorithm + `SemiringProb` + `normalizeRow` for stability

**Build regex engines:**
→ `compileRegexToWA` + `waAcceptsBool` for pattern matching

**Compute transitive closure:**
→ `transitiveClosureBool` for reachability analysis

**Process sequences:**
→ `hmmForward` (probabilistic) or `waRun` (general weighted)

**Compose automata:**
→ `waProduct` for intersection, matrix operations for other compositions

**Fast matrix powers:**
→ `powMat` (O(log k) instead of O(k))

**Bounded reachability:**
→ `closureUpTo` + `SemiringBoolOrAnd`

**State updates:**
→ `vecMat` (forward) or `matVec` (backward)

**Verify correctness:**
→ All categorical structures have law checkers (`*Holds` functions)

---

## 🧱 **Persistent Lists vs Arrays**

Use the new immutable `List` helpers when you want structural sharing, predictable recursion, or algebraic tooling; stick with `ReadonlyArray` when you need random access or rely on existing JS ecosystem utilities.

| If you need... | Reach for `List` | Reach for `ReadonlyArray` |
| --- | --- | --- |
| Prepend/append frequently | ✅ O(1) `consList`/`appendList` | ⚠️ Requires copying |
| Lawful folds/traversals | ✅ `ListFoldable`, `ListTraversable`, `ListWitherable` | ⚠️ Write ad-hoc loops |
| Interop with non-empty proofs | ✅ `listToNonEmptyOption` | ⚠️ Manual checks |
| Random index lookups | ⚠️ Linear scan | ✅ Constant-time `array[i]` |

**Idiomatic snippets**

```ts
import {
  Some,
  None,
  mapO,
  listFromArray,
  listToArray,
  traverseList,
  zipList,
  listDo,
  listToNonEmptyOption,
} from "fp-3"

const numbers = listFromArray([1, 2, 3, 4])

// Traversal with Option applicative
const OptionApp = {
  of: Some,
  map: mapO,
  ap: (ofab: ReturnType<typeof Some>) => (oa: ReturnType<typeof Some>) =>
    ofab._tag === "Some" && oa._tag === "Some"
      ? Some(ofab.value(oa.value))
      : None,
}

const evenSquares = traverseList(OptionApp)((n: number) =>
  n % 2 === 0 ? Some(n * n) : None,
)(numbers)

// Zipping preserves the shorter length
const zipped = zipList(listFromArray(["a", "b"]))(
  listFromArray([10, 20, 30]),
)

// Comprehension-style sequencing
const combos = listDo(function* () {
  const letter = yield listFromArray(["a", "b"])
  const digit = yield listFromArray([1, 2])
  return `${letter}${digit}`
})

// Recover a NonEmptyArray witness when it exists
const maybeNonEmpty = listToNonEmptyOption(numbers)

console.log(listToArray(combos)) // ["a1", "a2", "b1", "b2"]
```

---

## 💡 **Pro Tips**

1. **Same Algorithm, Different Semiring:** Most graph/DP problems can be solved by changing just the semiring, not the algorithm.

2. **Performance:** Use `*Unchecked` variants when you're confident about correctness and need speed.

3. **Debugging:** All categorical structures have law checkers - use them during development.

4. **Composition:** The category façade (`categoryOfEntwinedModules`) provides safe composition with automatic law checking.

5. **Type Safety:** TypeScript catches dimension mismatches at compile time, law checkers catch semantic errors at runtime.

6. **Extensibility:** Add new semirings for domain-specific problems (fuzzy logic, tropical geometry, etc.).

---

*This cheat sheet covers the practical utilities. See `CATEGORICAL_TOOLKIT.md` for the deeper mathematical foundations and theoretical applications.*