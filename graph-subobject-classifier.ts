import type { DiGraph, Edge, NodeId } from "./graph";
import { makeGraph } from "./graph";
import type {
  CartesianClosedBinaryProductWitness,
  CartesianClosedCategory,
  CartesianClosedExponentialWitness,
} from "./stdlib/category";
import { CategoryLimits } from "./stdlib/category-limits";
import {
  GraphCategory,
  GraphInitialArrow,
  GraphTerminate,
  GraphTerminal,
  GraphPullbacks,
  makeGraphHom,
  ensureGraphMonomorphism,
  composeGraphHoms,
  graphHomEquals,
} from "./graph-category";
import type { GraphHom } from "./graph-category";

const OMEGA_NODE_IN = "in";
const OMEGA_NODE_OUT = "out";

const OMEGA_EDGE_BOTH = "both";
const OMEGA_EDGE_SOURCE = "source";
const OMEGA_EDGE_TARGET = "target";
const OMEGA_EDGE_NOTHING = "nothing";

export const GraphOmega: DiGraph = makeGraph(
  [OMEGA_NODE_IN, OMEGA_NODE_OUT],
  [
    { id: OMEGA_EDGE_BOTH, src: OMEGA_NODE_IN, dst: OMEGA_NODE_IN },
    { id: OMEGA_EDGE_SOURCE, src: OMEGA_NODE_IN, dst: OMEGA_NODE_OUT },
    { id: OMEGA_EDGE_TARGET, src: OMEGA_NODE_OUT, dst: OMEGA_NODE_IN },
    { id: OMEGA_EDGE_NOTHING, src: OMEGA_NODE_OUT, dst: OMEGA_NODE_OUT },
  ],
);

const omegaEdges = new Map(GraphOmega.edges.map((edge) => [edge.id, edge] as const));

const lookupOmegaEdge = (id: string): Edge => {
  const witness = omegaEdges.get(id);
  if (!witness) {
    throw new Error(`GraphOmega: missing edge ${id}`);
  }
  return witness;
};

export const GraphTruthArrow: GraphHom = makeGraphHom({
  dom: GraphTerminal,
  cod: GraphOmega,
  nodeImage: () => OMEGA_NODE_IN,
  edgeImage: () => lookupOmegaEdge(OMEGA_EDGE_BOTH),
});

export const GraphFalseArrow: GraphHom = makeGraphHom({
  dom: GraphTerminal,
  cod: GraphOmega,
  nodeImage: () => OMEGA_NODE_OUT,
  edgeImage: () => lookupOmegaEdge(OMEGA_EDGE_NOTHING),
});

export const GraphNegation: GraphHom = makeGraphHom({
  dom: GraphOmega,
  cod: GraphOmega,
  nodeImage: (node) => {
    if (node === OMEGA_NODE_IN) return OMEGA_NODE_OUT;
    if (node === OMEGA_NODE_OUT) return OMEGA_NODE_IN;
    throw new Error(`GraphNegation: unexpected node ${String(node)}`);
  },
  edgeImage: (edge) => {
    switch (edge.id) {
      case OMEGA_EDGE_BOTH:
        return lookupOmegaEdge(OMEGA_EDGE_NOTHING);
      case OMEGA_EDGE_NOTHING:
        return lookupOmegaEdge(OMEGA_EDGE_BOTH);
      case OMEGA_EDGE_SOURCE:
        return lookupOmegaEdge(OMEGA_EDGE_TARGET);
      case OMEGA_EDGE_TARGET:
        return lookupOmegaEdge(OMEGA_EDGE_SOURCE);
      default:
        throw new Error(`GraphNegation: unexpected edge ${edge.id}`);
    }
  },
});

const collectImages = <K, V>(iterable: Iterable<[K, V]>): Map<K, V> => {
  const map = new Map<K, V>();
  for (const [key, value] of iterable) {
    map.set(key, value);
  }
  return map;
};

const imagesOfSubgraphNodes = (inclusion: GraphHom): Set<NodeId> =>
  new Set<NodeId>(inclusion.nodeMapping.values());

const imagesOfSubgraphEdges = (inclusion: GraphHom): Set<string> =>
  new Set<string>(inclusion.edgeMapping.values());

const classifyNode = (included: Set<NodeId>) => (node: NodeId): NodeId =>
  included.has(node) ? OMEGA_NODE_IN : OMEGA_NODE_OUT;

