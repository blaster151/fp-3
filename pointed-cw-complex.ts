import type { FiniteCategory } from "./finite-cat";
import { pushUnique } from "./finite-cat";
import type { SimpleCat } from "./simple-cat";

export interface CWEdge<Vertex> {
  readonly id: string;
  readonly undirected: string;
  readonly canonical: boolean;
  readonly src: Vertex;
  readonly dst: Vertex;
  readonly inverse: string;
}

export interface PointedCWComplex<Vertex> {
  readonly name: string;
  readonly vertices: ReadonlyArray<Vertex>;
  readonly edges: ReadonlyArray<CWEdge<Vertex>>;
  readonly basepoint: Vertex;
  readonly eqVertex: (left: Vertex, right: Vertex) => boolean;
  readonly showVertex?: (value: Vertex) => string;
}

export type EdgePath = ReadonlyArray<string>;

export interface ComplexValidation {
  readonly valid: boolean;
  readonly issues: ReadonlyArray<string>;
}

const findVertexIndex = <Vertex>(
  vertices: ReadonlyArray<Vertex>,
  eq: (left: Vertex, right: Vertex) => boolean,
  vertex: Vertex,
): number => {
  const index = vertices.findIndex((candidate) => eq(candidate, vertex));
  if (index < 0) {
    throw new Error("vertex not present in complex");
  }
  return index;
};

const edgeMap = <Vertex>(complex: PointedCWComplex<Vertex>): Map<string, CWEdge<Vertex>> => {
  const map = new Map<string, CWEdge<Vertex>>();
  for (const edge of complex.edges) {
    map.set(edge.id, edge);
  }
  return map;
};

const reversePath = <Vertex>(
  complex: PointedCWComplex<Vertex>,
  path: EdgePath,
): EdgePath => {
  const edges = edgeMap(complex);
  return [...path]
    .reverse()
    .map((id) => {
      const edge = edges.get(id);
      if (edge === undefined) {
        throw new Error(`unknown edge ${id}`);
      }
      return edge.inverse;
    });
};

const traversePath = <Vertex>(
  complex: PointedCWComplex<Vertex>,
  start: Vertex,
  path: EdgePath,
): Vertex => {
  const edges = edgeMap(complex);
  let current = start;
  for (const id of path) {
    const edge = edges.get(id);
    if (edge === undefined) {
      throw new Error(`unknown edge ${id}`);
    }
    if (!complex.eqVertex(current, edge.src)) {
      throw new Error(`edge ${id} does not start at the expected vertex`);
    }
    current = edge.dst;
  }
  return current;
};

export const validatePointedCWComplex = <Vertex>(
  complex: PointedCWComplex<Vertex>,
): ComplexValidation => {
  const issues: string[] = [];
  const edges = edgeMap(complex);
  const undirectedCount = new Map<string, number>();
  for (const edge of complex.edges) {
    undirectedCount.set(edge.undirected, (undirectedCount.get(edge.undirected) ?? 0) + 1);
    if (!edges.has(edge.inverse)) {
      issues.push(`edge ${edge.id} is missing its inverse ${edge.inverse}`);
    }
    if (edge.id === edge.inverse) {
      issues.push(`edge ${edge.id} must not list itself as inverse`);
    }
  }
  for (const [label, count] of undirectedCount.entries()) {
    if (count !== 2) {
      issues.push(`undirected edge ${label} must have exactly two orientations (found ${count})`);
    }
  }
  const baseIndex = findVertexIndex(complex.vertices, complex.eqVertex, complex.basepoint);
  if (baseIndex < 0) {
    issues.push("basepoint is not among vertices");
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }
  try {
    const visited = new Set<number>();
    const queue: number[] = [baseIndex];
    visited.add(baseIndex);
    while (queue.length > 0) {
      const index = queue.shift();
      const vertex = index === undefined ? undefined : complex.vertices[index];
      if (vertex === undefined) {
        continue;
      }
      for (const edge of complex.edges) {
        if (complex.eqVertex(edge.src, vertex)) {
          const dstIndex = findVertexIndex(complex.vertices, complex.eqVertex, edge.dst);
          if (!visited.has(dstIndex)) {
            visited.add(dstIndex);
            queue.push(dstIndex);
          }
        }
      }
    }
    if (visited.size !== complex.vertices.length) {
      issues.push("complex must be path connected");
    }
  } catch (error) {
    issues.push((error as Error).message);
  }
  return { valid: issues.length === 0, issues };
};

