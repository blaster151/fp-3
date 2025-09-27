# Operations Rewriter Overview

The operations layer packages a handful of domain-specific simplifications as
**operation rules**. Each rule inspects a `FiniteCategory` plus a bit of local
context (a composite path or a focus arrow) and produces a `Suggestion` made of
concrete `Rewrite` actions. Suggestions are tagged with the oracle that
justified them and are either `safe` (auto-applied) or `hint` (user approval).

The default rules exported by `operations/rewriter.ts` cover four families of
reasoning:

1. **Iso cancellation** – detects adjacent inverse arrows in a composite and
   replaces them with identities.
2. **Iso upgrades** – promotes arrows to isomorphisms when the user has
   supplied explicit inverse data. There are two flavours:
   - `MonoRightInverseUpgrade` handles split monos that already expose a right
     inverse.
   - `BalancedMonoEpiUpgrade` runs in categories that advertise
     `traits.balanced`; it looks for arrows that are both monic and epic,
     searches for the two-sided inverse guaranteed by balance, and records the
     corresponding identity rewrites.
3. **Object and subobject merges** – consumes the witnesses returned by
   `findMutualMonicFactorizations` and `twoSidedInverses` to merge objects that
   are known to be isomorphic.
4. **Extensibility hooks** – the `Rewriter` class is just a registry; new rules
   can be registered at construction time and are executed in order. This keeps
   additional techniques (pullback normalisation, Beck–Chevalley rewrites, …)
   decoupled from the existing rules.

Every rewrite struct records enough information for downstream tooling to apply
changes or present them interactively. Because we factor all bookkeeping through
`prettyArrow` and the category interfaces, the same machinery works for the
finite Set adapters, toy fixtures, and higher-level constructions.
