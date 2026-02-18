import { transcribeChunk } from '../services/transcriptionService.js';
import { detectQuestions } from '../services/questionDetector.js';
import { answerQuestion } from '../services/llmService.js';
import { generateDiagram } from '../services/diagramService.js';

// Per-socket in-memory transcript
const transcripts = new Map();
// Track which chunks have already been scanned for questions per socket
const lastScannedIndex = new Map();
// Per-socket periodic timer
const questionTimers = new Map();
// Diagram state and word-count tracking per socket
const diagrams = new Map();
const lastDiagramWordCount = new Map();
const diagramTimers = new Map();
// Sentence-boundary buffer: holds incomplete trailing text between scan cycles
const pendingText = new Map();
// Track consecutive empty cycles to flush stale buffers
const emptyPendingCycles = new Map();

const MAX_STALE_CYCLES = 3; // flush pending buffer after this many cycles with no new text

/**
 * Split text at the last sentence boundary (.!?).
 * Returns [complete, remainder] where `complete` contains only
 * full sentences and `remainder` is the trailing fragment (may be empty).
 */
function splitAtSentenceBoundary(text) {
  const lastIdx = Math.max(
    text.lastIndexOf('.'),
    text.lastIndexOf('!'),
    text.lastIndexOf('?')
  );
  if (lastIdx === -1) return ['', text];
  return [text.slice(0, lastIdx + 1), text.slice(lastIdx + 1).trim()];
}

export function handleAudioSocket(socket) {
  transcripts.set(socket.id, []);
  lastScannedIndex.set(socket.id, 0);
  pendingText.set(socket.id, '');
  emptyPendingCycles.set(socket.id, 0);

  // Periodic question detection with sentence-boundary buffering
  const timer = setInterval(async () => {
    const transcript = transcripts.get(socket.id);
    if (!transcript || transcript.length === 0) return;

    const startIdx = lastScannedIndex.get(socket.id) || 0;
    const hasNewChunks = startIdx < transcript.length;

    // Grab new chunks and combine with any leftover pending text
    const newChunks = hasNewChunks ? transcript.slice(startIdx) : [];
    if (hasNewChunks) lastScannedIndex.set(socket.id, transcript.length);

    const pending = pendingText.get(socket.id) || '';
    const combined = [pending, ...newChunks].filter(Boolean).join(' ');

    if (!combined.trim()) return;

    // If no new chunks arrived, track stale cycles to eventually flush
    if (!hasNewChunks) {
      const stale = (emptyPendingCycles.get(socket.id) || 0) + 1;
      emptyPendingCycles.set(socket.id, stale);
      if (stale < MAX_STALE_CYCLES) return; // wait for more text
      // Flush: treat whatever we have as complete
      pendingText.set(socket.id, '');
      emptyPendingCycles.set(socket.id, 0);
      // eslint-disable-next-line no-console
      console.log('Flushing stale pending buffer:', combined);
    } else {
      emptyPendingCycles.set(socket.id, 0);
    }

    // Split at last sentence boundary
    let textToScan;
    if (hasNewChunks) {
      const [complete, remainder] = splitAtSentenceBoundary(combined);
      pendingText.set(socket.id, remainder);
      textToScan = complete;
    } else {
      // Stale flush — scan everything
      textToScan = combined;
    }

    if (!textToScan.trim()) return;

    const questions = detectQuestions(textToScan);
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

  // Diagram generation: every 15s, if 30+ new words, generate/evolve diagram
  const diagramTimer = setInterval(async () => {
    const transcript = transcripts.get(socket.id);
    if (!transcript || transcript.length < 2) return;

    const fullTranscript = transcript.join(' ');
    const wordCount = fullTranscript.split(/\s+/).filter(Boolean).length;
    const lastCount = lastDiagramWordCount.get(socket.id) ?? 0;
    if (wordCount - lastCount < 30) return;

    const prevGraph = diagrams.get(socket.id) || { nodes: [], edges: [] };
    try {
      const { nodes, edges } = await generateDiagram(fullTranscript, prevGraph);
      diagrams.set(socket.id, { nodes, edges });
      lastDiagramWordCount.set(socket.id, wordCount);
      socket.emit('diagram_update', { nodes, edges });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Diagram generation error', err);
    }
  }, 15000);
  diagramTimers.set(socket.id, diagramTimer);

  socket.on('disconnect', () => {
    const t = questionTimers.get(socket.id);
    if (t) clearInterval(t);
    questionTimers.delete(socket.id);
    const dt = diagramTimers.get(socket.id);
    if (dt) clearInterval(dt);
    diagramTimers.delete(socket.id);
    lastDiagramWordCount.delete(socket.id);
    diagrams.delete(socket.id);
    lastScannedIndex.delete(socket.id);
    transcripts.delete(socket.id);
    pendingText.delete(socket.id);
    emptyPendingCycles.delete(socket.id);
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
