"use client";

import { useState } from "react";

export function CodeBlock({ code, label = "Kotlin" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="code-window">
      <div className="code-toolbar">
        <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
        <span className="code-label">{label}</span>
        <button type="button" onClick={copyCode}>{copied ? "已复制" : "复制"}</button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export function CodeComparison({ title, java, kotlin }: { title: string; java: string; kotlin: string }) {
  return (
    <div className="comparison-block">
      <div className="comparison-title"><span>Java → Kotlin</span><strong>{title}</strong></div>
      <div className="comparison-grid">
        <CodeBlock code={java} label="Java" />
        <CodeBlock code={kotlin} label="Kotlin" />
      </div>
    </div>
  );
}

