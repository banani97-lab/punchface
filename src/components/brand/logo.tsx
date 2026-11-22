import { cx } from "@/lib/utils";

/** The punchface mark: a grinning face mid-wink, with a little impact spark. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cx("shrink-0", className)}
    >
      <circle cx="23" cy="26" r="19" fill="#ff4775" stroke="#1b1325" strokeWidth="3" />
      <circle cx="16.5" cy="22" r="2.8" fill="#1b1325" />
      <path d="M26.5 22.5c1.6-2 4.4-2 6 0" stroke="#1b1325" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M13.5 30c2 5.2 6 7.5 9.800 7.500s7.700-2.300 9.700-7.500c-6 1.700-13.500 1.700-19.500 0Z"
        fill="#1b1325"
        stroke="#1b1325"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M17.500 33.300c3.600.9 7.700.9 11.500 0" stroke="#fff6ea" strokeWidth="2" strokeLinecap="round" />
      <path
        d="m39 3 1.900 5.100L46 10l-5.100 1.900L39 17l-1.900-5.100L32 10l5.100-1.900L39 3Z"
        fill="#ffd93b"
        stroke="#1b1325"
        strokeWidth="2.200"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className="font-display text-[1.375rem] font-extrabold leading-none tracking-[-0.04em]">punchface</span>
    </span>
  );
}