const classifyEdge = (
  includedNodes: Map<NodeId, NodeId>,
  includedEdges: Set<string>,
) =>
  (edge: Edge): Edge => {
    if (includedEdges.has(edge.id)) {
      return lookupOmegaEdge(OMEGA_EDGE_BOTH);
    }
    const srcState = includedNodes.get(edge.src) ?? OMEGA_NODE_OUT;
    const dstState = includedNodes.get(edge.dst) ?? OMEGA_NODE_OUT;
    if (srcState === OMEGA_NODE_IN && dstState === OMEGA_NODE_IN) {
      throw new Error(
        "GraphCharacteristic: subgraph must contain edges whose endpoints are included nodes.",
      );
    }
    if (srcState === OMEGA_NODE_IN && dstState === OMEGA_NODE_OUT) {
      return lookupOmegaEdge(OMEGA_EDGE_SOURCE);
    }
    if (srcState === OMEGA_NODE_OUT && dstState === OMEGA_NODE_IN) {
      return lookupOmegaEdge(OMEGA_EDGE_TARGET);
    }
    return lookupOmegaEdge(OMEGA_EDGE_NOTHING);
  };

export const graphCharacteristicOfSubgraph = (inclusion: GraphHom): GraphHom => {
  ensureGraphMonomorphism(inclusion, "graphCharacteristicOfSubgraph: inclusion must be monic");
  const ambient = inclusion.cod;
  const nodeImages = imagesOfSubgraphNodes(inclusion);
  for (const edge of inclusion.dom.edges) {
    const image = inclusion.mapEdge(edge);
    if (!nodeImages.has(image.src) || !nodeImages.has(image.dst)) {
      throw new Error(
        "graphCharacteristicOfSubgraph: included edge must have endpoints contained in the subgraph.",
      );
    }
  }
  const nodeState = new Map<NodeId, NodeId>();
  for (const node of ambient.nodes) {
    nodeState.set(node, nodeImages.has(node) ? OMEGA_NODE_IN : OMEGA_NODE_OUT);
  }
  const edgeImages = imagesOfSubgraphEdges(inclusion);
  const nodeClassifier = classifyNode(nodeImages);
  const edgeClassifier = classifyEdge(nodeState, edgeImages);
  return makeGraphHom({
    dom: ambient,
    cod: GraphOmega,
    nodeImage: nodeClassifier,
    edgeImage: edgeClassifier,
  });
};

export const graphSubobjectFromCharacteristic = (
  characteristic: GraphHom,
): { readonly subgraph: DiGraph; readonly inclusion: GraphHom } => {
  if (characteristic.cod !== GraphOmega) {
    throw new Error("graphSubobjectFromCharacteristic: characteristic must land in Ω.");
  }
  const ambient = characteristic.dom;
  const includedNodes: NodeId[] = [];
  for (const node of ambient.nodes) {
    if (characteristic.mapNode(node) === OMEGA_NODE_IN) {
      includedNodes.push(node);
    }
  }
  const ambientEdgeById = collectImages<string, Edge>(ambient.edges.map((edge) => [edge.id, edge] as const));
  const includedEdges: Edge[] = [];
  for (const edge of ambient.edges) {
    if (characteristic.mapEdge(edge).id === OMEGA_EDGE_BOTH) {
      const witness = ambientEdgeById.get(edge.id);
      if (!witness) {
        throw new Error("graphSubobjectFromCharacteristic: ambient edge disappeared.");
      }
      if (
        characteristic.mapNode(witness.src) !== OMEGA_NODE_IN ||
        characteristic.mapNode(witness.dst) !== OMEGA_NODE_IN
      ) {
        throw new Error(
          "graphSubobjectFromCharacteristic: edge classified as both must have endpoints classified as in.",
        );
      }
      includedEdges.push(witness);
    }
  }
  const subgraph = makeGraph(
    includedNodes,
    includedEdges.map((edge) => ({ id: edge.id, src: edge.src, dst: edge.dst })),
  );
  const ambientEdges = collectImages<string, Edge>(ambient.edges.map((edge) => [edge.id, edge] as const));
  const inclusion = makeGraphHom({
    dom: subgraph,
    cod: ambient,
    nodeImage: (node) => node,
    edgeImage: (edge) => {
      const witness = ambientEdges.get(edge.id);
      if (!witness) {
        throw new Error("graphSubobjectFromCharacteristic: inclusion edge missing in ambient.");
      }
      return witness;
    },
  });
  return { subgraph, inclusion };
};

