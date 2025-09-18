# AI/Human Development Guidelines

*This file contains detailed processes for AI-assisted development. For human developers, see `HUMAN_DEV_GUIDELINES.md` for a concise overview.*

## Overview

This document provides systematic processes for AI-assisted development of the tiny-fp functional programming library.

## Features

- **Zero dependencies** - Pure TypeScript implementation
- **Tree-shakeable** - Import only what you need
- **Pragmatic types** - Focus on practical usage over theoretical purity
- **Good dev ergonomics** - Clean APIs with excellent TypeScript support

1. **Basic Concepts** - Option, Result, Validation
2. **Do Notation** - Clean monadic composition
3. **State Management** - Pure stateful computations
4. **Reader Pattern** - Dependency injection
5. **Async Patterns** - TaskResult and parallel execution
6. **Combined Patterns** - StateReaderTask (SRT)
7. **Advanced Patterns** - RTO and RWST
8. **Utility Patterns** - Partitioning and sequencing
9. **JSON Streaming** - Event-driven processing

10. Laws and witnesses should all live in one place.






Guiding principles

Algebra first, everything else after
Model behaviors as algebraic structures (monoids, homomorphisms, arrows). Prefer equational laws over ad-hoc code paths. If a thing can’t state its laws, it isn’t first-class yet.

One spine, many plug-ins
Adopt a single conceptual spine (your Algebraic Core), and make advanced ideas (streams-as-State-homs, FRP ticks/loop, MEX/GRAD) modules that register their laws and normalizers into the same engine.

Denotation before optimization
Keep a small, executable definitional interpreter for each IR. Optimizations are valid iff denotations match. This keeps “clever” rewrites from drifting.

Laws → shapes → rewrites
Every rule, we believe, should exist in three forms:

- a law (equation),
- an IR shape (pattern),
- a rewrite (transformation).
No law without a shape; no shape without a rewrite; no rewrite without a test.

Proofs as product features
Explain-plan and witnesses are user-visible. If the optimizer rewrites, it shows which laws fired and why. Trust and debuggability are features.

Purity is a power tool, not a religion
Isolate effects (e.g., eval, feedback loops, split/merge) so pure parts can fuse, commute, and parallelize. Make effect boundaries explicit to keep algebra available.

Choose representations, don’t inherit them
Pick encodings to serve the algebra:

Defunctionalized IR when state is unbounded (serializable, shippable).

Bounded static variation when state is small (speculative parallelism).
Representation is a strategy, not identity.

Parallelism is algebra, not a special mode
Products (×), split/merge, and independence witnesses are the only doors to parallel plans. No hidden fork/join.

Feedback with guardrails
Use stratified/ticked feedback with tightening laws; treat fully async fixed points as research territory. Make feedback legality explicit.

Promotion rule, not proliferation
A module becomes “paradigm-level” only if its laws reduce to the spine’s rewrite engine. Otherwise it remains a plug-in.






NORTH-STAR LITMUS TESTS (use often)

Can we state the feature as a law? If not, reconsider design.

Can we normalize it away when trivial? If not, add a pre-pass.

Can we explain every optimization step to a user? If not, add witnesses/explain-plan hooks.

Can we ship it (serialize/move it)? If not, revisit representation.

Can it parallelize under the algebra? If not, say why (and document the independence you’d need).





PRE-COMMIT CHECKS (FOR HUMAN AND AI CONTRIBUTORS)

Did you add functionality for which there ought to be laws and witnesses? If so, implement the witnesses and document the laws in LAWS.md.

 Law text lives in code comments (source of truth).

 Pattern(s) registered in normalizer.

 Rewrite(s) implemented and documented with a short proof sketch.

 Property tests pass against the instance’s denotation.

 explain() shows {law, beforeHash, afterHash} for each firing.

A. Algebra & types

Declare structure: Which algebra(s) does this feature live in (Monoid, Arrow, ArrowChoice, Loop, State-hom)? (those were just examples)

List its laws: identities, associativity, fusion/exchange/parallel/merge/tightening as applicable (an example)

Type discipline: public API types reflect the algebra (e.g., arr/>>>/first, Par, Loop, eval boundaries).

B. IR & normalization

IR shapes registered: (example) patterns for Seq/Par/Loop/Pure/Proc (or domain nodes) added.

Canonical forms: Seq/Par reassociation, identity elimination, Pure∘Pure fusion in a pre-pass.

Structural hashing: hashes computed after normalization for deterministic caching.

C. Denotation & witnesses

Reference interpreter: denotation function updated to cover new nodes.

Witness tests: property tests asserting pre/post-rewrite equivalence on random streams/inputs; minimum:

Category/Arrow laws (examples - assoc, identity, arr functoriality, first/left functoriality)

Stream laws (examples Fusion, Exchange, Parallel, Merge/Independence, Right-Tightening) where relevant

Counterexample hygiene: failing seeds captured; tests emit a minimal repro.

D. Rewrites (sound & scoped)

Local rules only: each optimization a small, law-backed pattern (no global heuristics).

