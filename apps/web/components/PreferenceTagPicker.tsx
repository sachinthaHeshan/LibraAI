import type { PreferenceCategory } from "@/lib/preferences";

type PreferenceTagPickerProps = {
  categories: PreferenceCategory[];
  selected: string[];
  onToggle: (tag: string) => void;
};

export function PreferenceTagPicker({ categories, selected, onToggle }: PreferenceTagPickerProps) {
  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <fieldset key={category.id}>
          <legend className="mb-3 block text-sm font-semibold text-ink">{category.label}</legend>
          <div className="flex flex-wrap gap-2">
            {category.tags.map((tag) => {
              const isSelected = selected.includes(tag.id);
              return (
                <button
                  aria-pressed={isSelected}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                    isSelected
                      ? "border-accent bg-accent-soft text-accent shadow-sm"
                      : "border-line bg-[#f3f4f6] text-ink hover:bg-[#eef0f4]"
                  }`}
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  type="button"
                >
                  {isSelected ? <span aria-hidden>✓ </span> : null}
                  {tag.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
