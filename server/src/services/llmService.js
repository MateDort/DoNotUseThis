import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { webSearch } from './searchService.js';

const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export async function answerQuestion(question, transcript) {
  const contextPrompt = buildPrompt(question, transcript);

  // 1. Try Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const result = await model.generateContent(contextPrompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) return text.trim();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Gemini error', err);
    }
  }

  // 2. Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful classroom assistant for students.' },
          { role: 'user', content: contextPrompt }
        ]
      });
      const text = response.choices[0]?.message?.content;
      if (text && text.trim().length > 0) return text.trim();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('OpenAI error', err);
    }
  }

  // 3. Last resort: web search
  const web = await webSearch(question);
  if (web) return web;

  return "I'm not sure how to answer that right now.";
}

function buildPrompt(question, transcript) {
  const trimmedTranscript = transcript ? transcript.slice(-4000) : '';
  return [
    'You are a classroom assistant. You have access to a live transcript of what was said in class.',
    '',
    'IMPORTANT RULES:',
    '- ALWAYS reference and use the transcript content below when answering.',
    '- If the student asks what was discussed/talked about, summarize the transcript content.',
    '- If the transcript contains information relevant to the question, use it.',
    '- Only use your own general knowledge when the transcript truly has nothing related to the question.',
    '- Never say "the transcript doesn\'t contain" unless the transcript is literally empty.',
    '',
    '--- CLASS TRANSCRIPT (live, may be partial) ---',
    trimmedTranscript || '(empty - class has not started yet)',
    '--- END TRANSCRIPT ---',
    '',
    `Student question: "${question}"`,
    '',
    'Give a concise, friendly answer. If summarizing the transcript, quote specific things that were said.'
  ].join('\n');
}
