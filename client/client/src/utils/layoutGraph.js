import dagre from '@dagrejs/dagre';

const NODE_DIMENSIONS = {
  topic: { width: 280, height: 120 },
  concept: { width: 240, height: 100 },
  detail: { width: 200, height: 80 },
  predicted: { width: 200, height: 70 }
};

const DEFAULT_DIM = { width: 220, height: 90 };

/**
 * Converts raw diagram nodes/edges from the server into React Flow format
 * with positions computed by dagre (top-down directed layout).
 * @param {Array<{ id: string, label: string, bullets?: string[], type: string, group?: string }>} rawNodes
 * @param {Array<{ from: string, to: string, label?: string, style?: string }>} rawEdges
 * @returns {{ nodes: import('reactflow').Node[], edges: import('reactflow').Edge[] }}
 */
export function layoutGraph(rawNodes, rawEdges) {
  if (!rawNodes?.length) {
    return { nodes: [], edges: [] };
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  rawNodes.forEach((n) => {
    const dim = NODE_DIMENSIONS[n.type] || DEFAULT_DIM;
    g.setNode(n.id, { width: dim.width, height: dim.height });
  });

  (rawEdges || []).forEach((e) => {
    if (g.hasNode(e.from) && g.hasNode(e.to)) {
      g.setEdge(e.from, e.to);
    }
  });

  dagre.layout(g);

  const nodes = rawNodes.map((n) => {
    const dagreNode = g.node(n.id);
    const dim = NODE_DIMENSIONS[n.type] || DEFAULT_DIM;
    const x = dagreNode?.x != null ? dagreNode.x - dim.width / 2 : 0;
    const y = dagreNode?.y != null ? dagreNode.y - dim.height / 2 : 0;
    return {
      id: n.id,
      type: n.type || 'concept',
      position: { x, y },
      data: {
        label: n.label,
        bullets: n.bullets || [],
        group: n.group || ''
      }
    };
  });

  const edges = (rawEdges || []).map((e, i) => ({
    id: `e-${e.from}-${e.to}-${i}`,
    source: e.from,
    target: e.to,
    label: e.label || undefined,
    type: e.style === 'dashed' ? 'smoothstep' : 'smoothstep',
    style: e.style === 'dashed' ? { strokeDasharray: '5 5' } : undefined
  }));

  return { nodes, edges };
}
