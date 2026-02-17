import React, { useEffect, useState } from 'react';
import RecordingIndicator from './RecordingIndicator.jsx';
import ChatMessage from './ChatMessage.jsx';
import ChatInput from './ChatInput.jsx';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useWebSocket } from '../hooks/useWebSocket.js';

export default function RecordingScreen({ onEnd }) {
  const [seconds, setSeconds] = useState(0);
  const [messages, setMessages] = useState([]);

  const { connected, sendAudioChunk, sendStudentQuestion, onMessage } = useWebSocket();
  const { isRecording, start, stop } = useAudioRecorder((chunk) => {
    sendAudioChunk(chunk);
  });

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  useEffect(() => {
    const unsubscribe = onMessage?.((payload) => {
      setMessages((prev) => [...prev, payload]);
    });
    return unsubscribe;
  }, [onMessage]);

  useEffect(() => {
    // auto-start recording when screen mounts
    start().catch((err) => {
      console.error('Microphone error', err);
    });
  }, [start]);

  const handleStudentSend = (text) => {
    const studentMessage = { id: Date.now(), role: 'student', text };
    setMessages((prev) => [...prev, studentMessage]);
    sendStudentQuestion(text);
  };

  const handleEnd = () => {
    stop();
    setSeconds(0);
    onEnd?.();
  };

  return (
    <div className="min-h-screen flex flex-col bg-sky-50">
      <RecordingIndicator seconds={seconds} onEnd={handleEnd} />
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-4 gap-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{connected ? 'Connected to assistant' : 'Connecting...'}</span>
        </div>
        <div className="flex-1 bg-white rounded-2xl shadow-inner p-4 overflow-y-auto flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-8">
              We&apos;ll show teacher questions and answers here as they happen.
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} fromTeacher={m.fromTeacher} text={m.text} />
          ))}
        </div>
      </div>
      <ChatInput onSend={handleStudentSend} disabled={!connected} />
    </div>
  );
}

