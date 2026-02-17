const QUESTION_REGEX = /([^.!?]*\?)/gim;
const KEYWORDS = ['what', 'why', 'how', 'can', 'does', 'do', 'could', 'would', 'should', 'is', 'are', 'did'];

export function detectQuestions(text) {
  const questions = [];

  if (!text) return questions;

  const matches = text.match(QUESTION_REGEX);
  if (matches) {
    for (const m of matches) {
      const trimmed = m.trim();
      if (trimmed.length > 3) {
        questions.push(trimmed);
      }
    }
  }

  // Fallback: treat long lines starting with question keywords as questions
  const sentences = text.split(/[.!]/);
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length < 8 || trimmed.endsWith('?')) continue;
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    if (KEYWORDS.includes(firstWord)) {
      questions.push(trimmed + '?');
    }
  }

  return questions;
}

