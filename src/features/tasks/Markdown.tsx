"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders task details markdown. GFM enabled for task lists, tables and
 * strikethrough. Raw HTML is intentionally NOT enabled (no rehype-raw), so
 * user content cannot inject markup.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="wc-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          input: ({ ...props }) => <input {...props} disabled readOnly />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