export interface PointedCWMap<SrcVertex, TgtVertex> {
  readonly name: string;
  readonly source: PointedCWComplex<SrcVertex>;
  readonly target: PointedCWComplex<TgtVertex>;
  readonly onVertex: (vertex: SrcVertex) => TgtVertex;
  readonly edgeImages: ReadonlyMap<string, EdgePath>;
}

export interface MapValidation {
  readonly valid: boolean;
  readonly issues: ReadonlyArray<string>;
}

const vertexExists = <Vertex>(
  complex: PointedCWComplex<Vertex>,
  vertex: Vertex,
): boolean => complex.vertices.some((candidate) => complex.eqVertex(candidate, vertex));

const edgePathImage = <SrcVertex, TgtVertex>(
  map: PointedCWMap<SrcVertex, TgtVertex>,
  edgeId: string,
): EdgePath => {
  const image = map.edgeImages.get(edgeId);
  if (image === undefined) {
    throw new Error(`edge ${edgeId} is missing an assigned image`);
  }
  return image;
};

export const applyEdgePath = <SrcVertex, TgtVertex>(
  map: PointedCWMap<SrcVertex, TgtVertex>,
  path: EdgePath,
): EdgePath => {
  const result: string[] = [];
  for (const edgeId of path) {
    const image = edgePathImage(map, edgeId);
    result.push(...image);
  }
  return result;
};

export const validatePointedCWMap = <SrcVertex, TgtVertex>(
  map: PointedCWMap<SrcVertex, TgtVertex>,
): MapValidation => {
  const issues: string[] = [];
  const { source, target } = map;
  if (!vertexExists(target, map.onVertex(source.basepoint))) {
    issues.push("basepoint must map to a vertex in the target complex");
  } else if (!target.eqVertex(map.onVertex(source.basepoint), target.basepoint)) {
    issues.push("map must preserve basepoints");
  }
  const targetEdges = edgeMap(target);
  for (const edge of source.edges) {
    try {
      const image = edgePathImage(map, edge.id);
      const start = map.onVertex(edge.src);
      if (!vertexExists(target, start)) {
        issues.push(`edge ${edge.id} maps from a vertex not present in target`);
        continue;
      }
      const endpoint = traversePath(target, start, image);
      if (!target.eqVertex(endpoint, map.onVertex(edge.dst))) {
        issues.push(`edge ${edge.id} does not map to a path ending at the image of its target`);
      }
      const inverseImage = edgePathImage(map, edge.inverse);
      const reversed = reversePath(target, image);
      const mismatch = inverseImage.length !== reversed.length || inverseImage.some((id, index) => id !== reversed[index]);
      if (mismatch) {
        issues.push(`edge ${edge.id} image is not inverse-consistent`);
      }
      for (const id of image) {
        if (!targetEdges.has(id)) {
          issues.push(`edge ${edge.id} image references unknown edge ${id}`);
        }
      }
    } catch (error) {
      issues.push((error as Error).message);
    }
  }
  return { valid: issues.length === 0, issues };
};

export const identityPointedCWMap = <Vertex>(
  complex: PointedCWComplex<Vertex>,
): PointedCWMap<Vertex, Vertex> => {
  const edgeImages = new Map<string, EdgePath>();
  for (const edge of complex.edges) {
    edgeImages.set(edge.id, [edge.id]);
  }
  return {
    name: `id_${complex.name}`,
    source: complex,
    target: complex,
    onVertex: (vertex) => vertex,
    edgeImages,
  };
};

