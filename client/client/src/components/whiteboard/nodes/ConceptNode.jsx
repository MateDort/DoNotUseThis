import React from 'react';
import { Handle, Position } from 'reactflow';

export default function ConceptNode({ data }) {
  const bullets = data?.bullets || [];
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 px-5 py-3 max-w-[240px] min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400" />
      <div className="font-semibold text-sm text-slate-800">{data?.label || ''}</div>
      {bullets.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-600 list-disc list-inside">
          {bullets.slice(0, 5).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400" />
    </div>
  );
}
