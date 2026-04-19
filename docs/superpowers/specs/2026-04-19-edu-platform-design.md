# EduBuilder — AI-Powered Lesson Platform Design Spec

## Overview

A working prototype of an Education Perfect-style platform where teachers describe lessons via a chat interface and Claude builds interactive learning experiences in real-time. Students access completed lessons through a shareable URL.

**Tech stack:** Next.js + JavaScript
**Storage:** JSON files on disk
**AI:** Anthropic Claude API (streaming) with tool use
**Scope:** Working prototype — no auth, no accounts, no persistent student progress

## Pages

### Build Page (`/build`)

Full-viewport split pane layout:

- **Left panel (~40%):** Chat interface. Teacher messages and Claude responses. Input bar at bottom. Messages stream in real-time.
- **Right panel (~60%):** Live lesson preview. Renders lesson blocks as Claude generates them. Each block has hover overlay with Edit button to request changes via chat. Top toolbar with editable title, Save button, Share button (copies `/learn/{id}` URL).
- **Resizable divider** between panels.

### Learn Page (`/learn/[id]`)

Single-column, distraction-free layout for students:

- Progress bar at top showing completion percentage
- Blocks rendered sequentially with progressive disclosure — blocks below the active one are dimmed/hidden
- Interactive blocks require student response before showing feedback
- No student accounts — visit URL, go through lesson

## Architecture

```
Next.js App
├── /build                    → Build page (teacher)
├── /learn/[id]               → Learn page (student)
├── /api/chat                 → Claude streaming + tool use (SSE)
├── /api/lessons              → Save/load/list lesson JSON files
├── /api/search               → Web search proxy for NCEA lookups
└── ./data/lessons/           → JSON file storage
```

### API Routes

**`POST /api/chat`** — Streams Claude's response via Server-Sent Events.

Request body:
- `messages[]` — Chat history (teacher + Claude messages)
- `lesson` — Current lesson state (blocks array)

Claude has two tools:
- `update_lesson` — Add, replace, remove, or reorder lesson blocks
- `web_search` — Search the web for NCEA curriculum information

The frontend intercepts `update_lesson` tool calls from the stream and applies them to the lesson preview in real-time.

**`GET/POST /api/lessons`** — CRUD for lesson files.
- `POST /api/lessons` — Save a lesson, returns `{ id }`
- `GET /api/lessons/[id]` — Load a lesson by ID
- `GET /api/lessons` — List all lessons (for potential future lesson browser)

**`POST /api/search`** — Proxies web searches for NCEA content using Brave Search API (free tier). Called by Claude as a tool during lesson generation.

## Lesson Data Model

A lesson is an ordered array of blocks.

```json
{
  "id": "lesson-uuid",
  "title": "Forces and Motion — Level 2",
  "subject": "Physics",
  "level": "NCEA Level 2",
  "standard": "AS91171",
  "blocks": [],
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

### Standard Block Types

| Type | Purpose | Data Fields |
|------|---------|-------------|
| `reading` | Explanatory text | `title`, `content` (markdown), `image?` |
| `quiz` | Multiple choice / true-false | `question`, `options[]`, `correctIndex`, `explanation` |
| `short-answer` | Free text with model answer | `question`, `modelAnswer`, `hints[]` |
| `fill-blank` | Sentence completion | `template` (blanks marked as `{{0}}`, `{{1}}`), `blanks[{ answer, accept[] }]` |
| `drag-order` | Order items correctly | `instruction`, `items[{ id, label }]`, `correctOrder[]` (array of item IDs) |
| `video` | Embedded video | `url`, `caption`, `checkQuestions[]` |

### Custom Sandbox Blocks

For interactive simulations, graphs, custom visualizations — anything beyond standard types:

```json
{
  "id": "block-uuid",
  "type": "sandbox",
  "data": {
    "title": "Gravity Simulation",
    "description": "Adjust mass and distance to see gravitational force change",
    "html": "<!DOCTYPE html>...",
    "height": 500
  }
}
```

Rendered in a sandboxed iframe. Claude generates complete self-contained HTML/CSS/JS.

## Claude Integration

### System Prompt Structure

Three sections:

1. **Role** — Lesson builder for NZ secondary students creating interactive, evidence-based learning experiences.

2. **Learning psychology rules** — Concrete instructions enforcing the seven principles (see below).

3. **Tool instructions** — Block type schemas, when to use `web_search`, how to structure `update_lesson` operations.

### Tool Schemas

```
update_lesson({
  operations: [
    { action: "add", block: { type, data } },
    { action: "replace", blockId: "...", block: { type, data } },
    { action: "remove", blockId: "..." },
    { action: "reorder", order: ["id1", "id2", ...] }
  ]
})

