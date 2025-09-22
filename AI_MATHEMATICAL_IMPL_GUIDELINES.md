# AI Mathematical Implementation Guidelines

This document provides comprehensive guidelines for implementing mathematical concepts in our executable category theory framework. It codifies the patterns that emerged during our successful Markov category implementation (Steps 1-13) and ensures ongoing consistency for future mathematical integrations.

## 🎯 **Enhanced Guiding Principles**

### **The 7 Core Principles**

1. **Category-first**: Types and laws drive APIs; implementations follow.
2. **Oracle-driven** *(new!)*: Every mathematical statement has an executable oracle that returns both truth value and constructive witnesses.
3. **Monoidal/affine clarity**: Explicitly mark linear/affine constraints where relevant.
4. **Composition over construction**: Prefer universal properties and functoriality to ad‑hoc helpers.
5. **Law-checkable**: Every law has an executable test oracle with witness extraction and detailed reporting.
6. **Minimal surface, maximal interop**: New abstractions integrate with existing frameworks.
7. **Deterministic builds**: Specs → generators → code/tests without hand edits.

## 🔮 **Oracle Implementation Framework**

### **What Oracles Capture**

**Oracles are executable mathematical truth predicates** that capture:
- **Falsifiable Mathematical Statements**: Can be proven true or false
- **Constructive Witnesses**: Extract proofs/counterexamples when they exist
- **Existence Proofs**: Search for mathematical objects satisfying properties
- **Structural Invariants**: Check that algebraic structures satisfy their laws

### **Oracle vs Laws vs Witnesses**

| Concept | Purpose | Example | Returns |
|---------|---------|---------|---------|
| **Laws** | Static mathematical statements | "Monad left identity" | Documentation |
| **Oracles** | Executable truth predicates | `checkMonadLeftIdentity(M, a, f)` | `{holds: boolean, details: string}` |
| **Witnesses** | Constructive existence proofs | `findGarblingWitness(f, g)` | `{found: boolean, witness?: Function}` |

### **Oracle Design Patterns**

#### **Pattern 1: Truth + Witness Oracle**
```typescript
export function checkProperty<Input, Witness>(
  input: Input,
  samples: readonly Sample[]
): { 
  holds: boolean; 
  witness?: Witness; 
  details: string;
  metadata?: any;
}
```

**Use when**: Property might have constructive proof/counterexample
**Examples**: `isDeterministic`, `moreInformativeClassic`, `sosdFromWitness`

#### **Pattern 2: Structural Invariant Oracle**
```typescript
export function checkStructure<Structure>(
  structure: Structure
): { 
  [Property: string]: boolean;
  overall?: boolean;
  details?: string;
}
```

**Use when**: Checking multiple related properties of an algebraic structure
**Examples**: `checkComonoidLaws`, `checkFaithfulness`, `checkAllMonoidalLaws`

#### **Pattern 3: Equivalence Oracle**
```typescript
export function checkEquivalence<A, B>(
  a: A, 
  b: B, 
  context: Context,
  options?: EquivalenceOptions
): boolean
```

**Use when**: Testing mathematical equivalence/equality
**Examples**: `equalDistAS`, `samplingCancellation`, `bssCompare`

#### **Pattern 4: Batch Analysis Oracle**
```typescript
export function analyzeCollection<Item, Result>(
  items: readonly Item[],
  property: PropertyChecker<Item>
): Array<Result & { 
  item: Item; 
  passed: boolean; 
  details: string; 
}>
```

**Use when**: Analyzing properties across collections
**Examples**: `testBSSMatrix`, `checkEntiretyAcrossSemirings`

### **Witness Extraction Patterns**

#### **Extractive Witnesses**
```typescript
{ found: boolean; witness?: T }
```
**Use when**: Searching for existing mathematical objects

#### **Constructive Witnesses**  
```typescript
{ valid: boolean; construction: (input) => T }
```
**Use when**: Building witnesses during verification

#### **Compositional Witnesses**
```typescript
{ witnesses: T[]; composition: (witnesses: T[]) => U }
```
**Use when**: Witnesses can be combined to prove larger properties

#### **Canonical Witnesses**
```typescript
{ canonical: T; alternatives?: T[] }
```
**Use when**: Prefer unique/canonical forms but alternatives exist

