import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { layoutGraph } from '../../utils/layoutGraph.js';
import TopicNode from './nodes/TopicNode.jsx';
import ConceptNode from './nodes/ConceptNode.jsx';
import DetailNode from './nodes/DetailNode.jsx';
import PredictedNode from './nodes/PredictedNode.jsx';

const nodeTypes = {
  topic: TopicNode,
  concept: ConceptNode,
  detail: DetailNode,
  predicted: PredictedNode
};

export default function WhiteboardCanvas({ diagramNodes = [], diagramEdges = [] }) {
  const { nodes, edges } = useMemo(
    () => layoutGraph(diagramNodes, diagramEdges),
    [diagramNodes, diagramEdges]
  );

  return (
    <div className="w-full h-full bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag
        zoomOnScroll
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" gap={20} size={1} color="#e2e8f0" />
        <Controls className="!bottom-4 !left-4" />
        <MiniMap
          className="!bottom-4 !right-4"
          nodeColor={(node) => {
            if (node.type === 'topic') return '#3b82f6';
            if (node.type === 'predicted') return '#a855f7';
            if (node.type === 'detail') return '#94a3b8';
            return '#64748b';
          }}
          maskColor="rgba(255,255,255,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
