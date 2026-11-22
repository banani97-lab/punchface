import type { ReactNode } from "react";
import { avatarColor, cx, initials } from "@/lib/utils";

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full border-2 border-[#1b1325] font-extrabold text-[#1b1325]",
        className,
      )}
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, extra = 0, size = 34 }: { names: string[]; extra?: number; size?: number }) {
  if (names.length === 0) return null;
  return (
    <span className="flex items-center" aria-hidden="true">
      {names.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} className={i > 0 ? "-ml-2.5" : undefined} />
      ))}
      {extra > 0 ? (
        <span
          className="-ml-2.5 inline-flex items-center justify-center rounded-full border-2 border-[#1b1325] bg-white px-1.5 text-xs font-extrabold text-[#1b1325]"
          style={{ minWidth: size, height: size }}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** A labelled on/off row. The whole row is the tap target. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  icon,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon?: ReactNode;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2.5">
      {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-tight">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm leading-snug text-muted">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cx(
          "relative h-8 w-14 shrink-0 rounded-full border-2 border-line transition-colors duration-200",
          "peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg",
          checked ? "bg-accent" : "bg-fg/10",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 size-6 rounded-full border-2 border-line bg-card transition-transform duration-200 ease-out",
            checked ? "translate-x-[26px]" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Fewer: ${label}`}
      >
        <span className="text-2xl leading-none" aria-hidden="true">−</span>
      </button>
      <output className="w-8 text-center text-2xl font-extrabold tabular-nums" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More: ${label}`}
      >
        <span className="text-2xl leading-none" aria-hidden="true">+</span>
      </button>
    </div>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border-[length:var(--border-w)] border-dashed border-line/40 px-5 py-8 text-center">
      <div className="text-4xl" aria-hidden="true">{emoji}</div>
      <p className="mt-2 font-bold">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-sm text-[0.9375rem] text-muted">{children}</div> : null}
    </div>
  );
}
