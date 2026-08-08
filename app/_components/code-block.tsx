"use client";

import { useState } from "react";

type CodeBlockProps = {
  code: string;
  label?: string;
  comment?: string;
};

export function CodeBlock({ code, label = "Kotlin", comment }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const displayedCode = comment ? `// ${comment}\n${code}` : code;

  async function copyCode() {
    await navigator.clipboard.writeText(displayedCode);
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
      <pre><code>{displayedCode}</code></pre>
    </div>
  );
}

export function CodeComparison({ title, java, kotlin }: { title: string; java: string; kotlin: string }) {
  return (
    <div className="comparison-block">
      <div className="comparison-title"><span>Java → Kotlin</span><strong>{title}</strong></div>
      <div className="comparison-grid">
        <CodeBlock code={java} label="Java" comment={`${title}：Java 写法`} />
        <CodeBlock code={kotlin} label="Kotlin" comment={`${title}：Kotlin 写法`} />
      </div>
    </div>
  );
}
