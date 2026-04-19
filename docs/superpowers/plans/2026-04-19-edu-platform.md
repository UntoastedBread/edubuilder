# EduBuilder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working prototype where teachers chat with Claude to build interactive lessons, and students go through them at a shareable URL.

**Architecture:** Next.js App Router with three API routes (chat streaming, lesson CRUD, web search proxy). Claude generates lesson blocks via tool use streamed over SSE. Lessons stored as JSON files on disk. Two pages: `/build` (teacher) and `/learn/[id]` (student).

**Tech Stack:** Next.js 15, JavaScript, Anthropic SDK, Brave Search API, react-markdown, uuid

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `next.config.js`
- Create: `jsconfig.json`
- Create: `.env.local`
- Create: `.gitignore`
- Create: `src/app/layout.js`
- Create: `src/app/page.js`
- Create: `src/styles/globals.css`
- Create: `data/lessons/.gitkeep`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/micha/claude/edu
npx create-next-app@latest . --js --app --no-tailwind --no-eslint --no-turbopack --src-dir --import-alias "@/*" --no-git
```

Accept defaults. This creates the base Next.js project with App Router.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/micha/claude/edu
npm install @anthropic-ai/sdk uuid react-markdown
```

- [ ] **Step 3: Create environment file**

Create `.env.local`:

```
ANTHROPIC_API_KEY=your-key-here
BRAVE_API_KEY=your-key-here
```

- [ ] **Step 4: Create data directory for lesson storage**

