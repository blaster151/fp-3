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