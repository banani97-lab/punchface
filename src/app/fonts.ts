import localFont from "next/font/local";

// Variable fonts, self-hosted (SIL Open Font License) so builds never depend
// on a font CDN. Only the body face is preloaded; display faces load on use.

export const figtree = localFont({
  src: "../fonts/figtree.woff2",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
});

export const bricolage = localFont({
  src: "../fonts/bricolage-grotesque.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

export const fraunces = localFont({
  src: [
    { path: "../fonts/fraunces.woff2", style: "normal", weight: "100 900" },
    { path: "../fonts/fraunces-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});

export const dynapuff = localFont({
  src: "../fonts/dynapuff.woff2",
  variable: "--font-dynapuff",
  weight: "400 700",
  display: "swap",
  preload: false,
});

export const fontVariables = [figtree, bricolage, fraunces, dynapuff].map((f) => f.variable).join(" ");
