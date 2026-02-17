import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

let chunkIndex = 0;

// Whisper hallucinations that appear when audio is near-silent or contains background noise.
// Exact matches: the entire transcription (after normalizing) equals one of these.
const JUNK_EXACT = [
  'you', 'bye', 'bye bye', 'goodbye', 'so', 'the the', 'thank you',
  'thank you very much', 'thanks', 'okay', 'music', 'dramatic music',
  'have a good day', 'have a nice day', 'take care',
];

// Substring matches: if ANY of these appear anywhere in the transcription, it's junk.
const JUNK_CONTAINS = [
  'thank you for watching', 'thanks for watching',
  'please subscribe', 'like and subscribe', 'don\'t forget to subscribe',
  'hit the bell', 'hit the notification bell',
  'check out the next video', 'see you in the next video', 'see you next time',
  'leave a comment below', 'link in the description',
  'thanks for listening', 'thank you for listening',
  'please like and subscribe', 'smash that like button',
  'follow us on', 'check out our',
];

function isJunkTranscription(text) {
  const normalized = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  if (normalized.length < 3) return true;
  if (JUNK_EXACT.includes(normalized)) return true;
  return JUNK_CONTAINS.some((phrase) => normalized.includes(phrase));
}

export async function transcribeChunk(buffer, mimeType = 'audio/webm') {
  const currentChunkIndex = chunkIndex++;

  if (!process.env.OPENAI_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('OPENAI_API_KEY not set, skipping transcription');
    return '';
  }

  // Instantiate the client lazily, after env has been loaded in index.js
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // OpenAI SDK expects an Uploadable (File/Blob/etc). Convert Buffer into a File-like object.
    const file = await toFile(buffer, 'chunk.webm', { type: mimeType });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en'
    });

    const text = response.text || '';

    if (isJunkTranscription(text)) {
      // eslint-disable-next-line no-console
      console.log('Filtered junk transcription:', text);
      return '';
    }

    if (text) {
      // eslint-disable-next-line no-console
      console.log('Transcript chunk:', text);
    }
    return text;
  } catch (err) {
    // Some chunks can occasionally be rejected as "invalid file format" even though
    // others succeed. Treat those as soft failures to avoid noisy stack traces.
    const message = err?.error?.message || err?.message || '';

    if (message.includes('Invalid file format')) {
      // eslint-disable-next-line no-console
      console.warn('Whisper rejected a chunk as invalid format (soft ignore).');
      return '';
    }
    // eslint-disable-next-line no-console
    console.error('Transcription error', err);
    return '';
  }
}
