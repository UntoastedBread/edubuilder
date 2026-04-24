'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-typescript';

const LANG_MAP = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  python: 'Python',
  py: 'Python',
  css: 'CSS',
  html: 'HTML',
  markup: 'HTML',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  bash: 'Bash',
  shell: 'Bash',
  sh: 'Bash',
  json: 'JSON',
  sql: 'SQL',
  typescript: 'TypeScript',
  ts: 'TypeScript',
};

const PRISM_LANG_MAP = {
  js: 'javascript',
  py: 'python',
  html: 'markup',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
};

const RUNNABLE = new Set(['javascript', 'js', 'html', 'markup', 'python', 'py']);

function parseLang(className) {
  if (!className) return null;
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : null;
}

function getPrismLang(lang) {
  const mapped = PRISM_LANG_MAP[lang] || lang;
  return Prism.languages[mapped] ? mapped : null;
}

function isRunnable(lang) {
  return lang && RUNNABLE.has(lang);
}

function isHtmlLang(lang) {
  return lang === 'html' || lang === 'markup';
}

function isPythonLang(lang) {
  return lang === 'python' || lang === 'py';
}

// ===== Python → JavaScript transpiler =====

function convertExpr(expr) {
  // print() → console.log()
  expr = expr.replace(/\bprint\s*\(/g, 'console.log(');

  // len(identifier) → identifier.length
  expr = expr.replace(/\blen\(\s*(\w+)\s*\)/g, '$1.length');

  // str() → String()
  expr = expr.replace(/\bstr\(/g, 'String(');

  // int() → parseInt()
  expr = expr.replace(/\bint\(/g, 'parseInt(');

  // float() → parseFloat()
  expr = expr.replace(/\bfloat\(/g, 'parseFloat(');

  // input() → prompt()
  expr = expr.replace(/\binput\s*\(/g, 'prompt(');

  // .append() → .push()
  expr = expr.replace(/\.append\(/g, '.push(');

  // .upper() → .toUpperCase()
  expr = expr.replace(/\.upper\(\)/g, '.toUpperCase()');

  // .lower() → .toLowerCase()
  expr = expr.replace(/\.lower\(\)/g, '.toLowerCase()');

  // .strip() → .trim()
  expr = expr.replace(/\.strip\(\)/g, '.trim()');

  // .split() (no args) → .split(/\s+/)  or .split(arg) stays same
  // Leave .split() as-is — JS .split() with no args returns [whole string], not ideal
  // but good enough for educational purposes

  // Boolean/None literals (word boundary to avoid matching inside identifiers)
  expr = expr.replace(/\bTrue\b/g, 'true');
  expr = expr.replace(/\bFalse\b/g, 'false');
  expr = expr.replace(/\bNone\b/g, 'null');

  // Logical operators
  expr = expr.replace(/\band\b/g, '&&');
  expr = expr.replace(/\bor\b/g, '||');
  // 'not' — replace 'not ' (with trailing space) to '!'
  expr = expr.replace(/\bnot\s+/g, '!');

  // Membership: 'x not in y' → '!y.includes(x)'
  expr = expr.replace(/\b(\w+)\s+not\s+in\s+(\w+)\b/g, '!$2.includes($1)');
  // 'x in y' → 'y.includes(x)' (only simple identifier patterns)
  expr = expr.replace(/\b(\w+)\s+in\s+(\w+)\b/g, '$2.includes($1)');

  // f-strings: f"...{expr}..." → `...${expr}...`
  expr = expr.replace(/f"([^"]*)"/g, (_, content) => {
    return '`' + content.replace(/\{([^}]+)\}/g, '${$1}') + '`';
  });
  expr = expr.replace(/f'([^']*)'/g, (_, content) => {
    return '`' + content.replace(/\{([^}]+)\}/g, '${$1}') + '`';
  });

  // Floor division: x // y → Math.floor(x / y)
  expr = expr.replace(/(\w+)\s*\/\/\s*(\w+)/g, 'Math.floor($1 / $2)');

  return expr;
}

