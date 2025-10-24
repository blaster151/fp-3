import type { GroupHomomorphism } from "./kinds/group-automorphism";
import {
  makeFreeGroup,
  multiplyWords,
  inverseWord,
  wordEquals,
  wordFromGenerator,
  type FreeGroup,
  type FreeGroupWord,
} from "./free-group";
import type { FunctorWithWitness } from "./functor";
import { constructFunctorWithWitness } from "./functor";
import type { FunctorCheckSamples } from "./functor";
import type { PointedCWComplex, PointedCWMap, PointedCWCategory } from "./pointed-cw-complex";
import {
  applyEdgePath,
  pointedCWSamples,
  validatePointedCWComplex,
  validatePointedCWMap,
  pointedCWCategory,
  circleCW,
  diskCW,
  annulusCW,
  circleIntoAnnulusInclusion,
  annulusRetractionToCircle,
  circleIntoDiskInclusion,
  diskRadialRetractionToCircle,
} from "./pointed-cw-complex";
import type { FiniteCategory } from "./finite-cat";
import type { SimpleCat } from "./simple-cat";

export interface FundamentalGroupGenerator {
  readonly id: string;
  readonly loop: ReadonlyArray<string>;
}

export interface FundamentalGroupData {
  readonly space: PointedCWComplex<string>;
  readonly group: FreeGroup<string>;
  readonly generatorLoops: ReadonlyArray<FundamentalGroupGenerator>;
  readonly evaluatePath: (path: ReadonlyArray<string>) => FreeGroupWord<string>;
  readonly edgeWord: (edgeId: string) => FreeGroupWord<string>;
}

const parentTree = (
  complex: PointedCWComplex<string>,
  baseIndex: number,
): Map<number, { readonly parent: number; readonly edge: string }> => {
  const parents = new Map<number, { readonly parent: number; readonly edge: string }>();
  const visited = new Set<number>([baseIndex]);
  const queue: number[] = [baseIndex];
  while (queue.length > 0) {
    const currentIndex = queue.shift();
    if (currentIndex === undefined) {
      continue;
    }
    const currentVertex = complex.vertices[currentIndex];
    if (currentVertex === undefined) {
      continue;
    }
    for (const edge of complex.edges) {
      if (!complex.eqVertex(edge.src, currentVertex)) {
        continue;
      }
      const neighborIndex = complex.vertices.findIndex((vertex) => complex.eqVertex(vertex, edge.dst));
      if (neighborIndex < 0 || visited.has(neighborIndex)) {
        continue;
      }
      visited.add(neighborIndex);
      parents.set(neighborIndex, { parent: currentIndex, edge: edge.id });
      queue.push(neighborIndex);
    }
  }
  return parents;
};

const pathToIndex = (
  complex: PointedCWComplex<string>,
  parents: Map<number, { readonly parent: number; readonly edge: string }>,
  baseIndex: number,
  targetIndex: number,
): ReadonlyArray<string> => {
  if (targetIndex === baseIndex) {
    return [];
  }
  const path: string[] = [];
  let cursor = targetIndex;
  while (cursor !== baseIndex) {
    const entry = parents.get(cursor);
    if (entry === undefined) {
      throw new Error("target vertex is not reachable from basepoint");
    }
    path.push(entry.edge);
    cursor = entry.parent;
  }
  return path.reverse();
};

const reversePath = (
  complex: PointedCWComplex<string>,
  path: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const reversed: string[] = [];
  const edges = new Map<string, string>();
  for (const edge of complex.edges) {
    edges.set(edge.id, edge.inverse);
  }
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const id = path[index];
    const inverse = id === undefined ? undefined : edges.get(id);
    if (inverse === undefined) {
      throw new Error(`edge ${id} missing inverse`);
    }
    reversed.push(inverse);
  }
  return reversed;
};

const reducePathToWord = (
  complex: PointedCWComplex<string>,
  treeUndirected: ReadonlySet<string>,
  canonicalEdgeWord: Map<string, FreeGroupWord<string>>,
  edgesById: Map<string, { readonly undirected: string; readonly inverse: string }>,
  path: ReadonlyArray<string>,
): FreeGroupWord<string> => {
  let word: FreeGroupWord<string> = [];
  for (const edgeId of path) {
    const edge = edgesById.get(edgeId);
    if (edge === undefined) {
      throw new Error(`unknown edge ${edgeId}`);
    }
    if (!treeUndirected.has(edge.undirected)) {
      const canonical = canonicalEdgeWord.get(edgeId);
      if (canonical !== undefined) {
        word = multiplyWords(word, canonical);
      } else {
        const inverseWordImage = canonicalEdgeWord.get(edge.inverse);
        if (inverseWordImage === undefined) {
          throw new Error(`non-tree edge ${edgeId} missing generator mapping`);
        }
        word = multiplyWords(word, inverseWord(inverseWordImage));
      }
    }
  }
  return word;
};

