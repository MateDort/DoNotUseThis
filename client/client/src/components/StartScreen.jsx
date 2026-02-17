import React from 'react';

export default function StartScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary to-secondary px-4">
      <div className="max-w-xl text-center space-y-8">
        <h1 className="text-4xl font-bold text-slate-900">Classroom AI Assistant</h1>
        <p className="text-slate-700">
          Listen to your teacher, detect questions in real time, and get instant explanations without interrupting the class.
        </p>
        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="px-8 py-3 rounded-full bg-slate-900 text-white text-lg font-semibold shadow-lg hover:scale-105 transition-transform"
          >
            Start Listening
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Step title="1. Listen" text="We capture the teacher's voice securely on your device." />
          <Step title="2. Detect" text="We spot when the teacher asks a question." />
          <Step title="3. Answer" text="You see a clear answer in the chat instantly." />
        </div>
      </div>
    </div>
  );
}

function Step({ title, text }) {
  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600 mt-1">{text}</p>
    </div>
  );
}

