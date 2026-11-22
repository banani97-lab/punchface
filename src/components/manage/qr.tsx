import QRCode from "qrcode";

/** A QR code as inline SVG: scannable from a printed card or a second screen. */
export function QrCode({ value, size = 148 }: { value: string; size?: number }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-2 -2 ${n + 4} ${n + 4}`}
      role="img"
      aria-label="QR code linking to the invite"
      className="shrink-0 rounded-xl border-2 border-[#1b1325] bg-white"
      shapeRendering="crispEdges"
    >
      <path d={d} fill="#1b1325" />
    </svg>
  );
}
