import type { FunctorComposablePair, FunctorWithWitness } from "./functor";
import { composeFunctors, constructFunctorWithWitness } from "./functor";
import type {
  NaturalTransformationConstructionOptions,
  NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  constructNaturalTransformationWithWitness,
  verticalCompositeNaturalTransformations,
  whiskerNaturalTransformationRight,
} from "./natural-transformation";
import type { SimpleCat } from "./simple-cat";
import { SetCat, type SetHom, type SetObj } from "./set-cat";

type AnySetObj = SetObj<unknown>;
type AnySetHom = SetHom<unknown, unknown>;

type DiscreteArrow<I> = { readonly kind: "Id"; readonly object: I };

interface DiscreteCategoryData<I> {
  readonly category: SimpleCat<I, DiscreteArrow<I>>;
  readonly objects: ReadonlyArray<I>;
  readonly arrows: ReadonlyArray<DiscreteArrow<I>>;
  readonly composablePairs: ReadonlyArray<FunctorComposablePair<DiscreteArrow<I>>>;
}

const buildDiscreteCategory = <I>(objects: ReadonlyArray<I>): DiscreteCategoryData<I> => {
  const arrows = objects.map((object) => ({ kind: "Id", object } as const));
  const category: SimpleCat<I, DiscreteArrow<I>> = {
    id: (object) => ({ kind: "Id", object }),
    compose: (g, f) => {
      if (!Object.is(g.object, f.object)) {
        throw new Error(
          `Discrete category: cannot compose identities on ${String(g.object)} and ${String(f.object)}`,
        );
      }
      return f;
    },
    src: (arrow) => arrow.object,
    dst: (arrow) => arrow.object,
  };
  const composablePairs = arrows.map((arrow) => ({ f: arrow, g: arrow }));
  return { category, objects, arrows, composablePairs };
};

const makeSetSimpleCategory = (): SimpleCat<AnySetObj, AnySetHom> => ({
  id: SetCat.id,
  compose: SetCat.compose,
  src: SetCat.dom,
  dst: SetCat.cod,
});

const equalsSetHom = (left: AnySetHom, right: AnySetHom): boolean => {
  if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
    return false;
  }
  for (const value of left.dom) {
    if (!Object.is(left.map(value), right.map(value))) {
      return false;
    }
  }
  return true;
};

export interface DiscreteKanExtensionInput<J, I, X> {
  readonly sourceObjects: ReadonlyArray<J>;
  readonly targetObjects: ReadonlyArray<I>;
  readonly reindex: (object: J) => I;
  readonly family: (object: J) => ReadonlyArray<X>;
}

interface LanElement<J, X> {
  readonly source: J;
  readonly value: X;
}

interface RanComponent<J, X> {
  readonly source: J;
  readonly value: X;
}

interface RanElement<J, X> {
  readonly components: ReadonlyArray<RanComponent<J, X>>;
}

const MAX_ENUM_DOMAIN = 10;
const MAX_ENUM_COMBINATIONS = 4096;

const DISCRETE_TERMINAL_OBJECT = "★" as const;

export type DiscreteTerminalObject = typeof DISCRETE_TERMINAL_OBJECT;

export interface DiscreteInclusionKanInput<J, I, X> {
  readonly ambientObjects: ReadonlyArray<I>;
  readonly subcategoryObjects: ReadonlyArray<J>;
  readonly inclusion: (object: J) => I;
  readonly family: (object: J) => ReadonlyArray<X>;
}

export interface DiscreteConstantKanInput<J, X> {
  readonly sourceObjects: ReadonlyArray<J>;
  readonly family: (object: J) => ReadonlyArray<X>;
}

const booleanKey = (values: ReadonlyArray<boolean>): string =>
  values.map((value) => (value ? "1" : "0")).join("");

const tupleKey = (values: ReadonlyArray<number>): string => values.join("|");

const buildFamilyIndexTuples = (lengths: ReadonlyArray<number>): ReadonlyArray<ReadonlyArray<number>> => {
  let tuples: Array<ReadonlyArray<number>> = [[]];
  for (const length of lengths) {
    const next: Array<ReadonlyArray<number>> = [];
    for (const prefix of tuples) {
      for (let index = 0; index < length; index += 1) {
        next.push([...prefix, index]);
      }
    }
    tuples = next;
  }
  return tuples;
};
interface Workspace<J, I, X> {
  readonly source: DiscreteCategoryData<J>;
  readonly target: DiscreteCategoryData<I>;
  readonly setCategory: SimpleCat<AnySetObj, AnySetHom>;
  readonly reindexing: FunctorWithWitness<J, DiscreteArrow<J>, I, DiscreteArrow<I>>;
  readonly diagram: FunctorWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly diagramObjects: ReadonlyMap<J, AnySetObj>;
  readonly fiberOrder: ReadonlyMap<I, ReadonlyArray<J>>;
  readonly fiberValues: ReadonlyMap<J, ReadonlyArray<X>>;
  readonly fiberIndex: ReadonlyMap<J, ReadonlyMap<X, number>>;
  readonly lanElements: ReadonlyMap<I, ReadonlyArray<LanElement<J, X>>>;
  readonly lanLookup: ReadonlyMap<I, ReadonlyMap<J, ReadonlyMap<X, LanElement<J, X>>>>;
  readonly lanObjects: ReadonlyMap<I, AnySetObj>;
  readonly ranElements: ReadonlyMap<I, ReadonlyArray<RanElement<J, X>>>;
  readonly ranLookup: ReadonlyMap<I, ReadonlyMap<string, RanElement<J, X>>>;
  readonly ranObjects: ReadonlyMap<I, AnySetObj>;
}

