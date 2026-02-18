import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

function buildDiagramPrompt(transcript, previousGraph) {
  const trimmedTranscript = transcript ? transcript.slice(-8000) : '';
  const prevJson =
    previousGraph && (previousGraph.nodes?.length > 0 || previousGraph.edges?.length > 0)
      ? JSON.stringify(previousGraph, null, 0)
      : '(none yet — create initial diagram from transcript)';

  return `You are a visual note-taking assistant for a live lecture. Your job is to analyze the transcript and produce a structured diagram (mind map / flowchart) as JSON.

OUTPUT FORMAT — return ONLY valid JSON in this exact shape (no markdown, no code fence, no explanation):
{"nodes":[{"id":"unique_id","label":"Short Title","bullets":["point 1"],"type":"topic|concept|detail|predicted","group":""}],"edges":[{"from":"id1","to":"id2","label":"relationship","style":"solid|dashed"}]}

NODE TYPES:
- topic: Major lecture heading or theme (use for section titles).
- concept: Key idea, step in a process, or important term.
- detail: Supporting example, sub-point, or bullet note (smaller emphasis).
- predicted: Content you infer is coming next; use when the teacher's pattern suggests more (e.g. "first... second..." implies "third..."). Use dashed edges to predicted nodes.

RULES:
1. Decide what is RELEVANT from the transcript — ignore filler, repetition, and off-topic chatter.
2. Put bullet points inside nodes when a concept has sub-points: use the "bullets" array with short strings.
3. When you can infer where the lecture is heading, add "predicted" nodes and connect with edges where style is "dashed".
4. When structure is clear but data is missing (e.g. "we've seen three of five steps"), add placeholder nodes with label like "Step 4 (pending)" or "Next topic?" and type "predicted".
5. EVOLVE the previous graph: add, update, or remove nodes. Reuse existing node ids when updating. Do not rebuild from scratch unless the transcript has completely changed topic.
6. Choose the best structure for the content: flowchart for processes, tree for hierarchies, mind map for themes.
7. Cap at about 20 nodes for readability. Prefer merging old detail nodes into concepts when the graph grows.
8. Every edge must reference existing node ids. "from" and "to" are node ids.

PREVIOUS DIAGRAM (evolve this):
${prevJson}

TRANSCRIPT:
${trimmedTranscript || '(empty — no content yet)'}

Return only the JSON object, no other text.`;
}

function parseDiagramResponse(text) {
  if (!text || typeof text !== 'string') return { nodes: [], edges: [] };
  let raw = text.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  try {
    const parsed = JSON.parse(raw);
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const edges = Array.isArray(parsed.edges) ? parsed.edges : [];
    return {
      nodes: nodes.map((n) => ({
        id: String(n.id ?? ''),
        label: String(n.label ?? ''),
        bullets: Array.isArray(n.bullets) ? n.bullets.map(String) : [],
        type: ['topic', 'concept', 'detail', 'predicted'].includes(n.type) ? n.type : 'concept',
        group: n.group != null ? String(n.group) : ''
      })),
      edges: edges.map((e) => ({
        from: String(e.from ?? e.source ?? ''),
        to: String(e.to ?? e.target ?? ''),
        label: e.label != null ? String(e.label) : '',
        style: e.style === 'dashed' ? 'dashed' : 'solid'
      }))
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Diagram JSON parse error', err);
    return { nodes: [], edges: [] };
  }
}

export async function generateDiagram(transcript, previousGraph) {
  const prompt = buildDiagramPrompt(transcript, previousGraph);

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response?.text?.();
      if (text && text.trim().length > 0) {
        return parseDiagramResponse(text);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Gemini diagram error', err);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You output only valid JSON. No markdown, no code fences, no explanation. Follow the user schema exactly.'
          },
          { role: 'user', content: prompt }
        ]
      });
      const text = response.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return parseDiagramResponse(text);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('OpenAI diagram error', err);
    }
  }

  return { nodes: [], edges: [] };
}
