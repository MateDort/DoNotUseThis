import React, { useEffect, useRef, useState } from 'react';
import RecordingIndicator from './RecordingIndicator.jsx';
import ChatMessage from './ChatMessage.jsx';
import ChatInput from './ChatInput.jsx';
import TranscriptPanel from './TranscriptPanel.jsx';
import WhiteboardCanvas from './whiteboard/WhiteboardCanvas.jsx';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useWebSocket } from '../hooks/useWebSocket.js';

export default function RecordingScreen({ onEnd }) {
  const [seconds, setSeconds] = useState(0);
  const [messages, setMessages] = useState([]);
  const [transcriptChunks, setTranscriptChunks] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [diagram, setDiagram] = useState({ nodes: [], edges: [] });
  const [chatOpen, setChatOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const { connected, sendAudioChunk, sendStudentQuestion, onMessage, onTranscript, onDiagram } =
    useWebSocket();
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
    const unsubscribe = onTranscript?.((payload) => {
      if (payload?.text) {
        setTranscriptChunks((prev) => [...prev, payload.text]);
      }
    });
    return unsubscribe;
  }, [onTranscript]);

  useEffect(() => {
    const unsubscribe = onDiagram?.((payload) => {
      if (payload?.nodes && payload?.edges) {
        setDiagram({ nodes: payload.nodes, edges: payload.edges });
      }
    });
    return unsubscribe;
  }, [onDiagram]);

  useEffect(() => {
    start().catch((err) => {
      console.error('Microphone error', err);
    });
  }, [start]);

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
    <div className="h-screen flex flex-col bg-secondary relative">
      <RecordingIndicator seconds={seconds} onEnd={handleEnd} />

      {/* Full-screen whiteboard (behind overlays) */}
      <div className="absolute inset-0 top-[52px] z-0">
        <WhiteboardCanvas diagramNodes={diagram.nodes} diagramEdges={diagram.edges} />
      </div>

      <TranscriptPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((o) => !o)}
        chunks={transcriptChunks}
      />

      {/* Floating chat overlay bottom-right */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-200 ${
          chatOpen ? 'w-[384px] max-h-[400px]' : 'w-12 h-12 rounded-xl'
        }`}
      >
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          className={`flex items-center ${chatOpen ? 'justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 hover:bg-slate-100 text-left' : 'justify-center w-12 h-12 hover:bg-slate-100'} text-slate-700`}
          aria-label={chatOpen ? 'Collapse chat' : 'Expand chat'}
        >
          {chatOpen ? (
            <>
              <span className="text-sm font-semibold truncate">
                {connected ? 'Chat' : 'Connecting...'}
              </span>
              <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
        {chatOpen && (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 min-h-0 max-h-[300px]">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm">
                  Questions and answers appear here.
                </div>
              )}
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  role={m.role}
                  fromTeacher={m.fromTeacher}
                  text={m.text}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-slate-200 p-2">
              <ChatInput onSend={handleStudentSend} disabled={!connected} embedded />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