export const composePointedCWMaps = <A, B, C>(
  g: PointedCWMap<B, C>,
  f: PointedCWMap<A, B>,
): PointedCWMap<A, C> => {
  if (f.target !== g.source) {
    throw new Error("pointed CW map composition requires matching intermediate complex");
  }
  const edgeImages = new Map<string, EdgePath>();
  for (const edge of f.source.edges) {
    const first = edgePathImage(f, edge.id);
    const composed = applyEdgePath(g, first);
    edgeImages.set(edge.id, composed);
  }
  for (const edge of f.source.edges) {
    const image = edgeImages.get(edge.id);
    if (image === undefined) {
      continue;
    }
    edgeImages.set(edge.inverse, reversePath(g.target, image));
  }
  return {
    name: `${g.name}∘${f.name}`,
    source: f.source,
    target: g.target,
    onVertex: (vertex) => g.onVertex(f.onVertex(vertex)),
    edgeImages,
  };
};

export const equalPointedCWMaps = <Vertex>(
  left: PointedCWMap<Vertex, Vertex>,
  right: PointedCWMap<Vertex, Vertex>,
): boolean => {
  if (left.source !== right.source || left.target !== right.target) {
    return false;
  }
  const { source, target } = left;
  for (const vertex of source.vertices) {
    if (!target.eqVertex(left.onVertex(vertex), right.onVertex(vertex))) {
      return false;
    }
  }
  for (const edge of source.edges) {
    const leftPath = left.edgeImages.get(edge.id);
    const rightPath = right.edgeImages.get(edge.id);
    if (leftPath === undefined || rightPath === undefined) {
      return false;
    }
    if (leftPath.length !== rightPath.length) {
      return false;
    }
    for (let index = 0; index < leftPath.length; index += 1) {
      if (leftPath[index] !== rightPath[index]) {
        return false;
      }
    }
  }
  return true;
};

export interface PointedCWCategory<Vertex, Arr>
  extends FiniteCategory<PointedCWComplex<Vertex>, Arr> {
  readonly name: string;
}

