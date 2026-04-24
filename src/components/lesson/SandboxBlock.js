'use client';

import RichText from './RichText';

const SCROLLBAR_RESET = '<style>html,body{overflow:hidden;margin:0;padding:0;box-sizing:border-box}</style>';

function injectReset(html) {
  if (!html) return html;
  // Inject after <head> or at start of <body> or at very start
  if (html.includes('<head>')) return html.replace('<head>', '<head>' + SCROLLBAR_RESET);
  if (html.includes('<body>')) return html.replace('<body>', '<body>' + SCROLLBAR_RESET);
  return SCROLLBAR_RESET + html;
}

export default function SandboxBlock({ data, onContinue }) {
  return (
    <div className="block block-sandbox">
      {data.title && <h3 className="block-title"><RichText inline>{data.title}</RichText></h3>}
      {data.description && (
        <p className="text-muted">{data.description}</p>
      )}
      <iframe
        className="sandbox-iframe"
        sandbox="allow-scripts"
        srcDoc={injectReset(data.html)}
        style={{ height: data.height || 400 }}
        title={data.title || 'Interactive content'}
        scrolling="no"
      />
      {onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
