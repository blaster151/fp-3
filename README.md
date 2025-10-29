# Pattern Discovery & Integration (PDI) System

*The PDI system provides systematic approaches to discovering existing patterns and integrating them into new and existing code.*

## What is PDI?

**Pattern Discovery & Integration** is a methodology for:
- 🔍 **Discovering** existing patterns and utilities in your codebase
- 🔗 **Integrating** them into new and existing code
- 📚 **Maintaining** knowledge about what's available
- 🚀 **Scaling** development efficiency as projects grow

## Two Independent Systems

The `pdi/` folder contains **TWO DISTINCT SYSTEMS**:

## Core typeclasses

The shared `typeclasses.ts` module now surfaces the familiar `Foldable`,
`Traversable`, `Compactable`, `Filterable`, and `Witherable` abstractions (and
their indexed variants) together with constructor helpers.  Downstream
call-sites can import the ready-made instances for `ReadonlyArray`, `Option`,
or `Result`, or build customised variants—e.g. `getResultWitherable`—to supply
domain-specific error semantics.  The same helpers are re-exported from
`src/all/monad-transformers.ts`, so existing barrel imports keep working while
the new fold/filter/wither capabilities stay easy to discover.

## Running runnable examples and tests

- `npm run examples:runnable` executes every runnable example in ascending
  identifier order so the lower numbered catalogue entries run first. You can
  pass any subset of example identifiers (for example,
  `npm run examples:runnable -- 005 006`) or `--list` to inspect the catalogue
  without running anything. Use `--tag <tag>` (repeat the flag for multiple
  tags) to run only the examples annotated with the requested labels—for
  instance `npm run examples:runnable -- --tag coalgebra` runs the coalgebra
  diagnostics in isolation.
- `npm run examples:runnable:coverage` gathers V8 coverage data while executing
  the runnable examples. The command writes a JSON summary to
  `coverage/runnable-examples/summary.json` and prints a human-readable
  breakdown to the console.
- `npm run test` runs the Vitest suite, while `npm run test:coverage` generates a
  coverage report using the existing `scripts/run-vitest-coverage.mjs` helper.

Both coverage commands place their artifacts inside the `coverage/` directory so
you can inspect the combined reports or archive them for later analysis.

### **System 1: Pattern Discovery & Integration (PDI)**
- **Purpose**: "Remember these handy shortcuts exist now"
- **Value**: Discover existing patterns, integrate them into new code
- **Standalone**: Works independently for any codebase improvement

### **System 2: Recurring Task System**
- **Purpose**: "Recur the following: X"
- **Value**: Automate maintenance tasks, keep context fresh
- **Standalone**: Works for any recurring task (not just PDI)

**The synergy**: We use System 2 to keep System 1 "top of mind" automatically!

## PDI Files

All documentation and support scripts for the system live inside the `pdi/` directory.

### Core Documentation
- **`pdi/AI_DEV_GUIDELINES.md`** - Detailed processes for AI-assisted development
- **`pdi/HUMAN_DEV_GUIDELINES.md`** - Concise overview for human developers
- **`pdi/KNOWLEDGE_BASE.md`** - Patterns, utilities, and LLM hints
- **`pdi/UPGRADE_BACKLOG.md`** - Tracked improvement opportunities

### Supporting Files
- **`pdi/REMINDERS.md`** - Maintenance checklist
- **`pdi/DEVELOPMENT_STRUCTURE.md`** - File organization guide
- **`pdi/RECOVERY_STRATEGY.md`** - Recovering lost knowledge
- **`pdi/SYSTEM_ARCHITECTURE.md`** - Two independent systems explained

### Virtual Equipment Scaffolding

- **`virtual-equipment/`** - Dedicated module boundary for the formal-category
  equipment layer.  Exports tight-side aliases, `VirtualEquipment` interfaces,
  restriction builders that surface `RepresentabilityWitness` metadata,
  companion/conjoint placeholders, loose-monoid and skew-multicategory
  analyzers, loose adjunction map/right lift/right extension analyzers, weighted
  cone/cocone and
  restriction checkers, density/absolute colimit analyzers, and pending
  oracles so future relative-monad work can plug into the oracle registry
  without rediscovering where the scaffolding lives.
