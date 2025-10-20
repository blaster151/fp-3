import type { SimpleApplicativeK1 } from '../../../catTransforms'
import {
  hcompNatK1_component,
  idNatK1,
  leftWhisker,
  rightWhisker,
  type EndofunctorK1,
  type EndofunctorValue,
  type NatK1,
} from '../../../endo-2category'

export type TypeWitness<A> = Readonly<{
  readonly equals: (left: A, right: A) => boolean
}>

export type ADTPolynomialPositionDescriptor = Readonly<{
  readonly name: string
  readonly recursion: ADTRecursionKind
  readonly witness: TypeWitness<unknown>
}>

export type ADTPolynomialConstructorDescriptor<Name extends string> = Readonly<{
  readonly name: Name
  readonly positions: ReadonlyArray<ADTPolynomialPositionDescriptor>
}>

export type ADTPolynomialSignature<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly typeName: TypeName
  readonly constructors: ReadonlyArray<
    ADTPolynomialConstructorDescriptor<Constructors[number]["name"] & string>
  >
}>

type PolynomialFieldValue<Field, Variable> = Field extends { readonly recursion: 'self' }
  ? Variable
  : FieldType<Field>

type PolynomialFieldRecord<
  Fields extends readonly ADTField<string, any>[],
  Variable,
> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: PolynomialFieldValue<K, Variable> }

export type ADTPolynomialValue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Variable,
> = Constructors[number] extends infer C extends ADTConstructor<string, readonly ADTField<string, any>[]>
  ? Readonly<{
      readonly tag: C["name"]
      readonly fields: PolynomialFieldRecord<C["fields"], Variable>
    }>
  : never

export type ADTPolynomialRecursion<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly fold: ADTFoldFunction<Constructors>
  readonly unfold: ADTUnfoldFunction<Constructors>
  readonly map: ADTMapFunction<Constructors>
}>

export type ADTPolynomialContainerTag<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly type: 'ADTPolynomial'
  readonly typeName: TypeName
  readonly constructors: Constructors
}>

export type ADTPolynomialContainer<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly tag: ADTPolynomialContainerTag<TypeName, Constructors>
  readonly endofunctor: EndofunctorK1<ADTPolynomialContainerTag<TypeName, Constructors>>
  readonly project: NatK1<'IdK1', ADTPolynomialContainerTag<TypeName, Constructors>>
  readonly embed: <Variable>(
    embedSelf: (value: Variable) => ADTValue<Constructors>,
  ) => NatK1<ADTPolynomialContainerTag<TypeName, Constructors>, 'IdK1'>
  readonly mapPositions: <Variable, Result>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    map: (value: Variable) => Result,
  ) => ADTPolynomialValue<Constructors, Result>
  readonly recursion?: ADTPolynomialRecursion<Constructors>
  readonly naturality: ADTPolynomialContainerNaturality<TypeName, Constructors>
  readonly oracles: ADTPolynomialContainerOracles<TypeName, Constructors>
}>

export type ADTPolynomialContainerNaturality<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly id: NatK1<
    ADTPolynomialContainerTag<TypeName, Constructors>,
    ADTPolynomialContainerTag<TypeName, Constructors>
  >
  readonly whiskerLeft: <H, K>(
    beta: NatK1<H, K>,
  ) => NatK1<
    ['Comp', ADTPolynomialContainerTag<TypeName, Constructors>, H],
    ['Comp', ADTPolynomialContainerTag<TypeName, Constructors>, K]
  >
  readonly whiskerRight: <G>(
    alpha: NatK1<ADTPolynomialContainerTag<TypeName, Constructors>, G>,
  ) => <H>() => NatK1<
    ['Comp', ADTPolynomialContainerTag<TypeName, Constructors>, H],
    ['Comp', G, H]
  >
  readonly hcomp: <G, H, K>(
    alpha: NatK1<ADTPolynomialContainerTag<TypeName, Constructors>, G>,
    beta: NatK1<H, K>,
  ) => NatK1<
    ['Comp', ADTPolynomialContainerTag<TypeName, Constructors>, H],
    ['Comp', G, K]
  >
}>

export type ADTPolynomialContainerIdentityCounterexample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly seed: Seed
  readonly constructor: string
  readonly field: string
  readonly actual: unknown
  readonly expected: unknown
}>

export type ADTPolynomialContainerIdentityFailure<Seed> = Readonly<{
  readonly seed: Seed
  readonly error: string
}>

export type ADTPolynomialContainerIdentityOracleReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<
    ADTPolynomialContainerIdentityCounterexample<Constructors, Seed>
  >
  readonly failures: ReadonlyArray<ADTPolynomialContainerIdentityFailure<Seed>>
  readonly details: string
}>

export type ADTPolynomialContainerCompositionScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
  Intermediate,
  Result,
> = Readonly<{
  readonly id: string
  readonly resultWitness: TypeWitness<Result>
  readonly derive: (input: {
    readonly seed: Seed
    readonly value: ADTValue<Constructors>
    readonly variant: ADTPolynomialValue<Constructors, ADTValue<Constructors>>
  }) => Readonly<{
    readonly first: (value: ADTValue<Constructors>) => Intermediate
    readonly second: (value: Intermediate) => Result
  }>
}>

export type ADTPolynomialContainerCompositionCounterexample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly constructor: string
  readonly field: string
  readonly actual: unknown
  readonly expected: unknown
}>

export type ADTPolynomialContainerCompositionFailure<Seed> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly error: string
}>

export type ADTPolynomialContainerCompositionOracleReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<
    ADTPolynomialContainerCompositionCounterexample<Constructors, Seed>
  >
  readonly failures: ReadonlyArray<ADTPolynomialContainerCompositionFailure<Seed>>
  readonly details: string
}>

export type ADTPolynomialContainerOracles<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly analyzeFunctorIdentity: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
  }) => ADTPolynomialContainerIdentityOracleReport<Constructors, Seed>
  readonly analyzeFunctorComposition: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<
      ADTPolynomialContainerCompositionScenario<Constructors, Seed, any, any>
    >
  }) => ADTPolynomialContainerCompositionOracleReport<Constructors, Seed>
}>

export type ADTPolynomialRoundtripCounterexample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly seed: Seed
  readonly actual: ADTValue<Constructors>
  readonly expected: ADTValue<Constructors>
}>

export type ADTPolynomialRoundtripFailure<Seed> = Readonly<{
  readonly seed: Seed
  readonly error: string
}>

export type ADTPolynomialRoundtripOracleReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTPolynomialRoundtripCounterexample<Constructors, Seed>>
  readonly failures: ReadonlyArray<ADTPolynomialRoundtripFailure<Seed>>
  readonly details: string
}>

export type ADTPolynomialMapScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
  Result,
> = Readonly<{
  readonly id: string
  readonly resultWitness: TypeWitness<Result>
  readonly derive: (input: {
    readonly seed: Seed
    readonly value: ADTValue<Constructors>
    readonly variant: ADTPolynomialValue<Constructors, ADTValue<Constructors>>
  }) => Readonly<{
    readonly map: (value: ADTValue<Constructors>) => Result
    readonly expected: ADTPolynomialValue<Constructors, Result>
  }>
}>

export type ADTPolynomialMapCounterexample<Seed> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly field: string
  readonly actual: unknown
  readonly expected: unknown
}>

export type ADTPolynomialMapFailure<Seed> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly error: string
}>

export type ADTPolynomialMapOracleReport<Seed> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTPolynomialMapCounterexample<Seed>>
  readonly failures: ReadonlyArray<ADTPolynomialMapFailure<Seed>>
  readonly details: string
}>

export type ADTPolynomialRecursionScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly id: string
  readonly handlers: ADTMapHandlers<Constructors>
}>

export type ADTPolynomialRecursionCounterexample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly actual: ADTValue<Constructors>
  readonly expected: ADTValue<Constructors>
}>

export type ADTPolynomialRecursionFailure<Seed> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly error: string
}>

export type ADTPolynomialRecursionOracleReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTPolynomialRecursionCounterexample<Constructors, Seed>>
  readonly failures: ReadonlyArray<ADTPolynomialRecursionFailure<Seed>>
  readonly details: string
}>

export type ADTPolynomialOracles<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly analyzeRoundtrip: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
  }) => ADTPolynomialRoundtripOracleReport<Constructors, Seed>
  readonly analyzeMapPositions: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTPolynomialMapScenario<Constructors, Seed, any>>
  }) => ADTPolynomialMapOracleReport<Seed>
  readonly analyzeRecursion?: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTPolynomialRecursionScenario<Constructors, Seed>>
  }) => ADTPolynomialRecursionOracleReport<Constructors, Seed>
}>

export type ADTPolynomial<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly typeName: TypeName
  readonly signature: ADTPolynomialSignature<TypeName, Constructors>
  readonly project: (
    value: ADTValue<Constructors>,
  ) => ADTPolynomialValue<Constructors, ADTValue<Constructors>>
  readonly embed: <Variable>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    embedSelf: (value: Variable) => ADTValue<Constructors>,
  ) => ADTValue<Constructors>
  readonly mapPositions: <Variable, Result>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    map: (value: Variable) => Result,
  ) => ADTPolynomialValue<Constructors, Result>
  readonly container: ADTPolynomialContainer<TypeName, Constructors>
  readonly oracles: ADTPolynomialOracles<Constructors>
  readonly recursion?: ADTPolynomialRecursion<Constructors>
}>

type ADTIndexEntry = Readonly<{
  readonly value: unknown
  readonly witness: TypeWitness<unknown>
}>

type ADTIndexMetadata = Readonly<Record<string, ADTIndexEntry>>

const EMPTY_INDEX_METADATA = Object.freeze({}) as ADTIndexMetadata

const EMPTY_INDEX_LIST = Object.freeze([]) as readonly ADTConstructorIndex[]

const EMPTY_POLYNOMIAL_POSITIONS = Object.freeze([]) as readonly ADTPolynomialPositionDescriptor[]

const EMPTY_POLYNOMIAL_CONSTRUCTORS = Object.freeze([]) as readonly ADTPolynomialConstructorDescriptor<string>[]

const EMPTY_POLYNOMIAL_FIELDS = Object.freeze({}) as Readonly<Record<string, never>>

const ADT_INDEX_METADATA = Symbol.for('fp-3.algebra.adt.indexes')

type ConstructorWithIndexes = Readonly<{
  readonly name: string
  readonly indexes?: readonly ADTConstructorIndex[]
}>

export type ADTIndexDescriptorRecord<
  Constructors extends ReadonlyArray<ConstructorWithIndexes>,
> = Readonly<{
  readonly [Ctor in Constructors[number] as Ctor["name"]]: readonly ADTConstructorIndex[]
}>

type ADTIndexed = Readonly<{ readonly [ADT_INDEX_METADATA]: ADTIndexMetadata }>

export type ADTRecursionKind = 'self' | 'foreign'

export type ADTField<Name extends string, A> = Readonly<{
  readonly name: Name
  readonly witness: TypeWitness<A>
  readonly recursion?: ADTRecursionKind
}>

export type ADTParameter<Name extends string> = Readonly<{
  readonly name: Name
}>

export type ADTParameterField<Name extends string, ParameterName extends string> = Readonly<{
  readonly name: Name
  readonly parameter: ParameterName
  readonly recursion?: ADTRecursionKind
}>

const EMPTY_PARAMETER_LIST = Object.freeze([]) as readonly ADTParameter<string>[]

