import React from 'react';

export default function ChatMessage({ role, fromTeacher, text }) {
  const isUser = role === 'student';
  const isAssistant = role === 'assistant';

  const alignment = isAssistant ? 'items-end' : 'items-start';
  const bubbleClasses = isAssistant
    ? 'bg-secondary text-slate-900'
    : isUser
    ? 'bg-white text-slate-900'
    : 'bg-primary text-slate-900';

  const label =
    fromTeacher && isAssistant
      ? 'Answer'
      : fromTeacher
      ? 'Question from teacher'
      : isUser
      ? 'You'
      : 'Assistant';

  return (
    <div className={`flex flex-col ${alignment} gap-1`}>
      <span className="text-xs text-slate-500">{label}</span>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${bubbleClasses}`}>
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

