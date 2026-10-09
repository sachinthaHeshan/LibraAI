import { AI_DISCLOSURE, describeChatMeta, type ChatMeta } from "@/lib/chat";

type ChatProvenanceProps = {
  meta?: ChatMeta;
};

/** Small note under an assistant reply saying it is AI-generated and which agents and tools produced it. */
export function ChatProvenance({ meta }: ChatProvenanceProps) {
  if (!meta) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>{describeChatMeta(meta)}</span>
      {meta.piiRedactions > 0 ? (
        <span>· Personal details you typed were hidden from the AI.</span>
      ) : null}
    </p>
  );
}

/** Standing notice shown under chat composers. */
export function AiDisclosure({ className = "" }: { className?: string }) {
  return <p className={`text-center text-xs text-muted ${className}`}>{AI_DISCLOSURE}</p>;
}