export const computeFundamentalGroup = (
  complex: PointedCWComplex<string>,
): FundamentalGroupData => {
  const validation = validatePointedCWComplex(complex);
  if (!validation.valid) {
    throw new Error(`invalid pointed CW complex: ${validation.issues.join(", ")}`);
  }
  const baseIndex = complex.vertices.findIndex((vertex) => complex.eqVertex(vertex, complex.basepoint));
  if (baseIndex < 0) {
    throw new Error("basepoint missing from complex");
  }
  const parents = parentTree(complex, baseIndex);
  const treeEdges = new Set<string>();
  for (const entry of parents.values()) {
    const edge = complex.edges.find((candidate) => candidate.id === entry.edge);
    if (edge !== undefined) {
      treeEdges.add(edge.undirected);
    }
  }
  const generatorEdges = complex.edges.filter(
    (edge) => edge.canonical && !treeEdges.has(edge.undirected),
  );
  const generatorNames = generatorEdges.map((edge) => `${complex.name}:${edge.undirected}`);
  const group = makeFreeGroup(generatorNames);
  const canonicalEdgeWord = new Map<string, FreeGroupWord<string>>();
  const edgesById = new Map<string, { readonly undirected: string; readonly inverse: string }>();
  const generatorLoops: FundamentalGroupGenerator[] = [];
  for (let index = 0; index < complex.edges.length; index += 1) {
    const edge = complex.edges[index];
    if (edge !== undefined) {
      const inverse = edge.inverse;
      if (inverse === undefined) {
        throw new Error(`edge ${edge.id} is missing an inverse`);
      }
      edgesById.set(edge.id, { undirected: edge.undirected, inverse });
    }
  }
  generatorEdges.forEach((edge, position) => {
    const name = generatorNames[position];
    if (name === undefined) {
      throw new Error(`missing generator name for edge ${edge.id}`);
    }
    const inverse = edge.inverse;
    if (inverse === undefined) {
      throw new Error(`edge ${edge.id} is missing an inverse`);
    }
    canonicalEdgeWord.set(edge.id, wordFromGenerator(name));
    canonicalEdgeWord.set(inverse, inverseWord(wordFromGenerator(name)));
    const srcIndex = complex.vertices.findIndex((vertex) => complex.eqVertex(vertex, edge.src));
    const dstIndex = complex.vertices.findIndex((vertex) => complex.eqVertex(vertex, edge.dst));
    const pathToSrc = pathToIndex(complex, parents, baseIndex, srcIndex);
    const pathToDst = pathToIndex(complex, parents, baseIndex, dstIndex);
    const loopPath = [...pathToSrc, edge.id, ...reversePath(complex, pathToDst)];
    generatorLoops.push({ id: name, loop: loopPath });
  });
  const evaluatePath = (path: ReadonlyArray<string>): FreeGroupWord<string> =>
    reducePathToWord(complex, treeEdges, canonicalEdgeWord, edgesById, path);
  const edgeWord = (edgeId: string): FreeGroupWord<string> => evaluatePath([edgeId]);
  return {
    space: complex,
    group,
    generatorLoops,
    evaluatePath,
    edgeWord,
  };
};

export interface GroupObject {
  readonly name: string;
  readonly structure: FreeGroup<string>;
}

export interface GroupHomArrow {
  readonly name: string;
  readonly dom: string;
  readonly cod: string;
  readonly map: (word: FreeGroupWord<string>) => FreeGroupWord<string>;
}

export interface GroupCategory
  extends FiniteCategory<GroupObject, GroupHomArrow> {
  readonly lookup: (name: string) => GroupObject;
}

