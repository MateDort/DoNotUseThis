import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { webSearch } from './searchService.js';

const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export async function answerQuestion(question, transcript) {
  // Proactively fetch web search results for questions that might benefit from external info
  let searchResults = '';
  if (shouldSearchWeb(question, transcript)) {
    try {
      searchResults = await webSearch(question);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Proactive web search error', err);
    }
  }

  const contextPrompt = buildPrompt(question, transcript, searchResults);

  // 1. Try Gemini
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
          {
            role: 'system',
            content:
              'You are a knowledgeable classroom assistant. Combine class context with your own expertise to give thorough, educational answers.'
          },
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

  // 3. Last resort: raw web search summary
  if (!searchResults) {
    const web = await webSearch(question);
    if (web) return web;
  }

  return "I'm not sure how to answer that right now.";
}

/**
 * Decide whether to proactively fetch web search results before calling the LLM.
 * Returns true for questions about specific facts, current events, definitions,
 * or topics not well covered by the transcript alone.
 */
function shouldSearchWeb(question, transcript) {
  const q = question.toLowerCase();

  // Always search for questions asking about definitions, specifics, examples, comparisons
  const factualPatterns = [
    /what (?:is|are|was|were) /,
    /define /,
    /explain /,
    /how (?:does|do|did|is|are) /,
    /difference between /,
    /example of /,
    /why (?:does|do|did|is|are) /,
    /when (?:was|were|did|is) /,
    /who (?:is|are|was|were) /,
    /tell (?:me|us) about /,
    /can you (?:explain|describe|tell)/
  ];

  for (const pattern of factualPatterns) {
    if (pattern.test(q)) return true;
  }

  // Search if transcript is short (not much class context yet)
  const trimmed = transcript ? transcript.trim() : '';
  if (trimmed.length < 200) return true;

  return false;
}

function buildPrompt(question, transcript, searchResults) {
  const trimmedTranscript = transcript ? transcript.slice(-6000) : '';
  const parts = [
    'You are an expert classroom assistant with deep knowledge across all subjects.',
    'You have three sources of information:',
    '1. A live transcript of what is being discussed in class right now.',
    '2. Your own extensive knowledge as an AI.',
    '3. Optional web search results for additional context.',
    '',
    'YOUR APPROACH:',
    '- ALWAYS start by referencing what was discussed in class (the transcript) if it relates to the question.',
    '- THEN expand on the topic using your own knowledge to give a thorough, educational answer.',
    '- If web search results are provided, incorporate relevant facts from them too.',
    '- Blend all sources seamlessly — do not say "according to the transcript" or "according to my knowledge" separately.',
    '  Instead, give one unified, comprehensive answer.',
    '- If the question is about what was discussed in class, summarize the transcript AND add helpful context.',
    '- For factual/technical questions, give a complete answer even if the transcript only briefly mentions the topic.',
    '- Use clear structure: brief intro, key points, and a takeaway when appropriate.',
    '',
    '--- CLASS TRANSCRIPT (live, may be partial) ---',
    trimmedTranscript || '(empty - class has not started yet)',
    '--- END TRANSCRIPT ---'
  ];

  if (searchResults && searchResults.trim().length > 0) {
    parts.push(
      '',
      '--- WEB SEARCH RESULTS (use to supplement your answer) ---',
      searchResults,
      '--- END SEARCH RESULTS ---'
    );
  }

  parts.push(
    '',
    `Question: "${question}"`,
    '',
    'Give a thorough, friendly, and educational answer. Combine what was said in class with your own expertise.',
    'If the transcript mentions the topic, reference it and then go deeper. Keep it concise but complete.'
  );

  return parts.join('\n');
}
