import { google } from 'googleapis';

const customsearch = google.customsearch('v1');

export async function webSearch(query) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    // eslint-disable-next-line no-console
    console.warn('Google search keys missing, skipping web search');
    return '';
  }

  try {
    const res = await customsearch.cse.list({
      auth: apiKey,
      cx,
      q: query,
      num: 3
    });

    const items = res.data.items || [];
    if (!items.length) return '';

    const summary = items
      .map((item) => `- ${item.title}: ${item.snippet}`)
      .join('\n');

    return `Here is what I found on the web:\n${summary}`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Web search error', err);
    return '';
  }
}

