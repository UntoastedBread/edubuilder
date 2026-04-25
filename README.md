# EduBuilder

AI-powered interactive lesson builder for New Zealand secondary school teachers. Chat with Claude to build structured, interactive lessons — then share them with students via a link.

## What it does

**Teachers** describe what they want to teach in a chat interface. Claude builds a structured lesson in real-time with reading blocks, quizzes, fill-in-the-blank exercises, drag-to-order activities, code sandboxes, and more. Lessons stream in block-by-block as Claude generates them.

**Students** open a shareable link and work through the lesson with progressive disclosure — each block unlocks after completing the previous one, with scoring and a completion celebration.

## Features

- **AI lesson builder** — chat with Claude to create lessons, with real-time streaming preview
- **7 block types** — reading, quiz (single/multi-select/image), fill-blank, drag-order, short-answer, video, code sandbox
- **In-browser code execution** — Python code transpiled to JS and run in a sandboxed iframe
- **Markdown + LaTeX** — full math rendering in all text content via KaTeX
- **NCEA curriculum search** — Brave Search integration for NZ curriculum standard lookups
- **Auto quality review** — Claude reviews its own lessons and fixes issues automatically
- **Progressive disclosure** — students unlock blocks sequentially with slide animations
- **Lesson library** — browse and manage lessons with duration estimates and block type visualization
- **Internationalization** — English, Spanish, French, German, Japanese
- **Role-based UI** — teacher, learner, and explorer modes with onboarding flow
- **Theme support** — light, dark, and system-preference modes
- **Keyboard shortcuts** — press `?` to see available shortcuts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=BSA...
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node) — Claude Sonnet with streaming + tool use
- [Brave Search API](https://brave.com/search/api/) — curriculum lookups
- [react-markdown](https://github.com/remarkjs/react-markdown) + [KaTeX](https://katex.org/) — markdown with LaTeX
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — completion celebrations

## Project Structure

```
src/
  app/
    build/page.js          # Teacher: chat + live preview (split pane)
    learn/[id]/page.js     # Student: take a lesson
    learn/page.js          # Student: browse public lessons
    library/page.js        # Lesson library (role-aware)
    api/chat/route.js      # SSE streaming endpoint
    api/lessons/route.js   # Lesson CRUD
    api/search/route.js    # Brave Search proxy
  components/
    build/                 # Chat panel, lesson preview, chat input
    lesson/                # Block components, renderer, sidebar
    learn/                 # Student-facing browse + lesson pages
    ui/                    # Split pane, toast, keyboard shortcuts
  lib/
    claude.js              # Agentic streaming loop
    prompts.js             # System prompt + tool definitions
    lessons.js             # File-based lesson storage
    i18n/                  # Translation files (en, es, fr, de, ja)
    ModeContext.js          # User role (teacher/learner/explorer)
    ThemeContext.js         # Theme (light/dark/system)
    I18nContext.js          # Internationalization
data/
  lessons/                 # Saved lesson JSON files (gitignored)
```

## How the Streaming Works

The AI streaming pipeline has multiple layers:

1. **Agentic loop** — Claude calls tools (update_lesson, review_lesson, etc.) in a loop until the lesson is complete
2. **Partial block streaming** — as Claude generates JSON for lesson blocks, complete operations are extracted and emitted incrementally so blocks appear one at a time
3. **SSE transport** — events flow from server to client: text, tool_start, tool_block_partial, tool_call, tool_result, suggestion, done
4. **Client rendering** — the chat panel parses SSE events and updates both the conversation and the live lesson preview

## License

MIT
