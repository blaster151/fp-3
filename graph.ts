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
  // To be compatible with compiled output that sometimes assumes
  // an array (indexed access / .length) and sometimes a Set (has()),
  // produce an Array of nodes but attach a `.has` method that
  // delegates to the underlying Set. This keeps runtime behaviour
  // working for both styles of compiled code.
  const nodeArray: NodeId[] = Array.from(nodeSet);
  // attach a has method so callers that expect a Set still work
  (nodeArray as any).has = (value: NodeId) => nodeSet.has(value);
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
  return { nodes: nodeArray as unknown as ReadonlySet<NodeId>, edges: edgeList };
}
