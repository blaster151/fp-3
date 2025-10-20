import { describe, it, expect } from 'vitest'

import {
  buildADTConstructors,
  buildADTFold,
  buildADTMap,
  buildADTSequence,
  buildADTTraverse,
  buildADTUnfold,
  analyzeADTPolynomialContainerComposition,
  analyzeADTPolynomialContainerIdentity,
  analyzeADTTraversal,
  defineADT,
  primitiveStrictEqualsWitness,
  parameterField,
  getADTIndex,
  getADTIndexWitness,
  witnessFromEquals,
  type ADTPolynomialValue,
  type ADTPolynomialContainerCompositionScenario,
  type ADTIndexScenario,
  type ADTField,
  type ADTParameterField,
  type ADTSequenceValue,
  type ADTTraverseHandlers,
  type ADTTraversalScenario,
  type ADTUnfoldCoalgebra,
} from '../src/algebra/adt/adt'
import type { SimpleApplicativeK1 } from '../catTransforms'
import { AlgebraOracles } from '../algebra-oracles'
import { idNatK1 } from '../endo-2category'

describe('Algebraic Data Type builder', () => {
  const numberField = <Name extends string>(name: Name): ADTField<Name, number> => ({
    name,
    witness: primitiveStrictEqualsWitness<number>(),
  })

  const stringField = <Name extends string>(name: Name): ADTField<Name, string> => ({
    name,
    witness: primitiveStrictEqualsWitness<string>(),
  })

  const ArrayApplicative: SimpleApplicativeK1<'Array'> = {
    of: <A>(value: A) => [value],
    map: <A, B>(f: (value: A) => B) => (input: ReadonlyArray<A>) => input.map(f),
    ap: <A, B>(fns: ReadonlyArray<(value: A) => B>) => (values: ReadonlyArray<A>) =>
      fns.flatMap((fn) => values.map(fn)),
  }

  const IdentityApplicative: SimpleApplicativeK1<'IdK1'> = {
    of: <A>(value: A) => value,
    map: <A, B>(f: (value: A) => B) => (value: A) => f(value),
    ap: <A, B>(fn: (value: A) => B) => (value: A) => fn(value),
  }

  const defineAnyADT: any = defineADT

  it('synthesises constructors directly from descriptors', () => {
    const constructors = buildADTConstructors([
      { name: 'None', fields: [] },
      { name: 'Some', fields: [numberField('value')] },
    ] as const)

    expect(constructors.None()).toEqual({ _tag: 'None' })
    expect(constructors.Some({ value: 7 })).toEqual({ _tag: 'Some', value: 7 })
  })

  it('rejects malformed constructor descriptors', () => {
    expect(() => buildADTConstructors([] as const)).toThrow(/must not be empty/)

    const dupConstructors = [
      { name: 'Ping', fields: [] },
      { name: 'Ping', fields: [] },
    ] as const
    expect(() => buildADTConstructors(dupConstructors)).toThrow(/Duplicate constructor name/)

    expect(() =>
      buildADTConstructors([
        {
          name: 'Broken',
          fields: [
            {
              name: 'payload',
              witness: { equals: undefined },
            },
          ],
        },
      ] as unknown as Parameters<typeof buildADTConstructors>[0]),
    ).toThrow(
      /missing an equality witness/,
    )
    expect(() =>
      buildADTConstructors([
        {
          name: 'IndexedBroken',
          fields: [],
          indexes: [
            {
              name: 'Length',
              witness: { equals: undefined },
              compute: () => 0,
            },
          ],
        },
      ] as unknown as Parameters<typeof buildADTConstructors>[0]),
    ).toThrow(/equals function/)
    expect(() =>
      buildADTConstructors([
        {
          name: 'IndexedBroken',
          fields: [],
          indexes: [
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: undefined as unknown as () => number,
            },
          ],
        },
      ] as unknown as Parameters<typeof buildADTConstructors>[0]),
    ).toThrow(/compute function/)
    expect(() =>
      buildADTConstructors([
        {
          name: 'IndexedDuplicate',
          fields: [],
          indexes: [
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: () => 0,
            },
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: () => 0,
            },
          ],
        },
      ] as unknown as Parameters<typeof buildADTConstructors>[0]),
    ).toThrow(/duplicate index/i)
  })

  it('builds constructors for nullary and unary cases', () => {
    const maybeNumber = defineAnyADT({
      typeName: 'MaybeNumber',
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const,
    })

    const { None, Some } = maybeNumber.constructors

    expect(None()).toEqual({ _tag: 'None' })
    expect(Some({ value: 42 })).toEqual({ _tag: 'Some', value: 42 })
  })

  it('provides total pattern matching across constructors', () => {
    const maybeString = defineAnyADT({
      typeName: 'MaybeString',
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [stringField('value')] },
      ] as const,
    })

    const { None, Some } = maybeString.constructors
    const match = maybeString.match({
      None: () => 'empty',
      Some: (variant: any) => `value:${variant.value}`,
    })

    expect(match(None())).toBe('empty')
    expect(match(Some({ value: 'hi' }))).toBe('value:hi')
  })

  it('derives equality from field witnesses', () => {
    const pair = defineAnyADT({
      typeName: 'Pair',
      constructors: [
        {
          name: 'Pair',
          fields: [numberField('left'), numberField('right')],
        },
      ] as const,
    })

    const { Pair } = pair.constructors

    const a = Pair({ left: 1, right: 2 })
    const b = Pair({ left: 1, right: 2 })
    const c = Pair({ left: 2, right: 2 })

    expect(pair.equals(a, b)).toBe(true)
    expect(pair.equals(a, c)).toBe(false)
  })

  it('supports custom equality witnesses', () => {
    const point = defineAnyADT({
      typeName: 'Point',
      constructors: [
        {
          name: 'Point',
          fields: [
            {
              name: 'coords',
              witness: witnessFromEquals<readonly [number, number]>((l, r) => l[0] === r[0] && l[1] === r[1]),
            },
          ],
        },
      ] as const,
    })

    const { Point } = point.constructors

    const left = Point({ coords: [1, 2] as const })
    const right = Point({ coords: [1, 2] as const })
    const diff = Point({ coords: [1, 3] as const })

    expect(point.equals(left, right)).toBe(true)
    expect(point.equals(left, diff)).toBe(false)
  })

  it('introspects concrete ADT schema metadata', () => {
    const maybeNumber = defineAnyADT({
      typeName: 'IntrospectMaybe',
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const,
    })

    const snapshot = maybeNumber.introspect()

    expect(snapshot.typeName).toBe('IntrospectMaybe')
    expect(snapshot.parameters).toEqual([])
    expect(snapshot.indexes.None).toEqual([])
    const some = snapshot.constructors.find((ctor: any) => ctor.name === 'Some')
    expect(some?.fields).toHaveLength(1)
    const valueField = some?.fields[0]
    expect(valueField?.name).toBe('value')
    expect(valueField?.witness.equals(4, 4)).toBe(true)
    expect(valueField?.witness.equals(4, 3)).toBe(false)
  })

  it('derives polynomial signatures and projections for non-recursive ADTs', () => {
    const maybeNumber = defineAnyADT({
      typeName: 'MaybeNumber',
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const,
    })

    const identity = <T>(value: T) => value
    const { None, Some } = maybeNumber.constructors
    const polynomial = maybeNumber.polynomial

    expect(polynomial.signature.typeName).toBe('MaybeNumber')
    expect(polynomial.signature.constructors.map((ctor: any) => ctor.name)).toEqual(['None', 'Some'])
    expect(polynomial.signature.constructors[0]?.positions).toEqual([])

    const somePosition = polynomial.signature.constructors[1]?.positions[0]
    expect(somePosition?.name).toBe('value')
    expect(somePosition?.recursion).toBe('foreign')
    expect(somePosition?.witness.equals(3, 3)).toBe(true)

    const empty = None()
    const projectedEmpty = polynomial.project(empty)
    expect(projectedEmpty.tag).toBe('None')
    expect(projectedEmpty.fields).toEqual({})
    expect(polynomial.embed(projectedEmpty, identity)).toEqual(empty)

    const sample = Some({ value: 12 })
    const projectedSome = polynomial.project(sample)
    expect(projectedSome.tag).toBe('Some')
    expect(projectedSome.fields.value).toBe(12)
    expect(polynomial.embed(projectedSome, identity)).toEqual(sample)

    const remapped = polynomial.mapPositions(projectedSome, (value: any) => value)
    expect(remapped).not.toBe(projectedSome)
    expect(remapped.fields.value).toBe(12)
  })

  it('supports parameterised constructors with specialised witnesses', () => {
    const Maybe = defineAnyADT({
      typeName: 'Maybe',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [parameterField('value', 'A')] },
      ] as const,
    })

    const maybeNumber = Maybe.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })
    const maybeString = Maybe.instantiate({
      A: primitiveStrictEqualsWitness<string>(),
    })

    const { None: NoneNumber, Some: SomeNumber } = maybeNumber.constructors
    const { Some: SomeString } = maybeString.constructors

    expect(NoneNumber()).toEqual({ _tag: 'None' })
    expect(SomeNumber({ value: 7 })).toEqual({ _tag: 'Some', value: 7 })
    expect(maybeNumber.equals(SomeNumber({ value: 5 }), SomeNumber({ value: 5 }))).toBe(true)
    expect(maybeNumber.equals(SomeNumber({ value: 5 }), SomeNumber({ value: 6 }))).toBe(false)

    const rendered = maybeString.match({
      None: () => 'empty',
      Some: ({ value }: any) => value.toUpperCase(),
    })

    expect(rendered(SomeString({ value: 'ok' }))).toBe('OK')
  })

  it('rejects parameter fields when parameters are absent', () => {
    expect(() =>
      defineAnyADT({
        typeName: 'Broken',
        constructors: [
          {
            name: 'Only',
            fields: [parameterField('value', 'Missing')],
          },
        ] as const,
      } as any),
    ).toThrow(/no parameters were declared/)
  })

  it('rejects schemas referencing undeclared parameters', () => {
    expect(() =>
      defineAnyADT({
        typeName: 'Broken',
        parameters: [{ name: 'A' }] as const,
        constructors: [
          {
            name: 'Only',
            fields: [parameterField('value', 'B')],
          },
        ] as const,
      }),
    ).toThrow(/unknown parameter B/)
  })

  it('requires parameter witnesses to match declared parameters', () => {
    const Wrapper = defineAnyADT({
      typeName: 'Wrapper',
      parameters: [{ name: 'Item' }] as const,
      constructors: [
        {
          name: 'Wrap',
          fields: [parameterField('value', 'Item')],
        },
      ] as const,
    })

    expect(() => Wrapper.instantiate({} as any)).toThrow(/missing an equality witness/i)
    expect(() =>
      Wrapper.instantiate({
        Item: primitiveStrictEqualsWitness<number>(),
        Extra: primitiveStrictEqualsWitness<number>(),
      } as any),
    ).toThrow(/unknown parameter/i)
    expect(() =>
      Wrapper.instantiate({
        Item: { equals: undefined },
      } as any),
    ).toThrow(/must provide an equals function/)
  })

  it('derives recursion helpers for parameterised ADTs', () => {
    const List = defineAnyADT({
      typeName: 'List',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numberList = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numberList.constructors
    const length = numberList.fold({
      Nil: () => 0,
      Cons: ({ tail }: any) => tail + 1,
    })

    const singleton = Cons({ head: 3, tail: Nil() })
    const nested = Cons({ head: 1, tail: Cons({ head: 2, tail: Nil() }) })

    expect(length(Nil())).toBe(0)
    expect(length(singleton)).toBe(1)
    expect(length(nested)).toBe(2)
  })

  it('projects recursive payloads via polynomial functors', () => {
    const List = defineAnyADT({
      typeName: 'PolyList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const polynomial = numbers.polynomial

    expect(polynomial.recursion?.fold).toBe(numbers.fold)
    expect(polynomial.recursion?.unfold).toBe(numbers.unfold)
    expect(polynomial.recursion?.map).toBe(numbers.map)

    const sample = Cons({ head: 1, tail: Cons({ head: 2, tail: Nil() }) })
    const projected = polynomial.project(sample)
    expect(projected.tag).toBe('Cons')
    expect(numbers.equals(projected.fields.tail, Cons({ head: 2, tail: Nil() }))).toBe(true)

    const consSignature = polynomial.signature.constructors.find((ctor: any) => ctor.name === 'Cons')
    const tailPosition = consSignature?.positions.find((position: any) => position.name === 'tail')
    expect(tailPosition?.recursion).toBe('self')

    const toArray = numbers.fold({
      Nil: () => [] as number[],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })
    const arrayVariant = polynomial.mapPositions(projected, (tail: any) => toArray(tail))
    expect(arrayVariant.fields.tail).toEqual([2])

    const arrayCoalgebra: ADTUnfoldCoalgebra<typeof numbers.constructorsList, readonly number[]> = (
      values,
    ) =>
      values.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Cons',
            fields: { head: values[0] as number, tail: values.slice(1) },
          } as const)

    const fromArray = numbers.unfold(arrayCoalgebra)
    const rebuilt = polynomial.embed(arrayVariant, fromArray)

    expect(numbers.equals(rebuilt, sample)).toBe(true)
  })

  it('provides polynomial roundtrip and map oracles', () => {
    const List = defineAnyADT({
      typeName: 'PolyOracleList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const polynomial = numbers.polynomial
    const toArray = numbers.fold({
      Nil: () => [] as number[],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    const seeds = [0, 1, 2, 3]
    const valueFromSeed = (seed: number) => {
      switch (seed % 3) {
        case 0:
          return Nil()
        case 1:
          return Cons({ head: seed, tail: Nil() })
        default:
          return Cons({ head: seed, tail: Cons({ head: seed + 1, tail: Nil() }) })
      }
    }

    const roundtripReport = polynomial.oracles.analyzeRoundtrip({
      seeds,
      valueFromSeed,
    })

    expect(roundtripReport.holds).toBe(true)
    expect(roundtripReport.counterexamples).toHaveLength(0)
    expect(roundtripReport.failures).toHaveLength(0)

    const mapReport = polynomial.oracles.analyzeMapPositions({
      seeds,
      valueFromSeed,
      scenarios: [
        {
          id: 'tailLength',
          resultWitness: primitiveStrictEqualsWitness<number>(),
          derive: ({ variant }: any) => ({
            map: (tail: ReturnType<typeof valueFromSeed>) => toArray(tail).length,
            expected:
              variant.tag === 'Nil'
                ? { tag: 'Nil', fields: {} }
                : {
                    tag: 'Cons',
                    fields: Object.freeze({
                      head: variant.fields.head,
                      tail: toArray(variant.fields.tail).length,
                    }),
                  },
          }),
        },
      ],
    })

    expect(mapReport.holds).toBe(true)
    expect(mapReport.counterexamples).toHaveLength(0)
    expect(mapReport.failures).toHaveLength(0)

    const failureReport = polynomial.oracles.analyzeMapPositions({
      seeds: [1],
      valueFromSeed: () => Cons({ head: 1, tail: Nil() }),
      scenarios: [
        {
          id: 'broken-tag',
          resultWitness: primitiveStrictEqualsWitness<number>(),
          derive: () => ({
            map: () => 42,
            expected: { tag: 'Nil', fields: {} },
          }),
        },
      ],
    })

    expect(failureReport.holds).toBe(false)
    expect(failureReport.counterexamples.some((entry: any) => entry.field === 'tag')).toBe(true)
  })

  it('aligns polynomial recursion oracles with map handlers', () => {
    const List = defineAnyADT({
      typeName: 'PolyRecursionList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const polynomial = numbers.polynomial

    const seeds = [0, 1, 2]
    const valueFromSeed = (seed: number) =>
      seed % 2 === 0
        ? Nil()
        : Cons({ head: seed, tail: Cons({ head: seed + 1, tail: Nil() }) })

    const recursionReport = polynomial.oracles.analyzeRecursion?.({
      seeds,
      valueFromSeed,
      scenarios: [
        {
          id: 'double-heads',
          handlers: {
            Nil: () => Nil(),
            Cons: ({ head, tail }: any, { constructors }: any) =>
              constructors.Cons({ head: head * 2, tail }),
          },
        },
      ],
    })

    expect(recursionReport).toBeDefined()
    expect(recursionReport?.holds).toBe(true)
    expect(recursionReport?.counterexamples).toHaveLength(0)
    expect(recursionReport?.failures).toHaveLength(0)
  })

  it('bridges polynomial data through container adapters', () => {
    const List = defineAnyADT({
      typeName: 'PolyContainerList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const sample = Cons({ head: 1, tail: Cons({ head: 2, tail: Nil() }) })
    const polynomial = numbers.polynomial
    const container = polynomial.container
    const toArray = numbers.fold({
      Nil: () => [] as number[],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    expect(container.recursion?.fold).toBe(numbers.fold)

    const projectedViaNat = container.project.app(sample)
    expect(projectedViaNat).toEqual(polynomial.project(sample))

    const rebuildTail = numbers.fold({
      Nil: () => Nil(),
      Cons: ({ head, tail }: any) => Cons({ head, tail }),
    })

    const mappedViaContainer = container.endofunctor.map(rebuildTail)(
      projectedViaNat as ADTPolynomialValue<typeof numbers.constructorsList, ReturnType<typeof rebuildTail>>,
    )

    const mappedViaPositions = polynomial.mapPositions(projectedViaNat, rebuildTail)

    expect(mappedViaContainer).toEqual(mappedViaPositions)

    const rebuilt = container.embed((value: any) => value).app(mappedViaContainer)
    expect(numbers.equals(rebuilt, polynomial.embed(projectedViaNat, (value: any) => value))).toBe(true)

    const lengths = container.endofunctor.map((tail: ReturnType<typeof rebuildTail>) =>
      toArray(tail).length,
    )(
      projectedViaNat as ADTPolynomialValue<typeof numbers.constructorsList, ReturnType<typeof rebuildTail>>,
    ) as ADTPolynomialValue<typeof numbers.constructorsList, number>

    expect((lengths as any).fields.tail).toEqual(1)
  })

  it('exposes polynomial container naturality helpers', () => {
    const List = defineAnyADT({
      typeName: 'PolyNaturalityList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Cons, Nil } = numbers.constructors
    const container = numbers.polynomial.container
    const sample = Cons({ head: 1, tail: Nil() })
    const projected = container.project.app(sample)

    expect(container.naturality.id.app(projected)).toEqual(projected)

    const leftWhiskered = container.naturality.whiskerLeft(idNatK1<'IdK1'>())
    expect(leftWhiskered.app(projected as any)).toEqual(projected)

    const rightWhiskered = container.naturality
      .whiskerRight(container.naturality.id)()
    expect(rightWhiskered.app(projected as any)).toEqual(projected)

    const horizontal = container.naturality.hcomp(
      container.naturality.id,
      idNatK1<'IdK1'>(),
    )
    expect(horizontal.app(projected as any)).toEqual(projected)
  })

  it('analyzes polynomial container functor laws', () => {
    const List = defineAnyADT({
      typeName: 'PolyContainerLaws',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const seeds = [0, 1, 2]
    const valueFromSeed = (seed: number) =>
      seed % 2 === 0
        ? Nil()
        : Cons({ head: seed, tail: Cons({ head: seed + 1, tail: Nil() }) })

    const identityReport = numbers.polynomial.container.oracles.analyzeFunctorIdentity({
      seeds,
      valueFromSeed,
    })

    expect(identityReport.holds).toBe(true)
    expect(identityReport.counterexamples).toEqual([])
    expect(identityReport.failures).toEqual([])

    const exportedIdentity = analyzeADTPolynomialContainerIdentity(numbers, {
      seeds,
      valueFromSeed,
    })
    expect(exportedIdentity).toEqual(identityReport)

    const registryIdentity = AlgebraOracles.adt.analyzePolynomialContainerIdentity(
      numbers,
      { seeds, valueFromSeed },
    )
    expect(registryIdentity).toEqual(identityReport)

    const identityFailure = numbers.polynomial.container.oracles.analyzeFunctorIdentity({
      seeds: [99],
      valueFromSeed: () => {
        throw new Error('boom')
      },
    })

    expect(identityFailure.holds).toBe(false)
    expect(identityFailure.failures).toHaveLength(1)

    const listLength = numbers.fold({
      Nil: () => 0,
      Cons: ({ tail }: any) => tail + 1,
    })

    const compositionScenarios: ReadonlyArray<
      ADTPolynomialContainerCompositionScenario<
        typeof numbers.constructorsList,
        number,
        number,
        number
      >
    > = [
      {
        id: 'length-plus-one',
        resultWitness: primitiveStrictEqualsWitness<number>(),
        derive: () => ({
          first: (value: any) => listLength(value),
          second: (length) => length + 1,
        }),
      },
    ]

    const compositionReport = numbers.polynomial.container.oracles.analyzeFunctorComposition({
      seeds,
      valueFromSeed,
      scenarios: compositionScenarios,
    })

    expect(compositionReport.holds).toBe(true)
    expect(compositionReport.counterexamples).toEqual([])
    expect(compositionReport.failures).toEqual([])

    const exportedComposition = analyzeADTPolynomialContainerComposition(numbers, {
      seeds,
      valueFromSeed,
      scenarios: compositionScenarios,
    })
    expect(exportedComposition).toEqual(compositionReport)

    const registryComposition =
      AlgebraOracles.adt.analyzePolynomialContainerComposition(numbers, {
        seeds,
        valueFromSeed,
        scenarios: compositionScenarios,
      })
    expect(registryComposition).toEqual(compositionReport)

    const failingComposition = numbers.polynomial.container.oracles.analyzeFunctorComposition({
      seeds: [0],
      valueFromSeed,
      scenarios: [
        {
          id: 'explode',
          resultWitness: primitiveStrictEqualsWitness<number>(),
          derive: () => {
            throw new Error('explode')
          },
        } as ADTPolynomialContainerCompositionScenario<
          typeof numbers.constructorsList,
          number,
          number,
          number
        >,
      ],
    })

    expect(failingComposition.holds).toBe(false)
    expect(
      failingComposition.failures.some((entry: any) => entry.scenario === 'explode'),
    ).toBe(true)
  })

  it('replays recursion through the polynomial relative bridge', () => {
    const List = defineAnyADT({
      typeName: 'PolyRelativeList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const algebra: Parameters<typeof numbers.fold>[0] = {
      Nil: () => 0,
      Cons: ({ head, tail }: { readonly head: number; readonly tail: number }) =>
        head + tail,
    }

    const values = [
      Nil(),
      Cons({ head: 1, tail: Nil() }),
      Cons({ head: 2, tail: Cons({ head: 3, tail: Nil() }) }),
    ]

    const seeds: ReadonlyArray<ReadonlyArray<number>> = [
      [],
      [0],
      [1, 2, 3],
    ]

    const coalgebra: ADTUnfoldCoalgebra<
      typeof numbers.constructorsList,
      readonly number[]
    > = (input) =>
      input.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Cons',
            fields: { head: input[0] as number, tail: input.slice(1) },
          } as const)

    const report = AlgebraOracles.relative.analyzePolynomialContainerBridge({
      adt: numbers,
      values,
      fold: {
        algebra,
        witness: primitiveStrictEqualsWitness<number>(),
      },
      unfold: {
        seeds,
        coalgebra,
      },
    } as any)

    expect(report.holds).toBe(true)
    expect(report.valueIssues).toEqual([])
    expect(report.foldIssues).toEqual([])
    expect(report.unfoldIssues).toEqual([])
  })

  it('flags polynomial relative bridge failures', () => {
    const List = defineAnyADT({
      typeName: 'PolyRelativeBrokenList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const algebra: Parameters<typeof numbers.fold>[0] = {
      Nil: () => 0,
      Cons: ({ tail }: { readonly tail: number }) => tail + 1,
    }

    const malformed = Cons({ head: 5, tail: Nil() })
    ;(malformed as { _tag: string })._tag = 'Bogus'

    const brokenCoalgebra: ADTUnfoldCoalgebra<
      typeof numbers.constructorsList,
      readonly number[]
    > = (input) =>
      input.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Bogus',
            fields: { head: input[0] as number, tail: input.slice(1) },
          } as const)

    const report = AlgebraOracles.relative.analyzePolynomialContainerBridge({
      adt: numbers,
      values: [malformed],
      fold: {
        algebra,
        witness: primitiveStrictEqualsWitness<number>(),
        values: [malformed],
      },
      unfold: {
        seeds: [[1]],
        coalgebra: brokenCoalgebra,
      },
    } as any)

    expect(report.holds).toBe(false)
    expect(report.valueIssues.length).toBeGreaterThan(0)
    expect(report.foldIssues.length).toBeGreaterThan(0)
    expect(report.unfoldIssues.length).toBeGreaterThan(0)
  })

  it('evaluates polynomial Street harness scenarios', () => {
    const List = defineAnyADT({
      typeName: 'PolyStreetList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors

    const values = [
      Nil(),
      Cons({ head: 1, tail: Nil() }),
      Cons({ head: 2, tail: Cons({ head: 3, tail: Nil() }) }),
    ]

    const identityAlgebra: any = {
      Nil: () => Nil(),
      Cons: ({ head, tail }: { readonly head: number; readonly tail: ReturnType<typeof Cons> }) =>
        Cons({ head, tail }),
    }

    const incrementAlgebra: any = {
      Nil: () => Nil(),
      Cons: ({ head, tail }: { readonly head: number; readonly tail: ReturnType<typeof Cons> }) =>
        Cons({ head: head + 1, tail }),
    }

    const addTenAlgebra: any = {
      Nil: () => Nil(),
      Cons: ({ head, tail }: { readonly head: number; readonly tail: ReturnType<typeof Cons> }) =>
        Cons({ head: head + 10, tail }),
    }

    const report = AlgebraOracles.relative.analyzePolynomialStreetHarness({
      adt: numbers,
      extensions: [
        {
          id: 'identity',
          algebra: identityAlgebra,
          witness: witnessFromEquals(numbers.equals),
          samples: values,
          expected: (value: any) => value,
        },
      ],
      kleisli: [
        {
          id: 'sequential-binds',
          first: addTenAlgebra,
          second: incrementAlgebra,
          witness: witnessFromEquals(numbers.equals),
          samples: values,
          expected: ({
            value,
            extendFirst,
            extendSecond,
          }: {
            readonly value: any
            readonly extendFirst: (value: any) => any
            readonly extendSecond: (value: any) => any
          }) => extendFirst(extendSecond(value)),
        },
      ],
    } as any)

    expect(report.holds).toBe(true)
    expect(report.extensionIssues).toEqual([])
    expect(report.kleisliIssues).toEqual([])
  })

  it('flags polynomial Street harness failures', () => {
    const List = defineAnyADT({
      typeName: 'PolyStreetBrokenList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors

    const values = [
      Nil(),
      Cons({ head: 1, tail: Nil() }),
      Cons({ head: 2, tail: Cons({ head: 3, tail: Nil() }) }),
    ]

    const identityAlgebra: any = {
      Nil: () => Nil(),
      Cons: ({ head, tail }: { readonly head: number; readonly tail: ReturnType<typeof Cons> }) =>
        Cons({ head, tail }),
    }

    const incrementAlgebra: any = {
      Nil: () => Nil(),
      Cons: ({ head, tail }: { readonly head: number; readonly tail: ReturnType<typeof Cons> }) =>
        Cons({ head: head + 1, tail }),
    }

    const addTenAlgebra: any = {
      Nil: () => Nil(),
      Cons: ({ head, tail }: { readonly head: number; readonly tail: ReturnType<typeof Cons> }) =>
        Cons({ head: head + 10, tail }),
    }

    const report = AlgebraOracles.relative.analyzePolynomialStreetHarness({
      adt: numbers,
      extensions: [
        {
          id: 'broken-identity',
          algebra: identityAlgebra,
          witness: witnessFromEquals(numbers.equals),
          samples: values,
          expected: () => Nil(),
        },
      ],
      kleisli: [
        {
          id: 'broken-binds',
          first: addTenAlgebra,
          second: incrementAlgebra,
          witness: witnessFromEquals(numbers.equals),
          samples: values,
          expected: () => Nil(),
        },
      ],
    } as any)

    expect(report.holds).toBe(false)
    expect(report.extensionIssues.length).toBeGreaterThan(0)
    expect(report.kleisliIssues.length).toBeGreaterThan(0)
  })

  it('introspects parameterised schemas and specialisations', () => {
    const List = defineAnyADT({
      typeName: 'IntrospectList',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const family = List.introspect()
    expect(family.parameters).toEqual([{ name: 'A' }])
    const consFamily = family.constructors.find((ctor: any) => ctor.name === 'Cons')
    expect(consFamily?.fields.some((field: any) => 'parameter' in field && field.parameter === 'A')).toBe(
      true,
    )

    const numbers = List.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const instance = numbers.introspect()
    expect(instance.parameters).toEqual([])
    const consConcrete = instance.constructors.find((ctor: any) => ctor.name === 'Cons')
    const headField = consConcrete?.fields.find((field: any) => field.name === 'head')
    expect(headField && 'parameter' in headField).toBe(false)
    expect(headField?.witness.equals(8, 8)).toBe(true)
  })

  it('tracks constructor indexes for recursive parameterised ADTs', () => {
    const Vec = defineAnyADT({
      typeName: 'Vec',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        {
          name: 'Nil',
          fields: [],
          indexes: [
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: () => 0,
            },
          ],
        },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
          indexes: [
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: (fields: any) => Number(getADTIndex((fields as any).tail, 'Length')) + 1,
            },
          ],
        },
      ] as const,
    })

    const numbers = Vec.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const empty = Nil()
    const singleton = Cons({ head: 5, tail: empty })
    const pair = Cons({ head: 7, tail: singleton })

    expect(getADTIndex(empty, 'Length')).toBe(0)
    expect(getADTIndex(singleton, 'Length')).toBe(1)
    expect(getADTIndex(pair, 'Length')).toBe(2)

    const lengthWitness = getADTIndexWitness(pair, 'Length')
    expect(lengthWitness.equals(getADTIndex(pair, 'Length'), 2)).toBe(true)

    const incrementAll = numbers.map({
      Nil: () => Nil(),
      Cons: ({ head, tail }: any, { constructors }: any) =>
        constructors.Cons({ head: head + 1, tail }),
    })

    const mappedPair = incrementAll(pair)
    expect(getADTIndex(mappedPair, 'Length')).toBe(2)

    expect(() => getADTIndex(empty, 'Depth')).toThrow(/does not define index/i)

    expect(Vec.indexDescriptors.Nil.map((index: any) => index.name)).toEqual(['Length'])
    expect(numbers.indexDescriptors.Cons.map((index: any) => index.name)).toEqual(['Length'])

    const seeds = [[], [1], [1, 2]] as const
    const fromArray = (values: readonly number[]) =>
      values.reduceRight((tail, head) => Cons({ head, tail }), Nil())

    const coalgebra: ADTUnfoldCoalgebra<typeof numbers.constructorsList, readonly number[]> = (
      values,
    ) =>
      values.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Cons',
            fields: { head: values[0], tail: values.slice(1) as readonly number[] },
          } as const)

    type NumbersConstructors = typeof numbers.constructorsList
    const scenarios: ReadonlyArray<ADTIndexScenario<NumbersConstructors, readonly number[]>> = [
      {
        id: 'unfold',
        derive: ({ seed, context }: any) => context.unfold(coalgebra)(seed),
      },
      {
        id: 'map',
        derive: ({ baseValue }: any) => incrementAll(baseValue),
      },
      {
        id: 'traverse',
        derive: ({ baseValue, context }: any) =>
          context.traverse(IdentityApplicative)({
            Nil: () => IdentityApplicative.of(context.constructors.Nil()),
            Cons: ({ head, tail }: any, { constructors }: any) =>
              IdentityApplicative.of(constructors.Cons({ head: head + 1, tail })),
          })(baseValue),
      },
    ]

    const indexReport = numbers.oracles.analyzeIndexes({
      seeds,
      valueFromSeed: fromArray,
      scenarios,
    })

    expect(indexReport.holds).toBe(true)
    expect(indexReport.counterexamples).toEqual([])
    expect(indexReport.failures).toEqual([])
  })

  it('disallows recursive annotations on parameter fields', () => {
    const recursionField = {
      name: 'value',
      parameter: 'A',
      recursion: 'self',
    } as unknown as ADTParameterField<'value', 'A'>

    const Recursive = defineAnyADT({
      typeName: 'RecursiveParam',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        {
          name: 'Wrap',
          fields: [recursionField],
        },
      ] as const,
    })

      expect(() =>
        Recursive.instantiate({
          A: primitiveStrictEqualsWitness<number>(),
        }),
    ).toThrow(/cannot declare recursion/)
  })

  it('throws when pattern matching is missing a handler', () => {
    const maybeBoolean = defineAnyADT({
      typeName: 'MaybeBoolean',
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [
          {
            name: 'value',
            witness: witnessFromEquals<boolean>((x, y) => x === y),
          },
        ] },
      ] as const,
    })

    const { Some } = maybeBoolean.constructors

    const matcher = maybeBoolean.match({
      None: () => 'empty',
      // Intentionally omit handler for Some by smuggling an undefined handler
      Some: undefined as never,
    } as any)

    expect(() => matcher(Some({ value: true }))).toThrow(/Missing handler/)
  })

  it('includes constructor indexes when testing equality', () => {
    let counter = 0
    const Timed = defineAnyADT({
      typeName: 'Timed',
      constructors: [
        {
          name: 'Tick',
          fields: [],
          indexes: [
            {
              name: 'Order',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: () => counter++,
            },
          ],
        },
      ] as const,
    })

    const { Tick } = Timed.constructors
    const first = Tick()
    const second = Tick()

    expect(getADTIndex(first, 'Order')).toBe(0)
    expect(getADTIndex(second, 'Order')).toBe(1)
    expect(Timed.equals(first, second)).toBe(false)
  })

  it('reports index-oracle failures for tampered metadata', () => {
    const Vec = defineAnyADT({
      typeName: 'Vec',
      parameters: [{ name: 'A' }] as const,
      constructors: [
        {
          name: 'Nil',
          fields: [],
          indexes: [
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: () => 0,
            },
          ],
        },
        {
          name: 'Cons',
          fields: [
            parameterField('head', 'A'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
          indexes: [
            {
              name: 'Length',
              witness: primitiveStrictEqualsWitness<number>(),
              compute: (fields: any) => Number(getADTIndex((fields as any).tail, 'Length')) + 1,
            },
          ],
        },
      ] as const,
    })

    const numbers = Vec.instantiate({
      A: primitiveStrictEqualsWitness<number>(),
    })

    const { Nil, Cons } = numbers.constructors
    const seeds = [[1, 2]] as const
    const fromArray = (values: readonly number[]) =>
      values.reduceRight((tail, head) => Cons({ head, tail }), Nil())

    const tamperedWitness = numbers.indexDescriptors.Cons[0]!.witness
    const indexKey = Symbol.for('fp-3.algebra.adt.indexes')

    type NumbersConstructors = typeof numbers.constructorsList
    const scenarios: ReadonlyArray<ADTIndexScenario<NumbersConstructors, readonly number[]>> = [
      {
        id: 'tampered',
        derive: ({ baseValue, context }: any) => {
          const variant = context.constructors.Cons({ head: 99, tail: baseValue })
          const metadata = {
            Length: {
              value: Number(getADTIndex(variant as any, 'Length')) + 5,
              witness: tamperedWitness,
            },
          }
          const clone = { ...variant } as Record<string, unknown>
          Object.defineProperty(clone, indexKey, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: metadata,
          })
          return clone as ReturnType<typeof context.constructors.Cons>
        },
      },
    ]

    const report = numbers.oracles.analyzeIndexes({
      seeds,
      valueFromSeed: fromArray,
      scenarios,
    })

    expect(report.holds).toBe(false)
    expect(report.counterexamples.length).toBeGreaterThan(0)
    expect(report.counterexamples[0]?.scenario).toBe('tampered')
    expect(report.failures).toEqual([])
  })

  it('derives catamorphisms for recursive ADTs', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const { Nil, Cons } = list.constructors
    const fold = list.fold

    const length = fold({
      Nil: () => 0,
      Cons: ({ tail }: any) => tail + 1,
    })

    const toArray = fold({
      Nil: () => [],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    const singleton = Cons({ head: 5, tail: Nil() })
    const nested = Cons({ head: 1, tail: Cons({ head: 2, tail: Nil() }) })

    expect(length(Nil())).toBe(0)
    expect(length(singleton)).toBe(1)
    expect(length(nested)).toBe(2)
    expect(toArray(Nil())).toEqual([])
    expect(toArray(nested)).toEqual([1, 2])
  })

  it('guards catamorphisms with algebra handler validation', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
          {
            name: 'tail',
            witness: witnessFromEquals(() => true),
            recursion: 'self',
          },
          ],
        },
      ] as const,
    })

    expect(() =>
      list.fold({
        Nil: () => 0,
        Cons: undefined as never,
      } as any),
    ).toThrow(/Missing algebra handler/)
  })

  it('omits catamorphism helpers for non-recursive schemas', () => {
    const maybeNumber = defineAnyADT({
      typeName: 'MaybeNumber',
      constructors: [
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const,
    })

    expect('fold' in maybeNumber).toBe(false)
  })

  it('rejects catamorphism derivation when recursion metadata is absent', () => {
    expect(() =>
      buildADTFold([
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const),
    ).toThrow(/recursive field/)
  })

  it('derives anamorphisms for recursive ADTs', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
          {
            name: 'tail',
            witness: witnessFromEquals(() => true),
            recursion: 'self',
          },
          ],
        },
      ] as const,
    })

    const { Nil, Cons } = list.constructors
    const unfold = list.unfold
    const toArray = list.fold({
      Nil: () => [],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    const fromArray = unfold((values: readonly number[]) =>
      values.length === 0
        ? { _tag: 'Nil', fields: {} }
        : { _tag: 'Cons', fields: { head: values[0], tail: values.slice(1) } },
    )

    expect(toArray(fromArray([]))).toEqual([])
    expect(toArray(fromArray([1, 2, 3]))).toEqual([1, 2, 3])

    const singleton = fromArray([5])
    expect(singleton).toEqual(Cons({ head: 5, tail: Nil() }))
  })

  it('guards anamorphisms when coalgebra omits recursive seeds', () => {
    const listConstructors = [
      { name: 'Nil', fields: [] },
      {
        name: 'Cons',
        fields: [
          numberField('head'),
          {
            name: 'tail',
            witness: witnessFromEquals(() => true),
            recursion: 'self',
          },
        ],
      },
    ] as const

    const unfold = buildADTUnfold(listConstructors)

    expect(() =>
      unfold(() => ({ _tag: 'Cons', fields: { head: 1 } } as any))(undefined as never),
    ).toThrow(/missing field tail/)
  })

  it('rejects anamorphism derivation when recursion metadata is absent', () => {
    expect(() =>
      buildADTUnfold([
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const),
    ).toThrow(/recursive field/)
  })

  it('derives functorial maps for recursive ADTs', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
          {
            name: 'tail',
            witness: witnessFromEquals(() => true),
            recursion: 'self',
          },
          ],
        },
      ] as const,
    })

    const { Nil, Cons } = list.constructors
    const toArray = list.fold({
      Nil: () => [],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    const double = list.map({
      Nil: (_: any, { constructors: { Nil } }: any) => Nil(),
      Cons: ({ head, tail }: any, { constructors: { Cons } }: any) => Cons({ head: head * 2, tail }),
    })

    const value = Cons({ head: 2, tail: Cons({ head: 3, tail: Nil() }) })
    expect(toArray(double(value))).toEqual([4, 6])
  })

  it('derives applicative traversals for recursive ADTs', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const { Nil, Cons } = list.constructors
    const toArray = list.fold({
      Nil: () => [],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    const traverse = list.traverse(ArrayApplicative)
    const handlers: ADTTraverseHandlers<typeof list.constructorsList, 'Array'> = {
      Nil: (_: any, context: any) => context.applicative.of(context.constructors.Nil()),
      Cons: ({ head, tail }: any, context: any) => {
        const headOptions = [head, head + 1]
        const consCtor = context.constructors.Cons as any
        const liftedTail = context.applicative.map((tailValue: any) => (newHead: number) =>
          consCtor({ head: newHead, tail: tailValue }),
        )(tail as any)
        return context.applicative.ap(liftedTail)(headOptions)
      },
    }

    const value = Cons({ head: 1, tail: Cons({ head: 2, tail: Nil() }) })
    const result = traverse(handlers)(value)
    const serialised = result.map((variant: any) => toArray(variant))

    expect(serialised).toEqual([
      [1, 2],
      [2, 2],
    ])
  })

  it('guards applicative traversals when handlers are missing', () => {
    const listConstructors = [
      { name: 'Nil', fields: [] },
      {
        name: 'Cons',
        fields: [
          numberField('head'),
          {
            name: 'tail',
            witness: witnessFromEquals(() => true),
            recursion: 'self',
          },
        ],
      },
    ] as const

    const traverse = buildADTTraverse(listConstructors)

    expect(() =>
      traverse(ArrayApplicative)({
        Nil: () => ArrayApplicative.of({ _tag: 'Nil' } as never),
        Cons: undefined as never,
      } as any),
    ).toThrow(/Missing traverse handler/)
  })

  it('rejects applicative traversal derivation when recursion metadata is absent', () => {
    expect(() =>
      buildADTTraverse([
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const),
    ).toThrow(/applicative traverse/)
  })

  it('sequences applicative values for recursive ADTs', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const sequence = list.sequence(ArrayApplicative)
    const toArray = list.fold({
      Nil: () => [],
      Cons: ({ head, tail }: any) => [head, ...tail],
    })

    const effectfulNil: ADTSequenceValue<typeof list.constructorsList, 'Array'> = { _tag: 'Nil' }
    const effectfulValue: ADTSequenceValue<typeof list.constructorsList, 'Array'> = {
      _tag: 'Cons',
      head: [1, 2],
      tail: [[effectfulNil]],
    }

    const result = sequence(effectfulValue)
    expect(result.map((variant: any) => toArray(variant))).toEqual([[1], [2]])
  })

  it('rejects applicative sequence derivation when recursion metadata is absent', () => {
    expect(() =>
      buildADTSequence([
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const),
    ).toThrow(/applicative sequence/)
  })

  it('guards functorial maps when handlers are missing', () => {
    const listConstructors = [
      { name: 'Nil', fields: [] },
      {
        name: 'Cons',
        fields: [
          numberField('head'),
          {
            name: 'tail',
            witness: witnessFromEquals(() => true),
            recursion: 'self',
          },
        ],
      },
    ] as const

    const map = buildADTMap(listConstructors)

    expect(() =>
      map({
        Nil: () => ({ _tag: 'Nil' } as never),
        Cons: undefined as never,
      } as any),
    ).toThrow(/Missing map handler/)
  })

  it('rejects functorial map derivation when recursion metadata is absent', () => {
    expect(() =>
      buildADTMap([
        { name: 'None', fields: [] },
        { name: 'Some', fields: [numberField('value')] },
      ] as const),
    ).toThrow(/recursive self fields/)
  })

  it('exposes recursion oracles for coalgebra consistency and fold/unfold fusion', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const seeds = [[], [1], [1, 2, 3]] as const
    const coalgebra: ADTUnfoldCoalgebra<typeof list.constructorsList, readonly number[]> = (
      values,
    ) =>
      values.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Cons',
            fields: { head: values[0], tail: values.slice(1) as readonly number[] },
          } as const)

    const coalgebraReport = list.oracles.analyzeCoalgebra({ seeds, coalgebra })
    expect(coalgebraReport.holds).toBe(true)
    expect(coalgebraReport.counterexamples).toEqual([])
    expect(coalgebraReport.failures).toEqual([])

    const algebra = {
      Nil: () => 0,
      Cons: ({ head, tail }: { head: number; tail: number }) => head + tail,
    } as const

    const foldReport = list.oracles.analyzeFoldUnfold({
      seeds,
      coalgebra,
      algebra,
      resultWitness: primitiveStrictEqualsWitness<number>(),
    })

    expect(foldReport.holds).toBe(true)
    expect(foldReport.counterexamples).toEqual([])
    expect(foldReport.failures).toEqual([])
  })

  it('reports recursion-oracle failures and counterexamples', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const brokenCoalgebra = ((values: readonly number[]) =>
      values.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({ _tag: 'Cons', fields: { head: values[0] } } as const)) as unknown as ADTUnfoldCoalgebra<
      typeof list.constructorsList,
      readonly number[]
    >

    const failureReport = list.oracles.analyzeCoalgebra({
      seeds: [[1]] as const,
      coalgebra: brokenCoalgebra,
    })

    expect(failureReport.holds).toBe(false)
    expect(failureReport.failures.length).toBeGreaterThan(0)

    const standardCoalgebra: ADTUnfoldCoalgebra<typeof list.constructorsList, readonly number[]> = (
      values,
    ) =>
      values.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Cons',
            fields: { head: values[0], tail: values.slice(1) as readonly number[] },
          } as const)

    const counterexampleReport = list.oracles.analyzeFoldUnfold({
      seeds: [[1, 2]] as const,
      coalgebra: standardCoalgebra,
      algebra: {
        Nil: () => 0,
        Cons: ({ head, tail }: { head: number; tail: number }) => head + tail,
      },
      resultWitness: witnessFromEquals<number>(() => false),
    })

    expect(counterexampleReport.holds).toBe(false)
    expect(counterexampleReport.counterexamples.length).toBeGreaterThan(0)
    expect(counterexampleReport.failures).toEqual([])
  })

  it('exposes traversal oracles for applicative scenarios', () => {
    const list = defineAnyADT({
      typeName: 'List',
      constructors: [
        { name: 'Nil', fields: [] },
        {
          name: 'Cons',
          fields: [
            numberField('head'),
            {
              name: 'tail',
              witness: witnessFromEquals(() => true),
              recursion: 'self',
            },
          ],
        },
      ] as const,
    })

    const seeds = [[], [1], [1, 2]] as const
    const coalgebra: ADTUnfoldCoalgebra<typeof list.constructorsList, readonly number[]> = (values) =>
      values.length === 0
        ? ({ _tag: 'Nil', fields: {} } as const)
        : ({
            _tag: 'Cons',
            fields: { head: values[0], tail: values.slice(1) as readonly number[] },
          } as const)

    const valueFromSeed = list.unfold(coalgebra)
    const identityHandlers: ADTTraverseHandlers<typeof list.constructorsList, 'IdK1'> = {
      Nil: (_: any, { constructors: { Nil }, applicative }: any) => applicative.of(Nil()),
      Cons: ({ head, tail }: any, { constructors: { Cons }, applicative }: any) =>
        applicative.ap(
          applicative.map((tailValue: ReturnType<typeof Cons>) => (newHead: number) =>
            Cons({ head: newHead, tail: tailValue }),
          )(tail),
          applicative.of(head),
        ),
    }

    const identityMap = list.map({
      Nil: (_: any, { constructors: { Nil } }: any) => Nil(),
      Cons: ({ head, tail }: any, { constructors: { Cons } }: any) => Cons({ head, tail }),
    })

    const identityScenario: any = {
      id: 'identity',
      applicative: IdentityApplicative,
      handlers: identityHandlers,
      expected: ({ value }: any) => identityMap(value),
      witness: witnessFromEquals(list.equals),
    }

    const biasedScenario: any = {
      id: 'biased',
      applicative: IdentityApplicative,
      handlers: identityHandlers,
      expected: () => list.constructors.Nil(),
      witness: witnessFromEquals(list.equals),
    }

    const successReport = list.oracles.analyzeTraversal({
      seeds,
      valueFromSeed,
      scenarios: [identityScenario],
    })

    expect(successReport.holds).toBe(true)
    expect(successReport.counterexamples).toEqual([])
    expect(successReport.failures).toEqual([])

    const failureReport = list.oracles.analyzeTraversal({
      seeds,
      valueFromSeed,
      scenarios: [biasedScenario],
    })

    expect(failureReport.holds).toBe(false)
    expect(failureReport.counterexamples.length).toBeGreaterThan(0)

    const helperReport = analyzeADTTraversal(list, {
      seeds,
      valueFromSeed,
      scenarios: [identityScenario],
    })

    expect(helperReport.holds).toBe(true)
  })
})