const prepareWorkspace = <J, I, X>(
  input: DiscreteKanExtensionInput<J, I, X>,
): Workspace<J, I, X> => {
  const source = buildDiscreteCategory(input.sourceObjects);
  const target = buildDiscreteCategory(input.targetObjects);
  const setCategory = makeSetSimpleCategory();

  const reindexing = constructFunctorWithWitness(
    source.category,
    target.category,
    {
      F0: input.reindex,
      F1: (arrow) => target.category.id(input.reindex(arrow.object)),
    },
    {
      objects: source.objects,
      arrows: source.arrows,
      composablePairs: source.composablePairs,
    },
    ["Discrete reindexing functor for Kan extensions."],
  );

  const fiberValues = new Map<J, ReadonlyArray<X>>();
  const fiberIndex = new Map<J, ReadonlyMap<X, number>>();
  for (const object of source.objects) {
    const values = input.family(object);
    fiberValues.set(object, values);
    const lookup = new Map<X, number>();
    values.forEach((value, index) => {
      lookup.set(value, index);
    });
    fiberIndex.set(object, lookup);
  }

  const diagramObjects = new Map<J, AnySetObj>();
  for (const object of source.objects) {
    const values = fiberValues.get(object) ?? [];
    diagramObjects.set(object, SetCat.obj(values));
  }

  const diagram = constructFunctorWithWitness(
    source.category,
    setCategory,
    {
      F0: (object) => diagramObjects.get(object)!,
      F1: (arrow) => {
        const carrier = diagramObjects.get(arrow.object)!;
        return SetCat.hom(carrier, carrier, (value: X) => value) as AnySetHom;
      },
    },
    {
      objects: source.objects,
      arrows: source.arrows,
      composablePairs: source.composablePairs,
    },
    ["Set-valued discrete diagram for Kan extension diagnostics."],
  );

  const fiberOrder = new Map<I, ReadonlyArray<J>>();
  for (const targetObject of target.objects) {
    const fiber = source.objects.filter((object) => Object.is(input.reindex(object), targetObject));
    fiberOrder.set(targetObject, fiber);
  }

  const lanElements = new Map<I, ReadonlyArray<LanElement<J, X>>>();
  const lanLookup = new Map<I, ReadonlyMap<J, ReadonlyMap<X, LanElement<J, X>>>>();
  const lanObjects = new Map<I, AnySetObj>();
  for (const targetObject of target.objects) {
    const fiber = fiberOrder.get(targetObject) ?? [];
    const elements: LanElement<J, X>[] = [];
    const lookupBySource = new Map<J, ReadonlyMap<X, LanElement<J, X>>>();
    for (const sourceObject of fiber) {
      const values = fiberValues.get(sourceObject) ?? [];
      const lookup = new Map<X, LanElement<J, X>>();
      values.forEach((value) => {
        const element: LanElement<J, X> = { source: sourceObject, value };
        elements.push(element);
        lookup.set(value, element);
      });
      lookupBySource.set(sourceObject, lookup);
    }
    lanElements.set(targetObject, elements);
    lanLookup.set(targetObject, lookupBySource);
    lanObjects.set(targetObject, SetCat.obj(elements));
  }

  const ranElements = new Map<I, ReadonlyArray<RanElement<J, X>>>();
  const ranLookup = new Map<I, ReadonlyMap<string, RanElement<J, X>>>();
  const ranObjects = new Map<I, AnySetObj>();
  for (const targetObject of target.objects) {
    const fiber = fiberOrder.get(targetObject) ?? [];
    const components: RanElement<J, X>[] = [];
    const lookup = new Map<string, RanElement<J, X>>();
    if (fiber.length === 0) {
      const element: RanElement<J, X> = { components: [] };
      components.push(element);
      lookup.set("", element);
    } else {
      const build = (index: number, acc: Array<RanComponent<J, X>>, keyParts: number[]): void => {
        if (index >= fiber.length) {
          const element: RanElement<J, X> = { components: acc.slice() };
          lookup.set(tupleKey(keyParts), element);
          components.push(element);
          return;
        }
        const sourceObject = fiber[index]!;
        const values = fiberValues.get(sourceObject) ?? [];
        const valueIndex = fiberIndex.get(sourceObject) ?? new Map();
        values.forEach((value, idx) => {
          acc.push({ source: sourceObject, value });
          keyParts.push(idx);
          build(index + 1, acc, keyParts);
          keyParts.pop();
          acc.pop();
        });
      };
      build(0, [], []);
    }
    ranElements.set(targetObject, components);
    ranLookup.set(targetObject, lookup);
    ranObjects.set(targetObject, SetCat.obj(components));
  }

  return {
    source,
    target,
    setCategory,
    reindexing,
    diagram,
    diagramObjects,
    fiberOrder,
    fiberValues,
    fiberIndex,
    lanElements,
    lanLookup,
    lanObjects,
    ranElements,
    ranLookup,
    ranObjects,
  };
};
export interface LeftKanExtensionFiberAnalysis<J, I> {
  readonly target: I;
  readonly fiberSources: ReadonlyArray<J>;
  readonly lanSize: number;
  readonly functionCount: number;
  readonly familyCount: number;
  readonly bijectionVerified: boolean;
  readonly skipped?: string;
}

