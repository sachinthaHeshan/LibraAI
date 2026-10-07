import { Fragment, type ReactNode } from "react";

/**
 * Renders the small Markdown subset agents reply with: paragraphs, headings,
 * bulleted/numbered lists, **bold**, *italic*, and `code`. Builds React nodes
 * directly (never raw HTML), so model output can't inject markup.
 */

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "heading"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;
const HEADING_RE = /^\s*#{1,6}\s+(.*)$/;
// Underscore emphasis only at word boundaries, so snake_case stays as-is.
const INLINE_RE = /(\*\*[^*]+\*\*|(?<!\w)__[^_]+__(?!\w)|`[^`]+`|\*[^*\s][^*]*\*|(?<!\w)_[^_\s][^_]*_(?!\w))/g;

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  };

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const bullet = line.match(BULLET_RE);
    const ordered = bullet ? null : line.match(ORDERED_RE);
    const item = bullet ?? ordered;
    const heading = line.match(HEADING_RE);

    if (item) {
      flush();
      const isOrdered = Boolean(ordered);
      const last = blocks.at(-1);
      if (last?.type === "list" && last.ordered === isOrdered) {
        last.items.push(item[1]!);
      } else {
        blocks.push({ type: "list", ordered: isOrdered, items: [item[1]!] });
      }
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", text: heading[1]! });
    } else if (line.trim() === "") {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_RE).map((part, index) => {
    if (/^(\*\*|__).+\1$/.test(part)) {
      return (
        <strong className="font-semibold text-ink" key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^`.+`$/.test(part)) {
      return (
        <code className="rounded bg-[#eef0f4] px-1 py-0.5 text-[0.85em]" key={index}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^([*_]).+\1$/.test(part)) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

export function ChatMarkdown({ content, className = "" }: ChatMarkdownProps) {
  return (
    <div className={`space-y-2 break-words text-sm leading-relaxed text-ink ${className}`}>
      {parseBlocks(content).map((block, index) => {
        if (block.type === "heading") {
          return (
            <p className="font-semibold text-ink" key={index}>
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              className={`space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-muted`}
              key={index}
            >
              {block.items.map((item, itemIndex) => (
                <li className="pl-1" key={itemIndex}>
                  {renderInline(item)}
                </li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