type GraphAssignment = Map<NodeId, NodeId>;

const assignmentSignature = (
  nodes: ReadonlyArray<NodeId>,
  assignment: GraphAssignment,
): string =>
  `χ:${JSON.stringify(nodes.map((node) => [node, assignment.get(node) ?? OMEGA_NODE_OUT]))}`;

const enumerateAssignments = (nodes: ReadonlyArray<NodeId>): ReadonlyArray<GraphAssignment> => {
  const results: GraphAssignment[] = [];
  const visit = (index: number, current: GraphAssignment): void => {
    if (index >= nodes.length) {
      results.push(new Map(current));
      return;
    }
    const node = nodes[index]!;
    current.set(node, OMEGA_NODE_IN);
    visit(index + 1, current);
    current.set(node, OMEGA_NODE_OUT);
    visit(index + 1, current);
    current.delete(node);
  };
  visit(0, new Map());
  return results;
};

const classificationEdgeId = (srcState: NodeId, dstState: NodeId): string => {
  if (srcState === OMEGA_NODE_IN && dstState === OMEGA_NODE_IN) {
    return OMEGA_EDGE_BOTH;
  }
  if (srcState === OMEGA_NODE_IN && dstState === OMEGA_NODE_OUT) {
    return OMEGA_EDGE_SOURCE;
  }
  if (srcState === OMEGA_NODE_OUT && dstState === OMEGA_NODE_IN) {
    return OMEGA_EDGE_TARGET;
  }
  if (srcState === OMEGA_NODE_OUT && dstState === OMEGA_NODE_OUT) {
    return OMEGA_EDGE_NOTHING;
  }
  throw new Error(
    `GraphPowerObject: unexpected omega node states (${String(srcState)}, ${String(dstState)}).`,
  );
};

const invertNodeMapping = (
  mapping: ReadonlyMap<NodeId, NodeId>,
  context: string,
): Map<NodeId, NodeId> => {
  const inverse = new Map<NodeId, NodeId>();
  for (const [source, target] of mapping) {
    if (inverse.has(target)) {
      throw new Error(`${context}: node mapping must be injective to admit an inverse.`);
    }
    inverse.set(target, source);
  }
  return inverse;
};

const invertEdgeMapping = (
  hom: GraphHom,
  context: string,
): Map<string, Edge> => {
  const inverse = new Map<string, Edge>();
  const edgesById = new Map(hom.dom.edges.map((edge) => [edge.id, edge] as const));
  for (const [edgeId, imageId] of hom.edgeMapping) {
    const witness = edgesById.get(edgeId);
    if (!witness) {
      throw new Error(`${context}: domain edge ${edgeId} disappeared during inversion.`);
    }
    if (inverse.has(imageId)) {
      throw new Error(`${context}: edge mapping must be injective to admit an inverse.`);
    }
    inverse.set(imageId, witness);
  }
  return inverse;
};

const graphBinaryProductCache = new WeakMap<
  DiGraph,
  WeakMap<DiGraph, CategoryLimits.BinaryProductWithPairWitness<DiGraph, GraphHom>>
>();

const getGraphBinaryProductWithPair = (
  left: DiGraph,
  right: DiGraph,
): CategoryLimits.BinaryProductWithPairWitness<DiGraph, GraphHom> => {
  let forLeft = graphBinaryProductCache.get(left);
  if (!forLeft) {
    forLeft = new WeakMap();
    graphBinaryProductCache.set(left, forLeft);
  }
  const cached = forLeft.get(right);
  if (cached) {
    return cached;
  }
  const witness = GraphCategory.binaryProduct(left, right);
  forLeft.set(right, witness);
  return witness;
};

const toCartesianProductWitness = (
  left: DiGraph,
  right: DiGraph,
): CartesianClosedBinaryProductWitness<DiGraph, GraphHom> => {
  const witness = getGraphBinaryProductWithPair(left, right);
  return {
    obj: witness.obj,
    proj1: witness.projections[0]!,
    proj2: witness.projections[1]!,
    pair: (domain, leftArrow, rightArrow) => witness.pair(domain, leftArrow, rightArrow),
  };
};

