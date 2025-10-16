import type {
  OracleReport,
  UniqueFromEmptyWitness,
  EmptyByHomsWitness,
  SingletonByHomsWitness,
  ElementsAsArrowsWitness,
  SetProductWitness,
  SetProductSampleSpec,
  SetCoproductWitness,
  SetCoproductSampleSpec,
} from "./oracles/set-oracles";
import { SetOracles } from "./oracles/set-oracles";
import type { AnySet } from "./set-cat";

type UniqueFromEmptyReport = ReturnType<(typeof SetOracles.uniqueFromEmpty)["check"]>;
type EmptyByHomsReport = ReturnType<(typeof SetOracles.emptyByHoms)["check"]>;
type SingletonByHomsReport = ReturnType<(typeof SetOracles.singletonByHoms)["check"]>;
type ElementsAsArrowsReport = ReturnType<(typeof SetOracles.elementsAsArrows)["check"]>;

const uniqueFromEmpty = <Y>(codomain: AnySet<Y>): UniqueFromEmptyReport =>
  SetOracles.uniqueFromEmpty.check(SetOracles.uniqueFromEmpty.witness(codomain));

const emptyByHoms = <E>(
  candidate: AnySet<E>,
  nonemptySamples: ReadonlyArray<AnySet<unknown>> = [],
): EmptyByHomsReport =>
  SetOracles.emptyByHoms.check(SetOracles.emptyByHoms.witness(candidate, nonemptySamples));

const singletonByHoms = <S>(
  candidate: AnySet<S>,
  universeSamples: ReadonlyArray<AnySet<unknown>> = [],
): SingletonByHomsReport =>
  SetOracles.singletonByHoms.check(SetOracles.singletonByHoms.witness(candidate, universeSamples));

const elementsAsArrows = <A>(carrier: AnySet<A>): ElementsAsArrowsReport =>
  SetOracles.elementsAsArrows.check(SetOracles.elementsAsArrows.witness(carrier));

export const SetLaws = {
  uniqueFromEmpty,
  emptyByHoms,
  singletonByHoms,
  elementsAsArrows,
  product: SetOracles.product,
  coproduct: SetOracles.coproduct,
  oracles: SetOracles,
};

export type {
  AnySet,
  OracleReport,
  UniqueFromEmptyWitness,
  EmptyByHomsWitness,
  SingletonByHomsWitness,
  ElementsAsArrowsWitness,
  SetProductWitness,
  SetProductSampleSpec,
  SetCoproductWitness,
  SetCoproductSampleSpec,
};
