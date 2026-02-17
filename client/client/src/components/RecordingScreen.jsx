import React, { useEffect, useRef, useState } from 'react';
import RecordingIndicator from './RecordingIndicator.jsx';
import ChatMessage from './ChatMessage.jsx';
import ChatInput from './ChatInput.jsx';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useWebSocket } from '../hooks/useWebSocket.js';

export default function RecordingScreen({ onEnd }) {
  const [seconds, setSeconds] = useState(0);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

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
    start().catch((err) => {
      console.error('Microphone error', err);
    });
  }, [start]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="min-h-screen flex flex-col bg-secondary">
      <RecordingIndicator seconds={seconds} onEnd={handleEnd} />

      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-4 overflow-hidden">
        <div className="text-xs text-slate-400 mb-3">
          {connected ? 'Connected to assistant' : 'Connecting...'}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-12">
              We&apos;ll show teacher questions and answers here as they happen.
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} fromTeacher={m.fromTeacher} text={m.text} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSend={handleStudentSend} disabled={!connected} />
    </div>
  );
}
