"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b2559]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="card fade-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] p-6 sm:rounded-[1.5rem] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-extrabold text-ink">{title}</h2>
          <button
            aria-label="Close"
            className="btn-icon shrink-0"
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="m7 7 10 10M17 7 7 17"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
