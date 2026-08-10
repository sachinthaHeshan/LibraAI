"use client";

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_PUBLISHED_YEAR = 1900;

function buildYears(extraYear?: number): number[] {
  const years: number[] = [];
  for (let year = CURRENT_YEAR; year >= MIN_PUBLISHED_YEAR; year -= 1) {
    years.push(year);
  }
  if (
    extraYear != null &&
    Number.isInteger(extraYear) &&
    (extraYear > CURRENT_YEAR || extraYear < MIN_PUBLISHED_YEAR)
  ) {
    years.push(extraYear);
    years.sort((a, b) => b - a);
  }
  return years;
}

type YearSelectProps = {
  value: string;
  onChange: (value: string) => void;
  /** Preserve out-of-range years when editing an existing book. */
  includeYear?: number;
};

type ListPosition = {
  top: number;
  left: number;
  width: number;
};

export function YearSelect({ value, onChange, includeYear }: YearSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<ListPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const years = buildYears(includeYear);

  const query = value.trim();
  const filtered = query
    ? years.filter((year) => String(year).startsWith(query))
    : years;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function updatePosition() {
      const input = rootRef.current?.querySelector("input");
      if (!input) return;
      const rect = input.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function selectYear(year: number) {
    onChange(String(year));
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (filtered.length === 0) return;
      setHighlight((index) => (index + 1) % filtered.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (filtered.length === 0) return;
      setHighlight((index) => (index - 1 + filtered.length) % filtered.length);
      return;
    }
    if (event.key === "Enter" && open && filtered.length > 0) {
      event.preventDefault();
      selectYear(filtered[highlight] ?? filtered[0]);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const year = Number(trimmed);
    if (!Number.isInteger(year)) {
      onChange("");
      return;
    }
    if (years.includes(year)) {
      onChange(String(year));
      return;
    }
    // Keep a fully typed out-of-list year only when editing that exact value.
    if (includeYear != null && year === includeYear) {
      onChange(String(year));
      return;
    }
    onChange("");
  }

  const list =
    open && filtered.length > 0 && position && mounted
      ? createPortal(
          <ul
            className="fixed z-100 max-h-48 overflow-auto rounded-md border border-[#e5e7eb] bg-white py-1 shadow-lg"
            id={listId}
            ref={listRef}
            role="listbox"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            {filtered.map((year, index) => {
              const active = index === highlight;
              return (
                <li key={year} role="option" aria-selected={active}>
                  <button
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      active
                        ? "bg-accent-soft font-semibold text-ink"
                        : "text-ink hover:bg-[#f3f4f6]"
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectYear(year);
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    type="button"
                  >
                    {year}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="relative mt-1.5" ref={rootRef}>
      <input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        autoComplete="off"
        className="field field-box"
        inputMode="numeric"
        onBlur={handleBlur}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, 4);
          onChange(next);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="—"
        role="combobox"
        value={value}
      />
      {list}
    </div>
  );
}