type ParameterNames<Parameters extends readonly ADTParameter<string>[]> = Parameters extends readonly []
  ? never
  : Parameters[number]["name"] & string

export type ADTFieldDescriptor<
  Name extends string,
  ParameterName extends string,
> = ADTField<Name, any> | ADTParameterField<Name, ParameterName>

export type ADTConstructorFamily<
  Name extends string,
  ParameterName extends string,
  Fields extends readonly ADTFieldDescriptor<string, ParameterName>[],
> = Readonly<{
  readonly name: Name
  readonly fields: Fields
  readonly indexes?: readonly ADTConstructorIndex[]
}>

export type ADTConstructorIndex = Readonly<{
  readonly name: string
  readonly witness: TypeWitness<unknown>
  readonly compute: (fields: Readonly<Record<string, unknown>>) => unknown
}>

type ConstructorIntrospection<
  TypeName extends string,
  Parameters extends readonly ADTParameter<string>[],
  Constructors extends ReadonlyArray<ConstructorWithIndexes>,
> = Readonly<{
  readonly typeName: TypeName
  readonly parameters: Parameters
  readonly constructors: Constructors
  readonly indexes: ADTIndexDescriptorRecord<Constructors>
}>

export type ADTIntrospection<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = ConstructorIntrospection<TypeName, readonly [], Constructors>

export type ParameterizedADTIntrospection<
  TypeName extends string,
  Parameters extends readonly ADTParameter<string>[],
  Constructors extends ReadonlyArray<
    ADTConstructorFamily<
      string,
      ParameterNames<Parameters>,
      readonly ADTFieldDescriptor<string, ParameterNames<Parameters>>[]
    >
  >,
> = ConstructorIntrospection<TypeName, Parameters, Constructors>

export type ADTConstructor<Name extends string, Fields extends readonly ADTField<string, any>[]> = Readonly<{
  readonly name: Name
  readonly fields: Fields
  readonly indexes?: readonly ADTConstructorIndex[]
}>

type FieldType<F> = F extends ADTField<string, infer A> ? A : never

type FieldRecord<Fields extends readonly ADTField<string, any>[]> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: FieldType<K> }

type FoldFieldValue<Field, Result> = Field extends { readonly recursion: 'self' }
  ? Result
  : FieldType<Field>

type FoldFieldRecord<Fields extends readonly ADTField<string, any>[], Result> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: FoldFieldValue<K, Result> }

export type ADTVariant<Name extends string, Fields extends readonly ADTField<string, any>[]> = Readonly<{
  readonly _tag: Name
}> & FieldRecord<Fields> & ADTIndexed

type VariantFromConstructor<C extends ADTConstructor<string, readonly ADTField<string, any>[]>> =
  ADTVariant<C["name"], C["fields"]>

export type ADTValue<Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>> =
  VariantFromConstructor<Constructors[number]>

type ConstructorFactory<Name extends string, Fields extends readonly ADTField<string, any>[]> = Fields extends readonly []
  ? () => ADTVariant<Name, Fields>
  : (input: FieldRecord<Fields>) => ADTVariant<Name, Fields>

export type ADTConstructors<Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>> = {
  readonly [C in Constructors[number] as C["name"]]: ConstructorFactory<C["name"], C["fields"]>
}

const readIndexMetadata = (value: unknown): ADTIndexMetadata => {
  if (!value || typeof value !== 'object') {
    return EMPTY_INDEX_METADATA
  }
  const indexed = value as ADTIndexed
  const metadata = indexed[ADT_INDEX_METADATA]
  return metadata ?? EMPTY_INDEX_METADATA
}

const ensureConstructorIndexes = (
  constructorName: string,
  indexes: readonly ADTConstructorIndex[] | undefined,
): void => {
  if (!indexes || indexes.length === 0) {
    return
  }

  const seen = new Set<string>()
  for (const index of indexes) {
    if (seen.has(index.name)) {
      throw new Error(
        `Constructor ${String(constructorName)} declares duplicate index name ${String(index.name)}`,
      )
    }
    seen.add(index.name)

    if (!index.witness || typeof index.witness.equals !== 'function') {
      throw new Error(
        `Index ${String(index.name)} on constructor ${String(constructorName)} must provide an equals function`,
      )
    }
    if (typeof index.compute !== 'function') {
      throw new Error(
        `Index ${String(index.name)} on constructor ${String(constructorName)} must provide a compute function`,
      )
    }
  }
}

const createIndexMetadata = <Fields extends readonly ADTField<string, any>[]>(
  payload: FieldRecord<Fields>,
  indexes: readonly ADTConstructorIndex[] | undefined,
): ADTIndexMetadata => {
  if (!indexes || indexes.length === 0) {
    return EMPTY_INDEX_METADATA
  }

  const metadata: Record<string, ADTIndexEntry> = {}
  for (const index of indexes) {
    const value = index.compute(payload as unknown as Readonly<Record<string, unknown>>)
    metadata[index.name] = Object.freeze({
      value,
      witness: index.witness,
    }) as ADTIndexEntry
  }

  return Object.freeze(metadata)
}

const buildIndexDescriptorRecord = <Constructors extends ReadonlyArray<ConstructorWithIndexes>>(
  constructors: Constructors,
): ADTIndexDescriptorRecord<Constructors> => {
  const record: Record<string, readonly ADTConstructorIndex[]> = {}
  for (const ctor of constructors) {
    const indexes = ctor.indexes ?? EMPTY_INDEX_LIST
    record[ctor.name] = indexes.length === 0 ? EMPTY_INDEX_LIST : Object.freeze([...indexes])
  }
  return record as ADTIndexDescriptorRecord<Constructors>
}

const snapshotConstructors = <Constructors extends ReadonlyArray<ConstructorWithIndexes>>(
  constructors: Constructors,
): Constructors => Object.freeze([...constructors]) as Constructors

const snapshotParameters = <Parameters extends readonly ADTParameter<string>[]>(
  parameters: Parameters,
): Parameters => Object.freeze([...parameters]) as Parameters

const buildIntrospection = <
  TypeName extends string,
  Parameters extends readonly ADTParameter<string>[],
  Constructors extends ReadonlyArray<ConstructorWithIndexes>,
>(
  typeName: TypeName,
  parameters: Parameters,
  constructors: Constructors,
  indexDescriptors: ADTIndexDescriptorRecord<Constructors>,
): ConstructorIntrospection<TypeName, Parameters, Constructors> =>
  Object.freeze({
    typeName,
    parameters: parameters.length === 0 ? parameters : snapshotParameters(parameters),
    constructors: constructors.length === 0 ? constructors : snapshotConstructors(constructors),
    indexes: indexDescriptors,
  }) as ConstructorIntrospection<TypeName, Parameters, Constructors>

const buildPolynomialSignature = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  typeName: TypeName,
  constructors: Constructors,
): ADTPolynomialSignature<TypeName, Constructors> => {
  const signatureConstructors: ADTPolynomialConstructorDescriptor<string>[] = []
  for (const ctor of constructors) {
    const positions: ADTPolynomialPositionDescriptor[] = []
    for (const field of ctor.fields) {
      positions.push(
        Object.freeze({
          name: field.name,
          recursion: field.recursion === 'self' ? 'self' : 'foreign',
          witness: field.witness,
        }),
      )
    }
    signatureConstructors.push(
      Object.freeze({
        name: ctor.name,
        positions: positions.length === 0 ? EMPTY_POLYNOMIAL_POSITIONS : Object.freeze(positions),
      }),
    )
  }

  return Object.freeze({
    typeName,
    constructors:
      signatureConstructors.length === 0
        ? EMPTY_POLYNOMIAL_CONSTRUCTORS
        : Object.freeze(signatureConstructors),
  }) as ADTPolynomialSignature<TypeName, Constructors>
}

export const buildADTPolynomial = <
  TypeName extends string,
  const Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  typeName: TypeName,
  constructorsList: Constructors,
  constructors: ADTConstructors<Constructors>,
  options: {
    readonly equals: ADTEquality<Constructors>
    readonly recursion?: ADTPolynomialRecursion<Constructors>
  },
): ADTPolynomial<TypeName, Constructors> => {
  const { equals, recursion } = options
  const signature = buildPolynomialSignature(typeName, constructorsList)
  const lookup = new Map<string, Constructors[number]>()
  for (const ctor of constructorsList) {
    lookup.set(ctor.name, ctor)
  }

  const project = (
    value: ADTValue<Constructors>,
  ): ADTPolynomialValue<Constructors, ADTValue<Constructors>> => {
    const tag = (value as { readonly _tag: string })._tag
    const descriptor = lookup.get(tag)
    if (!descriptor) {
      throw new Error(`Value references unknown constructor ${String(tag)} for ADT ${typeName}`)
    }

    if (descriptor.fields.length === 0) {
      return Object.freeze({ tag, fields: EMPTY_POLYNOMIAL_FIELDS }) as unknown as ADTPolynomialValue<
        Constructors,
        ADTValue<Constructors>
      >
    }

    const payload = value as Record<string, unknown>
    const fields: Record<string, unknown> = {}
    for (const field of descriptor.fields) {
      fields[field.name] = payload[field.name]
    }

    return Object.freeze({
      tag,
      fields: Object.freeze(fields),
    }) as ADTPolynomialValue<Constructors, ADTValue<Constructors>>
  }

  const embed = <Variable>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    embedSelf: (value: Variable) => ADTValue<Constructors>,
  ): ADTValue<Constructors> => {
    const descriptor = lookup.get(variant.tag as string)
    if (!descriptor) {
      throw new Error(
        `Polynomial value references unknown constructor ${String(variant.tag)} for ADT ${typeName}`,
      )
    }

    const { name: descriptorName, fields: descriptorFields } = descriptor

    const factory = constructors[descriptorName as Constructors[number]["name"]] as ConstructorFactory<
      string,
      typeof descriptorFields
    >
    if (!factory) {
      throw new Error(`Constructor factory for ${String(variant.tag)} missing in ADT ${typeName}`)
    }

    if (descriptorFields.length === 0) {
      return (factory as () => ADTValue<Constructors>)()
    }

    const payload: Record<string, unknown> = {}
    for (const field of descriptorFields) {
      const value = variant.fields[field.name as keyof typeof variant.fields]
      payload[field.name] =
        field.recursion === 'self' ? embedSelf(value as Variable) : (value as unknown)
    }

    return (factory as (input: FieldRecord<typeof descriptorFields>) => ADTValue<Constructors>)(
      payload as FieldRecord<typeof descriptorFields>,
    )
  }

  const mapPositions = <Variable, Result>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    map: (value: Variable) => Result,
  ): ADTPolynomialValue<Constructors, Result> => {
    const descriptor = lookup.get(variant.tag as string)
    if (!descriptor) {
      throw new Error(
        `Polynomial value references unknown constructor ${String(variant.tag)} for ADT ${typeName}`,
      )
    }

    if (descriptor.fields.length === 0) {
      return variant as unknown as ADTPolynomialValue<Constructors, Result>
    }

    const mapped: Record<string, unknown> = {}
    for (const field of descriptor.fields) {
      const value = variant.fields[field.name as keyof typeof variant.fields]
      mapped[field.name] =
        field.recursion === 'self' ? map(value as Variable) : (value as unknown)
    }

    return Object.freeze({
      tag: variant.tag,
      fields: Object.freeze(mapped),
    }) as ADTPolynomialValue<Constructors, Result>
  }

  const tag = Object.freeze({
    type: 'ADTPolynomial',
    typeName,
    constructors: constructorsList,
  }) as ADTPolynomialContainerTag<TypeName, Constructors>

  const endofunctor: EndofunctorK1<typeof tag> = {
    map: <A, B>(map: (value: A) => B) =>
      (variant: EndofunctorValue<typeof tag, A>) =>
        mapPositions(
          variant as ADTPolynomialValue<Constructors, A>,
          map,
        ) as EndofunctorValue<typeof tag, B>,
  }

  const projectNat: NatK1<'IdK1', typeof tag> = {
    app: <A>(value: EndofunctorValue<'IdK1', A>) =>
      project(value as unknown as ADTValue<Constructors>) as EndofunctorValue<typeof tag, A>,
  }

  const embedNat = <Variable>(
    embedSelf: (value: Variable) => ADTValue<Constructors>,
  ): NatK1<typeof tag, 'IdK1'> => ({
    app: <A>(variant: EndofunctorValue<typeof tag, A>) =>
      embed(
        variant as ADTPolynomialValue<Constructors, Variable>,
        embedSelf,
      ) as EndofunctorValue<'IdK1', A>,
  })

  const containerOracles = buildADTPolynomialContainerOracles(
    typeName,
    constructorsList,
    equals,
    project,
    mapPositions,
  )

  const naturality = Object.freeze({
    id: idNatK1<typeof tag>(),
    whiskerLeft: leftWhisker(endofunctor),
    whiskerRight: <G>(alpha: NatK1<typeof tag, G>) => rightWhisker<typeof tag, G>(alpha),
    hcomp: <G, H, K>(alpha: NatK1<typeof tag, G>, beta: NatK1<H, K>) =>
      hcompNatK1_component(endofunctor)<H, K>(alpha, beta),
  }) as ADTPolynomialContainerNaturality<TypeName, Constructors>

  const container: ADTPolynomialContainer<TypeName, Constructors> = Object.freeze({
    tag,
    endofunctor,
    project: projectNat,
    embed: embedNat,
    mapPositions,
    naturality,
    oracles: containerOracles,
    ...(recursion ? { recursion } : {}),
  })

  const oracles = buildADTPolynomialOracles(
    typeName,
    constructorsList,
    equals,
    project,
    embed,
    mapPositions,
    recursion ? { map: recursion.map } : undefined,
  )

  const polynomial: ADTPolynomial<TypeName, Constructors> = Object.freeze({
    typeName,
    signature,
    project,
    embed,
    mapPositions,
    container,
    oracles,
    ...(recursion ? { recursion } : {}),
  }) as ADTPolynomial<TypeName, Constructors>

  return polynomial
}

