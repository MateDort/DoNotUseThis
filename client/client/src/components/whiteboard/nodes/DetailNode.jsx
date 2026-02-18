import React from 'react';
import { Handle, Position } from 'reactflow';

export default function DetailNode({ data }) {
  const bullets = data?.bullets || [];
  return (
    <div className="bg-slate-50 rounded-lg shadow border border-slate-200 px-4 py-2 max-w-[200px] min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-slate-400" />
      <div className="font-medium text-xs text-slate-700">{data?.label || ''}</div>
      {bullets.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-slate-500 list-disc list-inside">
          {bullets.slice(0, 3).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-slate-400" />
    </div>
  );
}