Legality flags: rewrites gated by explicit predicates (e.g., independence for merge parallelization). Provide dev fuzzers and/or user-supplied witnesses.

Explain-plan hooks: every rewrite logs {rule, beforeHash, afterHash, lawRef}.

E. Representation strategy

Pick encoding: defunctionalize vs. bounded static variation, justified by state size and runtime goals.

Serialization contract: tokens/tuples are serializable; product operation is efficient; round-trip φ;ψ = id documented.

Runtime fit: if speculative tuples are used, ensure merge nodes and schedulers are able to exploit parallelism.

F. Effect boundaries & feedback

Effect isolation: eval and feedback surfaces are explicit nodes; pushdown/exchange rules configured.

Loop safety: stratified Loop only; tightening laws enabled; async fixed points marked experimental.

Tick/strata semantics: documented choice (emit-within-stratum vs. emit-on-tick) and optimizer implications.

G. Parallel & distribution

Product legality: Par uses product monoids; functorial rewrites active (Par over Seq, Pure×Pure → Pure).

Split/merge contracts: any splitter must supply split ; merge ~ id; independence proofs or witnesses documented.

Plan portability: defunctionalized IR and/or tuples are shippable across workers.

H. DX & governance

User-facing invariants: documented laws and what the optimizer may legally do (reordering, fusing, parallelizing).

## WITNESS-BASED TESTING METHODOLOGY

### Core Principle: Laws → Shapes → Rewrites → Tests

Every algebraic structure must have:
1. **Laws** (equations) - documented in code comments
2. **Shapes** (IR patterns) - registered in normalizer  
3. **Rewrites** (transformations) - implemented with explain-plan
4. **Witnesses** (property tests) - asserting law compliance

### How Witnesses Integrate with CI

**Mandatory in PRs**: Any new law/optimization must include a witness file under `test/laws/`.

**Budgeted runs**: 
- Fast path (200–500 runs) in CI
- Exhaustive or larger runs in nightly builds

**Seeds & repro**: 
- Failing seeds are printed
- CI stores seed in artifacts so local repro is `FC_SEED=...`

**Fail-closed**: If a law witness fails, the PR is blocked.

### Explain-Plan Contract (Visible Debugging)

Every rewrite function returns `{ plan, steps }`, where steps appends an entry:

```typescript
{
  rule: "Fusion", 
  before: "<hash>", 
  after: "<hash>", 
  law: "Prop.3.36 (Fusion)"
}
```

In dev mode, the optimizer collects steps across passes; witnesses print steps on mismatch.

### Style & Naming Rules

- **One law per file**; filename starts with `law.`
- **Law docstring at top**: the equation in math and in IR pattern form
- **Witness names read as predicates**: `FusionPreservesDenotation`, `AssocCompose`, etc.
- **No law without a generator**: each law has a bespoke `genPlan.<Law>()` that only emits well-typed shapes for that law

### Minimal Example (Arrow core: arr functoriality)

```typescript
// test/laws/law.ArrFunctor.spec.ts
describe("LAW: arr functoriality", () => {
  it("arr(g∘f) == arr f >>> arr g", () => {
    fc.assert(
      fc.property(genFn(), genFn(), genInput.scalar(), (f, g, x) => {
        const lhs = denote({ tag:'Arr', f: (y:any) => g(f(y)) }, x);
        const rhs = denote({ tag:'Comp',
          f: { tag:'Arr', f }, g: { tag:'Arr', f: g } }, x);
        return eqOutputs(lhs, rhs);
      })
    );
  });
});
```

### Quick FAQ

**Where do domain assumptions go (e.g., independence)?**
Into a witness predicate (e.g., `independentFor`), optionally fuzz-checked in dev. Rewrites are gated by this predicate.

**Do we snapshot explain-plans?**
Only for small canonical examples—useful for guarding accidental changes in rewrite order.

**What about performance witnesses?**
Separate from correctness: keep micro-bench checks in `test/perf/` with thresholds; correctness witnesses must not depend on timing.

### Normalization Passes (Pre-Optimization)

**Cat-normalize**: assoc Comp, drop Arr id, fuse Arr∘Arr.

**Push structure**: First(Comp), Left(Comp) push-through; First(Arr), Left(Arr) collapse to Arr.

**Par/Fanout canonicalize**: Par(Arr f, Arr g) → Arr(f×g); reassociate to a canonical tree.

This creates a canonical form where:
- Composition is right-associative (easier to optimize)
- Identity arrows are eliminated (cleaner IR)  
- Pure functions are fused (fewer nodes)
- Structure operations are pushed down (exposes optimization opportunities)
- Parallel operations are in canonical form (enables further optimizations)

## CORRECTNESS-BY-LAW PRINCIPLE

**Ideal**: Each optimization (fusion, pushdown, exchange) is proved equationally, before any implementation choices. That means you can design a TS library where optimization passes are just pattern-directed rewrites guaranteed by theorems, not tests of runtime behavior. It's correctness-by-law.

