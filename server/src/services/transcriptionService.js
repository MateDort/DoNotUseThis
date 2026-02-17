import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

let chunkIndex = 0;

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

    if (text) {
      // Log each successful chunk so you can see live transcription in the terminal
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
