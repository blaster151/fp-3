export interface IndexedContainerPosition {
  readonly position: string;
  readonly targetIndex: string;
}

export interface IndexedContainerShape {
  readonly index: string;
  readonly shape: string;
  readonly positions: ReadonlyArray<IndexedContainerPosition>;
}

export interface IndexedContainerFamilyComponent {
  readonly index: string;
  readonly values: ReadonlyArray<string>;
}

export interface IndexedContainerFamily {
  readonly label: string;
  readonly components: ReadonlyArray<IndexedContainerFamilyComponent>;
}

export interface IndexedContainerBaseElement {
  readonly index: string;
  readonly value: string;
}

export interface IndexedContainerAssignment {
  readonly position: string;
  readonly targetIndex: string;
  readonly value: string;
}

export interface IndexedContainerElement {
  readonly index: string;
  readonly shape: string;
  readonly assignments: ReadonlyArray<IndexedContainerAssignment>;
}

export interface IndexedContainerRelativeMonadWitness {
  readonly indices: ReadonlyArray<string>;
  readonly shapes: ReadonlyArray<IndexedContainerShape>;
  readonly families: ReadonlyArray<IndexedContainerFamily>;
  readonly unit: (
    family: IndexedContainerFamily,
    element: IndexedContainerBaseElement,
  ) => IndexedContainerElement;
  readonly extractValue: (element: IndexedContainerElement) => string;
}

export interface IndexedContainerFamilySummary {
  readonly label: string;
  readonly baseElementCount: number;
  readonly containerElementCount: number;
  readonly arrowCount: number;
}

export interface IndexedContainerRelativeMonadReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: IndexedContainerRelativeMonadWitness;
  readonly summaries: ReadonlyArray<IndexedContainerFamilySummary>;
}

interface EnumeratedFamilyData {
  readonly family: IndexedContainerFamily;
  readonly baseElements: ReadonlyArray<IndexedContainerBaseElement>;
  readonly containerElements: ReadonlyArray<IndexedContainerElement>;
  readonly containerKeys: ReadonlySet<string>;
  readonly units: Map<string, IndexedContainerElement>;
  readonly componentValues: Map<string, ReadonlySet<string>>;
}

const uniqueSorted = (values: ReadonlyArray<string>): ReadonlyArray<string> => {
  const sorted = [...values];
  sorted.sort();
  return sorted.filter((value, index) => index === 0 || value !== sorted[index - 1]);
};

const shapeKey = (shape: IndexedContainerShape): string =>
  `${shape.index}::${shape.shape}`;

const assignmentKey = (assignment: IndexedContainerAssignment): string =>
  `${assignment.position}=>${assignment.targetIndex}:${assignment.value}`;

const elementKey = (element: IndexedContainerElement): string => {
  const assignments = Array.from(element.assignments, assignmentKey);
  assignments.sort();
  return `${element.index}::${element.shape}::${assignments.join("|")}`;
};

const baseKey = (element: IndexedContainerBaseElement): string =>
  `${element.index}:${element.value}`;

const cartesianProduct = <T>(
  collections: ReadonlyArray<ReadonlyArray<T>>,
): ReadonlyArray<ReadonlyArray<T>> => {
  if (collections.length === 0) {
    return [Object.freeze([]) as ReadonlyArray<T>];
  }
  const [head, ...tail] = collections;
  if (!head) {
    return [Object.freeze([]) as ReadonlyArray<T>];
  }
  if (tail.length === 0) {
    return head.map((value) => Object.freeze([value]) as ReadonlyArray<T>);
  }
  const suffixes = cartesianProduct(tail as ReadonlyArray<ReadonlyArray<T>>);
  const results: T[][] = [];
  for (const value of head) {
    for (const suffix of suffixes) {
      results.push([value, ...suffix]);
    }
  }
  return results.map((result) => Object.freeze([...result]) as ReadonlyArray<T>);
};

