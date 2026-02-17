import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toFile } from 'openai/uploads';

const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

let chunkIndex = 0;

// Whisper hallucinations that appear when audio is near-silent or contains background noise.
// Exact matches: the entire transcription (after normalizing) equals one of these.
const JUNK_EXACT = new Set([
  'you', 'bye', 'bye bye', 'goodbye', 'so', 'the the', 'thank you',
  'thank you very much', 'thanks', 'okay', 'ok', 'oh', 'ah', 'uh', 'um',
  'music', 'dramatic music', 'soft music', 'upbeat music', 'gentle music',
  'have a good day', 'have a nice day', 'take care',
  'silence', 'applause', 'laughter', 'cheering',
  'hmm', 'huh', 'mhm', 'mmm', 'yeah', 'yes', 'no', 'nah',
  'right', 'well', 'like', 'the end', 'end',
  'hello', 'hi', 'hey', 'good morning', 'good evening', 'good night',
  'i', 'it', 'a', 'the', 'is', 'this', 'that', 'and', 'or', 'but',
]);

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
  'subtitles by', 'captions by', 'translated by', 'transcribed by',
  'copyright', 'all rights reserved',
  'sponsored by', 'brought to you by',
  'patreon', 'ko-fi',
  'www.', 'http', '.com', '.org', '.net',
  'experience the new horror',
  'fried lamb steak', 'doughnuts',
];

// Patterns that indicate hallucination (regex)
const JUNK_PATTERNS = [
  /^[\s.,!?…\-—]*$/, // only punctuation/whitespace
  /(.{8,}?)\1{1,}/i, // repeated phrase (8+ chars appearing 2+ times)
  /^(.{2,15})\s*\1/i, // starts with a short phrase repeated immediately
  /[♪♫🎵🎶]/, // music symbols
  /^\[.*\]$/, // bracketed text like [Music] [Applause]
  /^\(.*\)$/, // parenthesized text like (silence)
];

function isJunkTranscription(text) {
  const normalized = text.toLowerCase().trim().replace(/[.,!?;:…]/g, '').trim();

  // Too short to be real speech
  if (normalized.length < 4) return true;

  // Exact match against known hallucinations
  if (JUNK_EXACT.has(normalized)) return true;

  // Substring match
  if (JUNK_CONTAINS.some((phrase) => normalized.includes(phrase))) return true;

  // Regex pattern match
  if (JUNK_PATTERNS.some((re) => re.test(normalized))) return true;

  // Detect repetition: if the text is just the same sentence repeated
  const sentences = normalized.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length >= 2) {
    const unique = new Set(sentences);
    if (unique.size === 1) return true; // same sentence repeated
  }

  // Detect very short words-only text that doesn't form a real sentence (< 3 words, < 15 chars)
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && normalized.length < 15) return true;

  return false;
}

/**
 * Quick LLM check: ask Gemini (or GPT) whether a transcription looks like a
 * Whisper hallucination. Returns true if it's likely fake.
 */
async function isLlmHallucination(text) {
  const prompt = [
    'You are a Whisper transcription quality filter.',
    'When Whisper receives silent or near-silent audio it often "hallucinates" random text that was never actually spoken.',
    'Common hallucination signs:',
    '- Random unrelated sentences (horror, cooking, religious text, song lyrics)',
    '- YouTube/podcast outros ("thanks for watching", "subscribe")',
    '- Repeated phrases or gibberish',
    '- Text that sounds like captions from a random video',
    '- Generic filler that doesn\'t sound like real classroom speech',
    '',
    'Real classroom speech sounds like a teacher or student talking about a topic — lectures, questions, explanations, discussions.',
    '',
    `Transcription to check: "${text}"`,
    '',
    'Is this likely a Whisper hallucination? Reply with ONLY "yes" or "no".'
  ].join('\n');

  // Try Gemini first (fast + cheap)
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim().toLowerCase();
      return answer.startsWith('yes');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Hallucination check (Gemini) error:', err.message);
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 3,
        messages: [
          { role: 'system', content: 'Reply with only "yes" or "no".' },
          { role: 'user', content: prompt }
        ]
      });
      const answer = response.choices[0]?.message?.content?.trim().toLowerCase() || '';
      return answer.startsWith('yes');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Hallucination check (OpenAI) error:', err.message);
    }
  }

  // If both fail, let the text through (better to show real speech than drop it)
  return false;
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
      console.log('Filtered junk transcription (pattern):', text);
      return '';
    }

    // LLM sanity check — catches nonsensical hallucinations that patterns miss
    const hallucination = await isLlmHallucination(text);
    if (hallucination) {
      // eslint-disable-next-line no-console
      console.log('Filtered junk transcription (LLM):', text);
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
