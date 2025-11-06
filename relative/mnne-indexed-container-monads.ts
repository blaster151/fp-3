export interface IndexedContainerPosition {
  readonly position: string;
  readonly targetIndex: string;
}

export interface IndexedContainerShape {
  readonly index: string;
  readonly shape: string;
  readonly positions: ReadonlyArray<IndexedContainerPosition>;
}

export interface IndexedContainerShapeCompositionCase {
  readonly resultShape: string;
  readonly binderShapes: ReadonlyArray<{
    readonly binder: string;
    readonly shape: string;
  }>;
}

export type IndexedContainerShapeExpression =
  | { readonly kind: "original" }
  | { readonly kind: "constant"; readonly shape: string }
  | { readonly kind: "binding"; readonly binder: string }
  | {
      readonly kind: "composition";
      readonly cases: ReadonlyArray<IndexedContainerShapeCompositionCase>;
      readonly defaultShape?: string;
    };

export type IndexedContainerAssignmentExpression =
  | { readonly kind: "original"; readonly position: string }
  | { readonly kind: "bindingValue"; readonly binder: string }
  | { readonly kind: "bindingAssignment"; readonly binder: string; readonly position: string }
  | { readonly kind: "literal"; readonly value: string };

export interface IndexedContainerSubstitutionBinding {
  readonly position: string;
  readonly binder: string;
  readonly allowedShapes?: ReadonlyArray<string>;
  readonly reindexTargets?: ReadonlyArray<{ readonly from: string; readonly to: string }>;
}

export interface IndexedContainerSubstitutionAssignment {
  readonly position: string;
  readonly targetIndex: string;
  readonly expression: IndexedContainerAssignmentExpression;
}

export interface IndexedContainerSubstitutionRule {
  readonly index: string;
  readonly domainShape: string;
  readonly bindings: ReadonlyArray<IndexedContainerSubstitutionBinding>;
  readonly resultShape: IndexedContainerShapeExpression;
  readonly assignments: ReadonlyArray<IndexedContainerSubstitutionAssignment>;
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
  readonly substitutions?: ReadonlyArray<IndexedContainerSubstitutionRule>;
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

interface ReplacementData {
  readonly assignment: IndexedContainerAssignment;
  readonly element: IndexedContainerElement;
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

const substitutionKey = (index: string, shape: string): string =>
  `${index}::${shape}`;

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

