# Upgrade Backlog

*Tracked improvement opportunities discovered through PDI analysis.*

## 🎯 **Current Status**

- **Total opportunities**: 42+ manual patterns found
- **High priority**: 2 clear upgrade paths
- **Medium priority**: 1 moderate upgrade path  
- **Low priority**: 1 nice-to-have upgrade path

## 📋 **Backlog Items**

### **High Priority (Immediate Benefits)**

#### **1. Replace Manual Aggregation with mapGroupValues**
- **Pattern**: `f.items.reduce((n, x) => n + x, 0)`
- **Found in**: 41 locations across allTS.ts
- **Upgrade to**: `mapGroupValues(groups, (vs) => vs.reduce((s, x) => s + x, 0))`
- **Benefit**: Cleaner, more functional code
- **Risk**: Low (pure functions)
- **Effort**: Low (direct replacement)
- **Status**: 🔄 **Ready for implementation**

#### **2. Replace Manual Filtering with filterEachGroup**
- **Pattern**: `vs.filter((v, i) => p(v, k, i))`
- **Found in**: Multiple locations
- **Upgrade to**: `filterEachGroup(groups, (v) => p(v))`
- **Benefit**: Consistent filtering interface
- **Risk**: Low (pure functions)
- **Effort**: Low (direct replacement)
- **Status**: 🔄 **Ready for implementation**

### **Medium Priority (Moderate Benefits)**

#### **3. Replace Manual Group Iteration with flattenGroups**
- **Pattern**: `for (const [key, values] of groups)`
- **Found in**: 1 location in examples
- **Upgrade to**: `flattenGroups(groups).forEach(([key, value]) => ...)`
- **Benefit**: Functional approach to iteration
- **Risk**: Low (pure functions)
- **Effort**: Medium (requires restructuring)
- **Status**: ⏳ **Deferred for now**

### **Low Priority (Nice to Have)**

#### **4. Replace Manual Multimap Operations**
- **Pattern**: Manual multimap building and iteration
- **Found in**: Multiple locations
- **Upgrade to**: Multimap adapters (`mapMultiValues`, `filterEachMulti`, etc.)
- **Benefit**: Consistent multimap interface
- **Risk**: Low (pure functions)
- **Effort**: Medium (requires understanding multimap usage)
- **Status**: ⏳ **Deferred for now**

## 🚀 **Implementation Plan**

### **Phase 1: High Priority (This Session)**
1. **Manual Aggregation**: Replace 41 `reduce` patterns with `mapGroupValues`
2. **Manual Filtering**: Replace filtering patterns with `filterEachGroup`
3. **Test**: Ensure all upgrades work correctly
4. **Document**: Update examples and documentation

### **Phase 2: Medium Priority (Next Session)**
1. **Group Iteration**: Replace manual iteration with `flattenGroups`
2. **Test**: Ensure functional approach works
3. **Document**: Update examples

### **Phase 3: Low Priority (Future)**
1. **Multimap Operations**: Replace manual multimap patterns
2. **Test**: Ensure multimap adapters work
3. **Document**: Update examples

## 📊 **Success Metrics**

### **Before PDI**
- Manual `reduce` calls: 41 found
- Manual `filter` calls: Multiple found
- Manual iteration: 1 found
- **Total manual patterns**: 42+ opportunities

### **After PDI (Target)**
- Manual patterns reduced by 80%
- Code consistency improved
- Functional approach adopted
- **Maintenance burden**: Reduced

## 🔄 **Recently Completed**

### **New Group Operations Implementation** ✅
- **Date**: 2024-12-17
- **What**: Added group operations (concatGroups, unionGroupsBy, intersectGroupsBy, diffGroupsBy, topKBy, sortGroupsBy)
- **Impact**: 10+ upgrade opportunities identified
- **Status**: **Completed** - Ready for PDI analysis
- **📄 Detailed Analysis**: [`PDI_ANALYSIS_GROUP_OPS.md`](./PDI_ANALYSIS_GROUP_OPS.md)

