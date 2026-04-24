# EduBuilder

AI-powered interactive lesson builder for NZ secondary school teachers. Teachers chat with Claude to build lessons; students access them via shareable URLs.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** — JavaScript, no TypeScript
- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude claude-sonnet-4-5-20250929 with streaming + tool use
- **Brave Search API** — NCEA curriculum lookups
- **react-markdown** + **remark-math** + **rehype-katex** — markdown with LaTeX rendering
- **canvas-confetti** — celebration animations on lesson completion
- **uuid** — block and lesson IDs
- **No CSS framework** — custom CSS with variables in `src/styles/globals.css`

## Quick Start

```bash
npm run dev    # Start dev server on localhost:3000
npm run build  # Production build
```

Requires `.env.local` with `ANTHROPIC_API_KEY` and `BRAVE_API_KEY`.

## Architecture

```
/build          → Teacher: chat with Claude to build lessons (split pane: chat + preview)
/learn/[id]     → Student: take lesson with progressive disclosure
/api/chat       → SSE streaming endpoint (Claude + tool use agentic loop)
/api/lessons    → CRUD for lesson JSON files
/api/search     → Brave Search proxy for NCEA standards
```

**Data flow:** Teacher message → POST /api/chat → Claude streams text + tool calls via SSE → client renders chat text and applies `update_lesson` operations to lesson preview in real-time → Save writes JSON to `data/lessons/`.

## Key Files

| File | What it does |
|------|-------------|
| `src/lib/claude.js` | Agentic loop: streams Claude responses, extracts partial JSON blocks mid-stream, handles tool use turns. Handles four tools: `update_lesson`, `review_lesson`, `suggest_improvement`, `web_search` |
| `src/lib/prompts.js` | System prompt with lesson design rules + tool definitions. This is the "brain" |
| `src/app/api/chat/route.js` | SSE endpoint wiring `streamChat()` callbacks to SSE events |
| `src/components/build/ChatPanel.js` | Chat UI, SSE event parsing, status pills, partial block streaming, follow-up suggestions |
| `src/components/build/LessonPreview.js` | Preview panel with save/share, title editing, drag-to-reorder |
| `src/app/build/page.js` | Wires chat + preview, handles lesson state with staggered block rendering |
| `src/components/lesson/LessonRenderer.js` | Renders blocks in preview mode (all visible, drag-to-reorder) or learn mode (progressive disclosure with scoring, slide animations) |
| `src/components/lesson/RichText.js` | Markdown + LaTeX renderer using react-markdown + KaTeX. Inline mode unwraps `<p>` tags. Used in all block titles |
| `src/components/lesson/CodeBlock.js` | Code display with in-browser execution (Python transpiled to JS), directive system, output animation |
| `src/components/lesson/BlockRenderer.js` | Dispatches block type → component |
| `src/lib/lessons.js` | File-based CRUD: `data/lessons/{uuid}.json` |
| `src/styles/globals.css` | All styles — CSS variables, BEM-like classes, animations |

## Streaming Architecture

The streaming is multi-layered and non-trivial:

1. **Agentic loop** (`claude.js`): Claude may call tools multiple times. After each tool call, results are fed back and Claude continues. Loop runs until Claude responds without tool calls.
2. **Partial block streaming** (`claude.js`): As Claude streams `update_lesson` tool input JSON, `extractCompleteOperations()` incrementally parses complete operation objects and emits them as `tool_block_partial` events. This makes blocks appear one at a time as they stream.
3. **SSE events** (`route.js`): `text`, `tool_start`, `tool_block_partial`, `tool_call`, `tool_result`, `suggestion`, `text_break`, `done`, `error`
4. **Client-side** (`ChatPanel.js`): Parses SSE events, splits assistant text on `tool_start` and `text_break`, tracks partial block IDs to avoid duplicates when `tool_call` fires with the complete operation set.

When modifying streaming code, be aware that `tool_block_partial` blocks have `_streaming: true` flag, and `_clear_streaming` is a synthetic action used to remove that flag when the final tool call arrives. In preview mode, blocks with `_streaming: true` render as placeholder cards with a shimmer animation instead of the actual block component.

## Claude Tools

Four tools are defined in `prompts.js` and handled in `claude.js`:

1. **`update_lesson`** — Adds/edits/removes/reorders lesson blocks. Has an optional `title` field (set on first call). Operations array with `add`, `edit`, `remove`, `reorder` actions.
2. **`review_lesson`** — Called after building a complete lesson. Runs server-side quality checks (word counts, block ordering, missing explanations, etc.) and returns issues. Claude auto-fixes any issues with `update_lesson`. Shows "Reviewing lesson..." status pill.
3. **`suggest_improvement`** — Called after building a lesson. Returns 3 short follow-up suggestions that render as clickable prompts in the chat (sends the suggestion text as a new user message when clicked).
4. **`web_search`** — Brave Search for NCEA curriculum lookups.

## Lesson Data Model