interface GraphPowerMetadata {
  readonly assignmentByNodeId: Map<NodeId, GraphAssignment>;
  readonly edgeClassificationById: Map<string, Map<string, Edge>>;
  readonly baseNodes: ReadonlyArray<NodeId>;
}

const graphPowerMetadata = new WeakMap<DiGraph, GraphPowerMetadata>();

const buildGraphMonomorphismIso = (
  relation: GraphHom,
  canonical: GraphHom,
  context: string,
): CategoryLimits.SubobjectClassifierIsoWitness<GraphHom> => {
  ensureGraphMonomorphism(relation, `${context}: relation arrow must be monic.`);
  ensureGraphMonomorphism(canonical, `${context}: canonical inclusion must be monic.`);

  if (relation.cod !== canonical.cod) {
    throw new Error(`${context}: compared monomorphisms must share a codomain.`);
  }

  const canonicalNodeInverse = invertNodeMapping(
    canonical.nodeMapping,
    `${context}: canonical node mapping`,
  );
  const relationNodeInverse = invertNodeMapping(
    relation.nodeMapping,
    `${context}: relation node mapping`,
  );
  const canonicalEdgeInverse = invertEdgeMapping(
    canonical,
    `${context}: canonical edge mapping`,
  );
  const relationEdgeInverse = invertEdgeMapping(
    relation,
    `${context}: relation edge mapping`,
  );

  const forward = makeGraphHom({
    dom: relation.dom,
    cod: canonical.dom,
    nodeImage: (node) => {
      const image = relation.nodeMapping.get(node);
      if (image === undefined) {
        throw new Error(`${context}: relation node ${String(node)} lacks an image.`);
      }
      const target = canonicalNodeInverse.get(image);
      if (target === undefined) {
        throw new Error(`${context}: canonical apex missing node for image ${String(image)}.`);
      }
      return target;
    },
    edgeImage: (edge) => {
      const image = relation.edgeMapping.get(edge.id);
      if (!image) {
        throw new Error(`${context}: relation edge ${edge.id} lacks an image.`);
      }
      const target = canonicalEdgeInverse.get(image);
      if (!target) {
        throw new Error(`${context}: canonical apex missing edge for image ${image}.`);
      }
      return target;
    },
  });

  const backward = makeGraphHom({
    dom: canonical.dom,
    cod: relation.dom,
    nodeImage: (node) => {
      const image = canonical.nodeMapping.get(node);
      if (image === undefined) {
        throw new Error(`${context}: canonical node ${String(node)} lacks an image.`);
      }
      const target = relationNodeInverse.get(image);
      if (target === undefined) {
        throw new Error(`${context}: relation apex missing node for image ${String(image)}.`);
      }
      return target;
    },
    edgeImage: (edge) => {
      const image = canonical.edgeMapping.get(edge.id);
      if (!image) {
        throw new Error(`${context}: canonical edge ${edge.id} lacks an image.`);
      }
      const target = relationEdgeInverse.get(image);
      if (!target) {
        throw new Error(`${context}: relation apex missing edge for image ${image}.`);
      }
      return target;
    },
  });

  const forwardThenBackward = composeGraphHoms(backward, forward);
  if (!graphHomEquals(forwardThenBackward, GraphCategory.id(relation.dom))) {
    throw new Error(`${context}: forward/backward composites must recover the relation identity.`);
  }

  const backwardThenForward = composeGraphHoms(forward, backward);
  if (!graphHomEquals(backwardThenForward, GraphCategory.id(canonical.dom))) {
    throw new Error(`${context}: forward/backward composites must recover the canonical identity.`);
  }

  return { forward, backward };
};