const enumerateFamilyData = (
  witness: IndexedContainerRelativeMonadWitness,
  shapesByIndex: Map<string, ReadonlyArray<IndexedContainerShape>>,
  family: IndexedContainerFamily,
  issues: string[],
): EnumeratedFamilyData => {
  const componentValues = new Map<string, ReadonlySet<string>>();
  for (const component of family.components) {
    componentValues.set(component.index, new Set(component.values));
  }

  for (const index of witness.indices) {
    if (!componentValues.has(index)) {
      issues.push(
        `Family "${family.label}" is missing a component for index "${index}".`,
      );
    }
  }

  const baseElements: IndexedContainerBaseElement[] = [];
  for (const component of family.components) {
    for (const value of component.values) {
      baseElements.push({ index: component.index, value });
    }
  }

  const containerElements: IndexedContainerElement[] = [];
  for (const [index, shapes] of shapesByIndex.entries()) {
    const component = componentValues.get(index);
    if (!component) {
      continue;
    }
    for (const shape of shapes) {
      const valueCollections: ReadonlyArray<ReadonlyArray<string>> = shape.positions.map(
        (position) => {
          const targetValues = componentValues.get(position.targetIndex);
          if (!targetValues) {
            issues.push(
              `Family "${family.label}" lacks values for target index "${position.targetIndex}" required by shape "${shape.shape}" at index "${index}".`,
            );
            return [];
          }
          return [...targetValues];
        },
      );
      if (valueCollections.some((collection) => collection.length === 0)) {
        continue;
      }
      const combinations = cartesianProduct(valueCollections);
      for (const combination of combinations) {
        const assignments = shape.positions.map((position, assignmentIndex) => ({
          position: position.position,
          targetIndex: position.targetIndex,
          value: combination[assignmentIndex]!,
        }));
        containerElements.push({
          index,
          shape: shape.shape,
          assignments: Object.freeze(assignments) as ReadonlyArray<IndexedContainerAssignment>,
        });
      }
    }
  }

  const containerKeys = new Set(containerElements.map(elementKey));

  return {
    family,
    baseElements: Object.freeze(baseElements) as ReadonlyArray<IndexedContainerBaseElement>,
    containerElements: Object.freeze(containerElements) as ReadonlyArray<IndexedContainerElement>,
    containerKeys,
    units: new Map(),
    componentValues,
  };
};

const elementBelongsToShape = (
  shapesByIndex: Map<string, ReadonlyArray<IndexedContainerShape>>,
  element: IndexedContainerElement,
): IndexedContainerShape | undefined => {
  const candidates = shapesByIndex.get(element.index);
  if (!candidates) {
    return undefined;
  }
  return candidates.find((candidate) => candidate.shape === element.shape);
};

const validateElement = (
  shapesByIndex: Map<string, ReadonlyArray<IndexedContainerShape>>,
  componentValues: Map<string, ReadonlySet<string>>,
  element: IndexedContainerElement,
  context: string,
  issues: string[],
): boolean => {
  const shape = elementBelongsToShape(shapesByIndex, element);
  if (!shape) {
    issues.push(
      `${context}: shape "${element.shape}" is not registered for index "${element.index}".`,
    );
    return false;
  }
  if (shape.positions.length !== element.assignments.length) {
    issues.push(
      `${context}: shape "${element.shape}" at index "${element.index}" expects ${shape.positions.length} assignments but received ${element.assignments.length}.`,
    );
    return false;
  }
  let valid = true;
  for (const expected of shape.positions) {
    const assignment = element.assignments.find(
      (candidate) => candidate.position === expected.position,
    );
    if (!assignment) {
      issues.push(
        `${context}: missing assignment for position "${expected.position}" in shape "${element.shape}" at index "${element.index}".`,
      );
      valid = false;
      continue;
    }
    if (assignment.targetIndex !== expected.targetIndex) {
      issues.push(
        `${context}: assignment for position "${expected.position}" targets "${assignment.targetIndex}" but the shape requires "${expected.targetIndex}".`,
      );
      valid = false;
      continue;
    }
    const allowedValues = componentValues.get(expected.targetIndex);
    if (!allowedValues || !allowedValues.has(assignment.value)) {
      issues.push(
        `${context}: value "${assignment.value}" is not available in the component for index "${expected.targetIndex}".`,
      );
      valid = false;
    }
  }
  return valid;
};

