import React, { useState } from 'react';

export default function ChatInput({ onSend, disabled, embedded }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div className={`w-full ${embedded ? 'bg-transparent py-0 px-0' : 'bg-secondary pb-4 pt-2 px-4'}`}>
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto flex gap-2 items-center bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask the assistant a question..."
          disabled={disabled}
          className="flex-1 bg-transparent text-sm focus:outline-none disabled:text-slate-400 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="p-2 rounded-full bg-slate-900 text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