const buildGraphOmegaExponential = (
  base: DiGraph,
): CartesianClosedExponentialWitness<DiGraph, GraphHom> => {
  const baseNodes = Array.from(base.nodes);
  const assignments = enumerateAssignments(baseNodes);
  const assignmentByNodeId = new Map<NodeId, GraphAssignment>();
  const exponentNodes: NodeId[] = [];
  const exponentEdges: Edge[] = [];
  const edgeClassificationById = new Map<string, Map<string, Edge>>();

  for (const assignment of assignments) {
    for (const node of baseNodes) {
      if (!assignment.has(node)) {
        assignment.set(node, OMEGA_NODE_OUT);
      }
    }
    const signature = assignmentSignature(baseNodes, assignment);
    assignmentByNodeId.set(signature, new Map(assignment));
    exponentNodes.push(signature);
  }

  const exponentNodeSet = new Set(exponentNodes);
  const exponentEdgesById = new Map<string, Edge>();

  for (const src of exponentNodes) {
    for (const dst of exponentNodes) {
      const srcAssignment = assignmentByNodeId.get(src);
      const dstAssignment = assignmentByNodeId.get(dst);
      if (!srcAssignment || !dstAssignment) {
        throw new Error("GraphPowerObject: missing assignment when constructing exponent edges.");
      }
      const edgeId = `η:${JSON.stringify([src, dst])}`;
      const classification = new Map<string, Edge>();
      for (const edge of base.edges) {
        const srcState = srcAssignment.get(edge.src);
        const dstState = dstAssignment.get(edge.dst);
        if (srcState === undefined || dstState === undefined) {
          throw new Error(
            `GraphPowerObject: assignment missing state for edge ${edge.id} endpoints.`,
          );
        }
        const omegaEdgeId = classificationEdgeId(srcState, dstState);
        classification.set(edge.id, lookupOmegaEdge(omegaEdgeId));
      }
      const exponentEdge: Edge = { id: edgeId, src, dst };
      exponentEdges.push(exponentEdge);
      exponentEdgesById.set(edgeId, exponentEdge);
      edgeClassificationById.set(edgeId, classification);
    }
  }

  const exponent = makeGraph(exponentNodes, exponentEdges);
  graphPowerMetadata.set(exponent, {
    assignmentByNodeId,
    edgeClassificationById,
    baseNodes,
  });

  const productWitness = getGraphBinaryProductWithPair(exponent, base);
  const [projectionToExponent, projectionToBase] = productWitness.projections;

  const evaluation = makeGraphHom({
    dom: productWitness.obj,
    cod: GraphOmega,
    nodeImage: (node) => {
      const exponentNode = projectionToExponent.mapNode(node);
      const baseNode = projectionToBase.mapNode(node);
      const assignment = assignmentByNodeId.get(exponentNode);
      if (!assignment) {
        throw new Error("GraphPowerObject: missing assignment for evaluation node.");
      }
      const classification = assignment.get(baseNode);
      if (!classification) {
        throw new Error(
          `GraphPowerObject: assignment missing classification for base node ${String(baseNode)}.`,
        );
      }
      return classification;
    },
    edgeImage: (edge) => {
      const exponentEdge = projectionToExponent.mapEdge(edge);
      const baseEdge = projectionToBase.mapEdge(edge);
      const classification = edgeClassificationById.get(exponentEdge.id);
      if (!classification) {
        throw new Error("GraphPowerObject: missing classification for exponent edge.");
      }
      const witness = classification.get(baseEdge.id);
      if (!witness) {
        throw new Error(
          `GraphPowerObject: exponent edge classification missing base edge ${baseEdge.id}.`,
        );
      }
      return witness;
    },
  });

  const exponentEdgesLookup = new Map(exponent.edges.map((edge) => [edge.id, edge] as const));

  const curry = (domain: DiGraph, arrow: GraphHom): GraphHom => {
    const domainProduct = getGraphBinaryProductWithPair(domain, base);
    if (arrow.dom !== domainProduct.obj) {
      throw new Error("GraphPowerObject.curry: arrow must originate at the canonical domain × anchor product.");
    }
    if (arrow.cod !== GraphOmega) {
      throw new Error("GraphPowerObject.curry: arrow must land in Ω.");
    }

    const projectionToDomain = domainProduct.projections[0]!;
    const projectionToAnchor = domainProduct.projections[1]!;

    const nodeAssignments = new Map<NodeId, NodeId>();

    for (const domainNode of domain.nodes) {
      const assignment = new Map<NodeId, NodeId>();
      for (const baseNode of baseNodes) {
        let matched: NodeId | undefined;
        for (const productNode of domainProduct.obj.nodes) {
          if (
            projectionToDomain.mapNode(productNode) === domainNode &&
            projectionToAnchor.mapNode(productNode) === baseNode
          ) {
            matched = productNode;
            break;
          }
        }
        if (matched === undefined) {
          throw new Error(
            `GraphPowerObject.curry: missing product node for (${String(domainNode)}, ${String(baseNode)}).`,
          );
        }
        assignment.set(baseNode, arrow.mapNode(matched));
      }
      const signature = assignmentSignature(baseNodes, assignment);
      if (!assignmentByNodeId.has(signature)) {
        throw new Error(
          "GraphPowerObject.curry: produced assignment does not correspond to an exponential node.",
        );
      }
      nodeAssignments.set(domainNode, signature);
    }

    const ensureEdgeConsistency = (
      domainEdge: Edge,
      exponentEdgeId: string,
    ): void => {
      const classification = edgeClassificationById.get(exponentEdgeId);
      if (!classification) {
        throw new Error("GraphPowerObject.curry: missing classification for exponent edge.");
      }
      for (const productEdge of domainProduct.obj.edges) {
        const mappedDomain = projectionToDomain.mapEdge(productEdge);
        if (mappedDomain.id !== domainEdge.id) {
          continue;
        }
        const baseEdge = projectionToAnchor.mapEdge(productEdge);
        const expected = classification.get(baseEdge.id);
        if (!expected) {
          throw new Error(
            `GraphPowerObject.curry: exponent edge missing classification for base edge ${baseEdge.id}.`,
          );
        }
        const actual = arrow.mapEdge(productEdge);
        if (actual.id !== expected.id) {
          throw new Error(
            `GraphPowerObject.curry: supplied arrow classification ${actual.id} disagrees with expected ${expected.id}.`,
          );
        }
      }
    };

    const edgeAssignments = new Map<string, string>();
    for (const domainEdge of domain.edges) {
      const srcSignature = nodeAssignments.get(domainEdge.src);
      const dstSignature = nodeAssignments.get(domainEdge.dst);
      if (!srcSignature || !dstSignature) {
        throw new Error("GraphPowerObject.curry: missing node assignment for domain edge endpoints.");
      }
      const exponentEdgeId = `η:${JSON.stringify([srcSignature, dstSignature])}`;
      if (!exponentEdgesLookup.has(exponentEdgeId)) {
        throw new Error(
          `GraphPowerObject.curry: exponent edge ${exponentEdgeId} does not exist in Ω^X.`,
        );
      }
      ensureEdgeConsistency(domainEdge, exponentEdgeId);
      edgeAssignments.set(domainEdge.id, exponentEdgeId);
    }

    return makeGraphHom({
      dom: domain,
      cod: exponent,
      nodeImage: (node) => {
        const signature = nodeAssignments.get(node);
        if (!signature || !exponentNodeSet.has(signature)) {
          throw new Error("GraphPowerObject.curry: missing exponential node for domain node.");
        }
        return signature;
      },
      edgeImage: (edge) => {
        const identifier = edgeAssignments.get(edge.id);
        if (!identifier) {
          throw new Error("GraphPowerObject.curry: missing exponential edge for domain edge.");
        }
        const witness = exponentEdgesLookup.get(identifier);
        if (!witness) {
          throw new Error("GraphPowerObject.curry: exponential edge disappeared.");
        }
        return witness;
      },
    });
  };

  const uncurry = (domain: DiGraph, arrow: GraphHom): GraphHom => {
    if (arrow.cod !== exponent) {
      throw new Error("GraphPowerObject.uncurry: arrow must land in Ω^X.");
    }
    const domainProduct = getGraphBinaryProductWithPair(domain, base);
    const projectionToDomain = domainProduct.projections[0]!;
    const projectionToAnchor = domainProduct.projections[1]!;

    return makeGraphHom({
      dom: domainProduct.obj,
      cod: GraphOmega,
      nodeImage: (node) => {
        const domainNode = projectionToDomain.mapNode(node);
        const baseNode = projectionToAnchor.mapNode(node);
        const exponentNode = arrow.mapNode(domainNode);
        const assignment = assignmentByNodeId.get(exponentNode);
        if (!assignment) {
          throw new Error("GraphPowerObject.uncurry: missing assignment for exponential node.");
        }
        const classification = assignment.get(baseNode);
        if (!classification) {
          throw new Error(
            `GraphPowerObject.uncurry: exponential assignment missing state for ${String(baseNode)}.`,
          );
        }
        return classification;
      },
      edgeImage: (edge) => {
        const domainEdge = projectionToDomain.mapEdge(edge);
        const baseEdge = projectionToAnchor.mapEdge(edge);
        const exponentEdge = arrow.mapEdge(domainEdge);
        const classification = edgeClassificationById.get(exponentEdge.id);
        if (!classification) {
          throw new Error("GraphPowerObject.uncurry: missing classification for exponential edge.");
        }
        const witness = classification.get(baseEdge.id);
        if (!witness) {
          throw new Error(
            `GraphPowerObject.uncurry: exponential edge missing classification for ${baseEdge.id}.`,
          );
        }
        return witness;
      },
    });
  };

  return {
    obj: exponent,
    evaluation,
    product: {
      obj: productWitness.obj,
      proj1: projectionToExponent,
      proj2: projectionToBase,
      pair: (domain, left, right) => productWitness.pair(domain, left, right),
    },
    curry,
    uncurry,
  };
};