function convertPyLine(line) {
  // Comment
  if (line.startsWith('#')) return '//' + line.slice(1);

  // pass → empty
  if (line === 'pass') return '// pass';

  // import → comment out
  if (line.startsWith('import ') || line.startsWith('from ')) return '// ' + line;

  // for x in range(...):
  const rangeFor = line.match(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:$/);
  if (rangeFor) {
    const v = rangeFor[1];
    const args = rangeFor[2].split(',').map(s => convertExpr(s.trim()));
    if (args.length === 1) {
      return `for (let ${v} = 0; ${v} < ${args[0]}; ${v}++) {`;
    } else if (args.length === 2) {
      return `for (let ${v} = ${args[0]}; ${v} < ${args[1]}; ${v}++) {`;
    } else {
      return `for (let ${v} = ${args[0]}; ${v} < ${args[1]}; ${v} += ${args[2]}) {`;
    }
  }

  // for x in iterable:
  const forIn = line.match(/^for\s+(\w+)\s+in\s+(.+)\s*:$/);
  if (forIn) {
    return `for (const ${forIn[1]} of ${convertExpr(forIn[2])}) {`;
  }

  // while condition:
  const whileM = line.match(/^while\s+(.+)\s*:$/);
  if (whileM) return `while (${convertExpr(whileM[1])}) {`;

  // if condition:
  const ifM = line.match(/^if\s+(.+)\s*:$/);
  if (ifM) return `if (${convertExpr(ifM[1])}) {`;

  // def name(args):
  const defM = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:$/);
  if (defM) {
    // Remove 'self' parameter if present
    const params = defM[2].split(',').map(s => s.trim()).filter(s => s !== 'self').join(', ');
    return `function ${defM[1]}(${params}) {`;
  }

  // try/except/finally
  if (line === 'try:') return 'try {';
  const exceptM = line.match(/^except(?:\s+\w+)?(?:\s+as\s+(\w+))?\s*:$/);
  if (exceptM) return `} catch(${exceptM[1] || 'e'}) {`;
  if (line === 'finally:') return '} finally {';

  // raise → throw
  if (line.startsWith('raise ')) {
    const msg = line.slice(6).trim();
    const raiseM = msg.match(/^(\w+)\((.+)\)$/);
    if (raiseM) return `throw new Error(${convertExpr(raiseM[2])});`;
    return `throw new Error(${convertExpr(msg)});`;
  }

  // return
  if (line === 'return') return 'return;';
  if (line.startsWith('return ')) return `return ${convertExpr(line.slice(7))};`;

  // Regular statement
  return convertExpr(line) + ';';
}

function pythonToJs(code) {
  const lines = code.split('\n');
  const output = [];
  const indentStack = [0]; // Stack of body indentation levels

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) { output.push(''); continue; }

    const currentIndent = raw.length - raw.trimStart().length;

    // Collect closing braces for de-indented lines
    const closingBraces = [];
    while (indentStack.length > 1 && currentIndent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      closingBraces.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
    }

    // Check if this line continues a previous block (else, elif, except, finally)
    const isContinuation = /^(else\s*:|elif\s|except\s*[:(]|except\s|finally\s*:)/.test(trimmed);

    if (isContinuation && closingBraces.length > 0) {
      // Output all closing braces except the last (merge with continuation)
      for (let j = 0; j < closingBraces.length - 1; j++) {
        output.push(closingBraces[j]);
      }

      let converted;
      if (trimmed === 'else:') {
        converted = '} else {';
      } else if (trimmed.startsWith('elif ')) {
        const condition = convertExpr(trimmed.slice(5, -1).trim());
        converted = `} else if (${condition}) {`;
      } else if (trimmed === 'finally:') {
        converted = '} finally {';
      } else {
        // except variants
        const exceptM = trimmed.match(/^except(?:\s+\w+)?(?:\s+as\s+(\w+))?\s*:$/);
        converted = `} catch(${exceptM?.[1] || 'e'}) {`;
      }

      // Push body indent for the continuation block
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          const nextIndent = lines[j].length - lines[j].trimStart().length;
          if (nextIndent > currentIndent) indentStack.push(nextIndent);
          break;
        }
      }

      output.push(' '.repeat(currentIndent) + converted);
      continue;
    }

    // Output closing braces
    output.push(...closingBraces);

    // Convert the line
    const converted = convertPyLine(trimmed);
    const opensBlock = trimmed.endsWith(':') && !trimmed.startsWith('#');

    if (opensBlock) {
      // Look ahead for body indentation
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          const nextIndent = lines[j].length - lines[j].trimStart().length;
          if (nextIndent > currentIndent) indentStack.push(nextIndent);
          break;
        }
      }
    }

    output.push(' '.repeat(currentIndent) + converted);
  }

  // Close remaining blocks
  while (indentStack.length > 1) {
    indentStack.pop();
    output.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
  }

  return output.join('\n');
}

