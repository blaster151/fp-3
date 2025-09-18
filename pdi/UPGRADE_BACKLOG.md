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

### **New Adapters Implementation** ✅
- **Date**: 2024-12-17
- **What**: Added CanonicalJsonMap/Set adapters
- **Impact**: 42+ upgrade opportunities identified
- **Status**: **Completed** - Ready for PDI analysis

## 📈 **Backlog Statistics**

- **Total items**: 4
- **High priority**: 2 (50%)
- **Medium priority**: 1 (25%)
- **Low priority**: 1 (25%)
- **Completed**: 1 (25%)
- **Ready for implementation**: 2 (50%)

## 🎯 **Next Actions**

1. **Implement high-priority upgrades** (2 items)
2. **Test upgraded code** (ensure functionality)
3. **Document benefits achieved** (update examples)
4. **Monitor for new patterns** (ongoing PDI)

---

*"Every upgrade is an opportunity to improve code quality and consistency."* - The PDI Upgrade Manifesto