export const GraphSubobjectClassifier: CategoryLimits.SubobjectClassifierCategory<DiGraph, GraphHom> & {
  readonly characteristic: (monomorphism: GraphHom) => GraphHom;
  readonly subobjectFromCharacteristic: (
    characteristic: GraphHom,
  ) => { readonly subgraph: DiGraph; readonly inclusion: GraphHom };
} = {
  ...GraphCategory,
  terminate: GraphTerminate,
  initialArrow: GraphInitialArrow,
  truthValues: GraphOmega,
  truthArrow: GraphTruthArrow,
  falseArrow: GraphFalseArrow,
  negation: GraphNegation,
  characteristic: graphCharacteristicOfSubgraph,
  subobjectFromCharacteristic: (characteristic) => {
    const result = graphSubobjectFromCharacteristic(characteristic);
    return { subobject: result.subgraph, subgraph: result.subgraph, inclusion: result.inclusion };
  },
};

const GraphClassifierForPowerObject: CategoryLimits.SubobjectClassifierCategory<DiGraph, GraphHom> &
  CartesianClosedCategory<DiGraph, GraphHom> = {
  ...GraphCategory,
  terminate: GraphTerminate,
  initialArrow: GraphInitialArrow,
  truthValues: GraphOmega,
  truthArrow: GraphTruthArrow,
  falseArrow: GraphFalseArrow,
  negation: GraphNegation,
  characteristic: graphCharacteristicOfSubgraph,
  subobjectFromCharacteristic: (characteristic) => {
    const result = graphSubobjectFromCharacteristic(characteristic);
    return { subobject: result.subgraph, subgraph: result.subgraph, inclusion: result.inclusion };
  },
  binaryProduct: (left, right) => toCartesianProductWitness(left, right),
  exponential: (base, codomain) => {
    if (codomain !== GraphOmega) {
      throw new Error("GraphPowerObject: exponential is presently defined only towards Ω.");
    }
    return buildGraphOmegaExponential(base);
  },
  terminal: { obj: GraphTerminal, terminate: GraphTerminate },
};