export const makeGroupCategory = (
  objects: ReadonlyArray<GroupObject>,
): GroupCategory => {
  const byName = new Map<string, GroupObject>();
  for (const object of objects) {
    byName.set(object.name, object);
  }
  const arrows: GroupHomArrow[] = [];
  const lookup = (name: string): GroupObject => {
    const object = byName.get(name);
    if (object === undefined) {
      throw new Error(`unknown group object ${name}`);
    }
    return object;
  };
  const eq = (left: GroupHomArrow, right: GroupHomArrow): boolean => {
    if (left.dom !== right.dom || left.cod !== right.cod) {
      return false;
    }
    const domain = lookup(left.dom);
    const codomain = lookup(left.cod);
    return domain.structure.samples.every((sample) =>
      codomain.structure.eq(left.map(sample), right.map(sample)),
    );
  };
  const id = (object: GroupObject): GroupHomArrow => ({
    name: `id_${object.name}`,
    dom: object.name,
    cod: object.name,
    map: (word) => word,
  });
  const compose = (g: GroupHomArrow, f: GroupHomArrow): GroupHomArrow => {
    if (f.cod !== g.dom) {
      throw new Error("group hom composition requires matching codomain/domain");
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (word) => g.map(f.map(word)),
    };
  };
  const category: GroupCategory = {
    objects: [...objects],
    arrows,
    lookup,
    id,
    compose,
    src: (arrow) => lookup(arrow.dom),
    dst: (arrow) => lookup(arrow.cod),
    eq,
  };
  for (const object of objects) {
    arrows.push(id(object));
  }
  return category;
};

const collectComposablePairs = <Obj, Arr>(
  arrows: ReadonlyArray<Arr>,
  category: SimpleCat<Obj, Arr>,
): ReadonlyArray<{ readonly f: Arr; readonly g: Arr }> =>
  arrows.flatMap((f) =>
    arrows
      .filter((g) => category.src(g) === category.dst(f))
      .map((g) => ({ f, g })),
  );

export interface FundamentalGroupFunctorResult {
  readonly category: GroupCategory;
  readonly functor: FunctorWithWitness<PointedCWComplex<string>, PointedCWMap<string, string>, GroupObject, GroupHomArrow>;
  readonly objectData: ReadonlyMap<PointedCWComplex<string>, FundamentalGroupData>;
  readonly arrowData: ReadonlyMap<PointedCWMap<string, string>, GroupHomomorphism<FreeGroupWord<string>, FreeGroupWord<string>>>;
}

const evaluateGeneratorImages = (
  map: PointedCWMap<string, string>,
  sourceData: FundamentalGroupData,
  targetData: FundamentalGroupData,
): Map<string, FreeGroupWord<string>> => {
  const generatorImages = new Map<string, FreeGroupWord<string>>();
  for (const generator of sourceData.generatorLoops) {
    const mappedPath = applyEdgePath(map, generator.loop);
    const word = targetData.evaluatePath(mappedPath);
    generatorImages.set(generator.id, word);
  }
  return generatorImages;
};

const inducedHomomorphism = (
  generatorImages: Map<string, FreeGroupWord<string>>,
  source: FundamentalGroupData,
  target: FundamentalGroupData,
): GroupHomomorphism<FreeGroupWord<string>, FreeGroupWord<string>> => ({
  source: source.group,
  target: target.group,
  map: (word) => {
    let result: FreeGroupWord<string> = [];
    for (const letter of word) {
      const image = generatorImages.get(letter.generator);
      if (image === undefined) {
        throw new Error(`missing image for generator ${letter.generator}`);
      }
      const contribution = letter.exponent === 1 ? image : inverseWord(image);
      result = multiplyWords(result, contribution);
    }
    return result;
  },
});

export const buildFundamentalGroupFunctor = (
  category: PointedCWCategory<string, PointedCWMap<string, string>>,
): FundamentalGroupFunctorResult => {
  const objectData = new Map<PointedCWComplex<string>, FundamentalGroupData>();
  const groupObjects: GroupObject[] = [];
  for (const object of category.objects) {
    const data = computeFundamentalGroup(object);
    objectData.set(object, data);
    groupObjects.push({ name: `π₁(${object.name})`, structure: data.group });
  }
  const groupCategory = makeGroupCategory(groupObjects);
  const arrowData = new Map<PointedCWMap<string, string>, GroupHomomorphism<FreeGroupWord<string>, FreeGroupWord<string>>>();
  const arrowImages = new Map<PointedCWMap<string, string>, GroupHomArrow>();
  for (const arrow of category.arrows) {
    const source = objectData.get(arrow.source);
    const target = objectData.get(arrow.target);
    if (source === undefined || target === undefined) {
      continue;
    }
    const generatorImages = evaluateGeneratorImages(arrow, source, target);
    const hom = inducedHomomorphism(generatorImages, source, target);
    arrowData.set(arrow, hom);
    const arrowName = `π₁(${arrow.name})`;
    const arrowImage: GroupHomArrow = {
      name: arrowName,
      dom: `π₁(${arrow.source.name})`,
      cod: `π₁(${arrow.target.name})`,
      map: hom.map,
    };
    (groupCategory.arrows as GroupHomArrow[]).push(arrowImage);
    arrowImages.set(arrow, arrowImage);
  }
  const samples: FunctorCheckSamples<PointedCWComplex<string>, PointedCWMap<string, string>> = pointedCWSamples(category);
  const functor = constructFunctorWithWitness(
    category,
    groupCategory,
    {
      F0: (object) => groupCategory.lookup(`π₁(${object.name})`),
      F1: (arrow) => arrowImages.get(arrow) ?? groupCategory.id(groupCategory.lookup(`π₁(${arrow.source.name})`)),
    },
    samples,
    ["Fundamental group functor on pointed 1-dimensional CW complexes"],
  );
  return {
    category: groupCategory,
    functor,
    objectData,
    arrowData,
  };
};

