# Knowledge Base: Patterns & Utilities

This file captures "hey, this thing X is helpful if you ever need to Y" patterns discovered during development.

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
- `CanonicalJsonMultiMap` for grouping operations

## CanonicalJsonMap/Set Adapters

**What**: `mapGroupValues`, `mapEachGroup`, `filterEachGroup`, `mergeGroupValues`, `dedupeEachGroup`, `flattenGroups` - Functional adapters for working with grouped data.

**When to use**:
- ✅ **Data Transformation**: When you need to transform grouped data (e.g., user purchases by category)
- ✅ **Aggregation**: When computing summaries across groups (totals, averages, counts)
- ✅ **Filtering**: When filtering elements within groups by predicates
- ✅ **Deduplication**: When removing duplicates within groups
- ✅ **Flattening**: When converting grouped data back to flat pairs

**Example patterns**:
```typescript
// Transform grouped data
const totals = mapGroupValues(groups, (vs) => vs.reduce((s, p) => s + p.total, 0))

// Map each element in groups
const ids = mapEachGroup(groups, (p) => p.id)

// Filter elements within groups
const bigOnly = filterEachGroup(groups, (p) => p.total >= 10)

// Custom aggregation
const stats = mergeGroupValues(groups, () => ({ sum: 0, n: 0 }), (acc, p) => ({ sum: acc.sum + p.total, n: acc.n + 1 }))

// Deduplicate within groups
const unique = dedupeEachGroup(groups, (p) => p.category)

// Flatten to pairs
const pairs = flattenGroups(groups)
```

**Ripgrep patterns for discovery**:
- `\.get\(.*\)\?\.map\(` - Manual group element mapping (e.g., `g1.get(key)?.map(u => u.name)`)
- `for\s+const\s+\[.*\]\s+of\s+\w+.*\{` - Manual group iteration with processing
- `\.reduce\(.*,.*\)` - Manual group reduction (but verify it's grouped data)
- `\.filter\(.*=>.*` - Manual group filtering (but verify it's grouped data)

**Specific patterns for CanonicalJsonMap<ReadonlyArray<V>>**:
- `\.get\(.*\)\?\.map\(` - Group element mapping
- `for\s+const\s+\[.*\]\s+of\s+\w+.*\.map\(` - Group iteration with mapping
- `for\s+const\s+\[.*\]\s+of\s+\w+.*\.filter\(` - Group iteration with filtering

**Validation patterns** (to avoid false positives):
- `CanonicalJsonMap<ReadonlyArray<` - Ensure it's grouped data
- `groupByCanonical\|groupPairsByCanonical` - Ensure it's from grouping functions

**Ripgrep patterns for streaming operations**:
- `\.reduce\(.*,.*0\)` - Manual sum/count reduction
- `\.sort\(.*\)\.slice\(0,\s*\d+\)` - Manual top-K selection
- `\.filter\(.*\)\.slice\(0,\s*\d+\)` - Manual conditional filtering
- `for\s+const\s+\[.*\]\s+of\s+\w+.*Math\.` - Manual min/max in loops
- `Math\.min\|Math\.max` - Manual min/max calculations
- `\.length.*\?.*:` - Manual counting patterns

**Specific patterns for streaming operations**:
- `\.reduce\(.*,.*0\)` - Manual sum/count reduction
- `\.sort\(.*\)\.slice\(0,\s*\d+\)` - Manual top-K selection
- `\.filter\(.*\)\.slice\(0,\s*\d+\)` - Manual conditional filtering
- `for\s+const\s+\[.*\]\s+of\s+\w+.*Math\.` - Manual min/max in loops

**Validation patterns** (to avoid false positives):
- `CanonicalJsonMap<ReadonlyArray<` - Ensure it's grouped data
- `stream\|pairs\|Iterable` - Ensure it's streaming data
- `score\|value\|count` - Ensure it's numeric operations

## CanonicalJsonMultiMap Adapters

**What**: `collapseToMap`, `mapMultiValues`, `mapEachMulti`, `filterEachMulti`, `mergeMulti` - Adapters for multimap operations.

**When to use**:
- ✅ **Multimap to Map**: When converting multimap to regular map
- ✅ **Multimap Aggregation**: When computing summaries across multimap values
- ✅ **Multimap Filtering**: When filtering elements in multimap
- ✅ **Multimap Transformation**: When transforming multimap data

**Example patterns**:
```typescript
// Convert multimap to map
const collapsed = collapseToMap(multimap)

// Aggregate multimap values
const totals = mapMultiValues(multimap, (vs) => vs.reduce((s, p) => s + p.total, 0))

// Filter multimap elements
const filtered = filterEachMulti(multimap, (p) => p.total >= 10)

// Transform multimap elements
const transformed = mapEachMulti(multimap, (p) => p.id)
```

**Ripgrep patterns for discovery**:
- `new.*MultiMap` - Manual multimap usage
- `\.add\(.*,.*\)` - Manual multimap building
- `for.*of.*multimap` - Manual multimap iteration
- `\.get\(.*\)` - Manual multimap access

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

**What**: `filterMapArraySimple`, `collectArray`, `filterMapMapValues`, `fromFoldable`, `union`, `difference`, etc. (see `src/collections/map`)

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

// Build and reconcile maps with structural equality
const merged = union(eqStrict<string>())(left, right, (oldValue, newValue) => oldValue.concat(newValue))
```

## Streaming Operations & Min/Max

**What**: Advanced streaming reducers and min/max operations for `CanonicalJsonMap<ReadonlyArray<V>>` and `CanonicalJsonMultiMap<V>`.

**Key functions**:
- **Min/Max per group**: `minByGroup`, `maxByGroup`, `minByGlobal`, `maxByGlobal`
- **Take/Drop while**: `takeWhileGroup`, `dropWhileGroup`
- **Streaming reducers**: `streamReduceByCanonical`, `streamTopKByCanonical`, `streamCountsByCanonical`, `streamSumByCanonical`
- **MultiMap variants**: `minByGroupMM`, `maxByGroupMM`, `takeWhileGroupMM`, `dropWhileGroupMM`

**When to use**:
- ✅ **Per-group min/max**: `minByGroup(groups, (item) => item.score)`
- ✅ **Global min/max**: `maxByGlobal(groups, (item) => item.score)`
- ✅ **Conditional filtering**: `takeWhileGroup(groups, (item) => item.score >= 8)`
- ✅ **Streaming aggregation**: `streamCountsByCanonical(stream)`, `streamSumByCanonical(stream, (item) => item.score)`
- ✅ **Streaming top-K**: `streamTopKByCanonical(2, (item) => item.score)(stream)`

**Example patterns**:
```typescript
// Per-group min/max
const mins = minByGroup(groups, (item) => item.score)
const maxs = maxByGroup(groups, (item) => item.score)

// Global min/max
const best = maxByGlobal(groups, (item) => item.score)

// Conditional filtering
const highScore = takeWhileGroup(groups, (item) => item.score >= 8)

// Streaming aggregation
const counts = streamCountsByCanonical(stream)
const sums = streamSumByCanonical(stream, (item) => item.score)
const top2 = streamTopKByCanonical(2, (item) => item.score)(stream)
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
- "Consider collectArray, collectMapValues, collectSet patterns"

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