```json
{
  "id": "uuid",
  "title": "string",
  "subject": "string",
  "level": "string",
  "standard": "string",
  "blocks": [{ "id": "uuid", "type": "reading|quiz|fill-blank|drag-order|short-answer|video|sandbox", "data": {} }],
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

Block types and their data schemas are defined in `src/lib/prompts.js`. The seven types are: `reading`, `quiz` (single/multi-select/image options), `fill-blank`, `drag-order`, `short-answer`, `video`, `sandbox`.

## Component Patterns

- All components are client components (`'use client'`) — no server components are used
- Block components receive `{ data, onContinue }` props
- `onContinue` is only passed in progressive disclosure (learn) mode
- Lesson state lives in `BuildPage` and flows down: `BuildPage → ChatPanel` (sends messages), `BuildPage → LessonPreview → LessonRenderer → BlockRenderer → *Block`
- **All block titles** must be wrapped in `<RichText inline>` for markdown/LaTeX rendering. Every block component already does this — maintain this when adding new block types.
- CSS uses BEM-like flat classes (`.block-reading`, `.quiz-option.selected`), all in `globals.css`
- No component-scoped CSS modules

## Design Language

The UI follows a **light, airy, editorial** aesthetic. Every new component must match this language:

- **Palette**: All light — white panels (`--bg-panel`), off-white backgrounds (`--bg: #f8fafc`), hover states (`--bg-hover: #f1f5f9`). No dark backgrounds, no dark headers. The only dark color is `--text: #1e293b` for body text.
- **Accent**: Indigo/purple (`--primary: #6366f1`) used sparingly — buttons, active states, key term highlights, left borders. Never overwhelming.
- **Typography**: Libre Baskerville serif for all body text (both `--font-sans` and `--font-serif` map to it). Monospace (`--font-mono`) only for code. The serif face gives lessons a textbook/editorial feel.
- **Cards**: White background, `1px solid var(--border)` border, `border-radius: 12px`, `box-shadow: var(--shadow)` (very subtle). All lesson blocks are cards.
- **Buttons**: Pill-shaped for small actions (`border-radius: 999px`), standard radius for block-level buttons. Primary = purple fill + white text. Secondary = light bg + border. Ghost = transparent + muted text.
- **Spacing**: Generous padding (24-32px inside cards), clear gaps between blocks (20px). Content breathes.
- **Feedback colors**: Success green (`--success: #10b981`), error rose (`--error: #f43f5e`), warning amber (`--warning: #f59e0b`). Each has a light variant for backgrounds.
- **No dark mode**: Everything is light. Dark elements (dark code block headers, dark panels) clash with the design and should never be used.
- **Animations**: Subtle — `fadeIn`, `slideIn`, `fadeSlideIn`, `slideForward`/`slideBackward` for lesson navigation. Shimmer effect on active status pills. Nothing flashy.

## Conventions

- **JavaScript only** — no TypeScript
- **No linter/formatter configured** — keep style consistent with existing code
- **No tests** — prototype quality
- **Path aliases**: `@/*` → `./src/*` (configured in `jsconfig.json`)
- **Naming**: PascalCase components, camelCase functions/variables, kebab-case CSS classes
- **Imports**: named imports for libs, default imports for components
- Async params in Next.js 16 routes: `const { id } = await params;`

## System Prompt (src/lib/prompts.js)

The system prompt enforces:
- Anti-AI-slop writing rules (no filler phrases, no "let's explore")
- NZ-specific examples (native species, local geography, Maori concepts)
- Lesson structure templates (8-10 blocks short, 12-16 blocks standard)
- Hard max 120 words per reading block
- Practice block after every 1-2 reading blocks
- SVG data URIs for images (no external URLs)
- Block type usage heuristics
- Batched tool calls (2-3 `update_lesson` calls per lesson for streaming effect)
- Title auto-set on first `update_lesson` call
- Post-build follow-up suggestions via `suggest_improvement` tool (exactly 3, phrased as teacher requests)
- Interactive block quality check (ask user if sandbox blocks look correct)
- Sandbox design consistency rules (light palette, no dark themes)
- Code block directive syntax (`#!norun`, `#!slow`, `#!fast`, `#!instant`)

When modifying the prompt, keep it under control. Test changes by building a lesson in the UI.

## Code Block Directives

CodeBlock.js parses a first-line directive from code content:
- `#!norun` — hides Run button, strips directive from displayed code (for pseudocode/illustrative snippets)
- `#!slow` / `#!fast` / `#!instant` — controls output animation speed (150ms / 30ms / 0ms per line)
- No directive — runnable with medium speed (80ms)

The directive is stripped before display and execution. Python code is transpiled to JavaScript for in-browser execution in a sandboxed iframe. **Important**: the iframe HTML is built via string concatenation (not template literals) because transpiled Python f-strings can produce backticks that break template literal interpolation.

## Common Tasks

**Adding a new block type:**
1. Add component in `src/components/lesson/NewBlock.js`
2. Register in `BlockRenderer.js` BLOCK_COMPONENTS map
3. Add schema + usage heuristics to `prompts.js`
4. Add CSS in `globals.css`
5. Wrap any title/question text in `<RichText inline>` for markdown/LaTeX support

**Modifying Claude's behavior:**
Edit `src/lib/prompts.js` — the SYSTEM_PROMPT constant and/or `buildToolDefinitions()`.

**Changing the streaming pipeline:**
Touch `claude.js` (server-side callbacks) and `ChatPanel.js` (client-side SSE parsing). These must stay in sync — if you add a new SSE event type, update both. Also update `route.js` which wires the callbacks to SSE `send()` calls.

**Adding a new Claude tool:**
1. Add tool definition in `prompts.js` `buildToolDefinitions()`
2. Add handler in `claude.js` `streamChat()` tool processing block
3. Add callback wiring in `route.js`
4. Handle the SSE event in `ChatPanel.js`

## Next.js 16 Notes

@AGENTS.md