const makeArrowFunctions = (
  domain: EnumeratedFamilyData,
  codomain: EnumeratedFamilyData,
): ReadonlyArray<(
  element: IndexedContainerBaseElement,
) => IndexedContainerElement> => {
  if (domain.baseElements.length === 0) {
    return [() => codomain.containerElements[0]!];
  }
  const choices = domain.baseElements.map(() => codomain.containerElements);
  const combinations = cartesianProduct(choices);
  return combinations.map((combination) => {
    const mapping = new Map<string, IndexedContainerElement>();
    domain.baseElements.forEach((element, index) => {
      const image = combination[index];
      if (image) {
        mapping.set(baseKey(element), image);
      }
    });
    return (element: IndexedContainerBaseElement) =>
      mapping.get(baseKey(element)) ?? codomain.containerElements[0]!;
  });
};

export const analyzeIndexedContainerRelativeMonad = (
  witness: IndexedContainerRelativeMonadWitness,
): IndexedContainerRelativeMonadReport => {
  const issues: string[] = [];

  if (witness.indices.length === 0) {
    issues.push("Witness must list at least one index.");
  }

  const uniqueIndices = uniqueSorted(witness.indices);
  if (uniqueIndices.length !== witness.indices.length) {
    issues.push("Index list must not contain duplicates.");
  }

  const shapesByIndex = new Map<string, IndexedContainerShape[]>();
  for (const shape of witness.shapes) {
    if (!uniqueIndices.includes(shape.index)) {
      issues.push(
        `Shape "${shape.shape}" references unknown index "${shape.index}".`,
      );
      continue;
    }
    const bucket = shapesByIndex.get(shape.index) ?? [];
    bucket.push(shape);
    shapesByIndex.set(shape.index, bucket);
    const seenPositions = new Set<string>();
    for (const position of shape.positions) {
      if (seenPositions.has(position.position)) {
        issues.push(
          `Shape "${shape.shape}" at index "${shape.index}" repeats position "${position.position}".`,
        );
      }
      seenPositions.add(position.position);
      if (!uniqueIndices.includes(position.targetIndex)) {
        issues.push(
          `Shape "${shape.shape}" at index "${shape.index}" targets unknown index "${position.targetIndex}".`,
        );
      }
    }
  }

  for (const index of uniqueIndices) {
    if (!shapesByIndex.has(index)) {
      issues.push(`No shapes registered for index "${index}".`);
    }
  }

  const enumeratedFamilies: EnumeratedFamilyData[] = witness.families.map((family) =>
    enumerateFamilyData(witness, shapesByIndex, family, issues),
  );

  const summaries: IndexedContainerFamilySummary[] = [];

  for (const data of enumeratedFamilies) {
    const { family, baseElements, containerElements, componentValues } = data;
    const baseCount = baseElements.length;
    const containerCount = containerElements.length;
    summaries.push({
      label: family.label,
      baseElementCount: baseCount,
      containerElementCount: containerCount,
      arrowCount:
        baseCount === 0 || containerCount === 0
          ? 1
          : Math.pow(containerCount, baseCount),
    });

    for (const base of baseElements) {
      const context = `Unit on (${base.index}, ${base.value}) in family "${family.label}"`;
      let unitElement: IndexedContainerElement | undefined;
      try {
        unitElement = witness.unit(family, base);
      } catch (error) {
        const message = error instanceof Error ? error.message : `${error}`;
        issues.push(`${context} raised an error: ${message}`);
        continue;
      }
      if (!unitElement) {
        issues.push(`${context} returned no element.`);
        continue;
      }
      const elementContext = `${context} result`;
      if (!validateElement(shapesByIndex, componentValues, unitElement, elementContext, issues)) {
        continue;
      }
      if (unitElement.index !== base.index) {
        issues.push(
          `${context} produced an element at index "${unitElement.index}" but the base element lives in "${base.index}".`,
        );
        continue;
      }
      if (!data.containerKeys.has(elementKey(unitElement))) {
        issues.push(
          `${context} yielded a container element not present in the enumerated family data.`,
        );
        continue;
      }
      data.units.set(baseKey(base), unitElement);
    }

    for (const element of containerElements) {
      const value = witness.extractValue(element);
      const allowed = componentValues.get(element.index);
      if (!allowed || !allowed.has(value)) {
        issues.push(
          `Extracted value "${value}" from (${element.index}, ${element.shape}) does not belong to the component for index "${element.index}" in family "${family.label}".`,
        );
      }
    }
  }

  const extendElement = (
    domain: EnumeratedFamilyData,
    codomain: EnumeratedFamilyData,
    arrow: (element: IndexedContainerBaseElement) => IndexedContainerElement,
    element: IndexedContainerElement,
    context: string,
  ): IndexedContainerElement | undefined => {
    const replacements: IndexedContainerElement[] = [];
    for (const assignment of element.assignments) {
      const baseElement: IndexedContainerBaseElement = {
        index: assignment.targetIndex,
        value: assignment.value,
      };
      let image: IndexedContainerElement;
      try {
        image = arrow(baseElement);
      } catch (error) {
        const message = error instanceof Error ? error.message : `${error}`;
        issues.push(`${context}: arrow evaluation failed: ${message}`);
        return undefined;
      }
      if (image.index !== assignment.targetIndex) {
        issues.push(
          `${context}: arrow image at base (${assignment.targetIndex}, ${assignment.value}) returned index "${image.index}".`,
        );
        return undefined;
      }
      if (!codomain.containerKeys.has(elementKey(image))) {
        issues.push(
          `${context}: arrow image (${image.index}, ${image.shape}) is not a recognised container element of family "${codomain.family.label}".`,
        );
        return undefined;
      }
      replacements.push(image);
    }

    const newAssignments = element.assignments.map((assignment, index) => {
      const replacement = replacements[index]!;
      const extracted = witness.extractValue(replacement);
      const allowed = codomain.componentValues.get(assignment.targetIndex);
      if (!allowed || !allowed.has(extracted)) {
        issues.push(
          `${context}: extracted value "${extracted}" is not available in component "${assignment.targetIndex}" of family "${codomain.family.label}".`,
        );
      }
      return {
        position: assignment.position,
        targetIndex: assignment.targetIndex,
        value: extracted,
      };
    });

    const result: IndexedContainerElement = {
      index: element.index,
      shape: element.shape,
      assignments: Object.freeze(newAssignments) as ReadonlyArray<IndexedContainerAssignment>,
    };

    if (!validateElement(
      shapesByIndex,
      codomain.componentValues,
      result,
      `${context}: extended element`,
      issues,
    )) {
      return undefined;
    }

    if (!codomain.containerKeys.has(elementKey(result))) {
      issues.push(
        `${context}: extended element (${result.index}, ${result.shape}) is not part of the enumerated codomain family.`,
      );
      return undefined;
    }

    return result;
  };

  const identityArrow = (family: EnumeratedFamilyData) =>
    (element: IndexedContainerBaseElement) =>
      family.units.get(baseKey(element)) ?? family.containerElements[0]!;

  for (const domain of enumeratedFamilies) {
    const idArrow = identityArrow(domain);
    for (const element of domain.containerElements) {
      const context = `Right unit on (${element.index}, ${element.shape}) in family "${domain.family.label}"`;
      const extended = extendElement(domain, domain, idArrow, element, context);
      if (!extended) {
        continue;
      }
      if (elementKey(extended) !== elementKey(element)) {
        issues.push(
          `${context}: extension of the unit arrow altered the container element.`,
        );
      }
    }
  }

  for (const domain of enumeratedFamilies) {
    for (const codomain of enumeratedFamilies) {
      const arrows = makeArrowFunctions(domain, codomain);
      for (const arrow of arrows) {
        for (const base of domain.baseElements) {
          const unitElement = domain.units.get(baseKey(base));
          if (!unitElement) {
            continue;
          }
          const context = `Left unit at (${base.index}, ${base.value}) from "${domain.family.label}" to "${codomain.family.label}"`;
          const extended = extendElement(domain, codomain, arrow, unitElement, context);
          const image = arrow(base);
          if (extended && elementKey(extended) !== elementKey(image)) {
            issues.push(`${context}: extend(unit) ≠ arrow.`);
          }
        }
      }
    }
  }

  for (const domain of enumeratedFamilies) {
    for (const middle of enumeratedFamilies) {
      for (const codomain of enumeratedFamilies) {
        const arrowsF = makeArrowFunctions(domain, middle);
        const arrowsG = makeArrowFunctions(middle, codomain);
        for (const f of arrowsF) {
          for (const g of arrowsG) {
            const composite = (element: IndexedContainerBaseElement) => {
              const intermediate = f(element);
              const context = `Composite arrow on (${element.index}, ${element.value})`;
              const extended = extendElement(
                middle,
                codomain,
                g,
                intermediate,
                context,
              );
              return extended ?? codomain.containerElements[0]!;
            };
            for (const element of domain.containerElements) {
              const context = `Associativity at (${element.index}, ${element.shape}) from "${domain.family.label}" via "${middle.family.label}" to "${codomain.family.label}"`;
              const first = extendElement(domain, middle, f, element, context);
              if (!first) {
                continue;
              }
              const sequential = extendElement(middle, codomain, g, first, context);
              const combined = extendElement(domain, codomain, composite, element, context);
              if (sequential && combined && elementKey(sequential) !== elementKey(combined)) {
                issues.push(`${context}: associativity failed.`);
              }
            }
          }
        }
      }
    }
  }

  const holds = issues.length === 0;
  const details = holds
    ? `Verified indexed container relative monad laws across ${enumeratedFamilies.length} families.`
    : "Indexed container relative monad verification uncovered issues; review the diagnostics.";

  return {
    holds,
    issues,
    details,
    witness,
    summaries,
  };
};