### Current Status: Partially Following

**✅ What we have:**
- Laws documented in `LAWS.md` with mathematical equations
- IR-based approach with pattern-directed rewrites
- Denotation function (`denot()`) that gives semantic meaning
- Explain-plan contract showing which laws fired

**❌ What we need:**
- Formal equational proofs for each rewrite rule
- Theorem references in rewrite implementations
- Law-driven optimization (not ad-hoc heuristics)
- Witness tests that verify law compliance

### Implementation Strategy

1. **For each rewrite rule**: Cite the specific law/theorem that justifies it
2. **For each optimization**: Show the equational proof before implementing
3. **For each witness**: Verify that the law holds, not just that the code works
4. **For each explain-plan step**: Reference the exact law that was applied

### Example: Law-Driven Rewrite

```typescript
// ❌ Ad-hoc optimization
if (f.tag === 'Arr' && g.tag === 'Arr') {
  return arr((i: I) => g.f(f.f(i))) // "This seems faster"
}

// ✅ Law-driven optimization  
if (f.tag === 'Arr' && g.tag === 'Arr') {
  // Law: Arrow.2 (Functoriality): arr(g ∘ f) = arr(f) >>> arr(g)
  // Proof: By definition of arr and composition
  const result = arr((i: I) => g.f(f.f(i)))
  steps.push({
    rule: "FuseArr",
    law: "Arrow.2 (Functoriality)",
    proof: "arr(g∘f) = arr(f)>>>arr(g) by Arrow functoriality"
  })
  return result
}
```

### Runnable Examples as Tests

Our `run-examples-simple.ts` serves as **integration tests** that:
- Show real usage patterns
- Test feature integration  
- Demonstrate correctness through execution
- Provide live documentation

FOR NEWLY or SUBSEQUENTLY ADDED RUNNABLE EXAMPLES, may use same file as always but please
put the NEW example in an appropriately named function of its own, rather than expanding
the giant "RUN ALL EXAMPLES" that's currently there.

**Keep both approaches**: Witness tests for law compliance + runnable examples for integration testing.

## KNOWLEDGE CAPTURE

**Problem**: Large codebases accumulate "X is helpful for Y" knowledge that becomes hard to discover.

**Solution**: Maintain `KNOWLEDGE_BASE.md` with patterns and their use cases.

**When to update**:
- After implementing a new utility/pattern
- When discovering a new use case for existing utilities
- During code review when spotting opportunities
- When refactoring to use better patterns

**Example entries**:
- "CanonicalJsonMap is helpful for caches and deduplication passes"
- "hashConsJson is helpful for memory optimization with repeated subtrees"
- "Arrow IR system is helpful for law verification and optimization"

**Integration**: Reference knowledge base during development to avoid reinventing patterns.

## TOKEN DRIFT PREVENTION

**Problem**: Long-running LLM conversations lose context and drift from established practices.

**Solution**: Systematic context refresh every 5th prompt or major milestone.

**Refresh Triggers**:
- Every 5th user prompt
- After completing a major feature
- When starting a new development session
- When the LLM seems to be forgetting established patterns

**Refresh Prompt Template**:
```
"Please review the current workflow in DEV GUIDELINES.md and KNOWLEDGE_BASE.md to ensure we're following established practices. Are there any existing patterns or utilities we should consider for the current task?"
```

**Context Maintenance**:
- Keep DEV GUIDELINES.md and KNOWLEDGE_BASE.md as living references
- Update them as new patterns emerge
- Use them to ground the LLM in established practices

## NEW CODE IMPLEMENTATION CHECKLIST

**Before implementing new functionality**:
1. **Check LLM HINTS**: Review KNOWLEDGE_BASE.md for relevant patterns
2. **Evaluate tradeoffs**: Consider multiple existing options if available
3. **Avoid redundancy**: Ensure you're not reimplementing existing functionality
4. **Consider integration**: How does this fit with existing patterns?

**During implementation**:
1. **Follow established patterns**: Use existing utilities when possible
2. **Document new patterns**: Add to KNOWLEDGE_BASE.md if you create something reusable
3. **Consider future upgrades**: Will this benefit from the "sandwiching" analysis later?

**After implementation**:
1. **Run upgrade analysis**: Use the "sandwiching" process to find improvement opportunities
2. **Categorize opportunities**: 
   - **Immediate**: Implement right away (clear wins)
   - **Deferred**: Add to `UPGRADE_BACKLOG.md` for future maintenance
3. **Update knowledge base**: Add any new patterns discovered
4. **Refresh context**: Use token drift prevention if needed

**Example workflow**:
```
User: "I need to implement a cache for JSON data"
LLM: "Let me check KNOWLEDGE_BASE.md... I see CanonicalJsonMap and hashConsJson patterns. 
      CanonicalJsonMap provides automatic canonicalization and upsert patterns, 
      while hashConsJson offers memory optimization. For a JSON cache, 
      CanonicalJsonMap seems ideal. Should I proceed with that approach?"
```