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
