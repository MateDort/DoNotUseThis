import React from 'react';

export default function ChatMessage({ role, fromTeacher, text }) {
  const isUser = role === 'student';
  const isAssistant = role === 'assistant';

  // User messages on the right, everything else on the left
  const isRight = isUser;
  const alignment = isRight ? 'items-end' : 'items-start';
  const bubbleClasses = isRight
    ? 'bg-primary text-slate-900'
    : 'bg-white text-slate-900';

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
      <span className="text-xs text-slate-400 px-1">{label}</span>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${bubbleClasses}`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
