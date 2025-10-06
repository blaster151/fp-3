# Usage Cheat Sheet: When to Reach for What

This document provides a quick reference for finding the right tool for your problem. Organized by **use case** rather than implementation details.

---

## 🎯 **If You Need To...**

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

```typescript
import {
  fromMonad,
  enumerateRelativeMonadOracles,
  enumerateRelativeAlgebraOracles,
  describeTrivialRelativeKleisli,
  describeTrivialRelativeEilenbergMoore,
  idFun,
  composeFun,
} from './allTS'
import { TwoObjectCategory } from './two-object-cat'

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

console.log(monadReports.map((report) => `${report.registryPath}: ${report.holds}`))
console.log(algebraReports.map((report) => report.registryPath))
```

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
import { MarkovOracles } from "./markov-oracles";

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

## 💡 **Pro Tips**

1. **Same Algorithm, Different Semiring:** Most graph/DP problems can be solved by changing just the semiring, not the algorithm.

2. **Performance:** Use `*Unchecked` variants when you're confident about correctness and need speed.

3. **Debugging:** All categorical structures have law checkers - use them during development.

4. **Composition:** The category façade (`categoryOfEntwinedModules`) provides safe composition with automatic law checking.

5. **Type Safety:** TypeScript catches dimension mismatches at compile time, law checkers catch semantic errors at runtime.

6. **Extensibility:** Add new semirings for domain-specific problems (fuzzy logic, tropical geometry, etc.).

---

*This cheat sheet covers the practical utilities. See `CATEGORICAL_TOOLKIT.md` for the deeper mathematical foundations and theoretical applications.*