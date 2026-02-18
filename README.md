# Classroom AI Assistant

A real-time classroom companion that listens to your teacher, transcribes the lecture, auto-generates a live concept-map whiteboard, detects questions, and provides instant AI-powered answers — all without interrupting the lecture.

**[Try it live](https://classroom-assistant-qfla.onrender.com/)**

![Full View](screenshots/White_Board_Version/full-view.png)

## Features

- **Live Transcription** — Captures and transcribes the teacher's voice in real time using OpenAI Whisper.
- **AI Whiteboard** — Automatically generates an interactive concept-map / mind-map from the lecture transcript, complete with topic nodes, concept nodes, detail nodes, and predicted nodes for where the lecture is heading next.
- **Automatic Question Detection** — Scans the transcript to identify questions the teacher asks and generates concise, context-aware answers.
- **Student Chat** — Students can ask their own questions at any time and get answers grounded in what was actually discussed in class.
- **Noise Filtering** — Multi-layer hallucination filtering automatically removes filler phrases and transcription artifacts.

## Screenshots

### Whiteboard — Live Concept Map

The whiteboard builds a structured diagram from the lecture in real time. Nodes are color-coded by type: topics, concepts, details, and predicted upcoming content (shown with dashed borders).

![Whiteboard](screenshots/White_Board_Version/whiteboard.png)

### Transcript + Whiteboard Side-by-Side

The live transcript panel sits alongside the whiteboard, giving students a complete view of both the raw lecture text and the AI-structured diagram.

![Transcript and Whiteboard](screenshots/White_Board_Version/transcript-whiteboard.png)

### Live Transcript Panel

The transcript panel scrolls in real time as the teacher speaks, with each chunk displayed as it's transcribed.

![Transcript](screenshots/White_Board_Version/transcript.png)

### Chat — Question Detection & Student Q&A

Detected teacher questions appear automatically with AI-generated answers. Students can also type their own questions in the chat input.

![Chat](screenshots/White_Board_Version/chat.png)

## How It Works

1. **Start Listening** — Click the button, grant microphone access, and the assistant begins capturing audio.
2. **Transcription** — Audio is streamed to the server in 5-second chunks, transcribed by Whisper, and accumulated into a running transcript.
3. **Diagram Generation** — The server periodically sends the transcript to a diagram LLM that produces a structured JSON graph (nodes + edges). The graph evolves incrementally as new content arrives.
4. **Whiteboard Rendering** — The client receives the graph and renders it as an interactive, auto-laid-out React Flow canvas with draggable nodes.
5. **Question Detection** — New transcript text is scanned for questions (regex + keyword heuristics).
6. **Answer Generation** — Detected questions and student chat messages are answered using the full transcript as context.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Flow |
| Backend | Node.js, Express, Socket.IO |
| Transcription | OpenAI Whisper API |
| LLM | Google Gemini 2.5 Flash (primary), OpenAI GPT-4o-mini (fallback) |
| Graph Layout | Dagre (automatic hierarchical layout) |
| Deployment | Render.com |

## Architecture

```
Browser (React)
  │
  ├── MediaRecorder captures mic audio (WebM/Opus)
  ├── Socket.IO streams chunks to server
  ├── Live transcript panel (scrolling text)
  ├── React Flow whiteboard (auto-layout concept map)
  └── Chat panel (detected Q&A + student questions)
  
Server (Node.js/Express)
  │
  ├── Whisper API transcribes each audio chunk
  ├── Accumulates per-session transcript
  ├── Diagram service generates graph JSON from transcript
  ├── Periodic question detection
  ├── Gemini/OpenAI answers questions with transcript context
  └── Serves React build in production
```

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Google Gemini API key (optional, falls back to OpenAI)

### Setup

```bash
# Clone the repo
git clone https://github.com/MateDort/DoNotUseThis.git
cd DoNotUseThis

# Create your .env file
cp .env.example .env
# Edit .env and add your API keys

# Install and start the server
cd server
npm install
npm run dev

# In a separate terminal, install and start the client
cd client/client
npm install
npm run dev
```

The client runs at `http://localhost:5173` and proxies API/WebSocket requests to the server on port `4000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for Whisper transcription and GPT fallback |
| `GOOGLE_GEMINI_API_KEY` | No | Google Gemini API key (primary LLM, falls back to OpenAI) |
| `PORT` | No | Server port (default: 4000) |

## Deployment

The app is deployed on [Render.com](https://render.com) as a single web service. The Node.js server serves the built React client in production.

```bash
# Build command
npm run build    # Builds the React client

# Start command
npm run start    # Starts the Express server (serves static files + WebSocket)
```

A `render.yaml` is included for one-click deployment via Render Blueprint.

## License

MIT