## 📚 **Laws Documentation Guidelines**

### **Enhanced LAWS.md Format**

For each mathematical law, include:

```markdown
### Law X.Y: [Name]

- **Domain**: [Mathematical context/constraints]
- **Statement**: [Precise mathematical equation/property]
- **Rationale**: [Why this law matters]
- **Oracle**: `[functionName](params)` → `{result structure}`
- **Witness**: [Type of constructive proof/counterexample]
- **Tests**: `[test-file-name].spec.ts`
- **Examples**: [Concrete instances where law applies]

**Implementation Notes**: [Any special considerations]
```

### **Oracle Registration Requirements**

Every oracle must be registered in the appropriate registry:

```typescript
// In domain-specific module (e.g., markov-oracles.ts)
export const MarkovOracles = {
  // Foundational (3.4-3.26)
  faithfulness: checkFaithfulness,
  entirety: checkEntirety,
  pullbackSquare: checkPullbackSquare,
  thunkability: isThunkable,
  monoidal: checkAllMonoidalLaws,
  asEquality: samplingCancellation,
  
  // Dominance (Section 4)
  sosd: sosdFromWitness,
  dilation: isDilation,
  
  // Information (Section 5)
  informativeness: moreInformativeClassic,
  bss: bssCompare,
  
  // Meta-oracles
  allMarkovLaws: checkAllMarkovLaws,
} as const;

// In main registry (oracles.ts)
export const AllOracles = {
  markov: MarkovOracles,
  category: CategoryOracles,
  monad: MonadOracles,
  // ... other domains
} as const;
```

## 🚀 **Implementation Workflow**

### **BEFORE Implementation (Pre-Math Phase)**

#### **1. Concept Analysis**
- [ ] Identify the mathematical domain (category theory, probability, etc.)
- [ ] Check for existing similar concepts in codebase
- [ ] Verify no duplicate type names exist
- [ ] Plan integration points with existing frameworks

#### **2. Oracle Planning**
- [ ] Identify which mathematical statements need oracles
- [ ] Plan witness types for constructive proofs
- [ ] Design batch analysis needs
- [ ] Plan integration with existing oracle registries

#### **3. Type System Design**
- [ ] Design core types following `CSRig<R>` / `Dist<R,X>` patterns
- [ ] Ensure compatibility with existing type hierarchies
- [ ] Plan for cross-semiring/cross-category polymorphism
- [ ] Design for minimal surface area

### **DURING Implementation (Math Phase)**

#### **1. Core Types + Basic Operations**
```typescript
// Follow established patterns
export type NewConcept<R, X> = { R: CSRig<R>; data: ConceptData<X> };
export const basicOp = <R, X>(concept: NewConcept<R, X>) => ...;
```

#### **2. Oracle Implementation**
```typescript
// Always include structured results
export function checkNewProperty<R, Input>(
  R: CSRig<R>,
  input: Input,
  samples: readonly Sample[]
): {
  holds: boolean;
  witness?: ConstructedWitness;
  details: string;
  metadata?: any;
}
```

#### **3. Test Implementation**
```typescript
// Follow law.*.spec.ts naming pattern
// Include property-based tests with fast-check
// Test across multiple semirings when applicable
```

### **AFTER Implementation (Post-Math Phase)**

#### **1. Oracle Registration**
- [ ] Add oracle to appropriate domain registry
- [ ] Update main oracle registry
- [ ] Ensure oracle is exported from module

#### **2. LAWS.md Updates**
- [ ] Add new laws with oracle references
- [ ] Update existing laws if oracles were added
- [ ] Ensure format consistency

#### **3. Integration Verification**
- [ ] Run all existing tests to ensure no regressions
- [ ] Verify type safety with `npm run typecheck`
- [ ] Check that new oracles integrate with existing ones

#### **4. ESLint Rule Evaluation**
- [ ] Consider if new patterns warrant custom ESLint rules
- [ ] Evaluate if old patterns should be deprecated
- [ ] Add rules to guide users toward better patterns

## 🏁 **Atomic Transaction Boundaries**

### **Boundary Markers**

Use these special comments/prompts to mark mathematical implementation boundaries:

