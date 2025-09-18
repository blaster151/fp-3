import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { 
  glue, checkDescent, mkRecordGlueKit,
  glueRecordCover, // legacy compatibility
  RecordCover, Sections, GlueKit, GlueErr,
  isVOk, isVErr, VOk, VErr, eqStrict
} from '../allTS'

describe('glueRecordCover', () => {
  it('glues compatible sections; rejects conflicts', () => {
    const cover = { U: new Set(['a','b']), V: new Set(['b','c']) } as const
    const good = { U: { a: 1, b: 2 }, V: { b: 2, c: 3 } } as const
    const bad  = { U: { a: 1, b: 2 }, V: { b: 9, c: 3 } } as const

    const kit = mkRecordGlueKit(cover)
    expect(checkDescent(kit, good)._tag).toBe('VOk')
    expect(glueRecordCover(cover, good)._tag).toBe('VOk')

    const r = glueRecordCover(cover, bad)
    expect(r._tag).toBe('VErr')
    
    if (isVErr(r)) {
      expect(r.errors.length).toBe(1)
      expect(r.errors[0]!._tag).toBe('Conflict')
    }
  })

  it('successful gluing produces correct merged record', () => {
    type K = 'x' | 'y' | 'z'
    type I = 'U' | 'V'

    const cover: RecordCover<I, K> = {
      U: new Set(['x', 'y']),
      V: new Set(['y', 'z']),
    }

    const sections: Sections<I, K, number> = {
      U: { x: 10, y: 20 },
      V: { y: 20, z: 30 },
    }

    const result = glueRecordCover(cover, sections)
    
    expect(isVOk(result)).toBe(true)
    if (isVOk(result)) {
      expect(result.value).toEqual({ x: 10, y: 20, z: 30 })
    }
  })

  it('detects incomplete sections', () => {
    const cover = { U: new Set(['a', 'b']), V: new Set(['b', 'c']) } as const
    const incomplete = { U: { a: 1 }, V: { b: 2, c: 3 } } as const // missing 'b' in U

    const kit = mkRecordGlueKit(cover)
    const result = checkDescent(kit, incomplete)
    
    expect(isVErr(result)).toBe(true)
    if (isVErr(result)) {
      expect(result.errors[0]!._tag).toBe('Incomplete')
      expect((result.errors[0] as any).i).toBe('U')
      expect((result.errors[0] as any).details).toContain('missing b')
    }
  })

  it('detects conflicts on overlaps', () => {
    const cover = { U: new Set(['a', 'b']), V: new Set(['b', 'c']) } as const
    const conflicted = { U: { a: 1, b: 100 }, V: { b: 200, c: 3 } } as const

    const kit = mkRecordGlueKit(cover)
    const result = checkDescent(kit, conflicted)
    
    expect(isVErr(result)).toBe(true)
    if (isVErr(result)) {
      const conflict = result.errors[0] as any
      expect(conflict._tag).toBe('Conflict')
      expect(conflict.left).toEqual({ b: 100 }) // restricted records
      expect(conflict.right).toEqual({ b: 200 })
    }
  })

  it('restriction maps work correctly', () => {
    const cover = { U: new Set(['a', 'b', 'c']), V: new Set(['b', 'c', 'd']) } as const
    const section = { a: 1, b: 2, c: 3 } as const

    const kit = mkRecordGlueKit(cover)
    const restricted = kit.restrict('U', 'V')(section)

    // Should only include overlap keys: b, c
    expect(restricted).toEqual({ b: 2, c: 3 })
  })

  it('handles disjoint covers (no overlap)', () => {
    const cover = { U: new Set(['a']), V: new Set(['b']) } as const
    const sections = { U: { a: 1 }, V: { b: 2 } } as const

    const result = glueRecordCover(cover, sections)
    
    expect(isVOk(result)).toBe(true)
    if (isVOk(result)) {
      expect(result.value).toEqual({ a: 1, b: 2 })
    }
  })

  it('handles single section (trivial cover)', () => {
    const cover = { U: new Set(['a', 'b', 'c']) } as const
    const sections = { U: { a: 1, b: 2, c: 3 } } as const

    const result = glueRecordCover(cover, sections)
    
    expect(isVOk(result)).toBe(true)
    if (isVOk(result)) {
      expect(result.value).toEqual({ a: 1, b: 2, c: 3 })
    }
  })

  it('property test: valid descent always glues successfully', () => {
    fc.assert(fc.property(
      fc.record({
        U: fc.array(fc.string(), { minLength: 1, maxLength: 3, unique: true }),
        V: fc.array(fc.string(), { minLength: 1, maxLength: 3, unique: true })
      }),
      fc.integer({ min: 1, max: 100 }),
      ({ U, V }, sharedValue) => {
        // Create a valid descent by ensuring overlap values match
        const cover = { U: new Set(U), V: new Set(V) } as const
        const overlap = U.filter(k => V.includes(k))
        
        const sections = {
          U: Object.fromEntries([...U.map(k => [k, overlap.includes(k) ? sharedValue : Math.random()])]),
          V: Object.fromEntries([...V.map(k => [k, overlap.includes(k) ? sharedValue : Math.random()])])
        } as const

        const result = glueRecordCover(cover, sections)
        return isVOk(result)
      }
    ))
  })

  it('property test: conflicting sections always fail', () => {
    fc.assert(fc.property(
      fc.array(fc.string(), { minLength: 1, maxLength: 2, unique: true }),
      fc.integer(),
      fc.integer(),
      (keys, val1, val2) => {
        fc.pre(val1 !== val2) // ensure they're different
        fc.pre(keys.length >= 1)
        
        const cover = { U: new Set(keys), V: new Set(keys) } as const
        const sections = {
          U: Object.fromEntries(keys.map(k => [k, val1])),
          V: Object.fromEntries(keys.map(k => [k, val2]))
        } as const

        const result = glueRecordCover(cover, sections)
        return isVErr(result)
      }
    ))
  })

  it('practical example: configuration merging', () => {
    // Scenario: merge configuration from different sources
    type ConfigKey = 'database' | 'auth' | 'logging' | 'cache'
    type Source = 'env' | 'file' | 'defaults'

    const cover: RecordCover<Source, ConfigKey> = {
      env: new Set(['database', 'auth']),      // Environment variables
      file: new Set(['auth', 'logging']),      // Config file  
      defaults: new Set(['logging', 'cache'])  // Default values
    }

    const sections: Sections<Source, ConfigKey, string> = {
      env: { database: 'prod-db', auth: 'oauth' },
      file: { auth: 'oauth', logging: 'info' },        // auth matches env
      defaults: { logging: 'info', cache: 'redis' }    // logging matches file
    }

    const config = glueRecordCover(cover, sections)
    
    expect(isVOk(config)).toBe(true)
    if (isVOk(config)) {
      expect(config.value).toEqual({
        database: 'prod-db',
        auth: 'oauth', 
        logging: 'info',
        cache: 'redis'
      })
    }
  })

  it('practical example: conflict detection in configuration', () => {
    type ConfigKey = 'port' | 'host'
    type Source = 'env' | 'file'

    const cover: RecordCover<Source, ConfigKey> = {
      env: new Set(['port', 'host']),
      file: new Set(['port', 'host'])
    }

    const conflictingSections: Sections<Source, ConfigKey, string> = {
      env: { port: '8080', host: 'localhost' },
      file: { port: '3000', host: 'localhost' }  // port conflicts!
    }

    const result = glueRecordCover(cover, conflictingSections)
    
    expect(isVErr(result)).toBe(true)
    if (isVErr(result)) {
      const conflict = result.errors.find(e => e._tag === 'Conflict') as any
      expect(conflict).toBeDefined()
      expect(conflict.left).toEqual({ port: '8080', host: 'localhost' }) // full overlap
      expect(conflict.right).toEqual({ port: '3000', host: 'localhost' })
    }
  })

  // =============================================================================
  // Generic Glue Kit Tests
  // =============================================================================
  
  describe('Generic GlueKit', () => {
    it('mkRecordGlueKit works with new generic API', () => {
      type I = 'U' | 'V'; type K = 'x' | 'y' | 'z'
      const cover: RecordCover<I, K> = {
        U: new Set(['x','y']),
        V: new Set(['y','z']),
      }
      const secsGood: Sections<I, K, number> = { U: { x:1, y:2 }, V: { y:2, z:3 } }
      const kit = mkRecordGlueKit(cover)

      const result = glue(kit, secsGood)
      
      expect(isVOk(result)).toBe(true)
      if (isVOk(result)) {
        expect(result.value).toEqual({ x: 1, y: 2, z: 3 })
      }
    })

    it('generic kit allows custom data structures', () => {
      // Example: gluing arrays by their overlapping indices
      type ArraySection = readonly number[]
      type Index = 0 | 1 | 2
      
      const arrayGlueKit: GlueKit<'left' | 'right', ArraySection, readonly number[], ArraySection> = {
        cover: ['left', 'right'],
        restrict: (i, j) => (arr: ArraySection) => {
          // For this example, overlaps are middle elements
          if (i === 'left' && j === 'right') return [arr[1], arr[2]] as const
          if (i === 'right' && j === 'left') return [arr[0], arr[1]] as const
          return arr
        },
        eqO: (x, y) => x.length === y.length && x.every((v, i) => v === y[i]),
        assemble: (secs) => {
          // Glue [a,b,c] and [b,c,d] -> [a,b,c,d] (remove duplicate overlap)
          const left = secs.left
          const right = secs.right
          return [...left, ...right.slice(2)] as const
        }
      }

      const sections = {
        left: [1, 2, 3] as const,
        right: [2, 3, 4] as const  // overlaps at [2,3]
      }

      const result = glue(arrayGlueKit, sections)
      
      expect(isVOk(result)).toBe(true)
      if (isVOk(result)) {
        expect(result.value).toEqual([1, 2, 3, 4]) // [1,2,3] + [4] (overlap removed)
      }
    })

    it('generic kit detects conflicts in custom structures', () => {
      // Same array kit but with conflicting overlaps
      const arrayGlueKit: GlueKit<'left' | 'right', readonly number[], readonly number[], readonly number[]> = {
        cover: ['left', 'right'],
        restrict: (i, j) => (arr) => {
          if (i === 'left' && j === 'right') return [arr[1], arr[2]] as const
          if (i === 'right' && j === 'left') return [arr[0], arr[1]] as const
          return arr
        },
        eqO: (x, y) => x.length === y.length && x.every((v, i) => v === y[i]),
        assemble: (secs) => [...secs.left, ...secs.right.slice(2)] as const
      }

      const conflictingSections = {
        left: [1, 2, 3] as const,
        right: [9, 8, 4] as const  // [9,8] conflicts with [2,3]
      }

      const result = glue(arrayGlueKit, conflictingSections)
      
      expect(isVErr(result)).toBe(true)
      if (isVErr(result)) {
        expect(result.errors[0]!._tag).toBe('Conflict')
      }
    })

    it('generic kit supports completeness validation', () => {
      // Example: validating that strings have minimum length
      const stringGlueKit: GlueKit<'A' | 'B', string, string, string> = {
        cover: ['A', 'B'],
        restrict: (i, j) => (s: string) => s.slice(1, 3), // middle 2 chars
        eqO: eqStrict<string>(),
        assemble: (secs) => secs.A + secs.B.slice(2), // concatenate with overlap removal
        completeness: (i, s) => {
          const errors: string[] = []
          if (s.length < 3) errors.push(`section ${i} too short: ${s.length} < 3`)
          if (!/[a-z]/.test(s)) errors.push(`section ${i} missing lowercase`)
          return errors
        }
      }

      const incompleteSections = {
        A: 'Hi',      // too short
        B: 'XYZ'      // no lowercase
      }

      const result = glue(stringGlueKit, incompleteSections)
      
      expect(isVErr(result)).toBe(true)
      if (isVErr(result)) {
        const incomplete = result.errors.filter(e => e._tag === 'Incomplete')
        expect(incomplete).toHaveLength(2)
        expect(incomplete[0]!.details).toContain('section A too short: 2 < 3')
        expect(incomplete[1]!.details).toContain('section B missing lowercase')
      }
    })

    it('checkDescent works independently', () => {
      const cover: RecordCover<'X' | 'Y', 'a' | 'b'> = {
        X: new Set(['a', 'b']),
        Y: new Set(['a', 'b'])
      }
      const kit = mkRecordGlueKit(cover)
      const goodSecs = { X: { a: 1, b: 2 }, Y: { a: 1, b: 2 } }
      const badSecs = { X: { a: 1, b: 2 }, Y: { a: 1, b: 999 } }

      expect(checkDescent(kit, goodSecs)._tag).toBe('VOk')
      expect(checkDescent(kit, badSecs)._tag).toBe('VErr')
    })
  })
})