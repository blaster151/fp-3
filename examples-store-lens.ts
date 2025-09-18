#!/usr/bin/env ts-node

// Store + Lens Integration Example: FP + Optics + Comonad Trifecta
import {
  StoreComonad, storeFromArray, collectStore, movingAvg3,
  focusStoreWithLens, extendThroughLens, movingAvgOnField,
  Lens, Store
} from './allTS'

console.log('🔍 Store + Lens Integration: FP + Optics + Comonad Trifecta\n')

// =============================================================================
// Example: Time Series Data with Nested Structure
// =============================================================================

type TimeSeries = {
  readonly name: string
  readonly series: ReadonlyArray<number>
  readonly metadata: { units: string; scale: number }
}

// Sample time series data
const data: ReadonlyArray<TimeSeries> = [
  {
    name: 'temperature',
    series: [20, 22, 25, 30, 28, 24, 21],
    metadata: { units: 'celsius', scale: 1 }
  },
  {
    name: 'humidity', 
    series: [60, 65, 70, 75, 72, 68, 63],
    metadata: { units: 'percent', scale: 1 }
  },
  {
    name: 'pressure',
    series: [1013, 1015, 1018, 1020, 1017, 1014, 1012],
    metadata: { units: 'hPa', scale: 1 }
  }
]

console.log('=== Original Data ===')
data.forEach(ts => {
  console.log(`${ts.name}: [${ts.series.join(', ')}] ${ts.metadata.units}`)
})

// =============================================================================
// Lens for focusing on the series field
// =============================================================================

const seriesLens: Lens<TimeSeries, ReadonlyArray<number>> = {
  get: (ts) => ts.series,
  set: (newSeries) => (ts) => ({ ...ts, series: newSeries })
}

// Lens for focusing on a specific index within the series
const indexLens = (i: number): Lens<ReadonlyArray<number>, number> => ({
  get: (arr) => arr[i] ?? 0,
  set: (newVal) => (arr) => arr.map((val, idx) => idx === i ? newVal : val)
})

// =============================================================================
// Store-based Computations
// =============================================================================

console.log('\n=== Store-based Moving Average ===')

// Create a Store over the time series data
const timeSeriesStore = storeFromArray(data, 0)

// Apply moving average to the series field of each time series
const smoothedStore = StoreComonad<number>().extend((ctx: Store<number, TimeSeries>) => {
  const ts = ctx.peek(ctx.pos)
  
  // Create a Store over the series data
  const seriesStore = storeFromArray(ts.series, 0)
  
  // Apply moving average
  const smoothedSeries = movingAvg3(seriesStore)
  
  // Collect the smoothed values
  const newSeries = collectStore(ts.series.length)(smoothedSeries)
  
  // Return updated time series
  return { ...ts, series: newSeries }
})(timeSeriesStore)

// Collect the results
const smoothedData = collectStore(data.length)(smoothedStore)

console.log('Smoothed data:')
smoothedData.forEach((ts: any) => {
  console.log(`${ts.name}: [${ts.series.map((n: number) => Math.round(n*100)/100).join(', ')}] ${ts.metadata.units}`)
})

// =============================================================================
// Store + Lens Integration Example
// =============================================================================

console.log('\n=== Store + Lens Integration ===')

// Focus on just the series field and apply moving average
const focusedStore = focusStoreWithLens(seriesLens)(timeSeriesStore)

// The focused store now operates on ReadonlyArray<number> instead of TimeSeries
console.log('Focused on series field - first series:', focusedStore.peek(0))

// Apply moving average through the lens (preserving the rest of the structure)
const lensSmoothedStore = extendThroughLens(seriesLens)(
  (ctx: Store<number, ReadonlyArray<number>>) => {
    // Create a Store over the array and apply moving average
    const arrayStore = storeFromArray(ctx.peek(ctx.pos), 0)
    const smoothed = movingAvg3(arrayStore)
    return collectStore(ctx.peek(ctx.pos).length)(smoothed)
  }
)(timeSeriesStore)

const lensSmoothedData = collectStore(data.length)(lensSmoothedStore as any)

console.log('Lens-smoothed data (preserving structure):')
lensSmoothedData.forEach((ts: any) => {
  console.log(`${ts.name}: [${ts.series.map((n: number) => Math.round(n*100)/100).join(', ')}] ${ts.metadata.units}`)
  console.log(`  metadata preserved: ${JSON.stringify(ts.metadata)}`)
})

// =============================================================================
// Convenient Helper: movingAvgOnField
// =============================================================================

console.log('\n=== Using movingAvgOnField Helper ===')

// Create a lens that focuses on the series field and then a specific value
const seriesValueLens = (index: number): Lens<TimeSeries, number> => ({
  get: (ts) => ts.series[index] ?? 0,
  set: (newVal) => (ts) => ({
    ...ts,
    series: ts.series.map((val, i) => i === index ? newVal : val)
  })
})

// Apply moving average to each position independently (just for demonstration)
let helperSmoothedStore = timeSeriesStore
for (let i = 0; i < data[0].series.length; i++) {
  helperSmoothedStore = movingAvgOnField(seriesValueLens(i))(helperSmoothedStore)
}

const helperSmoothedData = collectStore(data.length)(helperSmoothedStore)

console.log('Helper-smoothed data:')
helperSmoothedData.forEach((ts: any) => {
  console.log(`${ts.name}: [${ts.series.map((n: number) => Math.round(n*100)/100).join(', ')}] ${ts.metadata.units}`)
})

// =============================================================================
// Comparison with Manual Approach
// =============================================================================

console.log('\n=== Comparison: Manual vs Store+Lens ===')

// Manual approach (rebuilding structures)
const manualSmoothed = data.map(ts => {
  const smoothed = ts.series.map((_, i, arr) => {
    const prev = arr[i - 1] ?? arr[i]
    const curr = arr[i]
    const next = arr[i + 1] ?? arr[i]
    return (prev + curr + next) / 3
  })
  return { ...ts, series: smoothed }
})

console.log('Manual approach (for comparison):')
manualSmoothed.forEach((ts: any) => {
  console.log(`${ts.name}: [${ts.series.map((n: number) => Math.round(n*100)/100).join(', ')}] ${ts.metadata.units}`)
})

console.log('\n✅ Store + Lens integration demonstrates:')
console.log('  - 🔍 Focused computations without rebuilding entire structures')
console.log('  - 🔄 Comonadic context-aware processing') 
console.log('  - 🎯 Lens-based field targeting')
console.log('  - 🚀 Composable, reusable abstractions')
console.log('\n🎉 FP + Optics + Comonad trifecta complete!')