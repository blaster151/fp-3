import type { DiGraph, Edge, NodeId } from "./graph";
import { makeGraph } from "./graph";
import type { CategoryLimits } from "./stdlib/category-limits";
import {
  GraphCategory,
  GraphInitialArrow,
  GraphTerminate,
  GraphTerminal,
  GraphPullbacks,
  GraphHom,
  makeGraphHom,
  ensureGraphMonomorphism,
} from "./graph-category";

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
    return { subobject: result.subgraph, inclusion: result.inclusion };
  },
};

export const GraphWitnesses = {
  category: GraphCategory,
  pullbacks: GraphPullbacks,
  subobjectClassifier: GraphSubobjectClassifier,
};