const attachIndexMetadata = <Variant extends object>(
  variant: Variant,
  metadata: ADTIndexMetadata,
): Variant & ADTIndexed => {
  Object.defineProperty(variant, ADT_INDEX_METADATA, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: metadata,
  })
  return variant as Variant & ADTIndexed
}

type NormalizeParameters<Parameters> = Parameters extends readonly ADTParameter<string>[]
  ? Parameters
  : readonly ADTParameter<string>[]

type ExtractParameterNames<Parameters> = ParameterNames<NormalizeParameters<Parameters>>

type ADTParameterMap<Parameters extends readonly ADTParameter<string>[]> = Readonly<{
  readonly [Name in ParameterNames<Parameters>]: unknown
}>

export type ADTParameterWitnessRecord<
  Parameters extends readonly ADTParameter<string>[],
  ParameterTypes extends ADTParameterMap<Parameters>,
> = Readonly<{
  readonly [Name in ParameterNames<Parameters>]: TypeWitness<ParameterTypes[Name]>
}>

type ParameterFieldWithWitness<
  Field extends ADTParameterField<string, any>,
  ParameterTypes extends Readonly<Record<string, unknown>>,
> = Readonly<{
  readonly name: Field["name"]
  readonly witness: TypeWitness<ParameterTypes[Field["parameter"] & keyof ParameterTypes]>
  readonly recursion?: Field["recursion"]
}>

type ResolvedField<
  Field extends ADTFieldDescriptor<string, any>,
  ParameterTypes extends Readonly<Record<string, unknown>>,
> = Field extends ADTField<infer Name, infer Value>
  ? ADTField<Name, Value>
  : Field extends ADTParameterField<string, any>
    ? ParameterFieldWithWitness<Field, ParameterTypes>
    : never

export type InstantiateConstructors<
  Constructors extends ReadonlyArray<
    ADTConstructorFamily<string, any, readonly ADTFieldDescriptor<string, any>[]>
  >,
  ParameterTypes extends Readonly<Record<string, unknown>>,
> = Constructors extends readonly []
  ? readonly []
  : {
      readonly [Index in keyof Constructors]: Constructors[Index] extends ADTConstructorFamily<
        infer Name,
        infer ParameterName extends string,
        infer Fields extends readonly ADTFieldDescriptor<string, any>[]
      >
        ? Readonly<{
            readonly name: Name
            readonly fields: {
              readonly [FieldIndex in keyof Fields]: ResolvedField<Fields[FieldIndex], ParameterTypes>
            }
            readonly indexes?: Constructors[Index] extends {
              readonly indexes?: infer Indexes extends readonly ADTConstructorIndex[]
            }
              ? Indexes
              : undefined
          }>
        : never
    }

export type ADTCoalgebraFailure<Seed> = Readonly<{
  readonly seed: Seed
  readonly error: string
}>

export type ADTCoalgebraCounterexample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly seed: Seed
  readonly actual: ADTValue<Constructors>
  readonly expected: ADTValue<Constructors>
}>

export type ADTCoalgebraOracleReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTCoalgebraCounterexample<Constructors, Seed>>
  readonly failures: ReadonlyArray<ADTCoalgebraFailure<Seed>>
  readonly details: string
}>

export type ADTFoldUnfoldFailure<Seed> = Readonly<{
  readonly seed: Seed
  readonly error: string
}>

export type ADTFoldUnfoldCounterexample<Result, Seed> = Readonly<{
  readonly seed: Seed
  readonly actual: Result
  readonly expected: Result
}>

export type ADTFoldUnfoldOracleReport<Result, Seed> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTFoldUnfoldCounterexample<Result, Seed>>
  readonly failures: ReadonlyArray<ADTFoldUnfoldFailure<Seed>>
  readonly details: string
}>

type PatternHandlers<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Result
> = { readonly [C in Constructors[number] as C["name"]]: (value: ADTVariant<C["name"], C["fields"]>) => Result }

export type ADTMatchFunction<Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>> = <R>(
  handlers: PatternHandlers<Constructors, R>
) => (value: ADTValue<Constructors>) => R

export type ADTEquality<Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>> = (
  left: ADTValue<Constructors>,
  right: ADTValue<Constructors>
) => boolean

export type ADTFoldAlgebra<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Result,
> = {
  readonly [C in Constructors[number] as C["name"]]: (
    fields: FoldFieldRecord<C["fields"], Result>,
  ) => Result
}

export type ADTFoldFunction<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = <Result>(algebra: ADTFoldAlgebra<Constructors, Result>) => (value: ADTValue<Constructors>) => Result

type UnfoldFieldValue<Field, Seed> = Field extends { readonly recursion: 'self' }
  ? Seed
  : FieldType<Field>

type UnfoldFieldRecord<Fields extends readonly ADTField<string, any>[], Seed> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: UnfoldFieldValue<K, Seed> }

type ADTUnfoldStep<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Constructors[number] extends infer C extends ADTConstructor<string, readonly ADTField<string, any>[]>
  ? Readonly<{
      readonly _tag: C["name"]
      readonly fields: UnfoldFieldRecord<C["fields"], Seed>
    }>
  : never

export type ADTUnfoldCoalgebra<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = (seed: Seed) => ADTUnfoldStep<Constructors, Seed>

export type ADTUnfoldFunction<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = <Seed>(coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>) => (seed: Seed) => ADTValue<Constructors>

type MapFieldValue<
  Field,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Field extends { readonly recursion: 'self' }
  ? ADTValue<Constructors>
  : FieldType<Field>

type MapFieldRecord<
  Fields extends readonly ADTField<string, any>[],
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: MapFieldValue<K, Constructors> }

export type ADTMapContext<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly constructors: ADTConstructors<Constructors>
}>

export type ADTMapHandlers<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = {
  readonly [C in Constructors[number] as C["name"]]: (
    fields: MapFieldRecord<C["fields"], Constructors>,
    context: ADTMapContext<Constructors>,
  ) => ADTVariant<C["name"], C["fields"]>
}

export type ADTMapFunction<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = (handlers: ADTMapHandlers<Constructors>) => (value: ADTValue<Constructors>) => ADTValue<Constructors>

type TraverseFieldValue<
  Field,
  App,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Field extends { readonly recursion: 'self' }
  ? EndofunctorValue<App, ADTValue<Constructors>>
  : FieldType<Field>

type TraverseFieldRecord<
  Fields extends readonly ADTField<string, any>[],
  App,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: TraverseFieldValue<K, App, Constructors> }

export type ADTTraverseContext<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  App,
> = Readonly<{
  readonly constructors: ADTConstructors<Constructors>
  readonly applicative: SimpleApplicativeK1<App>
}>

export type ADTTraverseHandlers<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  App,
> = {
  readonly [C in Constructors[number] as C["name"]]: (
    fields: TraverseFieldRecord<C["fields"], App, Constructors>,
    context: ADTTraverseContext<Constructors, App>,
  ) => EndofunctorValue<App, ADTVariant<C["name"], C["fields"]>>
}

export type ADTTraverseFunction<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = <App>(
  applicative: SimpleApplicativeK1<App>,
) => (
  handlers: ADTTraverseHandlers<Constructors, App>,
) => (value: ADTValue<Constructors>) => EndofunctorValue<App, ADTValue<Constructors>>

type SequenceFieldValue<
  Field,
  App,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Field extends { readonly recursion: 'self' }
  ? EndofunctorValue<App, ADTSequenceValue<Constructors, App>>
  : EndofunctorValue<App, FieldType<Field>>

type SequenceFieldRecord<
  Fields extends readonly ADTField<string, any>[],
  App,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Fields extends readonly []
  ? {}
  : { readonly [K in Fields[number] as K["name"]]: SequenceFieldValue<K, App, Constructors> }

export type ADTSequenceVariant<
  Name extends string,
  Fields extends readonly ADTField<string, any>[],
  App,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{ readonly _tag: Name }> & SequenceFieldRecord<Fields, App, Constructors>

export type ADTSequenceValue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  App,
> = Constructors[number] extends infer C extends ADTConstructor<string, readonly ADTField<string, any>[]>
  ? ADTSequenceVariant<C["name"], C["fields"], App, Constructors>
  : never

export type ADTSequenceFunction<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = <App>(
  applicative: SimpleApplicativeK1<App>,
) => (
  value: ADTSequenceValue<Constructors, App>,
) => EndofunctorValue<App, ADTValue<Constructors>>

export type ADTTraversalScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
  App,
> = Readonly<{
  readonly id: string
  readonly applicative: SimpleApplicativeK1<App>
  readonly handlers: ADTTraverseHandlers<Constructors, App>
  readonly expected: (input: {
    readonly value: ADTValue<Constructors>
    readonly seed: Seed
  }) => EndofunctorValue<App, ADTValue<Constructors>>
  readonly witness: TypeWitness<EndofunctorValue<App, ADTValue<Constructors>>>
}>

export type ADTTraversalCounterexample<Seed> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly actual: unknown
  readonly expected: unknown
}>

export type ADTTraversalFailure<Seed> = Readonly<{
  readonly scenario: string
  readonly seed: Seed
  readonly error: string
}>

