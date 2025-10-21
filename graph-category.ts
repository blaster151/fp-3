import type { Edge, DiGraph, NodeId } from "./graph";
import { makeGraph } from "./graph";
import type { Category } from "./stdlib/category";
import type { PullbackCalculator, PullbackCertification, PullbackData } from "./pullback";
import { CategoryLimits } from "./stdlib/category-limits";
import { ArrowFamilies } from "./stdlib/arrow-families";

export interface GraphHom {
  readonly dom: DiGraph;
  readonly cod: DiGraph;
  readonly mapNode: (node: NodeId) => NodeId;
  readonly mapEdge: (edge: Edge) => Edge;
  readonly nodeMapping: ReadonlyMap<NodeId, NodeId>;
  readonly edgeMapping: ReadonlyMap<string, string>;
}

interface GraphHomConstruction {
  readonly dom: DiGraph;
  readonly cod: DiGraph;
  readonly nodeImage: (node: NodeId) => NodeId;
  readonly edgeImage: (edge: Edge) => Edge;
}

const edgeIndex = (graph: DiGraph): Map<string, Edge> => {
  const index = new Map<string, Edge>();
  for (const edge of graph.edges) {
    index.set(edge.id, edge);
  }
  return index;
};

export const makeGraphHom = ({ dom, cod, nodeImage, edgeImage }: GraphHomConstruction): GraphHom => {
  const nodeMapping = new Map<NodeId, NodeId>();
  for (const node of dom.nodes) {
    const image = nodeImage(node);
    if (!cod.nodes.has(image)) {
      throw new Error(`GraphHom: node image must lie in codomain: ${String(image)}`);
    }
    nodeMapping.set(node, image);
  }

  const codEdges = edgeIndex(cod);
  const edgeMapping = new Map<string, string>();
  for (const edge of dom.edges) {
    const image = edgeImage(edge);
    const witness = codEdges.get(image.id);
    if (!witness) {
      throw new Error(`GraphHom: edge image must exist in codomain: ${image.id}`);
    }
    const mappedSrc = nodeMapping.get(edge.src);
    const mappedDst = nodeMapping.get(edge.dst);
    if (mappedSrc === undefined || mappedDst === undefined) {
      throw new Error("GraphHom: node mapping must be total on domain nodes.");
    }
    if (witness.src !== mappedSrc || witness.dst !== mappedDst) {
      throw new Error(
        `GraphHom: edge image endpoints must match mapped endpoints (expected ${String(mappedSrc)} → ${String(
          mappedDst,
        )}, received ${String(witness.src)} → ${String(witness.dst)})`,
      );
    }
    edgeMapping.set(edge.id, witness.id);
  }

  const mapNode = (node: NodeId): NodeId => {
    const image = nodeMapping.get(node);
    if (image === undefined) {
      throw new Error(`GraphHom.mapNode: missing image for node ${String(node)}`);
    }
    return image;
  };

  const mapEdge = (edge: Edge): Edge => {
    const targetId = edgeMapping.get(edge.id);
    if (targetId === undefined) {
      throw new Error(`GraphHom.mapEdge: missing image for edge ${edge.id}`);
    }
    const witness = codEdges.get(targetId);
    if (!witness) {
      throw new Error(`GraphHom.mapEdge: codomain edge ${targetId} disappeared.`);
    }
    return witness;
  };

  return {
    dom,
    cod,
    mapNode,
    mapEdge,
    nodeMapping,
    edgeMapping,
  };
};

export const graphHomEquals = (left: GraphHom, right: GraphHom): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false;
  }
  if (left.nodeMapping.size !== right.nodeMapping.size || left.edgeMapping.size !== right.edgeMapping.size) {
    return false;
  }
  for (const [node, image] of left.nodeMapping) {
    if (right.nodeMapping.get(node) !== image) {
      return false;
    }
  }
  for (const [edge, image] of left.edgeMapping) {
    if (right.edgeMapping.get(edge) !== image) {
      return false;
    }
  }
  return true;
};

export const composeGraphHoms = (g: GraphHom, f: GraphHom): GraphHom => {
  if (f.cod !== g.dom) {
    throw new Error("GraphHom.compose: codomain/domain mismatch.");
  }
  const dom = f.dom;
  const cod = g.cod;
  const nodeImage = (node: NodeId): NodeId => g.mapNode(f.mapNode(node));
  const edgeImage = (edge: Edge): Edge => g.mapEdge(f.mapEdge(edge));
  return makeGraphHom({ dom, cod, nodeImage, edgeImage });
};

const graphEdgesById = (graph: DiGraph): Map<string, Edge> => edgeIndex(graph);

let productNodeCounter = 0;
let productEdgeCounter = 0;

