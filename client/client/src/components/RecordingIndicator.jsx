import React from 'react';

export default function RecordingIndicator({ seconds, onEnd }) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className="w-full flex items-center justify-between bg-secondary px-4 py-2 border-b border-amber-200">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
        </span>
        <span className="font-medium text-slate-800">Recording</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-slate-700">{minutes}:{secs}</span>
        <button
          type="button"
          onClick={onEnd}
          className="text-sm px-3 py-1 rounded-full bg-slate-900 text-white hover:opacity-90"
        >
          End
        </button>
      </div>
    </div>
  );
}

