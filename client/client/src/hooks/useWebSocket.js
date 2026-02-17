import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('/', { path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendAudioChunk = (chunk) => {
    if (socketRef.current && connected) {
      // `chunk` is a Blob from MediaRecorder; Socket.IO will deliver it as a Buffer on the server.
      socketRef.current.emit('audio_chunk', chunk);
    }
  };

  const sendStudentQuestion = (text) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('student_question', { text });
    }
  };

  const onMessage = (handler) => {
    if (!socketRef.current) return;
    socketRef.current.on('message', handler);
    return () => {
      socketRef.current.off('message', handler);
    };
  };

  return {
    connected,
    sendAudioChunk,
    sendStudentQuestion,
    onMessage
  };
}