export const graphBinaryProductWithPair = (
  left: DiGraph,
  right: DiGraph,
): CategoryLimits.BinaryProductWithPairWitness<DiGraph, GraphHom> => getGraphBinaryProductWithPair(left, right);

export const GraphPowerObject = CategoryLimits.makePowerObjectFromSubobjectClassifier({
  category: GraphClassifierForPowerObject,
  pullbacks: GraphPullbacks,
  binaryProduct: graphBinaryProductWithPair,
  ensureMonomorphism: (arrow, context) => ensureGraphMonomorphism(arrow, context ?? "GraphPowerObject"),
  makeIso: (relation, canonical, context) =>
    buildGraphMonomorphismIso(relation, canonical, context ?? "GraphPowerObject"),
  equalMor: (left, right) => graphHomEquals(left, right),
});

export const graphPowerObjectDecodeNode = (
  powerObj: DiGraph,
  node: NodeId,
): ReadonlyMap<NodeId, NodeId> => {
  const metadata = graphPowerMetadata.get(powerObj);
  if (!metadata) {
    throw new Error("GraphPowerObject: unrecognised power object instance.");
  }
  const assignment = metadata.assignmentByNodeId.get(node);
  if (!assignment) {
    throw new Error(`GraphPowerObject: node ${String(node)} is not present in Ω^X.`);
  }
  return new Map(assignment);
};

export const GraphWitnesses = {
  category: GraphCategory,
  pullbacks: GraphPullbacks,
  subobjectClassifier: GraphSubobjectClassifier,
  powerObject: GraphPowerObject,
};

export {
  GraphCategory,
  GraphPullbacks,
  GraphInitialArrow,
  GraphTerminate,
  graphHomEquals,
} from "./graph-category";