const pairKey = (left: NodeId | string, right: NodeId | string, prefix: string): string =>
  `${prefix}${JSON.stringify([left, right])}`;

const buildBinaryProductWitness = (
  left: DiGraph,
  right: DiGraph,
): CategoryLimits.BinaryProductWithPairWitness<DiGraph, GraphHom> => {
  const nodePairToProduct = new Map<string, NodeId>();
  const productNodeToLeft = new Map<NodeId, NodeId>();
  const productNodeToRight = new Map<NodeId, NodeId>();
  const productNodes: NodeId[] = [];

  for (const leftNode of left.nodes) {
    for (const rightNode of right.nodes) {
      const key = pairKey(leftNode, rightNode, "n:");
      const id = `n[${productNodeCounter++}]`;
      nodePairToProduct.set(key, id);
      productNodeToLeft.set(id, leftNode);
      productNodeToRight.set(id, rightNode);
      productNodes.push(id);
    }
  }

  const productEdges: Edge[] = [];
  const edgePairToProduct = new Map<string, string>();
  const productEdgeToLeft = new Map<string, string>();
  const productEdgeToRight = new Map<string, string>();

  for (const leftEdge of left.edges) {
    for (const rightEdge of right.edges) {
      const sourceKey = pairKey(leftEdge.src, rightEdge.src, "n:");
      const targetKey = pairKey(leftEdge.dst, rightEdge.dst, "n:");
      const productSrc = nodePairToProduct.get(sourceKey);
      const productDst = nodePairToProduct.get(targetKey);
      if (productSrc === undefined || productDst === undefined) {
        continue;
      }
      const id = `e[${productEdgeCounter++}]`;
      productEdges.push({ id, src: productSrc, dst: productDst });
      const key = pairKey(leftEdge.id, rightEdge.id, "e:");
      edgePairToProduct.set(key, id);
      productEdgeToLeft.set(id, leftEdge.id);
      productEdgeToRight.set(id, rightEdge.id);
    }
  }

  const product = makeGraph(productNodes, productEdges);
  const leftEdges = graphEdgesById(left);
  const rightEdges = graphEdgesById(right);
  const productEdgesById = graphEdgesById(product);

  const projectionLeft = makeGraphHom({
    dom: product,
    cod: left,
    nodeImage: (node) => {
      const image = productNodeToLeft.get(node);
      if (image === undefined) {
        throw new Error("GraphBinaryProduct.proj1: missing node mapping");
      }
      return image;
    },
    edgeImage: (edge) => {
      const leftId = productEdgeToLeft.get(edge.id);
      if (!leftId) {
        throw new Error("GraphBinaryProduct.proj1: missing edge mapping");
      }
      const witness = leftEdges.get(leftId);
      if (!witness) {
        throw new Error("GraphBinaryProduct.proj1: edge disappeared in left factor");
      }
      return witness;
    },
  });

  const projectionRight = makeGraphHom({
    dom: product,
    cod: right,
    nodeImage: (node) => {
      const image = productNodeToRight.get(node);
      if (image === undefined) {
        throw new Error("GraphBinaryProduct.proj2: missing node mapping");
      }
      return image;
    },
    edgeImage: (edge) => {
      const rightId = productEdgeToRight.get(edge.id);
      if (!rightId) {
        throw new Error("GraphBinaryProduct.proj2: missing edge mapping");
      }
      const witness = rightEdges.get(rightId);
      if (!witness) {
        throw new Error("GraphBinaryProduct.proj2: edge disappeared in right factor");
      }
      return witness;
    },
  });

  const pair: CategoryLimits.BinaryProductWithPairWitness<DiGraph, GraphHom>["pair"] = (
    domain,
    leftArrow,
    rightArrow,
  ) => {
    if (leftArrow.dom !== domain || rightArrow.dom !== domain) {
      throw new Error("GraphBinaryProduct.pair: arrows must share a domain");
    }
    if (leftArrow.cod !== left) {
      throw new Error("GraphBinaryProduct.pair: left arrow must land in left factor");
    }
    if (rightArrow.cod !== right) {
      throw new Error("GraphBinaryProduct.pair: right arrow must land in right factor");
    }
    const nodeImage = (node: NodeId): NodeId => {
      const leftNode = leftArrow.mapNode(node);
      const rightNode = rightArrow.mapNode(node);
      const key = pairKey(leftNode, rightNode, "n:");
      const target = nodePairToProduct.get(key);
      if (target === undefined) {
        throw new Error(
          `GraphBinaryProduct.pair: missing product node for (${String(leftNode)}, ${String(rightNode)})`,
        );
      }
      return target;
    };
    const edgeImage = (edge: Edge): Edge => {
      const leftEdge = leftArrow.mapEdge(edge);
      const rightEdge = rightArrow.mapEdge(edge);
      const key = pairKey(leftEdge.id, rightEdge.id, "e:");
      const targetId = edgePairToProduct.get(key);
      if (!targetId) {
        throw new Error(
          `GraphBinaryProduct.pair: missing product edge for (${leftEdge.id}, ${rightEdge.id})`,
        );
      }
      const witness = productEdgesById.get(targetId);
      if (!witness) {
        throw new Error("GraphBinaryProduct.pair: product edge disappeared");
      }
      return witness;
    };
    return makeGraphHom({ dom: domain, cod: product, nodeImage, edgeImage });
  };

  return {
    obj: product,
    projections: [projectionLeft, projectionRight] as const,
    pair,
  };
};

