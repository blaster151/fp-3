# Knowledge Base: Patterns & Utilities

This file captures "hey, this thing X is helpful if you ever need to Y" patterns discovered during development.

## Relative Monad Resolutions (Arkor–McDermott §5)

- **Proposition 5.29 (Tight precomposition):** Precomposing a relative adjunction along a tight cell yields another relative adjunction; the resulting comparison 2-cells compose functorially and share the original inclusion \(j\).
- **Proposition 5.30 (Pasting law):** A pasted outer triangle is a relative adjunction exactly when the inner triangle is, so stored witnesses should compare both compositions against the same inclusion.
- **Remark 5.33 (Resolute composition):** When the precomposition leg admits a right adjoint, relative adjunctions compose without additional search; keep explicit certificates so composite resolutions are discoverable.
- **Example 5.31 (Fully faithful postcomposition):** Postcomposing along a fully faithful right leg exposes an induced \((\ell'!, r')\) adjunction whose unit collapses to the identity detected by Corollary 5.32.
- **Corollary 5.32 (Identity criterion):** If the induced adjunction’s unit is an identity, the transported loose monad agrees with the original one; cache this check beside fully faithful metadata.
- **Corollary 5.34 (Left-morphism functoriality):** Resolute composites induce a functor on left morphisms, so morphism metadata should record the transported left leg together with the right adjoint witnesses.
- **Proposition 5.37 (Left adjoint transport):** A left relative adjoint transports an \(\ell'\)-relative monad to a \(j\)-relative monad and produces the canonical monad morphism \((\ell'!, r')\); store both the transported monad and morphism evidence.

## Canonical JSON Containers

**What**: `CanonicalJsonMap<V>` and `CanonicalJsonSet` - Map/Set implementations that key by canonical JSON view.

**When to use**:
- ✅ **Caches & Memoization**: When caching results keyed by JSON structures
- ✅ **Deduplication Passes**: When you need to deduplicate structurally equal JSON
- ✅ **Grouping Operations**: When grouping data by JSON keys that might have different representations
- ✅ **Set Operations**: When you need set semantics over JSON data

**Example patterns**:
```typescript
// Cache expensive computations
const cache = new CanonicalJsonMap<Result>()
const result = cache.upsert(input, () => expensiveComputation(input))

// Deduplicate JSON arrays
const unique = new CanonicalJsonSet(jsonArray)

// Group by canonical keys
const groups = new CanonicalJsonMultiMap<Item>()
items.forEach(item => groups.add(item.key, item))
```

**Already used in**:
- `canonicalizeJson` JSet case (replaced manual dedup with CanonicalJsonSet)

## Persistent List Toolkit

**What**: `List` tagged union (`Nil`/`Cons`) plus helpers such as `listFromArray`, `mapList`, `concatList`, and law-backed typeclass instances (`ListFunctor`, `ListFoldable`, `ListTraversable`, `ListWitherable`).

**When to use**:
- ✅ **Streaming-style builds**: accumulate results one element at a time with `consList`, then reverse once.
- ✅ **Lawful traversals**: rely on `traverseList`, `sequenceList`, or `witherList` to integrate with applicatives (`Option`, validation, etc.).
- ✅ **Interop with proofs**: translate to `NonEmptyArray` via `listToNonEmptyOption` when you need totality witnesses.
- ⚠️ **Random access**: keep `ReadonlyArray` if you index heavily; linked lists are linear lookup.

**Example patterns**:
```typescript
import {
  Some,
  None,
  mapO,
  listFromArray,
  listToArray,
  traverseList,
  zipList,
  listDo,
} from "fp-3"

const OptionApp = {
  of: Some,
  map: mapO,
  ap: (ofab: ReturnType<typeof Some>) => (oa: ReturnType<typeof Some>) =>
    ofab._tag === "Some" && oa._tag === "Some"
      ? Some(ofab.value(oa.value))
      : None,
}

// Applicative traversal
const filtered = traverseList(OptionApp)((n: number) =>
  n % 2 === 0 ? Some(n * 10) : None,
)(listFromArray([1, 2, 3, 4]))

// Zipping truncates to shortest input
const zipped = zipList(listFromArray(["x", "y"]))(
  listFromArray([1, 2, 3]),
)

// Generator-based comprehension
const combos = listDo(function* () {
  const letter = yield listFromArray(["a", "b"])
  const digit = yield listFromArray([1, 2])
  return `${letter}${digit}`
})

console.log(filtered, listToArray(zipped), listToArray(combos))
```

**Already used in**:
- `list.spec.ts` ensures algebraic laws and Option traversals behave as expected.
- `CanonicalJsonMultiMap` for grouping operations

## Hash-Consing

**What**: `hashConsJson(j: Json, pool?: Map<string, Json>)` - Structural sharing of identical subtrees.

**When to use**:
- ✅ **Memory Optimization**: When processing large JSON with repeated subtrees
- ✅ **Structural Sharing**: When you want identical subtrees to share memory
- ✅ **Deduplication**: When you need to deduplicate at the subtree level

**Example patterns**:
```typescript
// Process large JSON with shared pool
const pool = new Map<string, Json>()
const processed = hashConsJson(largeJson, pool)

// Memory-efficient processing of arrays
const shared = jsonArray.map(j => hashConsJson(j, sharedPool))
```

## EJSON Encoding/Decoding

**What**: `toEJson`, `fromEJson`, `toEJsonCanonical` - JSON serialization with extended types.

**When to use**:
- ✅ **Serialization**: When you need to serialize extended JSON types
- ✅ **Stable Keys**: When you need deterministic string keys for JSON
- ✅ **Round-trip Preservation**: When you need to serialize/deserialize without data loss
- ✅ **Cross-platform Compatibility**: When you need consistent serialization across platforms

**Example patterns**:
```typescript
// Stable canonical keys
const key = JSON.stringify(toEJsonCanonical(json))

// Round-trip serialization
const serialized = toEJson(json)
const deserialized = fromEJson(serialized)
```

## Arrow IR System

**What**: Arrow Intermediate Representation with normalization and denotation.

**When to use**:
- ✅ **Arrow Composition**: When composing complex arrow pipelines
- ✅ **Optimization**: When you need to optimize arrow expressions
- ✅ **Law Verification**: When you need to verify arrow laws
- ✅ **Defunctionalization**: When you need to represent arrows as data

**Example patterns**:
```typescript
// Build and normalize arrow expressions
const ir = Arrow.arr(inc).then(Arrow.arr(dbl))
const normalized = normalize(ir)
const fn = denot(normalized)
```

## Recursion Schemes

**What**: `cataJson`, `anaJson`, `hyloJson` - Structural recursion over JSON.

**When to use**:
- ✅ **Transformations**: When transforming JSON structures
- ✅ **Analysis**: When analyzing JSON properties (size, depth, etc.)
- ✅ **Generation**: When generating JSON from other data
- ✅ **Fused Operations**: When you need to combine multiple operations in one pass

**Example patterns**:
```typescript
// Single-pass analysis
const [size, depth] = cataJson(productJsonAlg2(Alg_Json_size, Alg_Json_depth))(json)

// Fused transformation
const result = hyloJson(coalgebra, algebra)(input)
```

## Kleisli Arrows

**What**: Arrow instances for `Reader`, `Task`, `ReaderTask`, `ReaderTaskResult`.

**When to use**:
- ✅ **Effectful Composition**: When composing functions that return monads
- ✅ **Pipeline Operations**: When building processing pipelines
- ✅ **Error Handling**: When you need typed error handling in pipelines
- ✅ **Environment Passing**: When you need to pass environment through pipelines

**Example patterns**:
```typescript
// Effectful pipeline
const pipeline = A_RTR.then(parseK).then(validateK).then(processK)

// Reader-based processing
const readerPipeline = A_R.then(envDependent).then(transform)
```

## Partial Functions

**What**: `PartialFn<A, B>` - Functions with explicit domain predicates.

**When to use**:
- ✅ **Safe Operations**: When you need to handle partial functions safely
- ✅ **Domain Validation**: When you need to check if a function is defined for input
- ✅ **Composition**: When composing functions that might not be defined everywhere
- ✅ **Error Handling**: When you need explicit error handling for undefined cases

**Example patterns**:
```typescript
// Safe partial function
const safeDiv = pf((x: number) => x !== 0, (x: number) => 1 / x)

// Compose with error handling
const result = safeDiv.andThen(optionFromPartial)
```

## Filter/Collect Helpers

**What**: `filterMapArraySimple`, `collectArray`, `filterMapMapValues`, etc.

**When to use**:
- ✅ **Collection Processing**: When processing collections with Option/Result
- ✅ **Data Cleaning**: When filtering and transforming data
- ✅ **Pipeline Operations**: When building data processing pipelines
- ✅ **Error Handling**: When you need to handle errors in collection processing

**Example patterns**:
```typescript
// Clean and transform data
const clean = collectArray(data.map(parseAndValidate))

// Process map values
const processed = collectMapValues(map, transform)
```

---

## LLM HINTS

**When implementing caches**: 
- "Check KNOWLEDGE_BASE.md for CanonicalJsonMap patterns"
- "Consider hashConsJson for memory optimization with repeated subtrees"

**When doing deduplication**: 
- "Consider CanonicalJsonSet before manual Map approaches"
- "Evaluate tradeoffs: CanonicalJsonSet vs manual dedup vs hashConsJson"

**When serializing JSON**: 
- "Look for EJSON encoding patterns (toEJson, fromEJson)"
- "Consider toEJsonCanonical for stable, deterministic keys"

**When composing effectful functions**: 
- "Check Kleisli Arrow patterns (A_R, A_T, A_RT, A_RTR)"
- "Consider Reader/Task/ReaderTask/ReaderTaskResult arrow instances"

**When transforming JSON structures**: 
- "Consider recursion schemes (cataJson, anaJson, hyloJson)"
- "Evaluate product algebras for single-pass multiple computations"

**When handling partial functions**: 
- "Consider PartialFn with explicit domain predicates"
- "Use liftOptionPF or liftResultPF for safe composition"

**When processing collections**:
- "Check filterMap/collect helpers for Option/Result processing"
- "Prefer the Ord-aware helpers in `src/collections/set` for deduped map/filter/partition/compact flows"
- "Consider collectArray, collectMapValues, collectSet (via `src/collections/set` with explicit Eq) patterns"
- "Use ReadonlySetFilterable/TraversableWithIndex when you need effectful set pipelines"

## How to Use This Knowledge Base

1. **Before implementing**: Check LLM HINTS for relevant patterns
2. **During implementation**: Evaluate tradeoffs between multiple options
3. **After implementing**: Add new patterns you discover
4. **During code review**: Look for opportunities to use existing patterns
5. **When refactoring**: Consider if canonical containers or other patterns would help

## Contributing

When you discover a new "X is helpful for Y" pattern:
1. Add it to the appropriate section
2. Include example code
3. Note where it's already being used
4. Update the "How to Use" section if needed

## PATTERN DISCOVERY & INTEGRATION (PDI)

**After adding new features**, systematically discover existing patterns and integrate them:

### Process
1. **Identify improvement types**: What situations would benefit from this feature?
2. **Create ripgrep patterns**: How to find candidate call sites?
3. **Assess benefits**: What improvement would each upgrade provide?
4. **Decide timing**: Immediate vs batched upgrade?

### Example: After adding CanonicalJsonMap
```bash
# Find manual Map usage with JSON keys
ripgrep "new Map<.*Json|Map<.*Json"

# Find manual deduplication
ripgrep "uniq.*Map|dedup.*Map"

# Find cache implementations
ripgrep "cache.*Map|cache.*Set"
```

### Universal Applicability
**PDI works for any project type**:
- **Web**: New hooks → Find components that could use them
- **Backend**: New utilities → Find manual implementations
- **Mobile**: New patterns → Find inconsistent code
- **Desktop**: New optimizations → Find slow code paths

### Decision Matrix
- **Immediate**: Obvious correctness/performance/maintainability wins
- **Deferred**: Add to `UPGRADE_BACKLOG.md` for future maintenance passes
- **Skip**: No clear benefit, increases complexity, high risk

### Backlog Integration
- **Track deferred items**: Use `UPGRADE_BACKLOG.md` to maintain a prioritized list
- **Regular review**: Monthly review of backlog items
- **Batch opportunities**: Group similar upgrades for efficiency
- **Success tracking**: Monitor implementation rates and benefits

## HINTS BALANCE: AVOIDING THE SLIPPERY SLOPE

**Problem**: Not all "X is helpful for Y" patterns are worth documenting. Some are too obvious, too specialized, or too vague.

**Criteria for LLM HINTS**:
- ✅ **Actionable**: Clear when and how to use
- ✅ **Discoverable**: Can be found via ripgrep or clear patterns
- ✅ **Significant**: Provides meaningful benefit over alternatives
- ✅ **General**: Applies to multiple scenarios, not just one-off cases

**Criteria for SKIPPING**:
- ❌ **Too Obvious**: "Use Map for key-value storage"
- ❌ **Too Vague**: "Good for building buckets fast" (what buckets? when?)
- ❌ **Too Specialized**: Only applies to one specific domain
- ❌ **No Ripgrep**: Can't be systematically found in codebase

**Examples**:

**✅ Good Hints**:
- "When implementing caches: Consider CanonicalJsonMap patterns"
- "When doing deduplication: Consider CanonicalJsonSet before manual Map approaches"

**❌ Bad Hints**:
- "When building buckets fast: Use groupBy functions" (too vague)
- "When doing JSON stuff: Consider canonical functions" (too obvious)
- "When implementing the specific XYZ algorithm: Use ABC pattern" (too specialized)

**Ripgrep Test**: If you can't write a meaningful ripgrep to find usage patterns, the hint is probably too vague or specialized.

**Human Test**: If a human developer wouldn't immediately understand when to use it, the hint needs more specificity.
