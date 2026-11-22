"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { useToast } from "../ui/toast";

const noop = () => () => {};

/** The page origin, empty during server rendering (no hydration mismatch). */
export function useOrigin(): string {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Opens the phone’s share sheet where there is one; otherwise copies the link. */
export function ShareButton({
  url,
  title,
  label,
  className = "btn",
}: {
  url: string;
  title: string;
  label?: string;
  className?: string;
}) {
  const toast = useToast();

  async function share() {
    const absolute = new URL(url, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: `You’re invited: ${title}`, url: absolute });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // closed the sheet
      }
    }
    if (await copyText(absolute)) toast.success("Link copied. Paste it anywhere.");
    else toast.error("Couldn’t copy the link. Copy it from the address bar instead.");
  }

  return (
    <button type="button" className={className} onClick={share} aria-label={label ? undefined : "Share invite"}>
      <Share2 size={18} aria-hidden="true" />
      {label}
    </button>
  );
}

/** A read-only link field with a copy button, for the host’s share card. */
export function CopyLink({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const absolute = `${useOrigin()}${url}`;

  async function copy() {
    if (await copyText(new URL(url, window.location.origin).toString())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn’t copy. Select the link and copy it manually.");
    }
  }

  return (
    <div className={cx("flex gap-2", className)}>
      <input
        readOnly
        value={absolute}
        aria-label="Invite link"
        className="input min-w-0 flex-1 font-semibold"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="btn btn-primary shrink-0" onClick={copy}>
        {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