export const GraphInitial: DiGraph = makeGraph([], []);

const TERMINAL_NODE = "⋆";
const TERMINAL_EDGE = "loop";

export const GraphTerminal: DiGraph = makeGraph([TERMINAL_NODE], [{ id: TERMINAL_EDGE, src: TERMINAL_NODE, dst: TERMINAL_NODE }]);

const TERMINAL_EDGE_OBJECT = GraphTerminal.edges[0]!;

export const GraphTerminate = (object: DiGraph): GraphHom =>
  makeGraphHom({
    dom: object,
    cod: GraphTerminal,
    nodeImage: () => TERMINAL_NODE,
    edgeImage: () => TERMINAL_EDGE_OBJECT,
  });

export const GraphInitialArrow = (target: DiGraph): GraphHom =>
  makeGraphHom({
    dom: GraphInitial,
    cod: target,
    nodeImage: () => {
      throw new Error("GraphInitialArrow: domain has no nodes");
    },
    edgeImage: () => {
      throw new Error("GraphInitialArrow: domain has no edges");
    },
  });

type GraphCategoryType = Category<DiGraph, GraphHom> &
  ArrowFamilies.HasDomCod<DiGraph, GraphHom> &
  CategoryLimits.HasFiniteProducts<DiGraph, GraphHom> &
  CategoryLimits.HasTerminal<DiGraph, GraphHom> &
  CategoryLimits.HasInitial<DiGraph, GraphHom> & {
    readonly binaryProduct: (
      left: DiGraph,
      right: DiGraph,
    ) => CategoryLimits.BinaryProductWithPairWitness<DiGraph, GraphHom>;
    readonly terminate: (object: DiGraph) => GraphHom;
    readonly initialArrow: (target: DiGraph) => GraphHom;
  };

export const GraphCategory: GraphCategoryType = {
  id: (graph) =>
    makeGraphHom({
      dom: graph,
      cod: graph,
      nodeImage: (node) => node,
      edgeImage: (edge) => edge,
    }),
  compose: composeGraphHoms,
  isId: (mor) => graphHomEquals(mor, GraphCategory.id(mor.dom)),
  eq: graphHomEquals,
  dom: (mor) => mor.dom,
  cod: (mor) => mor.cod,
  terminalObj: GraphTerminal,
  initialObj: GraphInitial,
  product: (objects) => {
    if (objects.length === 0) {
      return { obj: GraphTerminal, projections: [] };
    }
    if (objects.length === 1) {
      return { obj: objects[0]!, projections: [GraphCategory.id(objects[0]!)] };
    }
    if (objects.length === 2) {
      const witness = buildBinaryProductWitness(objects[0]!, objects[1]!);
      return { obj: witness.obj, projections: witness.projections };
    }
    throw new Error("GraphCategory.product: only binary products are supported presently.");
  },
  binaryProduct: (left: DiGraph, right: DiGraph) => buildBinaryProductWitness(left, right),
  terminate: GraphTerminate,
  initialArrow: GraphInitialArrow,
};

const ensureSharedCodomain = (f: GraphHom, h: GraphHom): void => {
  if (f.cod !== h.cod) {
    throw new Error("GraphPullback: arrows must share a codomain");
  }
};

