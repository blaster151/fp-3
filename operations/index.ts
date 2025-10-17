export {
  Rewriter,
  defaultOperationRules,
  type OperationRule,
  type OperationContext,
  type NormalizeCompositeRewrite,
  type UpgradeToIsoRewrite,
  type ReplaceWithIdentityRewrite,
  type MergeSubobjectsRewrite,
  type MergeObjectsRewrite,
  type FactorThroughEpiMonoRewrite,
} from "./rewriter"

export type {
  Suggestion as OperationSuggestion,
  Rewrite as OperationRewrite,
} from "./rewriter"

export { UnionFind } from "./union-find"
