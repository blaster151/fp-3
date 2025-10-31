import {
  buildDayPairingData,
  type ChuSpace,
  type ChuSpaceFromDayPairingInput,
  type DayPairingContribution,
  type DayPairingAggregator,
  type IndexedElement,
} from "../chu-space";
import { getCarrierSemantics, type SetObj } from "../set-cat";

const DEFAULT_PAIR_LIMIT = 4096;
const MAX_RECORDED_FAILURES = 8;

const enumerate = <A>(carrier: SetObj<A>): ReadonlyArray<A> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier);
};

export interface DayChuPairingSample<Obj, Arr, Left, Right, Value> {
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly contributions: ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>;
  readonly value: Value;
}

export interface DayChuPairingFailure<Obj, Left, Right, Value> {
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly value: Value;
}

export interface AnalyzeDayChuPairingOptions<Obj, Left, Right> {
  readonly primalSample?: ReadonlyArray<IndexedElement<Obj, Left>>;
  readonly dualSample?: ReadonlyArray<IndexedElement<Obj, Right>>;
  readonly pairLimit?: number;
}

export interface DayChuPairingAnalysis<Obj, Arr, Left, Right, Value> {
  readonly space: ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value>;
  readonly samples: ReadonlyArray<DayChuPairingSample<Obj, Arr, Left, Right, Value>>;
  readonly failures: ReadonlyArray<DayChuPairingFailure<Obj, Left, Right, Value>>;
  readonly checkedPairs: number;
  readonly truncated: boolean;
  readonly holds: boolean;
}

export const analyzeDayChuPairing = <Obj, Arr, Left, Right, Value>(
  input: ChuSpaceFromDayPairingInput<Obj, Arr, Left, Right, Value>,
  options: AnalyzeDayChuPairingOptions<Obj, Left, Right> = {},
): DayChuPairingAnalysis<Obj, Arr, Left, Right, Value> => {
  const data = buildDayPairingData(input);
  const { space } = data;

  const primalElements = options.primalSample ?? enumerate(data.primalCarrier);
  const dualElements = options.dualSample ?? enumerate(data.dualCarrier);
  const pairLimit = options.pairLimit ?? DEFAULT_PAIR_LIMIT;

  const samples: Array<DayChuPairingSample<Obj, Arr, Left, Right, Value>> = [];
  const failures: Array<DayChuPairingFailure<Obj, Left, Right, Value>> = [];

  const has =
    getCarrierSemantics(data.dualizing)?.has ?? ((value: Value) => data.dualizing.has(value));

  let checkedPairs = 0;
  let truncated = false;

  outer: for (const primal of primalElements) {
    for (const dual of dualElements) {
      checkedPairs += 1;
      if (checkedPairs > pairLimit) {
        truncated = true;
        break outer;
      }

      const contributions = data.collect(primal, dual);
      const value = data.aggregate(contributions);

      samples.push({ primal, dual, contributions, value });

      if (!has(value)) {
        if (failures.length < MAX_RECORDED_FAILURES) {
          failures.push({ primal, dual, value });
        } else {
          truncated = true;
          break outer;
        }
      }
    }
  }

  return {
    space,
    samples,
    failures,
    checkedPairs,
    truncated,
    holds: failures.length === 0,
  };
};

export const aggregateDayPairing = <Obj, Arr, Left, Right, Value>(
  aggregator: DayPairingAggregator<Obj, Arr, Left, Right, Value>,
  contributions: ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>,
): Value => aggregator(contributions);