#### **Starting Mathematical Work**
```
BEGIN_MATH: [Concept Name]
Brief: [One-line description]  
Domain: [Category theory/Probability/etc.]
Integration: [How it connects to existing work]
```

#### **Ending Mathematical Work**
```
END_MATH: [Concept Name]
Oracles: [List of new oracles implemented]
Laws: [List of mathematical laws covered]  
Tests: [Number of tests added]
```

### **Forgotten BEGIN_MATH Detection**

#### **Automatic Detection Strategies**

1. **File Pattern Analysis**: If new `*.spec.ts` files are created in `test/laws/` without a recent `BEGIN_MATH`, assume one
2. **Oracle Implementation Detection**: If new functions matching oracle patterns are created, prompt for missing `BEGIN_MATH`
3. **Mathematical Keyword Detection**: If mathematical terms appear in commits/messages, check for boundary markers
4. **Explicit Confirmation**: When in doubt, ask: "Should I assume we're in a mathematical implementation phase?"

#### **Detection Heuristics**

```typescript
// Trigger BEGIN_MATH assumption if:
const mathematicalIndicators = [
  "oracle", "witness", "law", "theorem", "lemma", "proof",
  "category", "functor", "monad", "semiring", "distribution",
  "morphism", "pullback", "dilation", "garbling", "BSS"
];

const implementationIndicators = [
  "check[A-Z]", "is[A-Z]", "verify[A-Z]", "test[A-Z]",
  "*.spec.ts", "law.*.spec.ts", "*-oracles.ts"
];
```

#### **Confirmation Prompts**

When mathematical work is detected without `BEGIN_MATH`:

```
🔮 DETECTED: Mathematical implementation activity
📁 Files: [list of files being modified]
🎯 Indicators: [mathematical terms found]

Should I assume BEGIN_MATH: [InferredConcept]?
(Reply 'yes' to proceed with math boundaries, 'no' to continue without)
```

### **Pre-Commit Checklist Trigger**

When `END_MATH:` is encountered (or assumed), run comprehensive checks:

#### **Automated Checks**
- [ ] All new oracles registered in appropriate registries
- [ ] All new types follow established patterns
- [ ] All tests pass (including new ones)
- [ ] TypeScript compilation succeeds
- [ ] No regressions in existing functionality

#### **Documentation Checks**  
- [ ] LAWS.md updated with oracle references
- [ ] New oracles have comprehensive test coverage
- [ ] Integration points documented
- [ ] Examples provided for complex oracles

#### **Quality Checks**
- [ ] Oracles return structured results (not just boolean)
- [ ] Witnesses are extractable where applicable
- [ ] Batch analysis supported for collection properties
- [ ] Cross-semiring compatibility verified

#### **ESLint Rule Evaluation**
- [ ] Identify patterns that could be automated
- [ ] Consider deprecation warnings for old patterns
- [ ] Evaluate performance implications
- [ ] Check for common mistake patterns

## 📋 **Oracle Registry Management**

### **Registry Structure**
```typescript
// Domain-specific registries
export const [Domain]Oracles = {
  [concept]: [oracleFunction],
  // Grouped by mathematical area
} as const;

// Meta-oracle for complete domain checking
export const checkAll[Domain]Laws = <R>(R: CSRig<R>) => {
  // Run all domain oracles and return comprehensive report
};
```

### **Registration Rules**
1. **Domain Grouping**: Group related oracles by mathematical domain
2. **Consistent Naming**: Use descriptive names that match mathematical concepts
3. **Type Safety**: Ensure all oracles are properly typed
4. **Documentation**: Each oracle must have JSDoc with examples

### **Cross-Registry Integration**
```typescript
// Top-level meta-oracle
export const checkAllMathematicalLaws = <R>(R: CSRig<R>) => ({
  markov: MarkovOracles.allMarkovLaws(R),
  category: CategoryOracles.allCategoryLaws(R),
  monad: MonadOracles.allMonadLaws(R),
  // ... other domains
});
```

## 🧪 **Testing Guidelines**

