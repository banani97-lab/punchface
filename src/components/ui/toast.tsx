"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cx } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "ok" | "error" };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = use(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: Toast["tone"]) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    // Errors stay longer: they usually need reading twice.
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push(m, "ok"), error: (m) => push(m, "error") }),
    [push],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto flex max-w-md animate-pop-in items-start gap-2.5 rounded-2xl border-2 px-4 py-3 text-[0.9375rem] font-semibold shadow-[3px_3px_0_0_#1b1325]",
              "border-[#1b1325] text-[#1b1325]",
              t.tone === "error" ? "bg-[#ffd9de]" : "bg-[#d9ffe9]",
            )}
          >
            {t.tone === "error" ? (
              <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <CircleCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