const buildPullback = (f: GraphHom, h: GraphHom): PullbackData<DiGraph, GraphHom> => {
  ensureSharedCodomain(f, h);
  const domain = f.dom;
  const anchor = h.dom;

  const nodePairs = new Map<string, NodeId>();
  const toDomainNode = new Map<NodeId, NodeId>();
  const toAnchorNode = new Map<NodeId, NodeId>();
  const nodes: NodeId[] = [];
  let nodeCounter = 0;

  for (const leftNode of domain.nodes) {
    const leftImage = f.mapNode(leftNode);
    for (const rightNode of anchor.nodes) {
      const rightImage = h.mapNode(rightNode);
      if (leftImage === rightImage) {
        const key = pairKey(leftNode, rightNode, "pb:n:");
        const id = `pb_n[${nodeCounter++}]`;
        nodePairs.set(key, id);
        toDomainNode.set(id, leftNode);
        toAnchorNode.set(id, rightNode);
        nodes.push(id);
      }
    }
  }

  const domainEdges = graphEdgesById(domain);
  const anchorEdges = graphEdgesById(anchor);

  const edges: Edge[] = [];
  const toDomainEdge = new Map<string, string>();
  const toAnchorEdge = new Map<string, string>();
  let edgeCounter = 0;

  for (const leftEdge of domain.edges) {
    const leftImage = f.mapEdge(leftEdge);
    for (const rightEdge of anchor.edges) {
      const rightImage = h.mapEdge(rightEdge);
      if (leftImage.id !== rightImage.id) {
        continue;
      }
      const srcKey = pairKey(leftEdge.src, rightEdge.src, "pb:n:");
      const dstKey = pairKey(leftEdge.dst, rightEdge.dst, "pb:n:");
      const src = nodePairs.get(srcKey);
      const dst = nodePairs.get(dstKey);
      if (src === undefined || dst === undefined) {
        continue;
      }
      const id = `pb_e[${edgeCounter++}]`;
      edges.push({ id, src, dst });
      toDomainEdge.set(id, leftEdge.id);
      toAnchorEdge.set(id, rightEdge.id);
    }
  }

  const apex = makeGraph(nodes, edges);
  const apexEdges = graphEdgesById(apex);

  const toDomain = makeGraphHom({
    dom: apex,
    cod: domain,
    nodeImage: (node) => {
      const image = toDomainNode.get(node);
      if (image === undefined) {
        throw new Error("GraphPullback.toDomain: missing node image");
      }
      return image;
    },
    edgeImage: (edge) => {
      const id = toDomainEdge.get(edge.id);
      if (!id) {
        throw new Error("GraphPullback.toDomain: missing edge image");
      }
      const witness = domainEdges.get(id);
      if (!witness) {
        throw new Error("GraphPullback.toDomain: edge disappeared in domain");
      }
      return witness;
    },
  });

  const toAnchor = makeGraphHom({
    dom: apex,
    cod: anchor,
    nodeImage: (node) => {
      const image = toAnchorNode.get(node);
      if (image === undefined) {
        throw new Error("GraphPullback.toAnchor: missing node image");
      }
      return image;
    },
    edgeImage: (edge) => {
      const id = toAnchorEdge.get(edge.id);
      if (!id) {
        throw new Error("GraphPullback.toAnchor: missing edge image");
      }
      const witness = anchorEdges.get(id);
      if (!witness) {
        throw new Error("GraphPullback.toAnchor: edge disappeared in anchor");
      }
      return witness;
    },
  });

  return { apex, toDomain, toAnchor };
};

const certifyPullback = (
  f: GraphHom,
  h: GraphHom,
  candidate: PullbackData<DiGraph, GraphHom>,
): PullbackCertification<DiGraph, GraphHom> => {
  try {
    const canonical = buildPullback(f, h);
    const sameApex = candidate.apex === canonical.apex;
    const sameDomain = graphHomEquals(candidate.toDomain, canonical.toDomain);
    const sameAnchor = graphHomEquals(candidate.toAnchor, canonical.toAnchor);
    const valid = sameApex && sameDomain && sameAnchor;
    const reason = valid
      ? "GraphPullback.certify: candidate matches canonical pullback"
      : "GraphPullback.certify: candidate does not match canonical pullback";
    return {
      valid,
      conesChecked: [canonical],
      mediators: [],
      reason,
    };
  } catch (error) {
    return {
      valid: false,
      conesChecked: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

export const GraphPullbacks: PullbackCalculator<DiGraph, GraphHom> = {
  pullback: buildPullback,
  certify: certifyPullback,
  factorCone: () => ({ factored: false, reason: "GraphPullbacks.factorCone not implemented" }),
  induce: () => {
    throw new Error("GraphPullbacks.induce not implemented");
  },
  comparison: () => {
    throw new Error("GraphPullbacks.comparison not implemented");
  },
  transportPullback: () => {
    throw new Error("GraphPullbacks.transportPullback not implemented");
  },
};

export const isGraphMonomorphism = (morphism: GraphHom): boolean => {
  const nodeImages = new Set<NodeId>();
  for (const image of morphism.nodeMapping.values()) {
    if (nodeImages.has(image)) {
      return false;
    }
    nodeImages.add(image);
  }
  const edgeImages = new Set<string>();
  for (const image of morphism.edgeMapping.values()) {
    if (edgeImages.has(image)) {
      return false;
    }
    edgeImages.add(image);
  }
  return true;
};

export const ensureGraphMonomorphism = (morphism: GraphHom, context?: string): void => {
  if (!isGraphMonomorphism(morphism)) {
    throw new Error(context ?? "GraphCategory: morphism is not monic");
  }
};
