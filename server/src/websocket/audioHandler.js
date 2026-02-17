import { transcribeChunk } from '../services/transcriptionService.js';
import { detectQuestions } from '../services/questionDetector.js';
import { answerQuestion } from '../services/llmService.js';

// Per-socket in-memory transcript
const transcripts = new Map();
// Track which chunks have already been scanned for questions per socket
const lastScannedIndex = new Map();
// Per-socket periodic timer
const questionTimers = new Map();

export function handleAudioSocket(socket) {
  transcripts.set(socket.id, []);
  lastScannedIndex.set(socket.id, 0);

  // Periodic question detection: every 5 seconds, scan new transcript chunks
  const timer = setInterval(async () => {
    const transcript = transcripts.get(socket.id);
    if (!transcript || transcript.length === 0) return;

    const startIdx = lastScannedIndex.get(socket.id) || 0;
    if (startIdx >= transcript.length) return; // nothing new

    // Get only the new chunks since last scan
    const newChunks = transcript.slice(startIdx);
    const newText = newChunks.join(' ');
    lastScannedIndex.set(socket.id, transcript.length);

    const questions = detectQuestions(newText);
    if (questions.length === 0) return;

    // eslint-disable-next-line no-console
    console.log('Detected questions from transcript:', questions);

    const fullTranscript = transcript.join(' ');
    for (const q of questions) {
      try {
        const answer = await answerQuestion(q, fullTranscript);

        socket.emit('message', {
          id: Date.now() + Math.random(),
          role: 'teacher',
          fromTeacher: true,
          text: q
        });

        socket.emit('message', {
          id: Date.now() + Math.random(),
          role: 'assistant',
          fromTeacher: true,
          text: answer
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error answering detected question', err);
      }
    }
  }, 5000);

  questionTimers.set(socket.id, timer);

  socket.on('disconnect', () => {
    const t = questionTimers.get(socket.id);
    if (t) clearInterval(t);
    questionTimers.delete(socket.id);
    lastScannedIndex.delete(socket.id);
    transcripts.delete(socket.id);
  });

  socket.on('audio_chunk', async (data) => {
    try {
      // On Node, Socket.IO delivers binary blobs as Buffers.
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      // eslint-disable-next-line no-console
      console.log('Received audio_chunk', { socketId: socket.id, bytes: buffer.length });

      const text = await transcribeChunk(buffer, 'audio/webm');
      if (!text) return;

      const transcript = transcripts.get(socket.id) || [];
      transcript.push(text);
      transcripts.set(socket.id, transcript);

      // Emit the transcript chunk to the client for real-time display
      socket.emit('transcript', { text });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error handling audio_chunk', err);
    }
  });

  socket.on('student_question', async ({ text }) => {
    try {
      const transcript = transcripts.get(socket.id) || [];
      const fullTranscript = transcript.join(' ');
      const answer = await answerQuestion(text, fullTranscript);

      socket.emit('message', {
        id: Date.now() + Math.random(),
        role: 'assistant',
        fromTeacher: false,
        text: answer
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error handling student_question', err);
    }
  });
}