export const pointedCWCategory = <Vertex>(
  name: string,
  objects: ReadonlyArray<PointedCWComplex<Vertex>>,
  additionalArrows: ReadonlyArray<PointedCWMap<Vertex, Vertex>>,
): PointedCWCategory<Vertex, PointedCWMap<Vertex, Vertex>> => {
  const identities = objects.map((object) => identityPointedCWMap(object));
  const arrows: Array<PointedCWMap<Vertex, Vertex>> = [];
  for (const arrow of [...identities, ...additionalArrows]) {
    pushUnique(arrows, arrow, (a, b) => a === b || (a.name === b.name && a.source === b.source && a.target === b.target));
  }
  const compose = (
    g: PointedCWMap<Vertex, Vertex>,
    f: PointedCWMap<Vertex, Vertex>,
  ): PointedCWMap<Vertex, Vertex> => {
    if (f.target !== g.source) {
      throw new Error("composition requires matching domains");
    }
    return composePointedCWMaps(g, f);
  };
  const category: PointedCWCategory<Vertex, PointedCWMap<Vertex, Vertex>> = {
    name,
    objects: [...objects],
    arrows,
    id: (object) => identityPointedCWMap(object),
    compose,
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    eq: (leftArrow, rightArrow) => equalPointedCWMaps(leftArrow, rightArrow),
  };
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

export const pointedCWSamples = <Vertex>(
  category: PointedCWCategory<Vertex, PointedCWMap<Vertex, Vertex>>,
): {
  readonly objects: ReadonlyArray<PointedCWComplex<Vertex>>;
  readonly arrows: ReadonlyArray<PointedCWMap<Vertex, Vertex>>;
  readonly composablePairs: ReadonlyArray<{ readonly f: PointedCWMap<Vertex, Vertex>; readonly g: PointedCWMap<Vertex, Vertex> }>;
} => ({
  objects: category.objects,
  arrows: category.arrows,
  composablePairs: collectComposablePairs(category.arrows, category),
});

const canonicalVertexShow = (value: string): string => value;

const eqString = (left: string, right: string): boolean => left === right;

export const circleCW = (): PointedCWComplex<string> => {
  const basepoint = "*";
  const vertices = [basepoint];
  const edges: ReadonlyArray<CWEdge<string>> = [
    { id: "loop", undirected: "loop", canonical: true, src: basepoint, dst: basepoint, inverse: "loop_inv" },
    { id: "loop_inv", undirected: "loop", canonical: false, src: basepoint, dst: basepoint, inverse: "loop" },
  ];
  return {
    name: "S¹",
    vertices,
    edges,
    basepoint,
    eqVertex: eqString,
    showVertex: canonicalVertexShow,
  };
};

export const diskCW = (): PointedCWComplex<string> => {
  const basepoint = "o";
  return {
    name: "D²",
    vertices: [basepoint],
    edges: [],
    basepoint,
    eqVertex: eqString,
    showVertex: canonicalVertexShow,
  };
};

export const annulusCW = (): PointedCWComplex<string> => {
  const base = "b";
  const interior = "i";
  const vertices = [base, interior];
  const edges: ReadonlyArray<CWEdge<string>> = [
    { id: "loop", undirected: "loop", canonical: true, src: base, dst: base, inverse: "loop_inv" },
    { id: "loop_inv", undirected: "loop", canonical: false, src: base, dst: base, inverse: "loop" },
    { id: "spoke", undirected: "spoke", canonical: true, src: base, dst: interior, inverse: "spoke_inv" },
    { id: "spoke_inv", undirected: "spoke", canonical: false, src: interior, dst: base, inverse: "spoke" },
  ];
  return {
    name: "Annulus",
    vertices,
    edges,
    basepoint: base,
    eqVertex: eqString,
    showVertex: canonicalVertexShow,
  };
};

export const circleIntoAnnulusInclusion = (
  circle: PointedCWComplex<string>,
  annulus: PointedCWComplex<string>,
): PointedCWMap<string, string> => {
  const edgeImages = new Map<string, EdgePath>([
    ["loop", ["loop"]],
    ["loop_inv", ["loop_inv"]],
  ]);
  return {
    name: "i_{S¹→Ann}",
    source: circle,
    target: annulus,
    onVertex: () => annulus.basepoint,
    edgeImages,
  };
};

export const annulusRetractionToCircle = (
  annulus: PointedCWComplex<string>,
  circle: PointedCWComplex<string>,
): PointedCWMap<string, string> => {
  const edgeImages = new Map<string, EdgePath>([
    ["loop", ["loop"]],
    ["loop_inv", ["loop_inv"]],
    ["spoke", []],
    ["spoke_inv", []],
  ]);
  return {
    name: "r_{Ann→S¹}",
    source: annulus,
    target: circle,
    onVertex: (vertex) => (vertex === annulus.basepoint ? circle.basepoint : circle.basepoint),
    edgeImages,
  };
};

export const circleIntoDiskInclusion = (
  circle: PointedCWComplex<string>,
  disk: PointedCWComplex<string>,
): PointedCWMap<string, string> => {
  const edgeImages = new Map<string, EdgePath>([
    ["loop", []],
    ["loop_inv", []],
  ]);
  return {
    name: "i_{S¹→D²}",
    source: circle,
    target: disk,
    onVertex: () => disk.basepoint,
    edgeImages,
  };
};

export const diskRadialRetractionToCircle = (
  disk: PointedCWComplex<string>,
  circle: PointedCWComplex<string>,
): PointedCWMap<string, string> => {
  const edgeImages = new Map<string, EdgePath>();
  for (const edge of disk.edges) {
    edgeImages.set(edge.id, []);
  }
  return {
    name: "r_{D²→S¹}",
    source: disk,
    target: circle,
    onVertex: () => circle.basepoint,
    edgeImages,
  };
};