  const substitutionRulesByShape = new Map<string, IndexedContainerSubstitutionRule[]>();
  const substitutionRules = witness.substitutions ?? [];
  for (const rule of substitutionRules) {
    const ruleContext = `Substitution rule for (${rule.index}, ${rule.domainShape})`;
    const domainShapes = shapesByIndex.get(rule.index);
    if (!domainShapes || domainShapes.length === 0) {
      issues.push(
        `${ruleContext} references index "${rule.index}" which has no registered shapes.`,
      );
      continue;
    }
    const domainShape = domainShapes.find((candidate) => candidate.shape === rule.domainShape);
    if (!domainShape) {
      issues.push(
        `${ruleContext} targets an unknown shape; available shapes are ${domainShapes
          .map((candidate) => candidate.shape)
          .join(", ")}.`,
      );
      continue;
    }
    const domainPositions = new Map<string, IndexedContainerPosition>();
    for (const position of domainShape.positions) {
      domainPositions.set(position.position, position);
    }

    const binderNames = new Set<string>();
    const bindingTargets = new Map<string, string>();
    let ruleValid = true;
    for (const binding of rule.bindings) {
      if (!domainPositions.has(binding.position)) {
        issues.push(
          `${ruleContext} lists binding position "${binding.position}" which does not appear in shape "${rule.domainShape}".`,
        );
        ruleValid = false;
        continue;
      }
      if (binderNames.has(binding.binder)) {
        issues.push(
          `${ruleContext} reuses binder name "${binding.binder}"; binders must be unique per rule.`,
        );
        ruleValid = false;
        continue;
      }
      binderNames.add(binding.binder);
      const position = domainPositions.get(binding.position)!;
      bindingTargets.set(binding.binder, position.targetIndex);
      if (binding.allowedShapes) {
        const available = shapesByIndex.get(position.targetIndex) ?? [];
        for (const candidate of binding.allowedShapes) {
          if (!available.some((shape) => shape.shape === candidate)) {
            issues.push(
              `${ruleContext} allows shape "${candidate}" for binder "${binding.binder}" but index "${position.targetIndex}" does not register it.`,
            );
            ruleValid = false;
          }
        }
      }
      if (binding.reindexTargets) {
        const seenSources = new Set<string>();
        for (const mapping of binding.reindexTargets) {
          if (!uniqueIndices.includes(mapping.from)) {
            issues.push(
              `${ruleContext} lists reindex source "${mapping.from}" for binder "${binding.binder}" which is not a known index.`,
            );
            ruleValid = false;
          }
          if (!uniqueIndices.includes(mapping.to)) {
            issues.push(
              `${ruleContext} lists reindex target "${mapping.to}" for binder "${binding.binder}" which is not a known index.`,
            );
            ruleValid = false;
          }
          if (seenSources.has(mapping.from)) {
            issues.push(
              `${ruleContext} repeats reindex source "${mapping.from}" for binder "${binding.binder}"; mappings must be unique.`,
            );
            ruleValid = false;
          }
          seenSources.add(mapping.from);
        }
      }
    }

    const assignmentPositions = new Set<string>();
    for (const assignment of rule.assignments) {
      if (assignmentPositions.has(assignment.position)) {
        issues.push(
          `${ruleContext} repeats assignment position "${assignment.position}" in the result shape.`,
        );
        ruleValid = false;
        continue;
      }
      assignmentPositions.add(assignment.position);
      if (!uniqueIndices.includes(assignment.targetIndex)) {
        issues.push(
          `${ruleContext} targets unknown index "${assignment.targetIndex}" for position "${assignment.position}".`,
        );
        ruleValid = false;
      }
      switch (assignment.expression.kind) {
        case "original":
          if (!domainPositions.has(assignment.expression.position)) {
            issues.push(
              `${ruleContext} references original position "${assignment.expression.position}" which is not present in shape "${rule.domainShape}".`,
            );
            ruleValid = false;
          }
          break;
        case "bindingValue":
        case "bindingAssignment":
          if (!binderNames.has(assignment.expression.binder)) {
            issues.push(
              `${ruleContext} references unknown binder "${assignment.expression.binder}" in the result assignments.`,
            );
            ruleValid = false;
          }
          break;
        case "literal":
          break;
        default: {
          const _exhaustive: never = assignment.expression;
          issues.push(
            `${ruleContext} uses an unsupported assignment expression ${(assignment.expression as { kind: string }).kind}.`,
          );
          ruleValid = false;
        }
      }
    }

    const availableResultShapes = new Set(
      (shapesByIndex.get(rule.index) ?? []).map((candidate) => candidate.shape),
    );
    if (rule.resultShape.kind === "constant") {
      if (!availableResultShapes.has(rule.resultShape.shape)) {
        issues.push(
          `${ruleContext} references constant result shape "${rule.resultShape.shape}" which is not registered for index "${rule.index}".`,
        );
        ruleValid = false;
      }
    }
    if (rule.resultShape.kind === "binding" && !binderNames.has(rule.resultShape.binder)) {
      issues.push(
        `${ruleContext} sets the result shape from binder "${rule.resultShape.binder}" which is not declared.`,
      );
      ruleValid = false;
    }
    if (rule.resultShape.kind === "composition") {
      if (rule.resultShape.cases.length === 0 && !rule.resultShape.defaultShape) {
        issues.push(
          `${ruleContext} must specify at least one composition case or a default shape for the result shape.`,
        );
        ruleValid = false;
      }
      if (
        rule.resultShape.defaultShape &&
        !availableResultShapes.has(rule.resultShape.defaultShape)
      ) {
        issues.push(
          `${ruleContext} lists default composition shape "${rule.resultShape.defaultShape}" which is not registered for index "${rule.index}".`,
        );
        ruleValid = false;
      }
      for (const compositionCase of rule.resultShape.cases) {
        if (!availableResultShapes.has(compositionCase.resultShape)) {
          issues.push(
            `${ruleContext} references composition result shape "${compositionCase.resultShape}" which is not registered for index "${rule.index}".`,
          );
          ruleValid = false;
        }
        for (const requirement of compositionCase.binderShapes) {
          if (!binderNames.has(requirement.binder)) {
            issues.push(
              `${ruleContext} references binder "${requirement.binder}" in a composition case but it is not declared.`,
            );
            ruleValid = false;
            continue;
          }
          const targetIndex = bindingTargets.get(requirement.binder);
          if (!targetIndex) {
            continue;
          }
          const allowedShapes = shapesByIndex.get(targetIndex) ?? [];
          if (!allowedShapes.some((shape) => shape.shape === requirement.shape)) {
            issues.push(
              `${ruleContext} expects binder "${requirement.binder}" to produce shape "${requirement.shape}" but index "${targetIndex}" does not register it.`,
            );
            ruleValid = false;
          }
        }
      }
    }

    if (!ruleValid) {
      continue;
    }
    const key = substitutionKey(rule.index, rule.domainShape);
    const bucket = substitutionRulesByShape.get(key) ?? [];
    bucket.push(rule);
    substitutionRulesByShape.set(key, bucket);
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

  const applySubstitutionRules = (
    rules: ReadonlyArray<IndexedContainerSubstitutionRule>,
    element: IndexedContainerElement,
    replacementsByPosition: Map<string, ReplacementData>,
    codomain: EnumeratedFamilyData,
    context: string,
    originalAssignments: Map<string, IndexedContainerAssignment>,
  ): { result?: IndexedContainerElement; issues: ReadonlyArray<string> } => {
    const aggregatedIssues: string[] = [];
    for (const rule of rules) {
      const ruleContext = `${context} using rule (${rule.index}, ${rule.domainShape})`;
      const binderElements = new Map<string, IndexedContainerElement>();
      const binderBindings = new Map<string, IndexedContainerSubstitutionBinding>();
      let applicable = true;
      for (const binding of rule.bindings) {
        const replacement = replacementsByPosition.get(binding.position);
        if (!replacement) {
          aggregatedIssues.push(
            `${ruleContext} could not find a replacement element for position "${binding.position}".`,
          );
          applicable = false;
          break;
        }
        if (
          binding.allowedShapes &&
          binding.allowedShapes.length > 0 &&
          !binding.allowedShapes.includes(replacement.element.shape)
        ) {
          aggregatedIssues.push(
            `${ruleContext} received shape "${replacement.element.shape}" for binder "${binding.binder}" which is not permitted.`,
          );
          applicable = false;
          break;
        }
        binderElements.set(binding.binder, replacement.element);
        binderBindings.set(binding.binder, binding);
      }
      if (!applicable) {
        continue;
      }

      const binderValueCache = new Map<string, string>();
      const computeBinderValue = (binder: string): string | undefined => {
        if (binderValueCache.has(binder)) {
          return binderValueCache.get(binder);
        }
        const binderElement = binderElements.get(binder);
        if (!binderElement) {
          return undefined;
        }
        try {
          const value = witness.extractValue(binderElement);
          binderValueCache.set(binder, value);
          return value;
        } catch (error) {
          const message = error instanceof Error ? error.message : `${error}`;
          aggregatedIssues.push(
            `${ruleContext} failed to extract a value from binder "${binder}": ${message}`,
          );
          return undefined;
        }
      };

      let resultShapeName: string;
      switch (rule.resultShape.kind) {
        case "original":
          resultShapeName = element.shape;
          break;
        case "constant":
          resultShapeName = rule.resultShape.shape;
          break;
        case "binding": {
          const binderElement = binderElements.get(rule.resultShape.binder);
          if (!binderElement) {
            aggregatedIssues.push(
              `${ruleContext} references binder "${rule.resultShape.binder}" for the result shape but no replacement was recorded.`,
            );
            applicable = false;
            resultShapeName = element.shape;
            break;
          }
          resultShapeName = binderElement.shape;
          break;
        }
        case "composition": {
          const availableResultShapes = new Set(
            (shapesByIndex.get(element.index) ?? []).map((candidate) => candidate.shape),
          );
          let matchedShape: string | undefined;
          for (const entry of rule.resultShape.cases) {
            let match = true;
            for (const requirement of entry.binderShapes) {
              const binderElement = binderElements.get(requirement.binder);
              if (!binderElement) {
                match = false;
                break;
              }
              if (binderElement.shape !== requirement.shape) {
                match = false;
                break;
              }
            }
            if (match) {
              matchedShape = entry.resultShape;
              break;
            }
          }
          if (!matchedShape) {
            matchedShape = rule.resultShape.defaultShape;
          }
          if (!matchedShape) {
            aggregatedIssues.push(
              `${ruleContext} could not determine a composition result shape for (${element.index}, ${element.shape}).`,
            );
            applicable = false;
            resultShapeName = element.shape;
            break;
          }
          if (!availableResultShapes.has(matchedShape)) {
            aggregatedIssues.push(
              `${ruleContext} selected composition result shape "${matchedShape}" which is not available at index "${element.index}".`,
            );
            applicable = false;
            resultShapeName = element.shape;
            break;
          }
          resultShapeName = matchedShape;
          break;
        }
        default: {
          const _exhaustive: never = rule.resultShape;
          aggregatedIssues.push(
            `${ruleContext} encountered an unsupported shape expression ${(rule.resultShape as { kind: string }).kind}.`,
          );
          applicable = false;
          resultShapeName = element.shape;
        }
      }
      if (!applicable) {
        continue;
      }

      const computedAssignments: IndexedContainerAssignment[] = [];
      let assignmentFailed = false;
      for (const assignment of rule.assignments) {
        let value: string | undefined;
        const expression = assignment.expression;
        switch (expression.kind) {
          case "original": {
            const original = originalAssignments.get(expression.position);
            if (!original) {
              aggregatedIssues.push(
                `${ruleContext} references original position "${expression.position}" which is absent from the element.`,
              );
              assignmentFailed = true;
              break;
            }
            if (original.targetIndex !== assignment.targetIndex) {
              aggregatedIssues.push(
                `${ruleContext} cannot reuse original position "${expression.position}" because it targets "${original.targetIndex}" rather than "${assignment.targetIndex}".`,
              );
              assignmentFailed = true;
              break;
            }
            value = original.value;
            break;
          }
          case "bindingValue": {
            const binderValue = computeBinderValue(expression.binder);
            if (binderValue === undefined) {
              assignmentFailed = true;
              break;
            }
            value = binderValue;
            break;
          }
          case "bindingAssignment": {
            const binderElement = binderElements.get(expression.binder);
            if (!binderElement) {
              aggregatedIssues.push(
                `${ruleContext} references binder "${expression.binder}" for position "${assignment.position}" but no replacement was provided.`,
              );
              assignmentFailed = true;
              break;
            }
            const binderAssignment = binderElement.assignments.find(
              (candidate) => candidate.position === expression.position,
            );
            if (!binderAssignment) {
              aggregatedIssues.push(
                `${ruleContext} could not find assignment "${expression.position}" on binder "${expression.binder}".`,
              );
              assignmentFailed = true;
              break;
            }
            if (binderAssignment.targetIndex !== assignment.targetIndex) {
              const binding = binderBindings.get(expression.binder);
              const reindexMap = new Map<string, string>();
              binding?.reindexTargets?.forEach(({ from, to }) => {
                reindexMap.set(from, to);
              });
              const allowedTarget = reindexMap.get(binderAssignment.targetIndex);
              if (allowedTarget !== assignment.targetIndex) {
                aggregatedIssues.push(
                  `${ruleContext} cannot reindex binder "${expression.binder}" assignment "${expression.position}" from "${binderAssignment.targetIndex}" to "${assignment.targetIndex}".`,
                );
                assignmentFailed = true;
                break;
              }
            }
            value = binderAssignment.value;
            break;
          }
          case "literal":
            value = expression.value;
            break;
          default: {
            const _exhaustive: never = expression;
            aggregatedIssues.push(
              `${ruleContext} encountered an unsupported assignment expression ${(expression as { kind: string }).kind}.`,
            );
            assignmentFailed = true;
          }
        }
        if (assignmentFailed) {
          break;
        }
        if (value === undefined) {
          assignmentFailed = true;
          break;
        }
        const allowed = codomain.componentValues.get(assignment.targetIndex);
        if (!allowed || !allowed.has(value)) {
          aggregatedIssues.push(
            `${ruleContext} produced value "${value}" for position "${assignment.position}" which is not available in component "${assignment.targetIndex}" of family "${codomain.family.label}".`,
          );
        }
        computedAssignments.push({
          position: assignment.position,
          targetIndex: assignment.targetIndex,
          value,
        });
      }
      if (assignmentFailed) {
        continue;
      }

      const candidate: IndexedContainerElement = {
        index: element.index,
        shape: resultShapeName,
        assignments: Object.freeze(computedAssignments) as ReadonlyArray<IndexedContainerAssignment>,
      };

      if (
        !validateElement(
          shapesByIndex,
          codomain.componentValues,
          candidate,
          `${ruleContext} result`,
          aggregatedIssues,
        )
      ) {
        continue;
      }

      if (!codomain.containerKeys.has(elementKey(candidate))) {
        aggregatedIssues.push(
          `${ruleContext} produced (${candidate.index}, ${candidate.shape}) which is not present in family "${codomain.family.label}".`,
        );
        continue;
      }

      return { result: candidate, issues: aggregatedIssues };
    }

    return { issues: aggregatedIssues };
  };

  const extendElement = (
    _domain: EnumeratedFamilyData,
    codomain: EnumeratedFamilyData,
    arrow: (element: IndexedContainerBaseElement) => IndexedContainerElement,
    element: IndexedContainerElement,
    context: string,
  ): IndexedContainerElement | undefined => {
    const replacementsByPosition = new Map<string, ReplacementData>();
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
      replacementsByPosition.set(assignment.position, {
        assignment,
        element: image,
      });
    }

    const originalAssignments = new Map<string, IndexedContainerAssignment>();
    for (const assignment of element.assignments) {
      originalAssignments.set(assignment.position, assignment);
    }

    const substitutionKeyName = substitutionKey(element.index, element.shape);
    const substitutionRulesForShape = substitutionRulesByShape.get(substitutionKeyName);

    let result: IndexedContainerElement | undefined;
    if (substitutionRulesForShape && substitutionRulesForShape.length > 0) {
      const { result: substituted, issues: substitutionIssues } = applySubstitutionRules(
        substitutionRulesForShape,
        element,
        replacementsByPosition,
        codomain,
        context,
        originalAssignments,
      );
      if (!substituted) {
        const recorded = new Set<string>();
        for (const issue of substitutionIssues) {
          if (issue && !recorded.has(issue)) {
            issues.push(issue);
            recorded.add(issue);
          }
        }
        return undefined;
      }
      result = substituted;
    } else {
      const fallbackAssignments: IndexedContainerAssignment[] = [];
      for (const assignment of element.assignments) {
        const replacement = replacementsByPosition.get(assignment.position);
        if (!replacement) {
          issues.push(
            `${context}: substitution fallback missing replacement for position "${assignment.position}".`,
          );
          return undefined;
        }
        const extracted = witness.extractValue(replacement.element);
        const allowed = codomain.componentValues.get(assignment.targetIndex);
        if (!allowed || !allowed.has(extracted)) {
          issues.push(
            `${context}: extracted value "${extracted}" is not available in component "${assignment.targetIndex}" of family "${codomain.family.label}".`,
          );
        }
        fallbackAssignments.push({
          position: assignment.position,
          targetIndex: assignment.targetIndex,
          value: extracted,
        });
      }
      result = {
        index: element.index,
        shape: element.shape,
        assignments: Object.freeze(fallbackAssignments) as ReadonlyArray<IndexedContainerAssignment>,
      };
    }

    if (!result) {
      return undefined;
    }

    if (
      !validateElement(
        shapesByIndex,
        codomain.componentValues,
        result,
        `${context}: extended element`,
        issues,
      )
    ) {
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
            issues.push(`${context}: extend(unit) ? arrow.`);
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
      shape: "kappaReturn",
      positions: [{ position: "focus", targetIndex: "Nat" }],
    },
    {
      index: "Nat",
      shape: "kappaSucc",
      positions: [{ position: "focus", targetIndex: "Nat" }],
    },
    {
      index: "Stream",
      shape: "sigmaReturn",
      positions: [{ position: "tail", targetIndex: "Stream" }],
    },
    {
      index: "Stream",
      shape: "sigmaCons",
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
  substitutions: [
    {
      index: "Nat",
      domainShape: "kappaReturn",
      bindings: [
        { position: "focus", binder: "focus" },
      ],
      resultShape: { kind: "binding", binder: "focus" },
      assignments: [
        {
          position: "focus",
          targetIndex: "Nat",
          expression: { kind: "bindingAssignment", binder: "focus", position: "focus" },
        },
      ],
    },
    {
      index: "Nat",
      domainShape: "kappaSucc",
      bindings: [
        { position: "focus", binder: "focus" },
      ],
      resultShape: { kind: "binding", binder: "focus" },
      assignments: [
        {
          position: "focus",
          targetIndex: "Nat",
          expression: { kind: "bindingAssignment", binder: "focus", position: "focus" },
        },
      ],
    },
    {
      index: "Stream",
      domainShape: "sigmaReturn",
      bindings: [
        { position: "tail", binder: "tail", allowedShapes: ["sigmaReturn"] },
      ],
      resultShape: { kind: "binding", binder: "tail" },
      assignments: [
        {
          position: "tail",
          targetIndex: "Stream",
          expression: { kind: "bindingAssignment", binder: "tail", position: "tail" },
        },
      ],
    },
    {
      index: "Stream",
      domainShape: "sigmaCons",
      bindings: [
        { position: "head", binder: "head" },
        { position: "tail", binder: "tail" },
      ],
      resultShape: {
        kind: "composition",
        cases: [
          {
            resultShape: "sigmaCons",
            binderShapes: [{ binder: "tail", shape: "sigmaCons" }],
          },
        ],
        defaultShape: "sigmaCons",
      },
      assignments: [
        {
          position: "head",
          targetIndex: "Nat",
          expression: { kind: "bindingValue", binder: "head" },
        },
        {
          position: "tail",
          targetIndex: "Stream",
          expression: { kind: "bindingAssignment", binder: "tail", position: "tail" },
        },
      ],
    },
  ],
  unit: (family, element) => {
    switch (element.index) {
      case "Nat":
        return {
          index: "Nat",
          shape: "kappaReturn",
          assignments: Object.freeze([
            { position: "focus", targetIndex: "Nat", value: element.value },
          ]) as ReadonlyArray<IndexedContainerAssignment>,
        };
      case "Stream":
        return {
          index: "Stream",
          shape: "sigmaReturn",
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