```bash
mkdir -p /Users/micha/claude/edu/data/lessons
touch /Users/micha/claude/edu/data/lessons/.gitkeep
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:

```
data/lessons/*.json
.env.local
```

- [ ] **Step 6: Replace default layout.js**

Replace `src/app/layout.js`:

```jsx
import '@/styles/globals.css';

export const metadata = {
  title: 'EduBuilder',
  description: 'AI-powered interactive lesson builder',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Replace default page.js with redirect**

Replace `src/app/page.js`:

```jsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/build');
}
```

- [ ] **Step 8: Create minimal globals.css**

Replace `src/styles/globals.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #fafafa;
  --bg-panel: #ffffff;
  --border: #e2e8f0;
  --text: #1a202c;
  --text-muted: #718096;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;
  --radius: 8px;
  --radius-sm: 4px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
}

html, body {
  height: 100%;
  font-family: var(--font-sans);
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
}

button {
  cursor: pointer;
  font-family: inherit;
}

a {
  color: var(--primary);
  text-decoration: none;
}
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd /Users/micha/claude/edu && npm run dev
```

Visit `http://localhost:3000` — should redirect to `/build` (which will 404 for now, that's expected).

- [ ] **Step 10: Initialize git and commit**

```bash
cd /Users/micha/claude/edu
git init
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

### Task 2: Lesson Storage Library

**Files:**
- Create: `src/lib/lessons.js`

- [ ] **Step 1: Write lesson CRUD library**

Create `src/lib/lessons.js`:

```js
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data', 'lessons');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export async function createLesson(lesson) {
  await ensureDataDir();
  const id = uuidv4();
  const now = new Date().toISOString();
  const full = {
    id,
    title: lesson.title || 'Untitled Lesson',
    subject: lesson.subject || '',
    level: lesson.level || '',
    standard: lesson.standard || '',
    blocks: lesson.blocks || [],
    createdAt: now,
    updatedAt: now,
  };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(full, null, 2));
  return full;
}

export async function getLesson(id) {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  const data = await readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function updateLesson(id, updates) {
  const existing = await getLesson(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export async function listLessons() {
  await ensureDataDir();
  const files = await readdir(DATA_DIR);
  const lessons = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const data = await readFile(path.join(DATA_DIR, file), 'utf-8');
    const lesson = JSON.parse(data);
    lessons.push({
      id: lesson.id,
      title: lesson.title,
      subject: lesson.subject,
      level: lesson.level,
      updatedAt: lesson.updatedAt,
    });
  }
  return lessons.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
```

- [ ] **Step 2: Verify by running a quick test in Node**

```bash
cd /Users/micha/claude/edu
node -e "
import('./src/lib/lessons.js').then(async (m) => {
  const lesson = await m.createLesson({ title: 'Test Lesson', blocks: [] });
  console.log('Created:', lesson.id);
  const fetched = await m.getLesson(lesson.id);
  console.log('Fetched:', fetched.title);
  const list = await m.listLessons();
  console.log('List count:', list.length);
  // cleanup
  const fs = await import('fs/promises');
  await fs.unlink('data/lessons/' + lesson.id + '.json');
  console.log('PASS');
})
"
```

Expected: `Created: <uuid>`, `Fetched: Test Lesson`, `List count: 1`, `PASS`

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/lib/lessons.js
git commit -m "feat: lesson CRUD file storage library"
```

---

### Task 3: Lessons API Routes

**Files:**
- Create: `src/app/api/lessons/route.js`
- Create: `src/app/api/lessons/[id]/route.js`

- [ ] **Step 1: Create list + create route**

Create `src/app/api/lessons/route.js`:

```js
import { NextResponse } from 'next/server';
import { createLesson, listLessons } from '@/lib/lessons';

export async function GET() {
  const lessons = await listLessons();
  return NextResponse.json(lessons);
}

export async function POST(request) {
  const body = await request.json();
  const lesson = await createLesson(body);
  return NextResponse.json(lesson, { status: 201 });
}
```

- [ ] **Step 2: Create get/update route**

Create `src/app/api/lessons/[id]/route.js`:

```js
import { NextResponse } from 'next/server';
import { getLesson, updateLesson } from '@/lib/lessons';

export async function GET(request, { params }) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }
  return NextResponse.json(lesson);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const lesson = await updateLesson(id, body);
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }
  return NextResponse.json(lesson);
}
```

- [ ] **Step 3: Verify with curl**

Start dev server, then in another terminal:

```bash
# Create a lesson
curl -s -X POST http://localhost:3000/api/lessons \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","blocks":[]}' | head -c 200

# List lessons
curl -s http://localhost:3000/api/lessons | head -c 200
```

Expected: JSON with the created lesson, then a list containing it.

- [ ] **Step 4: Commit**

```bash
cd /Users/micha/claude/edu
git add src/app/api/lessons/
git commit -m "feat: lesson CRUD API routes"
```

---

### Task 4: Web Search Integration

**Files:**
- Create: `src/lib/search.js`
- Create: `src/app/api/search/route.js`

- [ ] **Step 1: Write Brave Search client**

Create `src/lib/search.js`:

```js
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

export async function webSearch(query) {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey || apiKey === 'your-key-here') {
    return {
      query,
      results: [
        {
          title: 'Web search not configured',
          url: '',
          description: `Search for "${query}" could not be performed. BRAVE_API_KEY not set. Proceed using your training knowledge about NCEA standards.`,
        },
      ],
    };
  }

  const url = new URL(BRAVE_API_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', '5');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search failed: ${response.status}`);
  }

  const data = await response.json();
  const results = (data.web?.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }));

  return { query, results };
}
```

- [ ] **Step 2: Create search API route**

Create `src/app/api/search/route.js`:

```js
import { NextResponse } from 'next/server';
import { webSearch } from '@/lib/search';

export async function POST(request) {
  const { query } = await request.json();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }
  const results = await webSearch(query);
  return NextResponse.json(results);
}
```

- [ ] **Step 3: Verify**

```bash
curl -s -X POST http://localhost:3000/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"NZQA AS91027 algebra"}' | head -c 300
```

Expected: JSON with search results (or fallback message if no API key).

- [ ] **Step 4: Commit**

```bash
cd /Users/micha/claude/edu
git add src/lib/search.js src/app/api/search/
git commit -m "feat: web search integration for NCEA lookups"
```

---

### Task 5: Claude System Prompt & Tool Definitions

**Files:**
- Create: `src/lib/prompts.js`
- Create: `src/lib/claude.js`

- [ ] **Step 1: Write the system prompt**

Create `src/lib/prompts.js`:

```js
export const SYSTEM_PROMPT = `You are EduBuilder, an expert lesson designer for New Zealand secondary school students. Teachers describe what they want, and you build interactive, evidence-based learning experiences using the update_lesson tool.

## Your Role
- Build complete, high-quality lessons aligned to NCEA standards
- When a teacher mentions an NCEA standard number (e.g., AS91027), ALWAYS use web_search to look up the current achievement objectives and explanatory notes
- Respond conversationally in the chat while building the lesson with update_lesson

## Learning Psychology Rules (MANDATORY)
Every lesson you build MUST follow these evidence-based principles:

1. ACTIVATE PRIOR KNOWLEDGE: Always start with a hook — a thought-provoking question, real-world scenario, or brief quiz that connects to what students already know. Use a quiz or short-answer block for this.

2. CHUNKED INSTRUCTION: Keep reading blocks short (max 150 words each). Break complex ideas into multiple small blocks. Never create walls of text.

3. INTERLEAVED PRACTICE: Place an interactive block (quiz, short-answer, fill-blank, drag-order, or sandbox) after every 1-2 reading blocks. Students must actively retrieve and apply knowledge, not just passively read.

4. SCAFFOLDED DIFFICULTY: Start with foundational concepts and simple questions. Gradually increase complexity. Early questions should have ~80% success rate, building confidence before challenging material.

5. IMMEDIATE FEEDBACK: Every question block MUST include a detailed explanation field. Don't just say "correct" — explain WHY the answer is correct and why common wrong answers are wrong.

6. CONCRETE BEFORE ABSTRACT: Use simulations (sandbox blocks), diagrams, and real-world examples before introducing formulas, definitions, or abstract theory. Let students see and interact with the concept first.

7. SPACED REVIEW: End every lesson with a mixed review section (3-5 questions) that revisits key concepts from earlier in the lesson. Use different question formats than the original practice.

## Block Types Available

### Standard Blocks
Use these via update_lesson tool:

**reading** — Explanatory text (markdown supported)
{ type: "reading", data: { title: "string", content: "markdown string", image: "url (optional)" } }

**quiz** — Multiple choice or true/false
{ type: "quiz", data: { question: "string", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "string" } }

**short-answer** — Free text response with model answer
{ type: "short-answer", data: { question: "string", modelAnswer: "string", hints: ["hint1", "hint2"] } }

**fill-blank** — Sentence with blanks marked as {{0}}, {{1}}
{ type: "fill-blank", data: { template: "The force of {{0}} pulls objects toward Earth's {{1}}.", blanks: [{ answer: "gravity", accept: ["gravitational force"] }, { answer: "center", accept: ["centre"] }] } }

**drag-order** — Reorder items correctly
{ type: "drag-order", data: { instruction: "string", items: [{ id: "a", label: "First" }, { id: "b", label: "Second" }], correctOrder: ["a", "b"] } }

**video** — Embedded video with check questions
{ type: "video", data: { url: "youtube-or-embed-url", caption: "string", checkQuestions: [{ question: "string", options: ["A", "B"], correctIndex: 0, explanation: "string" }] } }

### Custom Sandbox Blocks
For interactive simulations, graphs, visualizations — anything that needs custom code:
{ type: "sandbox", data: { title: "string", description: "string", html: "complete HTML document as string", height: 500 } }

The html field must be a complete, self-contained HTML document with inline CSS and JavaScript. It renders in a sandboxed iframe. Use this for:
- Physics simulations (gravity, waves, circuits)
- Math graphing tools
- Interactive diagrams
- Any visualization that helps students understand concepts

## How to Use update_lesson

Call update_lesson with an operations array. Each operation is one of:
- { action: "add", block: { type, data } } — append a block
- { action: "replace", blockId: "id", block: { type, data } } — replace a specific block
- { action: "remove", blockId: "id" } — remove a block
- { action: "reorder", order: ["id1", "id2", ...] } — reorder all blocks

You can include multiple operations in a single call. Prefer batching related blocks in one call (e.g., a reading block + its practice quiz together).

When a teacher asks to modify a specific block, use "replace" with the block's ID. When they ask to remove something, use "remove". When they want to reorganize, use "reorder".

## Conversation Style
- Be warm, professional, and collaborative
- Briefly explain what you're building and why (reference learning psychology principles)
- After building, ask if the teacher wants to adjust anything
- If the teacher's request is vague, ask a clarifying question before building
- When searching for NCEA standards, briefly summarize what you found before building`;

export function buildToolDefinitions() {
  return [
    {
      name: 'update_lesson',
      description:
        'Add, replace, remove, or reorder lesson blocks. Call this to build and modify the lesson.',
      input_schema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['add', 'replace', 'remove', 'reorder'],
                },
                blockId: {
                  type: 'string',
                  description: 'Required for replace and remove actions',
                },
                block: {
                  type: 'object',
                  description: 'The block object with type and data. Required for add and replace.',
                  properties: {
                    type: {
                      type: 'string',
                      enum: [
                        'reading',
                        'quiz',
                        'short-answer',
                        'fill-blank',
                        'drag-order',
                        'video',
                        'sandbox',
                      ],
                    },
                    data: { type: 'object' },
                  },
                },
                order: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of block IDs for reorder action',
                },
              },
              required: ['action'],
            },
          },
        },
        required: ['operations'],
      },
    },
    {
      name: 'web_search',
      description:
        'Search the web for NCEA curriculum information, achievement standard details, or educational content. Use this whenever a teacher references a specific standard number or you need up-to-date curriculum info.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query, e.g. "NZQA AS91027 achievement standard algebra"',
          },
        },
        required: ['query'],
      },
    },
  ];
}
```

- [ ] **Step 2: Write the Claude API client**

Create `src/lib/claude.js`:

```js
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildToolDefinitions } from './prompts';
import { webSearch } from './search';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic();

/**
 * Runs a streaming conversation with Claude that may involve multiple
 * tool-use turns. Calls onText/onToolCall/onDone callbacks as events occur.
 *
 * @param {Object} opts
 * @param {Array} opts.messages - Conversation messages [{role, content}]
 * @param {Object} opts.lesson - Current lesson state (blocks array, metadata)
 * @param {Function} opts.onText - Called with (textChunk) for each streamed text token
 * @param {Function} opts.onToolCall - Called with (toolName, toolInput) for completed tool calls
 * @param {Function} opts.onDone - Called when Claude finishes (no more tool calls)
 * @param {Function} opts.onError - Called with (error) on failure
 */
