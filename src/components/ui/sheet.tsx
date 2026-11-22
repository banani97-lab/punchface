"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Pinned below the scrolling body: the primary action stays in thumb reach. */
  footer?: ReactNode;
  wide?: boolean;
};

/**
 * Bottom sheet on phones, centred dialog on larger screens. Built on the
 * native <dialog>, which gives us focus trapping, Escape/back-gesture
 * dismissal and inert page content without extra JavaScript.
 */
export function Sheet({ open, onClose, title, description, children, footer, wide }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("sheet", wide && "sheet-wide")}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-fg/20 sm:hidden" aria-hidden="true" />
      <header className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-3 sm:pt-5">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="display text-[1.625rem]">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-1.5 text-[0.9375rem] text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1" aria-label="Close">
          <X size={22} aria-hidden="true" />
        </button>
      </header>
      <div className={cx("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2", footer ? "pb-4" : "safe-bottom pb-5")}>
        {children}
      </div>
      {footer ? (
        <footer className="safe-bottom shrink-0 border-t-[length:var(--border-w)] border-line bg-bg px-5 pt-3">
          {footer}
        </footer>
      ) : null}
    </dialog>
  );
}
