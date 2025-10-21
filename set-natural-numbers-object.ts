import { CategoryLimits } from "./stdlib/category-limits";
import { ArrowFamilies } from "./stdlib/arrow-families";
import type { Category } from "./stdlib/category";
import { SetCat, type SetHom, type SetObj, type SetTerminalObject } from "./set-cat";

type AnySetObj = SetObj<unknown>;
type AnySetHom = SetHom<unknown, unknown>;

type NaturalNumbersSequence = CategoryLimits.NaturalNumbersObjectSequence<AnySetObj, AnySetHom>;
type NaturalNumbersMediator = CategoryLimits.NaturalNumbersObjectMediatorWitness<AnySetHom>;

const NATURAL_NUMBERS_TAG = "SetNaturalNumbers";

const terminalData = SetCat.terminal();
const terminalObj = terminalData.object;
const terminalPoint: SetTerminalObject = (() => {
  const iterator = terminalObj.values().next();
  if (iterator.done) {
    throw new Error("SetNaturalNumbersObject: terminal object must expose a unique point.");
  }
  return iterator.value as SetTerminalObject;
})();

const naturalNumbersCarrier: SetObj<number> = SetCat.lazyObj<number>({
  iterate: function* iterate(): IterableIterator<number> {
    let index = 0;
    while (true) {
      yield index;
      index += 1;
    }
  },
  has: value => Number.isInteger(value) && value >= 0,
  tag: NATURAL_NUMBERS_TAG,
});

const ensureNatural = (value: number, context: string): number => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${context}: expected a natural number, received ${String(value)}.`);
  }
  return value;
};

const successorArrow: SetHom<number, number> = {
  dom: naturalNumbersCarrier,
  cod: naturalNumbersCarrier,
  map: value => {
    const input = ensureNatural(value, "SetNaturalNumbersObject.successor");
    return input + 1;
  },
};

const zeroArrow = SetCat.hom(terminalObj, naturalNumbersCarrier, () => 0);

const validateSequence = (sequence: NaturalNumbersSequence): void => {
  const { target, zero, successor } = sequence;

  if (zero.dom !== terminalObj) {
    throw new Error(
      "SetNaturalNumbersObject.induce: zero arrow must originate from the terminal object.",
    );
  }
  if (zero.cod !== target) {
    throw new Error("SetNaturalNumbersObject.induce: zero arrow must land in the target object.");
  }
  if (successor.dom !== target || successor.cod !== target) {
    throw new Error(
      "SetNaturalNumbersObject.induce: successor arrow must be an endomorphism on the target object.",
    );
  }
};

const buildMediatorMap = (sequence: NaturalNumbersSequence): ((index: number) => unknown) => {
  const { target, zero, successor } = sequence;
  const cache = new Map<number, unknown>();

  const zeroImage = zero.map(terminalPoint);
  if (!target.has(zeroImage)) {
    throw new Error("SetNaturalNumbersObject.induce: zero image must belong to the target carrier.");
  }
  cache.set(0, zeroImage);

  const compute = (index: number): unknown => {
    const step = ensureNatural(index, "SetNaturalNumbersObject.induce");
    const known = cache.get(step);
    if (known !== undefined) {
      return known;
    }

    const predecessor = compute(step - 1);
    const image = successor.map(predecessor);
    if (!target.has(image)) {
      throw new Error(
        "SetNaturalNumbersObject.induce: successor image must remain within the target carrier.",
      );
    }
    cache.set(step, image);
    return image;
  };

  return compute;
};

const createMediator = (
  sequence: NaturalNumbersSequence,
  map: (index: number) => unknown,
): SetHom<number, unknown> => ({
  dom: naturalNumbersCarrier,
  cod: sequence.target,
  map: value => {
    const input = ensureNatural(value, "SetNaturalNumbersObject.mediator");
    const image = map(input);
    if (!sequence.target.has(image)) {
      throw new Error(
        "SetNaturalNumbersObject.induce: mediator image must land in the declared target.",
      );
    }
    return image;
  },
});

const naturalNumbersWitness: CategoryLimits.NaturalNumbersObjectWitness<AnySetObj, AnySetHom> = {
  carrier: naturalNumbersCarrier as AnySetObj,
  zero: zeroArrow as AnySetHom,
  successor: successorArrow as AnySetHom,
  induce: (sequence: NaturalNumbersSequence): NaturalNumbersMediator => {
    validateSequence(sequence);
    const mediatorMap = buildMediatorMap(sequence);
    const mediator = createMediator(sequence, mediatorMap) as AnySetHom;
    const compatibility = CategoryLimits.naturalNumbersObjectCompatibility({
      category: SetCat as Category<AnySetObj, AnySetHom> & ArrowFamilies.HasDomCod<AnySetObj, AnySetHom>,
      natural: naturalNumbersWitness,
      sequence,
      mediator,
    });
    return { mediator, compatibility };
  },
};

export const SetNaturalNumbersObject = {
  ...naturalNumbersWitness,
  carrier: naturalNumbersCarrier,
  zero: zeroArrow,
  successor: successorArrow,
} as CategoryLimits.NaturalNumbersObjectWitness<AnySetObj, AnySetHom> & {
  readonly carrier: SetObj<number>;
  readonly zero: SetHom<SetTerminalObject, number>;
  readonly successor: SetHom<number, number>;
};

export type SetNaturalNumbersSequence = NaturalNumbersSequence;

