const URL_RE = /(https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,!?:;])/g;

/** Plain text with line breaks kept and bare links made tappable. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  return (
    <p className={className} style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc" className="linkish">
            {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