export interface LeftKanExtensionAnalysis<J, I> {
  readonly fibers: ReadonlyArray<LeftKanExtensionFiberAnalysis<J, I>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

const enumerateBooleanTables = <T>(
  domain: ReadonlyArray<T>,
  lookup: ReadonlyMap<T, number>,
): ReadonlyArray<ReadonlyArray<boolean>> => {
  if (domain.length > MAX_ENUM_DOMAIN) {
    return [];
  }
  const tables: boolean[][] = [];
  const total = 1 << domain.length;
  for (let mask = 0; mask < total; mask += 1) {
    const table = domain.map((_, index) => ((mask >> index) & 1) === 1);
    tables.push(table);
  }
  return tables;
};

const analyzeLeft = <J, I, X>(workspace: Workspace<J, I, X>): LeftKanExtensionAnalysis<J, I> => {
  const fibers: LeftKanExtensionFiberAnalysis<J, I>[] = [];
  const details: string[] = [];
  let holds = true;

  for (const targetObject of workspace.target.objects) {
    const lanDomain = workspace.lanElements.get(targetObject) ?? [];
    const lanIndex = new Map<LanElement<J, X>, number>();
    lanDomain.forEach((element, index) => {
      lanIndex.set(element, index);
    });

    const lanTables = enumerateBooleanTables(lanDomain, lanIndex);
    if (lanTables.length === 0 && lanDomain.length > MAX_ENUM_DOMAIN) {
      fibers.push({
        target: targetObject,
        fiberSources: workspace.fiberOrder.get(targetObject) ?? [],
        lanSize: lanDomain.length,
        functionCount: 0,
        familyCount: 0,
        bijectionVerified: false,
        skipped: `Lan(${String(targetObject)}) domain too large for boolean enumeration (size ${lanDomain.length}).`,
      });
      details.push(`Skipped left Kan analysis at ${String(targetObject)} due to large Lan domain.`);
      holds = false;
      continue;
    }

    const fiberSources = workspace.fiberOrder.get(targetObject) ?? [];
    const fiberData = fiberSources.map((sourceObject) => {
      const values = workspace.fiberValues.get(sourceObject) ?? [];
      const lookup = workspace.fiberIndex.get(sourceObject) ?? new Map();
      const tables = enumerateBooleanTables(values, lookup);
      return { sourceObject, values, lookup, tables };
    });

    const truncated = fiberData.find((entry) => entry.tables.length === 0 && entry.values.length > MAX_ENUM_DOMAIN);
    if (truncated) {
      fibers.push({
        target: targetObject,
        fiberSources,
        lanSize: lanDomain.length,
        functionCount: lanTables.length,
        familyCount: 0,
        bijectionVerified: false,
        skipped: `Fiber at ${String(truncated.sourceObject)} too large for boolean enumeration (size ${truncated.values.length}).`,
      });
      details.push(`Skipped left Kan analysis at ${String(targetObject)} due to large fiber.`);
      holds = false;
      continue;
    }

    const familyCount = fiberData
      .map((entry) => entry.tables.length || 1)
      .reduce((acc, count) => acc * count, 1);

    if (familyCount > MAX_ENUM_COMBINATIONS) {
      fibers.push({
        target: targetObject,
        fiberSources,
        lanSize: lanDomain.length,
        functionCount: lanTables.length,
        familyCount,
        bijectionVerified: false,
        skipped: `Boolean family count ${familyCount} exceeds diagnostic budget at ${String(targetObject)}.`,
      });
      details.push(`Skipped left Kan bijection at ${String(targetObject)} because ${familyCount} families exceed limit.`);
      holds = false;
      continue;
    }

    const lanKeyToTable = new Map<string, ReadonlyArray<boolean>>();
    const lanKeyToIndex = new Map<string, number>();
    lanTables.forEach((table, index) => {
      const key = booleanKey(table);
      lanKeyToTable.set(key, table);
      lanKeyToIndex.set(key, index);
    });

    const fiberKeyLookups = fiberData.map((entry) => {
      const keyToTable = new Map<string, ReadonlyArray<boolean>>();
      entry.tables.forEach((table) => {
        keyToTable.set(booleanKey(table), table);
      });
      return keyToTable;
    });

    const fiberPosition = new Map<J, number>();
    fiberSources.forEach((sourceObject, index) => {
      fiberPosition.set(sourceObject, index);
    });

    const forwardImages = lanTables.map((lanTable) => {
      const selections: string[] = [];
      for (const [index, entry] of fiberData.entries()) {
        const truth: boolean[] = [];
        const lookupByValue = workspace.lanLookup.get(targetObject)?.get(entry.sourceObject) ?? new Map();
        for (const value of entry.values) {
          const element = lookupByValue.get(value);
          if (!element) {
            throw new Error("Left Kan analysis: missing lan element for fiber value");
          }
          const lanIndexPosition = lanIndex.get(element);
          if (lanIndexPosition === undefined) {
            throw new Error("Left Kan analysis: lan element missing from index lookup");
          }
          truth.push(lanTable[lanIndexPosition]!);
        }
        const key = booleanKey(truth);
        if (!fiberKeyLookups[index]!.has(key)) {
          return undefined;
        }
        selections.push(key);
      }
      return selections;
    });

    if (forwardImages.some((selection) => selection === undefined)) {
      fibers.push({
        target: targetObject,
        fiberSources,
        lanSize: lanDomain.length,
        functionCount: lanTables.length,
        familyCount,
        bijectionVerified: false,
      });
      holds = false;
      details.push(`Left Kan boolean mapping undefined at ${String(targetObject)}.`);
      continue;
    }

    const families = buildFamilyIndexTuples(fiberData.map((entry) => entry.tables.length || 1));

    const reconstructLanKey = (selection: ReadonlyArray<string>): string => {
      const truth = lanDomain.map((element) => {
        const position = fiberPosition.get(element.source);
        if (position === undefined) {
          throw new Error("Left Kan reconstruction: missing fiber position");
        }
        const key = selection[position]!;
        const table = fiberKeyLookups[position]!.get(key);
        if (!table) {
          throw new Error("Left Kan reconstruction: missing fiber table");
        }
        const values = workspace.fiberValues.get(element.source) ?? [];
        const valueLookup = workspace.fiberIndex.get(element.source) ?? new Map();
        const entryIndex = valueLookup.get(element.value);
        if (entryIndex === undefined) {
          throw new Error("Left Kan reconstruction: missing fiber index");
        }
        return table[entryIndex]!;
      });
      return booleanKey(truth);
    };

    const bijective = forwardImages.every((selection, index) => {
      const key = reconstructLanKey(selection!);
      const originalKey = booleanKey(lanTables[index]!);
      return key === originalKey;
    }) &&
      families.every((family) => {
        const selection = family.map((choice, idx) => {
          const table = fiberData[idx]!.tables[choice] ?? fiberData[idx]!.tables[0];
          return booleanKey(table ?? []);
        });
        const lanKey = reconstructLanKey(selection);
        if (!lanKeyToTable.has(lanKey)) {
          return false;
        }
        const forwardIndex = lanKeyToIndex.get(lanKey);
        if (forwardIndex === undefined) {
          return false;
        }
        const forward = forwardImages[forwardIndex];
        if (!forward) {
          return false;
        }
        const roundTrip = reconstructLanKey(forward);
        return roundTrip === lanKey;
      });

    fibers.push({
      target: targetObject,
      fiberSources,
      lanSize: lanDomain.length,
      functionCount: lanTables.length,
      familyCount,
      bijectionVerified: bijective,
    });

    if (!bijective) {
      details.push(`Left Kan boolean bijection failed at ${String(targetObject)}.`);
      holds = false;
    } else {
      details.push(
        `Left Kan boolean bijection verified at ${String(targetObject)} with ${lanTables.length} maps and ${familyCount} families.`,
      );
    }
  }

  return { fibers, holds, details };
};
export interface RightKanExtensionFiberAnalysis<J, I> {
  readonly target: I;
  readonly fiberSources: ReadonlyArray<J>;
  readonly ranSize: number;
  readonly functionCount: number;
  readonly familyCount: number;
  readonly bijectionVerified: boolean;
  readonly skipped?: string;
}

export interface RightKanExtensionAnalysis<J, I> {
  readonly fibers: ReadonlyArray<RightKanExtensionFiberAnalysis<J, I>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

interface BoolFunction<T> {
  readonly values: readonly [T, T];
  readonly key: string;
}

const enumerateBoolFunctions = <T>(
  codomain: ReadonlyArray<T>,
  lookup: ReadonlyMap<T, number>,
): ReadonlyArray<BoolFunction<T>> => {
  const functions: BoolFunction<T>[] = [];
  for (const left of codomain) {
    const leftIndex = lookup.get(left);
    if (leftIndex === undefined) {
      continue;
    }
    for (const right of codomain) {
      const rightIndex = lookup.get(right);
      if (rightIndex === undefined) {
        continue;
      }
      functions.push({
        values: [left, right],
        key: tupleKey([leftIndex, rightIndex]),
      });
    }
  }
  return functions;
};

const analyzeRight = <J, I, X>(workspace: Workspace<J, I, X>): RightKanExtensionAnalysis<J, I> => {
  const fibers: RightKanExtensionFiberAnalysis<J, I>[] = [];
  const details: string[] = [];
  let holds = true;

  for (const targetObject of workspace.target.objects) {
    const ranDomain = workspace.ranElements.get(targetObject) ?? [];
    const ranIndex = new Map<RanElement<J, X>, number>();
    ranDomain.forEach((element, index) => {
      ranIndex.set(element, index);
    });

    const ranFunctions: BoolFunction<RanElement<J, X>>[] = [];
    for (const first of ranDomain) {
      const firstIndex = ranIndex.get(first);
      if (firstIndex === undefined) {
        continue;
      }
      for (const second of ranDomain) {
        const secondIndex = ranIndex.get(second);
        if (secondIndex === undefined) {
          continue;
        }
        ranFunctions.push({
          values: [first, second],
          key: tupleKey([firstIndex, secondIndex]),
        });
      }
    }

    if (ranFunctions.length > MAX_ENUM_COMBINATIONS) {
      fibers.push({
        target: targetObject,
        fiberSources: workspace.fiberOrder.get(targetObject) ?? [],
        ranSize: ranDomain.length,
        functionCount: ranFunctions.length,
        familyCount: 0,
        bijectionVerified: false,
        skipped: `bool→Ran enumeration exceeded budget (${ranFunctions.length} functions).`,
      });
      details.push(`Skipped right Kan analysis at ${String(targetObject)} due to many bool→Ran maps.`);
      holds = false;
      continue;
    }

    const fiberSources = workspace.fiberOrder.get(targetObject) ?? [];
    const fiberData = fiberSources.map((sourceObject) => {
      const values = workspace.fiberValues.get(sourceObject) ?? [];
      const lookup = workspace.fiberIndex.get(sourceObject) ?? new Map();
      const functions = enumerateBoolFunctions(values, lookup);
      return { sourceObject, values, lookup, functions };
    });

    const truncated = fiberData.find((entry) => entry.functions.length > MAX_ENUM_COMBINATIONS);
    if (truncated) {
      fibers.push({
        target: targetObject,
        fiberSources,
        ranSize: ranDomain.length,
        functionCount: ranFunctions.length,
        familyCount: 0,
        bijectionVerified: false,
        skipped: `bool→F(${String(truncated.sourceObject)}) enumeration exceeded budget (${truncated.functions.length}).`,
      });
      details.push(`Skipped right Kan analysis at ${String(targetObject)} due to large fiber enumeration.`);
      holds = false;
      continue;
    }

    const familyCount = fiberData
      .map((entry) => entry.functions.length || 1)
      .reduce((acc, count) => acc * count, 1);

    if (familyCount > MAX_ENUM_COMBINATIONS) {
      fibers.push({
        target: targetObject,
        fiberSources,
        ranSize: ranDomain.length,
        functionCount: ranFunctions.length,
        familyCount,
        bijectionVerified: false,
        skipped: `bool→F families (${familyCount}) exceed diagnostic budget at ${String(targetObject)}.`,
      });
      details.push(`Skipped right Kan bijection at ${String(targetObject)} because family count exceeds limit.`);
      holds = false;
      continue;
    }

    const fiberKeyLookups = fiberData.map((entry) => {
      const keyToFunction = new Map<string, BoolFunction<X>>();
      entry.functions.forEach((fn) => {
        keyToFunction.set(fn.key, fn);
      });
      return keyToFunction;
    });

    const fiberPosition = new Map<J, number>();
    fiberSources.forEach((sourceObject, index) => {
      fiberPosition.set(sourceObject, index);
    });

    const forwardSelections = ranFunctions.map((fn) => {
      const selections: string[] = [];
      for (const [index, entry] of fiberData.entries()) {
        const lookup = fiberKeyLookups[index]!;
        const falseComponent = fn.values[0]?.components.find((component) =>
          Object.is(component.source, entry.sourceObject),
        );
        const trueComponent = fn.values[1]?.components.find((component) =>
          Object.is(component.source, entry.sourceObject),
        );
        if (!falseComponent || !trueComponent) {
          return undefined;
        }
        const falseIndex = entry.lookup.get(falseComponent.value);
        const trueIndex = entry.lookup.get(trueComponent.value);
        if (falseIndex === undefined || trueIndex === undefined) {
          return undefined;
        }
        const key = tupleKey([falseIndex, trueIndex]);
        if (!lookup.has(key)) {
          return undefined;
        }
        selections.push(key);
      }
      return selections;
    });

    if (forwardSelections.some((selection) => selection === undefined)) {
      fibers.push({
        target: targetObject,
        fiberSources,
        ranSize: ranDomain.length,
        functionCount: ranFunctions.length,
        familyCount,
        bijectionVerified: false,
      });
      details.push(`Right Kan boolean mapping undefined at ${String(targetObject)}.`);
      holds = false;
      continue;
    }

    const families = buildFamilyIndexTuples(fiberData.map((entry) => entry.functions.length || 1));

    const ranKeyToIndex = new Map<string, number>();
    ranFunctions.forEach((fn, index) => {
      ranKeyToIndex.set(fn.key, index);
    });

    const reconstructRanKey = (selection: ReadonlyArray<string>): string => {
      const falseParts: number[] = [];
      const trueParts: number[] = [];
      for (const [index, key] of selection.entries()) {
        const fn = fiberKeyLookups[index]!.get(key);
        if (!fn) {
          throw new Error("Right Kan reconstruction: missing fiber function");
        }
        const entry = fiberData[index]!;
        const falseIndex = entry.lookup.get(fn.values[0]);
        const trueIndex = entry.lookup.get(fn.values[1]);
        if (falseIndex === undefined || trueIndex === undefined) {
          throw new Error("Right Kan reconstruction: missing fiber index");
        }
        falseParts.push(falseIndex);
        trueParts.push(trueIndex);
      }
      const ranLookup = workspace.ranLookup.get(targetObject) ?? new Map();
      const falseElement = ranLookup.get(tupleKey(falseParts));
      const trueElement = ranLookup.get(tupleKey(trueParts));
      if (!falseElement || !trueElement) {
        throw new Error("Right Kan reconstruction: missing Ran element for tuple");
      }
      const falseIndex = ranIndex.get(falseElement);
      const trueIndex = ranIndex.get(trueElement);
      if (falseIndex === undefined || trueIndex === undefined) {
        throw new Error("Right Kan reconstruction: missing Ran index");
      }
      return tupleKey([falseIndex, trueIndex]);
    };

    const bijective = forwardSelections.every((selection, index) => {
      const key = reconstructRanKey(selection!);
      const originalKey = ranFunctions[index]!.key;
      return key === originalKey;
    }) &&
      families.every((family) => {
        const selection = family.map((choice, idx) => {
          const fn = fiberData[idx]!.functions[choice] ?? fiberData[idx]!.functions[0];
          return fn?.key ?? "";
        });
        const ranKey = reconstructRanKey(selection);
        const forwardIndex = ranKeyToIndex.get(ranKey);
        if (forwardIndex === undefined) {
          return false;
        }
        const forward = forwardSelections[forwardIndex];
        if (!forward) {
          return false;
        }
        const roundTrip = reconstructRanKey(forward);
        return roundTrip === ranKey;
      });

    fibers.push({
      target: targetObject,
      fiberSources,
      ranSize: ranDomain.length,
      functionCount: ranFunctions.length,
      familyCount,
      bijectionVerified: bijective,
    });

    if (!bijective) {
      details.push(`Right Kan boolean bijection failed at ${String(targetObject)}.`);
      holds = false;
    } else {
      details.push(
        `Right Kan boolean bijection verified at ${String(targetObject)} with ${ranFunctions.length} maps and ${familyCount} families.`,
      );
    }
  }

  return { fibers, holds, details };
};
export interface DiscreteLeftKanExtensionResult<J, I, X> {
  readonly reindexing: FunctorWithWitness<J, DiscreteArrow<J>, I, DiscreteArrow<I>>;
  readonly diagram: FunctorWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly extension: FunctorWithWitness<I, DiscreteArrow<I>, AnySetObj, AnySetHom>;
  readonly pullback: FunctorWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly unit: NaturalTransformationWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly analysis: LeftKanExtensionAnalysis<J, I>;
}

export const buildDiscreteLeftKanExtension = <J, I, X>(
  input: DiscreteKanExtensionInput<J, I, X>,
): DiscreteLeftKanExtensionResult<J, I, X> => {
  const workspace = prepareWorkspace(input);

  const extension = constructFunctorWithWitness(
    workspace.target.category,
    workspace.setCategory,
    {
      F0: (object) => workspace.lanObjects.get(object)!,
      F1: (arrow) => {
        const carrier = workspace.lanObjects.get(arrow.object)!;
        return SetCat.hom(carrier, carrier, (value: LanElement<J, X>) => value) as AnySetHom;
      },
    },
    {
      objects: workspace.target.objects,
      arrows: workspace.target.arrows,
      composablePairs: workspace.target.composablePairs,
    },
    ["Left Kan extension functor assembled from discrete fibers."],
  );

  const pullback = composeFunctors(extension, workspace.reindexing, {
    metadata: ["Precomposition of Lan_u F with u for the Kan unit."],
  });

  const unit = constructNaturalTransformationWithWitness(
    workspace.diagram,
    pullback,
    (object) => {
      const targetObject = workspace.reindexing.functor.F0(object);
      const codomain = workspace.lanObjects.get(targetObject)!;
      const domain = workspace.diagramObjects.get(object)!;
      const lookup = workspace.lanLookup.get(targetObject)?.get(object) ?? new Map();
      return SetCat.hom(domain, codomain, (value: X) => {
        const element = lookup.get(value);
        if (!element) {
          throw new Error("Kan extension unit: missing lan element for diagram value");
        }
        return element;
      }) as AnySetHom;
    },
    {
      samples: {
        objects: workspace.source.objects,
        arrows: workspace.source.arrows,
      },
      equalMor: equalsSetHom,
      metadata: [
        "Unit natural transformation exhibiting Lan_u F as the left Kan extension.",
        "Verified on discrete generators with bool-based universality checks.",
      ],
    },
  );

  const analysis = analyzeLeft(workspace);

  return {
    reindexing: workspace.reindexing,
    diagram: workspace.diagram,
    extension,
    pullback,
    unit,
    analysis,
  };
};

export interface DiscreteRightKanExtensionResult<J, I, X> {
  readonly reindexing: FunctorWithWitness<J, DiscreteArrow<J>, I, DiscreteArrow<I>>;
  readonly diagram: FunctorWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly extension: FunctorWithWitness<I, DiscreteArrow<I>, AnySetObj, AnySetHom>;
  readonly pullback: FunctorWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly counit: NaturalTransformationWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>;
  readonly analysis: RightKanExtensionAnalysis<J, I>;
}

export const buildDiscreteRightKanExtension = <J, I, X>(
  input: DiscreteKanExtensionInput<J, I, X>,
): DiscreteRightKanExtensionResult<J, I, X> => {
  const workspace = prepareWorkspace(input);

  const extension = constructFunctorWithWitness(
    workspace.target.category,
    workspace.setCategory,
    {
      F0: (object) => workspace.ranObjects.get(object)!,
      F1: (arrow) => {
        const carrier = workspace.ranObjects.get(arrow.object)!;
        return SetCat.hom(carrier, carrier, (value: RanElement<J, X>) => value) as AnySetHom;
      },
    },
    {
      objects: workspace.target.objects,
      arrows: workspace.target.arrows,
      composablePairs: workspace.target.composablePairs,
    },
    ["Right Kan extension functor assembled from discrete fibers."],
  );

  const pullback = composeFunctors(extension, workspace.reindexing, {
    metadata: ["Precomposition of Ran_u F with u for the Kan counit."],
  });

  const counit = constructNaturalTransformationWithWitness(
    pullback,
    workspace.diagram,
    (object) => {
      const targetObject = workspace.reindexing.functor.F0(object);
      const domain = workspace.ranObjects.get(targetObject)!;
      const codomain = workspace.diagramObjects.get(object)!;
      return SetCat.hom(domain, codomain, (bundle: RanElement<J, X>) => {
        const component = bundle.components.find((entry) => Object.is(entry.source, object));
        if (!component) {
          throw new Error("Kan extension counit: missing component for source object");
        }
        return component.value;
      }) as AnySetHom;
    },
    {
      samples: {
        objects: workspace.source.objects,
        arrows: workspace.source.arrows,
      },
      equalMor: equalsSetHom,
      metadata: [
        "Counit natural transformation exhibiting Ran_u F as the right Kan extension.",
        "Verified on discrete generators with bool-based universality checks.",
      ],
    },
  );

  const analysis = analyzeRight(workspace);

  return {
    reindexing: workspace.reindexing,
    diagram: workspace.diagram,
    extension,
    pullback,
    counit,
    analysis,
  };
};

const ensureInclusionImage = <J, I>(
  ambient: ReadonlyArray<I>,
  inclusion: (object: J) => I,
  subcategory: ReadonlyArray<J>,
): void => {
  const ambientSet = new Set<I>(ambient);
  for (const object of subcategory) {
    const image = inclusion(object);
    if (!ambientSet.has(image)) {
      throw new Error(
        `Discrete Kan inclusion: image ${String(image)} missing from ambient objects.`,
      );
    }
  }
};

export const buildDiscreteLeftKanExtensionAlongInclusion = <J, I, X>(
  input: DiscreteInclusionKanInput<J, I, X>,
): DiscreteLeftKanExtensionResult<J, I, X> => {
  ensureInclusionImage(input.ambientObjects, input.inclusion, input.subcategoryObjects);
  return buildDiscreteLeftKanExtension({
    sourceObjects: Array.from(input.subcategoryObjects),
    targetObjects: Array.from(input.ambientObjects),
    reindex: input.inclusion,
    family: input.family,
  });
};

export const buildDiscreteRightKanExtensionAlongInclusion = <J, I, X>(
  input: DiscreteInclusionKanInput<J, I, X>,
): DiscreteRightKanExtensionResult<J, I, X> => {
  ensureInclusionImage(input.ambientObjects, input.inclusion, input.subcategoryObjects);
  return buildDiscreteRightKanExtension({
    sourceObjects: Array.from(input.subcategoryObjects),
    targetObjects: Array.from(input.ambientObjects),
    reindex: input.inclusion,
    family: input.family,
  });
};

export const buildDiscreteLeftKanExtensionToTerminal = <J, X>(
  input: DiscreteConstantKanInput<J, X>,
): DiscreteLeftKanExtensionResult<J, DiscreteTerminalObject, X> =>
  buildDiscreteLeftKanExtension({
    sourceObjects: Array.from(input.sourceObjects),
    targetObjects: [DISCRETE_TERMINAL_OBJECT],
    reindex: () => DISCRETE_TERMINAL_OBJECT,
    family: input.family,
  });

export const buildDiscreteRightKanExtensionToTerminal = <J, X>(
  input: DiscreteConstantKanInput<J, X>,
): DiscreteRightKanExtensionResult<J, DiscreteTerminalObject, X> =>
  buildDiscreteRightKanExtension({
    sourceObjects: Array.from(input.sourceObjects),
    targetObjects: [DISCRETE_TERMINAL_OBJECT],
    reindex: () => DISCRETE_TERMINAL_OBJECT,
    family: input.family,
  });

export const collectDiscreteLeftKanColimit = <J, X>(
  left: DiscreteLeftKanExtensionResult<J, DiscreteTerminalObject, X>,
): ReadonlyArray<readonly [J, X]> =>
  Array.from(left.extension.functor.F0(DISCRETE_TERMINAL_OBJECT)).map((element) =>
    [element.source, element.value] as const,
  );

export const collectDiscreteRightKanLimit = <J, X>(
  right: DiscreteRightKanExtensionResult<J, DiscreteTerminalObject, X>,
): ReadonlyArray<ReadonlyMap<J, X>> =>
  Array.from(right.extension.functor.F0(DISCRETE_TERMINAL_OBJECT)).map((bundle) => {
    const map = new Map<J, X>();
    for (const component of bundle.components) {
      map.set(component.source, component.value);
    }
    return map;
  });

const collectDomainObjects = <J>(
  ...collections: ReadonlyArray<ReadonlyArray<J>>
): ReadonlyArray<J> => {
  const seen = new Set<J>();
  for (const collection of collections) {
    for (const object of collection) {
      if (!seen.has(object)) {
        seen.add(object);
      }
    }
  }
  return Array.from(seen);
};

const fiberOrderForReindexing = <J, I>(
  targets: ReadonlyArray<I>,
  reindexing: FunctorWithWitness<J, DiscreteArrow<J>, I, DiscreteArrow<I>>,
): ReadonlyMap<I, ReadonlyArray<J>> => {
  const order = new Map<I, J[]>();
  for (const target of targets) {
    order.set(target, []);
  }
  for (const source of reindexing.witness.objectGenerators) {
    const target = reindexing.functor.F0(source);
    const bucket = order.get(target);
    if (!bucket) {
      order.set(target, [source]);
      continue;
    }
    bucket.push(source);
  }
  return new Map(order);
};

export interface DiscreteLeftKanInductionResult<J, I> {
  readonly mediating: NaturalTransformationWithWitness<
    I,
    DiscreteArrow<I>,
    AnySetObj,
    AnySetHom
  >;
  readonly whiskered: NaturalTransformationWithWitness<
    J,
    DiscreteArrow<J>,
    AnySetObj,
    AnySetHom
  >;
  readonly comparison: NaturalTransformationWithWitness<
    J,
    DiscreteArrow<J>,
    AnySetObj,
    AnySetHom
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface DiscreteKanInductionOptions<J, I> {
  readonly mediating?: NaturalTransformationConstructionOptions<I, DiscreteArrow<I>, AnySetHom>;
  readonly whisker?: NaturalTransformationConstructionOptions<J, DiscreteArrow<J>, AnySetHom>;
  readonly comparison?: NaturalTransformationConstructionOptions<J, DiscreteArrow<J>, AnySetHom>;
}

export const induceNaturalTransformationFromLeftKan = <J, I, X>(
  left: DiscreteLeftKanExtensionResult<J, I, X>,
  target: FunctorWithWitness<I, DiscreteArrow<I>, AnySetObj, AnySetHom>,
  candidate: NaturalTransformationWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>,
  options: DiscreteKanInductionOptions<J, I> = {},
): DiscreteLeftKanInductionResult<J, I> => {
  const mediatorMetadata = [
    ...(options.mediating?.metadata ?? []),
    "Induced natural transformation from the left Kan extension via universal property.",
  ];
  const mediating = constructNaturalTransformationWithWitness(
    left.extension,
    target,
    (object) => {
      const domain = left.extension.functor.F0(object);
      const codomain = target.functor.F0(object);
      return SetCat.hom(domain, codomain, (element: LanElement<J, X>) => {
        const component = candidate.transformation.component(element.source);
        return component.map(element.value);
      }) as AnySetHom;
    },
    {
      samples: options.mediating?.samples ?? { objects: left.extension.witness.objectGenerators },
      equalMor: options.mediating?.equalMor ?? equalsSetHom,
      metadata: mediatorMetadata,
    },
  );

  const whiskerMetadata = [
    ...(options.whisker?.metadata ?? []),
    "Right whiskering the induced map along the reindexing functor.",
  ];
  const whiskered = whiskerNaturalTransformationRight(mediating, left.reindexing, {
    samples: options.whisker?.samples,
    equalMor: options.whisker?.equalMor ?? equalsSetHom,
    metadata: whiskerMetadata,
  });

  const comparisonMetadata = [
    ...(options.comparison?.metadata ?? []),
    "Composite transformation expected to match the supplied triangle witness.",
  ];
  const comparison = verticalCompositeNaturalTransformations(left.unit, whiskered, {
    samples: options.comparison?.samples,
    equalMor: options.comparison?.equalMor ?? equalsSetHom,
    metadata: comparisonMetadata,
  });

  const objects = collectDomainObjects(
    left.unit.witness.objectSamples,
    candidate.witness.objectSamples,
    left.diagram.witness.objectGenerators,
  );
  const details: string[] = [];
  let holds = true;
  for (const object of objects) {
    const expected = candidate.transformation.component(object);
    const actual = comparison.transformation.component(object);
    if (!equalsSetHom(expected, actual)) {
      holds = false;
      details.push(`Left Kan induction comparison failed at ${String(object)}.`);
    }
  }
  if (holds) {
    details.push("Left Kan induction recreates the supplied natural transformation on discrete data.");
  }

  return { mediating, whiskered, comparison, holds, details };
};

export interface DiscreteRightKanInductionResult<J, I> {
  readonly mediating: NaturalTransformationWithWitness<
    I,
    DiscreteArrow<I>,
    AnySetObj,
    AnySetHom
  >;
  readonly whiskered: NaturalTransformationWithWitness<
    J,
    DiscreteArrow<J>,
    AnySetObj,
    AnySetHom
  >;
  readonly comparison: NaturalTransformationWithWitness<
    J,
    DiscreteArrow<J>,
    AnySetObj,
    AnySetHom
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export const induceNaturalTransformationToRightKan = <J, I, X>(
  right: DiscreteRightKanExtensionResult<J, I, X>,
  target: FunctorWithWitness<I, DiscreteArrow<I>, AnySetObj, AnySetHom>,
  candidate: NaturalTransformationWithWitness<J, DiscreteArrow<J>, AnySetObj, AnySetHom>,
  options: DiscreteKanInductionOptions<J, I> = {},
): DiscreteRightKanInductionResult<J, I> => {
  const targets = right.extension.witness.objectGenerators;
  const fiberOrder = fiberOrderForReindexing(targets, right.reindexing);
  const mediatorMetadata = [
    ...(options.mediating?.metadata ?? []),
    "Induced natural transformation into the right Kan extension via universal property.",
  ];
  const mediating = constructNaturalTransformationWithWitness(
    target,
    right.extension,
    (object) => {
      const domain = target.functor.F0(object);
      const codomain = right.extension.functor.F0(object);
      const families = Array.from(codomain);
      const canonical = families[0];
      if (!canonical) {
        throw new Error("Right Kan induction: Ran carrier has no representatives.");
      }
      const fiber = fiberOrder.get(object) ?? canonical.components.map((component) => component.source);
      return SetCat.hom(domain, codomain, (value: unknown) => {
        if (fiber.length === 0) {
          return canonical;
        }
        const tuple = fiber.map((source) => {
          const component = candidate.transformation.component(source);
          return {
            source,
            value: component.map(value),
          };
        });
        for (const element of families) {
          if (element.components.length !== tuple.length) {
            continue;
          }
          let matches = true;
          for (let index = 0; index < tuple.length; index += 1) {
            const expected = element.components[index]!;
            const actual = tuple[index]!;
            if (!Object.is(expected.source, actual.source) || !Object.is(expected.value, actual.value)) {
              matches = false;
              break;
            }
          }
          if (matches) {
            return element;
          }
        }
        throw new Error("Right Kan induction: no matching Ran element for evaluated tuple.");
      }) as AnySetHom;
    },
    {
      samples: options.mediating?.samples ?? { objects: targets },
      equalMor: options.mediating?.equalMor ?? equalsSetHom,
      metadata: mediatorMetadata,
    },
  );

  const whiskerMetadata = [
    ...(options.whisker?.metadata ?? []),
    "Right whiskering the induced map into Ran along the reindexing functor.",
  ];
  const whiskered = whiskerNaturalTransformationRight(mediating, right.reindexing, {
    samples: options.whisker?.samples,
    equalMor: options.whisker?.equalMor ?? equalsSetHom,
    metadata: whiskerMetadata,
  });

  const comparisonMetadata = [
    ...(options.comparison?.metadata ?? []),
    "Composite transformation expected to reproduce the supplied couniversal witness.",
  ];
  const comparison = verticalCompositeNaturalTransformations(whiskered, right.counit, {
    samples: options.comparison?.samples,
    equalMor: options.comparison?.equalMor ?? equalsSetHom,
    metadata: comparisonMetadata,
  });

  const objects = collectDomainObjects(
    right.counit.witness.objectSamples,
    candidate.witness.objectSamples,
    right.diagram.witness.objectGenerators,
  );
  const details: string[] = [];
  let holds = true;
  for (const object of objects) {
    const expected = candidate.transformation.component(object);
    const actual = comparison.transformation.component(object);
    if (!equalsSetHom(expected, actual)) {
      holds = false;
      details.push(`Right Kan induction comparison failed at ${String(object)}.`);
    }
  }
  if (holds) {
    details.push("Right Kan induction recreates the supplied natural transformation on discrete data.");
  }

  return { mediating, whiskered, comparison, holds, details };
};