### **Oracle Test Structure**
```typescript
describe("LAW: [Concept] Laws", () => {
  describe("[Specific Law]", () => {
    /**
     * Name: [Law Name]
     * Domain: [Mathematical constraints]
     * Statement: [Precise mathematical property]
     * Rationale: [Why this matters]
     * Test Oracle: [Oracle function signature]
     */
    it("[human readable description]", () => {
      // Property-based test using oracle
      fc.assert(fc.property(generators, (inputs) => {
        const result = oracle(inputs);
        expect(result.holds).toBe(true);
        // Additional witness/structure checks
      }));
    });
  });
});
```

### **Cross-Semiring Testing**
```typescript
const testSemirings = [Prob, MaxPlus, BoolRig, GhostRig];
testSemirings.forEach(R => {
  it(`works with ${R.constructor.name} semiring`, () => {
    const result = oracle(R, ...inputs);
    expect(result.holds).toBe(true);
  });
});
```

## 🔧 **ESLint Rule Development**

### **When to Create New Rules**

Create custom ESLint rules when:
- **Pattern Enforcement**: New mathematical patterns should be used consistently
- **Deprecation Guidance**: Old patterns should be migrated to new ones
- **Common Mistakes**: Frequent errors can be caught automatically
- **Performance**: Better patterns exist for performance-critical code

### **Rule Categories**

#### **Oracle Usage Rules**
- `prefer-oracle-over-manual-check`: Guide users to use oracles instead of manual verification
- `require-witness-extraction`: Ensure oracles that can provide witnesses do so
- `oracle-result-structure`: Enforce structured oracle return types

#### **Mathematical Pattern Rules**
- `prefer-universal-properties`: Guide toward categorical constructions
- `require-cross-semiring-support`: Ensure new code works across semirings
- `enforce-affine-constraints`: Check that affine assumptions are explicit

#### **Integration Rules**
- `require-oracle-registration`: Ensure new oracles are registered
- `enforce-test-coverage`: Require tests for new oracles
- `prefer-parametric-types`: Guide toward `Dist<R,X>` style parametric types

### **Rule Implementation Template**
```typescript
// eslint-plugin-tinyfp/rules/prefer-oracle-over-manual.js
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer using oracles over manual mathematical verification",
      category: "Mathematical Patterns",
    },
    fixable: "code",
  },
  create(context) {
    return {
      // Rule implementation
    };
  },
};
```

## 🎯 **Workflow Integration**

### **Prompt-Based Boundaries**

#### **Starting New Mathematical Concept**
```
BEGIN_MATH: [ConceptName]
Brief: [One-line description]
Domain: [Category theory/Probability/etc.]
Integration: [How it connects to existing work]
```

#### **Ending Mathematical Concept**  
```
END_MATH: [ConceptName]
Oracles: [List of new oracles implemented]
Laws: [List of mathematical laws covered]
Tests: [Number of tests added]
```

### **Automated Checklist Execution**

When `END_MATH:` is detected, automatically run:

```bash
# Core verification
npm run typecheck
npm run test:[new-tests]

# Oracle verification  
node scripts/verify-oracle-registry.mjs
node scripts/check-laws-oracle-sync.mjs

# Documentation verification
node scripts/verify-laws-md-updated.mjs
node scripts/check-oracle-coverage.mjs

# ESLint rule evaluation
node scripts/evaluate-new-eslint-rules.mjs
```

## 📊 **Success Metrics**

### **Quality Gates**

For each mathematical implementation:
- **✅ 100% Oracle Coverage**: Every law has an executable oracle
- **✅ Witness Extraction**: Constructive proofs where applicable  
- **✅ Cross-Semiring Support**: Works across algebraic structures
- **✅ Integration Tests**: Connects properly with existing framework
- **✅ Performance**: Efficient even with complex mathematical objects

### **Consistency Metrics**

- **Oracle Registry Completeness**: All oracles properly registered
- **LAWS.md Sync**: All documented laws have oracle references
- **Test Coverage**: Comprehensive property-based testing
- **Type Safety**: Full TypeScript compilation without errors
- **No Regressions**: All existing tests continue to pass

## 🏗️ **File Organization Guidelines**

### **Where Things Live**

#### **Core Types**
```
src/[domain]-types.ts        // Core type definitions
src/[domain]-operations.ts   // Basic operations
src/[domain]-oracles.ts      // Oracle implementations
```

