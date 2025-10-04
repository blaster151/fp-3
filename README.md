# Pattern Discovery & Integration (PDI) System

*The PDI system provides systematic approaches to discovering existing patterns and integrating them into new and existing code.*

## What is PDI?

**Pattern Discovery & Integration** is a methodology for:
- 🔍 **Discovering** existing patterns and utilities in your codebase
- 🔗 **Integrating** them into new and existing code
- 📚 **Maintaining** knowledge about what's available
- 🚀 **Scaling** development efficiency as projects grow

## Two Independent Systems

This PDI folder contains **TWO DISTINCT SYSTEMS**:

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

### Core Documentation
- **`AI_DEV_GUIDELINES.md`** - Detailed processes for AI-assisted development
- **`HUMAN_DEV_GUIDELINES.md`** - Concise overview for human developers
- **`KNOWLEDGE_BASE.md`** - Patterns, utilities, and LLM hints
- **`UPGRADE_BACKLOG.md`** - Tracked improvement opportunities

### Supporting Files
- **`REMINDERS.md`** - Maintenance checklist
- **`DEVELOPMENT_STRUCTURE.md`** - File organization guide
- **`RECOVERY_STRATEGY.md`** - Recovering lost knowledge
- **`SYSTEM_ARCHITECTURE.md`** - Two independent systems explained

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
  bridge, composition/representation analyzers, and loose-monoid conversion
  helpers) together with Definition 5.1 relative-adjunction scaffolding
  (`RelativeAdjunctionData`, framing/hom-isomorphism analyzers, composition
  checks, and oracles), the new Definition 5.14/5.18/5.23 morphism analyzers
  (left/right/strict morphisms and their slice/coslice embeddings), Section 6
  Kleisli/Eilenberg–Moore framing checks, and the dual relative-comonad
  machinery from Section 7.  Identity-case constructors make the Vitest suites
  executable without external data, while pending associativity checks,
  strengthened universal properties, and the Theorem 5.24 resolution entry keep
  the remaining theorems visible in `LAWS.md`.  The
  `unitCounit.presentation` oracle validates Lemma 5.5 boundary data whenever
  an explicit unit/counit presentation accompanies the adjunction, and the
  Proposition 5.8/5.10/5.11 oracles (pointwise left lifts, left extensions
  along fully faithful roots, and shared colimit preservation) now sit beside
  the left/right/strict morphism checks to keep these operational insights
  executable alongside the existing framing checks.

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
