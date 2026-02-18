import React, { useEffect, useRef } from 'react';

export default function TranscriptPanel({ open, onToggle, chunks }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chunks, open]);

  return (
    <>
      {/* Overlay when panel is open on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sliding panel */}
      <div
        className={`fixed top-0 left-0 h-full z-40 flex transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-[340px]'
        }`}
      >
        {/* Panel content — slightly transparent with backdrop blur so whiteboard shows through */}
        <div className="w-[340px] h-full bg-white/95 backdrop-blur-sm shadow-xl flex flex-col border-r border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm font-semibold text-slate-700">
                Live Transcript
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {chunks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center mt-8">
                Transcript will appear here as your teacher speaks...
              </p>
            ) : (
              <div className="space-y-2">
                {chunks.map((chunk, i) => (
                  <p key={i} className="text-sm text-slate-700 leading-relaxed">
                    {chunk}
                  </p>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Toggle arrow tab */}
        <button
          onClick={onToggle}
          className="self-center -ml-px w-7 h-16 bg-gray-400 border border-l-0 border-gray-500 rounded-r-lg shadow-md flex items-center justify-center hover:bg-gray-500 transition-colors focus:outline-none"
          aria-label={open ? 'Close transcript' : 'Open transcript'}
        >
          <svg
            className={`w-4 h-4 text-white transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </>
  );
}
