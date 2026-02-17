import React, { useState } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center px-4 py-3 border-t border-slate-200 bg-white">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask the assistant a question..."
        disabled={disabled}
        className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
      />
      <button
        type="submit"
        disabled={disabled}
        className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium disabled:opacity-60"
      >
        Send
      </button>
    </form>
  );
}