- **`relative/`** - Home for the emerging relative layer.  It now bundles
  Definition 4.1 analyzers (`analyzeRelativeMonadFraming`,
  `analyzeRelativeMonadRepresentability`,
  `analyzeRelativeMonadIdentityReduction`, the Theorem 4.29 skew-monoid
  bridge, composition/representation analyzers, loose-monoid conversion
  helpers, and the Street action calculators from Definition 6.9 onwards)
  together with Definition 5.1 relative-adjunction scaffolding
  (`RelativeAdjunctionData`, framing/hom-isomorphism analyzers, composition
  checks, and oracles), the new Definition 5.14/5.18/5.23 morphism analyzers
  (left/right/strict morphisms and their slice/coslice embeddings), Section 6
  Kleisli/Eilenberg–Moore framing checks, and the dual relative-comonad
  machinery from Section 7.  Identity-case constructors make the Vitest suites
  executable without external data, while pending associativity checks,
  strengthened universal properties, a Theorem 6.39-inspired universal witness
  for the Eilenberg–Moore algebra (including the mediating tight cell, Lemma 6.38
  right-adjoint section with explicit triangle identities, the Corollary 6.40
  partial right adjoint functor, and graded factorisations), and the Theorem 5.24 resolution entry keep
  the remaining theorems visible in `LAWS.md`.  The
  `unitCounit.presentation` oracle validates Lemma 5.5 boundary data whenever
  an explicit unit/counit presentation accompanies the adjunction, and the
  Proposition 5.8/5.10/5.11 oracles (pointwise left lifts, left extensions
  along fully faithful roots, and shared colimit preservation) now sit beside
  the left/right/strict morphism checks to keep these operational insights
  executable alongside the existing framing checks.  Street action analyzers
  and `enumerateRelativeAlgebraOracles` now surface the executed
  Definition 6.9–6.14 comparisons alongside canonical (op)algebra diagnostics,
  exposing the evaluated red/green composites to downstream tooling.

#### Relative monads at a glance

```typescript
import {
  fromMonad,
  enumerateRelativeMonadOracles,
  RelativeMonadOracles,
  RelativeMonadLawRegistry,
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
const reports = enumerateRelativeMonadOracles(relative)

// Individual law reports stay available through RelativeMonadOracles
const framing = RelativeMonadOracles.framing(relative)
console.log(RelativeMonadLawRegistry.unitFraming.name, framing)
```

Recent Section 6 additions:

- `RelativeAlgebraOracles.partialRightAdjointFunctor` now validates the
  Corollary 6.40 comparison by replaying the Lemma 6.38 section and the fully
  faithful witnesses.
- `RelativeMonadOracles.enrichedCompatibility` keeps Section 8’s enriched
  hom/tensor data honest by ensuring the recorded witnesses reuse the relative
  monad’s unit and extension cells.
- `RelativeMonadOracles.setEnrichedCompatibility` specialises Example 8.14 to
  Set-enriched roots by confirming the fully faithful section and every listed
  correspondence reuse the loose arrow, unit, and extension supplied by the
  relative monad.
- `analyzeFiniteVectorRelativeMonad` +
  `describeBooleanVectorRelativeMonadWitness` replay Example 1 from *Monads Need
  Not Be Endofunctors*, enumerating Boolean finite vector spaces and checking
  the relative monad laws across all recorded dimensions.
- `analyzeFiniteVectorKleisliSplitting` cross-checks Theorem 3/Example 5 by
  composing every Boolean matrix against the recorded extension operator,
  certifying Kleisli identities/associativity for the Vec splitting.
- `analyzeUntypedLambdaRelativeMonad` +
  `describeUntypedLambdaRelativeMonadWitness` replay Example 2 from *Monads Need
  Not Be Endofunctors*, generating well-scoped λ-terms across small finite
  contexts, replaying the capture-avoiding substitution operator, and verifying
  the relative monad unit/extension laws alongside associativity of Kleisli
  composition.
- `analyzeLambdaKleisliSplitting` restates Example 6 by summarising the Kleisli
  category of Lam: trivial substitutions act as identities and sequential
  substitution agrees with Kleisli composition.