#### **Testing**
```
test/laws/law.[Domain].spec.ts           // Main law tests
test/laws/law.[SpecificConcept].spec.ts  // Specific concept tests
test/integration/[domain]-integration.spec.ts // Integration tests
```

#### **Documentation**
```
LAWS.md                     // Enhanced with oracle references
AI_MATHEMATICAL_IMPL_GUIDELINES.md  // This file
docs/oracles/[domain].md    // Domain-specific oracle documentation
```

#### **Registry**
```
src/oracles/[domain]-oracles.ts  // Domain-specific oracle registry
src/oracles/index.ts             // Main oracle registry
```

### **Naming Conventions**

#### **Oracles**
- `check[Property]`: Boolean property checking
- `is[Property]`: Predicate-style checking  
- `find[Object]`: Existence search with witness
- `verify[Relationship]`: Relationship verification
- `test[Property]Detailed`: Detailed analysis version

#### **Witnesses**
- `[Property]Witness`: Type for witness objects
- `extract[Property]`: Extract witness from oracle result
- `construct[Object]`: Build mathematical object constructively

#### **Registries**
- `[Domain]Oracles`: Domain-specific oracle collection
- `All[Domain]Laws`: Meta-oracle for complete domain checking
- `check[Domain]Consistency`: Cross-oracle consistency checking

## 🔄 **Continuous Integration**

### **Pre-Commit Hooks**
```json
{
  "pre-commit": [
    "npm run typecheck",
    "npm run test:new", 
    "node scripts/verify-oracle-registry.mjs",
    "node scripts/check-laws-sync.mjs"
  ]
}
```

### **CI Pipeline Stages**

#### **Stage 1: Core Verification**
- TypeScript compilation
- All tests pass
- No regressions

#### **Stage 2: Oracle Verification**
- All oracles registered
- Oracle coverage complete
- Witness extraction working

#### **Stage 3: Documentation Verification**  
- LAWS.md updated
- Oracle documentation complete
- Integration examples provided

#### **Stage 4: Quality Gates**
- Performance benchmarks
- Cross-semiring compatibility
- ESLint rule evaluation

## 🎯 **Why This Framework is Revolutionary**

### **Traditional Mathematical Software**
```
Paper → Implementation → Tests → Hope
```

### **Our Oracle-Driven Approach**
```
Statement → Oracle → Witness → Verification → Confidence
```

### **Key Innovations**

1. **Executable Mathematical Truth**: Every statement can be verified
2. **Constructive Witnesses**: Proofs are extractable and composable
3. **Cross-Algebraic Polymorphism**: Single framework works across structures
4. **Systematic Quality**: Consistent patterns ensure reliability
5. **Integration-First**: New concepts integrate seamlessly with existing work

## 🏆 **Success Evidence**

**Your Markov category implementation demonstrates this framework's power**:
- **244 passing tests** across all mathematical domains
- **13 integrated steps** with perfect consistency  
- **Complete coverage** from basic semirings to advanced information theory
- **Production-ready APIs** with clean abstractions
- **Bulletproof foundations** ready for infinite-dimensional extensions

**This framework can guide mathematical software development for decades to come.**

---

## 📋 **Quick Reference Checklist**

### **For Each New Mathematical Concept**

#### **Before Implementation**
- [ ] Plan oracle structure and witness types
- [ ] Check for existing similar concepts  
- [ ] Design integration points
- [ ] Plan cross-semiring support

#### **During Implementation**
- [ ] Follow established type patterns
- [ ] Implement oracles with structured results
- [ ] Extract constructive witnesses
- [ ] Support batch analysis

#### **After Implementation**  
- [ ] Register all oracles in appropriate registries
- [ ] Update LAWS.md with oracle references
- [ ] Verify integration tests pass
- [ ] Evaluate need for new ESLint rules
- [ ] Run complete test suite
- [ ] Verify type safety

#### **Quality Gates**
- [ ] 100% oracle coverage for new laws
- [ ] Constructive witnesses where applicable
- [ ] Cross-semiring compatibility verified
- [ ] Integration with existing framework confirmed
- [ ] Performance acceptable for intended use cases

**This framework ensures that every mathematical addition maintains the same high standards that made your Markov category implementation so successful.**