// ===== Directives =====

const DIRECTIVE_RE = /^#!(norun|slow|fast|instant)\s*\n?/;
const SPEED_MAP = { slow: 150, medium: 80, fast: 30, instant: 0 };

function parseDirectives(code) {
  const match = code.match(DIRECTIVE_RE);
  if (!match) return { displayCode: code, runnable: true, speed: SPEED_MAP.medium };
  const directive = match[1];
  const displayCode = code.slice(match[0].length);
  if (directive === 'norun') return { displayCode, runnable: false, speed: SPEED_MAP.medium };
  return { displayCode, runnable: true, speed: SPEED_MAP[directive] || SPEED_MAP.medium };
}

// ===== Icons =====

function RunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ===== Components =====

export default function CodeBlock({ className, children }) {
  const lang = parseLang(className);
  const code = String(children).replace(/\n$/, '');

  if (!lang) {
    return <code className="inline-code">{children}</code>;
  }

  return <FencedCodeBlock lang={lang} code={code} />;
}

function FencedCodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState(null);
  const [visibleLines, setVisibleLines] = useState([]);
  const [running, setRunning] = useState(false);
  const [htmlHeight, setHtmlHeight] = useState(150);
  const iframeRef = useRef(null);

  const displayLang = LANG_MAP[lang] || lang;
  const isHtml = isHtmlLang(lang);
  const isPython = isPythonLang(lang);

  // Parse directives from code
  const { displayCode, runnable: directiveRunnable, speed } = parseDirectives(code);
  const canRun = isRunnable(lang) && directiveRunnable;

  // Syntax highlight the display code (without directive line)
  const prismLang = getPrismLang(lang);
  let highlighted;
  if (prismLang) {
    highlighted = Prism.highlight(displayCode, Prism.languages[prismLang], prismLang);
  }

  // Output animation: reveal lines progressively
  useEffect(() => {
    if (!output || output.type !== 'js') return;
    const lines = output.lines;
    if (speed === 0 || lines.length === 0) {
      setVisibleLines(lines);
      return;
    }
    setVisibleLines([]);
    const timers = [];
    for (let i = 0; i < lines.length; i++) {
      timers.push(setTimeout(() => {
        setVisibleLines(prev => [...prev, lines[i]]);
      }, (i + 1) * speed));
    }
    return () => timers.forEach(clearTimeout);
  }, [output, speed]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [displayCode]);

  const handleRun = useCallback(() => {
    if (isHtml) {
      setOutput({ type: 'html' });
      return;
    }

    // For Python, transpile to JS first. For JS, run as-is.
    const execCode = isPython ? pythonToJs(displayCode) : displayCode;

    setRunning(true);
    setOutput(null);
    setVisibleLines([]);

    const lines = [];
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      cleanup();
      lines.push({ type: 'error', text: 'Execution timed out (5s limit)' });
      setOutput({ type: 'js', lines: [...lines] });
      setRunning(false);
    }, 5000);

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (data && data.__codeblock) {
        if (data.type === 'done') {
          cleanup();
          setOutput({ type: 'js', lines: [...lines] });
          setRunning(false);
        } else {
          if (lines.length < 200) {
            lines.push({ type: data.level || 'log', text: data.text });
          }
        }
      }
    }

    window.addEventListener('message', onMessage);

    // Build the iframe HTML via concatenation — NOT template literals —
    // because transpiled Python f-strings produce backticks that would
    // break a template literal interpolation.
    const preamble = [
      '<!DOCTYPE html><html><body><script>',
      '(function(){',
      '  var _lines = 0;',
      '  function _send(level, args) {',
      '    if (_lines++ > 200) return;',
      '    var text = Array.prototype.map.call(args, function(a) {',
      '      if (a === null) return "null";',
      '      if (a === undefined) return "undefined";',
      '      if (typeof a === "object") { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }',
      '      return String(a);',
      '    }).join(" ");',
      '    parent.postMessage({ __codeblock: true, level: level, text: text }, "*");',
      '  }',
      '  console.log = function() { _send("log", arguments); };',
      '  console.error = function() { _send("error", arguments); };',
      '  console.warn = function() { _send("warn", arguments); };',
      '  console.info = function() { _send("log", arguments); };',
      '  try {',
    ].join('\n');

    const postamble = [
      '  } catch(e) {',
      '    _send("error", [e.toString()]);',
      '  }',
      '  parent.postMessage({ __codeblock: true, type: "done" }, "*");',
      '})();',
      '<\/script></body></html>',
    ].join('\n');

    iframe.srcdoc = preamble + '\n' + execCode + '\n' + postamble;
  }, [displayCode, isHtml, isPython]);

  // Auto-resize HTML iframe
  useEffect(() => {
    if (!output || output.type !== 'html') return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onLoad() {
      try {
        const h = iframe.contentDocument.documentElement.scrollHeight;
        setHtmlHeight(Math.min(Math.max(h, 100), 600));
      } catch (e) {
        // cross-origin, keep default
      }
    }

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [output]);

  return (
    <div className="code-block-wrapper">
      <span className="code-block-lang">{displayLang}</span>
      <div className="code-block-actions">
        {canRun && (
          <button
            className="code-block-run-btn"
            onClick={handleRun}
            disabled={running}
            aria-label="Run code"
            title={running ? 'Running...' : 'Run'}
          >
            <RunIcon />
          </button>
        )}
        <button
          className={`code-block-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label="Copy code"
          title={copied ? 'Copied' : 'Copy'}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <pre className="code-block-pre">
        {highlighted ? (
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{displayCode}</code>
        )}
      </pre>
      {output && output.type === 'js' && (
        <div className="code-block-output">
          <div className="code-block-output-header">Output</div>
          {visibleLines.length === 0 && !running ? (
            <div className="code-block-output-line code-block-output-muted">(no output)</div>
          ) : (
            visibleLines.map((line, i) => (
              <div key={i} className={`code-block-output-line code-block-output-animated ${line.type === 'error' ? 'code-block-output-error' : line.type === 'warn' ? 'code-block-output-warn' : ''}`}>
                {line.text}
              </div>
            ))
          )}
        </div>
      )}
      {output && output.type === 'html' && (
        <div className="code-block-output">
          <div className="code-block-output-header">Preview</div>
          <iframe
            ref={iframeRef}
            srcDoc={displayCode}
            className="code-block-html-iframe"
            style={{ height: htmlHeight }}
            sandbox="allow-scripts"
            title="HTML preview"
          />
        </div>
      )}
    </div>
  );
}

// Pre wrapper — ReactMarkdown wraps <code> in <pre>, we intercept both
export function PreBlock({ children }) {
  if (children?.type === CodeBlock) {
    return children;
  }
  if (children?.props?.className && /language-/.test(children.props.className)) {
    return <CodeBlock className={children.props.className}>{children.props.children}</CodeBlock>;
  }
  return <pre className="code-block-pre-plain">{children}</pre>;
}