- `analyzeIndexedContainerRelativeMonad` +
  `describeIndexedContainerExample4Witness` instantiate Example 4’s indexed
  container presentation, enumerating finite families over two indices,
  replaying the Example 4 unit/extraction data, and certifying the relative
  monad laws using the induced substitution operator.
- `analyzePowersetRelativeMonad` +
  `describeCofinitePowersetWitness` encode Example 8’s powerset relative monad,
  leveraging replayable subsets to approximate infinite carriers while
  reporting unit/right-unit/associativity comparisons together with truncation
  metadata.
- `analyzeFiniteVectorLeftKanExtension` +
  `describeBooleanVectorLeftKanExtensionWitness` reconstruct the Example 1 left
  Kan extension along the inclusion FinSet → Set, confirming the induced
  colimit presentations collapse to the usual Boolean vector functor on finite
  sets and flagging missing dimensions when the witness bound is too small.
- `analyzeFiniteVectorArrowCorrespondence` +
  `describeBooleanVectorArrowCorrespondenceWitness` compare an `arr`/
  composition witness with the canonical Boolean vector relative monad,
  checking that every enumerated matrix acts on vectors exactly as the
  relative extension operator prescribes.
- `analyzeMnneLaxMonoidalStructure` + `describeTwoObjectLaxMonoidalWitness`
  implement Section 3.2’s lax monoidal structure on `[J,C]`, checking that
  composing Lan\_j with sample functors matches the recorded tensor, unitors,
  and associator while the triangle identity holds for the supplied triples.
- `analyzeMnneLaxMonoid` + `describeTwoObjectLaxMonoidWitness` certify the
  Theorem 3 lax-monoid presentation by reusing the Lan\_j tensor to check the
  left/right unit diagrams and the associativity composite against the recorded
  unit and multiplication witnesses.
- `RelativeMonadOracles.functorCategoryLaxMonoidal` exposes the same
  diagnostics via the oracle registry so Example 3’s data appears alongside the
  other MNNE oracles in scripts and demos.
- `RelativeMonadOracles.functorCategoryLaxMonoid` reports the lax-monoid
  analyzer’s verdict so relative monad ↔ lax monoid bridges show up in CLI
  demos without additional wiring.
- `RelativeMonadOracles.wellBehavedInclusion` checks the Definition 4.1
  full-faithfulness requirement for j : J → C by enumerating finite hom-sets
  and confirming J induces bijections `C(JX, JY) ≅ J(X, Y)` on the supplied
  sample objects (with the density/associativity clauses logged for follow-up).
- `RelativeMonadOracles.lanExtension` wires in Section 4.3’s construction,
  verifying the Lan\_J T functor satisfies the monad laws on C and that the
  comparison κ\_T witnesses the equivalence with the original relative monad.
- `RelativeMonadOracles.vectorArrowCorrespondence` compares an `arr`/composition
  witness against the Boolean vector relative monad, confirming Example 1’s
  arrow viewpoint coincides with the canonical unit/extension data.
- `RelativeMonadOracles.enrichedEilenbergMooreAlgebra` operationalises
  Definition 8.16 by demanding the carrier share the monad boundaries, the
  extension operator reuse the enriched extension witness, and by evaluating
  the Street pastings for the unit and multiplication composites against the
  recorded enriched comparisons.
- `RelativeMonadOracles.enrichedKleisliInclusion` captures Lemma 8.7’s
  identity-on-objects V-functor k_T : A → Kl(T) by insisting the inclusion
  reuses the monad’s loose arrow, unit, and extension witnesses and that the
  opalgebra comparison with κ_T matches the recorded triangles.
- `RelativeMonadOracles.enrichedYoneda` exposes Example 8.6’s Yoneda embedding
  by verifying the representable presheaf and action reuse the enriched hom,
  tensor, and extension witnesses.
- `RelativeMonadOracles.enrichedYonedaDistributor` tracks Lemma 8.7’s
  comparison through PZ(p,q), requiring the red and green composites to share
  boundaries with the Yoneda witness, match the recorded factorisation, and
  agree with the right lift unit witnessing the universal property of `q ▷ p`.
- `RelativeMonadOracles.enrichedVCatSpecification` surfaces Theorem 8.12’s
  V-Cat presentation by insisting the unit/multiplication triangles, functorial
  identity/composition diagrams, and τ-naturality witnesses all reuse the
  enriched unit/extension 2-cells and agree on evidence.
