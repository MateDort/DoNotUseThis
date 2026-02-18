import React from 'react';
import { Handle, Position } from 'reactflow';

export default function TopicNode({ data }) {
  return (
    <div className="bg-white border-l-4 border-blue-500 rounded-xl shadow-lg px-6 py-4 max-w-[280px] min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-500" />
      <div className="font-bold text-base text-slate-800">{data?.label || ''}</div>
      {data?.detail && (
        <div className="text-xs text-slate-500 mt-1">{data.detail}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-500" />
    </div>
  );
}