export type ADTTraversalOracleReport<Seed> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTTraversalCounterexample<Seed>>
  readonly failures: ReadonlyArray<ADTTraversalFailure<Seed>>
  readonly details: string
}>

export type ADTIndexScenarioContext<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly constructors: ADTConstructors<Constructors>
  readonly fold: ADTFoldFunction<Constructors>
  readonly map: ADTMapFunction<Constructors>
  readonly unfold: ADTUnfoldFunction<Constructors>
  readonly traverse: ADTTraverseFunction<Constructors>
  readonly sequence: ADTSequenceFunction<Constructors>
}>

export type ADTIndexScenarioInput<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly seed: Seed
  readonly baseValue: ADTValue<Constructors>
  readonly context: ADTIndexScenarioContext<Constructors>
}>

export type ADTIndexScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> = Readonly<{
  readonly id: string
  readonly derive: (
    input: ADTIndexScenarioInput<Constructors, Seed>,
  ) => ADTValue<Constructors>
}>

export type ADTIndexCounterexample<Seed> = Readonly<{
  readonly seed: Seed
  readonly scenario: string
  readonly constructor: string
  readonly index: string
  readonly expected: unknown
  readonly actual: unknown
}>

export type ADTIndexFailure<Seed> = Readonly<{
  readonly seed: Seed
  readonly scenario: string
  readonly error: string
}>

export type ADTIndexOracleReport<Seed> = Readonly<{
  readonly holds: boolean
  readonly counterexamples: ReadonlyArray<ADTIndexCounterexample<Seed>>
  readonly failures: ReadonlyArray<ADTIndexFailure<Seed>>
  readonly details: string
}>

export type ADTRecursionOracles<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly analyzeCoalgebra: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>
  }) => ADTCoalgebraOracleReport<Constructors, Seed>
  readonly analyzeFoldUnfold: <Seed, Result>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>
    readonly algebra: ADTFoldAlgebra<Constructors, Result>
    readonly resultWitness: TypeWitness<Result>
  }) => ADTFoldUnfoldOracleReport<Result, Seed>
  readonly analyzeTraversal: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTTraversalScenario<Constructors, Seed, any>>
  }) => ADTTraversalOracleReport<Seed>
  readonly analyzeIndexes: <Seed>(input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios?: ReadonlyArray<ADTIndexScenario<Constructors, Seed>>
  }) => ADTIndexOracleReport<Seed>
}>

type RecursiveFields<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Extract<Constructors[number]["fields"][number], { readonly recursion: 'self' }>

type RecursiveHelpers<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = Readonly<{
  readonly fold: ADTFoldFunction<Constructors>
  readonly unfold: ADTUnfoldFunction<Constructors>
  readonly map: ADTMapFunction<Constructors>
  readonly traverse: ADTTraverseFunction<Constructors>
  readonly sequence: ADTSequenceFunction<Constructors>
  readonly oracles: ADTRecursionOracles<Constructors>
}>

type MaybeRecursiveHelpers<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = [
  RecursiveFields<Constructors>
] extends [never]
  ? {}
  : RecursiveHelpers<Constructors>

export type AlgebraicDataType<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
> = Readonly<{
  readonly typeName: TypeName
  readonly constructors: ADTConstructors<Constructors>
  readonly match: ADTMatchFunction<Constructors>
  readonly equals: ADTEquality<Constructors>
  readonly constructorsList: Constructors
  readonly indexDescriptors: ADTIndexDescriptorRecord<Constructors>
  readonly introspect: () => ADTIntrospection<TypeName, Constructors>
  readonly polynomial: ADTPolynomial<TypeName, Constructors>
}> & MaybeRecursiveHelpers<Constructors>

export type RecursiveAlgebraicDataType<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
> = AlgebraicDataType<TypeName, Constructors> & RecursiveHelpers<Constructors>

export type ParameterizedAlgebraicDataType<
  TypeName extends string,
  Parameters extends readonly ADTParameter<string>[],
  Constructors extends ReadonlyArray<
    ADTConstructorFamily<
      string,
      ParameterNames<Parameters>,
      readonly ADTFieldDescriptor<string, ParameterNames<Parameters>>[]
    >
  >,
> = Readonly<{
  readonly typeName: TypeName
  readonly parameters: Parameters
  readonly indexDescriptors: ADTIndexDescriptorRecord<Constructors>
  readonly instantiate: <
    ParameterTypes extends ADTParameterMap<Parameters>
  >(
    witnesses: ADTParameterWitnessRecord<Parameters, ParameterTypes>,
  ) => AlgebraicDataType<TypeName, InstantiateConstructors<Constructors, ParameterTypes>>
  readonly introspect: () => ParameterizedADTIntrospection<TypeName, Parameters, Constructors>
}>

const makeVariant = <Name extends string, Fields extends readonly ADTField<string, any>[]>(
  name: Name,
  fields: Fields,
  indexes: readonly ADTConstructorIndex[] | undefined,
  input?: FieldRecord<Fields>,
): ADTVariant<Name, Fields> => {
  let payload: FieldRecord<Fields>
  if (fields.length === 0) {
    payload = {} as FieldRecord<Fields>
  } else {
    if (!input) {
      throw new Error(`Constructor ${String(name)} expects fields but received none`)
    }
    payload = input as FieldRecord<Fields>
  }

  const variant = { _tag: name, ...payload }
  const metadata = createIndexMetadata(payload, indexes)
  return attachIndexMetadata(variant, metadata)
}

const ensureWitness = (field: ADTField<string, unknown>): void => {
  if (typeof field.witness?.equals !== "function") {
    throw new Error(`Field ${String(field.name)} is missing an equality witness`)
  }
  if (field.recursion && field.recursion !== 'self' && field.recursion !== 'foreign') {
    throw new Error(`Field ${String(field.name)} has invalid recursion metadata ${String(field.recursion)}`)
  }
}

const deriveConstructor = <
  Name extends string,
  Fields extends readonly ADTField<string, any>[]
>(
  name: Name,
  fields: Fields,
  indexes: readonly ADTConstructorIndex[] | undefined,
): ConstructorFactory<Name, Fields> => {
  if (fields.length === 0) {
    return (() => makeVariant(name, fields, indexes)) as ConstructorFactory<Name, Fields>
  }
  return ((input: FieldRecord<Fields>) => makeVariant(name, fields, indexes, input)) as ConstructorFactory<
    Name,
    Fields
  >
}

export const buildADTConstructors = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(constructors: Constructors): ADTConstructors<Constructors> => {
  if (constructors.length === 0) {
    throw new Error("ADT constructors list must not be empty")
  }

  const descriptor = constructors.reduce((acc, ctor) => {
    ctor.fields.forEach(ensureWitness)
    ensureConstructorIndexes(String(ctor.name), ctor.indexes)
    if (acc[ctor.name]) {
      throw new Error(`Duplicate constructor name: ${String(ctor.name)}`)
    }

    return {
      ...acc,
      [ctor.name]: deriveConstructor(ctor.name, ctor.fields, ctor.indexes),
    }
  }, {} as Record<string, ConstructorFactory<string, readonly ADTField<string, any>[]>>)

  return descriptor as ADTConstructors<Constructors>
}

const deriveMatcher = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(constructors: Constructors): ADTMatchFunction<Constructors> =>
  (handlers) => (value) => {
    const tagged = value as ADTValue<Constructors> & { readonly _tag: Constructors[number]["name"] }
    const tag = tagged._tag
    const handler = handlers[tag]
    if (typeof handler !== "function") {
      throw new Error(`Missing handler for constructor ${String(tag)}`)
    }
    return handler(tagged as ADTVariant<typeof tag, Extract<Constructors[number], { readonly name: typeof tag }>["fields"]>)
  }

const deriveEquality = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(constructors: Constructors): ADTEquality<Constructors> => (left, right) => {
  const leftTagged = left as ADTValue<Constructors> & { readonly _tag: Constructors[number]["name"] }
  const rightTagged = right as ADTValue<Constructors> & { readonly _tag: Constructors[number]["name"] }

  if (leftTagged._tag !== rightTagged._tag) {
    return false
  }
  const constructor = constructors.find(
    (ctor): ctor is Extract<Constructors[number], { readonly name: typeof leftTagged._tag }> =>
      ctor.name === leftTagged._tag,
  )
  if (!constructor) {
    return false
  }
  for (const field of constructor.fields) {
    const fieldName = field.name as keyof typeof leftTagged
    const witness = field.witness as TypeWitness<unknown>
    if (!witness.equals(leftTagged[fieldName], rightTagged[fieldName])) {
      return false
    }
  }
  const indexes = constructor.indexes ?? []
  if (indexes.length > 0) {
    const leftIndexes = readIndexMetadata(leftTagged)
    const rightIndexes = readIndexMetadata(rightTagged)
    for (const index of indexes) {
      if (!Object.prototype.hasOwnProperty.call(leftIndexes, index.name)) {
        return false
      }
      if (!Object.prototype.hasOwnProperty.call(rightIndexes, index.name)) {
        return false
      }
      const leftEntry = leftIndexes[index.name]!
      const rightEntry = rightIndexes[index.name]!
      if (!index.witness.equals(leftEntry.value, rightEntry.value)) {
        return false
      }
    }
  }
  return true
}

const hasRecursiveFields = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(constructors: Constructors): boolean =>
  constructors.some((ctor) => ctor.fields.some((field) => field.recursion === 'self'))

const buildFieldsReducer = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(
  constructors: Constructors,
): Record<Constructors[number]["name"], Constructors[number]["fields"]> =>
  constructors.reduce(
    (acc, ctor) => ({
      ...acc,
      [ctor.name]: ctor.fields,
    }),
    {} as Record<Constructors[number]["name"], Constructors[number]["fields"]>,
  )

export const buildADTFold = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(constructors: Constructors): ADTFoldFunction<Constructors> => {
  if (!hasRecursiveFields(constructors)) {
    throw new Error('Cannot derive catamorphism without at least one recursive field annotated with recursion: "self"')
  }

  const fieldsByConstructor = buildFieldsReducer(constructors)

  return <Result>(algebra: ADTFoldAlgebra<Constructors, Result>) => {
    type ConstructorName = Constructors[number]["name"]

    constructors.forEach((ctor) => {
      const handler = algebra[ctor.name as ConstructorName]
      if (typeof handler !== "function") {
        throw new Error(`Missing algebra handler for constructor ${String(ctor.name)}`)
      }
    })

    const folder = (value: ADTValue<Constructors>): Result => {
      const tagged = value as ADTValue<Constructors> & { readonly _tag: Constructors[number]["name"] }
      const tag = tagged._tag
      type MatchingConstructor = Extract<Constructors[number], { readonly name: typeof tag }>

      const handler = algebra[tag as ConstructorName] as (
        fields: FoldFieldRecord<MatchingConstructor["fields"], Result>,
      ) => Result
      const fields = fieldsByConstructor[tag as ConstructorName] as MatchingConstructor["fields"]
      if (!fields) {
        throw new Error(`Unknown constructor tag ${String(tag)} encountered during fold`)
      }

      const accumulated: Record<string, unknown> = {}
      for (const field of fields) {
        const fieldName = field.name as keyof typeof tagged
        const payload = tagged[fieldName]
        accumulated[field.name] =
          field.recursion === 'self'
            ? folder(payload as ADTValue<Constructors>)
            : payload
      }

      return handler(accumulated as FoldFieldRecord<MatchingConstructor["fields"], Result>)
    }

    return (value) => folder(value)
  }
}