export async function streamChat({ messages, lesson, onText, onToolCall, onDone, onError }) {
  const tools = buildToolDefinitions();

  // Inject current lesson state into the system prompt
  const systemWithLesson = `${SYSTEM_PROMPT}

## Current Lesson State
The lesson currently has ${lesson.blocks?.length || 0} blocks:
${JSON.stringify(lesson.blocks || [], null, 2)}

Each block has an "id" field. Use these IDs when replacing or removing blocks.`;

  // Build the messages array for Claude
  let claudeMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Agentic loop: Claude may use tools, which requires follow-up turns
    while (true) {
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        system: systemWithLesson,
        tools,
        messages: claudeMessages,
      });

      let assistantContent = [];
      let currentText = '';
      let hasToolUse = false;

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'text') {
            currentText = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text;
            onText(event.delta.text);
          }
        } else if (event.type === 'content_block_stop') {
          // handled by finalMessage
        }
      }

      const finalMessage = await stream.finalMessage();

      // Process the final message content blocks
      const toolResults = [];

      for (const block of finalMessage.content) {
        if (block.type === 'text') {
          assistantContent.push(block);
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          assistantContent.push(block);

          if (block.name === 'update_lesson') {
            // Assign IDs to new blocks
            for (const op of block.input.operations) {
              if (op.action === 'add' && op.block) {
                op.block.id = uuidv4();
              }
            }
            onToolCall('update_lesson', block.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Lesson updated successfully.',
            });
          } else if (block.name === 'web_search') {
            const searchResults = await webSearch(block.input.query);
            onToolCall('web_search', { query: block.input.query, results: searchResults.results });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(searchResults),
            });
          }
        }
      }

      if (!hasToolUse) {
        // Claude is done — no more tool calls
        onDone();
        return;
      }

      // Continue the conversation with tool results
      claudeMessages = [
        ...claudeMessages,
        { role: 'assistant', content: assistantContent },
        { role: 'user', content: toolResults },
      ];
    }
  } catch (error) {
    onError(error);
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/lib/prompts.js src/lib/claude.js
git commit -m "feat: Claude system prompt, tool definitions, and streaming client"
```

---

### Task 6: Chat API Route (SSE Streaming)

**Files:**
- Create: `src/app/api/chat/route.js`

- [ ] **Step 1: Write the streaming chat endpoint**

Create `src/app/api/chat/route.js`:

```js
import { streamChat } from '@/lib/claude';

export async function POST(request) {
  const { messages, lesson } = await request.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event, data) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      await streamChat({
        messages,
        lesson: lesson || { blocks: [] },
        onText(chunk) {
          send('text', { content: chunk });
        },
        onToolCall(name, input) {
          send('tool_call', { name, input });
        },
        onDone() {
          send('done', {});
          controller.close();
        },
        onError(error) {
          console.error('Chat stream error:', error);
          send('error', { message: error.message });
          controller.close();
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Create a simple 2-block lesson about gravity for level 1 science"}],"lesson":{"blocks":[]}}' 2>&1 | head -100
```

Expected: SSE events streaming in — `event: text` with content chunks, `event: tool_call` with update_lesson operations, `event: done`.

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/app/api/chat/
git commit -m "feat: SSE streaming chat API route with Claude tool use"
```

---

### Task 7: Lesson Block Components — Reading & Quiz

**Files:**
- Create: `src/components/lesson/ReadingBlock.js`
- Create: `src/components/lesson/QuizBlock.js`

- [ ] **Step 1: Create ReadingBlock**

Create `src/components/lesson/ReadingBlock.js`:

```jsx
'use client';

import ReactMarkdown from 'react-markdown';

export default function ReadingBlock({ data, onContinue }) {
  return (
    <div className="block block-reading">
      {data.title && <h3 className="block-title">{data.title}</h3>}
      <div className="block-content">
        <ReactMarkdown>{data.content}</ReactMarkdown>
      </div>
      {data.image && (
        <img src={data.image} alt={data.title || 'Lesson image'} className="block-image" />
      )}
      {onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create QuizBlock**

Create `src/components/lesson/QuizBlock.js`:

```jsx
'use client';

import { useState } from 'react';

export default function QuizBlock({ data, onContinue }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === data.correctIndex;

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
  }

  return (
    <div className="block block-quiz">
      <h3 className="block-title">{data.question}</h3>
      <div className="quiz-options">
        {data.options.map((option, i) => (
          <button
            key={i}
            className={`quiz-option ${selected === i ? 'selected' : ''} ${
              submitted
                ? i === data.correctIndex
                  ? 'correct'
                  : selected === i
                    ? 'incorrect'
                    : ''
                : ''
            }`}
            onClick={() => !submitted && setSelected(i)}
            disabled={submitted}
          >
            <span className="quiz-option-letter">
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </button>
        ))}
      </div>
      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={selected === null}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className={`quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
          <p>{data.explanation}</p>
        </div>
      )}
      {submitted && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/lesson/
git commit -m "feat: ReadingBlock and QuizBlock components"
```

---

### Task 8: Lesson Block Components — Short Answer, Fill Blank, Drag Order

**Files:**
- Create: `src/components/lesson/ShortAnswerBlock.js`
- Create: `src/components/lesson/FillBlankBlock.js`
- Create: `src/components/lesson/DragOrderBlock.js`

- [ ] **Step 1: Create ShortAnswerBlock**

Create `src/components/lesson/ShortAnswerBlock.js`:

```jsx
'use client';

import { useState } from 'react';

export default function ShortAnswerBlock({ data, onContinue }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(0);

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitted(true);
  }

  return (
    <div className="block block-short-answer">
      <h3 className="block-title">{data.question}</h3>
      {!submitted && data.hints && data.hints.length > 0 && showHint < data.hints.length && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowHint((h) => h + 1)}
        >
          Show hint
        </button>
      )}
      {data.hints?.slice(0, showHint).map((hint, i) => (
        <p key={i} className="hint">
          💡 {hint}
        </p>
      ))}
      <textarea
        className="input-textarea"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer..."
        disabled={submitted}
        rows={3}
      />
      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!answer.trim()}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className="quiz-feedback feedback-neutral">
          <strong>Model answer:</strong>
          <p>{data.modelAnswer}</p>
        </div>
      )}
      {submitted && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create FillBlankBlock**

Create `src/components/lesson/FillBlankBlock.js`:

```jsx
'use client';

import { useState } from 'react';

export default function FillBlankBlock({ data, onContinue }) {
  const [answers, setAnswers] = useState(data.blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);

  function handleChange(index, value) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function checkAnswer(index) {
    const blank = data.blanks[index];
    const userAnswer = answers[index].trim().toLowerCase();
    const accepted = [blank.answer, ...(blank.accept || [])].map((a) =>
      a.toLowerCase()
    );
    return accepted.includes(userAnswer);
  }

  function handleSubmit() {
    if (answers.some((a) => !a.trim())) return;
    setSubmitted(true);
  }

  // Split template on {{0}}, {{1}}, etc. and interleave with inputs
  const parts = data.template.split(/\{\{(\d+)\}\}/);

  return (
    <div className="block block-fill-blank">
      <div className="fill-blank-sentence">
        {parts.map((part, i) => {
          if (i % 2 === 0) {
            return <span key={i}>{part}</span>;
          }
          const blankIndex = parseInt(part, 10);
          const isCorrect = submitted && checkAnswer(blankIndex);
          const isWrong = submitted && !checkAnswer(blankIndex);
          return (
            <input
              key={i}
              type="text"
              className={`fill-blank-input ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`}
              value={answers[blankIndex]}
              onChange={(e) => handleChange(blankIndex, e.target.value)}
              disabled={submitted}
              placeholder="..."
            />
          );
        })}
      </div>
      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={answers.some((a) => !a.trim())}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className="quiz-feedback feedback-neutral">
          <strong>Answers:</strong>
          <ul>
            {data.blanks.map((blank, i) => (
              <li key={i}>
                Blank {i + 1}: <strong>{blank.answer}</strong>
                {!checkAnswer(i) && (
                  <span className="text-error"> (you wrote: {answers[i]})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {submitted && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create DragOrderBlock**

Create `src/components/lesson/DragOrderBlock.js`:

```jsx
'use client';

import { useState } from 'react';

export default function DragOrderBlock({ data, onContinue }) {
  // Shuffle items initially
  const [items, setItems] = useState(() => {
    const shuffled = [...data.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [dragIndex, setDragIndex] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...items];
    const [dragged] = next.splice(dragIndex, 1);
    next.splice(index, 0, dragged);
    setItems(next);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function isCorrectOrder() {
    return items.every((item, i) => item.id === data.correctOrder[i]);
  }

  function getCorrectPosition(itemId) {
    return data.correctOrder.indexOf(itemId);
  }

  return (
    <div className="block block-drag-order">
      <h3 className="block-title">{data.instruction}</h3>
      <div className="drag-list">
        {items.map((item, i) => {
          const correct = submitted && item.id === data.correctOrder[i];
          const wrong = submitted && item.id !== data.correctOrder[i];
          return (
            <div
              key={item.id}
              className={`drag-item ${dragIndex === i ? 'dragging' : ''} ${correct ? 'correct' : ''} ${wrong ? 'incorrect' : ''}`}
              draggable={!submitted}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
            >
              <span className="drag-handle">⠿</span>
              <span>{item.label}</span>
              {wrong && (
                <span className="drag-correct-pos">
                  → should be #{getCorrectPosition(item.id) + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <button className="btn btn-primary" onClick={handleSubmit}>
          Submit
        </button>
      )}
      {submitted && (
        <div className={`quiz-feedback ${isCorrectOrder() ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <strong>{isCorrectOrder() ? 'Perfect order!' : 'Not quite right.'}</strong>
          {!isCorrectOrder() && (
            <p>The correct order is: {data.correctOrder.map((id) => data.items.find((item) => item.id === id)?.label).join(' → ')}</p>
          )}
        </div>
      )}
      {submitted && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/lesson/
git commit -m "feat: ShortAnswerBlock, FillBlankBlock, DragOrderBlock components"
```

---

### Task 9: Lesson Block Components — Video & Sandbox

**Files:**
- Create: `src/components/lesson/VideoBlock.js`
- Create: `src/components/lesson/SandboxBlock.js`

- [ ] **Step 1: Create VideoBlock**

Create `src/components/lesson/VideoBlock.js`:

```jsx
'use client';

import { useState } from 'react';

function getEmbedUrl(url) {
  // Convert youtube watch URLs to embed URLs
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return url;
}

export default function VideoBlock({ data, onContinue }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [allDone, setAllDone] = useState(
    !data.checkQuestions || data.checkQuestions.length === 0
  );

  const question = data.checkQuestions?.[questionIndex];

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleNext() {
    if (questionIndex + 1 < data.checkQuestions.length) {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setAllDone(true);
    }
  }

  return (
    <div className="block block-video">
      {data.caption && <h3 className="block-title">{data.caption}</h3>}
      <div className="video-container">
        <iframe
          src={getEmbedUrl(data.url)}
          title={data.caption || 'Video'}
          allowFullScreen
          className="video-iframe"
        />
      </div>
      {question && !allDone && (
        <div className="video-question">
          <p className="block-title">{question.question}</p>
          <div className="quiz-options">
            {question.options.map((opt, i) => (
              <button
                key={i}
                className={`quiz-option ${selected === i ? 'selected' : ''} ${
                  submitted
                    ? i === question.correctIndex
                      ? 'correct'
                      : selected === i
                        ? 'incorrect'
                        : ''
                    : ''
                }`}
                onClick={() => !submitted && setSelected(i)}
                disabled={submitted}
              >
                <span className="quiz-option-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
          {!submitted && (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={selected === null}
            >
              Submit
            </button>
          )}
          {submitted && (
            <>
              <div
                className={`quiz-feedback ${
                  selected === question.correctIndex
                    ? 'feedback-correct'
                    : 'feedback-incorrect'
                }`}
              >
                <strong>
                  {selected === question.correctIndex ? 'Correct!' : 'Not quite.'}
                </strong>
                <p>{question.explanation}</p>
              </div>
              <button className="btn btn-primary" onClick={handleNext}>
                {questionIndex + 1 < data.checkQuestions.length
                  ? 'Next Question'
                  : 'Continue'}
              </button>
            </>
          )}
        </div>
      )}
      {allDone && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SandboxBlock**

Create `src/components/lesson/SandboxBlock.js`:

```jsx
'use client';

import { useRef, useEffect } from 'react';

export default function SandboxBlock({ data, onContinue }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && data.html) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(data.html);
        doc.close();
      }
    }
  }, [data.html]);

  return (
    <div className="block block-sandbox">
      {data.title && <h3 className="block-title">{data.title}</h3>}
      {data.description && (
        <p className="text-muted">{data.description}</p>
      )}
      <iframe
        ref={iframeRef}
        className="sandbox-iframe"
        sandbox="allow-scripts"
        style={{ height: data.height || 400 }}
        title={data.title || 'Interactive content'}
      />
      {onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/lesson/
git commit -m "feat: VideoBlock and SandboxBlock components"
```

---

### Task 10: Block Renderer & Lesson Renderer

**Files:**
- Create: `src/components/lesson/BlockRenderer.js`
- Create: `src/components/lesson/LessonRenderer.js`

- [ ] **Step 1: Create BlockRenderer**

Create `src/components/lesson/BlockRenderer.js`:

```jsx
'use client';

import ReadingBlock from './ReadingBlock';
import QuizBlock from './QuizBlock';
import ShortAnswerBlock from './ShortAnswerBlock';
import FillBlankBlock from './FillBlankBlock';
import DragOrderBlock from './DragOrderBlock';
import VideoBlock from './VideoBlock';
import SandboxBlock from './SandboxBlock';

const BLOCK_COMPONENTS = {
  reading: ReadingBlock,
  quiz: QuizBlock,
  'short-answer': ShortAnswerBlock,
  'fill-blank': FillBlankBlock,
  'drag-order': DragOrderBlock,
  video: VideoBlock,
  sandbox: SandboxBlock,
};

export default function BlockRenderer({ block, onContinue, isActive, onEdit }) {
  const Component = BLOCK_COMPONENTS[block.type];

  if (!Component) {
    return (
      <div className="block block-unknown">
        <p>Unknown block type: {block.type}</p>
      </div>
    );
  }

  return (
    <div
      className={`block-wrapper ${isActive ? 'active' : ''} ${!isActive && onContinue ? 'dimmed' : ''}`}
      data-block-id={block.id}
    >
      {onEdit && (
        <button className="block-edit-btn" onClick={() => onEdit(block)}>
          Edit
        </button>
      )}
      <Component data={block.data} onContinue={isActive ? onContinue : undefined} />
    </div>
  );
}
```

- [ ] **Step 2: Create LessonRenderer**

Create `src/components/lesson/LessonRenderer.js`:

```jsx
'use client';

import { useState } from 'react';
import BlockRenderer from './BlockRenderer';

export default function LessonRenderer({ blocks, progressiveDisclosure = false, onEditBlock, onProgressChange }) {
  // In progressive disclosure mode (learn page), track which block the student is on
  const [activeIndex, setActiveIndex] = useState(0);

  function handleContinue() {
    setActiveIndex((prev) => {
      const next = Math.min(prev + 1, blocks.length - 1);
      if (onProgressChange) onProgressChange(next + 1, blocks.length);
      return next;
    });
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="lesson-empty">
        <p>No lesson content yet. Start chatting to build your lesson!</p>
      </div>
    );
  }

  return (
    <div className="lesson-renderer">
      {blocks.map((block, i) => {
        const isActive = !progressiveDisclosure || i <= activeIndex;
        const isCurrent = progressiveDisclosure && i === activeIndex;
        const needsContinue = progressiveDisclosure && isCurrent && i < blocks.length - 1;

        return (
          <BlockRenderer
            key={block.id}
            block={block}
            isActive={isActive}
            onContinue={needsContinue ? handleContinue : undefined}
            onEdit={onEditBlock}
          />
        );
      })}
      {progressiveDisclosure && activeIndex >= blocks.length - 1 && blocks.length > 0 && (
        <div className="lesson-complete">
          <h2>Lesson Complete!</h2>
          <p>Great work finishing this lesson.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/lesson/
git commit -m "feat: BlockRenderer and LessonRenderer components"
```

---

### Task 11: Learn Page

**Files:**
- Create: `src/app/learn/[id]/page.js`
- Create: `src/components/ui/ProgressBar.js`

- [ ] **Step 1: Create ProgressBar**

Create `src/components/ui/ProgressBar.js`:

```jsx
'use client';

export default function ProgressBar({ current, total }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-bar-label">{percent}%</span>
    </div>
  );
}
```

- [ ] **Step 2: Create learn page**

Create `src/app/learn/[id]/page.js`:

```jsx
'use client';

import { useState, useEffect } from 'react';
import LessonRenderer from '@/components/lesson/LessonRenderer';
import ProgressBar from '@/components/ui/ProgressBar';

export default function LearnPage({ params }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 1, total: 1 });

  useEffect(() => {
    async function load() {
      const { id } = await params;
      const res = await fetch(`/api/lessons/${id}`);
      if (!res.ok) {
        setError('Lesson not found');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLesson(data);
      setProgress({ current: 1, total: data.blocks.length });
      setLoading(false);
    }
    load();
  }, [params]);

  if (loading) {
    return (
      <div className="learn-page">
        <div className="learn-loading">Loading lesson...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learn-page">
        <div className="learn-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="learn-page">
      <header className="learn-header">
        <h1 className="learn-title">{lesson.title}</h1>
        {lesson.standard && (
          <span className="learn-standard">{lesson.standard}</span>
        )}
        <ProgressBar current={progress.current} total={progress.total} />
      </header>
      <main className="learn-content">
        <LessonRenderer
          blocks={lesson.blocks}
          progressiveDisclosure={true}
          onProgressChange={(current, total) => setProgress({ current, total })}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify by creating a test lesson and visiting the learn page**

Create a test lesson via curl, then visit `/learn/{id}` in the browser:

```bash
curl -s -X POST http://localhost:3000/api/lessons \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Lesson",
    "blocks": [
      {"id": "1", "type": "reading", "data": {"title": "Welcome", "content": "This is a test reading block with **bold** text."}},
      {"id": "2", "type": "quiz", "data": {"question": "What is 2+2?", "options": ["3", "4", "5", "6"], "correctIndex": 1, "explanation": "2+2=4"}},
      {"id": "3", "type": "reading", "data": {"title": "Done", "content": "You finished the test!"}}
    ]
  }'
```

Copy the `id` from the response and visit `http://localhost:3000/learn/{id}`.

Expected: See lesson with progressive disclosure, quiz interaction, and completion message.

- [ ] **Step 4: Commit**

```bash
cd /Users/micha/claude/edu
git add src/app/learn/ src/components/ui/
git commit -m "feat: learn page with progressive disclosure and progress bar"
```

---

### Task 12: Build Page — Chat Panel Components

**Files:**
- Create: `src/components/build/ChatMessage.js`
- Create: `src/components/build/ChatInput.js`
- Create: `src/components/build/ChatPanel.js`

- [ ] **Step 1: Create ChatMessage**

Create `src/components/build/ChatMessage.js`:

```jsx
'use client';

import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="chat-message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatInput**

Create `src/components/build/ChatInput.js`:

```jsx
'use client';

import { useState, useRef } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Describe your lesson..."
        disabled={disabled}
        rows={1}
      />
      <button
        type="submit"
        className="btn btn-primary chat-send-btn"
        disabled={!text.trim() || disabled}
      >
        Send
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create ChatPanel**

Create `src/components/build/ChatPanel.js`:

```jsx
'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatPanel({ onLessonUpdate, lesson }) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function handleSend(text) {
    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStreaming(true);
    setStreamingText('');

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          lesson,
        }),
        signal: abortController.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ') && eventType) {
            const data = JSON.parse(line.slice(6));

            if (eventType === 'text') {
              fullText += data.content;
              setStreamingText(fullText);
            } else if (eventType === 'tool_call' && data.name === 'update_lesson') {
              onLessonUpdate(data.input.operations);
            } else if (eventType === 'done') {
              // Stream complete
            } else if (eventType === 'error') {
              console.error('Stream error:', data.message);
            }

            eventType = null;
          }
        }
      }

      // Add the completed assistant message
      if (fullText) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fullText },
        ]);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamingText('');
      abortRef.current = null;
    }
  }

  // Called by build page when user clicks Edit on a block
  function prefillEdit(block) {
    // This doesn't send automatically — just helps the user
    // We expose this via a ref or callback in the build page
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>EduBuilder</h2>
        <p className="text-muted">Describe your lesson and I&apos;ll build it</p>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && !streaming && (
          <div className="chat-welcome">
            <h3>Welcome to EduBuilder</h3>
            <p>Tell me what lesson you&apos;d like to create. Include:</p>
            <ul>
              <li>The subject and topic</li>
              <li>NCEA level and standard (if applicable)</li>
              <li>Any specific concepts to cover</li>
            </ul>
            <p className="text-muted">
              Example: &ldquo;Create a Level 1 Science lesson on gravity and
              forces, aligned to AS91027&rdquo;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {streaming && streamingText && (
          <ChatMessage
            message={{ role: 'assistant', content: streamingText }}
          />
        )}
        {streaming && !streamingText && (
          <div className="chat-thinking">
            <span className="dot-pulse" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/build/
git commit -m "feat: ChatPanel, ChatMessage, ChatInput components"
```

---

### Task 13: Build Page — Lesson Preview

**Files:**
- Create: `src/components/build/LessonPreview.js`

- [ ] **Step 1: Create LessonPreview**

Create `src/components/build/LessonPreview.js`:

```jsx
'use client';

import { useState } from 'react';
import LessonRenderer from '@/components/lesson/LessonRenderer';

export default function LessonPreview({ lesson, onSave, onEditBlock }) {
  const [title, setTitle] = useState(lesson.title || 'Untitled Lesson');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const method = savedId ? 'PUT' : 'POST';
      const url = savedId ? `/api/lessons/${savedId}` : '/api/lessons';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lesson,
          title,
        }),
      });
      const data = await res.json();
      setSavedId(data.id);
      if (onSave) onSave(data);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleShare() {
    if (!savedId) return;
    const url = `${window.location.origin}/learn/${savedId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="lesson-preview">
      <div className="preview-toolbar">
        <input
          type="text"
          className="preview-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title..."
        />
        <div className="preview-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : savedId ? 'Update' : 'Save'}
          </button>
          {savedId && (
            <button
              className="btn btn-secondary"
              onClick={handleShare}
            >
              {copied ? 'Copied!' : 'Share Link'}
            </button>
          )}
        </div>
      </div>
      <div className="preview-content">
        <LessonRenderer
          blocks={lesson.blocks}
          progressiveDisclosure={false}
          onEditBlock={onEditBlock}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/build/
git commit -m "feat: LessonPreview component with save and share"
```

---

### Task 14: Split Pane UI Component

**Files:**
- Create: `src/components/ui/SplitPane.js`

- [ ] **Step 1: Create SplitPane**

Create `src/components/ui/SplitPane.js`:

```jsx
'use client';

import { useState, useRef, useCallback } from 'react';

export default function SplitPane({ left, right, defaultSplit = 40 }) {
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;

    function handleMouseMove(e) {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(Math.max(percent, 20), 80));
    }

    function handleMouseUp() {
      draggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="split-pane" ref={containerRef}>
      <div className="split-pane-left" style={{ width: `${splitPercent}%` }}>
        {left}
      </div>
      <div className="split-pane-divider" onMouseDown={handleMouseDown} />
      <div
        className="split-pane-right"
        style={{ width: `${100 - splitPercent}%` }}
      >
        {right}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/micha/claude/edu
git add src/components/ui/
git commit -m "feat: resizable SplitPane component"
```

---

### Task 15: Build Page — Wire Everything Together

**Files:**
- Create: `src/app/build/page.js`

- [ ] **Step 1: Create the build page**

Create `src/app/build/page.js`:

```jsx
'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SplitPane from '@/components/ui/SplitPane';
import ChatPanel from '@/components/build/ChatPanel';
import LessonPreview from '@/components/build/LessonPreview';

export default function BuildPage() {
  const [lesson, setLesson] = useState({
    title: 'Untitled Lesson',
    subject: '',
    level: '',
    standard: '',
    blocks: [],
  });

  const handleLessonUpdate = useCallback((operations) => {
    setLesson((prev) => {
      let blocks = [...prev.blocks];

      for (const op of operations) {
        switch (op.action) {
          case 'add': {
            const block = {
              ...op.block,
              id: op.block.id || uuidv4(),
            };
            blocks.push(block);
            break;
          }
          case 'replace': {
            const idx = blocks.findIndex((b) => b.id === op.blockId);
            if (idx !== -1) {
              blocks[idx] = { ...op.block, id: op.blockId };
            }
            break;
          }
          case 'remove': {
            blocks = blocks.filter((b) => b.id !== op.blockId);
            break;
          }
          case 'reorder': {
            const ordered = [];
            for (const id of op.order) {
              const block = blocks.find((b) => b.id === id);
              if (block) ordered.push(block);
            }
            blocks = ordered;
            break;
          }
        }
      }

      return { ...prev, blocks };
    });
  }, []);

  function handleEditBlock(block) {
    // Pre-fill chat with edit context — for now just log it
    // A more complete solution would pass this to ChatPanel
    console.log('Edit block:', block.id, block.type);
  }

  return (
    <div className="build-page">
      <SplitPane
        defaultSplit={40}
        left={
          <ChatPanel
            onLessonUpdate={handleLessonUpdate}
            lesson={lesson}
          />
        }
        right={
          <LessonPreview
            lesson={lesson}
            onEditBlock={handleEditBlock}
          />
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the build page loads**

Visit `http://localhost:3000/build` in the browser.

Expected: Split pane with chat on left, empty lesson preview on right. Chat shows welcome message. Can resize the divider.

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/app/build/
git commit -m "feat: build page wiring chat panel and lesson preview"
```

---

### Task 16: Global Styles

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Add all component styles to globals.css**

Replace `src/styles/globals.css` with the full stylesheet:

```css
/* ===== Reset & Variables ===== */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #f8fafc;
  --bg-panel: #ffffff;
  --bg-hover: #f1f5f9;
  --border: #e2e8f0;
  --border-light: #f1f5f9;
  --text: #1e293b;
  --text-muted: #64748b;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-light: #eff6ff;
  --success: #22c55e;
  --success-light: #f0fdf4;
  --error: #ef4444;
  --error-light: #fef2f2;
  --warning: #f59e0b;
  --neutral-light: #f8fafc;
  --radius: 8px;
  --radius-sm: 4px;
  --radius-lg: 12px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
}

html, body {
  height: 100%;
  font-family: var(--font-sans);
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

button {
  cursor: pointer;
  font-family: inherit;
  border: none;
  background: none;
}

a {
  color: var(--primary);
  text-decoration: none;
}

/* ===== Buttons ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

/* ===== Build Page ===== */
.build-page {
  height: 100vh;
  overflow: hidden;
}

/* ===== Split Pane ===== */
.split-pane {
  display: flex;
  height: 100%;
}

.split-pane-left,
.split-pane-right {
  height: 100%;
  overflow: hidden;
}

.split-pane-divider {
  width: 4px;
  background: var(--border);
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
}

.split-pane-divider:hover {
  background: var(--primary);
}

/* ===== Chat Panel ===== */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-panel);
}

.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.chat-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.chat-welcome {
  padding: 20px;
  background: var(--primary-light);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.chat-welcome h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.chat-welcome ul {
  margin: 8px 0 8px 20px;
}

.chat-welcome li {
  font-size: 14px;
  margin-bottom: 4px;
}

/* ===== Chat Messages ===== */
.chat-message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  animation: fadeIn 0.2s ease;
}

.chat-message-user {
  flex-direction: row-reverse;
}

.chat-message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.chat-message-content {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  font-size: 14px;
  line-height: 1.5;
}

.chat-message-user .chat-message-content {
  background: var(--primary);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
}

.chat-message-assistant .chat-message-content {
  background: var(--bg-hover);
  border-bottom-left-radius: var(--radius-sm);
}

.chat-message-content p {
  margin-bottom: 8px;
}

.chat-message-content p:last-child {
  margin-bottom: 0;
}

.chat-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  color: var(--text-muted);
  font-size: 14px;
}

.dot-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: pulse 1.2s infinite;
}

/* ===== Chat Input ===== */
.chat-input-form {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
}

.chat-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--font-sans);
  line-height: 1.4;
  outline: none;
  transition: border-color 0.15s;
}

.chat-input:focus {
  border-color: var(--primary);
}

.chat-send-btn {
  align-self: flex-end;
}

/* ===== Lesson Preview ===== */
.lesson-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
}

.preview-title-input {
  flex: 1;
  border: none;
  font-size: 16px;
  font-weight: 600;
  outline: none;
  background: transparent;
}

.preview-title-input::placeholder {
  color: var(--text-muted);
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.lesson-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 15px;
  text-align: center;
}

/* ===== Lesson Blocks (shared by build preview + learn page) ===== */
.lesson-renderer {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
  margin: 0 auto;
}

.block-wrapper {
  position: relative;
  transition: opacity 0.3s ease;
}

.block-wrapper.dimmed {
  opacity: 0.3;
  pointer-events: none;
}

.block-edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 1;
}

.block-wrapper:hover .block-edit-btn {
  opacity: 1;
}

.block {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  animation: fadeSlideIn 0.3s ease;
}

.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.block-content {
  font-size: 15px;
  line-height: 1.7;
}

.block-content h1,
.block-content h2,
.block-content h3 {
  margin-top: 16px;
  margin-bottom: 8px;
}

.block-content ul,
.block-content ol {
  margin-left: 20px;
  margin-bottom: 12px;
}

.block-content code {
  background: var(--bg-hover);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 13px;
}

.block-content pre {
  background: var(--bg-hover);
  padding: 12px;
  border-radius: var(--radius);
  overflow-x: auto;
  margin: 12px 0;
}

.block-image {
  max-width: 100%;
  border-radius: var(--radius);
  margin-top: 12px;
}

/* ===== Quiz Block ===== */
.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  text-align: left;
  transition: all 0.15s;
  cursor: pointer;
}

.quiz-option:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-light);
}

.quiz-option.selected {
  border-color: var(--primary);
  background: var(--primary-light);
}

.quiz-option.correct {
  border-color: var(--success);
  background: var(--success-light);
}

.quiz-option.incorrect {
  border-color: var(--error);
  background: var(--error-light);
}

.quiz-option:disabled {
  cursor: default;
}

.quiz-option-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--border);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.quiz-feedback {
  padding: 12px 16px;
  border-radius: var(--radius);
  margin: 12px 0;
  font-size: 14px;
}

.feedback-correct {
  background: var(--success-light);
  border: 1px solid var(--success);
}

.feedback-incorrect {
  background: var(--error-light);
  border: 1px solid var(--error);
}

.feedback-neutral {
  background: var(--neutral-light);
  border: 1px solid var(--border);
}

.quiz-feedback strong {
  display: block;
  margin-bottom: 4px;
}

/* ===== Short Answer ===== */
.input-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--font-sans);
  resize: vertical;
  outline: none;
  margin-bottom: 12px;
  transition: border-color 0.15s;
}

.input-textarea:focus {
  border-color: var(--primary);
}

.hint {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--neutral-light);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}

/* ===== Fill Blank ===== */
.fill-blank-sentence {
  font-size: 15px;
  line-height: 2.2;
  margin-bottom: 12px;
}

.fill-blank-input {
  display: inline-block;
  width: 120px;
  border: none;
  border-bottom: 2px solid var(--border);
  padding: 2px 6px;
  font-size: 14px;
  font-family: var(--font-sans);
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
  margin: 0 4px;
}

.fill-blank-input:focus {
  border-bottom-color: var(--primary);
}

.fill-blank-input.correct {
  border-bottom-color: var(--success);
  background: var(--success-light);
}

.fill-blank-input.incorrect {
  border-bottom-color: var(--error);
  background: var(--error-light);
}

.text-error {
  color: var(--error);
}

/* ===== Drag Order ===== */
.drag-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.drag-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  cursor: grab;
  transition: all 0.15s;
  user-select: none;
}

.drag-item:active {
  cursor: grabbing;
}

.drag-item.dragging {
  opacity: 0.5;
  border-color: var(--primary);
}

.drag-item.correct {
  border-color: var(--success);
  background: var(--success-light);
}

.drag-item.incorrect {
  border-color: var(--error);
  background: var(--error-light);
}

.drag-handle {
  color: var(--text-muted);
  font-size: 16px;
}

.drag-correct-pos {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
}

/* ===== Video Block ===== */
.video-container {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  margin-bottom: 16px;
  border-radius: var(--radius);
  overflow: hidden;
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-question {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ===== Sandbox Block ===== */
.sandbox-iframe {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: white;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
}

/* ===== Learn Page ===== */
.learn-page {
  min-height: 100vh;
  background: var(--bg);
}

.learn-header {
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  z-index: 10;
}

.learn-title {
  font-size: 20px;
  font-weight: 700;
}

.learn-standard {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.learn-content {
  padding: 32px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.learn-loading,
.learn-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 16px;
  color: var(--text-muted);
}

.lesson-complete {
  text-align: center;
  padding: 32px;
  background: var(--success-light);
  border-radius: var(--radius-lg);
  border: 1px solid var(--success);
}

.lesson-complete h2 {
  color: var(--success);
  margin-bottom: 8px;
}

/* ===== Progress Bar ===== */
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

/* ===== Animations ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

- [ ] **Step 2: Verify everything works**

Visit `http://localhost:3000` in browser.

Expected:
- Redirects to `/build`
- Split pane with chat on left, lesson preview on right
- Divider is draggable
- Chat shows welcome message
- Type a message and send — should stream Claude's response and build blocks in the preview
- Save button works, Share button copies URL
- Visit the shared URL — learn page renders with progressive disclosure

- [ ] **Step 3: Commit**

```bash
cd /Users/micha/claude/edu
git add src/styles/globals.css
git commit -m "feat: complete global styles for all components"
```

---

### Task 17: End-to-End Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Start dev server and test the full flow**

```bash
cd /Users/micha/claude/edu && npm run dev
```

Test checklist:
1. Visit `http://localhost:3000` → redirects to `/build`
2. Chat panel shows welcome message
3. Type "Create a short lesson about photosynthesis for Level 1 Biology" → Send
4. Claude responds in chat, blocks appear in the preview panel
5. Blocks render correctly (reading blocks with markdown, quiz blocks with options)
6. Click Save → lesson is saved
7. Click Share Link → URL is copied
8. Open the copied URL in a new tab → learn page loads
9. Progressive disclosure works — only current block is fully visible
10. Answer a quiz question → feedback shows
11. Click Continue → next block becomes active
12. Complete lesson → "Lesson Complete" message appears

- [ ] **Step 2: Final commit if any fixes were needed**

```bash
cd /Users/micha/claude/edu
git add -A
git commit -m "fix: smoke test fixes"
```
