export type SkeletalPolicy = "error" | "warn" | "ignore"

export interface IsoWitness<Arr> {
  readonly forward: Arr
  readonly backward: Arr
}

export interface SkeletalViolation<Obj> {
  readonly left: Obj
  readonly right: Obj
  readonly message: string
}

export interface IsoRegistryOptions<Obj> {
  readonly objects?: Iterable<Obj>
  readonly isSkeletal?: boolean
  readonly skeletalPolicy?: SkeletalPolicy
  readonly onSkeletalViolation?: (info: SkeletalViolation<Obj>) => void
}