export const buildADTUnfold = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(
  constructors: Constructors,
  constructorFactories?: ADTConstructors<Constructors>,
): ADTUnfoldFunction<Constructors> => {
  if (!hasRecursiveFields(constructors)) {
    throw new Error('Cannot derive anamorphism without at least one recursive field annotated with recursion: "self"')
  }

  const constructorsRecord = constructorFactories ?? buildADTConstructors(constructors)
  const fieldsByConstructor = buildFieldsReducer(constructors)

  return <Seed>(coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>) => {
    type ConstructorName = Constructors[number]["name"]

    const buildValue = (seed: Seed): ADTValue<Constructors> => {
      const step = coalgebra(seed)
      if (!step || typeof step !== "object") {
        throw new Error('Anamorphism coalgebra must return an object with _tag and fields')
      }

      const tag = step._tag as ConstructorName
      const constructorFields = fieldsByConstructor[tag]
      if (!constructorFields) {
        throw new Error(`Unknown constructor tag ${String(tag)} encountered during unfold`)
      }

      const ctor = constructorsRecord[tag]
      if (typeof ctor !== "function") {
        throw new Error(`Missing constructor factory for tag ${String(tag)}`)
      }

      const providedFields = step.fields as Record<string, unknown>
      const accumulated: Record<string, unknown> = {}
      for (const field of constructorFields) {
        const payload = providedFields[field.name]
        if (payload === undefined && !(field.name in providedFields)) {
          throw new Error(`Coalgebra result for ${String(tag)} is missing field ${String(field.name)}`)
        }

        if (field.recursion === 'self') {
          if (typeof payload === "undefined") {
            throw new Error(
              `Coalgebra result for ${String(tag)} must supply seed for recursive field ${String(field.name)}`,
            )
          }
          accumulated[field.name] = buildValue(payload as Seed)
        } else {
          accumulated[field.name] = payload
        }
      }

      if (constructorFields.length === 0) {
        return (ctor as () => ADTValue<Constructors>)()
      }

      return (ctor as (input: Record<string, unknown>) => ADTValue<Constructors>)(accumulated)
    }

    return (seed: Seed) => buildValue(seed)
  }
}

export const buildADTMap = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(
  constructors: Constructors,
  constructorFactories?: ADTConstructors<Constructors>,
): ADTMapFunction<Constructors> => {
  if (!hasRecursiveFields(constructors)) {
    throw new Error('Cannot derive functorial map without recursive self fields annotated in the schema')
  }

  const constructorsRecord = constructorFactories ?? buildADTConstructors(constructors)
  const fieldsByConstructor = buildFieldsReducer(constructors)

  return (handlers) => {
    type ConstructorName = Constructors[number]["name"]

    constructors.forEach((ctor) => {
      const handler = handlers[ctor.name as ConstructorName]
      if (typeof handler !== "function") {
        throw new Error(`Missing map handler for constructor ${String(ctor.name)}`)
      }
    })

    const mapper = (value: ADTValue<Constructors>): ADTValue<Constructors> => {
      const tagged = value as ADTValue<Constructors> & { readonly _tag: ConstructorName }
      const tag = tagged._tag
      const handler = handlers[tag]
      if (typeof handler !== "function") {
        throw new Error(`Missing map handler for constructor ${String(tag)}`)
      }

      const constructorFields = fieldsByConstructor[tag]
      if (!constructorFields) {
        throw new Error(`Unknown constructor tag ${String(tag)} encountered during map`)
      }

      const accumulated: Record<string, unknown> = {}
      for (const field of constructorFields) {
        const payload = tagged[field.name as keyof typeof tagged]
        accumulated[field.name] =
          field.recursion === 'self'
            ? mapper(payload as ADTValue<Constructors>)
            : payload
      }

      return handler(
        accumulated as MapFieldRecord<
          Extract<Constructors[number], { readonly name: typeof tag }>['fields'],
          Constructors
        >,
        { constructors: constructorsRecord },
      )
    }

    return (value) => mapper(value)
  }
}

export const buildADTTraverse = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(
  constructors: Constructors,
  constructorFactories?: ADTConstructors<Constructors>,
): ADTTraverseFunction<Constructors> => {
  if (!hasRecursiveFields(constructors)) {
    throw new Error('Cannot derive applicative traverse without recursive self fields annotated in the schema')
  }

  const constructorsRecord = constructorFactories ?? buildADTConstructors(constructors)
  const fieldsByConstructor = buildFieldsReducer(constructors)

  const traverse: ADTTraverseFunction<Constructors> = <App>(
    applicative: SimpleApplicativeK1<App>,
  ) => {
    type ConstructorName = Constructors[number]["name"]

    return (handlers: ADTTraverseHandlers<Constructors, App>) => {
      constructors.forEach((ctor) => {
        const handler = handlers[ctor.name as ConstructorName]
        if (typeof handler !== "function") {
          throw new Error(`Missing traverse handler for constructor ${String(ctor.name)}`)
        }
      })

      const traverseValue = (value: ADTValue<Constructors>): EndofunctorValue<App, ADTValue<Constructors>> => {
        const tagged = value as ADTValue<Constructors> & { readonly _tag: ConstructorName }
        const tag = tagged._tag
        const handler = handlers[tag]
        if (typeof handler !== "function") {
          throw new Error(`Missing traverse handler for constructor ${String(tag)}`)
        }

        const fields = fieldsByConstructor[tag]
        if (!fields) {
          throw new Error(`Unknown constructor tag ${String(tag)} encountered during traverse`)
        }

        const processed: Record<string, unknown> = {}
        for (const field of fields) {
          const payload = tagged[field.name as keyof typeof tagged]
          processed[field.name] =
            field.recursion === 'self'
              ? traverseValue(payload as ADTValue<Constructors>)
              : payload
        }

        return handler(
          processed as TraverseFieldRecord<
            Extract<Constructors[number], { readonly name: typeof tag }>['fields'],
            App,
            Constructors
          >,
          {
            constructors: constructorsRecord,
            applicative,
          },
        )
      }

      return (value: ADTValue<Constructors>) => traverseValue(value)
    }
  }
  return traverse
}

export const buildADTSequence = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(
  constructors: Constructors,
  constructorFactories?: ADTConstructors<Constructors>,
): ADTSequenceFunction<Constructors> => {
  if (!hasRecursiveFields(constructors)) {
    throw new Error('Cannot derive applicative sequence without recursive self fields annotated in the schema')
  }

  const constructorsRecord = constructorFactories ?? buildADTConstructors(constructors)
  const fieldsByConstructor = buildFieldsReducer(constructors)

  return <App>(applicative: SimpleApplicativeK1<App>) => {
    type ConstructorName = Constructors[number]["name"]

    const sequenceValue = (
      value: ADTSequenceValue<Constructors, App>,
    ): EndofunctorValue<App, ADTValue<Constructors>> => {
      const tagged = value as ADTSequenceValue<Constructors, App> & { readonly _tag: ConstructorName }
      const tag = tagged._tag
      const ctor = constructorsRecord[tag]
      if (typeof ctor !== "function") {
        throw new Error(`Missing constructor factory for tag ${String(tag)} during sequence`)
      }

      const fields = fieldsByConstructor[tag]
      if (!fields) {
        throw new Error(`Unknown constructor tag ${String(tag)} encountered during sequence`)
      }

      if (fields.length === 0) {
        return applicative.of((ctor as () => ADTValue<Constructors>)())
      }

      const accumulated = fields.reduce<EndofunctorValue<App, Record<string, unknown>>>(
        (acc, field) => {
          const payload = tagged[field.name as keyof typeof tagged]
          const effect =
            field.recursion === 'self'
              ? sequenceValue(
                  payload as ADTSequenceValue<Constructors, App>,
                )
              : (payload as EndofunctorValue<App, FieldType<typeof field>>)

          const extend = applicative.map((record: Record<string, unknown>) =>
            (fieldValue: unknown) => ({
              ...record,
              [field.name]: fieldValue,
            }),
          )(acc)

          return applicative.ap(extend)(effect)
        },
        applicative.of<Record<string, unknown>>({}),
      )

      return applicative.map((record: Record<string, unknown>) =>
        (ctor as (input: Record<string, unknown>) => ADTValue<Constructors>)(record),
      )(accumulated)
    }

    return (value: ADTSequenceValue<Constructors, App>) => sequenceValue(value)
  }
}

const formatOracleDetails = (
  counterexamples: ReadonlyArray<unknown>,
  failures: ReadonlyArray<unknown>,
  success: string,
  prefix: string,
): string => {
  if (counterexamples.length === 0 && failures.length === 0) {
    return success
  }
  const segments: string[] = []
  if (counterexamples.length > 0) {
    segments.push(`${prefix}: ${counterexamples.length} counterexample(s) detected`)
  }
  if (failures.length > 0) {
    segments.push(`${prefix}: ${failures.length} failure(s) encountered`)
  }
  return segments.join("; ")
}