### **New Adapters Implementation** ✅
- **Date**: 2024-12-17
- **What**: Added CanonicalJsonMap/Set adapters
- **Impact**: 42+ upgrade opportunities identified
- **Status**: **Completed** - Ready for PDI analysis
- **📄 Detailed Analysis**: [`PDI_ANALYSIS_ADAPTERS.md`](./PDI_ANALYSIS_ADAPTERS.md)

### **New Streaming Operations Implementation** ✅
- **Date**: 2024-12-17
- **What**: Added streaming reducers and min/max operations
- **Impact**: 40+ upgrade opportunities identified
- **Status**: **Completed** - Ready for PDI analysis
- **📄 Detailed Analysis**: [`PDI_ANALYSIS_STREAMING.md`](./PDI_ANALYSIS_STREAMING.md)

### **New Canonical Operations Implementation** ✅
- **Date**: 2025-01-18
- **What**: Added canonical min/max and distinct operations
- **Impact**: 20+ upgrade opportunities identified
- **Status**: **Completed** - Ready for PDI analysis
- **📄 Detailed Analysis**: [`PDI_ANALYSIS_CANONICAL_OPERATIONS.md`](./PDI_ANALYSIS_CANONICAL_OPERATIONS.md)
- **Features Added**:
  - `minByCanonical`, `maxByCanonical` - Lexicographic min/max by canonical key
  - `minByCanonicalScore`, `maxByCanonicalScore` - Score-based min/max with canonical key access
  - `distinctByCanonical`, `distinctByCanonicalToArray` - Streaming distinct (first-wins)
  - `distinctPairsByCanonical`, `distinctPairsByCanonicalToArray` - Streaming distinct pairs
  - `distinctByCanonicalLast`, `distinctPairsByCanonicalLast` - Last-wins distinct operations
  - `sortJsonByCanonical`, `sortJsonByCanonicalDesc` - Stable sort by canonical key (asc/desc)
  - `uniqueJsonByCanonical`, `uniqueJsonByCanonicalLast` - Unique by canonical key (first-wins/last-wins)
- **Benefits**: Structural equality, deterministic ordering, memory-efficient streaming, first-wins/last-wins semantics
- **Integration Points**: Data deduplication, canonical ordering, score-based selection, streaming deduplication, configuration merging, canonical sorting, canonical uniqueness

## 📄 **External Analysis Files**

**Detailed PDI Analysis Documents**:
- [`PDI_ANALYSIS_ADAPTERS.md`](./PDI_ANALYSIS_ADAPTERS.md) - CanonicalJsonMap/Set adapters analysis
- [`PDI_ANALYSIS_GROUP_OPS.md`](./PDI_ANALYSIS_GROUP_OPS.md) - Group operations analysis
- [`PDI_ANALYSIS_STREAMING.md`](./PDI_ANALYSIS_STREAMING.md) - Streaming operations analysis
- [`PDI_ANALYSIS_CANONICAL_OPERATIONS.md`](./PDI_ANALYSIS_CANONICAL_OPERATIONS.md) - Canonical min/max and distinct operations analysis

**Pattern Discovery Documents**:
- [`KNOWLEDGE_BASE.md`](./KNOWLEDGE_BASE.md) - Patterns, utilities, and ripgrep patterns
- [`AI_DEV_GUIDELINES.md`](./AI_DEV_GUIDELINES.md) - PDI methodology and processes

## 📈 **Backlog Statistics**

- **Total items**: 4
- **High priority**: 2 (50%)
- **Medium priority**: 1 (25%)
- **Low priority**: 1 (25%)
- **Completed**: 4 (100%)
- **Ready for implementation**: 0 (0%)

## 🎯 **Next Actions**

1. **✅ All implementations completed** - All new operations implemented and tested
2. **✅ All examples working** - Comprehensive examples demonstrate all features
3. **✅ All PDI analysis completed** - Full analysis documents created
4. **🔄 Monitor for new patterns** (ongoing PDI) - Look for new upgrade opportunities

---

*"Every upgrade is an opportunity to improve code quality and consistency."* - The PDI Upgrade Manifesto