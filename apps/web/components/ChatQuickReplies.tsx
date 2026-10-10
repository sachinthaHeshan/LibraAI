type ChatQuickRepliesProps = {
  options: string[];
  disabled?: boolean;
  onSelect: (option: string) => void;
};

export function ChatQuickReplies({ options, disabled, onSelect }: ChatQuickRepliesProps) {
  if (options.length === 0) return null;

  return (
    <div aria-label="Suggested replies" className="mt-3 flex flex-wrap gap-2" role="group">
      {options.map((option) => (
        <button
          className="rounded-full border border-accent/40 bg-white px-3.5 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
          disabled={disabled}
          key={option}
          onClick={() => onSelect(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