const buildADTPolynomialContainerOracles = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  typeName: TypeName,
  constructors: Constructors,
  equals: ADTEquality<Constructors>,
  project: (value: ADTValue<Constructors>) => ADTPolynomialValue<Constructors, ADTValue<Constructors>>,
  mapPositions: <Variable, Result>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    map: (value: Variable) => Result,
  ) => ADTPolynomialValue<Constructors, Result>,
): ADTPolynomialContainerOracles<TypeName, Constructors> => {
  const fieldsByConstructor = buildFieldsReducer(constructors)
  const recursionWitness = witnessFromEquals(equals)

  const analyzeFunctorIdentity = <Seed>({
    seeds,
    valueFromSeed,
  }: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
  }): ADTPolynomialContainerIdentityOracleReport<Constructors, Seed> => {
    const counterexamples: Array<ADTPolynomialContainerIdentityCounterexample<Constructors, Seed>> = []
    const failures: Array<ADTPolynomialContainerIdentityFailure<Seed>> = []
    type ConstructorName = Constructors[number]["name"]

    for (const seed of seeds) {
      let value: ADTValue<Constructors>
      try {
        value = valueFromSeed(seed)
      } catch (error) {
        failures.push({
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      let projected: ADTPolynomialValue<Constructors, ADTValue<Constructors>>
      try {
        projected = project(value)
      } catch (error) {
        failures.push({
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      let mapped: ADTPolynomialValue<Constructors, ADTValue<Constructors>>
      try {
        mapped = mapPositions(projected, (payload) => payload)
      } catch (error) {
        failures.push({
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      if (mapped.tag !== projected.tag) {
        counterexamples.push({
          seed,
          constructor: String(projected.tag),
          field: 'tag',
          actual: mapped.tag,
          expected: projected.tag,
        })
        continue
      }

      const fields = fieldsByConstructor[mapped.tag as ConstructorName]
      if (!fields) {
        failures.push({
          seed,
          error: `Polynomial container encountered unknown constructor ${String(mapped.tag)} for ADT ${typeName}`,
        })
        continue
      }

      for (const field of fields) {
        const fieldName = field.name as keyof typeof mapped.fields
        const actual = mapped.fields[fieldName]
        const expected = projected.fields[fieldName]

        if (field.recursion === 'self') {
          if (
            !recursionWitness.equals(
              actual as ADTValue<Constructors>,
              expected as ADTValue<Constructors>,
            )
          ) {
            counterexamples.push({
              seed,
              constructor: String(mapped.tag),
              field: `${String(mapped.tag)}.${String(field.name)}`,
              actual,
              expected,
            })
          }
          continue
        }

        const witness = field.witness as TypeWitness<unknown>
        if (!witness.equals(actual as unknown, expected as unknown)) {
          counterexamples.push({
            seed,
            constructor: String(mapped.tag),
            field: `${String(mapped.tag)}.${String(field.name)}`,
            actual,
            expected,
          })
        }
      }
    }

    return {
      holds: counterexamples.length === 0 && failures.length === 0,
      counterexamples,
      failures,
      details: formatOracleDetails(
        counterexamples,
        failures,
        'Polynomial container functor identity holds for all samples.',
        'Polynomial container identity analysis',
      ),
    }
  }

  const analyzeFunctorComposition = <Seed>({
    seeds,
    valueFromSeed,
    scenarios,
  }: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<
      ADTPolynomialContainerCompositionScenario<Constructors, Seed, any, any>
    >
  }): ADTPolynomialContainerCompositionOracleReport<Constructors, Seed> => {
    const counterexamples: Array<
      ADTPolynomialContainerCompositionCounterexample<Constructors, Seed>
    > = []
    const failures: Array<ADTPolynomialContainerCompositionFailure<Seed>> = []
    type ConstructorName = Constructors[number]["name"]

    for (const seed of seeds) {
      let value: ADTValue<Constructors>
      try {
        value = valueFromSeed(seed)
      } catch (error) {
        failures.push({
          scenario: 'valueFromSeed',
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      let projected: ADTPolynomialValue<Constructors, ADTValue<Constructors>>
      try {
        projected = project(value)
      } catch (error) {
        failures.push({
          scenario: 'project',
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      for (const scenario of scenarios) {
        let stage: ReturnType<typeof scenario.derive>
        try {
          stage = scenario.derive({ seed, value, variant: projected })
        } catch (error) {
          failures.push({
            scenario: scenario.id,
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
          continue
        }

        let sequential: ADTPolynomialValue<Constructors, unknown>
        let composed: ADTPolynomialValue<Constructors, unknown>
        try {
          const firstMapped = mapPositions(
            projected,
            stage.first as (payload: ADTValue<Constructors>) => unknown,
          )
          sequential = mapPositions(
            firstMapped as ADTPolynomialValue<Constructors, unknown>,
            stage.second as (payload: unknown) => unknown,
          )
          composed = mapPositions(
            projected,
            (payload) => stage.second(stage.first(payload)),
          )
        } catch (error) {
          failures.push({
            scenario: scenario.id,
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
          continue
        }

        if (sequential.tag !== composed.tag) {
          counterexamples.push({
            scenario: scenario.id,
            seed,
            constructor: String(projected.tag),
            field: 'tag',
            actual: sequential.tag,
            expected: composed.tag,
          })
          continue
        }

        const fields = fieldsByConstructor[sequential.tag as ConstructorName]
        if (!fields) {
          failures.push({
            scenario: scenario.id,
            seed,
            error: `Polynomial container encountered unknown constructor ${String(sequential.tag)} for ADT ${typeName}`,
          })
          continue
        }

        const resultWitness = scenario.resultWitness as TypeWitness<unknown>
        for (const field of fields) {
          const fieldName = field.name as keyof typeof sequential.fields
          const actual = sequential.fields[fieldName]
          const expected = composed.fields[fieldName]
          const witness = field.recursion === 'self'
            ? resultWitness
            : (field.witness as TypeWitness<unknown>)
          if (!witness.equals(actual as unknown, expected as unknown)) {
            counterexamples.push({
              scenario: scenario.id,
              seed,
              constructor: String(sequential.tag),
              field: `${String(sequential.tag)}.${String(field.name)}`,
              actual,
              expected,
            })
          }
        }
      }
    }

    return {
      holds: counterexamples.length === 0 && failures.length === 0,
      counterexamples,
      failures,
      details: formatOracleDetails(
        counterexamples,
        failures,
        'Polynomial container functor composition holds for all scenarios.',
        'Polynomial container composition analysis',
      ),
    }
  }

  return {
    analyzeFunctorIdentity,
    analyzeFunctorComposition,
  }
}

const buildADTPolynomialOracles = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  typeName: TypeName,
  constructors: Constructors,
  equals: ADTEquality<Constructors>,
  project: (value: ADTValue<Constructors>) => ADTPolynomialValue<Constructors, ADTValue<Constructors>>,
  embed: <Variable>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    embedSelf: (value: Variable) => ADTValue<Constructors>,
  ) => ADTValue<Constructors>,
  mapPositions: <Variable, Result>(
    variant: ADTPolynomialValue<Constructors, Variable>,
    map: (value: Variable) => Result,
  ) => ADTPolynomialValue<Constructors, Result>,
  recursion?: { readonly map: ADTMapFunction<Constructors> },
): ADTPolynomialOracles<Constructors> => {
  const fieldsByConstructor = buildFieldsReducer(constructors)

  const analyzeRoundtrip = <Seed>({
    seeds,
    valueFromSeed,
  }: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
  }): ADTPolynomialRoundtripOracleReport<Constructors, Seed> => {
    const counterexamples: Array<ADTPolynomialRoundtripCounterexample<Constructors, Seed>> = []
    const failures: Array<ADTPolynomialRoundtripFailure<Seed>> = []

    for (const seed of seeds) {
      try {
        const value = valueFromSeed(seed)
        const projected = project(value)
        const rebuilt = embed(projected, (v) => v)
        if (!equals(rebuilt, value)) {
          counterexamples.push({ seed, actual: rebuilt, expected: value })
        }
      } catch (error) {
        failures.push({
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return {
      holds: counterexamples.length === 0 && failures.length === 0,
      counterexamples,
      failures,
      details: formatOracleDetails(
        counterexamples,
        failures,
        'Polynomial project/embed round-trips succeeded for all samples.',
        'Polynomial roundtrip analysis',
      ),
    }
  }

  const analyzeMapPositions = <Seed>({
    seeds,
    valueFromSeed,
    scenarios,
  }: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTPolynomialMapScenario<Constructors, Seed, any>>
  }): ADTPolynomialMapOracleReport<Seed> => {
    const counterexamples: Array<ADTPolynomialMapCounterexample<Seed>> = []
    const failures: Array<ADTPolynomialMapFailure<Seed>> = []

    for (const seed of seeds) {
      let value: ADTValue<Constructors>
      try {
        value = valueFromSeed(seed)
      } catch (error) {
        failures.push({
          scenario: 'valueFromSeed',
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      const variant = project(value)
      for (const scenario of scenarios) {
        try {
          const { map, expected } = scenario.derive({ seed, value, variant })
          const actual = mapPositions(variant, map)

          if (actual.tag !== expected.tag) {
            counterexamples.push({
              scenario: scenario.id,
              seed,
              field: 'tag',
              actual: actual.tag,
              expected: expected.tag,
            })
            continue
          }

          const fields = fieldsByConstructor[actual.tag as Constructors[number]["name"]]
          if (!fields) {
            throw new Error(
              `Polynomial oracle encountered unknown constructor ${String(actual.tag)} for ADT ${typeName}`,
            )
          }

          for (const field of fields) {
            const fieldName = field.name as keyof typeof actual.fields
            const actualValue = actual.fields[fieldName]
            const expectedValue = expected.fields[fieldName]
            const witness = field.recursion === 'self' ? scenario.resultWitness : field.witness
            if (!witness.equals(actualValue as unknown, expectedValue as unknown)) {
              counterexamples.push({
                scenario: scenario.id,
                seed,
                field: `${String(actual.tag)}.${String(field.name)}`,
                actual: actualValue,
                expected: expectedValue,
              })
            }
          }
        } catch (error) {
          failures.push({
            scenario: scenario.id,
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    return {
      holds: counterexamples.length === 0 && failures.length === 0,
      counterexamples,
      failures,
      details: formatOracleDetails(
        counterexamples,
        failures,
        'Polynomial mapPositions scenarios satisfied expected behaviour.',
        'Polynomial map analysis',
      ),
    }
  }

  if (!recursion) {
    return Object.freeze({
      analyzeRoundtrip,
      analyzeMapPositions,
    }) as ADTPolynomialOracles<Constructors>
  }

  const analyzeRecursion = <Seed>({
    seeds,
    valueFromSeed,
    scenarios,
  }: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTPolynomialRecursionScenario<Constructors, Seed>>
  }): ADTPolynomialRecursionOracleReport<Constructors, Seed> => {
    const counterexamples: Array<ADTPolynomialRecursionCounterexample<Constructors, Seed>> = []
    const failures: Array<ADTPolynomialRecursionFailure<Seed>> = []

    for (const seed of seeds) {
      let value: ADTValue<Constructors>
      try {
        value = valueFromSeed(seed)
      } catch (error) {
        failures.push({
          scenario: 'valueFromSeed',
          seed,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      const variant = project(value)
      for (const scenario of scenarios) {
        try {
          const mapInstance = recursion.map(scenario.handlers)
          const expected = mapInstance(value)
          const mappedVariant = mapPositions(variant, mapInstance)
          const rebuilt = embed(mappedVariant, mapInstance)
          if (!equals(rebuilt, expected)) {
            counterexamples.push({
              scenario: scenario.id,
              seed,
              actual: rebuilt,
              expected,
            })
          }
        } catch (error) {
          failures.push({
            scenario: scenario.id,
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    return {
      holds: counterexamples.length === 0 && failures.length === 0,
      counterexamples,
      failures,
      details: formatOracleDetails(
        counterexamples,
        failures,
        'Polynomial recursion alignment succeeded for all map scenarios.',
        'Polynomial recursion analysis',
      ),
    }
  }

  return Object.freeze({
    analyzeRoundtrip,
    analyzeMapPositions,
    analyzeRecursion,
  }) as ADTPolynomialOracles<Constructors>
}

const buildADTRecursionOracles = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
>(
  constructors: Constructors,
  constructorFactories: ADTConstructors<Constructors>,
  equals: ADTEquality<Constructors>,
  fold: ADTFoldFunction<Constructors>,
  unfold: ADTUnfoldFunction<Constructors>,
  map: ADTMapFunction<Constructors>,
  traverse: ADTTraverseFunction<Constructors>,
  sequence: ADTSequenceFunction<Constructors>,
  indexDescriptors: ADTIndexDescriptorRecord<Constructors>,
): ADTRecursionOracles<Constructors> => {
  const fieldsByConstructor = buildFieldsReducer(constructors)

  type ConstructorName = Constructors[number]["name"]

  const validateIndexesForValue = <Seed>(
    value: ADTValue<Constructors>,
    seed: Seed,
    scenario: string,
    counterexamples: Array<ADTIndexCounterexample<Seed>>,
    failures: Array<ADTIndexFailure<Seed>>,
  ): void => {
    const tagged = value as ADTValue<Constructors> & { readonly _tag?: ConstructorName }
    const tag = tagged._tag
    if (!tag) {
      failures.push({
        seed,
        scenario,
        error: 'ADT value is missing a _tag discriminant',
      })
      return
    }

    const fields = fieldsByConstructor[tag]
    if (!fields) {
      failures.push({
        seed,
        scenario,
        error: `Unknown constructor tag ${String(tag)} encountered during index analysis`,
      })
      return
    }

    const indexesList = (
      indexDescriptors[tag as Constructors[number]["name"]] ?? EMPTY_INDEX_LIST
    ) as readonly ADTConstructorIndex[]
    if (indexesList.length === 0) {
      return
    }

    const metadata = readIndexMetadata(tagged)
    const payload: Record<string, unknown> = {}

    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(tagged, field.name)) {
        failures.push({
          seed,
          scenario,
          error: `Constructor ${String(tag)} is missing field ${String(field.name)} during index analysis`,
        })
        return
      }
      payload[field.name] = tagged[field.name as keyof typeof tagged]
    }

    for (const index of indexesList) {
      let expected: unknown
      try {
        expected = index.compute(payload as Readonly<Record<string, unknown>>)
      } catch (error) {
        failures.push({
          seed,
          scenario,
          error: `Index ${String(index.name)} on constructor ${String(tag)} threw during recomputation: ${
            error instanceof Error ? error.message : String(error)
          }`,
        })
        continue
      }

      if (!Object.prototype.hasOwnProperty.call(metadata, index.name)) {
        failures.push({
          seed,
          scenario,
          error: `Constructor ${String(tag)} is missing index ${String(index.name)}`,
        })
        continue
      }

      const entry = metadata[index.name]!
      if (!index.witness.equals(entry.value, expected)) {
        counterexamples.push({
          seed,
          scenario,
          constructor: String(tag),
          index: index.name,
          expected,
          actual: entry.value,
        })
      }
    }
  }

  return {
    analyzeCoalgebra: <Seed>({
      seeds,
      coalgebra,
    }: {
      readonly seeds: ReadonlyArray<Seed>
      readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>
    }): ADTCoalgebraOracleReport<Constructors, Seed> => {
      const evaluator = unfold(coalgebra)
      const counterexamples: Array<ADTCoalgebraCounterexample<Constructors, Seed>> = []
      const failures: Array<ADTCoalgebraFailure<Seed>> = []

      for (const seed of seeds) {
        try {
          const actual = evaluator(seed)
          const step = coalgebra(seed)
          if (!step || typeof step !== "object") {
            failures.push({ seed, error: "Coalgebra must return an object with _tag and fields" })
            continue
          }

          const tag = step._tag as ConstructorName
          const fields = fieldsByConstructor[tag]
          if (!fields) {
            failures.push({ seed, error: `Coalgebra returned unknown constructor tag ${String(step._tag)}` })
            continue
          }

          const ctor = constructorFactories[tag]
          if (typeof ctor !== "function") {
            failures.push({ seed, error: `Missing constructor factory for tag ${String(tag)}` })
            continue
          }

          const provided = (step.fields ?? {}) as Record<string, unknown>
          const input: Record<string, unknown> = {}
          let fieldIssue = false

          for (const field of fields) {
            if (!(field.name in provided)) {
              failures.push({
                seed,
                error: `Coalgebra for ${String(tag)} is missing field ${String(field.name)}`,
              })
              fieldIssue = true
              break
            }

            if (field.recursion === 'self') {
              const recursiveSeed = provided[field.name] as Seed
              const nested = evaluator(recursiveSeed)
              input[field.name] = nested
            } else {
              input[field.name] = provided[field.name]
            }
          }

          if (fieldIssue) {
            continue
          }

          const expected = fields.length === 0
            ? (ctor as () => ADTValue<Constructors>)()
            : (ctor as (input: Record<string, unknown>) => ADTValue<Constructors>)(input)

          if (!equals(actual, expected)) {
            counterexamples.push({ seed, actual, expected })
          }
        } catch (error) {
          failures.push({
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      return {
        holds: counterexamples.length === 0 && failures.length === 0,
        counterexamples,
        failures,
        details: formatOracleDetails(
          counterexamples,
          failures,
          "All seeds reconstructed values consistent with the coalgebra.",
          "Coalgebra analysis",
        ),
      }
    },
    analyzeFoldUnfold: <Seed, Result>({
      seeds,
      coalgebra,
      algebra,
      resultWitness,
    }: {
      readonly seeds: ReadonlyArray<Seed>
      readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>
      readonly algebra: ADTFoldAlgebra<Constructors, Result>
      readonly resultWitness: TypeWitness<Result>
    }): ADTFoldUnfoldOracleReport<Result, Seed> => {
      const evaluator = unfold(coalgebra)
      const folder = fold(algebra)
      const counterexamples: Array<ADTFoldUnfoldCounterexample<Result, Seed>> = []
      const failures: Array<ADTFoldUnfoldFailure<Seed>> = []

      for (const seed of seeds) {
        try {
          const value = evaluator(seed)
          const step = coalgebra(seed)
          if (!step || typeof step !== "object") {
            failures.push({ seed, error: "Coalgebra must return an object with _tag and fields" })
            continue
          }

          const tag = step._tag as ConstructorName
          const fields = fieldsByConstructor[tag]
          if (!fields) {
            failures.push({ seed, error: `Coalgebra returned unknown constructor tag ${String(step._tag)}` })
            continue
          }

          const handler = algebra[tag as ConstructorName]
          if (typeof handler !== "function") {
            failures.push({ seed, error: `Missing algebra handler for constructor ${String(tag)}` })
            continue
          }

          const provided = (step.fields ?? {}) as Record<string, unknown>
          const processed: Record<string, unknown> = {}
          let fieldIssue = false

          for (const field of fields) {
            if (!(field.name in provided)) {
              failures.push({
                seed,
                error: `Coalgebra for ${String(tag)} is missing field ${String(field.name)}`,
              })
              fieldIssue = true
              break
            }

            if (field.recursion === 'self') {
              const recursiveSeed = provided[field.name] as Seed
              const nestedValue = evaluator(recursiveSeed)
              processed[field.name] = folder(nestedValue)
            } else {
              processed[field.name] = provided[field.name]
            }
          }

          if (fieldIssue) {
            continue
          }

          const expected = handler(
            processed as FoldFieldRecord<
              Extract<Constructors[number], { readonly name: typeof tag }>['fields'],
              Result
            >,
          )
          const actual = folder(value)

          if (!resultWitness.equals(actual, expected)) {
            counterexamples.push({ seed, actual, expected })
          }
        } catch (error) {
          failures.push({
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      return {
        holds: counterexamples.length === 0 && failures.length === 0,
        counterexamples,
        failures,
        details: formatOracleDetails(
          counterexamples,
          failures,
          "All seeds satisfied fold ∘ unfold composition for the supplied algebra and coalgebra.",
          "Fold/unfold analysis",
        ),
      }
    },
    analyzeTraversal: <Seed>({
      seeds,
      valueFromSeed,
      scenarios,
    }: {
      readonly seeds: ReadonlyArray<Seed>
      readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
      readonly scenarios: ReadonlyArray<ADTTraversalScenario<Constructors, Seed, any>>
    }): ADTTraversalOracleReport<Seed> => {
      const counterexamples: Array<ADTTraversalCounterexample<Seed>> = []
      const failures: Array<ADTTraversalFailure<Seed>> = []

      const evaluateScenario = (
        scenario: ADTTraversalScenario<Constructors, Seed, any>,
        value: ADTValue<Constructors>,
        seed: Seed,
      ): void => {
        try {
          const traverseInstance = traverse(scenario.applicative as SimpleApplicativeK1<any>)
          const actual = traverseInstance(
            scenario.handlers as ADTTraverseHandlers<Constructors, any>,
          )(value)
          const expected = (scenario.expected as (
            input: { value: ADTValue<Constructors>; seed: Seed }
          ) => EndofunctorValue<any, ADTValue<Constructors>> )({ value, seed })
          const witness = scenario.witness as TypeWitness<EndofunctorValue<any, ADTValue<Constructors>>>
          if (!witness.equals(actual, expected)) {
            counterexamples.push({
              scenario: scenario.id,
              seed,
              actual,
              expected,
            })
          }
        } catch (error) {
          failures.push({
            scenario: scenario.id,
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      for (const seed of seeds) {
        let value: ADTValue<Constructors>
        try {
          value = valueFromSeed(seed)
        } catch (error) {
          failures.push({
            scenario: 'valueFromSeed',
            seed,
            error: error instanceof Error ? error.message : String(error),
          })
          continue
        }

        for (const scenario of scenarios) {
          evaluateScenario(scenario as ADTTraversalScenario<Constructors, Seed, any>, value, seed)
        }
      }

      return {
        holds: counterexamples.length === 0 && failures.length === 0,
        counterexamples,
        failures,
        details: formatOracleDetails(
          counterexamples,
          failures,
          "All traversal scenarios satisfied the expected applicative behaviour.",
          'Traversal analysis',
        ),
      }
    },
    analyzeIndexes: <Seed>({
      seeds,
      valueFromSeed,
      scenarios = [],
    }: {
      readonly seeds: ReadonlyArray<Seed>
      readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
      readonly scenarios?: ReadonlyArray<ADTIndexScenario<Constructors, Seed>>
    }): ADTIndexOracleReport<Seed> => {
      const counterexamples: Array<ADTIndexCounterexample<Seed>> = []
      const failures: Array<ADTIndexFailure<Seed>> = []

      const context: ADTIndexScenarioContext<Constructors> = {
        constructors: constructorFactories,
        fold,
        map,
        unfold,
        traverse,
        sequence,
      }

      for (const seed of seeds) {
        let baseValue: ADTValue<Constructors>
        try {
          baseValue = valueFromSeed(seed)
        } catch (error) {
          failures.push({
            seed,
            scenario: 'valueFromSeed',
            error: error instanceof Error ? error.message : String(error),
          })
          continue
        }

        validateIndexesForValue(baseValue, seed, 'valueFromSeed', counterexamples, failures)

        for (const scenario of scenarios) {
          try {
            const produced = scenario.derive({
              seed,
              baseValue,
              context,
            })
            validateIndexesForValue(produced, seed, scenario.id, counterexamples, failures)
          } catch (error) {
            failures.push({
              seed,
              scenario: scenario.id,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      }

      return {
        holds: counterexamples.length === 0 && failures.length === 0,
        counterexamples,
        failures,
        details: formatOracleDetails(
          counterexamples,
          failures,
          'All inspected ADT values exposed correct index metadata.',
          'Index analysis',
        ),
      }
    },
  }
}

const realizeADT = <
  TypeName extends string,
  const Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  typeName: TypeName,
  constructorsList: Constructors,
): AlgebraicDataType<TypeName, Constructors> => {
  const constructors = buildADTConstructors(constructorsList)
  const match = deriveMatcher(constructorsList)
  const equals = deriveEquality(constructorsList)
  const indexDescriptors = buildIndexDescriptorRecord(constructorsList)
  const introspection = buildIntrospection(
    typeName,
    EMPTY_PARAMETER_LIST,
    constructorsList,
    indexDescriptors,
  ) as ADTIntrospection<TypeName, Constructors>
  const base = {
    typeName,
    constructors,
    match,
    equals,
    constructorsList,
    indexDescriptors,
    introspect: () => introspection,
  } as const

  const isRecursive = hasRecursiveFields(constructorsList)

  if (isRecursive) {
    const fold = buildADTFold(constructorsList)
    const unfold = buildADTUnfold(constructorsList, constructors)
    const map = buildADTMap(constructorsList, constructors)
    const traverse = buildADTTraverse(constructorsList, constructors)
    const sequence = buildADTSequence(constructorsList, constructors)
    const oracles = buildADTRecursionOracles(
      constructorsList,
      constructors,
      equals,
      fold,
      unfold,
      map,
      traverse,
      sequence,
      indexDescriptors,
    )
    const polynomial = buildADTPolynomial(typeName, constructorsList, constructors, {
      equals,
      recursion: { fold, unfold, map },
    })
    return {
      ...base,
      polynomial,
      fold,
      unfold,
      map,
      traverse,
      sequence,
      oracles,
    } as AlgebraicDataType<TypeName, Constructors>
  }

  const polynomial = buildADTPolynomial(typeName, constructorsList, constructors, {
    equals,
  })

  return {
    ...base,
    polynomial,
  } as AlgebraicDataType<TypeName, Constructors>
}

const isParameterField = <Name extends string, ParameterName extends string>(
  field: ADTFieldDescriptor<Name, ParameterName>,
): field is ADTParameterField<Name, ParameterName> =>
  Object.prototype.hasOwnProperty.call(field, 'parameter')

const ensureNoParameterFieldsWithoutDefinitions = (
  typeName: string,
  constructors: ReadonlyArray<ADTConstructorFamily<string, any, readonly ADTFieldDescriptor<string, any>[]>>,
): void => {
  for (const ctor of constructors) {
    for (const field of ctor.fields) {
      if (isParameterField(field)) {
        throw new Error(
          `ADT ${typeName} references parameter ${String(field.parameter)} in constructor ${String(
            ctor.name,
          )} but no parameters were declared`,
        )
      }
    }
  }
}

const validateParameterDefinitions = (
  typeName: string,
  parameters: readonly ADTParameter<string>[],
): ReadonlySet<string> => {
  const seen = new Set<string>()
  for (const parameter of parameters) {
    if (seen.has(parameter.name)) {
      throw new Error(`ADT ${typeName} declares duplicate parameter name ${String(parameter.name)}`)
    }
    seen.add(parameter.name)
  }
  return seen
}

const ensureParameterUsageValid = (
  typeName: string,
  constructors: ReadonlyArray<ADTConstructorFamily<string, any, readonly ADTFieldDescriptor<string, any>[]>>,
  parameterNames: ReadonlySet<string>,
): void => {
  for (const ctor of constructors) {
    for (const field of ctor.fields) {
      if (isParameterField(field) && !parameterNames.has(field.parameter)) {
        throw new Error(
          `Constructor ${String(ctor.name)} in ADT ${typeName} references unknown parameter ${String(
            field.parameter,
          )}`,
        )
      }
    }
  }
}

const validateParameterWitnesses = (
  typeName: string,
  parameterNames: ReadonlySet<string>,
  witnesses: Record<string, TypeWitness<unknown>>,
): void => {
  for (const name of parameterNames) {
    if (!Object.prototype.hasOwnProperty.call(witnesses, name)) {
      throw new Error(`ADT ${typeName} is missing an equality witness for parameter ${String(name)}`)
    }
  }
  for (const provided of Object.keys(witnesses)) {
    if (!parameterNames.has(provided)) {
      throw new Error(
        `ADT ${typeName} received an equality witness for unknown parameter ${String(provided)}`,
      )
    }
  }
}

const resolveField = <
  Name extends string,
  ParameterName extends string,
>(
  typeName: string,
  field: ADTFieldDescriptor<Name, ParameterName>,
  witnesses: Record<string, TypeWitness<unknown>>,
  parameterNames: ReadonlySet<string>,
): ADTField<Name, unknown> => {
  if (!isParameterField(field)) {
    return field
  }

  const parameter = field.parameter
  if (!parameterNames.has(parameter)) {
    throw new Error(
      `Constructor field ${String(field.name)} in ADT ${typeName} references unknown parameter ${String(parameter)}`,
    )
  }

  const witness = witnesses[parameter]
  if (!witness) {
    throw new Error(`Missing equality witness for parameter ${String(parameter)} in ADT ${typeName}`)
  }
  if (typeof witness.equals !== 'function') {
    throw new Error(`Witness for parameter ${String(parameter)} in ADT ${typeName} must provide an equals function`)
  }
  if (field.recursion === 'self') {
    throw new Error(
      `Parameter field ${String(field.name)} in ADT ${typeName} cannot declare recursion: "self"`,
    )
  }

  return {
    name: field.name,
    witness,
    ...(field.recursion ? { recursion: field.recursion } : {}),
  }
}

export function defineADT<
  TypeName extends string,
  const Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(definition: {
  readonly typeName: TypeName
  readonly constructors: Constructors
}): AlgebraicDataType<TypeName, Constructors>

export function defineADT<
  TypeName extends string,
  const Parameters extends ReadonlyArray<ADTParameter<string>>,
  const Constructors extends ReadonlyArray<
    ADTConstructorFamily<
      string,
      ParameterNames<Parameters>,
      readonly ADTFieldDescriptor<string, ParameterNames<Parameters>>[]
    >
  >,
>(definition: {
  readonly typeName: TypeName
  readonly parameters: Parameters
  readonly constructors: Constructors
}): ParameterizedAlgebraicDataType<TypeName, Parameters, Constructors>

export function defineADT<
  TypeName extends string,
  const MaybeParameters extends ReadonlyArray<ADTParameter<string>> | undefined,
  const Constructors extends ReadonlyArray<
    ADTConstructorFamily<
      string,
      ParameterNames<NormalizeParameters<MaybeParameters>>,
      readonly ADTFieldDescriptor<string, ParameterNames<NormalizeParameters<MaybeParameters>>>[]
    >
  >,
>(definition: {
  readonly typeName: TypeName
  readonly parameters?: MaybeParameters
  readonly constructors: Constructors
}): any {
  if (definition.constructors.length === 0) {
    throw new Error(`ADT ${definition.typeName} must have at least one constructor`)
  }

  const constructors = definition.constructors
  type ParameterList = NormalizeParameters<MaybeParameters>
  const parameters = definition.parameters as ParameterList

  if (!parameters || parameters.length === 0) {
    ensureNoParameterFieldsWithoutDefinitions(definition.typeName, constructors)
    return realizeADT(
      definition.typeName,
      constructors as ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
    )
  }

  const declaredParameters = snapshotParameters(parameters)
  const parameterNames = validateParameterDefinitions(definition.typeName, declaredParameters)
  ensureParameterUsageValid(definition.typeName, constructors, parameterNames)

  const familyIndexDescriptors = buildIndexDescriptorRecord(constructors)
  const introspection = buildIntrospection(
    definition.typeName,
    declaredParameters,
    constructors,
    familyIndexDescriptors,
  ) as ParameterizedADTIntrospection<TypeName, ParameterList, Constructors>

  const instantiate = <
    ParameterTypes extends ADTParameterMap<ParameterList>,
  >(
    witnessRecord: ADTParameterWitnessRecord<ParameterList, ParameterTypes>,
  ): AlgebraicDataType<TypeName, InstantiateConstructors<Constructors, ParameterTypes>> => {
    const witnesses = witnessRecord as unknown as Record<string, TypeWitness<unknown>>
    validateParameterWitnesses(definition.typeName, parameterNames, witnesses)

    const resolvedConstructors = constructors.map((ctor) => ({
      name: ctor.name,
      fields: ctor.fields.map((field) =>
        resolveField(definition.typeName, field, witnesses, parameterNames),
      ),
      ...(ctor.indexes ? { indexes: ctor.indexes } : {}),
    })) as unknown as InstantiateConstructors<Constructors, ParameterTypes>

    return realizeADT(definition.typeName, resolvedConstructors)
  }

  return {
    typeName: definition.typeName,
    parameters: declaredParameters,
    indexDescriptors: familyIndexDescriptors,
    instantiate,
    introspect: () => introspection,
  } as ParameterizedAlgebraicDataType<TypeName, ParameterList, Constructors>
}

export const witnessFromEquals = <A>(equals: (left: A, right: A) => boolean): TypeWitness<A> => ({
  equals,
})

export const primitiveStrictEqualsWitness = <A>(): TypeWitness<A> => ({
  equals: (left, right) => left === right,
})

export const parameterField = <Name extends string, ParameterName extends string>(
  name: Name,
  parameter: ParameterName,
  options?: { readonly recursion?: Exclude<ADTRecursionKind, 'self'> },
): ADTParameterField<Name, ParameterName> =>
  options?.recursion
    ? { name, parameter, recursion: options.recursion }
    : { name, parameter }

const ensureIndexPresence = (
  value: ADTIndexMetadata,
  indexName: string,
  tag: unknown,
): ADTIndexEntry => {
  if (!Object.prototype.hasOwnProperty.call(value, indexName)) {
    throw new Error(
      `ADT value ${String(tag ?? 'unknown')} does not define index ${String(indexName)}`,
    )
  }
  return value[indexName]!
}

export const getADTIndex = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  IndexName extends string,
>(value: ADTValue<Constructors>, indexName: IndexName): unknown => {
  const metadata = readIndexMetadata(value)
  return ensureIndexPresence(metadata, indexName, (value as { readonly _tag?: unknown })._tag).value
}

export const getADTIndexWitness = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  IndexName extends string,
>(value: ADTValue<Constructors>, indexName: IndexName): TypeWitness<unknown> => {
  const metadata = readIndexMetadata(value)
  return ensureIndexPresence(metadata, indexName, (value as { readonly _tag?: unknown })._tag)
    .witness
}

export const analyzeADTCoalgebra = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: RecursiveAlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>
  },
): ADTCoalgebraOracleReport<Constructors, Seed> => adt.oracles.analyzeCoalgebra(input)

export const analyzeADTFoldUnfold = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
  Result,
>(
  adt: RecursiveAlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>
    readonly algebra: ADTFoldAlgebra<Constructors, Result>
    readonly resultWitness: TypeWitness<Result>
  },
): ADTFoldUnfoldOracleReport<Result, Seed> => adt.oracles.analyzeFoldUnfold(input)

export const analyzeADTTraversal = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: RecursiveAlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTTraversalScenario<Constructors, Seed, any>>
  },
): ADTTraversalOracleReport<Seed> => adt.oracles.analyzeTraversal(input)

export const analyzeADTIndexes = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: RecursiveAlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios?: ReadonlyArray<ADTIndexScenario<Constructors, Seed>>
  },
): ADTIndexOracleReport<Seed> => adt.oracles.analyzeIndexes(input)

export const analyzeADTPolynomialRoundtrip = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: AlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
  },
): ADTPolynomialRoundtripOracleReport<Constructors, Seed> =>
  adt.polynomial.oracles.analyzeRoundtrip(input)

export const analyzeADTPolynomialMap = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: AlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTPolynomialMapScenario<Constructors, Seed, any>>
  },
): ADTPolynomialMapOracleReport<Seed> => adt.polynomial.oracles.analyzeMapPositions(input)

export const analyzeADTPolynomialRecursion = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: RecursiveAlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<ADTPolynomialRecursionScenario<Constructors, Seed>>
  },
): ADTPolynomialRecursionOracleReport<Constructors, Seed> => {
  const analyze = adt.polynomial.oracles.analyzeRecursion
  if (!analyze) {
    throw new Error(`Polynomial recursion oracle unavailable for non-recursive ADT ${adt.typeName}`)
  }
  return analyze(input)
}

export const analyzeADTPolynomialContainerIdentity = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: AlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
  },
): ADTPolynomialContainerIdentityOracleReport<Constructors, Seed> =>
  adt.polynomial.container.oracles.analyzeFunctorIdentity(input)

export const analyzeADTPolynomialContainerComposition = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: AlgebraicDataType<TypeName, Constructors>,
  input: {
    readonly seeds: ReadonlyArray<Seed>
    readonly valueFromSeed: (seed: Seed) => ADTValue<Constructors>
    readonly scenarios: ReadonlyArray<
      ADTPolynomialContainerCompositionScenario<Constructors, Seed, any, any>
    >
  },
): ADTPolynomialContainerCompositionOracleReport<Constructors, Seed> =>
  adt.polynomial.container.oracles.analyzeFunctorComposition(input)
