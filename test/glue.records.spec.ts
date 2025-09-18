import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { 
  glueRecordCover, checkDescentByEq, resRecord,
  RecordCover, Sections, GlueError,
  isVOk, isVErr, VOk, VErr
} from '../allTS'

describe('glueRecordCover', () => {
  it('glues compatible sections; rejects conflicts', () => {
    const cover = { U: new Set(['a','b']), V: new Set(['b','c']) } as const
    const good = { U: { a: 1, b: 2 }, V: { b: 2, c: 3 } } as const
    const bad  = { U: { a: 1, b: 2 }, V: { b: 9, c: 3 } } as const

    expect(checkDescentByEq(cover, good)._tag).toBe('VOk')
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

    const result = checkDescentByEq(cover, incomplete)
    
    expect(isVErr(result)).toBe(true)
    if (isVErr(result)) {
      expect(result.errors[0]!._tag).toBe('Incomplete')
      expect((result.errors[0] as any).i).toBe('U')
      expect((result.errors[0] as any).missing).toContain('b')
    }
  })

  it('detects conflicts on overlaps', () => {
    const cover = { U: new Set(['a', 'b']), V: new Set(['b', 'c']) } as const
    const conflicted = { U: { a: 1, b: 100 }, V: { b: 200, c: 3 } } as const

    const result = checkDescentByEq(cover, conflicted)
    
    expect(isVErr(result)).toBe(true)
    if (isVErr(result)) {
      const conflict = result.errors[0] as any
      expect(conflict._tag).toBe('Conflict')
      expect(conflict.key).toBe('b')
      expect(conflict.left).toBe(100)
      expect(conflict.right).toBe(200)
    }
  })

  it('restriction maps work correctly', () => {
    const cover = { U: new Set(['a', 'b', 'c']), V: new Set(['b', 'c', 'd']) } as const
    const section = { a: 1, b: 2, c: 3 } as const

    const res = resRecord(cover)
    const restricted = res('U', 'V')(section)

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
      expect(conflict.key).toBe('port')
      expect(conflict.left).toBe('8080')
      expect(conflict.right).toBe('3000')
    }
  })
})