web_search({
  query: "NZQA AS91027 achievement standard algebra"
})
```

### Conversation Context

Each `/api/chat` call sends:
- Full chat history
- Current lesson state (blocks array)
- Teacher's new message

Claude sees the lesson it has already built and can modify it incrementally.

### Web Search Flow

When a teacher references an NCEA standard:
1. Claude calls `web_search` with the standard number
2. Backend queries Brave Search API
3. Results returned to Claude as tool output
4. Claude uses the achievement objectives and explanatory notes to build aligned content

## Learning Psychology Principles

Every lesson Claude generates must follow these evidence-based principles, enforced via the system prompt:

1. **Activate prior knowledge** — Start with a hook question or scenario connecting to existing knowledge
2. **Chunked instruction** — Small, digestible reading blocks. No walls of text.
3. **Interleaved practice** — Quiz/interactive block after every 1-2 reading blocks (retrieval practice)
4. **Scaffolded difficulty** — Start easier, build complexity progressively
5. **Immediate feedback** — Every question shows explanations, not just correct/incorrect
6. **Concrete before abstract** — Simulations and visuals before formulas and theory
7. **Spaced review** — End with a mixed review section covering earlier material

## Student Interaction Patterns (Learn Page)

| Block Type | Student Action | Feedback |
|-----------|---------------|----------|
| `reading` | Read, click Continue | None — proceed to next block |
| `quiz` | Select answer, Submit | Correct/incorrect + explanation |
| `short-answer` | Type response, Submit | Model answer for self-comparison |
| `fill-blank` | Fill fields, Submit | Corrections highlighted in-place |
| `drag-order` | Drag items, Submit | Correct order shown with explanation |
| `video` | Watch, answer check questions | Same as quiz feedback |
| `sandbox` | Interact freely | Built into the sandbox itself |

## Build Page Streaming Flow

1. Teacher sends message
2. Frontend POSTs to `/api/chat` with message history + current lesson
3. Backend opens streaming connection to Anthropic API
4. Response streams back via SSE
5. Frontend splits the stream: chat text goes to the chat panel, `update_lesson` tool calls apply to the lesson preview
6. Blocks animate in (fade-in) as they're added
7. Teacher can click Edit on any block to request changes via chat

## File Structure

```
edu/
├── package.json
├── next.config.js
├── jsconfig.json
├── public/
├── data/
│   └── lessons/                  # JSON lesson files
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js               # Redirect to /build
│   │   ├── build/
│   │   │   └── page.js           # Build page
│   │   ├── learn/
│   │   │   └── [id]/
│   │   │       └── page.js       # Learn page
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.js      # Claude streaming endpoint
│   │       ├── lessons/
│   │       │   ├── route.js      # List + create lessons
│   │       │   └── [id]/
│   │       │       └── route.js  # Get/update specific lesson
│   │       └── search/
│   │           └── route.js      # Web search proxy
│   ├── components/
│   │   ├── build/
│   │   │   ├── ChatPanel.js      # Chat interface
│   │   │   ├── ChatMessage.js    # Single message bubble
│   │   │   ├── ChatInput.js      # Text input bar
│   │   │   └── LessonPreview.js  # Live lesson preview
│   │   ├── lesson/
│   │   │   ├── LessonRenderer.js # Renders full lesson (used by both pages)
│   │   │   ├── BlockRenderer.js  # Routes block type to component
│   │   │   ├── ReadingBlock.js
│   │   │   ├── QuizBlock.js
│   │   │   ├── ShortAnswerBlock.js
│   │   │   ├── FillBlankBlock.js
│   │   │   ├── DragOrderBlock.js
│   │   │   ├── VideoBlock.js
│   │   │   └── SandboxBlock.js   # iframe renderer
│   │   └── ui/
│   │       ├── ProgressBar.js
│   │       └── SplitPane.js
│   ├── lib/
│   │   ├── claude.js             # Anthropic API client + tool definitions
│   │   ├── lessons.js            # Lesson file I/O
│   │   ├── search.js             # Web search client
│   │   └── prompts.js            # System prompt + learning psychology rules
│   └── styles/
│       └── globals.css
```

## Dependencies

- **Anthropic API key** — Required. Set as `ANTHROPIC_API_KEY` env var.
- **Brave Search API key** — Required for NCEA curriculum lookups. Set as `BRAVE_API_KEY` env var. Free tier (1 req/sec, 2000/month) is sufficient for prototype.

## Out of Scope (Prototype)

- Authentication / user accounts
- Student progress tracking / saving
- Class management / teacher dashboards
- Lesson versioning
- Collaborative editing
- Deployment / hosting configuration
- Analytics