export interface RetractionObstructionResult {
  readonly obstructed: boolean;
  readonly details: string;
  readonly generator?: string;
  readonly expected?: FreeGroupWord<string>;
  readonly observed?: FreeGroupWord<string>;
}

export const retractionObstructionFromPi1 = (
  retraction: PointedCWMap<string, string>,
  inclusion: PointedCWMap<string, string>,
): RetractionObstructionResult => {
  if (retraction.target !== inclusion.source || retraction.source !== inclusion.target) {
    return {
      obstructed: true,
      details: "maps do not form a retraction pair on the nose",
    };
  }
  const inclusionValidation = validatePointedCWMap(inclusion);
  const retractionValidation = validatePointedCWMap(retraction);
  if (!inclusionValidation.valid) {
    return { obstructed: true, details: inclusionValidation.issues.join("; ") };
  }
  if (!retractionValidation.valid) {
    return { obstructed: true, details: retractionValidation.issues.join("; ") };
  }
  const sourceData = computeFundamentalGroup(inclusion.source);
  const ambientData = computeFundamentalGroup(inclusion.target);
  const inclusionImages = evaluateGeneratorImages(inclusion, sourceData, ambientData);
  const retractionImages = evaluateGeneratorImages(retraction, ambientData, sourceData);
  const inclusionHom = inducedHomomorphism(inclusionImages, sourceData, ambientData);
  const retractionHom = inducedHomomorphism(retractionImages, ambientData, sourceData);
  for (const generator of sourceData.generatorLoops) {
    const word = wordFromGenerator(generator.id);
    const image = retractionHom.map(inclusionHom.map(word));
    if (!wordEquals(word, image)) {
      return {
        obstructed: true,
        details: "π₁(r) ∘ π₁(i) fails to be the identity",
        generator: generator.id,
        expected: word,
        observed: image,
      };
    }
  }
  return {
    obstructed: false,
    details: "π₁(r) ∘ π₁(i) acts as the identity on generators",
  };
};

export interface BrouwerFixedPointResult {
  readonly holds: boolean;
  readonly reason: string;
  readonly obstruction?: RetractionObstructionResult;
}

export const brouwerFixedPointFromNoRetraction = (
  disk: PointedCWComplex<string>,
  circle: PointedCWComplex<string>,
  inclusion: PointedCWMap<string, string>,
  candidateRetraction: PointedCWMap<string, string>,
): BrouwerFixedPointResult => {
  const obstruction = retractionObstructionFromPi1(candidateRetraction, inclusion);
  if (!obstruction.obstructed) {
    return {
      holds: false,
      reason: "candidate retraction is compatible with π₁; no contradiction arises",
    };
  }
  return {
    holds: true,
    reason:
      "Any attempt to retract the disk onto its boundary contradicts the induced action on π₁, enforcing the Brouwer fixed-point theorem.",
    obstruction,
  };
};

export const fundamentalGroupDemoCategory = (): PointedCWCategory<string, PointedCWMap<string, string>> => {
  const circle = circleCW();
  const disk = diskCW();
  const annulus = annulusCW();
  const inclusionCircleAnnulus = circleIntoAnnulusInclusion(circle, annulus);
  const retractionAnnulusCircle = annulusRetractionToCircle(annulus, circle);
  const inclusionCircleDisk = circleIntoDiskInclusion(circle, disk);
  const retractionDiskCircle = diskRadialRetractionToCircle(disk, circle);
  return pointedCWCategory("CW¹", [circle, annulus, disk], [
    inclusionCircleAnnulus,
    retractionAnnulusCircle,
    inclusionCircleDisk,
    retractionDiskCircle,
  ]);
};

