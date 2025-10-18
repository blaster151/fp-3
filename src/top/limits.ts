export type LegKind = "cone" | "cocone";

export interface LimitLeg<Arrow, Metadata = unknown> {
  readonly kind: LegKind;
  readonly name: string;
  readonly arrow?: Arrow;
  readonly metadata?: Metadata;
}

export interface Mediator<Arrow, Metadata = unknown> {
  readonly name: string;
  readonly arrow?: Arrow;
  readonly metadata?: Metadata;
}

export interface LegCheckResult<Arrow, Metadata = unknown> {
  readonly leg: LimitLeg<Arrow, Metadata>;
  readonly holds: boolean;
  readonly failure?: string;
  readonly metadata?: Metadata;
}

export interface MediatorCheckResult<Arrow, Metadata = unknown> {
  readonly mediator: Mediator<Arrow, Metadata>;
  readonly holds: boolean;
  readonly failure?: string;
  readonly metadata?: Metadata;
}

export interface UniversalPropertyReport<
  LegArrow,
  MediatorArrow,
  LegMetadata = unknown,
  MediatorMetadata = unknown,
> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<string>;
  readonly legs: ReadonlyArray<LegCheckResult<LegArrow, LegMetadata>>;
  readonly mediators: ReadonlyArray<MediatorCheckResult<MediatorArrow, MediatorMetadata>>;
}

const formatLegLabel = (leg: LimitLeg<unknown>): string => {
  const role = leg.kind === "cocone" ? "cocone leg" : "cone leg";
  return `${role} ${leg.name}`;
};

const formatMediatorLabel = (mediator: Mediator<unknown>): string => `mediator ${mediator.name}`;

export const coneLeg = <Arrow, Metadata = unknown>(
  name: string,
  arrow?: Arrow,
  metadata?: Metadata,
): LimitLeg<Arrow, Metadata> => ({
  kind: "cone",
  name,
  ...(arrow !== undefined && { arrow }),
  ...(metadata !== undefined && { metadata }),
});

export const coconeLeg = <Arrow, Metadata = unknown>(
  name: string,
  arrow?: Arrow,
  metadata?: Metadata,
): LimitLeg<Arrow, Metadata> => ({
  kind: "cocone",
  name,
  ...(arrow !== undefined && { arrow }),
  ...(metadata !== undefined && { metadata }),
});

export const makeMediator = <Arrow, Metadata = unknown>(
  name: string,
  arrow?: Arrow,
  metadata?: Metadata,
): Mediator<Arrow, Metadata> => ({
  name,
  ...(arrow !== undefined && { arrow }),
  ...(metadata !== undefined && { metadata }),
});

export const makeUniversalPropertyReport = <
  LegArrow,
  MediatorArrow,
  LegMetadata = unknown,
  MediatorMetadata = unknown,
>(
  input: Readonly<{
    legs?: ReadonlyArray<LegCheckResult<LegArrow, LegMetadata>>;
    mediators?: ReadonlyArray<MediatorCheckResult<MediatorArrow, MediatorMetadata>>;
  }>,
): UniversalPropertyReport<LegArrow, MediatorArrow, LegMetadata, MediatorMetadata> => {
  const legs: ReadonlyArray<LegCheckResult<LegArrow, LegMetadata>> = input.legs ?? [];
  const mediators: ReadonlyArray<MediatorCheckResult<MediatorArrow, MediatorMetadata>> =
    input.mediators ?? [];

  const failures: string[] = [];
  legs.forEach((entry) => {
    if (!entry.holds) {
      const label = formatLegLabel(entry.leg);
      failures.push(entry.failure ?? `${label} failed.`);
    }
  });
  mediators.forEach((entry) => {
    if (!entry.holds) {
      const label = formatMediatorLabel(entry.mediator);
      failures.push(entry.failure ?? `${label} failed.`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    legs,
    mediators,
  } satisfies UniversalPropertyReport<LegArrow, MediatorArrow, LegMetadata, MediatorMetadata>;
};