- `RelativeComonadOracles.enrichment` dualises Proposition 8.22 by comparing
  the enriched cohom object and cotensor comparison against the recorded
  counit/coextension witnesses of a relative comonad.
- `RelativeComonadOracles.coopAlgebra` replays Theorem 8.24 by requesting the
  coopalgebra coassociativity/counit diagrams and confirming they reuse the
  enriched comparisons.
- `RelativeAlgebraOracles.opalgebraResolution` lifts Lemma 6.47 opalgebras into
  the Lemma 6.35 resolution and exposes the nested κ\_t diagnostics.
- `RelativeAlgebraOracles.partialLeftAdjointSection` records Theorem 6.49’s
  section \(RAdj\_j(j) \to RMnd\_j\) and checks that the transpose is the identity
  on \(j\)-objects.
- Recent `Monads Need Not Be Endofunctors` additions point to strong follow-up
  references—especially the λ-calculus analyses by Altenkirch–Reus and
  Altenkirch–Reus–Streicher, plus Altenkirch–Chapman–Uustalu’s work on relative
  monads—that are catalogued in `FUTURE_ENHANCEMENTS.md` for deeper mining.

### Tools
- **`upgrade-analyzer.js`** - Analyze patterns and manage backlog
- **`maintenance-reminder.js`** - Check maintenance status
- **`task-scheduler.js`** - Recurring task system
- **`cloud-task-scheduler.js`** - Cloud-native task management
- **`docs-checker.js`** - Keep documentation evergreen

## Quick Start

### For Human Developers
```bash
# Check maintenance status
npm run maintenance:check

# View upgrade opportunities
npm run upgrade:backlog

# See backlog statistics
npm run upgrade:stats

# Check recurring tasks
npm run tasks:check

# List all tasks
npm run tasks:list

# Check documentation staleness
npm run docs:check
```

### For AI-Assisted Development
1. Follow `AI_DEV_GUIDELINES.md` for systematic processes
2. Use `KNOWLEDGE_BASE.md` for pattern discovery
3. Update `UPGRADE_BACKLOG.md` for deferred opportunities
4. Use recurring task system for automated maintenance
5. Keep documentation evergreen with docs checker

### Cloud Integration (Optional)
```bash
# Set up cloud provider
node pdi/cloud-task-scheduler.js setup

# Check cloud tasks
node pdi/cloud-task-scheduler.js check

# Sync with cloud
node pdi/cloud-task-scheduler.js sync
```

## The PDI Process

### 1. **Pattern Discovery**
- Identify what patterns exist in your codebase
- Document them in the knowledge base
- Create LLM hints for discoverability

### 2. **Integration Analysis**
- After adding new features, find existing code that could benefit
- Use ripgrep patterns to find candidate call sites
- Assess benefits and risks

### 3. **Systematic Implementation**
- Implement immediate wins (clear benefits, low risk)
- Defer complex changes to the backlog
- Track progress and success metrics

## Universal Applicability

**PDI works for any project type**:
- **Web**: New hooks → Find components that could use them
- **Backend**: New utilities → Find manual implementations
- **Mobile**: New patterns → Find inconsistent code
- **Desktop**: New optimizations → Find slow code paths

## Bootstrapping New Projects

The PDI system can be bootstrapped into new projects:
- Copy the `pdi/` folder
- Update project-specific patterns
- Integrate with existing workflows
- Customize for project needs

## Success Metrics

- **Pattern Discovery Rate**: How many existing patterns are found
- **Integration Success**: How many opportunities are implemented
- **Knowledge Retention**: How well patterns are documented
- **Development Efficiency**: Reduction in redundant implementations

## Future Enhancements

- **Automated Pattern Discovery**: AI-powered pattern detection
- **Real-time Integration**: Live suggestions during development
- **Cross-project Learning**: Share patterns between projects
- **Performance Impact**: Measure efficiency improvements
- **Cloud-Native Collaboration**: Multi-LLM task coordination
- **Evergreen Documentation**: Auto-updating READMEs and guides

---

*PDI: Making every project more efficient through systematic pattern discovery and integration.*
