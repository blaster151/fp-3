export type NodeId = string | number;

export interface Edge {
  readonly id: string;
  readonly src: NodeId;
  readonly dst: NodeId;
}

export interface DiGraph {
  readonly nodes: ReadonlySet<NodeId>;
  readonly edges: ReadonlyArray<Edge>;
}

export function makeGraph(
  nodes: Iterable<NodeId>,
  edges: Iterable<{ id?: string; src: NodeId; dst: NodeId }>,
): DiGraph {
  const nodeSet = new Set<NodeId>();
  for (const node of nodes) {
    nodeSet.add(node);
  }
  const seenIds = new Set<string>();
  const edgeList: Edge[] = [];
  let auto = 0;
  for (const edge of edges) {
    const id = edge.id ?? `e${auto++}`;
    if (seenIds.has(id)) {
      throw new Error(`graph edge id must be unique: ${id}`);
    }
    if (!nodeSet.has(edge.src) || !nodeSet.has(edge.dst)) {
      throw new Error('graph edge endpoints must be listed in nodes');
    }
    seenIds.add(id);
    edgeList.push({ id, src: edge.src, dst: edge.dst });
  }
  return { nodes: nodeSet, edges: edgeList };
}