export const describeIndexedContainerExample4Witness = (): IndexedContainerRelativeMonadWitness => ({
  indices: ["Nat", "Stream"],
  shapes: [
    {
      index: "Nat",
      shape: "returnNat",
      positions: [{ position: "focus", targetIndex: "Nat" }],
    },
    {
      index: "Nat",
      shape: "succ",
      positions: [{ position: "focus", targetIndex: "Nat" }],
    },
    {
      index: "Stream",
      shape: "returnStream",
      positions: [{ position: "tail", targetIndex: "Stream" }],
    },
    {
      index: "Stream",
      shape: "cons",
      positions: [
        { position: "head", targetIndex: "Nat" },
        { position: "tail", targetIndex: "Stream" },
      ],
    },
  ],
  families: [
    {
      label: "finite streams",
      components: [
        { index: "Nat", values: ["0", "1"] },
        { index: "Stream", values: ["s0", "s1"] },
      ],
    },
    {
      label: "extended streams",
      components: [
        { index: "Nat", values: ["0", "1", "2"] },
        { index: "Stream", values: ["s0", "s1", "s2"] },
      ],
    },
  ],
  unit: (family, element) => {
    switch (element.index) {
      case "Nat":
        return {
          index: "Nat",
          shape: "returnNat",
          assignments: Object.freeze([
            { position: "focus", targetIndex: "Nat", value: element.value },
          ]) as ReadonlyArray<IndexedContainerAssignment>,
        };
      case "Stream":
        return {
          index: "Stream",
          shape: "returnStream",
          assignments: Object.freeze([
            { position: "tail", targetIndex: "Stream", value: element.value },
          ]) as ReadonlyArray<IndexedContainerAssignment>,
        };
      default:
        throw new Error(`Unsupported index "${element.index}" in family "${family.label}".`);
    }
  },
  extractValue: (element) => {
    switch (element.index) {
      case "Nat": {
        const focus = element.assignments.find((assignment) => assignment.position === "focus");
        if (!focus) {
          throw new Error("Nat element must assign the focus position.");
        }
        return focus.value;
      }
      case "Stream": {
        const tail = element.assignments.find((assignment) => assignment.position === "tail");
        if (!tail) {
          throw new Error("Stream element must assign the tail position.");
        }
        return tail.value;
      }
      default:
        throw new Error(`Unsupported index "${element.index}" in extractValue.`);
    }
  },
});

export const analyzeIndexedContainerExample4 = (): IndexedContainerRelativeMonadReport =>
  analyzeIndexedContainerRelativeMonad(describeIndexedContainerExample4Witness());

