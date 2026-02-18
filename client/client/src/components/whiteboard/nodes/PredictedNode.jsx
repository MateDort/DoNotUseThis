import React from 'react';
import { Handle, Position } from 'reactflow';

export default function PredictedNode({ data }) {
  return (
    <div className="bg-purple-50/80 rounded-xl border-2 border-dashed border-purple-400 px-5 py-3 max-w-[200px] min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-purple-400" />
      <div className="font-medium text-sm text-purple-700">{data?.label || ''}</div>
      <div className="text-xs text-purple-500 italic mt-0.5">predicted...</div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-purple-400" />
    </div>
  );
}
